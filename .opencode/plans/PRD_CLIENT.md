# PRD_CLIENT.md — Client-Side Refactor Blueprint

> **Status**: Architectural Audit Complete — Ready for Phase C Execution  
> **Scope**: Full `client/` codebase alignment with declarative backend + 21st.dev visual overhaul  
> **Audience**: Build agents, PM review, design sign-off

---

## Executive Summary

The client is a **Next.js 16 + React 19 + Tailwind** application with **TanStack Query**, **Clerk Auth**, **Framer Motion**, and **shadcn/ui** foundation. The backend has been fully refactored to a **declarative skill-tree architecture** (Python engine at `server/app/engine/` + `axiom-skills/`). The client now requires:

1. **API Contract Alignment** — Map frontend calls to the new backend schema
2. **Agent Graph Visualization** — Live SSE stream of the 5-node Mixture-of-Experts circuit
3. **Visual Overhaul** — Replace static/hand-rolled components with 21st.dev Magic registry components
4. **Testing Infrastructure** — Vitest + Playwright + Storybook for regression safety

---

## Phase 1 — Codebase Mapping (Graphify Analysis)

### 1.1 Client Route Map

| Route | File | Purpose | Status |
|-------|------|---------|--------|
| `/` | `src/app/page.tsx` | Landing page with interactive demo | ✅ Polished |
| `/dashboard` | `src/app/dashboard/page.tsx` | Main authenticated workspace | ⚠️ Needs API sync |
| `/dashboard/compare` | `src/app/dashboard/compare/page.tsx` | Strategist Arena (multi-doc) | ⚠️ Partial API alignment |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | API key management | ✅ Aligned |

### 1.2 Component Inventory (Graphify Communities)

| Community | Key Files | Role | Alignment |
|-----------|-----------|------|-----------|
| **Community 12** | `DashboardShowcase`, `cardVariants`, `containerVariants` | Landing animations | ✅ Visual-only |
| **Community 27** | `VerificationDashboard`, `DocumentPanel`, `UploadZone`, `IngestionOverlay` | Core workspace | ⚠️ API mismatch |
| **Community 28** | `CommandCenterHome`, `WelcomeTelemetry`, `RecentVault` | Dashboard shell | ✅ Structure OK |
| **Community 33** | `StrategistArena`, `ChatInput`, `ChatThread` | Multi-doc comparison | ⚠️ API mismatch |
| **Community 30** | `ChatThread`, `PdfExportButton`, `DynamicThought` | Chat rendering | ✅ SSE-driven |
| **Community 52** | `ScanlineOverlay`, `IngestionOverlay` | Loading UX | ✅ Framer Motion |
| **Community 74** | `AppSidebar`, `DashboardProviders` | Layout & providers | ✅ Structure OK |

### 1.3 God Nodes (Most Connected)

| Node | Edges | Role |
|------|-------|------|
| `cn()` | 36 | Class name utility — **ubiquitous** |
| `api` (from `src/lib/api.ts`) | 28 | **Single API bridge** — all backend calls route here |
| `useAuditStream` | 22 | SSE hook — **core realtime contract** |
| `ChatThread` | 18 | Main message renderer |
| `VerificationDashboard` | 15 | Main workspace orchestrator |

---

## Phase 2 — Client-Server Gap Analysis

### 2.1 API Contract Mapping

| Client Method (`src/lib/api.ts`) | Backend Endpoint (`server/app/api/`) | Status | Notes |
|----------------------------------|--------------------------------------|--------|-------|
| `uploadDocument` | `POST /api/v1/upload` | ✅ Aligned | Multipart + Bearer token |
| `checkStatus` | `GET /api/v1/status/{filename}` | ✅ Aligned | Polling for ingestion |
| `verifyQuestion` | `POST /api/v1/verify` | ⚠️ **Mismatch** | Backend uses SSE stream; client parses SSE manually |
| `getLatest` | `GET /api/v1/latest` | ✅ Aligned | Session recovery |
| `getHistory` | `GET /api/v1/documents` | ✅ Aligned | Document list |
| `getMetadata` | `GET /api/v1/metadata/{filename}` | ✅ Aligned | Document telemetry |
| `saveToVault` | `POST /api/v1/save` | ✅ Aligned | Persistence toggle |
| `deleteDocument` | `DELETE /api/v1/documents/{filename}` | ✅ Aligned | Purge |
| `getTelemetry` | `GET /api/v1/telemetry` | ✅ Aligned | RAGAS metrics |
| `searchVault` | `POST /api/v1/vault/search` | ⚠️ **Missing** | Client calls `/api/v1/search`; backend is `/api/v1/vault/search` |
| `getChatHistory` | `GET /api/v1/chat/{filename}` | ✅ Aligned | Session persistence |
| `listApiKeys` | `GET /api/v1/keys/` | ✅ Aligned | Key management |
| `createApiKey` | `POST /api/v1/keys/` | ✅ Aligned | Key generation |
| `revokeApiKey` | `DELETE /api/v1/keys/{keyId}` | ✅ Aligned | Key revocation |

