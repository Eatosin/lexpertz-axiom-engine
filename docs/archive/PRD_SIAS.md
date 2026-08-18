# PRD_SIAS.md — SiaS (Software-in-a-Service) Architecture Blueprint

> **Status**: Architectural Decisions Locked — Ready for Phase Implementation  
> **Amended**: Q1 (document parsing) → MarkItDown local-only per `docs/DECISIONS/2026-08-15-parser-local-only.md` (2026-08-15)  
> **Amended**: Model policy → Bring Your Own Models (BYOK) + software subscription per `docs/DECISIONS/2026-08-16-model-policy-byok.md` (2026-08-16)
> **Scope**: Complete re-architecture from multi-tenant SaaS to local-first desktop auditing coworker  
> **Audience**: Build agents, PM review, stakeholder sign-off  

---

## Executive Summary

Axiom Engine pivots from a **multi-tenant cloud SaaS** to a **SiaS (Software-in-a-Service)** desktop application — what we call a "Cloud-Brain, Local-Data" auditing coworker. Enterprise auditors receive a single installer (`Axiom.exe` < 80MB) that launches a native Windows desktop app with zero terminal exposure, no cloud dependency for core functionality, and strict client-data isolation via multi-vault SQLite.

### Product B: Public Web Portal (auth.axiom.ai)

The ecosystem comprises **two products**: (A) the **Local Desktop App** (`Axiom.exe`) — a zero-cloud-dependency auditing coworker for enterprise auditors, and (B) the **Public Web Portal** (`auth.axiom.ai`) — a Vercel-deployed Next.js application serving as the marketing landing page, billing gateway abstraction layer, and OAuth 2.0 device authorization server.

The portal's central Supabase database stores only **user accounts**, **subscription states**, and **ephemeral device authorization codes** — **never** raw customer documents or vector embeddings. The payment processor integration is **provider-agnostic** (Paystack / Flutterwave / Stripe selectable at deploy time via config).

###
 Key Architectural Decisions (Socratic)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| **Q1** | Document parsing | **MarkItDown (MIT) for PDF + openpyxl/pandas for Excel/CSV** | Local-only parsing (privacy-first); structured Markdown with table/heading detection. See `docs/DECISIONS/2026-08-15-parser-local-only.md` |
