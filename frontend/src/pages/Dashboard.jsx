import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
// Force hot-reload to register Trash2 import
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast, getErrorMessage } from "../context/ToastContext.jsx";
import axios from "axios";
import {
getRecommendations, getHistory,
getLearningPath, listQuizzes, getQuiz, submitQuiz,
submitFeedback, getAllFeedback, getUserStats, askRAG,
generateQuiz, enrollCourse, getMyCourses, getVideos, getVideoProgress, updateVideoProgress,
refreshLearningPaths, getCertificates, generateCertificate, deleteCertificate, getQuizHistory,
getSkillBasedRecommendations
} from "../services/api.js";
import "../styles/Dashboard.css";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { getAllProgress } from "../services/api";
import ProgressBar from "../components/ProgressBar.jsx";
import {
  LayoutDashboard,
  BookOpen,
  Route,
  ClipboardCheck,
  History as HistoryIcon,
  Star,
  MessageSquare,
  BarChart3,
  Award,
  PlayCircle,
  TrendingUp,
  Search,
  Lock,
  Unlock,
  Zap,
  LogOut,
  Shield,
  Clock,
  Compass,
  UserCircle,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  ArrowRightCircle,
  Trash2,
  XCircle
} from "lucide-react";
// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={20} strokeWidth={2} /> },
  { id: "courses", label: "Courses", icon: <BookOpen size={20} strokeWidth={2} /> },
  { id: "path", label: "Learning Path", icon: <Route size={20} strokeWidth={2} /> },
  { id: "quiz", label: "Quiz", icon: <ClipboardCheck size={20} strokeWidth={2} /> },
  { id: "history", label: "History", icon: <HistoryIcon size={20} strokeWidth={2} /> },
  { id: "feedback", label: "Feedback", icon: <Star size={20} strokeWidth={2} /> },
  { id: "ai", label: "AI Chat", icon: <MessageSquare size={20} strokeWidth={2} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={20} strokeWidth={2} /> },
  { id: "certificates", label: "Certificates", icon: <Award size={20} strokeWidth={2} /> },
];
// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
const [hover, setHover] = useState(0);
return (
<div className="star-rating">
{[1,2,3,4,5].map(s => (
<span key={s}
className={s <= (hover || value) ? "star active" : "star"}
onMouseEnter={() => setHover(s)}
onMouseLeave={() => setHover(0)}
onClick={() => onChange && onChange(s)}
>★</span>
))}
</div>
);
}
const CURATED_COURSES = [
{
id: 1,
title: "Python Fundamentals",
description: "Learn Python basics, variables, loops, functions, and simple projects.",
rating: 4.8,
level: "Beginner",
resources: {
Beginner: {
study_material: "Python syntax, variables, conditionals, loops, functions",
learning_path: "Start with Python basics and build one mini project",
pdf: "https://docs.python.org/3/tutorial/",
reference: "https://www.w3schools.com/python/"
},
Intermediate: {
study_material: "File handling, modules, error handling, OOP basics",
learning_path: "Move to intermediate topics and automate small tasks",
pdf: "https://python.swaroopch.com/",
reference: "https://realpython.com/"
},
Advanced: {
study_material: "Async programming, decorators, generators, testing",
learning_path: "Build APIs and work on production-ready Python projects",
pdf: "https://docs.python.org/3/library/",
reference: "https://docs.python.org/3/howto/"
}
}
},
{
id: 2,
title: "Web Development",
description: "Create responsive websites with HTML, CSS, JavaScript, and React.",
rating: 4.7,
level: "Beginner",
resources: {
Beginner: {
study_material: "HTML, CSS, basic JavaScript, responsive layouts",
learning_path: "Create a landing page and a portfolio site",
pdf: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web",
reference: "https://developer.mozilla.org/en-US/docs/Web"
},
Intermediate: {
study_material: "React components, state, hooks, APIs",
learning_path: "Build a small dashboard app with reusable components",
pdf: "https://react.dev/learn",
reference: "https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks/React_getting_started"
},
Advanced: {
study_material: "Performance, routing, state management, testing",
learning_path: "Build scalable UI systems and production apps",
pdf: "https://react.dev/reference",
reference: "https://nextjs.org/docs"
}
}
},
{
id: 3,
title: "Java Programming",
description: "Master Java syntax, OOP, collections, and core backend concepts.",
rating: 4.6,
level: "Intermediate",
resources: {
Beginner: {
study_material: "Variables, classes, methods, loops, conditionals",
learning_path: "Practice Java basics and simple console programs",
pdf: "https://docs.oracle.com/javase/tutorial/",
reference: "https://www.w3schools.com/java/"
},
Intermediate: {
study_material: "Collections, exceptions, file I/O, inheritance",
learning_path: "Build a small inventory or student management app",
pdf: "https://www.tutorialspoint.com/java/java_tutorial.pdf",
reference: "https://www.baeldung.com/java"
},
Advanced: {
study_material: "Multithreading, streams, design patterns, JVM tuning",
learning_path: "Create enterprise-style Java applications",
pdf: "https://docs.oracle.com/javase/8/docs/technotes/guides/concurrency/",
reference: "https://www.oracle.com/java/"
}
}
},
{
id: 4,
title: "Artificial Intelligence",
description: "Explore AI foundations, machine learning basics, and practical models.",
rating: 4.9,
level: "Intermediate",
resources: {
Beginner: {
study_material: "AI concepts, search algorithms, basic problem solving",
learning_path: "Learn AI fundamentals and simple intelligent systems",
pdf: "https://stanford.edu/~shervine/teaching/cs221/",
reference: "https://www.coursera.org/learn/ai-for-everyone"
},
Intermediate: {
study_material: "Supervised learning, evaluation metrics, feature engineering",
learning_path: "Train simple models and compare performance",
pdf: "https://www.cs.ox.ac.uk/people/nando.defreitas/machinelearning/",
reference: "https://scikit-learn.org/stable/"
},
Advanced: {
study_material: "Deep learning, neural networks, transformers",
learning_path: "Build modern AI systems and advanced experiments",
pdf: "https://www.deeplearningbook.org/",
reference: "https://pytorch.org/tutorials/"
}
}
},
{
id: 5,
title: "Machine Learning",
description: "Understand supervised learning, regression, classification, and model deployment.",
rating: 4.8,
level: "Advanced",
resources: {
Beginner: {
study_material: "Basic statistics, data preprocessing, simple models",
learning_path: "Start with data understanding and beginner notebooks",
pdf: "https://www.cs.cmu.edu/~tom/mlbook.html",
reference: "https://www.kaggle.com/learn"
},
Intermediate: {
study_material: "Regression, classification, clustering, model validation",
learning_path: "Train and validate models on real datasets",
pdf: "https://www.statlearning.com/",
reference: "https://www.analyticsvidhya.com/"
},
Advanced: {
study_material: "Ensemble methods, optimization, deployment pipelines",
learning_path: "Work on end-to-end ML projects and MLOps basics",
pdf: "https://www.deeplearningbook.org/",
reference: "https://huggingface.co/learn"
}
}
}
];
// ── Course Card ───────────────────────────────────────────────────────────────
const getCourseEnrollmentKeys = (course, level) => [
`${course?.id || course?.title || ""}-${level.toLowerCase()}`,
`${course?.title || ""}-${level.toLowerCase()}`,
].filter(Boolean);
function CourseCard({ course, onFeedback, onOpenLearningPath, enrolledCoursesLevelMap, onEnrollSuccess }) {
const { user } = useAuth();
const { showToast } = useToast();
const navigate = useNavigate();
const stars = Math.min(5, Math.round(course.rating || 4));

  const [selectedLevel, setSelectedLevel] = useState("Beginner");
  const [showResources, setShowResources] = useState(false);
  const [enrolledLevelState, setEnrolledLevelState] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!enrolledCoursesLevelMap) return;
    const title = course?.title || "";
    const enrolledKey = Object.keys(enrolledCoursesLevelMap).find(key => 
      key.startsWith(title) || 
      key === String(course.id) || 
      key.startsWith(`${course.id}-`)
    );
    if (enrolledKey) {
      const lowerKey = enrolledKey.toLowerCase();
      let level = "Beginner";
      if (lowerKey.includes("intermediate")) level = "Intermediate";
      else if (lowerKey.includes("advanced")) level = "Advanced";
      else {
        const val = enrolledCoursesLevelMap[enrolledKey];
        if (val) {
          level = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        }
      }
      setSelectedLevel(level);
    } else if (course.level) {
      const nativeLevel = course.level.charAt(0).toUpperCase() + course.level.slice(1).toLowerCase();
      setSelectedLevel(nativeLevel);
    }
  }, [enrolledCoursesLevelMap, course?.title, course?.id, course.level]);

  const levelKeys = [
    `${course?.id || ""}-${selectedLevel.toLowerCase()}`,
    `${course?.title || ""}-${selectedLevel.toLowerCase()}`,
    `${course?.title} (${selectedLevel})`,
  ].filter(Boolean);
  const baseKeys = [
    String(course?.id || ""),
    course?.title,
  ].filter(Boolean);

  const courseKeys = [
    ...levelKeys,
    ...baseKeys,
  ];

  const isEnrolled = enrolledCoursesLevelMap && (
    levelKeys.some((key) => key in enrolledCoursesLevelMap) ||
    baseKeys.some((key) => key in enrolledCoursesLevelMap)
  );

