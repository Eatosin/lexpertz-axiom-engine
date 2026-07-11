"""Axiom Engine — Skill Execution Engine.

The engine reads declarative ``.md`` skill definitions from ``axiom-skills/``
and executes them as LangGraph nodes. A single generic code path replaces the
hardcoded model initialization and prompt invocation that previously lived
in ``app/agents/nodes.py``.

Public API:
    SkillLoader       — discover and parse SKILL.md files
    PromptRenderer    — render .md prompts into ChatPromptTemplate
    SkillExecutor     — generic node executor (LLM + retriever + skill)
    SchemaRegistry    — type registry for structured-output schemas
    SkillConfig       — Pydantic model for parsed frontmatter
    LLMConfig         — LLM configuration model
"""

from .loader import SkillLoader, parse_frontmatter
from .models import (
    FailSafeConfig,
    LLMConfig,
    RoutingRule,
    SkillConfig,
    StructuredOutputConfig,
)
from .prompt_renderer import PromptRenderer
from .registry import SchemaRegistry, registry
from .skill_executor import SkillExecutor

__all__ = [
    "SkillLoader",
    "PromptRenderer",
    "SkillExecutor",
    "SchemaRegistry",
    "registry",
    "parse_frontmatter",
    "SkillConfig",
    "LLMConfig",
    "StructuredOutputConfig",
    "FailSafeConfig",
    "RoutingRule",
]
