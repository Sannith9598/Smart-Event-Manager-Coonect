import { useState, useEffect } from "react";
import { Card, Spinner, Alert, Form, Button } from "react-bootstrap";
import { FaStar, FaReply } from "react-icons/fa";
import { motion } from "framer-motion";
import API from "../../services/api";

export default function ReviewsTab({ showToast }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerProfileId, setManagerProfileId] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchManagerProfile();
  }, []);

  const fetchManagerProfile = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const res = await API.get("/manager");
      const profiles = res.data || [];
      const myProfile = profiles.find(p => p.userId === user.id);
      if (myProfile) {
        setManagerProfileId(myProfile.id);
        fetchReviews(myProfile.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching manager profile:", err);
      setLoading(false);
    }
  };

  const fetchReviews = async (profileId) => {
    try {
      setLoading(true);
      const res = await API.get(`/review/${profileId}`);
      setReviews(res.data || []);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (reviewId) => {
    if (!responseText.trim()) {
      showToast("Please enter a response", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await API.put(`/review/${reviewId}/respond`, { response: responseText.trim() });
      showToast("Response added successfully!", "success");
      setRespondingTo(null);
      setResponseText("");
      if (managerProfileId) fetchReviews(managerProfileId);
    } catch (err) {
      console.error("Error responding to review:", err);
      showToast(err.response?.data?.message || "Failed to add response", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="d-flex gap-4 mb-4 flex-wrap">
        <Card className="border-0 shadow-sm" style={{ borderRadius: "14px", minWidth: "150px" }}>
          <Card.Body className="text-center">
            <h2 style={{ color: "#f59e0b" }}>⭐ {getAverageRating()}</h2>
            <small className="text-muted">Average Rating</small>
          </Card.Body>
        </Card>
        <Card className="border-0 shadow-sm" style={{ borderRadius: "14px", minWidth: "150px" }}>
          <Card.Body className="text-center">
            <h2 style={{ color: "#6366f1" }}>{reviews.length}</h2>
            <small className="text-muted">Total Reviews</small>
          </Card.Body>
        </Card>
        <Card className="border-0 shadow-sm" style={{ borderRadius: "14px", minWidth: "150px" }}>
          <Card.Body className="text-center">
            <h2 style={{ color: "#10b981" }}>
              {reviews.filter(r => r.managerResponse).length}
            </h2>
            <small className="text-muted">Responded</small>
          </Card.Body>
        </Card>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Alert variant="info" className="text-center">
          No reviews yet. Reviews will appear here once customers rate your services after completing events.
        </Alert>
      ) : (
        reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: "14px" }}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{review.user?.name || "Customer"}</strong>
                    <div className="mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <FaStar
                          key={star}
                          style={{ color: star <= review.rating ? "#f59e0b" : "#e2e8f0", fontSize: "1rem" }}
                        />
                      ))}
                      <span className="ms-2 text-muted" style={{ fontSize: "0.85rem" }}>
                        {review.rating}/5
                      </span>
                    </div>
                  </div>
                  <small className="text-muted">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </small>
                </div>

                {review.comment && (
                  <p className="mt-2 mb-2" style={{ color: "#475569" }}>
                    "{review.comment}"
                  </p>
                )}

                {/* Manager Response */}
                {review.managerResponse ? (
                  <div style={{
                    background: "#f0f9ff",
                    borderLeft: "3px solid #6366f1",
                    padding: "10px 14px",
                    borderRadius: "0 8px 8px 0",
                    marginTop: "10px"
                  }}>
                    <small className="fw-bold" style={{ color: "#6366f1" }}>Your Response:</small>
                    <p className="mb-0 mt-1" style={{ fontSize: "0.9rem" }}>{review.managerResponse}</p>
                    <small className="text-muted">
                      {review.managerRespondedAt && new Date(review.managerRespondedAt).toLocaleDateString()}
                    </small>
                  </div>
                ) : (
                  <>
                    {respondingTo === review.id ? (
                      <div className="mt-3">
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder="Write your response to this review..."
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          maxLength={500}
                        />
                        <div className="d-flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleRespond(review.id)}
                            disabled={submitting || !responseText.trim()}
                          >
                            {submitting ? "Sending..." : "Submit Response"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => { setRespondingTo(null); setResponseText(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="mt-2"
                        onClick={() => { setRespondingTo(review.id); setResponseText(""); }}
                      >
                        <FaReply className="me-1" /> Respond
                      </Button>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}
