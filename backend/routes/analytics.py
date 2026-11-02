"""
routes/analytics.py
─────────────────────────────────────────────────────────────────────────
Chart-ready data endpoints for the Analytics Dashboard.
Returns real data from Supabase — no fake/simulated numbers.
"""

from fastapi import APIRouter
from supabase_client import supabase
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from routes.progress import _course_title_matches

router = APIRouter(prefix="/analytics", tags=["Analytics"])

try:
    APP_TIMEZONE = ZoneInfo("Asia/Kolkata")
except Exception:
    APP_TIMEZONE = timezone.utc


# ── Helper ────────────────────────────────────────────────────────────

def _count(resp) -> int:
    """Safely extract count from a Supabase response."""
    if hasattr(resp, "count") and resp.count is not None:
        return resp.count
    return len(resp.data or [])


def _parse_timestamp(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            ts = datetime.fromisoformat(value.replace("Z", "+00:00"))
            # Supabase can return TIMESTAMP (no tz) values as naive ISO strings.
            # Treat them as UTC so charts don't silently drop those records.
            return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def _local_day_window(days_back: int):
    now_local = datetime.now(APP_TIMEZONE)
    range_start_local = (now_local - timedelta(days=days_back)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    range_end_local = (now_local + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return now_local, range_start_local, range_end_local


def _build_title_progress_map(enrollments, progress_rows):
    """Merge enrollments with their progress rows using fuzzy course-title
    matching (same logic as routes.progress.get_all_progress), instead of
    requiring an exact normalized-string match.

    The previous exact-match version keyed everything by
    `.strip().lower()` — if an enrollment's title and its matching
    course_progress row's title differed by even a small wording/spacing
    difference, they'd land in two different dict keys instead of merging
    into one, inflating the enrolled-course count with a phantom entry
    that was really just a duplicate of an already-counted course. This
    is why Analytics could show a different (higher) enrolled count than
    Overview, which already used fuzzy matching via progress.py.
    """
    progress_rows = progress_rows or []
    used_progress_indexes = set()
    merged = {}

    for i, row in enumerate(enrollments or []):
        title = row.get("course_title")
        if not title:
            continue
        match = None
        match_idx = None
        for j, prow in enumerate(progress_rows):
            if j in used_progress_indexes:
                continue
            if _course_title_matches(title, prow.get("course_title", "")):
                match = prow
                match_idx = j
                break
        if match_idx is not None:
            used_progress_indexes.add(match_idx)
        merged[i] = {
            "course_title": title,
            "progress_percentage": (match or {}).get(
                "progress_percentage", row.get("progress_percentage", 0)
            ),
            "completed": (match or {}).get(
                "completed", row.get("completed", False)
            ),
        }

    # Any progress rows that never matched an enrollment (shouldn't
    # normally happen, but keeps behavior consistent with progress.py)
    next_key = len(merged)
    for j, prow in enumerate(progress_rows):
        if j in used_progress_indexes:
            continue
        title = prow.get("course_title")
        if not title:
            continue
        merged[next_key] = {
            "course_title": title,
            "progress_percentage": prow.get("progress_percentage", 0),
            "completed": prow.get("completed", False),
        }
        next_key += 1

    return merged


# ── Overview ──────────────────────────────────────────────────────────

@router.get("/{user_id}/overview")
def analytics_overview(user_id: int):
    """Six header stat cards for the Analytics Dashboard."""
    try:
        enrolled_resp = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        progress_resp = (
            supabase.table("course_progress")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        merged_courses = _build_title_progress_map(
            enrolled_resp.data or [],
            progress_resp.data or [],
        )
        merged_list = list(merged_courses.values())

        total_enrolled = len(merged_list)
        completed_count = sum(1 for e in merged_list if e.get("completed"))
        in_progress = max(0, total_enrolled - completed_count)
        avg_progress = (
            round(sum(e.get("progress_percentage", 0) for e in merged_list) / total_enrolled)
            if total_enrolled else 0
        )

        # Quiz scores
        quiz_resp = (
            supabase.table("quiz_results")
            .select("score")
            .eq("user_id", user_id)
            .execute()
        )
        scores = [q.get("score", 0) for q in (quiz_resp.data or [])]
        avg_quiz = round(sum(scores) / len(scores)) if scores else 0

        # Certificates
        cert_resp = (
            supabase.table("certificates")
            .select("count", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        certs = _count(cert_resp)

        return {
            "total_courses_enrolled":    total_enrolled,
            "courses_completed":         completed_count,
            "courses_in_progress":       in_progress,
            "average_progress_percentage": avg_progress,
            "average_quiz_score":        avg_quiz,
            "certificates_earned":       certs,
        }
    except Exception as e:
        print(f"Analytics overview error: {e}")
        return {
            "total_courses_enrolled": 0,
            "courses_completed": 0,
            "courses_in_progress": 0,
            "average_progress_percentage": 0,
            "average_quiz_score": 0,
            "certificates_earned": 0,
        }


# ── Weekly Activity — batch aggregation ────────────────────────────────

@router.get("/{user_id}/weekly-activity")
def weekly_activity(user_id: int):
    """
    Returns real daily activity counts for the last 7 days.
    Combines: searches done + quizzes taken + videos interacted with per day.
    Frontend uses this for the bar chart.
    """
    try:
        now_local, range_start_local, range_end_local = _local_day_window(6)

        buckets = {}
        ordered_days = []
        for i in range(6, -1, -1):
            day_start = (now_local - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            date_key = day_start.strftime("%Y-%m-%d")
            ordered_days.append(date_key)
            buckets[date_key] = {
                "day": day_start.strftime("%a"),
                "date": date_key,
                "searches": 0,
                "quizzes": 0,
                "videos": 0,
                "total": 0,
            }

        start_str = range_start_local.astimezone(timezone.utc).isoformat()
        end_str = range_end_local.astimezone(timezone.utc).isoformat()

        s_resp = (
            supabase.table("search_history")
            .select("searched_at")
            .eq("user_id", user_id)
            .gte("searched_at", start_str)
            .lt("searched_at", end_str)
            .execute()
        )
        for row in (s_resp.data or []):
            ts = _parse_timestamp(row.get("searched_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key]["searches"] += 1

        q_resp = (
            supabase.table("quiz_results")
            .select("taken_at")
            .eq("user_id", user_id)
            .gte("taken_at", start_str)
            .lt("taken_at", end_str)
            .execute()
        )
        for row in (q_resp.data or []):
            ts = _parse_timestamp(row.get("taken_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key]["quizzes"] += 1

        v_resp = (
            supabase.table("video_progress")
            .select("updated_at")
            .eq("user_id", user_id)
            .gte("updated_at", start_str)
            .lt("updated_at", end_str)
            .execute()
        )
        for row in (v_resp.data or []):
            ts = _parse_timestamp(row.get("updated_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key]["videos"] += 1

        days = []
        for key in ordered_days:
            bucket = buckets[key]
            bucket["total"] = bucket["searches"] + bucket["quizzes"] + bucket["videos"]
            days.append(bucket)

        return {"weekly_data": days}

    except Exception as e:
        print(f"Weekly activity error: {e}")
        # Return zero-filled fallback so chart still renders
        days_list = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return {
            "weekly_data": [
                {"day": d, "date": "", "searches": 0,
                 "quizzes": 0, "videos": 0, "total": 0}
                for d in days_list
            ]
        }


# ── Monthly Activity — batch aggregation ───────────────────────────────

@router.get("/{user_id}/monthly-activity")
def monthly_activity(user_id: int):
    """
    Returns real daily activity counts for the last 30 days.
    Combines: searches done + quizzes taken + videos interacted with per day.
    """
    try:
        now_local, range_start_local, range_end_local = _local_day_window(29)

        buckets = {}
        ordered_days = []
        for i in range(29, -1, -1):
            day_start = (now_local - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            date_key = day_start.strftime("%Y-%m-%d")
            ordered_days.append(date_key)
            buckets[date_key] = {
                "day": day_start.strftime("%b %d"),
                "date": date_key,
                "searches": 0,
                "quizzes": 0,
                "videos": 0,
                "total": 0,
            }

        start_str = range_start_local.astimezone(timezone.utc).isoformat()
        end_str = range_end_local.astimezone(timezone.utc).isoformat()

        s_resp = (
            supabase.table("search_history")
            .select("searched_at")
            .eq("user_id", user_id)
            .gte("searched_at", start_str)
            .lt("searched_at", end_str)
            .execute()
        )
        for row in (s_resp.data or []):
            ts = _parse_timestamp(row.get("searched_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key]["searches"] += 1

        q_resp = (
            supabase.table("quiz_results")
            .select("taken_at")
            .eq("user_id", user_id)
            .gte("taken_at", start_str)
            .lt("taken_at", end_str)
            .execute()
        )
        for row in (q_resp.data or []):
            ts = _parse_timestamp(row.get("taken_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key]["quizzes"] += 1

        v_resp = (
            supabase.table("video_progress")
            .select("updated_at")
            .eq("user_id", user_id)
            .gte("updated_at", start_str)
            .lt("updated_at", end_str)
            .execute()
        )
        for row in (v_resp.data or []):
            ts = _parse_timestamp(row.get("updated_at"))
            if not ts:
                continue
            key = ts.astimezone(APP_TIMEZONE).strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key]["videos"] += 1

        days = []
        for key in ordered_days:
            bucket = buckets[key]
            bucket["total"] = bucket["searches"] + bucket["quizzes"] + bucket["videos"]
            days.append(bucket)

        return {"monthly_data": days}

    except Exception as e:
        print(f"Monthly activity error: {e}")
        return {
            "monthly_data": [
                {"day": "", "date": "", "searches": 0,
                 "quizzes": 0, "videos": 0, "total": 0}
                for _ in range(30)
            ]
        }


# ── Progress by Course ────────────────────────────────────────────────

@router.get("/{user_id}/progress-by-course")
def progress_by_course(user_id: int):
    """
    Bar-chart-ready: progress for each enrolled course.
    Reads from course_enrollments (always has data after enrollment)
    and supplements with course_progress where available.
    """
    try:
        # Get enrollments (guaranteed to exist after enrollment)
        enroll_resp = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        enrollments = enroll_resp.data or []

        # Get any available course_progress rows
        prog_resp = (
            supabase.table("course_progress")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        progress_rows = prog_resp.data or []

        chart_data = []
        for e in enrollments:
            title = e.get("course_title", e.get("course_id", "Unknown"))
            # Fuzzy-match against course_progress rows (same matching used
            # by routes.progress) instead of an exact/case-sensitive key
            # lookup, which could silently miss a real progress row over a
            # minor title wording/casing difference and show 0% instead.
            prog_row = next(
                (p for p in progress_rows if _course_title_matches(title, p.get("course_title", ""))),
                {},
            )
            progress  = prog_row.get("progress_percentage",
                        e.get("progress_percentage", 0))
            completed = prog_row.get("completed",
                        e.get("completed", False))

            chart_data.append({
                "course_id": title,
                "progress":  progress,
                "completed": completed,
            })

        return {"chart_data": chart_data}

    except Exception as e:
        print(f"Progress by course error: {e}")
        return {"chart_data": []}


# ── Quiz Score Trend ──────────────────────────────────────────────────

@router.get("/{user_id}/quiz-score-trend")
def quiz_score_trend(user_id: int):
    """Line-chart-ready: quiz scores over time."""
    try:
        resp = (
            supabase.table("quiz_results")
            .select("score, passed, course_title, taken_at")
            .eq("user_id", user_id)
            .order("taken_at")
            .execute()
        )
        rows = resp.data or []
        return {
            "chart_data": [
                {
                    "date":         r.get("taken_at"),
                    "score":        r.get("score", 0),
                    "passed":       r.get("passed", False),
                    "course_title": r.get("course_title", ""),
                }
                for r in rows
            ]
        }
    except Exception as e:
        print(f"Quiz score trend error: {e}")
        return {"chart_data": []}


# ── Activity Summary ──────────────────────────────────────────────────

@router.get("/{user_id}/activity-summary")
def activity_summary(user_id: int):
    """Horizontal bar chart: breakdown of all learning activity types."""
    try:
        searches_resp = (
            supabase.table("search_history")
            .select("count", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        quizzes_resp = (
            supabase.table("quiz_results")
            .select("count", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        feedback_resp = (
            supabase.table("feedback")
            .select("count", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        videos_resp = (
            supabase.table("video_progress")
            .select("count", count="exact")
            .eq("user_id", user_id)
            .eq("completed", True)
            .execute()
        )

        return {
            "chart_data": [
                {"label": "Searches",       "value": _count(searches_resp)},
                {"label": "Quizzes Taken",  "value": _count(quizzes_resp)},
                {"label": "Videos Watched", "value": _count(videos_resp)},
                {"label": "Feedback Given", "value": _count(feedback_resp)},
            ]
        }
    except Exception as e:
        print(f"Activity summary error: {e}")
        return {
            "chart_data": [
                {"label": "Searches",       "value": 0},
                {"label": "Quizzes Taken",  "value": 0},
                {"label": "Videos Watched", "value": 0},
                {"label": "Feedback Given", "value": 0},
            ]
        }