### 2.2 Critical Misalignments

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| **1** | **Vault Search Endpoint** | Client calls `/api/v1/search`; backend is `/api/v1/vault/search` | Update `api.ts` → `${API_BASE_URL}/vault/search` |
| **2** | **SSE Event Schema Drift** | Backend emits `node_update`, `token`, `clear`, `audit_complete`, `error`; client expects exact string matches | Harden `useAuditStream` with typed event map + fallback |
| **3** | **Missing `comparison_map` in State** | Backend `AgentState` has `comparison_map: {}`; client never populates it for Strategist | Add `comparison_map` to `initial_state` in `useAuditStream` |
| **4** | **Strategist `/axm -c` Flag Not Injected** | `StrategistArena` prepends `/axm -c` manually; backend `retrieve_node` parses `/axm` globally | Centralize command parsing in `useAuditStream` |
| **5** | **History Hydration Race** | `VerificationDashboard` calls `getChatHistory` on mount; `useAuditStream` also hydrates from DB | Deduplicate — single source of truth in `useAuditStream` |

### 2.3 Backend Capabilities Not Exposed to Client

| Backend Feature | Endpoint | Client Gap |
|-----------------|----------|------------|
| **Deep Audit Flag** (`-a`) | Parsed in `retrieve_node` | Not surfaced in UI — add "Deep Audit" toggle |
| **Table Mode** (`-t`) | Applied in `generate_node` | Not surfaced — add "Table Mode" button |
| **Intensified Verification** (`-v`) | Applied in `grade_generation_node` | Not surfaced — add "Strict Mode" toggle |
| **History RPL** (`-h`) | Applied in `generate_node` | Not surfaced — add "History" toggle |
| **Root Reset** (`..`) | Parsed in `retrieve_node` | Not surfaced — add "Clear Session" button |
| **Strategist Multi-Doc** (`-c`) | Parsed in `route_post_retrieval` | Partial — `StrategistArena` exists but isolated from main chat |

---

## Phase 3 — UX/UI Review & 21st.dev Integration Plan

### 3.1 Current Visual Debt

| Component | Issue | 21st.dev Replacement |
|-----------|-------|---------------------|
| **`IngestionOverlay`** | Static spinner, no progress granularity | **Skeleton** (id: 1767/1588/4876) + **Progress** with real-time chunk count from SSE |
| **`UploadZone`** | Basic drag-drop, no file preview | **File Upload** with drag-drop + thumbnail + progress |
| **`DocumentPanel`** | Static metadata cards | **Data Grid Table** (id: 4781/2750) with sortable columns + inline actions |
| **`ChatThread`** | Custom markdown + basic animations | **Code Block** (id: 1743/1361) for syntax highlighting + **ReactMarkdown** with GFM |
| **`ChatInput`** | Custom textarea + send/stop | **Command Palette** (id: 2075/6216) for `/axm` commands + inline |
| **`StrategistArena`** | Basic file chips + markdown table | **Data Grid Table** (id: 4781) with sticky headers + inline sparklines (id: 7475) |
| **`VerificationDashboard`** | Manual sidebar + manual polling | **Command Palette** (id: 2075) for global actions + **Skeleton** for loading |
| **`InteractiveDemo`** | Hardcoded CRT animation | **N8N Workflow Block** (id: 10645) for live agent graph visualization |

### 3.2 21st.dev Component Integration Plan

