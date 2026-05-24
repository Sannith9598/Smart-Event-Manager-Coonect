// components/ManagerCard.js
import { Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";

function StarRating({ value = 0 }) {
  return (
    <div className="d-flex gap-1 my-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar key={star} color={star <= Math.round(value) ? "#ffc107" : "#e4e5e9"} size={16} />
      ))}
      <span className="ms-1 text-muted" style={{ fontSize: "13px" }}>({value.toFixed(1)})</span>
    </div>
  );
}

export default function ManagerCard({ data }) {
  const navigate = useNavigate();

  return (
    <Card className="glass-card mb-4">
      <Card.Img
        variant="top"
        src={data.portfolioUrl || "https://via.placeholder.com/300"}
        loading="lazy"
      />

      <Card.Body>
        <Card.Title>{data.description}</Card.Title>

        <StarRating value={data.rating || 0} />

        <p>📍 {data.location}</p>
        <p>💰 ₹{data.price}</p>

        <Button onClick={() => navigate(`/booking/${data.id}`)}>
          Book Now
        </Button>
      </Card.Body>
    </Card>
  );
}