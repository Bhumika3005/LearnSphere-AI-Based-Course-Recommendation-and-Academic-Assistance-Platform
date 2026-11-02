import os
import sys

# Ensure backend modules can be imported when tests are run from the repository root.
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

from routes.progress import _find_matching_video_progress


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeTable:
    def __init__(self, rows):
        self.rows = rows

    def select(self, *args, **kwargs):
        return self

    def eq(self, key, value):
        return self

    def execute(self):
        return FakeResponse(self.rows)


class FakeSupabase:
    def __init__(self, rows):
        self._rows = rows

    def table(self, name):
        return FakeTable(self._rows)


def test_find_matching_video_progress_by_fuzzy_course_title(monkeypatch):
    rows = [
        {
            "user_id": 42,
            "video_id": "https://youtu.be/abc123",
            "course_title": "Python for Beginners with Hands-on Projects",
            "completed": True,
            "watched_percentage": 100,
        }
    ]

    fake_supabase = FakeSupabase(rows)
    monkeypatch.setattr("routes.progress.supabase", fake_supabase)

    result = _find_matching_video_progress(
        user_id=42,
        course_title="python",
        video_id="https://youtu.be/abc123",
    )

    assert result is not None
    assert result["completed"] is True
    assert result["watched_percentage"] == 100
    assert "Python for Beginners" in result["course_title"]
