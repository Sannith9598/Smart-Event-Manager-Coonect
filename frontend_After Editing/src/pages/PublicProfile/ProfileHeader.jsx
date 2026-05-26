import { Badge } from "react-bootstrap";
import { FaStar, FaMapMarkerAlt, FaClock, FaCheckCircle, FaExternalLinkAlt } from "react-icons/fa";

// Displays the manager's profile banner with photo, rating, experience, and service areas
export default function ProfileHeader({ profile }) {
  if (!profile) return null;

  return (
    <div className="profile-header-section mb-4 p-4" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      color: '#fff'
    }}>
      <div className="d-flex align-items-center gap-4 flex-wrap">
        {/* Profile Photo */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid rgba(255,255,255,0.5)',
          flexShrink: 0
        }}>
          {profile.profilePhoto ? (
            <img
              src={profile.profilePhoto}
              alt={profile.businessName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', fontWeight: 'bold'
            }}>
              {profile.businessName?.charAt(0) || '?'}
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-grow-1">
          <h2 className="mb-1" style={{ fontWeight: 700 }}>
            {profile.businessName}
            <FaCheckCircle className="ms-2" style={{ fontSize: '1rem', color: '#4ade80' }} />
          </h2>
          {profile.name && <p className="mb-1 opacity-75">{profile.name}</p>}

          <div className="d-flex align-items-center gap-3 flex-wrap mt-2">
            {/* Rating */}
            <span className="d-flex align-items-center gap-1">
              <FaStar style={{ color: '#fbbf24' }} />
              <strong>{profile.rating?.toFixed(1) || '0.0'}</strong>
              <small className="opacity-75">({profile.totalReviews} reviews)</small>
            </span>

            {/* Experience */}
            <span className="d-flex align-items-center gap-1">
              <FaClock />
              <span>{profile.yearsOfExperience?.toFixed(1) || '0.0'} years</span>
            </span>

            {/* Past Events Count */}
            <span className="opacity-75">
              {profile.totalPastEvents || 0} past events
            </span>
          </div>

          {/* Portfolio URL */}
          {profile.portfolioUrl && (
            <div className="mt-2">
              <a
                href={profile.portfolioUrl.startsWith('http') ? profile.portfolioUrl : `https://${profile.portfolioUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#fbbf24',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  transition: 'all 0.3s ease'
                }}
              >
                <FaExternalLinkAlt style={{ fontSize: '0.75rem' }} />
                Portfolio / Social Links
              </a>
            </div>
          )}

          {/* Service Areas */}
          {profile.serviceAreas && profile.serviceAreas.length > 0 && (
            <div className="mt-2 d-flex align-items-center gap-1 flex-wrap">
              <FaMapMarkerAlt className="opacity-75" />
              {profile.serviceAreas.slice(0, 5).map(area => (
                <Badge key={area} bg="light" text="dark" className="me-1" style={{ fontSize: '0.75rem' }}>
                  {area}
                </Badge>
              ))}
              {profile.serviceAreas.length > 5 && (
                <small className="opacity-75">+{profile.serviceAreas.length - 5} more</small>
              )}
            </div>
          )}

          {/* Business Types */}
          {profile.businessTypes && profile.businessTypes.length > 0 && (
            <div className="mt-2 d-flex flex-wrap gap-1">
              {profile.businessTypes.map(type => (
                <Badge key={type} bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>
                  {type}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {profile.description && (
        <p className="mt-3 mb-0 opacity-90" style={{ fontSize: '0.95rem' }}>
          {profile.description}
        </p>
      )}
    </div>
  );
}
