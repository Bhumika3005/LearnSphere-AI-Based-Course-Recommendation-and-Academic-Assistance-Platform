"""
routes/progress.py
─────────────────────────────────────────────────────────────────────────
Router for tracking and calculating Course and Video Progress.

KEY FIX: Course titles from "Learning Path" (e.g. "python") and from
"Courses tab enrollment" (e.g. "Python for Beginners with Hands-on
Projects") rarely match exactly. This file now uses fuzzy/partial
matching (ilike with wildcards) so that watching a video tracked under
the topic "python" correctly updates progress for any enrolled course
whose title contains "python" (case-insensitive).

It also auto-creates a course_progress / course_enrollments row the
first time video progress comes in for a topic, so Avg Progress and
Progress by Course are never stuck at 0% just because the user never
clicked "Enroll" first.

PROGRESS FORMULA (v2):
  progress = (completed_videos / total_videos) * 50
           + (passed_assessments / total_assessments) * 50
  Both halves are weighted equally. A course reaches 100% only when
  ALL videos are watched AND the assessment is passed.
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response, Request
from supabase_client import supabase
from models import ProgressUpdate, VideoProgressUpdate, CertificateRequest
from routes.videos import _find_videos
from models.static_data import LEARNING_PATHS
from utils.certificate_generator import build_certificate_payload
from utils.certificate_pdf import build_certificate_pdf
from utils.certificate_qr import generate_certificate_qr_png, build_verify_url
from utils.progress_calculator import calculate_course_progress, VIDEO_WEIGHT, ASSESSMENT_WEIGHT
import config

router = APIRouter(prefix="/progress", tags=["Progress"])


# ── Helpers ───────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    return (text or "").strip().lower()


def _normalize_url(url: str) -> str:
    return (url or "").strip().lower()


VIDEO_LIKE_TYPES = {
    "video", "lecture", "tutorial", "webinar", "session",
    "presentation", "demo", "training", "lesson", "class",
    "watch",
}
VIDEO_KEYWORDS = [
    "video", "watch", "tutorial", "youtube", "lecture", "webinar",
    "presentation", "demo", "training", "lesson", "class",
]
NON_VIDEO_TYPES = {
    "reading", "practice", "project", "quiz", "case_study",
    "assignment", "exam", "reference", "discussion", "article",
    "notes", "survey", "assessment",
}

ASSESSMENT_LIKE_TYPES = {
    "quiz", "assessment", "exam", "test",
}
ASSESSMENT_KEYWORDS = [
    "quiz", "assessment", "exam", "test", "certification",
]


def _course_title_matches(target: str, stored_title: str) -> bool:
    target_norm = _normalize(target)
    stored_norm = _normalize(stored_title)
    if target_norm == stored_norm:
        return True
    if target_norm in stored_norm or stored_norm in target_norm:
        return True
    if set(target_norm.split()) & set(stored_norm.split()):
        return True
    return False


def _find_matching_course_progress(user_id: int, course_title: str):
    """
    Find an existing course_progress row whose course_title is the same
    topic — case-insensitive, partial match in either direction.
    e.g. "python" matches "Python for Beginners with Hands-on Projects".
    """
    resp = (
        supabase.table("course_progress")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    rows = resp.data or []
    target = _normalize(course_title)

    # 1. Exact match first
    for r in rows:
        if _normalize(r.get("course_title")) == target:
            return r

    # 2. Partial match — target is contained in stored title, or vice versa
    for r in rows:
        stored = _normalize(r.get("course_title"))
        if target in stored or stored in target:
            return r

    # 3. Word-overlap match — any shared significant word
    target_words = set(target.split())
    for r in rows:
        stored_words = set(_normalize(r.get("course_title")).split())
        if target_words & stored_words:
            return r

    return None


def _find_matching_enrollment(user_id: int, course_title: str):
    """Same fuzzy matching, but against course_enrollments table."""
    try:
        resp = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
    except Exception:
        return None

    rows = resp.data or []
    target = _normalize(course_title)

    for r in rows:
        if _normalize(r.get("course_title")) == target:
            return r
    for r in rows:
        stored = _normalize(r.get("course_title"))
        if target in stored or stored in target:
            return r
    for r in rows:
        stored_words = set(_normalize(r.get("course_title")).split())
        if set(target.split()) & stored_words:
            return r
    return None


def _get_progress_row(user_id: int, course_title: str):
    """Public helper — fuzzy-matches against course_progress."""
    return _find_matching_course_progress(user_id, course_title)


def _is_video_step(step: dict) -> bool:
    """Return True only if the learning path step is genuinely a video."""
    if not isinstance(step, dict):
        return False
    step_type = _normalize(step.get("type", ""))
    title = _normalize(step.get("title", ""))
    desc = _normalize(step.get("desc", ""))

    # Explicit video type
    if step_type in VIDEO_LIKE_TYPES:
        return True

    # Explicitly NOT a video
    if step_type in NON_VIDEO_TYPES or step_type in ASSESSMENT_LIKE_TYPES:
        return False

    # Check keywords in title or description
    if any(kw in title for kw in VIDEO_KEYWORDS):
        return True
    if any(kw in desc for kw in VIDEO_KEYWORDS):
        return True

    return False


def _is_assessment_step(step: dict) -> bool:
    """Return True only if the learning path step is an assessment/quiz."""
    if not isinstance(step, dict):
        return False
    step_type = _normalize(step.get("type", ""))
    title = _normalize(step.get("title", ""))
    desc = _normalize(step.get("desc", ""))

    if step_type in ASSESSMENT_LIKE_TYPES:
        return True

    if any(kw in title for kw in ASSESSMENT_KEYWORDS):
        return True
    if any(kw in desc for kw in ASSESSMENT_KEYWORDS):
        return True

    return False


def _parse_path_data(raw) -> list:
    """Safely parse learning path data into a list of step dicts."""
    path_data = raw or []
    if isinstance(path_data, str):
        try:
            path_data = json.loads(path_data)
        except Exception:
            path_data = []

    if isinstance(path_data, dict):
        if isinstance(path_data.get("path"), list):
            path_data = path_data["path"]
        elif isinstance(path_data.get("steps"), list):
            path_data = path_data["steps"]
        else:
            path_data = [path_data]

    if not isinstance(path_data, list):
        return []

    return [s for s in path_data if isinstance(s, dict)]


def _get_learning_path_counts(user_id: int, course_title: str) -> dict:
    """Count video steps AND assessment steps in the learning path.

    Returns {"videos": int, "assessments": int, "total_steps": int}.
    """
    try:
        resp = (
            supabase.table("learning_paths")
            .select("topic,path_data")
            .eq("user_id", user_id)
            .execute()
        )
    except Exception:
        resp = None

    rows = (resp.data or []) if resp else []
    best = {"videos": 0, "assessments": 0, "total_steps": 0}

    for row in rows:
        if not _course_title_matches(course_title, row.get("topic", "")):
            continue

        steps = _parse_path_data(row.get("path_data"))
        if not steps:
            continue

        video_count = sum(1 for s in steps if _is_video_step(s))
        assessment_count = sum(1 for s in steps if _is_assessment_step(s))
        total = len(steps)

        # If no types are explicitly set, treat all steps as video steps
        has_explicit_type = any(_normalize(s.get("type", "")) for s in steps)
        if not has_explicit_type:
            video_count = total
            assessment_count = 0

        if total > best["total_steps"]:
            best = {
                "videos": video_count,
                "assessments": assessment_count,
                "total_steps": total,
            }

    # Static fallback/augmentation:
    # - When the stored learning path doesn't include explicit assessment steps (common for AI paths),
    #   we still want sensible totals (e.g., Python has multiple assessments in the predefined path).
    # - When the user has no stored learning path at all, we also fall back.
    target = _normalize(course_title)
    static_best_steps = []
    for topic, steps in (LEARNING_PATHS or {}).items():
        topic_norm = _normalize(topic)
        if not topic_norm:
            continue
        if topic_norm in target or target in topic_norm:
            if isinstance(steps, list) and len(steps) > len(static_best_steps):
                static_best_steps = steps

    if static_best_steps:
        static_video_count = sum(1 for s in static_best_steps if _is_video_step(s))
        static_assessment_count = sum(1 for s in static_best_steps if _is_assessment_step(s))
        static_total = len(static_best_steps)

        best = {
            "videos": max(best["videos"], static_video_count),
            "assessments": max(best["assessments"], static_assessment_count),
            "total_steps": max(best["total_steps"], static_total),
        }

    return best


def _get_user_video_ids_for_course(user_id: int, course_title: str) -> set:
    """All distinct video_ids this user has any video_progress row for,
    under a fuzzy-matched course_title. Used so videos the user actually
    watched (even ones added later, e.g. via study_materials or an
    alternate source) always count — the database record of what the
    user did is the source of truth, not a fixed catalog URL list."""
    try:
        resp = (
            supabase.table("video_progress")
            .select("video_id,course_title")
            .eq("user_id", user_id)
            .execute()
        )
    except Exception:
        return set()

    ids = set()
    for row in resp.data or []:
        if _course_title_matches(course_title, row.get("course_title", "")):
            vid = _normalize_url(row.get("video_id"))
            if vid:
                ids.add(vid)
    return ids


def _get_course_video_count(user_id: int, course_title: str) -> int:
    """Return how many distinct videos exist for the course.

    Sources: static video catalog + stored study materials + learning path
    video-type steps + any video the user has actually interacted with for
    this course. Taking the max of all of these means a user who watches
    videos beyond the official catalog (e.g. extra study materials) isn't
    penalized with an artificially low denominator, but a course with no
    activity yet still reports the real catalog size.
    """
    urls = set(
        _normalize_url(v.get("url"))
        for v in _find_videos(course_title)
        if v.get("url")
    )

    try:
        resp = (
            supabase.table("study_materials")
            .select("url,course_title")
            .eq("type", "video")
            .execute()
        )
        rows = resp.data or []
        for row in rows:
            if _course_title_matches(course_title, row.get("course_title", "")):
                if row.get("url"):
                    urls.add(_normalize_url(row.get("url")))
    except Exception:
        pass

    lp_counts = _get_learning_path_counts(user_id, course_title)
    learning_path_videos = lp_counts["videos"]

    user_video_ids = _get_user_video_ids_for_course(user_id, course_title)

    return max(len(urls), learning_path_videos, len(user_video_ids))



def _get_course_assessment_count(user_id: int, course_title: str) -> int:
    """Return how many assessments exist for this course.

    Checks learning path assessment-type steps first; defaults to 1
    (every course has at least one assessment).
    """
    lp_counts = _get_learning_path_counts(user_id, course_title)
    lp_assessments = lp_counts["assessments"]
    return max(1, lp_assessments)


def _find_matching_video_progress(user_id: int, course_title: str, video_id: str):
    """Return a video_progress row matching the same video_id and a fuzzy course_title."""
    try:
        resp = (
            supabase.table("video_progress")
            .select("*")
            .eq("user_id", user_id)
            .eq("video_id", video_id)
            .execute()
        )
    except Exception:
        return None

    rows = resp.data or []
    target = _normalize(course_title)
    if not rows:
        return None

    # Exact title match first
    for row in rows:
        if _normalize(row.get("course_title")) == target:
            return row

    # Partial / word overlap match next
    for row in rows:
        stored = _normalize(row.get("course_title"))
        if target in stored or stored in target:
            return row

    target_words = set(target.split())
    for row in rows:
        stored_words = set(_normalize(row.get("course_title")).split())
        if target_words & stored_words:
            return row

    # Fallback: if the same video_id was already tracked for this user,
    # return that row even when course title text differs significantly.
    return rows[0] if rows else None


def _count_completed_videos(user_id: int, course_title: str) -> int:
    """Count distinct completed video rows for the course.

    Matches purely by (user_id, fuzzy course_title) against video_progress —
    the same trusted-database-count approach already used for assessments —
    rather than requiring the video's URL to appear in a fixed static
    catalog. A user who completes a video that isn't in that catalog (e.g.
    an alternate/extra study material) still gets credit for it.
    """
    try:
        resp = (
            supabase.table("video_progress")
            .select("video_id,course_title")
            .eq("user_id", user_id)
            .eq("completed", True)
            .execute()
        )
    except Exception:
        return 0

    rows = resp.data or []
    completed_ids = set()
    for row in rows:
        if not _course_title_matches(course_title, row.get("course_title", "")):
            continue
        normalized_video_id = _normalize_url(row.get("video_id"))
        if normalized_video_id:
            completed_ids.add(normalized_video_id)
    return len(completed_ids)


def _count_passed_assessments(user_id: int, course_title: str) -> int:
    """Count DISTINCT passed real Assessments (NOT generic practice
    quizzes) for the course — one per step_index, so re-passing the same
    step's assessment multiple times can't inflate a course's progress
    past its real number of steps. Only rows tagged source='assessment'
    count; practice quizzes (source='quiz') are deliberately excluded.
    """
    try:
        quiz_resp = (
            supabase.table("quiz_results")
            .select("id, course_title, source, step_index")
            .eq("user_id", user_id)
            .eq("passed", True)
            .eq("source", "assessment")
            .execute()
        )
    except Exception:
        return 0

    rows = quiz_resp.data or []
    distinct_steps = set()
    legacy_count = 0  # rows with no step_index (pre-existing data)
    for row in rows:
        if not _course_title_matches(course_title, row.get("course_title", "")):
            continue
        step_index = row.get("step_index")
        if step_index is not None:
            distinct_steps.add(step_index)
        else:
            legacy_count += 1

    return len(distinct_steps) + legacy_count


# ── Course Progress ───────────────────────────────────────────────────

@router.post("/update")
def update_course_progress(data: ProgressUpdate):
    """
    Recompute progress % for a course (fuzzy-matched).
    If no course_progress row exists yet for this topic, creates one
    using the topic itself as the stored title (so Avg Progress and
    Progress by Course always reflect activity, even pre-enrollment).

    Formula: (completed_videos / total_videos) * 50
           + (passed_assessments / total_assessments) * 50
    """
    try:
        existing = _find_matching_course_progress(data.user_id, data.course_title)

        # Use the existing row's stored title for all sub-queries so we
        # stay consistent with whatever title is already on record.
        canonical_title = existing["course_title"] if existing else data.course_title

        # Count completed videos using shared fuzzy matching logic.
        completed_video_count = _count_completed_videos(data.user_id, canonical_title)
        total_videos = _get_course_video_count(data.user_id, canonical_title)

        # Count passed assessments
        completed_assessments = _count_passed_assessments(data.user_id, canonical_title)
        total_assessments = _get_course_assessment_count(data.user_id, canonical_title)

        # ── Compute video component (0-50) ───────────────────────────────
        if total_videos <= 0:
            video_component = VIDEO_WEIGHT
        else:
            video_component = round(min(completed_video_count / total_videos, 1.0) * VIDEO_WEIGHT)

        # ── Compute assessment component (0-50) ──────────────────────────
        if total_assessments <= 0:
            assessment_component = ASSESSMENT_WEIGHT
        else:
            assessment_component = round(min(completed_assessments / total_assessments, 1.0) * ASSESSMENT_WEIGHT)

        # ── Guard the VIDEO component only against fuzzy-matching misses ──
        # Video-completion detection relies on fuzzy title/URL matching
        # against the static catalog + study_materials, which can
        # occasionally fail to find a video that was genuinely completed
        # (undercounting). The assessment component has no such weakness —
        # it's a direct, reliable DB count — so it should always reflect
        # the true current value (this also lets it correctly go DOWN if
        # an earlier bug had inflated it, e.g. total_assessments wrongly
        # defaulting to 1 before the learning_paths.path_data column
        # existed). Only the video component is floored at its previous
        # best value; the assessment component is never artificially held up.
        existing_percentage = existing.get("progress_percentage", 0) if existing else 0
        existing_video_component = existing.get("video_progress_component") if existing else None
        if existing_video_component is None:
            # Back-compat: no stored component yet (older row, or column
            # not migrated). Estimate a safe floor from the old combined
            # percentage capped at the video weight, so we don't lose
            # previously-recorded progress on the first recompute after
            # upgrading, but also don't inherit an inflated assessment share.
            existing_video_component = min(existing_percentage, VIDEO_WEIGHT)

        video_component = max(video_component, existing_video_component)
        progress_percentage = min(100, video_component + assessment_component)

        completed = progress_percentage >= 100

        payload = {
            "user_id": data.user_id,
            "course_title": canonical_title,
            "progress_percentage": progress_percentage,
            "completed": completed,
            "video_progress_component": video_component,
        }

        if existing:
            supabase.table("course_progress").update(payload).eq("id", existing["id"]).execute()
        else:
            supabase.table("course_progress").insert(payload).execute()

        # Keep course_enrollments in sync too, if a matching enrollment exists
        enrollment = _find_matching_enrollment(data.user_id, canonical_title)
        if enrollment:
            try:
                supabase.table("course_enrollments").update({
                    "progress_percentage": progress_percentage,
                    "completed": completed,
                }).eq("id", enrollment["id"]).execute()
            except Exception:
                pass

        return {"message": "Progress updated", **payload}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Certificate Generation ────────────────────────────────────────────

@router.post("/certificate/generate")
def generate_certificate(data: CertificateRequest):
    """Generate a certificate once course_progress shows 100% complete.

    Previously this took user_id/course_title as bare function params with
    no Pydantic model, which FastAPI reads as URL query parameters — but
    the frontend was (correctly, for a POST) sending them as a JSON body,
    so this endpoint could never actually receive the data and always
    failed. Also standardized the response to always use "course_title"
    (the already-issued branch returned the raw DB row using that key,
    while the newly-issued branch returned "course_name" from
    build_certificate_payload — an inconsistency that made the frontend
    show a blank title depending on which branch ran).
    """
    user_id, course_title = data.user_id, data.course_title
    progress = _get_progress_row(user_id, course_title)
    if not progress or not progress.get("completed"):
        raise HTTPException(
            status_code=403,
            detail="Course is not 100% complete yet. "
                   "Watch the video and pass the assessment first.",
        )

    canonical_title = progress["course_title"]

    existing_cert = (
        supabase.table("certificates")
        .select("*")
        .eq("user_id", user_id)
        .eq("course_title", canonical_title)
        .execute()
    )
    if existing_cert.data:
        return {
            "message": "Certificate already issued",
            "certificate": existing_cert.data[0],
        }

    user_resp = supabase.table("users").select("name").eq("id", user_id).execute()
    student_name = user_resp.data[0]["name"] if user_resp.data else "Student"

    payload = build_certificate_payload(student_name, canonical_title)

    try:
        supabase.table("certificates").insert({
            "user_id": user_id,
            "course_title": canonical_title,
            "certificate_id": payload["certificate_id"],
            "student_name": payload["student_name"],
            "completion_date": payload["completion_date"],
        }).execute()

        return {
            "message": "Certificate generated successfully",
            "certificate": {
                "certificate_id": payload["certificate_id"],
                "student_name": payload["student_name"],
                "course_title": canonical_title,
                "completion_date": payload["completion_date"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save certificate: {str(e)}")


@router.get("/certificate/pdf/{certificate_id}")
def download_certificate_pdf(certificate_id: str, request: Request, download: str = None):
    """Generate and return an actual downloadable PDF for a certificate.

    Previously the frontend's "Download" button just called the browser's
    window.print() — no real file was ever generated. This renders a real
    one-page PDF from the certificate's stored data.
    """
    resp = (
        supabase.table("certificates")
        .select("*")
        .eq("certificate_id", certificate_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert = resp.data[0]
    
    # Dynamically extract frontend origin or referrer for the QR code
    referer = request.headers.get("referer")
    origin = request.headers.get("origin")
    
    # e.g. "http://192.168.1.102:3002/dashboard" -> "http://192.168.1.102:3002"
    frontend_url = origin or (referer.split("/verify")[0].split("/dashboard")[0] if referer else None)
    
    # If accessed locally via localhost/127.0.0.1, fallback to the LAN IP set in FRONTEND_URL
    if not frontend_url or "localhost" in frontend_url or "127.0.0.1" in frontend_url:
        frontend_url = config.FRONTEND_URL

    pdf_bytes = build_certificate_pdf(
        student_name=cert.get("student_name", "Student"),
        course_title=cert.get("course_title", "Course"),
        completion_date=cert.get("completion_date", ""),
        certificate_id=cert.get("certificate_id", certificate_id),
        frontend_url=frontend_url
    )

    filename = f"certificate_{certificate_id}.pdf"
    is_download = download is not None and download.lower() in ("true", "1", "yes")
    disposition = "attachment" if is_download else "inline"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="{filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        },
    )


@router.get("/certificate/{user_id}")
def list_certificates(user_id: int):
    """Get all certificates earned by a user."""
    try:
        resp = (
            supabase.table("certificates")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"certificates": resp.data or []}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/certificate/{certificate_id}")
def delete_certificate(certificate_id: str, user_id: int):
    """Delete a certificate. Scoped to user_id (passed as a query param) so
    a user can only delete their own certificate, not anyone else's by
    guessing/incrementing an id. Deleting does NOT un-complete the course —
    the "Ready to Claim" card will simply reappear so it can be regenerated
    if the user wants a new certificate for the same course.
    """
    try:
        existing = (
            supabase.table("certificates")
            .select("id")
            .eq("certificate_id", certificate_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Certificate not found")

        supabase.table("certificates").delete().eq("certificate_id", certificate_id).eq("user_id", user_id).execute()
        return {"message": "Certificate deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/certificate/qr/{certificate_id}")
def get_certificate_qr(certificate_id: str):
    """Return a PNG QR code that links to this certificate's public verify page.

    Used by the frontend to show a scannable code next to a certificate card,
    in addition to the QR that's baked into the downloadable PDF.
    """
    resp = (
        supabase.table("certificates")
        .select("certificate_id")
        .eq("certificate_id", certificate_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Certificate not found")

    png_bytes = generate_certificate_qr_png(certificate_id)
    return Response(content=png_bytes, media_type="image/png")


@router.get("/certificate/verify/{certificate_id}")
def verify_certificate(certificate_id: str):
    """Public, unauthenticated lookup used by the QR-code verification page.

    Deliberately returns only what's needed to confirm authenticity (name,
    course, date) — no user_id, email, or other account details.
    """
    resp = (
        supabase.table("certificates")
        .select("certificate_id,student_name,course_title,completion_date")
        .eq("certificate_id", certificate_id)
        .execute()
    )
    if not resp.data:
        return {"valid": False}

    cert = resp.data[0]
    return {
        "valid": True,
        "certificate_id": cert.get("certificate_id"),
        "student_name": cert.get("student_name"),
        "course_title": cert.get("course_title"),
        "completion_date": cert.get("completion_date"),
    }


@router.get("/{user_id}/{course_title}")
def get_course_progress(user_id: int, course_title: str):
    """Retrieve progress row for a course title (fuzzy-matched)."""
    # Recompute progress on fetch so stale 100% values are corrected.
    try:
        update_course_progress(ProgressUpdate(user_id=user_id, course_title=course_title))
    except Exception:
        pass

    row = _get_progress_row(user_id, course_title)
    if not row:
        return {
            "user_id": user_id,
            "course_title": course_title,
            "progress_percentage": 0,
            "completed": False,
        }
    return row


@router.get("/{user_id}")
def get_all_progress(user_id: int, recompute: bool = False):
    """All course progress rows for a user — powers Progress page and Dashboard Overview.

    Performance note:
    Historically this endpoint recomputed progress for *every* known course title
    on every request, which can be slow (many Supabase queries). Recompute is now
    optional via `?recompute=true`.

    Correctness note:
    Learning-path topics (e.g. "python") and enrolled course titles (e.g.
    "Python for Beginners ...") often differ. We merge enrollments and progress
    rows using fuzzy matching to avoid duplicate courses and wrong averages.
    """
    try:
        progress_resp = (
            supabase.table("course_progress")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        enrollment_resp = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        progress_rows = progress_resp.data or []
        enrollment_rows = enrollment_resp.data or []

        # Lightweight correctness guard: if stored progress says "100%" (or completed),
        # re-check just those courses so stale/incorrect 100% values are fixed without
        # recomputing every course on every request.
        if not recompute:
            candidates = set()
            for row in enrollment_rows + progress_rows:
                title = row.get("course_title")
                if not title:
                    continue
                pct = row.get("progress_percentage") or 0
                if row.get("completed") or pct >= 100:
                    candidates.add(title)
            for title in candidates:
                try:
                    update_course_progress(ProgressUpdate(user_id=user_id, course_title=title))
                except Exception:
                    continue
            if candidates:
                progress_rows = (
                    supabase.table("course_progress")
                    .select("*")
                    .eq("user_id", user_id)
                    .execute()
                ).data or []

        # Optional heavy recomputation (kept for debugging / admin refresh)
        if recompute:
            known_titles = []
            seen_titles = set()
            for row in enrollment_rows + progress_rows:
                title = row.get("course_title")
                normalized_title = _normalize(title)
                if title and normalized_title not in seen_titles:
                    seen_titles.add(normalized_title)
                    known_titles.append(title)

            for title in known_titles:
                try:
                    update_course_progress(ProgressUpdate(
                        user_id=user_id,
                        course_title=title
                    ))
                except Exception:
                    continue

            progress_rows = (
                supabase.table("course_progress")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            ).data or []
            enrollment_rows = (
                supabase.table("course_enrollments")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            ).data or []

        # Merge enrollments with progress rows using fuzzy title matching.
        merged_courses = []
        used_progress_ids = set()

        for enroll in enrollment_rows:
            title = enroll.get("course_title") or enroll.get("course_id")
            if not title:
                continue

            matched_progress = None
            for pr in progress_rows:
                pid = pr.get("id")
                if pid is not None and pid in used_progress_ids:
                    continue
                if _course_title_matches(title, pr.get("course_title", "")):
                    matched_progress = pr
                    if pid is not None:
                        used_progress_ids.add(pid)
                    break

            merged_courses.append({
                **enroll,
                "course_title": title,
                "progress_percentage": (
                    matched_progress.get("progress_percentage", enroll.get("progress_percentage", 0))
                    if matched_progress else enroll.get("progress_percentage", 0)
                ),
                "completed": (
                    matched_progress.get("completed", enroll.get("completed", False))
                    if matched_progress else enroll.get("completed", False)
                ),
                # Prefer enrollment id for stable keys in the UI; fallback to progress id.
                "id": enroll.get("id") or (matched_progress.get("id") if matched_progress else None),
            })

        # Include any progress rows that do not correspond to an enrollment.
        # This supports "progress before enrollment" without duplicating enrolled courses.
        for pr in progress_rows:
            pid = pr.get("id")
            if pid is not None and pid in used_progress_ids:
                continue

            pr_title = pr.get("course_title")
            if not pr_title:
                continue

            # Extra safety: avoid adding a progress row that fuzzy-matches an existing enrollment.
            if any(_course_title_matches(pr_title, c.get("course_title", "")) for c in merged_courses):
                continue

            merged_courses.append(pr)

        total_courses = len(merged_courses)
        completed_courses = sum(1 for r in merged_courses if r.get("completed"))
        avg_progress = (
            round(sum((r.get("progress_percentage") or 0) for r in merged_courses) / total_courses)
            if total_courses else 0
        )

        quizzes_resp = (
            supabase.table("quiz_results")
            .select("course_title")
            .eq("user_id", user_id)
            .eq("passed", True)
            .execute()
        )

        # Dashboard card label is "Assessments Passed" — show total passed attempts.
        # (Not just unique courses.)
        assessments_completed = len(quizzes_resp.data or [])

        score_resp = (
            supabase.table("quiz_results")
            .select("score")
            .eq("user_id", user_id)
            .execute()
        )
        scores = [q.get("score", 0) for q in (score_resp.data or [])]
        avg_score = round(sum(scores) / len(scores)) if scores else 0

        return {
            "courses": merged_courses,
            "total_courses_enrolled": total_courses,
            "courses_completed": completed_courses,
            "assessments_completed": assessments_completed,
            "average_quiz_score": avg_score,
            "average_progress": avg_progress,
        }
    except Exception as e:
        print(f"Error fetching user progress: {e}")
        return {
            "courses": [],
            "total_courses_enrolled": 0,
            "courses_completed": 0,
            "assessments_completed": 0,
            "average_quiz_score": 0,
            "average_progress": 0,
        }


# ── Video Progress ────────────────────────────────────────────────────

@router.post("/video/update")
def update_video_progress(data: VideoProgressUpdate):
    """
    Mark a video as completed/in-progress and recalculate course
    progress. Stores the RAW course_title exactly as sent (e.g. the
    Learning Path topic) for insert, but updates existing matches when
    video_id and fuzzy course_title match.

    Also sets updated_at to current UTC time on every update so that
    weekly/monthly activity queries can find the row.
    """
    try:
        existing_row = _find_matching_video_progress(data.user_id, data.course_title, data.video_id)

        now_utc = datetime.now(timezone.utc).isoformat()

        payload = {
            "user_id": data.user_id,
            "course_title": data.course_title,
            "video_id": data.video_id,
            "completed": data.completed,
            "watched_percentage": data.watched_percentage,
            "updated_at": now_utc,
        }

        if existing_row:
            was_completed = existing_row.get("completed", False)
            new_completed = data.completed or was_completed

            prev_percentage = float(existing_row.get("watched_percentage") or 0)
            new_percentage = max(data.watched_percentage, prev_percentage)

            payload["completed"] = new_completed
            payload["watched_percentage"] = new_percentage

            supabase.table("video_progress").update(payload).eq("id", existing_row["id"]).execute()
        else:
            supabase.table("video_progress").insert(payload).execute()

        # Recalculate overall course progress — fuzzy matching covers topic vs enrolled title.
        update_course_progress(ProgressUpdate(
            user_id=data.user_id,
            course_title=data.course_title
        ))

        return {"message": "Video progress updated", **payload}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/video/{user_id}/{course_title}")
def get_video_progress(user_id: int, course_title: str, video_id: str):
    """Get completion state of a specific video.

    Uses fuzzy course_title matching so the same saved progress can be
    retrieved whether the caller sends a Learning Path topic or a full
    enrolled course title.
    Note: video_id is passed as a query parameter to avoid ASGI path-stripping
    issues with URL query parameters (e.g. YouTube ?v=...)."""
    matching_row = _find_matching_video_progress(user_id, course_title, video_id)
    if matching_row:
        return matching_row

    return {
        "user_id": user_id,
        "course_title": course_title,
        "video_id": video_id,
        "completed": False,
        "watched_percentage": 0,
    }


# ── Assessment Unlock ─────────────────────────────────────────────────

@router.get("/unlock-status/{user_id}/{course_title}")
def assessment_unlock_status(user_id: int, course_title: str):
    """
    Checks if assessment should be unlocked — fuzzy-matched against
    video_progress so it works whether the caller passes the Learning
    Path topic or the full enrolled course title.
    """
    video_resp = (
        supabase.table("video_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("completed", True)
        .execute()
    )
    rows = video_resp.data or []
    target = _normalize(course_title)
    video_completed = any(
        target in _normalize(v.get("course_title")) or
        _normalize(v.get("course_title")) in target or
        (set(target.split()) & set(_normalize(v.get("course_title")).split()))
        for v in rows
    )

    return {
        "video_watched": video_completed,
        "assessment_unlocked": video_completed,
    }