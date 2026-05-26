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
} from "react-bootstrap";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  FaEye,
  FaSearch,
  FaUserCheck,
  FaUserTimes,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaDollarSign,
  FaShoppingBag,
  FaUsers,
  FaBan,
  FaTicketAlt,
} from "react-icons/fa";
import API from "../../services/api";

// Admin view for managing customers — search, block/unblock, and view booking history
export default function ViewCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "active", "blocked", "bookings"
  const [allBookings, setAllBookings] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    blockedCustomers: 0,
    totalBookings: 0,
  });

  useEffect(() => {
    fetchCustomers();
    fetchCustomerStats();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/admin/customers");
      setCustomers(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError(err.response?.data?.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      const response = await API.get("/admin/customers/stats");
      setStats(response.data.data || {});
    } catch (err) {
      console.error("Error fetching customer stats:", err);
    }
  };

  const fetchAllBookings = async () => {
    try {
      const response = await API.get("/admin/bookings");
      setAllBookings(response.data.data || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  const handleFilterChange = (filter) => {
    if (filter === activeFilter) {
      setActiveFilter("all");
    } else {
      setActiveFilter(filter);
      if (filter === "bookings" && allBookings.length === 0) {
        fetchAllBookings();
      }
    }
  };

  // Blocks or unblocks a customer account
  const handleUpdateStatus = async (customerId, newStatus) => {
    if (!window.confirm(`Are you sure you want to ${newStatus} this customer?`)) {
      return;
    }

    try {
      await API.put(`/admin/customers/${customerId}/status`, { status: newStatus });
      toast.success(`Customer ${newStatus} successfully!`);
      fetchCustomers();
      fetchCustomerStats();
    } catch (err) {
      console.error("Error updating customer status:", err);
      toast.error(err.response?.data?.message || "Failed to update customer status");
    }
  };

  // Opens the detail modal with full customer info and booking history
  const handleViewDetails = async (customer) => {
    try {
      const response = await API.get(`/admin/customers/${customer.id}/details`);
      setSelectedCustomer(response.data.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Error fetching customer details:", err);
      toast.error("Failed to fetch customer details");
    }
  };

  const filteredCustomers = customers.filter(customer => {
    // Apply search filter
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile?.includes(searchTerm);

    // Apply stat card filter
    let matchesFilter = true;
    if (activeFilter === "active") {
      matchesFilter = customer.status === "active";
    } else if (activeFilter === "blocked") {
      matchesFilter = customer.status === "blocked";
    } else if (activeFilter === "bookings") {
      matchesFilter = (customer.bookingsCount || 0) > 0;
    }

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading customers...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      <style>{`
        .customers-section .search-box {
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s ease;
        }
        .customers-section .search-box:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .customers-section .search-box .input-group-text {
          background: transparent;
          border: none;
          color: #6366f1;
        }
        .customers-section .search-box .form-control {
          border: none;
          box-shadow: none;
        }
        .customer-stat-card {
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
        .customer-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .customer-stat-card.active-filter {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          outline: 3px solid #fff;
          outline-offset: -3px;
        }
        .customer-stat-card .stat-icon {
          font-size: 24px;
          margin-bottom: 8px;
          opacity: 0.9;
        }
        .customer-stat-card h3 {
          font-weight: 700;
          margin-bottom: 4px;
        }
        .customer-stat-card p {
          font-size: 0.85rem;
          opacity: 0.9;
          margin: 0;
        }
        .stat-gradient-blue {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        .stat-gradient-green {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        .stat-gradient-red {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }
        .stat-gradient-cyan {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: white;
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
        }
        .customers-table thead th {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 14px 12px;
        }
        .customers-table tbody td {
          padding: 14px 12px;
          vertical-align: middle;
          border-color: #f1f5f9;
        }
        .customers-table tbody tr {
          transition: all 0.2s ease;
        }
        .customers-table tbody tr:hover {
          background: #f8fafc;
        }
        .customer-modal .modal-content {
          border-radius: 20px;
          border: none;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
        }
        .customer-modal .modal-header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-radius: 20px 20px 0 0;
          padding: 20px 30px;
        }
        .customer-modal .modal-header .btn-close {
          filter: invert(1);
        }
        .customer-modal .modal-body {
          padding: 30px;
        }
        .customer-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: white;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        .detail-item {
          background: #f8fafc;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
        }
        .detail-item strong {
          color: #475569;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .detail-item p {
          margin: 4px 0 0;
          font-weight: 600;
          color: #1e293b;
        }

        /* Dark Mode */
        body.dark-mode .customers-section .search-box {
          border-color: #374151;
        }
        body.dark-mode .customers-section .search-box .input-group-text {
          color: #818cf8;
        }
        body.dark-mode .customers-table thead th {
          background: #1e293b;
          color: #94a3b8;
          border-color: #374151;
        }
        body.dark-mode .customers-table tbody td {
          color: #e2e8f0;
          border-color: #374151;
        }
        body.dark-mode .customers-table tbody tr:hover {
          background: #334155;
        }
        body.dark-mode .detail-item {
          background: #1e293b;
          border-color: #374151;
        }
        body.dark-mode .detail-item strong {
          color: #94a3b8;
        }
        body.dark-mode .detail-item p {
          color: #e2e8f0;
        }
      `}</style>

      <div className="customers-section">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <h4 className="mb-0 fw-bold">
                  <FaUsers className="me-2 text-primary" />
                  Customer Management
                </h4>
                <InputGroup className="search-box" style={{ width: "320px", borderRadius: '12px', overflow: 'hidden' }}>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>

              {/* Stats Cards */}
              <Row className="mb-4 g-3">
                <Col md={3} sm={6}>
                  <div
                    className={`customer-stat-card stat-gradient-blue ${activeFilter === "all" ? "active-filter" : ""}`}
                    onClick={() => handleFilterChange("all")}
                  >
                    <div className="stat-icon"><FaUsers /></div>
                    <h3>{stats.totalCustomers}</h3>
                    <p>Total Customers</p>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <div
                    className={`customer-stat-card stat-gradient-green ${activeFilter === "active" ? "active-filter" : ""}`}
                    onClick={() => handleFilterChange("active")}
                  >
                    <div className="stat-icon"><FaUserCheck /></div>
                    <h3>{stats.activeCustomers}</h3>
                    <p>Active Customers</p>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <div
                    className={`customer-stat-card stat-gradient-red ${activeFilter === "blocked" ? "active-filter" : ""}`}
                    onClick={() => handleFilterChange("blocked")}
                  >
                    <div className="stat-icon"><FaBan /></div>
                    <h3>{stats.blockedCustomers}</h3>
                    <p>Blocked Customers</p>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <div
                    className={`customer-stat-card stat-gradient-cyan ${activeFilter === "bookings" ? "active-filter" : ""}`}
                    onClick={() => handleFilterChange("bookings")}
                  >
                    <div className="stat-icon"><FaTicketAlt /></div>
                    <h3>{stats.totalBookings}</h3>
                    <p>Total Bookings</p>
                  </div>
                </Col>
              </Row>

              {/* Table */}
              {activeFilter === "bookings" ? (
                <div className="table-responsive">
                  <h5 className="mb-3 fw-bold"><FaTicketAlt className="me-2 text-info" />All Bookings</h5>
                  <Table hover className="customers-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Event</th>
                        <th>Category</th>
                        <th>Manager</th>
                        <th>Date</th>
                        <th>Guests</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBookings.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4 text-muted">
                            No bookings found
                          </td>
                        </tr>
                      ) : (
                        allBookings
                          .filter(b =>
                            !searchTerm ||
                            b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.event?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.manager?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((booking) => (
                          <tr key={booking.id}>
                            <td><strong>#{booking.id}</strong></td>
                            <td>{booking.customer?.name || "N/A"}</td>
                            <td>{booking.event?.name || "N/A"}</td>
                            <td>{booking.event?.category || "N/A"}</td>
                            <td>{booking.manager?.name || "N/A"}</td>
                            <td>{booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : "N/A"}</td>
                            <td>{booking.guests || 0}</td>
                            <td className="fw-bold text-success">₹{(booking.totalPrice || 0).toLocaleString()}</td>
                            <td>
                              <Badge
                                bg={
                                  booking.status === "completed" ? "success" :
                                  booking.status === "confirmed" ? "info" :
                                  booking.status === "pending" ? "warning" : "secondary"
                                }
                                style={{ borderRadius: '8px', padding: '5px 10px' }}
                              >
                                {booking.status?.toUpperCase() || "N/A"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              ) : (
              <div className="table-responsive">
                <Table hover className="customers-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Join Date</th>
                      <th>Bookings</th>
                      <th>Total Spent</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          No customers found
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td><strong>#{customer.id}</strong></td>
                          <td>
                            <strong>{customer.name}</strong>
                          </td>
                          <td>{customer.email}</td>
                          <td>{customer.mobile}</td>
                          <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                          <td>
                            <Badge bg="info" style={{ borderRadius: '8px', padding: '5px 10px' }}>{customer.bookingsCount || 0}</Badge>
                          </td>
                          <td className="fw-bold text-success">₹{(customer.totalSpent || 0).toLocaleString()}</td>
                          <td>
                            <Badge 
                              bg={customer.status === "active" ? "success" : "danger"}
                              style={{ borderRadius: '8px', padding: '5px 10px' }}
                            >
                              {customer.status?.toUpperCase() || "ACTIVE"}
                            </Badge>
                          </td>
                          <td>
                            <button
                              className="btn-pro btn-pro-view btn-pro-sm me-2"
                              onClick={() => handleViewDetails(customer)}
                            >
                              <FaEye /> View
                            </button>
                            {customer.status === "active" ? (
                              <button
                                className="btn-pro btn-pro-reject btn-pro-sm"
                                onClick={() => handleUpdateStatus(customer.id, "blocked")}
                              >
                                <FaUserTimes /> Block
                              </button>
                            ) : (
                              <button
                                className="btn-pro btn-pro-confirm btn-pro-sm"
                                onClick={() => handleUpdateStatus(customer.id, "active")}
                              >
                                <FaUserCheck /> Unblock
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
              )}
            </Card.Body>
          </Card>
        </motion.div>
      </div>

      {/* Customer Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
        centered
        className="customer-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Customer Profile - {selectedCustomer?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCustomer && (
            <>
              <div className="text-center mb-4">
                <div className="customer-avatar mx-auto">
                  {selectedCustomer.name?.charAt(0).toUpperCase()}
                </div>
                <h4 className="mt-3 fw-bold">{selectedCustomer.name}</h4>
                <Badge 
                  bg={selectedCustomer.status === "active" ? "success" : "danger"}
                  style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  {selectedCustomer.status?.toUpperCase()}
                </Badge>
              </div>

              <Row>
                <Col md={6}>
                  <div className="detail-item">
                    <strong><FaEnvelope className="text-primary" /> Email</strong>
                    <p>{selectedCustomer.email}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-item">
                    <strong><FaPhone className="text-success" /> Mobile</strong>
                    <p>{selectedCustomer.mobile}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-item">
                    <strong><FaCalendarAlt className="text-info" /> Joined</strong>
                    <p>{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-item">
                    <strong><FaDollarSign className="text-warning" /> Total Spent</strong>
                    <p>₹{(selectedCustomer.totalSpent || 0).toLocaleString()}</p>
                  </div>
                </Col>
              </Row>

              <h5 className="mt-4 fw-bold" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                <FaShoppingBag className="me-2 text-primary" />
                Booking History ({selectedCustomer.bookings?.length || 0})
              </h5>
              <div className="table-responsive">
                <Table hover size="sm" className="customers-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Event</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Manager</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.bookings?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-3">No bookings yet</td>
                      </tr>
                    ) : (
                      selectedCustomer.bookings?.map((booking) => (
                        <tr key={booking.id}>
                          <td><strong>#{booking.id}</strong></td>
                          <td>{booking.event?.name || "N/A"}</td>
                          <td>{new Date(booking.eventDate).toLocaleDateString()}</td>
                          <td className="fw-bold text-success">₹{(booking.totalPrice || 0).toLocaleString()}</td>
                          <td>
                            <Badge 
                              bg={
                                booking.status === "completed" ? "success" :
                                booking.status === "confirmed" ? "info" :
                                booking.status === "pending" ? "warning" : "secondary"
                              }
                              style={{ borderRadius: '6px' }}
                            >
                              {booking.status}
                            </Badge>
                          </td>
                          <td>{booking.manager?.name || "N/A"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
