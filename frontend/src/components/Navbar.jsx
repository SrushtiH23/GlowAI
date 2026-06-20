/**
 * Navbar.jsx — Responsive Glassmorphic Navigation
 * Supports dynamic public landing navigation (with smooth scroll and active highlights)
 * and authenticated client dashboard views.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor viewport size and scroll position
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Highlight active section on scroll for homepage
      if (location.pathname === "/") {
        const sections = ["hero", "services", "offers", "gallery", "testimonials"];
        const scrollPosition = window.scrollY + 120; // Navbar offset

        for (const sec of sections) {
          const el = document.getElementById(sec);
          if (el) {
            const top = el.offsetTop;
            const height = el.offsetHeight;
            if (scrollPosition >= top && scrollPosition < top + height) {
              setActiveSection(sec);
              break;
            }
          }
        }
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);

  // Navigate helper
  const handleNavClick = (path, isAnchor = false) => {
    if (isAnchor) {
      if (location.pathname === "/") {
        const el = document.getElementById(path.replace("#", ""));
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        navigate("/" + path);
      }
    } else {
      navigate(path);
    }
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  // Nav Items Definitions
  const desktopAuthedItems = [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Offers", path: "/offers", icon: "🏷️" },
    { label: "Book", path: "/book", icon: "💇‍♂️" },
    { label: "AI Concierge", path: "/concierge", icon: "✨" },
    { label: "Face shape", path: "/face-analysis", icon: "📷" },
    { label: "AI Insights", path: "/reviews", icon: "💬" },
  ];

  if (user?.salon_id) {
    desktopAuthedItems.push({ label: "Owner Panel", path: "/owner-dashboard", icon: "💼" });
  }

  const mobileAuthedItems = [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Offers", path: "/offers", icon: "🏷️" },
    { label: "Book", path: "/book", icon: "💇‍♂️" },
    { label: "AI Concierge", path: "/concierge", icon: "✨" },
    { label: "Face shape", path: "/face-analysis", icon: "📷" },
  ];

  const guestItems = [
    { label: "Home", path: "#hero" },
    { label: "Services", path: "#services" },
    { label: "Offers", path: "#offers" },
    { label: "Gallery", path: "#gallery" },
    { label: "Reviews", path: "#testimonials" },
  ];

  // ── 1. LOGGED OUT GUEST VIEW (STICKY HEADER WITH HAMBURGER) ──────────
  if (!user) {
    return (
      <nav
        style={{
          ...styles.desktopNav,
          background: isScrolled ? "rgba(8, 8, 10, 0.9)" : "rgba(8, 8, 10, 0.4)",
          borderBottom: isScrolled ? "1px solid #1f1f23" : "1px solid transparent",
          boxShadow: isScrolled ? "0 10px 30px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <style>{`
          .nav-hover-link {
            position: relative;
            transition: color 0.3s ease;
          }
          .nav-hover-link:after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: -6px;
            left: 0;
            background-color: #c5a880;
            transition: width 0.3s ease;
          }
          .nav-hover-link:hover:after, .nav-hover-link.active-link:after {
            width: 100%;
          }
          .hamburger-icon {
            display: flex;
            flex-direction: column;
            gap: 6px;
            cursor: pointer;
            padding: 8px;
            background: transparent;
            border: none;
          }
          .hamburger-bar {
            width: 24px;
            height: 2px;
            background-color: #ffffff;
            transition: all 0.3s ease;
          }
          .hamburger-icon.open .bar-1 {
            transform: translateY(8px) rotate(45deg);
          }
          .hamburger-icon.open .bar-2 {
            opacity: 0;
          }
          .hamburger-icon.open .bar-3 {
            transform: translateY(-8px) rotate(-45deg);
          }
          .mobile-menu-overlay {
            position: fixed;
            top: 72px;
            left: 0;
            right: 0;
            background: rgba(18, 18, 21, 0.95);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid #26262b;
            display: flex;
            flex-direction: column;
            padding: 24px;
            gap: 20px;
            z-index: 999;
            transform: translateY(-150%);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .mobile-menu-overlay.open {
            transform: translateY(0);
          }
        `}</style>

        <div style={styles.navContainer}>
          {/* Brand */}
          <div style={styles.brand} onClick={() => handleNavClick("#hero", true)}>
            <span style={styles.brandText}>AURA</span>
            <span style={styles.brandBadge}>Elite</span>
          </div>

          {/* Desktop Guest Links */}
          {!isMobile && (
            <div style={styles.links}>
              {guestItems.map((item) => {
                const active = location.pathname === "/" && activeSection === item.path.replace("#", "");
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item.path, true)}
                    style={{
                      ...styles.navLink,
                      color: active ? "#c5a880" : "#a1a1aa",
                    }}
                    className={`nav-hover-link ${active ? "active-link" : ""}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Desktop Guest Sign In */}
          {!isMobile && (
            <button
              onClick={() => navigate("/login")}
              style={styles.guestLoginBtn}
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger Button */}
          {isMobile && (
            <button
              className={`hamburger-icon ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <div className="hamburger-bar bar-1"></div>
              <div className="hamburger-bar bar-2"></div>
              <div className="hamburger-bar bar-3"></div>
            </button>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobile && (
          <div className={`mobile-menu-overlay ${mobileMenuOpen ? "open" : ""}`}>
            {guestItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path, true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fcfcfd",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  textAlign: "left",
                  padding: "8px 0",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
            <div style={{ height: "1px", background: "#26262b", margin: "8px 0" }} />
            <button
              onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
              style={{
                ...styles.guestLoginBtn,
                width: "100%",
                textAlign: "center",
                padding: "12px",
              }}
            >
              Sign In
            </button>
          </div>
        )}
      </nav>
    );
  }

  // ── 2. LOGGED IN CLIENT VIEW (DESKTOP STICKY NAVBAR / MOBILE BOTTOM TAB BAR) ──
  if (isMobile) {
    return (
      <>
        {/* Mobile Header with Logo & Sign Out */}
        <div style={styles.mobileHeader}>
          <div style={styles.brand} onClick={() => navigate("/dashboard")}>
            <span style={styles.brandText}>AURA</span>
            <span style={styles.brandBadge}>Elite</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {user?.salon_id && (
              <button onClick={() => navigate("/owner-dashboard")} style={styles.mobileLogoutBtn}>
                Portal
              </button>
            )}
            <button onClick={logout} style={styles.mobileLogoutBtn} aria-label="Sign Out">
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Bottom Tab Navigation */}
        <div style={styles.mobileNav}>
          {mobileAuthedItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path)}
                style={{
                  ...styles.mobileBtn,
                  color: active ? "#c5a880" : "#71717a",
                }}
                aria-label={item.label}
              >
                <span style={styles.mobileIcon}>{item.icon}</span>
                <span style={{
                  ...styles.mobileLabel,
                  color: active ? "#c5a880" : "#71717a",
                  fontWeight: active ? "700" : "500",
                }}>{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // Desktop Authenticated Top Sticky Navbar
  return (
    <nav
      style={{
        ...styles.desktopNav,
        background: "rgba(18, 18, 21, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #26262b",
      }}
    >
      <div style={styles.navContainer}>
        {/* Brand */}
        <div style={styles.brand} onClick={() => navigate("/dashboard")}>
          <span style={styles.brandText}>AURA</span>
          <span style={styles.brandBadge}>Elite</span>
        </div>

        {/* Navigation Links */}
        <div style={styles.links}>
          {desktopAuthedItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path)}
                style={{
                  ...styles.navLink,
                  color: active ? "#c5a880" : "#a1a1aa",
                  borderBottom: active ? "2px solid #c5a880" : "2px solid transparent",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* User profile / Logout */}
        <div style={styles.profileBox}>
          <div style={styles.avatar}>
            {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : "ME"}
          </div>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.full_name || "Member"}</span>
            <span style={styles.userRole}>Elite User</span>
          </div>
          <button onClick={logout} style={styles.logoutBtn} aria-label="Sign Out">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Navigation Styles ───────────────────────────────────────────────

const styles = {
  desktopNav: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    height: "72px",
    display: "flex",
    alignItems: "center",
    width: "100%",
    transition: "all 0.3s ease",
  },
  navContainer: {
    maxWidth: "1200px",
    width: "100%",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxSizing: "border-box",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  brandText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.35rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: "linear-gradient(135deg, #fff 30%, #c5a880 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  brandBadge: {
    fontSize: "0.65rem",
    fontWeight: 300,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#c5a880",
    border: "1px solid #423829",
    padding: "1px 6px",
    borderRadius: "3px",
  },
  links: {
    display: "flex",
    gap: "28px",
    height: "72px",
    alignItems: "center",
  },
  navLink: {
    background: "transparent",
    border: "none",
    fontSize: "0.88rem",
    fontWeight: 600,
    padding: "24px 4px 22px",
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  guestLoginBtn: {
    background: "linear-gradient(135deg, #8a704c, #c5a880)",
    border: "none",
    color: "#0e0e0e",
    fontWeight: 700,
    fontSize: "0.85rem",
    padding: "10px 24px",
    borderRadius: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(197, 168, 128, 0.2)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.3s",
  },
  profileBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #8a704c, #c5a880)",
    color: "#0e0e0e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
  },
  userName: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#fcfcfd",
  },
  userRole: {
    fontSize: "0.7rem",
    color: "#71717a",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: "6px",
    color: "#a1a1aa",
    fontSize: "0.78rem",
    fontWeight: 600,
    padding: "6px 12px",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    marginLeft: "8px",
    transition: "all 0.2s",
  },

  // Mobile Bottom Tab Bar (Only for authed views)
  mobileNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "64px",
    background: "rgba(18, 18, 21, 0.92)",
    backdropFilter: "blur(16px)",
    borderTop: "1px solid #26262b",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 1000,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  mobileBtn: {
    background: "transparent",
    border: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "8px 0",
    flex: 1,
    cursor: "pointer",
  },
  mobileIcon: {
    fontSize: "1.35rem",
  },
  mobileLabel: {
    fontSize: "0.68rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  mobileHeader: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(18, 18, 21, 0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #26262b",
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    width: "100%",
    boxSizing: "border-box",
  },
  mobileLogoutBtn: {
    background: "transparent",
    border: "1px solid #26262b",
    borderRadius: "6px",
    color: "#a1a1aa",
    fontSize: "0.75rem",
    fontWeight: 650,
    padding: "6px 12px",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.2s",
  },
};
