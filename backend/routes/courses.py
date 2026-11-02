"""
routes/courses.py
─────────────────────────────────────────────────────────────────────────
Course search/recommendation, search history, learning paths,
feedback, and user stats. Same behavior as the original app.py.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from models import CourseRequest, LearningPathCreate, FeedbackCreate
from models.static_data import LEARNING_PATHS
from services.recommendation_service import recommend, get_popular_courses

router = APIRouter(tags=["Courses"])


# ── Recommendations ───────────────────────────────────────────────────
@router.post("/recommend")
def get_recommendations(data: CourseRequest):
    recs = recommend(data.course_name)
    if data.user_id:
        try:
            supabase.table("search_history").insert({
                "user_id": data.user_id,
                "query": data.course_name,
                "searched_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception:
            pass
    return {"input": data.course_name, "recommendations": recs}


@router.get("/courses/popular")
def popular_courses():
    return {"courses": get_popular_courses(12)}


# ── Search History ─────────────────────────────────────────────────────
@router.get("/history/{user_id}")
def get_history(user_id: int):
    try:
        response = (
            supabase.table("search_history")
            .select("query, searched_at")
            .eq("user_id", user_id)
            .order("searched_at", desc=True)
            .limit(10)
            .execute()
        )
        return {"history": response.data or []}
    except Exception:
        return {"history": []}


from services.groq_service import generate_learning_path as ai_generate_path


def _expand_to_video_assessment_pairs(raw_path, skill_level: str):
    """Groq's prompt asks for exactly 5 video steps, each with its
    assessment questions embedded inline (step["questions"]). The UI,
    however, expects 10 alternating steps — one "video" step and one
    matching "assessment" step per topic — same shape as the static
    fallback in LEARNING_PATHS. This expands the raw 5-item AI output
    into that 10-item shape so the AI and fallback paths are always
    structurally identical, regardless of which one produced them.

    If raw_path is already in the expanded 10-item shape (e.g. an older
    cached AI response, or a future prompt change), it's returned as-is.
    """
    if not isinstance(raw_path, list):
        return raw_path
    if _is_valid_path_shape(raw_path):
        return raw_path

    expanded = []
    step_num = 1
    for item in raw_path:
        if not isinstance(item, dict):
            continue
        title = item.get("title", "Lesson")
        expanded.append({
            "step": step_num,
            "title": title,
            "desc": item.get("desc", ""),
            "duration": item.get("duration", "1 week"),
            "type": "video",
        })
        step_num += 1
        expanded.append({
            "step": step_num,
            "title": f"{title} Assessment",
            "desc": f"Test your knowledge of {title}",
            "duration": "30 min",
            "type": "assessment",
            "questions": item.get("questions", []),
        })
        step_num += 1
    return expanded


def _is_valid_path_shape(path_list) -> bool:
    """A valid learning path must be exactly 5 video steps + 5 assessment
    steps (10 total), alternating video/assessment. Anything else (partial
    AI output, malformed cache, old 5-item-only paths) is treated as
    invalid so it gets regenerated instead of silently served as-is."""
    if not isinstance(path_list, list) or len(path_list) != 10:
        return False
    for idx, step in enumerate(path_list):
        if not isinstance(step, dict) or "type" not in step:
            return False
        expected_type = "video" if idx % 2 == 0 else "assessment"
        if step["type"] != expected_type:
            return False
    return True


# ── Learning Path (predefined & dynamic AI) ───────────────────────────
@router.post("/learning-path")
async def get_learning_path(data: LearningPathCreate):
    topic_lower = data.topic.lower().strip()

    # 1. Check if a personalized learning path already exists in Supabase
    if data.user_id:
        try:
            existing = (
                supabase.table("learning_paths")
                .select("path_data")
                .eq("user_id", data.user_id)
                .eq("topic", data.topic)
                .execute()
            )
            if existing.data and existing.data[0].get("path_data"):
                path_list = existing.data[0]["path_data"]
                # Auto-heal: invalidate any cached path that isn't exactly
                # 5 video + 5 assessment steps in alternating order.
                if _is_valid_path_shape(path_list):
                    return {"topic": data.topic, "path": path_list}
                else:
                    # Delete stale/invalid path to force regeneration
                    supabase.table("learning_paths").delete().eq("user_id", data.user_id).eq("topic", data.topic).execute()
        except Exception:
            pass

    # 2. Get user's skill level from Supabase
    skill_level = "beginner"
    if data.user_id:
        try:
            user_resp = supabase.table("users").select("skill_level").eq("id", data.user_id).execute()
            if user_resp.data and user_resp.data[0].get("skill_level"):
                skill_level = user_resp.data[0]["skill_level"].lower()
        except Exception:
            pass

    # 3. Generate learning path dynamically using Groq LLM (Personalized by Topic & Skill Level)
    try:
        raw_path = await ai_generate_path(data.topic, skill_level)
        path = _expand_to_video_assessment_pairs(raw_path, skill_level)
        if not _is_valid_path_shape(path):
            raise ValueError("AI-generated path could not be normalized to 5 video + 5 assessment steps")

        # Save to database
        if data.user_id:
            try:
                supabase.table("learning_paths").upsert({
                    "user_id": data.user_id,
                    "topic": data.topic,
                    "path_data": path
                }).execute()
            except Exception:
                pass
                
        return {"topic": data.topic, "path": path}
    except Exception as e:
        print(f"Groq learning path generation failed: {e}")

    # 4. Fallback: Predefined static learning path
    path = None
    for key in LEARNING_PATHS:
        if key in topic_lower or topic_lower in key:
            path = LEARNING_PATHS[key]
            break
    if not path:
        path = LEARNING_PATHS["python"]

    # Adjust static path steps to reflect skill level
    adjusted_path = []
    for step in path:
        adjusted_path.append({
            "step": step["step"],
            "title": f"[{skill_level.capitalize()}] {step['title']}",
            "desc": step["desc"],
            "duration": step["duration"],
            "type": step.get("type", ""),
        })

    # Cache the fallback too, so repeated loads/refreshes are consistent
    # instead of silently re-deriving (and potentially drifting) each time.
    if data.user_id:
        try:
            supabase.table("learning_paths").upsert({
                "user_id": data.user_id,
                "topic": data.topic,
                "path_data": adjusted_path
            }).execute()
        except Exception:
            pass

    return {"topic": data.topic, "path": adjusted_path}


@router.post("/learning-path/refresh")
async def refresh_learning_path(data: LearningPathCreate):
    """Force-regenerate a learning path even if one already exists."""
    topic_lower = data.topic.lower().strip()

    # Determine user skill level (same as get_learning_path)
    skill_level = "beginner"
    if data.user_id:
        try:
            user_resp = supabase.table("users").select("skill_level").eq("id", data.user_id).execute()
            if user_resp.data and user_resp.data[0].get("skill_level"):
                skill_level = user_resp.data[0]["skill_level"].lower()
        except Exception:
            pass

    # Remove existing path row (so the next read isn't stale)
    if data.user_id:
        try:
            supabase.table("learning_paths").delete().eq("user_id", data.user_id).eq("topic", data.topic).execute()
        except Exception:
            pass

    # Try AI regeneration first
    try:
        raw_path = await ai_generate_path(data.topic, skill_level)
        path = _expand_to_video_assessment_pairs(raw_path, skill_level)
        if not _is_valid_path_shape(path):
            raise ValueError("AI-generated path could not be normalized to 5 video + 5 assessment steps")
        if data.user_id:
            try:
                supabase.table("learning_paths").upsert({
                    "user_id": data.user_id,
                    "topic": data.topic,
                    "path_data": path
                }).execute()
            except Exception:
                pass
        return {"topic": data.topic, "path": path}
    except Exception as e:
        print(f"Groq learning path refresh failed: {e}")

    # Fallback: predefined static learning path
    path = None
    for key in LEARNING_PATHS:
        if key in topic_lower or topic_lower in key:
            path = LEARNING_PATHS[key]
            break
    if not path:
        path = LEARNING_PATHS["python"]

    adjusted_path = []
    for step in path:
        adjusted_path.append({
            "step": step.get("step"),
            "title": f"[{skill_level.capitalize()}] {step.get('title', '')}",
            "desc": step.get("desc", ""),
            "duration": step.get("duration", ""),
            "type": step.get("type", ""),
        })

    if data.user_id:
        try:
            supabase.table("learning_paths").upsert({
                "user_id": data.user_id,
                "topic": data.topic,
                "path_data": adjusted_path
            }).execute()
        except Exception:
            pass

    return {"topic": data.topic, "path": adjusted_path}


# ── Feedback ───────────────────────────────────────────────────────────
@router.post("/feedback")
def submit_feedback(data: FeedbackCreate):
    try:
        supabase.table("feedback").insert({
            "user_id": data.user_id,
            "course_title": data.course_title,
            "rating": data.rating,
            "comment": data.comment,
        }).execute()
        return {"message": "Feedback submitted successfully"}
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to submit feedback")


@router.get("/feedback")
def get_all_feedback():
    try:
        feedback_resp = (
            supabase.table("feedback")
            .select("*")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        feedback = feedback_resp.data or []
        result = []
        for f in feedback:
            user_resp = supabase.table("users").select("name").eq("id", f.get("user_id")).execute()
            f["name"] = user_resp.data[0].get("name") if user_resp.data else "Anonymous"
            result.append(f)
        return {"feedback": result}
    except Exception:
        return {"feedback": []}


# ── User Stats ─────────────────────────────────────────────────────────
@router.get("/stats/{user_id}")
def get_user_stats(user_id: int):
    try:
        searches_resp = (
            supabase.table("search_history")
            .select("count", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        searches = searches_resp.count if hasattr(searches_resp, "count") else len(searches_resp.data or [])

        quiz_resp = supabase.table("quiz_results").select("score").eq("user_id", user_id).execute()
        quiz_data = quiz_resp.data or []

        if quiz_data:
            avg_score = sum(q.get("score", 0) for q in quiz_data) / len(quiz_data)
            quizzes_taken = len(quiz_data)
        else:
            avg_score = 0
            quizzes_taken = 0

        return {
            "searches": searches,
            "avg_quiz_score": round(float(avg_score), 1),
            "quizzes_taken": quizzes_taken,
        }
    except Exception:
        return {"searches": 0, "avg_quiz_score": 0, "quizzes_taken": 0}