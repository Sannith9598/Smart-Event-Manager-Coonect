import { useState, useEffect } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";

export default function BookingConfirmationModal({
  show,
  onHide,
  booking,
  onConfirm,
}) {
  const [confirmationDetails, setConfirmationDetails] = useState({
    confirmedDate: "",
    confirmedTime: "",
    depositAmount: 0,
    notes: "",
  });
  const [errors, setErrors] = useState({});

  const totalAmount = parseFloat(booking?.totalPrice || booking?.event?.price || 0);
  const suggestedDeposit = Math.round(totalAmount * 0.1);

  useEffect(() => {
    if (show) {
      const now = new Date();

      const currentDate = now.toISOString().split("T")[0];
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      setConfirmationDetails({
        confirmedDate: currentDate,
        confirmedTime: currentTime,
        depositAmount: suggestedDeposit,
        notes: "",
      });
      setErrors({});
    }
  }, [show, suggestedDeposit]);

  const validate = () => {
    const newErrors = {};

    if (!confirmationDetails.confirmedDate) {
      newErrors.confirmedDate = "Confirmed date is required";
    }

    if (!confirmationDetails.depositAmount || confirmationDetails.depositAmount <= 0) {
      newErrors.depositAmount = "Deposit amount must be greater than 0";
    } else if (confirmationDetails.depositAmount > totalAmount) {
      newErrors.depositAmount = "Deposit cannot exceed total amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm(confirmationDetails);
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  if (!booking) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>✅ Confirm Booking</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="info">
          <h6>Customer: {booking.customer?.name}</h6>
          <p className="mb-1">Event: {booking.event?.name}</p>
          <p className="mb-0">
            Total Amount: ₹{totalAmount.toLocaleString()}
          </p>
        </Alert>

        <Form>
          <Form.Group className="mb-3">
            {errors.confirmedDate && (
              <div className="validation-message text-danger mb-1" style={{ fontSize: "13px", fontWeight: "500" }}>
                ⚠️ {errors.confirmedDate}
              </div>
            )}
            <Form.Label>Confirmed Date</Form.Label>
            <Form.Control
              type="date"
              value={confirmationDetails.confirmedDate}
              onChange={(e) => {
                setConfirmationDetails({
                  ...confirmationDetails,
                  confirmedDate: e.target.value,
                });
                clearFieldError("confirmedDate");
              }}
              isInvalid={!!errors.confirmedDate}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Confirmed Time</Form.Label>
            <Form.Control
              type="time"
              value={confirmationDetails.confirmedTime}
              readOnly 
            />
          </Form.Group>


          <Form.Group className="mb-3">
            {errors.depositAmount && (
              <div className="validation-message text-danger mb-1" style={{ fontSize: "13px", fontWeight: "500" }}>
                ⚠️ {errors.depositAmount}
              </div>
            )}
            <Form.Label>Deposit Amount (₹)</Form.Label>
            <Form.Control
              type="number"
              value={confirmationDetails.depositAmount}
              onChange={(e) => {
                setConfirmationDetails({
                  ...confirmationDetails,
                  depositAmount: parseFloat(e.target.value) || 0,
                });
                clearFieldError("depositAmount");
              }}
              isInvalid={!!errors.depositAmount}
            />
            <small className="text-muted">
              Suggested: ₹{suggestedDeposit.toLocaleString()} (10%)
            </small>
          </Form.Group>


          <Form.Group className="mb-3">
            <Form.Label>Additional Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Special instructions..."
              value={confirmationDetails.notes}
              onChange={(e) =>
                setConfirmationDetails({
                  ...confirmationDetails,
                  notes: e.target.value,
                })
              }
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>

        <Button
          variant="primary"
          onClick={handleConfirm}
        >
          Confirm Booking
        </Button>
      </Modal.Footer>

      <style>{`
        .validation-message {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Modal>
  );
}
