/**
 * Register Page
 *
 * Premium‑styled registration form collecting name, email, and password.
 * On success, automatically logs the user in and redirects to /.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isOwner, setIsOwner] = useState(false);
  const [salons, setSalons] = useState([]);
  const [selectedSalonId, setSelectedSalonId] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

  useEffect(() => {
    if (isOwner && salons.length === 0) {
      fetch(`${API_BASE}/api/salons`)
        .then((res) => res.json())
        .then((data) => {
          setSalons(data);
          if (data.length > 0) {
            setSelectedSalonId(data[0].id);
          }
        })
        .catch((err) => console.error("Failed to load salons for owner registration", err));
    }
  }, [isOwner]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (isOwner && !selectedSalonId) {
      setError("Please select a salon to register as owner.");
      return;
    }

    setSubmitting(true);

    try {
      await register(email, password, fullName, isOwner ? Number(selectedSalonId) : null);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} />

      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brandRow}>
          <span style={styles.brandText}>AURA</span>
          <span style={styles.brandBadge}>Elite</span>
        </div>

        <h1 style={styles.heading}>Create Your Account</h1>
        <p style={styles.subheading}>
          Join Bangalore's most exclusive salon discovery platform.
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
          {/* Full Name */}
          <label style={styles.label}>Full Name</label>
          <input
            id="register-name"
            type="text"
            required
            placeholder="Srushti Patel"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={styles.input}
          />

          {/* Email */}
          <label style={styles.label}>Email Address</label>
          <input
            id="register-email"
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
            id="register-password"
            type="password"
            required
            minLength={6}
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {/* Confirm Password */}
          <label style={styles.label}>Confirm Password</label>
          <input
            id="register-confirm"
            type="password"
            required
            minLength={6}
            placeholder="Re‑enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
          />

          {/* Salon Owner Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <input
              id="register-is-owner"
              type="checkbox"
              checked={isOwner}
              onChange={(e) => setIsOwner(e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "#c5a880", cursor: "pointer" }}
            />
            <label htmlFor="register-is-owner" style={{ fontSize: "0.85rem", color: "#a1a1aa", fontWeight: 650, cursor: "pointer" }}>
              I am a Salon Owner / Partner
            </label>
          </div>

          {/* Salon Selection Dropdown */}
          {isOwner && (
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "18px" }}>
              <label style={styles.label}>Select Your Salon</label>
              <select
                id="register-salon-id"
                value={selectedSalonId}
                onChange={(e) => setSelectedSalonId(e.target.value)}
                style={styles.select}
                required
              >
                {salons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.area})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submit */}
          <button
            id="register-submit"
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creating Account…" : "Create Account"}
          </button>
        </form>

        <p style={styles.footerText}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ── Inline Styles (matches Login.jsx luxury dark theme) ──────── */

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
  select: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "6px",
    padding: "12px 16px",
    color: "#fcfcfd",
    fontSize: "0.95rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    cursor: "pointer",
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
