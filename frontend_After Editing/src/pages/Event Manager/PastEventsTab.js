import { useState, useEffect } from "react";
import { Card, Button, Spinner, Row, Col, Badge } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaPlay, FaCalendarAlt, FaImage } from "react-icons/fa";
import API from "../../services/api";
import AddPastEventForm from "./AddPastEventForm";

// Portfolio tab for managing past events with photos, videos, and descriptions
export default function PastEventsTab({ showToast }) {
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    fetchPastEvents();
  }, []);

  const fetchPastEvents = async () => {
    try {
      setLoading(true);
      // Get manager profile which contains pastEvents
      const res = await API.get("/profile");
      const managerProfile = res.data?.data?.managerProfile;
      setPastEvents(managerProfile?.pastEvents || []);
    } catch (err) {
      console.error("Error fetching past events:", err);
      showToast("Failed to load past events", "error");
    } finally {
      setLoading(false);
    }
  };

  // Deletes a past event from the portfolio after confirmation
  const handleDelete = async (index) => {
    if (!window.confirm("Are you sure you want to delete this past event? This action cannot be undone.")) {
      return;
    }

    setDeleting(index);
    try {
      const event = pastEvents[index];
      const eventId = event?.addedAt ? `?eventId=${encodeURIComponent(event.addedAt)}` : '';
      await API.delete(`/manager/past-events/${index}${eventId}`);
      showToast("Past event deleted successfully!", "success");
      fetchPastEvents();
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.response?.data?.message || "Failed to delete past event", "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (event, index) => {
    setEditingEvent(event);
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleAddNew = () => {
    setEditingEvent(null);
    setEditingIndex(null);
    setShowAddForm(true);
  };

  const handleFormSuccess = () => {
    fetchPastEvents();
    showToast(editingEvent ? "Past event updated!" : "Past event added!", "success");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading past events...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <Card className="mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h5 className="mb-1 fw-bold">
              <FaCalendarAlt className="me-2 text-primary" />
              Past Events Portfolio
            </h5>
            <p className="text-muted mb-0 small">
              Showcase your previous work to attract new customers. {pastEvents.length} event{pastEvents.length !== 1 ? "s" : ""} added.
            </p>
          </div>
          <Button variant="primary" onClick={handleAddNew} style={{ borderRadius: "10px" }}>
            <FaPlus className="me-1" /> Add Past Event
          </Button>
        </Card.Body>
      </Card>

      {/* Events Grid */}
      {pastEvents.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📸</div>
            <h5 className="fw-bold">No Past Events Yet</h5>
            <p className="text-muted mb-3">
              Add your previous events with photos and videos to build your portfolio.
            </p>
            <Button variant="primary" onClick={handleAddNew} style={{ borderRadius: "10px" }}>
              <FaPlus className="me-1" /> Add Your First Event
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {pastEvents.map((event, index) => (
            <Col md={6} lg={4} key={index}>
              <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "14px", overflow: "hidden" }}>
                {/* Media Preview */}
                <div style={{ height: "160px", background: "#f3f4f6", position: "relative" }}>
                  {event.media && event.media.length > 0 ? (
                    <>
                      {event.media[0].mediaType === "video" ? (
                        <div style={{
                          width: "100%", height: "100%", background: "#1a1a2e",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <FaPlay style={{ color: "#fff", fontSize: "2rem" }} />
                        </div>
                      ) : (
                        <img
                          src={event.media[0].thumbnailUrl || event.media[0].url}
                          alt={event.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                      {event.media.length > 1 && (
                        <Badge
                          bg="dark"
                          style={{
                            position: "absolute", bottom: "8px", right: "8px",
                            borderRadius: "8px", fontSize: "11px"
                          }}
                        >
                          <FaImage className="me-1" />{event.media.length}
                        </Badge>
                      )}
                    </>
                  ) : event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#9ca3af"
                    }}>
                      <FaImage size={32} />
                    </div>
                  )}
                  {event.source === "verification" && (
                    <Badge
                      bg="info"
                      style={{
                        position: "absolute", top: "8px", left: "8px",
                        borderRadius: "8px", fontSize: "10px"
                      }}
                    >
                      From Verification
                    </Badge>
                  )}
                </div>

                <Card.Body className="d-flex flex-column">
                  <h6 className="fw-bold mb-1" style={{ fontSize: "14px" }}>{event.title}</h6>
                  <p className="text-muted small mb-2" style={{
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
                  }}>
                    {event.description}
                  </p>
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">
                        <FaCalendarAlt className="me-1" />{formatDate(event.date)}
                      </small>
                      {event.cost && (
                        <small className="text-success fw-bold">₹{Number(event.cost).toLocaleString()}</small>
                      )}
                    </div>
                    {event.clientName && (
                      <small className="text-muted d-block mb-2">Client: {event.clientName}</small>
                    )}
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEdit(event, index)}
                        style={{ borderRadius: "8px", flex: 1 }}
                      >
                        <FaEdit className="me-1" /> Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(index)}
                        disabled={deleting === index}
                        style={{ borderRadius: "8px", flex: 1 }}
                      >
                        {deleting === index ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <><FaTrash className="me-1" /> Delete</>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Add/Edit Form Modal */}
      <AddPastEventForm
        show={showAddForm}
        onHide={() => {
          setShowAddForm(false);
          setEditingEvent(null);
          setEditingIndex(null);
        }}
        onSuccess={handleFormSuccess}
        editEvent={editingEvent}
        editIndex={editingIndex}
      />
    </>
  );
}
