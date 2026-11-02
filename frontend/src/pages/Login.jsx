import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, forgotPassword } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
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

export default function Login() {
  const navigate = useNavigate();
  const { saveUser } = useAuth();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("All fields are required"); return; }
    setLoading(true); setError("");
    try {
      const data = await login(form);
      saveUser(data);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Check credentials."));
    } finally { setLoading(false); }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setError("Email is required"); return; }
    setLoading(true); setError(""); setSuccessMsg("");
    try {
      await forgotPassword(forgotEmail);
      setSuccessMsg("A password reset link has been sent to your email.");
      setForgotEmail("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reset password. Check email."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link to="/" className="back-home" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ArrowLeft size={14} /> Back to Home</Link>
        <div className="auth-brand">
          <span className="logo-icon"><Zap size={20} style={{ display: "inline-block", verticalAlign: "middle" }} /></span> Learn<span className="logo-accent">Sphere</span>
        </div>

        {showForgot ? (
          <>
            <h1>Reset password</h1>
            <p>Enter your email to receive a password reset link</p>

            <form className="auth-form" onSubmit={handleForgotSubmit}>
              {error && <div className="auth-error">{error}</div>}
              {successMsg && (
                <div style={{ color: "#15803d", background: "#ecfdf3", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "0.85rem", fontWeight: 600 }}>
                  {successMsg}
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="you@example.com"
                  value={forgotEmail} 
                  required
                  onChange={(e) => setForgotEmail(e.target.value)} 
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
                <span 
                  onClick={() => { setShowForgot(false); setError(""); setSuccessMsg(""); }} 
                  style={{ fontSize: "0.85rem", color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}
                >
                  Back to Sign In
                </span>
              </div>
            </form>
          </>
        ) : (
          <>
            <h1>Welcome back</h1>
            <p>Sign in to continue your learning journey</p>

            <form className="auth-form" onSubmit={submit}>
              {error && <div className="auth-error">{error}</div>}
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" placeholder="you@example.com"
                  value={form.email} onChange={handle} />
              </div>
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ margin: 0 }}>Password</label>
                  <span 
                    onClick={() => { setShowForgot(true); setError(""); setSuccessMsg(""); }} 
                    style={{ fontSize: "0.8rem", color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}
                  >
                    Forgot password?
                  </span>
                </div>
                <input name="password" type="password" placeholder="••••••••"
                  value={form.password} onChange={handle} />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </>
        )}

        <p className="auth-switch" style={{ marginTop: "1.5rem" }}>
          Don't have an account? <Link to="/signup">Sign up free</Link>
        </p>
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