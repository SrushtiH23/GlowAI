import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function HomePage() {
  const navigate = useNavigate();

  // Statistics counters state
  const [clientsCount, setClientsCount] = useState(0);
  const [stylistsCount, setStylistsCount] = useState(0);
  const [yearsCount, setYearsCount] = useState(0);
  const [satisfactionCount, setSatisfactionCount] = useState(0);

  // Gallery Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Ref for stats section to trigger animation on scroll
  const statsRef = useRef(null);
  const [statsAnimated, setStatsAnimated] = useState(false);

  // Gallery Images
  const galleryImages = [
    {
      url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
      caption: "Luxury Salon Interior",
      category: "Sanctuary",
    },
    {
      url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&auto=format&fit=crop&q=80",
      caption: "Precision Styling & Coloring",
      category: "Hair Artistry",
    },
    {
      url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
      caption: "VIP Skincare Treatment",
      category: "Skin Therapy",
    },
    {
      url: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80",
      caption: "Deep Tissue Spa Therapy",
      category: "Wellness Spa",
    },
    {
      url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=80",
      caption: "Luxury Nail Salon Lounge",
      category: "Nail Lounge",
    },
    {
      url: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=800&auto=format&fit=crop&q=80",
      caption: "Celebrity Makeover Session",
      category: "Transformations",
    },
  ];

  // Testimonials
  const testimonials = [
    {
      name: "Sneha Patel",
      role: "Elite Member",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
      rating: 5,
      text: "Unrivaled luxury! The Method Cut at Rossano Ferretti transformed my hair health completely. AuraElite made the booking and concierge pairing completely seamless.",
    },
    {
      name: "Rohan Sharma",
      role: "VIP Client",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
      rating: 5,
      text: "The AI Style Advisor matched me with the absolute best skin therapist at JW Marriott. The 24K Gold Collagen Facial was therapeutic. 5-star service!",
    },
    {
      name: "Priya Nair",
      role: "Corporate Executive",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=150&auto=format&fit=crop",
      rating: 5,
      text: "AuraElite is a game-changer for beauty. Being able to compare services, view styling suggestions, and reserve an expert stylist takes away all booking fatigue.",
    },
  ];

  // Services list
  const services = [
    {
      title: "Precision Haircut",
      category: "Hair Care",
      price: "₹2,500",
      duration: "45 mins",
      desc: "Premium wash, signature layered cut, and customized blowout by senior stylists.",
      image: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=600&auto=format&fit=crop&q=80",
      icon: "💇‍♂️",
    },
    {
      title: "Global Hair Color",
      category: "Hair Care",
      price: "₹7,500",
      duration: "120 mins",
      desc: "French Balayage, color glazing, and deep plex fiber protection treatments.",
      image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&auto=format&fit=crop&q=80",
      icon: "🎨",
    },
    {
      title: "Gold Peptide Facial",
      category: "Skin Care",
      price: "₹6,000",
      duration: "75 mins",
      desc: "Exfoliating skin rejuvenation utilizing 24-karat gold leaves and peptide serums.",
      image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
      icon: "✨",
    },
    {
      title: "Deep Tissue Therapy",
      category: "Spa Treatments",
      price: "₹4,500",
      duration: "90 mins",
      desc: "Full body stress-relief massage with premium organic essential aromatherapy oils.",
      image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&auto=format&fit=crop&q=80",
      icon: "💆‍♀️",
    },
    {
      title: "Chrome Gel Mani-Pedi",
      category: "Nails & Grooming",
      price: "₹3,000",
      duration: "60 mins",
      desc: "Complete nail shaping, luxurious massage, cuticle care, and high-gloss gel finish.",
      image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&auto=format&fit=crop&q=80",
      icon: "💅",
    },
  ];

  // Offers list
  const offers = [
    {
      title: "20% OFF Rehydrating Hair Spa",
      desc: "Nourish your scalp with hot steam therapy and argan botanical oil extracts.",
      badge: "HOT DEAL",
      expiry: "Valid until: Aug 31, 2026",
      originalPrice: "₹3,000",
      offerPrice: "₹2,400",
    },
    {
      title: "Bridal Suite Makeover Package",
      desc: "Complete custom hair design, VIP glow facial, and trial session for your special day.",
      badge: "EXCLUSIVE",
      expiry: "Valid until: Sep 15, 2026",
      originalPrice: "₹25,000",
      offerPrice: "₹21,250",
    },
    {
      title: "Student Grooming Special 10% OFF",
      desc: "10% OFF on any salon haircut, blowout, or massage. Valid with student ID verification.",
      badge: "ONGOING",
      expiry: "Valid: Weekdays Only",
      originalPrice: "₹2,000",
      offerPrice: "₹1,800",
    },
    {
      title: "Weekend Beauty Revive Combo",
      desc: "Receive 25% OFF when you combine a Signature layered haircut with Chrome Mani-Pedi.",
      badge: "BEST VALUE",
      expiry: "Valid: Sat & Sun",
      originalPrice: "₹5,500",
      offerPrice: "₹4,125",
    },
  ];

  // Animate statistics function
  const animateStats = () => {
    let clientsStart = 0;
    let stylistsStart = 0;
    let yearsStart = 0;
    let satisfactionStart = 0;

    const clientsEnd = 5000;
    const stylistsEnd = 15;
    const yearsEnd = 10;
    const satisfactionEnd = 98;

    const duration = 2000; // 2 seconds
    const intervalTime = 30; // 30ms updates
    const steps = duration / intervalTime;

    const clientsStep = clientsEnd / steps;
    const stylistsStep = stylistsEnd / steps;
    const yearsStep = yearsEnd / steps;
    const satisfactionStep = satisfactionEnd / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      clientsStart += clientsStep;
      stylistsStart += stylistsStep;
      yearsStart += yearsStep;
      satisfactionStart += satisfactionStep;

      if (step >= steps) {
        clearInterval(timer);
        setClientsCount(clientsEnd);
        setStylistsCount(stylistsEnd);
        setYearsCount(yearsEnd);
        setSatisfactionCount(satisfactionEnd);
      } else {
        setClientsCount(Math.floor(clientsStart));
        setStylistsCount(Math.floor(stylistsStart));
        setYearsCount(Math.floor(yearsStart));
        setSatisfactionCount(Math.floor(satisfactionStart));
      }
    }, intervalTime);
  };

  // Setup Intersection Observer for Stats Section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !statsAnimated) {
          setStatsAnimated(true);
          animateStats();
        }
      },
      { threshold: 0.2 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, [statsAnimated]);

  // Handle Lightbox Navigation
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, []);

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setLightboxIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setLightboxIndex((prevIndex) => (prevIndex - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <div style={styles.page}>
      {/* Dynamic styles injected for hover animations and media queries */}
      <style>{`
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Fade-in and slide-up animations */
        .fade-in {
          animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        
        .delay-1 { animation-delay: 0.2s; }
        .delay-2 { animation-delay: 0.4s; }
        .delay-3 { animation-delay: 0.6s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hover animations for cards */
        .premium-card {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                      border-color 0.4s ease, 
                      box-shadow 0.4s ease !important;
        }
        
        .premium-card:hover {
          transform: translateY(-8px);
          border-color: #c5a880 !important;
          box-shadow: 0 16px 40px rgba(197, 168, 128, 0.12) !important;
        }

        .premium-card:hover img {
          transform: scale(1.08);
        }

        /* Image hover effects */
        .zoom-img {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Responsive Grids */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 32px;
        }

        .offers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        /* Media Queries for Responsiveness */
        @media (max-width: 1024px) {
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .testimonials-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
          }
        }

        @media (max-width: 768px) {
          .services-grid {
            grid-template-columns: 1fr;
          }
          .offers-grid {
            grid-template-columns: 1fr;
          }
          .gallery-grid {
            grid-template-columns: 1fr;
          }
          .testimonials-grid {
            grid-template-columns: 1fr;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .hero-title {
            font-size: 2.8rem !important;
          }
          .section-title {
            font-size: 2rem !important;
          }
          .hero-buttons {
            flex-direction: column;
            width: 100%;
            gap: 16px !important;
          }
          .hero-btn {
            width: 100% !important;
            text-align: center;
          }
        }
      `}</style>

      {/* Embedded Sticky Navbar */}
      <Navbar />

      {/* HERO SECTION */}
      <section id="hero" style={styles.heroSection}>
        <div style={styles.heroOverlay}></div>
        <div style={styles.heroContainer} className="fade-in">
          <div style={styles.goldBadge} className="fade-in delay-1">
            ✨ Introducing AuraElite Luxury Discovery
          </div>
          <h1 style={styles.heroTitle} className="hero-title fade-in delay-2">
            Transform Your Style with <span style={styles.highlightText}>AuraElite</span>
          </h1>
          <p style={styles.heroSubtitle} className="fade-in delay-3">
            Indulge in a curated collection of Bangalore's finest master hair stylists, 
            premium skin rejuvenations, and bespoke wellness retreats. Realized through AI-tailored consultations.
          </p>
          <div style={styles.heroButtons} className="hero-buttons fade-in delay-3">
            <button
              onClick={() => navigate("/book")}
              style={styles.btnPrimary}
              className="hero-btn"
            >
              Book Appointment
            </button>
            <a href="#services" style={styles.btnOutline} className="hero-btn">
              Explore Services
            </a>
          </div>
        </div>
      </section>

      {/* STATISTICS SECTION */}
      <section ref={statsRef} id="stats" style={styles.statsSection}>
        <div style={styles.container}>
          <div className="stats-grid" style={{ width: "100%" }}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {clientsCount.toLocaleString()}+
              </div>
              <div style={styles.statLabel}>Happy Clients</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stylistsCount}+</div>
              <div style={styles.statLabel}>Expert Stylists</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{yearsCount}+</div>
              <div style={styles.statLabel}>Years Experience</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{satisfactionCount}%</div>
              <div style={styles.statLabel}>Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" style={styles.servicesSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionBadge}>Elite Grooming</span>
            <h2 style={styles.sectionTitle} className="section-title">
              Our Curated Services
            </h2>
            <p style={styles.sectionSubtitle}>
              Experience precision care designed for the modern aesthetic. Browse our leading signature service categories.
            </p>
          </div>

          <div className="services-grid">
            {services.map((svc, i) => (
              <div key={i} style={styles.serviceCard} className="premium-card">
                <div style={styles.serviceImgWrapper}>
                  <img
                    src={svc.image}
                    alt={svc.title}
                    style={styles.serviceImg}
                    className="zoom-img"
                  />
                  <div style={styles.categoryTag}>{svc.category}</div>
                </div>
                <div style={styles.serviceContent}>
                  <div style={styles.serviceMeta}>
                    <span style={styles.serviceIcon}>{svc.icon}</span>
                    <span style={styles.serviceDuration}>⏱️ {svc.duration}</span>
                  </div>
                  <h3 style={styles.serviceTitle}>{svc.title}</h3>
                  <p style={styles.serviceDesc}>{svc.desc}</p>
                  <div style={styles.serviceFooter}>
                    <span style={styles.servicePrice}>{svc.price}</span>
                    <button
                      onClick={() => navigate("/book", { state: { hairstyleName: svc.title } })}
                      style={styles.serviceBookBtn}
                    >
                      Book Service
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFERS SECTION */}
      <section id="offers" style={styles.offersSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionBadge}>Exclusive Savings</span>
            <h2 style={styles.sectionTitle} className="section-title">
              Current Promotional Offers
            </h2>
            <p style={styles.sectionSubtitle}>
              Indulge in global luxury standards at preferred seasonal prices. Available for a limited period.
            </p>
          </div>

          <div className="offers-grid">
            {offers.map((off, i) => (
              <div key={i} style={styles.offerCard} className="premium-card">
                <div style={styles.offerBadge}>{off.badge}</div>
                <h3 style={styles.offerTitle}>{off.title}</h3>
                <p style={styles.offerDesc}>{off.desc}</p>
                <div style={styles.offerPricing}>
                  <span style={styles.offerOrigPrice}>{off.originalPrice}</span>
                  <span style={styles.offerNewPrice}>{off.offerPrice}</span>
                </div>
                <div style={styles.offerExpiry}>
                  <span>⏳ {off.expiry}</span>
                </div>
                <button
                  onClick={() => navigate("/book", { state: { notes: `Applied promotion: ${off.title}` } })}
                  style={styles.offerBtn}
                >
                  Claim Offer
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY SECTION */}
      <section id="gallery" style={styles.gallerySection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionBadge}>Visual Showcase</span>
            <h2 style={styles.sectionTitle} className="section-title">
              The AuraElite Gallery
            </h2>
            <p style={styles.sectionSubtitle}>
              Take a virtual tour of our premium partner salons, state-of-the-art aesthetics, and gorgeous customer transformations.
            </p>
          </div>

          <div className="gallery-grid">
            {galleryImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => openLightbox(idx)}
                style={styles.galleryCard}
                className="premium-card"
              >
                <div style={styles.galleryImgWrapper}>
                  <img
                    src={img.url}
                    alt={img.caption}
                    style={styles.galleryImg}
                    className="zoom-img"
                  />
                  <div style={styles.galleryOverlay}>
                    <span style={styles.galleryCategory}>{img.category}</span>
                    <h4 style={styles.galleryCaption}>{img.caption}</h4>
                    <span style={styles.galleryIcon}>🔍 View Fullscreen</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIGHTBOX MODAL */}
      {lightboxOpen && (
        <div style={styles.lightboxOverlay} onClick={() => setLightboxOpen(false)}>
          <button style={styles.lightboxClose} onClick={() => setLightboxOpen(false)}>
            &times;
          </button>
          <button style={styles.lightboxNavLeft} onClick={prevImage}>
            &#8249;
          </button>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={galleryImages[lightboxIndex].url}
              alt={galleryImages[lightboxIndex].caption}
              style={styles.lightboxImg}
            />
            <div style={styles.lightboxMeta}>
              <span style={styles.lightboxCategory}>
                {galleryImages[lightboxIndex].category}
              </span>
              <h3 style={styles.lightboxCaption}>
                {galleryImages[lightboxIndex].caption}
              </h3>
            </div>
          </div>
          <button style={styles.lightboxNavRight} onClick={nextImage}>
            &#8250;
          </button>
        </div>
      )}

      {/* TESTIMONIALS SECTION */}
      <section id="testimonials" style={styles.testimonialsSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionBadge}>Client Reviews</span>
            <h2 style={styles.sectionTitle} className="section-title">
              What Our Clients Say
            </h2>
            <p style={styles.sectionSubtitle}>
              Real experiences from Bangalore's luxury community who choose AuraElite for their wellness style solutions.
            </p>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((test, i) => (
              <div key={i} style={styles.testimonialCard} className="premium-card">
                <div style={styles.ratingStars}>
                  {"★".repeat(test.rating)}
                </div>
                <p style={styles.testimonialText}>"{test.text}"</p>
                <div style={styles.testimonialUser}>
                  <img
                    src={test.avatar}
                    alt={test.name}
                    style={styles.testimonialAvatar}
                  />
                  <div>
                    <h4 style={styles.testimonialName}>{test.name}</h4>
                    <span style={styles.testimonialRole}>{test.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer id="footer" style={styles.footer}>
        <div style={styles.footerContainer}>
          <div style={styles.footerGrid}>
            {/* Brand column */}
            <div style={styles.footerCol}>
              <div style={styles.footerLogo}>
                <span style={styles.footerLogoText}>AURA</span>
                <span style={styles.footerLogoBadge}>Elite</span>
              </div>
              <p style={styles.footerDescText}>
                Discover, compare, and reserve appointments with the most exclusive hair artists and wellness sanctuaries in Bangalore.
              </p>
              <div style={styles.socialIcons}>
                <a href="#" style={styles.socialIcon} aria-label="Instagram">📸</a>
                <a href="#" style={styles.socialIcon} aria-label="Facebook">📘</a>
                <a href="#" style={styles.socialIcon} aria-label="Pinterest">📌</a>
                <a href="#" style={styles.socialIcon} aria-label="LinkedIn">💼</a>
              </div>
            </div>

            {/* Quick Links Column */}
            <div style={styles.footerCol}>
              <h4 style={styles.footerHeading}>Quick Links</h4>
              <ul style={styles.footerLinksList}>
                <li><a href="#hero" style={styles.footerLink}>Home</a></li>
                <li><a href="#services" style={styles.footerLink}>Services</a></li>
                <li><a href="#offers" style={styles.footerLink}>Offers</a></li>
                <li><a href="#gallery" style={styles.footerLink}>Gallery</a></li>
                <li><a href="#testimonials" style={styles.footerLink}>Reviews</a></li>
              </ul>
            </div>

            {/* Contact details */}
            <div style={styles.footerCol}>
              <h4 style={styles.footerHeading}>Get in Touch</h4>
              <ul style={styles.footerLinksList}>
                <li style={styles.footerContactItem}>
                  📍 Level 5, The Ritz-Carlton, Residency Road, Bangalore
                </li>
                <li style={styles.footerContactItem}>
                  📞 +91 98765 43210 / +91 80 4900 8000
                </li>
                <li style={styles.footerContactItem}>
                  ✉️ concierge@auraelite.com
                </li>
                <li style={styles.footerContactItem}>
                  🕒 Everyday: 10:00 AM — 09:00 PM
                </li>
              </ul>
            </div>
          </div>

          <div style={styles.footerBottom}>
            <div>&copy; 2026 AURA Elite. Developed for Bangalore Luxury Salons. All Rights Reserved.</div>
            <div style={styles.footerBottomLinks}>
              <a href="#" style={styles.footerBottomLink}>Privacy Policy</a>
              <a href="#" style={styles.footerBottomLink}>Terms & Conditions</a>
              <a href="#" style={styles.footerBottomLink}>VIP Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Design Aesthetics CSS objects ────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "#08080a",
    color: "#fcfcfd",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  container: {
    maxWidth: "1200px",
    width: "100%",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "56px",
    maxWidth: "700px",
  },
  sectionBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#c5a880",
    border: "1px solid rgba(197, 168, 128, 0.25)",
    padding: "4px 12px",
    borderRadius: "20px",
    background: "rgba(197, 168, 128, 0.04)",
    display: "inline-block",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2.4rem",
    fontWeight: 500,
    margin: "0 0 16px 0",
    color: "#ffffff",
    letterSpacing: "-0.01em",
  },
  sectionSubtitle: {
    fontSize: "1rem",
    color: "#a1a1aa",
    lineHeight: 1.6,
    margin: 0,
  },

  // Hero Section
  heroSection: {
    position: "relative",
    height: "100vh",
    minHeight: "650px",
    display: "flex",
    alignItems: "center",
    background: "url('https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&auto=format&fit=crop&q=80') center center / cover no-repeat",
    overflow: "hidden",
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(to right, rgba(8, 8, 10, 0.95) 40%, rgba(8, 8, 10, 0.7) 70%, rgba(8, 8, 10, 0.3) 100%)",
    zIndex: 1,
  },
  heroContainer: {
    position: "relative",
    zIndex: 2,
    maxWidth: "800px",
    margin: "0 auto",
    padding: "0 40px",
    boxSizing: "border-box",
    textAlign: "left",
    width: "100%",
  },
  goldBadge: {
    fontSize: "0.8rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#c5a880",
    marginBottom: "20px",
    display: "inline-block",
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "3.8rem",
    fontWeight: 500,
    lineHeight: "1.15",
    color: "#ffffff",
    margin: "0 0 24px 0",
    letterSpacing: "-0.02em",
  },
  highlightText: {
    background: "linear-gradient(135deg, #ffffff 40%, #c5a880 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtitle: {
    fontSize: "1.1rem",
    color: "#a1a1aa",
    lineHeight: "1.7",
    marginBottom: "40px",
    maxWidth: "640px",
  },
  heroButtons: {
    display: "flex",
    gap: "20px",
  },
  btnPrimary: {
    padding: "16px 36px",
    background: "linear-gradient(135deg, #8a704c 0%, #c5a880 100%)",
    color: "#0e0e0e",
    border: "none",
    borderRadius: "6px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.95rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(197, 168, 128, 0.25)",
    transition: "opacity 0.2s, transform 0.2s",
  },
  btnOutline: {
    padding: "16px 36px",
    background: "transparent",
    color: "#c5a880",
    border: "1px solid #c5a880",
    borderRadius: "6px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "0.95rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 0.2s, color 0.2s",
  },

  // Statistics Section
  statsSection: {
    background: "#121215",
    borderBottom: "1px solid #26262b",
    padding: "60px 0",
  },
  statCard: {
    textAlign: "center",
    padding: "10px",
  },
  statNumber: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "3rem",
    color: "#c5a880",
    fontWeight: 650,
    marginBottom: "8px",
  },
  statLabel: {
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#71717a",
  },

  // Services Section
  servicesSection: {
    padding: "100px 0",
  },
  serviceCard: {
    background: "#121215",
    border: "1px solid #1f1f23",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
  },
  serviceImgWrapper: {
    height: "220px",
    overflow: "hidden",
    position: "relative",
  },
  serviceImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  categoryTag: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(18, 18, 21, 0.8)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(197, 168, 128, 0.25)",
    color: "#c5a880",
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  serviceContent: {
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  serviceMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  serviceIcon: {
    fontSize: "1.5rem",
  },
  serviceDuration: {
    fontSize: "0.8rem",
    color: "#71717a",
    fontWeight: 600,
  },
  serviceTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.3rem",
    fontWeight: 500,
    margin: "0 0 12px 0",
    color: "#fcfcfd",
  },
  serviceDesc: {
    fontSize: "0.88rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: "0 0 24px 0",
    flex: 1,
  },
  serviceFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #1f1f23",
    paddingTop: "20px",
  },
  servicePrice: {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#c5a880",
  },
  serviceBookBtn: {
    background: "transparent",
    border: "1px solid #c5a880",
    color: "#c5a880",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 750,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "all 0.3s",
  },

  // Offers Section
  offersSection: {
    padding: "100px 0",
    background: "radial-gradient(circle at top, #121215 0%, #08080a 70%)",
    borderTop: "1px solid #1f1f23",
    borderBottom: "1px solid #1f1f23",
  },
  offerCard: {
    background: "linear-gradient(135deg, #121215 0%, #16161a 100%)",
    border: "1px solid #26262b",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  offerBadge: {
    position: "absolute",
    top: "-12px",
    left: "24px",
    background: "linear-gradient(135deg, #8a704c 0%, #c5a880 100%)",
    color: "#0e0e0e",
    fontWeight: 800,
    fontSize: "0.75rem",
    letterSpacing: "0.05em",
    padding: "4px 12px",
    borderRadius: "4px",
    boxShadow: "0 4px 12px rgba(197, 168, 128, 0.2)",
  },
  offerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.25rem",
    fontWeight: 500,
    color: "#ffffff",
    margin: "12px 0 12px 0",
  },
  offerDesc: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: "0 0 24px 0",
    flex: 1,
  },
  offerPricing: {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
    marginBottom: "12px",
  },
  offerOrigPrice: {
    fontSize: "0.9rem",
    color: "#4b5563",
    textDecoration: "line-through",
  },
  offerNewPrice: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#c5a880",
  },
  offerExpiry: {
    fontSize: "0.78rem",
    color: "#f87171",
    fontWeight: 600,
    marginBottom: "24px",
  },
  offerBtn: {
    width: "100%",
    padding: "12px 0",
    background: "transparent",
    border: "1px solid #c5a880",
    borderRadius: "6px",
    color: "#c5a880",
    fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "all 0.3s",
  },

  // Gallery Section
  gallerySection: {
    padding: "100px 0",
  },
  galleryCard: {
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    border: "1px solid #1f1f23",
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  galleryImgWrapper: {
    position: "relative",
    height: "280px",
    overflow: "hidden",
  },
  galleryImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  galleryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(to top, rgba(8,8,10,0.95) 10%, rgba(8,8,10,0.4) 60%, transparent 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "24px",
    opacity: 0,
    transition: "opacity 0.3s ease",
    ":hover": {
      opacity: 1,
    },
  },
  galleryCategory: {
    fontSize: "0.7rem",
    color: "#c5a880",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 700,
    marginBottom: "6px",
  },
  galleryCaption: {
    color: "#ffffff",
    margin: "0 0 12px 0",
    fontSize: "1.1rem",
    fontFamily: "'Playfair Display', serif",
    fontWeight: 500,
  },
  galleryIcon: {
    fontSize: "0.75rem",
    color: "#a1a1aa",
    fontWeight: 600,
  },

  // Lightbox Modal
  lightboxOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(8, 8, 10, 0.95)",
    backdropFilter: "blur(10px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: "30px",
    right: "30px",
    background: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "3rem",
    cursor: "pointer",
    zIndex: 10000,
  },
  lightboxNavLeft: {
    position: "absolute",
    left: "40px",
    background: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "4rem",
    cursor: "pointer",
    zIndex: 10000,
    userSelect: "none",
  },
  lightboxNavRight: {
    position: "absolute",
    right: "40px",
    background: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "4rem",
    cursor: "pointer",
    zIndex: 10000,
    userSelect: "none",
  },
  lightboxContent: {
    maxWidth: "80%",
    maxHeight: "75%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  lightboxImg: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    borderRadius: "6px",
    border: "1px solid #26262b",
    boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
  },
  lightboxMeta: {
    marginTop: "20px",
    textAlign: "center",
  },
  lightboxCategory: {
    fontSize: "0.75rem",
    color: "#c5a880",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    fontWeight: 700,
  },
  lightboxCaption: {
    fontFamily: "'Playfair Display', serif",
    color: "#ffffff",
    fontSize: "1.4rem",
    margin: "6px 0 0 0",
    fontWeight: 500,
  },

  // Testimonials Section
  testimonialsSection: {
    padding: "100px 0",
    background: "#121215",
    borderTop: "1px solid #1f1f23",
  },
  testimonialCard: {
    background: "#08080a",
    border: "1px solid #1f1f23",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  ratingStars: {
    color: "#c5a880",
    fontSize: "1.1rem",
    marginBottom: "20px",
  },
  testimonialText: {
    fontSize: "0.92rem",
    color: "#a1a1aa",
    lineHeight: 1.6,
    fontStyle: "italic",
    margin: "0 0 24px 0",
  },
  testimonialUser: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  testimonialAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #c5a880",
  },
  testimonialName: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: "0 0 2px 0",
  },
  testimonialRole: {
    fontSize: "0.75rem",
    color: "#71717a",
  },

  // Footer Section
  footer: {
    background: "#08080a",
    borderTop: "1px solid #1f1f23",
    padding: "80px 0 30px 0",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  footerContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 24px",
  },
  footerGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1.5fr",
    gap: "64px",
    marginBottom: "56px",
  },
  footerCol: {
    display: "flex",
    flexDirection: "column",
  },
  footerLogo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "24px",
  },
  footerLogoText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.6rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: "linear-gradient(135deg, #fff 30%, #c5a880 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  footerLogoBadge: {
    fontSize: "0.75rem",
    fontWeight: 300,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#c5a880",
    border: "1px solid #423829",
    padding: "1px 6px",
    borderRadius: "3px",
  },
  footerDescText: {
    fontSize: "0.88rem",
    color: "#71717a",
    lineHeight: 1.6,
    margin: "0 0 24px 0",
    maxWidth: "320px",
  },
  socialIcons: {
    display: "flex",
    gap: "16px",
  },
  socialIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#121215",
    border: "1px solid #1f1f23",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    fontSize: "1.1rem",
    transition: "all 0.3s",
  },
  footerHeading: {
    fontFamily: "'Playfair Display', serif",
    color: "#ffffff",
    fontSize: "1.1rem",
    fontWeight: 500,
    marginBottom: "24px",
  },
  footerLinksList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  footerLink: {
    color: "#71717a",
    textDecoration: "none",
    fontSize: "0.88rem",
    transition: "color 0.2s",
  },
  footerContactItem: {
    fontSize: "0.85rem",
    color: "#71717a",
    lineHeight: 1.6,
  },
  footerBottom: {
    borderTop: "1px solid #1f1f23",
    paddingTop: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    fontSize: "0.8rem",
    color: "#4b5563",
  },
  footerBottomLinks: {
    display: "flex",
    gap: "24px",
  },
  footerBottomLink: {
    color: "#4b5563",
    textDecoration: "none",
    transition: "color 0.2s",
  },
};
