import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus } from "react-icons/fa";

export default function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, handlePrev, handleNext]);

  const currentImage = images[currentIndex];
  const isVideo = currentImage?.mediaType === "video" || currentImage?.url?.match(/\.(mp4|webm|mov)$/i);

  return (
    <AnimatePresence>
      <motion.div
        className="lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Close button */}
        <button className="lightbox-close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              className="lightbox-nav lightbox-prev"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              aria-label="Previous"
            >
              <FaChevronLeft />
            </button>
            <button
              className="lightbox-nav lightbox-next"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              aria-label="Next"
            >
              <FaChevronRight />
            </button>
          </>
        )}

        {/* Image/Video */}
        <motion.div
          className="lightbox-content"
          onClick={(e) => e.stopPropagation()}
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {isVideo ? (
            <video
              src={currentImage?.url || currentImage}
              controls
              autoPlay
              className="lightbox-media"
              style={{ maxWidth: "90vw", maxHeight: "85vh" }}
            />
          ) : (
            <img
              src={currentImage?.url || currentImage?.thumbnailUrl || currentImage}
              alt={`Gallery ${currentIndex + 1}`}
              className="lightbox-media"
              style={{
                transform: `scale(${zoom})`,
                maxWidth: "90vw",
                maxHeight: "85vh",
                transition: "transform 0.2s",
              }}
            />
          )}
        </motion.div>

        {/* Zoom controls */}
        {!isVideo && (
          <div className="lightbox-zoom-controls">
            <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.25)); }} aria-label="Zoom out">
              <FaSearchMinus />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.25)); }} aria-label="Zoom in">
              <FaSearchPlus />
            </button>
          </div>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <div className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
