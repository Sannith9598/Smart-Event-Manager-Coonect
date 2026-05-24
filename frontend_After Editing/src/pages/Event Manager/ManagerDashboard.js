import { useEffect, useState } from "react";
import { Container, Tabs, Tab, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../../components/Navbar";
import API from "../../services/api";
import UnverifiedAlert from "./UnverifiedAlert";
import VerificationModal from "./VerificationModal";
import "./ManagerDashboard.css";
import ManagerHeader from "./ManagerHeader";
import StatsCards from "./StatsCards";
import EventsTab from "./EventsTab";
import BookingsTab from "./BookingsTab";
import AnalyticsTab from "./AnalyticsTab";
import ManagerToast from './ManagerToast'
import PastEventsTab from "./PastEventsTab";

export default function ManagerDashboard() {
  const [manager, setManager] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [activeTab, setActiveTab] = useState("events");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [filters, setFilters] = useState({ type: null, value: null });

  const navigate = useNavigate();

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const data = localStorage.getItem("user");
        const user = data ? JSON.parse(data) : null;

        if (!user || user.role !== "manager") {
          navigate("/login");
        } else {
          setManager(user);
          await fetchVerificationStatus();
          await fetchEvents();
          await fetchBookings();
        }
      } catch (err) {
        console.error("Initialization error:", err);
        navigate("/login");
      }
    };

    initDashboard();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const res = await API.get("/verification/verification-status");
      setVerificationStatus(res.data);
    } catch (err) {
      console.error("Error fetching verification status", err);
      setVerificationStatus({ status: "unverified" });
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await API.get("/event/events");
      setEvents(res.data);
    } catch (err) {
      console.error("Error fetching events", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await API.get("/booking/manager/bookings");
      setBookings(res.data);
    } catch (err) {
      console.error("Error fetching bookings", err);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const canAddEvents = () => verificationStatus?.status === "verified";
  
  const isPending = () => verificationStatus?.status === "pending";
  

  const isRejected = () => verificationStatus?.status === "rejected";
  
  const isUnverified = () => verificationStatus?.status === "unverified";

  const handleVerificationSuccess = () => {
    fetchVerificationStatus();
    showToast("Verification submitted successfully!", "success");
  };

  const handleReapplyVerification = () => {
    setShowVerificationModal(true);
  };

  const handleFilterChange = (type, value) => {
    setFilters({ type, value });
    
    if (type === 'events') {
      setActiveTab('events');
      window.dispatchEvent(new CustomEvent('filterEvents', { detail: { type, value } }));
    } else if (type === 'bookings' || type === 'revenue') {
      setActiveTab('bookings');
      window.dispatchEvent(new CustomEvent('filterBookings', { detail: { type, value } }));
    }
  };

  return (
    <>
      <AppNavbar />
      <Container fluid className="mt-4 px-4">
        <ManagerToast toast={toast} setToast={setToast} />
        
        <ManagerHeader 
          manager={manager}
          verificationStatus={verificationStatus}
          canAddEvents={canAddEvents()}
          onVerify={() => setShowVerificationModal(true)}
        />


        {isUnverified() && (
          <UnverifiedAlert onVerify={() => setShowVerificationModal(true)} />
        )}

        {isPending() && (
          <div className="alert alert-info shadow-sm border-0 rounded-4 p-4 mb-4">
            <div className="d-flex align-items-center mb-3">
              <div className="spinner-border text-primary me-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h4 className="fw-bold mb-0">Verification Under Review</h4>
            </div>
            <p className="mb-2">
              Your verification request has been submitted and is currently being reviewed by our admin team.
            </p>
            <p className="mb-0 text-muted">
              <small>You will be notified once the review is complete. This usually takes 2-3 business days.</small>
            </p>
          </div>
        )}

        {isRejected() && (
          <div className="alert alert-danger shadow-sm border-0 rounded-4 p-4 mb-4">
            <h4 className="fw-bold mb-3">
              <i className="bi bi-x-circle-fill me-2"></i>
              Verification Rejected
            </h4>
            <p className="mb-2">
              Your manager verification request has been rejected by the admin.
            </p>
            {verificationStatus?.rejectionReason && (
              <div className="bg-white p-3 rounded-3 mb-3">
                <strong className="text-danger">Rejection Reason:</strong>
                <p className="mb-0 mt-1">{verificationStatus.rejectionReason}</p>
              </div>
            )}
            <p className="mb-3">
              Please update your information according to the feedback above and re-apply for verification.
            </p>
            <div className="d-flex gap-3">
              <Button
                variant="danger"
                onClick={handleReapplyVerification}
              >
                <i className="bi bi-arrow-repeat me-2"></i>
                Re-Apply for Verification
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => window.location.reload()}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Refresh Page
              </Button>
            </div>
          </div>
        )}

        {canAddEvents() && (
          <>
            <StatsCards 
              events={events} 
              bookings={bookings} 
              onFilterChange={handleFilterChange}
            />
            
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
              <Tab eventKey="events" title="My Events" >
                <EventsTab 
                  events={events}
                  loading={loading}
                  bookings={bookings}
                  fetchEvents={fetchEvents}
                  showToast={showToast}
                  externalFilter={filters.type === 'events' ? filters.value : null}
                />
              </Tab>
              
              <Tab eventKey="bookings" title="Bookings & Customizations">
                <BookingsTab 
                  bookings={bookings}
                  fetchBookings={fetchBookings}
                  showToast={showToast}
                  externalFilter={filters.type === 'bookings' || filters.type === 'revenue' ? filters.value : null}
                />
              </Tab>
              
              <Tab eventKey="analytics" title="Analytics">
                <AnalyticsTab events={events} bookings={bookings} />
              </Tab>

              <Tab eventKey="portfolio" title="Past Events">
                <PastEventsTab showToast={showToast} />
              </Tab>
            </Tabs>
          </>
        )}


        {!canAddEvents() && !isUnverified() && !isPending() && !isRejected() && (
          <div className="text-center py-5">
            <div className="mb-4">
              <i className="bi bi-shield-lock" style={{ fontSize: "4rem", color: "#6c757d" }}></i>
            </div>
            <h3>Verification Required</h3>
            <p className="text-muted">
              Please complete the verification process to access all features.
            </p>
            <Button 
              variant="primary" 
              onClick={() => setShowVerificationModal(true)}
              className="mt-3"
            >
              Start Verification
            </Button>
          </div>
        )}
      </Container>

      <VerificationModal
        show={showVerificationModal}
        onHide={() => {
          setShowVerificationModal(false);
          fetchVerificationStatus(); 
        }}
        onVerified={handleVerificationSuccess}
      />
    </>
  );
}