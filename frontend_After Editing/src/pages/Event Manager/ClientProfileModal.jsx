import { useState, useEffect } from "react";
import { Modal, Spinner, Alert, Badge } from "react-bootstrap";
import { FaStar, FaCalendarAlt, FaUser, FaCheckCircle } from "react-icons/fa";
import API from "../../services/api";

// Modal showing a client's booking history, ratings, and review activity
export default function ClientProfileModal({ show, onHide, clientId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show && clientId) {
      fetchClientProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, clientId]);

  const fetchClientProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/profile/client/${clientId}`);
      setProfile(res.data.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("No qualifying booking relationship with this client");
      } else {
        setError(err.response?.data?.message || "Failed to load client profile");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>Client Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" />
            <p className="mt-2 text-muted">Loading client profile...</p>
          </div>
        )}

        {error && (
          <Alert variant="danger">{error}</Alert>
        )}

        {!loading && !error && profile && (
          <div>
            {/* Header */}
            <div className="d-flex align-items-center gap-3 mb-4">
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                overflow: 'hidden', background: '#e9ecef', flexShrink: 0
              }}>
                {profile.profilePhoto ? (
                  <img src={profile.profilePhoto} alt={profile.name} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', fontWeight: 'bold', color: '#6c757d'
                  }}>
                    <FaUser />
                  </div>
                )}
              </div>
              <div>
                <h5 className="mb-0 fw-bold">
                  {profile.name}
                  {profile.isNewCustomer && (
                    <Badge bg="info" className="ms-2" style={{ fontSize: '0.65rem' }}>
                      New Customer
                    </Badge>
                  )}
                </h5>
                <small className="text-muted">
                  Member since {new Date(profile.accountCreatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </small>
              </div>
            </div>

            {/* Stats */}
            <div className="row g-2 mb-4">
              <div className="col-4 text-center">
                <div className="p-2 rounded" style={{ background: '#f8f9fa' }}>
                  <h5 className="mb-0 fw-bold text-primary">{profile.totalBookings}</h5>
                  <small className="text-muted">Total Bookings</small>
                </div>
              </div>
              <div className="col-4 text-center">
                <div className="p-2 rounded" style={{ background: '#f8f9fa' }}>
                  <h5 className="mb-0 fw-bold text-success">{profile.completedBookings}</h5>
                  <small className="text-muted">Completed</small>
                </div>
              </div>
              <div className="col-4 text-center">
                <div className="p-2 rounded" style={{ background: '#f8f9fa' }}>
                  <h5 className="mb-0 fw-bold text-danger">{profile.cancelledBookings}</h5>
                  <small className="text-muted">Cancelled</small>
                </div>
              </div>
            </div>

            {/* Average Rating Given */}
            <div className="mb-4 p-3 rounded" style={{ background: '#f8f9fa' }}>
              <div className="d-flex align-items-center gap-2">
                <FaStar style={{ color: '#fbbf24' }} />
                <span className="fw-bold">Average Rating Given:</span>
                <span>
                  {profile.averageRatingGiven !== null
                    ? `${profile.averageRatingGiven.toFixed(1)} / 5.0`
                    : "No ratings yet"}
                </span>
              </div>
            </div>

            {/* Recent Reviews */}
            <div>
              <h6 className="fw-bold mb-3">Recent Reviews ({profile.recentReviews?.length || 0})</h6>
              {(!profile.recentReviews || profile.recentReviews.length === 0) ? (
                <p className="text-muted">No reviews written yet.</p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {profile.recentReviews.map((review, idx) => (
                    <div key={idx} className="mb-2 p-2 border rounded" style={{ fontSize: '0.85rem' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="d-flex align-items-center gap-1">
                          <FaStar style={{ color: '#fbbf24', fontSize: '0.75rem' }} />
                          <strong>{review.rating?.toFixed(1)}</strong>
                        </span>
                        <small className="text-muted">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                      {review.comment && <p className="mb-1">{review.comment}</p>}
                      <small className="text-muted">To: {review.managerName}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
