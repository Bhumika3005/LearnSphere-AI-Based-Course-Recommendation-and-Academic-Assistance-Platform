import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/api.js";
import { getErrorMessage } from "../context/ToastContext.jsx";
import "../styles/Auth.css";

// Inline SVG replacements for Lucide icons to prevent context errors
const ArrowLeft = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const Zap = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const BookOpen = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const Route = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="6" cy="19" r="3"></circle>
    <circle cx="18" cy="5" r="3"></circle>
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
  </svg>
);

const ClipboardCheck = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <polyline points="9 11 12 14 22 4"></polyline>
  </svg>
);

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !token) {
      setError("Invalid password reset link. Please request a new link.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await resetPassword(email, password, token);
      setSuccess("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update password. Reset token may have expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link to="/login" className="back-home" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ArrowLeft size={14} /> Back to Sign In</Link>
        <div className="auth-brand">
          <span className="logo-icon"><Zap size={20} style={{ display: "inline-block", verticalAlign: "middle" }} /></span> Learn<span className="logo-accent">Sphere</span>
        </div>
        <h1>Set new password</h1>
        <p>Choose a secure password for <strong>{email || "your account"}</strong></p>

        <form className="auth-form" onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}
          {success && (
            <div style={{ color: "#15803d", background: "#ecfdf3", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "0.85rem", fontWeight: 600 }}>
              {success}
            </div>
          )}
          <div className="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              required
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword} 
              required
              onChange={(e) => setConfirmPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      <div className="auth-right">
        <div className="auth-illustration">
          <div className="ill-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}><BookOpen size={16} /> 10,000+ Courses</div>
          <div className="ill-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Route size={16} /> Guided Paths</div>
          <div className="ill-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}><ClipboardCheck size={16} /> Smart Quizzes</div>
          <div className="ill-blob" />
        </div>
      </div>
    </div>
  );
}
