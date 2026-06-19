/**
 * BookingHistoryPage.jsx — List and manage user appointments.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

export default function BookingHistoryPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(null); // stores booking ID to cancel
  const [cancelReason, setCancelReason] = useState("");

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (token) {
      fetchBookings();
    }
  }, [token]);

  async function fetchBookings() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch booking history.");
      }
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking(bookingId) {
    setCancelError("");
    setCancellingId(bookingId);
    try {
      const res = await fetch(`${API}/api/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to cancel booking.");
      }

      // Update the status locally
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: "cancelled", notes: cancelReason ? `Cancelled: ${cancelReason}` : b.notes }
            : b
        )
      );
      setShowConfirmCancel(null);
      setCancelReason("");
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  function formatPrice(p) {
    return "₹" + Number(p).toLocaleString("en-IN");
  }

  function formatDate(ds) {
    if (!ds) return "";
    const d = new Date(ds + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusStyle(status) {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return { color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" };
      case "cancelled":
        return { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" };
      case "completed":
        return { color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)" };
      case "pending":
      default:
        return { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" };
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.heading}>Your Reservations</h1>
            <p style={styles.sub}>
              Review, manage, or cancel your scheduled appointments.
            </p>
          </div>
          <button onClick={() => navigate("/book")} style={styles.bookBtn}>
            + Book Appointment
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <p style={styles.loadingText}>Retrieving your bookings…</p>
        ) : bookings.length === 0 ? (
          /* Empty State */
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>📅</div>
            <h3 style={styles.emptyTitle}>No Reservations Found</h3>
            <p style={styles.emptyDesc}>
              Indulge in a premium salon service. Schedule your first appointment in seconds.
            </p>
            <button onClick={() => navigate("/book")} style={styles.emptyBtn}>
              Reserve Now
            </button>
          </div>
        ) : (
          /* Bookings List */
          <div style={styles.list}>
            {bookings.map((b) => {
              const statusStyle = getStatusStyle(b.status);
              const isCanCancel = b.status?.toLowerCase() !== "cancelled" && b.status?.toLowerCase() !== "completed";

              return (
                <div key={b.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <span style={styles.salonLabel}>SALON</span>
                      <h3 style={styles.salonName}>{b.salon?.name || `Salon #${b.salon_id}`}</h3>
                      <p style={styles.salonArea}>📍 {b.salon?.area}</p>
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        color: statusStyle.color,
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                      }}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={{
                      ...styles.detailRow,
                      gridTemplateColumns: isMobileOrTablet ? "1fr" : "1.5fr 1fr 2fr"
                    }}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>SERVICE</span>
                        <span style={styles.detailVal}>{b.service?.service_name || `Service #${b.service_id}`}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>PRICE</span>
                        <span style={{ ...styles.detailVal, color: "#c5a880", fontWeight: 700 }}>
                          {b.service ? formatPrice(b.service.price) : "—"}
                        </span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>APPOINTMENT TIME</span>
                        <span style={styles.detailVal}>
                          📅 {formatDate(b.booking_date)} <br />
                          ⏰ {b.time_slot}
                        </span>
                      </div>
                    </div>

                    {/* Booking Details / Notes */}
                    <div style={styles.notesRow}>
                      <div style={{ flex: 1 }}>
                        <span style={styles.detailLabel}>GUEST DETAILS</span>
                        <span style={styles.detailValSmall}>
                          {b.customer_name || user?.full_name} • {b.customer_phone || "No phone"}
                        </span>
                      </div>
                      {b.notes && (
                        <div style={{ flex: 2, marginTop: 8 }}>
                          <span style={styles.detailLabel}>NOTES</span>
                          <span style={styles.detailValSmall}>{b.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isCanCancel && (
                    <div style={styles.cardFooter}>
                      <button
                        onClick={() => setShowConfirmCancel(b.id)}
                        style={styles.cancelBtn}
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog Overlay */}
      {showConfirmCancel && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Cancel Appointment</h3>
            <p style={styles.modalText}>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>

            {cancelError && (
              <div style={{ ...styles.errBox, marginBottom: 16 }}>
                {cancelError}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={styles.fieldLabel}>Cancellation Reason (optional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Change of plans"
                style={styles.input}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                disabled={cancellingId !== null}
                onClick={() => {
                  setShowConfirmCancel(null);
                  setCancelReason("");
                  setCancelError("");
                }}
                style={styles.btnSecondary}
              >
                No, Keep
              </button>
              <button
                disabled={cancellingId !== null}
                onClick={() => handleCancelBooking(showConfirmCancel)}
                style={styles.btnDanger}
              >
                {cancellingId ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#08080a",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#fcfcfd",
    padding: "24px",
    paddingBottom: "100px",
    boxSizing: "border-box",
    position: "relative",
  },
  container: {
    maxWidth: 800,
    margin: "0 auto",
    paddingTop: 20,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
    flexWrap: "wrap",
    gap: 16,
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  brand: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.4rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: "linear-gradient(135deg,#fff 30%,#c5a880 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  badge: {
    fontSize: "0.7rem",
    fontWeight: 300,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#c5a880",
    border: "1px solid #423829",
    padding: "1px 6px",
    borderRadius: 3,
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.8rem",
    fontWeight: 500,
    margin: 0,
    marginBottom: 6,
  },
  sub: {
    fontSize: "0.88rem",
    color: "#a1a1aa",
    margin: 0,
  },
  bookBtn: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: 6,
    color: "#0e0e0e",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    padding: "12px 20px",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 4px 14px rgba(197,168,128,0.2)",
  },
  errBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: "0.85rem",
    color: "#f87171",
    marginBottom: 20,
  },
  loadingText: {
    color: "#71717a",
    textAlign: "center",
    padding: 60,
  },
  emptyCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 12,
    padding: "60px 40px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: 20,
    opacity: 0.8,
  },
  emptyTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.4rem",
    fontWeight: 500,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: "0.9rem",
    color: "#a1a1aa",
    maxWidth: 400,
    margin: "0 auto 24px",
    lineHeight: 1.5,
  },
  emptyBtn: {
    background: "transparent",
    border: "1px solid #c5a880",
    borderRadius: 6,
    color: "#c5a880",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.9rem",
    padding: "12px 28px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: "24px",
    transition: "all 0.3s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid #26262b",
    paddingBottom: 16,
    marginBottom: 16,
  },
  salonLabel: {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "#71717a",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 4,
  },
  salonName: {
    fontSize: "1.1rem",
    fontWeight: 650,
    color: "#fcfcfd",
    margin: 0,
    marginBottom: 4,
  },
  salonArea: {
    fontSize: "0.82rem",
    color: "#a1a1aa",
    margin: 0,
  },
  statusBadge: {
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "4px 10px",
    borderRadius: 4,
  },
  cardBody: {
    marginBottom: 16,
  },
  detailRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 2fr",
    gap: 16,
    flexWrap: "wrap",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
  },
  detailLabel: {
    fontSize: "0.68rem",
    fontWeight: 650,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  },
  detailVal: {
    fontSize: "0.88rem",
    color: "#fcfcfd",
    lineHeight: 1.4,
  },
  notesRow: {
    borderTop: "1px solid #1a1a1f",
    paddingTop: 12,
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  detailValSmall: {
    fontSize: "0.82rem",
    color: "#a1a1aa",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "flex-end",
    borderTop: "1px solid #26262b",
    paddingTop: 16,
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #3a3a3f",
    borderRadius: 6,
    color: "#f87171",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "8px 16px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 16,
  },
  modal: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    width: "100%",
    maxWidth: "400px",
    padding: "28px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
  },
  modalTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.3rem",
    fontWeight: 500,
    margin: "0 0 12px 0",
  },
  modalText: {
    fontSize: "0.88rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: "0 0 20px 0",
  },
  fieldLabel: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#fcfcfd",
    fontSize: "0.88rem",
    outline: "none",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  btnSecondary: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#a1a1aa",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "10px 20px",
    cursor: "pointer",
  },
  btnDanger: {
    background: "#ef4444",
    border: "none",
    borderRadius: 6,
    color: "#ffffff",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "10px 20px",
    cursor: "pointer",
  },
};
