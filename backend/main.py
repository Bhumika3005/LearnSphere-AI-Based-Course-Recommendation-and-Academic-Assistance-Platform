"""
main.py
─────────────────────────────────────────────────────────────────────────
Application entry point. Run with:

    uvicorn main:app --reload
"""

import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import (
    auth, courses, quizzes, chatbot, admin,
    study_materials, progress, analytics, assessment, videos, enrollment
)


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None

lan_ip = get_lan_ip()
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if lan_ip:
    allowed_origins.append(f"http://{lan_ip}:3000")

app = FastAPI(title="Personalized Learning System API", version="3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register every route module ───────────────────────────────────────
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(quizzes.router)
app.include_router(chatbot.router)
app.include_router(admin.router)
app.include_router(study_materials.router)
app.include_router(progress.router)
app.include_router(analytics.router)
app.include_router(assessment.router)
app.include_router(videos.router)       # ← static video routes
app.include_router(enrollment.router)  # ← enrollment & user profile routes


@app.on_event("startup")
def startup_event():
    import socket
    lan_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    print("\n" + "="*60)
    print(" 🚀 LearnSphere Backend Server Started Successfully!")
    print(" 👉 Local API URL:  http://localhost:8000")
    print(" 👉 API Swagger UI: http://localhost:8000/docs")
    if lan_ip != "127.0.0.1":
        print(f" 👉 LAN/Mobile URL: http://{lan_ip}:8000")
    print("="*60 + "\n")


@app.get("/")
def home():
    return {"message": "Personalized Learning System API v3.0 ✅"}