# AI-Based Course Recommendation and Academic Assistance Platform

An intelligent, personalized E-learning and academic support platform designed to customize course timelines, recommend courses based on student profiles, enforce playback watch requirements, deliver dynamic AI-based assessments, and issue verifiable PDF credentials.

---

## 🚀 Key Features

*   **Personalized Course Recommendations**: Dynamically scans the user profile's skill level (Beginner, Intermediate, Advanced) and interests to suggest matching courses directly on the homepage dashboard.
*   **Dynamic AI Roadmaps**: Generates custom 5-step learning roadmaps for any searched topic (e.g., PHP, Django) utilizing LLMs, formatted into alternating video and quiz checkpoints.
*   **Video watch-time verification**: Integrates the YouTube IFrame API to track video playback. Milestone assessments remain **locked** until the student watches at least **90%** of the lesson.
*   **Dynamic 15-Question Assessments**: Generates 15-question multiple-choice exams matching the lesson topic, caching the questions and keys securely in the database to prevent client-side tampering.
*   **AI-Powered Study Recommendations**: Isolates incorrect quiz answers and calls the LLM to write a targeted, 1-2 sentence revision guide to help the student improve.
*   **RAG-Based Academic Chatbot**: An AI study assistant that answers questions based on local study contexts and course materials.
*   **Verifiable QR Certificates**: Once a course is 100% complete, the backend generates a ReportLab PDF containing a custom verification QR code linking back to the host server.
*   **Admin Control Panel**: Features platform-wide analytics dashboards tracking total searches, quiz performance, feedback logs, and active student enrollment.

---

## 🛠️ Technology Stack

*   **Frontend**: React.js (Single Page Application, custom CSS styling, responsive layout).
*   **Backend**: FastAPI (Python ASGI server, async endpoints, ReportLab PDF builder).
*   **Database**: Supabase (PostgreSQL schema with relational constraints and JSONB storage).
*   **AI Inference**: Google AI Studio (Gemini-flash-latest) or Groq API (LLaMA 3.3 70B).

---

## 💻 Quick Start Setup

### 1. Prerequisites
Make sure you have **Node.js** (v18+) and **Python** (v3.10+) installed.

---

### 2. Backend Configuration
1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # On Windows:
    venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Create your **`.env`** file inside the `backend/` folder based on `.env.example`:
    ```env
    # Supabase Connection
    SUPABASE_URL=https://your-supabase-url.supabase.co
    SUPABASE_KEY=your-supabase-anon-key

    # AI Configuration (Toggled to Gemini Free Tier)
    LLM_PROVIDER=gemini
    GEMINI_API_KEY=your-google-ai-studio-api-key
    GEMINI_MODEL=gemini-flash-latest

    # YouTube Data API Key
    YOUTUBE_API_KEY=your-youtube-data-api-key

    # Email SMTP Settings (For notifications)
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USERNAME=your-email@gmail.com
    SMTP_PASSWORD=your-app-password
    ```
5.  Start the FastAPI server:
    ```bash
    python app.py
    ```

---

### 3. Frontend Configuration
1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Ensure the `frontend/.env` has the correct API pointer:
    ```env
    REACT_APP_API_URL=http://localhost:8000
    ```
4.  Start the React application:
    ```bash
    npm start
    ```
5.  Open your browser and navigate to `http://localhost:3000` to register, log in, and study!
