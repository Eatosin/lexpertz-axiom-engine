"""Generate a synthetic digital PDF fixture for parser tests.

Creates tests/fixtures/sample_audit.pdf containing headings and a table,
using PyMuPDF-free tooling (pdfplumber stack) so the fixture is reproducible
without extra system dependencies.
"""

from pathlib import Path

FIXTURE_DIR = Path(__file__).resolve().parent


def generate_sample_pdf(output_path: Path) -> Path:
    import pdfplumber
    from reportlab.pdfgen import canvas  # type: ignore[import-not-found]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output_path), pagesize=(612, 792))

    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 720, "Sample Audit Report")

    c.setFont("Helvetica", 12)
    c.drawString(72, 690, "Prepared for: Acme Corp")
    c.drawString(72, 672, "Period: Q3 2026")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(72, 630, "Financial Summary")
    c.setFont("Helvetica", 11)
    c.drawString(72, 610, "The following table summarizes revenue and costs.")

    c.setFont("Helvetica-Bold", 11)
    c.drawString(72, 580, "Item")
    c.drawString(250, 580, "Amount")
    c.drawString(400, 580, "Currency")

    rows = [
        ("Revenue", "1,250,000", "USD"),
        ("Cost of Goods", "720,000", "USD"),
        ("Net Income", "530,000", "USD"),
    ]
    y = 560
    c.setFont("Helvetica", 11)
    for item, amount, currency in rows:
        c.drawString(72, y, item)
        c.drawString(250, y, amount)
        c.drawString(400, y, currency)
        y -= 20

    c.setFont("Helvetica-Bold", 14)
    c.drawString(72, 480, "Conclusion")
    c.setFont("Helvetica", 11)
    c.drawString(72, 460, "The company's liability is strictly capped at 5,000,000 USD.")
    c.drawString(72, 442, "All figures are stated in USD unless otherwise noted.")

    c.showPage()
    c.save()
    return output_path


if __name__ == "__main__":
    out = generate_sample_pdf(FIXTURE_DIR / "sample_audit.pdf")
    print(f"Fixture written: {out}")