const handleEnroll = async () => {
if (isEnrolled || isSubmitting) {
return;
}
let enrolledSuccessfully = false;
const enrollTitle = `${course.title} (${selectedLevel})`;
const enrollId = `${course.id || course.title}-${selectedLevel.toLowerCase()}`;
if (user?.user_id) {
setIsSubmitting(true);
try {
await enrollCourse({
user_id: user.user_id,
course_id: enrollId,
course_title: enrollTitle,
skill_level: selectedLevel.toLowerCase(),
});
enrolledSuccessfully = true;
} catch (err) {
  if (err?.response?.data?.detail === "Already enrolled in this course") {
    enrolledSuccessfully = true;
  } else {
    console.error("Failed to enroll in course:", err);
    showToast(getErrorMessage(err, "Failed to enroll in course"), "error");
    setIsSubmitting(false);
    return;
  }
} finally {
setIsSubmitting(false);
}
} else {
enrolledSuccessfully = true;
}
if (enrolledSuccessfully) {
window.dispatchEvent(new CustomEvent("progressUpdated", {
detail: { courseTitle: enrollTitle, reason: "enrolled" },
}));
onEnrollSuccess?.(courseKeys, selectedLevel);
setEnrolledLevelState(selectedLevel);
setShowResources(true);
if (onOpenLearningPath) {
onOpenLearningPath(enrollTitle);
} else {
navigate(`/study-materials?course=${encodeURIComponent(enrollTitle)}`);
}
}
};
const handleLevelChange = (e) => {
setSelectedLevel(e.target.value);
};
const resources = course.resources?.[selectedLevel] || course.resources?.Beginner;
return (
<div className="course-card">
<div className="course-level-badge">{course.level || "All Levels"}</div>
<h3 className="course-title">{course.title}</h3>
<p className="course-desc">{course.description || "Explore this course to advance your skills."}</p>
<div className="course-footer">
<div className="course-rating">
{"★".repeat(stars)}{"☆".repeat(5 - stars)}
<span className="rating-num"> {(course.rating || 4.2).toFixed(1)}</span>
</div>
<div className="course-actions" style={{ gap: "8px", flexWrap: "wrap" }}>
<select
value={selectedLevel}
onChange={handleLevelChange}
disabled={isSubmitting}
style={{ padding: "6px 8px", borderRadius: "8px", border: "1px solid #d0d7de" }}
>
<option value="Beginner">Beginner</option>
<option value="Intermediate">Intermediate</option>
<option value="Advanced">Advanced</option>
</select>
<button className="btn-enroll" onClick={handleEnroll} disabled={isEnrolled || isSubmitting}>
{isSubmitting ? "Enrolling..." : isEnrolled ? "Enrolled" : "Enroll"}
</button>
{isEnrolled && onOpenLearningPath && (
<button className="btn-review" onClick={() => onOpenLearningPath(`${course.title} (${selectedLevel})`)}>
Open Learning Path
</button>
)}
<button className="btn-review" onClick={() => onFeedback && onFeedback(course.title)}>
Review
</button>
</div>
</div>
{(showResources || isEnrolled) && (
<div style={{ marginTop: "12px", padding: "8px 12px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: 700, fontSize: "0.85rem", display: "inline-block" }}>
  ✓ Enrolled Level: {selectedLevel}
</div>
)}
</div>
);
}
function OverviewTab({ user, stats, setTab, courseProgress, onOpenLearningPath, setCourseProgress }) {
const navigate = useNavigate();
const { showToast } = useToast();
const [userProfile, setUserProfile] = useState({ skill_level: 'Beginner', interests: [] });
const [weeklyActivity, setWeeklyActivity] = useState([]);
const [monthlyActivity, setMonthlyActivity] = useState([]);
const [quizScores, setQuizScores] = useState([]);
const [refreshing, setRefreshing] = useState(false);
const [recommendedCourses, setRecommendedCourses] = useState([]);
const [loadingRecommendations, setLoadingRecommendations] = useState(false);

const handleEnrollRecommendation = async (recCourse) => {
  const level = recCourse.level.charAt(0).toUpperCase() + recCourse.level.slice(1);
  const enrollTitle = `${recCourse.title} (${level})`;
  const enrollId = `${recCourse.id || recCourse.title}-${recCourse.level}`;
  try {
    await enrollCourse({
      user_id: user.user_id,
      course_id: enrollId,
      course_title: enrollTitle,
      skill_level: recCourse.level,
    });
    window.dispatchEvent(new CustomEvent("progressUpdated", {
      detail: { courseTitle: enrollTitle, reason: "enrolled" },
    }));
    showToast(`Successfully enrolled in ${enrollTitle}!`, "success");
    // Reload my courses in parent dashboard and open learning path
    if (onOpenLearningPath) {
      onOpenLearningPath(enrollTitle);
    } else {
      navigate(`/study-materials?course=${encodeURIComponent(enrollTitle)}`);
    }
  } catch (err) {
    if (err?.response?.data?.detail === "Already enrolled in this course") {
      if (onOpenLearningPath) {
        onOpenLearningPath(enrollTitle);
      } else {
        navigate(`/study-materials?course=${encodeURIComponent(enrollTitle)}`);
      }
    } else {
      showToast(getErrorMessage(err, "Failed to enroll in recommended course"), "error");
    }
  }
};

const loadAnalytics = useCallback(async () => {
if (!user?.user_id) return;
const base = "http://127.0.0.1:8000";
// Run independently so one endpoint failing doesn't blank out data the
// other two successfully returned (previously a single Promise.all
// meant any one failure reset weekly, monthly, AND quiz scores to []).
try {
const weekly = await axios.get(`${base}/analytics/${user.user_id}/weekly-activity`);
setWeeklyActivity(weekly.data.weekly_data || []);
} catch {
setWeeklyActivity([]);
}
try {
const monthly = await axios.get(`${base}/analytics/${user.user_id}/monthly-activity`);
setMonthlyActivity(monthly.data.monthly_data || []);
} catch {
setMonthlyActivity([]);
}
try {
const scores = await axios.get(`${base}/analytics/${user.user_id}/quiz-score-trend`);
setQuizScores(scores.data.chart_data || []);
} catch {
setQuizScores([]);
}
}, [user?.user_id]);

useEffect(() => {
  if (!user?.user_id) return;
  setLoadingRecommendations(true);
  getSkillBasedRecommendations(user.user_id, user.skill_level || 'beginner', user.interests || [])
    .then((data) => {
      setRecommendedCourses(data.recommendations || []);
    })
    .catch((err) => {
      console.error("Failed to load skill-based recommendations:", err);
      setRecommendedCourses([]);
    })
    .finally(() => {
      setLoadingRecommendations(false);
    });
}, [user?.user_id, user?.skill_level, user?.interests]);

const handleRefreshData = async () => {
if (!user?.user_id) return;
setRefreshing(true);
try {
await refreshLearningPaths(user.user_id, "python");
// Reload progress data
const progressData = await getAllProgress(user.user_id, { recompute: true });
if (setCourseProgress) {
setCourseProgress(progressData);
}
await loadAnalytics();
showToast("Data refreshed successfully!", "success");
} catch (err) {
console.error("Refresh failed:", err);
showToast("Failed to refresh data. Please try again.", "error");
} finally {
setRefreshing(false);
}
};
useEffect(() => {
setUserProfile({
skill_level: user?.skill_level || 'Beginner',
interests: user?.interests || ['Python', 'Web Development', 'AI']
});
}, [user]);
useEffect(() => {
loadAnalytics();
}, [loadAnalytics]);
useEffect(() => {
if (!user?.user_id) return;
const handler = () => {
loadAnalytics();
};
window.addEventListener("progressUpdated", handler);
return () => window.removeEventListener("progressUpdated", handler);
}, [user?.user_id, loadAnalytics]);
const summaryCards = [
  {
    color: "blue",
    icon: <BookOpen size={24} strokeWidth={2} />,
    value: courseProgress?.total_courses_enrolled || 0,
    label: "Enrolled Courses",
  },
  {
    color: "green",
    icon: <TrendingUp size={24} strokeWidth={2} />,
    value: `${courseProgress?.average_progress || 0}%`,
    label: "Average Progress",
  },
  {
    color: "purple",
    icon: <ClipboardCheck size={24} strokeWidth={2} />,
    value: courseProgress?.assessments_completed || 0,
    label: "Assessments Passed",
  },
  {
    color: "orange",
    icon: <Award size={24} strokeWidth={2} />,
    value: courseProgress?.courses_completed || 0,
    label: "Courses Completed",
  },
];
const quickActions = [
  { icon: <BookOpen size={20} strokeWidth={2} />, label: "Search Courses", tab: "courses" },
  { icon: <Route size={20} strokeWidth={2} />, label: "Learning Path", tab: "path" },
  { icon: <TrendingUp size={20} strokeWidth={2} />, label: "View Progress", path: "/progress" },
  { icon: <MessageSquare size={20} strokeWidth={2} />, label: "Ask AI", tab: "ai" },
];
const resourceActions = [
  { icon: <BookOpen size={20} strokeWidth={2} />, label: "Study Material", path: "/study-materials" },
  { icon: <PlayCircle size={20} strokeWidth={2} />, label: "Video", path: "/study-materials?type=video" },
];
return (
<div className="tab-content">
<div className="welcome-banner">
<div>
<h2>Welcome back, {user?.name}! 👋</h2>
<p>Ready to continue your learning journey?</p>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
<button
onClick={handleRefreshData}
disabled={refreshing}
style={{
padding: "0.5rem 1rem",
background: "rgba(255,255,255,0.2)",
border: "1px solid rgba(255,255,255,0.3)",
borderRadius: "8px",
color: "white",
cursor: refreshing ? "not-allowed" : "pointer",
fontSize: "0.85rem",
fontWeight: 600,
transition: "all 0.2s",
}}
>
{refreshing ? "Refreshing..." : <><RefreshCw size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Refresh Data</>}
</button>
<div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
</div>
</div>
{/* User Profile Section */}
<div className="profile-section">
<div className="profile-card">
<h3><UserCircle size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Your Profile</h3>
<div className="profile-details">
<div className="profile-item">
<span className="profile-label">Skill Level:</span>
<span className="profile-value badge-skill">{userProfile.skill_level}</span>
</div>
<div className="profile-item">
<span className="profile-label">Interests:</span>
<div className="interests-chips">
{userProfile.interests.map((interest, i) => (
<span key={i} className="interest-chip">{interest}</span>
))}
</div>
</div>
</div>
</div>
</div>
<div className="stats-grid">
{summaryCards.map((card) => (
<div key={card.label} className={`stat-card ${card.color}`}>
<div className="stat-icon">{card.icon}</div>
<div className="stat-val">{card.value}</div>
<div className="stat-lbl">{card.label}</div>
</div>
))}
</div>

            <div className="recommendations-card" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3><Zap size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle", color: "#f59e0b" }} /> Personalized Recommendations</h3>
                <button className="btn-enroll" onClick={() => setTab('courses')}>Explore</button>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "-6px 0 1rem" }}>
                Courses personalized based on your skill level ({userProfile.skill_level}) and interests ({userProfile.interests.join(", ")})
              </p>
              {loadingRecommendations ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                  <RefreshCw size={24} className="inline-icon spin" style={{ display: "block", margin: "0 auto 8px" }} />
                  Loading recommendations...
                </div>
              ) : recommendedCourses.length > 0 ? (
                <div className="assessments-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", border: "none", marginTop: "1rem" }}>
                  {recommendedCourses.map((rec) => (
                    <div key={rec.id} className="assessment-item" style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "1rem",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                        <span className="step-tag primary" style={{ margin: 0, textTransform: "capitalize" }}>{rec.level}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>{rec.category}</span>
                      </div>
                      <div className="assessment-info" style={{ width: "100%", flex: "none", display: "block" }}>
                        <div className="assessment-name" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--dark)" }}>{rec.title}</div>
                        <div className="assessment-date" style={{ marginTop: "4px" }}>Recommended study path for you.</div>
                      </div>
                      <button
                        className="btn-enroll"
                        onClick={() => handleEnrollRecommendation(rec)}
                        style={{ width: "100%", marginTop: "0.5rem", display: "flex", justifyContent: "center", alignItems: "center", padding: "8px" }}
                      >
                        Enroll & Learn →
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                  <Compass size={24} style={{ display: "block", margin: "0 auto 8px", color: "var(--muted)" }} />
                  <p>You have enrolled in all recommended courses for your profile! Browse courses to find more topics.</p>
                </div>
              )}
            </div>
{/* Enrolled Courses Progress */}
{courseProgress?.courses && courseProgress.courses.length > 0 && (
<div className="recommendations-card" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
<h3><TrendingUp size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> My Enrolled Courses Progress</h3>
<button className="btn-enroll" onClick={() => navigate('/progress')}>View Full Progress</button>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
{courseProgress.courses.map((course) => (
<div
key={course.id}
style={{
background: "var(--bg)",
border: "1px solid var(--border)",
borderRadius: "12px",
padding: "1rem",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
}}
>
<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, paddingRight: "0.5rem" }}>
<div style={{ fontFamily: "Sora, sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--dark)" }}>
{course.course_title}
</div>
<span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
{course.completed ? <><Award size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> Completed</> : `${course.progress_percentage ?? 0}% complete`}
</span>
<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
<button
  className="nav-btn"
  style={{
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
    background: "none",
    border: "1px solid var(--primary)",
    color: "var(--primary)",
    borderRadius: "8px",
    cursor: "pointer"
  }}
  onClick={() =>
    onOpenLearningPath && onOpenLearningPath(course.course_title)
  }
>
Open Path
</button>
<button
className="nav-btn"
style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "none", border: "1px solid var(--primary)", color: "var(--primary)" }}
onClick={() => navigate(`/assessment?course=${encodeURIComponent(course.course_title)}`)}
>
Test
</button>
</div>
</div>
<div style={{ width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
<ProgressBar percentage={course.progress_percentage} size={55} color={course.completed ? "var(--success)" : "var(--primary)"} />
</div>
</div>
))}
</div>
</div>
)}
{/* Weekly Activity Chart */}
<div className="recommendations-card" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
<h3><BarChart3 size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Weekly Learning Activity</h3>
<p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
Searches + quizzes + videos watched per day (last 7 days)
</p>
{weeklyActivity.length > 0 && !weeklyActivity.every(w => w.total === 0) ? (
<div style={{
display: "flex",
alignItems: "flex-end",
justifyContent: "space-around",
height: "120px",
gap: "8px",
padding: "0 8px",
}}>
{weeklyActivity.map((d, i) => {
const maxVal = Math.max(1, ...weeklyActivity.map(w => w.total));
const barH = d.total === 0 ? 4 : Math.max(8, Math.round((d.total / maxVal) * 100));
return (
<div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
{d.total > 0 && (
<div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "2px" }}>{d.total}</div>
)}
<div
style={{
width: "100%",
height: `${barH}px`,
background: d.total === 0 ? "var(--border)" : "linear-gradient(180deg, #6366f1, #4f46e5)",
borderRadius: "6px 6px 0 0",
transition: "height 0.3s ease",
}}
/>
<div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px" }}>{d.day}</div>
</div>
);
})}
</div>
) : (
<div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
No activity in the last 7 days. Start learning to see your progress!
</div>
)}
</div>
{/* Quiz Score Trend */}
<div className="recommendations-card" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
<h3><TrendingUp size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Quiz Score Trend</h3>
{quizScores.length > 0 ? (
<div style={{ overflowX: "auto", paddingBottom: "0.75rem" }}>
<div style={{
display: "flex",
alignItems: "flex-end",
gap: "12px",
height: "115px",
padding: "0 8px",
marginBottom: "8px",
minWidth: `${Math.max(300, quizScores.length * 48)}px`
}}>
{quizScores.map((q, i) => (
<div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 36px" }}>
<div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "3px" }}>{q.score}%</div>
<div style={{
width: "100%",
height: `${Math.max(4, q.score)}px`,
background: q.passed ? "linear-gradient(180deg, #10b981, #34d399)" : "linear-gradient(180deg, #ef4444, #f87171)",
borderRadius: "4px 4px 0 0",
minHeight: "4px",
transition: "height 0.3s",
}}/>
</div>
))}
</div>
</div>
) : (
<div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
No quizzes taken yet. Take a quiz to see your score trend!
</div>
)}
</div>
{/* Monthly Activity Chart */}
<div className="recommendations-card" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
<h3><BarChart3 size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Monthly Learning Activity</h3>
<p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
Daily activity counts for the last 30 days
</p>
{monthlyActivity.length > 0 && !monthlyActivity.every(m => m.total === 0) ? (
<div style={{ overflowX: "auto", paddingBottom: "0.75rem" }}>
<div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "120px", minWidth: "720px" }}>
{monthlyActivity.map((d, i) => {
const maxVal = Math.max(1, ...monthlyActivity.map(m => m.total));
const barH = d.total === 0 ? 4 : Math.max(4, Math.round((d.total / maxVal) * 100));
return (
<div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px" }}>
{d.total > 0 && (
<div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "2px" }}>{d.total}</div>
)}
<div style={{
width: "100%",
height: `${barH}px`,
background: d.total === 0 ? "var(--border)" : "linear-gradient(180deg, #818cf8, #4f46e5)",
borderRadius: "6px 6px 0 0",
transition: "height 0.3s ease",
}} />
<div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "4px", textAlign: "center", lineHeight: 1.2 }}>
{d.day.replace(/^[A-Za-z]{3} /, "")}
</div>
</div>
);
})}
</div>
</div>
) : (
<div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
No activity in the last 30 days. Start learning to see your progress!
</div>
)}
</div>
{/* Certificates Section */}
<div className="recommendations-card" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
<h3><Award size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Your Certificates</h3>
<button className="nav-btn" onClick={() => navigate("/certificate")} style={{ padding: "0.5rem 1rem", background: "var(--primary)", color: "white", border: "none", borderRadius: "8px" }}>
View All
</button>
</div>
{courseProgress?.courses && courseProgress.courses.filter(c => c.completed).length > 0 ? (
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
{courseProgress.courses.filter(c => c.completed).slice(0, 3).map((course) => (
<div
key={course.id}
style={{
background: "linear-gradient(135deg, #fef3c7, #fde68a)",
border: "2px solid #f59e0b",
borderRadius: "12px",
padding: "1.25rem",
display: "flex",
flexDirection: "column",
gap: "0.5rem",
}}
>
<div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem", color: "#f59e0b" }}><Award size={32} /></div>
<div style={{ fontFamily: "Sora, sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--dark)", textAlign: "center" }}>
{course.course_title}
</div>
<div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", fontWeight: 600 }}>
Course Completed
</div>
<button
className="nav-btn"
onClick={() => navigate("/certificate")}
style={{
padding: "0.5rem",
background: "#f59e0b",
color: "white",
border: "none",
borderRadius: "8px",
fontSize: "0.8rem",
fontWeight: 600,
cursor: "pointer",
}}
>
View Certificate
</button>
</div>
))}
</div>
) : (
<div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
<div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem", color: "var(--muted)" }}><Award size={32} /></div>
<p>No certificates earned yet. Complete a course to earn your first certificate!</p>
</div>
)}
</div>