| **Q2** | Workspace isolation | **Multi-vault SQLite** — separate `.db` per client | Zero data leakage between audit engagements; `vec0` for vector search |
| **Q3** | Desktop authentication | **OAuth 2.0 device-activation flow** | No HTTP port exposure; browser login authorizes desktop device; long-lived refresh tokens via Tauri native IPC |
| **Q4** | Desktop framework | **Tauri** | Static Next.js export bundled with compiled FastAPI sidecar (Nuitka); <80MB installer, native Windows feel |

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  USER: Double-click Axiom.exe (zero terminal)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────┐                        │
│  │  Tauri Shell (Rust)                 │                        │
│  │  ├── WebView (Next.js static export)│                        │
│  │  ├── IPC bridge (invoke/events)     │  ◄── OAuth 2.0 tokens  │
│  │  └── Sidecar manager (spawn/kill)   │  through IPC only      │
│  └──────────────┬──────────────────────┘                        │
│                 │ IPC (no HTTP)                                  │
│  ┌──────────────▼──────────────────────┐                        │
│  │  FastAPI Sidecar (Nuitka-compiled)   │                        │
│  │  ├── REST API (127.0.0.1:0 random)  │  ◄── Tauri-only access │
│  │  ├── LangGraph agent circuit         │                        │
│  │  ├── SQLite multi-vault manager      │                        │
│  │  └── Document parser pipeline        │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
│  ┌─────────────────────────────────────┐                        │
│  │  %APPDATA%/AxiomEngine/             │                        │
│  │  ├── config.json                    │                        │
│  │  ├── vaults/                        │                        │
│  │  │   ├── client_acme.db             │  ◄── vec0 vector index │
│  │  │   └── client_beta.db             │                        │
│  │  ├── temp/                          │  ◄── ephemeral uploads │
│  │  └── logs/                          │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────┐
│  AXIOM ECOSYSTEM (DUAL ARCHITECTURE)                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────┐         HTTPS        ┌───────────────┐  │
│  │  DESKTOP APP (Local)     │◄──────────────────────►│  WEB PORTAL   │  │
│  │  Axiom.exe (Tauri)       │   OAuth Device Flow    │  (Vercel)     │  │
│  │  ┌────────────────────┐   │   Token Refresh        │               │  │
│  │  │ FastAPI Sidecar    │   │                         │  auth.axiom   │  │
│  │  │ (Nuitka, offline)  │   │                         │  .ai          │  │
│  │  └────────────────────┘   │                         │               │  │
│  │           │               │                         │  ├── Billing │  │
│  │  ┌────────────────────┐   │    HTTPS (device flow) │  │   Gateway │  │
│  │  │ SQLite Vaults      │   │                         │  │   (Abstract│  │
│  │  │ (per-client .db)   │   │    HTTPS (device flow) │  │    Paystack│  │
│  │  └────────────────────┘   │                         │  │  /Flutter- │  │
│  │                           │                         │  │   wave/    │  │
│  └───────────────────────────┘                         │  └───────────┘  │
│                                                          │        │       │
│                                                          │   ┌────▼────┐  │
│                                                          │   │Supabase │  │
│                                                          │   │(Users / │  │
│                                                          │   │ Subs /  │  │
│                                                          │   │Dev Codes│  │
│                                                          │   └─────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Layer Architecture

| Layer | Technology | Role |
|-------|-----------|------|
| **Desktop Shell** | Tauri (Rust) | Native window, WebView, IPC bridge, sidecar lifecycle |
| **UI** | Next.js static export + React 19 + Tailwind | Dashboard, chat, document panels, settings |
| **IPC Transport** | Tauri `invoke` / `listen` | All sidecar communication (no HTTP ports accessible outside localhost) |
| **Backend API** | FastAPI (Nuitka-compiled) | REST endpoints consumed exclusively by Tauri IPC proxy |
| **Agent Circuit** | LangGraph | Librarian → Editor/Strategist → Architect → Prosecutor (unchanged) |
| **Document Parsing** | MarkItDown + openpyxl/pandas | PDF → Markdown (local-only, no model weights), Excel/CSV → Markdown |
| **Vector Storage** | SQLite + `vec0` extension | Per-client `.db` file with embedded vector index |
| **Embeddings** | Local (default) + NVIDIA NIM (BYOK) | `all-MiniLM-L6-v2` on-device; `nvidia/llama-nemotron-embed-1b-v2` only when the user supplies their own key. Model policy: `docs/DECISIONS/2026-08-16-model-policy-byok.md` |
| **Auth** | OAuth 2.0 Device Flow | Browser-based device activation, refresh tokens in secure store |
| **Public Portal** | Next.js (Vercel) + Supabase | Marketing landing page, provider-agnostic billing gateway abstraction, OAuth device authorization server, user/subscription management |

---

## Phase Plan

### Phase 0: Foundation — Dynamic Paths & Config (1 session)

**Objective**: Eliminate all hardcoded developer paths and single-instance Supabase coupling. Establish the dynamic-path runtime that every subsequent phase depends on.

**Context**: The current codebase has `TEMP_DIR = "/tmp/axiom_ingest"` (line 26 of `server/app/api/ingest.py`) and Supabase client singleton (`server/app/core/database.py`). Every file access path must resolve at runtime against the OS home directory. The Supabase singleton must be shimmed behind an abstract `VaultPort` interface so downstream code can be migrated per-phase without breaking.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| F.1 | Create `axiom_paths.py` | `server/app/core/axiom_paths.py` (new) | `get_axiom_home()` → `%APPDATA%/AxiomEngine` (Windows) / `~/.axiom-engine` (macOS/Linux). `get_vault_dir()`, `get_temp_dir()`, `get_log_dir()`. All return `Path` objects, all create dirs on first access |
| F.2 | Create `VaultPort` abstract interface | `server/app/core/ports.py` (new) | Define `VaultPort` protocol: `store_document`, `get_document`, `search_similar`, `store_message`, `get_history`, `get_telemetry`. Document the per-method contract (input types, return types, error codes) |
| F.3 | Wrap existing Supabase client as `SupabaseVaultAdapter` | `server/app/core/database.py` | Implement `VaultPort` using existing Supabase code. Preserve the full existing API contract so ingest.py, run.py, vault.py continue working during migration. Add a feature flag in `config.json` to select adapter |
| F.4 | Replace `TEMP_DIR` with dynamic path | `server/app/api/ingest.py` | Replace `TEMP_DIR = "/tmp/axiom_ingest"` with `axiom_paths.get_temp_dir()`. Validate Windows path resolution works |
| F.5 | Create `SiaSConfig` | `server/app/core/config.py` (rewrite) | JSON config file at `%APPDATA%/AxiomEngine/config.json`. Fields: `active_vault`, `default_vault`, `embedding_mode` (local/cloud), `nvidia_api_key` (BYOK), `provider` (nvidia/groq/openai/deepseek/ollama), `ollama_url`, `theme`, `auto_start`. Load on boot, persist on change. BYOK keys migrate to Tauri secure store at Phase 5 |
| F.6 | Add `axiom_paths_test.py` | `tests/test_axiom_paths.py` (new) | Verify paths resolve correctly on Windows (`%APPDATA%`) and fallback to `~/.axiom-engine` |
| F.7 | Add `VaultPort_test.py` | `tests/test_vault_port.py` (new) | Contract tests against the port interface with in-memory fake |
| F.8 | Create Supabase schema for portal | `server/app/core/portal_schema.sql` (new) | Tables: `users`, `subscriptions`, `device_codes`, `payment_customers`. `subscriptions` stores `provider` (paystack/flutterwave/stripe), `provider_customer_id`, `status`, `current_period_end`. `device_codes` stores `user_code`, `device_code`, `user_id`, `expires_at`, `authorized_at` |
| F.9 | Add Supabase client for portal | `server/app/core/portal_db.py` (new) | Lightweight async client for portal-only tables. Separate from `VaultPort` — this is cloud-only, used by device auth endpoints |
| F.10 | Add portal config to SiaSConfig | `server/app/core/config.py` | Fields: `portal_url` (default: `https://auth.axiom.ai`), `supabase_portal_url`, `supabase_portal_anon_key` |

**Verification**:
```bash
# All existing tests still pass (Supabase adapter unchanged)
pytest tests/ -x --timeout=30

# Dynamic path resolves correctly
python -c "from app.core.axiom_paths import get_axiom_home; print(get_axiom_home())"

# VaultPort interface loads
python -c "from app.core.ports import VaultPort; print(VaultPort)"
```

**Exit Criteria**: Zero hardcoded paths remain. `VaultPort` abstract interface defined with full contract. Supabase adapter wraps existing code. Config file load/save roundtrip verified. All existing tests pass.

---

### Phase 1: SQLite Multi-Vault (3 sessions)

**Objective**: Replace Supabase pgvector with per-client SQLite databases using the `vec0` extension for vector search. Each audit client gets an isolated `.db` file with zero data leakage between engagements.

**Context**: The `VaultPort` interface from Phase 0 provides the seam. This phase implements a `SqliteVaultAdapter` behind that interface, then migrates each endpoint one at a time. The `vec0` extension (`sqlite-vec`) provides embedded vector search without a separate vector database server.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 1.1 | Design SQLite multi-vault schema | `server/app/core/sqlite_schema.py` (new) | `vaults/client_acme.db` per file. Tables: `documents`, `chunks` (with vec0 virtual table), `chat_messages`, `audit_logs`, `api_keys`. Each table includes `vault_id` column (the client slug). Document schema design choices and migration path in code comments |
| 1.2 | Implement `SqliteVaultAdapter` | `server/app/core/sqlite_adapter.py` (new) | Full `VaultPort` implementation using `sqlite-vec`. Methods: `store_document()`, `get_document()`, `search_similar()` (vec0 hybrid), `store_message()`, `get_history()`, `get_telemetry()`, `create_vault()`, `list_vaults()`, `delete_vault()`. Each `.db` file gets `vec0` virtual table on creation |
| 1.3 | Write vec0 adapter for embeddings | `server/app/core/vector_store.py` (new) | Thin wrapper around `sqlite-vec` for `create`, `insert`, `query` (cosine similarity). Handles 1024-d NVIDIA vectors and 384-d local MiniLM vectors. Normalize to unit length before insert |
| 1.4 | Migrate ingest.py to `SqliteVaultAdapter` | `server/app/api/ingest.py` | Swap `SupabaseVaultAdapter` → `SqliteVaultAdapter` via `SiaSConfig`. Concurrent batch insert (existing semaphore pattern preserved). Remove all `supabase` imports from this file |
| 1.5 | Migrate run.py to `SqliteVaultAdapter` | `server/app/api/run.py` | Chat history hydration reads from SQLite. Audit log insertion writes to SQLite. SSE streaming logic unchanged |
| 1.6 | Migrate vault.py to `SqliteVaultAdapter` | `server/app/api/vault.py` | Vault search, document listing, metadata queries |
| 1.7 | Migrate history.py to `SqliteVaultAdapter` | `server/app/api/history.py` | History CRUD operations |
| 1.8 | Migrate keys.py to `SqliteVaultAdapter` | `server/app/api/keys.py` | API key CRUD (stored in SQLite, not Supabase) |
| 1.9 | Write SQLite backup & restore | `server/app/core/vault_backup.py` (new) | `vault_backup(vault_name)` → copies `.db` to `.db.backup`. `vault_restore(vault_name, backup_path)`. Used before destructive migrations |
| 1.10 | Full test suite for SQLite adapter | `tests/test_sqlite_adapter.py` (new) | Contract tests from Phase 0 against `SqliteVaultAdapter`. 80%+ coverage on CRUD, vector search, multi-client isolation, concurrent access |

**Schema Design**:

```sql
-- Each vault file: vaults/client_<slug>.db

CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    is_permanent INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    metadata_json TEXT
);

-- vec0 virtual table for vector search
CREATE VIRTUAL TABLE chunks USING vec0(
    id INTEGER PRIMARY KEY,
    document_id INTEGER,
    chunk_index INTEGER,
    content TEXT,
    embedding FLOAT[1024]
);

CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metrics_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    faithfulness REAL,
    precision REAL,
    relevance REAL,
    latency REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_value TEXT UNIQUE NOT NULL,
    label TEXT,
    is_active INTEGER DEFAULT 1,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

**Verification**:
```bash
# SQLite adapter contract tests
python -m pytest tests/test_sqlite_adapter.py -x -v --cov=server/app/core/sqlite_adapter.py

# Multi-client isolation test
python -c "
from app.core.sqlite_adapter import SqliteVaultAdapter
a = SqliteVaultAdapter('client_a')
b = SqliteVaultAdapter('client_b')
a.store_document('doc1.pdf', 'contents')
assert b.get_document('doc1.pdf') is None
print('Isolation verified')
"

# Vector search roundtrip
python -c "
from app.core.sqlite_adapter import SqliteVaultAdapter
v = SqliteVaultAdapter('test')
v.store_chunk(1, 'test content', [0.1]*1024)
results = v.search_similar([0.1]*1024, limit=5)
assert len(results) > 0
print('Vector search OK')
"

# All existing tests pass with Supabase adapter (regression)
pytest tests/ -x --timeout=30
```

**Exit Criteria**: `SqliteVaultAdapter` fully implements `VaultPort`. All CRUD + vector search operations work. Multi-client isolation proven (write to client_a cannot be read from client_b). Ingest/run/vault/history/keys all use the SQLite adapter. Existing Supabase adapter still passes all tests.

---

### Phase 2: Local Embeddings with Cloud Fallback (2 sessions)

**Objective**: Add a local embedding model so the desktop app works fully offline. Cloud NVIDIA NIM (`llama-nemotron-embed-1b-v2`) is used **only when the user supplies their own key** (BYOK policy — `docs/DECISIONS/2026-08-16-model-policy-byok.md`).

**Context**: Current `EmbeddingAdapter` (`server/app/core/embeddings.py`) is cloud-only (NVIDIA NIM via OpenAI client). For the SiaS desktop app, auditors must work offline. The embedding dimension changes from 1024 (NVIDIA) to 384 (MiniLM) for local mode. `vec0` schema must handle both dimensions.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 2.1 | Create `EmbeddingPort` interface | `server/app/core/ports.py` | `embed_text(text, is_query) → List[float]`. Interface matches the existing `get_embedding()` signature |
| 2.2 | Rename existing `EmbeddingAdapter` → `NvidiaEmbeddingAdapter` | `server/app/core/embeddings.py` | Implement `EmbeddingPort`. Same NVIDIA NIM code, no behavioral change |
| 2.3 | Create `LocalEmbeddingAdapter` | `server/app/core/embeddings_local.py` (new) | Uses `sentence-transformers/all-MiniLM-L6-v2` via ONNX runtime for CPU-only inference. Returns 384-d vectors. Lazy-load model on first call (~80ms cold start on modern CPU). Dimension configurable at construction time |
| 2.4 | Create `AdaptiveEmbedder` | `server/app/core/embedding_gateway.py` (new) | Implements `EmbeddingPort`. Local MiniLM by default; cloud NIM used only when a user BYOK key is configured (`SiaSConfig.nvidia_api_key` / `provider`). If cloud fails mid-session, auto-fallback to local. Emit warning event to Tauri IPC. Dimension-aware: store `embedding_dim` in vault metadata, switch adapter at runtime |
| 2.5 | Update chunker to support dimension-aware storage | `server/app/core/chunking.py` | No structural change — chunker operates on text only. But document table needs `embedding_dim` column |
| 2.6 | Add offline mode indicator to UI | `client/src/components/status-bar.tsx` (new) | Green dot = cloud BYOK connected. Yellow dot = local-only. Hover tooltip shows "Online (NVIDIA NIM — your key)" / "Offline (local embeddings)" |
| 2.7 | Write embedding mode tests | `tests/test_embeddings.py` (new) | Unit tests for `AdaptiveEmbedder`. Integration test for `LocalEmbeddingAdapter` (requires model download once). Fallback behavior when NVIDIA API key is missing |

**Verification**:
```bash
# Local embedding works
python -c "
from app.core.embeddings_local import LocalEmbeddingAdapter
e = LocalEmbeddingAdapter()
v = e.embed_text('test query', is_query=True)
assert len(v) == 384
print(f'Local embedding OK: dim={len(v)}')
"

# Adaptive fallback with no NVIDIA key
NVIDIA_API_KEY="" python -c "
from app.core.embedding_gateway import AdaptiveEmbedder
e = AdaptiveEmbedder()
v = e.embed_text('test')
assert len(v) == 384
print('Adaptive fallback OK')
"

# Adaptive cloud with valid key
python -c "
from app.core.embedding_gateway import AdaptiveEmbedder
e = AdaptiveEmbedder()
v = e.embed_text('test')
assert len(v) in (384, 1024)
print(f'Adaptive cloud OK: dim={len(v)}')
"
```

**Exit Criteria**: Local embedding produces valid 384-d vectors. AdaptiveEmbedder falls back gracefully when NVIDIA is unreachable. No crash on missing `NVIDIA_API_KEY`. Offline/online indicator in UI.

---

### Phase 3: FastAPI Sidecar Compilation (2 sessions)

**Objective**: Compile the entire FastAPI server into a single Windows executable using Nuitka. No Python runtime required on the target machine. Console window suppressed.

**Context**: The SiaS desktop app ships as a single installer. The Python backend must be compiled ahead-of-time. Nuitka folder mode (not one-file) produces a `dist/` directory that Inno Setup packages. The sidecar is spawned by Tauri on app launch and killed on app close.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 3.1 | Create `build_server.bat` | `server/build_server.bat` (new) | Nuitka compilation script: `--standalone`, `--windows-console-mode=disable`, `--lto=yes`, `--jobs=%NUMBER_OF_PROCESSORS%`. Module exclusion: `unittest,test,pytest,pdb,setuptools,pip`. Plugin: `--enable-plugin=anti-bloat`. Output: `server/dist/axiom-server/` |
| 3.2 | Create `slim_dist.ps1` | `server/slim_dist.ps1` (new) | Post-build cleanup: remove `.pdb`, `.pyi`, `__pycache__`, test dirs, docs. Targets 30-50% size reduction |
| 3.3 | Analyze DLL dependencies | `server/analyze_dlls.py` (new) | Port from `generating-python-installer` skill. Identify largest DLLs for optimization. Remove `opengl32sw.dll`, `d3dcompiler*.dll` if unused |
| 3.4 | Add sidecar manager to Tauri | `server/src-tauri/src/sidecar.rs` (new) | Spawn `axiom-server.exe` on app start. Pass `--port 0` (random port), capture stdout for port number. Health-check via `GET /health`. Kill on app exit. Restart on crash (max 3 retries) |
| 3.5 | Create `axiom_server.py` entry point | `server/app/__main__.py` | Minimal entry point: parse `--port` arg, call `uvicorn.run(app, host='127.0.0.1', port=port)`. Also parse `--data-dir` for `%APPDATA%/AxiomEngine` override |
| 3.6 | Create Inno Setup script | `server/setup.iss` (new) | Package `dist/axiom-server/` as `Axiom-Server-Setup.exe`. LZMA2 ultra compression. VC++ redistributable bundling (vc_redist.x64.exe). Install path: `%LOCALAPPDATA%/Programs/AxiomEngine/` |
| 3.7 | Write sidecar health E2E test | `tests/test_sidecar_e2e.py` (new) | Spawn compiled exe, wait for health check, verify API response, kill process. Run in CI on Windows runners only |
| 3.8 | Update `.gitignore` | `.gitignore` | Add `server/dist/`, `server/build/`, `*.exe` |

**Verification**:
```bash
# Compile (Windows only)
cd server
build_server.bat

# Verify no console window
start /B dist\axiom-server\axiom-server.exe --port 18080
timeout 3
curl http://127.0.0.1:18080/health
# Should return JSON, no terminal window visible

# Kill
taskkill /F /IM axiom-server.exe

# Verify size
powershell "(Get-Item dist/axiom-server/axiom-server.exe).Length / 1MB"
# Target: < 50MB for the compiled server folder
```

**Exit Criteria**: Compiled sidecar launches without console window. Health check responds. Sidecar accepts `--port` and `--data-dir` arguments. Inno Setup produces installer. Windows Defender does not flag as malware (test with `MpCmdRun`).

---

### Phase 4: Tauri Desktop Shell (3 sessions)

**Objective**: Build the Tauri desktop application that wraps the Next.js static export and FastAPI sidecar. The result is `Axiom.exe` — a double-clickable native Windows app.

**Context**: Tauri v2 provides the Rust-based shell, WebView2 for rendering, and IPC bridge for sidecar communication. The Next.js client is built with `next export` (static HTML) and bundled into the Tauri binary. All API calls from the UI proxy through Tauri IPC to the local sidecar — no network ports exposed to the LAN.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 4.1 | Initialize Tauri v2 project | `client/src-tauri/` (new) | `npm create tauri-app` in `client/`. Configuration: Windows target, no auto-updater (v1), MSI Windows installer. Set `identifier` to `com.lexpertz.axiom-engine` |
| 4.2 | Configure Tauri sidecar | `client/src-tauri/tauri.conf.json` | Register `axiom-server.exe` as an [external binary](https://v2.tauri.app/develop/sidecar/). Set `sidecar: true`, `args: ["--port", "0", "--data-dir", "{{app_data_dir}}"]`. Tauri passes resolved `{{app_data_dir}}` to the sidecar — this is the dynamic path guarantee |
| 4.3 | Build IPC bridge | `client/src-tauri/src/commands.rs` (new) | Tauri commands that proxy to the sidecar REST API: `invoke('call_api', { method, path, body })` → HTTP to `127.0.0.1:{sidecar_port}`. SSE streaming via Tauri events: `listen('sse_event', handler)`. All network communication goes through this bridge — zero direct HTTP from the WebView to the sidecar |
| 4.4 | Configure Next.js static export | `client/next.config.ts` | Set `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`. Disable `next/image` optimization (static export limitation). Move Next.js build output to `client/dist/` |
| 4.5 | Bundle static export in Tauri | `client/src-tauri/tauri.conf.json` | `bundle.frontendDist: "../dist"`. Tauri automatically serves this from WebView at `tauri://localhost` |
| 4.6 | Create splash screen | `client/src-tauri/src/splash.rs` (new) | Show during sidecar startup (typically 2-5s). Minimal: centered logo + "Starting Axiom Engine..." text. Progress bar optional. Auto-dismiss when `/health` returns 200 |
| 4.7 | Build Tauri Rust backend | `client/src-tauri/src/lib.rs` | Events: `sse_event` (streaming from IPC bridge), `sidecar_status` (health changes). Commands: `call_api`, `get_port`, `open_vault`, `switch_vault`. Startup sequence: spawn sidecar → wait for health → load WebView → dismiss splash |
| 4.8 | Write Tauri E2E test | `tests/e2e/test_desktop_startup.py` (new) | Using `pywinauto` and Windows UI Automation: launch `Axiom.exe`, wait for window, verify title contains "Axiom", verify splash screen transitions to dashboard, close app, verify no orphan processes |

**Tauri Configuration** (`client/src-tauri/tauri.conf.json` excerpt):

```json
{
  "productName": "Axiom Engine",
  "version": "1.0.0",
  "identifier": "com.lexpertz.axiom-engine",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Axiom Engine",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "minWidth": 900,
        "minHeight": 600
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": ["msi"],
    "icon": ["icons/icon.ico", "icons/icon.png"],
    "externalBin": ["binaries/axiom-server.exe"],
    "resources": ["resources/*"]
  }
}
```

**IPC Bridge Pattern** (`client/src-tauri/src/commands.rs`):

```rust
#[tauri::command]
async fn call_api(
    app: AppHandle,
    method: String,
    path: String,
    body: Option<String>,
) -> Result<String, String> {
    let port = get_sidecar_port(&app);
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/api/v1{}", port, path);

    let resp = match method.as_str() {
        "GET" => client.get(&url).send().await,
        "POST" => client.post(&url)
            .header("content-type", "application/json")
            .body(body.unwrap_or_default())
            .send().await,
        "DELETE" => client.delete(&url).send().await,
        _ => return Err("Unsupported method".into()),
    };

    resp.map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}
```

**SSE Streaming via Tauri Events**:

The sidecar's SSE endpoint (`POST /api/v1/verify`) is consumed by the Rust backend and re-emitted as Tauri events. The WebView listens with `listen('sse_event', callback)`.

```rust
// Pseudo-code for SSE proxy
async fn stream_verify(app: AppHandle, state: AgentState) {
    let client = reqwest::Client::new();
    let mut stream = client
        .post(format!("http://127.0.0.1:{}/api/v1/verify", port))
        .json(&state)
        .send()
        .await
        .unwrap()
        .bytes_stream();

    while let Some(chunk) = stream.next().await {
        let text = chunk.unwrap();
        // Parse SSE events and re-emit through Tauri
        app.emit("sse_event", &text).unwrap();
    }
}
```

**Verification**:
```bash
# Build Next.js static export
cd client
npm run build
ls dist/  # Should have index.html, _next/ etc.

# Build Tauri dev (requires Rust toolchain)
cd client
npx tauri dev

# Verify no orphan processes on close
python tests/e2e/test_no_orphans.py
```

**Exit Criteria**: Tauri app launches, shows splash screen, transitions to dashboard within 5 seconds. All API calls from WebView proxy through IPC bridge. SSE streaming renders in dashboard. Closing the app kills the sidecar process (no orphans). MSI installer builds successfully.

---

### Phase 5: OAuth 2.0 Device Activation & Lockdown (3 sessions)

**Objective**: Implement the complete **OAuth 2.0 Device Authorization Grant (RFC 8628)** flow with a polished desktop activation experience. The desktop app shows an elegant splash screen with an 8-digit user code and "Open Activation Browser" button. The portal at `auth.axiom.ai/activate` accepts the code, authenticates the user, checks subscription status via the abstract billing gateway, and issues a signed refresh token. Tokens are stored in Tauri's secure store (Windows DPAPI / macOS Keychain). If the subscription is expired or cancelled, the desktop app locks the FastAPI sidecar endpoints and returns the user to the activation screen.

**Context**: The device flow is split across two deployments: the **desktop sidecar** hosts the token endpoint (`POST /api/v1/auth/device/token`, `POST /api/v1/auth/refresh`), while the **web portal** hosts the authorization server (`GET /activate`, `POST /activate`, `GET /device/code`). The desktop polls the sidecar; the sidecar proxies device-code requests to the portal's Supabase-backed `device_codes` table. This keeps the desktop fully offline-capable after initial activation — the sidecar validates refresh tokens locally (JWT signature + expiry check) without calling the portal, and enforces a subscription lockdown via `X-Lockdown-Reason` when billing is inactive. Per the model policy (`docs/DECISIONS/2026-08-16-model-policy-byok.md`), the subscription is a **software license check** — no usage metering or token billing; model access is always the user's own (BYOK or local).

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 5.1 | Portal: Device code issuance endpoint | `portal/app/api/device/code/route.ts` (new) | `POST /api/device/code` → generates `device_code` (64-char), `user_code` (8-char `ABCD-EFGH` format), `verification_uri` (`https://auth.axiom.ai/activate`), `interval` (5), `expires_in` (1800). Stores in Supabase `device_codes` with `status: pending`. Returns all fields |
| 5.2 | Portal: Activation page | `portal/app/activate/page.tsx` (new) | Next.js page at `/activate`. Shows branded form: "Enter code from Axiom Desktop". On submit: `POST /api/activate` → validates user_code, checks user auth (Clerk/NextAuth on portal), verifies subscription via `BillingGatewayPort`, updates `device_codes` row with `user_id`, `authorized_at`, `status: authorized`. Returns success page with "Return to Axiom Desktop" button |
| 5.3 | Portal: Device code polling endpoint | `portal/app/api/device/poll/route.ts` (new) | `GET /api/device/poll?device_code=...` → returns `{ status: "pending" | "authorized" | "denied" | "expired", user_id?, access_token?, refresh_token? }`. Called by desktop sidecar proxy |
| 5.4 | Portal: Billing gateway abstraction | `portal/app/lib/billing-gateway.ts` (new) | Interface `BillingGatewayPort`: `checkSubscription(userId) → { active: boolean, provider: string, currentPeriodEnd: Date }`. License check only — no usage metering or token billing (model policy: `docs/DECISIONS/2026-08-16-model-policy-byok.md`). Default implementation: calls provider webhook-synced `subscriptions` table. Provider-specific adapters (Paystack, Flutterwave, Stripe) implement this interface — selected via `BILLING_PROVIDER` env var |
| 5.5 | Sidecar: Device code request proxy | `server/app/api/auth.py` (expand) | `POST /api/v1/auth/device/code` → calls portal `POST /api/device/code` via HTTP, returns portal response to Tauri. `GET /api/v1/auth/device/poll?device_code=...` → calls portal poll endpoint, returns to Tauri |
| 5.6 | Sidecar: Token issuance & refresh | `server/app/api/auth.py` (expand) | `POST /api/v1/auth/device/token` → validates `device_code` with portal, on success: generates JWT `access_token` (15min, RS256, `sub=user_id`, `aud=axiom-desktop`) + opaque `refresh_token` (stored hashed in local SQLite `auth_tokens` table). `POST /api/v1/auth/refresh` → validates refresh token hash, checks expiry, rotates token (invalidates old), returns new pair |
| 5.7 | Sidecar: Local JWT validation middleware | `server/app/core/auth_local.py` (new) | `verify_desktop_token(token: str) → UserClaims`. Validates RS256 signature using embedded public key, checks `aud`, `exp`, `iat`. No network call — fully offline after activation. Used as FastAPI dependency on all `/api/v1/*` routes except `/auth/*` |
| 5.8 | Sidecar: Lockdown middleware | `server/app/core/lockdown.py` (new) | Middleware running on every request: if `verify_desktop_token` fails → 401. If token valid but `subscription_check` (cached, TTL 1hr) returns `active: false` → 403 with `X-Lockdown-Reason: subscription_expired`. Tauri reads this header and forces activation screen |
| 5.9 | Tauri: Secure token storage | `client/src-tauri/src/auth.rs` (expand) | Use `tauri-plugin-store` with `secure: true` (DPAPI on Windows, Keychain on macOS). Store: `access_token`, `refresh_token`, `expires_at`, `user_id`. Commands: `store_tokens`, `get_tokens`, `clear_tokens` |
| 5.10 | Tauri: Activation splash screen | `client/src-tauri/src/splash.rs`, `client/src/components/auth/ActivationSplash.tsx` (new) | On app start: `invoke('get_tokens')` → if none or expired, show `ActivationSplash` React component: centered 8-digit code (`ABCD-EFGH`), "Open Activation Browser" button (`shell.open('https://auth.axiom.ai/activate?code=...')`), polling spinner. On token received: dismiss splash, load dashboard |
| 5.11 | Tauri: Auto-refresh & lockdown handling | `client/src-tauri/src/auth.rs` | Background task: every 10min, `invoke('refresh_token')`. On 403 with `X-Lockdown-Reason` → clear tokens, show `ActivationSplash` with "Subscription expired — reactivate to continue" |
| 5.12 | Portal: Subscription webhook handlers | `portal/app/api/webhooks/paystack/route.ts`, `flutterwave/`, `stripe/` (new) | Provider-specific webhooks → normalize to `BillingGatewayPort` events → update `subscriptions` table in Supabase. `subscription.updated` → recalc `active` status |
| 5.13 | Portal: User auth (Clerk/NextAuth) | `portal/auth.config.ts` (new) | Portal uses its own auth (Clerk or NextAuth) — separate from desktop. User logs into portal to authorize device |
| 5.14 | E2E: Full activation flow | `tests/e2e/test_activation_flow.py` (new) | Playwright + pywinauto: launch desktop → verify splash → click button → portal page opens → enter code → authorize → desktop receives tokens → dashboard loads. Test expired subscription lockdown |
| 5.15 | Remove Clerk from desktop | `client/package.json`, `server/requirements.txt` | Already in original 5.6 — confirm completion |

**Device Auth Flow (legacy 3-party)**:

_Retained for historical reference. The Dual-System flow below is the canonical flow for the SiaS ecosystem (desktop + portal + sidecar + Tauri + browser) and is what the implementation phases follow._

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Tauri   │     │ Sidecar  │     │ Browser  │
│  Desktop │     │ (FastAPI)│     │ (User)   │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                 │                │
     │ POST /device/code               │
     │────────────────►│               │
     │◄────────────────│               │
     │ user_code: XYZ  │               │
     │ ver_uri: auth/  │               │
     │                 │                │
     │ Show "Visit     │                │
     │ auth.lexpertz   │                │
     │ .com & enter    │                │
     │ XYZ"            │                │
     │                 │                │
     │                 │  User opens    │
     │                 │  browser at    │
     │                 │  auth URL      │
     │                 │◄───────────────│
     │                 │                │
     │                 │  User enters   │
     │                 │  XYZ, clicks   │
     │                 │  "Authorize"   │
     │                 │◄───────────────│
     │                 │                │
     │ POST /device/   │                │
     │ token (polling) │                │
     │────────────────►│                │
     │◄────────────────│                │
     │ access+refresh  │                │
     │                 │                │
     │ Store in        │                │
     │ Tauri secure    │                │
     │ store (DPAPI)   │                │
     │                 │                │
     │ Dashboard loads │                │
     │ with auth token │                │
```

**Verification**:
```bash
# Device code endpoint
curl -X POST http://127.0.0.1:18080/api/v1/auth/device/code
# → { "device_code": "...", "user_code": "ABC123", "verification_uri": "...", "interval": 5 }

# Poll (before authorization)
curl -X POST http://127.0.0.1:18080/api/v1/auth/device/token \
  -H "Content-Type: application/json" \
  -d '{"device_code": "..."}'
# → { "error": "authorization_pending" }

# Poll (after authorization)
# → { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }

# Token refresh
curl -X POST http://127.0.0.1:18080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "..."}'
# → { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }
```

**Exit Criteria**: Device auth flow works end-to-end. Activation splash with 8-digit code plus browser button. Tokens persisted in Tauri secure store. Silent refresh works across app restarts. Local JWT validation works offline. Lockdown protocol returns 403 plus `X-Lockdown-Reason` on expired subscription. Portal Supabase stores only auth/subscription metadata, zero customer documents. Clerk code removed from desktop. Auth tests pass.

---

### Phase 6: Excel/CSV Parser Pipeline (1 session)

**Objective**: Add Excel (`.xlsx`) and CSV file parsing to the ingestion pipeline. Output is merged into the same Markdown format as MarkItDown PDF output, processing both parsers in parallel in the same `process_document()` pipeline.

**Context**: Current ingestion (`server/app/api/ingest.py`) handles PDF via MarkItDown (local-only, no model weights — see `docs/DECISIONS/2026-08-15-parser-local-only.md`). Enterprise auditors work extensively with Excel workbooks and CSV exports. The Markdown pipeline normalizes all formats into chunked text with embeddings.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 6.0 | Create `pdf_to_markdown()` parser | `server/app/core/parsers/pdf_parser.py` (new) | Wrap `pymupdf4llm.to_markdown(pdf, table_output="markdown")`. Output: layout-aware Markdown with headings + tables. Replace the lazy `DocumentConverter` in `ingest.py` with registry dispatch |
| 6.1 | Create `excel_to_markdown()` parser | `server/app/core/parsers/excel_parser.py` (new) | Uses `openpyxl` for `.xlsx`. Extracts each sheet as a Markdown table. Sheet name → H2 header. Row → table row. Merged cells handled via `openpyxl` cell range reads. Output: concatenated Markdown string with sheet separators |
| 6.2 | Create `csv_to_markdown()` parser | `server/app/core/parsers/csv_parser.py` (new) | Uses `pandas.read_csv()` with encoding detection (utf-8, latin-1, cp1252). First row → table header. All rows → table body. Output: Markdown table string. Configurable delimiter (comma default, tab, semicolon) |
| 6.3 | Create parser registry | `server/app/core/parsers/__init__.py` | Dict mapping extensions -> parser functions: `{".pdf": pdf_to_markdown, ".xlsx": excel_to_markdown, ".csv": csv_to_markdown}`. These are **parser functions** (not classes), invoked by `dispatch_parser()` |
| 6.4 | Update `ingest_document()` route | `server/app/api/ingest.py` | Accept `.pdf`, `.xlsx`, `.csv`, and `.xls` file extensions. Call `dispatch_parser()` based on extension. The existing `process_document()` background task already handles the pipeline — only the file-type gate needs updating |
| 6.5 | Add file-type icon to upload zone | `client/src/components/vault/upload-zone.tsx` | Show PDF/Excel/CSV icons based on file extension. Color-code: PDF (red), Excel (green), CSV (blue) |
| 6.6 | Write parser tests | `tests/test_parsers.py` (new) | Integration tests for PDF parser (tables → Markdown rows, headings detected, scanned-PDF low-fidelity notice). Excel parser (single sheet, multi-sheet, merged cells, formulas-as-values). CSV parser (utf-8, latin-1, tab-delimited). Parser registry dispatch. Edge: empty sheets, 10K+ row Excel files |

**Known boundary**: scanned/image-only PDFs get degraded extraction (MarkItDown has no bundled OCR model). The UI surfaces a "low-fidelity extraction" notice; a cloud precision tier is deliberately out of scope (privacy).

**Verification**:
```bash
# PDF parser
python -c "
from app.core.parsers.pdf_parser import pdf_to_markdown
md = pdf_to_markdown('tests/fixtures/test.pdf')
assert '|' in md  # Has table rows
assert '## ' in md  # Has headings
print(f'PDF parser OK: {len(md)} chars')
"

# Excel parser
python -c "
from app.core.parsers.excel_parser import excel_to_markdown
md = excel_to_markdown('tests/fixtures/test.xlsx')
assert '|' in md  # Has table format
assert 'Sheet1' in md  # Has sheet header
print(f'Excel parser OK: {len(md)} chars')
"

# CSV parser
python -c "
from app.core.parsers.csv_parser import csv_to_markdown
md = csv_to_markdown('tests/fixtures/test.csv')
assert '|' in md
print(f'CSV parser OK: {len(md)} chars')
"

# Upload endpoint accepts Excel
curl -X POST http://127.0.0.1:18080/api/v1/upload \
  -F "file=@tests/fixtures/test.xlsx" \
  -H "Authorization: Bearer $TOKEN"
# → { "status": "queued", "filename": "test.xlsx" }
```

**Exit Criteria**: PDF, Excel, and CSV files upload, parse, and index through the same pipeline. Parser registry dispatches by extension. All tests pass with real `.pdf`, `.xlsx` and `.csv` fixtures.

---

### Phase 7: Client Adaptation for Desktop (2 sessions)

**Objective**: Adapt the existing Next.js client for the desktop context — remove Clerk, add Tauri IPC bridge, handle offline/online states, and optimize for static export constraints.

**Context**: The client already has a full dashboard, chat, document management, and settings. The main changes: (1) replace Clerk auth hooks with Tauri IPC auth calls, (2) replace direct HTTP `fetch()` calls with Tauri IPC proxy, (3) add SSE streaming through Tauri events, (4) add offline indicator.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 7.1 | Create `useTauriApi` hook | `client/src/hooks/use-tauri-api.ts` (new) | Wraps `@tauri-apps/api/core.invoke()` for all API calls. If running in browser (dev mode), falls back to direct `fetch()`. Structure: `api.get('/vault/search', params)` → `invoke('call_api', { method, path, body })` |
| 7.2 | Create `useTauriSSE` hook | `client/src/hooks/use-tauri-sse.ts` (new) | Wraps `listen('sse_event', callback)` from `@tauri-apps/api/event`. Same interface as existing `useAuditStream` but receives events from Tauri instead of direct SSE. Auto-reconnect with backoff if Tauri event stream drops |
| 7.3 | Create `useTauriAuth` hook | `client/src/hooks/use-tauri-auth.ts` (new) | Wraps Tauri auth commands: `invoke('start_device_auth')`, `invoke('poll_device_auth')`, `invoke('get_token')`. Exposes `{ isAuthenticated, user, login, logout }` — same interface as Clerk's `useUser()` |
| 7.4 | Create Tauri-aware API client | `client/src/lib/api-tauri.ts` (new) | Replaces `client/src/lib/api.ts` function-by-function. Each method calls `useTauriApi`. Shared Zod schemas from existing `api.ts` |
| 7.5 | Add platform detection utility | `client/src/lib/platform.ts` (new) | `isTauri()` — checks `window.__TAURI__`. `isOnline()` — checks sidecar health. `platform() → 'desktop' | 'web'`. Used by hooks to decide IPC vs direct fetch |
| 7.6 | Update root layout | `client/src/app/layout.tsx` | Remove `ClerkProvider`. Add `TauriProvider` (wraps auth state). Conditional rendering based on platform |
| 7.7 | Add status bar component | `client/src/components/status-bar.tsx` (new) | Shows at bottom of app: connection status (online/local), active vault name, version number |
| 7.8 | Handle static export constraints | `client/next.config.ts`, various | `output: 'export'` means no API routes, no ISR, no `next/headers`, no `next/cookies`. Move all API calls to client-side hooks. Verify no server-side import of `@clerk/nextjs` |
| 7.9 | Write Tauri client tests | `tests/test_tauri_client.py` (new) | Test IPC message serialization, auth hook behavior, platform detection |
| 7.10 | Write static export verification | `tests/e2e/test_static_export.py` (new) | Verify `next build` produces only static files (no server-side routes). Check that all pages render in headless WebView |

**Verification**:
```bash
# Static export builds
cd client
npm run build
# Verify no .next/server directory (static export only)
test ! -d .next/server

# Tauri dev mode
npx tauri dev
# → Dashboard loads, chat works, documents upload

# Platform detection in browser dev mode
# Window.__TAURI__ should be undefined, useTauriApi falls back to fetch
```

**Exit Criteria**: Client runs in Tauri WebView with all features working. Auth uses OAuth 2.0 device flow through IPC. SSE streams through Tauri events. All Clerk references removed. Static export produces no server-side routes.

---

### Phase 8: Testing & E2E Verification (1 session)

**Objective**: Comprehensive test coverage for the SiaS architecture, including E2E tests for the full desktop workflow.

**Context**: Existing test suite covers API contract and SSE parsing. This phase adds E2E tests for the complete desktop app lifecycle: install → launch → auth → upload → query → close.

**Tasks**:

| # | Task | Files | Description |
|---|------|-------|-------------|
| 8.1 | Write full-workflow E2E test | `tests/e2e/test_full_workflow.py` (new) | Using `pywinauto`: launch sidecar, verify health endpoint, upload test PDF, poll status until indexed, send audit query via `/verify`, verify SSE response, verify chat history persisted |
| 8.2 | Write installer E2E test | `tests/e2e/test_installer.py` (new) | Run Inno Setup installer silently (`/VERYSILENT`), verify files installed to `%LOCALAPPDATA%/Programs/AxiomEngine/`, verify uninstall removes all files, verify no registry pollution |
| 8.3 | Write offline mode test | `tests/e2e/test_offline.py` (new) | Block sidecar network access (Windows Firewall rule), verify local embeddings fallback, verify audit query returns results without internet |
| 8.4 | Write multi-vault isolation test | `tests/e2e/test_vault_isolation.py` (new) | Create two vaults, upload same filename to both, verify search in vault A does not return vault B results, verify vault B data survives vault A deletion |
| 8.5 | Update existing tests for new paths | Various | Update all existing tests to use dynamic paths (axiom_paths). Add `pytest` fixture for temp axiom home dir |
| 8.6 | Add Windows E2E CI step | `.github/workflows/e2e.yml` | Run on `windows-latest` runner. Steps: build installer → install → run E2E tests → uninstall → verify cleanup |

**Verification**:
```bash
# Full workflow test
python -m pytest tests/e2e/test_full_workflow.py -x -v --timeout=120

# Offline mode
python -m pytest tests/e2e/test_offline.py -x -v

# All tests
python -m pytest tests/ -x --cov=server/app --cov-report=term-missing
# Target: 80%+ coverage
```

**Exit Criteria**: All E2E tests pass on Windows. Full workflow: install → launch → auth → upload PDF/Excel → query → SSE stream → persist → close → relaunch → history preserved. Offline mode works. Multi-vault isolation proven.

---

## Dependency Audit

| Package | Current | SiaS Required | Action |
|---------|---------|---------------|--------|
| `supabase` | ✅ v2.28.3 | ❌ Remove | Replace with `sqlite-vec` |
| `@clerk/nextjs` | ✅ latest | ❌ Remove | Replace with Tauri auth IPC |
| `sqlite-vec` | ❌ Missing | ✅ Required | `pip install sqlite-vec` |
| `sentence-transformers` | ❌ Missing | ✅ Required | `pip install sentence-transformers` or ONNX runtime |
| `openpyxl` | ❌ Missing | ✅ Required | `pip install openpyxl` |
| `pymupdf` | ❌ Remove | Rejected — AGPL-3.0 (see `docs/DECISIONS/2026-08-15-parser-local-only.md` license amendment) |
| `pymupdf4llm` | ❌ Remove | Rejected — AGPL-3.0; superseded by `markitdown[pdf,xlsx]==0.1.7` (MIT) |
| `markitdown` | ✅ v0.1.7 | ✅ Required | PDF → Markdown with tables/headings (MIT, local-only) |
| `pandas` | ✅ v3.0.2 | ✅ Keep | Already in requirements.txt |
| `docling` | ❌ Remove (was ✅ v2.88.0) | Replace with `markitdown` — see decision doc |
| `tiktoken` | ✅ v0.12.0 | ✅ Keep | Chunking |
| `langgraph` | ✅ v1.1.6 | ✅ Keep | Agent circuit |
| `nuitka` | ❌ Missing | ✅ Required | `pip install nuitka` (build-time only) |
| `@tauri-apps/api` | ❌ Missing | ✅ Required | `npm install @tauri-apps/api` |
| `@tauri-apps/cli` | ❌ Missing | ✅ Required | `npm install -D @tauri-apps/cli` |
| `pywinauto` | ❌ Missing | ✅ Required (dev) | `pip install pywinauto` (E2E tests) |
| `@tauri-apps/plugin-store` | ❌ Missing | ✅ Required | `npm install @tauri-apps/plugin-store` (secure token storage) |
| `jose` (python-jose) | ✅ v3.5.0 | ✅ Keep | RS256 JWT for local token validation |
| Paystack/Flutterwave/Stripe SDKs | ❌ Missing | ⚠️ Portal only | Add to `portal/package.json` when provider is selected |

---

## File Tree (Post-Refactor Target)

```
lexpertz-axiom-engine/
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx           # Unified dashboard
│   │   │   │   └── settings/page.tsx
│   │   │   ├── page.tsx                # Landing
│   │   │   └── layout.tsx              # No ClerkProvider
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── device-auth-dialog.tsx   # NEW
│   │   │   ├── chat/
│   │   │   │   ├── chat-input.tsx
│   │   │   │   └── chat-thread.tsx
│   │   │   ├── vault/
│   │   │   │   ├── document-panel.tsx
│   │   │   │   ├── upload-zone.tsx
│   │   │   │   └── ingestion-overlay.tsx
│   │   │   ├── workspace/
│   │   │   │   ├── strategist-arena.tsx
│   │   │   │   └── verification-dashboard.tsx
│   │   │   └── status-bar.tsx              # NEW
│   │   ├── hooks/
│   │   │   ├── use-audit-stream.ts
│   │   │   ├── use-tauri-api.ts            # NEW
│   │   │   ├── use-tauri-sse.ts            # NEW
│   │   │   └── use-tauri-auth.ts           # NEW
│   │   ├── lib/
│   │   │   ├── api.ts                      # Existing (browser fallback)
│   │   │   ├── api-tauri.ts                # NEW
│   │   │   └── platform.ts                 # NEW
│   │   └── types/
│   │       └── api.ts
│   └── src-tauri/                          # NEW (Tauri)
│       ├── src/
│       │   ├── lib.rs
│       │   ├── commands.rs                 # IPC bridge
│       │   ├── auth.rs                     # OAuth device flow
│       │   └── sidecar.rs                  # Sidecar manager
│       ├── tauri.conf.json
│       ├── Cargo.toml
│       └── binaries/
│           └── axiom-server.exe            # Compiled sidecar
├── server/
│   ├── app/
│   │   ├── main.py
│   │   ├── __main__.py                     # NEW (Nuitka entry point)
│   │   ├── api/
│   │   │   ├── auth.py                     # NEW (OAuth endpoints)
│   │   │   ├── ingest.py                   # Updated (+ Excel/CSV)
│   │   │   ├── run.py                      # Updated (SQLite adapter)
│   │   │   ├── vault.py                    # Updated (SQLite adapter)
│   │   │   └── ...
│   │   ├── core/
│   │   │   ├── axiom_paths.py              # NEW
│   │   │   ├── ports.py                    # NEW (VaultPort, EmbeddingPort)
│   │   │   ├── config.py                   # REWRITTEN (SiaSConfig)
│   │   │   ├── sqlite_adapter.py           # NEW
│   │   │   ├── sqlite_schema.py            # NEW
│   │   │   ├── vector_store.py             # NEW (vec0 wrapper)
│   │   │   ├── embeddings.py               # REWRITTEN (NvidiaEmbeddingAdapter)
│   │   │   ├── embeddings_local.py         # NEW
│   │   │   ├── embedding_gateway.py        # NEW (AdaptiveEmbedder)
│   │   │   ├── vault_backup.py             # NEW
│   │   │   └── ...
│   │   ├── core/parsers/                   # NEW
│   │   │   ├── __init__.py                 # Parser registry
│   │   │   ├── pdf_parser.py               # MarkItDown (local-only, MIT)
│   │   │   ├── excel_parser.py
│   │   │   └── csv_parser.py
│   │   └── ...
│   ├── build_server.bat                    # NEW
│   ├── slim_dist.ps1                       # NEW
│   ├── analyze_dlls.py                     # NEW
│   ├── setup.iss                           # NEW
│   ├── requirements.txt                    # Updated
│   └── ...
├── tests/
│   ├── test_axiom_paths.py                 # NEW
│   ├── test_vault_port.py                  # NEW
│   ├── test_sqlite_adapter.py              # NEW
│   ├── test_embeddings.py                  # NEW
│   ├── test_parsers.py                     # NEW
│   ├── e2e/
│   │   ├── test_full_workflow.py           # NEW
│   │   ├── test_device_auth.py             # NEW
│   │   ├── test_offline.py                 # NEW
│   │   ├── test_vault_isolation.py         # NEW
│   │   ├── test_sidecar_e2e.py             # NEW
│   │   └── test_installer.py               # NEW
│   └── ...
└── .github/workflows/
    └── e2e.yml                             # NEW (Windows CI)
├── portal/                                  # NEW: Public web portal (Vercel)
│   ├── app/
│   │   ├── api/
│   │   │   ├── device/
│   │   │   │   ├── code/route.ts           # POST /api/device/code
│   │   │   │   └── poll/route.ts           # GET /api/device/poll
│   │   │   ├── activate/route.ts           # POST /api/activate
│   │   │   └── webhooks/
│   │   │       ├── paystack/route.ts
│   │   │       ├── flutterwave/route.ts
│   │   │       └── stripe/route.ts
│   │   ├── activate/
│   │   │   └── page.tsx                    # Device activation UI
│   │   ├── page.tsx                         # Marketing landing page
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── billing-gateway.ts              # BillingGatewayPort + provider adapters
│   │   └── supabase.ts                     # Portal Supabase client
│   └── package.json
```

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Installer size** | < 80 MB | File size of `Setup_Axiom_v1.0.0.exe` |
| **Cold start time** | < 5s | Time from double-click to dashboard render |
| **Offline capability** | 100% | All core features work without internet |
| **Client data isolation** | Zero leakage | Vault A data invisible from Vault B |
| **Document formats** | 3 formats | PDF + XLSX + CSV indexed and searchable |
| **Local embedding accuracy** | ≥ 95% of cloud | Cosine similarity vs NVIDIA on benchmark corpus |
| **OAuth token refresh** | Silent | No re-login prompt for 30+ days of daily use |
| **No orphan processes** | 100% | Closing app kills sidecar, verified by E2E test |
| **Test coverage** | ≥ 80% | `pytest --cov=server/app` |
| **Windows Defender** | No detection | `MpCmdRun -Scan -ScanType 3 -File Setup_Axiom.exe` |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Nuitka compilation fails** | Medium | Blocks sidecar build | Fallback: PyInstaller with UPX. Document in `build_server.bat` |
| **Vec0 not available on Windows** | Low | Vector search broken | Use `sqlite-vec` precompiled wheel. Fallback: cosine similarity in pure Python via NumPy |
| **Local embedding model too slow** | Medium | Poor UX on low-end hardware | Use ONNX runtime with int8 quantization. Target: < 200ms per query |
| **OAuth device flow UX friction** | Medium | Users confused by browser login | Add QR code for mobile authorization. Show clear step-by-step instructions |
| **Static export breaks dynamic feature** | Low | Feature missing in desktop | Catch at build time (`next build` fails). Move to client-side rendering |
| **Sidecar process crash** | Low | App becomes unresponsive | Auto-restart with backoff (max 3 retries). Show "Reconnecting..." overlay |
| **Windows Defender false positive** | Medium | Installer blocked by SmartScreen | EV code signing certificate. Submit to Microsoft Defender portal pre-release |
| **Portal/provider webhook drift** | Medium | Billing state desync | Idempotent webhook processing; nightly reconciliation job comparing provider API vs local `subscriptions` table |
| **Scanned PDF fidelity** | Medium | Poor extraction on image-only PDFs | MarkItDown has no OCR model; UI shows "low-fidelity extraction" notice; cloud precision tier out of scope (privacy) — revisit only if corpus shifts |
| **Device code phishing** | Low | Account takeover | User code is 8-char, expires in 30min, single-use. Portal shows "Only enter this code in Axiom Desktop" warning |
| **Refresh token theft** | Low | Long-lived access | Tokens hashed at rest (SHA256). Rotation on every refresh. Short access token TTL (15min). DPAPI/Keychain at-rest encryption |
| **Subscription check latency** | Medium | UX lag | Cache subscription status in sidecar (TTL 1hr). Background refresh. Lockdown only on explicit 403 from cached-false |

---

## Appendix: Key Implementation Details

### A. Port Contracts

```python
# server/app/core/ports.py
from typing import List, Dict, Any, Optional, Protocol

class VaultPort(Protocol):
    async def store_document(self, filename: str, status: str = "processing") -> int: ...
    async def get_document(self, document_id: int) -> Optional[Dict[str, Any]]: ...
    async def search_similar(self, embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]: ...
    async def store_chunk(self, document_id: int, content: str, embedding: List[float], index: int) -> int: ...
    async def store_message(self, document_id: int, role: str, content: str, metrics: Optional[Dict] = None) -> int: ...
    async def get_history(self, document_id: int, limit: int = 5) -> List[Dict[str, str]]: ...
    async def get_telemetry(self) -> Dict[str, Any]: ...
    async def create_vault(self, slug: str) -> bool: ...
    async def list_vaults(self) -> List[str]: ...
    async def delete_vault(self, slug: str) -> bool: ...

class EmbeddingPort(Protocol):
    async def embed_text(self, text: str, is_query: bool = False) -> List[float]: ...
    @property
    def dimension(self) -> int: ...
```

### B. Dynamic Path Resolution

```python
# server/app/core/axiom_paths.py
import os
import sys
from pathlib import Path

def _get_axiom_home() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    else:
        base = Path.home()
    return base / "AxiomEngine"

AXIOM_HOME = _get_axiom_home()
VAULTS_DIR = AXIOM_HOME / "vaults"
TEMP_DIR = AXIOM_HOME / "temp"
LOGS_DIR = AXIOM_HOME / "logs"
CONFIG_PATH = AXIOM_HOME / "config.json"

def ensure_dirs() -> None:
    for d in [AXIOM_HOME, VAULTS_DIR, TEMP_DIR, LOGS_DIR]:
        d.mkdir(parents=True, exist_ok=True)
```

### C. JSON Config File

```json
{
  "active_vault": "client_acme",
  "embedding_mode": "adaptive",
  "nvidia_api_key": "",
  "theme": "dark",
  "auto_start": true,
  "sidecar_port": 0,
  "log_level": "info",
  "last_vaults": ["client_acme", "client_beta"]
}
```

### E. Portal Supabase Schema (auth.axiom.ai)

```sql
-- Portal Supabase (auth.axiom.ai)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    clerk_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    provider TEXT NOT NULL,
    provider_customer_id TEXT NOT NULL,
    provider_subscription_id TEXT,
    status TEXT NOT NULL,
    current_period_end TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, provider)
);

CREATE TABLE device_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code TEXT UNIQUE NOT NULL,
    user_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    authorized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### F. Desktop Local Auth Tokens Table (Sidecar SQLite)

```sql
-- In each vault DB (or shared config DB)
CREATE TABLE auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    refresh_token_hash TEXT UNIQUE NOT NULL,
    access_token_jwt TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### G. Parser Registry Dispatch

```python
# server/app/core/parsers/__init__.py
from pathlib import Path

PARSERS = {}

def register(ext: str):
    def decorator(fn):
        PARSERS[ext.lower()] = fn
        return fn
    return decorator

def dispatch_parser(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    parser = PARSERS.get(ext)
    if not parser:
        raise ValueError(f"No parser registered for extension: {ext}")
    return parser(file_path)
```

---

**End of PRD_SIAS.md**
*Ready for Phase 0 execution upon approval.*

