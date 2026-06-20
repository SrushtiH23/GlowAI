/**
 * OwnerDashboard.jsx — Salon Owner Dashboard
 * Premium dashboard allowing salon owners to manage (create, edit, expire, delete) active deals for their salon.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

export default function OwnerDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Redirect if not a salon owner
  useEffect(() => {
    if (!user || !user.salon_id) {
      navigate("/");
    }
  }, [user, navigate]);

  const [salon, setSalon] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Hair Care");
  const [originalPrice, setOriginalPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Categories list
  const categoriesList = ["Hair Care", "Skin Care", "Spa Treatments", "Nails & Grooming", "Makeup", "Bridal"];

  useEffect(() => {
    if (user?.salon_id) {
      fetchSalonDetails();
      fetchMyOffers();
    }
  }, [user]);

  // Calculate discount percentage automatically
  useEffect(() => {
    if (originalPrice && offerPrice) {
      const orig = Number(originalPrice);
      const off = Number(offerPrice);
      if (orig > 0 && off >= 0 && off <= orig) {
        const pct = Math.round(((orig - off) / orig) * 100);
        setDiscountPercentage(pct);
      }
    }
  }, [originalPrice, offerPrice]);

  async function fetchSalonDetails() {
    try {
      const res = await fetch(`${API}/api/salons/${user.salon_id}`);
      if (res.ok) {
        const data = await res.json();
        setSalon(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMyOffers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/offers/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOffers(data);
      } else {
        throw new Error("Failed to load offers.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load your salon's offers.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingOffer(null);
    setTitle("");
    setDescription("");
    setCategory("Hair Care");
    setOriginalPrice("");
    setOfferPrice("");
    setDiscountPercentage("");
    setValidUntil("");
    setIsActive(true);
    setShowForm(true);
  }

  function handleOpenEdit(offer) {
    setEditingOffer(offer);
    setTitle(offer.title);
    setDescription(offer.description || "");
    setCategory(offer.category);
    setOriginalPrice(offer.original_price);
    setOfferPrice(offer.offer_price);
    setDiscountPercentage(offer.discount_percentage);
    setValidUntil(offer.valid_until);
    setIsActive(offer.is_active);
    setShowForm(true);
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      title,
      description,
      discount_percentage: Number(discountPercentage),
      original_price: Number(originalPrice),
      offer_price: Number(offerPrice),
      category,
      valid_until: validUntil,
      is_active: isActive
    };

    try {
      let res;
      if (editingOffer) {
        // Edit offer
        res = await fetch(`${API}/api/offers/${editingOffer.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create offer
        res = await fetch(`${API}/api/offers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowForm(false);
        fetchMyOffers();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Save failed.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExpireOffer(offerId) {
    if (!window.confirm("Are you sure you want to expire this offer immediately?")) return;
    try {
      const res = await fetch(`${API}/api/offers/${offerId}/expire`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMyOffers();
      } else {
        throw new Error("Failed to expire offer.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!window.confirm("Are you sure you want to permanently delete this offer?")) return;
    try {
      const res = await fetch(`${API}/api/offers/${offerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 204 || res.ok) {
        fetchMyOffers();
      } else {
        throw new Error("Failed to delete offer.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  if (!user || !user.salon_id) return null;

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        
        {/* Header */}
        <div style={styles.header}>
          <div>
            <span style={styles.topBadge}>Partner Portal</span>
            <h1 style={styles.title}>{salon ? salon.name : "Salon Owner Dashboard"}</h1>
            <p style={styles.subtitle}>
              Manage active deals, create seasonal promotions, and control offers displayed to Aura users.
            </p>
          </div>
          <button onClick={handleOpenCreate} style={styles.createBtn}>
            ➕ Create New Offer
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>
                {editingOffer ? "Edit Offer Details" : "Create New Promotional Offer"}
              </h2>
              <button onClick={() => setShowForm(false)} style={styles.closeBtn}>×</button>
            </div>
            
            <form onSubmit={handleSubmitForm} style={styles.form}>
              <div style={styles.formGrid}>
                {/* Title */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Offer Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20% Off Keratin Smooth Treatment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Category */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={styles.select}
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Original Price */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Original Price (INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 5000"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Offer Price */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Offer Price (INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 4000"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Discount Percentage (Auto Calculated) */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Discount Percentage (%)</label>
                  <input
                    type="number"
                    disabled
                    placeholder="Auto-calculated"
                    value={discountPercentage}
                    style={{ ...styles.input, background: "#1a1a1f", color: "#c5a880" }}
                  />
                </div>

                {/* Valid Until */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Valid Until Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ ...styles.formGroup, marginTop: "14px" }}>
                <label style={styles.label}>Description</label>
                <textarea
                  placeholder="Describe what services are included, specific terms, or requirements..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ ...styles.input, resize: "none" }}
                />
              </div>

              {/* Status checkbox */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px" }}>
                <input
                  id="offer-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#c5a880", cursor: "pointer" }}
                />
                <label htmlFor="offer-active" style={{ fontSize: "0.85rem", color: "#a1a1aa", fontWeight: 650, cursor: "pointer" }}>
                  Set this offer as Active (Visible immediately to users)
                </label>
              </div>

              <div style={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={styles.saveBtn}>
                  {submitting ? "Saving..." : "Save Offer"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Offers List */}
        {loading ? (
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner}>
              <div style={styles.spinnerInner}></div>
            </div>
            <p>Loading your promotional offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div style={styles.emptyState}>
            <span>📋</span>
            <h3>No Offers Found</h3>
            <p>You haven't created any promotional offers yet. Click 'Create New Offer' to get started!</p>
          </div>
        ) : (
          <div style={styles.tableCard}>
            <h2 style={styles.tableTitle}>Active & Expired Promotions</h2>
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Discount</th>
                    <th style={styles.th}>Prices (Original / Deal)</th>
                    <th style={styles.th}>Valid Until</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.offerTitleText}>{offer.title}</div>
                        <div style={styles.offerDescText}>{offer.description}</div>
                      </td>
                      <td style={styles.td}>{offer.category}</td>
                      <td style={{ ...styles.td, color: "#c5a880", fontWeight: 700 }}>
                        {offer.discount_percentage}% OFF
                      </td>
                      <td style={styles.td}>
                        <span style={styles.originalPriceText}>₹{offer.original_price}</span> /{" "}
                        <span style={styles.offerPriceText}>₹{offer.offer_price}</span>
                      </td>
                      <td style={styles.td}>{offer.valid_until}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          background: offer.is_active ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                          color: offer.is_active ? "#34d399" : "#f87171",
                          border: `1px solid ${offer.is_active ? "#34d399" : "#f87171"}`
                        }}>
                          {offer.is_active ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionsCell}>
                          <button onClick={() => handleOpenEdit(offer)} style={styles.actionEditBtn}>
                            Edit
                          </button>
                          {offer.is_active && (
                            <button onClick={() => handleExpireOffer(offer.id)} style={styles.actionExpireBtn}>
                              Expire
                            </button>
                          )}
                          <button onClick={() => handleDeleteOffer(offer.id)} style={styles.actionDeleteBtn}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Inline Styles ────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "#08080a",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#fcfcfd",
    paddingBottom: "100px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "40px",
    flexWrap: "wrap",
    gap: "20px",
  },
  topBadge: {
    fontSize: "0.72rem",
    fontWeight: 750,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#c5a880",
    border: "1px solid #423829",
    padding: "2px 10px",
    borderRadius: "4px",
    background: "rgba(197,168,128,0.04)",
    display: "inline-block",
    marginBottom: "10px",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2.2rem",
    fontWeight: 500,
    margin: "0 0 6px 0",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "#a1a1aa",
    maxWidth: "600px",
    lineHeight: 1.5,
    margin: 0,
  },
  createBtn: {
    background: "linear-gradient(135deg, #8a704c 0%, #c5a880 100%)",
    border: "none",
    borderRadius: "6px",
    color: "#0e0e0e",
    fontWeight: 700,
    fontSize: "0.88rem",
    padding: "12px 20px",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(197,168,128,0.25)",
  },
  errorBox: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: "6px",
    padding: "12px 16px",
    fontSize: "0.88rem",
    color: "#f87171",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  formCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "36px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #26262b",
    paddingBottom: "12px",
  },
  formTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.28rem",
    fontWeight: 500,
    margin: 0,
    color: "#c5a880",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#71717a",
    fontSize: "1.8rem",
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "0.75rem",
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
    padding: "10px 14px",
    color: "#fcfcfd",
    fontSize: "0.9rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#fcfcfd",
    fontSize: "0.9rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    borderTop: "1px solid #26262b",
    paddingTop: "16px",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: "6px",
    color: "#a1a1aa",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "10px 20px",
    cursor: "pointer",
  },
  saveBtn: {
    background: "linear-gradient(135deg, #8a704c 0%, #c5a880 100%)",
    border: "none",
    borderRadius: "6px",
    color: "#0e0e0e",
    fontSize: "0.85rem",
    fontWeight: 700,
    padding: "10px 24px",
    cursor: "pointer",
  },
  loadingWrapper: {
    textAlign: "center",
    padding: "80px 0",
    color: "#a1a1aa",
  },
  spinner: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    border: "2px dashed #26262b",
    borderTopColor: "#c5a880",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    animation: "spin 2s linear infinite",
  },
  spinnerInner: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "2px dashed #26262b",
    borderBottomColor: "#c5a880",
    animation: "spin 1.5s linear infinite reverse",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
  },
  tableCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  tableTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.2rem",
    fontWeight: 500,
    marginBottom: "20px",
    borderBottom: "1px solid #26262b",
    paddingBottom: "10px",
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    borderBottom: "2px solid #26262b",
    padding: "12px 16px",
    fontSize: "0.78rem",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#71717a",
  },
  tr: {
    borderBottom: "1px solid #1a1a1f",
    ":hover": {
      background: "rgba(255,255,255,0.01)"
    }
  },
  td: {
    padding: "16px",
    fontSize: "0.88rem",
    verticalAlign: "middle",
  },
  offerTitleText: {
    fontWeight: 650,
    color: "#fcfcfd",
  },
  offerDescText: {
    fontSize: "0.78rem",
    color: "#71717a",
    marginTop: "4px",
    maxWidth: "280px",
  },
  originalPriceText: {
    color: "#71717a",
    textDecoration: "line-through",
  },
  offerPriceText: {
    color: "#c5a880",
    fontWeight: 700,
  },
  statusBadge: {
    fontSize: "0.72rem",
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  actionsCell: {
    display: "flex",
    gap: "8px",
  },
  actionEditBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    color: "#a1a1aa",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  actionExpireBtn: {
    background: "rgba(250,204,21,0.08)",
    border: "1px solid rgba(250,204,21,0.25)",
    color: "#facc15",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  actionDeleteBtn: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    color: "#f87171",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
  }
};
