import { useState } from "react";
import { Modal, Button, Badge, Form, Spinner, Alert } from "react-bootstrap";
import {
  FaCalendar,
  FaUsers,
  FaRupeeSign,
  FaPalette,
  FaMapMarkerAlt,
  FaUtensils,
  FaMusic,
  FaCamera,
  FaTag,
  FaCheckCircle
} from "react-icons/fa";
import API from "../../services/api";

export default function CustomizationDetailsModal({
  show,
  onHide,
  booking,
  onBookingUpdated,
}) {
  const [specialRequestPrice, setSpecialRequestPrice] = useState(
    booking?.specialRequestPrice || ""
  );
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSuccess, setPricingSuccess] = useState(false);
  const [pricingError, setPricingError] = useState("");

  if (!booking) return null;

  const bookingDetails = {
    eventDate: booking.eventDate,
    guests: booking.guests,
    specialRequests: booking.specialRequests,
    selectedAddons: booking.selectedAddons || {},
    selectedCustomAddons: booking.selectedCustomAddons || [],
    totalPrice: booking.totalPrice,
    finalPrice: booking.finalPrice || booking.totalPrice,
    specialRequestPrice: booking.specialRequestPrice || 0,
  };

  const addonIcons = {
    catering: <FaUtensils className="me-1 text-warning" />,
    decoration: <FaPalette className="me-1 text-danger" />,
    photography: <FaCamera className="me-1 text-secondary" />,
    music: <FaMusic className="me-1 text-primary" />,
    transport: <FaMapMarkerAlt className="me-1 text-success" />,
  };

  const selectedAddonsList = Object.entries(
    bookingDetails.selectedAddons
  ).filter(([_, value]) => value === true);

  const handleSetSpecialRequestPrice = async () => {
    const priceVal = parseFloat(specialRequestPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      setPricingError("Please enter a valid non-negative price");
      return;
    }

    setPricingLoading(true);
    setPricingError("");
    setPricingSuccess(false);

    try {
      await API.put(`/booking/manager/special-request-price/${booking.id}`, {
        specialRequestPrice: priceVal
      });
      setPricingSuccess(true);
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      setPricingError(err.response?.data?.message || "Failed to update price");
    } finally {
      setPricingLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>📋 Customer Booking Details</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Customer Info */}
        <div className="mb-4 p-3 bg-light rounded">
          <h6 className="mb-2">👤 Customer Information</h6>
          <p className="mb-1">
            <strong>Name:</strong>{" "}
            {booking.customer?.name || booking.User?.name}
          </p>
          <p className="mb-1">
            <strong>Email:</strong>{" "}
            {booking.customer?.email || booking.User?.email}
          </p>
          <p className="mb-0">
            <strong>Phone:</strong>{" "}
            {booking.customer?.mobile ||
              booking.User?.mobile ||
              "Not provided"}
          </p>
        </div>

        {/* Event Details */}
        <div className="mb-4">
          <h6 className="mb-3">🎉 Event Details</h6>

          <div className="mb-3">
            <FaCalendar className="text-primary me-2" />
            <strong>Event Date:</strong>
            <span className="ms-2">
              {bookingDetails.eventDate
                ? new Date(bookingDetails.eventDate).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "long", year: "numeric" }
                  )
                : "Not specified"}
            </span>
          </div>

          <div className="mb-3">
            <FaUsers className="text-primary me-2" />
            <strong>Guests:</strong>
            <span className="ms-2">
              {bookingDetails.guests || "Not specified"}
            </span>
          </div>

          <div className="mb-3">
            <FaRupeeSign className="text-primary me-2" />
            <strong>Base Total:</strong>
            <span className="ms-2 fw-bold">
              ₹{(bookingDetails.totalPrice || 0).toLocaleString()}
            </span>
          </div>

          {bookingDetails.specialRequestPrice > 0 && (
            <div className="mb-3">
              <FaTag className="text-warning me-2" />
              <strong>Special Request Charge:</strong>
              <span className="ms-2 text-warning fw-bold">
                + ₹{bookingDetails.specialRequestPrice.toLocaleString()}
              </span>
            </div>
          )}

          <div className="mb-3">
            <FaRupeeSign className="text-success me-2" />
            <strong>Final Price:</strong>
            <span className="ms-2 fw-bold text-success fs-5">
              ₹{(bookingDetails.finalPrice || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Standard Add-ons */}
        <div className="mb-4">
          <h6 className="mb-3">✨ Standard Add-ons</h6>

          {selectedAddonsList.length > 0 ? (
            <div className="d-flex flex-wrap gap-2">
              {selectedAddonsList.map(([key]) => (
                <span
                  key={key}
                  className="badge-pro badge-addon text-capitalize"
                >
                  {addonIcons[key]} {key}
                </span>
              ))}
            </div>
          ) : (
            <span className="badge-pro badge-status-unavailable">No Standard Add-ons Selected</span>
          )}
        </div>

        {/* Custom Add-ons */}
        {bookingDetails.selectedCustomAddons.length > 0 && (
          <div className="mb-4">
            <h6 className="mb-3">🎁 Custom Packages Selected</h6>
            <div className="d-flex flex-wrap gap-2">
              {bookingDetails.selectedCustomAddons.map((addon, idx) => (
                <span key={idx} className="badge bg-info text-dark px-3 py-2" style={{ fontSize: '0.85rem' }}>
                  <FaTag className="me-1" />
                  {addon.name} — ₹{(addon.price || 0).toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special Requests + Pricing */}
        {bookingDetails.specialRequests && (
          <div className="mb-4">
            <h6 className="mb-2">📝 Special Requests</h6>
            <div className="p-3 bg-light rounded mb-3">
              {bookingDetails.specialRequests}
            </div>

            {/* Manager can set price for special requests */}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <div className="p-3 border rounded" style={{ background: '#fff8e1' }}>
                <h6 className="mb-2">💰 Set Special Request Price</h6>
                <small className="text-muted d-block mb-2">
                  Add a charge for the special request above. This will be added to the booking total and the customer will be notified.
                </small>
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control
                    type="number"
                    placeholder="Enter price (₹)"
                    value={specialRequestPrice}
                    onChange={(e) => { setSpecialRequestPrice(e.target.value); setPricingError(""); setPricingSuccess(false); }}
                    min="0"
                    style={{ maxWidth: '200px' }}
                  />
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={handleSetSpecialRequestPrice}
                    disabled={pricingLoading}
                  >
                    {pricingLoading ? <Spinner animation="border" size="sm" /> : "Set Price"}
                  </Button>
                </div>
                {pricingError && <small className="text-danger d-block mt-1">{pricingError}</small>}
                {pricingSuccess && (
                  <small className="text-success d-block mt-1">
                    <FaCheckCircle /> Price updated successfully! Customer has been notified.
                  </small>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="mt-3">
          <Badge
            bg={
              booking.status === "confirmed"
                ? "success"
                : booking.status === "pending"
                ? "warning"
                : booking.status === "cancelled"
                ? "danger"
                : "secondary"
            }
          >
            Status: {booking.status?.toUpperCase()}
          </Badge>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
