import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyCertificate, API_URL } from "../services/api";
import "../styles/Dashboard.css";
import "../styles/Progress.css";
// Inline SVG replacements for Lucide icons to prevent context errors
const Search = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CheckCircle2 = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="m9 12 2 2 4-4"></path>
  </svg>
);

const AlertTriangle = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const ArrowLeftCircle = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 8 8 12 12 16"></polyline>
    <line x1="16" y1="12" x2="8" y2="12"></line>
  </svg>
);

export default function VerifyCertificate() {
  const { certificateId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    verifyCertificate(certificateId)
      .then((d) => { if (active) setResult(d); })
      .catch(() => { if (active) setResult({ valid: false }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [certificateId]);

  const hostname = window.location.hostname;
  const dynamicBackendUrl = (hostname === "localhost" || hostname === "127.0.0.1")
    ? API_URL
    : `http://${hostname}:8000`;

  return (
    <div className="dashboard-layout">
      <main className="main-content" style={{ marginLeft: 0, width: "100%" }}>
        <div className="topbar">
          <h1 className="topbar-title"><Search size={24} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Certificate Verification</h1>
        </div>

        <div className="tab-content" style={{ maxWidth: 560, margin: "0 auto" }}>
          {loading && <div className="empty-mini">Checking certificate...</div>}

          {!loading && result?.valid && (
            <div className="cert-card">
              <div className="cert-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><CheckCircle2 size={14} /> VALID CERTIFICATE</div>
              <div className="cert-title">{result.course_title}</div>
              <div className="cert-sub">
                Awarded to {result.student_name} on {result.completion_date}
              </div>
              <div className="cert-id">ID: {result.certificate_id}</div>
              <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: ".75rem" }}>
                This certificate was issued by LearnSphere Platform and matches our records.
              </p>

              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <a
                  className="cert-btn primary"
                  href={`${dynamicBackendUrl}/progress/certificate/pdf/${certificateId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", padding: "0.6rem 1.2rem", background: "var(--success)", color: "white", textDecoration: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem" }}
                >
                  View PDF Certificate
                </a>
                <a
                  className="cert-btn ghost"
                  href={`${dynamicBackendUrl}/progress/certificate/pdf/${certificateId}?download=true`}
                  rel="noreferrer"
                  style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", padding: "0.6rem 1.2rem", border: "1px solid var(--border)", textDecoration: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", color: "var(--dark)" }}
                >
                  Download PDF Certificate
                </a>
              </div>
            </div>
          )}

          {!loading && !result?.valid && (
            <div className="empty-state-large">
              <div className="eil-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--warning)" }}><AlertTriangle size={32} /></div>
              <h3>Certificate not found</h3>
              <p>
                We couldn't verify a certificate with ID <strong>{certificateId}</strong>.
                It may be invalid, revoked, or mistyped.
              </p>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
             <Link className="cert-btn ghost" to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ArrowLeftCircle size={14} /> Back to LearnSphere</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
