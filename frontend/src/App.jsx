/**
 * App.jsx — Root component with routing and AuthProvider.
 *
 * Route structure:
 *   /login    → public
 *   /register → public
 *   /         → protected (example dashboard placeholder)
 */

import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookingPage from "./pages/BookingPage";
import BookingHistoryPage from "./pages/BookingHistoryPage";
import ConciergePage from "./pages/ConciergePage";
import FaceAnalysisPage from "./pages/FaceAnalysisPage";
import ReviewSummarizerPage from "./pages/ReviewSummarizerPage";
import Navbar from "./components/Navbar";

// ── Dashboard Layout ─────────────────────────────────────────────

function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [savedRecs, setSavedRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [expandedRecId, setExpandedRecId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch bookings
      const bookRes = await fetch(`${API}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bookRes.ok) {
        const data = await bookRes.json();
        setBookings(data.bookings || []);
      }

      // 2. Fetch favorites
      const favRes = await fetch(`${API}/api/salons/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (favRes.ok) {
        setFavorites(await favRes.json());
      }

      // 3. Fetch saved concierge recommendations
      const recRes = await fetch(`${API}/api/concierge/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (recRes.ok) {
        setSavedRecs(await recRes.json());
      }
    } catch (err) {
      setError("Failed to load dashboard summaries.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking(bookingId) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await fetch(`${API}/api/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: "Cancelled from dashboard" })
      });
      if (res.ok) {
        fetchDashboardData();
      } else {
        alert("Failed to cancel booking.");
      }
    } catch {
      alert("Error cancelling booking.");
    }
  }

  async function handleRemoveFavorite(salonId) {
    try {
      const res = await fetch(`${API}/api/salons/${salonId}/favorite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch {
      /* ignore */
    }
  }

  async function handleDeleteSavedRec(id) {
    if (!window.confirm("Are you sure you want to delete this saved styling plan?")) return;
    try {
      const res = await fetch(`${API}/api/concierge/saved/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch {
      /* ignore */
    }
  }

  function handleQuickBookSalon(salon) {
    navigate("/book", {
      state: { salon }
    });
  }

  function handleBookRecService(recService) {
    navigate("/book", {
      state: {
        salon: { id: recService.salon_id, name: "Selected Salon" }
      }
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingBookings = bookings.filter((b) => {
    return b.booking_date >= todayStr && b.status !== "cancelled";
  });
  const pastBookings = bookings.filter((b) => {
    return b.booking_date < todayStr || b.status === "cancelled";
  });

  return (
    <div style={{ minHeight: "100vh", background: "#08080a", paddingBottom: "80px", boxSizing: "border-box" }}>
      <Navbar />
      <div style={dashStyles.page}>
        <div style={dashStyles.container}>
          
          {/* Header Section */}
          <div style={dashStyles.header}>
            <div>
              <h1 style={dashStyles.heading}>Welcome Back, {user?.full_name || "Member"}</h1>
              <p style={dashStyles.sub}>Your luxury wellness portal and tailored styling recommendations.</p>
            </div>
          </div>

        {/* Quick Actions Grid */}
        <div style={dashStyles.actionGrid}>
          <button onClick={() => navigate("/book")} style={dashStyles.actionCard}>
            <div style={dashStyles.actionIcon}>💇‍♂️</div>
            <div style={dashStyles.actionTitle}>Book Salon</div>
            <div style={dashStyles.actionDesc}>Schedule a service at elite spas.</div>
          </button>
          
          <button onClick={() => navigate("/bookings")} style={dashStyles.actionCard}>
            <div style={dashStyles.actionIcon}>📅</div>
            <div style={dashStyles.actionTitle}>Reservations</div>
            <div style={dashStyles.actionDesc}>Manage your active bookings.</div>
          </button>

          <button onClick={() => navigate("/concierge")} style={dashStyles.actionCard}>
            <div style={dashStyles.actionIcon}>✨</div>
            <div style={{ ...dashStyles.actionTitle, color: "#e8d5b7" }}>AI Concierge</div>
            <div style={dashStyles.actionDesc}>Bespoke style suggestions.</div>
          </button>

          <button onClick={() => navigate("/face-analysis")} style={dashStyles.actionCard}>
            <div style={dashStyles.actionIcon}>📷</div>
            <div style={{ ...dashStyles.actionTitle, color: "#a5b4fc" }}>Face Analysis</div>
            <div style={dashStyles.actionDesc}>Identify style matches.</div>
          </button>

          <button onClick={() => navigate("/reviews")} style={dashStyles.actionCard}>
            <div style={dashStyles.actionIcon}>💬</div>
            <div style={{ ...dashStyles.actionTitle, color: "#34d399" }}>Review Insights</div>
            <div style={dashStyles.actionDesc}>Distill client feedback.</div>
          </button>
        </div>

        {error && (
          <div style={dashStyles.errorBox}>⚠️ {error}</div>
        )}

        {/* Dashboard Content Grid */}
        <div style={dashStyles.contentGrid}>
          
          {/* Left Column: Upcoming Bookings & Saved Lookbooks */}
          <div style={dashStyles.column}>
            
            {/* 1. Upcoming Bookings */}
            <div style={dashStyles.sectionCard}>
              <h2 style={dashStyles.sectionTitle}>📅 Upcoming Bookings</h2>
              {loading ? (
                <p style={dashStyles.loadingText}>Updating bookings...</p>
              ) : upcomingBookings.length > 0 ? (
                <div style={dashStyles.list}>
                  {upcomingBookings.map((b) => (
                    <div key={b.id} style={dashStyles.bookingCard}>
                      <div style={dashStyles.cardHeader}>
                        <div>
                          <h3 style={dashStyles.cardName}>{b.salon?.name}</h3>
                          <span style={dashStyles.cardSub}>{b.service?.service_name}</span>
                        </div>
                        <span style={dashStyles.priceBadge}>₹{b.service?.price.toLocaleString("en-IN")}</span>
                      </div>
                      <div style={dashStyles.bookingDetails}>
                        <p style={dashStyles.detailItem}>🗓️ {new Date(b.booking_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                        <p style={dashStyles.detailItem}>🕒 {b.time_slot}</p>
                        {b.customer_name && <p style={dashStyles.detailItem}>👤 Guest: {b.customer_name}</p>}
                        {b.notes && <p style={dashStyles.notesItem}>✍️ Notes: {b.notes}</p>}
                      </div>
                      <div style={dashStyles.cardFooter}>
                        <button onClick={() => handleCancelBooking(b.id)} style={dashStyles.cancelBtn}>
                          Cancel Reservation
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={dashStyles.emptyState}>
                  <p style={dashStyles.emptyText}>No upcoming bookings scheduled.</p>
                  <button onClick={() => navigate("/book")} style={dashStyles.inlineBookBtn}>Book An Experience →</button>
                </div>
              )}
            </div>

            {/* 2. Saved AI Lookbooks */}
            <div style={{ ...dashStyles.sectionCard, marginTop: 24 }}>
              <h2 style={dashStyles.sectionTitle}>✨ Saved AI Lookbooks</h2>
              {loading ? (
                <p style={dashStyles.loadingText}>Updating lookbooks...</p>
              ) : savedRecs.length > 0 ? (
                <div style={dashStyles.list}>
                  {savedRecs.map((rec) => {
                    const isExpanded = expandedRecId === rec.id;
                    return (
                      <div key={rec.id} style={dashStyles.recCard}>
                        <div style={dashStyles.recHeader} onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}>
                          <div>
                            <h3 style={dashStyles.recTitle}>{rec.occasion} Styling Plan</h3>
                            <span style={dashStyles.recSub}>
                              Budget: ₹{rec.budget.toLocaleString("en-IN")} | Hair: {rec.hair_type}
                            </span>
                          </div>
                          <div style={dashStyles.recHeaderRight}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSavedRec(rec.id); }} style={dashStyles.recDeleteBtn}>
                              🗑️
                            </button>
                            <span style={dashStyles.expandArrow}>{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={dashStyles.recContent}>
                            <p style={dashStyles.recExplanation}>"{rec.explanation}"</p>
                            
                            <h4 style={dashStyles.recSectionTitle}>Hairstyles</h4>
                            <div style={dashStyles.recHairstyles}>
                              {rec.recommended_hairstyles?.map((h, idx) => (
                                <div key={idx} style={dashStyles.hairItem}>
                                  <strong>{h.name}</strong>: {h.description}
                                </div>
                              ))}
                            </div>

                            <h4 style={dashStyles.recSectionTitle}>Recommended Services</h4>
                            <div style={dashStyles.recServices}>
                              {rec.recommended_services?.map((s, idx) => {
                                const salonRec = rec.recommended_salons?.find((sl) => sl.salon_id === s.salon_id) || {};
                                return (
                                  <div key={idx} style={dashStyles.recServiceItem}>
                                    <div style={dashStyles.recSvcHeader}>
                                      <div>
                                        <strong>{s.name}</strong>
                                        <div style={dashStyles.recSvcSalon}>at {salonRec.name || "Luxury Salon"}</div>
                                      </div>
                                      <span style={dashStyles.recSvcPrice}>₹{s.price_estimate.toLocaleString("en-IN")}</span>
                                    </div>
                                    <button onClick={() => handleBookRecService(s)} style={dashStyles.recBookBtn}>
                                      Reserve Now →
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={dashStyles.emptyState}>
                  <p style={dashStyles.emptyText}>No saved lookbooks. Consult our AI Concierge to generate style plans.</p>
                  <button onClick={() => navigate("/concierge")} style={dashStyles.inlineBookBtn}>Open AI Concierge →</button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Favorite Salons & Booking History */}
          <div style={dashStyles.column}>
            
            {/* 3. Favorite Salons */}
            <div style={dashStyles.sectionCard}>
              <h2 style={dashStyles.sectionTitle}>❤️ Favorite Salons</h2>
              {loading ? (
                <p style={dashStyles.loadingText}>Updating favorites...</p>
              ) : favorites.length > 0 ? (
                <div style={dashStyles.favGrid}>
                  {favorites.map((s) => (
                    <div key={s.id} style={dashStyles.favCard}>
                      <img src={s.image_url} alt={s.name} style={dashStyles.favImg} />
                      <div style={dashStyles.favInfo}>
                        <h3 style={dashStyles.favName}>{s.name}</h3>
                        <div style={dashStyles.favMeta}>
                          <span>📍 {s.area}</span>
                          <span>★ {s.rating}</span>
                        </div>
                        <div style={dashStyles.favActions}>
                          <button onClick={() => handleRemoveFavorite(s.id)} style={dashStyles.unfavBtn}>
                            Remove
                          </button>
                          <button onClick={() => handleQuickBookSalon(s)} style={dashStyles.favBookBtn}>
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={dashStyles.emptyState}>
                  <p style={dashStyles.emptyText}>You haven't favorited any salons yet.</p>
                </div>
              )}
            </div>

            {/* 4. Past Bookings / History */}
            <div style={{ ...dashStyles.sectionCard, marginTop: 24 }}>
              <h2 style={dashStyles.sectionTitle}>🕒 Booking History</h2>
              {loading ? (
                <p style={dashStyles.loadingText}>Updating history...</p>
              ) : pastBookings.length > 0 ? (
                <div style={dashStyles.historyList}>
                  {pastBookings.map((b) => (
                    <div key={b.id} style={dashStyles.historyItem}>
                      <div style={dashStyles.historyLeft}>
                        <h4 style={dashStyles.historySalon}>{b.salon?.name}</h4>
                        <span style={dashStyles.historyService}>{b.service?.service_name}</span>
                        <span style={dashStyles.historyDate}>
                          🗓️ {new Date(b.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div style={dashStyles.historyRight}>
                        <span style={{
                          ...dashStyles.statusBadge,
                          color: b.status === "cancelled" ? "#f87171" : "#a1a1aa",
                          background: b.status === "cancelled" ? "rgba(248,113,113,0.08)" : "rgba(161,161,170,0.08)"
                        }}>
                          {b.status.toUpperCase()}
                        </span>
                        <span style={dashStyles.historyPrice}>₹{b.service?.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={dashStyles.emptyState}>
                  <p style={dashStyles.emptyText}>No historic bookings found.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  </div>
  );
}

// ── App Root ────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/concierge"
            element={
              <ProtectedRoute>
                <ConciergePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/face-analysis"
            element={
              <ProtectedRoute>
                <FaceAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <ReviewSummarizerPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

/* ── Dashboard inline styles ─────────────────────────────────── */

const dashStyles = {
  page: {
    minHeight: "100vh",
    background: "#08080a",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#fcfcfd",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 16,
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
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
    margin: 0,
    marginBottom: "4px",
  },
  sub: {
    fontSize: "0.9rem",
    color: "#a1a1aa",
    margin: 0,
  },
  logoutBtnTop: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: "6px",
    color: "#a1a1aa",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 650,
    fontSize: "0.85rem",
    padding: "10px 20px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  actionCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "10px",
    padding: "20px 14px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#fcfcfd",
  },
  actionIcon: {
    fontSize: "1.8rem",
    marginBottom: "10px",
  },
  actionTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    marginBottom: "6px",
    color: "#c5a880",
  },
  actionDesc: {
    fontSize: "0.75rem",
    color: "#71717a",
    lineHeight: "1.3",
  },
  errorBox: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 6,
    padding: "12px 16px",
    fontSize: "0.88rem",
    color: "#f87171",
    marginBottom: 24,
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "24px",
    alignItems: "start",
  },
  column: {
    display: "flex",
    flexDirection: "column",
  },
  sectionCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.25rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: "0 0 20px 0",
    borderBottom: "1px solid #26262b",
    paddingBottom: "10px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  loadingText: {
    color: "#71717a",
    fontSize: "0.88rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "30px 10px",
  },
  emptyText: {
    fontSize: "0.85rem",
    color: "#71717a",
    marginBottom: "12px",
    margin: "0 0 12px 0",
  },
  inlineBookBtn: {
    background: "transparent",
    border: "none",
    color: "#c5a880",
    fontWeight: 650,
    fontSize: "0.85rem",
    cursor: "pointer",
    padding: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  bookingCard: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "10px",
    padding: "16px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  cardName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1rem",
    fontWeight: 600,
    margin: "0 0 2px 0",
    color: "#fcfcfd",
  },
  cardSub: {
    fontSize: "0.78rem",
    color: "#c5a880",
  },
  priceBadge: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#c5a880",
  },
  bookingDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "14px",
    borderTop: "1px dashed #1a1a1f",
    paddingTop: "10px",
  },
  detailItem: {
    fontSize: "0.8rem",
    color: "#a1a1aa",
    margin: 0,
  },
  notesItem: {
    fontSize: "0.78rem",
    color: "#71717a",
    margin: 0,
    fontStyle: "italic",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: "4px",
    color: "#f87171",
    fontSize: "0.78rem",
    fontWeight: 600,
    padding: "6px 12px",
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  favGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
  },
  favCard: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "10px",
    overflow: "hidden",
  },
  favImg: {
    width: "100%",
    height: "100px",
    objectFit: "cover",
  },
  favInfo: {
    padding: "12px",
  },
  favName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.9rem",
    fontWeight: 600,
    margin: "0 0 4px 0",
    color: "#fcfcfd",
  },
  favMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.75rem",
    color: "#a1a1aa",
    marginBottom: "10px",
  },
  favActions: {
    display: "flex",
    gap: "8px",
  },
  unfavBtn: {
    flex: 1,
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: "4px",
    color: "#71717a",
    fontSize: "0.72rem",
    fontWeight: 650,
    padding: "6px",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  favBookBtn: {
    flex: 1.2,
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: "4px",
    color: "#0e0e0e",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "6px",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  recCard: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "10px",
    overflow: "hidden",
  },
  recHeader: {
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    background: "#0d0d10",
  },
  recTitle: {
    fontSize: "0.92rem",
    fontWeight: 700,
    margin: "0 0 2px 0",
    color: "#fcfcfd",
  },
  recSub: {
    fontSize: "0.75rem",
    color: "#a1a1aa",
  },
  recHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  recDeleteBtn: {
    background: "transparent",
    border: "none",
    fontSize: "0.95rem",
    cursor: "pointer",
    padding: "4px",
  },
  expandArrow: {
    fontSize: "0.75rem",
    color: "#c5a880",
  },
  recContent: {
    padding: "16px",
    borderTop: "1px solid #1c1c21",
    animation: "fadeIn 0.2s ease-out",
  },
  recExplanation: {
    fontSize: "0.82rem",
    color: "#a1a1aa",
    lineHeight: "1.5",
    margin: "0 0 16px 0",
    fontStyle: "italic",
    fontFamily: "'Playfair Display', serif",
  },
  recSectionTitle: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#c5a880",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "12px 0 6px 0",
  },
  recHairstyles: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "12px",
  },
  hairItem: {
    fontSize: "0.8rem",
    color: "#d1d5db",
    lineHeight: "1.4",
  },
  recServices: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  recServiceItem: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "6px",
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  recSvcHeader: {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },
  recSvcSalon: {
    fontSize: "0.7rem",
    color: "#71717a",
    marginTop: "2px",
  },
  recSvcPrice: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#c5a880",
  },
  recBookBtn: {
    background: "transparent",
    border: "1px solid #c5a880",
    borderRadius: "4px",
    color: "#c5a880",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "4px 8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "8px",
    padding: "12px 14px",
  },
  historyLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  historySalon: {
    fontSize: "0.85rem",
    fontWeight: 650,
    margin: 0,
    color: "#fcfcfd",
  },
  historyService: {
    fontSize: "0.75rem",
    color: "#a1a1aa",
  },
  historyDate: {
    fontSize: "0.7rem",
    color: "#71717a",
  },
  historyRight: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
  },
  historyPrice: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#a1a1aa",
  },
  statusBadge: {
    fontSize: "0.6rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "2px 6px",
    borderRadius: "4px",
  },
};
