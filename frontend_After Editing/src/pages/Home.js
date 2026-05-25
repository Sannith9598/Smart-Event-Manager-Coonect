import { motion, AnimatePresence } from "framer-motion";
import { Container, Spinner, Alert } from "react-bootstrap";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/Navbar";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import bg from "../images/home.jpg";
import Chatbot from "../Chatbot";
import Footer from "../components/Footer";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Home() {
  const { darkMode } = useTheme();
  const [verifiedManagers, setVerifiedManagers] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [showManagers, setShowManagers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const carouselRef = useRef(null);
  const managersRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVerifiedManagers();
    fetchTrendingEvents();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    try {
      setSearchLoading(true);
      setShowSearchResults(true);
      const response = await API.get(`/manager/search/verified?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(response.data.data || []);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.home-search-container')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchVerifiedManagers = async () => {
    try {
      const response = await API.get("/admin/verified");
      setVerifiedManagers(response.data.data);
    } catch (err) {
      console.error("Error fetching verified managers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingEvents = async () => {
    try {
      const response = await API.get("/event/trending?limit=15");
      setTrendingEvents(response.data.data);
    } catch (err) {
      console.error("Error fetching trending events:", err);
    } finally {
      setTrendingLoading(false);
    }
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 350;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollManagers = (direction) => {
    if (managersRef.current) {
      const scrollAmount = 200;
      managersRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleManagerClick = (manager) => {
    navigate(`/manager/${manager.id}/profile`);
  };

  const handleBookNow = (event) => {
    navigate(`/event/${event.id}`);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Wedding: "💍", wedding: "💍",
      Birthday: "🎂", birthday: "🎂",
      Corporate: "🏢", corporate: "🏢",
      Party: "🎉", party: "🎉",
      Anniversary: "✨", anniversary: "✨",
      Festival: "🎪", festival: "🎪",
      event: "🎪",
    };
    return icons[category] || "🎉";
  };

  return (
    <>
      <AppNavbar />
      <Chatbot />

      {/* Hero Section */}
      <div className="home-hero">
        <div
          className="home-hero-bg"
          style={{ backgroundImage: `url(${bg})` }}
        />
        <div className={`home-hero-overlay ${darkMode ? "dark" : "light"}`} />
        <Container className="home-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="home-hero-title">
              Discover Amazing
              <span className="home-gradient-text"> Events</span>
            </h1>
            <p className="home-hero-subtitle">
              Browse trending events and top event managers, all in one place
            </p>

            {/* Search Bar */}
            <div className="home-search-container">
              <div className="home-search-bar">
                <input
                  type="text"
                  className="home-search-input"
                  placeholder="Search event managers by name, event type, phone, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
                />
                <button className="home-search-btn" onClick={() => handleSearch(searchQuery)}>
                  🔍
                </button>
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <motion.div
                  className="home-search-results"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {searchLoading ? (
                    <div className="search-result-loading">
                      <Spinner animation="border" size="sm" /> Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="search-result-empty">
                      No managers found for "{searchQuery}"
                    </div>
                  ) : (
                    <>
                      <div className="search-result-count">
                        {searchResults.length} manager{searchResults.length > 1 ? 's' : ''} found
                      </div>
                      {searchResults.map((manager) => (
                        <div
                          key={manager.id}
                          className="search-result-item"
                          onClick={() => {
                            setShowSearchResults(false);
                            navigate(`/manager/${manager.id}/profile`);
                          }}
                        >
                          <img
                            src={
                              manager.profilePhoto ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.businessName || "EM")}&background=6366f1&color=fff&size=40`
                            }
                            alt={manager.businessName}
                            className="search-result-avatar"
                          />
                          <div className="search-result-info">
                            <strong>{manager.businessName || manager.name}</strong>
                            <div className="search-result-meta">
                              {manager.rating > 0 && <span>⭐ {manager.rating}</span>}
                              {manager.businessTypes?.length > 0 && (
                                <span>{manager.businessTypes.slice(0, 2).join(", ")}</span>
                              )}
                              {manager.location && <span>📍 {manager.location}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </div>

            <motion.button
              className={`home-toggle-btn ${showManagers ? "active" : ""}`}
              onClick={() => setShowManagers(!showManagers)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showManagers ? "🔥 Show Trending Events" : "👥 Show Event Managers"}
            </motion.button>
          </motion.div>
        </Container>
      </div>

      {/* Event Managers - Instagram Story Bubbles */}
      <AnimatePresence>
        {showManagers && (
          <motion.section
            className="home-managers-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Container>
              <div className="home-managers-header">
                <h2>✨ Event Managers</h2>
                <p>Tap on a profile to explore their events</p>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" size="sm" />
                </div>
              ) : verifiedManagers.length === 0 ? (
                <Alert variant="info" className="text-center">
                  No verified managers available yet.
                </Alert>
              ) : (
                <div className="home-stories-wrapper">
                  <button
                    className="home-stories-arrow left"
                    onClick={() => scrollManagers("left")}
                    aria-label="Scroll left"
                  >
                    <FiChevronLeft />
                  </button>

                  <div className="home-stories-container" ref={managersRef}>
                    {verifiedManagers.map((manager, index) => (
                      <motion.div
                        key={manager.id}
                        className="home-story-item"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleManagerClick(manager)}
                      >
                        <div className="home-story-ring">
                          <img
                            src={
                              manager.profilePhoto ||
                              manager.images?.[0]?.url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.businessName || "EM")}&background=6366f1&color=fff&size=100`
                            }
                            alt={manager.businessName}
                            className="home-story-avatar"
                          />
                        </div>
                        <span className="home-story-name">
                          {manager.businessName?.length > 12
                            ? manager.businessName.substring(0, 12) + "..."
                            : manager.businessName}
                        </span>
                        {manager.verified && (
                          <span className="home-story-verified">✓</span>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <button
                    className="home-stories-arrow right"
                    onClick={() => scrollManagers("right")}
                    aria-label="Scroll right"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </Container>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Trending Events Carousel */}
      <AnimatePresence>
        {!showManagers && (
          <motion.section
            className="home-trending-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Container>
              <div className="home-trending-header">
                <h2>🔥 Trending Events</h2>
                <p>Most booked events by customers</p>
              </div>

              {trendingLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading trending events...</p>
                </div>
              ) : trendingEvents.length === 0 ? (
                <Alert variant="info" className="text-center">
                  No trending events available yet. Check back soon!
                </Alert>
              ) : (
                <div className="home-carousel-wrapper">
                  <button
                    className="home-carousel-arrow left"
                    onClick={() => scrollCarousel("left")}
                    aria-label="Scroll left"
                  >
                    <FiChevronLeft />
                  </button>

                  <div className="home-carousel-track" ref={carouselRef}>
                    {trendingEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        className="home-event-card"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                      >
                        <div className="home-event-image">
                          <img
                            src={
                              event.image ||
                              event.images?.[0] ||
                              "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400"
                            }
                            alt={event.name}
                          />
                          <div className="home-event-category">
                            {getCategoryIcon(event.category)} {event.category || "Event"}
                          </div>
                          {event.bookingsCount > 0 && (
                            <div className="home-event-trending-badge">
                              🔥 {event.bookingsCount} booked
                            </div>
                          )}
                        </div>

                        <div className="home-event-info">
                          <h4 className="home-event-title">{event.name}</h4>
                          {event.description && (
                            <p className="home-event-desc">
                              {event.description.length > 80
                                ? event.description.substring(0, 80) + "..."
                                : event.description}
                            </p>
                          )}

                          <div className="home-event-meta">
                            <span className="home-event-price">
                              ₹{event.price?.toLocaleString()}
                            </span>
                            {event.maxGuests && (
                              <span className="home-event-guests">
                                👥 {event.maxGuests}
                              </span>
                            )}
                            {event.duration && (
                              <span className="home-event-duration">
                                ⏱️ {event.duration}
                              </span>
                            )}
                          </div>

                          {event.managerName && (
                            <div className="home-event-manager">
                              <img
                                src={
                                  event.managerPhoto ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(event.managerName)}&background=6366f1&color=fff&size=30`
                                }
                                alt={event.managerName}
                                className="home-event-manager-avatar"
                              />
                              <span>by {event.managerName}</span>
                            </div>
                          )}

                          <motion.button
                            className="home-book-btn"
                            onClick={() => handleBookNow(event)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Book Now →
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    className="home-carousel-arrow right"
                    onClick={() => scrollCarousel("right")}
                    aria-label="Scroll right"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </Container>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Stats Section */}
      <motion.section
        className="home-stats-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <Container>
          <div className="home-stats-grid">
            <div className="home-stat-card">
              <div className="home-stat-number">{verifiedManagers.length}+</div>
              <div className="home-stat-label">Verified Planners</div>
            </div>
            <div className="home-stat-card">
              <div className="home-stat-number">{trendingEvents.length}+</div>
              <div className="home-stat-label">Events Available</div>
            </div>
            <div className="home-stat-card">
              <div className="home-stat-number">4.8⭐</div>
              <div className="home-stat-label">Average Rating</div>
            </div>
          </div>
        </Container>
      </motion.section>

      <Footer />
    </>
  );
}
