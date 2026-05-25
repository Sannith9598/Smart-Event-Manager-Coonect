import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const MAX_ITEMS = 8;
const STORAGE_KEY = "recentlyViewed";

// Utility to add an item to recently viewed
export function addToRecentlyViewed(item) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const filtered = existing.filter((i) => i.id !== item.id || i.type !== item.type);
    const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error saving recently viewed:", e);
  }
}

export default function RecentlyViewed() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setItems(stored);
    } catch {
      setItems([]);
    }
  }, []);

  if (items.length === 0) return null;

  const handleClick = (item) => {
    if (item.type === "manager") {
      navigate(`/manager/${item.id}/profile`);
    } else if (item.type === "event") {
      navigate(`/event/${item.id}`);
    }
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="recently-viewed-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="recently-viewed-header">
          <h6>🕐 Recently Viewed</h6>
          <button className="recently-viewed-clear" onClick={handleClear}>
            Clear
          </button>
        </div>
        <div className="recently-viewed-scroll">
          {items.map((item, index) => (
            <motion.div
              key={`${item.type}-${item.id}`}
              className="recently-viewed-item"
              onClick={() => handleClick(item)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -3 }}
            >
              <img
                src={
                  item.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || "E")}&background=6366f1&color=fff&size=60`
                }
                alt={item.name}
                className="recently-viewed-img"
              />
              <span className="recently-viewed-name">{item.name}</span>
              <span className="recently-viewed-type">{item.type === "manager" ? "👤" : "🎉"}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
