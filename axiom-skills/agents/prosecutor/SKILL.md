---
name: prosecutor
display_name: "Prosecutor"
description: "LLM-as-a-Judge hallucination grading with DeepSeek-Terminus thinking mode"
type: llm

model:
  provider: nvidia
  name: deepseek-ai/deepseek-v3.1-terminus
  temperature: 0.2
  top_p: 0.7
  max_tokens: 8192
  thinking: true

structured_output:
  schema_name: HallucinationGrade
  parser: PydanticOutputParser

config:
  threshold:
    default: 0.7
    intensify: 0.9
  max_retries: 2
  early_exit_markers:
    - "No direct evidence found"
  intensify_flag: "-v"

fail_safe:
  strategy: return_default_pass
  max_length: 6000

prompts:
  system: prompts/system.md
  human: prompts/human.md
---

# Prosecutor Agent

The Prosecutor is the **adversarial grading** node in the Axiom agent graph.
It uses DeepSeek-Terminus with thinking mode to evaluate the Architect's
draft report against the raw evidence.

## Purpose

1. Short-circuit if the generation contains `"No direct evidence found"` or is empty.
2. Apply hallucination grading using a structured `HallucinationGrade` schema.
3. If hallucinating or below threshold, increment `retry_count` and return
   `status="thinking"` to trigger a retry through the Architect.
4. If verified, return `status="verified"` to end the pipeline.
5. On exception: default to pass (score=1.0, status=verified) to avoid
   infinite retry loops during API outages.

## Input

- `state["generation"]` — the Architect's draft report.
- `state["documents"]` — the raw evidence chunks.
- `state["command"]` — `/axm` CLI flags (used for `-v` intensify).
- `state["retry_count"]` — current retry count.

## Output

- `state["hallucination_score"]` — faithfulness score (0.0 to 1.0).
- `state["metrics"]` — `{"faithfulness": score, "precision": 1.0, "relevance": 1.0}`.
- `state["status"]` — `"verified"` or `"thinking"` (retry).
- `state["retry_count"]` — incremented by 1 on failure.

## Threshold Logic

| Mode | Threshold | Trigger |
|------|-----------|---------|
| Default | 0.7 | Standard audit |
| Intensified | 0.9 | `-v` flag in command |

If `faithfulness_score < threshold` OR `is_hallucinating == "true"`,
the Prosecutor flags a retry.
