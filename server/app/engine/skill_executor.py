"""
Skill executor — generic engine that executes LLM and retriever nodes.

The executor reads a ``SkillConfig`` (parsed from .md frontmatter), builds
the appropriate LLM instance, renders the associated prompt, invokes it,
and applies config-driven post-processing (preamble stripping, fail-safes,
etc.).

This replaces the hardcoded model initialization and prompt invocation in
``nodes.py`` with a single generic code path that is fully data-driven.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional

from langchain_core.output_parsers import PydanticOutputParser

from .loader import SkillLoader
from .models import FailSafeConfig, LLMConfig, SkillConfig
from .prompt_renderer import PromptRenderer
from .registry import SchemaRegistry, registry as default_registry

logger = logging.getLogger(__name__)


class SkillExecutor:
    """Generic executor for LLM-type and retriever-type skill nodes."""

    def __init__(
        self,
        loader: Optional[SkillLoader] = None,
        renderer: Optional[PromptRenderer] = None,
        schema_registry: Optional[SchemaRegistry] = None,
    ) -> None:
        self.loader = loader or SkillLoader()
        self.renderer = renderer or PromptRenderer(self.loader)
        self.schema_registry = schema_registry or default_registry
        self._skill_cache: Dict[str, SkillConfig] = {}

    # ------------------------------------------------------------------
    # Skill config lookup
    # ------------------------------------------------------------------

    def get_skill(self, name: str) -> SkillConfig:
        """Load and cache a SkillConfig by name."""
        if name not in self._skill_cache:
            skills = self.loader.discover_skills()
            if name not in skills:
                raise KeyError(
                    f"Skill '{name}' not found. Available: {sorted(skills.keys())}"
                )
            self._skill_cache.update(skills)
        return self._skill_cache[name]

    # ------------------------------------------------------------------
    # LLM building
    # ------------------------------------------------------------------

    def _build_llm(self, config: LLMConfig) -> Any:
        """Construct a LangChain LLM instance from configuration.

        Provider is selected by env var availability:
        - If ``provider`` is ``nvidia`` and ``NVIDIA_API_KEY`` is set,
          use ``ChatNVIDIA``.
        - If ``provider`` is ``groq`` and ``GROQ_API_KEY`` is set,
          use ``ChatGroq``.
        - Falls back to the alternate provider if the primary is unavailable.
        """
        nv_key = os.getenv("NVIDIA_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")

        if config.provider == "nvidia" and nv_key:
            return self._build_nvidia_llm(config, nv_key)
        if config.provider == "groq" and groq_key:
            return self._build_groq_llm(config, groq_key)
        # Fallback: use whichever key is available
        if nv_key:
            return self._build_nvidia_llm(config, nv_key)
        if groq_key:
            return self._build_groq_llm(config, groq_key)

        raise RuntimeError(
            f"No LLM provider available for skill '{config.name}'. "
            "Set NVIDIA_API_KEY or GROQ_API_KEY."
        )

    def _build_nvidia_llm(self, config: LLMConfig, api_key: str) -> Any:
        from langchain_nvidia_ai_endpoints import ChatNVIDIA

        kwargs: Dict[str, Any] = {
            "model": config.name,
            "nvidia_api_key": api_key,
            "temperature": config.temperature,
            "top_p": config.top_p,
            "max_completion_tokens": config.max_tokens,
        }
        if config.response_format == "json_object":
            kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
        if config.thinking:
            kwargs["model_kwargs"] = {
                **kwargs.get("model_kwargs", {}),
                "extra_body": {"chat_template_kwargs": {"thinking": True}},
            }
        return ChatNVIDIA(**kwargs)

    def _build_groq_llm(self, config: LLMConfig, api_key: str) -> Any:
        from langchain_groq import ChatGroq
        from pydantic import SecretStr

        return ChatGroq(
            model=config.name,
            temperature=config.temperature,
            top_p=config.top_p,
            max_tokens=config.max_tokens,
            api_key=SecretStr(api_key),
        )

    # ------------------------------------------------------------------
    # Schema resolution
    # ------------------------------------------------------------------

    def _resolve_schema(self, schema_name: str) -> type:
        """Resolve a schema name to a Pydantic BaseModel class."""
        return self.schema_registry.get(schema_name)

    def _build_parser(self, schema_name: str) -> PydanticOutputParser:
        """Build a PydanticOutputParser for the named schema."""
        model = self._resolve_schema(schema_name)
        return PydanticOutputParser(pydantic_object=model)

    # ------------------------------------------------------------------
    # Generic LLM execution
    # ------------------------------------------------------------------

    async def execute_llm(
        self,
        skill_name: str,
        variables: Dict[str, str],
    ) -> Dict[str, Any]:
        """Execute an LLM-type skill and return the raw response.

        Parameters
        ----------
        skill_name :
            Name of the agent skill (must be ``type="llm"`` in its SKILL.md).
        variables :
            Template variables to inject into the prompt (e.g.
            ``{"question": "...", "context": "..."}``).

        Returns
        -------
        dict
            ``{"content": "raw text", "structured": <optional Pydantic object>}``
        """
        skill = self.get_skill(skill_name)
        if not skill.model:
            raise ValueError(f"Skill '{skill_name}' has no model configuration.")

        llm = self._build_llm(skill.model)

        # Build parser if structured output is configured
        parser: Optional[PydanticOutputParser] = None
        if skill.structured_output:
            parser = self._build_parser(skill.structured_output.schema_name)

        # Render prompt
        prompt = self.renderer.render(skill, parser=parser)

        # Build chain
        if parser is not None:
            structured_llm = llm.with_structured_output(
                schema=self.schema_registry.get(skill.structured_output.schema_name),
            )
            prompt_val = await prompt.ainvoke(variables)
            raw_response = await structured_llm.ainvoke(prompt_val)
            return {
                "content": str(getattr(raw_response, "content", raw_response)),
                "structured": raw_response,
            }
        else:
            chain = prompt | llm
            response = await chain.ainvoke(variables)
            return {"content": str(response.content), "structured": None}

    # ------------------------------------------------------------------
    # Preamble stripping (config-driven)
    # ------------------------------------------------------------------

    def strip_preambles(self, text: str, skill_name: str) -> str:
        """Remove known preamble strings from the LLM response.

        The list of preambles is declared in the skill's config.frontmatter
        under ``config.preambles_to_strip``.
        """
        skill = self.get_skill(skill_name)
        preambles: List[str] = skill.config.get("preambles_to_strip", [])
        for preamble in preambles:
            text = text.replace(preamble, "")
        return text.strip()

    # ------------------------------------------------------------------
    # Fail-safe application
    # ------------------------------------------------------------------

    def apply_fail_safe(self, text: str, skill_name: str) -> str:
        """Apply the configured fail-safe strategy to a response.

        Currently only ``strip_exhibit_markers`` is supported, which removes
        Exhibit envelope markers and truncates to ``max_length``.
        """
        skill = self.get_skill(skill_name)
        failsafe: Optional[FailSafeConfig] = skill.fail_safe
        if not failsafe:
            return text

        if fail_safe_strategy := failsafe.strategy:
            if fail_safe_strategy == "strip_exhibit_markers":
                cleaned = re.sub(
                    r"--- EXHIBIT_(START|END)_ID_\w+ ---",
                    "",
                    text,
                )
                return cleaned[: failsafe.max_length]

        return text


__all__ = ["SkillExecutor"]
