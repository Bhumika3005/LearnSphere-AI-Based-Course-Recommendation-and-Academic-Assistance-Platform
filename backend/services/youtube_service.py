"""
services/youtube_service.py
─────────────────────────────────────────────────────────────────────────
All YouTube Data API v3 calls live in this file.

Used for:
  - Letting a learner preview a tutorial video for a course
  - Resolving a video_id used by video_progress tracking
"""

import httpx
from fastapi import HTTPException
from config import YOUTUBE_API_KEY

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


async def search_course_video(course_title: str) -> dict:
    """Search YouTube for a tutorial video matching a course title."""
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=400, detail="YouTube API key not set in .env")

    query = f"{course_title} full course tutorial"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 1,
        "key": YOUTUBE_API_KEY,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(YOUTUBE_SEARCH_URL, params=params)

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"YouTube API error: {resp.status_code}")

    data = resp.json()
    items = data.get("items", [])
    if not items:
        return None

    item = items[0]
    video_id = item["id"]["videoId"]
    snippet = item["snippet"]

    return {
        "videoId": video_id,
        "title": snippet.get("title"),
        "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
        "url": f"https://www.youtube.com/watch?v={video_id}",
    }
