"""
routes/admin.py
─────────────────────────────────────────────────────────────────────────
Admin-only endpoints. Every route here calls check_admin(user_id) first.
Same behavior as the original app.py admin routes — relocated.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from supabase_client import supabase
from utils.security import check_admin, hash_password
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from pydantic import BaseModel
from utils.email import send_welcome_email
import logging
import config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


def safe_execute(builder):
    """
    Executes a Supabase query builder object. If the underlying connection was closed
    (causing ConnectionState.CLOSED or RECV_HEADERS errors), retries the request once.
    """
    try:
        return builder.execute()
    except Exception as e:
        err_msg = str(e)
        if "ConnectionState.CLOSED" in err_msg or "RECV_HEADERS" in err_msg:
            logger.warning("Supabase connection was closed. Retrying query with a fresh connection...")
            return builder.execute()
        raise


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    is_admin: bool = False
    skill_level: str = "beginner"
    interests: list = []


@router.post("/add-user/{admin_id}")
def admin_add_user(admin_id: int, user_data: CreateUserRequest, background_tasks: BackgroundTasks, request: Request):
    """Add a new user (admin only)."""
    check_admin(admin_id, request)
    try:
        # Extract frontend URL from request headers dynamically
        referer = request.headers.get("referer")
        origin = request.headers.get("origin")
        frontend_url = origin or (referer.split("/admin")[0] if referer else None) or config.FRONTEND_URL
        # Check if email already exists
        existing = safe_execute(
            supabase.table("users").select("*").eq("email", user_data.email)
        )
        if existing.data:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password and create user
        hashed_pw = hash_password(user_data.password)
        user_resp = safe_execute(
            supabase.table("users")
            .insert(
                {
                    "name": user_data.name,
                    "email": user_data.email,
                    "password_hash": hashed_pw,
                    "is_admin": user_data.is_admin,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
        )

        if not user_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create user")

        new_user_id = user_resp.data[0]["id"]

        # Persist skill_level / interests, same as the regular signup flow.
        update_payload = {}
        if user_data.skill_level:
            update_payload["skill_level"] = str(user_data.skill_level).lower()
        if user_data.interests:
            update_payload["interests"] = user_data.interests

        if update_payload:
            try:
                safe_execute(
                    supabase.table("users").update(update_payload).eq(
                        "id", new_user_id
                    )
                )
            except Exception:
                pass

        # Send welcome email in background
        try:
            background_tasks.add_task(
                send_welcome_email,
                name=user_data.name,
                email=user_data.email,
                temp_password=user_data.password,
                frontend_url=frontend_url
            )
        except Exception as bg_err:
            import logging
            logging.getLogger(__name__).error(f"Failed to queue welcome email task: {bg_err}")

        return {
            "message": "User created successfully",
            "user_id": new_user_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add user: {str(e)}")


@router.get("/stats/{user_id}")
def admin_stats(user_id: int, request: Request):
    check_admin(user_id, request)
    try:
        users_resp = (
            supabase.table("users")
            .select("count", count="exact")
            .eq("is_admin", False)
            .execute()
        )
        total_users = (
            users_resp.count
            if hasattr(users_resp, "count")
            else len(users_resp.data or [])
        )

        searches_resp = (
            supabase.table("search_history").select("count", count="exact").execute()
        )
        total_searches = (
            searches_resp.count
            if hasattr(searches_resp, "count")
            else len(searches_resp.data or [])
        )

        quizzes_resp = (
            supabase.table("quiz_results").select("count", count="exact").execute()
        )
        total_quizzes = (
            quizzes_resp.count
            if hasattr(quizzes_resp, "count")
            else len(quizzes_resp.data or [])
        )

        feedback_resp = (
            supabase.table("feedback").select("count", count="exact").execute()
        )
        total_feedback = (
            feedback_resp.count
            if hasattr(feedback_resp, "count")
            else len(feedback_resp.data or [])
        )

        avg_score = 0
        if total_quizzes > 0:
            scores_resp = supabase.table("quiz_results").select("score").execute()
            if scores_resp.data:
                avg_score = sum(q.get("score", 0) for q in scores_resp.data) / len(
                    scores_resp.data
                )

        return {
            "total_users": total_users,
            "total_searches": total_searches,
            "total_quizzes": total_quizzes,
            "avg_score": round(float(avg_score), 1),
            "total_feedback": total_feedback,
        }
    except Exception:
        return {
            "total_users": 0,
            "total_searches": 0,
            "total_quizzes": 0,
            "avg_score": 0,
            "total_feedback": 0,
        }


@router.get("/users/{user_id}")
def admin_get_users(user_id: int, request: Request):
    check_admin(user_id, request)
    try:
        users_resp = supabase.table("users").select("*").eq("is_admin", False).execute()
        users = users_resp.data or []
        result = []
        for u in users:
            searches_resp = (
                supabase.table("search_history")
                .select("count", count="exact")
                .eq("user_id", u["id"])
                .execute()
            )
            searches_count = (
                searches_resp.count
                if hasattr(searches_resp, "count")
                else len(searches_resp.data or [])
            )

            quizzes_resp = (
                supabase.table("quiz_results")
                .select("count", count="exact")
                .eq("user_id", u["id"])
                .execute()
            )
            quizzes_count = (
                quizzes_resp.count
                if hasattr(quizzes_resp, "count")
                else len(quizzes_resp.data or [])
            )

            result.append(
                {
                    "id": u["id"],
                    "name": u["name"],
                    "email": u["email"],
                    "created_at": u.get("created_at"),
                    "searches": searches_count,
                    "quizzes": quizzes_count,
                }
            )
        return {"users": result}
    except Exception:
        return {"users": []}


@router.delete("/user/{admin_id}/{target_user_id}")
def admin_delete_user(admin_id: int, target_user_id: int, request: Request):
    check_admin(admin_id, request)
    try:
        user_resp = (
            supabase.table("users")
            .select("is_admin")
            .eq("id", target_user_id)
            .execute()
        )
        if not user_resp.data or user_resp.data[0].get("is_admin"):
            raise HTTPException(status_code=403, detail="Cannot delete admin users")
        supabase.table("users").delete().eq("id", target_user_id).execute()
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/feedback/{user_id}")
def admin_get_feedback(user_id: int, request: Request):
    check_admin(user_id, request)
    try:
        feedback_resp = supabase.table("feedback").select("*").execute()
        feedback = feedback_resp.data or []
        result = []
        for f in feedback:
            user_resp = (
                supabase.table("users")
                .select("name")
                .eq("id", f.get("user_id"))
                .execute()
            )
            f["user_name"] = (
                user_resp.data[0].get("name") if user_resp.data else "Unknown"
            )
            result.append(f)
        return {"feedback": result}
    except Exception:
        return {"feedback": []}


@router.delete("/feedback/{admin_id}/{feedback_id}")
def admin_delete_feedback(admin_id: int, feedback_id: int, request: Request):
    check_admin(admin_id, request)
    try:
        supabase.table("feedback").delete().eq("id", feedback_id).execute()
        return {"message": "Feedback deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/searches/{user_id}")
def admin_get_searches(user_id: int, request: Request):
    check_admin(user_id, request)
    try:
        searches_resp = (
            supabase.table("search_history")
            .select("*")
            .order("searched_at", desc=True)
            .limit(50)
            .execute()
        )
        searches = searches_resp.data or []
        result = []
        for s in searches:
            user_resp = (
                supabase.table("users")
                .select("name, email")
                .eq("id", s.get("user_id"))
                .execute()
            )
            if user_resp.data:
                s["name"] = user_resp.data[0].get("name")
                s["email"] = user_resp.data[0].get("email")
            result.append(s)
        return {"searches": result}
    except Exception:
        return {"searches": []}


@router.get("/quiz-results/{user_id}")
def admin_quiz_results(user_id: int, request: Request):
    check_admin(user_id, request)
    try:
        quizzes_resp = (
            supabase.table("quiz_results")
            .select("*")
            .order("taken_at", desc=True)
            .limit(50)
            .execute()
        )
        results = quizzes_resp.data or []
        result = []
        for q in results:
            user_resp = (
                supabase.table("users")
                .select("name, email")
                .eq("id", q.get("user_id"))
                .execute()
            )
            if user_resp.data:
                q["name"] = user_resp.data[0].get("name")
                q["email"] = user_resp.data[0].get("email")
            result.append(q)
        return {"results": result}
    except Exception:
        return {"results": []}


@router.get("/activity/{user_id}")
def admin_platform_activity(user_id: int, request: Request):
    """Real platform-wide activity for the last 7 days: new signups,
    new enrollments, and quiz attempts per day, across all users.

    Replaces what used to be a hardcoded, fake array of numbers on the
    Admin Activity tab — every value here comes straight from the
    database (users.created_at, course_enrollments.enrolled_at,
    quiz_results.taken_at).
    """
    check_admin(user_id, request)

    try:
        APP_TIMEZONE = ZoneInfo("Asia/Kolkata")
    except Exception:
        APP_TIMEZONE = timezone.utc

    def parse_ts(value):
        if not value:
            return None
        try:
            ts = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    now_local = datetime.now(APP_TIMEZONE)
    range_start = (now_local - timedelta(days=6)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    days = []
    for i in range(7):
        day_start_local = range_start + timedelta(days=i)
        days.append(
            {
                "day": day_start_local.strftime("%a"),
                "date": day_start_local.strftime("%Y-%m-%d"),
                "users": 0,
                "courses": 0,
                "quizzes": 0,
            }
        )
    by_date = {d["date"]: d for d in days}

    try:
        users_resp = supabase.table("users").select("created_at").execute()
        for row in users_resp.data or []:
            ts = parse_ts(row.get("created_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in by_date:
                by_date[key]["users"] += 1
    except Exception:
        pass

    try:
        enroll_resp = (
            supabase.table("course_enrollments").select("enrolled_at").execute()
        )
        for row in enroll_resp.data or []:
            ts = parse_ts(row.get("enrolled_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in by_date:
                by_date[key]["courses"] += 1
    except Exception:
        pass

    try:
        quiz_resp = supabase.table("quiz_results").select("taken_at").execute()
        for row in quiz_resp.data or []:
            ts = parse_ts(row.get("taken_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in by_date:
                by_date[key]["quizzes"] += 1
    except Exception:
        pass

    return {"activity": days}


@router.get("/certificates/{user_id}")
def admin_certificate_stats(user_id: int, request: Request):
    """Real certificate stats across all users: how many certificates have
    actually been issued (rows in the certificates table) vs. how many
    completed courses (course_progress.completed = true) don't have one
    generated yet.

    Replaces a previous version of this panel that showed quiz pass/fail
    counts mislabeled as certificate stats — quizzes and certificates are
    different things, and course completion (not quiz passing alone) is
    what actually earns a certificate.
    """
    check_admin(user_id, request)

    try:
        certs_resp = (
            supabase.table("certificates").select("user_id, course_title").execute()
        )
        certs = certs_resp.data or []
    except Exception:
        certs = []
    issued_pairs = {
        (c.get("user_id"), (c.get("course_title") or "").strip().lower()) for c in certs
    }

    try:
        completed_resp = (
            supabase.table("course_progress")
            .select("user_id, course_title")
            .eq("completed", True)
            .execute()
        )
        completed = completed_resp.data or []
    except Exception:
        completed = []

    pending = 0
    for row in completed:
        key = (row.get("user_id"), (row.get("course_title") or "").strip().lower())
        if key not in issued_pairs:
            pending += 1

    return {
        "stats": [{"name": "Certificates", "earned": len(certs), "pending": pending}]
    }

@router.get("/user-activity/{admin_id}/{target_user_id}")
def admin_user_activity(admin_id: int, target_user_id: int, request: Request):
    """
    Complete activity of one user.
    """

    check_admin(admin_id, request)

    try:

        # User Details
        user_resp = (
            supabase.table("users")
            .select("id,name,email,is_admin,created_at")
            .eq("id", target_user_id)
            .single()
            .execute()
        )

        if not user_resp.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Searches
        searches = (
            supabase.table("search_history")
            .select("*")
            .eq("user_id", target_user_id)
            .order("searched_at", desc=True)
            .execute()
        ).data or []

        # Quiz Results
        quizzes = (
            supabase.table("quiz_results")
            .select("*")
            .eq("user_id", target_user_id)
            .order("taken_at", desc=True)
            .execute()
        ).data or []

        # Enrolled Courses
        enrollments = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", target_user_id)
            .execute()
        ).data or []

        # Course Progress
        progress = (
            supabase.table("course_progress")
            .select("*")
            .eq("user_id", target_user_id)
            .execute()
        ).data or []

        # Certificates
        certificates = (
            supabase.table("certificates")
            .select("*")
            .eq("user_id", target_user_id)
            .execute()
        ).data or []

        return {

            "user": user_resp.data,

            "search_history": searches,

            "quiz_results": quizzes,

            "enrollments": enrollments,

            "course_progress": progress,

            "certificates": certificates

        }

    except Exception as e:

        raise HTTPException(status_code=500, detail=str(e))