"""
utils/certificate_generator.py
─────────────────────────────────────────────────────────────────────────
Generates a unique certificate ID and the certificate data payload.
Actual PDF rendering is left to the frontend (e.g. via a print/PDF
library) or can be added later with a service like WeasyPrint —
this utility produces the data the certificate is built from.
"""

import uuid
from datetime import datetime


def generate_certificate_id() -> str:
    """Generate a short, unique, human-shareable certificate ID."""
    return f"CERT-{uuid.uuid4().hex[:10].upper()}"


def build_certificate_payload(student_name: str, course_name: str) -> dict:
    return {
        "certificate_id": generate_certificate_id(),
        "student_name": student_name,
        "course_name": course_name,
        "completion_date": datetime.utcnow().strftime("%Y-%m-%d"),
    }