| Priority | 21st.dev Component | Target Location | Dependencies |
|----------|-------------------|-----------------|--------------|
| **P0** | **Command Palette** (id: 2075/6216) | Global `Cmd/Ctrl+K` — search vault, run `/axm`, navigate | `cmdk`, `lucide-react` |
| **P0** | **N8N Workflow Block** (id: 10645) | `InteractiveDemo` + `VerificationDashboard` agent graph panel | `reactflow` or custom SVG |
| **P0** | **Data Grid Table** (id: 4781/2750) | `StrategistArena` matrix, `DocumentPanel` metadata | `@tanstack/react-table` |
| **P1** | **Skeleton** (id: 1588/4876) | `IngestionOverlay`, `DocumentPanel`, `ChatThread` loading | None (Tailwind) |
| **P1** | **Code Block** (id: 1743/1361) | `ChatThread` for audit reports + code snippets | `shiki` or `prismjs` |
| **P1** | **Inline Analytics Table** (id: 7475) | `StrategistArena` for inline sparklines in comparison matrix | `recharts` or `sparkline` |
| **P2** | **Command Menu** (id: 4430) | `ChatInput` for `/axm` autocomplete | `cmdk` |
| **P2** | **Code Editor Sheet** (id: 2676) | Settings → API Key editor with syntax highlighting | `ace-editor` |
| **P2** | **Dendrogram/Streamgraph** (id: 2343/2338) | Telemetry page for RAGAS trends over time | `d3` or `recharts` |

### 3.3 Visual Language Upgrade

| Current | Target (21st.dev) |
|---------|------------------|
| Hand-rolled `framer-motion` variants | **Motion primitives** from 21st.dev (staggered reveals, spring physics) |
| Custom `cn()` utility + ad-hoc Tailwind | **Design tokens** from 21st.dev theme (color, spacing, radius) |
| Static loading spinners | **Skeleton screens** matching final layout (CLS prevention) |
| Hardcoded color values (`brand-primary`, `zinc-*`) | **CSS custom properties** from 21st.dev theme (light/dark auto) |
| Manual `ReactMarkdown` components | **Code Block** + **GFM Table** + **Mermaid** support out of box |

---

## Phase 4 — Refactor Blueprint (PRD_CLIENT.md Phases)

### Phase C1: API & Route Alignment (Week 1)

| Task | File | Description |
|------|------|-------------|
| **C1.1** | `src/lib/api.ts` | Fix `searchVault` → `/api/v1/vault/search`; add typed `VaultSearchRequest` |
| **C1.2** | `src/lib/api.ts` | Add `searchVault` Zod schema; align `VaultSearchResult` with backend `VaultSearchResult` |
| **C1.3** | `src/hooks/use-audit-stream.ts` | Inject `/axm` flags from UI state; centralize command parsing |
| **C1.4** | `src/hooks/use-audit-stream.ts` | Add `comparison_map` to `initial_state` for Strategist |
| **C1.5** | `src/lib/api.ts` | Deduplicate history hydration — single `getChatHistory` call in `useAuditStream` |
| **C1.6** | `src/app/dashboard/compare/page.tsx` | Merge `StrategistArena` into main chat flow (remove separate route) |

### Phase C2: State & Dynamic Graph Management (Week 2)

| Task | File | Description |
|------|------|-------------|
| **C2.1** | `src/hooks/use-audit-stream.ts` | Replace manual SSE parsing with **typed event map** (`node_update`, `token`, `clear`, `audit_complete`, `error`) |
| **C2.2** | `src/hooks/use-audit-stream.ts` | Add **typed event map** with Zod validation for each SSE event type |
| **C2.3** | `src/hooks/use-audit-stream.ts` | Add **node status** (`thinking`/`reasoning`/`verified`/`error`/`no_evidence`) with timestamps |
| **C2.4** | `src/components/verification-dashboard.tsx` | Add **Agent Graph Panel** (right rail) using **N8N Workflow Block** (id: 10645) — live node highlighting via SSE `node_update` |
| **C2.5** | `src/hooks/use-audit-stream.ts` | Add **AbortController** integration with `stopStream` for true cancellation |
| **C2.5** | `src/hooks/use-audit-stream.ts` | Add **retry logic** with exponential backoff for SSE reconnection |

### Phase C3: Visual UI/UX Overhaul (Week 3–4)

