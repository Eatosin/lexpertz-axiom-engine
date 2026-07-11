# 21st.dev Magic MCP Integration Plan

## Architectural Decisions (Pre-Approved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Transport** | Remote `https://mcp.21st.dev/mcp` | Bypasses local Node.js overhead on 4GB RAM |
| **Config Scope** | Global `~/.config/opencode/opencode.json` | Available across all projects |
| **Skill Model (Search/Lookup)** | `nvidia/stepfun-ai/step-3.7-flash` | Fast, cost-effective for component discovery |
| **Skill Model (Refactoring/Gluing)** | `nvidia/deepseek-ai/deepseek-v4-pro` | High-fidelity for complex UI composition |
| **Vision Agent** | Reuse existing `vision-interpreter` (Gemini 3.1 Flash Lite) | No redundant agent |
| **Component Installation** | Both `get_component` (inspect) + `21st add` CLI (auto-install deps) | Flexibility |

---

## Implementation Steps

### Phase 1: Global MCP Configuration
**Target:** `C:\Users\HomePC\.config\opencode\opencode.json`

Add to `mcp` object:
```json
"@21st-dev/magic": {
  "type": "remote",
  "url": "https://mcp.21st.dev/mcp",
  "enabled": true,
  "headers": {
    "X-API-KEY": "<USER_PROVIDES_API_KEY>"
  },
  "timeout": 60000
}
```

**Prerequisite:** User must provide 21st.dev API key from https://21st.dev/magic

### Phase 2: MCP Verification
- Restart OpenCode session
- Verify MCP appears in tool list
- Test with `search_components` query

### Phase 3: Design Engineering Skill
**Location:** `.agents/skills/design-engineering/SKILL.md`

```yaml
---
name: design-engineering
display_name: "Design Engineering"
description: "Search, retrieve, and compose 21st.dev Magic components with proper dependency resolution"
type: llm

model:
  provider: nvidia
  name: nvidia/stepfun-ai/step-3.7-flash
  temperature: 0.1
  max_tokens: 4096

prompts:
  system: prompts/system.md
  human: prompts/human.md

config:
  component_registry: "21st.dev"
  default_limit: 5
  auto_install_deps: true
  attribution_required: true
---
```

**Prompt files** in `.agents/skills/design-engineering/prompts/`:
- `system.md` - Rules 1-5 from pipeline protocol
- `human.md` - Search workflow with attribution template

### Phase 4: AGENTS.md Protocol Append
Append to `C:\Projects\lexpertz-axiom-engine\AGENTS.md`:

```markdown
## Design Engineering Pipeline (21st.dev Magic)

### Rule 1: Search Before Writing
When building/modifying visual components, MUST search 21st.dev first:
```
search_components(query: "animated navbar with dropdown", limit: 5)
```

### Rule 2: Dependency Resolution
For components requiring `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`:
1. Check `package.json` for existing versions
2. `npm install <missing>` before writing code
3. Use project's Tailwind config / theme tokens

### Rule 3: Multi-Agent Visual Pipeline
| Step | Agent | Tool | Output |
|------|-------|------|--------|
| 1 Vision | `vision-interpreter` | Image → markdown spec | Layout, spacing, animations |
| 2 Discovery | `planner` | `search_components` | 3-5 candidates with scores |
| 3 Execution | `build` | `get_component` + install deps | Working component in codebase |

### Rule 4: No "AI Slop" Components
Forbidden:
- Raw `<div className="flex...">` without design system
- Hardcoded colors (`bg-blue-500`) instead of theme tokens
- Missing hover/focus/active states
- No Framer Motion on interactive elements

### Rule 5: Attribution
Every adapted component must include:
```tsx
// Adapted from 21st.dev Magic: <component-name>
// Source: https://21st.dev/components/<id>
```
```

---

## Verification Checklist

| Check | Method |
|-------|--------|
| MCP registered | `grep -A5 '"@21st-dev/magic"' ~/.config/opencode/opencode.json` |
| Skill loads | `opencode skill list` shows `design-engineering` |
| Tools available | `search_components`, `get_component` in tool list |
| Pipeline documented | `grep -A20 'Design Engineering Pipeline' AGENTS.md` |
| API key works | Run `search_components` with test query |

---

## Open Question

**21st.dev API Key:** Need user to provide from https://21st.dev/magic before Phase 1 can complete.

---

**Status:** Ready for execution upon API key provision and plan approval.