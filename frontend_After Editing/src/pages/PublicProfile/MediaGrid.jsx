import { Spinner, Badge } from "react-bootstrap";
import { FaPlay, FaCheckCircle } from "react-icons/fa";

export default function MediaGrid({ events, onEventClick, loading, hasMore, onLoadMore }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No past events to display yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="row g-3">
        {events.map((event, idx) => (
          <div key={idx} className="col-12 col-sm-6 col-md-4">
            <div
              className="media-grid-item"
              onClick={() => onEventClick(event)}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '1/1',
                background: '#f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
            >
              {/* Thumbnail */}
              {getEventThumbnail(event)}

              {/* Verified Badge */}
              {event.source === 'verification' && (
                <Badge
                  bg="success"
                  style={{
                    position: 'absolute', top: '8px', left: '8px',
                    fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px'
                  }}
                >
                  <FaCheckCircle /> Verified
                </Badge>
              )}

              {/* Overlay with title */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding: '20px 12px 12px',
                color: '#fff'
              }}>
                <p className="mb-0 fw-bold" style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                  {event.title}
                </p>
                {event.date && (
                  <small className="opacity-75">{new Date(event.date).toLocaleDateString()}</small>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center mt-4">
        {loading && <Spinner animation="border" size="sm" />}
        {hasMore && !loading && (
          <button
            className="btn btn-outline-primary"
            onClick={onLoadMore}
          >
            Load More
          </button>
        )}
      </div>
    </div>
  );
}

function getEventThumbnail(event) {
  // Try to get first media item
  if (event.media && event.media.length > 0) {
    const firstMedia = event.media[0];
    if (firstMedia.mediaType === 'video') {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {firstMedia.thumbnailUrl ? (
            <img src={firstMedia.thumbnailUrl} alt={event.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <video src={firstMedia.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          <div style={{ position: 'absolute', color: '#fff', fontSize: '2.5rem', opacity: 0.9, background: 'rgba(0,0,0,0.3)', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaPlay style={{ fontSize: '1.2rem', marginLeft: '3px' }} />
          </div>
        </div>
      );
    } else {
      return (
        <img
          src={firstMedia.thumbnailUrl || firstMedia.url}
          alt={event.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }
  }

  // Fallback to imageUrl (legacy)
  if (event.imageUrl) {
    return (
      <img
        src={event.imageUrl}
        alt={event.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  // No media placeholder
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9ecef', color: '#6c757d' }}>
      <span style={{ fontSize: '0.85rem' }}>No media</span>
    </div>
  );
}
