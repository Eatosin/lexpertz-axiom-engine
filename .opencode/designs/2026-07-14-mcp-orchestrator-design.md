# MCP Orchestrator Plugin — Design Document

**Date:** 2026-07-14
**Status:** Draft
**Author:** OpenCode Build Agent

## Overview

An OpenCode plugin that intercepts tool calls to MCP servers and provides
intent-based routing, automatic fallback, response caching, and health
monitoring. Sits at the single choke point every tool call passes through —
the plugin hook layer — with zero-latency in-process operation.

## Architecture

```
tool.execute.before
     │
     ▼
┌─────────────┐  MISS   ┌──────────────┐
│  Cache      │ ──────→ │ IntentRouter │
│  Lookup     │         │              │
│  (LRU+TTL)  │         │ classify by  │
│             │         │ tool prefix  │
│  key =      │         │              │
│  mcp+tool+  │         │ return       │
│  args_hash  │         │ → target MCP │
└──────┬──────┘         │ → fallback   │
       │                └──────┬───────┘
       │ HIT                   │
       │                  allow call /
       │                  fallback
       ▼                       │
  inject cached                ▼
  response ──→ skip MCP  tool.execute (MCP runs)
                              │
                              ▼
                      tool.execute.after
                              │
                     ┌────────┴────────┐
                     │                 │
                     ▼                 ▼
               Cache store      Health monitor
               (on MISS)        (record latency/
                                errors)
```

## Components

### 1. IntentRouter

Classifies tool calls by MCP prefix and returns the target + fallback chain.

| Intent Class | Tool Prefix | Primary MCP | Fallback |
|---|---|---|---|
| `code_intel` | `serena_*` | serena | None |
| `docs` | `context7_*` | context7 | None |
| `ui_component` | `_21st-dev_*` | 21st.dev Magic | None |
| `compress` | `headroom_*` | headroom | None |

Unmatched tool names pass through unmodified — zero overhead.
Note: `graphify` is a local plugin hook, not an MCP — no tool prefix to route.

### 2. ResponseCache

In-memory LRU cache sitting before the router.

- **Key format:** `"<mcp>|<tool>|<stable-args-hash>"`
- **Stable args hash:** JSON-stable-stringify of sorted keys, excluding
  known volatile fields (`timestamp`, `nonce`, etc.)
- **TTL per intent class:**
  - `code_intel`: 120s, max 50 entries
  - `docs`: 300s, max 30 entries
  - `ui_component`: 600s, max 20 entries
  - `compress`: no cache
- **Eviction:** TTL expiry, or LRU when `maxEntries` exceeded

### 3. Fallback Handler

When a primary MCP call fails (timeout, error, unreachable):

1. Record the failure in health monitor
2. If fallback chain has next target, transparently retry
3. If no fallback, return the original error unmodified

### 4. Health Monitor

Tracks per-MCP metrics:
- Consecutive failures (circuit breaker: 3 failures → skip for 30s)
- Average latency
- Last seen alive timestamp

Exposed as a `graphify explain`-style summary on request.

### 5. Composition Engine (Future)

For complex tasks requiring multiple MCPs (e.g., "find docs for this symbol"),
the composer would:
1. Fan out parallel calls to serena (symbol info) + context7 (docs)
2. Merge results into a single response
3. Cache the merged result

Not implemented in v1 — deferred.

## File Layout

```
.opencode/
  plugins/
    orchestrator/
      index.js          ← Main plugin (the whole thing, <300 lines)
      orchestrator.config.json   ← User-editable routing rules
  opencode.json          ← Register plugin in array
```

## Config Shape (orchestrator.config.json)

```json
{
  "router": [
    { "prefix": "serena_", "intent": "code_intel", "fallback": null },
    { "prefix": "context7_", "intent": "docs", "fallback": null },
    { "prefix": "_21st-dev_", "intent": "ui_component", "fallback": null },
    { "prefix": "headroom_", "intent": "compress", "fallback": null }
  ],
  "cache": {
    "code_intel": { "ttl_s": 120, "max_entries": 50 },
    "docs": { "ttl_s": 300, "max_entries": 30 },
    "ui_component": { "ttl_s": 600, "max_entries": 20 },
    "compress": { "nocache": true }
  },
  "circuit_breaker": {
    "failure_threshold": 3,
    "cooldown_s": 30
  }
}
```

## Plugin Interface

```js
export const OrchestratorPlugin = async ({ directory }) => ({
  "tool.execute.before": async (input, output) => {
    // 1. Classify tool name → intent + target
    // 2. Check cache → if HIT, inject response, skip MCP
    // 3. Check circuit breaker → if tripped, use fallback
    // 4. Otherwise allow through
  },
  "tool.execute.after": async (input, output) => {
    // 1. Record health metrics
    // 2. On MISS, store response in cache
    // 3. On error, check fallback chain
  },
});
```

## Error Handling

| Scenario | Behavior |
|---|---|
| MCP timeout | Record failure, check circuit breaker, use fallback if available |
| MCP returns error | Pass through unmodified if no fallback |
| Cache full | LRU eviction, no hard failure |
| Config file missing | Built-in defaults, log warning |
| Plugin fails to load | Print error to stderr, OpenCode continues without orchestration |

## Non-Goals (v1)

- **Cross-MCP composition** — deferred to v2
- **Persistent cache (disk)** — memory only; cache resets on session restart
- **Distributed/coordinated routing** — single-instance only
- **MCP server management** — not spinning up/down MCPs, only routing to existing ones

## Security

- The plugin reads `orchestrator.config.json` only — no secrets
- Cached responses may contain code/symbol data — never persisted to disk
- Circuit breaker prevents cascading failures; no infinite retry loops

## Testing

- **Unit:** Mock tool input → verify routing table lookup
- **Unit:** Mock cache → verify HIT/MISS behavior
- **Integration:** Run in OpenCode session, observe `serena_` calls cached on second invocation
