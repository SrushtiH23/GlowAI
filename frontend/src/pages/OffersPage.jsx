/**
 * OffersPage.jsx — Active Deals & Live Offers
 * Premium luxury view showcasing curated active salon discounts with dynamic filtering and booking.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

export default function OffersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchActiveOffers();
  }, []);

  async function fetchActiveOffers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/offers/active`);
      if (res.ok) {
        const data = await res.json();
        // Backend already sorts by discount_percentage desc, but we guarantee it here
        const sorted = data.sort((a, b) => b.discount_percentage - a.discount_percentage);
        setOffers(sorted);
      } else {
        throw new Error("Failed to fetch active offers.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load active deals. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Book Now button
  function handleBookOffer(offer) {
    navigate("/book", {
      state: {
        salon: { id: offer.salon_id, name: offer.salon_name },
        hairstyleName: offer.title,
        isAIRecommendations: true,
        occasion: "Exclusive Deal Promotion",
        notes: `✨ Exclusive Deal Applied:\n- Offer: ${offer.title}\n- Discount: ${offer.discount_percentage}% OFF\n- Category: ${offer.category}\n- Valid Until: ${offer.valid_until}`,
        from: "/offers"
      }
    });
  }

  // Smart Category Matcher
  const filterByCategory = (offerList, category) => {
    if (category === "All") return offerList;
    const catLower = category.toLowerCase();
    
    return offerList.filter((offer) => {
      const offerCat = offer.category.toLowerCase();
      const offerTitle = offer.title.toLowerCase();
      
      if (catLower === "hair services") {
        return offerCat.includes("hair") || offerTitle.includes("hair") || offerTitle.includes("cut");
      }
      if (catLower === "makeup") {
        return offerCat.includes("makeup") || offerTitle.includes("makeup") || offerTitle.includes("face");
      }
      if (catLower === "bridal") {
        return offerCat.includes("bridal") || offerTitle.includes("bridal") || offerTitle.includes("wedding");
      }
      if (catLower === "spa") {
        return offerCat.includes("spa") || offerCat.includes("treatment") || offerTitle.includes("massage") || offerTitle.includes("spa");
      }
      if (catLower === "nails") {
        return offerCat.includes("nail") || offerTitle.includes("nail") || offerTitle.includes("pedi") || offerTitle.includes("mani");
      }
      if (catLower === "skincare") {
        return offerCat.includes("skin") || offerCat.includes("facial") || offerTitle.includes("facial") || offerTitle.includes("skin");
      }
      return offerCat.includes(catLower);
    });
  };

  const filteredOffers = filterByCategory(offers, activeCategory);

  // Featured and Trending highlights (rating >= 4.7 OR discount_percentage >= 30%)
  const highlightedOffers = filteredOffers.filter(
    (o) => (o.salon_rating || 0) >= 4.7 || o.discount_percentage >= 30
  );

  const categories = ["All", "Hair Services", "Makeup", "Bridal", "Spa", "Nails", "Skincare"];

  return (
    <div style={styles.page}>
      <Navbar />
      <style>{`
        .offers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 28px;
          width: 100%;
        }
        @media (max-width: 640px) {
          .offers-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>

      <div style={styles.container}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerGlow} />
          <span style={styles.topBadge}>Verified Salon Catalog</span>
          <h1 style={styles.title}>Exclusive Deals & Live Offers</h1>
          <p style={styles.subtitle}>
            Experience Bangalore's finest master salons at preferred pricing. Direct booking for active, verified promotions.
          </p>
        </div>

        {/* Categories Tab Bar */}
        <div style={styles.tabsContainer}>
          <div style={styles.tabsRow}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  ...styles.tabBtn,
                  ...(activeCategory === cat ? styles.tabBtnActive : {}),
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner}>
              <div style={styles.spinnerInner}></div>
            </div>
            <p style={styles.loadingText}>Fetching exclusive deals...</p>
          </div>
        ) : error ? (
          <div style={styles.errorState}>
            <span style={styles.errorIcon}>⚠️</span>
            <h3>Failed to load offers</h3>
            <p>{error}</p>
            <button onClick={fetchActiveOffers} style={styles.retryBtn}>Retry</button>
          </div>
        ) : offers.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>✨</span>
            <h3>No Offers Active</h3>
            <p>Check back later for exclusive deals from our luxury partner salons.</p>
          </div>
        ) : (
          <div style={styles.sectionsContainer}>
            
            {/* 1. Featured & Trending Highlights Section */}
            {highlightedOffers.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>⭐ Featured & Trending</h2>
                  <span style={styles.sectionSubtitle}>Highly rated partner experiences with exceptional savings</span>
                </div>
                <div className="offers-grid">
                  {highlightedOffers.map((offer) => (
                    <OfferCard
                      key={`highlight-${offer.id}`}
                      offer={offer}
                      onBook={handleBookOffer}
                      isHighlighted={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. All Deals Section (Sorted by discount percentage) */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>🏷️ All Verified Deals</h2>
                <span style={styles.sectionSubtitle}>Sorted by highest discount percentage first</span>
              </div>
              
              {filteredOffers.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🔍</span>
                  <h3>No Deals Found</h3>
                  <p>No active deals in category "{activeCategory}" at the moment.</p>
                </div>
              ) : (
                <div className="offers-grid">
                  {filteredOffers.map((offer) => (
                    <OfferCard
                      key={`all-${offer.id}`}
                      offer={offer}
                      onBook={handleBookOffer}
                      isHighlighted={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Offer Card Component ──────────────────────────────────────────

function OfferCard({ offer, onBook, isHighlighted }) {
  const isTrending = (offer.salon_rating || 0) >= 4.7;
  const isBestValue = offer.discount_percentage >= 30;

  return (
    <div style={{
      ...styles.card,
      ...(isHighlighted ? styles.highlightedCard : {})
    }} className="premium-card">
      <div style={styles.cardImageContainer}>
        <img
          src={offer.salon_image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80"}
          alt={offer.salon_name}
          style={styles.cardImage}
        />
        
        {/* Floating Badges */}
        <div style={styles.discountBadge}>
          {offer.discount_percentage}% OFF
        </div>

        {isHighlighted && (
          <div style={styles.highlightBadge}>
            {isBestValue && isTrending ? "★ ULTIMATE DEAL" : isTrending ? "🔥 TRENDING" : "★ FEATURED"}
          </div>
        )}
      </div>

      <div style={styles.cardContent}>
        <div style={styles.cardHeaderRow}>
          <span style={styles.salonName}>{offer.salon_name}</span>
          <span style={styles.salonRating}>⭐ {offer.salon_rating || 4.7}</span>
        </div>
        
        <h3 style={styles.offerTitle}>{offer.title}</h3>
        <p style={styles.offerDesc}>{offer.description}</p>
        
        <div style={styles.categoryPill}>
          🏷️ {offer.category}
        </div>

        <div style={styles.divider} />

        <div style={styles.cardFooter}>
          <div style={styles.pricing}>
            <span style={styles.originalPrice}>₹{offer.original_price.toLocaleString("en-IN")}</span>
            <span style={styles.offerPrice}>₹{offer.offer_price.toLocaleString("en-IN")}</span>
          </div>
          <div style={styles.validity}>
            Valid until: <span style={styles.dateText}>{offer.valid_until}</span>
          </div>
        </div>

        <button onClick={() => onBook(offer)} style={styles.bookBtn}>
          Book Offer Experience
        </button>
      </div>
    </div>
  );
}

// ── Premium Styles ───────────────────────────────────────────────

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
    textAlign: "center",
    marginBottom: "40px",
    position: "relative",
  },
  headerGlow: {
    position: "absolute",
    width: "300px",
    height: "150px",
    background: "radial-gradient(circle, rgba(197,168,128,0.08) 0%, transparent 70%)",
    top: "-20px",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },
  topBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#c5a880",
    border: "1px solid rgba(197,168,128,0.25)",
    padding: "4px 12px",
    borderRadius: "20px",
    background: "rgba(197,168,128,0.04)",
    display: "inline-block",
    marginBottom: "16px",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2.4rem",
    fontWeight: 500,
    margin: "0 0 12px 0",
    background: "linear-gradient(135deg, #fff 40%, #c5a880 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#a1a1aa",
    maxWidth: "600px",
    margin: "0 auto",
    lineHeight: 1.6,
  },
  tabsContainer: {
    marginBottom: "48px",
    borderBottom: "1px solid #1f1f23",
    paddingBottom: "16px",
  },
  tabsRow: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    paddingBottom: "6px",
  },
  tabBtn: {
    background: "transparent",
    border: "1px solid #1f1f23",
    color: "#71717a",
    padding: "8px 18px",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  tabBtnActive: {
    background: "rgba(197, 168, 128, 0.12)",
    borderColor: "#c5a880",
    color: "#c5a880",
  },
  loadingWrapper: {
    textAlign: "center",
    padding: "80px 0",
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
  loadingText: {
    color: "#a1a1aa",
    fontSize: "0.9rem",
  },
  errorState: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
  },
  errorIcon: {
    fontSize: "2.5rem",
    color: "#f87171",
    marginBottom: "16px",
    display: "block",
  },
  retryBtn: {
    background: "#c5a880",
    border: "none",
    padding: "8px 20px",
    borderRadius: "6px",
    color: "#0e0e0e",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "16px",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
    width: "100%",
    boxSizing: "border-box",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: "16px",
    display: "block",
  },
  sectionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "64px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  sectionHeader: {
    borderBottom: "1px dashed #26262b",
    paddingBottom: "12px",
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.6rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: "0 0 4px 0",
  },
  sectionSubtitle: {
    fontSize: "0.85rem",
    color: "#71717a",
  },
  offersGrid: {
    display: "grid",
    gap: "24px",
  },
  card: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
    transition: "transform 0.3s, border-color 0.3s, box-shadow 0.3s",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  highlightedCard: {
    background: "linear-gradient(135deg, #16161b 0%, #121215 100%)",
    border: "1px solid rgba(197, 168, 128, 0.4)",
    boxShadow: "0 10px 30px rgba(197, 168, 128, 0.08)",
  },
  cardImageContainer: {
    height: "200px",
    position: "relative",
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.5s",
  },
  discountBadge: {
    position: "absolute",
    top: "16px",
    left: "16px",
    background: "linear-gradient(135deg, #8a704c 0%, #c5a880 100%)",
    color: "#0e0e0e",
    fontWeight: 800,
    fontSize: "0.82rem",
    padding: "6px 12px",
    borderRadius: "6px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    letterSpacing: "0.03em",
    zIndex: 2,
  },
  highlightBadge: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(8, 8, 10, 0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid #c5a880",
    color: "#c5a880",
    fontWeight: 700,
    fontSize: "0.75rem",
    padding: "6px 12px",
    borderRadius: "6px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    letterSpacing: "0.05em",
    zIndex: 2,
  },
  cardContent: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  salonName: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  salonRating: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#c5a880",
  },
  offerTitle: {
    fontSize: "1.18rem",
    fontWeight: 650,
    color: "#fcfcfd",
    margin: "0 0 8px 0",
  },
  offerDesc: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: "0 0 16px 0",
    flex: 1,
  },
  categoryPill: {
    fontSize: "0.75rem",
    color: "#c5a880",
    background: "rgba(197, 168, 128, 0.06)",
    border: "1px solid rgba(197, 168, 128, 0.15)",
    padding: "4px 10px",
    borderRadius: "4px",
    alignSelf: "flex-start",
    marginBottom: "20px",
  },
  divider: {
    height: "1px",
    background: "#1a1a1e",
    marginBottom: "16px",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px",
  },
  pricing: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  originalPrice: {
    fontSize: "0.88rem",
    color: "#4b5563",
    textDecoration: "line-through",
  },
  offerPrice: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "#c5a880",
  },
  validity: {
    fontSize: "0.78rem",
    color: "#71717a",
  },
  dateText: {
    color: "#f87171",
    fontWeight: 600,
  },
  bookBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "1px solid #c5a880",
    borderRadius: "6px",
    color: "#c5a880",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "all 0.2s",
    ":hover": {
      background: "#c5a880",
      color: "#0e0e0e",
    }
  }
};
