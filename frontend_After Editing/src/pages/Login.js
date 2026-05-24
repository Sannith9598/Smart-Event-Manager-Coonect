import { useState } from "react";
import { Form, Button, InputGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaHome } from "react-icons/fa";
import API from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const login = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await API.post("/auth/login", form);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("token", res.data.token);
      if (res.data.refreshToken) {
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }
      window.dispatchEvent(new Event("auth-change"));
      toast.success("Login successful");
      if (res.data.user.role === "admin") navigate("/admin-dashboard");
      else if (res.data.user.role === "manager") navigate("/manager-dashboard");
      else navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.msg || err.response?.data?.message || "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background image with overlay */}
      <div className="login-bg" />
      <div className="login-overlay" />

      {/* Back to Home button */}
      <Link to="/" className="back-to-home-btn">
        <FaHome /> Back to Home
      </Link>

      {/* Content */}
      <div className="login-content">
        {/* Left branding */}
        <div className="login-branding">
          <div className="brand-glass">
            <h1>EventHub</h1>
            <p>Plan. Celebrate. Remember.</p>
            <div className="brand-features">
              <div className="feature-item">
                <span className="feature-icon">🎉</span>
                <span>500+ Events Managed</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⭐</span>
                <span>4.8 Average Rating</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Verified Professionals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="login-form-wrapper">
          <div className="glass-card">
            <div className="card-header-area">
              <h2>Welcome Back</h2>
              <p>Sign in to continue to your dashboard</p>
            </div>

            <Form onSubmit={(e) => { e.preventDefault(); login(); }}>
              <Form.Group className="mb-4">
                {errors.email && (
                  <div className="field-error">{errors.email}</div>
                )}
                <Form.Label className="field-label">Email Address</Form.Label>
                <InputGroup className="glass-input-group">
                  <InputGroup.Text className="glass-input-icon">
                    <FaEnvelope />
                  </InputGroup.Text>
                  <Form.Control
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="glass-input"
                    isInvalid={!!errors.email}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-4">
                {errors.password && (
                  <div className="field-error">{errors.password}</div>
                )}
                <Form.Label className="field-label">Password</Form.Label>
                <InputGroup className="glass-input-group">
                  <InputGroup.Text className="glass-input-icon">
                    <FaLock />
                  </InputGroup.Text>
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="glass-input"
                    isInvalid={!!errors.password}
                  />
                  <InputGroup.Text
                    className="glass-input-icon toggle-eye"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </InputGroup.Text>
                </InputGroup>
              </Form.Group>

              <div className="d-flex justify-content-end mb-3">
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>

              <Button className="login-btn w-100" type="submit" disabled={loading}>
                {loading ? (
                  <span className="d-flex align-items-center justify-content-center gap-2">
                    <span className="spinner-border spinner-border-sm" />
                    Signing in...
                  </span>
                ) : "Sign In"}
              </Button>
            </Form>

            <div className="divider">
              <span>or</span>
            </div>

            <p className="text-center register-link">
              Don't have an account?{" "}
              <Link to="/register">Create one</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back-to-home-btn {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 20;
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

        .back-to-home-btn:hover {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }

        .login-bg {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1920&q=80');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transform: scale(1.05);
          filter: brightness(0.7);
          animation: slowZoom 30s ease-in-out infinite alternate;
        }

        @keyframes slowZoom {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.12); }
        }

        .login-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.6) 0%,
            rgba(30, 41, 59, 0.4) 50%,
            rgba(15, 23, 42, 0.7) 100%
          );
          backdrop-filter: blur(2px);
        }

        .login-content {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          max-width: 1100px;
          width: 100%;
          padding: 40px;
          align-items: center;
        }

        /* Left branding */
        .login-branding {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-glass {
          padding: 50px 40px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          text-align: center;
        }

        .brand-glass h1 {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff, #c7d2fe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-glass p {
          font-size: 18px;
          opacity: 0.85;
          margin-bottom: 30px;
          font-weight: 300;
          letter-spacing: 1px;
        }

        .brand-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-align: left;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          opacity: 0.9;
          padding: 10px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateX(5px);
        }

        .feature-icon {
          font-size: 20px;
        }

        /* Glass card */
        .glass-card {
          padding: 40px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          color: white;
        }

        .card-header-area {
          text-align: center;
          margin-bottom: 30px;
        }

        .card-header-area h2 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .card-header-area p {
          opacity: 0.7;
          font-size: 14px;
        }

        .field-label {
          font-size: 13px;
          font-weight: 500;
          opacity: 0.85;
          margin-bottom: 6px;
        }

        .field-error {
          font-size: 12px;
          color: #fca5a5;
          margin-bottom: 6px;
          animation: fadeIn 0.3s ease;
        }

        .glass-input-group {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }

        .glass-input-group:focus-within {
          border-color: rgba(165, 180, 252, 0.6);
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.15);
        }

        .glass-input-icon {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 12px 14px;
        }

        .glass-input {
          background: transparent !important;
          border: none !important;
          color: white !important;
          padding: 12px 14px;
          font-size: 15px;
          box-shadow: none !important;
        }

        .glass-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
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

        .forgot-link {
          color: rgba(196, 181, 253, 0.9);
          font-size: 13px;
          text-decoration: none;
          transition: color 0.2s;
        }

        .forgot-link:hover {
          color: #c4b5fd;
        }

        .login-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
          background: linear-gradient(135deg, #7c3aed, #6366f1);
        }

        .login-btn:active {
          transform: translateY(0);
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 24px 0;
          gap: 12px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.15);
        }

        .divider span {
          font-size: 12px;
          opacity: 0.5;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .register-link {
          font-size: 14px;
          opacity: 0.8;
          margin: 0;
        }

        .register-link a {
          color: #a5b4fc;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }

        .register-link a:hover {
          color: #c4b5fd;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive */
        @media (max-width: 900px) {
          .login-content {
            grid-template-columns: 1fr;
            gap: 30px;
            padding: 20px;
          }
          .login-branding {
            display: none;
          }
          .glass-card {
            padding: 30px 24px;
          }
        }
      `}</style>
    </div>
  );
}
