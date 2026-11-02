import axios from "axios";

// API base URL is read from the REACT_APP_API_URL environment variable
// (see .env). This project uses Create React App (react-scripts), which
// only exposes env vars prefixed with REACT_APP_ via process.env — it
// does NOT support Vite's import.meta.env, so that syntax silently
// never read the .env value here. This must be process.env, not
// import.meta.env.
// Use your LAN IP (not localhost/127.0.0.1) if you need phones on the
// same Wi-Fi to reach the backend — e.g. for QR codes on certificates.
// Run `ipconfig` (Windows) or `ifconfig`/`ip addr` (Mac/Linux) to find
// your IP if it changes, then update REACT_APP_API_URL in .env — no
// code edits needed. Restart `npm start` after changing .env.
const getDynamicApiUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000";
    }
    return `http://${hostname}:8000`;
  }
  return process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
};

export const API_URL = getDynamicApiUrl();

const API = axios.create({ baseURL: API_URL });

API.interceptors.request.use(
  (config) => {
    try {
      const userStr = localStorage.getItem("ls_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.access_token) {
          config.headers.Authorization = `Bearer ${user.access_token}`;
        }
      }
    } catch (e) {
      console.error("Error setting Authorization header", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signup = (data) => API.post("/auth/signup", data).then(r => r.data);
export const login  = (data) => API.post("/auth/login",  data).then(r => r.data);
export const forgotPassword = (email) => API.post("/auth/forgot-password", { email }).then(r => r.data);
export const resetPassword = (email, password, token) => API.post("/auth/reset-password", { email, password, token }).then(r => r.data);

// ── Courses ───────────────────────────────────────────────────────────────────
export const getAllEnrollments = () =>
  API.get("/enrollment/all").then(res => res.data);
export const getMyCourses = (userId) =>
  API.get(`/enrollment/my-courses/${userId}`).then(res => res.data);
export const enrollCourse = (data) =>
  API.post("/enrollment/enroll", data).then(res => res.data);
export const getRecommendations = (course_name, user_id) =>
  API.post("/recommend", { course_name, user_id }).then(r => r.data);
export const getSkillBasedRecommendations = (user_id, skill_level, interests) =>
  API.post("/enrollment/recommendations/skill-based", { user_id, skill_level, interests }).then(res => res.data);

export const getPopularCourses = () =>
  API.get("/courses/popular").then(r => r.data);

export const getHistory = (user_id) =>
  API.get(`/history/${user_id}`).then(r => r.data);

// ── Learning Path ─────────────────────────────────────────────────────────────
export const getLearningPath = (user_id, topic) =>
  API.post("/learning-path", { user_id, topic }).then(r => r.data);

export const refreshLearningPaths = (user_id, topic) =>
  API.post("/learning-path/refresh", { user_id, topic }).then(r => r.data);

// ── Quiz (Predefined) ─────────────────────────────────────────────────────────
export const listQuizzes  = ()   => API.get("/quizzes").then(r => r.data);
export const getQuiz      = (id) => API.get(`/quiz/${id}`).then(r => r.data);
export const submitQuiz   = (data) => API.post("/quiz/submit", data).then(r => r.data);
// ── Quiz (AI Generated) ──────────────────────────────────────────────
export const generateQuiz = (topic, difficulty = "medium") =>
  API.post("/quiz/generate", {
    topic,
    difficulty
  }).then(r => r.data);

// ── Feedback ──────────────────────────────────────────────────────────────────
export const submitFeedback = (data) => API.post("/feedback", data).then(r => r.data);
export const getAllFeedback  = ()     => API.get("/feedback").then(r => r.data);

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getUserStats = (user_id) =>
  API.get(`/stats/${user_id}`).then(r => r.data);

// ── AI Chatbot (RAG through Backend) ──────────────────────────────────────────
export const askRAG = async (question, user_id) => {
  try {
    const res = await API.post("/rag/chat", { question, user_id });
    return res.data.answer;
  } catch (err) {
    return "❌ AI service error. Make sure your Groq API key is set in backend/.env and the backend is running.";
  }
};
export const askGroq = askRAG;
export const askGemini = askRAG;

// ── LLM Learning Path ─────────────────────────────────────────────────────────
export const getLLMLearningPath = async (topic) => {
  try {
    const res = await API.post("/llm/learning-path", { topic });
    return res.data;
  } catch (err) {
    return null;
  }
};

// ADD BELOW THIS

export const searchCourseVideo = async (courseName, skillLevel = "beginner") => {
  try {
    const response = await axios.post(
      `${API_URL}/courses/search-video`,
      { course_name: courseName, skill_level: skillLevel }
    );
    return response.data;
  } catch (err) {
    console.error("Video search failed:", err);
    return null;
  }
};
export const getVideos = (course, skillLevel = "beginner") =>
  API.get(`/videos/${encodeURIComponent(course)}?skill_level=${skillLevel}&_t=${Date.now()}`)
     .then(res => res.data);

// ── Admin API ──────────────────────────────────────────────────────────────
export const getAdminStats    = (uid) => API.get(`/admin/stats/${uid}`).then(r => r.data);
export const getAdminUsers    = (uid) => API.get(`/admin/users/${uid}`).then(r => r.data);
export const deleteUser       = (uid, tid) => API.delete(`/admin/user/${uid}/${tid}`).then(r => r.data);
export const getAdminFeedback = (uid) => API.get(`/admin/feedback/${uid}`).then(r => r.data);
export const deleteAdminFeedback = (uid, fid) => API.delete(`/admin/feedback/${uid}/${fid}`).then(r => r.data);
export const getAdminSearches = (uid) => API.get(`/admin/searches/${uid}`).then(r => r.data);
export const getAdminQuizzes  = (uid) => API.get(`/admin/quiz-results/${uid}`).then(r => r.data);
export const getAdminActivity = (uid) => API.get(`/admin/activity/${uid}`).then(r => r.data);
export const getAdminCertificateStats = (uid) => API.get(`/admin/certificates/${uid}`).then(r => r.data);

// ── Study Materials ──────────────────────────────────────────────────────
export const getStudyMaterials = (courseName, skillLevel = "beginner") =>
  API.get(`/study-materials/${encodeURIComponent(courseName)}?skill_level=${skillLevel}&_t=${Date.now()}`).then(r => r.data);

export const addStudyMaterial = (data) =>
  API.post("/study-materials", data).then(r => r.data);

export const deleteStudyMaterial = (materialId) =>
  API.delete(`/study-materials/${materialId}`).then(r => r.data);

// ── Course Progress ──────────────────────────────────────────────────────
export const updateProgress = (data) =>
  API.post("/progress/update", data).then(r => r.data);

export const getCourseProgress = (userId, courseTitle) =>
  API.get(`/progress/${userId}/${encodeURIComponent(courseTitle)}`).then(r => r.data);

export const getAllProgress = (userId, options = {}) => {
  const { recompute = false } = options || {};
  const qs = recompute ? "?recompute=true" : "";
  return API.get(`/progress/${userId}${qs}`).then(r => r.data);
};

// ── Video Progress ───────────────────────────────────────────────────────
export const updateVideoProgress = (data) =>
  API.post("/progress/video/update", data).then(r => r.data);

export const getVideoProgress = (userId, courseTitle, videoId) =>
  API.get(`/progress/video/${userId}/${encodeURIComponent(courseTitle)}?video_id=${encodeURIComponent(videoId)}`).then(res => res.data);

// ── Assessment Unlock & Gen ──────────────────────────────────────────────
export const getAssessmentUnlockStatus = (userId, courseTitle) =>
  API.get(`/progress/unlock-status/${userId}/${encodeURIComponent(courseTitle)}`).then(r => r.data);

export const getStaticAssessment = (topic, stepIndex, userId, videoUrl, skillLevel = "beginner") =>
  API.get(`/assessment/static/${encodeURIComponent(topic)}/${stepIndex}`, { params: { user_id: userId, video_url: videoUrl, skill_level: skillLevel } }).then(r => r.data);

export const submitAssessment = (data) =>
  API.post("/assessment/submit", data).then(r => r.data);

export const getQuizHistory = (userId) =>
  API.get(`/quiz-history/${userId}`).then(r => r.data);

// ── Certificates ──────────────────────────────────────────────────────────
export const generateCertificate = (data) =>
  API.post("/progress/certificate/generate", data).then(r => r.data);

export const getCertificates = (userId) =>
  API.get(`/progress/certificate/${userId}`).then(r => r.data);

export const deleteCertificate = (certificateId, userId) =>
  API.delete(`/progress/certificate/${certificateId}?user_id=${userId}`).then(r => r.data);

export const getCertificateQrUrl = (certificateId) =>
  `${API_URL}/progress/certificate/qr/${certificateId}`;

export const verifyCertificate = (certificateId) =>
  API.get(`/progress/certificate/verify/${certificateId}`).then(r => r.data);

// ── Analytics ─────────────────────────────────────────────────────────────
export const getAnalyticsOverview = (userId) =>
  API.get(`/analytics/${userId}/overview`).then(r => r.data);

export const getProgressByCourse = (userId) =>
  API.get(`/analytics/${userId}/progress-by-course`).then(r => r.data);

export const getQuizScoreTrend = (userId) =>
  API.get(`/analytics/${userId}/quiz-score-trend`).then(r => r.data);

export const getActivitySummary = (userId) =>
  API.get(`/analytics/${userId}/activity-summary`).then(r => r.data);

// ── Admin ───────────────────────────────────────────────────────────────
export const adminAddUser = (adminId, userData) =>
  API.post(`/admin/add-user/${adminId}`, userData).then(r => r.data);
export async function getUserActivity(adminId, targetUserId) {
    const { data } = await API.get(
        `/admin/user-activity/${adminId}/${targetUserId}`
    );

    return data;
}