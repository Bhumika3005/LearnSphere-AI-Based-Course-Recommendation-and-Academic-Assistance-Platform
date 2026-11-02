"""
Backward-compatible backend entrypoint.

This project now uses the modular FastAPI app defined in `main.py`.
Keeping this file allows old commands like `python app.py` to continue working.
"""

from main import app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
