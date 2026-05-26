import { useState } from "react";
import { Form, Badge } from "react-bootstrap";
import { motion } from "framer-motion";
import {
  FaBuilding,
  FaBriefcase,
  FaMapMarkerAlt,
  FaClock,
  FaLink,
  FaCheckCircle,
  FaTimes,
  FaPlus
} from "react-icons/fa";
import { STATE_CITY_MAP, ALL_STATES } from "../../constants/stateCityMap";

const businessTypes = [
  "Wedding Planner",
  "Birthday Planner",
  "Corporate Event Planner",
  "Party Planner",
  "Conference Organizer",
  "Exhibition Organizer",
  "Entertainment Planner",
  "Anniversary Planner",
  "Baby Shower Planner",
  "Graduation Party Planner"
];

// Step 1 of verification — collects business name, types, service areas, and experience
export default function Step1BusinessInfo({ formData, setFormData, validationErrors, setValidationErrors }) {
  const [selectedState, setSelectedState] = useState("");
  const [customAreaInput, setCustomAreaInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAreaError, setCustomAreaError] = useState("");
  const [experienceError, setExperienceError] = useState("");

  const handleBusinessTypeChange = (type) => {
    setFormData(prev => {
      const updated = prev.businessTypes.includes(type)
        ? prev.businessTypes.filter(t => t !== type)
        : [...prev.businessTypes, type];
      return { ...prev, businessTypes: updated };
    });
    if (validationErrors.businessTypes) {
      setValidationErrors(prev => ({ ...prev, businessTypes: false }));
    }
  };

  const handleServiceAreaChange = (area) => {
    setFormData(prev => {
      const updated = prev.serviceAreas.includes(area)
        ? prev.serviceAreas.filter(a => a !== area)
        : [...prev.serviceAreas, area];
      return { ...prev, serviceAreas: updated };
    });
    if (validationErrors.serviceAreas) {
      setValidationErrors(prev => ({ ...prev, serviceAreas: false }));
    }
  };

  const handleAddCustomArea = () => {
    const trimmed = customAreaInput.trim();
    setCustomAreaError("");

    if (!trimmed) {
      setCustomAreaError("Location name cannot be blank");
      return;
    }
    if (trimmed.length > 100) {
      setCustomAreaError("Location name must be 100 characters or less");
      return;
    }
    if (formData.serviceAreas.length >= 20) {
      setCustomAreaError("Maximum 20 service areas allowed");
      return;
    }
    // Case-insensitive duplicate check
    const isDuplicate = formData.serviceAreas.some(
      a => a.toLowerCase() === trimmed.toLowerCase()
    );
    // Also check against all predefined cities
    const allCities = Object.values(STATE_CITY_MAP).flat();
    const isPredefined = allCities.some(
      c => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate || (isPredefined && formData.serviceAreas.some(a => a.toLowerCase() === trimmed.toLowerCase()))) {
      setCustomAreaError("This location already exists");
      return;
    }

    setFormData(prev => ({
      ...prev,
      serviceAreas: [...prev.serviceAreas, trimmed]
    }));
    setCustomAreaInput("");
    setShowCustomInput(false);
    if (validationErrors.serviceAreas) {
      setValidationErrors(prev => ({ ...prev, serviceAreas: false }));
    }
  };

  const handleExperienceChange = (value) => {
    setFormData(prev => ({ ...prev, yearsOfExperience: value }));
    setExperienceError("");

    if (value === "") {
      if (validationErrors.yearsOfExperience) {
        setValidationErrors(prev => ({ ...prev, yearsOfExperience: false }));
      }
      return;
    }

    const numVal = parseFloat(value);
    if (isNaN(numVal)) {
      setExperienceError("A numeric value is required");
      return;
    }
    if (numVal < 0.1 || numVal > 50.0) {
      setExperienceError("Experience must be between 0.1 and 50.0");
      return;
    }
    const decimalPart = value.includes('.') ? value.split('.')[1] : '';
    if (decimalPart.length > 1) {
      setExperienceError("Only one decimal place is permitted");
      return;
    }

    if (validationErrors.yearsOfExperience) {
      setValidationErrors(prev => ({ ...prev, yearsOfExperience: false }));
    }
  };

  const handleAddPortfolio = () => {
    setFormData(prev => ({ ...prev, portfolioLinks: [...prev.portfolioLinks, ""] }));
  };

  const handlePortfolioChange = (index, value) => {
    const newLinks = [...formData.portfolioLinks];
    newLinks[index] = value;
    setFormData(prev => ({ ...prev, portfolioLinks: newLinks }));
  };

  const handleRemovePortfolio = (index) => {
    const newLinks = formData.portfolioLinks.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, portfolioLinks: newLinks }));
  };

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      {/* Business Name */}
      <div className="vm2-field-group">
        <label className={`vm2-label ${validationErrors.businessName ? 'error' : ''}`}>
          <FaBuilding className="vm2-label-icon" />
          Business Name <span className="required">*</span>
        </label>
        <Form.Control
          type="text"
          placeholder="Enter your business/company name"
          value={formData.businessName}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, businessName: e.target.value }));
            if (validationErrors.businessName) setValidationErrors(prev => ({ ...prev, businessName: false }));
          }}
          className={`vm2-input ${validationErrors.businessName ? 'is-invalid' : ''}`}
        />
        {validationErrors.businessName && <div className="vm2-error-msg">Please enter your business name</div>}
      </div>

      {/* Business Types */}
      <div className="vm2-field-group">
        <label className={`vm2-label ${validationErrors.businessTypes ? 'error' : ''}`}>
          <FaBriefcase className="vm2-label-icon" />
          Business Types <span className="required">*</span>
        </label>
        <p className="vm2-field-hint">Select all types of events you plan</p>
        <div className="vm2-chip-grid">
          {businessTypes.map(type => (
            <div
              key={type}
              className={`vm2-chip ${formData.businessTypes.includes(type) ? 'selected' : ''}`}
              onClick={() => handleBusinessTypeChange(type)}
            >
              {formData.businessTypes.includes(type) && <FaCheckCircle className="chip-check" />}
              {type}
            </div>
          ))}
        </div>
        {validationErrors.businessTypes && <div className="vm2-error-msg">Please select at least one business type</div>}
      </div>

      {/* State Dropdown + Service Areas */}
      <div className="vm2-field-group">
        <label className={`vm2-label ${validationErrors.serviceAreas ? 'error' : ''}`}>
          <FaMapMarkerAlt className="vm2-label-icon" />
          Service Areas <span className="required">*</span>
          <Badge bg="secondary" className="ms-2">{formData.serviceAreas.length}/20</Badge>
        </label>
        <p className="vm2-field-hint">Select a state to filter cities, or browse all</p>

        {/* State Dropdown */}
        <Form.Select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="vm2-input mb-2"
        >
          <option value="">-- Select a State first --</option>
          {ALL_STATES.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </Form.Select>

        {/* City Chips - Only show after state is selected */}
        {selectedState ? (
          <div className="vm2-chip-grid">
            {(STATE_CITY_MAP[selectedState] || []).map(city => (
              <div
                key={city}
                className={`vm2-chip vm2-chip-location ${formData.serviceAreas.includes(city) ? 'selected' : ''}`}
                onClick={() => {
                  if (formData.serviceAreas.length < 20 || formData.serviceAreas.includes(city)) {
                    handleServiceAreaChange(city);
                  }
                }}
              >
                {formData.serviceAreas.includes(city) && <FaCheckCircle className="chip-check" />}
                {city}
              </div>
            ))}

            {/* Custom area add button */}
            {!showCustomInput && (
              <div
                className="vm2-chip vm2-chip-add"
                onClick={() => setShowCustomInput(true)}
              >
                <FaPlus /> Add Custom
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
            Please select a state above to see available cities
          </p>
        )}

        {/* Custom area input */}
        {showCustomInput && (
          <div className="d-flex gap-2 mt-2 align-items-center">
            <Form.Control
              type="text"
              placeholder="Enter custom location (max 100 chars)"
              value={customAreaInput}
              onChange={(e) => { setCustomAreaInput(e.target.value); setCustomAreaError(""); }}
              maxLength={100}
              className="vm2-input"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomArea(); } }}
            />
            <button type="button" className="vm2-btn vm2-btn-next" style={{ padding: '6px 12px' }} onClick={handleAddCustomArea}>
              Add
            </button>
            <button type="button" className="vm2-remove-btn" onClick={() => { setShowCustomInput(false); setCustomAreaError(""); setCustomAreaInput(""); }}>
              <FaTimes />
            </button>
          </div>
        )}
        {customAreaError && <div className="vm2-error-msg">{customAreaError}</div>}

        {/* Selected areas display */}
        {formData.serviceAreas.length > 0 && (
          <div className="mt-2">
            <small className="text-muted">Selected: </small>
            {formData.serviceAreas.map(area => (
              <Badge
                key={area}
                bg="primary"
                className="me-1 mb-1"
                style={{ cursor: 'pointer' }}
                onClick={() => handleServiceAreaChange(area)}
              >
                {area} <FaTimes size={10} />
              </Badge>
            ))}
          </div>
        )}

        {validationErrors.serviceAreas && <div className="vm2-error-msg">Please select at least one service area</div>}
      </div>

      {/* Years of Experience (decimal) */}
      <div className="vm2-field-group">
        <label className={`vm2-label ${validationErrors.yearsOfExperience ? 'error' : ''}`}>
          <FaClock className="vm2-label-icon" />
          Years of Experience <span className="required">*</span>
        </label>
        <p className="vm2-field-hint">Enter decimal values (e.g., 0.5, 1.5, 2.0). Range: 0.1 to 50.0</p>
        <Form.Control
          type="number"
          min="0.1"
          max="50"
          step="0.1"
          placeholder="e.g., 1.5"
          value={formData.yearsOfExperience}
          onChange={(e) => handleExperienceChange(e.target.value)}
          className={`vm2-input ${validationErrors.yearsOfExperience || experienceError ? 'is-invalid' : ''}`}
        />
        {experienceError && <div className="vm2-error-msg">{experienceError}</div>}
        {validationErrors.yearsOfExperience && !experienceError && <div className="vm2-error-msg">Please enter valid years of experience (0.1–50.0)</div>}
      </div>

      {/* Description */}
      <div className="vm2-field-group">
        <label className="vm2-label">Business Description</label>
        <Form.Control
          as="textarea"
          rows={4}
          placeholder="Tell us about your services, specialties, and what makes you unique..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="vm2-input vm2-textarea"
        />
      </div>

      {/* Portfolio Links */}
      <div className="vm2-field-group">
        <label className="vm2-label">
          <FaLink className="vm2-label-icon" />
          Portfolio Links <span className="optional">(Optional)</span>
        </label>
        {formData.portfolioLinks.map((link, index) => (
          <div key={index} className="vm2-link-row">
            <Form.Control
              type="url"
              placeholder="https://your-portfolio.com"
              value={link}
              onChange={(e) => handlePortfolioChange(index, e.target.value)}
              className="vm2-input"
            />
            {index > 0 && (
              <button type="button" className="vm2-remove-btn" onClick={() => handleRemovePortfolio(index)}>
                <FaTimes />
              </button>
            )}
          </div>
        ))}
        <button type="button" className="vm2-add-link-btn" onClick={handleAddPortfolio}>
          + Add Another Link
        </button>
      </div>
    </motion.div>
  );
}
