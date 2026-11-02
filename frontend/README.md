# LearnSphere — React Frontend

This folder contains the **React.js** single-page application (SPA) client interface for **LearnSphere**.

---

## 📂 Core Folder Structure

```text
frontend/
├── public/              # Static index.html and assets
└── src/
    ├── components/      # Common shared visual elements
    ├── context/         # AuthContext and ToastContext providers
    ├── pages/           # High-level route views (Dashboard, Admin, etc.)
    ├── services/        # api.js client wrappers using Axios
    └── styles/          # Modern Vanilla CSS sheets
```

---

## 🖥️ Page Routing & Components

| Route | Page Component | Role |
| :--- | :--- | :--- |
| `/` | `LandingPage.jsx` | Introduction, marketing overview, and entry buttons. |
| `/login` | `Login.jsx` | Student and Administrator login panel. |
| `/signup` | `Signup.jsx` | New user enrollment and interest configuration. |
| `/dashboard` | `Dashboard.jsx` | Student home. Contains tabs for Courses, AI Chat, Quizzes, History, and Certificates. |
| `/admin` | `AdminDashboard.jsx` | System console for stats, user management, feedback, and platform logging. |
| `/assessment` | `Assessment.jsx` | Step-specific assessment rendering and grading sub-screen. |

---

## ⚡ Development Operations

1.  **Dependency Setup**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    Verify that your `.env` contains:
    ```env
    REACT_APP_API_URL=http://127.0.0.1:8000
    ```
3.  **Local Launch**:
    ```bash
    npm start
    ```
4.  **Production Compile**:
    ```bash
    npm run build
    ```
