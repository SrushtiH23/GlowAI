/**
 * FaceAnalysisPage.jsx — Face Shape Analysis & Hairstyle Recommendation Page
 * Uses Gemini Vision API (with mock fallback) to analyze user selfies.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

// Custom keyframes for premium scanning and spinning animations
const cssAnimations = `
  @keyframes scanline {
    0% { top: 0%; opacity: 0.8; }
    50% { top: 100%; opacity: 0.8; }
    100% { top: 0%; opacity: 0.8; }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0% { opacity: 0.4; transform: scale(0.98); }
    50% { opacity: 0.8; transform: scale(1.02); }
    100% { opacity: 0.4; transform: scale(0.98); }
  }
`;

export default function FaceAnalysisPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // File states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedSalonId, setSelectedSalonId] = useState(null);

  // DB context states for booking integration
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch salons and services for booking redirection
  useEffect(() => {
    fetchSalonsAndServices();
  }, []);

  async function fetchSalonsAndServices() {
    try {
      const sRes = await fetch(`${API}/api/salons`);
      if (sRes.ok) {
        const salonsList = await sRes.json();
        setSalons(salonsList);
        if (salonsList.length > 0) {
          const defaultSalon = salonsList.find((s) => s.name.toLowerCase().includes("rossano") || s.name.toLowerCase().includes("ferretti")) || salonsList[0];
          setSelectedSalonId(defaultSalon.id);
        }
        
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

  // Loading indicator messages
  const loadingSteps = [
    "Consulting Aura Vision analyzer...",
    "Scanning facial symmetry & features...",
    "Detecting cheekbone & jawline structures...",
    "Determining optimal balance proportions...",
    "Selecting bespoke hair recommendations..."
  ];

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((s) => (s < loadingSteps.length - 1 ? s + 1 : s));
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload a valid image file.");
        return;
      }
      setError("");
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysis(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload a valid image file.");
        return;
      }
      setError("");
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysis(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select or drop a photo of your face first.");
      return;
    }

    setError("");
    setLoading(true);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (selectedGender) {
        formData.append("gender", selectedGender);
      }

      const res = await fetch(`${API}/api/concierge/analyze-face`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Analysis failed. Please try again.");
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = (styleName) => {
    // Find the chosen salon from selector state
    let targetSalon = salons.find((s) => s.id === selectedSalonId);
    if (!targetSalon && salons.length > 0) targetSalon = salons[0];
    
    // Find matching haircut service or first service in the salon
    let targetService = services.find(
      (svc) => svc.salon_id === targetSalon?.id && (svc.service_name.toLowerCase().includes("haircut") || svc.service_name.toLowerCase().includes("precision"))
    );
    if (!targetService && services.length > 0) {
      targetService = services.find((svc) => svc.salon_id === targetSalon?.id);
    }

    if (targetSalon) {
      navigate("/book", {
        state: {
          salon: targetSalon,
          service: targetService || null,
          faceShape: analysis?.face_shape || "",
          styleName: styleName || "",
          isAIRecommendations: true
        },
      });
    } else {
      navigate("/book");
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <style>{cssAnimations}</style>
      <div style={styles.container}>
        
        {/* Header Row */}
        <div style={styles.headerRow}>
          <div>
            {!isMobileOrTablet && (
              <div style={styles.brandRow}>
                <span style={styles.brand}>AURA</span>
                <span style={styles.badge}>Elite</span>
              </div>
            )}
            <h1 style={styles.heading}>AI Face Shape Analyzer</h1>
            <p style={styles.sub}>
              Upload a selfie to determine your face shape and receive personalized hairstyle fits.
            </p>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: isMobileOrTablet ? "1fr" : "1.1fr 1.9fr"
        }}>
          
          {/* Left Panel: Photo Upload Area */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Image Consultation</h2>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={previewUrl ? null : triggerFileSelect}
                style={{
                  ...styles.uploadBox,
                  ...(isDragOver ? styles.uploadBoxActive : {}),
                  ...(previewUrl ? styles.uploadBoxPreviewMode : {}),
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: "none" }}
                />

                {!previewUrl ? (
                  <div style={styles.uploadPrompt}>
                    <div style={styles.cameraIcon}>📷</div>
                    <span style={styles.uploadTitle}>Drag & Drop Selfie</span>
                    <span style={styles.uploadSubtitle}>or click to browse from files</span>
                    <span style={styles.uploadLimits}>Supports PNG, JPG (Max 5MB)</span>
                  </div>
                ) : (
                  <div style={styles.previewContainer}>
                    <img src={previewUrl} alt="Selfie preview" style={styles.previewImage} />
                    
                    {/* Glowing Laser Scan Line Overlay */}
                    {loading && (
                      <div style={styles.scannerLine} />
                    )}

                    {!loading && (
                      <button 
                        type="button" 
                        onClick={clearSelection} 
                        style={styles.clearBtn}
                        title="Clear photo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Gender Selector */}
              <div style={styles.genderSection}>
                <label style={styles.genderLabel}>Select Gender <span style={{color:"#71717a",fontWeight:400}}>(optional)</span></label>
                <div style={styles.genderRow}>
                  {["Male", "Female", "Prefer not to say"].map((g) => {
                    const val = g === "Prefer not to say" ? "" : g;
                    const isActive = selectedGender === val;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedGender(val)}
                        style={{
                          ...styles.genderBtn,
                          ...(isActive ? styles.genderBtnActive : {}),
                        }}
                      >
                        {g === "Male" && "👨 "}
                        {g === "Female" && "👩 "}
                        {g === "Prefer not to say" && "🤷 "}
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={styles.actionRow}>
                {previewUrl && !loading && (
                  <button 
                    type="button" 
                    onClick={clearSelection} 
                    style={styles.resetBtn}
                  >
                    Change Photo
                  </button>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !selectedFile} 
                  style={{
                    ...styles.submitBtn,
                    ...(!selectedFile ? styles.submitBtnDisabled : {}),
                  }}
                >
                  {loading ? "Analyzing Geometry…" : "Analyze Face Shape"}
                </button>
              </div>

            </form>
          </div>

          {/* Right Panel: Output results */}
          <div style={styles.outputCard}>
            
            {/* Idle Greeting */}
            {!loading && !analysis && !error && (
              <div style={styles.idleState}>
                <div style={styles.conciergeIcon}>✨</div>
                <h3 style={styles.idleTitle}>Aura Vision Analyzer</h3>
                <p style={styles.idleDesc}>
                  Upload a clear portrait selfie showing your full face structure. Our Gemini-powered AI will measure geometric ratios, detect jawline width, and generate customized hairstyle options.
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div style={styles.loadingState}>
                <div style={styles.spinner}>
                  <div style={styles.spinnerInner}></div>
                </div>
                <h3 style={styles.loadingTitle}>{loadingSteps[loadingStep]}</h3>
                <p style={styles.loadingDesc}>Processing image parameters...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div style={styles.errorState}>
                <div style={styles.errorIcon}>⚠️</div>
                <h3 style={styles.errorTitle}>Analysis Failed</h3>
                <p style={styles.errorDesc}>{error}</p>
              </div>
            )}

            {/* Results Output */}
            {analysis && (
              <div style={styles.resultsContainer}>
                
                {/* Fallback Warning Banner */}
                {analysis.is_mock && (
                  <div style={styles.mockBanner}>
                    <span style={{ fontWeight: 700 }}>DEMO MODE:</span> Gemini API key not configured. Displaying high-fidelity simulated geometry measurements based on uploaded file.
                  </div>
                )}

                {/* Face Shape Badge Block */}
                <div style={styles.shapeSummary}>
                  <div style={styles.shapeLabel}>DETECTED FACE STRUCTURE</div>
                  <div style={styles.shapeBadgeRow}>
                    <span style={styles.shapeBadge}>{analysis.face_shape}</span>
                  </div>

                  {/* Gender & Confidence Row */}
                  <div style={styles.metaRow}>
                    {analysis.detected_gender && analysis.detected_gender !== "Unknown" && (
                      <span style={styles.metaPill}>
                        {analysis.detected_gender === "Male" ? "👨" : analysis.detected_gender === "Female" ? "👩" : "🧑"}{" "}
                        {analysis.detected_gender}
                      </span>
                    )}
                    {analysis.skin_tone && (
                      <span style={styles.metaPill}>🎨 {analysis.skin_tone}</span>
                    )}
                    {analysis.confidence && (
                      <span style={{
                        ...styles.metaPill,
                        ...(analysis.confidence === "High" ? {borderColor: "rgba(74,222,128,0.3)", color: "#4ade80"} :
                           analysis.confidence === "Medium" ? {borderColor: "rgba(250,204,21,0.3)", color: "#facc15"} :
                           {borderColor: "rgba(248,113,113,0.3)", color: "#f87171"})
                      }}>
                        {analysis.confidence === "High" ? "✅" : analysis.confidence === "Medium" ? "⚠️" : "❓"}{" "}
                        {analysis.confidence} Confidence
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleBookService(analysis.recommended_hairstyles?.[0]?.name)}
                    style={{
                      marginTop: 20,
                      background: "linear-gradient(135deg, #8a704c, #c5a880)",
                      border: "none",
                      borderRadius: 6,
                      color: "#0e0e0e",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      padding: "12px 24px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(197,168,128,0.25)",
                      transition: "all 0.3s",
                    }}
                  >
                    ✨ Find Salons & Book Styles
                  </button>
                </div>

                {/* Salon Selector Block */}
                <div style={styles.salonSelectorBox}>
                  <label style={styles.salonSelectorLabel}>Choose Salon for Styling Booking:</label>
                  <select
                    value={selectedSalonId || ""}
                    onChange={(e) => setSelectedSalonId(Number(e.target.value))}
                    style={styles.salonSelectorSelect}
                  >
                    {salons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.area}) — ★{s.rating}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Key Features Box */}
                {analysis.key_features && (
                  <div style={styles.featuresBox}>
                    <div style={styles.featuresLabel}>KEY FACIAL LANDMARKS</div>
                    <p style={styles.featuresText}>{analysis.key_features}</p>
                  </div>
                )}

                {/* Stylist Explanation Speech Box */}
                <div style={styles.explanationBox}>
                  <div style={styles.directorHeader}>
                    <div style={styles.directorAvatar}>AI</div>
                    <div>
                      <div style={styles.directorName}>Aura Style Director</div>
                      <div style={styles.directorTitle}>Geometric Portrait Diagnostic</div>
                    </div>
                  </div>
                  <p style={styles.explanationText}>"{analysis.explanation}"</p>
                </div>

                {/* Recommended Styles List */}
                <div style={styles.section}>
                  <h3 style={styles.sectionHeader}>Recommended Hairstyle Fits</h3>
                  
                  <div style={styles.stylesGrid}>
                    {analysis.recommended_hairstyles.map((hair, i) => (
                      <div key={i} style={styles.hairCard}>
                        <div style={styles.hairHeader}>
                          <h4 style={styles.hairName}>{hair.name}</h4>
                          <span style={styles.matchBadge}>Matching Style</span>
                        </div>
                        <p style={styles.hairDesc}>{hair.description}</p>
                        <div style={styles.hairFooter}>
                          <button
                            onClick={() => handleBookService(hair.name)}
                            style={styles.bookStyleBtn}
                          >
                            Book Styling Appointment →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
  uploadBox: {
    background: "#08080a",
    border: "2px dashed #26262b",
    borderRadius: 10,
    minHeight: 280,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s",
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  uploadBoxActive: {
    borderColor: "#c5a880",
    background: "rgba(197,168,128,0.04)",
  },
  uploadBoxPreviewMode: {
    borderStyle: "solid",
    cursor: "default",
  },
  uploadPrompt: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  cameraIcon: {
    fontSize: "3rem",
    marginBottom: 16,
    color: "#71717a",
  },
  uploadTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#fcfcfd",
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: "0.82rem",
    color: "#a1a1aa",
    marginBottom: 12,
  },
  uploadLimits: {
    fontSize: "0.72rem",
    color: "#71717a",
  },
  previewContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: 250,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: 300,
    borderRadius: 6,
    objectFit: "contain",
  },
  scannerLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    background: "linear-gradient(90deg, transparent 5%, #c5a880 50%, transparent 95%)",
    boxShadow: "0 0 12px #c5a880",
    animation: "scanline 2.5s ease-in-out infinite",
  },
  clearBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.8)",
    border: "1px solid #26262b",
    color: "#fcfcfd",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    transition: "background 0.2s",
  },
  actionRow: {
    display: "flex",
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#a1a1aa",
    fontWeight: 600,
    fontSize: "0.88rem",
    padding: "12px",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.3s",
  },
  submitBtn: {
    flex: 2,
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: 6,
    color: "#0e0e0e",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.88rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "12px",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(197,168,128,0.25)",
    transition: "opacity 0.2s",
  },
  submitBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
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
  shapeSummary: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: 20,
    textAlign: "center",
  },
  shapeLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.08em",
    marginBottom: 10,
  },
  shapeBadgeRow: {
    display: "flex",
    justifyContent: "center",
  },
  shapeBadge: {
    fontSize: "2rem",
    fontFamily: "'Playfair Display', serif",
    fontWeight: 700,
    color: "#c5a880",
    letterSpacing: "0.05em",
    borderBottom: "2px solid #c5a880",
    paddingBottom: 4,
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
  stylesGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  hairCard: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: 20,
  },
  hairHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  hairName: {
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "#fcfcfd",
    margin: 0,
  },
  matchBadge: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "#c5a880",
    background: "rgba(197,168,128,0.08)",
    padding: "2px 8px",
    borderRadius: 4,
    textTransform: "uppercase",
    border: "1px solid rgba(197,168,128,0.2)",
  },
  hairDesc: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: "0 0 16px 0",
  },
  hairFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  bookStyleBtn: {
    background: "transparent",
    border: "1px solid #c5a880",
    borderRadius: 6,
    color: "#c5a880",
    fontSize: "0.82rem",
    fontWeight: 600,
    padding: "8px 16px",
    cursor: "pointer",
    transition: "all 0.3s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  // ── Gender Selector Styles ──────────────────────────
  genderSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  genderLabel: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  genderRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  genderBtn: {
    flex: 1,
    minWidth: 90,
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    color: "#71717a",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "10px 8px",
    cursor: "pointer",
    transition: "all 0.3s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    textAlign: "center",
  },
  genderBtnActive: {
    borderColor: "#c5a880",
    color: "#c5a880",
    background: "rgba(197,168,128,0.08)",
    boxShadow: "0 0 12px rgba(197,168,128,0.12)",
  },
  // ── Result Meta Styles ─────────────────────────────
  metaRow: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },
  metaPill: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#a1a1aa",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #26262b",
    borderRadius: 20,
    padding: "5px 14px",
  },
  featuresBox: {
    background: "rgba(197,168,128,0.04)",
    border: "1px solid rgba(197,168,128,0.15)",
    borderRadius: 10,
    padding: 18,
  },
  featuresLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#c5a880",
    letterSpacing: "0.08em",
    marginBottom: 8,
  },
  featuresText: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    lineHeight: 1.6,
    margin: 0,
  },
  salonSelectorBox: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  salonSelectorLabel: {
    fontSize: "0.78rem",
    fontWeight: 650,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  salonSelectorSelect: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 6,
    padding: "10px 12px",
    color: "#fcfcfd",
    fontSize: "0.9rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    cursor: "pointer",
  },
};
