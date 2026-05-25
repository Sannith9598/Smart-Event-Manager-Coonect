import { motion } from "framer-motion";

const filters = [
  { label: "🔥 Trending", value: "trending" },
  { label: "💍 Wedding", value: "wedding" },
  { label: "🎂 Birthday", value: "birthday" },
  { label: "🏢 Corporate", value: "corporate" },
  { label: "🎉 Party", value: "party" },
  { label: "⭐ Top Rated", value: "top-rated" },
  { label: "💰 Under ₹50K", value: "under-50k" },
  { label: "🎪 Festival", value: "festival" },
  { label: "🎓 Graduation", value: "graduation" },
  { label: "💐 Anniversary", value: "anniversary" },
];

export default function QuickFilters({ activeFilter, onFilterChange }) {
  return (
    <div className="quick-filters-container">
      <div className="quick-filters-scroll">
        {filters.map((filter, index) => (
          <motion.button
            key={filter.value}
            className={`quick-filter-chip ${activeFilter === filter.value ? "active" : ""}`}
            onClick={() => onFilterChange(activeFilter === filter.value ? null : filter.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            {filter.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
