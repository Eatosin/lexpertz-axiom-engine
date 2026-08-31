# Decision: Cross-Platform Distribution (Windows + macOS + Linux)

**Date**: 2026-08-31
**Status**: Accepted — amends `docs/archive/PRD_SIAS.md`
**Context**: The SiaS PRD was written Windows-only (`Axiom.exe`, Inno Setup, MSI-only Tauri
targets, pywinauto E2E). The dev fleet is now heterogeneous (Windows + Linux dev boxes),
and enterprise audit teams run mixed fleets.

## Decision

The desktop app ships on **Windows, macOS, and Linux from day one**, using
platform-native tooling per OS (no lowest-common-denominator abstraction).

### Sidecar compilation — Nuitka, per-OS builds (retained)

Research concluded (Context7 + official docs, 2026-08-31): Nuitka is cross-platform
(Windows/macOS/Linux), keeps the performance edge (2–4x over CPython for compute-heavy
paths), and has an official GitHub Action (`Nuitka/Nuitka-Action`) for matrix builds.
Alternatives evaluated:

| Tool | Verdict |
|------|---------|
| PyInstaller | Viable fallback; slower startup in onefile mode (5–15s), interpreter bundled, no perf gain |
| cx_Freeze | Faster startup than PyInstaller but no onefile mode, more config, smaller community |
| Cython | Overkill; manual C-compilation wiring |

Keep **Nuitka**, replace `build_server.bat`/`slim_dist.ps1` with cross-platform
`build_server.py` / `slim_dist.py`.

### Linux baseline — Ubuntu 22.04 / Debian 12

glibc and WebKitGTK 4.1 compatibility: Linux builds MUST compile on the oldest supported
distro (`ubuntu-22.04` in CI). Building on newer glibc silently drops older targets.

### Installers per platform

| Platform | Sidecar binary | Tauri bundle | Signing |
|----------|----------------|--------------|---------|
| Windows | `axiom-server-x86_64-pc-windows-msvc.exe` (Nuitka, onefile) | `.msi` (WiX) + `.nsis` | Authenticode (EV cert preferred) |
| macOS | `axiom-server-{aarch64,x86_64}-apple-darwin` (Nuitka) | `.app` + `.dmg` | Apple notarization + hardening |
| Linux | `axiom-server-x86_64-unknown-linux-gnu` (Nuitka) | `.deb` + `.AppImage` | GPG (AppImage, optional) |

No Nuitka cross-compilation (unsupported). Per-OS binaries land in the new **Phase 9
CI/CD pipeline** running a GitHub Actions matrix (`windows-latest`, `macos-latest`,
`ubuntu-22.04`).

### Secure token store per OS (Phase 5)

Windows DPAPI · macOS Keychain · Linux Secret Service (libsecret) — via
`tauri-plugin-store`/keyring respectively.

## Consequences

- PRD Phases 3, 4, 8 rewritten for cross-platform; new Phase 9 (CI/CD) added.
- Dev/testing unblocked on Linux boxes (the exact gap that surfaced this decision).
- CI minutes cost rises (3-OS matrix); acceptable for release builds only.
- Windows-first UX assumptions (Inno Setup, Defender/SmartScreen) generalize to
  per-OS trust models (notarization, GPG) in the Risks table.
