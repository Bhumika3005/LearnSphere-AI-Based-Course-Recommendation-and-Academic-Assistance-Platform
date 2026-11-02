import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast, getErrorMessage } from "../context/ToastContext.jsx";
import {
  getAdminStats, getAdminUsers, deleteUser,
  getAdminFeedback, deleteAdminFeedback,
  getAdminSearches, getAdminQuizzes, getAdminActivity, getAdminCertificateStats, adminAddUser, getUserActivity, getAllEnrollments
} from "../services/api.js";
import "../styles/Dashboard.css";
import {
  BarChart3,
  Users,
  BookOpen,
  Search,
  ClipboardCheck,
  Star,
  TrendingUp,
  Shield,
  Award,
  Target,
  PlusCircle,
  Trash2,
  Home
} from "lucide-react";

const ADMIN_TABS = [
  { id: "stats", label: "Statistics", icon: <BarChart3 size={20} strokeWidth={2} /> },
  { id: "users", label: "All Users", icon: <Users size={20} strokeWidth={2} /> },
  { id: "courses", label: "Courses", icon: <BookOpen size={20} strokeWidth={2} /> },
  { id: "searches", label: "All Searches", icon: <Search size={20} strokeWidth={2} /> },
  { id: "quizzes", label: "Quiz Results", icon: <ClipboardCheck size={20} strokeWidth={2} /> },
  { id: "feedback", label: "All Feedback", icon: <Star size={20} strokeWidth={2} /> },
  { id: "activity", label: "Activity", icon: <TrendingUp size={20} strokeWidth={2} /> },
];

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const safePercent = (value, fallback = 0) => {
  const percent = toNumber(value, fallback);
  return Math.min(100, Math.max(0, percent));
};

