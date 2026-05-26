import { useState } from "react";
import { Spinner } from "react-bootstrap";
import axios from "axios";
import { toast } from "react-toastify";
import { baseurl } from "../App";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaHome, FaKey, FaShieldAlt, FaCheckCircle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Multi-step password reset page with email verification and OTP
export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateEmail = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateReset = () => {
    const newErrors = {};
    if (!otp || otp.length !== 6) {
      newErrors.otp = "Please enter a valid 6-digit OTP";
    }
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/\d/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      newErrors.newPassword = "Must include a number and special character";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sends the OTP to the user's email to start the reset flow
  const sendResetOTP = async () => {
    if (!validateEmail()) return;
    setLoading(true);
    try {
      await axios.post(baseurl + "/auth/forgot-password", { email });
      toast.success("OTP sent to your email!");
      setStep(2);
      setErrors({});
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Submits the OTP and new password to complete the reset
  const resetPassword = async () => {
    if (!validateReset()) return;
    setLoading(true);
    try {
      const res = await axios.post(baseurl + "/auth/reset-password", {
        email, otp, newPassword,
      });
      toast.success(res.data.message || "Password reset successfully!");
      setStep(3);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Resends the OTP if the timer has expired
  const resendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await axios.post(baseurl + "/auth/forgot-password", { email });
      toast.success("OTP resent!");
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field) => {
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  return (
    <div className="fp-page">
      <div className="fp-bg" />
      <div className="fp-overlay" />

      {/* Floating particles */}
      <div className="fp-particles">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>

      {/* Back to Home */}
      <Link to="/" className="fp-home-btn">
        <FaHome /> Home
      </Link>

      <div className="fp-container">
        {/* Left Panel */}
        <motion.div
          className="fp-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="fp-brand">
            <div className="fp-lock-icon">
              <FaKey />
            </div>
            <h1>Reset Password</h1>
            <p>Don't worry, it happens to the best of us. We'll help you get back into your account.</p>

            <div className="fp-steps">
              <div className={`fp-step ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>
                <span className="step-num">{step > 1 ? "✓" : "1"}</span>
                <div>
                  <strong>Enter Email</strong>
                  <small>We'll send a verification code</small>
                </div>
              </div>
              <div className={`fp-step ${step >= 2 ? "active" : ""} ${step > 2 ? "done" : ""}`}>
                <span className="step-num">{step > 2 ? "✓" : "2"}</span>
                <div>
                  <strong>Verify & Reset</strong>
                  <small>Enter OTP and new password</small>
                </div>
              </div>
              <div className={`fp-step ${step >= 3 ? "active" : ""}`}>
                <span className="step-num">3</span>
                <div>
                  <strong>Done!</strong>
                  <small>Login with your new password</small>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Panel */}
        <motion.div
          className="fp-right"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="fp-form-header">
                  <h2>Find Your Account</h2>
                  <p>Enter the email address associated with your account</p>
                </div>

                <div className="fp-form">
                  <div className="glass-field">
                    {errors.email && <span className="field-error">⚠️ {errors.email}</span>}
                    <div className={`glass-input-group ${errors.email ? "error" : ""}`}>
                      <span className="glass-input-icon"><FaEnvelope /></span>
                      <input
                        type="email"
                        className="glass-input"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                        onKeyDown={(e) => e.key === "Enter" && sendResetOTP()}
                        placeholder="Enter your registered email"
                      />
                    </div>
                  </div>

                  <button className="fp-submit-btn" onClick={sendResetOTP} disabled={loading}>
                    {loading ? <><Spinner as="span" animation="border" size="sm" /> Sending...</> : "Send Reset Code"}
                  </button>
                </div>

                <div className="fp-footer-link">
                  Remember your password? <Link to="/login">Sign In</Link>
                </div>
              </motion.div>
            )}

            {/* Step 2: OTP + New Password */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="fp-form-header">
                  <h2>Reset Password</h2>
                  <p>Code sent to <strong style={{ color: "#c7d2fe" }}>{email}</strong></p>
                </div>

                <div className="fp-form">
                  {/* OTP */}
                  <div className="glass-field">
                    {errors.otp && <span className="field-error">⚠️ {errors.otp}</span>}
                    <div className={`glass-input-group ${errors.otp ? "error" : ""}`}>
                      <span className="glass-input-icon"><FaShieldAlt /></span>
                      <input
                        type="text"
                        className="glass-input otp-style"
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); clearFieldError("otp"); }}
                        placeholder="6-digit OTP"
                        maxLength="6"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="glass-field">
                    {errors.newPassword && <span className="field-error">⚠️ {errors.newPassword}</span>}
                    <div className={`glass-input-group ${errors.newPassword ? "error" : ""}`}>
                      <span className="glass-input-icon"><FaLock /></span>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="glass-input"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); clearFieldError("newPassword"); }}
                        placeholder="New Password (min 6 chars)"
                      />
                      <span className="toggle-eye glass-input-icon" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="glass-field">
                    {errors.confirmPassword && <span className="field-error">⚠️ {errors.confirmPassword}</span>}
                    <div className={`glass-input-group ${errors.confirmPassword ? "error" : ""}`}>
                      <span className="glass-input-icon"><FaLock /></span>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="glass-input"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                        onKeyDown={(e) => e.key === "Enter" && resetPassword()}
                        placeholder="Confirm New Password"
                      />
                    </div>
                  </div>

                  <button className="fp-submit-btn" onClick={resetPassword} disabled={loading}>
                    {loading ? <><Spinner as="span" animation="border" size="sm" /> Resetting...</> : "Reset Password"}
                  </button>

                  <button className="fp-resend-btn" onClick={resendOTP} disabled={resendTimer > 0}>
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="fp-success"
              >
                <div className="success-icon">
                  <FaCheckCircle />
                </div>
                <h2>Password Reset!</h2>
                <p>Your password has been changed successfully. Redirecting to login...</p>
                <Link to="/login" className="fp-login-link-btn">
                  Go to Login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style>{`
        .fp-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fp-bg {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80');
          background-size: cover;
          background-position: center;
          transform: scale(1.05);
          filter: brightness(0.5);
        }

        .fp-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.75) 0%,
            rgba(79, 70, 229, 0.6) 50%,
            rgba(15, 23, 42, 0.85) 100%
          );
        }

        .fp-particles span {
          position: absolute;
          display: block;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          animation: fpFloat 20s linear infinite;
          bottom: -80px;
        }
        .fp-particles span:nth-child(1) { left: 8%; width: 35px; height: 35px; animation-duration: 16s; }
        .fp-particles span:nth-child(2) { left: 25%; width: 20px; height: 20px; animation-duration: 20s; animation-delay: 3s; }
        .fp-particles span:nth-child(3) { left: 45%; width: 50px; height: 50px; animation-duration: 24s; animation-delay: 1s; }
        .fp-particles span:nth-child(4) { left: 60%; width: 25px; height: 25px; animation-duration: 18s; animation-delay: 5s; }
        .fp-particles span:nth-child(5) { left: 78%; width: 40px; height: 40px; animation-duration: 22s; animation-delay: 2s; }
        .fp-particles span:nth-child(6) { left: 90%; width: 15px; height: 15px; animation-duration: 14s; animation-delay: 4s; }

        @keyframes fpFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.5; }
          100% { transform: translateY(-110vh) rotate(720deg); opacity: 0; }
        }

        .fp-home-btn {
          position: fixed;
          top: 24px;
          left: 24px;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .fp-home-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
          transform: translateX(-3px);
        }

        .fp-container {
          position: relative;
          z-index: 10;
          display: flex;
          width: 90%;
          max-width: 850px;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .fp-left {
          flex: 0.9;
          padding: 50px 35px;
          background: rgba(15, 23, 42, 0.65);
          display: flex;
          align-items: center;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .fp-brand {
          width: 100%;
        }

        .fp-lock-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          margin-bottom: 20px;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }

        .fp-brand h1 {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #fff, #c7d2fe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .fp-brand > p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 35px;
        }

        .fp-steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .fp-step {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s ease;
          opacity: 0.5;
        }

        .fp-step.active {
          opacity: 1;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(165, 180, 252, 0.3);
        }

        .fp-step.done {
          opacity: 0.7;
        }

        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          flex-shrink: 0;
        }

        .fp-step.active .step-num {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .fp-step.done .step-num {
          background: #10b981;
          color: white;
        }

        .fp-step strong {
          display: block;
          color: #fff;
          font-size: 13px;
          margin-bottom: 2px;
        }

        .fp-step small {
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
        }

        .fp-right {
          flex: 1.1;
          padding: 50px 40px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
        }

        .fp-right > div {
          width: 100%;
        }

        .fp-form-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 6px;
        }

        .fp-form-header p {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin-bottom: 30px;
        }

        .fp-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
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
          padding: 14px 14px;
          font-size: 15px;
        }

        .glass-input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          color: white !important;
          padding: 14px 14px 14px 0;
          font-size: 15px;
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

        .otp-style {
          letter-spacing: 8px;
          font-weight: 600;
          font-size: 18px;
        }

        .toggle-eye {
          cursor: pointer;
          transition: color 0.2s;
        }
        .toggle-eye:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .fp-submit-btn {
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
          margin-top: 6px;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .fp-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
          background: linear-gradient(135deg, #7c3aed, #6366f1);
        }

        .fp-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .fp-resend-btn {
          background: none;
          border: none;
          color: #a5b4fc;
          font-size: 13px;
          cursor: pointer;
          padding: 6px;
          text-align: center;
          transition: color 0.2s;
        }
        .fp-resend-btn:hover:not(:disabled) { color: #c4b5fd; }
        .fp-resend-btn:disabled { color: #475569; cursor: not-allowed; }

        .fp-footer-link {
          text-align: center;
          margin-top: 24px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }

        .fp-footer-link a {
          color: #a5b4fc;
          font-weight: 600;
          text-decoration: none;
        }
        .fp-footer-link a:hover { color: #c4b5fd; }

        /* Success State */
        .fp-success {
          text-align: center;
          padding: 20px 0;
        }

        .success-icon {
          font-size: 60px;
          color: #10b981;
          margin-bottom: 20px;
          animation: successPop 0.5s ease;
        }

        @keyframes successPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .fp-success h2 {
          color: #fff;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .fp-success p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          margin-bottom: 25px;
        }

        .fp-login-link-btn {
          display: inline-block;
          padding: 12px 30px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }
        .fp-login-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5);
          color: white;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .fp-container {
            flex-direction: column;
            width: 95%;
          }

          .fp-left {
            padding: 30px 25px;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .fp-brand h1 { font-size: 22px; }
          .fp-steps { display: none; }

          .fp-right {
            padding: 30px 25px;
          }
        }
      `}</style>
    </div>
  );
}
