# 🎓 LearnSphere — React Frontend

This folder contains the React.js single-page application (SPA) for **LearnSphere – AI-Based Course Recommendation and Academic Assistance Platform**.

The frontend provides an interactive interface for students and administrators to access learning resources, personalized course recommendations, AI-powered academic assistance, assessments, and progress tracking.

## 📂 Core Folder Structure

```text
frontend/
│
├── public/                 # Static HTML and public assets
│
├── src/
│   ├── components/         # Reusable UI components
│   ├── context/            # Authentication and notification contexts
│   ├── pages/              # Application pages and route views
│   ├── services/           # API integration and Axios client
│   ├── styles/             # CSS stylesheets
│   │
│   ├── App.jsx             # Main application component
│   └── index.jsx           # Application entry point
│
├── .gitignore
├── package.json
└── package-lock.json
```

## 🖥️ Page Routing and Components

| Route         | Page Component       | Description                                                                            |
| ------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `/`           | `LandingPage.jsx`    | Introduction, platform overview, and entry options.                                    |
| `/login`      | `Login.jsx`          | Student and administrator login interface.                                             |
| `/signup`     | `Signup.jsx`         | New user registration and interest configuration.                                      |
| `/dashboard`  | `Dashboard.jsx`      | Student dashboard with learning features and navigation.                               |
| `/admin`      | `AdminDashboard.jsx` | Administrative dashboard for statistics, user management, feedback, and platform logs. |
| `/assessment` | `Assessment.jsx`     | Displays assessments and evaluates student answers.                                    |

## ⚡ Development Setup

### 1. Prerequisites

Make sure you have installed:

* Node.js (version 18 or later)
* npm
* A running LearnSphere backend server

### 2. Install Dependencies

Navigate to the frontend directory:

```bash
cd frontend
```

Install the required packages:

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the frontend directory and configure the backend API URL:

```env
REACT_APP_API_URL=http://127.0.0.1:8000
```

Make sure this URL matches the address and port of your running backend server.

### 4. Start the Development Server

Run:

```bash
npm start
```

The React application will be available at:

```text
http://localhost:3000
```

### 5. Create a Production Build

To generate an optimized production build, run:

```bash
npm run build
```

The production-ready files will be generated in the `build/` directory.

## 🔗 Backend Integration

The frontend communicates with the LearnSphere backend through API requests.

* **Backend Framework:** FastAPI
* **API Communication:** Axios
* **Backend URL:** Configured through `REACT_APP_API_URL`
* **Authentication:** Managed using React Context
* **Notifications:** Managed using Toast Context

## 🔐 Environment Security

* Keep actual `.env` files private.
* Never commit API credentials or sensitive information.
* Use environment variables for backend configuration.
* Keep `.env` excluded through `.gitignore`.

## 👩‍💻 Project

**LearnSphere — AI-Based Course Recommendation and Academic Assistance Platform**

Developed as part of an MCA academic project.

**Developer:** Bhumika K.
