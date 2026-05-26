import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Fires a burst of animated confetti particles when the trigger prop flips to true
export default function ConfettiEffect({ trigger, duration = 2500 }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (trigger) {
      const colors = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#f97316"];
      const newParticles = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.8,
        delay: Math.random() * 0.3,
        xDrift: (Math.random() - 0.5) * 200,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="confetti-container" style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 9999,
          overflow: "hidden",
        }}>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: `${p.x}vw`,
                y: "-5vh",
                rotate: 0,
                scale: p.scale,
                opacity: 1,
              }}
              animate={{
                y: "110vh",
                x: `calc(${p.x}vw + ${p.xDrift}px)`,
                rotate: p.rotation + 720,
                opacity: [1, 1, 0.8, 0],
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: p.delay,
                ease: "easeIn",
              }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                width: "10px",
                height: "10px",
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                background: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
