"""
config.py
─────────────────────────────────────────────────────────────────────────
Single source of truth for all environment variables / secrets.

NOTHING in this project should call os.getenv(...) directly anywhere
else. Every other file imports the already-loaded constants from here.

This guarantees:
  - .env is loaded exactly once (here)
  - No API keys, URLs, or secrets are hardcoded anywhere else
  - If a required variable is missing, the app fails fast and tells you
    exactly which one, instead of failing later with a confusing error.
"""

from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).resolve().parent / ".env"
if not env_path.exists():
    print(f"⚠️  WARNING: backend/.env not found at {env_path}. Environment variables may not be loaded.")
load_dotenv(dotenv_path=str(env_path), override=True)

# ── Supabase ─────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ── Groq (GenAI / LLM) ───────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── OpenAI Support (For Performance Benchmarking) ───────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")

# ── Google Gemini Support (Free Developer API Key) ───────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

# ── YouTube Data API ─────────────────────────────────────────────────────
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# ── App secret (reserved for future JWT/session signing) ────────────────
SECRET_KEY = os.getenv("SECRET_KEY")

# ── Frontend base URL (used to build QR/verification links) ─────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# ── Email / SMTP ─────────────────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM") or os.getenv("SMTP_SENDER") or SMTP_USERNAME
SMTP_SENDER = SMTP_FROM


def _warn_if_missing(name: str, value):
    if not value:
        print(f"⚠️  WARNING: {name} is not set in .env — related features will not work.")


# Fail loud (but don't crash the whole app) if something important is missing.
_warn_if_missing("SUPABASE_URL", SUPABASE_URL)
_warn_if_missing("SUPABASE_KEY", SUPABASE_KEY)
_warn_if_missing("YOUTUBE_API_KEY", YOUTUBE_API_KEY)

active_provider = (LLM_PROVIDER or "groq").strip().lower()
if active_provider == "gemini":
    _warn_if_missing("GEMINI_API_KEY", GEMINI_API_KEY)
elif active_provider == "openai":
    _warn_if_missing("OPENAI_API_KEY", OPENAI_API_KEY)
else:
    _warn_if_missing("GROQ_API_KEY", GROQ_API_KEY)

# SMTP Config verification and logging
if SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD:
    print("SMTP configuration loaded successfully.")
else:
    if not SMTP_HOST:
        print("SMTP_HOST is not set in .env")
    if not SMTP_USERNAME:
        print("SMTP_USERNAME is not set in .env")
    if not SMTP_PASSWORD:
        print("SMTP_PASSWORD is not set in .env")

