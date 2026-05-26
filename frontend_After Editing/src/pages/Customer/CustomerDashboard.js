import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Spinner,
  Modal,
  Badge,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaStar,
  FaRupeeSign,
  FaEye,
  FaInfoCircle,
  FaDownload,
} from "react-icons/fa";
import AppNavbar from "../../components/Navbar";
import API from "../../services/api";
import Chatbot from "../../Chatbot.js";
import { generateInvoicePDF } from "../../utils/generateInvoice";
import { toast } from "react-toastify";

// Customer dashboard with booking stats, recent bookings table, and quick actions
export default function CustomerDashboard() {
  const [verifiedManagers, setVerifiedManagers] = useState([]);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalSpent: 0,
    completedEvents: 0,
    upcomingEvents: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!u || !token) {
      navigate("/login");
    } else {
      setUser(u);
      fetchBookings();
      fetchVerifiedManagers();
    }
  }, []);

  const fetchVerifiedManagers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/admin/verified");
      setVerifiedManagers(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching verified managers:", err);
      setError("Failed to load verified managers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Fetches all bookings and calculates dashboard stats
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await API.get("/booking/my-bookings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const bookingsData = response.data || [];
      setBookings(bookingsData);

      const totalSpent = bookingsData.reduce(
        (sum, b) => sum + (parseFloat(b.totalPrice) || 0),
        0,
      );
      const completedEvents = bookingsData.filter(
        (b) => b.status === "completed",
      ).length;
      const upcomingEvents = bookingsData.filter(
        (b) => b.status === "pending" || b.status === "confirmed",
      ).length;

      setStats({
        totalBookings: bookingsData.length,
        totalSpent: totalSpent,
        completedEvents: completedEvents,
        upcomingEvents: upcomingEvents,
      });
    } catch (err) {
      console.error("Error fetching bookings:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetailsForInvoice = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await API.get(`/booking/details/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching booking details:", err);
      throw err;
    }
  };

  const handleDownloadInvoice = async (booking) => {
    setDownloading(true);
    try {
      const bookingData = await fetchBookingDetailsForInvoice(booking.id);
      await generateInvoicePDF(bookingData, user, 'customer');
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      console.error("Error downloading invoice:", err);
      toast.error("Failed to download invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleViewInvoice = async (booking) => {
    setDownloading(true);
    try {
      const bookingData = await fetchBookingDetailsForInvoice(booking.id);
      setInvoiceData(bookingData);
      setShowInvoiceModal(true);
    } catch (err) {
      console.error("Error loading invoice:", err);
      toast.error("Failed to load invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleStatClick = (type) => {
    if (type === "total") {
      setFilterStatus(null);
      setShowAllBookings(true);
    } else if (type === "upcoming") {
      setFilterStatus(["pending", "confirmed"]);
      setShowAllBookings(true);
    } else if (type === "completed") {
      setFilterStatus(["completed"]);
      setShowAllBookings(true);
    }

    document
      .getElementById("bookings-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const getFilteredBookings = () => {
    if (!filterStatus) return bookings;
    return bookings.filter((booking) => filterStatus.includes(booking.status));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return {
          class: "status-pending",
          text: "⏳ Pending",
          variant: "warning",
        };
      case "confirmed":
        return {
          class: "status-confirmed",
          text: "✅ Confirmed",
          variant: "success",
        };
      case "cancelled":
        return {
          class: "status-cancelled",
          text: "❌ Cancelled",
          variant: "danger",
        };
      case "completed":
        return {
          class: "status-completed",
          text: "🎉 Completed",
          variant: "info",
        };
      default:
        return { class: "status-pending", text: status, variant: "secondary" };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `₹${Math.round(parseFloat(amount) || 0).toLocaleString()}`;
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const displayedBookings = showAllBookings
    ? getFilteredBookings()
    : bookings.slice(0, 5);

  return (
    <>
      <AppNavbar />
      <Chatbot />
      <div className="dashboard">
        <Container fluid>
          <div className="dashboard-header">
            <div>
              <h3 className="dashboard-welcome">Welcome back, <span className="customer-name-highlight">{user?.name || "Customer"}</span>! 👋</h3>
              <p className="dashboard-subtitle">
                Here's what's happening with your events
              </p>
            </div>
            <button
              className="btn-pro btn-pro-complete"
              onClick={() => navigate("/")}
              style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '12px' }}
            >
              Explore More Events →
            </button>
          </div>

          <Row className="mb-4">
            <Col md={3}>
              <Card
                className="stat-card"
                onClick={() => handleStatClick("total")}
              >
                <Card.Body>
                  <div className="stat-icon">
                    <FaCalendarAlt />
                  </div>
                  <h4>{stats.totalBookings}</h4>
                  <p>Total Bookings</p>
                  <small className="stat-hint">Click to view all</small>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card
                className="stat-card"
                onClick={() => handleStatClick("total")}
              >
                <Card.Body>
                  <div className="stat-icon">
                    <FaRupeeSign />
                  </div>
                  <h4>{formatCurrency(stats.totalSpent)}</h4>
                  <p>Total Spent</p>
                  <small className="stat-hint">Click to view all</small>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card
                className="stat-card"
                onClick={() => handleStatClick("upcoming")}
              >
                <Card.Body>
                  <div className="stat-icon">
                    <FaStar />
                  </div>
                  <h4>{stats.upcomingEvents}</h4>
                  <p>Upcoming Events</p>
                  <small className="stat-hint">Click to view upcoming</small>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card
                className="stat-card"
                onClick={() => handleStatClick("completed")}
              >
                <Card.Body>
                  <div className="stat-icon">
                    <FaCalendarAlt />
                  </div>
                  <h4>{stats.completedEvents}</h4>
                  <p>Completed Events</p>
                  <small className="stat-hint">Click to view completed</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div id="bookings-section">
            <Card className="bookings-card">
              <Card.Body>
                <div className="card-header-custom">
                  <h5>
                    {showAllBookings
                      ? filterStatus
                        ? filterStatus.includes("pending")
                          ? "📅 Upcoming Events"
                          : filterStatus.includes("completed")
                            ? "✅ Completed Events"
                            : "📋 All Bookings"
                        : "📋 All Bookings"
                      : "📅 Recent Bookings"}
                  </h5>
                  <div className="header-buttons">
                    {showAllBookings && (
                      <Button
                        variant="link"
                        onClick={() => {
                          setShowAllBookings(false);
                          setFilterStatus(null);
                        }}
                        className="view-all-btn"
                      >
                        Show Recent ←
                      </Button>
                    )}
                    {!showAllBookings && bookings.length > 0 && (
                      <Button
                        variant="link"
                        onClick={() => handleStatClick("total")}
                        className="view-all-btn"
                      >
                        View All →
                      </Button>
                    )}
                  </div>
                </div>

                <Table hover responsive className="bookings-table">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Event Date</th>
                      <th>Guests</th>
                      <th>Total Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <Spinner animation="border" variant="primary" />
                          <p className="mt-2">Loading your bookings...</p>
                        </td>
                      </tr>
                    ) : displayedBookings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <div className="empty-state">
                            <FaCalendarAlt size={50} color="#ccc" />
                            <h6 className="mt-3">No bookings found</h6>
                            <p className="text-muted">
                              {filterStatus
                                ? "No bookings match the selected filter."
                                : "Start exploring events and make your first booking!"}
                            </p>
                            <button
                              className="btn-pro btn-pro-complete"
                              onClick={() => navigate("/")}
                            >
                              Browse Events
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedBookings.map((booking) => {
                        const statusBadge = getStatusBadge(booking.status);
                        return (
                          <tr key={booking.id}>
                            <td className="event-name">
                              <strong>{booking.event?.name || "Event"}</strong>
                              {booking.event?.category && (
                                <small className="event-category">
                                  {booking.event.category}
                                </small>
                              )}
                            </td>
                            <td>{formatDate(booking.eventDate)}</td>
                            <td>{booking.guests || 1} guests</td>
                            <td className="price">
                              {formatCurrency(booking.totalPrice)}
                            </td>
                            <td>
                              <span className={statusBadge.class}>
                                {statusBadge.text}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-pro btn-pro-sm btn-pro-view"
                                  onClick={() => handleViewDetails(booking)}
                                >
                                  <FaEye /> View
                                </button>
                                {(booking.status === "confirmed" || booking.status === "completed") && (
                                  <>
                                    <button
                                      className="btn-pro btn-pro-sm btn-pro-download"
                                      onClick={() => handleDownloadInvoice(booking)}
                                      disabled={downloading}
                                    >
                                      <FaDownload /> {downloading ? '...' : 'PDF'}
                                    </button>
                                    <button
                                      className="btn-pro btn-pro-sm btn-pro-view"
                                      onClick={() => handleViewInvoice(booking)}
                                    >
                                      <FaEye /> Preview
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </div>

          <Row className="mt-4">
            <Col md={6}>
              <Card className="action-card">
                <Card.Body>
                  <div className="action-icon">🎉</div>
                  <h5>Find Your Perfect Event</h5>
                  <p>Browse through our curated list of events and planners</p>
                  <button
                    className="btn-pro btn-pro-complete"
                    onClick={() => navigate("/")}
                  >
                    Explore Events
                  </button>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="action-card">
                <Card.Body>
                  <div className="action-icon">📋</div>
                  <h5>Manage Your Bookings</h5>
                  <p>View all your bookings and track their status</p>
                  <button
                    className="btn-pro btn-pro-view"
                    onClick={() => navigate("/customer/bookings")}
                  >
                    View All Bookings
                  </button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>

        {/* Booking Details Modal */}
        <Modal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          size="lg"
          centered
          className="booking-detail-modal"
        >
          {selectedBooking && (
            <>
              <Modal.Header closeButton>
                <Modal.Title>
                  <FaInfoCircle className="me-2" />
                  Booking Details
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="booking-details">
                  <div className="detail-section">
                    <h5>🎉 Event Summary</h5>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Event Name:</strong>
                        <span>{selectedBooking.event?.name || "Event"}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Category:</strong>
                        <span>
                          {selectedBooking.event?.category || "Not specified"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Event Date:</strong>
                        <span>{formatDate(selectedBooking.eventDate)}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Status:</strong>
                        <Badge
                          bg={getStatusBadge(selectedBooking.status).variant}
                        >
                          {getStatusBadge(selectedBooking.status).text}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h5>👤 Event Manager Details</h5>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Name:</strong>
                        <span>{selectedBooking.manager?.name || "N/A"}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Email:</strong>
                        <span>{selectedBooking.manager?.email || "N/A"}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Mobile:</strong>
                        <span>{selectedBooking.manager?.mobile || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h5>📋 Booking Information</h5>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Booking ID:</strong>
                        <span>#{selectedBooking.id}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Booking Date:</strong>
                        <span>{formatDate(selectedBooking.createdAt)}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Number of Guests:</strong>
                        <span>{selectedBooking.guests || 1}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Total Price:</strong>
                        <span className="price-highlight">
                          {formatCurrency(selectedBooking.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedBooking.selectedAddons &&
                    Object.values(selectedBooking.selectedAddons).some(
                      (v) => v === true,
                    ) && (
                      <div className="detail-section">
                        <h5>✨ Add-ons & Customizations</h5>
                        <div className="addons-list">
                          {selectedBooking.selectedAddons.catering && (
                            <Badge bg="secondary" className="addon-badge">
                              🍽️ Catering
                            </Badge>
                          )}
                          {selectedBooking.selectedAddons.decoration && (
                            <Badge bg="secondary" className="addon-badge">
                              🎨 Decoration
                            </Badge>
                          )}
                          {selectedBooking.selectedAddons.photography && (
                            <Badge bg="secondary" className="addon-badge">
                              📸 Photography
                            </Badge>
                          )}
                          {selectedBooking.selectedAddons.music && (
                            <Badge bg="secondary" className="addon-badge">
                              🎵 Music
                            </Badge>
                          )}
                          {selectedBooking.selectedAddons.transport && (
                            <Badge bg="secondary" className="addon-badge">
                              🚐 Transport
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                  {selectedBooking.specialRequests && (
                    <div className="detail-section">
                      <h5>💬 Special Requests</h5>
                      <p className="special-requests">
                        {selectedBooking.specialRequests}
                      </p>
                    </div>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                {(selectedBooking.status === "confirmed" || selectedBooking.status === "completed") && (
                  <>
                    <button
                      className="btn-pro btn-pro-download"
                      onClick={() => handleDownloadInvoice(selectedBooking)}
                      disabled={downloading}
                    >
                      <FaDownload /> {downloading ? 'Generating...' : 'Download Invoice'}
                    </button>
                    <button
                      className="btn-pro btn-pro-view"
                      onClick={() => handleViewInvoice(selectedBooking)}
                    >
                      <FaEye /> Preview Invoice
                    </button>
                  </>
                )}
                <button
                  className="btn-pro btn-pro-toggle"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </Modal.Footer>
            </>
          )}
        </Modal>

        {/* Invoice Preview Modal */}
        <Modal
          show={showInvoiceModal}
          onHide={() => setShowInvoiceModal(false)}
          size="lg"
          centered
          className="invoice-preview-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <FaDownload className="me-2" />
              Invoice Preview
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {invoiceData && (
              <div className="invoice-preview">
                <div style={{ padding: '20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: '#6366f1' }}>EVENTHUB INVOICE</h2>
                    <hr />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <h4>Invoice To:</h4>
                      <p><strong>{user?.name}</strong></p>
                      <p>{user?.email}</p>
                      <p>{user?.mobile}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h4>Invoice Details:</h4>
                      <p><strong>Invoice #:</strong> INV-{invoiceData.id}</p>
                      <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                      <p><strong>Booking ID:</strong> #{invoiceData.id}</p>
                    </div>
                  </div>

                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h4>Event Details</h4>
                    <p><strong>Event:</strong> {invoiceData.event?.name}</p>
                    <p><strong>Date:</strong> {formatDate(invoiceData.eventDate)}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <h4>Price Breakdown</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px' }}>Base Price</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(invoiceData.event?.price)}</td>
                        </tr>
                        {invoiceData.selectedAddons && Object.entries(invoiceData.selectedAddons).map(([key, value]) => {
                          if (value && invoiceData.event?.addonPrices?.[key]) {
                            return (
                              <tr key={key} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px' }}>{key.charAt(0).toUpperCase() + key.slice(1)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>+ {formatCurrency(invoiceData.event.addonPrices[key])}</td>
                              </tr>
                            );
                          }
                          return null;
                        })}
                        <tr style={{ background: '#fef3c7', fontWeight: 'bold' }}>
                          <td style={{ padding: '8px' }}>Total Amount</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(invoiceData.totalPrice)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #eee' }}>
                    <p>Thank you for choosing EventHub!</p>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button 
              className="btn-pro btn-pro-download"
              onClick={() => {
                if (invoiceData) {
                  generateInvoicePDF(invoiceData);
                  setShowInvoiceModal(false);
                }
              }}
            >
              <FaDownload /> Download PDF
            </button>
            <button className="btn-pro btn-pro-toggle" onClick={() => setShowInvoiceModal(false)}>
              Close
            </button>
          </Modal.Footer>
        </Modal>

        <style>{`
          .dashboard {
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f7fb 0%, #f0f2f6 100%);
            padding: 30px;
          }

          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            padding: 25px 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(99, 102, 241, 0.3);
          }

          .dashboard-welcome {
            margin: 0;
            color: #ffffff;
            font-weight: 700;
            font-size: 24px;
          }

          .customer-name-highlight {
            color: #fbbf24;
            font-weight: 800;
          }

          .dashboard-subtitle {
            color: rgba(255, 255, 255, 0.8);
            margin: 5px 0 0 0;
            font-size: 14px;
          }

          .dashboard-header h3 {
            margin: 0;
            color: #ffffff;
            font-weight: 700;
          }

          .stat-card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }

          .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          }

          .stat-card:active {
            transform: translateY(-2px);
          }

          .stat-hint {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 8px;
            display: block;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .stat-card:hover .stat-hint {
            opacity: 1;
          }

          .stat-icon {
            font-size: 30px;
            color: #6366f1;
            margin-bottom: 10px;
          }

          .stat-card h4 {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 10px 0 5px 0;
          }

          .stat-card p {
            color: #6b7280;
            margin: 0;
            font-size: 14px;
          }

          .bookings-card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            overflow: hidden;
          }

          .card-header-custom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
          }

          .card-header-custom h5 {
            margin: 0;
            font-weight: 600;
            color: #1f2937;
          }

          .header-buttons {
            display: flex;
            gap: 10px;
          }

          .view-all-btn {
            color: #6366f1;
            text-decoration: none;
            font-weight: 500;
          }

          .view-all-btn:hover {
            text-decoration: underline;
          }

          .bookings-table {
            margin-bottom: 0;
          }

          .bookings-table thead th {
            border-bottom: 2px solid #e5e7eb;
            color: #6b7280;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px;
          }

          .bookings-table tbody td {
            vertical-align: middle;
            padding: 15px 12px;
          }

          .event-name {
            display: flex;
            flex-direction: column;
          }

          .event-category {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
          }

          .price {
            font-weight: 600;
            color: #10b981;
          }

          .action-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .view-details-btn, .download-btn, .preview-btn {
            padding: 4px 10px;
            font-size: 12px;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
          }

          .status-pending {
            background: #fef3c7;
            color: #d97706;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
          }

          .status-confirmed {
            background: #d1fae5;
            color: #059669;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
          }

          .status-cancelled {
            background: #fee2e2;
            color: #dc2626;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
          }

          .status-completed {
            background: #dbeafe;
            color: #2563eb;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
          }

          .action-card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
            text-align: center;
            padding: 20px;
            cursor: pointer;
          }

          .action-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }

          .action-icon {
            font-size: 50px;
            margin-bottom: 15px;
          }

          .action-card h5 {
            font-weight: 600;
            margin-bottom: 10px;
          }

          .action-card p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 20px;
          }

          .action-btn {
            padding: 8px 25px;
            border-radius: 8px;
          }

          .empty-state {
            text-align: center;
            padding: 40px;
          }

          /* Modal Styles */
          .booking-detail-modal .modal-content,
          .invoice-preview-modal .modal-content {
            border-radius: 20px;
            overflow: hidden;
          }

          .booking-details {
            max-height: 60vh;
            overflow-y: auto;
            padding-right: 5px;
          }

          .detail-section {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
          }

          .detail-section:last-child {
            border-bottom: none;
          }

          .detail-section h5 {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .detail-item strong {
            color: #6b7280;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }

          .detail-item span {
            color: #1f2937;
            font-size: 14px;
            font-weight: 500;
          }

          .price-highlight {
            color: #10b981;
            font-size: 18px;
            font-weight: 700;
          }

          .addons-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .addon-badge {
            padding: 8px 15px;
            font-size: 13px;
            border-radius: 25px;
            background: #f3f4f6;
            color: #374151;
          }

          .special-requests {
            background: #f9fafb;
            padding: 12px;
            border-radius: 10px;
            color: #4b5563;
            font-style: italic;
          }

          .invoice-preview {
            max-height: 70vh;
            overflow-y: auto;
            background: white;
          }

          /* Dark Mode */
          body.dark-mode .dashboard {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
            color: #e2e8f0;
          }

          body.dark-mode .dashboard-header {
            background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
            box-shadow: 0 5px 20px rgba(79, 70, 229, 0.4) !important;
          }

          body.dark-mode .dashboard-header h3,
          body.dark-mode .dashboard-welcome {
            color: #ffffff !important;
          }

          body.dark-mode .customer-name-highlight {
            color: #fbbf24 !important;
          }

          body.dark-mode .dashboard-subtitle {
            color: rgba(255, 255, 255, 0.75) !important;
          }

          body.dark-mode .stat-card {
            background: #1e293b !important;
            border-color: #374151 !important;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3) !important;
          }

          body.dark-mode .stat-card .card-body {
            background: #1e293b !important;
          }

          body.dark-mode .stat-card h4 {
            color: #f1f5f9 !important;
          }

          body.dark-mode .stat-card h2 {
            color: #f1f5f9 !important;
          }

          body.dark-mode .stat-card p {
            color: #94a3b8 !important;
          }

          body.dark-mode .stat-card h6 {
            color: #94a3b8 !important;
          }

          body.dark-mode .stat-hint {
            color: #64748b !important;
          }

          body.dark-mode .bookings-card {
            background: #16213e !important;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3) !important;
            border-color: #374151 !important;
          }

          body.dark-mode .bookings-card .card-body {
            background: #16213e !important;
          }

          body.dark-mode .card-header-custom {
            border-color: #374151 !important;
          }

          body.dark-mode .card-header-custom h5 {
            color: #f1f5f9 !important;
          }

          body.dark-mode .bookings-table thead th {
            background: #1e293b;
            border-color: #374151;
            color: #94a3b8;
          }

          body.dark-mode .bookings-table tbody td {
            border-color: #374151;
            color: #e2e8f0;
          }

          body.dark-mode .bookings-table tbody tr:hover {
            background: #1e293b;
          }

          body.dark-mode .event-category {
            color: #94a3b8 !important;
          }

          body.dark-mode .view-all-btn {
            color: #818cf8 !important;
          }

          body.dark-mode .status-pending {
            background: #3d2e0a !important;
            color: #fcd34d !important;
          }

          body.dark-mode .status-confirmed {
            background: #14332a !important;
            color: #6ee7b7 !important;
          }

          body.dark-mode .status-cancelled {
            background: #3b1c1c !important;
            color: #fca5a5 !important;
          }

          body.dark-mode .status-completed {
            background: #1e2a5e !important;
            color: #93c5fd !important;
          }

          body.dark-mode .action-card {
            background: #16213e !important;
            border-color: #374151 !important;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3) !important;
          }

          body.dark-mode .action-card .card-body {
            background: #16213e !important;
          }

          body.dark-mode .action-card h5 {
            color: #f1f5f9 !important;
          }

          body.dark-mode .action-card p {
            color: #94a3b8 !important;
          }

          body.dark-mode .detail-section-title {
            color: #f1f5f9 !important;
          }

          body.dark-mode .detail-section {
            border-color: #374151 !important;
          }

          body.dark-mode .detail-item strong {
            color: #94a3b8 !important;
          }

          body.dark-mode .detail-item span {
            color: #e2e8f0 !important;
          }

          body.dark-mode .addon-tag {
            background: #334155 !important;
            color: #e2e8f0 !important;
          }

          body.dark-mode .special-requests {
            color: #94a3b8 !important;
            background: #1e293b !important;
          }

          body.dark-mode .invoice-preview {
            background: #16213e !important;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .dashboard {
              padding: 15px;
            }

            .dashboard-header {
              flex-direction: column;
              gap: 15px;
              text-align: center;
            }

            .stat-card h4 {
              font-size: 22px;
            }

            .bookings-table {
              font-size: 12px;
            }

            .bookings-table thead th,
            .bookings-table tbody td {
              padding: 8px 6px;
            }

            .action-card {
              margin-bottom: 15px;
            }

            .detail-grid {
              grid-template-columns: 1fr;
            }

            .action-buttons {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </>
  );
}