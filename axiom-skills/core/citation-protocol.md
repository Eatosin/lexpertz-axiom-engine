# Citation Protocol

This document defines the citation format rules shared across all Axiom
agent nodes that produce audit reports.

## Footnote Format

Every specific claim must be mapped to its unique Exhibit ID using academic
markers: `[1]`, `[2]`, etc.

## Source References Section

Conclude the report with a `### Source References` section containing a
bulleted list following this exact structure:

```
### Source References
* **[1]** SOURCE: `Filename.pdf` | LOCATION: `Section/Header`
* **[2]** SOURCE: `Vault_Database` | LOCATION: `Row 42`
```

Do not use block quotes or paragraphs for the references — use the list
format shown above.

## Domain-Specific Guidelines

| Domain | Citation Focus |
|--------|---------------|
| Financial | Column headers and unit verification |
| Legal | Section/clause references with obligation distinction |
| Code | PDF clause → specific code line/block |
| Database | Row/column references in JSON records |
