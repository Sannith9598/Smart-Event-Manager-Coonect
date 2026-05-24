import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Spinner, Alert } from "react-bootstrap";
import { motion } from "framer-motion";
import API from "../../services/api";
import ProfileHeader from "./ProfileHeader";
import MediaGrid from "./MediaGrid";
import MediaDetailModal from "./MediaDetailModal";
import CompareButton from "./CompareButton";
import ComparisonView from "./ComparisonView";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PublicProfile() {
  const { managerId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookableEvents, setBookableEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [bookableLoading, setBookableLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [activeTab, setActiveTab] = useState("packages"); // "packages" or "portfolio"
  const [compareList, setCompareList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("compareManagers") || "[]");
    } catch { return []; }
  });

  useEffect(() => {
    fetchProfile();
    fetchEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerId]);

  // Fetch bookable events once profile is loaded (needs userId)
  useEffect(() => {
    if (profile && profile.userId) {
      fetchBookableEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/manager/public-profile/${managerId}`);
      setProfile(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Profile not found or not verified");
      } else {
        setError("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (pageNum) => {
    try {
      setEventsLoading(true);
      const res = await API.get(`/manager/public-profile/${managerId}/events?page=${pageNum}&limit=12`);
      if (pageNum === 1) {
        setEvents(res.data.data);
      } else {
        setEvents(prev => [...prev, ...res.data.data]);
      }
      setHasMore(res.data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchBookableEvents = async () => {
    try {
      setBookableLoading(true);
      // Use the userId from the profile data (fetched from public-profile endpoint)
      if (profile && profile.userId) {
        const res = await API.get(`/event/manager/${profile.userId}`);
        setBookableEvents(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch bookable events:", err);
    } finally {
      setBookableLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchEvents(page + 1);
  };

  const handleBookNow = (event) => {
    navigate(`/event/${event.id}`);
  };

  const handleCompare = useCallback((managerData) => {
    setCompareList(prev => {
      if (prev.length >= 5) return prev;
      if (prev.find(m => m.id === managerData.id)) return prev;
      const updated = [...prev, managerData];
      localStorage.setItem("compareManagers", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleRemoveFromCompare = useCallback((id) => {
    setCompareList(prev => {
      const updated = prev.filter(m => m.id !== id);
      localStorage.setItem("compareManagers", JSON.stringify(updated));
      return updated;
    });
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <Container className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading profile...</p>
        </Container>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <Container className="py-5">
          <Alert variant="warning" className="text-center">
            <h5>{error}</h5>
            <p>This manager profile is not available.</p>
          </Alert>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container className="py-4">
        <ProfileHeader profile={profile} />

        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          {/* Tab Switcher */}
          <div className="profile-tabs">
            <button
              className={`profile-tab-btn ${activeTab === "packages" ? "active" : ""}`}
              onClick={() => setActiveTab("packages")}
            >
              📦 Packages
            </button>
            <button
              className={`profile-tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
              onClick={() => setActiveTab("portfolio")}
            >
              📸 Portfolio
            </button>
          </div>

          <div className="d-flex gap-2">
            <CompareButton
              profile={profile}
              compareList={compareList}
              onCompare={handleCompare}
            />
            {compareList.length >= 2 && (
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => setShowComparison(true)}
              >
                View Comparison ({compareList.length})
              </button>
            )}
          </div>
        </div>

        {/* Bookable Events / Packages Tab */}
        {activeTab === "packages" && (
          <div className="profile-packages-section">
            {bookableLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" />
                <p className="mt-2">Loading packages...</p>
              </div>
            ) : bookableEvents.length === 0 ? (
              <Alert variant="info" className="text-center">
                No event packages available from this manager yet.
              </Alert>
            ) : (
              <div className="row g-4">
                {bookableEvents.map((event, index) => (
                  <div key={event.id} className="col-12 col-sm-6 col-lg-4">
                    <motion.div
                      className="profile-event-post"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ y: -5 }}
                    >
                      {/* Instagram-style post image */}
                      <div className="profile-post-image">
                        <img
                          src={
                            event.image ||
                            "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400"
                          }
                          alt={event.title || event.name}
                        />
                        {event.eventType && (
                          <span className="profile-post-category">
                            {event.eventType}
                          </span>
                        )}
                      </div>

                      {/* Post info below image */}
                      <div className="profile-post-info">
                        <h5 className="profile-post-title">
                          {event.title || event.name}
                        </h5>
                        {event.description && (
                          <p className="profile-post-desc">
                            {event.description.length > 100
                              ? event.description.substring(0, 100) + "..."
                              : event.description}
                          </p>
                        )}
                        <div className="profile-post-meta">
                          <span className="profile-post-price">
                            ₹{event.price?.toLocaleString()}
                          </span>
                          {event.maxGuests && (
                            <span>👥 {event.maxGuests} guests</span>
                          )}
                          {event.duration && (
                            <span>⏱️ {event.duration}</span>
                          )}
                        </div>
                        <motion.button
                          className="profile-book-btn"
                          onClick={() => handleBookNow(event)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          Book Now →
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portfolio / Past Events Tab */}
        {activeTab === "portfolio" && (
          <>
            <MediaGrid
              events={events}
              onEventClick={setSelectedEvent}
              loading={eventsLoading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />

            {selectedEvent && (
              <MediaDetailModal
                event={selectedEvent}
                profile={profile}
                onClose={() => setSelectedEvent(null)}
              />
            )}
          </>
        )}

        {showComparison && (
          <ComparisonView
            managers={compareList}
            onRemove={handleRemoveFromCompare}
            onClose={() => setShowComparison(false)}
          />
        )}
      </Container>
      <Footer />
    </>
  );
}
