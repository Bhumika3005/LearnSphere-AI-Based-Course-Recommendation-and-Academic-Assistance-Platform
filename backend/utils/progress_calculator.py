"""
utils/progress_calculator.py
─────────────────────────────────────────────────────────────────────────
Implements a course progress formula that reflects actual completion
progress instead of treating milestones as an instant 100% switch.

Formula:  progress = (completed_videos / total_videos) * 50
                   + (completed_assessments / total_assessments) * 50

Both halves must be fully completed to reach 100%.
"""

VIDEO_WEIGHT = 50
ASSESSMENT_WEIGHT = 50


def calculate_course_progress(
    completed_videos: int,
    total_videos: int,
    assessment_passed: bool = False,
    completed_assessments: int = 0,
    total_assessments: int = 1,
) -> int:
    """Return progress percentage based on completed videos and assessments.

    Parameters
    ----------
    completed_videos : int
        Number of distinct videos the user has completed.
    total_videos : int
        Total number of videos available for the course.
    assessment_passed : bool
        Legacy flag — if True and completed_assessments is 0,
        counts as 1 passed assessment out of total_assessments.
    completed_assessments : int
        Number of assessments the user has passed for this course.
    total_assessments : int
        Total number of assessments required (defaults to 1).
    """
    # ── Video component (50%) ─────────────────────────────────────────
    if total_videos <= 0:
        video_progress = VIDEO_WEIGHT          # no videos → full video credit
    else:
        video_ratio = min(completed_videos / total_videos, 1.0)
        video_progress = round(video_ratio * VIDEO_WEIGHT)

    # ── Assessment component (50%) ────────────────────────────────────
    # Support legacy boolean flag
    if completed_assessments <= 0 and assessment_passed:
        completed_assessments = 1

    if total_assessments <= 0:
        assessment_progress = ASSESSMENT_WEIGHT   # no assessments → full credit
    else:
        assessment_ratio = min(completed_assessments / total_assessments, 1.0)
        assessment_progress = round(assessment_ratio * ASSESSMENT_WEIGHT)

    progress = video_progress + assessment_progress
    return min(100, progress)


def calculate_progress(video_watched: bool, notes_completed: bool, quiz_completed: bool) -> int:
    """Backward-compatible helper for milestone-based tracking."""
    completed_steps = sum([bool(video_watched), bool(notes_completed), bool(quiz_completed)])
    if completed_steps == 0:
        return 0
    return round((completed_steps / 3) * 100)


def is_course_complete(progress_percentage: int) -> bool:
    return progress_percentage >= 100
