---
name: post-grading
description: "Routes after Prosecutor: verified, retry to Architect, or max retries then end"
type: router

routes:
  - condition: "status == 'verified'"
    target: end
  - condition: "retry_count < 2"
    target: architect
  - condition: "default"
    target: end
---

# Post-Grading Routing

The adversarial gatekeeper. Determines the next node after the Prosecutor
grades the Architect's draft report.

## Decision Tree

1. **Verified** (`status == "verified"`) → `END` (audit complete).
2. **Retry needed** (`retry_count < 2`) → `Architect` (re-generate with same context).
3. **Max retries reached** (`retry_count >= 2`) → `END` (safety valve).

## Retry Loop

The retry loop sends the state back to the Architect for re-generation.
Note that the **documents are not re-rendered** — the retry relies on LLM
non-determinism to produce a different (hopefully better) answer.

The maximum of 2 retries prevents infinite token burn during API outages.
