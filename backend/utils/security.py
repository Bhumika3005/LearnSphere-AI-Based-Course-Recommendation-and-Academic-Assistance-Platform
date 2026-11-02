"""
utils/security.py
─────────────────────────────────────────────────────────────────────────
Small, dependency-light security helpers shared across routes.
"""

import hashlib
import hmac
import time
import bcrypt
import jwt
from fastapi import HTTPException, Request
from supabase_client import supabase


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against a hash, supporting legacy SHA-256 fallbacks."""
    # Check if this is a legacy unsalted SHA-256 hash (64 hex characters)
    if len(hashed_password) == 64 and all(c in "0123456789abcdef" for c in hashed_password):
        legacy_hash = hashlib.sha256(password.encode()).hexdigest()
        return hmac.compare_digest(legacy_hash, hashed_password)
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def create_access_token(user_id: int, is_admin: bool, expires_in: int = 86400) -> str:
    """Generate a signed JWT access token valid for expires_in seconds (default 24h)."""
    import config
    key = config.SECRET_KEY or config.SUPABASE_KEY or "fallback-secret-for-jwt"
    payload = {
        "user_id": user_id,
        "is_admin": is_admin,
        "exp": int(time.time()) + expires_in
    }
    return jwt.encode(payload, key, algorithm="HS256")


def verify_access_token(token: str) -> dict:
    """Decode and verify a JWT access token. Returns payload dict or None."""
    import config
    key = config.SECRET_KEY or config.SUPABASE_KEY or "fallback-secret-for-jwt"
    try:
        payload = jwt.decode(token, key, algorithms=["HS256"])
        return payload
    except Exception:
        return None


def check_admin(admin_id: int, request: Request):
    """Raise 401/403 unless the request contains a valid admin JWT matching admin_id."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    
    token = auth_header.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token or expired session")
        
    token_user_id = payload.get("user_id")
    token_is_admin = payload.get("is_admin")
    
    if token_user_id != admin_id or not token_is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

