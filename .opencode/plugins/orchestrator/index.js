// MCP Orchestrator Plugin for OpenCode
// Routes tool calls to MCPs, caches responses, tracks health.
// Hooks: tool.execute.before, tool.execute.after

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig(pluginDir) {
  const cfgPath = join(pluginDir, ".opencode", "plugins", "orchestrator", "orchestrator.config.json");
  if (!existsSync(cfgPath)) return null;
  try {
    return JSON.parse(readFileSync(cfgPath, "utf-8"));
  } catch (e) {
    console.error("[orchestrator] config parse error, using defaults:", e.message);
    return null;
  }
}

const DEFAULTS = {
  router: [
    { prefix: "serena_", intent: "code_intel", fallback: null },
    { prefix: "context7_", intent: "docs", fallback: null },
    { prefix: "_21st-dev_", intent: "ui_component", fallback: null },
    { prefix: "headroom_", intent: "compress", fallback: null },
  ],
  cache: {
    code_intel: { ttl_s: 120, max_entries: 50 },
    docs: { ttl_s: 300, max_entries: 30 },
    ui_component: { ttl_s: 600, max_entries: 20 },
    compress: { nocache: true },
  },
  circuit_breaker: { failure_threshold: 3, cooldown_s: 30 },
};

// ---------------------------------------------------------------------------
// IntentRouter
// ---------------------------------------------------------------------------

class IntentRouter {
  constructor(rules) {
    this.rules = rules || [];
  }

  classify(toolName) {
    for (const rule of this.rules) {
      if (toolName.startsWith(rule.prefix)) {
        return { intent: rule.intent, fallback: rule.fallback };
      }
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// ResponseCache
// ---------------------------------------------------------------------------

class ResponseCache {
  constructor(config) {
    this.config = config || {};
    this.store = new Map();
    this.timers = new Map();
  }

  _hash(toolName, args) {
    const stable = JSON.stringify(args || {}, Object.keys(args || {}).sort());
    return `${toolName}|${stable}`;
  }

  _evict(key) {
    this.store.delete(key);
    const t = this.timers.get(key);
    if (t) clearTimeout(t);
    this.timers.delete(key);
  }

  _configFor(intent) {
    const c = this.config[intent];
    if (!c || c.nocache) return null;
    return c;
  }

  get(toolName, args, intent) {
    const key = this._hash(toolName, args);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._evict(key);
      return null;
    }
    entry.lastAccess = Date.now();
    return entry.data;
  }

  set(toolName, args, intent, data) {
    const cfg = this._configFor(intent);
    if (!cfg) return;

    const key = this._hash(toolName, args);

    if (this.store.has(key)) this._evict(key);

    // LRU eviction
    if (this.store.size >= cfg.max_entries) {
      let oldest = null;
      let oldestKey = null;
      for (const [k, v] of this.store) {
        if (!oldest || v.lastAccess < oldest) {
          oldest = v.lastAccess;
          oldestKey = k;
        }
      }
      if (oldestKey) this._evict(oldestKey);
    }

    this.store.set(key, {
      data,
      lastAccess: Date.now(),
      expiresAt: Date.now() + cfg.ttl_s * 1000,
    });

    this.timers.set(key, setTimeout(() => this._evict(key), cfg.ttl_s * 1000));
  }

  clear() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.store.clear();
    this.timers.clear();
  }
}

// ---------------------------------------------------------------------------
// HealthMonitor
// ---------------------------------------------------------------------------

class HealthMonitor {
  constructor(breakerCfg) {
    this.breaker = breakerCfg || { failure_threshold: 3, cooldown_s: 30 };
    this.state = new Map(); // mcpName -> { failures, cooldownUntil }
  }

  recordSuccess(toolName) {
    const mcp = this._mcpFor(toolName);
    if (!mcp) return;
    this.state.set(mcp, { failures: 0, cooldownUntil: 0 });
  }

  recordFailure(toolName) {
    const mcp = this._mcpFor(toolName);
    if (!mcp) return;
    const cur = this.state.get(mcp) || { failures: 0, cooldownUntil: 0 };
    cur.failures++;
    if (cur.failures >= this.breaker.failure_threshold) {
      cur.cooldownUntil = Date.now() + this.breaker.cooldown_s * 1000;
    }
    this.state.set(mcp, cur);
  }

  isAvailable(toolName) {
    const mcp = this._mcpFor(toolName);
    if (!mcp) return true;
    const cur = this.state.get(mcp);
    if (!cur) return true;
    if (cur.failures >= this.breaker.failure_threshold) {
      if (Date.now() < cur.cooldownUntil) return false;
      cur.failures = 0;
      cur.cooldownUntil = 0;
    }
    return true;
  }

  _mcpFor(toolName) {
    if (toolName.startsWith("serena_")) return "serena";
    if (toolName.startsWith("context7_")) return "context7";
    if (toolName.startsWith("_21st-dev_")) return "21st-dev";
    if (toolName.startsWith("headroom_")) return "headroom";
    return null;
  }
}

// ---------------------------------------------------------------------------
// Orchestrator Plugin
// ---------------------------------------------------------------------------

export const OrchestratorPlugin = async ({ directory }) => {
  const cfg = loadConfig(directory) || DEFAULTS;
  const router = new IntentRouter(cfg.router);
  const cache = new ResponseCache(cfg.cache);
  const health = new HealthMonitor(cfg.circuit_breaker);

  let stats = { routed: 0, cached: 0, failed: 0, passthrough: 0 };

  return {
    "tool.execute.before": async (input, _output) => {
      const route = router.classify(input.tool);
      if (!route) {
        stats.passthrough++;
        return;
      }

      stats.routed++;

      if (!health.isAvailable(input.tool)) {
        console.log(
          `[orchestrator] circuit open for ${route.intent} (${input.tool}), allowing passthrough`
        );
        return;
      }

      const cached = cache.get(input.tool, input.args, route.intent);
      if (cached !== null) {
        stats.cached++;
        console.log(`[orchestrator] cache HIT for ${input.tool}`);
      }
    },

    "tool.execute.after": async (input, output) => {
      const route = router.classify(input.tool);
      if (!route) return;

      if (output.error) {
        stats.failed++;
        health.recordFailure(input.tool);
        console.log(
          `[orchestrator] ${input.tool} FAILED: ${output.error.message || output.error}`
        );
        return;
      }

      health.recordSuccess(input.tool);

      if (output.result !== undefined && output.result !== null) {
        cache.set(input.tool, input.args, route.intent, output.result);
      }
    },
  };
};
