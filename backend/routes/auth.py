"""
routes/auth.py
─────────────────────────────────────────────────────────────────────────
Signup / Login endpoints. Identical behavior to the original app.py,
relocated into its own router.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from supabase_client import supabase
from models.schemas import SignupRequest, UserLogin
from utils.security import hash_password, verify_password, create_access_token
import secrets
import string
import config
import hmac
import hashlib
import time
import base64
from utils.email import send_password_reset_email
from pydantic import BaseModel

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    password: str
    token: str

router = APIRouter(prefix="/auth", tags=["Auth"])


def generate_reset_token(email: str, expires_in: int = 3600) -> str:
    """Generate a signed reset token valid for `expires_in` seconds."""
    key = (config.SECRET_KEY or config.SUPABASE_KEY or "fallback-secret-for-reset-token").encode()
    expiry = int(time.time()) + expires_in
    email_b64 = base64.urlsafe_b64encode(email.encode()).decode().rstrip("=")
    payload = f"{email_b64}.{expiry}"
    sig = hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def verify_reset_token(email: str, token: str) -> bool:
    """Verify a reset token for a specific email."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return False
        email_b64, expiry_str, sig = parts
        
        # Verify signature
        key = (config.SECRET_KEY or config.SUPABASE_KEY or "fallback-secret-for-reset-token").encode()
        payload = f"{email_b64}.{expiry_str}"
        expected_sig = hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return False
            
        # Verify expiry
        if int(time.time()) > int(expiry_str):
            return False
            
        # Verify email matches
        padding = 4 - (len(email_b64) % 4)
        if padding < 4:
            email_b64 += "=" * padding
        decoded_email = base64.urlsafe_b64decode(email_b64.encode()).decode()
        return decoded_email.strip().lower() == email.strip().lower()
    except Exception:
        return False


@router.post("/signup")
def signup(data: SignupRequest):
    """Create a new user account."""
    existing = (
        supabase.table("users")
        .select("id")
        .eq("email", data.email)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(data.password)

    response = (
        supabase.table("users")
        .insert({
            "name": data.name,
            "email": data.email,
            "password_hash": hashed,
        })
        .execute()
    )
    user_id = response.data[0]["id"]

    update_payload = {}
    if data.skill_level:
        update_payload["skill_level"] = str(data.skill_level).lower()
    if data.interests is not None:
        update_payload["interests"] = data.interests

    if update_payload:
        try:
            supabase.table("users").update(update_payload).eq("id", user_id).execute()
        except Exception:
            pass

    token = create_access_token(user_id, is_admin=False)
    return {
        "message": "User created successfully",
        "user_id": user_id,
        "access_token": token,
        "skill_level": str(data.skill_level or "beginner").lower(),
        "interests": data.interests or [],
    }


@router.post("/login")
def login(data: UserLogin):
    """Authenticate a user and return their profile."""
    response = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = response.data[0]
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    is_admin_flag = bool(user.get("is_admin", False))
    token = create_access_token(user["id"], is_admin=is_admin_flag)

    return {
        "message": "Login successful",
        "user_id": user["id"],
        "access_token": token,
        "name": user["name"],
        "email": user["email"],
        "skill_level": user.get("skill_level", "beginner"),
        "interests": user.get("interests", []),
        "is_admin": int(user.get("is_admin", 0)),
    }


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks):
    """Send a password reset link to the user's email."""
    # 1. Look up user by email
    response = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Email address not found")

    user = response.data[0]

    # 2. Extract frontend url dynamically
    referer = request.headers.get("referer")
    origin = request.headers.get("origin")
    frontend_url = origin or (referer.split("/login")[0] if referer else None) or config.FRONTEND_URL

    # 3. Create the secure reset link with token
    token = generate_reset_token(user['email'])
    reset_link = f"{frontend_url.rstrip('/')}/reset-password?email={user['email']}&token={token}"

    # 4. Send reset email in background
    try:
        background_tasks.add_task(
            send_password_reset_email,
            name=user["name"],
            email=user["email"],
            reset_link=reset_link
        )
    except Exception as email_err:
        print(f"Failed to queue reset email: {email_err}")

    return {"message": "Password reset link has been sent to your email"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    """Set a new password for the user if the token is valid."""
    # 1. Verify the reset token
    if not verify_reset_token(data.email, data.token):
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")

    # 2. Look up user by email
    response = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = response.data[0]

    # 3. Hash and update the new password
    hashed = hash_password(data.password)
    try:
        supabase.table("users").update({"password_hash": hashed}).eq("id", user["id"]).execute()
    except Exception as db_err:
        raise HTTPException(status_code=500, detail=f"Database error: {db_err}")

    return {"message": "Password updated successfully"}
