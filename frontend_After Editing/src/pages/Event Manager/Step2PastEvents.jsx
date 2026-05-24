import { useState } from "react";
import { Form, Spinner, Image } from "react-bootstrap";
import { motion } from "framer-motion";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTimes,
  FaCloudUploadAlt,
  FaPlay
} from "react-icons/fa";
import API from "../../services/api";

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_MEDIA_PER_EVENT = 3; // During verification, max 3 per event

export default function Step2PastEvents({ formData, setFormData, validationErrors, setValidationErrors }) {
  const [uploading, setUploading] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [dateErrors, setDateErrors] = useState({});

  const isPastDate = (dateString) => {
    if (!dateString) return true;
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const addPastEvent = () => {
    setFormData(prev => ({
      ...prev,
      pastEvents: [...prev.pastEvents, { title: "", description: "", date: "", clientName: "", imageUrl: "", media: [] }]
    }));
    if (validationErrors.pastEvents) {
      setValidationErrors(prev => ({ ...prev, pastEvents: false }));
    }
  };

  const updatePastEvent = (index, field, value) => {
    const updatedEvents = [...formData.pastEvents];
    updatedEvents[index] = { ...updatedEvents[index], [field]: value };
    setFormData(prev => ({ ...prev, pastEvents: updatedEvents }));

    if (field === 'date') {
      if (value && !isPastDate(value)) {
        setDateErrors(prev => ({ ...prev, [index]: "Event date must be in the past" }));
      } else {
        setDateErrors(prev => { const n = { ...prev }; delete n[index]; return n; });
      }
    }
  };

  const removePastEvent = (index) => {
    setFormData(prev => ({
      ...prev,
      pastEvents: prev.pastEvents.filter((_, i) => i !== index)
    }));
    setDateErrors(prev => { const n = { ...prev }; delete n[index]; return n; });
    setUploadErrors(prev => { const n = { ...prev }; delete n[index]; return n; });
  };

  const handleMediaUpload = async (eventIndex, files) => {
    const event = formData.pastEvents[eventIndex];
    const currentMediaCount = (event.media || []).length;

    if (currentMediaCount + files.length > MAX_MEDIA_PER_EVENT) {
      setUploadErrors(prev => ({ ...prev, [eventIndex]: `Maximum ${MAX_MEDIA_PER_EVENT} media files per event during verification` }));
      return;
    }

    // Validate each file before uploading
    for (const file of files) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        setUploadErrors(prev => ({ ...prev, [eventIndex]: "Only image (JPEG, PNG, WEBP) and video (MP4, MOV, WEBM) files are allowed" }));
        return;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        setUploadErrors(prev => ({ ...prev, [eventIndex]: "File too large. Max 5MB for images, 50MB for videos" }));
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        setUploadErrors(prev => ({ ...prev, [eventIndex]: "File too large. Max 5MB for images, 50MB for videos" }));
        return;
      }
    }

    setUploadErrors(prev => { const n = { ...prev }; delete n[eventIndex]; return n; });
    setUploading(prev => ({ ...prev, [eventIndex]: true }));

    try {
      const uploadedMedia = [];
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append("media", file);
        const res = await API.post("/verification/upload-media", formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedMedia.push({
          url: res.data.url,
          publicId: res.data.publicId,
          mediaType: res.data.mediaType,
          thumbnailUrl: res.data.thumbnailUrl
        });
      }

      // Update the event's media array
      const updatedEvents = [...formData.pastEvents];
      updatedEvents[eventIndex] = {
        ...updatedEvents[eventIndex],
        media: [...(updatedEvents[eventIndex].media || []), ...uploadedMedia]
      };
      setFormData(prev => ({ ...prev, pastEvents: updatedEvents }));
    } catch (err) {
      console.error("Media upload error:", err);
      setUploadErrors(prev => ({
        ...prev,
        [eventIndex]: err.response?.data?.message || "Failed to upload media. Please try again."
      }));
    } finally {
      setUploading(prev => ({ ...prev, [eventIndex]: false }));
    }
  };

  const removeMedia = (eventIndex, mediaIndex) => {
    const updatedEvents = [...formData.pastEvents];
    const updatedMedia = [...(updatedEvents[eventIndex].media || [])];
    updatedMedia.splice(mediaIndex, 1);
    updatedEvents[eventIndex] = { ...updatedEvents[eventIndex], media: updatedMedia };
    setFormData(prev => ({ ...prev, pastEvents: updatedEvents }));
  };

  // Calculate total media across all events
  const totalMedia = formData.pastEvents.reduce((count, event) => count + (event.media || []).length, 0);
  const experienceValue = parseFloat(formData.yearsOfExperience) || 0;

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <div className="vm2-field-group">
        <div className="vm2-section-header">
          <label className={`vm2-label ${validationErrors.pastEvents ? 'error' : ''}`}>
            <FaCalendarAlt className="vm2-label-icon" />
            Past Events with Media <span className="required">*</span>
          </label>
          <button type="button" className="vm2-add-event-btn" onClick={addPastEvent}>
            + Add Event
          </button>
        </div>

        {/* Info about requirements */}
        <div className="vm2-tip-box mb-3">
          {experienceValue > 0.1 ? (
            <span><strong>Required:</strong> At least 1 past event with title &amp; description. At least 1 media file total.</span>
          ) : (
            <span><strong>Note:</strong> At least 1 media file is required across all past events.</span>
          )}
          <br />
          <small className="text-muted">Total media uploaded: {totalMedia}</small>
        </div>

        {formData.pastEvents.length === 0 && (
          <div className="vm2-empty-events">
            <div className="vm2-empty-events-icon">&#128197;</div>
            <h6>No events added yet</h6>
            <p>Add past events to demonstrate your experience</p>
            <button type="button" className="vm2-add-event-btn" onClick={addPastEvent}>
              + Add Your First Event
            </button>
          </div>
        )}

        {formData.pastEvents.map((event, index) => (
          <motion.div
            key={index}
            className="vm2-event-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="vm2-event-card-header">
              <span className="vm2-event-number">Event {index + 1}</span>
              <button type="button" className="vm2-remove-event-btn" onClick={() => removePastEvent(index)}>
                <FaTimes /> Remove
              </button>
            </div>

            <div className="vm2-event-fields">
              <Form.Control
                placeholder="Event Title * (e.g., Grand Wedding at Taj)"
                value={event.title}
                onChange={(e) => updatePastEvent(index, "title", e.target.value)}
                className={`vm2-input ${validationErrors.pastEvents && (!event.title || event.title.trim() === "") ? 'is-invalid' : ''}`}
                maxLength={100}
              />

              <Form.Control
                placeholder="Client Name (Optional)"
                value={event.clientName || ""}
                onChange={(e) => updatePastEvent(index, "clientName", e.target.value)}
                className="vm2-input"
                maxLength={100}
              />

              <div className="vm2-date-field">
                <Form.Control
                  type="date"
                  value={event.date || ""}
                  onChange={(e) => updatePastEvent(index, "date", e.target.value)}
                  className={`vm2-input ${dateErrors[index] ? 'is-invalid' : ''}`}
                />
                {event.date && isPastDate(event.date) && (
                  <small className="text-success"><FaCheckCircle /> {formatDate(event.date)}</small>
                )}
                {event.date && !isPastDate(event.date) && (
                  <small className="text-danger">Date must be in the past</small>
                )}
                {!event.date && <small className="text-muted">Optional: When did this event take place?</small>}
              </div>

              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Event Description *"
                value={event.description}
                onChange={(e) => updatePastEvent(index, "description", e.target.value)}
                className={`vm2-input ${validationErrors.pastEvents && (!event.description || event.description.trim() === "") ? 'is-invalid' : ''}`}
                maxLength={1000}
              />

              <Form.Control
                type="url"
                placeholder="Event Image URL (Optional legacy field)"
                value={event.imageUrl || ""}
                onChange={(e) => updatePastEvent(index, "imageUrl", e.target.value)}
                className="vm2-input"
              />

              {/* Media Upload Section */}
              <div className="vm2-media-section mt-2">
                <label className="vm2-label" style={{ fontSize: '0.85rem' }}>
                  <FaCloudUploadAlt className="vm2-label-icon" />
                  Media ({(event.media || []).length}/{MAX_MEDIA_PER_EVENT})
                </label>

                <div className="vm2-upload-zone" style={{ padding: '12px' }}>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                    onChange={(e) => handleMediaUpload(index, Array.from(e.target.files))}
                    disabled={uploading[index] || (event.media || []).length >= MAX_MEDIA_PER_EVENT}
                    className="vm2-file-input"
                    id={`media-upload-${index}`}
                  />
                  <label htmlFor={`media-upload-${index}`} className="vm2-upload-label" style={{ padding: '8px' }}>
                    <FaCloudUploadAlt className="vm2-upload-icon" style={{ fontSize: '1.5rem' }} />
                    <span className="vm2-upload-text" style={{ fontSize: '0.85rem' }}>
                      {uploading[index] ? "Uploading..." : "Click to upload images or videos"}
                    </span>
                    <span className="vm2-upload-hint" style={{ fontSize: '0.75rem' }}>
                      Images: JPEG, PNG, WEBP (max 5MB) | Videos: MP4, MOV, WEBM (max 50MB)
                    </span>
                  </label>
                  {uploading[index] && (
                    <div className="vm2-upload-progress">
                      <Spinner animation="border" size="sm" /> Uploading...
                    </div>
                  )}
                </div>

                {uploadErrors[index] && (
                  <div className="vm2-error-msg">{uploadErrors[index]}</div>
                )}

                {/* Media Preview Grid */}
                {(event.media || []).length > 0 && (
                  <div className="vm2-image-grid mt-2">
                    {event.media.map((mediaItem, mediaIdx) => (
                      <motion.div
                        key={mediaIdx}
                        className="vm2-image-item"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {mediaItem.mediaType === 'image' ? (
                          <Image
                            src={mediaItem.thumbnailUrl || mediaItem.url}
                            className="vm2-image-thumb"
                            style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="vm2-video-thumb" style={{ position: 'relative', width: '200px', height: '150px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                            <video
                              src={mediaItem.url}
                              style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }}
                            />
                            <div style={{ position: 'absolute', color: '#fff', fontSize: '2rem', opacity: 0.8 }}>
                              <FaPlay />
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          className="vm2-image-remove"
                          onClick={() => removeMedia(index, mediaIdx)}
                        >
                          <FaTimes />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {validationErrors.pastEvents && (
          <div className="vm2-error-msg">
            {experienceValue > 0.1
              ? "Managers with experience must add at least one past event with title and description"
              : "Please ensure all events have a title and description, and dates are in the past"}
          </div>
        )}

        {validationErrors.media && (
          <div className="vm2-error-msg">At least one media file is required across all past events</div>
        )}
      </div>
    </motion.div>
  );
}
