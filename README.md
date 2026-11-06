#  AI-Based Course Recommendation and Academic Assistance Platform

An intelligent, personalized e-learning and academic support platform designed to enhance the learning experience through AI-powered course recommendations, customized learning roadmaps, interactive assessments, video watch-time verification, academic assistance, and verifiable digital certificates.

##  Key Features

* **Personalized Course Recommendations:** Analyzes students' skill levels (Beginner, Intermediate, and Advanced) and interests to recommend relevant courses directly on their dashboards.

* **Dynamic AI Learning Roadmaps:** Generates customized five-step learning roadmaps for topics such as PHP and Django using Large Language Models (LLMs), with alternating video lessons and quiz checkpoints.

* **Video Watch-Time Verification:** Integrates the YouTube IFrame API to track video playback. Assessments remain locked until students watch at least 90% of the lesson video.

* **Dynamic 15-Question Assessments:** Generates topic-specific multiple-choice assessments. Questions and answer keys are stored securely in the database to prevent client-side tampering.

* **AI-Powered Study Recommendations:** Analyzes incorrect quiz answers and uses AI to generate targeted revision suggestions to help students improve their understanding.

* **RAG-Based Academic Chatbot:** Provides an AI-powered study assistant that answers questions using relevant study contexts and course materials.

* **Verifiable QR Code Certificates:** Generates PDF certificates using ReportLab after students complete 100% of a course. Each certificate includes a QR code linked to the platform's verification page.

* **Admin Control Panel:** Provides analytics dashboards for monitoring platform searches, quiz performance, feedback logs, and student enrollment.

##  Technology Stack

| Component         | Technologies                    |
| ----------------- | ------------------------------- |
| Frontend          | React.js, JavaScript, HTML, CSS |
| Backend           | Python, FastAPI                 |
| Database          | Supabase, PostgreSQL            |
| AI Integration    | Google Gemini API, Groq API     |
| Video Integration | YouTube IFrame API              |
| PDF Generation    | ReportLab                       |
| Data Processing   | Python, Pandas                  |
| Version Control   | Git, GitHub                     |

##  AI Integration

The platform integrates two AI providers:

**1. Google Gemini API**

* Used for AI-powered content generation and academic assistance.
* Supports intelligent learning-related responses and content generation.

**2. Groq API**

* Used for AI-powered content generation and academic assistance.
* Evaluated alongside Gemini to compare response times and performance.

Both APIs were integrated to compare their response speed and evaluate their suitability for AI-powered learning functionalities.

##  Project Structure

```text
personalized-learning-system/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   ├── .env.example
│   ├── app.py
│   ├── config.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
│
├── dataset/
│   ├── coursera.csv
│   ├── final_cleaned_courses.csv
│   ├── personalized_learning.csv
│   └── udemy.csv
│
├── models/
│   ├── courses.pkl
│   ├── embeddings.pkl
│   └── similarity.pkl
│
├── database_patch.sql
├── README.md
└── .gitignore
```

##  Installation and Setup

### 1. Prerequisites

Make sure the following software and accounts are available:

* Python 3.10 or later
* Node.js 18 or later
* npm
* Git
* Supabase account
* Google AI Studio API key
* Groq API key
* YouTube Data API key (if required by the configured features)

### 2. Clone the Repository

Open your terminal and execute:

```bash
git clone https://github.com/Bhumika3005/Personalized-Learning-Recommendation-System.git
```

Navigate to the project directory:

```bash
cd Personalized-Learning-Recommendation-System
```

### 3. Backend Configuration

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

**Windows:**

```powershell
venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file inside the `backend/` directory using `.env.example` as a reference.

Add your configuration:

```env
# Supabase Configuration
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Google Gemini Configuration
GEMINI_API_KEY=your-gemini-api-key

# Groq Configuration
GROQ_API_KEY=your-groq-api-key

# AI Provider Configuration
LLM_PROVIDER=gemini

# YouTube API Configuration
YOUTUBE_API_KEY=your-youtube-api-key

# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

Replace the placeholder values with your actual credentials.

Configure the AI provider according to the environment variables and provider-selection logic supported by your backend.

**Important:** Never upload your actual `.env` file or API credentials to GitHub.

#### Start the Backend Server

```bash
python app.py
```

The backend server will start on the configured local port.

### 4. Frontend Configuration

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

#### Configure Frontend Environment Variables

Create a `.env` file inside the `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:8000
```

Make sure the API URL matches the address and port used by your backend server.

#### Start the Frontend Application

```bash
npm start
```

Open your browser and navigate to:

```text
http://localhost:3000
```

Register, log in, and explore the learning platform.

## 🔐 Environment Variables and Security

* Store API keys, database credentials, and passwords in local `.env` files.
* Never upload actual `.env` files or private credentials to GitHub.
* Use `.env.example` to provide placeholder configuration values.
* Keep sensitive environment files excluded through `.gitignore`.
* Do not expose private API keys in frontend source code.

##  Project Objectives

The main objectives of this project are:

* To provide personalized course recommendations based on student profiles.
* To create structured and customized learning roadmaps.
* To improve student engagement through interactive assessments.
* To provide AI-powered academic assistance.
* To monitor learning progress through video watch-time verification.
* To generate verifiable digital certificates.
* To provide administrators with useful platform analytics.

##  Expected Benefits

* Personalized learning experiences for students.
* Improved learning engagement and knowledge assessment.
* Faster access to relevant academic resources.
* AI-assisted revision and academic support.
* Transparent course completion and certificate verification.
* Better monitoring of student learning progress.

##  Developer

**Bhumika K.**

MCA Academic Project

**Project Title:** AI-Based Course Recommendation and Academic Assistance Platform

---

*Developed as an academic project to explore the integration of Artificial Intelligence with personalized e-learning systems.*
