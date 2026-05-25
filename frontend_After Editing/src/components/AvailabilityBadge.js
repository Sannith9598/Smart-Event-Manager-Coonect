import { motion } from "framer-motion";

// Shows availability status dot on manager cards
export default function AvailabilityBadge({ bookingsCount = 0, maxCapacity = 10 }) {
  const ratio = bookingsCount / maxCapacity;
  
  let status, color, label;
  if (ratio >= 0.9) {
    status = "busy";
    color = "#ef4444";
    label = "Fully Booked";
  } else if (ratio >= 0.5) {
    status = "moderate";
    color = "#f59e0b";
    label = "Busy";
  } else {
    status = "available";
    color = "#10b981";
    label = "Available";
  }

  return (
    <motion.div
      className="availability-badge"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, delay: 0.2 }}
    >
      <span
        className="availability-dot"
        style={{ backgroundColor: color }}
      />
      <span className="availability-label" style={{ color }}>
        {label}
      </span>
    </motion.div>
  );
}
