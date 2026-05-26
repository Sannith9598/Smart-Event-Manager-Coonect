import { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Alert, Accordion, Badge } from "react-bootstrap";
import { FaTimes, FaPlus, FaFileImport, FaTrash, FaToggleOn, FaToggleOff, FaInfoCircle } from "react-icons/fa";
import API from "../../services/api";

// Default unit suggestions per service type
const DEFAULT_SERVICE_UNITS = {
  catering: ["per plate", "per person", "per kg", "per piece", "per serving", "per liter"],
  decoration: ["per unit", "per setup", "per sqft", "per table", "flat rate", "per piece"],
  photography: ["per hour", "per session", "per day", "per event", "per album", "per reel"],
  music: ["per event", "per hour", "per session", "flat rate"],
  transport: ["per trip", "per hour", "per day", "per km", "per vehicle", "flat rate"],
};

const GENERIC_UNITS = ["per unit", "per hour", "per day", "per event", "per person", "per piece", "per session", "flat rate", "per kg", "per sqft"];

// Service descriptions for guidance
const DEFAULT_SERVICE_DESCRIPTIONS = {
  catering: "Define your food menu with categories (e.g., Indian, Chinese, Desserts) and list each dish with its rate.",
  decoration: "List decoration options by style (e.g., Floral, Balloon, Traditional) with individual items and pricing.",
  photography: "Organize photography packages by type (e.g., Indoor, Outdoor, Drone) with coverage hours and rates.",
  music: "Define music packages (e.g., DJ Setup, Live Band, Sound System). Music is selected as a package — no item-level quantity.",
  transport: "List transport options by vehicle type (e.g., Luxury, Standard, Bus) with per-trip or per-hour rates.",
};

const DEFAULT_SERVICE_ICONS = {
  catering: "🍽️",
  decoration: "🎨",
  photography: "📸",
  music: "🎵",
  transport: "🚗",
};

// Default services that come pre-configured
const DEFAULT_SERVICES = ["catering", "decoration", "photography", "music", "transport"];

