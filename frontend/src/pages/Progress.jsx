import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAllProgress } from "../services/api.js";
import ProgressBar from "../components/ProgressBar.jsx";
import "../styles/Dashboard.css";
import "../styles/Progress.css";
import {
  TrendingUp,
  ArrowLeftCircle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Target,
  Award,
  RefreshCw
} from "lucide-react";

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_courses_enrolled: 0,
    courses_completed: 0,
    assessments_completed: 0,
    average_quiz_score: 0,
    average_progress: 0,
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    setLoading(true);
    getAllProgress(user.user_id)
      .then((d) => {
        setStats({
          total_courses_enrolled: d.total_courses_enrolled || 0,
          courses_completed: d.courses_completed || 0,
          assessments_completed: d.assessments_completed || 0,
          average_quiz_score: d.average_quiz_score || 0,
          average_progress: d.average_progress || 0,
        });
        setCourses(d.courses || []);
      })
      .catch((err) => console.error("Error loading progress:", err))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      setLoading(true);
      getAllProgress(user.user_id)
        .then((d) => {
          setStats({
            total_courses_enrolled: d.total_courses_enrolled || 0,
            courses_completed: d.courses_completed || 0,
            assessments_completed: d.assessments_completed || 0,
            average_quiz_score: d.average_quiz_score || 0,
            average_progress: d.average_progress || 0,
          });
          setCourses(d.courses || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    window.addEventListener("progressUpdated", handler);
    return () => window.removeEventListener("progressUpdated", handler);
  }, [user]);

  return (
    <div className="dashboard-layout">
      <main className="main-content" style={{ marginLeft: 0, width: "100%" }}>
        {/* Topbar */}
        <div className="topbar">
          <h1 className="topbar-title"><TrendingUp size={24} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Learning Progress Tracker</h1>
          <button className="nav-btn" onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeftCircle size={16} /> Back to Dashboard
          </button>
        </div>

        <div className="tab-content" style={{ padding: "1.5rem" }}>
          {/* Stats Cards */}
          <div className="stats-grid" style={{ marginBottom: "2rem" }}>
            <div className="stat-card blue">
              <div className="stat-icon"><BookOpen size={24} /></div>
              <div className="stat-val">{stats.total_courses_enrolled}</div>
              <div className="stat-lbl">Courses Enrolled</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon"><CheckCircle2 size={24} /></div>
              <div className="stat-val">{stats.courses_completed}</div>
              <div className="stat-lbl">Courses Completed</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon"><ClipboardCheck size={24} /></div>
              <div className="stat-val">{stats.assessments_completed}</div>
              <div className="stat-lbl">Assessments Passed</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-icon"><Target size={24} /></div>
              <div className="stat-val">{stats.average_quiz_score}%</div>
              <div className="stat-lbl">Average Score</div>
            </div>
          </div>

          {/* Average circular progress banner */}
          <div className="welcome-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
            <div>
              <h2>Overall Study Progress</h2>
              <p>Progress rises as you complete videos and pass assessments. You will only reach 100% once your course is fully completed.</p>
            </div>
            <div style={{ background: "white", padding: "1rem", borderRadius: "50%", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <ProgressBar percentage={stats.average_progress} size={110} color="var(--primary)" />
            </div>
          </div>

          {/* Enrolled Courses Grid */}
          <h2 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, marginBottom: "1.5rem" }}>My Courses Progress</h2>

          {loading ? (
            <div className="empty-mini">Loading progress details...</div>
          ) : courses.length === 0 ? (
            <div className="empty-state-large" style={{ background: "white", padding: "3rem", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <div className="eil-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--muted)" }}><Award size={32} /></div>
              <h3>No courses enrolled yet</h3>
              <p>Search and enroll in a course on the Dashboard to track progress!</p>
              <button className="nav-btn" onClick={() => navigate("/dashboard")} style={{ marginTop: "1rem" }}>
                Explore Courses
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {courses.map((course) => (
                <div
                  key={course.course_title}
                  style={{
                    background: "white",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, paddingRight: "1rem" }}>
                    <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--dark)" }}>
                      {course.course_title}
                    </h3>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.25rem 0.6rem",
                          borderRadius: "999px",
                          background: course.completed ? "#dcfce7" : "#fef3c7",
                          color: course.completed ? "#15803d" : "#b45309",
                        }}
                      >
                        {course.completed ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <RefreshCw size={12} /> In Progress
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button
                        className="nav-btn"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", background: "var(--primary)" }}
                        onClick={() => navigate(`/study-materials?course=${encodeURIComponent(course.course_title)}`)}
                      >
                        Study Materials
                      </button>
                      <button
                        className="nav-btn"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", background: "none", border: "1px solid var(--primary)", color: "var(--primary)" }}
                        onClick={() => navigate(`/assessment?course=${encodeURIComponent(course.course_title)}`)}
                      >
                        Assessment
                      </button>
                    </div>
                  </div>
                  <div>
                    <ProgressBar percentage={course.progress_percentage} size={85} color={course.completed ? "var(--success)" : "var(--primary)"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}