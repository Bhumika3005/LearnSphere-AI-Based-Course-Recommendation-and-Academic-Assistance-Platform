import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast, getErrorMessage } from "../context/ToastContext.jsx";
import { getCertificates, generateCertificate, getAllProgress, getCertificateQrUrl, API_URL } from "../services/api";
import "../styles/Dashboard.css";
import "../styles/Progress.css";
import {
  Award,
  ArrowLeftCircle,
  CheckCircle2
} from "lucide-react";

export default function Certificate() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [eligibleCourses, setEligibleCourses] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(() => {
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

  const handleDownload = (certificateId) => {
    window.open(`${API_URL}/progress/certificate/pdf/${certificateId}`, "_blank");
  };

  const certCourseTitles = certs.map(c => (c.course_title || "").trim().toLowerCase());
  const pendingCourses = eligibleCourses.filter(c => !certCourseTitles.includes((c.course_title || "").trim().toLowerCase()));

  return (
    <div className="dashboard-layout">
      <main className="main-content" style={{ marginLeft: 0, width: "100%" }}>
        <div className="topbar">
          <h1 className="topbar-title"><Award size={24} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Certificates</h1>
          <button className="nav-btn" onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeftCircle size={16} /> Back to Dashboard
          </button>
        </div>

        <div className="tab-content">
          {loading && <div className="empty-mini">Loading certificates...</div>}

          {!loading && pendingCourses.length > 0 && (
            <>
              <h3 style={{ fontFamily: "Sora, sans-serif", marginBottom: ".75rem" }}>
                Ready to Claim
              </h3>
              {pendingCourses.map(c => (
                <div className="cert-card" key={c.course_title}>
                  <div className="cert-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Award size={14} /> CERTIFICATE READY</div>
                  <div className="cert-title">{c.course_title}</div>
                  <div className="cert-sub">You've completed 100% of this course.</div>
                  <div className="cert-actions">
                    <button
                      className="cert-btn primary"
                      onClick={() => handleGenerate(c.course_title)}
                      disabled={generating === c.course_title}
                    >
                      {generating === c.course_title ? "Generating..." : "Generate Certificate"}
                    </button>
                  </div>
                </div>
              ))}
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

          {certs.map((c) => (
            <div className="cert-card" key={c.id}>
              <div className="cert-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Award size={14} /> CERTIFICATE EARNED</div>
              <div className="cert-body-row">
                <div>
                  <div className="cert-title">{c.course_title}</div>
                  <div className="cert-sub">Awarded to {c.student_name} on {c.completion_date}</div>
                  <div className="cert-id">ID: {c.certificate_id}</div>
                  <div className="cert-actions">
                    <button className="cert-btn ghost" onClick={() => handleDownload(c.certificate_id)}>
                      Download PDF
                    </button>
                    <a
                      className="cert-btn ghost"
                      href={`/verify/${c.certificate_id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <CheckCircle2 size={12} /> Verify
                    </a>
                  </div>
                </div>
                <div className="cert-qr-box">
                  <img
                    src={getCertificateQrUrl(c.certificate_id)}
                    alt={`QR code to verify certificate ${c.certificate_id}`}
                    className="cert-qr-img"
                  />
                  <span className="cert-qr-caption">Scan to verify</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}