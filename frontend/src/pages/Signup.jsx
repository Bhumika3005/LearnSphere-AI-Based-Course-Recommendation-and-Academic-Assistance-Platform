import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../services/api.js";
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

const Compass = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
  </svg>
);

const TrendingUp = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const Star = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

export default function Signup() {
  const navigate = useNavigate();
  const { saveUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    skill_level: "Beginner",
    interests: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("All fields required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        skill_level: form.skill_level || "Beginner",
        interests: form.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const data = await signup(payload);
      saveUser({
        user_id: data.user_id,
        name: form.name,
        email: form.email,
        skill_level: payload.skill_level,
        interests: payload.interests,
        is_admin: 0,
      });
      setSuccess("Account created successfully! Redirecting to your dashboard...");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      setError(getErrorMessage(err, "Signup failed. Try again."));
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
        <h1>Create your profile</h1>
        <p>Add your skills and interests to personalize your learning journey</p>

        <form className="auth-form" onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success" style={{ color: "#15803d", background: "#ecfdf3", padding: "10px", borderRadius: "8px", marginBottom: "12px" }}>{success}</div>}
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" placeholder="Your name" value={form.name} onChange={handle} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" placeholder="Min 6 characters" value={form.password} onChange={handle} />
          </div>
          <div className="form-group">
            <label>Skill Level</label>
            <select name="skill_level" value={form.skill_level} onChange={handle}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div className="form-group">
            <label>Skills / Interests</label>
            <textarea
              name="interests"
              rows="3"
              placeholder="Python, Web Development, AI"
              value={form.interests}
              onChange={handle}
            />
            <small>Add a few interests separated by commas.</small>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Creating profile..." : "Create Profile"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-illustration">
          <div className="ill-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Compass size={16} /> Personalized Guidance</div>
          <div className="ill-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}><TrendingUp size={16} /> Track Progress</div>
          <div className="ill-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Star size={16} /> Rate Courses</div>
          <div className="ill-blob" />
        </div>
      </div>
    </div>
  );
}