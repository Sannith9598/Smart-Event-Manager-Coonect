import { useState } from "react";
import { Form, Button, Modal, Spinner } from "react-bootstrap";
import axios from "axios";
import { toast } from "react-toastify";
import { baseurl } from "../App";
import { useNavigate, Link } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaMobile, FaHome, FaUserTie, FaShieldAlt, FaCalendarCheck } from "react-icons/fa";
import { motion } from "framer-motion";

// Registration page with OTP email verification and role selection
export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "customer",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [errors, setErrors] = useState({});
  const [otpError, setOtpError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(form.mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/\d/.test(form.password) || !/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
      newErrors.password = "Must include a number and special character";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sends an OTP to the user's email before completing registration
  const sendOTP = async () => {
    if (!validate()) return false;
    setSendingOtp(true);
    try {
      await axios.post(baseurl + "/auth/send-otp", {
        email: form.email,
        name: form.name,
        mobile: form.mobile,
      });
      toast.success("OTP sent to your email!");
      setShowOtpModal(true);
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  // Verifies the OTP and creates the user account
  const verifyOTPAndRegister = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }
    setOtpError("");
    setLoading(true);
    try {
      const response = await axios.post(baseurl + "/auth/verify-otp-and-register", {
        ...form,
        otp: otp,
      });
      if (response.data.success) {
        toast.success("Registration successful! Redirecting...");
        localStorage.setItem("token", response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setShowOtpModal(false);
        setTimeout(() => {
          if (response.data.user.role === "customer") navigate("/customer-dashboard");
          else if (response.data.user.role === "manager") navigate("/manager-dashboard");
          else navigate("/");
        }, 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Resends the OTP if the cooldown timer has expired
  const resendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      await axios.post(baseurl + "/auth/send-otp", {
        email: form.email,
        name: form.name,
        mobile: form.mobile,
      });
      toast.success("OTP resent successfully!");
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="register-page">
      <div className="register-bg" />
      <div className="register-overlay" />

      {/* Floating particles */}
      <div className="particles">
        <span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span>
      </div>

      {/* Back to Home */}
      <Link to="/" className="reg-home-btn">
        <FaHome /> Home
      </Link>

      <div className="register-container">
        {/* Left Panel - Branding */}
        <motion.div
          className="register-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="brand-content">
            <h1>Join EventHub</h1>
            <p>Create your account and start planning unforgettable events</p>

            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon"><FaCalendarCheck /></span>
                <div>
                  <strong>Book Events</strong>
                  <small>Find and book verified event planners</small>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon"><FaUserTie /></span>
                <div>
                  <strong>Become a Manager</strong>
                  <small>List your services and grow your business</small>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon"><FaShieldAlt /></span>
                <div>
                  <strong>Secure & Verified</strong>
                  <small>OTP verification for all accounts</small>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Panel - Form */}
        <motion.div
          className="register-right"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>
          </div>

          <Form className="register-form">
            {/* Name */}
            <div className="glass-field">
              {errors.name && <span className="field-error">⚠️ {errors.name}</span>}
              <div className={`glass-input-group ${errors.name ? "error" : ""}`}>
                <span className="glass-input-icon"><FaUser /></span>
                <input
                  type="text"
                  name="name"
                  className="glass-input"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="glass-field">
              {errors.email && <span className="field-error">⚠️ {errors.email}</span>}
              <div className={`glass-input-group ${errors.email ? "error" : ""}`}>
                <span className="glass-input-icon"><FaEnvelope /></span>
                <input
                  type="email"
                  name="email"
                  className="glass-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="glass-field">
              {errors.mobile && <span className="field-error">⚠️ {errors.mobile}</span>}
              <div className={`glass-input-group ${errors.mobile ? "error" : ""}`}>
                <span className="glass-input-icon"><FaMobile /></span>
                <input
                  type="tel"
                  name="mobile"
                  className="glass-input"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="10-digit Mobile Number"
                  maxLength="10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="glass-field">
              {errors.password && <span className="field-error">⚠️ {errors.password}</span>}
              <div className={`glass-input-group ${errors.password ? "error" : ""}`}>
                <span className="glass-input-icon"><FaLock /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="glass-input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password (min 6 characters)"
                />
                <span className="toggle-eye glass-input-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            {/* Role Selection */}
            <div className="glass-field">
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-btn ${form.role === "customer" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, role: "customer" })}
                >
                  <FaUser /> Customer
                </button>
                <button
                  type="button"
                  className={`role-btn ${form.role === "manager" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, role: "manager" })}
                >
                  <FaUserTie /> Event Manager
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              className="register-btn"
              onClick={sendOTP}
              disabled={sendingOtp}
            >
              {sendingOtp ? (
                <><Spinner as="span" animation="border" size="sm" /> Sending OTP...</>
              ) : (
                "Create Account"
              )}
            </button>
          </Form>

          <div className="login-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </motion.div>
      </div>

      {/* OTP Modal */}
      <Modal show={showOtpModal} onHide={() => setShowOtpModal(false)} centered className="otp-modal">
        <Modal.Body className="otp-modal-body">
          <div className="otp-icon">🔐</div>
          <h4>Verify Your Email</h4>
          <p className="otp-subtitle">
            We sent a 6-digit code to <strong>{form.email}</strong>
          </p>

          <div className="otp-input-wrapper">
            {otpError && <span className="field-error">{otpError}</span>}
            <input
              type="text"
              className="otp-input"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (otpError) setOtpError("");
              }}
              maxLength="6"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") verifyOTPAndRegister(); }}
            />
          </div>

          <button
            className="verify-btn"
            onClick={verifyOTPAndRegister}
            disabled={loading || otp.length !== 6}
          >
            {loading ? <><Spinner as="span" animation="border" size="sm" /> Verifying...</> : "Verify & Register"}
          </button>

          <button
            className="resend-btn"
            onClick={resendOTP}
            disabled={resendTimer > 0}
          >
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
          </button>

          <button className="cancel-btn" onClick={() => setShowOtpModal(false)}>
            Cancel
          </button>
        </Modal.Body>
      </Modal>

      <style>{`
        .register-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .register-bg {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80');
          background-size: cover;
          background-position: center;
          transform: scale(1.05);
          filter: brightness(0.6);
        }

        .register-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.7) 0%,
            rgba(139, 92, 246, 0.6) 50%,
            rgba(15, 23, 42, 0.8) 100%
          );
        }

        .particles span {
          position: absolute;
          display: block;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          animation: particleFloat 20s linear infinite;
          bottom: -100px;
        }
        .particles span:nth-child(1) { left: 5%; width: 40px; height: 40px; animation-duration: 14s; }
        .particles span:nth-child(2) { left: 15%; width: 20px; height: 20px; animation-duration: 18s; animation-delay: 2s; }
        .particles span:nth-child(3) { left: 30%; width: 60px; height: 60px; animation-duration: 22s; animation-delay: 4s; }
        .particles span:nth-child(4) { left: 50%; width: 30px; height: 30px; animation-duration: 16s; animation-delay: 1s; }
        .particles span:nth-child(5) { left: 65%; width: 15px; height: 15px; animation-duration: 20s; animation-delay: 3s; }
        .particles span:nth-child(6) { left: 75%; width: 50px; height: 50px; animation-duration: 24s; animation-delay: 5s; }
        .particles span:nth-child(7) { left: 85%; width: 25px; height: 25px; animation-duration: 15s; animation-delay: 2s; }
        .particles span:nth-child(8) { left: 92%; width: 35px; height: 35px; animation-duration: 19s; animation-delay: 6s; }

        @keyframes particleFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.6; }
          100% { transform: translateY(-110vh) rotate(720deg); opacity: 0; }
        }

        .reg-home-btn {
          position: fixed;
          top: 24px;
          left: 24px;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 30px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        .reg-home-btn:hover {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }

        .register-container {
          position: relative;
          z-index: 10;
          display: flex;
          width: 90%;
          max-width: 900px;
          border-radius: 28px;
          overflow: hidden;
          box-shadow:
            0 25px 60px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .register-left {
          flex: 1;
          padding: 50px 40px;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          align-items: center;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .brand-content h1 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #fff, #c7d2fe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-content > p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
          margin-bottom: 35px;
          line-height: 1.5;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }
        .feature-item:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateX(5px);
        }

        .feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          flex-shrink: 0;
        }

        .feature-item strong {
          display: block;
          color: #fff;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .feature-item small {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
        }

        .register-right {
          flex: 1.1;
          padding: 40px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
        }

        .form-header h2 {
          font-size: 26px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }

        .form-header p {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin-bottom: 25px;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .glass-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-error {
          font-size: 12px;
          color: #fca5a5;
          font-weight: 500;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .glass-input-group {
          display: flex;
          align-items: center;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
          transition: all 0.3s ease;
        }

        .glass-input-group:focus-within {
          border-color: rgba(165, 180, 252, 0.6);
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.12);
        }

        .glass-input-group.error {
          border-color: rgba(252, 165, 165, 0.6);
        }

        .glass-input-icon {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          padding: 12px 14px;
          font-size: 14px;
        }

        .glass-input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          color: white !important;
          padding: 12px 14px 12px 0;
          font-size: 14px;
          outline: none;
          width: 100%;
        }

        .glass-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .glass-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px rgba(30, 41, 59, 0.9) inset !important;
          -webkit-text-fill-color: white !important;
        }

        .toggle-eye {
          cursor: pointer;
          transition: color 0.2s;
        }
        .toggle-eye:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .role-selector {
          display: flex;
          gap: 10px;
        }

        .role-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .role-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .role-btn.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
          border-color: rgba(165, 180, 252, 0.5);
          color: #c7d2fe;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
        }

        .register-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .register-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
          background: linear-gradient(135deg, #7c3aed, #6366f1);
        }

        .register-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-link {
          text-align: center;
          margin-top: 20px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }

        .login-link a {
          color: #a5b4fc;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .login-link a:hover {
          color: #c4b5fd;
        }

        /* OTP Modal */
        .otp-modal .modal-content {
          background: transparent;
          border: none;
        }

        .otp-modal-body {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 40px;
          text-align: center;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
        }

        .otp-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .otp-modal-body h4 {
          color: #f1f5f9;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .otp-subtitle {
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 25px;
        }

        .otp-subtitle strong {
          color: #c7d2fe;
        }

        .otp-input-wrapper {
          margin-bottom: 20px;
        }

        .otp-input {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
          color: white;
          font-size: 24px;
          font-weight: 600;
          text-align: center;
          letter-spacing: 12px;
          outline: none;
          transition: all 0.3s ease;
        }

        .otp-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .otp-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
          font-size: 14px;
          letter-spacing: 1px;
        }

        .verify-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 12px;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .verify-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
        }

        .verify-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .resend-btn {
          background: none;
          border: none;
          color: #a5b4fc;
          font-size: 13px;
          cursor: pointer;
          padding: 8px;
          transition: color 0.2s;
        }
        .resend-btn:hover:not(:disabled) { color: #c4b5fd; }
        .resend-btn:disabled { color: #475569; cursor: not-allowed; }

        .cancel-btn {
          display: block;
          margin: 8px auto 0;
          background: none;
          border: none;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
        }
        .cancel-btn:hover { color: #94a3b8; }

        /* Responsive */
        @media (max-width: 768px) {
          .register-container {
            flex-direction: column;
            width: 95%;
            max-height: 95vh;
            overflow-y: auto;
          }

          .register-left {
            padding: 30px 25px;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .brand-content h1 {
            font-size: 24px;
          }

          .features-list {
            display: none;
          }

          .register-right {
            padding: 30px 25px;
          }

          .role-selector {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
