import { Button } from "react-bootstrap";
import { FaPlus, FaCheckCircle, FaClock, FaExclamationTriangle } from "react-icons/fa";

// Dashboard header showing the manager's name, verification badge, and add event button
export default function ManagerHeader({ manager, verificationStatus, canAddEvents, onVerify }) {
  const renderVerificationBadge = () => {
    if (!verificationStatus) return null;
    switch (verificationStatus.status) {
      case "verified":
        return (
          <span className="badge-pro badge-verified ms-2">
            <FaCheckCircle /> Verified Professional
          </span>
        );
      case "pending":
        return (
          <span className="badge-pro badge-pending ms-2">
            <FaClock /> Pending Review
          </span>
        );
      default:
        return (
          <span
            className="badge-pro badge-status-cancelled ms-2"
            onClick={onVerify}
            style={{ cursor: "pointer" }}
          >
            <FaExclamationTriangle /> Not Verified - Click to Verify
          </span>
        );
    }
  };

  return (
    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
      <div>
        <h2>
          Welcome back, {manager?.name}! 👋
          {renderVerificationBadge()}
        </h2>
        <p className="text-muted">Manage your events, track bookings, and customize customer experiences</p>
      </div>
      {canAddEvents && (
        <button
          className="btn-pro btn-pro-complete"
          onClick={() => window.dispatchEvent(new CustomEvent('openAddEventModal'))}
        >
          <FaPlus /> Add New Event
        </button>
      )}
    </div>
  );
}
