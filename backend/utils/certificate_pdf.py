"""
utils/certificate_pdf.py
─────────────────────────────────────────────────────────────────────────
Renders a certificate of completion as an actual downloadable PDF, using
reportlab. Previously "Download" on the Certificate page just called the
browser's window.print() — this produces a real .pdf file instead.
"""

import io
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from utils.certificate_qr import generate_qr_png_bytes, build_verify_url

PRIMARY = HexColor("#4f46e5")
DARK = HexColor("#0f172a")
MUTED = HexColor("#64748b")
GOLD = HexColor("#f59e0b")


def build_certificate_pdf(student_name: str, course_title: str, completion_date: str, certificate_id: str, frontend_url: str = None) -> bytes:
    """Return the raw bytes of a one-page landscape certificate PDF."""
    buf = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    margin = 1.2 * cm

    # Outer border
    c.setStrokeColor(PRIMARY)
    c.setLineWidth(3)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin)

    # Inner border
    inner_margin = margin + 0.35 * cm
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.rect(inner_margin, inner_margin, width - 2 * inner_margin, height - 2 * inner_margin)

    # Header
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width / 2, height - 2.6 * cm, "LEARNSPHERE")

    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(width / 2, height - 4.3 * cm, "Certificate of Completion")

    # Divider
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.line(width / 2 - 3.5 * cm, height - 4.9 * cm, width / 2 + 3.5 * cm, height - 4.9 * cm)

    # "This certifies that"
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, height - 6.4 * cm, "This certifies that")

    # Student name
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(width / 2, height - 7.9 * cm, student_name)

    # "has successfully completed"
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, height - 9.2 * cm, "has successfully completed the course")

    # Course title
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, height - 10.5 * cm, course_title)

    # Date
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 11.6 * cm, f"Completed on {completion_date}")

    # Footer: QR code + certificate ID (left) + signature line (right)
    footer_y = margin + 1.2 * cm

    qr_size = 1.9 * cm
    qr_x = inner_margin + 0.6 * cm
    qr_y = footer_y - 0.25 * cm
    
    verify_url = f"{frontend_url.rstrip('/')}/verify/{certificate_id}" if frontend_url else build_verify_url(certificate_id)
    qr_png = generate_qr_png_bytes(verify_url)
    c.drawImage(
        ImageReader(io.BytesIO(qr_png)),
        qr_x, qr_y, width=qr_size, height=qr_size,
        preserveAspectRatio=True, mask="auto",
    )

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(qr_x + qr_size + 0.35 * cm, footer_y + 0.55 * cm, f"Certificate ID: {certificate_id}")
    c.setFont("Helvetica", 7.5)
    c.drawString(qr_x + qr_size + 0.35 * cm, footer_y + 0.15 * cm, "Scan to verify authenticity")

    sig_x_end = width - inner_margin - 0.6 * cm
    sig_x_start = sig_x_end - 5 * cm
    c.setStrokeColor(DARK)
    c.setLineWidth(0.8)
    c.line(sig_x_start, footer_y + 0.5 * cm, sig_x_end, footer_y + 0.5 * cm)
    c.setFont("Helvetica", 9)
    c.drawCentredString((sig_x_start + sig_x_end) / 2, footer_y, "LearnSphere Platform")

    c.showPage()
    c.save()
    return buf.getvalue()