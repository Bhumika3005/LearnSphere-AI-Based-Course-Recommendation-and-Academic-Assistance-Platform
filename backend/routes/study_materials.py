"""
routes/study_materials.py
─────────────────────────────────────────────────────────────────────────
Study materials router. Uses COURSE_VIDEOS from static_data.py
for videos — NO YouTube API key required.

Auto-seeds PDF, PPT, Reference links and Video when a course is
searched for the first time. All data stored in Supabase.
"""

from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from models.schemas import StudyMaterialCreate
from models.static_data import COURSE_VIDEOS

router = APIRouter(prefix="/study-materials", tags=["Study Materials"])

VALID_TYPES = {"video", "pdf", "ppt", "link"}
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


# ── Helpers ───────────────────────────────────────────────────────────

def _extract_video_id(url: str) -> str:
    """Extract YouTube video ID from a watch URL."""
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    if "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    return ""


def _match_topic_key(course_name: str) -> str | None:
    name_lower = course_name.lower().strip()

    if name_lower in COURSE_VIDEOS:
        return name_lower

    for alias, topic_key in TOPIC_ALIASES.items():
        if alias in name_lower:
            return topic_key

    for key in COURSE_VIDEOS:
        if key in name_lower or name_lower in key:
            return key

    words = name_lower.split()
    for key in COURSE_VIDEOS:
        key_words = key.split()
        if any(w in key_words for w in words):
            return key

    return None


def _get_static_video(course_name: str, skill_level: str = "beginner") -> dict | None:
    """
    Match course name against COURSE_VIDEOS dictionary.
    Returns first matching video as a dict for the specified skill level, or None if no match.
    Uses fuzzy matching so 'Python for Beginners' matches 'python' key.
    """
    skill_level = skill_level.lower() if skill_level else "beginner"
    topic_key = _match_topic_key(course_name)
    if not topic_key:
        return None

    course_videos = COURSE_VIDEOS.get(topic_key, {})
    if isinstance(course_videos, dict):
        videos = course_videos.get(skill_level, course_videos.get("beginner", []))
        return videos[0] if videos else None
    return course_videos[0] if course_videos else None


def _get_pdf_url(course_name: str, slug: str, skill_level: str = "beginner") -> str:
    topic_key = _match_topic_key(course_name)
    skill_level = skill_level.lower() if skill_level else "beginner"

    if "python" in slug or topic_key == "python":
        if skill_level == "advanced":
            return "https://docs.python.org/3/howto/"
        if skill_level == "intermediate":
            return "https://python.swaroopch.com/"
        return "https://docs.python.org/3/tutorial/"

    if "react" in slug:
        if skill_level == "advanced":
            return "https://react.dev/reference/react"
        if skill_level == "intermediate":
            return "https://react.dev/learn"
        return "https://react.dev/learn/tutorial-tic-tac-toe"

    if "javascript" in slug or "js" in slug:
        if skill_level == "advanced":
            return "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference"
        if skill_level == "intermediate":
            return "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks"
        return "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps"

    if "fastapi" in slug:
        if skill_level == "advanced":
            return "https://fastapi.tiangolo.com/deployment/"
        if skill_level == "intermediate":
            return "https://fastapi.tiangolo.com/advanced/"
        return "https://fastapi.tiangolo.com/tutorial/"

    if "java" in slug or topic_key == "java":
        if skill_level == "advanced":
            return "https://docs.oracle.com/javase/tutorial/collections/streams/"
        if skill_level == "intermediate":
            return "https://www.baeldung.com/java-tutorial"
        return "https://dev.java/learn/"

    if "machine-learning" in slug or "ml" in slug or topic_key == "machine learning":
        if skill_level == "advanced":
            return "https://huggingface.co/learn"
        if skill_level == "intermediate":
            return "https://scikit-learn.org/stable/user_guide.html"
        return "https://www.kaggle.com/learn/intro-to-machine-learning"

    if "artificial" in slug or topic_key == "artificial intelligence":
        if skill_level == "advanced":
            return "https://www.deeplearningbook.org/"
        if skill_level == "intermediate":
            return "https://developers.google.com/machine-learning/crash-course"
        return "https://www.coursera.org/learn/ai-for-everyone"

    if "sql" in slug or "database" in slug:
        if skill_level == "advanced":
            return "https://www.postgresql.org/docs/current/tutorial-window.html"
        if skill_level == "intermediate":
            return "https://mode.com/sql-tutorial/"
        return "https://www.w3schools.com/sql/"

    if "data-science" in slug or "data science" in course_name.lower():
        if skill_level == "advanced":
            return "https://jakevdp.github.io/PythonDataScienceHandbook/"
        if skill_level == "intermediate":
            return "https://www.kaggle.com/learn/pandas"
        return "https://www.kaggle.com/learn/python"

    if topic_key == "web development":
        if skill_level == "advanced":
            return "https://web.dev/learn/performance/"
        if skill_level == "intermediate":
            return "https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks/React_getting_started"
        return "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web"

    return f"https://www.tutorialspoint.com/{slug}/index.htm"


