import os
import sys

# Ensure backend modules can be imported when tests are run from the repository root.
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

from routes.progress import _get_learning_path_video_count


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


def test_learning_path_video_count_parses_video_steps(monkeypatch):
    rows = [
        {
            "user_id": 1,
            "topic": "python",
            "path_data": [
                {"step": 1, "title": "Introduction to Python", "desc": "Watch the Python tutorial video", "type": "video"},
                {"step": 2, "title": "Core Python Concepts", "desc": "Read the documentation", "type": "reading"},
                {"step": 3, "title": "Build a project", "desc": "Watch the project video tutorial", "type": "project"},
                {"step": 4, "title": "Assessment", "desc": "Take the quiz", "type": "quiz"}
            ]
        }
    ]

    fake_supabase = FakeSupabase(rows)
    monkeypatch.setattr("routes.progress.supabase", fake_supabase)

    count = _get_learning_path_video_count(1, "Python for Beginners")

    assert count == 2


def test_learning_path_video_count_counts_total_path_steps_when_non_video_types(monkeypatch):
    rows = [
        {
            "user_id": 2,
            "topic": "data science",
            "path_data": [
                {"step": 1, "title": "Read statistics notes", "desc": "Study the theory", "type": "reading"},
                {"step": 2, "title": "Practice exercises", "desc": "Complete exercises", "type": "practice"}
            ]
        }
    ]

    fake_supabase = FakeSupabase(rows)
    monkeypatch.setattr("routes.progress.supabase", fake_supabase)

    count = _get_learning_path_video_count(2, "Data Science")

    assert count == 2


def test_get_course_video_count_prefers_learning_path_steps(monkeypatch):
    rows = [
        {
            "user_id": 3,
            "topic": "python",
            "path_data": [
                {"step": 1, "title": "Intro to Python", "desc": "Watch the intro tutorial", "type": "video"},
                {"step": 2, "title": "Advanced Patterns", "desc": "Read and review", "type": "reading"},
                {"step": 3, "title": "Project demo", "desc": "Watch the demo", "type": "video"},
                {"step": 4, "title": "Final quiz", "desc": "Take the course quiz", "type": "quiz"}
            ]
        }
    ]

    fake_supabase = FakeSupabase(rows)
    monkeypatch.setattr("routes.progress.supabase", fake_supabase)
    monkeypatch.setattr("routes.progress._find_videos", lambda course_title: [
        {"url": "https://www.youtube.com/watch?v=a"},
        {"url": "https://www.youtube.com/watch?v=b"}
    ])

    from routes.progress import _get_course_video_count
    count = _get_course_video_count(3, "Python Fundamentals")

    assert count == 4
