import { Row, Col, Card, ProgressBar, Badge } from "react-bootstrap";
import { FaChartLine, FaRupeeSign, FaCalendarCheck, FaLayerGroup } from "react-icons/fa";

export default function AnalyticsTab({ events = [], bookings = [] }) {


  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);
  const totalEvents = events.length;


  const bookingCountMap = {};
  bookings.forEach((b) => {
    bookingCountMap[b.eventId] = (bookingCountMap[b.eventId] || 0) + 1;
  });

  const topEvents = [...events]
    .map((event) => ({
      ...event,
      count: bookingCountMap[event.id] || 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const statusCounts = {
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const maxStatus = Math.max(...Object.values(statusCounts), 1);

  return (
    <Row>

      <Col md={4} className="mb-4">
        <Card className="text-center shadow-sm">
          <Card.Body>
            <FaCalendarCheck size={30} className="mb-2 text-primary" />
            <h5>{totalBookings}</h5>
            <p className="mb-0 text-muted">Total Bookings</p>
          </Card.Body>
        </Card>
      </Col>

      <Col md={4} className="mb-4">
        <Card className="text-center shadow-sm">
          <Card.Body>
            <FaRupeeSign size={30} className="mb-2 text-success" />
            <h5>₹{Math.round(totalRevenue).toLocaleString()}</h5>
            <p className="mb-0 text-muted">Total Revenue</p>
          </Card.Body>
        </Card>
      </Col>

      <Col md={4} className="mb-4">
        <Card className="text-center shadow-sm">
          <Card.Body>
            <FaLayerGroup size={30} className="mb-2 text-warning" />
            <h5>{totalEvents}</h5>
            <p className="mb-0 text-muted">Total Events</p>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} className="mb-4">
        <Card>
          <Card.Header>
            <h5 className="mb-0">📊 Booking Status</h5>
          </Card.Header>
          <Card.Body>

            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="mb-3">
                <div className="d-flex justify-content-between">
                  <span className="text-capitalize">{status}</span>
                  <Badge bg="secondary">{count}</Badge>
                </div>
                <ProgressBar
                  now={(count / maxStatus) * 100}
                  variant={
                    status === "confirmed"
                      ? "success"
                      : status === "pending"
                      ? "warning"
                      : "danger"
                  }
                />
              </div>
            ))}

          </Card.Body>
        </Card>
      </Col>

      <Col md={6} className="mb-4">
        <Card>
          <Card.Header>
            <h5 className="mb-0">🏆 Top Performing Events</h5>
          </Card.Header>
          <Card.Body>

            {topEvents.length > 0 ? (
              topEvents.map((event, idx) => (
                <div key={event.id} className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>
                      {idx + 1}. {event.name}
                    </span>
                    <Badge bg="primary">{event.count} bookings</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted">
                <FaChartLine size={40} className="mb-2" />
                <p>No data available</p>
              </div>
            )}

          </Card.Body>
        </Card>
      </Col>

    </Row>
  );
}