import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Spinner,
  Form,
  Row,
  Col,
  InputGroup,
  Pagination,
} from "react-bootstrap";
import {
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaSearch
} from "react-icons/fa";
import API from "../../services/api";
import AddEditEventModal from "./AddEditEventModal";

// Events management tab with search, filters, and CRUD actions for event listings
export default function EventsTab({
  events,
  loading,
  bookings,
  fetchEvents,
  showToast,
  externalFilter,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    search: "",
    minPrice: "",
    maxPrice: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleFilterEvents = (event) => {
      const { value } = event.detail;
      if (value === "all") {
        setFilters((prev) => ({ ...prev, category: "all", status: "all" }));
      }
    };

    window.addEventListener("filterEvents", handleFilterEvents);
    return () => window.removeEventListener("filterEvents", handleFilterEvents);
  }, []);


  useEffect(() => {
    if (externalFilter === "all") {
      setFilters((prev) => ({ ...prev, category: "all", status: "all" }));
    }
  }, [externalFilter]);


  useEffect(() => {
    const handleOpenModal = () => setShowModal(true);
    window.addEventListener("openAddEventModal", handleOpenModal);
    return () =>
      window.removeEventListener("openAddEventModal", handleOpenModal);
  }, []);

  const getCategoryBadge = (category) => {
    const categoryLabels = {
      event: "🎉 General Event",
      birthday: "🎂 Birthday Event",
      wedding: "💒 Wedding Plan",
      anniversary: "✨ Anniversary",
      corporate: "🏢 Corporate Event",
      conference: "🎤 Conference",
      engagement: "💍 Engagement",
      "baby-shower": "👶 Baby Shower",
      graduation: "🎓 Graduation",
      reunion: "👨‍👩‍👧‍👦 Reunion",
      holiday: "🎄 Holiday Party",
      fundraiser: "🤝 Fundraiser",
      concert: "🎵 Concert",
      sports: "⚽ Sports Event",
      exhibition: "🖼️ Exhibition",
      workshop: "📚 Workshop",
      "product-launch": "🚀 Product Launch",
      "house-party": "🏠 House Party",
      "bridal-shower": "👰 Bridal Shower",
      bachelorette: "🎊 Bachelorette",
      reception: "💐 Reception",
      meeting: "📋 Meeting",
      gala: "🌟 Gala Dinner",
      festival: "🎪 Festival",
    };
    const label = categoryLabels[category] || `🎉 ${category || "General Event"}`;
    return <span className="badge-pro badge-category-general">{label}</span>;
  };

  // Permanently deletes an event after user confirmation
  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event? This action cannot be undone."))
      return;
    try {
      await API.delete(`/event/event/${id}`);
      showToast("Event deleted successfully!", "success");
      fetchEvents();
    } catch (err) {
      showToast("Failed to delete event", "error");
    }
  };

  // Toggles an event between available and unavailable
  const toggleStatus = async (event) => {
    try {
      await API.put(`/event/toggle-status/${event.id}`);
      showToast(
        `Event status updated to ${event.status === "available" ? "unavailable" : "available"}`,
        "success",
      );
      fetchEvents();
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  const getFilteredEvents = () => {
    let filtered = [...events];
    if (filters.category !== "all")
      filtered = filtered.filter((e) => e.category === filters.category);
    if (filters.status !== "all")
      filtered = filtered.filter((e) => e.status === filters.status);
    if (filters.search)
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(filters.search.toLowerCase()),
      );
    if (filters.minPrice)
      filtered = filtered.filter(
        (e) => e.price >= parseFloat(filters.minPrice),
      );
    if (filters.maxPrice)
      filtered = filtered.filter(
        (e) => e.price <= parseFloat(filters.maxPrice),
      );
    return filtered;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEvents = getFilteredEvents().slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(getFilteredEvents().length / itemsPerPage);

  return (
    <>
      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search events..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                >
                  <option value="all">All Categories</option>
                  <option value="event">General Events</option>
                  <option value="birthday">Birthday Parties</option>
                  <option value="wedding">Wedding Plans</option>
                  <option value="anniversary">Anniversary Celebration</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="conference">Conference / Seminar</option>
                  <option value="engagement">Engagement Party</option>
                  <option value="baby-shower">Baby Shower</option>
                  <option value="graduation">Graduation Party</option>
                  <option value="reunion">Family Reunion</option>
                  <option value="holiday">Holiday Party</option>
                  <option value="fundraiser">Fundraiser / Charity</option>
                  <option value="concert">Concert / Live Music</option>
                  <option value="sports">Sports Event</option>
                  <option value="exhibition">Exhibition / Trade Show</option>
                  <option value="workshop">Workshop / Training</option>
                  <option value="product-launch">Product Launch</option>
                  <option value="house-party">House Party</option>
                  <option value="bridal-shower">Bridal Shower</option>
                  <option value="bachelorette">Bachelorette / Bachelor Party</option>
                  <option value="reception">Wedding Reception</option>
                  <option value="meeting">Business Meeting</option>
                  <option value="gala">Gala Dinner</option>
                  <option value="festival">Festival / Cultural Event</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Price Range</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, minPrice: e.target.value })
                    }
                  />
                  <Form.Control
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Events Table */}
      <Card>
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Image</th>
                  <th>Event Details</th>
                  <th>Category</th>
                  <th>Pricing</th>
                  <th>Bookings</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <Spinner animation="border" />
                    </td>
                  </tr>
                ) : currentEvents.length > 0 ? (
                  currentEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <img
                          src={event.images?.[0] || event.image || "/placeholder-event.jpg"}
                          width="60"
                          height="60"
                          style={{ objectFit: "cover", borderRadius: "8px" }}
                          alt={event.name}
                        />
                        {event.images?.length > 1 && (
                          <small className="d-block text-muted text-center" style={{ fontSize: "10px" }}>
                            +{event.images.length - 1} more
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{event.name}</strong>
                        <br />
                        <small className="text-muted">
                          {event.duration || "Flexible duration"} | Max{" "}
                          {event.maxGuests || "Unlimited"} guests
                        </small>
                      </td>
                      <td>{getCategoryBadge(event.category)}</td>
                      <td>
                        <strong>₹{event.price.toLocaleString()}</strong>
                        <br />
                        <small className="text-muted">Base price</small>
                      </td>
                      <td>
                        <span className="badge-pro badge-count">
                          {
                            bookings.filter((b) => b.eventId === event.id)
                              .length
                          }{" "}
                          bookings
                        </span>
                      </td>
                      <td>
                        <span className={`badge-pro ${event.status === "available" ? "badge-status-available" : "badge-status-unavailable"}`}>
                          {event.status === "available" ? "✓ Available" : "Unavailable"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn-pro btn-pro-sm btn-pro-edit"
                            onClick={() => {
                              setEditingEvent(event);
                              setShowModal(true);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn-pro btn-pro-sm btn-pro-toggle"
                            onClick={() => toggleStatus(event)}
                          >
                            {event.status === "available" ? (
                              <FaToggleOn />
                            ) : (
                              <FaToggleOff />
                            )}
                          </button>
                          <button
                            className="btn-pro btn-pro-sm btn-pro-delete"
                            onClick={() => deleteEvent(event.id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="text-muted">
                        <h5>No events found</h5>
                        <p>Click "Add New Event" to get started!</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.Prev
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                />
                {[...Array(totalPages)].map((_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === currentPage}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      <AddEditEventModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setEditingEvent(null);
        }}
        editingEvent={editingEvent}
        onSuccess={fetchEvents}
        showToast={showToast}
      />
    </>
  );
}
