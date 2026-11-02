"""
routes/quizzes.py
─────────────────────────────────────────────────────────────────────────
Predefined quizzes (list/get/submit) + AI quiz generation (via Groq).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from models import QuizSubmit, QuizGenRequest
from models.static_data import QUIZZES
from services.groq_service import generate_quiz_questions

router = APIRouter(tags=["Quizzes"])


@router.get("/quiz-history/{user_id}")
def get_quiz_history(user_id: int):
    """Get quiz/assessment history for a user with titles and scores."""
    try:
        resp = (
            supabase.table("quiz_results")
            .select("*")
            .eq("user_id", user_id)
            .order("taken_at", desc=True)
            .limit(50)
            .execute()
        )
        results = resp.data or []
        return {"history": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quiz history: {str(e)}")


@router.get("/quizzes")
def list_quizzes():
    return {"quizzes": [{"id": k, "title": v["title"], "questions": len(v["questions"])} for k, v in QUIZZES.items()]}


@router.get("/quiz/{quiz_id}")
def get_quiz(quiz_id: int):
    if quiz_id not in QUIZZES:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz = QUIZZES[quiz_id]
    questions = [{"id": q["id"], "q": q["q"], "options": q["options"]} for q in quiz["questions"]]
    return {"id": quiz_id, "title": quiz["title"], "questions": questions}


@router.post("/quiz/submit")
def submit_quiz(data: QuizSubmit):
    # AI-generated quiz (id 99): correct_answers comes from the client
    if data.quiz_id == 99:
        if not data.correct_answers:
            raise HTTPException(status_code=400, detail="correct_answers required for AI quiz")
        correct = 0
        total = len(data.correct_answers)
        detailed_results = []
        for i in range(total):
            is_correct = i < len(data.answers) and data.answers[i] == data.correct_answers[i]
            if is_correct:
                correct += 1
            detailed_results.append({
                "question_index": i,
                "user_answer": data.answers[i] if i < len(data.answers) else None,
                "correct_answer": data.correct_answers[i],
                "is_correct": is_correct
            })
        score = round((correct / total) * 100)
        passed = score >= 60
        course_title = getattr(data, "course_title", None) or getattr(data, "topic", None) or "AI Generated Quiz"
        _save_quiz_result(data.user_id, course_title, score, passed)
        return {"correct": correct, "total": total, "score": score, "passed": passed, "detailed_results": detailed_results}

    # Predefined quiz
    if data.quiz_id not in QUIZZES:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz = QUIZZES[data.quiz_id]
    correct = 0
    total = len(quiz["questions"])
    detailed_results = []
    for i, q in enumerate(quiz["questions"]):
        is_correct = i < len(data.answers) and data.answers[i] == q["answer"]
        if is_correct:
            correct += 1
        detailed_results.append({
            "question_index": i,
            "question": q["q"],
            "options": q["options"],
            "user_answer": data.answers[i] if i < len(data.answers) else None,
            "correct_answer": q["answer"],
            "is_correct": is_correct
        })
    score = round((correct / total) * 100)
    passed = score >= 60
    _save_quiz_result(data.user_id, quiz["title"], score, passed)
    return {"correct": correct, "total": total, "score": score, "passed": passed, "detailed_results": detailed_results, "title": quiz["title"]}


@router.post("/quiz/generate")
async def generate_quiz(data: QuizGenRequest):
    """AI-generated quiz on any topic, using Groq LLaMA 3.3."""
    questions = await generate_quiz_questions(data.topic, data.num_questions)
    return {"topic": data.topic, "questions": questions}


def _save_quiz_result(user_id: int, course_title: str, score: int, passed: bool):
    """Save a practice quiz attempt (Quiz tab). Does NOT affect course
    progress — only a real post-video Assessment (assessment.py) counts
    toward the assessment half of a course's completion percentage.
    Practice quizzes are tagged source='quiz' precisely so
    _count_passed_assessments (routes/progress.py) can tell the two apart
    and ignore this one.

    IMPORTANT: the quiz_results table has NO quiz_id column, and
    course_title/passed are NOT NULL (see backend/schema.sql). A previous
    version of this function inserted quiz_id instead of course_title/passed
    and swallowed the resulting DB error, so every quiz taken here silently
    failed to save — that's why Quiz Score Trend stayed empty. Keep this
    aligned with schema.sql if the schema changes.
    """
    try:
        supabase.table("quiz_results").insert({
            "user_id": user_id,
            "course_title": course_title or "General Quiz",
            "score": score,
            "passed": bool(passed),
            "source": "quiz",
            "taken_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        print(f"Failed to save quiz result: {e}")