import { Row, Col, Card, ProgressBar } from "react-bootstrap";
import { FaCalendarAlt, FaUsers, FaStar } from "react-icons/fa";

export default function StatsCards({ events, bookings, onFilterChange }) {
  const getTotalRevenue = () => {
    if (!bookings || bookings.length === 0) return 0;
    return bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .reduce((total, booking) => total + (parseFloat(booking.totalPrice) || parseFloat(booking.Event?.price) || 0), 0);
  };

  const getCompletionRate = () => {
    if (!bookings || bookings.length === 0) return 0;
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
    return total === 0 ? 0 : (completed / total) * 100;
  };

  const getUpcomingEvents = () => {
    if (!bookings || bookings.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings.filter((b) => {
      const eventDate = new Date(b.eventDate || b.customization?.eventDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today && (b.status === "pending" || b.status === "confirmed");
    }).length;
  };

  const handleCardClick = (type, value) => {
    if (onFilterChange) {
      onFilterChange(type, value);
    }
  };

  return (
    <Row className="mb-4">
      <Col lg={3} md={6} className="mb-3">
        <Card 
          className="stat-card h-100" 
          onClick={() => handleCardClick('events', 'all')}
          style={{ cursor: 'pointer' }}
        >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted mb-2">Total Events</h6>
                <h2 className="mb-0">{events?.length || 0}</h2>
                <small className="text-success">Click to view all events</small>
              </div>
              <div className="stat-icon"><FaCalendarAlt size={40} /></div>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-3">
        <Card 
          className="stat-card h-100" 
          onClick={() => handleCardClick('bookings', 'all')}
          style={{ cursor: 'pointer' }}
        >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted mb-2">Total Bookings</h6>
                <h2 className="mb-0">{bookings?.length || 0}</h2>
                <small className="text-success">Click to view all bookings</small>
              </div>
              <div className="stat-icon"><FaUsers size={40} /></div>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-3">
        <Card 
          className="stat-card h-100" 
          onClick={() => handleCardClick('bookings', 'upcoming')}
          style={{ cursor: 'pointer' }}
        >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted mb-2">Upcoming Events</h6>
                <h2 className="mb-0">{getUpcomingEvents()}</h2>
                <small className="text-success">Click to view upcoming</small>
              </div>
              <div className="stat-icon"><FaStar size={40} /></div>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-3">
        <Card 
          className="stat-card h-100" 
          onClick={() => handleCardClick('revenue', 'all')}
          style={{ cursor: 'pointer' }}
        >
          <Card.Body>
            <div>
              <h6 className="text-muted mb-2">Total Revenue</h6>
              <h2 className="mb-0">₹{Math.round(getTotalRevenue()).toLocaleString()}</h2>
              <div className="mt-2">
                <small className="text-muted">Completion Rate: {getCompletionRate().toFixed(1)}%</small>
                <ProgressBar now={getCompletionRate()} variant="success" className="mt-1" style={{ height: '5px' }} />
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}