/**
 * ReviewSummarizerPage.jsx — AI Review Summarizer & Insights Page
 * Uses Gemini API (with fallback mock summaries) to extract pros, cons, and synthesis from reviews.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

export default function ReviewSummarizerPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState("salon"); // "salon" or "playground"

  // Salon tab states
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  
  // Submit review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState(user?.full_name || "");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Playground tab states
  const [playgroundReviewsText, setPlaygroundReviewsText] = useState(
    "The hair coloring service was absolutely stellar. Ambiance was top tier!\n" +
    "Wait time was 25 minutes past my slot which was annoying.\n" +
    "Immaculate hygiene standards, but prices are extremely high."
  );
  const [playgroundSummary, setPlaygroundSummary] = useState(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundError, setPlaygroundError] = useState("");

  // Common UI states
  const [loadingSalons, setLoadingSalons] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [apiError, setApiError] = useState("");

  // ── Fetch salons on mount ───────────────────────────────────
  useEffect(() => {
    fetchSalons();
  }, []);

  async function fetchSalons() {
    setLoadingSalons(true);
    setApiError("");
    try {
      const res = await fetch(`${API}/api/salons`);
      if (res.ok) {
        const data = await res.json();
        setSalons(data);
        if (data.length > 0) {
          setSelectedSalon(data[0]);
        }
      } else {
        throw new Error("Failed to load salons list.");
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoadingSalons(false);
    }
  }

  // ── Fetch reviews & summary when selected salon changes ──────
  useEffect(() => {
    if (selectedSalon) {
      fetchReviewsAndSummary(selectedSalon.id);
    }
  }, [selectedSalon]);

  async function fetchReviewsAndSummary(salonId) {
    setLoadingReviews(true);
    setLoadingSummary(true);
    setReviewSuccess(false);
    setReviewError("");
    try {
      // 1. Fetch individual reviews
      const revRes = await fetch(`${API}/api/reviews/salons/${salonId}`);
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(revData);
      }

      // 2. Fetch AI summary
      const sumRes = await fetch(`${API}/api/reviews/salons/${salonId}/summary`);
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      } else {
        setSummary({
          pros: [],
          cons: [],
          summary: "Could not generate AI summary at this time.",
          is_mock: true
        });
      }
    } catch (err) {
      console.error("Error loading reviews details:", err);
    } finally {
      setLoadingReviews(false);
      setLoadingSummary(false);
    }
  }

  // ── Submit Review ────────────────────────────────────────────
  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!comment.trim()) {
      setReviewError("Please write a comment.");
      return;
    }

    setSubmittingReview(true);
    setReviewError("");
    setReviewSuccess(false);

    try {
      const res = await fetch(`${API}/api/reviews/salons/${selectedSalon.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          comment,
          user_name: reviewerName || "Anonymous Elite",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit review.");
      }

      setComment("");
      setReviewSuccess(true);
      
      // Refresh reviews and AI summary dynamically
      await fetchReviewsAndSummary(selectedSalon.id);
      
      // Update the salon rating in our local salons state
      fetchSalons();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  // ── Playground Summarize ─────────────────────────────────────
  async function handlePlaygroundSummarize(e) {
    e.preventDefault();
    const reviewsList = playgroundReviewsText
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (reviewsList.length === 0) {
      setPlaygroundError("Please enter at least one review string.");
      return;
    }

    setPlaygroundLoading(true);
    setPlaygroundError("");
    setPlaygroundSummary(null);

    try {
      const res = await fetch(`${API}/api/reviews/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviews: reviewsList,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to compile review summary.");
      }

      const data = await res.json();
      setPlaygroundSummary(data);
    } catch (err) {
      setPlaygroundError(err.message);
    } finally {
      setPlaygroundLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div>
            <div style={styles.brandRow}>
              <span style={styles.brand}>AURA</span>
              <span style={styles.badge}>Elite</span>
            </div>
            <h1 style={styles.heading}>Review AI Insights</h1>
            <p style={styles.sub}>
              Harness Gemini intelligence to distill customer feedback into key highlights, considerations, and summaries.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={styles.tabsRow}>
          <button
            onClick={() => setActiveTab("salon")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "salon" ? styles.tabBtnActive : {}),
            }}
          >
            Salon Summaries
          </button>
          <button
            onClick={() => setActiveTab("playground")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "playground" ? styles.tabBtnActive : {}),
            }}
          >
            AI Review Playground
          </button>
        </div>

        {apiError && (
          <div style={styles.errorBanner}>
            <span>⚠️</span> {apiError}
          </div>
        )}

        {/* ─── TAB 1: SALON SUMMARIES ───────────────────────────────── */}
        {activeTab === "salon" && (
          <div style={{
            ...styles.grid,
            gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1.3fr"
          }}>
            {/* Left: Salon & Review Submission */}
            <div style={styles.column}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Select Salon</h2>
                {loadingSalons ? (
                  <p style={styles.loadingText}>Loading salons list...</p>
                ) : (
                  <div style={styles.selectWrapper}>
                    <select
                      value={selectedSalon?.id || ""}
                      onChange={(e) => {
                        const salon = salons.find((s) => s.id === parseInt(e.target.value));
                        setSelectedSalon(salon);
                      }}
                      style={styles.select}
                    >
                      {salons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.area}) — ★ {s.rating}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedSalon && (
                  <div style={styles.salonMetaBox}>
                    <p style={styles.salonDesc}>{selectedSalon.description}</p>
                    <div style={styles.salonDetailRow}>
                      <span>📍 {selectedSalon.address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit a Review Form */}
              <div style={{ ...styles.card, marginTop: 20 }}>
                <h2 style={styles.cardTitle}>Submit a Review</h2>
                <form onSubmit={handleReviewSubmit} style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Your Name</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="Name (e.g. Anand Sharma)"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rating</label>
                    <div style={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          style={{
                            ...styles.starBtn,
                            color: star <= rating ? "#c5a880" : "#4b5563",
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Your Review Comment</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Describe your styling experience..."
                      rows={4}
                      style={{ ...styles.input, resize: "none" }}
                    />
                  </div>

                  {reviewError && <p style={styles.reviewErrorText}>{reviewError}</p>}
                  {reviewSuccess && <p style={styles.reviewSuccessText}>✓ Review submitted successfully and AI summary updated!</p>}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    style={styles.submitBtn}
                  >
                    {submittingReview ? "Submitting..." : "Post Review"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: AI Summary & Review Feed */}
            <div style={styles.column}>
              {/* AI Summary Card */}
              <div style={styles.aiCard}>
                <div style={styles.aiHeader}>
                  <div style={styles.aiIcon}>✨</div>
                  <div>
                    <h2 style={styles.aiTitle}>AI Synthesis & Insights</h2>
                    <p style={styles.aiSubtitle}>Gemini Review Analysis</p>
                  </div>
                </div>

                {loadingSummary ? (
                  <div style={styles.loadingContainer}>
                    <div style={styles.spinner}>
                      <div style={styles.spinnerInner}></div>
                    </div>
                    <p style={styles.loadingLabel}>Synthesizing customer reviews...</p>
                  </div>
                ) : summary ? (
                  <div style={styles.aiContent}>
                    {summary.is_mock && (
                      <div style={styles.mockBanner}>
                        <span style={{ fontWeight: 700 }}>DEMO:</span> Offline keyword synthesis active. Configure GEMINI_API_KEY for true generative analysis.
                      </div>
                    )}

                    {/* Summary Paragraph */}
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryText}>"{summary.summary}"</p>
                    </div>

                    <div style={{
                      ...styles.proConGrid,
                      gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr"
                    }}>
                      {/* Pros */}
                      <div>
                        <h4 style={styles.proTitle}>✓ High Highlights (Pros)</h4>
                        <ul style={styles.list}>
                          {summary.pros.length > 0 ? (
                            summary.pros.map((p, i) => (
                              <li key={i} style={styles.proItem}>
                                <span style={styles.proCheck}>✦</span> {p}
                              </li>
                            ))
                          ) : (
                            <li style={styles.emptyListItem}>No pros identified yet.</li>
                          )}
                        </ul>
                      </div>

                      {/* Cons */}
                      <div>
                        <h4 style={styles.conTitle}>⚠️ Considerations (Cons)</h4>
                        <ul style={styles.list}>
                          {summary.cons.length > 0 ? (
                            summary.cons.map((c, i) => (
                              <li key={i} style={styles.conItem}>
                                <span style={styles.conWarning}>•</span> {c}
                              </li>
                            ))
                          ) : (
                            <li style={styles.emptyListItem}>No cons identified yet.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={styles.emptyText}>Select a salon to view AI review summaries.</p>
                )}
              </div>

              {/* Reviews Feed */}
              <div style={{ ...styles.card, marginTop: 20 }}>
                <h3 style={styles.sectionHeader}>Customer Reviews Feed ({reviews.length})</h3>
                {loadingReviews ? (
                  <p style={styles.loadingText}>Loading reviews...</p>
                ) : reviews.length > 0 ? (
                  <div style={styles.reviewsList}>
                    {reviews.map((rev) => (
                      <div key={rev.id} style={styles.reviewCard}>
                        <div style={styles.revHeader}>
                          <span style={styles.revUser}>{rev.user_name}</span>
                          <span style={styles.revRating}>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                        </div>
                        <p style={styles.revComment}>"{rev.comment}"</p>
                        <span style={styles.revDate}>
                          {new Date(rev.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.emptyText}>No reviews posted for this salon yet. Be the first!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: AI REVIEW PLAYGROUND ─────────────────────────── */}
        {activeTab === "playground" && (
          <div style={{
            ...styles.grid,
            gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1.3fr"
          }}>
            {/* Left: Input Textarea */}
            <div style={styles.column}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Review Playground</h2>
                <p style={styles.playgroundInstructions}>
                  Enter multiple customer reviews below (one review per line) to run a custom summary using the Gemini summarization engine.
                </p>
                <form onSubmit={handlePlaygroundSummarize} style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Paste Reviews (One per line)</label>
                    <textarea
                      value={playgroundReviewsText}
                      onChange={(e) => setPlaygroundReviewsText(e.target.value)}
                      placeholder="Review 1&#10;Review 2&#10;Review 3..."
                      rows={12}
                      style={{
                        ...styles.input,
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        lineHeight: "1.5",
                      }}
                    />
                  </div>

                  {playgroundError && <p style={styles.reviewErrorText}>{playgroundError}</p>}

                  <button
                    type="submit"
                    disabled={playgroundLoading}
                    style={styles.submitBtn}
                  >
                    {playgroundLoading ? "Compiling Analysis..." : "Compile AI Summary"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Output Insights */}
            <div style={styles.column}>
              <div style={styles.aiCard}>
                <div style={styles.aiHeader}>
                  <div style={styles.aiIcon}>✨</div>
                  <div>
                    <h2 style={styles.aiTitle}>Playground Output</h2>
                    <p style={styles.aiSubtitle}>Real-time AI Synthesis Result</p>
                  </div>
                </div>

                {playgroundLoading ? (
                  <div style={styles.loadingContainer}>
                    <div style={styles.spinner}>
                      <div style={styles.spinnerInner}></div>
                    </div>
                    <p style={styles.loadingLabel}>Processing playground reviews...</p>
                  </div>
                ) : playgroundSummary ? (
                  <div style={styles.aiContent}>
                    {playgroundSummary.is_mock && (
                      <div style={styles.mockBanner}>
                        <span style={{ fontWeight: 700 }}>DEMO:</span> Offline keyword synthesis active. Configure GEMINI_API_KEY for true generative analysis.
                      </div>
                    )}

                    {/* Summary Paragraph */}
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryText}>"{playgroundSummary.summary}"</p>
                    </div>

                    <div style={{
                      ...styles.proConGrid,
                      gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr"
                    }}>
                      {/* Pros */}
                      <div>
                        <h4 style={styles.proTitle}>✓ Pros Extracted</h4>
                        <ul style={styles.list}>
                          {playgroundSummary.pros.map((p, i) => (
                            <li key={i} style={styles.proItem}>
                              <span style={styles.proCheck}>✦</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cons */}
                      <div>
                        <h4 style={styles.conTitle}>⚠️ Cons Extracted</h4>
                        <ul style={styles.list}>
                          {playgroundSummary.cons.map((c, i) => (
                            <li key={i} style={styles.conItem}>
                              <span style={styles.conWarning}>•</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={styles.idleState}>
                    <div style={styles.conciergeIcon}>📋</div>
                    <h3 style={styles.idleTitle}>Awaiting Input</h3>
                    <p style={styles.idleDesc}>
                      Paste your custom reviews on the left and click "Compile AI Summary" to see the output format.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Luxury dark theme styles ─────────────────────────────────── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#08080a",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#fcfcfd",
    padding: "24px",
    paddingBottom: "100px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    paddingTop: 20,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
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
  backBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#a1a1aa",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.85rem",
    padding: "10px 18px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  tabsRow: {
    display: "flex",
    gap: 12,
    borderBottom: "1px solid #26262b",
    paddingBottom: 16,
    marginBottom: 24,
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    color: "#71717a",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: 6,
    transition: "all 0.2s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  tabBtnActive: {
    background: "rgba(197,168,128,0.12)",
    color: "#c5a880",
  },
  errorBanner: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 6,
    padding: "12px 16px",
    fontSize: "0.88rem",
    color: "#f87171",
    marginBottom: 24,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr",
    gap: 24,
    alignItems: "start",
  },
  column: {
    display: "flex",
    flexDirection: "column",
  },
  card: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  cardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.2rem",
    fontWeight: 500,
    color: "#fcfcfd",
    marginBottom: 16,
    borderBottom: "1px solid #26262b",
    paddingBottom: 10,
  },
  selectWrapper: {
    position: "relative",
    width: "100%",
  },
  select: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 6,
    padding: "12px 14px",
    color: "#fcfcfd",
    fontSize: "0.9rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    cursor: "pointer",
  },
  salonMetaBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px dashed #26262b",
  },
  salonDesc: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: "0 0 10px 0",
  },
  salonDetailRow: {
    fontSize: "0.8rem",
    color: "#71717a",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
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
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 6,
    padding: "12px",
    color: "#fcfcfd",
    fontSize: "0.9rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  },
  ratingRow: {
    display: "flex",
    gap: 4,
  },
  starBtn: {
    background: "transparent",
    border: "none",
    fontSize: "1.8rem",
    cursor: "pointer",
    padding: 0,
    transition: "color 0.2s",
  },
  reviewErrorText: {
    color: "#f87171",
    fontSize: "0.82rem",
    margin: 0,
  },
  reviewSuccessText: {
    color: "#34d399",
    fontSize: "0.82rem",
    margin: 0,
  },
  submitBtn: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: 6,
    color: "#0e0e0e",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "12px",
    cursor: "pointer",
    marginTop: 6,
    boxShadow: "0 4px 12px rgba(197,168,128,0.2)",
  },
  aiCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    minHeight: 320,
    display: "flex",
    flexDirection: "column",
  },
  aiHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    borderBottom: "1px solid #26262b",
    paddingBottom: 14,
  },
  aiIcon: {
    fontSize: "2rem",
  },
  aiTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.25rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: 0,
  },
  aiSubtitle: {
    fontSize: "0.72rem",
    color: "#71717a",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  },
  loadingContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 0",
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "2px dashed #26262b",
    borderTopColor: "#c5a880",
    marginBottom: 16,
    animation: "spin 2s linear infinite",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerInner: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "2px dashed #26262b",
    borderBottomColor: "#c5a880",
    animation: "spin 1.5s linear infinite reverse",
  },
  loadingLabel: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    margin: 0,
  },
  aiContent: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  mockBanner: {
    background: "rgba(197,168,128,0.06)",
    border: "1px dashed rgba(197,168,128,0.3)",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: "0.78rem",
    color: "#c5a880",
    lineHeight: 1.4,
  },
  summaryBox: {
    background: "#08080a",
    borderLeft: "3px solid #c5a880",
    borderRadius: "0 8px 8px 0",
    padding: "16px 20px",
  },
  summaryText: {
    fontSize: "0.88rem",
    color: "#d1d5db",
    lineHeight: 1.6,
    margin: 0,
    fontStyle: "italic",
    fontFamily: "'Playfair Display', serif",
  },
  proConGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  proTitle: {
    fontSize: "0.85rem",
    color: "#34d399",
    fontWeight: 700,
    margin: "0 0 10px 0",
  },
  conTitle: {
    fontSize: "0.85rem",
    color: "#f87171",
    fontWeight: 700,
    margin: "0 0 10px 0",
  },
  list: {
    listStyleType: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  proItem: {
    fontSize: "0.8rem",
    color: "#d1d5db",
    lineHeight: "1.4",
  },
  proCheck: {
    color: "#c5a880",
    marginRight: 6,
  },
  conItem: {
    fontSize: "0.8rem",
    color: "#d1d5db",
    lineHeight: "1.4",
  },
  conWarning: {
    color: "#f87171",
    marginRight: 6,
    fontWeight: "bold",
  },
  emptyListItem: {
    fontSize: "0.78rem",
    color: "#71717a",
    fontStyle: "italic",
  },
  sectionHeader: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.1rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: "0 0 16px 0",
    borderBottom: "1px solid #1a1a1f",
    paddingBottom: 8,
  },
  reviewsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: 400,
    overflowY: "auto",
    paddingRight: 6,
  },
  reviewCard: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: 16,
  },
  revHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  revUser: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#fcfcfd",
  },
  revRating: {
    color: "#c5a880",
    fontSize: "0.85rem",
    letterSpacing: 1,
  },
  revComment: {
    fontSize: "0.82rem",
    color: "#a1a1aa",
    lineHeight: 1.45,
    margin: "0 0 8px 0",
    fontStyle: "italic",
  },
  revDate: {
    fontSize: "0.7rem",
    color: "#71717a",
  },
  emptyText: {
    color: "#71717a",
    fontSize: "0.85rem",
    textAlign: "center",
    padding: "20px 0",
    margin: 0,
  },
  loadingText: {
    color: "#71717a",
    fontSize: "0.85rem",
    margin: 0,
  },
  playgroundInstructions: {
    fontSize: "0.82rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: "0 0 16px 0",
  },
  idleState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 20px",
  },
  conciergeIcon: {
    fontSize: "3rem",
    marginBottom: 16,
  },
  idleTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.2rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: "0 0 8px 0",
  },
  idleDesc: {
    fontSize: "0.82rem",
    color: "#a1a1aa",
    maxWidth: 320,
    lineHeight: 1.5,
    margin: 0,
  },
};
