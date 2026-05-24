import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, ProgressBar, Badge } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaChartLine, FaCalendarCheck, FaMoneyBillWave, FaUsers, FaFire, FaArrowUp, FaTrophy } from "react-icons/fa";
import API from "../../services/api";
import AppNavbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await API.get("/event/analytics");
      setAnalytics(res.data.data);
    } catch (err) {
      console.error("Analytics error:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppNavbar />
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading analytics...</p>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppNavbar />
        <Container className="py-5">
          <Alert variant="danger">{error}</Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{`
        .analytics-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding-bottom: 0;
        }
        .analytics-hero {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
          border-radius: 20px;
          padding: 35px 40px;
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(99, 102, 241, 0.3);
        }
        .analytics-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          border-radius: 50%;
        }
        .analytics-hero::after {
          content: '';
          position: absolute;
          bottom: -40%;
          left: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
          border-radius: 50%;
        }
        .analytics-hero h2 {
          color: white;
          font-weight: 700;
          font-size: 1.8rem;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }
        .analytics-hero p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          margin-bottom: 0;
          position: relative;
          z-index: 1;
        }
        .metric-card {
          border: none;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          height: 100%;
        }
        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
        }
        .metric-card .metric-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 12px;
        }
        .metric-card .metric-value {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        .metric-card .metric-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }
        .metric-revenue .metric-icon { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669; }
        .metric-revenue .metric-value { color: #059669; }
        .metric-bookings .metric-icon { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; }
        .metric-bookings .metric-value { color: #4f46e5; }
        .metric-conversion .metric-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
        .metric-conversion .metric-value { color: #d97706; }
        .metric-completed .metric-icon { background: linear-gradient(135deg, #cffafe, #a5f3fc); color: #0891b2; }
        .metric-completed .metric-value { color: #0891b2; }
        .analytics-card {
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .analytics-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }
        .analytics-card .card-body {
          padding: 24px;
        }
        .analytics-card h5 {
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-progress-item {
          margin-bottom: 18px;
        }
        .status-progress-item .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          align-items: center;
        }
        .status-progress-item .progress-label {
          font-weight: 500;
          color: #475569;
        }
        .status-progress-item .progress-value {
          font-weight: 700;
          font-size: 0.9rem;
        }
        .status-progress-item .progress {
          height: 10px;
          border-radius: 10px;
          background: #f1f5f9;
        }
        .peak-days-table thead th {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 12px;
        }
        .peak-days-table tbody td {
          padding: 12px;
          border-color: #f1f5f9;
          vertical-align: middle;
        }
        .peak-days-table tbody tr:hover {
          background: #f8fafc;
        }
        .revenue-bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 220px;
          padding-top: 20px;
        }
        .revenue-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          flex: 1;
          height: 100%;
        }
        .revenue-bar .bar {
          width: 100%;
          max-width: 50px;
          border-radius: 10px 10px 0 0;
          min-height: 6px;
          transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .revenue-bar .bar:hover {
          opacity: 0.85;
          transform: scaleX(1.05);
        }
        .revenue-bar .bar-label {
          font-size: 11px;
          font-weight: 600;
          color: #059669;
          margin-bottom: 6px;
        }
        .revenue-bar .bar-month {
          font-size: 10px;
          color: #64748b;
          margin-top: 8px;
          font-weight: 500;
        }
        .popular-events-table thead th {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 14px 12px;
        }
        .popular-events-table tbody td {
          padding: 14px 12px;
          border-color: #f1f5f9;
          vertical-align: middle;
        }
        .popular-events-table tbody tr:hover {
          background: #f8fafc;
        }
        .rank-badge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
        }
        .rank-1 { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
        .rank-2 { background: linear-gradient(135deg, #e2e8f0, #cbd5e1); color: #475569; }
        .rank-3 { background: linear-gradient(135deg, #fed7aa, #fdba74); color: #c2410c; }
        .rank-default { background: #f1f5f9; color: #64748b; }

        /* Dark Mode */
        body.dark-mode .analytics-page {
          background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #1a1a2e 100%);
        }
        body.dark-mode .analytics-hero {
          background: linear-gradient(135deg, #312e81, #4c1d95);
        }
        body.dark-mode .metric-card {
          background: #1e293b;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        body.dark-mode .metric-card .metric-label {
          color: #94a3b8;
        }
        body.dark-mode .analytics-card {
          background: #1e293b;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        body.dark-mode .analytics-card h5 {
          color: #f1f5f9;
        }
        body.dark-mode .status-progress-item .progress-label {
          color: #cbd5e1;
        }
        body.dark-mode .status-progress-item .progress {
          background: #334155;
        }
        body.dark-mode .revenue-bar .bar-label {
          color: #6ee7b7;
        }
        body.dark-mode .revenue-bar .bar-month {
          color: #94a3b8;
        }
        body.dark-mode .peak-days-table thead th,
        body.dark-mode .popular-events-table thead th {
          background: #1e293b;
          color: #94a3b8;
          border-color: #374151;
        }
        body.dark-mode .peak-days-table tbody td,
        body.dark-mode .popular-events-table tbody td {
          color: #e2e8f0;
          border-color: #374151;
        }
        body.dark-mode .peak-days-table tbody tr:hover,
        body.dark-mode .popular-events-table tbody tr:hover {
          background: #334155;
        }
        body.dark-mode .rank-2 { background: #334155; color: #cbd5e1; }
        body.dark-mode .rank-default { background: #1e293b; color: #94a3b8; }
      `}</style>

      <AppNavbar />
      <div className="analytics-page">
        <Container className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero Header */}
            <div className="analytics-hero">
              <h2><FaChartLine className="me-3" />Business Analytics</h2>
              <p>Track your performance, revenue, and growth metrics</p>
            </div>
          </motion.div>

          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Row className="g-4 mb-4">
              <Col md={3} sm={6}>
                <div className="metric-card metric-revenue">
                  <div className="metric-icon"><FaMoneyBillWave /></div>
                  <div className="metric-value">₹{Math.round(parseFloat(analytics?.totalRevenue) || 0).toLocaleString()}</div>
                  <div className="metric-label">Total Revenue</div>
                </div>
              </Col>
              <Col md={3} sm={6}>
                <div className="metric-card metric-bookings">
                  <div className="metric-icon"><FaCalendarCheck /></div>
                  <div className="metric-value">{analytics?.totalBookings || 0}</div>
                  <div className="metric-label">Total Bookings</div>
                </div>
              </Col>
              <Col md={3} sm={6}>
                <div className="metric-card metric-conversion">
                  <div className="metric-icon"><FaArrowUp /></div>
                  <div className="metric-value">{analytics?.conversionRate || 0}%</div>
                  <div className="metric-label">Conversion Rate</div>
                </div>
              </Col>
              <Col md={3} sm={6}>
                <div className="metric-card metric-completed">
                  <div className="metric-icon"><FaUsers /></div>
                  <div className="metric-value">{analytics?.completedBookings || 0}</div>
                  <div className="metric-label">Completed Events</div>
                </div>
              </Col>
            </Row>
          </motion.div>

          {/* Booking Status & Peak Days */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Row className="g-4 mb-4">
              <Col md={6}>
                <Card className="analytics-card h-100">
                  <Card.Body>
                    <h5>📊 Booking Status</h5>
                    <div className="status-progress-item">
                      <div className="progress-header">
                        <span className="progress-label">Pending</span>
                        <span className="progress-value text-warning">{analytics?.pendingBookings || 0}</span>
                      </div>
                      <ProgressBar
                        variant="warning"
                        now={analytics?.totalBookings ? (analytics.pendingBookings / analytics.totalBookings) * 100 : 0}
                        style={{ height: '10px', borderRadius: '10px' }}
                      />
                    </div>
                    <div className="status-progress-item">
                      <div className="progress-header">
                        <span className="progress-label">Confirmed</span>
                        <span className="progress-value text-primary">{analytics?.confirmedBookings || 0}</span>
                      </div>
                      <ProgressBar
                        variant="primary"
                        now={analytics?.totalBookings ? (analytics.confirmedBookings / analytics.totalBookings) * 100 : 0}
                        style={{ height: '10px', borderRadius: '10px' }}
                      />
                    </div>
                    <div className="status-progress-item">
                      <div className="progress-header">
                        <span className="progress-label">Completed</span>
                        <span className="progress-value text-success">{analytics?.completedBookings || 0}</span>
                      </div>
                      <ProgressBar
                        variant="success"
                        now={analytics?.totalBookings ? (analytics.completedBookings / analytics.totalBookings) * 100 : 0}
                        style={{ height: '10px', borderRadius: '10px' }}
                      />
                    </div>
                    <div className="status-progress-item">
                      <div className="progress-header">
                        <span className="progress-label">Cancelled</span>
                        <span className="progress-value text-danger">{analytics?.cancelledBookings || 0}</span>
                      </div>
                      <ProgressBar
                        variant="danger"
                        now={analytics?.totalBookings ? (analytics.cancelledBookings / analytics.totalBookings) * 100 : 0}
                        style={{ height: '10px', borderRadius: '10px' }}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="analytics-card h-100">
                  <Card.Body>
                    <h5>📅 Peak Booking Days</h5>
                    {analytics?.peakDays?.length > 0 ? (
                      <Table hover size="sm" className="peak-days-table">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>Bookings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.peakDays.map((day, idx) => (
                            <tr key={idx}>
                              <td className="fw-semibold">{day.day}</td>
                              <td>
                                <Badge bg="primary" style={{ borderRadius: '8px', padding: '5px 12px' }}>{day.count}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <FaCalendarCheck size={30} className="mb-2" style={{ opacity: 0.3 }} />
                        <p>No booking data yet</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </motion.div>

          {/* Monthly Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Row className="g-4 mb-4">
              <Col md={12}>
                <Card className="analytics-card">
                  <Card.Body>
                    <h5>💰 Monthly Revenue (Last 6 Months)</h5>
                    {analytics?.monthlyRevenue?.length > 0 ? (
                      <div className="revenue-bar-chart">
                        {analytics.monthlyRevenue.map((month, idx) => {
                          const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.revenue), 1);
                          const heightPercent = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                          const barHeight = Math.max(heightPercent, month.revenue > 0 ? 10 : 3);
                          return (
                            <div key={idx} className="revenue-bar">
                              <span className="bar-label">
                                {month.revenue > 0 ? `₹${month.revenue >= 1000 ? `${(month.revenue / 1000).toFixed(1)}k` : month.revenue}` : ""}
                              </span>
                              <div
                                className="bar"
                                style={{
                                  height: `${barHeight}%`,
                                  background: month.revenue > 0 
                                    ? "linear-gradient(180deg, #6366f1, #8b5cf6)" 
                                    : "#e9ecef",
                                }}
                                title={`₹${month.revenue.toLocaleString()} (${month.bookings} bookings)`}
                              />
                              <span className="bar-month">{month.month}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <FaMoneyBillWave size={30} className="mb-2" style={{ opacity: 0.3 }} />
                        <p>No revenue data yet</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </motion.div>

          {/* Popular Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Row className="g-4 mb-4">
              <Col md={12}>
                <Card className="analytics-card">
                  <Card.Body>
                    <h5><FaTrophy className="text-warning" /> Popular Events</h5>
                    {analytics?.popularEvents?.length > 0 ? (
                      <Table hover responsive className="popular-events-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Event Name</th>
                            <th>Bookings</th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.popularEvents.map((event, idx) => (
                            <tr key={event.id}>
                              <td>
                                <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : 'rank-default'}`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="fw-semibold">{event.name}</td>
                              <td>
                                <Badge bg="info" style={{ borderRadius: '8px', padding: '5px 12px' }}>{event.bookingsCount}</Badge>
                              </td>
                              <td className="text-success fw-bold">
                                ₹{Math.round(parseFloat(event.revenue) || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <FaFire size={30} className="mb-2" style={{ opacity: 0.3 }} />
                        <p>No event data yet</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </motion.div>
        </Container>
      </div>
      <Footer />
    </>
  );
}
