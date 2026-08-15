# Decision: Local-Only Document Parsing with PyMuPDF4LLM

**Date:** 2026-08-15
**Status:** Accepted
**Scope:** PDF parsing pipeline (SiaS desktop architecture)
**Supersedes:** PRD_SIAS.md Q1 (Docling) — pending PRD amendment

---

## Context

The SiaS architecture pivots to a **local-first desktop auditing coworker** ("Cloud-Brain,
Local-Data"): the FastAPI sidecar runs on the auditor's machine, documents never leave it,
and the cloud portal stores zero customer documents or embeddings.

Two candidate parsers were evaluated for the PDF→Markdown pipeline:

1. **Docling** (`docling==2.88.0`, currently pinned in `server/requirements.txt` with
   `torch==2.4.0+cpu` + torchvision + torchaudio) — neural layout + tableformer models.
2. **PyMuPDF4LLM** — PyMuPDF's official LLM-oriented extension producing structured
   Markdown (layout-aware text, heading detection, Markdown/HTML table output) with zero
   model weights.

## Decision

**PDF parsing is local-only via PyMuPDF4LLM.** No Docling, no cloud OCR tier.

- `.pdf` → `pymupdf4llm.to_markdown(pdf, table_output="markdown")` behind the parser
  registry (`server/app/core/parsers/pdf_parser.py`)
- `.xlsx` → openpyxl, `.csv` → pandas (unchanged)
- Document bytes never leave the machine — the "Local-Data" privacy promise holds by
  default, no opt-in consent flows, no retention controls needed

## Rationale

| Consideration | Docling | PyMuPDF4LLM |
|---------------|---------|-------------|
| Installed footprint (Windows, Nuitka) | ~2.5–3.5 GB (torch path) / ~400–600 MB (ONNX-optimized, unproven) | ~60 MB, no torch |
| Model weights | ~200–300 MB, bundled offline via `artifacts_path` | None |
| Table/heading structure | Neural, excellent on complex/scanned docs | Rule-based (geometry + `find_tables()` lines/text strategies + `refine` merged-cell semantics); strong on digital PDFs |
| Privacy | Local-only possible, but heavy | Local-only by construction |
| Scanned PDF fidelity | High (OCR engines) | Degrades — known product boundary |

The auditor corpus is **mostly digital PDFs** (invoices, statements, generated reports) with
well-formed tables — within PyMuPDF4LLM's strength envelope. The privacy requirement makes
any cloud parser a non-starter, and Docling's local cost (≥400 MB, torch dependency,
Nuitka-fragile) is disproportionate for the marginal fidelity gain on this corpus.

## Alternatives Considered

| Alternative | Verdict | Why rejected |
|-------------|---------|--------------|
| Docling local (full torch) | Rejected | ~2.5–3.5 GB; blows installer target; Nuitka freeze risk |
| Docling local (ONNX-optimized) | Deferred | ~400–600 MB unproven footprint; requires spike to verify torch-free operation; not needed for digital corpus |
| Cloud Docling / Baidu Unlimited-OCR tier | Rejected | Requires uploading raw documents or rendered page images — crosses the "Local-Data" line; GPU-only server model; enterprise auditors would refuse |
| pdfplumber | Rejected | Text + coordinate tables only; no layout/heading detection; table-to-Markdown requires custom assembly |

## Consequences

- **Installer size target:** <15 MB → **<80 MB** (PyMuPDF wheel ~50–60 MB; no torch)
- **requirements.txt:** remove `docling`, `torch==2.4.0+cpu`, `torchvision`, `torchaudio`,
  and the `--extra-index-url https://download.pytorch.org/whl/cpu` line; add `pymupdf`,
  `pymupdf4llm`
- **Parser registry** (`server/app/core/parsers/__init__.py`):
  `{".pdf": pdf_to_markdown, ".xlsx": excel_to_markdown, ".csv": csv_to_markdown}`
- **ingest.py:** replace lazy `DocumentConverter` with parser-registry dispatch; no change
  to chunking/embedding downstream
- **Known boundary:** scanned/image-only PDFs get degraded extraction (no OCR model
  locally). UI should surface a "low-fidelity extraction" notice. Cloud tier may be
  revisited only if the corpus shifts; OCR hook in pymupdf4llm is the local mitigation.
- **PRD_SIAS.md (archive):** Q1 decision row, Layer Architecture row, dependency audit,
  size criteria, and Phase 6 tasks must be amended to match (follow-up).
