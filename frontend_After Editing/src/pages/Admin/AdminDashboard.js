import { useState, useEffect } from "react";
import {
  Container,
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Card,
  Row,
  Col,
  Spinner,
  Tabs,
  Tab,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import API from "../../services/api";
import AppNavbar from "../../components/Navbar";
import ViewCustomers from "./ViewCustomers";
import ViewManagers from "./ViewManagers";
import AuditLogs from "./AuditLogs";
import { FaUsers, FaUserTie, FaHistory, FaDownload, FaShieldAlt, FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";

export default function AdminDashboard() {
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [approvedVerifications, setApprovedVerifications] = useState([]);
  const [rejectedVerifications, setRejectedVerifications] = useState([]);

  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState("pending");

  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (user.role !== "admin") {
      navigate("/login");
    } else {
      fetchAllVerifications();
      fetchStatistics();
    }
  }, []);

  const fetchAllVerifications = async () => {
    try {
      const res = await API.get("/admin/verifications");

      const allVerifications = res.data.data || [];

      setPendingVerifications(
        allVerifications.filter((v) => v.status?.toLowerCase() === "pending"),
      );

      setApprovedVerifications(
        allVerifications.filter((v) => v.status?.toLowerCase() === "approved"),
      );

      setRejectedVerifications(
        allVerifications.filter((v) => v.status?.toLowerCase() === "rejected"),
      );
    } catch (error) {
      console.error("Error fetching verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await API.get("/admin/statistics");
      setStats(res.data.data || {});
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this verification request?")) return;

    try {
      await API.put(`/admin/verifications/${id}/approve`);

      toast.success("Verification approved successfully!");

      fetchAllVerifications();
      fetchStatistics();

      setShowModal(false);
      setSelectedVerification(null);
    } catch (error) {
      console.error("Error approving verification:", error);
      toast.error("Failed to approve verification");
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      toast.warning("Please provide rejection reason");
      return;
    }

    try {
      await API.put(`/admin/verifications/${id}/reject`, {
        rejectionReason,
      });

      toast.success("Verification rejected successfully!");

      setShowModal(false);
      setSelectedVerification(null);
      setRejectionReason("");

      fetchAllVerifications();
      fetchStatistics();
    } catch (error) {
      console.error("Error rejecting verification:", error);
      toast.error("Failed to reject verification");
    }
  };

  const viewDetails = (verification) => {
    setSelectedVerification(verification);
    setShowModal(true);
  };

  const handleExportCustomers = async () => {
    try {
      const response = await API.get("/admin/export/customers", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "customers.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export customers error:", err);
      toast.error("Failed to export customers");
    }
  };

  const handleExportBookings = async () => {
    try {
      const response = await API.get("/admin/export/bookings", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "bookings.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export bookings error:", err);
      toast.error("Failed to export bookings");
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <Badge bg="success">APPROVED</Badge>;

      case "rejected":
        return <Badge bg="danger">REJECTED</Badge>;

      case "pending":
        return <Badge bg="warning">PENDING</Badge>;

      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const renderVerificationTable = (verifications, showActions = true) => (
    <Table hover responsive className="mt-3 admin-verification-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Business Name</th>
          <th>Manager</th>
          <th>Experience</th>
          <th>Submitted Date</th>

          {!showActions && <th>Reviewed Date</th>}

          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {verifications.length === 0 ? (
          <tr>
            <td colSpan={showActions ? 7 : 8} className="text-center py-4 text-muted">
              No {activeTab} verification requests
            </td>
          </tr>
        ) : (
          verifications.map((v) => (
            <tr key={v.id}>
              <td><strong>#{v.id}</strong></td>

              <td>{v.businessName}</td>

              <td>{v.User?.name || v.managerName || v.userId}</td>

              <td>{v.yearsOfExperience} years</td>

              <td>
                {v.submittedAt
                  ? new Date(v.submittedAt).toLocaleDateString()
                  : "N/A"}
              </td>

              {!showActions && (
                <td>
                  {v.reviewedAt
                    ? new Date(v.reviewedAt).toLocaleDateString()
                    : "N/A"}
                </td>
              )}

              <td>{getStatusBadge(v.status)}</td>

              <td>
                <button
                  className="btn-pro btn-pro-view btn-pro-sm me-2"
                  onClick={() => viewDetails(v)}
                >
                  View
                </button>

                {showActions && v.status?.toLowerCase() === "pending" && (
                  <>
                    <button
                      className="btn-pro btn-pro-confirm btn-pro-sm me-2"
                      onClick={() => handleApprove(v.id)}
                    >
                      Approve
                    </button>

                    <button
                      className="btn-pro btn-pro-reject btn-pro-sm"
                      onClick={() => {
                        setSelectedVerification(v);
                        setShowModal(true);
                        setRejectionReason("");
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}

                {!showActions && v.status?.toLowerCase() === "approved" && (
                  <Badge bg="success" className="p-2" style={{ borderRadius: '8px' }}>
                    ✓ Verified Manager
                  </Badge>
                )}

                {!showActions && v.status?.toLowerCase() === "rejected" && (
                  <Badge bg="danger" className="p-2" style={{ borderRadius: '8px' }}>
                    ✗ Rejected
                  </Badge>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );

  if (loading) {
    return (
      <>
        <AppNavbar />
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading dashboard...</p>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{`
        .admin-dashboard-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding-bottom: 40px;
        }
        .admin-hero {
          background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
          border-radius: 20px;
          padding: 35px 40px;
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(30, 41, 59, 0.3);
        }
        .admin-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        .admin-hero::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
          border-radius: 50%;
        }
        .admin-hero h2 {
          color: white;
          font-weight: 700;
          font-size: 1.8rem;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }
        .admin-hero p {
          color: #94a3b8;
          font-size: 0.95rem;
          margin-bottom: 0;
          position: relative;
          z-index: 1;
        }
        .admin-hero .hero-actions {
          position: relative;
          z-index: 1;
        }
        .admin-stat-card {
          border: none;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          background: white;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        .admin-stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
        }
        .admin-stat-card .stat-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 12px;
        }
        .admin-stat-card .stat-number {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1;
        }
        .admin-stat-card .stat-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }
        .stat-pending .stat-icon-wrapper { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
        .stat-pending .stat-number { color: #d97706; }
        .stat-approved .stat-icon-wrapper { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669; }
        .stat-approved .stat-number { color: #059669; }
        .stat-rejected .stat-icon-wrapper { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #dc2626; }
        .stat-rejected .stat-number { color: #dc2626; }
        .stat-verified .stat-icon-wrapper { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; }
        .stat-verified .stat-number { color: #4f46e5; }
        .admin-tabs-card {
          border: none;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        .admin-tabs-card .card-body {
          padding: 30px;
        }
        .admin-verification-table {
          border-radius: 12px;
          overflow: hidden;
        }
        .admin-verification-table thead th {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 14px 16px;
        }
        .admin-verification-table tbody td {
          padding: 14px 16px;
          vertical-align: middle;
          border-color: #f1f5f9;
        }
        .admin-verification-table tbody tr {
          transition: background 0.2s ease;
        }
        .admin-verification-table tbody tr:hover {
          background: #f8fafc;
        }
        .admin-modal .modal-content {
          border-radius: 20px;
          border: none;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
        }
        .admin-modal .modal-header {
          background: linear-gradient(135deg, #1e293b, #334155);
          color: white;
          border-radius: 20px 20px 0 0;
          padding: 20px 30px;
        }
        .admin-modal .modal-header .btn-close {
          filter: invert(1);
        }
        .admin-modal .modal-body {
          padding: 30px;
        }
        .admin-modal .modal-body h5 {
          color: #1e293b;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        .portfolio-img {
          width: 110px;
          height: 110px;
          object-fit: cover;
          border-radius: 12px;
          border: 3px solid #e2e8f0;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .portfolio-img:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        .past-event-item {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s ease;
        }
        .past-event-item:hover {
          transform: translateX(5px);
        }

        /* Dark Mode */
        body.dark-mode .admin-dashboard-page {
          background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #1a1a2e 100%);
        }
        body.dark-mode .admin-hero {
          background: linear-gradient(135deg, #312e81, #4c1d95);
        }
        body.dark-mode .admin-stat-card {
          background: #1e293b;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        body.dark-mode .admin-stat-card .stat-label {
          color: #94a3b8;
        }
        body.dark-mode .admin-tabs-card {
          background: #16213e;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        body.dark-mode .admin-verification-table thead th {
          background: #1e293b;
          color: #94a3b8;
          border-color: #374151;
        }
        body.dark-mode .admin-verification-table tbody td {
          color: #e2e8f0;
          border-color: #374151;
        }
        body.dark-mode .admin-verification-table tbody tr:hover {
          background: #334155;
        }
        body.dark-mode .admin-modal .modal-body h5 {
          color: #f1f5f9;
          border-color: #374151;
        }
        body.dark-mode .past-event-item {
          background: linear-gradient(135deg, #1e293b, #233554);
          border-color: #374151;
          color: #e2e8f0;
        }
        body.dark-mode .past-event-item p {
          color: #cbd5e1;
        }
      `}</style>

      <AppNavbar />

      <div className="admin-dashboard-page">
        <Container className="pt-4">
          {/* Hero Header */}
          <motion.div
            className="admin-hero"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h2><FaShieldAlt className="me-3" />Admin Dashboard</h2>
                <p>Manage verifications, users, and platform operations</p>
              </div>
              <div className="hero-actions d-flex gap-2">
                <button className="btn-pro btn-pro-confirm" onClick={handleExportCustomers}>
                  <FaDownload /> Export Customers
                </button>
                <button className="btn-pro btn-pro-complete" onClick={handleExportBookings}>
                  <FaDownload /> Export Bookings
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Row className="mb-4 g-4">
              <Col md={3} sm={6}>
                <div className="admin-stat-card stat-pending" onClick={() => setActiveTab("pending")}>
                  <div className="stat-icon-wrapper"><FaClock /></div>
                  <div className="stat-number">{stats.pendingVerifications || 0}</div>
                  <div className="stat-label">Pending Verifications</div>
                </div>
              </Col>
              <Col md={3} sm={6}>
                <div className="admin-stat-card stat-approved" onClick={() => setActiveTab("approved")}>
                  <div className="stat-icon-wrapper"><FaCheckCircle /></div>
                  <div className="stat-number">{stats.approvedVerifications || 0}</div>
                  <div className="stat-label">Approved Verifications</div>
                </div>
              </Col>
              <Col md={3} sm={6}>
                <div className="admin-stat-card stat-rejected" onClick={() => setActiveTab("rejected")}>
                  <div className="stat-icon-wrapper"><FaTimesCircle /></div>
                  <div className="stat-number">{stats.rejectedVerifications || 0}</div>
                  <div className="stat-label">Rejected Verifications</div>
                </div>
              </Col>
              <Col md={3} sm={6}>
                <div className="admin-stat-card stat-verified" onClick={() => setActiveTab("approved")}>
                  <div className="stat-icon-wrapper"><FaUserTie /></div>
                  <div className="stat-number">{stats.verifiedManagers || 0}</div>
                  <div className="stat-label">Verified Managers</div>
                </div>
              </Col>
            </Row>
          </motion.div>

          {/* Tabs Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="admin-tabs-card admin-tabs">
              <Card.Body>
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-3"
                >
                  <Tab
                    eventKey="pending"
                    title={`Pending (${pendingVerifications.length})`}
                  >
                    {renderVerificationTable(pendingVerifications, true)}
                  </Tab>

                  <Tab
                    eventKey="approved"
                    title={`Approved (${approvedVerifications.length})`}
                  >
                    {renderVerificationTable(approvedVerifications, false)}
                  </Tab>

                  <Tab
                    eventKey="rejected"
                    title={`Rejected (${rejectedVerifications.length})`}
                  >
                    {renderVerificationTable(rejectedVerifications, false)}
                  </Tab>
                  <Tab
                    eventKey="customers"
                    title={
                      <span>
                        <FaUsers /> Customers
                      </span>
                    }
                  >
                    <ViewCustomers />
                  </Tab>
                  <Tab
                    eventKey="managers"
                    title={
                      <span>
                        <FaUserTie /> Managers
                      </span>
                    }
                  >
                    <ViewManagers />
                  </Tab>
                  <Tab
                    eventKey="audit-logs"
                    title={
                      <span>
                        <FaHistory /> Audit Logs
                      </span>
                    }
                  >
                    <AuditLogs />
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </motion.div>
        </Container>
      </div>

      {/* Verification Details Modal */}
      <Modal
        show={showModal}
        size="lg"
        className="admin-modal"
        onHide={() => {
          setShowModal(false);
          setSelectedVerification(null);
          setRejectionReason("");
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Verification Details - {selectedVerification?.businessName}
            {selectedVerification && (
              <Badge
                className="ms-2"
                bg={
                  selectedVerification.status?.toLowerCase() === "approved"
                    ? "success"
                    : selectedVerification.status?.toLowerCase() ===
                        "rejected"
                      ? "danger"
                      : "warning"
                }
              >
                {selectedVerification.status?.toUpperCase()}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedVerification && (
            <>
              <h5>Business Information</h5>

              <Row>
                <Col md={6}>
                  <p><strong>Business Name:</strong> {selectedVerification.businessName}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Experience:</strong> {selectedVerification.yearsOfExperience} years</p>
                </Col>
                <Col md={6}>
                  <p><strong>Business Types:</strong> {selectedVerification.businessTypes?.join(", ") || "N/A"}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Service Areas:</strong> {selectedVerification.serviceAreas?.join(", ") || "N/A"}</p>
                </Col>
                <Col md={12}>
                  <p><strong>Description:</strong> {selectedVerification.description || "N/A"}</p>
                </Col>
              </Row>

              {selectedVerification.reviewedAt && (
                <p>
                  <strong>Reviewed Date:</strong>{" "}
                  {new Date(selectedVerification.reviewedAt).toLocaleString()}
                </p>
              )}

              {selectedVerification.rejectionReason && (
                <p>
                  <strong>Rejection Reason:</strong>{" "}
                  <span className="text-danger">
                    {selectedVerification.rejectionReason}
                  </span>
                </p>
              )}

              <h5>Portfolio Images</h5>

              <div className="d-flex flex-wrap gap-3 mb-3">
                {selectedVerification.images?.length > 0 ? (
                  selectedVerification.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.url}
                      alt="portfolio"
                      className="portfolio-img"
                    />
                  ))
                ) : (
                  <p className="text-muted">No images available</p>
                )}
              </div>

              <h5>Past Events</h5>

              {selectedVerification.pastEvents?.length > 0 ? (
                selectedVerification.pastEvents.map((event, idx) => (
                  <div key={idx} className="past-event-item">
                    <p className="mb-1"><strong>Title:</strong> {event.title}</p>
                    <p className="mb-1"><strong>Client:</strong> {event.clientName}</p>
                    <p className="mb-1"><strong>Date:</strong> {event.date}</p>
                    <p className="mb-0"><strong>Description:</strong> {event.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted">No past events available</p>
              )}

              {selectedVerification.status?.toLowerCase() === "pending" && (
                <>
                  <hr />

                  <h5>Actions</h5>

                  <div className="d-flex gap-2 mb-3">
                    <button
                      className="btn-pro btn-pro-confirm"
                      onClick={() => handleApprove(selectedVerification.id)}
                    >
                      <FaCheckCircle /> Approve Verification
                    </button>

                    <button
                      className="btn-pro btn-pro-reject"
                      onClick={() => {
                        if (rejectionReason.trim()) {
                          handleReject(selectedVerification.id);
                        } else {
                          toast.warning("Please enter rejection reason");
                        }
                      }}
                    >
                      <FaTimesCircle /> Reject Verification
                    </button>
                  </div>

                  <Form.Group>
                    <Form.Label className="fw-semibold">Rejection Reason</Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      style={{ borderRadius: '12px', border: '2px solid #e2e8f0' }}
                    />
                  </Form.Group>
                </>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}