// Modal for creating or editing an event with pricing, images, and detailed add-on services
export default function AddEditEventModal({ show, onHide, editingEvent, onSuccess, showToast }) {
  const [eventForm, setEventForm] = useState(getEmptyForm());
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem("customEventCategories");
    return saved ? JSON.parse(saved) : [];
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [managerEvents, setManagerEvents] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [showAddService, setShowAddService] = useState(false);
  const [newFlatRateName, setNewFlatRateName] = useState("");
  const [newFlatRatePrice, setNewFlatRatePrice] = useState("");

  function getEmptyForm() {
    return {
      name: "", price: "", status: "available", image: "", images: [],
      category: "event", description: "", includes: "", duration: "", maxGuests: "",
      addonPrices: {},
      addonServices: {},
      perExtraGuestPrice: "", customAddons: [],
    };
  }

  useEffect(() => {
    if (editingEvent) {
      setEventForm({
        name: editingEvent.name, price: editingEvent.price, status: editingEvent.status,
        image: editingEvent.image || "", images: editingEvent.images || [],
        category: editingEvent.category, description: editingEvent.description || "",
        includes: editingEvent.includes || "", duration: editingEvent.duration || "",
        maxGuests: editingEvent.maxGuests || "",
        addonPrices: editingEvent.addonPrices || {},
        addonServices: editingEvent.addonServices || {},
        perExtraGuestPrice: editingEvent.perExtraGuestPrice || "",
        customAddons: editingEvent.customAddons || [],
      });
    } else { setEventForm(getEmptyForm()); }
    setErrors({}); setShowCustomCategoryInput(false); setCustomCategory("");
    setShowAddService(false); setNewServiceName("");
  }, [editingEvent, show]);

  const fetchManagerEvents = async () => {
    try { setImportLoading(true); const res = await API.get("/event/events"); setManagerEvents(res.data || []); }
    catch (err) { showToast("Error fetching events for import", "error"); }
    finally { setImportLoading(false); }
  };

  const handleImportServices = (sourceEvent) => {
    if (!sourceEvent.addonServices || Object.keys(sourceEvent.addonServices).length === 0) {
      showToast("This event has no detailed services to import.", "warning"); return;
    }
    setEventForm((prev) => ({
      ...prev,
      addonServices: JSON.parse(JSON.stringify(sourceEvent.addonServices)),
      addonPrices: sourceEvent.addonPrices || prev.addonPrices,
    }));
    setShowImportModal(false);
    showToast(`Services imported from "${sourceEvent.name}"!`, "success");
  };

  // ===== IMAGE HANDLERS =====
  const uploadImage = async (file) => {
    if (eventForm.images.length >= 3) { showToast("Maximum 3 images allowed!", "warning"); return; }
    try {
      setUploading(true);
      const formData = new FormData(); formData.append("image", file);
      const res = await API.post("/manager/upload", formData);
      setEventForm((prev) => ({ ...prev, images: [...prev.images, res.data.imageUrl], image: prev.image || res.data.imageUrl }));
      showToast("Image uploaded!", "success");
    } catch (err) { showToast("Failed to upload image", "error"); }
    finally { setUploading(false); }
  };
  const handleMultipleFiles = async (files) => {
    const arr = Array.from(files); const allowed = 3 - eventForm.images.length;
    if (arr.length > allowed) showToast(`You can only add ${allowed} more image(s). Max is 3.`, "warning");
    for (const file of arr.slice(0, allowed)) await uploadImage(file);
  };
  const removeImage = async (idx) => {
    const url = eventForm.images[idx];
    if (url && url.includes("cloudinary")) {
      try { const parts = url.split("/upload/"); if (parts[1]) { let pid = parts[1].replace(/^v\d+\//, "").replace(/\.[^/.]+$/, ""); await API.delete("/manager/delete-image", { data: { publicId: pid } }); } }
      catch (err) { /* Cloudinary delete failed silently */ }
    }
    setEventForm((prev) => { const imgs = prev.images.filter((_, i) => i !== idx); return { ...prev, images: imgs, image: imgs[0] || "" }; });
    showToast("Image removed", "info");
  };

  // ===== ADDON SERVICES HANDLERS =====
  const getServiceList = () => Object.keys(eventForm.addonServices);

  const addNewService = () => {
    if (!newServiceName.trim()) return;
    const key = newServiceName.trim().toLowerCase().replace(/\s+/g, "-");
    if (eventForm.addonServices[key]) { showToast("This service already exists!", "warning"); return; }
    setEventForm((prev) => ({
      ...prev,
      addonServices: { ...prev.addonServices, [key]: { enabled: true, type: "items", categories: [] } },
    }));
    setNewServiceName(""); setShowAddService(false);
    showToast(`Service "${newServiceName.trim()}" added!`, "success");
  };

  const removeService = (serviceName) => {
    if (!window.confirm(`Remove "${serviceName}" service and all its data?`)) return;
    setEventForm((prev) => {
      const svcs = { ...prev.addonServices }; delete svcs[serviceName];
      const prices = { ...prev.addonPrices }; delete prices[serviceName];
      return { ...prev, addonServices: svcs, addonPrices: prices };
    });
  };

  const toggleService = (svc) => {
    setEventForm((prev) => ({
      ...prev, addonServices: { ...prev.addonServices, [svc]: { ...prev.addonServices[svc], enabled: !prev.addonServices[svc]?.enabled } },
    }));
  };

  // For music: toggle between "items" (normal) and "packages" (flat selection, no quantity)
  const toggleServiceType = (svc, type) => {
    setEventForm((prev) => ({
      ...prev, addonServices: { ...prev.addonServices, [svc]: { ...prev.addonServices[svc], type } },
    }));
  };

  const addCategory = (svc) => {
    setEventForm((prev) => {
      const svcs = { ...prev.addonServices };
      svcs[svc] = { ...svcs[svc], categories: [...(svcs[svc]?.categories || []), { name: "", items: [] }] };
      return { ...prev, addonServices: svcs };
    });
  };
  const updateCategoryName = (svc, catIdx, name) => {
    setEventForm((prev) => {
      const svcs = { ...prev.addonServices }; const cats = [...(svcs[svc]?.categories || [])];
      cats[catIdx] = { ...cats[catIdx], name }; svcs[svc] = { ...svcs[svc], categories: cats };
      return { ...prev, addonServices: svcs };
    });
  };
  const removeCategory = (svc, catIdx) => {
    setEventForm((prev) => {
      const svcs = { ...prev.addonServices }; const cats = [...(svcs[svc]?.categories || [])];
      cats.splice(catIdx, 1); svcs[svc] = { ...svcs[svc], categories: cats };
      return { ...prev, addonServices: svcs };
    });
  };
  const addItem = (svc, catIdx) => {
    const units = DEFAULT_SERVICE_UNITS[svc] || GENERIC_UNITS;
    setEventForm((prev) => {
      const svcs = { ...prev.addonServices }; const cats = [...(svcs[svc]?.categories || [])];
      const items = [...(cats[catIdx]?.items || [])];
      items.push({ name: "", rate: "", unit: units[0] });
      cats[catIdx] = { ...cats[catIdx], items }; svcs[svc] = { ...svcs[svc], categories: cats };
      return { ...prev, addonServices: svcs };
    });
  };
  const updateItem = (svc, catIdx, itemIdx, field, value) => {
    setEventForm((prev) => {
      const svcs = { ...prev.addonServices }; const cats = [...(svcs[svc]?.categories || [])];
      const items = [...(cats[catIdx]?.items || [])];
      items[itemIdx] = { ...items[itemIdx], [field]: value };
      cats[catIdx] = { ...cats[catIdx], items }; svcs[svc] = { ...svcs[svc], categories: cats };
      return { ...prev, addonServices: svcs };
    });
  };
  const removeItem = (svc, catIdx, itemIdx) => {
    setEventForm((prev) => {
      const svcs = { ...prev.addonServices }; const cats = [...(svcs[svc]?.categories || [])];
      const items = [...(cats[catIdx]?.items || [])]; items.splice(itemIdx, 1);
      cats[catIdx] = { ...cats[catIdx], items }; svcs[svc] = { ...svcs[svc], categories: cats };
      return { ...prev, addonServices: svcs };
    });
  };

  // ===== FLAT RATE PRICING HANDLERS =====
  const addFlatRate = () => {
    if (!newFlatRateName.trim()) return;
    const key = newFlatRateName.trim().toLowerCase().replace(/\s+/g, "-");
    setEventForm((prev) => ({
      ...prev, addonPrices: { ...prev.addonPrices, [key]: newFlatRatePrice || "" },
    }));
    setNewFlatRateName(""); setNewFlatRatePrice("");
    showToast(`Flat rate "${newFlatRateName.trim()}" added!`, "success");
  };
  const removeFlatRate = (key) => {
    setEventForm((prev) => { const p = { ...prev.addonPrices }; delete p[key]; return { ...prev, addonPrices: p }; });
  };
  const updateFlatRate = (key, value) => {
    setEventForm((prev) => ({ ...prev, addonPrices: { ...prev.addonPrices, [key]: value } }));
  };

  // ===== CUSTOM ADDONS =====
  const handleAddCustomAddon = () => { setEventForm((prev) => ({ ...prev, customAddons: [...prev.customAddons, { name: "", price: "", description: "" }] })); };
  const handleCustomAddonChange = (idx, field, value) => { setEventForm((prev) => { const u = [...prev.customAddons]; u[idx] = { ...u[idx], [field]: value }; return { ...prev, customAddons: u }; }); };
  const handleRemoveCustomAddon = (idx) => { setEventForm((prev) => ({ ...prev, customAddons: prev.customAddons.filter((_, i) => i !== idx) })); };

  // ===== CUSTOM CATEGORY =====
  const defaultCategories = [
    { value: "event", label: "General Event" }, { value: "birthday", label: "Birthday Party" },
    { value: "wedding", label: "Wedding Plan" }, { value: "anniversary", label: "Anniversary Celebration" },
    { value: "corporate", label: "Corporate Event" }, { value: "conference", label: "Conference / Seminar" },
    { value: "engagement", label: "Engagement Party" }, { value: "baby-shower", label: "Baby Shower" },
    { value: "graduation", label: "Graduation Party" }, { value: "reunion", label: "Family Reunion" },
    { value: "holiday", label: "Holiday Party" }, { value: "fundraiser", label: "Fundraiser / Charity Event" },
    { value: "concert", label: "Concert / Live Music" }, { value: "sports", label: "Sports Event" },
    { value: "exhibition", label: "Exhibition / Trade Show" }, { value: "workshop", label: "Workshop / Training" },
    { value: "product-launch", label: "Product Launch" }, { value: "house-party", label: "House Party" },
    { value: "bridal-shower", label: "Bridal Shower" }, { value: "bachelorette", label: "Bachelorette / Bachelor Party" },
    { value: "reception", label: "Wedding Reception" }, { value: "meeting", label: "Business Meeting" },
    { value: "gala", label: "Gala Dinner" }, { value: "festival", label: "Festival / Cultural Event" },
  ];
  const handleAddCustomCategory = () => {
    if (!customCategory.trim()) return;
    const val = customCategory.trim().toLowerCase().replace(/\s+/g, "-");
    if ([...defaultCategories, ...customCategories].find((c) => c.value === val)) { showToast("Category already exists!", "warning"); return; }
    const newCat = { value: val, label: customCategory.trim() };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated); localStorage.setItem("customEventCategories", JSON.stringify(updated));
    setEventForm((prev) => ({ ...prev, category: val }));
    setCustomCategory(""); setShowCustomCategoryInput(false);
    showToast(`Category "${newCat.label}" added!`, "success");
  };

  // ===== VALIDATION & SUBMIT =====
  const validate = () => {
    const e = {};
    if (!eventForm.name.trim()) e.name = "Event name is required";
    if (!eventForm.price) e.price = "Base price is required";
    else if (parseFloat(eventForm.price) <= 0) e.price = "Price must be greater than 0";
    if (!eventForm.category) e.category = "Please select a category";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const clearFieldError = (f) => { if (errors[f]) setErrors({ ...errors, [f]: "" }); };

  // Validates required fields and saves the event (create or update)
  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      // Convert flat rate prices to numbers
      const numericAddonPrices = {};
      Object.entries(eventForm.addonPrices).forEach(([k, v]) => { numericAddonPrices[k] = parseFloat(v) || 0; });

      const submitData = {
        ...eventForm,
        addonPrices: numericAddonPrices,
        perExtraGuestPrice: parseFloat(eventForm.perExtraGuestPrice) || 0,
        customAddons: eventForm.customAddons.map((a) => ({ ...a, price: parseFloat(a.price) || 0 })),
      };
      if (editingEvent) {
        await API.put(`/event/edit-event/${editingEvent.id}`, submitData);
        showToast("Event updated successfully!", "success");
      } else {
        await API.post("/event/add-event", submitData);
        showToast("Event added successfully!", "success");
      }
      onHide(); onSuccess(); setEventForm(getEmptyForm());
    } catch (err) { showToast("Failed to save event", "error"); }
  };

  // ===== RENDER SERVICE SECTION =====
  const renderServiceSection = (svcKey) => {
    const service = eventForm.addonServices[svcKey] || { enabled: false, categories: [], type: "items" };
    const icon = DEFAULT_SERVICE_ICONS[svcKey] || "🔧";
    const desc = DEFAULT_SERVICE_DESCRIPTIONS[svcKey] || "Add sub-categories and items for this service.";
    const units = DEFAULT_SERVICE_UNITS[svcKey] || GENERIC_UNITS;
    const isPackageType = service.type === "packages"; // For music-like services: no quantity, just select/deselect
    const isCustom = !DEFAULT_SERVICES.includes(svcKey);

    return (
      <div key={svcKey} className="service-section mb-3">
        <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ background: service.enabled ? "#e8f5e9" : "#f5f5f5" }}>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "20px" }}>{icon}</span>
            <strong style={{ textTransform: "capitalize" }}>{svcKey.replace(/-/g, " ")}</strong>
            {isCustom && <Badge bg="warning" text="dark" style={{ fontSize: "10px" }}>Custom</Badge>}
          </div>
          <div className="d-flex gap-1">
            <Button variant={service.enabled ? "success" : "outline-secondary"} size="sm" onClick={() => toggleService(svcKey)}>
              {service.enabled ? <><FaToggleOn /> On</> : <><FaToggleOff /> Off</>}
            </Button>
            {isCustom && <Button variant="outline-danger" size="sm" onClick={() => removeService(svcKey)}><FaTrash /></Button>}
          </div>
        </div>

        {service.enabled && (
          <div className="mt-2 ms-2 ps-2" style={{ borderLeft: "3px solid #4caf50" }}>
            <small className="text-muted d-block mb-2"><FaInfoCircle className="me-1" />{desc}</small>

            {/* Service type toggle for music-like services */}
            <div className="mb-2 d-flex gap-2 align-items-center">
              <small className="fw-bold">Mode:</small>
              <Button size="sm" variant={!isPackageType ? "primary" : "outline-secondary"} onClick={() => toggleServiceType(svcKey, "items")}>
                Items (with quantity)
              </Button>
              <Button size="sm" variant={isPackageType ? "primary" : "outline-secondary"} onClick={() => toggleServiceType(svcKey, "packages")}>
                Packages (select one)
              </Button>
              <small className="text-muted ms-1">
                {isPackageType ? "Customer picks a package, no quantity needed" : "Customer picks items and sets quantity"}
              </small>
            </div>

            {(service.categories || []).map((cat, catIdx) => (
              <div key={catIdx} className="mb-3 p-2 border rounded" style={{ background: "#fafafa" }}>
                <div className="d-flex gap-2 align-items-center mb-2">
                  <Form.Control size="sm" placeholder="Sub-category name (e.g., Indian, Floral, DJ...)" value={cat.name} onChange={(e) => updateCategoryName(svcKey, catIdx, e.target.value)} style={{ flex: 1 }} />
                  <Button variant="outline-danger" size="sm" onClick={() => removeCategory(svcKey, catIdx)}><FaTrash /></Button>
                </div>
                {(cat.items || []).map((item, itemIdx) => (
                  <div key={itemIdx} className="d-flex gap-1 mb-1 align-items-center">
                    <Form.Control size="sm" placeholder={isPackageType ? "Package name (e.g., DJ Setup 4hrs)" : "Item name"} value={item.name} onChange={(e) => updateItem(svcKey, catIdx, itemIdx, "name", e.target.value)} style={{ flex: 2 }} />
                    <Form.Control size="sm" type="number" placeholder="Rate (₹)" value={item.rate} onChange={(e) => updateItem(svcKey, catIdx, itemIdx, "rate", e.target.value)} min="0" style={{ flex: 1 }} />
                    <Form.Select size="sm" value={item.unit} onChange={(e) => updateItem(svcKey, catIdx, itemIdx, "unit", e.target.value)} style={{ flex: 1 }}>
                      {units.map((u) => <option key={u} value={u}>{u}</option>)}
                      {!units.includes(item.unit) && item.unit && <option value={item.unit}>{item.unit}</option>}
                    </Form.Select>
                    <Button variant="outline-danger" size="sm" onClick={() => removeItem(svcKey, catIdx, itemIdx)} style={{ minWidth: "30px" }}>✕</Button>
                  </div>
                ))}
                <Button variant="outline-primary" size="sm" className="mt-1" onClick={() => addItem(svcKey, catIdx)}>
                  <FaPlus /> {isPackageType ? "Add Package" : "Add Item"}
                </Button>
              </div>
            ))}
            <Button variant="outline-success" size="sm" className="mt-1" onClick={() => addCategory(svcKey)}>
              <FaPlus /> Add Sub-Category
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
    <Modal show={show} onHide={onHide} size="xl" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{editingEvent ? "Edit Event" : "Add New Event"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {/* Import from Previous Event */}
          {!editingEvent && (
            <Alert variant="light" className="d-flex align-items-center justify-content-between border mb-3">
              <div>
                <FaFileImport className="me-2 text-primary" />
                <strong>Import services from a previous event?</strong>
                <small className="d-block text-muted">Copy addon services, categories, and items from an existing event package.</small>
              </div>
              <Button variant="outline-primary" size="sm" onClick={() => { fetchManagerEvents(); setShowImportModal(true); }}>
                Import Services
              </Button>
            </Alert>
          )}

          {/* Category */}
          <Form.Group className="mb-3">
            {errors.category && <div className="text-danger mb-1" style={{ fontSize: "13px" }}>⚠️ {errors.category}</div>}
            <Form.Label>Event Category *</Form.Label>
            <div className="d-flex gap-2">
              <Form.Select value={eventForm.category} onChange={(e) => { setEventForm({ ...eventForm, category: e.target.value }); clearFieldError("category"); }} style={{ flex: 1 }}>
                <optgroup label="Default Categories">
                  {defaultCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </optgroup>
                {customCategories.length > 0 && (
                  <optgroup label="Your Custom Categories">
                    {customCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </optgroup>
                )}
              </Form.Select>
              <Button variant="outline-success" size="sm" onClick={() => setShowCustomCategoryInput(!showCustomCategoryInput)} style={{ whiteSpace: "nowrap", height: "38px" }}>
                <FaPlus /> New
              </Button>
            </div>
            {showCustomCategoryInput && (
              <div className="mt-2 p-2 border rounded" style={{ background: "#f0fff0" }}>
                <div className="d-flex gap-2">
                  <Form.Control placeholder="New category name" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomCategory(); } }} />
                  <Button variant="success" size="sm" onClick={handleAddCustomCategory} disabled={!customCategory.trim()}>Add</Button>
                  <Button variant="outline-secondary" size="sm" onClick={() => { setShowCustomCategoryInput(false); setCustomCategory(""); }}>Cancel</Button>
                </div>
              </div>
            )}
          </Form.Group>

          {/* Name */}
          <Form.Group className="mb-3">
            {errors.name && <div className="text-danger mb-1" style={{ fontSize: "13px" }}>⚠️ {errors.name}</div>}
            <Form.Label>Event Name *</Form.Label>
            <Form.Control placeholder="Enter event name" value={eventForm.name} onChange={(e) => { setEventForm({ ...eventForm, name: e.target.value }); clearFieldError("name"); }} isInvalid={!!errors.name} />
          </Form.Group>

          {/* Description */}
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control as="textarea" rows={3} placeholder="Describe the event package" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
          </Form.Group>

          {/* Price, Extra Guest, Max Guests */}
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                {errors.price && <div className="text-danger mb-1" style={{ fontSize: "13px" }}>⚠️ {errors.price}</div>}
                <Form.Label>Base Price (₹) *</Form.Label>
                <Form.Control type="number" placeholder="Base price" value={eventForm.price} onChange={(e) => { setEventForm({ ...eventForm, price: e.target.value }); clearFieldError("price"); }} isInvalid={!!errors.price} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Per Extra Guest (₹)</Form.Label>
                <Form.Control type="number" placeholder="Extra guest charge" value={eventForm.perExtraGuestPrice} onChange={(e) => setEventForm({ ...eventForm, perExtraGuestPrice: e.target.value })} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Max Guests</Form.Label>
                <Form.Control type="number" placeholder="Max guests" value={eventForm.maxGuests} onChange={(e) => setEventForm({ ...eventForm, maxGuests: e.target.value })} />
              </Form.Group>
            </Col>
          </Row>

          {/* Duration, Includes */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Duration</Form.Label>
                <Form.Control placeholder="e.g., 4 hours, Full day" value={eventForm.duration} onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>What's Included</Form.Label>
                <Form.Control placeholder="Comma-separated list" value={eventForm.includes} onChange={(e) => setEventForm({ ...eventForm, includes: e.target.value })} />
              </Form.Group>
            </Col>
          </Row>

          {/* ===== DETAILED ADDON SERVICES ===== */}
          <div className="mb-3 p-3 border rounded" style={{ background: "#f8f9ff" }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">🛎️ Detailed Add-on Services</h5>
              <Button variant="success" size="sm" onClick={() => setShowAddService(true)}>
                <FaPlus /> Add New Service
              </Button>
            </div>
            <Alert variant="info" className="py-2 mb-3">
              <small>
                <FaInfoCircle className="me-1" />
                <strong>How it works:</strong> Enable a service → Choose mode (Items with quantity OR Packages for flat selection like music) → Add sub-categories → Add items/packages with rates.
                You can add your own custom services beyond the defaults using the "+ Add New Service" button.
              </small>
            </Alert>

            {/* Add new service input */}
            {showAddService && (
              <div className="mb-3 p-2 border rounded" style={{ background: "#f0fff0" }}>
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control size="sm" placeholder="New service name (e.g., Venue, Lighting, Anchoring, Mehendi...)" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewService(); } }} style={{ flex: 1 }} />
                  <Button variant="success" size="sm" onClick={addNewService} disabled={!newServiceName.trim()}>Add</Button>
                  <Button variant="outline-secondary" size="sm" onClick={() => { setShowAddService(false); setNewServiceName(""); }}>Cancel</Button>
                </div>
                <small className="text-muted mt-1 d-block">Add any service type you offer. It will appear in the list below.</small>
              </div>
            )}

            {/* Render all services (default + custom) */}
            {Object.keys(eventForm.addonServices).length === 0 ? (
              <div className="text-center py-3 text-muted">
                <p className="mb-2">No services added yet.</p>
                <Button variant="outline-primary" size="sm" onClick={() => {
                  // Add all default services
                  const defaults = {};
                  DEFAULT_SERVICES.forEach(s => { defaults[s] = { enabled: false, type: s === "music" ? "packages" : "items", categories: [] }; });
                  setEventForm(prev => ({ ...prev, addonServices: { ...defaults, ...prev.addonServices } }));
                }}>
                  Load Default Services (Catering, Decoration, Photography, Music, Transport)
                </Button>
              </div>
            ) : (
              <Accordion>
                {Object.keys(eventForm.addonServices).map((svcKey) => (
                  <Accordion.Item eventKey={svcKey} key={svcKey}>
                    <Accordion.Header>
                      <span className="me-2">{DEFAULT_SERVICE_ICONS[svcKey] || "🔧"}</span>
                      <span style={{ textTransform: "capitalize" }}>{svcKey.replace(/-/g, " ")}</span>
                      {eventForm.addonServices[svcKey]?.enabled && <Badge bg="success" className="ms-2">Active</Badge>}
                      {eventForm.addonServices[svcKey]?.type === "packages" && <Badge bg="info" className="ms-1">Package mode</Badge>}
                      {(eventForm.addonServices[svcKey]?.categories || []).length > 0 && (
                        <Badge bg="secondary" className="ms-1">
                          {(eventForm.addonServices[svcKey]?.categories || []).reduce((sum, c) => sum + (c.items?.length || 0), 0)} items
                        </Badge>
                      )}
                      {!DEFAULT_SERVICES.includes(svcKey) && <Badge bg="warning" text="dark" className="ms-1">Custom</Badge>}
                    </Accordion.Header>
                    <Accordion.Body>{renderServiceSection(svcKey)}</Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </div>

          {/* ===== FLAT-RATE PRICING ===== */}
          <div className="mb-3 p-3 border rounded" style={{ background: "#fffdf5" }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">💰 Quick Flat-Rate Pricing</h6>
              <Badge bg="secondary">Optional — simple pricing without item details</Badge>
            </div>
            <small className="text-muted d-block mb-3">
              Set a single flat price for a service type. Use this for services where you don't need item-level breakdown.
              You can add any service type here.
            </small>

            {/* Existing flat rates */}
            {Object.keys(eventForm.addonPrices).length > 0 && (
              <div className="mb-2">
                {Object.entries(eventForm.addonPrices).map(([key, value]) => (
                  <div key={key} className="d-flex gap-2 mb-2 align-items-center">
                    <Form.Control size="sm" value={key.replace(/-/g, " ")} disabled style={{ flex: 1, textTransform: "capitalize", background: "#f8f9fa" }} />
                    <Form.Control size="sm" type="number" placeholder="Price (₹)" value={value} onChange={(e) => updateFlatRate(key, e.target.value)} min="0" style={{ flex: 1 }} />
                    <Button variant="outline-danger" size="sm" onClick={() => removeFlatRate(key)} title="Remove"><FaTrash /></Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new flat rate */}
            <div className="d-flex gap-2 align-items-center p-2 border rounded" style={{ background: "#fafafa" }}>
              <Form.Control size="sm" placeholder="Service name (e.g., Catering, Venue, Lighting)" value={newFlatRateName} onChange={(e) => setNewFlatRateName(e.target.value)} style={{ flex: 1 }} />
              <Form.Control size="sm" type="number" placeholder="Price (₹)" value={newFlatRatePrice} onChange={(e) => setNewFlatRatePrice(e.target.value)} min="0" style={{ flex: 1 }} />
              <Button variant="outline-success" size="sm" onClick={addFlatRate} disabled={!newFlatRateName.trim()}>
                <FaPlus /> Add
              </Button>
            </div>
          </div>

          {/* Event Images */}
          <Form.Group className="mb-3">
            <Form.Label>Event Images (1 to 3)</Form.Label>
            <Form.Control type="file" accept="image/*" multiple onChange={(e) => handleMultipleFiles(e.target.files)} disabled={uploading || eventForm.images.length >= 3} />
            {uploading && <small className="text-muted">Uploading...</small>}
            <small className="text-muted d-block mt-1">{eventForm.images.length}/3 images uploaded.</small>
            {eventForm.images.length > 0 && (
              <div className="mt-2 d-flex gap-2 flex-wrap">
                {eventForm.images.map((img, idx) => (
                  <div key={idx} style={{ position: "relative", display: "inline-block" }}>
                    <img src={img} width="100" height="100" alt={`preview-${idx + 1}`} loading="lazy" style={{ borderRadius: "8px", objectFit: "cover", border: idx === 0 ? "2px solid #28a745" : "1px solid #ddd" }} />
                    <button type="button" onClick={() => removeImage(idx)} style={{ position: "absolute", top: "-8px", right: "-8px", background: "#dc3545", color: "white", border: "none", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }} title="Remove">
                      <FaTimes />
                    </button>
                    {idx === 0 && <small className="d-block text-center text-success" style={{ fontSize: "10px", fontWeight: "bold" }}>Primary</small>}
                  </div>
                ))}
              </div>
            )}
          </Form.Group>

          {/* Custom Add-ons */}
          <div className="mb-3 p-3 border rounded" style={{ background: "#f8f9fa" }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">🎁 Custom Add-ons / Packages</h6>
              <Button size="sm" variant="outline-primary" onClick={handleAddCustomAddon}><FaPlus /> Add Custom Option</Button>
            </div>
            <small className="text-muted d-block mb-2">Create custom options customers can select when booking.</small>
            {eventForm.customAddons.map((addon, idx) => (
              <div key={idx} className="d-flex gap-2 mb-2 align-items-start">
                <Form.Control placeholder="Name" value={addon.name} onChange={(e) => handleCustomAddonChange(idx, "name", e.target.value)} style={{ flex: 2 }} />
                <Form.Control type="number" placeholder="Price (₹)" value={addon.price} onChange={(e) => handleCustomAddonChange(idx, "price", e.target.value)} min="0" style={{ flex: 1 }} />
                <Form.Control placeholder="Description" value={addon.description || ""} onChange={(e) => handleCustomAddonChange(idx, "description", e.target.value)} style={{ flex: 2 }} />
                <Button size="sm" variant="outline-danger" onClick={() => handleRemoveCustomAddon(idx)}>✕</Button>
              </div>
            ))}
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button onClick={handleSubmit}>{editingEvent ? "Update Event" : "Add Event"}</Button>
      </Modal.Footer>
    </Modal>

    {/* Import Services Modal */}
    <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title><FaFileImport className="me-2" />Import Services from Previous Event</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {importLoading ? (
          <div className="text-center py-4"><span>Loading your events...</span></div>
        ) : managerEvents.length === 0 ? (
          <Alert variant="info">You don't have any previous events to import from.</Alert>
        ) : (
          <>
            <p className="text-muted mb-3">Select an event to copy its addon services into this new event. You can then add/remove items as needed.</p>
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {managerEvents.filter(e => e.addonServices && Object.values(e.addonServices).some(s => s.enabled)).map((evt) => (
                <div key={evt.id} className="p-3 mb-2 border rounded d-flex justify-content-between align-items-center" style={{ cursor: "pointer" }} onClick={() => handleImportServices(evt)}>
                  <div>
                    <strong>{evt.name}</strong>
                    <div className="d-flex gap-1 mt-1 flex-wrap">
                      {Object.entries(evt.addonServices || {}).filter(([, v]) => v.enabled).map(([key]) => (
                        <Badge key={key} bg="light" text="dark" className="border">{DEFAULT_SERVICE_ICONS[key] || "🔧"} {key}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline-primary" size="sm">Import</Button>
                </div>
              ))}
              {managerEvents.filter(e => !e.addonServices || !Object.values(e.addonServices).some(s => s.enabled)).length > 0 && (
                <small className="text-muted d-block mt-2">
                  {managerEvents.filter(e => !e.addonServices || !Object.values(e.addonServices).some(s => s.enabled)).length} event(s) have no detailed services configured.
                </small>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancel</Button>
      </Modal.Footer>
    </Modal>
    </>
  );
}
