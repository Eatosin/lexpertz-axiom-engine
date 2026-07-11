# Graphify Obsidian Mirror Convention

This project maintains an isolated Obsidian vault folder for its knowledge
graph so multiple products can share one vault without cross-contamination.

## Settings

| Key | Value |
|-----|-------|
| Obsidian vault root | `C:\Users\HomePC\Documents\Obsidian\my-brain` |
| **Project namespace** | `C:\Users\HomePC\Documents\Obsidian\my-brain\codebases\lexpertz-axiom-engine` |
| Manifest (owned files) | `<namespace>/.graphify_obsidian_manifest.json` |
| Canvas file | `<namespace>/graph.canvas` |
| Re-sync command | `graphify export obsidian --dir "<namespace>"` |

## Per-Shell Activation

The post-commit and post-checkout git hooks mirror graph updates into the
namespace only when `GRAPHIFY_EXPORT_DIR` is exported.

```bash
# PowerShell
$env:GRAPHIFY_EXPORT_DIR = 'C:\Users\HomePC\Documents\Obsidian\my-brain\codebases\lexpertz-axiom-engine'

# bash
export GRAPHIFY_EXPORT_DIR='C:\Users\HomePC\Documents\Obsidian\my-brain\codebases\lexpertz-axiom-engine'
```

With `GRAPHIFY_EXPORT_DIR` unset, the hooks remain graph-rebuild only
(no screen clutter, no Obsidian write overhead during automated rebases).

## Adding a New Product to the Same Vault

Repeat this pattern under `<vault-root>/codebases/<product-slug>/`:

1. `<vault-root>/codebases/<product-slug>/` — project namespace folder
2. `<vault-root>/codebases/<product-slug>/graph.canvas` — graph view
3. Set `GRAPHIFY_EXPORT_DIR` per shell to the new namespace
4. Open `<vault-root>` as a single Obsidian vault; the per-product folder
   isolates its notes visually via the Graph View local-clustering.
