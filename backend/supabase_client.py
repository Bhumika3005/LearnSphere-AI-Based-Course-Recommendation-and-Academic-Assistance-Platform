"""
supabase_client.py
─────────────────────────────────────────────────────────────────────────
Creates the single shared Supabase client used across the whole backend.

This file does ONE thing: connect to Supabase.
No business logic, no table queries, no route code belongs here.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_KEY must be set in your .env file. "
        "Copy .env.example to .env and fill in your Supabase project credentials."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
