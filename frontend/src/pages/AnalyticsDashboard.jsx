import React, { useState, useEffect } from "react";
import {
  getAnalyticsOverview,
  getProgressByCourse,
  getQuizScoreTrend,
  getActivitySummary,
} from "../services/api";
import axios from "axios";
import "../styles/Progress.css";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Target,
  Award,
  Search,
  ClipboardCheck,
  PlayCircle,
  Zap
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

// ── fetch weekly/monthly activity directly (new endpoints) ───────────
const getWeeklyActivity = (userId) =>
  axios.get(`${API_URL}/analytics/${userId}/weekly-activity`).then(r => r.data);

const getMonthlyActivity = (userId) =>
  axios.get(`${API_URL}/analytics/${userId}/monthly-activity`).then(r => r.data);

// ── small helpers ─────────────────────────────────────────────────────
function ACard({ val, lbl, icon, color }) {
  return (
    <div className={`analytics-card ${color}`}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: ".5rem" }}>{icon}</div>
      <div className="analytics-card-val">{val}</div>
      <div className="analytics-card-lbl">{lbl}</div>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="empty-mini" style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>
      {msg}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
export default function AnalyticsDashboard({ userId }) {

  const [overview,  setOverview]  = useState(null);
  const [byCourse,  setByCourse]  = useState([]);
  const [scores,    setScores]    = useState([]);
  const [activity,  setActivity]  = useState([]);
  const [weekly,    setWeekly]    = useState([]);
  const [monthly,   setMonthly]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeBar, setActiveBar] = useState(null);   // hovered bar index

  // ── load all data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    Promise.all([
      getAnalyticsOverview(userId)
        .then(setOverview)
        .catch(() => {}),

      getProgressByCourse(userId)
        .then(d => setByCourse(d.chart_data || []))
        .catch(() => {}),

      getQuizScoreTrend(userId)
        .then(d => setScores(d.chart_data || []))
        .catch(() => {}),

      getActivitySummary(userId)
        .then(d => setActivity(d.chart_data || []))
        .catch(() => {}),

      // ← real weekly endpoint
      getWeeklyActivity(userId)
        .then(d => setWeekly(d.weekly_data || []))
        .catch(() => {}),

      // ← monthly activity endpoint
      getMonthlyActivity(userId)
        .then(d => setMonthly(d.monthly_data || []))
        .catch(() => {}),

    ]).finally(() => setLoading(false));
  }, [userId]);

  // ── derived values ──────────────────────────────────────────────────
  const maxWeekly   = Math.max(1, ...weekly.map(w => w.total));
  const maxMonthly  = Math.max(1, ...monthly.map(m => m.total));
  const maxActivity = Math.max(1, ...activity.map(a => a.value));
  const BAR_MAX_PX  = 120;   // tallest bar height in px

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"300px" }}>
        <div className="empty-mini">Loading analytics...</div>
      </div>
    );
  }

  if (!overview) {
    return <EmptyState msg="No analytics data available yet. Start learning to see your progress!" />;
  }

  return (
    <div className="tab-content">

      {/* ── Page header ── */}
      <div className="section-header">
        <h2><BarChart3 size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Analytics Dashboard</h2>
        <p>Your learning progress at a glance</p>
      </div>

      {/* ── 6 stat cards ── */}
      <div className="analytics-grid">
        <ACard val={overview.total_courses_enrolled}          lbl="Courses Enrolled"    icon={<BookOpen size={24} />} color="lblue"   />
        <ACard val={overview.courses_completed}               lbl="Courses Completed"   icon={<CheckCircle2 size={24} />} color="lgreen"  />
        <ACard val={overview.courses_in_progress}             lbl="In Progress"         icon={<RefreshCw size={24} />} color="lorange" />
        <ACard val={`${overview.average_progress_percentage ?? 0}%`}
                                                              lbl="Avg Progress"        icon={<TrendingUp size={24} />} color="lpurple" />
        <ACard val={`${overview.average_quiz_score ?? 0}%`}  lbl="Avg Quiz Score"      icon={<Target size={24} />} color="lcyan"   />
        <ACard val={overview.certificates_earned}             lbl="Certificates Earned" icon={<Award size={24} />} color="lpink"   />
      </div>

      {/* ── Weekly Learning Activity — REAL DATA ── */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title"><BarChart3 size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Weekly Learning Activity</div>
        <p style={{ fontSize:".78rem", color:"var(--muted)", marginBottom:".75rem", marginTop:"-.25rem" }}>
          Searches + quizzes + videos watched per day (last 7 days)
        </p>

        {weekly.every(w => w.total === 0) ? (
          <EmptyState msg="No activity in the last 7 days. Search a course, take a quiz, or watch a video!" />
        ) : (
          <>
            {/* Bar chart */}
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              height: `${BAR_MAX_PX + 30}px`,
              gap: "6px",
              padding: "0 4px",
            }}>
              {weekly.map((d, i) => {
                const barH = d.total === 0
                  ? 4
                  : Math.max(10, Math.round((d.total / maxWeekly) * BAR_MAX_PX));
                const isHovered = activeBar === i;

                return (
                  <div
                    key={i}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}
                    onMouseEnter={() => setActiveBar(i)}
                    onMouseLeave={() => setActiveBar(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div style={{
                        background:"var(--dark)", color:"#fff", borderRadius:"6px",
                        padding:"4px 8px", fontSize:".72rem", whiteSpace:"nowrap",
                        marginBottom:"4px", lineHeight:1.5,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Search size={12} /> {d.searches} searches</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><ClipboardCheck size={12} /> {d.quizzes} quizzes</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><PlayCircle size={12} /> {d.videos} videos</div>
                      </div>
                    )}

                    {/* Activity count label */}
                    {d.total > 0 && (
                      <div style={{ fontSize:".7rem", color:"var(--muted)", marginBottom:"2px" }}>
                        {d.total}
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      title={`${d.day}: ${d.total} activities`}
                      style={{
                        width: "100%",
                        height: `${barH}px`,
                        background: d.total === 0
                          ? "var(--border)"
                          : isHovered
                            ? "linear-gradient(180deg,#818cf8,#4f46e5)"
                            : "linear-gradient(180deg,#6366f1,#4f46e5)",
                        borderRadius: "6px 6px 0 0",
                        transition: "height .3s ease, background .15s",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Day labels */}
            <div style={{
              display:"flex", justifyContent:"space-around",
              padding:"8px 4px 0",
              borderTop:"1px solid var(--border)",
            }}>
              {weekly.map((d, i) => (
                <div key={i} style={{
                  flex:1, textAlign:"center",
                  fontSize:".75rem",
                  color: activeBar === i ? "var(--primary)" : "var(--muted)",
                  fontWeight: activeBar === i ? 700 : 400,
                }}>
                  {d.day}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Progress by Course ── */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title"><BookOpen size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Progress by Course</div>

        {byCourse.length === 0 ? (
          <EmptyState msg="No enrolled courses yet. Enroll in a course to see progress here." />
        ) : (
          byCourse.map((c, i) => (
            <div className="bar-row" key={i} style={{ alignItems:"center" }}>
              {/* Course name — truncated */}
              <div className="bar-label" style={{
                maxWidth:"170px", overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap",
                fontSize:".82rem",
              }}>
                {c.course_id}
              </div>

              {/* Progress track */}
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max(c.progress > 0 ? 2 : 0, c.progress)}%` }}
                />
              </div>

              {/* Percentage + complete tick */}
              <div className="bar-val" style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                <span>{c.progress}%</span>
                {c.completed && (
                  <span style={{ color:"var(--success)", fontWeight:700 }}>✓</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Quiz Score Trend ── */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title"><TrendingUp size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Quiz Score Trend</div>

        {scores.length === 0 ? (
          <EmptyState msg="No quizzes taken yet. Take a quiz to see your score trend here." />
        ) : (
          <>
            {/* Bars */}
            <div style={{
              display:"flex", alignItems:"flex-end",
              gap:"8px", height:"110px", padding:"0 4px",
              marginBottom:"8px",
            }}>
              {scores.map((q, i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                  <div style={{ fontSize:".7rem", color:"var(--muted)", marginBottom:"3px" }}>
                    {q.score}%
                  </div>
                  <div style={{
                    width:"100%",
                    height:`${Math.max(4, q.score)}px`,
                    background: q.passed
                      ? "linear-gradient(180deg,#10b981,#34d399)"
                      : "linear-gradient(180deg,#ef4444,#f87171)",
                    borderRadius:"4px 4px 0 0",
                    minHeight:"4px",
                    transition:"height .3s",
                  }}/>
                </div>
              ))}
            </div>

            {/* Q labels */}
            <div style={{
              display:"flex", gap:"8px",
              padding:"6px 4px 0",
              borderTop:"1px solid var(--border)",
            }}>
              {scores.map((_, i) => (
                <div key={i} style={{ flex:1, textAlign:"center", fontSize:".75rem", color:"var(--muted)" }}>
                  Q{i+1}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display:"flex", gap:"1.25rem", marginTop:".6rem", fontSize:".75rem" }}>
              <span style={{ color:"#10b981", fontWeight:600 }}>■ Passed (≥60%)</span>
              <span style={{ color:"#ef4444", fontWeight:600 }}>■ Failed (&lt;60%)</span>
            </div>
          </>
        )}
      </div>

      {/* ── Monthly Learning Activity ── */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title"><BarChart3 size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Monthly Learning Activity</div>
        <p style={{ fontSize:"0.78rem", color:"var(--muted)", marginBottom:"0.75rem", marginTop:"-0.25rem" }}>
          Daily activity counts for the last 30 days.
        </p>

        {monthly.every(m => m.total === 0) ? (
          <EmptyState msg="No activity in the last 30 days. Search a course, take a quiz, or watch a video!" />
        ) : (
          <div style={{ overflowX: "auto", paddingBottom: "0.75rem" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: `${BAR_MAX_PX + 24}px`, minWidth: "720px" }}>
              {monthly.map((d, i) => {
                const barH = d.total === 0 ? 4 : Math.max(4, Math.round((d.total / maxMonthly) * BAR_MAX_PX));
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px" }}>
                    <div style={{ fontSize: ".65rem", color: "var(--muted)", marginBottom: "2px" }}>
                      {d.total > 0 ? d.total : ""}
                    </div>
                    <div style={{ width: "100%", height: `${barH}px`, background: d.total === 0 ? "var(--border)" : "linear-gradient(180deg,#818cf8,#4f46e5)", borderRadius: "6px 6px 0 0" }} />
                    <div style={{ fontSize: ".6rem", color: "var(--muted)", marginTop: "4px", textAlign: "center", lineHeight: 1.2 }}>
                      {d.day.replace(/^[A-Za-z]{3} /, "")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Activity Summary ── */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title"><Zap size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Activity Summary</div>

        {activity.every(a => a.value === 0) ? (
          <EmptyState msg="No activity recorded yet." />
        ) : (
          activity.map((a, i) => (
            <div className="bar-row" key={i}>
              <div className="bar-label">{a.label}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width:`${(a.value / maxActivity) * 100}%` }}
                />
              </div>
              <div className="bar-val">{a.value}</div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}