import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getAssessmentUnlockStatus, getStaticAssessment, submitAssessment, getAllProgress, getMyCourses } from "../services/api.js";
import "../styles/Dashboard.css";
import "../styles/Progress.css";
import {
  ClipboardCheck,
  ArrowLeftCircle,
  Lock,
  Unlock,
  Award,
  XCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight
} from "lucide-react";

export default function Assessment() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stepIndex = parseInt(searchParams.get("step") || "0", 10);
  const stepVideoUrl = searchParams.get("video") || null;
  const [stepTitle, setStepTitle] = useState("");
  
  // States
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [unlockStatus, setUnlockStatus] = useState({ video_watched: false, assessment_unlocked: false });
  const [checkingLock, setCheckingLock] = useState(false);
  
  // Assessment test states
  const [testState, setTestState] = useState("idle"); // idle, loading, active, result
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  // Fetch enrolled courses for selection dropdown
  useEffect(() => {
  if (!user?.user_id) return;

  Promise.allSettled([
    getAllProgress(user.user_id),
    getMyCourses(user.user_id),
  ])
    .then(([progressResult, enrollmentResult]) => {
      const mergedCourses = [];
      const seenCourses = new Set();

      const progressCourses =
        progressResult.status === "fulfilled" ? progressResult.value?.courses || [] : [];
      const enrolledCourses =
        enrollmentResult.status === "fulfilled" ? enrollmentResult.value?.enrollments || [] : [];

      [...progressCourses, ...enrolledCourses].forEach((course, index) => {
        const title = course?.course_title;
        if (!title || seenCourses.has(title)) return;
        seenCourses.add(title);
        mergedCourses.push({
          id: course?.id || `${title}-${index}`,
          course_title: title,
        });
      });

      setCourses(mergedCourses);

      const queryCourse = searchParams.get("course");
      if (queryCourse) {
        setSelectedCourse(queryCourse);
      } else if (mergedCourses.length > 0) {
        setSelectedCourse(mergedCourses[0].course_title);
      }
    })
    .catch((err) => console.error(err));

}, [user, searchParams]);

  // Check lock status when course selection changes
  useEffect(() => {
    if (!user?.user_id || !selectedCourse) return;
    setCheckingLock(true);
    setTestState("idle");
    setResult(null);
    setAnswers({});
    
    getAssessmentUnlockStatus(user.user_id, selectedCourse)
      .then((d) => {
        setUnlockStatus(d);
      })
      .catch(() => {
        setUnlockStatus({ video_watched: false, assessment_unlocked: false });
      })
      .finally(() => setCheckingLock(false));
  }, [user, selectedCourse]);

  // Fetch this step's dynamic assessment questions
  const handleStartAssessment = async () => {
    setTestState("loading");
    setCurrentQuestion(0);
    setAnswers({});
    try {
      // Fetch dynamic questions from backend API
      const data = await getStaticAssessment(selectedCourse, stepIndex, user?.user_id, stepVideoUrl, user?.skill_level || "beginner");
      if (data && data.questions) {
        // Map questions array fields securely
        const formattedQuestions = data.questions.map(q => ({
          q: q.q || q.question,
          options: q.options
        }));
        setQuestions(formattedQuestions);
        setStepTitle(data.step_title || "");
        setTestState("active");
      } else {
        showToast("Failed to load assessment. Try again.", "error");
        setTestState("idle");
      }
    } catch (err) {
      console.error(err);
      showToast(
        err?.response?.data?.detail || "This step's assessment is locked until its video is completed.",
        "error"
      );
      setTestState("idle");
    }
  };

  // Handle option select
  const handleSelectOption = (qIdx, optIdx) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  // Submit assessment answers
  const handleSubmitTest = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      showToast("Please answer all questions before submitting.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const userAnswers = [];
      questions.forEach((q, idx) => {
        userAnswers.push(answers[idx]);
      });

      const res = await submitAssessment({
        user_id: user.user_id,
        course_name: selectedCourse,
        topic: selectedCourse,
        step_index: stepIndex,
        answers: userAnswers,
      });

      setResult(res);
      setTestState("result");
      showToast("Assessment submitted!", "success");
      try {
        window.dispatchEvent(new CustomEvent("progressUpdated", { detail: { userId: user.user_id, courseTitle: selectedCourse } }));
      } catch (e) {}
    } catch (err) {
      console.error("Assessment submission error:", err);
      console.error("Error response:", err.response?.data);
      showToast(`Failed to submit assessment: ${err.response?.data?.detail || err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <main className="main-content" style={{ marginLeft: 0, width: "100%" }}>
        {/* Topbar */}
        <div className="topbar">
          <h1 className="topbar-title"><ClipboardCheck size={24} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Course Assessment System</h1>
          <button className="nav-btn" onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeftCircle size={16} /> Back to Dashboard
          </button>
        </div>

        <div className="tab-content" style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
          
          {/* Course Selection Dropdown */}
          {testState === "idle" && (
            <div style={{ marginBottom: "2rem", background: "white", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <label style={{ fontWeight: 700, display: "block", marginBottom: "0.5rem", color: "var(--dark)" }}>
                Select Enrolled Course:
              </label>
              {courses.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No courses enrolled. Search and complete a course video to start.</p>
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    const newCourse = e.target.value;
                    setSelectedCourse(newCourse);
                    navigate(`/assessment?course=${encodeURIComponent(newCourse)}&step=0`);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    fontSize: "1rem",
                    background: "var(--bg)",
                    color: "var(--dark)",
                    fontWeight: 600,
                  }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.course_title}>
                      {c.course_title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Loading lock status state */}
          {checkingLock && <div className="empty-mini">Checking assessment locks...</div>}

          {/* Locked Screen */}
          {!checkingLock && selectedCourse && !unlockStatus.assessment_unlocked && testState === "idle" && (
            <div className="unlock-banner locked" style={{ padding: "2.5rem", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "center", color: "var(--danger)", margin: "1rem 0" }}><Lock size={48} /></div>
              <h2 style={{ margin: 0, fontFamily: "Sora, sans-serif" }}>Assessment is Locked</h2>
              <p style={{ maxWidth: "500px", margin: 0 }}>
                You must watch the course video tutorial for <strong>"{selectedCourse}"</strong> first in the Study Materials section to unlock this assessment.
              </p>
              <button
                className="nav-btn"
                style={{ background: "var(--primary)", marginTop: "1rem" }}
                onClick={() => navigate(`/study-materials?course=${encodeURIComponent(selectedCourse)}`)}
              >
                Go to Study Materials
              </button>
            </div>
          )}

          {/* Unlocked / Start Assessment Screen */}
          {!checkingLock && selectedCourse && unlockStatus.assessment_unlocked && testState === "idle" && (
            <div className="unlock-banner unlocked" style={{ padding: "2.5rem", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.2rem" }}>
              <div style={{ display: "flex", justifyContent: "center", color: "var(--success)", margin: "1rem 0" }}><Unlock size={48} /></div>
              <h2 style={{ margin: 0, fontFamily: "Sora, sans-serif" }}>Assessment Unlocked!</h2>
              <p style={{ maxWidth: "500px", margin: 0 }}>
                You have completed the video tutorial for <strong>"{selectedCourse}"</strong>. You can now take this step's assessment.
              </p>
              <button
                className="nav-btn"
                style={{ background: "var(--success)", padding: "0.8rem 2rem", fontSize: "1.1rem" }}
                onClick={handleStartAssessment}
              >
                Start Assessment
              </button>
            </div>
          )}

          {/* Loading questions screen */}
          {testState === "loading" && (
            <div className="empty-state-large" style={{ background: "white", padding: "3rem", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <div className="eil-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--muted)" }}><ClipboardCheck size={32} /></div>
              <h3 style={{ margin: "1rem 0" }}>Loading Assessment Questions...</h3>
              <p style={{ color: "var(--muted)", maxWidth: "400px", margin: "0 auto" }}>
                Preparing this step's assessment for <strong>"{selectedCourse}"</strong>.
              </p>
            </div>
          )}

          {/* Quiz Active Test Screen */}
          {testState === "active" && questions.length > 0 && (
            <div style={{ background: "white", padding: "2rem", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: "1.3rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                <ClipboardCheck size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Assessment: {selectedCourse}{stepTitle ? ` — ${stepTitle}` : ""}
              </h2>

              {/* Progress and Counter */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 700 }}>
                  {Math.round((Object.keys(answers).length / questions.length) * 100)}% Completed
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div style={{ width: "100%", height: "6px", background: "var(--border)", borderRadius: "3px", marginBottom: "2rem", overflow: "hidden" }}>
                <div style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%`, height: "100%", background: "var(--primary)", transition: "width 0.2s" }} />
              </div>
              
              {/* Paginated Question Card */}
              {(() => {
                const q = questions[currentQuestion];
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "var(--dark)", lineHeight: "1.4" }}>
                      Q{currentQuestion + 1}. {q.q || q.question}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(currentQuestion, optIdx)}
                          style={{
                            padding: "0.95rem 1.35rem",
                            borderRadius: "12px",
                            border: answers[currentQuestion] === optIdx ? "2px solid var(--primary)" : "1px solid var(--border)",
                            background: answers[currentQuestion] === optIdx ? "#f5f7ff" : "var(--bg)",
                            cursor: "pointer",
                            fontWeight: 600,
                            color: "var(--dark)",
                            fontSize: "0.95rem",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ marginRight: "0.75rem", color: answers[currentQuestion] === optIdx ? "var(--primary)" : "var(--muted)" }}>
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Navigation Actions */}
              <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
                <button
                  className="nav-btn"
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                  style={{ opacity: currentQuestion === 0 ? 0.5 : 1, cursor: currentQuestion === 0 ? "not-allowed" : "pointer" }}
                >
                  ← Previous
                </button>

                {currentQuestion < questions.length - 1 ? (
                  <button
                    className="nav-btn"
                    style={{ background: "var(--primary)" }}
                    onClick={() => setCurrentQuestion(prev => prev + 1)}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    className="nav-btn"
                    style={{ background: "var(--success)", padding: "0.8rem 2rem", fontSize: "1rem" }}
                    onClick={handleSubmitTest}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Assessment"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quiz Results Screen */}
          {testState === "result" && result && (
            <div style={{ background: "white", padding: "2.5rem", borderRadius: "16px", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                {result.passed ? <Award size={48} style={{ color: "#f59e0b" }} /> : <XCircle size={48} style={{ color: "#dc2626" }} />}
              </div>
              <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: "1.8rem", margin: 0 }}>
                {result.passed ? "Congratulations!" : "Keep Learning!"}
              </h2>
              <p style={{ color: "var(--muted)", margin: "0.5rem 0 1.5rem" }}>
                You scored {result.score}% on the {selectedCourse} assessment.
              </p>

              <div style={{ display: "inline-flex", flexDirection: "column", gap: "0.5rem", background: "var(--bg)", padding: "1.25rem 2.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Assessment status:</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: result.passed ? "var(--success)" : "var(--danger)" }}>
                  {result.passed ? "PASS" : "FAIL (Min. 60% required)"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  Correct: {result.correct} / {result.total}
                </div>
              </div>

              {/* AI Study Recommendations */}
              {result.recommendation && (
                <div style={{
                  background: "#f3f4f6",
                  borderLeft: "4px solid var(--primary)",
                  padding: "1.25rem",
                  borderRadius: "8px",
                  textAlign: "left",
                  margin: "0 auto 2rem",
                  maxWidth: "600px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                }}>
                  <strong style={{ display: "block", color: "var(--dark)", fontSize: "0.95rem", marginBottom: "0.5rem", fontFamily: "Sora, sans-serif" }}>
                    💡 AI Learning Recommendations:
                  </strong>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#4b5563", lineHeight: "1.5" }}>
                    {result.recommendation}
                  </p>
                </div>
              )}

              {/* Detailed Results Section */}
              {result.detailed_results && result.detailed_results.length > 0 && (
                <div style={{ textAlign: "left", marginBottom: "2rem" }}>
                  <button
                    onClick={() => setShowDetailedResults(!showDetailedResults)}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--dark)",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {showDetailedResults ? <><ChevronDown size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} /> Hide</> : <><ChevronRight size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} /> Show</>} Detailed Results
                  </button>

                  {showDetailedResults && (
                    <div style={{ background: "var(--bg)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                      {result.detailed_results.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "1rem",
                            marginBottom: idx < result.detailed_results.length - 1 ? "1rem" : "0",
                            background: "white",
                            borderRadius: "8px",
                            border: `2px solid ${item.is_correct ? "var(--success)" : "var(--danger)"}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <span style={{ display: "flex", alignItems: "center" }}>{item.is_correct ? <CheckCircle2 size={16} style={{ color: "var(--success)" }} /> : <XCircle size={16} style={{ color: "var(--danger)" }} />}</span>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Question {idx + 1}</span>
                          </div>
                          <div style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "var(--dark)" }}>
                            {item.question}
                          </div>
                          <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                            <strong>Your answer:</strong> {item.options[item.user_answer] || "Not answered"}
                          </div>
                          {!item.is_correct && (
                            <div style={{ fontSize: "0.85rem", color: "var(--success)", fontWeight: 600 }}>
                              <strong>Correct answer:</strong> {item.options[item.correct_answer]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
                <button className="nav-btn" onClick={() => setTestState("idle")}>
                  Take Another Assessment
                </button>
                <button
                  className="nav-btn"
                  style={{ background: "var(--primary)" }}
                  onClick={() => navigate("/progress")}
                >
                  View My Progress
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}