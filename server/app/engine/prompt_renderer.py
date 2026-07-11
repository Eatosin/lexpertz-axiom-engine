"""
Prompt renderer — loads .md prompt files and returns ChatPromptTemplate objects.

Each agent's SKILL.md declares ``prompts.system`` and ``prompts.human`` pointing
to relative .md files. This module reads those files via the SkillLoader and
wraps them in LangChain ``ChatPromptTemplate`` instances.

For structured-output skills, the system prompt is augmented with the format
instructions from the PydanticOutputParser.
"""

from __future__ import annotations

import logging
from typing import Optional

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from .loader import SkillLoader
from .models import SkillConfig

logger = logging.getLogger(__name__)


class PromptRenderer:
    """Renders .md prompt files into ChatPromptTemplate objects."""

    def __init__(self, loader: SkillLoader) -> None:
        self.loader = loader

    def render(
        self,
        config: SkillConfig,
        parser: Optional[PydanticOutputParser] = None,
    ) -> ChatPromptTemplate:
        """Build a ChatPromptTemplate from the skill's system + human prompt files.

        Parameters
        ----------
        config :
            The validated SkillConfig for an ``llm``-type skill.
        parser :
            Optional PydanticOutputParser. If provided, ``{format_instructions}``
            in the system prompt will be replaced via ``.partial()``.
        """
        system_text = self.loader.load_prompt_text(config, "system")
        human_text = self.loader.load_prompt_text(config, "human")

        # Escape bare braces that are NOT template variables.
        # ChatPromptTemplate uses {var} for substitution; prompts may contain
        # literal JSON examples with { } that must be doubled.
        system_text = _escape_braces(system_text)
        human_text = _escape_braces(human_text)

        messages = [("system", system_text), ("human", human_text)]

        prompt = ChatPromptTemplate.from_messages(messages)

        # Always partial(format_instructions=...) so the template can be invoked
        # without a parser (empty string by default). When a parser is provided,
        # substitute the full JSON schema description.
        prompt = prompt.partial(
            format_instructions=parser.get_format_instructions() if parser else "",
        )

        return prompt


def _escape_braces(text: str) -> str:
    """Double literal braces so LangChain doesn't treat them as template vars.

    JSON examples like ``{"key": "value"}`` become ``{{"key": "value"}}``.
    Known template variables ({question}, {context}, {generation},
    {format_instructions}) are left intact.
    """
    safe_vars = {"question", "context", "generation", "format_instructions"}
    out: list[str] = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "{":
            # Try to match a known variable like {question}
            close = text.find("}", i)
            if close != -1:
                inner = text[i + 1 : close].strip()
                if inner in safe_vars:
                    out.append(text[i : close + 1])
                    i = close + 1
                    continue
            # Not a safe var — escape
            out.append("{{")
            i += 1
        elif ch == "}":
            out.append("}}")
            i += 1
        else:
            out.append(ch)
            i += 1
    return "".join(out)


__all__ = ["PromptRenderer"]