| Task | File | 21st.dev Component | Description |
|------|------|-------------------|-------------|
| **C3.1** | `src/components/vault/ingestion-overlay.tsx` | **Skeleton** (id: 1588) | Replace spinner with skeleton matching `DocumentPanel` layout |
| **C3.2** | `src/components/vault/upload-zone.tsx` | **File Upload** + **Skeleton** | Drag-drop + thumbnail + progress + error toast |
| **C3.3** | `src/components/vault/document-panel.tsx` | **Data Grid Table** (id: 4781) | Sortable, filterable metadata + inline actions |
| **C3.4** | `src/components/chat/chat-thread.tsx` | **Code Block** (id: 1743) | Syntax highlighting for audit reports + copy button |
| **C3.5** | `src/components/chat/chat-input.tsx` | **Command Palette** (id: 2075) | `/axm` autocomplete + global search |
| **C3.6** | `src/components/workspace/strategist-arena.tsx` | **Data Grid Table** (id: 4781) + **Inline Analytics Table** (id: 7475) | Comparative matrix with sticky headers + inline sparklines |
| **C3.7** | `src/components/landing/interactive-demo.tsx` | **N8N Workflow Block** (id: 10645) | Live agent graph — 5 nodes, animated edges, SSE-driven highlighting |
| **C3.8** | `src/components/vault/document-panel.tsx` | **Skeleton** (id: 1588) | Metadata loading state matching final layout |
| **C3.9** | `src/components/chat/chat-thread.tsx` | **Code Block** (id: 1361/1743) | Multi-file tabs, syntax highlighting, copy-to-clipboard |
| **C3.10** | Global `Cmd/Ctrl+K` | **Command Palette** (id: 2075) | Vault search, `/axm` commands, navigation, settings |

### Phase C4: Testing & Verification Infrastructure (Week 5)

| Task | Tool | Description |
|------|------|-------------|
| **C4.1** | **Vitest** | Unit tests for `useAuditStream` (SSE parsing, state machine, abort) |
| **C4.2** | **Vitest** | Unit tests for `api.ts` (request shaping, error mapping, abort) |
| **C4.3** | **Vitest** | Component tests for `ChatThread`, `ChatInput`, `DocumentPanel` (React Testing Library) |
| **C4.4** | **Playwright** | E2E: Upload → Ingest → Query → Stream → Verify → Save flow |
| **C4.5** | **Playwright** | E2E: Multi-doc Strategist comparison (select 2+ docs → `/axm -c` → matrix) |
| **C4.6** | **Playwright** | E2E: SSE reconnection (network failure → auto-reconnect → resume) |
| **C4.7** | **Storybook** | Document all 21st.dev components + custom variants |
| **C4.8** | **MSW** | Mock SSE server for deterministic streaming tests |

---

## 21st.dev Component Inventory (Ready to Install)

```bash
# P0 — Critical Path
npx shadcn@latest add "https://21st.dev/r/rafa-porto/command-palette?api_key=$API_KEY_21ST"   # id: 2075
npx shadcn@latest add "https://21st.dev/r/moumensoliman/n8n-workflow-block-shadcnui?api_key=$API_KEY_21ST"  # id: 10645
npx shadcn@latest add "https://21st.dev/r/reui/data-grid-table?api_key=$API_KEY_21ST"         # id: 4781

# P1 — Core UI
npx shadcn@latest add "https://21st.dev/r/shadcn/skeleton?api_key=$API_KEY_21ST"              # id: 1588
npx shadcn@latest add "https://21st.dev/r/motion-primitives/code-block?api_key=$API_KEY_21ST"  # id: 1743
npx shadcn@latest add "https://21st.dev/r/ruixenui/inline-analytics-table?api_key=$API_KEY_21ST"  # id: 7475

# P2 — Polish
npx shadcn@latest add "https://21st.dev/r/hextaui/command-menu?api_key=$API_KEY_21ST"         # id: 4430
npx shadcn@latest add "https://21st.dev/r/bankkroll/code-editor-sheet?api_key=$API_KEY_21ST"   # id: 2676
```

> **Note**: `get_component` calls consume daily quota. Batch installs in one session.

---

## Dependency Audit (package.json)