def _get_ppt_url(course_name: str, slug: str) -> str:
    if "python" in slug:
        return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=python+programming"
    if "react" in slug:
        return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=react+js"
    if "fastapi" in slug:
        return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=fastapi"
    if "java" in slug:
        return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=java+programming"
    if "javascript" in slug or "js" in slug:
        return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=javascript"
    if "machine-learning" in slug or "ml" in slug:
        return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=machine+learning"
    return f"https://www.slideshare.net/search/slideshow?searchfrom=header&q={course_name.replace(' ', '+')}"


def _get_reference_url(slug: str) -> str:
    if "react" in slug:
        return "https://react.dev"
    if "python" in slug:
        return "https://docs.python.org/3/"
    if "fastapi" in slug:
        return "https://fastapi.tiangolo.com"
    if "javascript" in slug or "js" in slug:
        return "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
    if "java" in slug:
        return "https://docs.oracle.com/en/java/"
    if "machine-learning" in slug or "ml" in slug:
        return "https://scikit-learn.org/stable/"
    if "sql" in slug or "database" in slug:
        return "https://www.w3schools.com/sql/"
    return f"https://www.w3schools.com/{slug}/"


def _build_seed_materials(course_name: str, skill_level: str = "beginner"):
    """Build the default seed materials for a course with skill level."""
    materials = []
    slug = course_name.lower().replace(" ", "-")

    # 1. Video (from static COURSE_VIDEOS)
    video = _get_static_video(course_name, skill_level)
    if video:
        vid_id = _extract_video_id(video["url"])
        materials.append({
            "course_title": course_name,
            "title": video["title"],
            "type": "video",
            "url": video["url"],
            "description": f"Watch and learn {course_name} with this full tutorial video ({skill_level} level).",
            "skill_level": skill_level,
        })

    # 2. PDF notes / cheat sheet
    pdf_url = _get_pdf_url(course_name, slug, skill_level)

    materials.append({
        "course_title": course_name,
        "title": f"{course_name} — {skill_level.capitalize()} PDF Notes",
        "type": "pdf",
        "url": pdf_url,
        "description": f"Topic-based {skill_level} PDF notes and reading material for {course_name}.",
        "skill_level": skill_level,
    })

    # 3. PPT presentation
    materials.append({
        "course_title": course_name,
        "title": f"{course_name} — Lecture Slides",
        "type": "ppt",
        "url": _get_ppt_url(course_name, slug),
        "description": f"Slide deck covering key concepts and applications of {course_name}.",
        "skill_level": skill_level,
    })

    # 4. Official reference link
    ref_url = _get_reference_url(slug)

    materials.append({
        "course_title": course_name,
        "title": f"{course_name} — Official Documentation",
        "type": "link",
        "url": ref_url,
        "description": f"Official documentation and learning resources for {course_name}.",
        "skill_level": skill_level,
    })

    return materials


def _group_materials(materials: list[dict]):
    grouped = {t: [] for t in VALID_TYPES}
    for material in materials:
        material_type = material.get("type", "link")
        if material_type in grouped:
            grouped[material_type].append(material)

    return {
        "videos": grouped.get("video", []),
        "pdfs": grouped.get("pdf", []),
        "ppts": grouped.get("ppt", []),
        "references": grouped.get("link", []),
    }


