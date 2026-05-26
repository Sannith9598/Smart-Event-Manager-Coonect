import { useState, useEffect } from "react";
import { Modal, Badge, ProgressBar, Spinner } from "react-bootstrap";
import { FaStar, FaClock, FaMapMarkerAlt, FaTimes, FaCalendarAlt, FaTrophy, FaUsers } from "react-icons/fa";
import API from "../../services/api";

// Side-by-side comparison modal showing ratings, experience, and scores for selected managers
export default function ComparisonView({ managers, onRemove, onClose }) {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (managers && managers.length >= 2) {
      fetchComparison();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managers]);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError("");
      const managerIds = managers.map(m => m.id);
      const res = await API.post("/manager/compare", { managerIds });
      setComparisonData(res.data);
    } catch (err) {
      console.error("Comparison fetch failed:", err);
      setError("Failed to load comparison data. Showing basic comparison.");
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!managers || managers.length < 2) return null;

  const displayManagers = comparisonData?.data || managers;
  const recommended = comparisonData?.recommended;

  const getScoreColor = (score) => {
    if (score >= 80) return "success";
    if (score >= 60) return "info";
    if (score >= 40) return "warning";
    return "danger";
  };

  const getHighestInCategory = (category) => {
    if (!displayManagers || displayManagers.length === 0) return null;
    switch (category) {
      case "rating":
        return displayManagers.reduce((best, m) => (m.rating || 0) > (best.rating || 0) ? m : best).id;
      case "experience":
        return displayManagers.reduce((best, m) => (m.yearsOfExperience || 0) > (best.yearsOfExperience || 0) ? m : best).id;
      case "events":
        return displayManagers.reduce((best, m) => (m.totalPastEvents || 0) > (best.totalPastEvents || 0) ? m : best).id;
      case "reviews":
        return displayManagers.reduce((best, m) => (m.totalReviews || 0) > (best.totalReviews || 0) ? m : best).id;
      default:
        return null;
    }
  };

  return (
    <Modal show={true} onHide={onClose} size="xl" centered dialogClassName="comparison-modal">
      <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Modal.Title>
          <FaTrophy className="me-2" />
          Compare Event Managers ({displayManagers.length})
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Analyzing managers...</p>
          </div>
        ) : (
          <>
            {/* Recommendation Banner */}
            {recommended && (
              <div className="alert alert-success d-flex align-items-center mb-4" style={{ borderRadius: '12px', border: '2px solid #28a745' }}>
                <FaTrophy style={{ fontSize: '1.5rem', color: '#ffc107', marginRight: '12px' }} />
                <div>
                  <strong>Recommended:</strong> {recommended.businessName} is the best match based on overall performance
                  <span className="ms-2 badge bg-success">Score: {recommended.score}/100</span>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-warning mb-3" style={{ borderRadius: '8px' }}>
                {error}
              </div>
            )}

            {/* Comparison Table */}
            <div className="table-responsive">
              <table className="table table-bordered align-middle text-center" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ width: '150px', textAlign: 'left' }}>Factor</th>
                    {displayManagers.map(manager => (
                      <th key={manager.id} style={{ minWidth: '160px', position: 'relative' }}>
                        <button
                          className="btn btn-sm btn-outline-danger position-absolute"
                          style={{ top: '4px', right: '4px', padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => onRemove(manager.id)}
                          title="Remove"
                        >
                          <FaTimes />
                        </button>
                        {/* Photo */}
                        <div className="mx-auto mb-1" style={{
                          width: '50px', height: '50px', borderRadius: '50%',
                          overflow: 'hidden', background: '#e9ecef',
                          border: recommended?.id === manager.id ? '3px solid #28a745' : '2px solid #dee2e6'
                        }}>
                          {manager.profilePhoto ? (
                            <img src={manager.profilePhoto} alt={manager.businessName} loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '100%', height: '100%', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.2rem', fontWeight: 'bold', color: '#6c757d'
                            }}>
                              {manager.businessName?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
                          {manager.businessName}
                          {recommended?.id === manager.id && (
                            <Badge bg="success" className="ms-1" style={{ fontSize: '0.6rem' }}>BEST</Badge>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Overall Score */}
                  {comparisonData && (
                    <tr style={{ background: '#f0f7ff' }}>
                      <td className="text-start fw-bold">
                        <FaTrophy className="me-2 text-warning" />
                        Overall Score
                      </td>
                      {displayManagers.map(manager => (
                        <td key={manager.id}>
                          <div className="fw-bold mb-1" style={{ fontSize: '1.1rem', color: recommended?.id === manager.id ? '#28a745' : '#333' }}>
                            {manager.score}/100
                          </div>
                          <ProgressBar
                            now={manager.score}
                            variant={getScoreColor(manager.score)}
                            style={{ height: '8px', borderRadius: '4px' }}
                          />
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Rating */}
                  <tr>
                    <td className="text-start">
                      <FaStar className="me-2" style={{ color: '#fbbf24' }} />
                      Rating
                    </td>
                    {displayManagers.map(manager => (
                      <td key={manager.id} style={{
                        background: getHighestInCategory("rating") === manager.id ? '#fff3cd' : 'transparent'
                      }}>
                        <span className="fw-bold" style={{ fontSize: '1.1rem' }}>
                          {manager.rating?.toFixed(1) || '0.0'}
                        </span>
                        <small className="text-muted d-block">/ 5.0</small>
                        {getHighestInCategory("rating") === manager.id && (
                          <Badge bg="warning" text="dark" style={{ fontSize: '0.6rem' }}>Highest</Badge>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Experience */}
                  <tr>
                    <td className="text-start">
                      <FaClock className="me-2 text-primary" />
                      Experience
                    </td>
                    {displayManagers.map(manager => (
                      <td key={manager.id} style={{
                        background: getHighestInCategory("experience") === manager.id ? '#d1ecf1' : 'transparent'
                      }}>
                        <span className="fw-bold" style={{ fontSize: '1.1rem' }}>
                          {manager.yearsOfExperience?.toFixed(1) || '0.0'}
                        </span>
                        <small className="text-muted d-block">years</small>
                        {getHighestInCategory("experience") === manager.id && (
                          <Badge bg="info" style={{ fontSize: '0.6rem' }}>Most Experienced</Badge>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Past Events */}
                  <tr>
                    <td className="text-start">
                      <FaCalendarAlt className="me-2 text-success" />
                      Past Events
                    </td>
                    {displayManagers.map(manager => (
                      <td key={manager.id} style={{
                        background: getHighestInCategory("events") === manager.id ? '#d4edda' : 'transparent'
                      }}>
                        <span className="fw-bold" style={{ fontSize: '1.1rem' }}>
                          {manager.totalPastEvents || 0}
                        </span>
                        <small className="text-muted d-block">events completed</small>
                        {getHighestInCategory("events") === manager.id && (
                          <Badge bg="success" style={{ fontSize: '0.6rem' }}>Most Events</Badge>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Reviews Count */}
                  <tr>
                    <td className="text-start">
                      <FaUsers className="me-2 text-secondary" />
                      Reviews
                    </td>
                    {displayManagers.map(manager => (
                      <td key={manager.id} style={{
                        background: getHighestInCategory("reviews") === manager.id ? '#e2e3e5' : 'transparent'
                      }}>
                        <span className="fw-bold" style={{ fontSize: '1.1rem' }}>
                          {manager.totalReviews || 0}
                        </span>
                        <small className="text-muted d-block">total reviews</small>
                        {getHighestInCategory("reviews") === manager.id && (
                          <Badge bg="secondary" style={{ fontSize: '0.6rem' }}>Most Reviewed</Badge>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Service Areas */}
                  <tr>
                    <td className="text-start">
                      <FaMapMarkerAlt className="me-2 text-danger" />
                      Service Areas
                    </td>
                    {displayManagers.map(manager => (
                      <td key={manager.id}>
                        <div className="d-flex flex-wrap justify-content-center gap-1">
                          {(manager.serviceAreas || []).slice(0, 3).map(area => (
                            <Badge key={area} bg="light" text="dark" style={{ fontSize: '0.7rem' }}>
                              {area}
                            </Badge>
                          ))}
                          {(manager.serviceAreas || []).length > 3 && (
                            <small className="text-muted">+{manager.serviceAreas.length - 3} more</small>
                          )}
                          {(!manager.serviceAreas || manager.serviceAreas.length === 0) && (
                            <small className="text-muted">Not specified</small>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Business Types */}
                  <tr>
                    <td className="text-start">
                      📋 Specializations
                    </td>
                    {displayManagers.map(manager => (
                      <td key={manager.id}>
                        <div className="d-flex flex-wrap justify-content-center gap-1">
                          {(manager.businessTypes || []).slice(0, 3).map(type => (
                            <Badge key={type} bg="primary" style={{ fontSize: '0.65rem' }}>
                              {type}
                            </Badge>
                          ))}
                          {(manager.businessTypes || []).length > 3 && (
                            <small className="text-muted d-block">+{manager.businessTypes.length - 3} more</small>
                          )}
                          {(!manager.businessTypes || manager.businessTypes.length === 0) && (
                            <small className="text-muted">Not specified</small>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Score Breakdown (if available) */}
                  {comparisonData && (
                    <tr style={{ background: '#f8f9fa' }}>
                      <td className="text-start fw-bold">
                        📊 Score Breakdown
                      </td>
                      {displayManagers.map(manager => (
                        <td key={manager.id}>
                          {manager.breakdown && (
                            <div className="text-start" style={{ fontSize: '0.75rem' }}>
                              <div className="d-flex justify-content-between mb-1">
                                <span>Rating:</span>
                                <span className="fw-bold">{manager.breakdown.rating}/35</span>
                              </div>
                              <div className="d-flex justify-content-between mb-1">
                                <span>Experience:</span>
                                <span className="fw-bold">{manager.breakdown.experience}/25</span>
                              </div>
                              <div className="d-flex justify-content-between mb-1">
                                <span>Past Events:</span>
                                <span className="fw-bold">{manager.breakdown.pastEvents}/20</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span>Reviews:</span>
                                <span className="fw-bold">{manager.breakdown.reviews}/20</span>
                              </div>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Scoring Methodology Note */}
            {comparisonData && (
              <div className="mt-3 p-3" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.8rem' }}>
                <strong>How we score:</strong> Rating (35%) + Experience (25%) + Past Events (20%) + Reviews (20%) = Overall Score.
                Each factor is normalized against the best performer in the comparison group.
              </div>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </Modal.Footer>
    </Modal>
  );
}
