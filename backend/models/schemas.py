"""
models/schemas.py
─────────────────────────────────────────────────────────────────────────
All Pydantic models (request/response shapes) used across every route
file. Centralizing them here means routes/*.py only need to import the
models they actually use.
"""

from pydantic import BaseModel
from typing import Optional, List


# ── Auth ───────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    skill_level: Optional[str] = None
    interests: Optional[List[str]] = None


class UserLogin(BaseModel):
    email: str
    password: str


# ── Courses ────────────────────────────────────────────────────────────
class CourseRequest(BaseModel):
    course_name: str
    user_id: Optional[int] = None


# ── Quizzes ────────────────────────────────────────────────────────────
class QuizSubmit(BaseModel):
    user_id: int
    quiz_id: int
    answers: List[int]
    correct_answers: Optional[List[int]] = None
    course_title: Optional[str] = None


class QuizGenRequest(BaseModel):
    topic: str
    num_questions: int = 5


# ── Feedback ───────────────────────────────────────────────────────────
class FeedbackCreate(BaseModel):
    user_id: Optional[int] = None
    course_title: str
    rating: int
    comment: str


# ── Learning Path ──────────────────────────────────────────────────────
class LearningPathCreate(BaseModel):
    user_id: int
    topic: str


class LLMLearningPath(BaseModel):
    user_id: Optional[int] = None
    topic: str


# ── RAG Chat ───────────────────────────────────────────────────────────
class RAGRequest(BaseModel):
    question: str
    user_id: Optional[int] = None


# ── Study Materials ────────────────────────────────────────────────────
class StudyMaterialCreate(BaseModel):
    course_title: str
    title: str
    type: str          # "pdf" | "ppt" | "link" | "video"
    url: str
    description: Optional[str] = None


# ── Course Progress ────────────────────────────────────────────────────
class ProgressUpdate(BaseModel):
    user_id: int
    course_title: str
    video_watched: Optional[bool] = None
    notes_completed: Optional[bool] = None
    quiz_completed: Optional[bool] = None


class CertificateRequest(BaseModel):
    user_id: int
    course_title: str


# ── Video Progress ─────────────────────────────────────────────────────
class VideoProgressUpdate(BaseModel):
    user_id: int
    video_id: str
    course_title: str
    completed: bool = False
    watched_percentage: float = 0.0


# ── Assessment ─────────────────────────────────────────────────────────
class AssessmentGenRequest(BaseModel):
    course_name: str
    num_questions: int = 5
    skill_level: Optional[str] = "beginner"

class AssessmentSubmit(BaseModel):
    user_id: int
    course_name: str
    topic: str
    step_index: int
    answers: List[int]
    skill_level: Optional[str] = "beginner"

# ── Certificate ────────────────────────────────────────────────────────
# NOTE: CertificateRequest (user_id + course_title) is defined once, near
# the top of this file. A second, differently-shaped duplicate used to
# exist here (user_id + course_id + course_name) and silently overwrote
# it — since generate_certificate() in routes/progress.py actually reads
# `data.course_title`, every request validated against the wrong shape
# and failed with "course_id/course_name: Field required". Removed.

class CourseEnrollment(BaseModel):
    user_id: int
    course_id: str
    course_title: str
    skill_level: Optional[str] = "beginner"

class EnrollmentResponse(BaseModel):
    enrollment_id: int
    user_id: int
    course_id: str
    course_title: str
    enrolled_at: str
    progress_percentage: int
    completed: bool

class UserProfileUpdate(BaseModel):
    skill_level: str
    interests: List[str]

class UserProfileResponse(BaseModel):
    user_id: str
    skill_level: str
    interests: List[str]

class SkillBasedRecommendation(BaseModel):
    user_id: int
    skill_level: str
    interests: List[str]