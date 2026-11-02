"""
utils/certificate_qr.py
─────────────────────────────────────────────────────────────────────────
Generates a QR code that links to a public certificate-verification page.
Scanning the code (e.g. from a printed certificate) opens:

    {FRONTEND_URL}/verify/{certificate_id}

which calls the public GET /progress/certificate/verify/{certificate_id}
endpoint and shows whether the certificate is genuine.
"""

import io
from config import FRONTEND_URL

import qrcode


def build_verify_url(certificate_id: str) -> str:
    """Public, unauthenticated URL a QR code scan should open."""
    return f"{FRONTEND_URL}/verify/{certificate_id}"


def generate_qr_png_bytes(data: str, box_size: int = 8, border: int = 2) -> bytes:
    """Return raw PNG bytes for a QR code encoding `data`."""
    qr = qrcode.QRCode(
        version=None,  # auto-size to fit the data
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_certificate_qr_png(certificate_id: str) -> bytes:
    """Convenience helper: QR PNG that points at this certificate's verify page."""
    return generate_qr_png_bytes(build_verify_url(certificate_id))