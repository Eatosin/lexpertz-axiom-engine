"""
Schema registry — maps schema names (referenced in SKILL.md) to Pydantic classes.

When a skill is loaded, its ``structured_output.schema_name`` field references
a class by name (e.g. ``DistilledContext``). The SkillExecutor resolves this
name via the registry to get the actual Pydantic class.

Pydantic classes stay in Python for runtime validation and structured output
generation. The .md files are pure configuration — they delegate to Python
through this registry.
"""

from __future__ import annotations

from typing import Dict, Type

from pydantic import BaseModel


class SchemaRegistry:
    """Type registry mapping string names to Pydantic BaseModel subclasses."""

    def __init__(self) -> None:
        self._registry: Dict[str, Type[BaseModel]] = {}

    def register(self, model: Type[BaseModel]) -> None:
        """Register a Pydantic model by its class name."""
        name = model.__name__
        if name in self._registry and self._registry[name] is not model:
            raise ValueError(
                f"Schema '{name}' already registered to a different class."
            )
        self._registry[name] = model

    def get(self, schema_name: str) -> Type[BaseModel]:
        """Resolve a schema name to its Pydantic class.

        Raises ``KeyError`` with a helpful message if the name is not found.
        """
        try:
            return self._registry[schema_name]
        except KeyError:
            available = ", ".join(sorted(self._registry.keys())) or "(empty)"
            raise KeyError(
                f"Schema '{schema_name}' not found in registry. "
                f"Available: {available}"
            )

    def names(self) -> list[str]:
        """Return sorted list of registered schema names."""
        return sorted(self._registry.keys())


# ---------------------------------------------------------------------------
# Default singleton instance + auto-registration
# ---------------------------------------------------------------------------

registry = SchemaRegistry()


def _register_defaults() -> None:
    """Register the known Pydantic schemas used by the agent graph.

    These imports are deferred to avoid circular dependencies during module
    load. If the templates module is missing (e.g. during partial migration
    or testing), the schemas are simply not registered.
    """
    try:
        from app.prompts.templates import DistilledContext, HallucinationGrade

        registry.register(DistilledContext)
        registry.register(HallucinationGrade)
    except ImportError:
        # During transition, templates.py may be temporarily absent.
        # The schemas will still work if registered manually.
        pass


_register_defaults()


__all__ = ["SchemaRegistry", "registry"]
