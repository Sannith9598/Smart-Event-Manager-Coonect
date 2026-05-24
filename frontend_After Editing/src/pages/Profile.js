import { useState, useEffect, useRef } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Spinner,
  Badge,
  InputGroup,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaMobile,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCamera,
  FaTrash,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaBriefcase,
  FaShieldAlt,
  FaCheckCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import AppNavbar from "../components/Navbar";
import Footer from "../components/Footer";
import API from "../services/api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const fileInputRef = useRef(null);

  const [profileForm, setProfileForm] = useState({ name: "", mobile: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [managerForm, setManagerForm] = useState({
    location: "",
    description: "",
    serviceAreas: [],
    businessTypes: [],
  });
  const [newArea, setNewArea] = useState("");
  const [newType, setNewType] = useState("");

  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get("/profile");
      const data = res.data.data;
      setUser(data);
      setProfileForm({ name: data.name, mobile: data.mobile });

      if (data.managerProfile) {
        setManagerForm({
          location: data.managerProfile.location || "",
          description: data.managerProfile.description || "",
          serviceAreas: data.managerProfile.serviceAreas || [],
          businessTypes: data.managerProfile.businessTypes || [],
        });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      }
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await API.put("/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser({ ...user, profilePhoto: res.data.data.profilePhoto });

      // Update localStorage
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.profilePhoto = res.data.data.profilePhoto;
      localStorage.setItem("user", JSON.stringify(storedUser));

      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      await API.delete("/profile/photo");
      setUser({ ...user, profilePhoto: null });

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      delete storedUser.profilePhoto;
      localStorage.setItem("user", JSON.stringify(storedUser));

      toast.success("Profile photo removed");
    } catch (err) {
      toast.error("Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    if (!profileForm.name.trim()) {
      newErrors.name = "Name is required";
    } else if (profileForm.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!profileForm.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(profileForm.mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number";
    }
    setProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = "New password must be at least 8 characters";
    } else if (!/\d/.test(passwordForm.newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword)) {
      newErrors.newPassword = "Must include a number and special character";
    }
    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileUpdate = async () => {
    if (!validateProfile()) return;
    setSaving(true);
    try {
      await API.put("/profile/update", profileForm);
      toast.success("Profile updated successfully!");
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.name = profileForm.name;
      storedUser.mobile = profileForm.mobile;
      localStorage.setItem("user", JSON.stringify(storedUser));
      setUser({ ...user, ...profileForm });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!validatePassword()) return;
    setChangingPassword(true);
    try {
      await API.put("/profile/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleManagerProfileUpdate = async () => {
    setSaving(true);
    try {
      await API.put("/profile/manager-profile", managerForm);
      toast.success("Business profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update business profile");
    } finally {
      setSaving(false);
    }
  };

  const addServiceArea = () => {
    if (newArea.trim() && !managerForm.serviceAreas.includes(newArea.trim())) {
      setManagerForm({
        ...managerForm,
        serviceAreas: [...managerForm.serviceAreas, newArea.trim()],
      });
      setNewArea("");
    }
  };

  const removeServiceArea = (area) => {
    setManagerForm({
      ...managerForm,
      serviceAreas: managerForm.serviceAreas.filter((a) => a !== area),
    });
  };

  const addBusinessType = () => {
    if (newType.trim() && !managerForm.businessTypes.includes(newType.trim())) {
      setManagerForm({
        ...managerForm,
        businessTypes: [...managerForm.businessTypes, newType.trim()],
      });
      setNewType("");
    }
  };

  const removeBusinessType = (type) => {
    setManagerForm({
      ...managerForm,
      businessTypes: managerForm.businessTypes.filter((t) => t !== type),
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <>
        <AppNavbar />
        <Container className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading profile...</p>
        </Container>
      </>
    );
  }

  const sidebarItems = [
    { key: "personal", icon: <FaUser />, label: "Personal Info" },
    { key: "security", icon: <FaShieldAlt />, label: "Security" },
    ...(user?.role === "manager"
      ? [{ key: "business", icon: <FaBriefcase />, label: "Business Profile" }]
      : []),
  ];

  return (
    <>
      <AppNavbar />
      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: "200px", position: "relative" }}>
        <Container className="py-4">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white mb-0 fw-bold"
          >
            My Profile
          </motion.h2>
          <p className="text-white-50 mb-0">Manage your account settings</p>
        </Container>
      </div>

      <Container style={{ marginTop: "-80px", paddingBottom: "40px" }}>
        <Row className="g-4">
          {/* Left Sidebar - Profile Card */}
          <Col lg={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-0 shadow-lg text-center overflow-hidden">
                {/* Profile Photo Section */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    padding: "30px 20px 50px",
                  }}
                >
                  <div className="position-relative d-inline-block">
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                        border: "4px solid white",
                        overflow: "hidden",
                        margin: "0 auto",
                        background: "#e9ecef",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingPhoto ? (
                        <Spinner animation="border" variant="primary" size="sm" />
                      ) : user?.profilePhoto ? (
                        <img
                          src={user.profilePhoto}
                          alt="Profile"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "40px", color: "#667eea", fontWeight: "bold" }}>
                          {getInitials(user?.name)}
                        </span>
                      )}

                      {/* Hover overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "opacity 0.3s",
                          borderRadius: "50%",
                        }}
                        className="photo-overlay"
                      >
                        <FaCamera size={24} color="white" />
                      </div>
                    </div>

                    {user?.profilePhoto && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto();
                        }}
                        style={{
                          position: "absolute",
                          bottom: "5px",
                          right: "5px",
                          background: "#dc3545",
                          border: "2px solid white",
                          borderRadius: "50%",
                          width: "30px",
                          height: "30px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title="Remove photo"
                      >
                        <FaTrash size={12} color="white" />
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    style={{ display: "none" }}
                  />
                </div>

                <Card.Body className="pt-3">
                  <h5 className="fw-bold mb-1">{user?.name}</h5>
                  <p className="text-muted small mb-2">{user?.email}</p>
                  <span
                    className={`badge-pro ${user?.role === "manager" ? "badge-role-manager" : user?.role === "admin" ? "badge-role-admin" : "badge-role-customer"}`}
                  >
                    {user?.role === "manager" ? "Event Manager" : user?.role === "admin" ? "Admin" : "Customer"}
                  </span>

                  {user?.isVerified && (
                    <div className="mt-2">
                      <span className="badge-pro badge-verified" style={{ fontSize: "11px", padding: "5px 12px" }}>
                        Verified Account
                      </span>
                    </div>
                  )}

                  <hr className="my-3" />

                  {/* Sidebar Navigation */}
                  <div className="d-flex flex-column gap-2">
                    {sidebarItems.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setActiveSection(item.key)}
                        className={`btn text-start d-flex align-items-center gap-2 ${
                          activeSection === item.key
                            ? "btn-primary"
                            : "btn-light"
                        }`}
                        style={{
                          borderRadius: "10px",
                          padding: "10px 16px",
                          fontWeight: activeSection === item.key ? "600" : "400",
                          transition: "all 0.2s",
                        }}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>

          {/* Right Content Area */}
          <Col lg={8}>
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Personal Information Section */}
              {activeSection === "personal" && (
                <Card className="border-0 shadow-lg">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #667eea, #764ba2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FaUser color="white" />
                      </div>
                      <div>
                        <h5 className="mb-0 fw-bold">Personal Information</h5>
                        <small className="text-muted">Update your personal details</small>
                      </div>
                    </div>

                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">
                            <FaUser className="me-1" /> Full Name
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, name: e.target.value });
                              if (profileErrors.name) setProfileErrors({ ...profileErrors, name: "" });
                            }}
                            isInvalid={!!profileErrors.name}
                            style={{ borderRadius: "10px", padding: "12px 16px" }}
                          />
                          <Form.Control.Feedback type="invalid">
                            {profileErrors.name}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">
                            <FaMobile className="me-1" /> Mobile Number
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            value={profileForm.mobile}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, mobile: e.target.value });
                              if (profileErrors.mobile) setProfileErrors({ ...profileErrors, mobile: "" });
                            }}
                            maxLength="10"
                            isInvalid={!!profileErrors.mobile}
                            style={{ borderRadius: "10px", padding: "12px 16px" }}
                          />
                          <Form.Control.Feedback type="invalid">
                            {profileErrors.mobile}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">
                            <FaEnvelope className="me-1" /> Email Address
                          </Form.Label>
                          <Form.Control
                            type="email"
                            value={user?.email || ""}
                            disabled
                            style={{ borderRadius: "10px", padding: "12px 16px", background: "#f8f9fa" }}
                          />
                          <Form.Text className="text-muted">
                            <FaInfoCircle className="me-1" />
                            Email cannot be changed for security reasons
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="mt-4 pt-3 border-top">
                      <button
                        className="btn-pro btn-pro-confirm"
                        onClick={handleProfileUpdate}
                        disabled={saving}
                      >
                        {saving ? <Spinner size="sm" className="me-2" /> : null}
                        Save Changes
                      </button>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Security Section */}
              {activeSection === "security" && (
                <Card className="border-0 shadow-lg">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #f093fb, #f5576c)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FaShieldAlt color="white" />
                      </div>
                      <div>
                        <h5 className="mb-0 fw-bold">Security Settings</h5>
                        <small className="text-muted">Manage your password</small>
                      </div>
                    </div>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold small text-muted">
                        <FaLock className="me-1" /> Current Password
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPasswords ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => {
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                            if (passwordErrors.currentPassword) setPasswordErrors({ ...passwordErrors, currentPassword: "" });
                          }}
                          placeholder="Enter current password"
                          isInvalid={!!passwordErrors.currentPassword}
                          style={{ borderRadius: "10px 0 0 10px", padding: "12px 16px" }}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowPasswords(!showPasswords)}
                          style={{ borderRadius: "0 10px 10px 0" }}
                        >
                          {showPasswords ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                        <Form.Control.Feedback type="invalid">
                          {passwordErrors.currentPassword}
                        </Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>

                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">New Password</Form.Label>
                          <Form.Control
                            type={showPasswords ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e) => {
                              setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                              if (passwordErrors.newPassword) setPasswordErrors({ ...passwordErrors, newPassword: "" });
                            }}
                            placeholder="Min 6 characters"
                            isInvalid={!!passwordErrors.newPassword}
                            style={{ borderRadius: "10px", padding: "12px 16px" }}
                          />
                          <Form.Control.Feedback type="invalid">
                            {passwordErrors.newPassword}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">Confirm New Password</Form.Label>
                          <Form.Control
                            type={showPasswords ? "text" : "password"}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => {
                              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                              if (passwordErrors.confirmPassword) setPasswordErrors({ ...passwordErrors, confirmPassword: "" });
                            }}
                            placeholder="Confirm new password"
                            isInvalid={!!passwordErrors.confirmPassword}
                            style={{ borderRadius: "10px", padding: "12px 16px" }}
                          />
                          <Form.Control.Feedback type="invalid">
                            {passwordErrors.confirmPassword}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="mt-4 pt-3 border-top">
                      <Button
                        variant="warning"
                        onClick={handlePasswordChange}
                        disabled={changingPassword}
                        style={{ borderRadius: "10px", padding: "10px 30px" }}
                      >
                        {changingPassword ? <Spinner size="sm" className="me-2" /> : <FaLock className="me-2" />}
                        Change Password
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Business Profile Section */}
              {activeSection === "business" && user?.role === "manager" && (
                <Card className="border-0 shadow-lg">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #4facfe, #00f2fe)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FaBriefcase color="white" />
                      </div>
                      <div>
                        <h5 className="mb-0 fw-bold">Business Profile</h5>
                        <small className="text-muted">Manage your business details</small>
                      </div>
                    </div>

                    <Row className="g-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">
                            <FaMapMarkerAlt className="me-1" /> Business Location
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={managerForm.location}
                            onChange={(e) => setManagerForm({ ...managerForm, location: e.target.value })}
                            placeholder="Your business location"
                            style={{ borderRadius: "10px", padding: "12px 16px" }}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">
                            <FaInfoCircle className="me-1" /> Description
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={managerForm.description}
                            onChange={(e) => setManagerForm({ ...managerForm, description: e.target.value })}
                            placeholder="Describe your business and services"
                            style={{ borderRadius: "10px", padding: "12px 16px" }}
                          />
                        </Form.Group>
                      </Col>

                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">Service Areas</Form.Label>
                          <div className="d-flex gap-2 mb-2">
                            <Form.Control
                              type="text"
                              value={newArea}
                              onChange={(e) => setNewArea(e.target.value)}
                              placeholder="Add a service area"
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addServiceArea())}
                              style={{ borderRadius: "10px", padding: "12px 16px" }}
                            />
                            <Button
                              variant="outline-primary"
                              onClick={addServiceArea}
                              style={{ borderRadius: "10px", whiteSpace: "nowrap" }}
                            >
                              + Add
                            </Button>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {managerForm.serviceAreas.map((area, idx) => (
                              <Badge
                                key={idx}
                                bg="primary"
                                className="d-flex align-items-center gap-1 px-3 py-2"
                                style={{ fontSize: "13px", borderRadius: "20px" }}
                              >
                                {area}
                                <button
                                  onClick={() => removeServiceArea(area)}
                                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </Form.Group>
                      </Col>

                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-muted">Business Types</Form.Label>
                          <div className="d-flex gap-2 mb-2">
                            <Form.Control
                              type="text"
                              value={newType}
                              onChange={(e) => setNewType(e.target.value)}
                              placeholder="e.g., Wedding, Birthday, Corporate"
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBusinessType())}
                              style={{ borderRadius: "10px", padding: "12px 16px" }}
                            />
                            <Button
                              variant="outline-info"
                              onClick={addBusinessType}
                              style={{ borderRadius: "10px", whiteSpace: "nowrap" }}
                            >
                              + Add
                            </Button>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {managerForm.businessTypes.map((type, idx) => (
                              <Badge
                                key={idx}
                                bg="info"
                                className="d-flex align-items-center gap-1 px-3 py-2"
                                style={{ fontSize: "13px", borderRadius: "20px" }}
                              >
                                {type}
                                <button
                                  onClick={() => removeBusinessType(type)}
                                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="mt-4 pt-3 border-top">
                      <button
                        className="btn-pro btn-pro-confirm"
                        onClick={handleManagerProfileUpdate}
                        disabled={saving}
                      >
                        {saving ? <Spinner size="sm" className="me-2" /> : <FaBriefcase className="me-2" />}
                        Update Business Profile
                      </button>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </motion.div>
          </Col>
        </Row>
      </Container>
      <Footer />

      <style>{`
        .photo-overlay {
          opacity: 0 !important;
        }
        div:hover > .photo-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}
