"""
Skill loader — parses .md files with YAML frontmatter into SkillConfig objects.

Discovery is glob-based: ``<base>/agents/**/SKILL.md`` and ``<base>/skills/**/SKILL.md``.
A single SKILL.md is identified by the ``name`` field in its frontmatter.

The loader is intentionally stateless and cache-free. Callers cache results
(see ``SkillExecutor``).
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml
from pydantic import ValidationError

from .models import RoutingRule, SkillConfig

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

_DEFAULT_DEPTH = 3


def _resolve_base_path(base: Optional[str | Path]) -> Path:
    """Resolve the axiom-skills base directory relative to this file.

    Defaults to ``<repo-root>/axiom-skills`` which is three parent levels
    above ``server/app/engine/loader.py`` (i.e. ``loader.parents[3]``).
    """
    if base is None:
        here = Path(__file__).resolve()
        return here.parents[_DEFAULT_DEPTH] / "axiom-skills"
    p = Path(base)
    if p.is_absolute():
        return p
    here = Path(__file__).resolve()
    return (here.parent / p).resolve()


# ---------------------------------------------------------------------------
# YAML frontmatter parser
# ---------------------------------------------------------------------------

FRONTMATTER_RE = re.compile(
    r"^---[ \t]*\n(?P<front>.*?)\n---[ \t]*\n(?P<body>.*)$",
    re.DOTALL,
)


def parse_frontmatter(raw: str) -> Tuple[Dict, str]:
    """Split a .md file into (yaml_dict, markdown_body).

    Returns ``({}, raw)`` if no frontmatter is present (a comment-style core
    file like ``axiom-system.md``).
    """
    match = FRONTMATTER_RE.match(raw)
    if not match:
        return {}, raw
    front_text = match.group("front")
    body = match.group("body")
    data = yaml.safe_load(front_text) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Frontmatter is not a mapping: {type(data).__name__}")
    return data, body


# ---------------------------------------------------------------------------
# SkillLoader
# ---------------------------------------------------------------------------


class SkillLoader:
    """Reads SKILL.md files and returns validated ``SkillConfig`` objects."""

    def __init__(self, base_path: Optional[str | Path] = None) -> None:
        self.base: Path = _resolve_base_path(base_path)
        if not self.base.exists():
            logger.warning("Skill tree not found at %s — run with default scaffold first.", self.base)

    # ------------------------------------------------------------------
    # Single-skill loading
    # ------------------------------------------------------------------

    def load_skill(self, skill_md_path: str | Path) -> SkillConfig:
        """Load a single SKILL.md file and return a validated SkillConfig."""
        path = Path(skill_md_path)
        if not path.exists():
            raise FileNotFoundError(f"SKILL.md not found: {path}")
        raw = path.read_text(encoding="utf-8")
        front, _body = parse_frontmatter(raw)
        # Inject the directory path so prompt files can be resolved later.
        front["dir"] = str(path.parent.resolve())
        try:
            return SkillConfig.model_validate(front)
        except ValidationError as e:
            raise ValueError(
                f"Invalid frontmatter for {path}:\n{e}"
            ) from e

    # ------------------------------------------------------------------
    # Batch discovery (glob)
    # ------------------------------------------------------------------

    def discover_skills(self) -> Dict[str, SkillConfig]:
        """Glob ``agents/**/SKILL.md`` and ``skills/**/SKILL.md``.

        Returns a mapping of ``name`` -> ``SkillConfig``.
        Raises if two skills share the same name.
        """
        if not self.base.exists():
            return {}
        out: Dict[str, SkillConfig] = {}
        for path in sorted(self.base.glob("agents/**/SKILL.md")):
            cfg = self.load_skill(path)
            if cfg.name in out:
                raise ValueError(
                    f"Duplicate skill name '{cfg.name}': {path} conflicts with {out[cfg.name].dir}"
                )
            out[cfg.name] = cfg
        for path in sorted(self.base.glob("skills/**/SKILL.md")):
            cfg = self.load_skill(path)
            if cfg.name in out:
                raise ValueError(
                    f"Duplicate skill name '{cfg.name}': {path} conflicts with {out[cfg.name].dir}"
                )
            out[cfg.name] = cfg
        return out

    # ------------------------------------------------------------------
    # Routing rules
    # ------------------------------------------------------------------

    def load_routing(self, name: str) -> RoutingRule:
        """Load ``axiom-skills/routing/{name}.md``."""
        path = self.base / "routing" / f"{name}.md"
        if not path.exists():
            raise FileNotFoundError(f"Routing definition not found: {path}")
        raw = path.read_text(encoding="utf-8")
        front, _body = parse_frontmatter(raw)
        return RoutingRule.model_validate(front)

    def discover_routing(self) -> Dict[str, RoutingRule]:
        """Glob ``routing/**/*.md`` and parse into RoutingRule objects."""
        out: Dict[str, RoutingRule] = {}
        if not (self.base / "routing").exists():
            return out
        for path in sorted(self.base.glob("routing/*.md")):
            raw = path.read_text(encoding="utf-8")
            front, _body = parse_frontmatter(raw)
            rule = RoutingRule.model_validate(front)
            if rule.name in out:
                raise ValueError(
                    f"Duplicate routing name '{rule.name}': {path}"
                )
            out[rule.name] = rule
        return out

    # ------------------------------------------------------------------
    # Prompt file resolution
    # ------------------------------------------------------------------

    def resolve_prompt_path(self, config: SkillConfig, key: str) -> Path:
        """Resolve a relative path from ``config.prompts[key]`` into an absolute path.

        Returns the resolved Path. Raises ``FileNotFoundError`` if the path
        is not declared in the skill or the file does not exist on disk.
        """
        rel = config.prompts.get(key)
        if not rel:
            raise ValueError(f"Skill '{config.name}' has no '{key}' prompt declared.")
        path = (Path(config.dir) / rel).resolve()
        if not path.exists():
            raise FileNotFoundError(
                f"Prompt '{key}' for skill '{config.name}' not found: {path}"
            )
        return path

    # ------------------------------------------------------------------
    # Raw prompt content
    # ------------------------------------------------------------------

    def load_prompt_text(self, config: SkillConfig, key: str) -> str:
        """Return the raw markdown text of a prompt file (no frontmatter)."""
        path = self.resolve_prompt_path(config, key)
        raw = path.read_text(encoding="utf-8")
        _front, body = parse_frontmatter(raw)
        return body.strip()

    # ------------------------------------------------------------------
    # Core shared resources
    # ------------------------------------------------------------------

    def load_core(self, name: str) -> str:
        """Return the markdown body of ``axiom-skills/core/{name}.md``.

        These files have no frontmatter — they are shared prompt fragments
        like the AXIOM_SYSTEM_INSTRUCTION or citation protocol.
        """
        path = self.base / "core" / f"{name}.md"
        if not path.exists():
            raise FileNotFoundError(f"Core resource not found: {path}")
        return path.read_text(encoding="utf-8").strip()

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_all(self) -> List[str]:
        """Walk every known file and return a list of error messages (empty = ok)."""
        errors: List[str] = []
        if not self.base.exists():
            return [f"Skills base directory does not exist: {self.base}"]
        try:
            skills = self.discover_skills()
        except Exception as exc:
            errors.append(str(exc))
            return errors
        for name, cfg in skills.items():
            for key in cfg.prompts:
                try:
                    self.resolve_prompt_path(cfg, key)
                except Exception as exc:
                    errors.append(f"[{name}] prompt '{key}': {exc}")
        try:
            self.discover_routing()
        except Exception as exc:
            errors.append(str(exc))
        return errors


__all__ = ["SkillLoader", "parse_frontmatter"]
