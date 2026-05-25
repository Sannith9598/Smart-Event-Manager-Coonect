import { motion } from "framer-motion";

// Reusable skeleton components for loading states
export function SkeletonCard({ count = 1 }) {
  return (
    <div className="d-flex gap-3 flex-wrap">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image skeleton-shimmer" />
          <div className="skeleton-body">
            <div className="skeleton-line skeleton-shimmer" style={{ width: "70%" }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: "50%" }} />
            <div className="skeleton-line skeleton-shimmer short" style={{ width: "30%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonEventCard({ count = 3 }) {
  return (
    <div className="skeleton-event-grid">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="skeleton-event-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="skeleton-event-image skeleton-shimmer" />
          <div className="skeleton-event-body">
            <div className="skeleton-line skeleton-shimmer" style={{ width: "80%", height: "14px" }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: "60%", height: "10px" }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: "10px" }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: "50%", height: "12px", marginTop: "8px" }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonManagerBubble({ count = 6 }) {
  return (
    <div className="d-flex gap-3 overflow-hidden py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-bubble">
          <div className="skeleton-avatar skeleton-shimmer" />
          <div className="skeleton-line skeleton-shimmer" style={{ width: "60px", height: "8px", margin: "6px auto 0" }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="skeleton-profile">
      <div className="skeleton-profile-header skeleton-shimmer" />
      <div className="skeleton-profile-body">
        <div className="skeleton-avatar-large skeleton-shimmer" />
        <div className="skeleton-line skeleton-shimmer" style={{ width: "200px", height: "18px" }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: "150px", height: "12px" }} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <div className="skeleton-line skeleton-shimmer" style={{ width: "50px", height: "50px", borderRadius: "8px" }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-line skeleton-shimmer" style={{ width: "60%", height: "12px" }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: "10px", marginTop: "6px" }} />
          </div>
          <div className="skeleton-line skeleton-shimmer" style={{ width: "80px", height: "12px" }} />
        </div>
      ))}
    </div>
  );
}
