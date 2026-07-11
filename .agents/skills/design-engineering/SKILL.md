---
name: design-engineering
display_name: "Design Engineering"
description: "Search, retrieve, and compose 21st.dev Magic React + Tailwind + Framer Motion components"
type: llm

model:
  provider: nvidia
  name: stepfun-ai/step-3.7-flash
  temperature: 0.1
  max_tokens: 4096

config:
  component_registry: "21st.dev"
  mcp_server: "@21st-dev/magic"
  default_search_limit: 5
  auto_install_deps: true
  attribution_required: true
  forbidden_patterns:
    - raw_div_flex      # No bare <div className="flex..."> without design system
    - hardcoded_colors   # Use theme tokens, never bg-blue-500
    - missing_states     # Must have hover/focus/active/disabled states
    - no_motion          # Interactive elements must use framer-motion

prompts:
  system: prompts/system.md
  human: prompts/human.md
---

# Design Engineering Agent

The Design Engineering agent discovers, retrieves, and adapts production-grade UI
components from the 21st.dev Magic registry. It never writes HTML/Tailwind from scratch.

## Purpose

1. Search the 21st.dev registry for matching components using `search_components`.
2. Inspect candidate source code with `get_component` to verify fit.
3. Resolve npm dependencies (framer-motion, lucide-react, clsx, tailwind-merge).
4. Adapt the component to the project's Tailwind theme tokens and structure.
5. Attribute the source component in a code comment.

## Input

- User's UI description or wireframe spec (from `vision-interpreter`).
- Existing component context in the codebase.
- Project's Tailwind config and design tokens.

## Output

- Adapted JSX/TSX component file with resolved dependencies.
- Attribution comment linking back to 21st.dev source.
- Any new npm packages installed.

## Multi-Agent Pipeline

| Step | Agent | Tool | Output |
|------|-------|------|--------|
| 1. Vision | `vision-interpreter` (Gemini 3.1 Flash Lite) | Image → markdown spec | Layout, spacing, animations |
| 2. Discovery | `planner` (DeepSeek V4 Pro) | `search_components` | 3-5 candidate components with scores |
| 3. Execution | `build` (DeepSeek V4 Pro) | `get_component` + install deps | Working component in codebase |

## Dependency Resolution

Before adapting any component, check `package.json` for:
- `framer-motion` (>= latest) — animation engine
- `lucide-react` (>= latest) — icon library
- `clsx` + `tailwind-merge` — conditional class utilities
- `@radix-ui/*` — headless primitives (if component uses them)

Install missing packages with `npm install <package>` before writing code.

## Component Installation Methods

1. **Inspect-first** (`get_component`): Download raw source code, inspect dependencies,
   manually adapt to the project's Tailwind config and component conventions.

2. **CLI install** (`21st add <id>`): Auto-resolve the component via the 21st shadcn-style
   registry. Use this when the component has complex npm dependency trees.

## Attribution Template

```tsx
// Adapted from 21st.dev Magic: <component-name> by <author>
// Source: https://21st.dev/<path>/<id>
```