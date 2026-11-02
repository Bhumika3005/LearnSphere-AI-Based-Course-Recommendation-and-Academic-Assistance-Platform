import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAllProgress } from "../services/api.js";
import CourseProgress from "./CourseProgress.jsx";
import StudyMaterials from "./StudyMaterials.jsx";
import AssessmentGate from "./AssessmentGate.jsx";
import "../styles/Dashboard.css";
import "../styles/Progress.css";
import { Route, ArrowLeftCircle, BookOpen, CheckCircle2 } from "lucide-react";

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allProgress, setAllProgress] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    getAllProgress(user.user_id)
      .then(d => {
        setAllProgress(d.courses || []);
        if (d.courses && d.courses.length > 0) {
          setActiveCourse(d.courses[0].course_title);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="dashboard-layout">
      <main className="main-content" style={{ marginLeft: 0, width: "100%" }}>
        <div className="topbar">
          <h1 className="topbar-title"><Route size={24} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> My Progress</h1>
          <button className="nav-btn" onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeftCircle size={16} /> Back to Dashboard
          </button>
        </div>

        <div className="tab-content">
          {loading && <div className="empty-mini">Loading your progress...</div>}

          {!loading && allProgress.length === 0 && (
            <div className="empty-state-large">
              <div className="eil-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--muted)" }}><BookOpen size={32} /></div>
              <h3>No course progress yet</h3>
              <p>Start a course and your progress will appear here.</p>
            </div>
          )}

          {!loading && allProgress.length > 0 && (
            <>
              <div className="material-type-tabs">
                {allProgress.map(c => (
                  <button
                    key={c.course_title}
                    className={`material-type-tab ${activeCourse === c.course_title ? "active" : ""}`}
                    onClick={() => setActiveCourse(c.course_title)}
                  >
                    {c.course_title}
                  </button>
                ))}
              </div>

              {activeCourse && (
                <>
                  <CourseProgress
                    userId={user.user_id}
                    courseId={activeCourse}
                    courseTitle={activeCourse}
                  />

                  <h3 style={{ fontFamily: "Sora, sans-serif", margin: "1.5rem 0 .75rem" }}>
                    Study Materials
                  </h3>
                  <StudyMaterials courseId={activeCourse} />

                  <h3 style={{ fontFamily: "Sora, sans-serif", margin: "1.5rem 0 .75rem" }}>
                    Assessment
                  </h3>
                  <AssessmentGate userId={user.user_id} courseId={activeCourse}>
                    <p style={{ color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={16} /> You can now take the assessment for this course from the Quiz tab.
                    </p>
                  </AssessmentGate>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}