const getCompletionRate = (completed, enrolled) => {
  const completedCount = toNumber(completed, 0);
  const enrolledCount = toNumber(enrolled, 0);
  if (enrolledCount <= 0) return 0;
  return Math.round((completedCount / enrolledCount) * 100);
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showToast, confirmDialog } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searches, setSearches] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [certificateStats, setCertificateStats] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", is_admin: false, skill_level: "Beginner", interests: "" });
  const [addingUser, setAddingUser] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  useEffect(() => {
    if (!user?.user_id) return;
    if (user?.is_admin !== 1) { navigate("/dashboard"); return; }
    getAdminStats(user.user_id).then(setStats).catch(() => { });
    getAdminUsers(user.user_id).then(d => setUsers(d.users || [])).catch(() => { });
    getAdminSearches(user.user_id).then(d => setSearches(d.searches || [])).catch(() => { });
    getAdminQuizzes(user.user_id).then((d) => {
      setQuizzes(d.results || []);
    }).catch(() => { });
    getAdminCertificateStats(user.user_id).then(d => setCertificateStats(d.stats || [])).catch(() => setCertificateStats([]));
    getAdminFeedback(user.user_id).then(d => setFeedback(d.feedback || [])).catch(() => { });
    getAllEnrollments()
      .then(data => {
        setEnrollments(data);

        const grouped = {};

        data.forEach(e => {
          if (!grouped[e.course_title]) {
            grouped[e.course_title] = {
              name: e.course_title,
              enrolled: 0,
              completed: 0
            };
          }

          grouped[e.course_title].enrolled++;

          if (e.completed) {
            grouped[e.course_title].completed++;
          }
        });

        setCourseStats(Object.values(grouped));
      })
      .catch(console.error);


    getAdminActivity(user.user_id).then(d => setActivityData(d.activity || [])).catch(() => setActivityData([]));
  }, [user, navigate]);

  const handleDeleteUser = async (tid) => {
    const ok = await confirmDialog("Delete this user? This cannot be undone.", { danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    try {
      await deleteUser(user.user_id, tid);
      setUsers(users.filter(u => u.id !== tid));
      showToast("User deleted.", "success");
    } catch (e) {
      showToast(getErrorMessage(e, "Failed to delete user."), "error");
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      showToast("Please fill all fields", "error");
      return;
    }
    setAddingUser(true);
    try {
      const payload = {
        ...newUser,
        skill_level: (newUser.skill_level || "Beginner").toLowerCase(),
        interests: newUser.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      await adminAddUser(user.user_id, payload);
      showToast("User added successfully!", "success");
      setShowAddUser(false);
      setNewUser({ name: "", email: "", password: "", is_admin: false, skill_level: "Beginner", interests: "" });
      // Refresh users list
      getAdminUsers(user.user_id).then(d => setUsers(d.users || [])).catch(() => { });
    } catch (e) {
      showToast(getErrorMessage(e, "Failed to add user."), "error");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteFeedback = async (fid) => {
    const ok = await confirmDialog("Delete this feedback? This cannot be undone.", { danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    try {
      await deleteAdminFeedback(user.user_id, fid);
      setFeedback(feedback.filter(f => f.id !== fid));
      showToast("Feedback deleted.", "success");
    } catch (e) {
      showToast(getErrorMessage(e, "Failed to delete feedback."), "error");
    }
  };
  const handleViewActivity = async (userId) => {
    try {
      setSelectedActivity(null);
      const data = await getUserActivity(user.user_id, userId);

      setSelectedActivity(data);

      setShowActivity(true);

    } catch (err) {

      showToast("Unable to load user activity", "error");

      console.error(err);

    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar open">
        <div className="sidebar-brand">
          <span className="logo-icon">🛡️</span>
          <span>Admin<span className="logo-accent">Panel</span></span>
        </div>
        <nav className="sidebar-nav">
          {ADMIN_TABS.map(t => (
            <button key={t.id}
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}>
              <span className="nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">A</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">Administrator</div>
          </div>
          <button className="logout-btn"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard">🏠</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="topbar">
          <h1 className="topbar-title">
            {ADMIN_TABS.find(t => t.id === tab)?.icon} {ADMIN_TABS.find(t => t.id === tab)?.label}
          </h1>
          <span className="topbar-user">Admin: {user?.name}</span>
        </div>

        <div className="tab-content">

          {/* STATS TAB */}
          {tab === "stats" && stats && (
            <div>
              <div className="welcome-banner">
                <div>
                  <h2>Admin Dashboard <Shield size={24} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "4px" }} /></h2>
                  <p>Overview of all platform activity</p>
                </div>
              </div>
              <div className="stats-grid">
                <div className="stat-card blue">
                  <div className="stat-icon"><Users size={24} /></div>
                  <div className="stat-val">{stats.total_users}</div>
                  <div className="stat-lbl">Total Users</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-icon"><Search size={24} /></div>
                  <div className="stat-val">{stats.total_searches}</div>
                  <div className="stat-lbl">Total Searches</div>
                </div>
                <div className="stat-card orange">
                  <div className="stat-icon"><ClipboardCheck size={24} /></div>
                  <div className="stat-val">{stats.total_quizzes}</div>
                  <div className="stat-lbl">Quizzes Taken</div>
                </div>
                <div className="stat-card purple">
                  <div className="stat-icon"><Target size={24} /></div>
                  <div className="stat-val">{safePercent(stats.avg_score)}%</div>
                  <div className="stat-lbl">Avg Quiz Score</div>
                </div>
                <div className="stat-card pink">
                  <div className="stat-icon"><Star size={24} /></div>
                  <div className="stat-val">{stats.total_feedback}</div>
                  <div className="stat-lbl">Total Reviews</div>
                </div>
                <div className="stat-card cyan">
                  <div className="stat-icon"><Award size={24} /></div>
                  <div className="stat-val">
                    {enrollments.filter(e => e.completed).length}
                  </div>
                  <div className="stat-lbl">Certificates</div>
                </div>
              </div>

              {/* Course Enrollment Overview */}
              <div className="quick-actions">
                <h3><BookOpen size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Course Enrollment Overview</h3>
                <div className="course-stats-list">
                  {courseStats.map((course, i) => {
                    const completionRate = getCompletionRate(course.completed, course.enrolled);
                    const progressValue = safePercent(course.progress ?? completionRate);

                    return (
                      <div key={i} className="course-stat-item">
                        <div className="course-stat-info">
                          <div className="course-stat-name">{course.name}</div>
                          <div className="course-stat-details">
                            <span>Enrolled: {toNumber(course.enrolled, 0)}</span>
                            <span>Completed: {toNumber(course.completed, 0)}</span>
                          </div>
                        </div>
                        <div className="course-stat-progress">
                          <div className="progress-bar-container" style={{ width: '150px' }}>
                            <div className="progress-bar" style={{ width: `${progressValue}%` }}></div>
                          </div>
                          <span className="progress-text">{progressValue}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {tab === "users" && (
            <div>
              <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2><Users size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> All Users ({users.length})</h2>
                  <p>Manage all registered users</p>
                </div>
                <button
                  onClick={() => setShowAddUser(true)}
                  style={{ background: "var(--primary)", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <PlusCircle size={16} /> Add User
                </button>
              </div>

              {/* Add User Modal */}
              {showAddUser && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                  <div style={{ background: "white", padding: "2rem", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
                    <h3 style={{ fontFamily: "Sora, sans-serif", marginBottom: "1.5rem" }}>Add New User</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Name</label>
                        <input
                          type="text"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }}
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Email</label>
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }}
                          placeholder="Enter email"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Password</label>
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }}
                          placeholder="Enter password"
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="checkbox"
                          checked={newUser.is_admin}
                          onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                          id="isAdmin"
                        />
                        <label htmlFor="isAdmin" style={{ fontWeight: 600 }}>Admin User</label>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Skill Level</label>
                        <select
                          value={newUser.skill_level}
                          onChange={(e) => setNewUser({ ...newUser, skill_level: e.target.value })}
                          style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Skills / Interests</label>
                        <textarea
                          rows="2"
                          value={newUser.interests}
                          onChange={(e) => setNewUser({ ...newUser, interests: e.target.value })}
                          style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", resize: "vertical" }}
                          placeholder="Python, Web Development, AI"
                        />
                        <small style={{ color: "var(--muted)" }}>Add a few interests separated by commas.</small>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <button
                          onClick={handleAddUser}
                          disabled={addingUser}
                          style={{ flex: 1, background: "var(--primary)", color: "white", border: "none", padding: "0.5rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                        >
                          {addingUser ? "Adding..." : "Add User"}
                        </button>
                        <button
                          onClick={() => { setShowAddUser(false); setNewUser({ name: "", email: "", password: "", is_admin: false, skill_level: "Beginner", interests: "" }); }}
                          style={{ flex: 1, background: "var(--border)", color: "var(--dark)", border: "none", padding: "0.5rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="history-list">
                {users.map((u, i) => (
                  <div className="history-item" key={i}>

                    <div className="user-avatar">
                      {u.name?.[0]?.toUpperCase()}
                    </div>

                    <div className="history-info">
                      <div className="history-query">
                        {u.name} — {u.email}
                      </div>

                      <div className="history-date">
                        Searches: {u.searches} |
                        Quizzes: {u.quizzes} |
                        Joined: {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px"
                      }}
                    >
                      <button
                        onClick={() => handleViewActivity(u.id)}
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          padding: ".4rem .9rem",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        View Activity
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          padding: ".4rem .9rem",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Delete
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}


              {/* COURSES TAB */}
              {tab === "courses" && (
                <div>
                  <div className="section-header">
                    <h2><BookOpen size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Course Analytics</h2>
                    <p>Track course enrollment and completion rates</p>
                  </div>
                  <div className="course-stats-list">
                    {courseStats.map((course, i) => {
                      const completionRate = getCompletionRate(course.completed, course.enrolled);
                      const progressValue = safePercent(course.progress ?? completionRate);

                      return (
                        <div key={i} className="course-stat-item">
                          <div className="course-stat-info">
                            <div className="course-stat-name">{course.name}</div>
                            <div className="course-stat-details">
                              <span>Enrolled: {toNumber(course.enrolled, 0)}</span>
                              <span>Completed: {toNumber(course.completed, 0)}</span>
                              <span>Completion Rate: {completionRate}%</span>
                            </div>
                          </div>
                          <div className="course-stat-progress">
                            <div className="progress-bar-container" style={{ width: '150px' }}>
                              <div className="progress-bar" style={{ width: `${progressValue}%` }}></div>
                            </div>
                            <span className="progress-text">{progressValue}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEARCHES TAB */}
              {tab === "searches" && (
                <div>
                  <div className="section-header">
                    <h2><Search size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> All Searches ({searches.length})</h2>
                    <p>Recent searches by all users</p>
                  </div>
                  <div className="history-list">
                    {searches.map((s, i) => (
                      <div className="history-item" key={i}>
                        <div className="history-icon" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><Search size={18} /></div>
                        <div className="history-info">
                          <div className="history-query">{s.query}</div>
                          <div className="history-date">{s.name} ({s.email}) — {new Date(s.searched_at).toLocaleString()}</div>
                        </div>
                        <span className="history-badge">#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUIZ RESULTS TAB */}
              {tab === "quizzes" && (
                <div>
                  <div className="section-header">
                    <h2><ClipboardCheck size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> All Quiz Results ({quizzes.length})</h2>
                    <p>Quiz scores of all users</p>
                  </div>
                  <div className="history-list">
                    {quizzes.map((q, i) => {
                      const title = q.course_title || "General Quiz";
                      const kind = q.source === "assessment"
                        ? `Assessment${Number.isInteger(q.step_index) ? ` · Step ${q.step_index + 1}` : ""}`
                        : "Practice Quiz";
                      return (
                        <div className="history-item" key={i}>
                           <div className="history-icon" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><ClipboardCheck size={18} /></div>
                          <div className="history-info">
                            <div className="history-query">{q.name} — {title} ({kind}) — Score: {q.score}% {q.score >= 60 ? <span style={{color: "#16a34a"}}>✓ Passed</span> : <span style={{color: "#dc2626"}}>✗ Failed</span>}</div>
                            <div className="history-date">{q.email} — {new Date(q.taken_at).toLocaleString()}</div>
                          </div>
                          <span className="history-badge" style={{ background: q.score >= 60 ? "#dcfce7" : "#fee2e2", color: q.score >= 60 ? "#16a34a" : "#dc2626" }}>
                            {q.score}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FEEDBACK TAB */}
              {tab === "feedback" && (
                <div>
                  <div className="section-header">
                    <h2><Star size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> All Feedback ({feedback.length})</h2>
                    <p>Reviews submitted by all users</p>
                  </div>
                  <div className="history-list">
                    {feedback.map((f, i) => (
                      <div className="history-item" key={i}>
                        <div className="history-icon" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><Star size={18} /></div>
                        <div className="history-info">
                          <div className="history-query">{f.course_title} — {"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</div>
                          <div className="history-date">{f.user_name || "Anonymous"} — {f.comment}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteFeedback(f.id)}
                          style={{ background: "#ef4444", color: "white", border: "none", padding: ".4rem .9rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIVITY TAB */}
              {tab === "activity" && (
                <div>
                  <div className="section-header">
                    <h2><TrendingUp size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Platform Activity</h2>
                    <p>Weekly user engagement metrics</p>
                  </div>
                  <div className="activity-chart">
                    {activityData.length > 0 && !activityData.every(d => d.users === 0 && d.courses === 0 && d.quizzes === 0) ? (
                      <>
                        <div className="activity-bars">
                          {activityData.map((day, i) => {
                            const maxUsers = Math.max(1, ...activityData.map(d => d.users));
                            const maxCourses = Math.max(1, ...activityData.map(d => d.courses));
                            const maxQuizzes = Math.max(1, ...activityData.map(d => d.quizzes));
                            return (
                              <div key={i} className="activity-bar-group">
                                <div className="activity-bar-track">
                                  <div className="activity-bar" style={{ height: `${(day.users / maxUsers) * 100}%` }} title={`New users: ${day.users}`}></div>
                                  <div className="activity-bar secondary" style={{ height: `${(day.courses / maxCourses) * 100}%` }} title={`New enrollments: ${day.courses}`}></div>
                                  <div className="activity-bar tertiary" style={{ height: `${(day.quizzes / maxQuizzes) * 100}%` }} title={`Quizzes taken: ${day.quizzes}`}></div>
                                </div>
                                <div className="activity-label">{day.day}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="activity-legend">
                          <span className="legend-item"><span className="legend-dot primary"></span>New Users</span>
                          <span className="legend-item"><span className="legend-dot secondary"></span>New Enrollments</span>
                          <span className="legend-item"><span className="legend-dot tertiary"></span>Quizzes Taken</span>
                        </div>
                      </>
                    ) : (
                      <p style={{ textAlign: "center", color: "var(--muted)", padding: "2rem 0" }}>
                        No platform activity in the last 7 days.
                      </p>
                    )}
                  </div>

                  {/* Certificate Stats */}
                  <div className="quick-actions">
                    <h3><Award size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Certificate Statistics</h3>
                    <div className="cert-stats-list">
                      {certificateStats.map((cert, i) => (
                        <div key={i} className="cert-stat-item">
                          <div className="cert-stat-name">{cert.name}</div>
                          <div className="cert-stat-values">
                            <span className="cert-earned">Earned: {cert.earned}</span>
                            <span className="cert-pending">Pending: {cert.pending}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
            

        {/* ================= USER ACTIVITY MODAL ================= */}

        {
          showActivity && selectedActivity && (
            <div
              className="activity-modal-overlay"
              onClick={() => { setShowActivity(false); setSelectedActivity(null); }}
            >
              <div className="activity-modal" onClick={(e) => e.stopPropagation()}>
                <div className="activity-modal-header">
                  <h2>User Activity</h2>
                  <button
                    className="activity-modal-close"
                    onClick={() => { setShowActivity(false); setSelectedActivity(null); }}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="activity-modal-body">
                  <div className="activity-user-row">
                    <div className="activity-user-avatar">
                      {(selectedActivity.user?.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="activity-user-name">{selectedActivity.user?.name || "Unknown user"}</div>
                      <div className="activity-user-email">{selectedActivity.user?.email}</div>
                    </div>
                  </div>

                  {/* Read-only profile summary */}
                  <div className="activity-profile-card">
                    <div className="activity-profile-item">
                      <span className="activity-profile-label">User ID</span>
                      <span className="activity-profile-value">{selectedActivity.user?.id ?? "—"}</span>
                    </div>
                    <div className="activity-profile-item">
                      <span className="activity-profile-label">Role</span>
                      <span className="activity-profile-value">
                        {selectedActivity.user?.is_admin ? "Admin" : "Student"}
                      </span>
                    </div>
                    <div className="activity-profile-item">
                      <span className="activity-profile-label">Joined</span>
                      <span className="activity-profile-value">
                        {selectedActivity.user?.created_at
                          ? new Date(selectedActivity.user.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* At-a-glance activity stats, useful even when a user is brand new */}
                  <div className="activity-stats-row">
                    <div className="activity-stat-tile">
                      <span className="activity-stat-value">{selectedActivity.search_history?.length || 0}</span>
                      <span className="activity-stat-label"><Search size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> Searches</span>
                    </div>
                    <div className="activity-stat-tile">
                      <span className="activity-stat-value">{selectedActivity.quiz_results?.length || 0}</span>
                      <span className="activity-stat-label"><ClipboardCheck size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> Quizzes</span>
                    </div>
                    <div className="activity-stat-tile">
                      <span className="activity-stat-value">{selectedActivity.enrollments?.length || 0}</span>
                      <span className="activity-stat-label"><BookOpen size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> Courses</span>
                    </div>
                    <div className="activity-stat-tile">
                      <span className="activity-stat-value">{selectedActivity.certificates?.length || 0}</span>
                      <span className="activity-stat-label"><Award size={14} className="inline-icon" style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle" }} /> Certificates</span>
                    </div>
                  </div>

                  <div className="activity-section">
                    <div className="activity-section-title"><Search size={16} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Search History</div>
                    {selectedActivity.search_history?.length ? (
                      <ul className="activity-list">
                        {selectedActivity.search_history.map((item, index) => (
                          <li className="activity-list-item" key={item.id ?? index}>
                            <span>{item.query || item.search_query}</span>
                            {item.searched_at && (
                              <span className="muted">{new Date(item.searched_at).toLocaleDateString()}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="activity-empty">No searches found.</p>
                    )}
                  </div>

                  <div className="activity-section">
                    <div className="activity-section-title"><ClipboardCheck size={16} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Quiz Results</div>
                    {selectedActivity.quiz_results?.length ? (
                      <ul className="activity-list">
                        {selectedActivity.quiz_results.map((quiz, index) => {
                          const title = quiz.course_title || "General Quiz";
                          const kind = quiz.source === "assessment"
                            ? `Assessment${Number.isInteger(quiz.step_index) ? ` · Step ${quiz.step_index + 1}` : ""}`
                            : "Practice Quiz";
                          return (
                            <li className="activity-list-item" key={quiz.id ?? index}>
                              <span>
                                <strong>{title}</strong> — {kind} — Score: {quiz.score}
                                {typeof quiz.passed === "boolean" && (
                                  <span className={quiz.passed ? "badge-pass" : "badge-fail"} style={{ marginLeft: "0.5rem" }}>
                                    {quiz.passed ? "Passed" : "Failed"}
                                  </span>
                                )}
                              </span>
                              {quiz.taken_at && (
                                <span className="muted">{new Date(quiz.taken_at).toLocaleDateString()}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="activity-empty">No quiz history.</p>
                    )}
                  </div>

                  <div className="activity-section">
                    <div className="activity-section-title"><BookOpen size={16} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Enrolled Courses</div>
                    {selectedActivity.enrollments?.length ? (
                      <ul className="activity-list">
                        {selectedActivity.enrollments.map((course, index) => (
                          <li className="activity-list-item" key={course.id ?? index}>
                            <span>{course.course_title || course.course_name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="activity-empty">No enrolled courses.</p>
                    )}
                  </div>

                  <div className="activity-section">
                    <div className="activity-section-title"><TrendingUp size={16} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Course Progress</div>
                    {selectedActivity.course_progress?.length ? (
                      <ul className="activity-list">
                        {selectedActivity.course_progress.map((progress, index) => (
                          <li className="activity-list-item" key={progress.id ?? index}>
                            <span>{progress.course_title || progress.course_name}</span>
                            <span className="muted">
                              {progress.progress ?? progress.progress_percentage ?? 0}%
                              {progress.completed ? " · Completed" : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="activity-empty">No progress found.</p>
                    )}
                  </div>

                  <div className="activity-section">
                    <div className="activity-section-title"><Award size={16} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Certificates</div>
                    {selectedActivity.certificates?.length ? (
                      <ul className="activity-list">
                        {selectedActivity.certificates.map((certificate, index) => (
                          <li className="activity-list-item" key={certificate.id ?? index}>
                            <span>{certificate.course_title || certificate.course_name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="activity-empty">No certificates.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }

      </main >

         </div>
      );
}