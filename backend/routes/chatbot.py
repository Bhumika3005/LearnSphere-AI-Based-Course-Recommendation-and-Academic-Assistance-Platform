"""
routes/chatbot.py
─────────────────────────────────────────────────────────────────────────
RAG-based AI chatbot + LLM-generated personalized learning path/roadmap.
"""

from fastapi import APIRouter
from supabase_client import supabase
from models import RAGRequest, LLMLearningPath
from services.recommendation_service import get_relevant_courses
from services.groq_service import rag_answer, generate_learning_path

router = APIRouter(tags=["Chatbot"])


@router.post("/rag/chat")
async def rag_chat(data: RAGRequest):
    """RAG pipeline: retrieve relevant courses, then ask Groq LLaMA 3.3."""
    relevant_courses = get_relevant_courses(data.question)
    answer = await rag_answer(data.question, relevant_courses)

    if data.user_id:
        try:
            supabase.table("search_history").insert({
                "user_id": data.user_id,
                "query": f"AI: {data.question}",
            }).execute()
        except Exception:
            pass

    return {"question": data.question, "answer": answer, "courses_used": relevant_courses[:500]}


@router.post("/llm/learning-path")
async def llm_learning_path(data: LLMLearningPath):
    """Generate a 5-step personalized learning roadmap using Groq LLaMA 3.3."""
    path = await generate_learning_path(data.topic)

    if data.user_id:
        try:
            supabase.table("learning_paths").upsert({
                "user_id": data.user_id,
                "topic": data.topic,
            }).execute()
        except Exception:
            pass

    return {"topic": data.topic, "path": path}
