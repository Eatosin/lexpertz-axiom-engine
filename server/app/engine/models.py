"""
Pydantic models for declarative skill configuration parsed from .md YAML frontmatter.

Each SKILL.md file contains YAML frontmatter that is parsed into one of these
models.  The models enforce type safety and provide clear error messages when
the frontmatter is malformed.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# LLM configuration
# ---------------------------------------------------------------------------

class LLMConfig(BaseModel):
    """Configuration for an LLM instance (NVIDIA, Groq, etc.)."""

    provider: Literal["nvidia", "groq"] = "nvidia"
    name: str = Field(..., description="Model identifier, e.g. meta/llama-3.3-70b-instruct")
    temperature: float = Field(0.0, ge=0.0, le=2.0)
    top_p: float = Field(0.95, ge=0.0, le=1.0)
    max_tokens: int = Field(4096, gt=0, le=32768)
    response_format: Optional[Literal["json_object"]] = None
    thinking: bool = False


# ---------------------------------------------------------------------------
# Structured output (optional, references a Pydantic schema by name)
# ---------------------------------------------------------------------------

class StructuredOutputConfig(BaseModel):
    """Reference to a Pydantic model registered in the schema registry."""

    schema_name: str = Field(..., description="Name of Pydantic class, e.g. DistilledContext")
    parser: Literal["PydanticOutputParser"] = "PydanticOutputParser"


# ---------------------------------------------------------------------------
# Fail-safe strategy (Editor JSON fallback, Prosecutor exception, etc.)
# ---------------------------------------------------------------------------

class FailSafeConfig(BaseModel):
    """How a node degrades when the LLM raises or returns garbage."""

    strategy: Literal["strip_exhibit_markers", "return_default_pass", "return_empty_evidence"]
    max_length: int = 6000


# ---------------------------------------------------------------------------
# Skill configuration (parsed from each SKILL.md YAML frontmatter)
# ---------------------------------------------------------------------------

class SkillConfig(BaseModel):
    """Parsed frontmatter of a single SKILL.md file.

    Attributes
    ----------
    name :
        Unique identifier (matches directory name).
    display_name :
        Human-readable label shown in UI / logs.
    description :
        One-line summary.
    type :
        ``llm``        - LLM-based reasoning node.
        ``retriever``  - Search/rerank node (no LLM call).
        ``router``     - Conditional routing definition.
        ``skill``      - Top-level domain skill (code-audit, dataset-audit, ...)
    model :
        LLM configuration (required for ``type == "llm"``).
    structured_output :
        Optional schema reference for structured LLM output.
    config :
        Free-form bag of node-specific parameters (preambles, search limits, etc.).
    prompts :
        Mapping of prompt-key -> relative path to a .md prompt file.
    routes :
        Conditional routing rules (for ``type == "router"``).
    dir :
        Absolute path to the directory containing this SKILL.md.
        Set by the loader at parse time.
    """

    name: str
    display_name: str = ""
    description: str = ""
    type: Literal["llm", "retriever", "router", "skill"] = "llm"
    model: Optional[LLMConfig] = None
    structured_output: Optional[StructuredOutputConfig] = None
    fail_safe: Optional[FailSafeConfig] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    prompts: Dict[str, str] = Field(default_factory=dict)
    routes: List[Dict[str, str]] = Field(default_factory=list)
    dir: str = ""

    @model_validator(mode="after")
    def cross_field_validation(self) -> "SkillConfig":
        """Validate cross-field rules after individual fields are parsed.

        Required because Optional with default values can bypass individual
        @field_validator when the field is at its default value.
        """
        if self.type == "llm":
            if self.model is None:
                raise ValueError(
                    f"Skill '{self.name}' has type='llm' but no 'model' configuration."
                )
            missing_prompts = {"system", "human"} - set(self.prompts.keys())
            if missing_prompts:
                raise ValueError(
                    f"Skill '{self.name}' is type='llm' but missing prompts: {missing_prompts}"
                )
        if self.type == "router" and not self.routes:
            raise ValueError(
                f"Skill '{self.name}' is type='router' but has no routes."
            )
        return self


# ---------------------------------------------------------------------------
# Routing rule (parsed from files under axiom-skills/routing/)
# ---------------------------------------------------------------------------

class RoutingRule(BaseModel):
    """A single conditional routing definition."""

    name: str
    description: str = ""
    routes: List[Dict[str, str]] = Field(default_factory=list)


__all__ = [
    "LLMConfig",
    "StructuredOutputConfig",
    "FailSafeConfig",
    "SkillConfig",
    "RoutingRule",
]
