"""
services/recommendation_service.py
─────────────────────────────────────────────────────────────────────────
Course recommendation logic using a pre-trained Sentence-Transformer
similarity matrix (built offline by model_training.py).

Same behavior as the original database.py recommend()/get_relevant_courses()
functions — just relocated into the service layer.
"""

import pickle
import pandas as pd

# ── Load ML model + dataset once at import time ──────────────────────────
try:
    courses_df = pd.read_csv("../dataset/final_cleaned_courses.csv")
    similarity = pickle.load(open("../models/similarity.pkl", "rb"))
    print("✅ ML Models loaded")
except Exception as e:
    print(f"⚠️  ML model load failed: {e}")
    courses_df = pd.DataFrame(columns=["title", "description", "level", "rating", "url"])
    similarity = []

_search_cache = {}


def recommend(course_name: str, top_n: int = 6):
    """Return the top-N most similar courses to a search query."""
    cache_key = course_name.lower().strip()
    if cache_key in _search_cache:
        return _search_cache[cache_key]

    if courses_df.empty or not len(similarity):
        return []

    matches = courses_df[courses_df["title"].str.contains(course_name, case=False, na=False)]
    if matches.empty:
        return []

    idx = matches.index[0]
    distances = similarity[idx]
    recs = sorted(list(enumerate(distances)), key=lambda x: x[1], reverse=True)[1:top_n + 1]

    result = []
    for item in recs:
        row = courses_df.iloc[item[0]]
        result.append({
            "title": str(row.get("title", "")),
            "description": str(row.get("description", "Explore this course to advance your skills."))[:200],
            "level": str(row.get("level", "All Levels")),
            "rating": float(row.get("rating", 4.2)) if pd.notna(row.get("rating")) else 4.2,
            "url": str(row.get("url", "#")),
            "similarity_score": round(float(item[1]), 3),
        })

    _search_cache[cache_key] = result
    return result


def get_relevant_courses(query: str, top_n: int = 5) -> str:
    """Retrieve relevant course context (used by the RAG chatbot)."""
    if courses_df.empty:
        return "No courses available."

    mask = (
        courses_df["title"].str.contains(query, case=False, na=False) |
        courses_df["description"].str.contains(query, case=False, na=False)
    )
    matched = courses_df[mask].head(top_n)
    if matched.empty:
        matched = courses_df.head(top_n)

    context = ""
    for _, row in matched.iterrows():
        context += f"""
        Course: {row.get('title', '')}
        Level: {row.get('level', 'All Levels')}
        Rating: {row.get('rating', 4.0)}
        Description: {str(row.get('description', ''))[:200]}
        ---"""
    return context


def get_popular_courses(limit: int = 12):
    """Return the first N non-null-title courses for the Popular Courses view."""
    if courses_df.empty:
        return []
    sample = courses_df.dropna(subset=["title"]).head(limit)
    result = []
    for _, row in sample.iterrows():
        result.append({
            "title": str(row.get("title", "")),
            "description": str(row.get("description", ""))[:180],
            "level": str(row.get("level", "All Levels")),
            "rating": float(row.get("rating", 4.2)) if pd.notna(row.get("rating")) else 4.2,
            "url": str(row.get("url", "#")),
        })
    return result
