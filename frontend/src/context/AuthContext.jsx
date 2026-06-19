/**
 * AuthContext — Global authentication state for the React app.
 *
 * Provides:
 *   user      – current user object (or null)
 *   token     – JWT string (or null)
 *   loading   – true while the initial /me call is in‑flight
 *   login()   – authenticate with email + password
 *   register()– create account then auto‑login
 *   logout()  – clear token and user state
 */

import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

const AuthContext = createContext(null);

// ── Provider ────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [loading, setLoading] = useState(true);

  // On mount (or token change) try to fetch the current user profile
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser(token);
  }, [token]);

  // ── Internal helpers ────────────────────────────────────────

  async function fetchCurrentUser(jwt) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Token expired or invalid → clear everything
        clearAuth();
      }
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }

  function persistToken(jwt) {
    localStorage.setItem("access_token", jwt);
    setToken(jwt);
  }

  function clearAuth() {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Authenticate the user with email and password.
   * Uses OAuth2 form‑encoded body (FastAPI OAuth2PasswordRequestForm).
   */
  async function login(email, password) {
    const body = new URLSearchParams();
    body.append("username", email); // FastAPI expects "username"
    body.append("password", password);

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed. Please check your credentials.");
    }

    const data = await res.json();
    persistToken(data.access_token);
    await fetchCurrentUser(data.access_token);
  }

  /**
   * Register a new account then automatically log in.
   */
  async function register(email, password, fullName) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed. Please try again.");
    }

    // Auto‑login after successful registration
    await login(email, password);
  }

  /** Log out — clear token from storage and reset state. */
  function logout() {
    clearAuth();
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

export default AuthContext;