| Package | Current | Required for 21st.dev | Action |
|---------|---------|----------------------|--------|
| `@tanstack/react-table` | ❌ Missing | Data Grid Table (id: 4781) | `npm i @tanstack/react-table` |
| `cmdk` | ❌ Missing | Command Palette (id: 2075/4430) | `npm i cmdk` |
| `reactflow` | ❌ Missing | N8N Workflow Block (id: 10645) | `npm i reactflow` |
| `recharts` | ❌ Missing | Inline Analytics Table (id: 7475) | `npm i recharts` |
| `shiki` / `prismjs` | ❌ Missing | Code Block (id: 1743) | `npm i shiki` |
| `zod` | ✅ v3.22 | API validation | Keep |
| `framer-motion` | ✅ latest | Animations | Keep |
| `lucide-react` | ✅ latest | Icons | Keep |
| `nuqs` | ✅ latest | URL state | Keep |

---

## Success Criteria (Definition of Done)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Alignment** | 100% | Zero mismatched endpoints in `api.ts` |
| **SSE Event Coverage** | 100% | All 5 event types (`node_update`, `token`, `clear`, `audit_complete`, `error`) typed + tested |
| **Strategist Integration** | Single route | `/dashboard` handles `-c` flag; `/dashboard/compare` removed |
| **21st.dev Coverage** | ≥10 components | All P0/P1 components installed + documented in Storybook |
| **Test Coverage** | ≥80% | Vitest unit + Playwright E2E on critical flows |
| **CLS Prevention** | Zero layout shift | All loading states use Skeleton matching final layout |
| **Accessibility** | AA | Command Palette keyboard nav, ARIA labels, focus management |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **21st.dev quota exhaustion** | Medium | Blocks P0 installs | Batch installs; use `get_component` sparingly; cache locally |
| **SSE parsing regression** | High | Breaks streaming UX | Typed event map + Vitest snapshot tests on every commit |
| **Strategist state leakage** | Medium | Multi-doc context bleed | Key-based remount (`key={contexts.join("-")}`) + `comparison_map` isolation |
| **Command Palette conflict** | Low | Cmd+K clashes with browser | Scope to app root; exclude input/textarea |
| **N8N Workflow Block bundle size** | Medium | Increases client bundle | Dynamic import (`next/dynamic`) for demo only |

---

## Appendix: File Tree (Post-Refactor Target)

```
client/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx                    # Unified dashboard (no /compare)
│   │   │   └── settings/page.tsx
│   │   ├── page.tsx                        # Landing + InteractiveDemo
│   │   └── layout.tsx
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-input.tsx              # + CommandPalette integration
│   │   │   ├── chat-thread.tsx             # + CodeBlock (id: 1743)
│   │   │   └── index.ts
│   │   ├── landing/
│   │   │   ├── interactive-demo.tsx        # + N8NWorkflowBlock (id: 10645)
│   │   │   └── ui/scanline-overlay.tsx
│   │   ├── ui/
│   │   │   ├── code-block.tsx              # Wrapper for 21st.dev CodeBlock
│   │   │   ├── data-grid.tsx               # Wrapper for DataGridTable
│   │   │   ├── skeleton.tsx                # Wrapper for Skeleton
│   │   │   ├── command-palette.tsx         # Global Cmd+K
│   │   │   └── index.ts
│   │   ├── vault/
│   │   │   ├── document-panel.tsx          # + DataGridTable + Skeleton
│   │   │   ├── upload-zone.tsx             # + FileUpload + Skeleton
│   │   │   └── ingestion-overlay.tsx       # + Skeleton
│   │   └── workspace/
│   │       ├── strategist-arena.tsx        # + DataGridTable + InlineAnalytics
│   │       └── verification-dashboard.tsx  # + AgentGraphPanel (N8NWorkflowBlock)
│   ├── hooks/
│   │   ├── use-audit-stream.ts             # Typed SSE + AbortController + retry
│   │   └── index.ts
│   ├── lib/
│   │   ├── api.ts                          # Fixed endpoints + Zod schemas
│   │   └── utils.ts
│   └── types/
│       └── api.ts                          # Shared Zod/TS types
├── vitest.config.ts
├── playwright.config.ts
├── .storybook/
└── package.json
```

---

**End of PRD_CLIENT.md**  
*Ready for Phase C1 execution upon approval.*