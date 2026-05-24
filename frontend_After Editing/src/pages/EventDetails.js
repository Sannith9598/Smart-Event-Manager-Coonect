// src/components/EventDetails.jsx
import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Alert,
  Spinner,
  Modal,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaUsers,
  FaClock,
  FaStar,
  FaCheckCircle,
  FaUtensils,
  FaPalette,
  FaCamera,
  FaMusic,
  FaInfoCircle,
  FaHeart,
  FaRegHeart,
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
  FaPlay,
} from "react-icons/fa";
import { motion } from "framer-motion";
import API from "../services/api";
import AppNavbar from "../components/Navbar";
import { toast } from "react-toastify";
import "./EventDetails.css";


export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [bookingErrors, setBookingErrors] = useState({});
  
  const [bookingForm, setBookingForm] = useState({
    eventDate: "",
    guestCount: "",
    specialRequests: "",
    selectedAddons: [],
  });
  
  const [customization, setCustomization] = useState({
    eventDate: "",
    guestCount: "",
    budget: "",
    theme: "",
    venue: "",
    catering: {
      type: "",
      menu: "",
      dietaryRestrictions: "",
    },
    decorations: {
      style: "",
      colorScheme: "",
      floralArrangements: "",
    },
    entertainment: {
      musicType: "",
      djRequired: false,
      liveBand: false,
    },
    photography: {
      required: false,
      hours: 2,
      specialRequests: "",
    },
    specialRequests: "",
  });
  
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedCustomAddons, setSelectedCustomAddons] = useState([]);
  const [selectedServiceItems, setSelectedServiceItems] = useState({});
  const [isFavorited, setIsFavorited] = useState(false);
  const [addonPrices, setAddonPrices] = useState({
    catering: 0,
    decoration: 0,
    photography: 0,
    music: 0,
    transport: 0,
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeCustomizeTab, setActiveCustomizeTab] = useState("");
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [enabledServices, setEnabledServices] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkFavoriteStatus();
    }
  }, [user, id]);

  const checkFavoriteStatus = async () => {
    try {
      const res = await API.get(`/favorites/check/${id}`);
      setIsFavorited(res.data.isFavorited);
    } catch (err) {
      // Not logged in or error - ignore
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.info("Please login to add favorites");
      navigate("/login");
      return;
    }
    try {
      if (isFavorited) {
        await API.delete(`/favorites/${id}`);
        setIsFavorited(false);
        toast.success("Removed from wishlist");
      } else {
        await API.post(`/favorites/${id}`);
        setIsFavorited(true);
        toast.success("Added to wishlist ❤️");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update wishlist");
    }
  };

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/event/all-events/${id}`);
      setEvent(res.data);
      
      if (res.data.addonPrices) {
        setAddonPrices(res.data.addonPrices);
      }
      
      calculateTotalPrice(res.data.price, 1, [], [], {});
    } catch (err) {
      console.error("Error fetching event details:", err);
      if (err.response?.status === 404) {
        navigate("/not-found");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = (basePrice, guestCount, addons, customAddons, serviceItems) => {
    let total = parseFloat(basePrice);
    
    if (event?.maxGuests && guestCount > event.maxGuests) {
      const extraGuests = guestCount - event.maxGuests;
      const extraCharge = extraGuests * (event.perExtraGuestPrice || 0);
      total += extraCharge;
    }
    
    addons.forEach(addon => {
      if (addonPrices[addon]) {
        total += addonPrices[addon];
      }
    });

    // Add custom add-on prices
    const customs = customAddons || selectedCustomAddons;
    customs.forEach(addon => {
      total += parseFloat(addon.price) || 0;
    });

    // Add detailed service item prices
    const svcItems = serviceItems || selectedServiceItems;
    const addonServices = event?.addonServices || {};
    Object.entries(svcItems).forEach(([serviceName, categories]) => {
      const serviceConfig = addonServices[serviceName];
      if (!serviceConfig) return;
      Object.entries(categories).forEach(([categoryName, items]) => {
        const category = (serviceConfig.categories || []).find(c => c.name === categoryName);
        if (!category) return;
        items.forEach(selectedItem => {
          const matchingItem = (category.items || []).find(i => i.name === selectedItem.name);
          if (matchingItem) {
            const qty = parseInt(selectedItem.quantity) || 1;
            const rate = parseFloat(matchingItem.rate) || 0;
            // For catering items, multiply by number of guests since food is per guest
            if (serviceName === "catering" && guestCount > 0) {
              total += rate * qty * guestCount;
            } else {
              total += rate * qty;
            }
          }
        });
      });
    });
    
    setTotalPrice(total);
    return total;
  };

  const handleBookingFormChange = (e) => {
    const { name, value } = e.target;
    setBookingForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (bookingErrors[name]) {
      setBookingErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    if (name === "guestCount") {
      const guests = parseInt(value) || 0;
      calculateTotalPrice(event.price, guests, selectedAddons, selectedCustomAddons, selectedServiceItems);
    }
  };

  const handleAddonToggle = (addon) => {
    let newAddons;
    if (selectedAddons.includes(addon)) {
      newAddons = selectedAddons.filter(a => a !== addon);
    } else {
      newAddons = [...selectedAddons, addon];
    }
    setSelectedAddons(newAddons);
    calculateTotalPrice(event.price, parseInt(bookingForm.guestCount) || 0, newAddons, selectedCustomAddons, selectedServiceItems);
  };

  const handleCustomAddonToggle = (addon) => {
    let newCustomAddons;
    if (selectedCustomAddons.find(a => a.name === addon.name)) {
      newCustomAddons = selectedCustomAddons.filter(a => a.name !== addon.name);
    } else {
      newCustomAddons = [...selectedCustomAddons, { name: addon.name, price: addon.price }];
    }
    setSelectedCustomAddons(newCustomAddons);
    calculateTotalPrice(event.price, parseInt(bookingForm.guestCount) || 0, selectedAddons, newCustomAddons, selectedServiceItems);
  };

  // Handle toggling a service item (detailed addon)
  const handleServiceItemToggle = (serviceName, categoryName, item) => {
    setSelectedServiceItems((prev) => {
      // Deep clone to ensure React detects nested state changes
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated[serviceName]) updated[serviceName] = {};
      if (!updated[serviceName][categoryName]) updated[serviceName][categoryName] = [];

      const existing = updated[serviceName][categoryName].find(i => i.name === item.name);
      if (existing) {
        updated[serviceName][categoryName] = updated[serviceName][categoryName].filter(i => i.name !== item.name);
        if (updated[serviceName][categoryName].length === 0) delete updated[serviceName][categoryName];
        if (Object.keys(updated[serviceName]).length === 0) delete updated[serviceName];
      } else {
        updated[serviceName][categoryName] = [...updated[serviceName][categoryName], { name: item.name, quantity: 1 }];
      }

      calculateTotalPrice(event.price, parseInt(bookingForm.guestCount) || 0, selectedAddons, selectedCustomAddons, updated);
      return updated;
    });
  };

  // Handle changing quantity of a service item
  const handleServiceItemQuantity = (serviceName, categoryName, itemName, quantity) => {
    setSelectedServiceItems((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated[serviceName]?.[categoryName]) {
        updated[serviceName][categoryName] = updated[serviceName][categoryName].map(i =>
          i.name === itemName ? { ...i, quantity: Math.max(1, parseInt(quantity) || 1) } : i
        );
      }
      calculateTotalPrice(event.price, parseInt(bookingForm.guestCount) || 0, selectedAddons, selectedCustomAddons, updated);
      return updated;
    });
  };

  const handleCustomizationChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setCustomization(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setCustomization(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const validateBookingForm = () => {
    const newErrors = {};
    
    if (!bookingForm.eventDate) {
      newErrors.eventDate = "Event date is required";
    } else {
      const selectedDate = new Date(bookingForm.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.eventDate = "Event date must be in the future";
      }
    }
    
    if (!bookingForm.guestCount) {
      newErrors.guestCount = "Number of guests is required";
    } else if (parseInt(bookingForm.guestCount) < 1) {
      newErrors.guestCount = "Guest count must be at least 1";
    }
    
    setBookingErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createBooking = async () => {
    if (!user) {
      toast.warning("Please login to book this event");
      navigate("/login");
      return;
    }
    
    if (!validateBookingForm()) return;
    
    setSubmitting(true);
    try {
      let finalPrice = parseFloat(event.price);
      const guestCount = parseInt(bookingForm.guestCount);
      
      if (event.maxGuests && guestCount > event.maxGuests) {
        const extraGuests = guestCount - event.maxGuests;
        finalPrice += extraGuests * (event.perExtraGuestPrice || 0);
      }
      
      selectedAddons.forEach(addon => {
        if (addonPrices[addon]) {
          finalPrice += addonPrices[addon];
        }
      });

      // Add custom add-on prices
      selectedCustomAddons.forEach(addon => {
        finalPrice += parseFloat(addon.price) || 0;
      });

      // Add detailed service item prices
      const addonServices = event.addonServices || {};
      Object.entries(selectedServiceItems).forEach(([serviceName, categories]) => {
        const serviceConfig = addonServices[serviceName];
        if (!serviceConfig) return;
        Object.entries(categories).forEach(([categoryName, items]) => {
          const category = (serviceConfig.categories || []).find(c => c.name === categoryName);
          if (!category) return;
          items.forEach(selectedItem => {
            const matchingItem = (category.items || []).find(i => i.name === selectedItem.name);
            if (matchingItem) {
              const qty = parseInt(selectedItem.quantity) || 1;
              const rate = parseFloat(matchingItem.rate) || 0;
              // For catering items, multiply by number of guests
              if (serviceName === "catering" && guestCount > 0) {
                finalPrice += rate * qty * guestCount;
              } else {
                finalPrice += rate * qty;
              }
            }
          });
        });
      });
      
      const bookingData = {
        eventId: event.id,
        managerId: event.managerId,
        eventDate: bookingForm.eventDate,
        guests: parseInt(bookingForm.guestCount),
        specialRequests: bookingForm.specialRequests,
        selectedAddons: {
          catering: selectedAddons.includes("catering"),
          decoration: selectedAddons.includes("decoration"),
          photography: selectedAddons.includes("photography"),
          music: selectedAddons.includes("music"),
          transport: selectedAddons.includes("transport"),
        },
        selectedCustomAddons: selectedCustomAddons,
        selectedServiceItems: selectedServiceItems,
        totalPrice: finalPrice,
      };
      
      await API.post("/booking/create", bookingData);
      toast.success("Booking request sent successfully! The manager will review your request.");
      setShowBookingModal(false);
      setShowCustomizeModal(false);
      navigate("/customer/bookings");
    } catch (err) {
      console.error("Booking error:", err);
      toast.error(err.response?.data?.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const proceedToCustomization = () => {
    if (!user) {
      toast.warning("Please login to continue booking");
      navigate("/login");
      return;
    }

    if (!validateBookingForm()) return;

    setShowCustomizeModal(true);
  };

  // Get all media (images + videos) for the slideshow
  const getEventMedia = () => {
    if (!event) return [];
    const media = [];
    // Add all images from the images array
    if (event.images && event.images.length > 0) {
      event.images.forEach(img => {
        if (img) media.push({ url: img, type: "image" });
      });
    } else if (event.image) {
      // Fallback to single image
      media.push({ url: event.image, type: "image" });
    }
    return media;
  };

  const eventMedia = event ? getEventMedia() : [];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % eventMedia.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + eventMedia.length) % eventMedia.length);
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const lightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % eventMedia.length);
  };

  const lightboxPrev = () => {
    setLightboxIndex((prev) => (prev - 1 + eventMedia.length) % eventMedia.length);
  };

  // Get available customization services from the event
  const getAvailableCustomizations = () => {
    if (!event) return [];
    const customizations = [];
    const addonServices = event.addonServices || {};
    
    Object.entries(addonServices).forEach(([serviceName, service]) => {
      if (service.enabled && service.categories && service.categories.length > 0) {
        customizations.push({ key: serviceName, ...service });
      }
    });
    
    return customizations;
  };

  if (loading) {
    return (
      <>
        <AppNavbar />
        <div className="event-details-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Spinner animation="border" variant="primary" style={{ width: '48px', height: '48px', borderWidth: '4px' }} />
            <p className="mt-3" style={{ color: '#6b7280', fontWeight: 500 }}>Loading event details...</p>
          </motion.div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <AppNavbar />
        <div className="event-details-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <div className="text-center" style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
            <h4 style={{ fontWeight: 700, color: '#1f2937' }}>Event not found</h4>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>This event may have been removed or doesn't exist.</p>
            <button className="btn-pro btn-pro-complete" onClick={() => navigate("/")}>Browse Events</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppNavbar />
      
      <div className="event-details-page">
        <Container className="py-4">
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button className="event-back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft /> Back to Events
            </button>
          </motion.div>
          
          <Row>
            <Col lg={8}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="event-image-card mb-4">
                  {/* Image/Video Slideshow */}
                  <div className="event-media-slideshow">
                    {eventMedia.length > 0 ? (
                      <>
                        {eventMedia[currentSlide]?.type === "video" ? (
                          <video
                            src={eventMedia[currentSlide].url}
                            controls
                            className="slideshow-media"
                          />
                        ) : (
                          <img
                            src={eventMedia[currentSlide]?.url || "/placeholder-event-large.jpg"}
                            alt={`${event.name} - ${currentSlide + 1}`}
                            className="slideshow-media slideshow-media-clickable"
                            onClick={() => openLightbox(currentSlide)}
                          />
                        )}
                        {eventMedia.length > 1 && (
                          <>
                            <button className="slideshow-btn slideshow-btn-prev" onClick={prevSlide}>
                              <FaChevronLeft />
                            </button>
                            <button className="slideshow-btn slideshow-btn-next" onClick={nextSlide}>
                              <FaChevronRight />
                            </button>
                            <div className="slideshow-indicators">
                              {eventMedia.map((_, idx) => (
                                <button
                                  key={idx}
                                  className={`slideshow-dot ${idx === currentSlide ? 'active' : ''}`}
                                  onClick={() => setCurrentSlide(idx)}
                                />
                              ))}
                            </div>
                            <div className="slideshow-counter">
                              {currentSlide + 1} / {eventMedia.length}
                            </div>
                          </>
                        )}
                        {/* Thumbnail strip */}
                        {eventMedia.length > 1 && (
                          <div className="slideshow-thumbnails">
                            {eventMedia.map((media, idx) => (
                              <div
                                key={idx}
                                className={`slideshow-thumb ${idx === currentSlide ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(idx)}
                              >
                                {media.type === "video" ? (
                                  <div className="thumb-video-overlay">
                                    <FaPlay />
                                  </div>
                                ) : null}
                                <img
                                  src={media.type === "video" ? (media.thumbnail || media.url) : media.url}
                                  alt={`Thumbnail ${idx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <img
                        src="/placeholder-event-large.jpg"
                        alt={event.name}
                        className="slideshow-media"
                      />
                    )}
                  </div>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="event-title-section">
                        <h2>{event.name}</h2>
                        <div className="d-flex gap-2 mb-3 flex-wrap">
                          <span className={`badge-pro ${event.category === "wedding" ? "badge-category-wedding" : event.category === "birthday" ? "badge-category-birthday" : "badge-category-general"}`}>
                            {event.category === "wedding" ? "💒 Wedding" : event.category === "birthday" ? "🎂 Birthday" : "🎉 Event"}
                          </span>
                          {event.status === "available" && (
                            <span className="badge-pro badge-status-available">✓ Available</span>
                          )}
                        </div>
                        <div className="event-meta-row">
                          <span><FaStar className="text-warning" /> {event.rating ? event.rating.toFixed(1) : "No ratings"} ({event.totalReviews || 0} reviews)</span>
                          <span><FaUsers /> {event.maxGuests || "Unlimited"} guests max</span>
                          <span><FaClock /> {event.duration || "Flexible duration"}</span>
                        </div>
                      </div>
                      <div className="event-price-tag">
                        <div className="d-flex align-items-center gap-3 mb-1">
                          <button
                            className={`favorite-btn ${isFavorited ? 'active' : ''}`}
                            onClick={toggleFavorite}
                            title={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
                          >
                            {isFavorited ? <FaHeart /> : <FaRegHeart />}
                          </button>
                          <h3>₹{event.price.toLocaleString()}</h3>
                        </div>
                        <small>Starting price</small>
                      </div>
                    </div>
                    
                    <hr />
                    
                    <div className="mb-4">
                      <h5 className="event-section-title">About this event</h5>
                      <p style={{ color: '#4b5563', lineHeight: '1.7', fontSize: '15px' }}>{event.description || "No description provided"}</p>
                    </div>
                    
                    {event.includes && (
                      <div className="mb-4">
                        <h5 className="event-section-title">What's Included</h5>
                        <ul className="includes-list">
                          {event.includes.split(",").map((item, idx) => (
                            <li key={idx}>
                              <FaCheckCircle />
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {(addonPrices.catering > 0 || addonPrices.decoration > 0 || addonPrices.photography > 0 || addonPrices.music > 0) && (
                      <div className="mb-4">
                        <h5 className="event-section-title">Available Add-ons</h5>
                        <Row className="g-3">
                          {addonPrices.catering > 0 && (
                            <Col md={6}>
                              <div className="addon-card">
                                <div className="addon-card-icon"><FaUtensils /></div>
                                <div className="addon-card-title">Catering Services</div>
                                <div className="addon-card-price">+₹{addonPrices.catering.toLocaleString()}</div>
                                <div className="addon-card-desc">Customized menu and dining experience</div>
                              </div>
                            </Col>
                          )}
                          {addonPrices.decoration > 0 && (
                            <Col md={6}>
                              <div className="addon-card">
                                <div className="addon-card-icon"><FaPalette /></div>
                                <div className="addon-card-title">Decoration</div>
                                <div className="addon-card-price">+₹{addonPrices.decoration.toLocaleString()}</div>
                                <div className="addon-card-desc">Themed decorations and floral arrangements</div>
                              </div>
                            </Col>
                          )}
                          {addonPrices.photography > 0 && (
                            <Col md={6}>
                              <div className="addon-card">
                                <div className="addon-card-icon"><FaCamera /></div>
                                <div className="addon-card-title">Photography</div>
                                <div className="addon-card-price">+₹{addonPrices.photography.toLocaleString()}</div>
                                <div className="addon-card-desc">Professional photography and videography</div>
                              </div>
                            </Col>
                          )}
                          {addonPrices.music > 0 && (
                            <Col md={6}>
                              <div className="addon-card">
                                <div className="addon-card-icon"><FaMusic /></div>
                                <div className="addon-card-title">Music & Entertainment</div>
                                <div className="addon-card-price">+₹{addonPrices.music.toLocaleString()}</div>
                                <div className="addon-card-desc">DJ, live band, or sound system</div>
                              </div>
                            </Col>
                          )}
                        </Row>
                      </div>
                    )}

                    {/* Detailed Service Menu */}
                    {event.addonServices && Object.entries(event.addonServices).some(([, svc]) => svc.enabled && svc.categories?.length > 0) && (
                      <div className="mb-4">
                        <h5 className="event-section-title">Detailed Service Menu</h5>
                        <p style={{ color: "#6b7280", fontSize: "14px" }}>Browse available items below. You can select specific items when booking.</p>
                        {Object.entries(event.addonServices).filter(([, svc]) => svc.enabled && svc.categories?.length > 0).map(([serviceName, service]) => (
                          <div key={serviceName} className="mb-3">
                            <h6 style={{ textTransform: "capitalize", color: "#4f46e5" }}>
                              {serviceName === "catering" ? "🍽️" : serviceName === "decoration" ? "🎨" : serviceName === "photography" ? "📸" : serviceName === "music" ? "🎵" : serviceName === "transport" ? "🚗" : "🔧"} {serviceName.replace(/-/g, " ")}
                              {service.type === "packages" && <small className="text-muted ms-2">(select a package)</small>}
                            </h6>
                            {service.categories.map((cat) => (
                              <div key={cat.name} className="ms-3 mb-2">
                                <strong style={{ fontSize: "14px" }}>{cat.name}</strong>
                                <div className="ms-2">
                                  {(cat.items || []).map((item) => (
                                    <div key={item.name} className="d-flex justify-content-between py-1" style={{ fontSize: "13px", borderBottom: "1px solid #f3f4f6" }}>
                                      <span>{item.name}</span>
                                      <span className="text-success fw-bold">₹{item.rate} <small className="text-muted fw-normal">/{item.unit}</small></span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
            
            <Col lg={4}>
              <motion.div
                className="booking-sidebar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="booking-card">
                  <div className="booking-card-header">
                    <h5>✨ Book This Event</h5>
                    <p>Fill in details to reserve your spot</p>
                  </div>
                  <Card.Body>
                    <Form onSubmit={(e) => e.preventDefault()}>
                      <div className="booking-field">
                        {bookingErrors.eventDate && (
                          <div className="validation-message text-danger mb-1" style={{ fontSize: "12px", fontWeight: "500" }}>
                            ⚠️ {bookingErrors.eventDate}
                          </div>
                        )}
                        <label className="booking-field-label">
                          <FaCalendarAlt />
                          Event Date <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <Form.Control
                          type="date"
                          name="eventDate"
                          value={bookingForm.eventDate}
                          onChange={handleBookingFormChange}
                          min={new Date().toISOString().split("T")[0]}
                          isInvalid={!!bookingErrors.eventDate}
                        />
                      </div>
                      
                      <div className="booking-field">
                        {bookingErrors.guestCount && (
                          <div className="validation-message text-danger mb-1" style={{ fontSize: "12px", fontWeight: "500" }}>
                            ⚠️ {bookingErrors.guestCount}
                          </div>
                        )}
                        <label className="booking-field-label">
                          <FaUsers />
                          Number of Guests <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <Form.Control
                          type="number"
                          name="guestCount"
                          placeholder="Expected number of guests"
                          value={bookingForm.guestCount}
                          onChange={handleBookingFormChange}
                          onWheel={(e) => e.target.blur()}
                          min="1"
                          step="1"
                          isInvalid={!!bookingErrors.guestCount}
                        />
                        {event.maxGuests && (
                          <Form.Text>
                            Max guests: {event.maxGuests}
                            {event.perExtraGuestPrice && ` (Extra: ₹${event.perExtraGuestPrice}/guest)`}
                          </Form.Text>
                        )}
                      </div>
                      

                      {(addonPrices.catering > 0 || addonPrices.decoration > 0 || addonPrices.photography > 0 || addonPrices.music > 0) && (
                        <div className="booking-addons">
                          <label className="booking-field-label">
                            <FaCheckCircle />
                            Add-on Services
                          </label>
                          {addonPrices.catering > 0 && (
                            <div className={`booking-addon-item ${selectedAddons.includes("catering") ? 'selected' : ''}`} onClick={() => handleAddonToggle("catering")}>
                              <Form.Check
                                type="checkbox"
                                checked={selectedAddons.includes("catering")}
                                onChange={() => handleAddonToggle("catering")}
                              />
                              <label>🍽️ Catering (+₹{addonPrices.catering.toLocaleString()})</label>
                            </div>
                          )}
                          {addonPrices.decoration > 0 && (
                            <div className={`booking-addon-item ${selectedAddons.includes("decoration") ? 'selected' : ''}`} onClick={() => handleAddonToggle("decoration")}>
                              <Form.Check
                                type="checkbox"
                                checked={selectedAddons.includes("decoration")}
                                onChange={() => handleAddonToggle("decoration")}
                              />
                              <label>🎨 Decoration (+₹{addonPrices.decoration.toLocaleString()})</label>
                            </div>
                          )}
                          {addonPrices.photography > 0 && (
                            <div className={`booking-addon-item ${selectedAddons.includes("photography") ? 'selected' : ''}`} onClick={() => handleAddonToggle("photography")}>
                              <Form.Check
                                type="checkbox"
                                checked={selectedAddons.includes("photography")}
                                onChange={() => handleAddonToggle("photography")}
                              />
                              <label>📸 Photography (+₹{addonPrices.photography.toLocaleString()})</label>
                            </div>
                          )}
                          {addonPrices.music > 0 && (
                            <div className={`booking-addon-item ${selectedAddons.includes("music") ? 'selected' : ''}`} onClick={() => handleAddonToggle("music")}>
                              <Form.Check
                                type="checkbox"
                                checked={selectedAddons.includes("music")}
                                onChange={() => handleAddonToggle("music")}
                              />
                              <label>🎵 Music (+₹{addonPrices.music.toLocaleString()})</label>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Custom Add-ons from Manager */}
                      {event.customAddons && event.customAddons.length > 0 && (
                        <div className="booking-addons" style={{ marginTop: '12px' }}>
                          <label className="booking-field-label">
                            <FaCheckCircle />
                            Custom Packages & Add-ons
                          </label>
                          {event.customAddons.map((addon, idx) => (
                            <div
                              key={idx}
                              className={`booking-addon-item ${selectedCustomAddons.find(a => a.name === addon.name) ? 'selected' : ''}`}
                              onClick={() => handleCustomAddonToggle(addon)}
                            >
                              <Form.Check
                                type="checkbox"
                                checked={!!selectedCustomAddons.find(a => a.name === addon.name)}
                                onChange={() => handleCustomAddonToggle(addon)}
                              />
                              <label>
                                🎁 {addon.name} (+₹{(addon.price || 0).toLocaleString()})
                                {addon.description && <small className="d-block text-muted">{addon.description}</small>}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Detailed Service Items Selection */}
                      {event.addonServices && Object.entries(event.addonServices).some(([, svc]) => svc.enabled && svc.categories?.length > 0) && (
                        <div className="booking-addons" style={{ marginTop: '16px' }}>
                          <label className="booking-field-label">
                            <FaCheckCircle />
                            Detailed Service Options
                          </label>
                          <small className="text-muted d-block mb-2">Pick individual items and set quantities. Your total updates automatically.</small>
                          {Object.entries(event.addonServices).filter(([, svc]) => svc.enabled && svc.categories?.length > 0).map(([serviceName, service]) => {
                            const isPackageMode = service.type === "packages";
                            return (
                            <div key={serviceName} className="mb-3 p-2 border rounded" style={{ background: "#fafafa" }}>
                              <strong style={{ textTransform: "capitalize" }}>
                                {serviceName === "catering" ? "🍽️" : serviceName === "decoration" ? "🎨" : serviceName === "photography" ? "📸" : serviceName === "music" ? "🎵" : serviceName === "transport" ? "🚗" : "🔧"} {serviceName.replace(/-/g, " ")}
                              </strong>
                              {isPackageMode && <small className="text-muted ms-2">(select a package)</small>}
                              {service.categories.map((cat) => (
                                <div key={cat.name} className="ms-2 mt-1">
                                  <small className="text-primary fw-bold">{cat.name}</small>
                                  {(cat.items || []).map((item) => {
                                    const isSelected = selectedServiceItems[serviceName]?.[cat.name]?.find(i => i.name === item.name);
                                    return (
                                      <div key={item.name} className={`d-flex align-items-center gap-2 py-1 px-2 rounded mt-1 ${isSelected ? "bg-light border border-success" : ""}`} style={{ fontSize: "13px" }}>
                                        <Form.Check
                                          type={isPackageMode ? "radio" : "checkbox"}
                                          name={isPackageMode ? `pkg-${serviceName}-${cat.name}` : undefined}
                                          checked={!!isSelected}
                                          onChange={() => {
                                            if (isPackageMode) {
                                              // Radio behavior: only one selection per category
                                              setSelectedServiceItems((prev) => {
                                                const updated = JSON.parse(JSON.stringify(prev));
                                                if (!updated[serviceName]) updated[serviceName] = {};
                                                // If already selected, deselect
                                                if (isSelected) {
                                                  delete updated[serviceName][cat.name];
                                                  if (Object.keys(updated[serviceName]).length === 0) delete updated[serviceName];
                                                } else {
                                                  updated[serviceName][cat.name] = [{ name: item.name, quantity: 1 }];
                                                }
                                                calculateTotalPrice(event.price, parseInt(bookingForm.guestCount) || 0, selectedAddons, selectedCustomAddons, updated);
                                                return updated;
                                              });
                                            } else {
                                              handleServiceItemToggle(serviceName, cat.name, item);
                                            }
                                          }}
                                          id={`svc-${serviceName}-${cat.name}-${item.name}`}
                                        />
                                        <span style={{ flex: 1 }}>{item.name}</span>
                                        <span className="text-success fw-bold">₹{item.rate}/{item.unit}</span>
                                        {isSelected && !isPackageMode && (
                                          <Form.Control
                                            type="number"
                                            min="1"
                                            value={isSelected.quantity}
                                            onChange={(e) => handleServiceItemQuantity(serviceName, cat.name, item.name, e.target.value)}
                                            style={{ width: "60px", height: "28px", fontSize: "12px" }}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );})}
                        </div>
                      )}

                      <div className="booking-field">
                        <label className="booking-field-label">
                          <FaInfoCircle />
                          Special Requests
                        </label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="specialRequests"
                          placeholder="Any special requirements or preferences?"
                          value={bookingForm.specialRequests}
                          onChange={handleBookingFormChange}
                        />
                      </div>
                      
                      {/* Price Summary */}
                      <div className="price-summary">
                        <div className="price-summary-title">💰 Price Summary</div>
                        <div className="price-row">
                          <span>Base Price</span>
                          <span>₹{event.price.toLocaleString()}</span>
                        </div>
                        {bookingForm.guestCount && event.maxGuests && parseInt(bookingForm.guestCount) > event.maxGuests && (
                          <div className="price-row">
                            <span>Extra Guests ({parseInt(bookingForm.guestCount) - event.maxGuests} × ₹{event.perExtraGuestPrice || 0})</span>
                            <span>+₹{((parseInt(bookingForm.guestCount) - event.maxGuests) * (event.perExtraGuestPrice || 0)).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedAddons.map(addon => (
                          <div key={addon} className="price-row">
                            <span>{addon.charAt(0).toUpperCase() + addon.slice(1)}</span>
                            <span>+₹{addonPrices[addon].toLocaleString()}</span>
                          </div>
                        ))}
                        {selectedCustomAddons.map(addon => (
                          <div key={addon.name} className="price-row">
                            <span>{addon.name}</span>
                            <span>+₹{(addon.price || 0).toLocaleString()}</span>
                          </div>
                        ))}
                        {Object.entries(selectedServiceItems).map(([serviceName, categories]) =>
                          Object.entries(categories).map(([catName, items]) =>
                            items.map(item => {
                              const svcConfig = event.addonServices?.[serviceName];
                              const catConfig = svcConfig?.categories?.find(c => c.name === catName);
                              const itemConfig = catConfig?.items?.find(i => i.name === item.name);
                              const rate = itemConfig?.rate || 0;
                              const qty = item.quantity || 1;
                              return (
                                <div key={`${serviceName}-${catName}-${item.name}`} className="price-row" style={{ fontSize: "12px" }}>
                                  <span>{item.name} ×{qty}</span>
                                  <span>+₹{(rate * qty).toLocaleString()}</span>
                                </div>
                              );
                            })
                          )
                        )}
                        <div className="price-row total">
                          <span>Total</span>
                          <span className="price-value">₹{totalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <motion.button 
                        className="book-now-btn"
                        type="button"
                        onClick={proceedToCustomization}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Proceed to Customization →
                      </motion.button>
                    </Form>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </div>
      
      <Modal show={showCustomizeModal} onHide={() => setShowCustomizeModal(false)} size="lg" scrollable className="customize-modal">
        <Modal.Header closeButton>
          <Modal.Title>✨ Customize Your Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <FaInfoCircle className="me-2" />
            Enable the services you want, browse the menu, and select/deselect individual items.
          </Alert>
          
          {/* Show available customization services from the event manager */}
          {(() => {
            const availableCustomizations = getAvailableCustomizations();
            
            if (availableCustomizations.length === 0) {
              return (
                <div className="text-center py-4">
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                  <h5 style={{ color: '#374151', fontWeight: 700 }}>No Detailed Customizations Available</h5>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    This event doesn't have detailed service options. You can add special requests in the booking form.
                  </p>
                </div>
              );
            }

            const SERVICE_ICONS = {
              catering: "🍽️",
              decoration: "🎨",
              photography: "📸",
              music: "🎵",
              transport: "🚗",
            };

            const toggleServiceEnabled = (serviceKey) => {
              setEnabledServices(prev => {
                const updated = { ...prev, [serviceKey]: !prev[serviceKey] };
                // If disabling, remove all selections for this service
                if (!updated[serviceKey]) {
                  setSelectedServiceItems(prev => {
                    const newItems = { ...prev };
                    delete newItems[serviceKey];
                    calculateTotalPrice(event.price, parseInt(bookingForm.guestCount) || 0, selectedAddons, selectedCustomAddons, newItems);
                    return newItems;
                  });
                }
                return updated;
              });
            };

            const toggleCategoryExpand = (serviceKey, catName) => {
              const key = `${serviceKey}-${catName}`;
              setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
            };

            const isCategoryExpanded = (serviceKey, catName) => {
              return expandedCategories[`${serviceKey}-${catName}`] !== false; // default expanded
            };

            return (
              <div className="customize-services-list">
                {availableCustomizations.map((service) => {
                  const isServiceEnabled = enabledServices[service.key] || false;
                  const isPackageMode = service.type === "packages";
                  const hasSelections = !!selectedServiceItems[service.key] && Object.keys(selectedServiceItems[service.key]).length > 0;

                  return (
                    <div key={service.key} className={`customize-service-block ${isServiceEnabled ? 'enabled' : ''}`}>
                      {/* Service Header - Toggle */}
                      <div
                        className={`service-toggle-header ${isServiceEnabled ? 'active' : ''}`}
                        onClick={() => toggleServiceEnabled(service.key)}
                      >
                        <div className="service-toggle-left">
                          <span className="service-icon-lg">{SERVICE_ICONS[service.key] || "🔧"}</span>
                          <div>
                            <h6 className="service-toggle-name">{service.key.replace(/-/g, " ")}</h6>
                            <small className="service-toggle-desc">
                              {(service.categories || []).length} categories &bull; {(service.categories || []).reduce((sum, c) => sum + (c.items?.length || 0), 0)} items
                              {isPackageMode && " • Package mode"}
                            </small>
                          </div>
                        </div>
                        <div className="service-toggle-right">
                          {hasSelections && <span className="selection-badge">{Object.values(selectedServiceItems[service.key] || {}).reduce((sum, items) => sum + items.length, 0)} selected</span>}
                          <div className={`service-switch ${isServiceEnabled ? 'on' : ''}`}>
                            <div className="switch-knob"></div>
                          </div>
                        </div>
                      </div>

                      {/* Service Content - Categories & Items (visible when enabled) */}
                      {isServiceEnabled && (
                        <div className="service-categories-panel">
                          {isPackageMode && (
                            <div className="service-mode-info">
                              📦 Select one package per category
                            </div>
                          )}
                          {(service.categories || []).map((cat) => {
                            const isExpanded = isCategoryExpanded(service.key, cat.name);
                            const selectedInCategory = selectedServiceItems[service.key]?.[cat.name] || [];

                            return (
                              <div key={cat.name} className="customize-category-block">
                                {/* Category Header - Expandable */}
                                <div
                                  className="category-expand-header"
                                  onClick={() => toggleCategoryExpand(service.key, cat.name)}
                                >
                                  <div className="category-expand-left">
                                    <span className={`category-arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
                                    <span className="category-name-label">{cat.name}</span>
                                    <span className="category-item-count">({(cat.items || []).length} items)</span>
                                  </div>
                                  {selectedInCategory.length > 0 && (
                                    <span className="category-selected-badge">
                                      {selectedInCategory.length} selected
                                    </span>
                                  )}
                                </div>

                                {/* Items List - Visible when expanded */}
                                {isExpanded && (
                                  <div className="category-items-list">
                                    {(cat.items || []).map((item) => {
                                      const isSelected = selectedInCategory.find(i => i.name === item.name);
                                      return (
                                        <div
                                          key={item.name}
                                          className={`customize-dish-item ${isSelected ? 'selected' : ''}`}
                                          onClick={() => {
                                            if (isPackageMode) {
                                              setSelectedServiceItems((prev) => {
                                                const updated = JSON.parse(JSON.stringify(prev));
                                                if (!updated[service.key]) updated[service.key] = {};
                                                if (isSelected) {
                                                  delete updated[service.key][cat.name];
                                                  if (Object.keys(updated[service.key]).length === 0) delete updated[service.key];
                                                } else {
                                                  updated[service.key][cat.name] = [{ name: item.name, quantity: 1 }];
                                                }
                                                calculateTotalPrice(event.price, parseInt(bookingForm.guestCount) || 0, selectedAddons, selectedCustomAddons, updated);
                                                return updated;
                                              });
                                            } else {
                                              handleServiceItemToggle(service.key, cat.name, item);
                                            }
                                          }}
                                        >
                                          <div className="dish-item-left">
                                            <Form.Check
                                              type={isPackageMode ? "radio" : "checkbox"}
                                              name={isPackageMode ? `pkg-cust-${service.key}-${cat.name}` : undefined}
                                              checked={!!isSelected}
                                              onChange={() => {}}
                                              className="dish-check"
                                            />
                                            <span className="dish-name">{item.name}</span>
                                          </div>
                                          <div className="dish-item-right">
                                            <span className="dish-price">₹{item.rate}<small>/{item.unit}</small></span>
                                            {isSelected && !isPackageMode && (
                                              <div className="dish-qty-control" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                  className="qty-btn"
                                                  onClick={() => handleServiceItemQuantity(service.key, cat.name, item.name, Math.max(1, (isSelected.quantity || 1) - 1))}
                                                >−</button>
                                                <span className="qty-value">{isSelected.quantity || 1}</span>
                                                <button
                                                  className="qty-btn"
                                                  onClick={() => handleServiceItemQuantity(service.key, cat.name, item.name, (isSelected.quantity || 1) + 1)}
                                                >+</button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Selected Items Summary */}
                {Object.keys(selectedServiceItems).length > 0 && (
                  <div className="customize-summary">
                    <h6>📋 Your Selections</h6>
                    {Object.entries(selectedServiceItems).map(([serviceName, categories]) =>
                      Object.entries(categories).map(([catName, items]) =>
                        items.map(item => {
                          const svcConfig = event.addonServices?.[serviceName];
                          const catConfig = svcConfig?.categories?.find(c => c.name === catName);
                          const itemConfig = catConfig?.items?.find(i => i.name === item.name);
                          const rate = itemConfig?.rate || 0;
                          const qty = item.quantity || 1;
                          const guests = parseInt(bookingForm.guestCount) || 0;
                          const isCatering = serviceName === "catering";
                          const itemTotal = isCatering && guests > 0 ? rate * qty * guests : rate * qty;
                          return (
                            <div key={`${serviceName}-${catName}-${item.name}`} className="summary-item">
                              <span>{SERVICE_ICONS[serviceName] || "🔧"} {item.name} ×{qty}{isCatering && guests > 0 ? ` × ${guests} guests` : ''}</span>
                              <span className="summary-price">₹{itemTotal.toLocaleString()}</span>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Special Requests */}
          <div className="mt-4">
            <Form.Group>
              <Form.Label style={{ fontWeight: 600, color: '#374151' }}>💬 Additional Special Requests</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="specialRequests"
                placeholder="Any additional preferences or requirements for the event manager?"
                value={bookingForm.specialRequests}
                onChange={handleBookingFormChange}
                style={{ borderRadius: '12px' }}
              />
            </Form.Group>
          </div>

          {/* Total Price in Modal */}
          <div className="customize-total-price">
            <span>Estimated Total:</span>
            <span className="total-amount">₹{totalPrice.toLocaleString()}</span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-pro btn-pro-toggle" onClick={() => setShowCustomizeModal(false)}>
            Cancel
          </button>
          <button className="btn-pro btn-pro-confirm" onClick={createBooking} disabled={submitting}>
            {submitting ? <Spinner size="sm" className="me-2" /> : null}
            Submit Booking Request
          </button>
        </Modal.Footer>
      </Modal>

      {/* Fullscreen Lightbox Modal */}
      {showLightbox && (
        <div className="lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <button className="lightbox-close" onClick={() => setShowLightbox(false)}>✕</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {eventMedia[lightboxIndex]?.type === "video" ? (
              <video
                src={eventMedia[lightboxIndex].url}
                controls
                autoPlay
                className="lightbox-media"
              />
            ) : (
              <img
                src={eventMedia[lightboxIndex]?.url}
                alt={`${event?.name} - ${lightboxIndex + 1}`}
                className="lightbox-media"
              />
            )}
            {eventMedia.length > 1 && (
              <>
                <button className="lightbox-nav lightbox-nav-prev" onClick={lightboxPrev}>
                  <FaChevronLeft />
                </button>
                <button className="lightbox-nav lightbox-nav-next" onClick={lightboxNext}>
                  <FaChevronRight />
                </button>
                <div className="lightbox-counter">
                  {lightboxIndex + 1} / {eventMedia.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
    </>
  );
}
