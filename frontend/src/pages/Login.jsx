/**
 * Login Page
 *
 * Premium‑styled login form with email + password fields,
 * error feedback, loading state, and a link to /register.
 */

import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname && location.state?.from?.pathname !== "/"
    ? location.state.from.pathname
    : "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Decorative background gradient */}
      <div style={styles.bgGlow} />

      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brandRow}>
          <span style={styles.brandText}>AURA</span>
          <span style={styles.brandBadge}>Elite</span>
        </div>

        <h1 style={styles.heading}>Welcome Back</h1>
        <p style={styles.subheading}>
          Sign in to access your luxury salon dashboard.
        </p>

        <div style={{
          background: "rgba(197, 168, 128, 0.05)",
          border: "1px dashed rgba(197, 168, 128, 0.2)",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "0.82rem",
          color: "#c5a880",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>✨</span> Premium salon booking and beauty consultation.
        </div>

        {/* Error Alert */}
        {error && (
          <div style={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email */}
          <label style={styles.label}>Email Address</label>
          <input
            id="login-email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          {/* Password */}
          <label style={styles.label}>Password</label>
          <input
            id="login-password"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={styles.footerText}>
          Don't have an account?{" "}
          <Link to="/register" style={styles.link}>
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ── Inline Styles (luxury dark theme) ────────────────────────── */

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#08080a",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  },
  bgGlow: {
    position: "absolute",
    width: "480px",
    height: "480px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(197,168,128,0.12) 0%, transparent 70%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "420px",
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
    padding: "40px 36px",
    boxShadow: "0 16px 48px rgba(0,0,0,0.9)",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "28px",
  },
  brandText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.4rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: "linear-gradient(135deg, #fff 30%, #c5a880 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  brandBadge: {
    fontSize: "0.7rem",
    fontWeight: 300,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#c5a880",
    border: "1px solid #423829",
    padding: "1px 6px",
    borderRadius: "3px",
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.8rem",
    fontWeight: 500,
    color: "#fcfcfd",
    marginBottom: "8px",
  },
  subheading: {
    fontSize: "0.9rem",
    color: "#a1a1aa",
    marginBottom: "28px",
    lineHeight: 1.5,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: "6px",
    padding: "10px 14px",
    fontSize: "0.85rem",
    color: "#f87171",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "6px",
    padding: "12px 16px",
    color: "#fcfcfd",
    fontSize: "0.95rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    marginBottom: "18px",
    transition: "border-color 0.3s",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #8a704c 0%, #c5a880 100%)",
    color: "#0e0e0e",
    border: "none",
    borderRadius: "6px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.95rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginTop: "4px",
    transition: "opacity 0.3s, transform 0.3s",
    boxShadow: "0 4px 14px rgba(197,168,128,0.25)",
  },
  footerText: {
    textAlign: "center",
    fontSize: "0.85rem",
    color: "#71717a",
    marginTop: "24px",
  },
  link: {
    color: "#c5a880",
    fontWeight: 600,
    textDecoration: "none",
  },
};
