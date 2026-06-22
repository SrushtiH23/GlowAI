/**
 * BookingPage.jsx — Multi-step salon booking wizard.
 *
 * Steps:
 *   1. Select Salon
 *   2. Select Service
 *   3. Select Date & Time
 *   4. Review & Confirm
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SalonMap from "../components/SalonMap";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

/* ════════════════════════════════════════════════════════════════
   STEP INDICATOR
   ════════════════════════════════════════════════════════════════ */

function StepIndicator({ current }) {
  const steps = ["Salon", "Service", "Date & Time", "Confirm"];
  return (
    <div style={si.wrap}>
      {steps.map((label, i) => {
        const num = i + 1;
        const isActive = num === current;
        const isDone = num < current;
        return (
          <React.Fragment key={num}>
            {i > 0 && (
              <div
                style={{
                  ...si.line,
                  background: isDone
                    ? "linear-gradient(90deg,#c5a880,#e8d5b7)"
                    : "#26262b",
                }}
              />
            )}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  ...si.circle,
                  ...(isActive ? si.circleActive : {}),
                  ...(isDone ? si.circleDone : {}),
                }}
              >
                {isDone ? "✓" : num}
              </div>
              <div
                style={{
                  ...si.label,
                  color: isActive || isDone ? "#fcfcfd" : "#71717a",
                }}
              >
                {label}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

const si = {
  wrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    marginBottom: 36,
    flexWrap: "wrap",
  },
  line: {
    flex: 1,
    height: 2,
    minWidth: 32,
    maxWidth: 80,
    borderRadius: 2,
    transition: "background 0.4s",
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.85rem",
    background: "#1a1a1f",
    border: "2px solid #26262b",
    color: "#71717a",
    transition: "all 0.3s",
    margin: "0 auto 6px",
  },
  circleActive: {
    border: "2px solid #c5a880",
    color: "#c5a880",
    boxShadow: "0 0 16px rgba(197,168,128,0.35)",
  },
  circleDone: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "2px solid transparent",
    color: "#0e0e0e",
  },
  label: {
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
};

/* ════════════════════════════════════════════════════════════════
   MAIN BOOKING PAGE
   ════════════════════════════════════════════════════════════════ */

export default function BookingPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [initialStep, setInitialStep] = useState(1);
  const [sourcePage, setSourcePage] = useState(() => {
    return sessionStorage.getItem("aura_booking_from") || null;
  });

  // Responsive & Map States
  const [viewMode, setViewMode] = useState("list");
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 900);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [selectedRating, setSelectedRating] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Data
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);

  // Fetch favorites on mount
  useEffect(() => {
    if (token) {
      fetchUserFavorites();
    }
  }, [token]);

  async function fetchUserFavorites() {
    try {
      const res = await fetch(`${API}/api/salons/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(data.map((s) => s.id));
      }
    } catch {
      /* ignore */
    }
  }

  async function handleToggleFavorite(e, salonId) {
    e.stopPropagation(); // Stop click propagation to card selection
    try {
      const res = await fetch(`${API}/api/salons/${salonId}/favorite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_favorite) {
          setFavoriteIds((prev) => [...prev, salonId]);
        } else {
          setFavoriteIds((prev) => prev.filter((id) => id !== salonId));
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Selections
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerName, setCustomerName] = useState(user?.full_name || "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Handle pre-selection from concierge or redirect
  useEffect(() => {
    if (location.state?.from) {
      setSourcePage(location.state.from);
      sessionStorage.setItem("aura_booking_from", location.state.from);
    }

    if (location.state?.salon) {
      setSelectedSalon(location.state.salon);
      if (location.state.service) {
        setSelectedService(location.state.service);
        setStep(3); // Go straight to Date & Time selection
        setInitialStep(3);
      } else {
        setStep(2); // Go to service selection
        setInitialStep(2);
      }

      // Pre-fill notes if there is AI recommendation context
      if (location.state.isAIRecommendations || location.state.faceShape || location.state.hairstyleName || location.state.styleName) {
        let notesParts = [];
        if (location.state.hairstyleName || location.state.styleName) {
          notesParts.push(`Style choice: ${location.state.hairstyleName || location.state.styleName}`);
        }
        if (location.state.faceShape) {
          notesParts.push(`Face Shape: ${location.state.faceShape}`);
        }
        if (location.state.occasion) {
          notesParts.push(`Occasion: ${location.state.occasion}`);
        }
        if (location.state.hairType) {
          notesParts.push(`Hair Type: ${location.state.hairType}`);
        }
        setNotes(`✨ Personal styling pre-loaded:\n${notesParts.join("\n")}`);
      }
    } else {
      setStep(1);
      setInitialStep(1);
    }
  }, [location.state]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Extract unique neighborhoods from salons
  const neighborhoods = ["All", ...new Set(salons.map((s) => s.area))].sort();

  // Filter and sort logic
  const filteredSalons = salons.filter((s) => {
    const nameMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const addressMatch = s.address.toLowerCase().includes(searchQuery.toLowerCase());
    const areaMatch = s.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = searchQuery === "" || nameMatch || addressMatch || areaMatch;
    
    const matchesNeighborhood = selectedNeighborhood === "All" || s.area === selectedNeighborhood;
    
    const matchesPrice = selectedPrice === "All" || s.price_range === selectedPrice;
    
    let matchesRating = true;
    if (selectedRating === "4.5+") {
      matchesRating = s.rating >= 4.5;
    } else if (selectedRating === "4.8+") {
      matchesRating = s.rating >= 4.8;
    }
    
    return matchesSearch && matchesNeighborhood && matchesPrice && matchesRating;
  });

  const sortedSalons = [...filteredSalons].sort((a, b) => {
    if (sortBy === "rating") {
      return b.rating - a.rating;
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  // Get active map salons (max 40 items + selectedSalon if any)
  const getMapSalons = () => {
    const mapSalons = sortedSalons.slice(0, 40);
    if (selectedSalon && !mapSalons.some(s => s.id === selectedSalon.id)) {
      const fullSelected = salons.find(s => s.id === selectedSalon.id);
      if (fullSelected) {
        mapSalons.push(fullSelected);
      }
    }
    return mapSalons;
  };

  // ── Fetch salons on mount ───────────────────────────────────
  useEffect(() => {
    fetchSalons();
  }, []);

  async function fetchSalons() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/salons`);
      if (res.ok) {
        const data = await res.json();
        setSalons(data);
        if (location.state?.salon) {
          const matched = data.find((s) => s.id === location.state.salon.id);
          if (matched) setSelectedSalon(matched);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  // ── Fetch services when salon changes ───────────────────────
  useEffect(() => {
    if (selectedSalon) fetchServices(selectedSalon.id);
  }, [selectedSalon]);

  async function fetchServices(salonId) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/salons/${salonId}/services`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
        if (location.state?.service) {
          const matched = data.find(
            (s) => s.id === location.state.service.id || s.service_name.toLowerCase() === location.state.service.service_name?.toLowerCase()
          );
          if (matched) setSelectedService(matched);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  // ── Fetch slots when date changes ───────────────────────────
  useEffect(() => {
    if (selectedSalon && selectedDate) fetchSlots();
  }, [selectedSalon, selectedDate]);

  async function fetchSlots() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/bookings/available-slots?salon_id=${selectedSalon.id}&date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  // ── Submit booking ──────────────────────────────────────────
  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          salon_id: selectedSalon.id,
          service_id: selectedService.id,
          booking_date: selectedDate,
          time_slot: selectedSlot,
          customer_name: customerName,
          customer_phone: customerPhone,
          notes: notes || null,
        }),
      });
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        logout();
        navigate("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create booking.");
      }
      navigate("/bookings");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Navigation guards ──────────────────────────────────────
  function canGoNext() {
    if (step === 1) return !!selectedSalon;
    if (step === 2) return !!selectedService;
    if (step === 3) return !!selectedDate && !!selectedSlot;
    if (step === 4) return customerName.trim().length > 0 && customerPhone.trim().length >= 6;
    return false;
  }

  function goNext() {
    if (step === 4) {
      handleSubmit();
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }
  function goBack() {
    setError("");
    if (step === initialStep && sourcePage) {
      sessionStorage.removeItem("aura_booking_from");
      navigate(sourcePage);
    } else if (step > 1) {
      setStep((s) => s - 1);
    } else if (sourcePage) {
      sessionStorage.removeItem("aura_booking_from");
      navigate(sourcePage);
    } else {
      navigate("/dashboard");
    }
  }

  // ── Calendar helpers ───────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  function getDaysInMonth(m, y) {
    return new Date(y, m + 1, 0).getDate();
  }
  function getFirstDayOfMonth(m, y) {
    return new Date(y, m, 1).getDay();
  }

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  }

  function handleDateClick(day) {
    const m = String(calendarMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const dateStr = `${calendarYear}-${m}-${d}`;
    if (dateStr < todayStr) return;
    setSelectedSlot("");
    setSelectedDate(dateStr);
  }

  /* ── Format helpers ─────────────────────────────────────── */
  function formatPrice(p) {
    return "₹" + Number(p).toLocaleString("en-IN");
  }
  function formatDate(ds) {
    if (!ds) return "";
    const d = new Date(ds + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */

  return (
    <div style={{ ...pg.page, paddingBottom: isMobileOrTablet ? "160px" : "100px" }}>
      <Navbar />
      <div style={pg.container}>
        {/* Header */}
        <div style={pg.headerRow}>
          <div>
            <div style={pg.brandRow}>
              <span style={pg.brand}>AURA</span>
              <span style={pg.badge}>Elite</span>
            </div>
            <h1 style={pg.heading}>Reserve Your Experience</h1>
            <p style={pg.sub}>
              Select your salon, service, and preferred time to book a luxury appointment.
            </p>
          </div>
          <button onClick={() => navigate("/bookings")} style={pg.histBtn}>
            My Bookings →
          </button>
        </div>

        {/* AI personalization banner */}
        {(location.state?.isAIRecommendations || location.state?.faceShape || location.state?.styleName) && (
          <div style={pg.aiBanner}>
            <span style={pg.aiBannerSparkle}>✨</span> Personalized Lookbook Pre-loaded. Salon, service, and custom styling notes configured by Aura AI.
          </div>
        )}

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Error */}
        {error && (
          <div style={pg.errBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* ─── STEP 1: SELECT SALON ─────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={pg.stepTitle}>Choose Your Salon</h2>

            {/* Filter Bar */}
            <div style={pg.filterBar}>
              <div style={pg.searchWrap}>
                <input
                  type="text"
                  placeholder="Search salons by name or area..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(12);
                  }}
                  style={pg.searchInput}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    style={pg.clearSearchBtn}
                  >
                    ×
                  </button>
                )}
              </div>
              <div style={pg.filterControls}>
                <div style={pg.filterGroup}>
                  <label style={pg.filterLabel}>Area</label>
                  <select
                    value={selectedNeighborhood}
                    onChange={(e) => {
                      setSelectedNeighborhood(e.target.value);
                      setVisibleCount(12);
                    }}
                    style={pg.selectInput}
                  >
                    {neighborhoods.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={pg.filterGroup}>
                  <label style={pg.filterLabel}>Price</label>
                  <select
                    value={selectedPrice}
                    onChange={(e) => {
                      setSelectedPrice(e.target.value);
                      setVisibleCount(12);
                    }}
                    style={pg.selectInput}
                  >
                    <option value="All">All Prices</option>
                    <option value="₹">₹ (Budget)</option>
                    <option value="₹₹">₹₹ (Standard)</option>
                    <option value="₹₹₹">₹₹₹ (Premium)</option>
                    <option value="₹₹₹₹">₹₹₹₹ (Luxury)</option>
                  </select>
                </div>

                <div style={pg.filterGroup}>
                  <label style={pg.filterLabel}>Rating</label>
                  <select
                    value={selectedRating}
                    onChange={(e) => {
                      setSelectedRating(e.target.value);
                      setVisibleCount(12);
                    }}
                    style={pg.selectInput}
                  >
                    <option value="All">All Ratings</option>
                    <option value="4.5+">★ 4.5 & up</option>
                    <option value="4.8+">★ 4.8 & up</option>
                  </select>
                </div>

                <div style={pg.filterGroup}>
                  <label style={pg.filterLabel}>Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={pg.selectInput}
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile / Tablet Toggle Bar */}
            {isMobileOrTablet && (
              <div style={pg.viewToggleBar}>
                <button
                  onClick={() => setViewMode("list")}
                  style={{
                    ...pg.viewToggleBtn,
                    ...(viewMode === "list" ? pg.viewToggleBtnActive : {}),
                  }}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  style={{
                    ...pg.viewToggleBtn,
                    ...(viewMode === "map" ? pg.viewToggleBtnActive : {}),
                  }}
                >
                  Map View
                </button>
              </div>
            )}

            {loading ? (
              <p style={pg.loadingText}>Loading salons…</p>
            ) : (
              <div style={isMobileOrTablet ? pg.mobileStep1Layout : pg.desktopStep1Layout}>
                {/* Salon List */}
                {(!isMobileOrTablet || viewMode === "list") && (
                  <div style={isMobileOrTablet ? {} : pg.leftListPanel}>
                    {sortedSalons.length > 0 ? (
                      <>
                        <div style={pg.salonGrid}>
                          {sortedSalons.slice(0, visibleCount).map((s) => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setSelectedSalon(s);
                                setSelectedService(null);
                                setSelectedDate("");
                                setSelectedSlot("");
                              }}
                              style={{
                                ...pg.salonCard,
                                ...(selectedSalon?.id === s.id ? pg.salonCardActive : {}),
                              }}
                            >
                              <div style={pg.salonImgWrap}>
                                <img src={s.image_url} alt={s.name} style={pg.salonImg} />
                                <div style={pg.salonPrice}>{s.price_range}</div>
                                <button
                                  onClick={(e) => handleToggleFavorite(e, s.id)}
                                  style={{
                                    position: "absolute",
                                    top: 40,
                                    right: 10,
                                    background: "rgba(0,0,0,0.65)",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: 28,
                                    height: 28,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    color: favoriteIds.includes(s.id) ? "#f87171" : "#a1a1aa",
                                    fontSize: "1.05rem",
                                    transition: "all 0.2s",
                                    zIndex: 5,
                                  }}
                                >
                                  ♥
                                </button>
                              </div>
                              <div style={pg.salonInfo}>
                                <h3 style={pg.salonName}>{s.name}</h3>
                                <div style={pg.salonMeta}>
                                  <span>📍 {s.area}</span>
                                  <span>⭐ {s.rating}</span>
                                </div>
                                <p style={pg.salonDesc}>
                                  {s.description?.slice(0, 100)}
                                  {s.description?.length > 100 ? "…" : ""}
                                </p>
                                {selectedSalon?.id === s.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goNext();
                                    }}
                                    style={{
                                      background: "linear-gradient(135deg,#8a704c,#c5a880)",
                                      border: "none",
                                      borderRadius: "6px",
                                      color: "#0e0e0e",
                                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                                      fontWeight: 700,
                                      fontSize: "0.8rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      padding: "8px 16px",
                                      marginTop: "12px",
                                      width: "100%",
                                      cursor: "pointer",
                                      boxShadow: "0 2px 8px rgba(197,168,128,0.25)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "4px"
                                    }}
                                  >
                                    Select & Continue →
                                  </button>
                                )}
                              </div>
                              {selectedSalon?.id === s.id && (
                                <div style={pg.checkMark}>✓</div>
                              )}
                            </div>
                          ))}
                        </div>
                        {sortedSalons.length > visibleCount && (
                          <div style={pg.loadMoreWrap}>
                            <button
                              onClick={() => setVisibleCount((prev) => prev + 12)}
                              style={pg.loadMoreBtn}
                            >
                              Load More Salons ({sortedSalons.length - visibleCount} remaining)
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={pg.noResults}>
                        <p style={pg.noResultsText}>No salons match your filters.</p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedNeighborhood("All");
                            setSelectedPrice("All");
                            setSelectedRating("All");
                            setSortBy("rating");
                          }}
                          style={pg.resetFiltersBtn}
                        >
                          Reset Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Map Panel */}
                {(!isMobileOrTablet || viewMode === "map") && (
                  <div style={isMobileOrTablet ? pg.mobileMapPanel : pg.rightMapPanel}>
                    <SalonMap
                      salons={getMapSalons()}
                      selectedSalon={selectedSalon}
                      onSelectSalon={(s) => {
                        setSelectedSalon(s);
                        setSelectedService(null);
                        setSelectedDate("");
                        setSelectedSlot("");
                      }}
                      onConfirmSalon={goNext}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: SELECT SERVICE ───────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={pg.stepTitle}>
              Select a Service at{" "}
              <span style={{ color: "#c5a880" }}>{selectedSalon?.name}</span>
            </h2>
            {loading ? (
              <p style={pg.loadingText}>Loading services…</p>
            ) : (
              <div style={pg.serviceList}>
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    onClick={() => setSelectedService(svc)}
                    style={{
                      ...pg.serviceCard,
                      ...(selectedService?.id === svc.id ? pg.serviceCardActive : {}),
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={pg.svcCategory}>{svc.category}</div>
                      <h3 style={pg.svcName}>{svc.service_name}</h3>
                      <p style={pg.svcDesc}>{svc.description}</p>
                    </div>
                    <div style={pg.svcRight}>
                      <div style={pg.svcPrice}>{formatPrice(svc.price)}</div>
                      <div style={pg.svcDuration}>{svc.duration_minutes} min</div>
                    </div>
                    {selectedService?.id === svc.id && (
                      <div style={{ ...pg.checkMark, top: 12, right: 12 }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: DATE & TIME ──────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 style={pg.stepTitle}>Pick Date & Time</h2>
            <div style={{
              ...pg.dtGrid,
              gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr"
            }}>
              {/* Calendar */}
              <div style={pg.calendarCard}>
                <div style={pg.calHeader}>
                  <button onClick={prevMonth} style={pg.calNav}>‹</button>
                  <span style={pg.calMonth}>
                    {monthNames[calendarMonth]} {calendarYear}
                  </span>
                  <button onClick={nextMonth} style={pg.calNav}>›</button>
                </div>
                <div style={pg.calDayNames}>
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                    <div key={d} style={pg.calDayName}>{d}</div>
                  ))}
                </div>
                <div style={pg.calDays}>
                  {Array.from({ length: getFirstDayOfMonth(calendarMonth, calendarYear) }).map((_, i) => (
                    <div key={`e${i}`} />
                  ))}
                  {Array.from({ length: getDaysInMonth(calendarMonth, calendarYear) }).map((_, i) => {
                    const day = i + 1;
                    const m = String(calendarMonth + 1).padStart(2, "0");
                    const d = String(day).padStart(2, "0");
                    const ds = `${calendarYear}-${m}-${d}`;
                    const isPast = ds < todayStr;
                    const isSelected = ds === selectedDate;
                    const isToday = ds === todayStr;
                    return (
                      <button
                        key={day}
                        disabled={isPast}
                        onClick={() => handleDateClick(day)}
                        style={{
                          ...pg.calDay,
                          ...(isPast ? pg.calDayDisabled : {}),
                          ...(isSelected ? pg.calDaySelected : {}),
                          ...(isToday && !isSelected ? pg.calDayToday : {}),
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div style={pg.slotsCard}>
                <h3 style={pg.slotsTitle}>
                  {selectedDate
                    ? `Available Slots — ${formatDate(selectedDate)}`
                    : "Select a date first"}
                </h3>
                {loading ? (
                  <p style={pg.loadingText}>Checking availability…</p>
                ) : selectedDate ? (
                  <div style={pg.slotsGrid}>
                    {slots.map((s) => (
                      <button
                        key={s.slot}
                        disabled={!s.available}
                        onClick={() => setSelectedSlot(s.slot)}
                        style={{
                          ...pg.slotBtn,
                          ...(s.available ? {} : pg.slotBtnDisabled),
                          ...(selectedSlot === s.slot ? pg.slotBtnActive : {}),
                        }}
                      >
                        {s.slot.replace(" - ", "\n→ ")}
                        {!s.available && (
                          <span style={pg.slotBooked}>Booked</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#71717a", textAlign: "center", padding: 40 }}>
                    Please pick a date from the calendar.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 4: CONFIRM ──────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 style={pg.stepTitle}>Confirm Your Booking</h2>

            {/* Summary Card */}
            <div style={pg.summaryCard}>
              <div style={pg.summRow}>
                <span style={pg.summLabel}>Salon</span>
                <span style={pg.summValue}>{selectedSalon?.name}</span>
              </div>
              <div style={pg.summRow}>
                <span style={pg.summLabel}>Location</span>
                <span style={pg.summValue}>{selectedSalon?.area}</span>
              </div>
              <div style={pg.summDivider} />
              <div style={pg.summRow}>
                <span style={pg.summLabel}>Service</span>
                <span style={pg.summValue}>{selectedService?.service_name}</span>
              </div>
              <div style={pg.summRow}>
                <span style={pg.summLabel}>Duration</span>
                <span style={pg.summValue}>{selectedService?.duration_minutes} minutes</span>
              </div>
              <div style={pg.summDivider} />
              <div style={pg.summRow}>
                <span style={pg.summLabel}>Date</span>
                <span style={{ ...pg.summValue, color: "#c5a880" }}>
                  {formatDate(selectedDate)}
                </span>
              </div>
              <div style={pg.summRow}>
                <span style={pg.summLabel}>Time Slot</span>
                <span style={{ ...pg.summValue, color: "#c5a880" }}>
                  {selectedSlot}
                </span>
              </div>
              <div style={pg.summDivider} />
              <div style={pg.summRow}>
                <span style={{ ...pg.summLabel, fontWeight: 700, color: "#fcfcfd" }}>Total Cost</span>
                <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "#c5a880" }}>
                  {formatPrice(selectedService?.price)}
                </span>
              </div>
            </div>

            {/* Contact Form */}
            <div style={{
              ...pg.contactGrid,
              gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr"
            }}>
              <div>
                <label style={pg.fieldLabel}>Your Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full Name"
                  style={pg.input}
                />
              </div>
              <div>
                <label style={pg.fieldLabel}>Phone Number</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={pg.input}
                />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={pg.fieldLabel}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests…"
                rows={3}
                style={{ ...pg.input, resize: "vertical" }}
              />
            </div>
          </div>
        )}

        {/* ─── FOOTER NAV BUTTONS ───────────────────────────── */}
        <div style={{
          ...pg.footerRow,
          bottom: isMobileOrTablet ? "64px" : "0px",
          padding: isMobileOrTablet ? "12px 16px" : "16px 40px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {(step > 1 || !!sourcePage) ? (
              <button onClick={goBack} style={pg.backBtn}>
                ← Back
              </button>
            ) : (
              <div />
            )}
            
            {/* Summary details helper */}
            {!isMobileOrTablet && (
              <div style={{ fontSize: "0.85rem", color: "#a1a1aa" }}>
                {step === 1 && selectedSalon && (
                  <span>
                    Selected Salon: <strong style={{ color: "#c5a880" }}>{selectedSalon.name}</strong>
                  </span>
                )}
                {step === 2 && selectedService && (
                  <span>
                    Selected Service: <strong style={{ color: "#c5a880" }}>{selectedService.service_name}</strong> ({formatPrice(selectedService.price)})
                  </span>
                )}
                {step === 3 && selectedDate && selectedSlot && (
                  <span>
                    Schedule: <strong style={{ color: "#c5a880" }}>{formatDate(selectedDate)}</strong> at <strong style={{ color: "#c5a880" }}>{selectedSlot}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={goNext}
            disabled={!canGoNext() || submitting}
            style={{
              ...pg.nextBtn,
              opacity: canGoNext() && !submitting ? 1 : 0.45,
              cursor: canGoNext() && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {step === 4
              ? submitting
                ? "Booking…"
                : "Confirm Booking ✓"
              : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES (luxury dark theme — matching Aura)
   ═══════════════════════════════════════════════════════════════ */

const pg = {
  page: {
    minHeight: "100vh",
    background: "#08080a",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#fcfcfd",
    padding: "24px",
    paddingBottom: "100px",
    boxSizing: "border-box",
  },
  aiBanner: {
    background: "linear-gradient(135deg, rgba(197, 168, 128, 0.12) 0%, rgba(138, 112, 76, 0.04) 100%)",
    border: "1px solid #c5a880",
    borderRadius: 8,
    padding: "16px 20px",
    color: "#fcfcfd",
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: 28,
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 0 20px rgba(197, 168, 128, 0.15)",
    animation: "pulse 2s infinite",
  },
  aiBannerSparkle: {
    fontSize: "1.2rem",
    color: "#c5a880",
  },
  container: {
    maxWidth: 960,
    margin: "0 auto",
    paddingTop: 20,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
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
    fontSize: "1.6rem",
    fontWeight: 500,
    margin: 0,
    marginBottom: 4,
  },
  sub: {
    fontSize: "0.88rem",
    color: "#a1a1aa",
    margin: 0,
  },
  histBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#c5a880",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.85rem",
    padding: "10px 18px",
    cursor: "pointer",
    transition: "all 0.3s",
    whiteSpace: "nowrap",
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
  stepTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.25rem",
    fontWeight: 500,
    marginBottom: 20,
  },
  loadingText: {
    color: "#71717a",
    textAlign: "center",
    padding: 40,
  },

  /* ── Search & Filter Styles ──────────────────────────────── */
  filterBar: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  searchWrap: {
    position: "relative",
    width: "100%",
  },
  searchInput: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 6,
    padding: "12px 40px 12px 16px",
    color: "#fcfcfd",
    fontSize: "0.92rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.3s",
  },
  clearSearchBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#71717a",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  },
  filterControls: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12,
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  filterLabel: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  selectInput: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 6,
    padding: "10px 12px",
    color: "#fcfcfd",
    fontSize: "0.85rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.3s",
  },
  loadMoreWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  loadMoreBtn: {
    background: "#1a1a1f",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#c5a880",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.88rem",
    padding: "12px 24px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  noResults: {
    textAlign: "center",
    padding: "40px 20px",
    background: "#121215",
    border: "1px dashed #26262b",
    borderRadius: 10,
  },
  noResultsText: {
    color: "#a1a1aa",
    fontSize: "0.95rem",
    margin: "0 0 16px 0",
  },
  resetFiltersBtn: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: 6,
    color: "#0e0e0e",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.82rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "10px 20px",
    cursor: "pointer",
  },

  /* ── Step 1: Map Layout Styles ──────────────────────────── */
  desktopStep1Layout: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "24px",
    alignItems: "start",
  },
  mobileStep1Layout: {
    display: "block",
  },
  leftListPanel: {},
  rightMapPanel: {
    position: "sticky",
    top: "24px",
    height: "550px",
  },
  mobileMapPanel: {
    height: "400px",
    marginTop: "12px",
  },
  viewToggleBar: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    borderBottom: "1px solid #26262b",
    paddingBottom: "12px",
  },
  viewToggleBtn: {
    flex: 1,
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: "6px",
    color: "#a1a1aa",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.85rem",
    padding: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  viewToggleBtnActive: {
    background: "rgba(197,168,128,0.12)",
    border: "1px solid #c5a880",
    color: "#c5a880",
  },

  /* ── Step 1: Salon Grid ─────────────────────────────────── */
  salonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  salonCard: {
    position: "relative",
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    overflow: "hidden",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  salonCardActive: {
    border: "1px solid #c5a880",
    boxShadow: "0 0 24px rgba(197,168,128,0.18)",
  },
  salonImgWrap: {
    position: "relative",
    height: 160,
    overflow: "hidden",
  },
  salonImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.4s",
  },
  salonPrice: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(6px)",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: "0.75rem",
    color: "#c5a880",
    fontWeight: 600,
  },
  salonInfo: {
    padding: "14px 16px 16px",
  },
  salonName: {
    fontSize: "1rem",
    fontWeight: 600,
    margin: 0,
    marginBottom: 6,
  },
  salonMeta: {
    display: "flex",
    gap: 14,
    fontSize: "0.78rem",
    color: "#a1a1aa",
    marginBottom: 8,
  },
  salonDesc: {
    fontSize: "0.8rem",
    color: "#71717a",
    lineHeight: 1.5,
    margin: 0,
  },
  checkMark: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0e0e0e",
    fontWeight: 700,
    fontSize: "0.8rem",
  },

  /* ── Step 2: Service List ───────────────────────────────── */
  serviceList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  serviceCard: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: "16px 20px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  serviceCardActive: {
    border: "1px solid #c5a880",
    boxShadow: "0 0 20px rgba(197,168,128,0.15)",
  },
  svcCategory: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#c5a880",
    marginBottom: 4,
  },
  svcName: {
    fontSize: "0.95rem",
    fontWeight: 600,
    margin: 0,
    marginBottom: 4,
  },
  svcDesc: {
    fontSize: "0.8rem",
    color: "#71717a",
    margin: 0,
    lineHeight: 1.4,
  },
  svcRight: {
    textAlign: "right",
    flexShrink: 0,
  },
  svcPrice: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#c5a880",
    marginBottom: 4,
  },
  svcDuration: {
    fontSize: "0.75rem",
    color: "#71717a",
  },

  /* ── Step 3: Date & Time ────────────────────────────────── */
  dtGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  calendarCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: 20,
  },
  calHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calNav: {
    background: "none",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#a1a1aa",
    fontSize: "1.1rem",
    width: 32,
    height: 32,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  calMonth: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  calDayNames: {
    display: "grid",
    gridTemplateColumns: "repeat(7,1fr)",
    gap: 4,
    marginBottom: 6,
  },
  calDayName: {
    textAlign: "center",
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#71717a",
    textTransform: "uppercase",
    padding: "4px 0",
  },
  calDays: {
    display: "grid",
    gridTemplateColumns: "repeat(7,1fr)",
    gap: 4,
  },
  calDay: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 6,
    color: "#fcfcfd",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "0.85rem",
    fontWeight: 500,
    padding: "8px 0",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  calDayDisabled: {
    color: "#3a3a3f",
    cursor: "not-allowed",
  },
  calDaySelected: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    color: "#0e0e0e",
    fontWeight: 700,
  },
  calDayToday: {
    border: "1px solid #c5a880",
    color: "#c5a880",
  },
  slotsCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: 20,
  },
  slotsTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: 16,
    color: "#a1a1aa",
  },
  slotsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 10,
  },
  slotBtn: {
    background: "#1a1a1f",
    border: "1px solid #26262b",
    borderRadius: 8,
    color: "#fcfcfd",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "0.8rem",
    fontWeight: 500,
    padding: "12px 10px",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "pre-line",
    textAlign: "center",
    position: "relative",
  },
  slotBtnDisabled: {
    color: "#3a3a3f",
    background: "#0e0e10",
    cursor: "not-allowed",
    border: "1px solid #1a1a1f",
  },
  slotBtnActive: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    color: "#0e0e0e",
    fontWeight: 700,
    border: "1px solid transparent",
  },
  slotBooked: {
    display: "block",
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginTop: 4,
    opacity: 0.7,
  },

  /* ── Step 4: Confirm ────────────────────────────────────── */
  summaryCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 10,
    padding: "24px",
    marginBottom: 20,
  },
  summRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summLabel: {
    color: "#71717a",
    fontSize: "0.88rem",
  },
  summValue: {
    fontWeight: 600,
    fontSize: "0.92rem",
    textAlign: "right",
  },
  summDivider: {
    borderTop: "1px solid #26262b",
    margin: "12px 0",
  },
  contactGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  fieldLabel: {
    display: "block",
    fontSize: "0.78rem",
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
    padding: "12px 16px",
    color: "#fcfcfd",
    fontSize: "0.92rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.3s",
  },

  /* ── Footer ─────────────────────────────────────────────── */
  footerRow: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(12, 12, 15, 0.85)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderTop: "1px solid #26262b",
    padding: "16px 40px",
    zIndex: 999,
    boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
    boxSizing: "border-box",
  },
  backBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#a1a1aa",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.88rem",
    padding: "12px 24px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  nextBtn: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: 6,
    color: "#0e0e0e",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.92rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "14px 32px",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 4px 14px rgba(197,168,128,0.25)",
  },

  /* ── @media (max-width: 700px) — handled via minmax grids ─ */
};
