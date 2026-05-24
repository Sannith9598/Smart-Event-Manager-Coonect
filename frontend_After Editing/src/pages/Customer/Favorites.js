import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import API from "../../services/api";
import AppNavbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useTheme } from "../../context/ThemeContext";

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await API.get("/favorites");
      setFavorites(res.data.data || []);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (eventId) => {
    try {
      await API.delete(`/favorites/${eventId}`);
      setFavorites((prev) => prev.filter((f) => f.eventId !== eventId));
      toast.success("Removed from favorites");
    } catch (err) {
      toast.error("Failed to remove from favorites");
    }
  };

  return (
    <>
      <AppNavbar />
      <div style={{ minHeight: '100vh', background: darkMode ? 'linear-gradient(160deg, #1a1a2e 0%, #16213e 30%, #1e293b 70%, #0f172a 100%)' : 'linear-gradient(160deg, #f8faff 0%, #f0f4ff 30%, #faf5ff 70%, #fff5f5 100%)' }}>
        <Container className="py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Hero Header */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 50%, #8b5cf6 100%)',
              borderRadius: '24px',
              padding: '36px 40px',
              marginBottom: '30px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: darkMode ? '0 20px 60px rgba(0, 0, 0, 0.4)' : '0 20px 60px rgba(239, 68, 68, 0.2)'
            }}>
              <div style={{ position: 'absolute', top: '-50px', right: '-30px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: '-40px', right: '100px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.8rem', margin: 0, position: 'relative', zIndex: 1 }}>
                <FaHeart className="me-3" /> My Wishlist
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0', position: 'relative', zIndex: 1 }}>
                Your saved events and favorite planners
              </p>
            </div>

            {loading ? (
              <div className="text-center py-5" style={{ background: darkMode ? '#16213e' : 'white', borderRadius: '24px', boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Spinner animation="border" variant="primary" />
                <p className="mt-3" style={{ color: darkMode ? '#94a3b8' : '#6b7280' }}>Loading your favorites...</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center" style={{ background: darkMode ? '#16213e' : 'white', borderRadius: '24px', padding: '60px 40px', boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: darkMode ? 'linear-gradient(135deg, #3b1c1c, #5c2020)' : 'linear-gradient(135deg, #fee2e2, #fecaca)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '40px' }}>
                  <FaHeart style={{ color: '#ef4444' }} />
                </div>
                <h4 style={{ fontWeight: 700, color: darkMode ? '#f1f5f9' : '#1f2937' }}>No favorites yet</h4>
                <p style={{ color: darkMode ? '#94a3b8' : '#6b7280', maxWidth: '400px', margin: '0 auto 20px' }}>Browse events and click the heart icon to save them here for later.</p>
                <button className="btn-pro btn-pro-complete" onClick={() => navigate("/")}>
                  Explore Events →
                </button>
              </div>
            ) : (
              <Row className="g-4">
                {favorites.filter((fav) => fav.event != null).map((fav, index) => (
                  <Col md={6} lg={4} key={fav.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ y: -6 }}
                    >
                      <Card className="h-100" style={{ borderRadius: '20px', border: darkMode ? '1px solid #2d3748' : 'none', background: darkMode ? '#16213e' : 'white', boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'all 0.3s ease' }}>
                        {fav.event?.image && (
                          <div style={{ position: 'relative', overflow: 'hidden' }}>
                            <Card.Img
                              variant="top"
                              src={fav.event.image}
                              alt={fav.event.name}
                              loading="lazy"
                              style={{ height: "200px", objectFit: "cover", cursor: "pointer", transition: 'transform 0.4s ease' }}
                              onClick={() => navigate(`/event/${fav.event.id}`)}
                            />
                            <div style={{ position: 'absolute', top: '12px', right: '12px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239,68,68,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>
                              <FaHeart />
                            </div>
                          </div>
                        )}
                        <Card.Body style={{ padding: '20px' }}>
                          <Card.Title
                            style={{ cursor: "pointer", fontWeight: 700, fontSize: '1rem', color: darkMode ? '#f1f5f9' : '#1f2937' }}
                            onClick={() => navigate(`/event/${fav.event.id}`)}
                          >
                            {fav.event?.name || "Event"}
                          </Card.Title>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            {fav.event?.category && (
                              <span className={`badge-pro ${fav.event.category === 'wedding' ? 'badge-category-wedding' : fav.event.category === 'birthday' ? 'badge-category-birthday' : 'badge-category-general'}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                                {fav.event.category}
                              </span>
                            )}
                            <strong style={{ color: '#6366f1', fontSize: '15px' }}>₹{fav.event?.price?.toLocaleString()}</strong>
                          </div>
                          {fav.event?.description && (
                            <p style={{ color: darkMode ? '#94a3b8' : '#6b7280', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                              {fav.event.description.substring(0, 100)}...
                            </p>
                          )}
                          <div className="d-flex gap-2">
                            <button
                              className="btn-pro btn-pro-sm btn-pro-view flex-grow-1"
                              onClick={() => navigate(`/event/${fav.event.id}`)}
                            >
                              View Details
                            </button>
                            <button
                              className="btn-pro btn-pro-sm btn-pro-complete flex-grow-1"
                              onClick={() => navigate(`/event/${fav.event.id}`)}
                            >
                              Book Now
                            </button>
                            <button
                              className="btn-pro btn-pro-sm btn-pro-reject"
                              onClick={() => removeFavorite(fav.eventId)}
                              title="Remove from wishlist"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            )}
          </motion.div>
        </Container>
      </div>
      <Footer />

    </>
  );
}