<div className="quick-actions">
<h3>Quick Access</h3>
<div className="qa-grid">
{quickActions.map(a => (
<button
key={a.tab || a.path}
className="qa-card"
onClick={() => a.path ? navigate(a.path) : setTab(a.tab)}
>
<span className="qa-icon">{a.icon}</span>
<span>{a.label}</span>
</button>
))}
</div>
</div>
<div className="quick-actions">
<h3>Resources</h3>
<div className="qa-grid">
{resourceActions.map((action) => (
<button
key={action.label}
className="qa-card"
onClick={() => navigate(action.path)}
>
<span className="qa-icon">{action.icon}</span>
<span>{action.label}</span>
</button>
))}
</div>
</div>
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB: COURSES
// ─────────────────────────────────────────────────────────────────────────────
function CoursesTab({ user, onFeedback, onOpenLearningPath }) {
const [query, setQuery] = useState("");
const [results, setResults] = useState([]);
const [popular, setPopular] = useState([]);
const [loading, setLoading] = useState(false);
const [searched, setSearched] = useState(false);
const [selectedLevel, setSelectedLevel] = useState("All");
const [enrolledCoursesLevelMap, setEnrolledCoursesLevelMap] = useState({});
useEffect(() => {
setPopular(CURATED_COURSES);
}, []);
useEffect(() => {
const loadEnrolledCourses = async () => {
if (!user?.user_id) {
setEnrolledCoursesLevelMap({});
return;
}
try {
const data = await getMyCourses(user.user_id);
const levelMap = {};
(data?.enrollments || []).forEach((enrollment) => {
if (enrollment?.course_id) {
levelMap[String(enrollment.course_id)] = enrollment.skill_level;
}
if (enrollment?.course_title) {
levelMap[String(enrollment.course_title)] = enrollment.skill_level;
}
});
setEnrolledCoursesLevelMap(levelMap);
} catch (err) {
console.error("Failed to load enrolled courses:", err);
setEnrolledCoursesLevelMap({});
}
};
loadEnrolledCourses();
}, [user?.user_id]);
const handleEnrollSuccess = useCallback((courseKeys, level) => {
setEnrolledCoursesLevelMap((prev) => {
const next = { ...prev };
courseKeys.forEach((key) => { next[key] = level.toLowerCase(); });
return next;
});
}, []);
const search = async () => {
if (!query.trim()) return;
setLoading(true); setSearched(true);
try {
const d = await getRecommendations(query, user?.user_id);
setResults(d.recommendations || []);
try {
window.dispatchEvent(new CustomEvent("progressUpdated", {
detail: { userId: user?.user_id, courseTitle: query }
}));
} catch (e) {
// ignore in non-browser/test environments
}
} catch { setResults([]); }
finally { setLoading(false); }
};
const normalizeLevel = (level) => `${level || "All Levels"}`.toLowerCase();
const coursePool = searched ? results : popular;
const displayCourses = coursePool.filter((course) => {
if (selectedLevel === "All") return true;
return normalizeLevel(course.level) === selectedLevel.toLowerCase();
});
return (
<div className="tab-content">
<div className="section-header">
<h2><BookOpen size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Course Explorer</h2>
<p>Search any topic and get AI-powered recommendations</p>
</div>
<div className="search-bar">
<input value={query} onChange={e => setQuery(e.target.value)}
onKeyDown={e => e.key === "Enter" && search()}
placeholder="e.g. Python, Machine Learning, React..."
className="search-input" />
<button onClick={search} className="search-btn" disabled={loading}>
{loading ? "Searching..." : <><Search size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> Search</>}
</button>
{searched && (
<button className="clear-btn"
onClick={() => { setSearched(false); setResults([]); setQuery(""); setSelectedLevel("All"); }}>
Clear
</button>
)}
</div>
<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
<label style={{ fontWeight: 600 }}>Level</label>
<select
value={selectedLevel}
onChange={(e) => setSelectedLevel(e.target.value)}
style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d9d9d9" }}
>
<option value="All">All Levels</option>
<option value="Beginner">Beginner</option>
<option value="Intermediate">Intermediate</option>
<option value="Advanced">Advanced</option>
</select>
</div>
{!loading && displayCourses.length === 0 && (
<div className="no-results">
{searched
? `No courses found for "${query}" in the selected level.`
: "No courses found for the selected level."}
</div>
)}
<div className="courses-section-title">
{searched ? `Results for "${query}" (${displayCourses.length})` : `Popular Courses (${displayCourses.length})`}
</div>
<div className="courses-grid">
{displayCourses.map((c, i) => (
<CourseCard
key={i}
course={c}
onFeedback={onFeedback}
onOpenLearningPath={onOpenLearningPath}
enrolledCoursesLevelMap={enrolledCoursesLevelMap}
onEnrollSuccess={handleEnrollSuccess}
/>
))}
</div>
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB: LEARNING PATH
// ─────────────────────────────────────────────────────────────────────────────
const PATH_TOPICS = ["Python", "Web Development", "Data Science", "Machine Learning"];
const PATH_STAGES = ["Foundation", "Core Concepts", "Guided Practice", "Project Stage"];
const getPathStage = (index, total) => {
if (total <= 1) return PATH_STAGES[0];
const ratio = index / Math.max(total - 1, 1);
if (ratio < 0.25) return PATH_STAGES[0];
if (ratio < 0.5) return PATH_STAGES[1];
if (ratio < 0.8) return PATH_STAGES[2];
return PATH_STAGES[3];
};
const estimatePathTime = (steps = []) => {
let weeks = 0;
let hours = 0;
steps.forEach((step) => {
const raw = `${step?.duration || ""}`.toLowerCase();
const value = Number(raw.match(/(\d+(\.\d+)?)/)?.[1] || 0);
if (!value) return;
if (raw.includes("week")) weeks += value;
else if (raw.includes("hour")) hours += value;
else if (raw.includes("day")) hours += value * 2;
});
const parts = [];
if (weeks) parts.push(`${weeks} week${weeks === 1 ? "" : "s"}`);
if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
return parts.length ? parts.join(" • ") : "Self-paced";
};
const getDocsUrlForTopic = (topic = "") => {
const normalized = topic.toLowerCase();
if (normalized.includes("python")) return "https://docs.python.org/3/tutorial/";
if (normalized.includes("web") || normalized.includes("javascript")) return "https://developer.mozilla.org/en-US/docs/Learn";
if (normalized.includes("react")) return "https://react.dev/learn";
if (normalized.includes("data science")) return "https://www.kaggle.com/learn";
if (normalized.includes("machine learning")) return "https://scikit-learn.org/stable/";
if (normalized.includes("ai") || normalized.includes("artificial intelligence")) return "https://developers.google.com/machine-learning/crash-course";
return `https://www.google.com/search?q=${encodeURIComponent(`${topic} documentation`)}`;
};
const getStepFocus = (topic, step, index, total) => {
const stage = getPathStage(index, total);
if (stage === "Foundation") return `Understand the basics of ${topic} and build confidence with the core ideas in ${step.title}.`;
if (stage === "Core Concepts") return `Strengthen your knowledge with structured theory and examples before moving into practice.`;
if (stage === "Guided Practice") return `Spend this stage on hands-on work, short exercises, and revision using study material and videos.`;
return `Finish with projects, review, and assessment so this topic becomes part of your real learning path.`;
};
const getNormalizedSkillLevel = (skillLevel = "Beginner") => `${skillLevel}`.toLowerCase();
const buildStepVideoSearchUrl = (topic = "", stepTitle = "", skillLevel = "beginner") =>
`https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} ${stepTitle} ${skillLevel} tutorial`)}`;
const getYouTubeVideoId = (url = "") => {
const match = `${url}`.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
return match?.[1] || "";
};
const getYouTubeThumbnail = (url = "") => {
const videoId = getYouTubeVideoId(url);
return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
};
let youtubeIframeApiPromise = null;
const loadYouTubeIframeApi = () => {
if (window.YT?.Player) {
return Promise.resolve(window.YT);
}
if (youtubeIframeApiPromise) {
return youtubeIframeApiPromise;
}
youtubeIframeApiPromise = new Promise((resolve) => {
const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
if (!existingScript) {
const script = document.createElement("script");
script.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(script);
}
const previousReady = window.onYouTubeIframeAPIReady;
window.onYouTubeIframeAPIReady = () => {
previousReady?.();
resolve(window.YT);
};
});
return youtubeIframeApiPromise;
};
const getRecommendedPathVideo = (videos = [], index = 0, total = 1) => {
if (!videos.length) return null;
if (videos.length === 1) return videos[0];
const slot = Math.min(
videos.length - 1,
Math.floor((index / Math.max(total, 1)) * videos.length)
);
return videos[slot];
};
const normalizePathTopicKey = (topic = "") => {
const normalized = `${topic}`.toLowerCase();
if (normalized.includes("python")) return "python";
if (normalized.includes("web") || normalized.includes("react") || normalized.includes("javascript")) return "web development";
if (normalized.includes("machine learning")) return "machine learning";
if (normalized.includes("artificial intelligence") || normalized.includes(" ai")) return "artificial intelligence";
if (normalized.includes("data science")) return "data science";
if (normalized.includes("java")) return "java";
return "general";
};
const STEP_VIDEO_MATCHERS = {
python: [
{ match: ["intro", "introduction", "basic", "syntax", "variable"], title: "Python Full Course for Beginners", url: "https://www.youtube.com/watch?v=rfscVS0vtbw" },
{ match: ["function", "module", "structure", "data"], title: "Python Data Structures Tutorial", url: "https://www.youtube.com/watch?v=W8KRzmhs640" },
{ match: ["oop", "class", "object"], title: "Python OOP Tutorial", url: "https://www.youtube.com/watch?v=JeznW_7DlB0" },
{ match: ["file", "exception", "error", "science", "pandas"], title: "Python for Data Science", url: "https://www.youtube.com/watch?v=GPVsHOlRBBI" },
{ match: ["project", "build", "machine"], title: "Machine Learning Tutorial", url: "https://www.youtube.com/watch?v=NWONeJKn6kc" },
],
"web development": [
{ match: ["html", "css", "intro", "basic"], title: "HTML CSS JavaScript Course", url: "https://www.youtube.com/watch?v=nu_pCVPKzTk" },
{ match: ["javascript", "js"], title: "JavaScript Full Course", url: "https://www.youtube.com/watch?v=PkZNo7MFNFg" },
{ match: ["react", "component", "hook"], title: "React JS Full Course", url: "https://www.youtube.com/watch?v=RVFAyFWO4go" },
{ match: ["api", "backend", "node", "express"], title: "Node.js and Express Tutorial", url: "https://www.youtube.com/watch?v=Oe421EPjeBE" },
{ match: ["deploy", "performance", "advanced", "full stack"], title: "Advanced Web Development", url: "https://www.youtube.com/watch?v=wm5gMKuwSYk" },
],
"machine learning": [
{ match: ["intro", "basic", "foundation"], title: "Machine Learning Full Course for Beginners", url: "https://www.youtube.com/watch?v=GwIo3gDZCVQ" },
{ match: ["regression", "classification", "supervised"], title: "Machine Learning Tutorial", url: "https://www.youtube.com/watch?v=7eh4d6sabA0" },
{ match: ["evaluation", "metric", "validation", "feature"], title: "Practical Machine Learning", url: "https://www.youtube.com/watch?v=nKW8Ndu7Mjw" },
{ match: ["neural", "deep", "advanced"], title: "Advanced Machine Learning", url: "https://www.youtube.com/watch?v=IHZwWFHWa5w" },
{ match: ["project", "deployment", "mlops"], title: "End-to-End Machine Learning Project", url: "https://www.youtube.com/watch?v=i_LwzRVP7bg" },
],
"artificial intelligence": [
{ match: ["intro", "basic", "foundation"], title: "Artificial Intelligence Full Course", url: "https://www.youtube.com/watch?v=JMUxmLyrhSk" },
{ match: ["search", "problem", "logic"], title: "AI For Beginners", url: "https://www.youtube.com/watch?v=ad79nYk2keg" },
{ match: ["neural", "network"], title: "Neural Networks Explained", url: "https://www.youtube.com/watch?v=aircAruvnKk" },
{ match: ["transformer", "llm", "advanced"], title: "Transformers Architecture", url: "https://www.youtube.com/watch?v=kCc8FmEb1nY" },
{ match: ["project", "application"], title: "Advanced AI Techniques", url: "https://www.youtube.com/watch?v=QH15-F9w9ng" },
],
"data science": [
{ match: ["intro", "basic", "python"], title: "Data Science Full Course for Beginners", url: "https://www.youtube.com/watch?v=ua-CiDNNj30" },
{ match: ["numpy", "pandas", "cleaning"], title: "Pandas Tutorial", url: "https://www.youtube.com/watch?v=vmEHCJofslg" },
{ match: ["visualization", "matplotlib", "seaborn"], title: "Data Visualization with Python", url: "https://www.youtube.com/watch?v=a9UrKTVEeZA" },
{ match: ["analysis", "statistics", "intermediate"], title: "Data Analysis with Python", url: "https://www.youtube.com/watch?v=r-uOLxNrNk8" },
{ match: ["project", "dashboard", "advanced"], title: "Data Science Project Tutorial", url: "https://www.youtube.com/watch?v=xC-c7E5PK0Y" },
],
java: [
{ match: ["intro", "basic", "syntax"], title: "Java Full Course for Beginners", url: "https://www.youtube.com/watch?v=eIrMbAQSU34" },
{ match: ["oop", "class", "object"], title: "Java Programming Tutorial", url: "https://www.youtube.com/watch?v=BGTx91t8q50" },
{ match: ["collection", "stream", "intermediate"], title: "Java Collections Framework", url: "https://www.youtube.com/watch?v=1NJmuPq3S1o" },
{ match: ["thread", "advanced", "performance"], title: "Advanced Java Programming", url: "https://www.youtube.com/watch?v=8N1pM4lVJxk" },
{ match: ["project", "spring", "backend"], title: "Java Backend Project Tutorial", url: "https://www.youtube.com/watch?v=9SGDpanrc8U" },
],
};
const findStepSpecificVideo = (topic = "", stepTitle = "", skillLevel = "beginner") => {
const topicKey = normalizePathTopicKey(topic);
const loweredTitle = `${stepTitle}`.toLowerCase();
const topicLibrary = STEP_VIDEO_MATCHERS[topicKey] || [];
const matchedVideo = topicLibrary.find((item) =>
item.match.some((keyword) => loweredTitle.includes(keyword))
);
if (matchedVideo) return matchedVideo;
if (loweredTitle.includes("advanced")) {
return topicLibrary[topicLibrary.length - 1] || null;
}
if (loweredTitle.includes("project") || skillLevel === "advanced") {
return topicLibrary.find((item) =>
item.match.includes("project") || item.match.includes("advanced")
) || null;
}
return null;
};
const dedupeVideosByUrl = (videos = []) => {
const seen = new Set();
return videos.filter((video) => {
const key = (video?.url || "").trim().toLowerCase();
if (!key || seen.has(key)) return false;
seen.add(key);
return true;
});
};
const getStepVideoCandidates = (topic = "", stepTitle = "", skillLevel = "beginner", topicVideos = [], stepIndex = 0, totalSteps = 1) => {
const topicKey = normalizePathTopicKey(topic);
const loweredTitle = `${stepTitle}`.toLowerCase();
const topicLibrary = STEP_VIDEO_MATCHERS[topicKey] || [];
const keywordMatches = topicLibrary.filter((item) =>
item.match.some((keyword) => loweredTitle.includes(keyword))
);
const rotatedTopicVideo = getRecommendedPathVideo(topicVideos, stepIndex, totalSteps);
const priorityPool = [
...keywordMatches,
rotatedTopicVideo,
...topicVideos,
...topicLibrary,
].filter(Boolean);
return dedupeVideosByUrl(priorityPool);
};
const buildUniqueStepVideoPlan = (steps = [], topic = "", skillLevel = "beginner", topicVideos = []) => {
const usedUrls = new Set();
return steps.map((step, index) => {
const candidates = getStepVideoCandidates(topic, step?.title || "", skillLevel, topicVideos, index, steps.length);
if (!candidates.length) return null;
const unusedCandidate = candidates.find((video) => !usedUrls.has(video.url));
const selectedVideo = unusedCandidate || candidates[index % candidates.length];
if (selectedVideo?.url) {
usedUrls.add(selectedVideo.url);
}
return selectedVideo;
});
};
function LearningPathTab({ user, initialTopic, onOpenAssessment }) {
const navigate = useNavigate();
const [topic, setTopic] = useState(initialTopic || "");
const [customTopic, setCustomTopic] = useState("");
const [path, setPath] = useState(null);
const [topicVideos, setTopicVideos] = useState([]);
const [videoProgressMap, setVideoProgressMap] = useState({});
const [activeTrackedVideo, setActiveTrackedVideo] = useState(null);
const [trackedVideoProgress, setTrackedVideoProgress] = useState({ watched_percentage: 0, completed: false });
const [loading, setLoading] = useState(false);
const [expandedVideoStep, setExpandedVideoStep] = useState(null);
const playerContainerRef = useRef(null);
const playerInstanceRef = useRef(null);
const trackingIntervalRef = useRef(null);
const lastSavedPercentageRef = useRef(0);
const skillLevel = getNormalizedSkillLevel(user?.skill_level || "Beginner");
const load = useCallback(async (t) => {
const chosen = t || customTopic || topic;
if (!chosen) return;
setLoading(true);
setTopicVideos([]);
try {
const [pathData, videoData] = await Promise.all([
getLearningPath(user?.user_id || 0, chosen),
getVideos(chosen, skillLevel).catch(() => ({ videos: [] })),
]);
setPath(pathData);
setTopicVideos(videoData?.videos || []);
setTopic(chosen);
setCustomTopic("");
} catch {}
finally { setLoading(false); }
}, [customTopic, topic, user?.user_id, skillLevel]);
const steps = useMemo(
() => (Array.isArray(path?.path) ? path.path : []),
[path?.path]
);
const activeTopic = path?.topic || topic || customTopic;
const estimatedTime = estimatePathTime(steps);
// Previously this used buildUniqueStepVideoPlan(), which pulled from a
// SEPARATE hardcoded video list (STEP_VIDEO_MATCHERS) via keyword-matching
// against the step title. That list was disconnected from `topicVideos`
// (the actual video catalog shown in "Tracked videos" above), so a step
// could display/lock against a completely different, sometimes broken,
// video than the one the learner was actually tracking progress on.
// This now always uses the exact same catalog + order as the tracked
// list, so "step N" and "tracked video N" can never disagree.
const stepVideoPlan = useMemo(() => {
let videoCounter = -1;
return steps.map((step) => {
if (step?.type !== "video") return null;
videoCounter += 1;
return topicVideos[videoCounter] || null;
});
}, [steps, topicVideos]);
const trackedVideos = useMemo(
() => dedupeVideosByUrl([...topicVideos, ...stepVideoPlan].filter((video) => video?.url)),
[topicVideos, stepVideoPlan]
);
const displayVideos = useMemo(() => {
const stepVideos = dedupeVideosByUrl((stepVideoPlan || []).filter((v) => v?.url));
// Prefer the step-plan videos so the top grid always matches what the user is asked to watch in the timeline.
// Fallback to the topic library if the step-plan is empty.
return stepVideos.length ? stepVideos : topicVideos;
}, [stepVideoPlan, topicVideos]);
const persistTrackedProgress = useCallback(async (video, watchedPercentage, force = false) => {
if (!user?.user_id || !video?.url || !activeTopic) return;
const nextPercentage = Math.max(0, Math.min(100, Math.round(watchedPercentage)));
const previousPercentage = videoProgressMap[video.url]?.watched_percentage || 0;
const wasCompleted = videoProgressMap[video.url]?.completed || false;
// Guard: Only progress forward. Don't downgrade in database.
const finalPercentage = Math.max(previousPercentage, nextPercentage);
const finalCompleted = wasCompleted || finalPercentage >= 90;
if (finalPercentage === previousPercentage && finalCompleted === wasCompleted && !force) {
return;
}
lastSavedPercentageRef.current = Math.max(lastSavedPercentageRef.current, finalPercentage);
try {
await updateVideoProgress({
user_id: user.user_id,
course_title: activeTopic,
video_id: video.url,
completed: finalCompleted,
watched_percentage: finalPercentage,
});
setVideoProgressMap((prev) => ({
...prev,
[video.url]: {
watched_percentage: finalPercentage,
completed: finalCompleted,
},
}));
setTrackedVideoProgress({
watched_percentage: finalPercentage,
completed: finalCompleted,
});
try {
window.dispatchEvent(new CustomEvent("progressUpdated", {
detail: { userId: user.user_id, courseTitle: activeTopic }
}));
} catch (e) {
// ignore in non-browser/test environments
}
} catch (error) {
console.error("Failed to save learning path video progress", error);
}
}, [user?.user_id, activeTopic, videoProgressMap]);
const openTrackedVideo = useCallback((video) => {
if (!video?.url) return;
lastSavedPercentageRef.current = videoProgressMap[video.url]?.watched_percentage || 0;
setTrackedVideoProgress({
watched_percentage: videoProgressMap[video.url]?.watched_percentage || 0,
completed: videoProgressMap[video.url]?.completed || false,
});
setActiveTrackedVideo(video);
}, [videoProgressMap]);
useEffect(() => {
if (!initialTopic || loading) return;
if (!path || path.topic !== initialTopic) {
load(initialTopic);
}
}, [initialTopic, path, loading, load]);
useEffect(() => {
if (!user?.user_id || !activeTopic || trackedVideos.length === 0) return;
let cancelled = false;
Promise.allSettled(
trackedVideos.map((video) =>
getVideoProgress(user.user_id, activeTopic, video.url).then((progress) => ({
url: video.url,
watched_percentage: progress.watched_percentage || 0,
completed: progress.completed || false,
}))
)
).then((results) => {
if (cancelled) return;
const nextProgress = {};
results.forEach((result) => {
if (result.status === "fulfilled") {
nextProgress[result.value.url] = {
watched_percentage: result.value.watched_percentage,
completed: result.value.completed,
};
}
});
setVideoProgressMap(nextProgress);
});
return () => {
cancelled = true;
};
}, [user?.user_id, activeTopic, trackedVideos]);
useEffect(() => {
if (!activeTrackedVideo?.url || !playerContainerRef.current) return;
const videoId = getYouTubeVideoId(activeTrackedVideo.url);
if (!videoId) return;
let cancelled = false;
const stopTracking = () => {
if (trackingIntervalRef.current) {
window.clearInterval(trackingIntervalRef.current);
trackingIntervalRef.current = null;
}
};
const captureProgress = async (force = false) => {
const player = playerInstanceRef.current;
if (!player?.getDuration) return;
const duration = player.getDuration();
const currentTime = player.getCurrentTime?.() || 0;
if (!duration) return;
const watchedPercentage = (currentTime / duration) * 100;
await persistTrackedProgress(activeTrackedVideo, watchedPercentage, force);
};
const startTracking = () => {
stopTracking();
trackingIntervalRef.current = window.setInterval(() => {
captureProgress(false);
}, 5000);
};
loadYouTubeIframeApi().then((YT) => {
if (cancelled || !playerContainerRef.current) return;
playerInstanceRef.current?.destroy?.();
playerInstanceRef.current = new YT.Player(playerContainerRef.current, {
videoId,
playerVars: {
autoplay: 1,
rel: 0,
modestbranding: 1,
},
events: {
onReady: (event) => {
const existingProgress = videoProgressMap[activeTrackedVideo.url]?.watched_percentage || 0;
setTrackedVideoProgress({
watched_percentage: existingProgress,
completed: videoProgressMap[activeTrackedVideo.url]?.completed || false,
});
const duration = event.target.getDuration?.() || 0;
if (existingProgress > 0 && existingProgress < 95 && duration > 0) {
event.target.seekTo((duration * existingProgress) / 100, true);
}
},
onStateChange: (event) => {
const playerState = YT.PlayerState;
if (event.data === playerState.PLAYING) {
startTracking();
} else if (event.data === playerState.PAUSED) {
stopTracking();
captureProgress(true);
} else if (event.data === playerState.ENDED) {
stopTracking();
captureProgress(true);
}
},
},
});
});
return () => {
cancelled = true;
stopTracking();
captureProgress(true);
playerInstanceRef.current?.destroy?.();
playerInstanceRef.current = null;
};
}, [activeTrackedVideo, persistTrackedProgress, videoProgressMap]);
return (
<div className="tab-content">
<div className="section-header">
<h2><Route size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Learning Path</h2>
<p>Get a structured roadmap from beginner to expert</p>
</div>
<div className="path-selector">
<div className="topic-chips">
{PATH_TOPICS.map(t => (
<button key={t}
className={`topic-chip ${topic === t ? "active" : ""}`}
onClick={() => { setTopic(t); load(t); }}>
{t}
</button>
))}
</div>
<div className="custom-topic">
<input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
onKeyDown={e => e.key === "Enter" && load()}
placeholder="Or type your own topic..."
className="search-input" />
<button onClick={() => load()} className="search-btn" disabled={loading}>
Generate Path
</button>
</div>
</div>
{loading && <div className="loading-state"><RefreshCw size={16} className="inline-icon spin" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Generating your path...</div>}
{path && !loading && (
<div className="path-container">
<div className="path-header-row">
<div>
<h3 className="path-title"><Route size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Path: {path.topic}</h3>
<p className="path-subtitle">A clean roadmap with materials, videos, and practice steps connected to your learning flow.</p>
</div>
<button
className="btn-enroll"
onClick={() => navigate(`/study-materials?course=${encodeURIComponent(path.topic)}`)}
>
Open Resources
</button>
</div>
<div className="path-summary-grid">
<div className="path-summary-card">
<span className="path-summary-label">Steps</span>
<strong className="path-summary-value">{steps.length || 0}</strong>
</div>
<div className="path-summary-card">
<span className="path-summary-label">Estimated time</span>
<strong className="path-summary-value">{estimatedTime}</strong>
</div>
<div className="path-summary-card">
<span className="path-summary-label">Skill level</span>
<strong className="path-summary-value">{user?.skill_level || "Beginner"}</strong>
</div>
<div className="path-summary-card">
<span className="path-summary-label">Best next move</span>
<strong className="path-summary-value">Study + Video + Assessment</strong>
</div>
</div>
<div className="path-note">
Use each step below to study, finish the video, and then take the assessment. Use the Quiz tab only for extra practice after that.
</div>
<div className="path-videos-section">
<div className="path-videos-header">
<div>
<h4>Tracked videos</h4>
<p>These videos match your learning steps for `{activeTopic}` and show your real tracked %.</p>
</div>
</div>
<div className="path-video-grid">
{displayVideos.length > 0 ? (
displayVideos.slice(0, 5).map((video, index) => (
<button
key={`${video.url}-${index}`}
className="path-video-card"
type="button"
onClick={() => openTrackedVideo(video)}
>
<span className="path-video-badge">Video {index + 1}</span>
{getYouTubeThumbnail(video.url) && (
<div className="path-video-thumb-wrap">
<img
src={getYouTubeThumbnail(video.url)}
alt={video.title}
className="path-video-thumb"
/>
<span className="path-video-play"><PlayCircle size={24} /></span>
</div>
)}
<strong className="path-video-title">{video.title}</strong>
<span className="path-video-meta">{activeTopic} • {skillLevel}</span>
<span className="path-video-progress">
Tracked: {Math.round(videoProgressMap[video.url]?.watched_percentage || 0)}%
</span>
<span className="path-video-link">Play & Track →</span>
</button>
))
) : (
<a
className="path-video-card"
href={buildStepVideoSearchUrl(activeTopic, "full course", skillLevel)}
target="_blank"
rel="noreferrer"
>
<span className="path-video-badge">Video Search</span>
<strong className="path-video-title">{activeTopic} tutorial videos</strong>
<span className="path-video-meta">{skillLevel} resources</span>
<span className="path-video-link">Search on YouTube →</span>
</a>
)}
</div>
</div>
<div className="path-timeline">
{steps.map((step, i) => {
const videoStepIndex = steps.slice(0, i + 1).filter(s => s.type === "video").length - 1;
const exactStepVideo = findStepSpecificVideo(activeTopic, step.title, skillLevel);
const finalStepVideo = stepVideoPlan[i];
const stepVideoSearchUrl = buildStepVideoSearchUrl(activeTopic, step.title, skillLevel);
const stepVideoThumbnail = getYouTubeThumbnail(finalStepVideo?.url || "");

// Assessment-type steps don't get their own video box — there's no
// separate "assessment tutorial" video to search for. They share the
// same assessment content as the video step immediately before them,
// so just show a compact card pointing at that assessment.
if (step.type === "assessment") {
  const precedingVideo = stepVideoPlan[i - 1] || null;
  const precedingPct = videoProgressMap[precedingVideo?.url]?.watched_percentage || 0;
  const precedingDone = !precedingVideo?.url || !!videoProgressMap[precedingVideo?.url]?.completed || precedingPct >= 90;
  const stepQuestions = step?.questions || null;
  return (
    <div className="path-step" key={i}>
      <div className="step-connector">
        <div className="step-dot">{step.step}</div>
        {i < steps.length - 1 && <div className="step-line" />}
      </div>
      <div className="step-content">
        <div className="step-header">
          <h4><ClipboardCheck size={18} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> {step.title}</h4>
          <span className="step-duration"><Clock size={12} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> {step.duration}</span>
        </div>
        <div className="step-tags">
          <span className="step-tag primary">Assessment</span>
          <span className="step-tag">Step {i + 1}</span>
          <span className="step-tag">{activeTopic}</span>
        </div>
        <p>{step.desc}</p>
        <div className="step-actions">
          {precedingDone ? (
            <button
              className="step-action primary"
              onClick={() => onOpenAssessment && onOpenAssessment(activeTopic, videoStepIndex, precedingVideo?.url, stepQuestions)}
            >
              Take Assessment →
            </button>
          ) : (
            <button
              className="step-action locked"
              disabled
              title="Watch the previous step's video to 90%+ to unlock this assessment"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
            >
              <Lock size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Take Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

return (
<div className="path-step" key={i}>
<div className="step-connector">
<div className="step-dot">{step.step}</div>
{i < steps.length - 1 && <div className="step-line" />}
</div>
<div className="step-content">
<div className="step-header">
<h4>{step.title}</h4>
<span className="step-duration"><Clock size={12} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> {step.duration}</span>
</div>
<div className="step-tags">
<span className="step-tag primary">{getPathStage(i, steps.length)}</span>
<span className="step-tag">Step {i + 1}</span>
<span className="step-tag">{activeTopic}</span>
</div>
<p>{step.desc}</p>
<div className="step-focus-box">
<div className="step-focus-title">Recommended focus</div>
<div className="step-focus-text">{getStepFocus(activeTopic, step, i, steps.length)}</div>
</div>
<div className="step-video-box">
<div className="step-video-label">
{exactStepVideo ? "Step-matched video" : "Recommended video for this step"}
</div>
{finalStepVideo?.url ? (
<button
className="step-video-preview"
type="button"
onClick={() => openTrackedVideo(finalStepVideo)}
>
{stepVideoThumbnail ? (
<div className="step-video-thumb-wrap">
<img
src={stepVideoThumbnail}
alt={finalStepVideo?.title || `${activeTopic} ${step.title} tutorial`}
className="step-video-thumb"
/>
<span className="step-video-play"><PlayCircle size={24} /></span>
</div>
) : (
<div className="step-video-thumb-fallback">
<span><PlayCircle size={16} style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /></span>
<strong>Open tracked player</strong>
</div>
)}
<div className="step-video-info">
<div className="step-video-name">
{finalStepVideo?.title || `${activeTopic} ${step.title} tutorial`}
</div>
<div className="step-video-meta">
Topic: {activeTopic} • Level: {skillLevel}
</div>
<div className="step-video-progress">
Tracked: {Math.round(videoProgressMap[finalStepVideo.url]?.watched_percentage || 0)}%
</div>
</div>
</button>
) : (
<a
className="step-video-preview"
href={stepVideoSearchUrl}
target="_blank"
rel="noreferrer"
>
{stepVideoThumbnail ? (
<div className="step-video-thumb-wrap">
<img
src={stepVideoThumbnail}
alt={finalStepVideo?.title || `${activeTopic} ${step.title} tutorial`}
className="step-video-thumb"
/>
<span className="step-video-play">▶</span>
</div>
) : (
<div className="step-video-thumb-fallback">
<span>▶</span>
<strong>Open video search</strong>
</div>
)}
<div className="step-video-info">
<div className="step-video-name">
{finalStepVideo?.title || `${activeTopic} ${step.title} tutorial`}
</div>
<div className="step-video-meta">
Topic: {activeTopic} • Level: {skillLevel}
</div>
</div>
</a>
)}
<div className="step-video-actions">
{finalStepVideo?.url ? (
<button
className="step-action video"
type="button"
onClick={() => openTrackedVideo(finalStepVideo)}
>
Play & Track
</button>
) : (
<a
className="step-action video"
href={stepVideoSearchUrl}
target="_blank"
rel="noreferrer"
>
Search on YouTube
</a>
)}
{finalStepVideo?.url && (
<a
className="step-action link"
href={finalStepVideo.url}
target="_blank"
rel="noreferrer"
>
Open on YouTube
</a>
)}
<a
className="step-action link"
href={stepVideoSearchUrl}
target="_blank"
rel="noreferrer"
>
More for this step
</a>
{topicVideos.length > 1 && (
<button
type="button"
className="step-action link"
onClick={() => setExpandedVideoStep(expandedVideoStep === i ? null : i)}
>
{expandedVideoStep === i ? "Hide all videos ▲" : `Browse all ${topicVideos.length} videos (${skillLevel}) ▾`}
</button>
)}
</div>
{expandedVideoStep === i && (
<div className="step-video-alt-list" style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
{topicVideos.map((video, vIdx) => (
<button
key={video.url || vIdx}
type="button"
onClick={() => { openTrackedVideo(video); setExpandedVideoStep(null); }}
style={{
display: "flex", alignItems: "center", justifyContent: "space-between",
width: "100%", textAlign: "left", padding: "0.5rem 0.75rem",
borderRadius: "8px", border: "1px solid var(--border)",
background: video.url === finalStepVideo?.url ? "var(--primary-light, #eef2ff)" : "white",
cursor: "pointer", fontSize: "0.85rem",
}}
>
<span>{video.title}</span>
<span style={{ opacity: 0.6, fontSize: "0.75rem", whiteSpace: "nowrap", marginLeft: "0.5rem" }}>
{Math.round(videoProgressMap[video.url]?.watched_percentage || 0)}%
</span>
</button>
))}
</div>
)}
</div>
<div className="step-actions">
<button
className="step-action primary"
onClick={() => navigate(`/study-materials?course=${encodeURIComponent(activeTopic)}`)}
>
Study Materials
</button>
<button
className="step-action"
onClick={() => navigate(`/study-materials?course=${encodeURIComponent(activeTopic)}&type=video`)}
>
Video Lessons
</button>
{(() => {
const stepVideoPct = videoProgressMap[finalStepVideo?.url]?.watched_percentage || 0;
const stepVideoDone = !!videoProgressMap[finalStepVideo?.url]?.completed || stepVideoPct >= 90;
const stepQuestions = step?.questions || null;
if (!finalStepVideo?.url) {
// No specific video mapped for this step — don't
// block on a video that doesn't exist to watch.
return (
<button
className="step-action"
onClick={() => onOpenAssessment && onOpenAssessment(activeTopic, videoStepIndex, finalStepVideo?.url, stepQuestions)}
>
Take Assessment
</button>
);
}
return stepVideoDone ? (
<button
className="step-action"
onClick={() => onOpenAssessment && onOpenAssessment(activeTopic, videoStepIndex, finalStepVideo?.url, stepQuestions)}
>
Take Assessment
</button>
) : (
<button
className="step-action locked"
disabled
title="Watch this step's video to 90%+ to unlock its assessment"
style={{ opacity: 0.55, cursor: "not-allowed" }}
>
🔒 Take Assessment
</button>
);
})()}
<a
className="step-action link"
href={getDocsUrlForTopic(activeTopic)}
target="_blank"
rel="noreferrer"
>
Documentation
</a>
</div>
</div>
</div>
);
})}
</div>
</div>
)}
{!path && !loading && (
<div className="empty-state-large">
<div className="eil-icon">🗺️</div>
<h3>Choose a topic to generate your learning path</h3>
<p>We'll create a step-by-step roadmap with estimated durations</p>
</div>
)}
{activeTrackedVideo && (
<div className="video-modal-overlay" onClick={() => setActiveTrackedVideo(null)}>
<div className="video-modal-card" onClick={(event) => event.stopPropagation()}>
<div className="video-modal-header">
<div>
<h3>{activeTrackedVideo.title}</h3>
<p>{activeTopic} • Auto-saving watch progress while you learn</p>
</div>
<button className="video-modal-close" onClick={() => setActiveTrackedVideo(null)}>
✕
</button>
</div>
<div className="video-modal-progress-row">
<span className="video-modal-progress-pill">
Tracked: {Math.round(trackedVideoProgress.watched_percentage || 0)}%
</span>
<span className={`video-modal-progress-pill ${trackedVideoProgress.completed ? "done" : ""}`}>
{trackedVideoProgress.completed ? "Completed" : "In Progress"}
</span>
</div>
<div className="video-modal-player">
<div ref={playerContainerRef} />
</div>
<div className="video-modal-actions">
<a
className="step-action link"
href={activeTrackedVideo.url}
target="_blank"
rel="noreferrer"
>
Open on YouTube
</a>
<button className="step-action primary" onClick={() => setActiveTrackedVideo(null)}>
Close Player
</button>
</div>
</div>
</div>
)}
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB: QUIZ
// ─────────────────────────────────────────────────────────────────────────────
function QuizTab({ user }) {
const { showToast } = useToast();
const [quizzes, setQuizzes] = useState([]);
const [genTopic, setGenTopic] = useState("");
const [genLoading, setGenLoading] = useState(false);
const [activeQuiz, setActiveQuiz] = useState(null);
const [aiCorrectAnswers, setAiCorrectAnswers] = useState([]);
const [answers, setAnswers] = useState([]);
const [result, setResult] = useState(null);
const [current, setCurrent] = useState(0);
const [loading, setLoading] = useState(false);
const [showDetailedResults, setShowDetailedResults] = useState(false);
const [quizHistory, setQuizHistory] = useState([]);
const [showHistory, setShowHistory] = useState(false);
useEffect(() => {
listQuizzes().then(d => setQuizzes(d.quizzes || [])).catch(() => {});
if (user?.user_id) {
  getQuizHistory(user.user_id).then(d => setQuizHistory(d.history || [])).catch(() => {});
}
}, [user]);
const generateAIQuiz = async () => {
if (!genTopic.trim()) return;
setGenLoading(true);
try {
const data = await generateQuiz(genTopic);
if (data && data.questions) {
setActiveQuiz({
id: 99,
title: `AI Quiz: ${genTopic}`,
questions: data.questions.map((q, i) => ({
id: i + 1,
q: q.q,
options: q.options
}))
});
setAiCorrectAnswers(data.questions.map(q => q.answer)); // ← ADD THIS LINE
setAnswers(new Array(data.questions.length).fill(-1));
setResult(null);
setCurrent(0);
}
} catch {}
finally { setGenLoading(false); }
};
const startQuiz = async (id) => {
setLoading(true);
try {
const d = await getQuiz(id);
setActiveQuiz(d);
setAnswers(new Array(d.questions.length).fill(-1));
setResult(null);
setCurrent(0);
} catch {}
finally { setLoading(false); }
};
const selectAnswer = (qi, ai) => {
const updated = [...answers]; updated[qi] = ai; setAnswers(updated);
};
const submit = async () => {
if (answers.includes(-1)) { showToast("Please answer all questions", "error"); return; }
setLoading(true);
try {
const payload = { user_id: user?.user_id || 0, quiz_id: activeQuiz.id, answers, course_title: activeQuiz?.title || "" };
if (activeQuiz.id === 99) {
payload.correct_answers = aiCorrectAnswers; // ← include answers for AI quiz
}
const d = await submitQuiz(payload);
setResult(d);
showToast("Quiz submitted!", "success");
try {
window.dispatchEvent(new CustomEvent("progressUpdated", {
detail: { userId: user?.user_id, courseTitle: activeQuiz?.title || "" }
}));
} catch (e) {
// ignore in non-browser/test environments
}
} catch (err) {
showToast(getErrorMessage(err, "Failed to submit quiz"), "error");
}
finally { setLoading(false); }
};
// Result screen
if (result) return (
<div className="tab-content">
<div className={`quiz-result ${result.passed ? "passed" : "failed"}`}>
<div className="result-icon">{result.passed ? "🎉" : "📖"}</div>
<h2>{result.passed ? "Congratulations!" : "Keep Practicing!"}</h2>
<div className="score-circle">
<span className="score-num">{result.score}%</span>
<span className="score-lbl">Score</span>
</div>
<p>{result.correct} / {result.total} correct answers</p>
<p className="result-msg">{result.passed ? "You passed! 🎊" : "Need 60% to pass. Try again!"}</p>

{/* Detailed Results Section */}
{result.detailed_results && result.detailed_results.length > 0 && (
  <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
    <button
      onClick={() => setShowDetailedResults(!showDetailedResults)}
      style={{
        background: "white",
        border: "1px solid var(--border)",
        padding: "0.5rem 1rem",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "var(--dark)",
        marginBottom: "0.75rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      {showDetailedResults ? "▼ Hide" : "▶ Show"} Detailed Results
    </button>

    {showDetailedResults && (
      <div style={{ background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "0.5rem" }}>
        {result.detailed_results.map((item, idx) => {
          const qObj = activeQuiz?.questions?.[idx];
          const questionText = item.question || qObj?.q || qObj?.question;
          const optionsList = item.options || qObj?.options;

          return (
            <div
              key={idx}
              style={{
                padding: "0.75rem",
                marginBottom: idx < result.detailed_results.length - 1 ? "0.75rem" : "0",
                background: "var(--bg)",
                borderRadius: "6px",
                border: `1px solid ${item.is_correct ? "var(--success)" : "var(--danger)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ display: "flex", alignItems: "center" }}>
                  {item.is_correct ? <CheckCircle2 size={16} style={{ color: "var(--success)" }} /> : <XCircle size={16} style={{ color: "var(--danger)" }} />}
                </span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Question {idx + 1}</span>
              </div>
              {questionText && (
                <div style={{ fontSize: "0.8rem", marginBottom: "0.5rem", color: "var(--dark)", fontWeight: 600 }}>
                  {questionText}
                </div>
              )}
              <div style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                <strong>Your answer:</strong> {optionsList ? (optionsList[item.user_answer] || "Not answered") : (item.user_answer !== null ? item.user_answer : "Not answered")}
              </div>
              {!item.is_correct && (
                <div style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>
                  <strong>Correct answer:</strong> {optionsList ? optionsList[item.correct_answer] : item.correct_answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

<div className="result-actions">
<button className="nav-btn" onClick={() => { setResult(null); setActiveQuiz(null); }}>← Back</button>
<button className="btn-enroll" onClick={() => startQuiz(activeQuiz.id)}>Retry</button>
</div>
</div>
</div>
);

// Quiz History Section
if (!activeQuiz && !result) {
return (
<div className="tab-content">
<div className="section-header">
<h2>📝 Quizzes</h2>
<p>Test your knowledge — need 60% to pass</p>
</div>

{/* Quiz History Toggle */}
{quizHistory.length > 0 ? (
  <div style={{ marginBottom: "1.5rem" }}>
    <button
      onClick={() => setShowHistory(!showHistory)}
      style={{
        background: "var(--primary)",
        color: "white",
        border: "none",
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "0.9rem",
        fontWeight: 600,
      }}
    >
      {showHistory ? "▼ Hide Quiz History" : "▶ Show Quiz History"} ({quizHistory.length})
    </button>

    {showHistory && (
      <div style={{ marginTop: "1rem", background: "white", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
        <h3 style={{ fontFamily: "Sora, sans-serif", marginBottom: "1rem" }}>Your Quiz & Assessment History</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            maxHeight: "360px",
            overflowY: "auto",
            paddingRight: "0.25rem",
          }}
        >
          {quizHistory.map((h, idx) => (
            <div
              key={idx}
              style={{
                padding: "1rem",
                background: "var(--bg)",
                borderRadius: "8px",
                border: `1px solid ${h.passed ? "var(--success)" : "var(--danger)"}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                  {h.course_title}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  {h.source === "assessment" ? "Assessment" : "Quiz"} • {new Date(h.taken_at).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: h.passed ? "var(--success)" : "var(--danger)" }}>
                  {h.score}%
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {h.passed ? "Passed" : "Failed"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
) : (
  <div style={{ marginBottom: "1.5rem", background: "white", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)", textAlign: "center" }}>
    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
    <h3 style={{ fontFamily: "Sora, sans-serif", marginBottom: "0.5rem" }}>No Quiz History Yet</h3>
    <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
      Take a quiz or assessment to see your history here
    </p>
  </div>
)}

{/* AI Quiz Generator */}
<div className="ai-quiz-generator">
<h3>🤖 Generate AI Quiz</h3>
<p>Type any topic and Gemini will create a quiz for you</p>
<div className="search-bar">
<input
  value={genTopic}
  onChange={e => setGenTopic(e.target.value)}
  onKeyDown={e => e.key === "Enter" && generateAIQuiz()}
  placeholder="e.g. Deep Learning, React, SQL..."
  className="search-input"
/>
<button
  className="search-btn"
  onClick={generateAIQuiz}
  disabled={genLoading || !genTopic.trim()}
>
  {genLoading ? "Generating..." : <><RefreshCw size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Generate Quiz</>}
</button>
</div>
</div>
<div className="quiz-cards">
{quizzes.map(q => (
  <div className="quiz-card" key={q.id}>
    <div className="quiz-card-icon"><ClipboardCheck size={24} /></div>
    <h3>{q.title}</h3>
    <p>{q.questions} questions</p>
    <button className="btn-enroll" onClick={() => startQuiz(q.id)} disabled={loading}>
      Start Quiz →
    </button>
  </div>
))}
</div>
</div>
);
}
// Question screen
if (activeQuiz) {
const q = activeQuiz.questions[current];
const progress = ((current + 1) / activeQuiz.questions.length) * 100;
return (
<div className="tab-content">
<div className="quiz-header">
<button className="back-btn" onClick={() => setActiveQuiz(null)}>← Back</button>
<h3>{activeQuiz.title}</h3>
<span className="q-counter">{current + 1} / {activeQuiz.questions.length}</span>
</div>
<div className="quiz-progress-bar"><div style={{ width: `${progress}%` }} /></div>
<div className="quiz-question-card">
<h3 className="question-text">Q{current + 1}. {q.q}</h3>
<div className="options-grid">
{q.options.map((opt, ai) => (
<button key={ai}
className={`option-btn ${answers[current] === ai ? "selected" : ""}`}
onClick={() => selectAnswer(current, ai)}>
<span className="option-label">{String.fromCharCode(65 + ai)}</span>
{opt}
</button>
))}
</div>
<div className="quiz-nav">
{current > 0 && (
<button className="nav-btn" onClick={() => setCurrent(current - 1)}>← Prev</button>
)}
{current < activeQuiz.questions.length - 1 ? (
<button className="nav-btn primary" onClick={() => setCurrent(current + 1)}>Next →</button>
) : (
<button className="nav-btn submit" onClick={submit} disabled={loading}>
{loading ? "Submitting..." : "Submit ✓"}
</button>
)}
</div>
</div>
</div>
);
}
// Quiz list screen
return (
<div className="tab-content">
<div className="section-header">
<h2><ClipboardCheck size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Quizzes</h2>
<p>Test your knowledge — need 60% to pass</p>
</div>
{/* AI Quiz Generator */}
<div className="ai-quiz-generator">
<h3><ClipboardCheck size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Generate AI Quiz</h3>
<p>Type any topic and Gemini will create a quiz for you</p>
<div className="search-bar">
<input
value={genTopic}
onChange={e => setGenTopic(e.target.value)}
onKeyDown={e => e.key === "Enter" && generateAIQuiz()}
placeholder="e.g. Deep Learning, React, SQL..."
className="search-input"
/>
<button
className="search-btn"
onClick={generateAIQuiz}
disabled={genLoading || !genTopic.trim()}
>
{genLoading ? "Generating..." : <><RefreshCw size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Generate Quiz</>}
</button>
</div>
</div>
<div className="quiz-cards">
{quizzes.map(q => (
<div className="quiz-card" key={q.id}>
<div className="quiz-card-icon"><ClipboardCheck size={24} /></div>
<h3>{q.title}</h3>
<p>{q.questions} questions</p>
<button className="btn-enroll" onClick={() => startQuiz(q.id)} disabled={loading}>
Start Quiz →
</button>
</div>
))}
</div>
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB: CERTIFICATES
// ─────────────────────────────────────────────────────────────────────────────
function CertificatesTab({ user }) {
const [certs, setCerts] = useState([]);
const [eligibleCourses, setEligibleCourses] = useState([]);
const [generating, setGenerating] = useState(null);
const [deleting, setDeleting] = useState(null);
const [loading, setLoading] = useState(true);
const { showToast } = useToast();
const load = useCallback(() => {
if (!user?.user_id) return;
setLoading(true);
Promise.all([
getCertificates(user.user_id).then(d => setCerts(d.certificates || [])).catch(() => {}),
getAllProgress(user.user_id).then(d => {
const completed = (d.courses || []).filter(c => c.completed);
setEligibleCourses(completed);
}).catch(() => {}),
]).finally(() => setLoading(false));
}, [user]);
useEffect(() => { load(); }, [load]);
const handleGenerate = async (courseTitle) => {
setGenerating(courseTitle);
try {
await generateCertificate({ user_id: user.user_id, course_title: courseTitle });
showToast("Certificate generated! 🎉", "success");
load();
} catch (e) {
showToast(getErrorMessage(e, "Certificate not eligible yet."), "error");
} finally {
setGenerating(null);
}
};
const handleDelete = async (certificateId) => {
if (!window.confirm("Delete this certificate? You can generate a new one again later since the course is still marked complete.")) return;
setDeleting(certificateId);
try {
await deleteCertificate(certificateId, user.user_id);
showToast("Certificate deleted", "success");
load();
} catch (e) {
showToast(getErrorMessage(e, "Failed to delete certificate."), "error");
} finally {
setDeleting(null);
}
};
const handleDownload = (certificateId, download = false) => {
  const hostname = window.location.hostname;
  const dynamicBackendUrl = (hostname === "localhost" || hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : `http://${hostname}:8000`;
  const url = `${dynamicBackendUrl}/progress/certificate/pdf/${certificateId}${download ? "?download=true" : ""}`;
  if (download) {
    window.location.href = url;
  } else {
    window.open(url, "_blank");
  }
};
const certCourseTitles = certs.map(c => (c.course_title || "").trim().toLowerCase());
const pendingCourses = eligibleCourses.filter(c => !certCourseTitles.includes((c.course_title || "").trim().toLowerCase()));
return (
<div className="tab-content">
<div className="section-header">
<h2><Award size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Certificates</h2>
<p>View and download your earned certificates</p>
</div>
{loading && <div className="loading-state">Loading certificates...</div>}
{!loading && pendingCourses.length > 0 && (
<>
<h3 style={{ fontFamily: "Sora, sans-serif", marginBottom: ".75rem", marginTop: "1.5rem" }}>
Ready to Claim
</h3>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
{pendingCourses.map(c => (
<div className="cert-card" key={c.course_title} style={{
background: "linear-gradient(135deg, #fef3c7, #fde68a)",
border: "2px solid #f59e0b",
borderRadius: "12px",
padding: "1.25rem",
display: "flex",
flexDirection: "column",
gap: "0.5rem",
}}>
<div className="cert-badge" style={{ display: "flex", justifyContent: "center", color: "#f59e0b", margin: "10px 0" }}><Award size={24} /></div>
<div className="cert-title" style={{ fontFamily: "Sora, sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--dark)", textAlign: "center" }}>
{c.course_title}
</div>
<div className="cert-sub" style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", fontWeight: 600 }}>
You've completed 100% of this course.
</div>
<button
className="cert-btn primary"
onClick={() => handleGenerate(c.course_title)}
disabled={generating === c.course_title}
style={{
padding: "0.5rem",
background: "#f59e0b",
color: "white",
border: "none",
borderRadius: "8px",
fontSize: "0.8rem",
fontWeight: 600,
cursor: "pointer",
}}
>
{generating === c.course_title ? "Generating..." : "Generate Certificate"}
</button>
</div>
))}
</div>
</>
)}
<h3 style={{ fontFamily: "Sora, sans-serif", margin: "1.5rem 0 .75rem" }}>
Your Certificates ({certs.length})
</h3>
{!loading && certs.length === 0 && (
<div className="empty-state-large">
<div className="eil-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--muted)" }}><Award size={32} /></div>
<h3>No certificates earned yet</h3>
<p>Complete a course (video + materials + quiz) to earn your first certificate.</p>
</div>
)}
{!loading && certs.length > 0 && (
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
{certs.map((c) => (
<div className="cert-card" key={c.id} style={{
background: "linear-gradient(135deg, #d4edda, #c3e6cb)",
border: "2px solid #28a745",
borderRadius: "12px",
padding: "1.25rem",
display: "flex",
flexDirection: "column",
gap: "0.5rem",
}}>
<div className="cert-badge" style={{ display: "flex", justifyContent: "center", color: "#28a745", margin: "10px 0" }}><Award size={24} /></div>
<div className="cert-title" style={{ fontFamily: "Sora, sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--dark)", textAlign: "center" }}>
{c.course_title}
</div>
<div className="cert-sub" style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", fontWeight: 600 }}>
Awarded to {c.student_name} on {c.completion_date}
</div>
<div className="cert-id" style={{ fontSize: "0.7rem", color: "var(--muted)", textAlign: "center" }}>
ID: {c.certificate_id}
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
  <div style={{ display: "flex", gap: "0.5rem" }}>
    <button
      className="cert-btn ghost"
      onClick={() => handleDownload(c.certificate_id, false)}
      style={{
        flex: 1,
        padding: "0.5rem",
        background: "#28a745",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      View PDF
    </button>
    <button
      className="cert-btn ghost"
      onClick={() => handleDownload(c.certificate_id, true)}
      style={{
        flex: 1,
        padding: "0.5rem",
        background: "transparent",
        color: "#28a745",
        border: "1px solid #28a745",
        borderRadius: "8px",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Download PDF
    </button>
  </div>
  <button
    className="cert-btn ghost"
    onClick={() => handleDelete(c.certificate_id)}
    disabled={deleting === c.certificate_id}
    title="Delete certificate"
    style={{
      width: "100%",
      padding: "0.5rem 0.75rem",
      background: "white",
      color: "#dc2626",
      border: "1px solid #dc2626",
      borderRadius: "8px",
      fontSize: "0.8rem",
      fontWeight: 600,
      cursor: "pointer",
    }}
  >
    {deleting === c.certificate_id ? "Deleting..." : "Delete Certificate"}
  </button>
</div>
</div>
))}
</div>
)}
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB: HISTORY
// ─────────────────────────────────────────────────────────────────────────────
function HistoryTab({ user }) {
const [history, setHistory] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
if (!user?.user_id) return;
getHistory(user.user_id)
.then(d => setHistory(d.history || []))
.catch(() => {})
.finally(() => setLoading(false));
}, [user]);
const formatDate = (str) => {
if (!str) return "";
try { return new Date(str).toLocaleString(); } catch { return str; }
};
return (
<div className="tab-content">
<div className="section-header">
<h2><HistoryIcon size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Search History</h2>
<p>All the courses you've searched for</p>
</div>
{loading && <div className="loading-state">Loading history...</div>}
{!loading && history.length === 0 && (
<div className="empty-state-large">
<div className="eil-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--muted)" }}><HistoryIcon size={32} /></div>
<h3>No search history yet</h3>
<p>Your course searches will appear here</p>
</div>
)}
{!loading && history.length > 0 && (
<div className="history-list">
<div className="history-count">{history.length} searches recorded</div>
{history.map((h, i) => (
<div className="history-item" key={i}>
<div className="history-icon" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><Search size={18} /></div>
<div className="history-info">
<div className="history-query">{h.query}</div>
<div className="history-date">{formatDate(h.searched_at)}</div>
</div>
<div className="history-badge">#{i + 1}</div>
</div>
))}
</div>
)}
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB: FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackTab({ user, prefillCourse }) {
const { showToast } = useToast();
const [form, setForm] = useState({ course_title: prefillCourse || "", rating: 0, comment: "" });
const [reviews, setReviews] = useState([]);
const [submitted, setSubmitted] = useState(false);
const [loading, setLoading] = useState(false);
useEffect(() => { setForm(f => ({ ...f, course_title: prefillCourse || "" })); }, [prefillCourse]);
useEffect(() => { getAllFeedback().then(d => setReviews(d.feedback || [])).catch(() => {}); }, [submitted]);
const submit = async () => {
if (!form.course_title || !form.rating || !form.comment) {
showToast("Please fill all fields and select a rating", "error"); return;
}
setLoading(true);
try {
await submitFeedback({ ...form, user_id: user?.user_id || null });
setSubmitted(true);
showToast("Thanks for your feedback!", "success");
setForm({ course_title: "", rating: 0, comment: "" });
setTimeout(() => setSubmitted(false), 3000);
} catch {
showToast("Failed to submit feedback. Please try again.", "error");
}
finally { setLoading(false); }
};
return (
<div className="tab-content">
<div className="section-header">
<h2><Star size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Course Feedback</h2>
<p>Share your experience and help others choose the right course</p>
</div>
<div className="feedback-layout">
<div className="feedback-form-card">
<h3>Write a Review</h3>
{submitted && <div className="success-msg"><CheckCircle2 size={16} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Review submitted!</div>}
<div className="form-group">
<label>Course Name</label>
<input value={form.course_title}
onChange={e => setForm({ ...form, course_title: e.target.value })}
placeholder="e.g. Python for Data Science" className="form-input" />
</div>
<div className="form-group">
<label>Rating</label>
<StarRating value={form.rating} onChange={r => setForm({ ...form, rating: r })} />
</div>
<div className="form-group">
<label>Comment</label>
<textarea value={form.comment}
onChange={e => setForm({ ...form, comment: e.target.value })}
placeholder="Share your experience..." rows={4} className="form-input" />
</div>
<button onClick={submit} className="search-btn" disabled={loading}>
{loading ? "Submitting..." : "Submit Review"}
</button>
</div>
<div className="reviews-list">
<h3>Community Reviews ({reviews.length})</h3>
{reviews.length === 0 ? (
<p className="empty-state">No reviews yet. Be the first!</p>
) : reviews.map((r, i) => (
<div className="review-card" key={i}>
<div className="review-header">
<div className="reviewer-avatar">{(r.name || "A")[0].toUpperCase()}</div>
<div>
<div className="reviewer-name">{r.name || "Anonymous"}</div>
<div className="review-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
</div>
<div className="review-course">{r.course_title}</div>
</div>
<p className="review-comment">{r.comment}</p>
</div>
))}
</div>
</div>
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB: AI CHAT
// ─────────────────────────────────────────────────────────────────────────────
function AIChatTab({ user }) {
const [messages, setMessages] = useState([
{ role: "ai", text: "Hi! I'm your learning assistant. Ask me anything about courses, programming, or learning paths!" }
]);
const [input, setInput] = useState("");
const [loading, setLoading] = useState(false);
const bottomRef = useRef(null);
const suggestions = [
"How should I start learning Python?",
"Create a study plan for web development",
"Recommend courses for data science"
];
useEffect(() => {
bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
const send = async () => {
const question = input.trim();
if (!question || loading) return;
setMessages(prev => [...prev, { role: "user", text: question }]);
setInput("");
setLoading(true);
try {
const answer = await askRAG(question, user?.user_id);
setMessages(prev => [...prev, { role: "ai", text: answer }]);
} catch {
setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't respond right now." }]);
} finally {
setLoading(false);
}
};
return (
<div className="tab-content">
<div className="section-header">
<h2><MessageSquare size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Learning Assistant</h2>
<p>Ask questions and get personalized study help</p>
</div>
<div className="chat-shell">
<div className="chat-messages">
{messages.map((message, index) => (
<div key={index} className={`chat-message ${message.role}`}>
<div className="msg-bubble">{message.text}</div>
</div>
))}
{loading && (
<div className="chat-message ai">
<div className="msg-bubble typing">
<span /><span /><span />
</div>
</div>
)}
<div ref={bottomRef} />
</div>
{messages.length === 1 && (
<div className="suggestions">
{suggestions.map((suggestion, index) => (
<button key={index} className="suggestion-chip" onClick={() => setInput(suggestion)}>
{suggestion}
</button>
))}
</div>
)}
<div className="chat-input-bar">
<input
value={input}
onChange={e => setInput(e.target.value)}
onKeyDown={e => e.key === "Enter" && send()}
placeholder="Ask me anything about learning..."
className="chat-input"
disabled={loading}
/>
<button onClick={send} className="send-btn" disabled={loading || !input.trim()}>
{loading ? "..." : "Send"}
</button>
</div>
</div>
</div>
);
}
// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
const { user, logout } = useAuth();
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const [tab, setTab] = useState("overview");
const [stats, setStats] = useState({ searches: 0, quizzes_taken: 0, avg_quiz_score: 0 });
const [courseProgress, setCourseProgress] = useState({ average_progress: 0, total_courses_enrolled: 0 });
const [feedbackCourse, setFeedbackCourse] = useState("");
const [learningPathTopic, setLearningPathTopic] = useState("");
const [sidebarOpen, setSidebarOpen] = useState(true);
useEffect(() => {
if (!user) return;
getUserStats(user.user_id).then(setStats).catch(() => {});
getAllProgress(user.user_id, { recompute: true }).then(setCourseProgress).catch(() => {});
}, [user]);
useEffect(() => {
if (!user) return;
const handler = () => {
getAllProgress(user.user_id, { recompute: true }).then(setCourseProgress).catch(() => {});
};
window.addEventListener("progressUpdated", handler);
return () => window.removeEventListener("progressUpdated", handler);
}, [user]);
useEffect(() => {
const requestedTab = searchParams.get("tab");
if (requestedTab && TABS.some((item) => item.id === requestedTab)) {
setTab(requestedTab);
}
}, [searchParams]);
const openFeedback = (courseTitle) => {
setFeedbackCourse(courseTitle);
setTab("feedback");
};
const openLearningPath = (courseTitle) => {
setLearningPathTopic(courseTitle);
setTab("path");
};
const handleLogout = () => { logout(); navigate("/"); };
return (
<div className="dashboard-layout">
<aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
<div className="sidebar-brand">
<span className="logo-icon"><Zap size={20} /></span>
{sidebarOpen && <span>Learn<span className="logo-accent">Sphere</span></span>}
<button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
{sidebarOpen ? "◀" : "▶"}
</button>
</div>
<nav className="sidebar-nav">
{TABS.map(t => (
<button key={t.id}
className={`nav-item ${tab === t.id ? "active" : ""}`}
onClick={() => setTab(t.id)}
title={t.label}>
<span className="nav-icon">{t.icon}</span>
{sidebarOpen && <span>{t.label}</span>}
</button>
))}
</nav>
<div className="sidebar-user">
<div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
{sidebarOpen && (
<div className="user-info">
<div className="user-name">{user?.name}</div>
<div className="user-email">{user?.email}</div>
</div>
)}
<button onClick={handleLogout} className="logout-btn" title="Logout"><LogOut size={18} /></button>
</div>
{/* Admin Button — only shows if user is admin */}
{user?.is_admin === 1 && (
<button
className="admin-btn"
onClick={() => navigate("/admin")}
title="Admin Panel"
>
<span><Shield size={18} style={{ display: "inline-block", verticalAlign: "middle" }} /></span>
{sidebarOpen && <span>Admin Panel</span>}
</button>
)}
</aside>
<main className="main-content">
<div className="topbar">
<h1 className="topbar-title">
{TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}
</h1>
<div className="topbar-right">
<span className="topbar-user">Hi, {user?.name}!</span>
</div>
</div>
{tab === "overview" && <OverviewTab user={user} stats={stats} setTab={setTab} courseProgress={courseProgress} onOpenLearningPath={openLearningPath} setCourseProgress={setCourseProgress} />}
{tab === "courses" && <CoursesTab user={user} onFeedback={openFeedback} onOpenLearningPath={openLearningPath} />}
{tab === "path" && <LearningPathTab user={user} initialTopic={learningPathTopic} onOpenAssessment={(courseTitle, stepIndex, videoUrl, questions) => {
  if (questions) {
    sessionStorage.setItem('assessmentQuestions', JSON.stringify(questions));
  }
  const params = new URLSearchParams();
  params.set("course", courseTitle);
  params.set("step", stepIndex ?? 0);
  if (videoUrl) params.set("video", videoUrl);
  navigate(`/assessment?${params.toString()}`);
}} />}
{tab === "quiz" && <QuizTab user={user} />}
{tab === "history" && <HistoryTab user={user} />}
{tab === "feedback" && <FeedbackTab user={user} prefillCourse={feedbackCourse} />}
{tab === "ai" && <AIChatTab user={user} />}
{tab === "analytics" && <AnalyticsDashboard userId={user?.user_id} />}
{tab === "certificates" && <CertificatesTab user={user} />}
</main>
</div>
);
}