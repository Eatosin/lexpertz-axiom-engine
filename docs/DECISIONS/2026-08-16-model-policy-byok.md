# Decision: Model Policy — Bring Your Own Models (BYOK), Software Subscription

**Date:** 2026-08-16
**Status:** Accepted
**Scope:** Model access, hosting, and billing across the SiaS desktop architecture (LLM inference, embeddings, reranking)
**Supersedes:** SaaS-era assumption that Axiom holds server-side model keys and pays inference cost

---

## Context

The SiaS pivot ("Cloud-Brain, Local-Data") changes who pays for and hosts the models the
auditing coworker runs on. In the old SaaS, the server held NVIDIA/DeepSeek keys and billed
usage indirectly through subscriptions. In the desktop architecture, inference runs on the
auditor's own machine — so the question became: **who supplies the API keys, and how is the
software paid for?**

The open-source playbook (e.g., opencode) offers two shapes: (1) **BYOK** — users connect
their own provider keys, traffic goes user → provider directly, the vendor never sees a
prompt; (2) **resold model access** — users pay the vendor, prompts relay through a vendor
gateway (opencode zen), the vendor becomes the data processor.

Audit data (financial statements, contracts, legal documents) is far more sensitive than
code. Being in the data path as a relay would turn the vendor into a processor: DPA/GDPR
obligations, retention policy, subpoena risk, server-side key custody, new attack surface —
all while marketing the product as privacy-first.

## Decision

**Axiom never hosts, bills, relays, or meters models.** All inference uses user-supplied
keys (BYOK) or user-local models. Revenue is a **software subscription** (license check),
not token sales. The product is architecturally *incapable* of seeing prompt data.

| Path | User has | Data path | Our infrastructure |
|------|----------|-----------|--------------------|
| Cloud BYOK | Provider key (NVIDIA / OpenAI / DeepSeek / Groq) entered in Settings | user → provider, direct | None (no gateway, no proxy) |
| Local | Ollama / llama.cpp (LLM); MiniLM ONNX (embeddings, Phase 2) | nothing leaves the machine | None |
| Subscription | Active license (Phase 5 device activation) | never touches model traffic | Billing portal + license check only |

Concrete consequences:

- `SiaSConfig` keeps `nvidia_api_key` as a BYOK field; gains a `provider` field and an
  optional `ollama_url`; keys are stored in the Tauri secure store (Phase 5), never
  plaintext in `config.json`
- `SkillExecutor._build_llm` provider enum (`server/app/engine/skill_executor.py`:
  `nvidia|groq`) extends to `openai|deepseek|ollama`; skill frontmatter continues to
  declare `provider`/`model` per skill (unchanged design)
- `AdaptiveEmbedder` (Phase 2, PRD:261) keeps local-first behavior: local MiniLM by
  default, cloud NIM **only when a user key is present** — no automatic cloud fallback
- Phase 5 billing gateway performs a **license check** only; usage metering and token
  billing are dropped from scope

## Rationale

| Consideration | BYOK + local (final) | Resold access (opencode zen style) |
|---------------|----------------------|------------------------------------|
| Privacy | We are never in the data path; only egress is the user's own key to their own chosen provider (or zero egress locally) | We become the processor of audit data: DPA/GDPR, retention, subpoena, server-side key custody, new attack surface |
| Infrastructure cost | $0 for model access; no provider contracts | Provider contracts, usage-based cost risk, chargebacks, token metering |
| Revenue model | Predictable software license revenue | Usage-dependent, billing drift, needs metering infrastructure |
| Market fit | Enterprise auditors already hold corporate LLM contracts — BYOK is their natural procurement path | Small firms/individuals only; weak fit for enterprise procurement |
| Marketing | "Your data never leaves your machine without your key" — matches the SiaS privacy promise | Contradicts the "zero-cloud-dependency" positioning (PRD line 16) |

## Alternatives Considered

| Alternative | Verdict | Why rejected |
|-------------|---------|--------------|
| Full relay (vendor proxy, opencode-zen style) | Rejected | Makes us the processor of audit data; DPA/GDPR, retention, subpoena, key custody, attack surface; contradicts privacy-first marketing |
| Resell provider credits (sub-keys, no relay) | Rejected | Traffic stays user→provider but we hold provider contracts, usage cost risk, and billing disputes; adds token custody without the payoff |
| Keep SaaS model (server holds keys, bills usage) | Rejected | Dies with the SaaS architecture; requires our server to see prompts; no local-first story |
| Free forever, no subscription | Deferred | No revenue path for updates, vault cloud-sync, support, and Phase 5 infrastructure; open-source strategy covers free-tier distribution |

## Consequences

- **Privacy promise (marketing + product):** "Your data never leaves your machine without
  your key." We are structurally out of the data path — no gateway, no proxy, no token
  custody, no usage metering.
- **requirements.txt:** no model-provider SDKs beyond what skills declare; BYOK keys are
  runtime configuration, not build-time secrets
- **Config/secure storage:** `nvidia_api_key` moves from `config.json` to the Tauri
  secure store at Phase 5; `provider` + `ollama_url` fields land in `SiaSConfig` (Sprint 2
  or Phase 2)
- **Engine:** `LLMConfig.provider` Literal extends to `["nvidia", "groq", "openai",
  "deepseek", "ollama"]`; `_build_llm` resolves each provider from user config (not env-only)
- **Phase 5 billing:** simplified to license check — no usage metering in the billing
  gateway abstraction (`BillingGatewayPort` stays; metering columns/events dropped)
- **PRD_SIAS.md (archive):** model-routing references (embeddings NIM, Phase 2) and Phase 5
  billing scope amended to match (follow-up)
- **Open-source strategy:** free tier = BYOK + local models, zero infra cost to us;
  open-sourcing the client/sidecar is compatible — model access is always the user's own
