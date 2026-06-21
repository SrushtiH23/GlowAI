/**
 * ConciergePage.jsx — AI Beauty Concierge Page
 * Uses Gemini API (with fallback mock recommendations) to curate custom styling plans.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

export default function ConciergePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const resultsRef = useRef(null);

  // Inputs
  const [budget, setBudget] = useState(() => {
    const saved = sessionStorage.getItem("aura_concierge_budget");
    return saved ? Number(saved) : 5000;
  });
  const [occasion, setOccasion] = useState(() => {
    return sessionStorage.getItem("aura_concierge_occasion") || "Date Night";
  });
  const [location, setLocation] = useState(() => {
    return sessionStorage.getItem("aura_concierge_location") || "All Locations";
  });
  const [hairType, setHairType] = useState(() => {
    return sessionStorage.getItem("aura_concierge_hair_type") || "Wavy";
  });

  // DB database state (for matching full objects on Book Now)
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState(() => {
    const saved = sessionStorage.getItem("aura_concierge_recommendation");
    return saved ? JSON.parse(saved) : null;
  });
  const [loadingStep, setLoadingStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync inputs and recommendation to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("aura_concierge_budget", budget.toString());
  }, [budget]);

  useEffect(() => {
    sessionStorage.setItem("aura_concierge_occasion", occasion);
  }, [occasion]);

  useEffect(() => {
    sessionStorage.setItem("aura_concierge_location", location);
  }, [location]);

  useEffect(() => {
    sessionStorage.setItem("aura_concierge_hair_type", hairType);
  }, [hairType]);

  useEffect(() => {
    if (recommendation) {
      sessionStorage.setItem("aura_concierge_recommendation", JSON.stringify(recommendation));
    } else {
      sessionStorage.removeItem("aura_concierge_recommendation");
    }
  }, [recommendation]);

  // Fetch salons and services on mount to allow exact object matching when booking
  useEffect(() => {
    fetchSalonsAndServices();
  }, []);

  async function fetchSalonsAndServices() {
    try {
      const sRes = await fetch(`${API}/api/salons`);
      if (sRes.ok) {
        const salonsList = await sRes.json();
        setSalons(salonsList);
        
        // Fetch services for all salons to map them
        const servicesList = [];
        for (const salon of salonsList) {
          const svcRes = await fetch(`${API}/api/salons/${salon.id}/services`);
          if (svcRes.ok) {
            const svcs = await svcRes.json();
            servicesList.push(...svcs);
          }
        }
        setServices(servicesList);
      }
    } catch {
      /* ignore */
    }
  }

  // Scroll to results once recommendation is generated
  useEffect(() => {
    if (recommendation && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [recommendation]);

  // Loading text cycles
  useEffect(() => {
    if (!loading) return;
    const steps = [
      "Consulting Aura Style Director...",
      "Analyzing face structure & hair texture...",
      "Scanning Bangalore luxury salons database...",
      "Matching services with your budget...",
      "Generating bespoke lookbook..."
    ];
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setRecommendation(null);
    setSaveStatus("");

    try {
      const res = await fetch(`${API}/api/concierge/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          budget,
          occasion,
          location,
          hair_type: hairType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate recommendation.");
      }

      const data = await res.json();
      setRecommendation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLookbook() {
    if (!recommendation) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`${API}/api/concierge/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          occasion: occasion,
          budget: budget,
          location: location,
          hair_type: hairType,
          explanation: recommendation.explanation,
          recommended_hairstyles: recommendation.recommended_hairstyles,
          recommended_services: recommendation.recommended_services,
          recommended_salons: recommendation.recommended_salons,
          estimated_budget: recommendation.estimated_budget
        })
      });
      if (res.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }

  // Pre-select salon + service and navigate to booking wizard
  function handleBookNow(recService) {
    let fullSalon = salons.find((s) => s.id === recService.salon_id);
    if (!fullSalon) {
      const recSalon = recommendation?.recommended_salons?.find((s) => s.salon_id === recService.salon_id);
      fullSalon = {
        id: recService.salon_id,
        name: recSalon ? recSalon.name : (recService.salon_name || "Selected Salon"),
        area: recService.area || "Bangalore"
      };
    }
    
    // Find matching service or fallback to first service in the salon
    let fullService = services.find(
      (s) => s.id === recService.service_id || (s.salon_id === recService.salon_id && s.service_name.toLowerCase().includes(recService.name.toLowerCase()))
    );
    if (!fullService && services.length > 0 && fullSalon) {
      fullService = services.find((s) => s.salon_id === fullSalon.id);
    }
    if (!fullService && fullSalon) {
      fullService = {
        id: recService.service_id || 99999,
        salon_id: fullSalon.id,
        service_name: recService.name || "Bespoke Service",
        price: recService.price_estimate || 2500,
        duration_minutes: 45
      };
    }

    const hairstyleName = recommendation?.recommended_hairstyles?.[0]?.name || "";

    if (fullSalon) {
      navigate("/book", {
        state: {
          salon: fullSalon,
          service: fullService || null,
          hairstyleName: hairstyleName,
          occasion: occasion,
          hairType: hairType,
          isAIRecommendations: true,
          from: "/concierge"
        },
      });
    } else {
      // Direct fallback to booking page if objects not found
      navigate("/book", {
        state: {
          from: "/concierge"
        }
      });
    }
  }

  const loadingTexts = [
    "Consulting Aura Style Director...",
    "Analyzing face structure & hair texture...",
    "Scanning Bangalore luxury salons database...",
    "Matching services with your budget...",
    "Generating bespoke lookbook..."
  ];

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div>
            {!isMobileOrTablet && (
              <div style={styles.brandRow}>
                <span style={styles.brand}>AURA</span>
                <span style={styles.badge}>Elite</span>
              </div>
            )}
            <h1 style={styles.heading}>AI Beauty Concierge</h1>
            <p style={styles.sub}>
              State-of-the-art styling advisor matches you with Bangalore's leading master salons.
            </p>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: isMobileOrTablet ? "1fr" : "1.1fr 1.9fr"
        }}>
          
          {/* Left: Form Panel */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Bespoke Consultation</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              
              {/* Budget */}
              <div style={styles.formGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Max Budget (INR)</label>
                  <span style={styles.budgetValue}>₹{budget.toLocaleString("en-IN")}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="25000"
                  step="500"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  style={styles.slider}
                />
                <div style={styles.sliderLimits}>
                  <span>₹1,000</span>
                  <span>₹25,000</span>
                </div>
              </div>

              {/* Occasion */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Occasion</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  style={styles.select}
                >
                  <option value="Daily Luxury">Daily Luxury / Grooming</option>
                  <option value="Date Night">Romantic Date Night</option>
                  <option value="Wedding Gala">Wedding Gala / Bridal</option>
                  <option value="Cocktail Party">Cocktail Party / Evening Reception</option>
                  <option value="Elite Corporate">Elite Corporate Meet / Presentation</option>
                  <option value="Festive Celebration">Festive Celebration</option>
                </select>
              </div>

              {/* Location */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Preferred Neighborhood</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={styles.select}
                >
                  <option value="All Locations">All Bangalore Areas</option>
                  <option value="Ashok Nagar">Ashok Nagar (Ritz-Carlton / JW)</option>
                  <option value="UB City">UB City / Lavelle Road</option>
                  <option value="Indiranagar">Indiranagar 100ft Road</option>
                  <option value="Old Airport Road">Old Airport Road (Leela Palace)</option>
                </select>
              </div>

              {/* Hair Type */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Hair Type / Texture</label>
                <div style={styles.chipGrid}>
                  {["Straight", "Wavy", "Curly", "Coily"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setHairType(type)}
                      style={{
                        ...styles.chip,
                        ...(hairType === type ? styles.chipActive : {}),
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? "Analyzing Profile…" : "Consult Aura Advisor"}
              </button>
            </form>
          </div>

          {/* Right: Output Panel */}
          <div style={styles.outputCard}>
            
            {/* 1. Idle Greeting state */}
            {!loading && !recommendation && !error && (
              <div style={styles.idleState}>
                <div style={styles.conciergeIcon}>✨</div>
                <h3 style={styles.idleTitle}>Aura Style Concierge</h3>
                <p style={styles.idleDesc}>
                  Select your profile attributes on the left. Our AI Concierge will scan Bangalore's premium salons, matching your hair type and occasion with exclusive style diagnostics.
                </p>
              </div>
            )}

            {/* 2. Loading state */}
            {loading && (
              <div style={styles.loadingState}>
                <div style={styles.spinner}>
                  <div style={styles.spinnerInner}></div>
                </div>
                <h3 style={styles.loadingTitle}>{loadingTexts[loadingStep]}</h3>
                <p style={styles.loadingDesc}>Curating luxury styling suggestions...</p>
              </div>
            )}

            {/* 3. Error state */}
            {error && (
              <div style={styles.errorState}>
                <div style={styles.errorIcon}>⚠️</div>
                <h3 style={styles.errorTitle}>Consultation Failed</h3>
                <p style={styles.errorDesc}>{error}</p>
              </div>
            )}

            {/* 4. Recommendation Output Results */}
            {recommendation && (
              <div ref={resultsRef} style={styles.resultsContainer}>
                
                {/* Mock warning banner */}
                {recommendation.is_mock && (
                  <div style={styles.mockBanner}>
                    <span style={{ fontWeight: 700 }}>DEMO MODE:</span> Gemini API key not configured on backend. Showing high-fidelity simulated recommendations using actual database salons.
                  </div>
                )}

                {/* Save Lookbook Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                  <button
                    onClick={handleSaveLookbook}
                    disabled={saveStatus === "saving" || saveStatus === "saved"}
                    style={{
                      background: saveStatus === "saved" ? "rgba(52,211,153,0.1)" : "transparent",
                      border: `1px solid ${saveStatus === "saved" ? "#34d399" : "#26262b"}`,
                      borderRadius: "6px",
                      color: saveStatus === "saved" ? "#34d399" : "#c5a880",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 650,
                      fontSize: "0.8rem",
                      padding: "8px 16px",
                      cursor: saveStatus === "saved" ? "default" : "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {saveStatus === "saving" && "Saving Lookbook..."}
                    {saveStatus === "saved" && "✓ Lookbook Saved"}
                    {saveStatus === "error" && "⚠️ Try Again"}
                    {saveStatus === "" && "💾 Save Lookbook"}
                  </button>
                </div>

                {/* AI Explanation */}
                <div style={styles.explanationBox}>
                  <div style={styles.directorHeader}>
                    <div style={styles.directorAvatar}>AI</div>
                    <div>
                      <div style={styles.directorName}>Aura Style Director</div>
                      <div style={styles.directorTitle}>Personal Recommendation</div>
                    </div>
                  </div>
                  <p style={styles.explanationText}>"{recommendation.explanation}"</p>
                </div>

                {/* Recommended Hairstyles */}
                <div style={styles.section}>
                  <h3 style={styles.sectionHeader}>Bespoke Hairstyles for You</h3>
                  <div style={{
                    ...styles.hairstylesGrid,
                    gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr"
                  }}>
                    {recommendation.recommended_hairstyles.map((hair, i) => (
                      <div key={i} style={styles.hairCard}>
                        <div style={styles.hairBadge}>Style {i + 1}</div>
                        <h4 style={styles.hairName}>{hair.name}</h4>
                        <p style={styles.hairDesc}>{hair.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Services & Salons */}
                <div style={styles.section}>
                  <h3 style={styles.sectionHeader}>Recommended Experiences</h3>
                  <div style={styles.servicesList}>
                    {recommendation.recommended_services.map((svc, i) => {
                      const salonRec = recommendation.recommended_salons.find(
                        (s) => s.salon_id === svc.salon_id
                      ) || { reason: "Premium location match." };

                      return (
                        <div key={i} style={styles.serviceCard}>
                          <div style={styles.svcHeader}>
                            <div>
                              <h4 style={styles.svcName}>{svc.name}</h4>
                              <p style={styles.svcDesc}>{svc.description}</p>
                            </div>
                            <div style={styles.svcPrice}>
                              ₹{svc.price_estimate.toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div style={styles.salonBox}>
                            <div style={styles.salonBoxHeader}>
                              <span style={styles.salonBoxLabel}>RECOMMENDED AT</span>
                              <span style={styles.salonName}>{salonRec.name || "Luxury Salon"}</span>
                            </div>
                            <p style={styles.salonReason}>"{salonRec.reason}"</p>
                          </div>

                          <div style={styles.svcFooter}>
                            <button
                              onClick={() => handleBookNow(svc)}
                              style={styles.bookNowBtn}
                            >
                              Reserve Experience →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Estimated Budget Summary */}
                <div style={styles.summaryCard}>
                  <span style={styles.summaryLabel}>Total Estimated Cost</span>
                  <span style={styles.summaryPrice}>
                    ₹{recommendation.estimated_budget.toLocaleString("en-IN")}
                  </span>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
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
  },
  container: {
    maxWidth: 1100,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.9fr",
    gap: 24,
    alignItems: "start",
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
    fontSize: "1.25rem",
    fontWeight: 500,
    marginBottom: 24,
    borderBottom: "1px solid #26262b",
    paddingBottom: 12,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  },
  budgetValue: {
    color: "#c5a880",
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  slider: {
    width: "100%",
    background: "#26262b",
    height: 4,
    borderRadius: 2,
    outline: "none",
    accentColor: "#c5a880",
    margin: "10px 0 6px",
    cursor: "pointer",
  },
  sliderLimits: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.72rem",
    color: "#71717a",
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
    boxSizing: "border-box",
  },
  chipGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  chip: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#a1a1aa",
    padding: "10px",
    fontSize: "0.82rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  chipActive: {
    background: "rgba(197,168,128,0.12)",
    border: "1px solid #c5a880",
    color: "#c5a880",
    fontWeight: 600,
  },
  submitBtn: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: 6,
    color: "#0e0e0e",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.9rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "14px",
    cursor: "pointer",
    marginTop: 10,
    boxShadow: "0 4px 14px rgba(197,168,128,0.25)",
  },
  outputCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 12,
    padding: 24,
    minHeight: 450,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
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
    fontSize: "3.5rem",
    marginBottom: 20,
    animation: "pulse 2s infinite",
  },
  idleTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.4rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: "0 0 10px 0",
  },
  idleDesc: {
    fontSize: "0.9rem",
    color: "#a1a1aa",
    maxWidth: 420,
    lineHeight: 1.6,
    margin: 0,
  },
  loadingState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 40,
  },
  spinner: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "2px dashed #26262b",
    borderTopColor: "#c5a880",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    animation: "spin 2s linear infinite",
  },
  spinnerInner: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "2px dashed #26262b",
    borderBottomColor: "#c5a880",
    animation: "spin 1.5s linear infinite reverse",
  },
  loadingTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#c5a880",
    margin: "0 0 8px 0",
    minHeight: 28,
  },
  loadingDesc: {
    fontSize: "0.85rem",
    color: "#71717a",
    margin: 0,
  },
  errorState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 40,
  },
  errorIcon: {
    fontSize: "3rem",
    color: "#f87171",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "#fcfcfd",
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: "0.9rem",
    color: "#f87171",
    maxWidth: 400,
  },
  resultsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  mockBanner: {
    background: "rgba(197,168,128,0.06)",
    border: "1px dashed rgba(197,168,128,0.3)",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: "0.8rem",
    color: "#c5a880",
    lineHeight: 1.4,
  },
  explanationBox: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: 20,
    position: "relative",
  },
  directorHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  directorAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    color: "#0e0e0e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  directorName: {
    fontSize: "0.9rem",
    fontWeight: 750,
    color: "#fcfcfd",
  },
  directorTitle: {
    fontSize: "0.72rem",
    color: "#c5a880",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  explanationText: {
    fontSize: "0.88rem",
    color: "#a1a1aa",
    lineHeight: 1.6,
    margin: 0,
    fontStyle: "italic",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  sectionHeader: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.15rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: 0,
    borderBottom: "1px solid #1a1a1f",
    paddingBottom: 8,
  },
  hairstylesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  hairCard: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: 16,
    position: "relative",
  },
  hairBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "#c5a880",
    background: "rgba(197,168,128,0.08)",
    padding: "2px 6px",
    borderRadius: 4,
    textTransform: "uppercase",
  },
  hairName: {
    fontSize: "0.92rem",
    fontWeight: 650,
    color: "#fcfcfd",
    margin: "0 0 6px 0",
    paddingRight: 60,
  },
  hairDesc: {
    fontSize: "0.8rem",
    color: "#71717a",
    lineHeight: 1.45,
    margin: 0,
  },
  servicesList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  serviceCard: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: 20,
  },
  svcHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    borderBottom: "1px solid #1a1a1f",
    paddingBottom: 12,
    marginBottom: 12,
  },
  svcName: {
    fontSize: "0.95rem",
    fontWeight: 650,
    color: "#fcfcfd",
    margin: "0 0 4px 0",
  },
  svcDesc: {
    fontSize: "0.8rem",
    color: "#71717a",
    lineHeight: 1.4,
    margin: 0,
  },
  svcPrice: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#c5a880",
  },
  salonBox: {
    background: "#121215",
    borderRadius: 6,
    padding: "12px 14px",
    marginBottom: 16,
  },
  salonBoxHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  salonBoxLabel: {
    fontSize: "0.62rem",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
  },
  salonName: {
    fontSize: "0.88rem",
    fontWeight: 650,
    color: "#fcfcfd",
  },
  salonReason: {
    fontSize: "0.8rem",
    color: "#a1a1aa",
    lineHeight: 1.4,
    margin: 0,
    fontStyle: "italic",
  },
  svcFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  bookNowBtn: {
    background: "transparent",
    border: "1px solid #c5a880",
    borderRadius: 6,
    color: "#c5a880",
    fontSize: "0.82rem",
    fontWeight: 600,
    padding: "8px 16px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  summaryCard: {
    background: "linear-gradient(135deg,rgba(197,168,128,0.15) 0%,rgba(138,112,76,0.05) 100%)",
    border: "1px solid rgba(197,168,128,0.25)",
    borderRadius: 10,
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#fcfcfd",
  },
  summaryPrice: {
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#c5a880",
  },
};
