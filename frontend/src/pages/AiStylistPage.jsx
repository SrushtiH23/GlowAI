/**
 * AiStylistPage.jsx — ✨ Aura AI Stylist
 * Multimodal AI Beauty & Grooming Assistant with Chat History Sidebar
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "https://glowai-kamv.onrender.com";

export default function AiStylistPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // DB Database States
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);

  // UI States
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 900);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Chat Sessions State (Persisted in localStorage)
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("aura_stylist_sessions");
    return saved ? JSON.parse(saved) : [];
  });

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    const saved = sessionStorage.getItem("aura_stylist_current_session_id");
    return saved || null;
  });

  // Calculate current messages from the active session
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];

  // Guarantee there is always at least one session on mount
  useEffect(() => {
    if (sessions.length === 0) {
      const newSession = {
        id: Date.now().toString(),
        title: "New Styling Chat",
        timestamp: new Date().toISOString(),
        messages: [],
      };
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      sessionStorage.setItem("aura_stylist_current_session_id", newSession.id);
      localStorage.setItem("aura_stylist_sessions", JSON.stringify([newSession]));
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
      sessionStorage.setItem("aura_stylist_current_session_id", sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleResize = () => setIsMobileOrTablet(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchSalonsAndServices();
    scrollToBottom();
  }, []);

  async function fetchSalonsAndServices() {
    try {
      const sRes = await fetch(`${API}/api/salons`);
      if (sRes.ok) {
        const salonsList = await sRes.json();
        setSalons(salonsList);

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
    } catch (e) {
      console.error("Error loading salons for booking mapper:", e);
    }
  }

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload a valid image file.");
        return;
      }
      setError("");
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        setError("Please drop a valid image file.");
        return;
      }
      setError("");
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePromptChipClick = (promptText) => {
    setQuery(promptText);
  };

  // Helper to add/append message to the active session and save
  const addMessageToActiveSession = (newMsg) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === currentSessionId) {
          const updatedMessages = [...s.messages, newMsg];
          // Update title if it was default and user has sent messages
          let title = s.title;
          if (s.title === "New Styling Chat" || s.title === "") {
            const firstUserMsg = updatedMessages.find((m) => m.sender === "user");
            if (firstUserMsg) {
              title =
                firstUserMsg.text.length > 25
                  ? firstUserMsg.text.slice(0, 25) + "..."
                  : firstUserMsg.text;
            }
          }
          return { ...s, title, messages: updatedMessages };
        }
        return s;
      });
      localStorage.setItem("aura_stylist_sessions", JSON.stringify(updated));
      return updated;
    });
  };

  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: "New Styling Chat",
      timestamp: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => {
      const updated = [newSession, ...prev];
      localStorage.setItem("aura_stylist_sessions", JSON.stringify(updated));
      return updated;
    });
    setCurrentSessionId(newSession.id);
    sessionStorage.setItem("aura_stylist_current_session_id", newSession.id);
  };

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    localStorage.setItem("aura_stylist_sessions", JSON.stringify(updated));

    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
        sessionStorage.setItem("aura_stylist_current_session_id", updated[0].id);
      } else {
        setCurrentSessionId(null);
        sessionStorage.removeItem("aura_stylist_current_session_id");
      }
    }
  };

  const handleClearChat = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
      return;
    }

    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === currentSessionId) {
          return { ...s, title: "New Styling Chat", messages: [] };
        }
        return s;
      });
      localStorage.setItem("aura_stylist_sessions", JSON.stringify(updated));
      return updated;
    });
    setShowClearConfirm(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() && !selectedFile) {
      return;
    }

    const userText = query.trim();
    const userImg = previewUrl;

    // 1. Append user message to log
    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: userText || "Uploaded an image for analysis",
      image: userImg,
    };
    addMessageToActiveSession(userMsg);

    setQuery("");
    clearFile();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      formData.append("query", userText);

      const res = await fetch(`${API}/api/concierge/stylist`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Assistant service offline. Please try again.");
      }

      const data = await res.json();

      // 2. Append stylist response
      const stylistMsg = {
        id: (Date.now() + 1).toString(),
        sender: "stylist",
        data: data,
      };
      addMessageToActiveSession(stylistMsg);
    } catch (err) {
      setError(err.message);
      const errMsg = {
        id: (Date.now() + 1).toString(),
        sender: "stylist",
        error: err.message,
      };
      addMessageToActiveSession(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBookService = (recService, category, observations) => {
    let targetSalon = salons.find((s) => s.id === recService.salon_id);
    if (!targetSalon) {
      targetSalon = {
        id: recService.salon_id,
        name: recService.salon_name || "Selected Salon",
        area: "Bangalore",
      };
    }

    let targetService = services.find((s) => s.id === recService.service_id);
    if (!targetService) {
      targetService = {
        id: recService.service_id || 99999,
        salon_id: recService.salon_id,
        service_name: recService.name,
        price: recService.estimated_cost,
        duration_minutes: 45,
      };
    }

    const noteParts = [
      `AI Stylist Category: ${category}`,
      `Observed profile: ${observations.join(", ")}`,
      `Service: ${recService.name}`,
      `Why it helps: ${recService.why_helps}`,
    ];

    navigate("/book", {
      state: {
        salon: targetSalon,
        service: targetService,
        hairstyleName: recService.name,
        occasion: `Aura AI Stylist Consultation (${category})`,
        isAIRecommendations: true,
        notes: `✨ AI Consultation Details:\n${noteParts.join("\n")}`,
        from: "/stylist",
      },
    });
  };

  const suggestionChips = [
    { label: "Analyze My Hair 💇‍♂️", prompt: "Analyze my hair condition and recommend a suitable salon treatment." },
    { label: "Recommend Facial 💆‍♀️", prompt: "Recommend a luxury facial treatment for uneven skin tone and dullness." },
    { label: "Treatment for Frizz 🌀", prompt: "My hair is extremely dry and frizzy. What professional treatments will help?" },
    { label: "Nail Style Suggestions 💅", prompt: "Suggest trendy luxury nail extensions and shaping options." },
    { label: "Elite Salons 📍", prompt: "Which salons are recommended for bridal makeup in Bangalore?" },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes dotFlashing {
          0% { background-color: #c5a880; }
          50%, 100% { background-color: rgba(197, 168, 128, 0.2); }
        }
      `}</style>
      <Navbar />

      {/* Mobile Drawer Overlay */}
      {isMobileOrTablet && mobileDrawerOpen && (
        <div style={styles.drawerOverlay} onClick={() => setMobileDrawerOpen(false)}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h3 style={styles.sidebarTitle}>Styling History</h3>
              <button onClick={() => setMobileDrawerOpen(false)} style={styles.drawerCloseBtn}>
                ✕
              </button>
            </div>
            <button
              onClick={() => {
                handleNewChat();
                setMobileDrawerOpen(false);
              }}
              style={styles.newChatBtn}
            >
              ➕ New Consultation
            </button>
            <div style={styles.sessionList}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setMobileDrawerOpen(false);
                  }}
                  style={{
                    ...styles.sessionItem,
                    ...(s.id === currentSessionId ? styles.sessionItemActive : {}),
                  }}
                >
                  <span style={styles.sessionTitleText}>{s.title}</span>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    style={styles.sessionDeleteBtn}
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div>
            <div style={styles.brandRow}>
              <span style={styles.brand}>AURA</span>
              <span style={styles.badge}>Elite</span>
            </div>
            <h1 style={styles.heading}>✨ Aura AI Stylist</h1>
            <p style={styles.sub}>
              Your luxury multimodal AI beauty advisor. Ask grooming questions and get instant salon recommendations.
            </p>
          </div>
          <div style={styles.headerActions}>
            {isMobileOrTablet && (
              <button onClick={() => setMobileDrawerOpen(true)} style={styles.historyToggleBtn}>
                📜 History
              </button>
            )}
            <button
              onClick={handleClearChat}
              style={{
                ...styles.clearChatBtn,
                ...(showClearConfirm ? styles.clearChatBtnConfirm : {}),
              }}
            >
              {showClearConfirm ? "Confirm Clear? ⚠️" : "Clear Chat 🗑️"}
            </button>
          </div>
        </div>

        {/* Layout: Sidebar + Chat Box */}
        <div style={isMobileOrTablet ? styles.mobileLayout : styles.desktopLayout}>
          {/* Desktop Sidebar */}
          {!isMobileOrTablet && (
            <div style={styles.sidebar}>
              <h3 style={styles.sidebarTitle}>Styling History</h3>
              <button onClick={handleNewChat} style={styles.newChatBtn}>
                ➕ New Consultation
              </button>
              <div style={styles.sessionList}>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setCurrentSessionId(s.id)}
                    style={{
                      ...styles.sessionItem,
                      ...(s.id === currentSessionId ? styles.sessionItemActive : {}),
                    }}
                  >
                    <span style={styles.sessionTitleText}>{s.title}</span>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      style={styles.sessionDeleteBtn}
                      title="Delete session"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Chat Area */}
          <div style={styles.chatArea}>
            <div style={styles.chatBox}>
              {messages.length === 0 ? (
                <div style={styles.welcomeContainer}>
                  <div style={styles.welcomeIcon}>✨</div>
                  <h2 style={styles.welcomeTitle}>Welcome to Aura AI Stylist</h2>
                  <p style={styles.welcomeDesc}>
                    Consult your personal styling director. Upload an image of your hair, skin, nails, or style inspiration, and ask any grooming questions.
                  </p>
                  <div style={styles.tipsBox}>
                    <div style={styles.tipsTitle}>💡 What you can ask:</div>
                    <ul style={styles.tipsList}>
                      <li>"My hair is extremely frizzy. What should I do?" (Upload a photo of your hair)</li>
                      <li>"What facial is suitable for my dull skin?" (Upload a face portrait)</li>
                      <li>"Nail style suggestions for a wedding reception." (Upload an inspiration photo)</li>
                      <li>"Recommend a professional beard grooming ritual."</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={styles.messageList}>
                  {messages.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div
                        key={msg.id}
                        style={{
                          ...styles.messageRow,
                          justifyContent: isUser ? "flex-end" : "flex-start",
                        }}
                      >
                        {!isUser && <div style={styles.assistantAvatar}>AI</div>}
                        <div
                          style={{
                            ...styles.bubble,
                            ...(isUser ? styles.userBubble : styles.stylistBubble),
                          }}
                        >
                          {/* User message view */}
                          {isUser && (
                            <div>
                              {msg.image && (
                                <div style={styles.bubbleImageWrap}>
                                  <img src={msg.image} alt="User upload" style={styles.bubbleImage} />
                                </div>
                              )}
                              <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                            </div>
                          )}

                          {/* Stylist error response */}
                          {!isUser && msg.error && (
                            <div style={{ color: "#f87171" }}>
                              <span style={{ fontWeight: 700 }}>Error: </span>
                              {msg.error}
                            </div>
                          )}

                          {/* Stylist structured success response */}
                          {!isUser && msg.data && (
                            <div style={styles.responseContainer}>
                              {/* Fallback Banner */}
                              {msg.data.is_mock && (
                                <div style={styles.mockBanner}>
                                  <span style={{ fontWeight: 700 }}>DEMO MODE:</span> Gemini API key not configured. Analyzing query based on high-fidelity styling patterns.
                                </div>
                              )}

                              {/* Category and observations */}
                              <div style={styles.cardHeader}>
                                <span style={styles.categoryTag}>
                                  📌 Category: {msg.data.category}
                                </span>
                                <span style={styles.salonCategoryTag}>
                                  🏛️ {msg.data.suitable_salon_category}
                                </span>
                              </div>

                              {/* Observations section */}
                              <div style={styles.sectionBlock}>
                                <div style={styles.sectionLabel}>VISUAL OBSERVATIONS</div>
                                <ul style={styles.list}>
                                  {msg.data.observations.map((obs, index) => (
                                    <li key={index} style={styles.listItem}>🔍 {obs}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Concerns section */}
                              <div style={styles.sectionBlock}>
                                <div style={styles.sectionLabel}>POTENTIAL CONCERNS</div>
                                <div style={styles.concernsGrid}>
                                  {msg.data.possible_concerns.map((con, index) => (
                                    <span key={index} style={styles.concernPill}>
                                      ✓ {con}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Recommended Services cards */}
                              <div style={styles.sectionBlock}>
                                <div style={styles.sectionLabel}>RECOMMENDED EXPERIENCES</div>
                                <div style={styles.servicesGrid}>
                                  {msg.data.recommended_services.map((svc, index) => (
                                    <div key={index} style={styles.serviceCard}>
                                      <div style={styles.svcHeader}>
                                        <h4 style={styles.svcName}>{svc.name}</h4>
                                        <span style={styles.svcCost}>₹{svc.estimated_cost.toLocaleString("en-IN")}</span>
                                      </div>
                                      <div style={styles.svcSalonName}>at {svc.salon_name}</div>
                                      <p style={styles.svcWhy}>"{svc.why_helps}"</p>
                                      <button
                                        onClick={() => handleBookService(svc, msg.data.category, msg.data.observations)}
                                        style={styles.bookNowBtn}
                                      >
                                        Book Now ✨
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Active Offers if any */}
                              {msg.data.active_offers && msg.data.active_offers.length > 0 && (
                                <div style={styles.offersBox}>
                                  <div style={styles.offersTitle}>🔥 Relevant Active Offers:</div>
                                  {msg.data.active_offers.map((off, index) => (
                                    <div key={index} style={styles.offerRow}>
                                      <span>🎁 {off.title} ({off.discount_percentage}% OFF)</span>
                                      <span style={{ color: "#c5a880", fontSize: "0.78rem" }}>at {off.salon_name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Explanation and Summary */}
                              <div style={styles.explanationBlock}>
                                <div style={styles.stylistSign}>Aura Style Director</div>
                                <p style={styles.explanationText}>"{msg.data.explanation}"</p>
                                <div style={styles.bookingRec}>
                                  <strong>Recommended Booking:</strong> {msg.data.booking_recommendation} (Estimated: ₹{msg.data.price_range_min} - ₹{msg.data.price_range_max})
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div style={styles.messageRow}>
                      <div style={styles.assistantAvatar}>AI</div>
                      <div style={styles.typingBubble}>
                        <span style={styles.typingText}>Aura Stylist is analyzing</span>
                        <div style={styles.dotFlashing}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input suggestions */}
            <div style={styles.suggestionsRow}>
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptChipClick(chip.prompt)}
                  style={styles.suggestionChip}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Upload and input form */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                ...styles.formCard,
                ...(isDragOver ? styles.formCardDragActive : {}),
              }}
            >
              {error && <div style={styles.formError}>⚠️ {error}</div>}

              {/* Thumbnail preview */}
              {previewUrl && (
                <div style={styles.previewThumbnailCard}>
                  <div style={styles.thumbnailContainer}>
                    <img src={previewUrl} alt="Thumbnail preview" style={styles.thumbnailImg} />
                    <button onClick={clearFile} style={styles.removeFileBtn} title="Remove image">
                      ✕
                    </button>
                  </div>
                  <span style={styles.thumbnailLabel}>{selectedFile?.name || "Selfie photo"}</span>
                </div>
              )}

              <div style={styles.inputContainer}>
                <button onClick={() => fileInputRef.current.click()} style={styles.iconBtn} title="Upload beauty photo">
                  📷
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: "none" }}
                />
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Aura AI Stylist about hair, skin, nails, beard or salon options..."
                  style={styles.textarea}
                  rows={1}
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={loading || (!query.trim() && !selectedFile)}
                  style={{
                    ...styles.sendBtn,
                    ...((loading || (!query.trim() && !selectedFile)) ? styles.sendBtnDisabled : {}),
                  }}
                >
                  Send
                </button>
              </div>
              <div style={styles.dragPrompt}>
                Drag & drop styling or skin photo here to include in AI analysis
              </div>
            </div>
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
    paddingBottom: "120px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    paddingTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 12,
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  brand: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.3rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: "linear-gradient(135deg,#fff 30%,#c5a880 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  badge: {
    fontSize: "0.65rem",
    fontWeight: 300,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#c5a880",
    border: "1px solid #423829",
    padding: "1px 5px",
    borderRadius: 3,
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.8rem",
    fontWeight: 550,
    margin: 0,
    marginBottom: 4,
  },
  sub: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    margin: 0,
  },
  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  historyToggleBtn: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#a1a1aa",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "8px 14px",
    cursor: "pointer",
    transition: "all 0.3s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  clearChatBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: 6,
    color: "#71717a",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "8px 14px",
    cursor: "pointer",
    transition: "all 0.3s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  clearChatBtnConfirm: {
    background: "rgba(248,113,113,0.12)",
    borderColor: "#f87171",
    color: "#f87171",
  },
  desktopLayout: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: "24px",
    alignItems: "stretch",
    marginTop: "20px",
  },
  mobileLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "16px",
  },
  sidebar: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: "12px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxHeight: "650px",
    position: "sticky",
    top: "92px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  },
  sidebarTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#c5a880",
    margin: 0,
    paddingBottom: "8px",
    borderBottom: "1px solid #26262b",
  },
  newChatBtn: {
    background: "transparent",
    border: "1px solid rgba(197,168,128,0.3)",
    borderRadius: "8px",
    color: "#c5a880",
    fontSize: "0.82rem",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: "100%",
  },
  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    overflowY: "auto",
    flex: 1,
    scrollbarWidth: "none",
  },
  sessionItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#08080a",
    border: "1px solid #26262b",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
    color: "#a1a1aa",
    fontSize: "0.82rem",
  },
  sessionItemActive: {
    background: "rgba(197, 168, 128, 0.05)",
    borderColor: "#c5a880",
    color: "#fcfcfd",
  },
  sessionTitleText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    marginRight: "8px",
  },
  sessionDeleteBtn: {
    background: "transparent",
    border: "none",
    color: "#71717a",
    cursor: "pointer",
    padding: "2px",
    fontSize: "0.82rem",
    transition: "color 0.2s",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  chatBox: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 12,
    minHeight: 450,
    maxHeight: 600,
    overflowY: "auto",
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
  },
  welcomeContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 20px",
    margin: "auto",
    maxWidth: 550,
  },
  welcomeIcon: {
    fontSize: "3rem",
    marginBottom: 16,
    animation: "pulse 2s infinite",
  },
  welcomeTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.45rem",
    fontWeight: 500,
    color: "#c5a880",
    margin: "0 0 8px 0",
  },
  welcomeDesc: {
    fontSize: "0.88rem",
    color: "#a1a1aa",
    lineHeight: 1.6,
    margin: "0 0 24px 0",
  },
  tipsBox: {
    width: "100%",
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: "16px 20px",
    textAlign: "left",
  },
  tipsTitle: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#c5a880",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tipsList: {
    margin: 0,
    paddingLeft: 16,
    fontSize: "0.82rem",
    color: "#a1a1aa",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  messageRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    maxWidth: "88%",
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    color: "#0e0e0e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 750,
    fontSize: "0.78rem",
    flexShrink: 0,
  },
  bubble: {
    borderRadius: 12,
    padding: "14px 18px",
    fontSize: "0.9rem",
    lineHeight: 1.5,
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  },
  userBubble: {
    background: "#1a1a1f",
    border: "1px solid #26262b",
    color: "#fcfcfd",
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  stylistBubble: {
    background: "#08080a",
    border: "1px solid #26262b",
    color: "#fcfcfd",
    width: "100%",
  },
  bubbleImageWrap: {
    width: "100%",
    maxWidth: 260,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
    border: "1px solid #26262b",
  },
  bubbleImage: {
    width: "100%",
    height: "auto",
    objectFit: "contain",
    display: "block",
  },
  responseContainer: {
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
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    borderBottom: "1px solid #1a1a1f",
    paddingBottom: 10,
  },
  categoryTag: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#c5a880",
    background: "rgba(197,168,128,0.08)",
    border: "1px solid rgba(197,168,128,0.2)",
    padding: "4px 10px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  salonCategoryTag: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  sectionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionLabel: {
    fontSize: "0.72rem",
    fontWeight: 750,
    color: "#71717a",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  list: {
    margin: 0,
    paddingLeft: 4,
    listStyleType: "none",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  listItem: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
  },
  concernsGrid: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  concernPill: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#facc15",
    background: "rgba(250,204,21,0.06)",
    border: "1px solid rgba(250,204,21,0.15)",
    padding: "4px 10px",
    borderRadius: 20,
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  serviceCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  svcHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  svcName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#fcfcfd",
    margin: 0,
  },
  svcCost: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#c5a880",
    flexShrink: 0,
  },
  svcSalonName: {
    fontSize: "0.75rem",
    color: "#71717a",
    marginTop: -4,
  },
  svcWhy: {
    fontSize: "0.8rem",
    color: "#a1a1aa",
    margin: "4px 0 12px 0",
    lineHeight: 1.4,
    fontStyle: "italic",
  },
  bookNowBtn: {
    marginTop: "auto",
    background: "linear-gradient(135deg, #8a704c, #c5a880)",
    border: "none",
    borderRadius: 4,
    color: "#0e0e0e",
    fontWeight: 700,
    fontSize: "0.78rem",
    padding: "8px 12px",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.3s",
    boxShadow: "0 2px 8px rgba(197,168,128,0.2)",
    width: "100%",
  },
  offersBox: {
    background: "rgba(197,168,128,0.03)",
    border: "1px dashed rgba(197,168,128,0.2)",
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  offersTitle: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#c5a880",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  offerRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.82rem",
    color: "#a1a1aa",
    flexWrap: "wrap",
    gap: 6,
  },
  explanationBlock: {
    borderTop: "1px solid #1a1a1f",
    paddingTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  stylistSign: {
    fontSize: "0.82rem",
    fontWeight: 750,
    color: "#c5a880",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  explanationText: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: 0,
    fontStyle: "italic",
  },
  bookingRec: {
    background: "#121215",
    border: "1px solid #1a1a1f",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: "0.82rem",
    color: "#a1a1aa",
  },
  typingBubble: {
    background: "#08080a",
    border: "1px solid #26262b",
    color: "#71717a",
    borderRadius: 12,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: "0.82rem",
  },
  typingText: {
    fontStyle: "italic",
  },
  dotFlashing: {
    position: "relative",
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: "#c5a880",
    animation: "dotFlashing 1s infinite alternate",
    marginLeft: 4,
  },
  suggestionsRow: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "4px 0",
    scrollbarWidth: "none",
  },
  suggestionChip: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 20,
    color: "#a1a1aa",
    padding: "8px 16px",
    fontSize: "0.78rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  formCard: {
    background: "#121215",
    border: "1px solid #26262b",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    position: "relative",
    transition: "border-color 0.3s, background 0.3s",
  },
  formCardDragActive: {
    borderColor: "#c5a880",
    background: "rgba(197,168,128,0.03)",
  },
  formError: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.2)",
    color: "#f87171",
    fontSize: "0.8rem",
    padding: "8px 12px",
    borderRadius: 6,
  },
  previewThumbnailCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: 8,
    width: "fit-content",
    maxWidth: "100%",
  },
  thumbnailContainer: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 4,
    overflow: "hidden",
    border: "1px solid #26262b",
    flexShrink: 0,
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  removeFileBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    background: "rgba(0,0,0,0.75)",
    border: "none",
    color: "#fff",
    fontSize: "0.6rem",
    width: 14,
    height: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  thumbnailLabel: {
    fontSize: "0.78rem",
    color: "#71717a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 160,
  },
  inputContainer: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  iconBtn: {
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    cursor: "pointer",
    transition: "all 0.3s",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    background: "#08080a",
    border: "1px solid #26262b",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#fcfcfd",
    fontSize: "0.88rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    resize: "none",
    boxSizing: "border-box",
    minHeight: 40,
    maxHeight: 120,
    lineHeight: 1.4,
  },
  sendBtn: {
    background: "linear-gradient(135deg,#8a704c,#c5a880)",
    border: "none",
    borderRadius: 8,
    color: "#0e0e0e",
    fontWeight: 700,
    fontSize: "0.85rem",
    padding: "10px 20px",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 2px 8px rgba(197,168,128,0.2)",
    flexShrink: 0,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  dragPrompt: {
    textAlign: "center",
    fontSize: "0.72rem",
    color: "#71717a",
  },
  drawerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.75)",
    zIndex: 2000,
    display: "flex",
    backdropFilter: "blur(4px)",
  },
  drawer: {
    background: "#121215",
    width: "280px",
    height: "100%",
    boxSizing: "border-box",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    borderRight: "1px solid #26262b",
    boxShadow: "10px 0 30px rgba(0,0,0,0.5)",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerCloseBtn: {
    background: "transparent",
    border: "none",
    color: "#71717a",
    fontSize: "1.1rem",
    cursor: "pointer",
    padding: "4px",
  },
};