def _dedupe_materials(materials: list[dict]):
    deduped = []
    seen = set()

    for material in materials:
        key = (
            (material.get("type") or "").strip().lower(),
            (material.get("url") or "").strip().lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(material)

    return deduped


def _seed_materials(course_name: str, skill_level: str = "beginner"):
    """
    Auto-create study materials for a course the first time it is searched.
    Uses static COURSE_VIDEOS — no external API needed.
    """
    materials = _build_seed_materials(course_name, skill_level)

    # Save all to Supabase
    for m in materials:
        try:
            supabase.table("study_materials").insert(m).execute()
        except Exception as e:
            print(f"Seed insert error: {e}")


def _seed_missing_materials(course_name: str, existing_materials: list[dict], skill_level: str = "beginner"):
    """
    Backfill missing material types for an already existing course.
    This ensures PPT and reference links appear even if old rows were seeded
    before those types were added or if the database is incomplete.
    """
    existing_types = {m.get("type") for m in existing_materials}
    existing_keys = {
        (
            (m.get("title") or "").strip().lower(),
            (m.get("type") or "").strip().lower(),
            (m.get("url") or "").strip().lower(),
        )
        for m in existing_materials
    }

    inserted = 0
    for material in _build_seed_materials(course_name, skill_level):
        material_type = material.get("type")
        material_key = (
            (material.get("title") or "").strip().lower(),
            (material_type or "").strip().lower(),
            (material.get("url") or "").strip().lower(),
        )

        if material_key in existing_keys:
            continue

        try:
            supabase.table("study_materials").insert(material).execute()
            inserted += 1
        except Exception as e:
            print(f"Seed backfill error: {e}")

    return inserted


# ── Routes ────────────────────────────────────────────────────────────

@router.get("/{course_name}")
def get_study_materials(course_name: str, skill_level: str = "beginner"):
    """
    GET /study-materials/{course_name}
    Returns all materials for a course filtered by skill level.
    If none exist yet, auto-seeds them from static data.
    """
    try:
        search_pattern = f"%{course_name.strip()}%"
        response = (
            supabase.table("study_materials")
            .select("*")
            .ilike("course_title", search_pattern)
            .ilike("skill_level", skill_level)
            .execute()
        )
        materials = response.data or []
        fallback_materials = _build_seed_materials(course_name, skill_level)

        # Auto-seed on first request
        if not materials:
            _seed_materials(course_name, skill_level)
            re_resp = (
                supabase.table("study_materials")
                .select("*")
                .ilike("course_title", search_pattern)
                .ilike("skill_level", skill_level)
                .execute()
            )
            materials = re_resp.data or []
        else:
            inserted = _seed_missing_materials(course_name, materials, skill_level)
            if inserted:
                re_resp = (
                    supabase.table("study_materials")
                    .select("*")
                    .ilike("course_title", search_pattern)
                    .ilike("skill_level", skill_level)
                    .execute()
                )
                materials = re_resp.data or []

        # If database insert/query still returns nothing, show generated materials
        # directly so the frontend does not stay empty.
        if not materials:
            materials = fallback_materials

        materials = _dedupe_materials([*fallback_materials, *materials])

        return {
            "course_title": course_name,
            "skill_level": skill_level,
            "materials": materials,
            "grouped": _group_materials(materials),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch study materials: {str(e)}")


@router.post("")
def add_study_material(data: StudyMaterialCreate):
    """POST /study-materials — manually add a material (admin use)."""
    if data.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {sorted(VALID_TYPES)}")
    try:
        response = (
            supabase.table("study_materials")
            .insert({
                "course_title": data.course_title,
                "title":        data.title,
                "type":         data.type,
                "url":          data.url,
                "description":  data.description,
            })
            .execute()
        )
        return {"message": "Study material added", "material": response.data[0] if response.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{material_id}")
def delete_study_material(material_id: int):
    """DELETE /study-materials/{material_id} — remove a material."""
    try:
        supabase.table("study_materials").delete().eq("id", material_id).execute()
        return {"message": "Study material deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))