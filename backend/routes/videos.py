"""
routes/videos.py
─────────────────────────────────────────────────────────────────────────
Serves static course videos from COURSE_VIDEOS dictionary.
No YouTube API key needed — videos are hardcoded in static_data.py.

Two endpoints:
  GET  /videos/{course}           — used by getVideos() in api.js
  POST /courses/search-video      — used by searchCourseVideo() in api.js
"""

from fastapi import APIRouter
from pydantic import BaseModel
from models.static_data import COURSE_VIDEOS

router = APIRouter()
TOPIC_ALIASES = {
    "react": "web development",
    "javascript": "web development",
    "js": "web development",
    "html": "web development",
    "css": "web development",
    "frontend": "web development",
    "node": "web development",
    "node.js": "web development",
    "express": "web development",
    "data science": "machine learning",
    "data analytics": "machine learning",
    "ai": "artificial intelligence",
}


def _find_videos(course_name: str, skill_level: str = "beginner"):
    """
    Fuzzy match a course name against COURSE_VIDEOS keys.
    Returns the matched video list for the specified skill level.
    Returns an empty list if no topic match exists.
    """
    name_lower = course_name.lower().strip()
    skill_level = skill_level.lower() if skill_level else "beginner"

    for alias, topic_key in TOPIC_ALIASES.items():
        if alias in name_lower and topic_key in COURSE_VIDEOS:
            course_videos = COURSE_VIDEOS[topic_key]
            if isinstance(course_videos, dict):
                return course_videos.get(skill_level, course_videos.get("beginner", []))
            return course_videos

    # Exact key match first
    if name_lower in COURSE_VIDEOS:
        course_videos = COURSE_VIDEOS[name_lower]
        if isinstance(course_videos, dict):
            return course_videos.get(skill_level, course_videos.get("beginner", []))
        return course_videos

    # Partial match — check if any key appears in the course name
    for key in COURSE_VIDEOS:
        if key in name_lower or name_lower in key:
            course_videos = COURSE_VIDEOS[key]
            if isinstance(course_videos, dict):
                return course_videos.get(skill_level, course_videos.get("beginner", []))
            return course_videos

    # Word-level match — check individual words
    words = name_lower.split()
    for key in COURSE_VIDEOS:
        key_words = key.split()
        if any(w in key_words for w in words):
            course_videos = COURSE_VIDEOS[key]
            if isinstance(course_videos, dict):
                return course_videos.get(skill_level, course_videos.get("beginner", []))
            return course_videos

    return []


def _extract_video_id(url: str) -> str:
    """Extract YouTube video ID from a full URL."""
    if not url:
        return ""
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    if "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    return ""


@router.get("/videos/{course}")
def get_videos(course: str, skill_level: str = "beginner"):
    """GET /videos/{course} — returns list of videos for a course filtered by skill level."""
    videos = _find_videos(course, skill_level)
    # Add videoId to each video for easy iframe embedding
    result = []
    for v in videos:
        video_id = _extract_video_id(v["url"])
        result.append({
            "title": v["title"],
            "url": v["url"],
            "videoId": video_id or None,
            "skill_level": skill_level,
        })
    return {"course": course, "skill_level": skill_level, "videos": result}


class VideoSearchRequest(BaseModel):
    course_name: str
    skill_level: str = "beginner"


@router.post("/courses/search-video")
def search_course_video(data: VideoSearchRequest):
    """
    POST /courses/search-video — used by Dashboard.jsx Watch button.
    Returns the FIRST video for the matched course filtered by skill level.
    """
    videos = _find_videos(data.course_name, data.skill_level)

    if not videos:
        return {"videoId": None, "title": None, "url": None, "skill_level": data.skill_level}

    first = videos[0]
    video_id = _extract_video_id(first["url"])

    return {
        "videoId": video_id or None,
        "title": first["title"],
        "url": first["url"],
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg" if video_id else None,
        "skill_level": data.skill_level,
    }
