import { useState, useEffect } from "react";
import {
  Modal,
  Table,
  Badge,
  Spinner,
  Alert,
  Card,
  Row,
  Col,
  Form,
  InputGroup,
  Tabs,
  Tab,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  FaEye,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaPhone,
  FaMapMarker,
  FaBriefcase,
  FaStar,
  FaRupeeSign,
  FaCalendarAlt,
  FaImage,
  FaStore,
  FaShoppingBag,
  FaUser,
  FaUserTie,
  FaClock,
  FaCalendarCheck,
} from "react-icons/fa";
import API from "../../services/api";

export default function ViewManagers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedManager, setSelectedManager] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [statsFilter, setStatsFilter] = useState("all"); // "all", "verified", "pending", "events"
  const [stats, setStats] = useState({
    totalManagers: 0,
    verifiedManagers: 0,
    pendingVerification: 0,
    totalEvents: 0,
  });

  useEffect(() => {
    fetchManagers();
    fetchManagerStats();
  }, [activeTab]);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      let endpoint = "/admin/managers";
      if (activeTab === "verified") {
        endpoint = "/admin/managers/verified";
      } else if (activeTab === "pending") {
        endpoint = "/admin/managers/pending-verification";
      }
      
      const response = await API.get(endpoint);
      setManagers(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching managers:", err);
      setError(err.response?.data?.message || "Failed to fetch managers");
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerStats = async () => {
    try {
      const response = await API.get("/admin/managers/stats");
      setStats(response.data.data || {});
    } catch (err) {
      console.error("Error fetching manager stats:", err);
    }
  };

  const handleVerifyManager = async (managerId, isVerified) => {
    if (!window.confirm(`Are you sure you want to ${isVerified ? "verify" : "unverify"} this manager?`)) {
      return;
    }

    try {
      await API.put(`/admin/managers/${managerId}/verify`, { isVerified });
      toast.success(`Manager ${isVerified ? "verified" : "unverified"} successfully!`);
      fetchManagers();
      fetchManagerStats();
    } catch (err) {
      console.error("Error updating manager verification:", err);
      toast.error(err.response?.data?.message || "Failed to update manager status");
    }
  };

  const handleViewDetails = async (manager) => {
    try {
      const response = await API.get(`/admin/managers/${manager.id}/details`);
      setSelectedManager(response.data.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Error fetching manager details:", err);
      toast.error("Failed to fetch manager details");
    }
  };

  const filteredManagers = managers.filter(manager => {
    // Apply search filter
    const matchesSearch =
      manager.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.businessName?.toLowerCase().includes(searchTerm.toLowerCase());

    // Apply stat card filter
    let matchesStatsFilter = true;
    if (statsFilter === "verified") {
      matchesStatsFilter = manager.isVerified === true;
    } else if (statsFilter === "pending") {
      matchesStatsFilter = manager.verificationStatus === "pending" && !manager.isVerified;
    } else if (statsFilter === "events") {
      matchesStatsFilter = (manager.eventsCount || 0) > 0;
    }

    return matchesSearch && matchesStatsFilter;
  });

  const getVerificationBadge = (manager) => {
    if (manager.isVerified) {
      return <Badge bg="success" style={{ borderRadius: '8px', padding: '5px 10px' }}>✓ Verified</Badge>;
    }
    if (manager.verificationStatus === "pending") {
      return <Badge bg="warning" style={{ borderRadius: '8px', padding: '5px 10px' }}>⏳ Pending</Badge>;
    }
    if (manager.verificationStatus === "rejected") {
      return <Badge bg="danger" style={{ borderRadius: '8px', padding: '5px 10px' }}>✗ Rejected</Badge>;
    }
    return <Badge bg="secondary" style={{ borderRadius: '8px', padding: '5px 10px' }}>Not Submitted</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading managers...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      <style>{`
        .managers-section .search-box {
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        .managers-section .search-box:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .managers-section .search-box .input-group-text {
          background: transparent;
          border: none;
          color: #6366f1;
        }
        .managers-section .search-box .form-control {
          border: none;
          box-shadow: none;
        }
        .manager-stat-card {
          border: none;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }
        .manager-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .manager-stat-card.active-filter {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          outline: 3px solid #fff;
          outline-offset: -3px;
        }
        .manager-stat-card .stat-icon {
          font-size: 24px;
          margin-bottom: 8px;
          opacity: 0.9;
        }
        .manager-stat-card h3 {
          font-weight: 700;
          margin-bottom: 4px;
        }
        .manager-stat-card p {
          font-size: 0.85rem;
          opacity: 0.9;
          margin: 0;
        }
        .mgr-stat-blue {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        .mgr-stat-green {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        .mgr-stat-amber {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        .mgr-stat-cyan {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: white;
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
        }
        .managers-table thead th {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 14px 12px;
        }
        .managers-table tbody td {
          padding: 14px 12px;
          vertical-align: middle;
          border-color: #f1f5f9;
        }
        .managers-table tbody tr {
          transition: all 0.2s ease;
        }
        .managers-table tbody tr:hover {
          background: #f8fafc;
        }
        .manager-modal .modal-content {
          border-radius: 20px;
          border: none;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
        }
        .manager-modal .modal-header {
          background: linear-gradient(135deg, #1e293b, #334155);
          color: white;
          border-radius: 20px 20px 0 0;
          padding: 20px 30px;
        }
        .manager-modal .modal-header .btn-close {
          filter: invert(1);
        }
        .manager-modal .modal-body {
          padding: 30px;
        }
        .manager-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: white;
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3);
          margin-bottom: 15px;
        }
        .manager-detail-item {
          background: #f8fafc;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
        }
        .manager-detail-item strong {
          color: #475569;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .manager-detail-item p {
          margin: 4px 0 0;
          font-weight: 600;
          color: #1e293b;
        }
        .portfolio-gallery-img {
          width: 150px;
          height: 150px;
          object-fit: cover;
          border-radius: 12px;
          border: 3px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .portfolio-gallery-img:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          border-color: #6366f1;
        }
        .section-title {
          color: #1e293b;
          font-weight: 600;
          margin-top: 24px;
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Dark Mode */
        body.dark-mode .managers-section .search-box {
          border-color: #374151;
        }
        body.dark-mode .managers-section .search-box .input-group-text {
          color: #818cf8;
        }
        body.dark-mode .managers-table thead th {
          background: #1e293b;
          color: #94a3b8;
          border-color: #374151;
        }
        body.dark-mode .managers-table tbody td {
          color: #e2e8f0;
          border-color: #374151;
        }
        body.dark-mode .managers-table tbody tr:hover {
          background: #334155;
        }
        body.dark-mode .manager-detail-item {
          background: #1e293b;
          border-color: #374151;
        }
        body.dark-mode .manager-detail-item strong {
          color: #94a3b8;
        }
        body.dark-mode .manager-detail-item p {
          color: #e2e8f0;
        }
        body.dark-mode .section-title {
          color: #f1f5f9;
          border-color: #374151;
        }
      `}</style>

      <div className="managers-section">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <h4 className="mb-0 fw-bold">
                  <FaUserTie className="me-2 text-primary" />
                  Event Manager Management
                </h4>
                <InputGroup className="search-box" style={{ width: "320px" }}>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, email, or business..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>

              {/* Stats Cards */}
              <Row className="mb-4 g-3">
                <Col md={3} sm={6}>
                  <div
                    className={`manager-stat-card mgr-stat-blue ${statsFilter === "all" ? "active-filter" : ""}`}
                    onClick={() => setStatsFilter("all")}
                  >
                    <div className="stat-icon"><FaUserTie /></div>
                    <h3>{stats.totalManagers}</h3>
                    <p>Total Managers</p>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <div
                    className={`manager-stat-card mgr-stat-green ${statsFilter === "verified" ? "active-filter" : ""}`}
                    onClick={() => setStatsFilter(statsFilter === "verified" ? "all" : "verified")}
                  >
                    <div className="stat-icon"><FaCheckCircle /></div>
                    <h3>{stats.verifiedManagers}</h3>
                    <p>Verified Managers</p>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <div
                    className={`manager-stat-card mgr-stat-amber ${statsFilter === "pending" ? "active-filter" : ""}`}
                    onClick={() => setStatsFilter(statsFilter === "pending" ? "all" : "pending")}
                  >
                    <div className="stat-icon"><FaClock /></div>
                    <h3>{stats.pendingVerification}</h3>
                    <p>Pending Verification</p>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <div
                    className={`manager-stat-card mgr-stat-cyan ${statsFilter === "events" ? "active-filter" : ""}`}
                    onClick={() => setStatsFilter(statsFilter === "events" ? "all" : "events")}
                  >
                    <div className="stat-icon"><FaCalendarCheck /></div>
                    <h3>{stats.totalEvents}</h3>
                    <p>Total Events</p>
                  </div>
                </Col>
              </Row>

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="all" title={`All Managers (${stats.totalManagers})`} />
                <Tab eventKey="verified" title={`Verified (${stats.verifiedManagers})`} />
                <Tab eventKey="pending" title={`Pending (${stats.pendingVerification})`} />
              </Tabs>

              <div className="table-responsive">
                <Table hover className="managers-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Business Name</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Experience</th>
                      <th>Rating</th>
                      <th>Verification</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManagers.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          No managers found
                        </td>
                      </tr>
                    ) : (
                      filteredManagers.map((manager) => (
                        <tr key={manager.id}>
                          <td><strong>#{manager.id}</strong></td>
                          <td>
                            <strong>{manager.name}</strong>
                          </td>
                          <td>{manager.businessName || manager.eventManager?.businessName || "N/A"}</td>
                          <td>{manager.email}</td>
                          <td>{manager.mobile}</td>
                          <td>{manager.yearsOfExperience || manager.eventManager?.yearsOfExperience || 0}+ years</td>
                          <td>
                            <span className="text-warning">⭐</span> {manager.rating?.toFixed(1) || manager.eventManager?.rating?.toFixed(1) || "N/A"}
                          </td>
                          <td>{getVerificationBadge(manager)}</td>
                          <td>
                            <button
                              className="btn-pro btn-pro-view btn-pro-sm me-2"
                              onClick={() => handleViewDetails(manager)}
                            >
                              <FaEye /> View
                            </button>
                            {!manager.isVerified && manager.verificationStatus !== "rejected" ? (
                              <button
                                className="btn-pro btn-pro-confirm btn-pro-sm"
                                onClick={() => handleVerifyManager(manager.id, true)}
                              >
                                <FaCheckCircle /> Verify
                              </button>
                            ) : manager.isVerified && (
                              <button
                                className="btn-pro btn-pro-edit btn-pro-sm"
                                onClick={() => handleVerifyManager(manager.id, false)}
                              >
                                <FaTimesCircle /> Unverify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </motion.div>
      </div>

      {/* Manager Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="xl"
        centered
        className="manager-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Manager Profile - {selectedManager?.businessName || selectedManager?.eventManager?.businessName || selectedManager?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedManager && (
            <>
              <div className="text-center mb-4">
                <div className="manager-avatar mx-auto">
                  {(selectedManager.businessName || selectedManager.eventManager?.businessName || selectedManager.name)?.charAt(0).toUpperCase()}
                </div>
                <h3 className="fw-bold">{selectedManager.businessName || selectedManager.eventManager?.businessName || selectedManager.name}</h3>
                <div className="mt-2 d-flex justify-content-center gap-2">
                  {getVerificationBadge(selectedManager)}
                  {selectedManager.isVerified && (
                    <Badge bg="info" style={{ borderRadius: '8px', padding: '5px 12px' }}>Professional Verified</Badge>
                  )}
                </div>
              </div>

              <Row>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaUser className="text-primary" /> Manager Name</strong>
                    <p>{selectedManager.name}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaEnvelope className="text-info" /> Email</strong>
                    <p>{selectedManager.email}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaPhone className="text-success" /> Mobile</strong>
                    <p>{selectedManager.mobile}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaMapMarker className="text-danger" /> Location</strong>
                    <p>{selectedManager.eventManager?.location || selectedManager.location || "Not specified"}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaBriefcase className="text-warning" /> Experience</strong>
                    <p>{selectedManager.yearsOfExperience || selectedManager.eventManager?.yearsOfExperience || 0}+ years</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaStar className="text-warning" /> Rating</strong>
                    <p>⭐ {selectedManager.rating?.toFixed(1) || selectedManager.eventManager?.rating?.toFixed(1) || "No ratings yet"}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaRupeeSign className="text-success" /> Starting Price</strong>
                    <p>₹{selectedManager.eventManager?.price?.toLocaleString() || selectedManager.startingPrice?.toLocaleString() || "Contact for price"}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="manager-detail-item">
                    <strong><FaCalendarAlt className="text-info" /> Member Since</strong>
                    <p>{new Date(selectedManager.createdAt).toLocaleDateString()}</p>
                  </div>
                </Col>
              </Row>

              <h5 className="section-title"><FaStore /> Business Information</h5>
              <Row>
                <Col md={6}>
                  <p className="fw-semibold mb-2">Business Types:</p>
                  <div className="d-flex flex-wrap gap-2">
                    {(selectedManager.businessTypes || selectedManager.eventManager?.businessTypes || []).map((type, idx) => (
                      <Badge key={idx} bg="secondary" style={{ borderRadius: '8px', padding: '6px 12px' }}>{type}</Badge>
                    ))}
                    {(!selectedManager.businessTypes && !selectedManager.eventManager?.businessTypes) && <span className="text-muted">N/A</span>}
                  </div>
                </Col>
                <Col md={6}>
                  <p className="fw-semibold mb-2">Service Areas:</p>
                  <div className="d-flex flex-wrap gap-2">
                    {(selectedManager.serviceAreas || selectedManager.eventManager?.serviceAreas || []).map((area, idx) => (
                      <Badge key={idx} bg="info" style={{ borderRadius: '8px', padding: '6px 12px' }}>{area}</Badge>
                    ))}
                    {(!selectedManager.serviceAreas && !selectedManager.eventManager?.serviceAreas) && <span className="text-muted">N/A</span>}
                  </div>
                </Col>
              </Row>

              {(selectedManager.description || selectedManager.eventManager?.description) && (
                <>
                  <h5 className="section-title">About</h5>
                  <p style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    {selectedManager.description || selectedManager.eventManager?.description}
                  </p>
                </>
              )}

              {(selectedManager.portfolioImages || selectedManager.eventManager?.portfolioImages || selectedManager.images)?.length > 0 && (
                <>
                  <h5 className="section-title"><FaImage /> Portfolio Gallery</h5>
                  <div className="d-flex flex-wrap gap-3">
                    {(selectedManager.portfolioImages || selectedManager.eventManager?.portfolioImages || selectedManager.images || []).map((img, idx) => (
                      <img
                        key={idx}
                        src={img.url || img}
                        alt={`Portfolio ${idx + 1}`}
                        className="portfolio-gallery-img"
                        onClick={() => window.open(img.url || img, "_blank")}
                      />
                    ))}
                  </div>
                </>
              )}

              {(selectedManager.pastEvents || selectedManager.eventManager?.pastEvents)?.length > 0 && (
                <>
                  <h5 className="section-title">Past Events</h5>
                  <Row>
                    {(selectedManager.pastEvents || selectedManager.eventManager?.pastEvents || []).map((event, idx) => (
                      <Col md={6} key={idx}>
                        <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                          <Card.Body>
                            <h6 className="fw-bold">{event.title}</h6>
                            <p className="mb-1 text-muted"><strong>Client:</strong> {event.clientName}</p>
                            <p className="mb-1 text-muted"><strong>Date:</strong> {event.date}</p>
                            <p className="mb-0 text-muted">{event.description}</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </>
              )}

              {selectedManager.events?.length > 0 && (
                <>
                  <h5 className="section-title">Events Posted ({selectedManager.events?.length})</h5>
                  <div className="table-responsive">
                    <Table hover size="sm" className="managers-table">
                      <thead>
                        <tr>
                          <th>Event Name</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Max Guests</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedManager.events.map((event) => (
                          <tr key={event.id}>
                            <td className="fw-semibold">{event.name}</td>
                            <td>{event.category}</td>
                            <td className="text-success fw-bold">₹{event.price?.toLocaleString()}</td>
                            <td>{event.maxGuests}</td>
                            <td>
                              <Badge bg={event.status === "available" ? "success" : "danger"} style={{ borderRadius: '6px' }}>
                                {event.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}

              {selectedManager.managerBookings?.length > 0 && (
                <>
                  <h5 className="section-title"><FaShoppingBag /> Bookings ({selectedManager.managerBookings?.length})</h5>
                  <div className="table-responsive">
                    <Table hover size="sm" className="managers-table">
                      <thead>
                        <tr>
                          <th>Booking ID</th>
                          <th>Customer</th>
                          <th>Event</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedManager.managerBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td><strong>#{booking.id}</strong></td>
                            <td>{booking.customer?.name}</td>
                            <td>{booking.event?.name}</td>
                            <td className="text-success fw-bold">₹{booking.totalPrice?.toLocaleString()}</td>
                            <td>
                              <Badge bg={
                                booking.status === "completed" ? "success" :
                                booking.status === "confirmed" ? "info" :
                                booking.status === "pending" ? "warning" : "secondary"
                              } style={{ borderRadius: '6px' }}>
                                {booking.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
