import { useState } from "react";
import { Modal, Badge, Carousel } from "react-bootstrap";
import { FaCheckCircle, FaCalendarAlt, FaUser, FaPlay, FaExpand } from "react-icons/fa";
import ImageLightbox from "../../components/ImageLightbox";

export default function MediaDetailModal({ event, profile, onClose }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!event) return null;

  const allMedia = event.media || [];
  const hasLegacyImage = event.imageUrl && allMedia.length === 0;

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
    <Modal show={true} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          {event.title}
          {event.source === 'verification' && (
            <Badge bg="success" style={{ fontSize: '0.7rem' }}>
              <FaCheckCircle /> Verified
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Media Carousel */}
        {allMedia.length > 0 && (
          <Carousel className="mb-3" interval={null}>
            {allMedia.map((mediaItem, idx) => (
              <Carousel.Item key={idx}>
                <div
                  style={{
                    height: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    borderRadius: '8px',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  onClick={() => openLightbox(idx)}
                >
                  {mediaItem.mediaType === 'video' ? (
                    <video
                      src={mediaItem.url}
                      controls
                      onClick={(e) => e.stopPropagation()}
                      style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <>
                      <img
                        src={mediaItem.url}
                        alt={`${event.title} - ${idx + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                      />
                      <button
                        className="lightbox-expand-btn"
                        onClick={() => openLightbox(idx)}
                        style={{
                          position: 'absolute', top: '10px', right: '10px',
                          background: 'rgba(0,0,0,0.6)', color: '#fff',
                          border: 'none', borderRadius: '50%',
                          width: '36px', height: '36px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        aria-label="View fullscreen"
                      >
                        <FaExpand />
                      </button>
                    </>
                  )}
                </div>
              </Carousel.Item>
            ))}
          </Carousel>
        )}

        {/* Legacy image fallback */}
        {hasLegacyImage && (
          <div className="mb-3 text-center">
            <img
              src={event.imageUrl}
              alt={event.title}
              style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        )}

        {/* Event Details */}
        <div className="event-details">
          {event.description && (
            <p className="mb-3" style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
              {event.description}
            </p>
          )}

          <div className="d-flex flex-wrap gap-3 text-muted" style={{ fontSize: '0.85rem' }}>
            {event.date && (
              <span className="d-flex align-items-center gap-1">
                <FaCalendarAlt /> {new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            {event.clientName && (
              <span className="d-flex align-items-center gap-1">
                <FaUser /> {event.clientName}
              </span>
            )}
            {profile && (
              <span className="d-flex align-items-center gap-1">
                By: {profile.businessName}
              </span>
            )}
            {event.cost && (
              <span>
                ₹{Number(event.cost).toLocaleString()}
              </span>
            )}
          </div>

          {/* Media count */}
          {allMedia.length > 0 && (
            <small className="text-muted d-block mt-2">
              {allMedia.filter(m => m.mediaType === 'image').length} image(s),{' '}
              {allMedia.filter(m => m.mediaType === 'video').length} video(s)
            </small>
          )}
        </div>
      </Modal.Body>
    </Modal>

    {/* Fullscreen Lightbox */}
    {lightboxOpen && allMedia.length > 0 && (
      <ImageLightbox
        images={allMedia}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    )}
    </>
  );
}
