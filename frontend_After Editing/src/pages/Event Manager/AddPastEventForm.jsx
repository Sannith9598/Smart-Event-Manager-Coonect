import { useState, useEffect } from "react";
import { Modal, Form, Button, Spinner, Image, Alert } from "react-bootstrap";
import { FaCloudUploadAlt, FaTimes, FaPlay } from "react-icons/fa";
import API from "../../services/api";

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_MEDIA_PER_EVENT = 10;

export default function AddPastEventForm({ show, onHide, onSuccess, editEvent, editIndex }) {
  const isEditing = editEvent !== undefined && editEvent !== null;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    clientName: "",
    cost: "",
    media: []
  });

  // Reset form when modal opens/closes or editEvent changes
  useEffect(() => {
    if (show) {
      resetForm();
    }
  }, [show, editEvent]);

  const resetForm = () => {
    if (editEvent) {
      setFormData({
        title: editEvent.title || "",
        description: editEvent.description || "",
        date: editEvent.date || "",
        clientName: editEvent.clientName || "",
        cost: editEvent.cost || "",
        media: editEvent.media || []
      });
    } else {
      setFormData({
        title: "",
        description: "",
        date: "",
        clientName: "",
        cost: "",
        media: []
      });
    }
    setError("");
    setUploadError("");
  };

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const isPastDate = (dateString) => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const handleMediaUpload = async (files) => {
    if (formData.media.length + files.length > MAX_MEDIA_PER_EVENT) {
      setUploadError(`Maximum ${MAX_MEDIA_PER_EVENT} media files per event`);
      return;
    }

    for (const file of files) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        setUploadError("Only image (JPEG, PNG, WEBP) and video (MP4, MOV, WEBM) files are allowed");
        return;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        setUploadError("File too large. Max 5MB for images, 50MB for videos");
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        setUploadError("File too large. Max 5MB for images, 50MB for videos");
        return;
      }
    }

    setUploadError("");
    setUploading(true);

    try {
      const uploadedMedia = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("media", file);
        const res = await API.post("/manager/upload-media", fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedMedia.push({
          url: res.data.url,
          publicId: res.data.publicId,
          mediaType: res.data.mediaType,
          thumbnailUrl: res.data.thumbnailUrl
        });
      }
      setFormData(prev => ({ ...prev, media: [...prev.media, ...uploadedMedia] }));
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to upload media");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setError("");

    // Validation
    if (!formData.title.trim() || formData.title.trim().length > 100) {
      setError("Title is required (max 100 characters)");
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length > 1000) {
      setError("Description is required (max 1000 characters)");
      return;
    }
    if (!formData.date) {
      setError("Event date is required");
      return;
    }
    if (!isPastDate(formData.date)) {
      setError("Event date must be in the past");
      return;
    }
    if (formData.cost && (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0 || parseFloat(formData.cost) > 999999999.99)) {
      setError("Cost must be between 0 and 999,999,999.99");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        clientName: formData.clientName.trim() || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        media: formData.media
      };

      if (isEditing) {
        await API.put(`/manager/past-events/${editIndex}`, payload);
      } else {
        await API.post("/manager/past-events", payload);
      }

      onSuccess();
      onHide();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save past event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? "Edit Past Event" : "Add Past Event"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Event Title <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Grand Wedding at Taj"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              maxLength={100}
            />
            <Form.Text className="text-muted">{formData.title.length}/100</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Describe the event..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              maxLength={1000}
            />
            <Form.Text className="text-muted">{formData.description.length}/1000</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Event Date <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
            {formData.date && !isPastDate(formData.date) && (
              <Form.Text className="text-danger">Date must be in the past</Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Client Name <span className="text-muted">(Optional)</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Client name"
              value={formData.clientName}
              onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
              maxLength={100}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cost/Price <span className="text-muted">(Optional)</span></Form.Label>
            <Form.Control
              type="number"
              placeholder="e.g., 50000"
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
              min="0"
              max="999999999.99"
              step="0.01"
            />
          </Form.Group>

          {/* Media Upload */}
          <Form.Group className="mb-3">
            <Form.Label>Media ({formData.media.length}/{MAX_MEDIA_PER_EVENT})</Form.Label>
            <div className="border rounded p-3 text-center" style={{ background: '#f8f9fa' }}>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                onChange={(e) => handleMediaUpload(Array.from(e.target.files))}
                disabled={uploading || formData.media.length >= MAX_MEDIA_PER_EVENT}
                id="past-event-media-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="past-event-media-upload" style={{ cursor: 'pointer' }}>
                <FaCloudUploadAlt size={24} className="text-primary mb-1" />
                <p className="mb-0 small">
                  {uploading ? "Uploading..." : "Click to upload images or videos"}
                </p>
                <small className="text-muted">Images: max 5MB | Videos: max 50MB</small>
              </label>
              {uploading && <Spinner animation="border" size="sm" className="ms-2" />}
            </div>
            {uploadError && <Form.Text className="text-danger">{uploadError}</Form.Text>}
          </Form.Group>

          {/* Media Preview */}
          {formData.media.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {formData.media.map((item, idx) => (
                <div key={idx} style={{ position: 'relative', width: '100px', height: '100px' }}>
                  {item.mediaType === 'image' ? (
                    <Image
                      src={item.thumbnailUrl || item.url}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', background: '#1a1a2e',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FaPlay style={{ color: '#fff', fontSize: '1.5rem' }} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(idx)}
                    style={{
                      position: 'absolute', top: '-5px', right: '-5px',
                      background: '#dc3545', color: '#fff', border: 'none',
                      borderRadius: '50%', width: '20px', height: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', cursor: 'pointer'
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><Spinner animation="border" size="sm" /> Saving...</> : (isEditing ? "Update Event" : "Add Event")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
