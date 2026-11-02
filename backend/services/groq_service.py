"""
services/groq_service.py
─────────────────────────────────────────────────────────────────────────
All calls to the Groq API (LLaMA 3.3 70B) live in this file.

Used for:
  - RAG-based chatbot answers
  - AI-generated quizzes
  - AI-generated learning paths / personalized roadmaps

No route file should call httpx.post(...) to Groq directly — they all
call functions from this service instead.
"""

import json
import httpx
import time
from fastapi import HTTPException
from config import GROQ_API_KEY, GROQ_MODEL, OPENAI_API_KEY, OPENAI_MODEL, LLM_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _check_key():
    provider = (LLM_PROVIDER or "groq").strip().lower()
    if provider == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=400, detail="OpenAI API key not set in .env")
    elif provider == "gemini":
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=400, detail="Gemini API key not set in .env")
    else:
        if not GROQ_API_KEY:
            raise HTTPException(status_code=400, detail="Groq API key not set in .env")


def _clean_json_text(text: str) -> str:
    """Strip markdown code fences that LLMs sometimes wrap JSON in."""
    return text.replace("```json", "").replace("```", "").strip()


async def groq_chat_completion(prompt: str, max_tokens: int = 500, temperature: float = 0.7) -> str:
    """Send a single-turn prompt to the configured LLM provider and return the raw text response."""
    start_time = time.time()
    _check_key()
    
    provider = (LLM_PROVIDER or "groq").strip().lower()
    
    # Fallback if selected provider key is missing
    if provider == "openai" and not OPENAI_API_KEY:
        print("⚠️ OpenAI API key is missing. Falling back to Groq.")
        provider = "groq"
    elif provider == "gemini" and not GEMINI_API_KEY:
        print("⚠️ Gemini API key is missing. Falling back to Groq.")
        provider = "groq"

    if provider == "openai":
        url = "https://api.openai.com/v1/chat/completions"
        key = OPENAI_API_KEY
        model = OPENAI_MODEL or "gpt-4o"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
    elif provider == "gemini":
        model = GEMINI_MODEL or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature
            }
        }
    else:
        url = GROQ_URL
        key = GROQ_API_KEY
        model = GROQ_MODEL or "llama-3.3-70b-versatile"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail=f"Invalid {provider} API key")
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"AI error: {resp.status_code} - {resp.text}")

    elapsed = time.time() - start_time
    print(f"\n[AI PERFORMANCE] Provider: {provider.upper()} | Model: {model} | Response Latency: {elapsed:.2f} seconds\n")

    if provider == "gemini":
        try:
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error parsing Gemini response: {e}")
    else:
        return resp.json()["choices"][0]["message"]["content"]


async def rag_answer(question: str, course_context: str) -> str:
    """Generate a RAG-grounded chatbot answer using retrieved course context."""
    prompt = f"""You are an AI learning assistant for a course recommendation platform.
A student asked: "{question}"
Here are relevant courses from our platform:
{course_context}
Based on these courses, give a helpful and specific answer.
Keep your answer clear and under 200 words."""
    return await groq_chat_completion(prompt, max_tokens=300)


async def generate_quiz_questions(topic: str, num_questions: int = 30, skill_level: str = "beginner") -> list:
    """Generate multiple-choice quiz questions for any topic at a specific skill level."""
    prompt = f"""Generate exactly {num_questions} multiple choice questions about {topic} suitable for a {skill_level} level student.
The difficulty should match the {skill_level} skill level:
- beginner: basic concepts and fundamentals
- intermediate: practical application and moderate complexity
- advanced: complex scenarios, edge cases, and deep understanding

Return ONLY a JSON array like this:
[
  {{
    "q": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0
  }}
]
answer is the index (0,1,2,3) of the correct option.
Return only JSON, no extra text."""
    # Scale token limit dynamically: approx 220 tokens/chars per question, plus a safety margin
    max_tokens = max(1000, num_questions * 220)
    text = await groq_chat_completion(prompt, max_tokens=max_tokens)
    text = _clean_json_text(text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON parse error from Groq: {str(e)}")


async def generate_learning_path(topic: str, skill_level: str = "beginner") -> list:
    """Generate a 5-video learning path with embedded assessments for each video."""
    prompt = f"""Create a personalized learning path for a student at "{skill_level}" level learning "{topic}".
It must have exactly 5 video lessons. Each video step should include 5 multiple-choice assessment questions relevant to that video's topic.
Return ONLY a JSON array like this:
[
  {{
    "step": 1,
    "title": "Introduction to Python Basics",
    "desc": "Learn variables, operators, and basic syntax",
    "duration": "2 weeks",
    "type": "video",
    "questions": [
      {{
        "q": "What is the correct way to assign a value to a variable in Python?",
        "options": ["var x = 5", "x = 5", "int x = 5", "let x = 5"],
        "answer": 1
      }},
      {{
        "q": "Which operator is used for exponentiation in Python?",
        "options": ["^", "**", "exp()", "^^"],
        "answer": 1
      }}
    ]
  }}
]
Each video step must include exactly 5 questions in the questions field.
Return only JSON, no extra text."""
    text = await groq_chat_completion(prompt, max_tokens=6000)
    text = _clean_json_text(text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON parse error from Groq: {str(e)}")
