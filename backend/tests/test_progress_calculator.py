from utils.progress_calculator import calculate_course_progress


def test_course_progress_uses_video_ratio_and_assessment():
    assert calculate_course_progress(2, 4, False) == 40
    assert calculate_course_progress(2, 4, True) == 60


def test_course_progress_caps_at_100_percent():
    assert calculate_course_progress(4, 4, True) == 100
