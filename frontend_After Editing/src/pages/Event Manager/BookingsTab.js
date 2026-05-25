import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Badge,
  Button,
  Form,
  Row,
  Col,
  InputGroup,
  Pagination,
  Spinner,
  Modal,
} from "react-bootstrap";
import {
  FaEye,
  FaEnvelope,
  FaPhone,
  FaCheck,
  FaTimes,
  FaComment,
  FaComments,
  FaSearch,
  FaDownload,
  FaCheckCircle,
  FaUser,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { generateInvoicePDF } from "../../utils/generateInvoice";
import API from "../../services/api";
import BookingConfirmationModal from "./BookingConfirmationModal";
import CustomizationDetailsModal from "./CustomizationDetailsModal";
import ClientProfileModal from "./ClientProfileModal";

export default function BookingsTab({
  bookings,
  fetchBookings,
  showToast,
  externalFilter,
}) {
  const navigate = useNavigate();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [customization, setCustomization] = useState({});
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showClientProfile, setShowClientProfile] = useState(false);
  const [clientProfileId, setClientProfileId] = useState(null);


  useEffect(() => {
    const handleFilterBookings = (event) => {
      const { value } = event.detail;
      if (value === "all") {
        setFilters((prev) => ({ ...prev, status: "all" }));
        setCurrentPage(1);
      } else if (value === "upcoming") {
        setFilters((prev) => ({ ...prev, status: "pending,confirmed" }));
        setCurrentPage(1);
      }
    };

    window.addEventListener("filterBookings", handleFilterBookings);
    return () =>
      window.removeEventListener("filterBookings", handleFilterBookings);
  }, []);


  useEffect(() => {
    if (externalFilter === "all") {
      setFilters((prev) => ({ ...prev, status: "all" }));
      setCurrentPage(1);
    } else if (externalFilter === "upcoming") {
      setFilters((prev) => ({ ...prev, status: "pending,confirmed" }));
      setCurrentPage(1);
    }
  }, [externalFilter]);

  const getCategoryBadge = (category) => {
    switch (category) {
      case "birthday":
        return <span className="badge-pro badge-category-birthday">Birthday Event</span>;
      case "wedding":
        return <span className="badge-pro badge-category-wedding">Wedding Plan</span>;
      default:
        return <span className="badge-pro badge-category-general">General Event</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return <span className="badge-pro badge-status-confirmed">Confirmed</span>;
      case "rejected":
        return <span className="badge-pro badge-status-cancelled">Rejected</span>;
      case "pending":
        return <span className="badge-pro badge-status-pending">Pending</span>;
      case "customizing":
        return <span className="badge-pro badge-status-customizing">Customizing</span>;
      case "completed":
        return <span className="badge-pro badge-status-completed">Completed</span>;
      case "cancelled":
        return <span className="badge-pro badge-status-cancelled">Cancelled</span>;
      default:
        return <span className="badge-pro badge-status-unavailable">{status}</span>;
    }
  };

  const updateBooking = async (id, status, notes = "") => {
    try {
      setLoading(true);
      await API.put(`/booking/manager/booking/${id}`, { status, notes });
      showToast(`Booking ${status} successfully!`, "success");
      await fetchBookings();
    } catch (err) {
      showToast("Failed to update booking", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBooking = (booking) => {
    setRejectingBooking(booking);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectingBooking) return;
    await updateBooking(rejectingBooking.id, "rejected", rejectReason);
    setShowRejectModal(false);
    setRejectingBooking(null);
    setRejectReason("");
  };

  const handleCompleteBooking = async (booking) => {
    if (!window.confirm(`Mark "${booking.event?.name || booking.Event?.name}" as completed? This will allow the customer to download the invoice.`)) {
      return;
    }

    setCompleting(true);
    try {
      const token = localStorage.getItem("token");
      await API.put(
        `/booking/manager/complete/${booking.id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showToast("Booking marked as completed successfully!", "success");
      await fetchBookings();
      setShowCustomizeModal(false);
    } catch (err) {
      console.error("Error completing booking:", err);
      showToast(
        err.response?.data?.message ||
          "Failed to mark booking as completed. Please try again.",
        "error"
      );
    } finally {
      setCompleting(false);
    }
  };

  const fetchBookingDetailsForInvoice = async (bookingId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await API.get(`/booking/manager/details/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    return response.data;
  } catch (err) {
    console.error("Error fetching booking details:", err);
    throw new Error(err.response?.data?.message || 'Failed to fetch booking details');
  }
};

  const handleDownloadInvoice = async (booking) => {
    setDownloading(true);
    try {
      const bookingData = await fetchBookingDetailsForInvoice(booking.id);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      await generateInvoicePDF(bookingData, currentUser, 'manager');
      showToast("Invoice downloaded successfully!", "success");
    } catch (err) {
      console.error("Error downloading invoice:", err);
      showToast("Failed to download invoice. Please try again.", "error");
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
      showToast("Failed to load invoice. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmBooking = (booking) => {
    setSelectedBooking(booking);
    setShowConfirmationModal(true);
  };

  const handleConfirmSubmit = async (details) => {
    try {
      setLoading(true);

      await API.put(`/booking/manager/booking/${selectedBooking.id}`, {
        status: "confirmed",
        confirmedDate: details.confirmedDate,
        confirmedTime: details.confirmedTime,
        depositAmount: details.depositAmount,
        notes: details.notes,
      });

      showToast("Booking confirmed!", "success");
      setShowConfirmationModal(false);
      fetchBookings();
    } catch (err) {
      console.error(err);
      showToast("Failed to confirm booking", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setCustomization(booking.selectedAddons || {});
    setShowCustomizeModal(true);
  };

  const getFilteredBookings = () => {
    if (!bookings || bookings.length === 0) return [];

    let filtered = [...bookings];

    if (filters.status !== "all") {
      const statuses = filters.status.split(",");
      filtered = filtered.filter((b) => statuses.includes(b.status));
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.event?.name?.toLowerCase().includes(searchTerm) ||
          false ||
          b.customer?.name?.toLowerCase().includes(searchTerm) ||
          false ||
          b.User?.name?.toLowerCase().includes(searchTerm) ||
          false,
      );
    }

    return filtered;
  };

  const filteredBookings = getFilteredBookings();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  if (!bookings) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading bookings...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by event or customer name..."
                    value={filters.search}
                    onChange={(e) => {
                      setFilters({ ...filters, search: e.target.value });
                      setCurrentPage(1);
                    }}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Status Filter</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="confirmed">✅ Confirmed</option>
                  <option value="completed">🎉 Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                  <option value="rejected">❌ Rejected</option>
                  <option value="pending,confirmed">
                    📅 Upcoming (Pending + Confirmed)
                  </option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          {(filters.status !== "all" || filters.search) && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => {
                  setFilters({ status: "all", search: "" });
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Bookings Table */}
      <Card>
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Customer</th>
                  <th>Event</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Customization</th>
                  <th>Event Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentBookings.length > 0 ? (
                  currentBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td style={{ minWidth: "150px" }}>
                        <strong>
                          {booking.customer?.name ||
                            booking.User?.name ||
                            "N/A"}
                        </strong>
                        <br />
                        <small className="text-muted">
                          <FaEnvelope className="me-1" size={12} />
                          {booking.customer?.email ||
                            booking.User?.email ||
                            "No email"}
                        </small>
                        {(booking.customer?.mobile || booking.User?.mobile) && (
                          <>
                            <br />
                            <small className="text-muted">
                              <FaPhone className="me-1" size={12} />
                              {booking.customer?.mobile || booking.User?.mobile}
                            </small>
                          </>
                        )}
                        <br />
                        <button
                          className="btn btn-link btn-sm p-0 mt-1"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => {
                            setClientProfileId(booking.customerId || booking.customer?.id || booking.User?.id);
                            setShowClientProfile(true);
                          }}
                        >
                          <FaUser className="me-1" size={10} />View Client Profile
                        </button>
                      </td>
                      <td>
                        <strong>
                          {booking.event?.name || booking.Event?.name || "N/A"}
                        </strong>
                      </td>
                      <td>
                        {getCategoryBadge(
                          booking.event?.category || booking.Event?.category,
                        )}
                      </td>
                      <td>
                        <strong>
                          ₹
                          {(
                            booking.finalPrice ||
                            booking.totalPrice ||
                            booking.Event?.price ||
                            0
                          )?.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        {booking.customization || booking.selectedAddons ? (
                          <Button
                            size="sm"
                            variant="info"
                            onClick={() => handleViewBookingDetails(booking)}
                          >
                            <FaEye className="me-1" /> View Details
                          </Button>
                        ) : (
                          <span className="badge-pro badge-status-unavailable">No Add-ons</span>
                        )}
                      </td>
                      <td>
                        {booking.customization?.eventDate
                          ? new Date(
                              booking.customization.eventDate,
                            ).toLocaleDateString()
                          : booking.eventDate
                            ? new Date(booking.eventDate).toLocaleDateString()
                            : "Not set"}
                       </td>
                      <td>{getStatusBadge(booking.status)}</td>
                      <td style={{ minWidth: "220px" }}>
                        <div className="d-flex flex-column gap-2">
                          {booking.status === "pending" && (
                            <div className="d-flex gap-2">
                              <button
                                className="btn-pro btn-pro-sm btn-pro-confirm"
                                onClick={() => handleConfirmBooking(booking)}
                                disabled={loading}
                              >
                                <FaCheck /> Confirm
                              </button>
                              <button
                                className="btn-pro btn-pro-sm btn-pro-reject"
                                onClick={() => handleRejectBooking(booking)}
                                disabled={loading}
                              >
                                <FaTimes /> Reject
                              </button>
                            </div>
                          )}

                          {booking.status === "confirmed" && (
                            <div className="d-flex gap-2">
                              <button
                                className="btn-pro btn-pro-sm btn-pro-complete"
                                onClick={() => handleCompleteBooking(booking)}
                                disabled={completing}
                              >
                                <FaCheckCircle /> {completing ? 'Completing...' : 'Complete'}
                              </button>
                              <button
                                className="btn-pro btn-pro-sm btn-pro-download"
                                onClick={() => handleDownloadInvoice(booking)}
                                disabled={downloading}
                              >
                                <FaDownload /> {downloading ? '...' : 'Invoice'}
                              </button>
                            </div>
                          )}

                          {booking.status === "completed" && (
                            <div className="d-flex gap-2">
                              <button
                                className="btn-pro btn-pro-sm btn-pro-download"
                                onClick={() => handleDownloadInvoice(booking)}
                                disabled={downloading}
                              >
                                <FaDownload /> {downloading ? '...' : 'Invoice'}
                              </button>
                              <button
                                className="btn-pro btn-pro-sm btn-pro-view"
                                onClick={() => handleViewInvoice(booking)}
                              >
                                <FaEye /> Preview
                              </button>
                            </div>
                          )}

                          {booking.customization && (
                            <button
                              className="btn-pro btn-pro-sm btn-pro-chat"
                              onClick={() => handleViewBookingDetails(booking)}
                            >
                              <FaComment /> Details
                            </button>
                          )}

                          {booking.status !== "cancelled" && booking.status !== "rejected" && (
                            <button
                              className="btn-pro btn-pro-sm btn-pro-view"
                              onClick={() => navigate(`/booking/${booking.id}/chat`)}
                            >
                              <FaComments /> Chat
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="text-muted">
                        <h5>No bookings found</h5>
                        <p>
                          {filters.status !== "all" || filters.search
                            ? "Try changing your filter criteria"
                            : "Bookings will appear here when customers make reservations."}
                        </p>
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
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={pageNum === currentPage}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Pagination.Item>
                  );
                })}
                <Pagination.Next
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}

  
          <div className="text-muted text-center mt-3">
            <small>
              Showing {currentBookings.length} of {filteredBookings.length}{" "}
              bookings
            </small>
          </div>
        </Card.Body>
      </Card>

      {/* Rejection Reason Modal */}
      <Modal
        show={showRejectModal}
        onHide={() => { setShowRejectModal(false); setRejectingBooking(null); setRejectReason(""); }}
        centered
        className="reject-modal"
      >
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', padding: '20px 24px' }}>
          <Modal.Title style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
            <FaTimes className="me-2" /> Reject Booking
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '24px' }}>
          <p style={{ color: '#374151', marginBottom: '6px', fontWeight: 600 }}>
            Rejecting booking for: <span style={{ color: '#6366f1' }}>{rejectingBooking?.event?.name || rejectingBooking?.Event?.name || "Event"}</span>
          </p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
            Customer: {rejectingBooking?.customer?.name || rejectingBooking?.User?.name || "N/A"}
          </p>

          <Form.Group>
            <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>
              Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this booking (e.g., date unavailable, fully booked, etc.). This will be sent to the customer via email."
              style={{ borderRadius: '12px', padding: '14px 16px', border: '2px solid #e5e7eb', fontSize: '14px' }}
            />
            <Form.Text style={{ color: '#9ca3af', fontSize: '12px' }}>
              This message will be included in the rejection email sent to the customer.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f3f4f6', padding: '16px 24px' }}>
          <button
            className="btn-pro btn-pro-toggle"
            onClick={() => { setShowRejectModal(false); setRejectingBooking(null); setRejectReason(""); }}
          >
            Cancel
          </button>
          <button
            className="btn-pro btn-pro-reject"
            onClick={confirmReject}
            disabled={loading || !rejectReason.trim()}
            style={{ padding: '10px 24px' }}
          >
            {loading ? <Spinner animation="border" size="sm" /> : <><FaTimes /> Confirm Rejection</>}
          </button>
        </Modal.Footer>
      </Modal>

      <BookingConfirmationModal
        show={showConfirmationModal}
        onHide={() => setShowConfirmationModal(false)}
        booking={selectedBooking}
        onConfirm={handleConfirmSubmit}
      />

      <CustomizationDetailsModal
        show={showCustomizeModal}
        onHide={() => setShowCustomizeModal(false)}
        booking={selectedBooking}
        customization={selectedBooking?.selectedAddons || {}}
        onBookingUpdated={fetchBookings}
      />

      {/* Client Profile Modal */}
      <ClientProfileModal
        show={showClientProfile}
        onHide={() => { setShowClientProfile(false); setClientProfileId(null); }}
        clientId={clientProfileId}
      />

  
      <Modal
        show={showInvoiceModal}
        onHide={() => setShowInvoiceModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaDownload className="me-2" />
            Invoice Preview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {invoiceData && (
            <div style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#6366f1' }}>EVENTHUB INVOICE</h2>
                <hr />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h4>Invoice To:</h4>
                  <p><strong>{invoiceData.customer?.name || invoiceData.User?.name}</strong></p>
                  <p>{invoiceData.customer?.email || invoiceData.User?.email}</p>
                  <p>{invoiceData.customer?.mobile || invoiceData.User?.mobile}</p>
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
                <p><strong>Event:</strong> {invoiceData.event?.name || invoiceData.Event?.name}</p>
                <p><strong>Date:</strong> {new Date(invoiceData.eventDate || invoiceData.customization?.eventDate).toLocaleDateString()}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4>Price Breakdown</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px' }}>Base Price</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₹{(invoiceData.event?.price || invoiceData.Event?.price || 0).toLocaleString()}</td>
                    </tr>
                    {invoiceData.selectedAddons && Object.entries(invoiceData.selectedAddons).map(([key, value]) => {
                      if (value && (invoiceData.event?.addonPrices?.[key] || invoiceData.Event?.addonPrices?.[key])) {
                        const price = invoiceData.event?.addonPrices?.[key] || invoiceData.Event?.addonPrices?.[key];
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '8px' }}>{key.charAt(0).toUpperCase() + key.slice(1)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>+ ₹{price.toLocaleString()}</td>
                          </tr>
                        );
                      }
                      return null;
                    })}
                    <tr style={{ background: '#fef3c7', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px' }}>Total Amount</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₹{(invoiceData.finalPrice || invoiceData.totalPrice || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="success" 
            onClick={() => {
              if (invoiceData) {
                generateInvoicePDF(invoiceData);
                setShowInvoiceModal(false);
              }
            }}
          >
            <FaDownload /> Download PDF
          </Button>
          <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
