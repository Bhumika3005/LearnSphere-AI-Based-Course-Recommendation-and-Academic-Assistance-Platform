"""
models.py
─────────────────────────────────────────────────────────────────────────
Re-exports everything from models/schemas.py so that both
  from models import X           (root-level import)
  from models.schemas import X   (package import)
work identically across all route files.
"""
from models.schemas import (
    SignupRequest, UserLogin,
    CourseRequest, FeedbackCreate, LearningPathCreate, LLMLearningPath,
    RAGRequest, StudyMaterialCreate, VideoProgressUpdate, ProgressUpdate,
    QuizSubmit, QuizGenRequest, AssessmentGenRequest, AssessmentSubmit,
    CertificateRequest, UserProfileUpdate, UserProfileResponse,
    CourseEnrollment, EnrollmentResponse, SkillBasedRecommendation,
)

__all__ = [
    "SignupRequest", "UserLogin",
    "CourseRequest", "FeedbackCreate", "LearningPathCreate", "LLMLearningPath",
    "RAGRequest", "StudyMaterialCreate", "VideoProgressUpdate", "ProgressUpdate",
    "QuizSubmit", "QuizGenRequest", "AssessmentGenRequest", "AssessmentSubmit",
    "CertificateRequest", "UserProfileUpdate", "UserProfileResponse",
    "CourseEnrollment", "EnrollmentResponse", "SkillBasedRecommendation",
]