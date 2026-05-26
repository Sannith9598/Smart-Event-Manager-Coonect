import { useEffect, useState } from "react";
import {
  Container,
  Spinner,
  Modal,
  Badge
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaInfoCircle,
  FaEye,
  FaDownload,
  FaTicketAlt,
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaReceipt,
  FaRupeeSign,
  FaComments,
  FaStar
} from "react-icons/fa";
import { motion } from "framer-motion";
import AppNavbar from "../../components/Navbar";
import API from "../../services/api";
import { generateInvoicePDF } from "../../utils/generateInvoice";
import { toast } from "react-toastify";
import ConfettiEffect from "../../components/ConfettiEffect";

// Renders the customer's booking history with status filters and invoice downloads
export default function Bookings() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedManagers, setReviewedManagers] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!u || !token) {
      navigate("/login");
    } else {
      setUser(u);
      fetchBookings();
    }
  }, []);

  // Fetches all bookings for the logged-in customer from the API
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await API.get("/booking/my-bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(response.data || []);
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

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  // Opens the review modal for a completed booking
  const handleOpenReview = (booking) => {
    setReviewBooking(booking);
    setReviewRating(0);
    setReviewComment("");
    setShowReviewModal(true);
  };

  // Submits a star rating and comment for the event and manager
  const handleSubmitReview = async () => {
    if (!reviewRating || reviewRating < 1) {
      toast.error("Please select a rating");
      return;
    }
    setSubmittingReview(true);
    try {
      // Submit event review
      await API.post("/review/event", {
        eventId: reviewBooking.eventId,
        bookingId: reviewBooking.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      // Also submit manager review
      try {
        const profileRes = await API.get("/manager");
        const profiles = profileRes.data || [];
        const matchedProfile = profiles.find(p => p.userId === reviewBooking.managerId);

        if (matchedProfile) {
          await API.post("/review", {
            managerId: matchedProfile.id,
            rating: reviewRating,
            comment: reviewComment.trim() || null,
          });
        }
      } catch (managerReviewErr) {
        // Manager review might fail if already reviewed - that's okay
        console.log("Manager review skipped:", managerReviewErr.response?.data?.message);
      }

      toast.success("Review submitted successfully! Thank you for your feedback.");
      setShowReviewModal(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setReviewedManagers(prev => [...prev, reviewBooking.managerId]);
    } catch (err) {
      console.error("Review submission error:", err);
      const msg = err.response?.data?.message || "Failed to submit review";
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Cancels a pending booking after user confirmation
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    try {
      const token = localStorage.getItem("token");
      await API.put(`/booking/cancel/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Booking cancelled successfully!");
      fetchBookings();
      setShowDetailModal(false);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      toast.error(err.response?.data?.message || "Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
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

  // Generates and downloads a PDF invoice for a confirmed/completed booking
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed": return <FaCheckCircle />;
      case "cancelled": return <FaTimesCircle />;
      case "completed": return <FaCheckCircle />;
      default: return <FaHourglassHalf />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `\u20B9${Math.round(parseFloat(amount) || 0).toLocaleString()}`;
  };

  const getBookingStats = () => {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === "confirmed").length;
    const pending = bookings.filter(b => b.status === "pending").length;
    const completed = bookings.filter(b => b.status === "completed").length;
    return { total, confirmed, pending, completed };
  };

  const stats = getBookingStats();

  return (
    <>
      <AppNavbar />
      <ConfettiEffect trigger={showConfetti} />

      <div className="bookings-page">
        <Container>
          {/* Hero Header */}
          <motion.div
            className="bookings-hero"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="hero-content">
              <div className="hero-text">
                <h1><FaCalendarAlt className="me-3" />My Bookings</h1>
                <p>Track, manage, and relive your event experiences</p>
              </div>
              <button className="btn-pro btn-pro-complete hero-btn" onClick={() => navigate("/")}>
                Browse Events &rarr;
              </button>
            </div>
            <div className="hero-decoration">
              <div className="hero-circle hero-circle-1"></div>
              <div className="hero-circle hero-circle-2"></div>
              <div className="hero-circle hero-circle-3"></div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          {bookings.length > 0 && (
            <motion.div
              className="stats-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="stat-card stat-total">
                <div className="stat-icon"><FaTicketAlt /></div>
                <div className="stat-info">
                  <span className="stat-number">{stats.total}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
              <div className="stat-card stat-confirmed">
                <div className="stat-icon"><FaCheckCircle /></div>
                <div className="stat-info">
                  <span className="stat-number">{stats.confirmed}</span>
                  <span className="stat-label">Confirmed</span>
                </div>
              </div>
              <div className="stat-card stat-pending">
                <div className="stat-icon"><FaHourglassHalf /></div>
                <div className="stat-info">
                  <span className="stat-number">{stats.pending}</span>
                  <span className="stat-label">Pending</span>
                </div>
              </div>
              <div className="stat-card stat-completed">
                <div className="stat-icon"><FaCheckCircle /></div>
                <div className="stat-info">
                  <span className="stat-number">{stats.completed}</span>
                  <span className="stat-label">Completed</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Bookings Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {loading ? (
              <div className="loading-state">
                <Spinner animation="border" variant="primary" />
                <h5 className="mt-3">Loading your bookings...</h5>
                <p className="text-muted">Fetching your event history</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="empty-state-modern">
                <div className="empty-illustration">
                  <div className="empty-circle">
                    <FaCalendarAlt size={50} />
                  </div>
                </div>
                <h3>No Bookings Yet</h3>
                <p>Your event journey starts here. Discover amazing events and create unforgettable memories.</p>
                <button className="btn-pro btn-pro-complete" onClick={() => navigate("/")}>
                  Explore Events &rarr;
                </button>
              </div>
            ) : (
              <div className="bookings-grid">
                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    className={`booking-card booking-status-${booking.status}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="booking-card-header">
                      <div className="booking-event-info">
                        <h5>{booking.event?.name || "Event"}</h5>
                        {booking.event?.category && (
                          <span className="booking-category-tag">{booking.event.category}</span>
                        )}
                      </div>
                      <div className={`booking-status-pill status-${booking.status}`}>
                        {getStatusIcon(booking.status)}
                        <span>{booking.status}</span>
                      </div>
                    </div>

                    <div className="booking-card-body">
                      <div className="booking-detail-row">
                        <div className="booking-detail-item">
                          <FaCalendarAlt className="detail-icon" />
                          <div>
                            <small>Event Date</small>
                            <strong>{formatDate(booking.eventDate)}</strong>
                          </div>
                        </div>
                        <div className="booking-detail-item">
                          <FaUsers className="detail-icon" />
                          <div>
                            <small>Guests</small>
                            <strong>{booking.guests || 1}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="booking-detail-row">
                        <div className="booking-detail-item">
                          <FaClock className="detail-icon" />
                          <div>
                            <small>Booked On</small>
                            <strong>{formatDate(booking.createdAt)}</strong>
                          </div>
                        </div>
                        <div className="booking-detail-item price-item">
                          <FaRupeeSign className="detail-icon" />
                          <div>
                            <small>Total</small>
                            <strong className="price-value">{formatCurrency(booking.totalPrice)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="booking-card-footer">
                      <button className="booking-action-btn btn-view-action" onClick={() => handleViewDetails(booking)}>
                        <FaEye /> Details
                      </button>
                      {booking.status !== "cancelled" && booking.status !== "rejected" && (
                        <button
                          className="booking-action-btn btn-chat-action"
                          onClick={() => navigate(`/booking/${booking.id}/chat`)}
                        >
                          <FaComments /> Chat
                        </button>
                      )}
                      {(booking.status === "confirmed" || booking.status === "completed") && (
                        <>
                          <button
                            className="booking-action-btn btn-download-action"
                            onClick={() => handleDownloadInvoice(booking)}
                            disabled={downloading}
                          >
                            <FaDownload /> {downloading ? '...' : 'Invoice'}
                          </button>
                          <button className="booking-action-btn btn-preview-action" onClick={() => handleViewInvoice(booking)}>
                            <FaReceipt /> Preview
                          </button>
                        </>
                      )}
                      {booking.status === "completed" && !reviewedManagers.includes(booking.managerId) && (
                        <button
                          className="booking-action-btn btn-review-action"
                          onClick={() => handleOpenReview(booking)}
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none" }}
                        >
                          <FaStar /> Review
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </Container>
      </div>

      {/* Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
        className="booking-detail-modal"
      >
        {selectedBooking && (
          <>
            <Modal.Header closeButton className="detail-modal-header">
              <Modal.Title>
                <FaInfoCircle className="me-2" />
                Booking Details
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="detail-modal-body">
              <div className="booking-details-modern">
                {/* Status Banner */}
                <div className={`status-banner status-banner-${selectedBooking.status}`}>
                  <div className="status-banner-icon">{getStatusIcon(selectedBooking.status)}</div>
                  <div>
                    <strong>Booking #{selectedBooking.id}</strong>
                    <span className="ms-2">&bull; {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}</span>
                  </div>
                </div>

                {/* Event Info */}
                <div className="detail-section-modern">
                  <div className="section-title-modern">
                    <span className="section-icon">&#127881;</span>
                    Event Summary
                  </div>
                  <div className="detail-grid-modern">
                    <div className="detail-card-item">
                      <label>Event Name</label>
                      <span>{selectedBooking.event?.name || "Event"}</span>
                    </div>
                    <div className="detail-card-item">
                      <label>Category</label>
                      <span>{selectedBooking.event?.category || "Not specified"}</span>
                    </div>
                    <div className="detail-card-item">
                      <label>Event Date</label>
                      <span>{formatDate(selectedBooking.eventDate)}</span>
                    </div>
                    <div className="detail-card-item">
                      <label>Guests</label>
                      <span>{selectedBooking.guests || 1}</span>
                    </div>
                  </div>
                </div>

                {/* Manager Info */}
                <div className="detail-section-modern">
                  <div className="section-title-modern">
                    <span className="section-icon">&#128100;</span>
                    Event Manager
                  </div>
                  <div className="detail-grid-modern">
                    <div className="detail-card-item">
                      <label>Name</label>
                      <span>{selectedBooking.manager?.name || "N/A"}</span>
                    </div>
                    <div className="detail-card-item">
                      <label>Email</label>
                      <span>{selectedBooking.manager?.email || "N/A"}</span>
                    </div>
                    <div className="detail-card-item">
                      <label>Mobile</label>
                      <span>{selectedBooking.manager?.mobile || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                {selectedBooking.selectedAddons && Object.values(selectedBooking.selectedAddons).some(v => v === true) && (
                  <div className="detail-section-modern">
                    <div className="section-title-modern">
                      <span className="section-icon">&#10024;</span>
                      Add-ons & Customizations
                    </div>
                    <div className="addons-modern">
                      {selectedBooking.selectedAddons.catering && <Badge className="addon-pill">&#127869; Catering</Badge>}
                      {selectedBooking.selectedAddons.decoration && <Badge className="addon-pill">&#127912; Decoration</Badge>}
                      {selectedBooking.selectedAddons.photography && <Badge className="addon-pill">&#128248; Photography</Badge>}
                      {selectedBooking.selectedAddons.music && <Badge className="addon-pill">&#127925; Music</Badge>}
                      {selectedBooking.selectedAddons.transport && <Badge className="addon-pill">&#128652; Transport</Badge>}
                    </div>
                  </div>
                )}

                {/* Special Requests */}
                {selectedBooking.specialRequests && (
                  <div className="detail-section-modern">
                    <div className="section-title-modern">
                      <span className="section-icon">&#128172;</span>
                      Special Requests
                    </div>
                    <p className="special-requests-modern">{selectedBooking.specialRequests}</p>
                  </div>
                )}

                {/* Price Breakdown */}
                {selectedBooking.event && (
                  <div className="detail-section-modern price-section-modern">
                    <div className="section-title-modern">
                      <span className="section-icon">&#128176;</span>
                      Price Breakdown
                    </div>
                    <div className="price-breakdown-modern">
                      <div className="price-row-modern">
                        <span>Base Price</span>
                        <span>{formatCurrency(selectedBooking.event.price)}</span>
                      </div>
                      {selectedBooking.selectedAddons && Object.entries(selectedBooking.selectedAddons).map(([key, value]) => {
                        if (value && selectedBooking.event.addonPrices?.[key]) {
                          return (
                            <div className="price-row-modern" key={key}>
                              <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                              <span>+{formatCurrency(selectedBooking.event.addonPrices[key])}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                      {selectedBooking.guests > (selectedBooking.event.maxGuests || 0) && (
                        <div className="price-row-modern">
                          <span>Extra Guests</span>
                          <span>+{formatCurrency((selectedBooking.guests - (selectedBooking.event.maxGuests || 0)) * (selectedBooking.event.perExtraGuestPrice || 0))}</span>
                        </div>
                      )}
                      {parseFloat(selectedBooking.specialRequestPrice || 0) > 0 && (
                        <div className="price-row-modern">
                          <span>Special Request Charges</span>
                          <span>+{formatCurrency(selectedBooking.specialRequestPrice)}</span>
                        </div>
                      )}
                      {parseFloat(selectedBooking.discountAmount || 0) > 0 && (
                        <div className="price-row-modern" style={{ background: '#fef3c7', borderRadius: '8px', padding: '8px 12px' }}>
                          <span style={{ color: '#92400e' }}>🎉 Discount{selectedBooking.discountReason ? ` (${selectedBooking.discountReason})` : ''}</span>
                          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>-{formatCurrency(selectedBooking.discountAmount)}</span>
                        </div>
                      )}
                      <div className="price-row-modern price-total-modern">
                        <strong>Total Amount</strong>
                        <strong>{formatCurrency(selectedBooking.finalPrice || selectedBooking.totalPrice)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer className="detail-modal-footer">
              {selectedBooking.status !== "cancelled" && selectedBooking.status !== "rejected" && (
                <button className="btn-pro btn-pro-chat" onClick={() => { setShowDetailModal(false); navigate(`/booking/${selectedBooking.id}/chat`); }}>
                  <FaComments /> Message Manager
                </button>
              )}
              {selectedBooking.status === "pending" && (
                <button className="btn-pro btn-pro-reject" onClick={() => handleCancelBooking(selectedBooking.id)} disabled={cancelling}>
                  {cancelling ? <Spinner animation="border" size="sm" /> : "Cancel Booking"}
                </button>
              )}
              {(selectedBooking.status === "confirmed" || selectedBooking.status === "completed") && (
                <>
                  <button className="btn-pro btn-pro-download" onClick={() => handleDownloadInvoice(selectedBooking)} disabled={downloading}>
                    <FaDownload /> {downloading ? 'Generating...' : 'Download Invoice'}
                  </button>
                  <button className="btn-pro btn-pro-view" onClick={() => handleViewInvoice(selectedBooking)}>
                    <FaEye /> Preview Invoice
                  </button>
                </>
              )}
              <button className="btn-pro btn-pro-toggle" onClick={() => setShowDetailModal(false)}>
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
          <Modal.Title><FaDownload className="me-2" />Invoice Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {invoiceData && (() => {
            const eventData = invoiceData.event || {};
            const basePrice = parseFloat(eventData.price) || 0;
            const guests = invoiceData.guests || 1;
            const maxGuests = eventData.maxGuests || 0;
            const perExtraGuestPrice = parseFloat(eventData.perExtraGuestPrice) || 0;
            const selectedAddons = invoiceData.selectedAddons || {};
            const addonPrices = eventData.addonPrices || {};
            const selectedCustomAddons = invoiceData.selectedCustomAddons || [];
            const selectedServiceItems = invoiceData.selectedServiceItems || {};
            const addonServices = eventData.addonServices || {};
            const specialRequestPrice = parseFloat(invoiceData.specialRequestPrice) || 0;

            let extraGuestsCost = 0;
            if (maxGuests > 0 && guests > maxGuests) {
              extraGuestsCost = (guests - maxGuests) * perExtraGuestPrice;
            }

            let addonsTotal = 0;
            const addonRows = [];
            if (selectedAddons && typeof selectedAddons === 'object') {
              for (const [key, value] of Object.entries(selectedAddons)) {
                if (value && addonPrices[key]) {
                  const price = parseFloat(addonPrices[key]) || 0;
                  addonsTotal += price;
                  addonRows.push({ label: `${key.charAt(0).toUpperCase() + key.slice(1)} (Flat Rate)`, amount: price });
                }
              }
            }

            let customAddonsTotal = 0;
            const customAddonRows = [];
            if (selectedCustomAddons && selectedCustomAddons.length > 0) {
              for (const addon of selectedCustomAddons) {
                const price = parseFloat(addon.price) || 0;
                customAddonsTotal += price;
                customAddonRows.push({ label: `🎁 ${addon.name}`, amount: price });
              }
            }

            let serviceItemsTotal = 0;
            const serviceRows = [];
            if (selectedServiceItems && typeof selectedServiceItems === 'object') {
              for (const [serviceName, categories] of Object.entries(selectedServiceItems)) {
                const serviceConfig = addonServices[serviceName];
                if (!serviceConfig) continue;
                let serviceTotal = 0;
                for (const [categoryName, items] of Object.entries(categories)) {
                  const category = (serviceConfig.categories || []).find(c => c.name === categoryName);
                  if (!category) continue;
                  for (const selectedItem of items) {
                    const matchingItem = (category.items || []).find(i => i.name === selectedItem.name);
                    if (matchingItem) {
                      const qty = parseInt(selectedItem.quantity) || 1;
                      const rate = parseFloat(matchingItem.rate) || 0;
                      if (serviceName === "catering" && guests > 0) {
                        serviceTotal += rate * qty * guests;
                      } else {
                        serviceTotal += rate * qty;
                      }
                    }
                  }
                }
                if (serviceTotal > 0) {
                  serviceItemsTotal += serviceTotal;
                  const icon = serviceName === "catering" ? "🍽️" : serviceName === "decoration" ? "🎨" : serviceName === "photography" ? "📸" : serviceName === "music" ? "🎵" : serviceName === "transport" ? "🚗" : "🔧";
                  const label = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
                  const note = serviceName === "catering" ? ` (for ${guests} guests)` : "";
                  serviceRows.push({ label: `${icon} ${label}${note}`, amount: serviceTotal });
                }
              }
            }

            const subtotal = basePrice + extraGuestsCost + addonsTotal + customAddonsTotal + serviceItemsTotal + specialRequestPrice;
            const discountAmount = parseFloat(invoiceData.discountAmount) || 0;
            const afterDiscount = subtotal - discountAmount;
            const gstAmount = afterDiscount * 0.05;
            const grandTotal = afterDiscount + gstAmount;

            return (
              <div className="invoice-preview" id="invoice-preview">
                <div style={{ padding: '30px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                    <h2 style={{ color: '#6366f1', fontWeight: 800 }}>EVENTHUB</h2>
                    <p style={{ color: '#6b7280', margin: 0 }}>TAX INVOICE</p>
                    <hr style={{ border: '2px solid #6366f1', width: '60px', margin: '10px auto' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                    <div>
                      <h5 style={{ color: '#374151' }}>Invoice To:</h5>
                      <p><strong>{user?.name}</strong></p>
                      <p style={{ color: '#6b7280' }}>{user?.email}</p>
                      <p style={{ color: '#6b7280' }}>{user?.mobile}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h5 style={{ color: '#374151' }}>Invoice Details:</h5>
                      <p><strong>Invoice #:</strong> INV-{invoiceData.id}</p>
                      <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                      <p><strong>Booking ID:</strong> #{invoiceData.id}</p>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '25px' }}>
                    <h5 style={{ color: '#4f46e5' }}>Event Details</h5>
                    <p><strong>Event:</strong> {eventData.name}</p>
                    <p><strong>Date:</strong> {formatDate(invoiceData.eventDate)}</p>
                    <p><strong>Guests:</strong> {guests}</p>
                  </div>
                  <div style={{ marginBottom: '25px' }}>
                    <h5 style={{ color: '#374151' }}>Price Breakdown</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px' }}>Base Package Price</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(basePrice)}</td>
                        </tr>
                        {extraGuestsCost > 0 && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px' }}>Extra Guests ({guests - maxGuests} × {formatCurrency(perExtraGuestPrice)})</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(extraGuestsCost)}</td>
                          </tr>
                        )}
                        {addonRows.map((row, i) => (
                          <tr key={`addon-${i}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px' }}>{row.label}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                        {serviceRows.map((row, i) => (
                          <tr key={`svc-${i}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px' }}>{row.label}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                        {customAddonRows.map((row, i) => (
                          <tr key={`custom-${i}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px' }}>{row.label}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                        {specialRequestPrice > 0 && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px' }}>Special Request Charges</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(specialRequestPrice)}</td>
                          </tr>
                        )}
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px' }}><strong>Subtotal</strong></td>
                          <td style={{ padding: '10px', textAlign: 'right' }}><strong>{formatCurrency(subtotal)}</strong></td>
                        </tr>
                        {discountAmount > 0 && (
                          <tr style={{ background: '#fef3c7', borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px', color: '#92400e' }}>🎉 Discount{invoiceData.discountReason ? ` (${invoiceData.discountReason})` : ''}</td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>-{formatCurrency(discountAmount)}</td>
                          </tr>
                        )}
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px' }}>GST (5%)</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(gstAmount)}</td>
                        </tr>
                        <tr style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', fontWeight: 'bold' }}>
                          <td style={{ padding: '12px', fontSize: '16px' }}>Grand Total (incl. GST)</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#059669', fontSize: '16px' }}>{formatCurrency(grandTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}>
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>Thank you for choosing EventHub!</p>
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>Contact: sannithsanni2005@gmail.com | +91 7892119598</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-pro btn-pro-download" onClick={() => { if (invoiceData) { generateInvoicePDF(invoiceData, user, 'customer'); setShowInvoiceModal(false); } }}>
            <FaDownload /> Download PDF
          </button>
          <button className="btn-pro btn-pro-toggle" onClick={() => setShowInvoiceModal(false)}>Close</button>
        </Modal.Footer>
      </Modal>

      {/* Review Modal */}
      <Modal
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        centered
        className="review-submit-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaStar className="me-2" style={{ color: "#f59e0b" }} />
            Rate & Review
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reviewBooking && (
            <div className="text-center">
              <h5 className="mb-1">{reviewBooking.event?.name || "Event"}</h5>
              <p className="text-muted mb-3">
                Manager: {reviewBooking.manager?.name || "Event Manager"}
              </p>

              <p className="fw-bold mb-2">How was your experience?</p>
              <div className="review-modal-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${reviewRating >= star ? "active" : ""}`}
                    onClick={() => setReviewRating(star)}
                    type="button"
                  >
                    {reviewRating >= star ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                {reviewRating === 1 && "Poor"}
                {reviewRating === 2 && "Fair"}
                {reviewRating === 3 && "Good"}
                {reviewRating === 4 && "Very Good"}
                {reviewRating === 5 && "Excellent!"}
              </p>

              <div className="mt-3 text-start">
                <label className="form-label fw-bold">Feedback (optional)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Share your experience with this event manager..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={500}
                />
                <small className="text-muted">{reviewComment.length}/500 characters</small>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-pro btn-pro-toggle" onClick={() => setShowReviewModal(false)}>
            Cancel
          </button>
          <button
            className="btn-pro btn-pro-complete"
            onClick={handleSubmitReview}
            disabled={submittingReview || reviewRating === 0}
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none" }}
          >
            {submittingReview ? "Submitting..." : "Submit Review"}
          </button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .bookings-page {
          min-height: 100vh;
          background: linear-gradient(160deg, #f8faff 0%, #f0f4ff 30%, #faf5ff 70%, #fff5f5 100%);
          padding: 30px 0;
          position: relative;
        }

        /* Hero Section */
        .bookings-hero {
          position: relative;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          border-radius: 24px;
          padding: 40px 40px;
          margin-bottom: 30px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(99, 102, 241, 0.3);
        }

        .hero-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .hero-text h1 {
          color: white;
          font-size: 2rem;
          font-weight: 800;
          margin: 0;
          display: flex;
          align-items: center;
        }

        .hero-text p {
          color: rgba(255, 255, 255, 0.85);
          margin: 8px 0 0 0;
          font-size: 1rem;
        }

        .hero-btn {
          background: rgba(255, 255, 255, 0.2) !important;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          padding: 12px 24px !important;
        }

        .hero-btn:hover {
          background: rgba(255, 255, 255, 0.3) !important;
        }

        .hero-decoration {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 50%;
          pointer-events: none;
        }

        .hero-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
        }

        .hero-circle-1 { width: 200px; height: 200px; top: -50px; right: -30px; }
        .hero-circle-2 { width: 150px; height: 150px; bottom: -40px; right: 100px; }
        .hero-circle-3 { width: 80px; height: 80px; top: 30px; right: 200px; background: rgba(255,255,255,0.12); }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .stat-total .stat-icon { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #3b82f6; }
        .stat-confirmed .stat-icon { background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #10b981; }
        .stat-pending .stat-icon { background: linear-gradient(135deg, #fffbeb, #fef3c7); color: #f59e0b; }
        .stat-completed .stat-icon { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); color: #0ea5e9; }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1f2937;
          line-height: 1;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          margin-top: 4px;
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .loading-state h5 { color: #374151; margin-top: 15px; }
        .loading-state p { color: #9ca3af; }

        /* Empty State */
        .empty-state-modern {
          text-align: center;
          padding: 80px 40px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .empty-illustration .empty-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #eff6ff, #e0e7ff);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #6366f1;
        }

        .empty-state-modern h3 {
          color: #1f2937;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .empty-state-modern p {
          color: #6b7280;
          max-width: 400px;
          margin: 0 auto 24px;
        }

        /* Bookings Grid */
        .bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }

        .booking-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .booking-card:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        }

        .booking-card-header {
          padding: 20px 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .booking-event-info h5 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 6px 0;
        }

        .booking-category-tag {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
          background: linear-gradient(135deg, #eff6ff, #e0e7ff);
          color: #4f46e5;
        }

        .booking-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-pending { background: #fef3c7; color: #92400e; }
        .status-confirmed { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-completed { background: #dbeafe; color: #1e40af; }

        .booking-card-body {
          padding: 20px 24px;
          flex: 1;
        }

        .booking-detail-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .booking-detail-row:last-child { margin-bottom: 0; }

        .booking-detail-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #f9fafb;
          border-radius: 10px;
          transition: background 0.2s;
        }

        .booking-detail-item:hover { background: #f3f4f6; }

        .detail-icon {
          color: #6366f1;
          font-size: 14px;
          flex-shrink: 0;
        }

        .booking-detail-item small {
          display: block;
          font-size: 11px;
          color: #9ca3af;
          font-weight: 500;
        }

        .booking-detail-item strong {
          display: block;
          font-size: 13px;
          color: #374151;
          font-weight: 600;
        }

        .price-item .detail-icon { color: #10b981; }
        .price-value { color: #10b981 !important; }

        .booking-card-footer {
          padding: 16px 24px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .booking-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-view-action {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          color: #3b82f6;
        }
        .btn-view-action:hover { background: linear-gradient(135deg, #dbeafe, #bfdbfe); transform: translateY(-1px); }

        .btn-download-action {
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          color: #059669;
        }
        .btn-download-action:hover { background: linear-gradient(135deg, #d1fae5, #a7f3d0); transform: translateY(-1px); }

        .btn-preview-action {
          background: linear-gradient(135deg, #faf5ff, #ede9fe);
          color: #7c3aed;
        }
        .btn-preview-action:hover { background: linear-gradient(135deg, #ede9fe, #ddd6fe); transform: translateY(-1px); }

        .btn-chat-action {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          color: #2563eb;
        }
        .btn-chat-action:hover { background: linear-gradient(135deg, #dbeafe, #bfdbfe); transform: translateY(-1px); }

        /* Detail Modal */
        .booking-detail-modal .modal-content {
          border-radius: 24px;
          border: none;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15);
        }

        .detail-modal-header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          padding: 20px 28px;
          color: white;
        }

        .detail-modal-header .modal-title { color: white; font-weight: 700; }
        .detail-modal-header .btn-close { filter: brightness(0) invert(1); }

        .detail-modal-body {
          padding: 28px;
          max-height: 65vh;
          overflow-y: auto;
        }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 600;
        }

        .status-banner-pending { background: #fef3c7; color: #92400e; }
        .status-banner-confirmed { background: #d1fae5; color: #065f46; }
        .status-banner-cancelled { background: #fee2e2; color: #991b1b; }
        .status-banner-completed { background: #dbeafe; color: #1e40af; }

        .status-banner-icon { font-size: 18px; }

        .detail-section-modern {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #f3f4f6;
        }

        .detail-section-modern:last-child { border-bottom: none; }

        .section-title-modern {
          font-size: 15px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-icon { font-size: 18px; }

        .detail-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .detail-card-item {
          background: #f9fafb;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid #f3f4f6;
        }

        .detail-card-item label {
          display: block;
          font-size: 11px;
          color: #9ca3af;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .detail-card-item span {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .addons-modern {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .addon-pill {
          padding: 8px 16px !important;
          border-radius: 25px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          background: linear-gradient(135deg, #eff6ff, #e0e7ff) !important;
          color: #4f46e5 !important;
          border: 1px solid #c7d2fe !important;
        }

        .special-requests-modern {
          background: #f9fafb;
          padding: 16px;
          border-radius: 12px;
          color: #4b5563;
          font-style: italic;
          border-left: 4px solid #6366f1;
          margin: 0;
        }

        .price-section-modern {
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          padding: 20px !important;
          border-radius: 16px !important;
          border: 1px solid #fde68a !important;
          border-bottom: none !important;
        }

        .price-breakdown-modern {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .price-row-modern {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #4b5563;
        }

        .price-total-modern {
          margin-top: 10px;
          padding-top: 12px;
          border-top: 2px dashed #fbbf24;
          font-size: 16px;
          color: #1f2937;
        }

        .price-total-modern strong:last-child { color: #059669; font-size: 18px; }

        .detail-modal-footer {
          border-top: 1px solid #f3f4f6;
          padding: 16px 28px;
        }

        /* Invoice Modal */
        .invoice-preview-modal .modal-content {
          border-radius: 20px;
          overflow: hidden;
        }

        .invoice-preview {
          max-height: 70vh;
          overflow-y: auto;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        /* Dark Mode */
        body.dark-mode .bookings-page {
          background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #1a1a2e 100%) !important;
        }

        body.dark-mode .bookings-hero {
          background: linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #7c3aed 100%);
          box-shadow: 0 20px 60px rgba(67, 56, 202, 0.4);
        }

        body.dark-mode .stat-card {
          background: #1e293b;
          border-color: #334155;
        }

        body.dark-mode .stat-number { color: #f1f5f9; }
        body.dark-mode .stat-label { color: #94a3b8; }

        body.dark-mode .booking-card {
          background: #1e293b;
          border-color: #334155;
        }

        body.dark-mode .booking-card:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        body.dark-mode .booking-event-info h5 { color: #f1f5f9; }
        body.dark-mode .booking-category-tag { background: #312e81; color: #a5b4fc; }

        body.dark-mode .booking-detail-item {
          background: #0f172a;
        }
        body.dark-mode .booking-detail-item:hover { background: #1e293b; }
        body.dark-mode .booking-detail-item small { color: #64748b; }
        body.dark-mode .booking-detail-item strong { color: #e2e8f0; }

        body.dark-mode .booking-card-footer { border-color: #334155; }

        body.dark-mode .btn-view-action { background: #1e3a5f; color: #60a5fa; }
        body.dark-mode .btn-download-action { background: #064e3b; color: #6ee7b7; }
        body.dark-mode .btn-preview-action { background: #2e1065; color: #c4b5fd; }

        body.dark-mode .loading-state,
        body.dark-mode .empty-state-modern {
          background: #1e293b;
        }

        body.dark-mode .empty-state-modern h3 { color: #f1f5f9; }
        body.dark-mode .empty-state-modern p { color: #94a3b8; }
        body.dark-mode .empty-circle { background: #312e81; color: #a5b4fc; }

        body.dark-mode .booking-detail-modal .modal-content { background: #1e293b; }
        body.dark-mode .detail-modal-body { background: #1e293b; }
        body.dark-mode .status-banner-pending { background: #451a03; color: #fbbf24; }
        body.dark-mode .status-banner-confirmed { background: #064e3b; color: #6ee7b7; }
        body.dark-mode .status-banner-cancelled { background: #450a0a; color: #fca5a5; }
        body.dark-mode .status-banner-completed { background: #1e3a5f; color: #93c5fd; }

        body.dark-mode .section-title-modern { color: #f1f5f9; }
        body.dark-mode .detail-card-item { background: #0f172a; border-color: #334155; }
        body.dark-mode .detail-card-item label { color: #64748b; }
        body.dark-mode .detail-card-item span { color: #e2e8f0; }

        body.dark-mode .addon-pill {
          background: #312e81 !important;
          color: #a5b4fc !important;
          border-color: #4338ca !important;
        }

        body.dark-mode .special-requests-modern { background: #0f172a; color: #94a3b8; }

        body.dark-mode .price-section-modern {
          background: linear-gradient(135deg, #451a03, #78350f) !important;
          border-color: #92400e !important;
        }

        body.dark-mode .price-row-modern { color: #fcd34d; }
        body.dark-mode .price-total-modern { border-color: #92400e; }

        body.dark-mode .detail-modal-footer { border-color: #334155; }
        body.dark-mode .detail-section-modern { border-color: #334155; }

        body.dark-mode .invoice-preview { background: #1e293b; border-color: #334155; }

        /* Responsive */
        @media (max-width: 992px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .bookings-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .bookings-page { padding: 15px 0; }
          .bookings-hero { padding: 24px 20px; border-radius: 16px; }
          .hero-content { flex-direction: column; gap: 16px; text-align: center; }
          .hero-text h1 { font-size: 1.5rem; justify-content: center; }
          .stats-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-card { padding: 14px; }
          .booking-detail-row { grid-template-columns: 1fr; }
          .detail-grid-modern { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
