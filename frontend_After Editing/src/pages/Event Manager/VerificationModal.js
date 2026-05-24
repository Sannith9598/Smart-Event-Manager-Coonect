import { useState } from "react";
import { Modal, Form, Alert, Spinner } from "react-bootstrap";
import { AnimatePresence } from "framer-motion";
import {
  FaShieldAlt,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaRocket,
  FaStar
} from "react-icons/fa";
import API from "../../services/api";
import Step1BusinessInfo from "./Step1BusinessInfo";
import Step2PastEvents from "./Step2PastEvents";
import "./VerificationModal.css";

export default function VerificationModal({ show, onHide, onVerified }) {
  const [formData, setFormData] = useState({
    businessName: "",
    businessTypes: [],
    yearsOfExperience: "",
    description: "",
    portfolioLinks: [""],
    images: [],
    pastEvents: [],
    serviceAreas: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const [validationErrors, setValidationErrors] = useState({
    businessName: false,
    businessTypes: false,
    yearsOfExperience: false,
    serviceAreas: false,
    pastEvents: false,
    media: false
  });

  const isPastDate = (dateString) => {
    if (!dateString) return true;
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const validateStep1 = () => {
    const expValue = parseFloat(formData.yearsOfExperience);
    const expStr = String(formData.yearsOfExperience);
    const decimalPart = expStr.includes('.') ? expStr.split('.')[1] : '';

    const errors = {
      businessName: !formData.businessName.trim(),
      businessTypes: formData.businessTypes.length === 0,
      yearsOfExperience: !formData.yearsOfExperience || isNaN(expValue) || expValue < 0.1 || expValue > 50.0 || decimalPart.length > 1,
      serviceAreas: formData.serviceAreas.length === 0
    };
    setValidationErrors(prev => ({ ...prev, ...errors }));
    return !Object.values(errors).some(e => e === true);
  };

  const validateStep2 = () => {
    const expValue = parseFloat(formData.yearsOfExperience) || 0;
    let errors = { pastEvents: false, media: false };

    // If experience > 0.1, require at least 1 past event
    if (expValue > 0.1 && formData.pastEvents.length === 0) {
      errors.pastEvents = true;
    }

    // Validate each event has title and description
    for (const event of formData.pastEvents) {
      if (!event.title || !event.title.trim() || !event.description || !event.description.trim()) {
        errors.pastEvents = true;
        break;
      }
      if (event.date && !isPastDate(event.date)) {
        errors.pastEvents = true;
        break;
      }
    }

    // Require at least 1 media file total
    const totalMedia = formData.pastEvents.reduce((count, event) => count + (event.media || []).length, 0);
    if (totalMedia < 1) {
      errors.media = true;
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return !errors.pastEvents && !errors.media;
  };

  const handleSubmit = async () => {
    const isStep2Valid = validateStep2();
    if (!isStep2Valid) {
      setError("Please fill in all required fields correctly before submitting");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const verificationData = {
        businessName: formData.businessName,
        businessTypes: formData.businessTypes,
        yearsOfExperience: parseFloat(formData.yearsOfExperience),
        description: formData.description,
        portfolioLinks: formData.portfolioLinks.filter(link => link.trim() !== ""),
        images: formData.images,
        pastEvents: formData.pastEvents,
        serviceAreas: formData.serviceAreas
      };
      await API.post("/verification/submit-verification", verificationData);
      onVerified();
      onHide();
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.response?.data?.message || "Failed to submit verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      const isValid = validateStep1();
      if (!isValid) {
        setError("Please fill in all required fields marked with *");
        return;
      }
    }
    setError("");
    setStep(step + 1);
  };

  const prevStep = () => { setStep(step - 1); setError(""); };

  const stepInfo = [
    { num: 1, title: "Business Info", icon: <FaBuilding />, desc: "Tell us about your business" },
    { num: 2, title: "Past Events & Media", icon: <FaCalendarAlt />, desc: "Showcase your work with media" }
  ];

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="verification-modal-v2">
      <Modal.Header closeButton className="vm2-header">
        <Modal.Title className="vm2-title">
          <div className="vm2-title-content">
            <div className="vm2-title-icon">
              <FaShieldAlt />
            </div>
            <div>
              <h4>Verify Your Account</h4>
              <p>Complete verification to unlock all features</p>
            </div>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="vm2-body">
        {/* Progress Steps - 2 steps */}
        <div className="vm2-progress-section">
          <div className="vm2-steps">
            {stepInfo.map((s, idx) => (
              <div key={s.num} className="vm2-step-wrapper">
                <div className={`vm2-step ${step >= s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}>
                  <div className="vm2-step-circle">
                    {step > s.num ? <FaCheckCircle /> : s.icon}
                  </div>
                  <div className="vm2-step-text">
                    <span className="vm2-step-title">{s.title}</span>
                    <span className="vm2-step-desc">{s.desc}</span>
                  </div>
                </div>
                {idx < stepInfo.length - 1 && <div className={`vm2-step-connector ${step > s.num ? 'active' : ''}`}></div>}
              </div>
            ))}
          </div>
          <div className="vm2-progress-bar">
            <div className="vm2-progress-fill" style={{ width: `${((step - 1) / 1) * 100}%` }}></div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="vm2-info-banner">
          <div className="vm2-info-icon"><FaStar /></div>
          <div className="vm2-info-text">
            <strong>Why verify?</strong> Verified planners get trust badges, priority in search results, and more booking requests.
          </div>
        </div>

        {error && <Alert variant="danger" className="vm2-alert">{error}</Alert>}

        <Form className="vm2-form">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1BusinessInfo
                formData={formData}
                setFormData={setFormData}
                validationErrors={validationErrors}
                setValidationErrors={setValidationErrors}
              />
            )}

            {step === 2 && (
              <Step2PastEvents
                formData={formData}
                setFormData={setFormData}
                validationErrors={validationErrors}
                setValidationErrors={setValidationErrors}
              />
            )}
          </AnimatePresence>
        </Form>
      </Modal.Body>

      <Modal.Footer className="vm2-footer">
        <button type="button" className="vm2-btn vm2-btn-cancel" onClick={onHide}>
          Cancel
        </button>

        <div className="vm2-footer-actions">
          {step > 1 && (
            <button type="button" className="vm2-btn vm2-btn-prev" onClick={prevStep}>
              <FaArrowLeft /> Previous
            </button>
          )}

          {step < 2 ? (
            <button type="button" className="vm2-btn vm2-btn-next" onClick={nextStep}>
              Next <FaArrowRight />
            </button>
          ) : (
            <button type="button" className="vm2-btn vm2-btn-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <><Spinner animation="border" size="sm" /> Submitting...</>
              ) : (
                <><FaRocket /> Submit Verification</>
              )}
            </button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
}
