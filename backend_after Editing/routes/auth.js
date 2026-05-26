const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, EventManager, Otp, LoginAttempt } = require("../models");
const { sendEmail } = require("../utils/emailTemplates");
const rateLimit = require("express-rate-limit");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY_MINUTES = 10;

// JWT secrets — use separate secret for refresh tokens (falls back to JWT_SECRET if not set)
const JWT_ACCESS_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + "_refresh");

// ─── Account Lockout (Database-backed) ───────────────────────────────────────

// Checks if the account is locked due to too many failed login attempts
const checkAccountLockout = async (email) => {
  const record = await LoginAttempt.findOne({ where: { email } });
  if (!record) return { locked: false };

  if (record.lockedUntil && new Date() < new Date(record.lockedUntil)) {
    const remainingMs = new Date(record.lockedUntil).getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return { locked: true, remainingMin };
  }

  // Reset if lockout expired
  if (record.lockedUntil && new Date() >= new Date(record.lockedUntil)) {
    await record.destroy();
    return { locked: false };
  }

  return { locked: false };
};

// Increments the failed login counter; locks the account after 5 consecutive failures
const recordFailedAttempt = async (email) => {
  let record = await LoginAttempt.findOne({ where: { email } });

  if (!record) {
    record = await LoginAttempt.create({ email, attempts: 1, lockedUntil: null });
  } else {
    record.attempts += 1;
    if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
    }
    await record.save();
  }

  return record.attempts;
};

// Clears failed login records after a successful login
const resetAttempts = async (email) => {
  await LoginAttempt.destroy({ where: { email } });
};

// ─── Rate Limiters ───────────────────────────────────────────────────────────

// Limits login attempts to 10 per 15 minutes per IP to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limits OTP requests to 5 per 10 minutes per IP to avoid spam
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests. Please try again after 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Email (Brevo HTTP API via shared utility) ──────────────────────────────
const FROM_EMAIL = process.env.FROM_EMAIL || "mailserviceforproject@gmail.com";

// ─── OTP Helpers (Database-backed) ──────────────────────────────────────────

// Generates a random 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Saves OTP to the database, replacing any existing one for the same email+purpose
const storeOtp = async (email, otp, purpose) => {
  // Delete any existing OTPs for this email+purpose
  await Otp.destroy({ where: { email, purpose } });

  // Create new OTP record
  await Otp.create({
    email,
    otp,
    purpose,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    used: false,
  });
};

// Validates OTP against the database — checks expiry and marks it as used if valid
const verifyOtp = async (email, otp, purpose) => {
  const record = await Otp.findOne({
    where: {
      email,
      purpose,
      used: false,
    },
    order: [["createdAt", "DESC"]],
  });

  if (!record) {
    return { valid: false, message: "OTP not found. Please request a new OTP" };
  }

  if (new Date() > new Date(record.expiresAt)) {
    await record.destroy();
    return { valid: false, message: "OTP has expired. Please request a new OTP" };
  }

  if (record.otp !== otp) {
    return { valid: false, message: "Invalid OTP" };
  }

  // Mark as used
  await record.update({ used: true });
  return { valid: true };
};

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /send-otp — Sends a 6-digit OTP to the user's email for registration verification
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const { email, name, mobile } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingMobile = await User.findOne({ where: { mobile } });
    if (existingMobile) {
      return res.status(400).json({ message: "Mobile already exists" });
    }

    const otp = generateOTP();
    await storeOtp(email, otp, "registration");

    await sendEmail({
      to: email,
      subject: "Your OTP for Registration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6a11cb;">Email Verification</h2>
          <p>Hello ${name || "User"},</p>
          <p>Your OTP for registration is:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 10px;">
            ${otp}
          </div>
          <p>This OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Event Platform Team</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email"
    });

  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send OTP"
    });
  }
});


// POST /verify-otp-and-register — Verifies the OTP then creates the user account with a hashed password
router.post("/verify-otp-and-register", async (req, res) => {
  try {
    const { name, email, mobile, password, role, otp } = req.body;

    if (!name || !email || !password || !mobile || !otp) {
      return res.status(400).json({ message: "All fields and OTP are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Password strength check
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasNumber || !hasSpecial) {
      return res.status(400).json({ message: "Password must contain at least one number and one special character" });
    }

    // Verify OTP from database
    const otpResult = await verifyOtp(email, otp, "registration");
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashed,
      role: role || "customer",
      isVerified: true
    });

    if (role === "manager") {
      await EventManager.create({
        userId: user.id,
        location: null,
        price: null,
        rating: 0,
        description: null,
        portfolioUrl: null,
        isVerified: false,
        verificationStatus: "not_submitted"
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, type: "refresh" },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const userData = user.toJSON();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Registration failed"
    });
  }
});

// POST /login — Authenticates user credentials, handles lockout logic, returns JWT access + refresh tokens
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Account lockout check (database-backed)
    const lockStatus = await checkAccountLockout(email);
    if (lockStatus.locked) {
      return res.status(423).json({
        message: `Account temporarily locked due to too many failed attempts. Try again in ${lockStatus.remainingMin} minutes.`
      });
    }

    const user = await User.unscoped().findOne({
      where: { email }
    });

    if (!user) {
      await recordFailedAttempt(email);
      return res.status(400).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      const attemptCount = await recordFailedAttempt(email);
      const remaining = MAX_LOGIN_ATTEMPTS - attemptCount;
      if (remaining > 0) {
        return res.status(400).json({ message: `Wrong password. ${remaining} attempts remaining.` });
      } else {
        return res.status(423).json({ message: "Account locked due to too many failed attempts. Try again in 15 minutes." });
      }
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: "Please verify your email first"
      });
    }

    // Check if account is blocked by admin
    if (user.status === "blocked") {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support."
      });
    }

    // Reset failed attempts on successful login
    await resetAttempts(email);

    // Generate tokens with separate secrets
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, type: "refresh" },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const userData = user.toJSON();
    delete userData.password;

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: userData
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /refresh-token — Issues a new access token using a valid refresh token
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Account blocked" });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, role: user.role, type: "refresh" },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Refresh token expired. Please login again." });
    }
    res.status(401).json({ message: "Invalid refresh token" });
  }
});


// GET /me — Returns the currently authenticated user's profile
router.get("/me", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /forgot-password — Sends a password reset OTP (doesn't reveal whether the email exists)
router.post("/forgot-password", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists or not
      return res.status(200).json({ success: true, message: "If this email exists, an OTP has been sent" });
    }

    const otp = generateOTP();
    await storeOtp(email, otp, "password_reset");

    await sendEmail({
      to: email,
      subject: "Password Reset OTP - EventHub",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6a11cb;">Password Reset</h2>
          <p>Hello ${user.name || "User"},</p>
          <p>You requested a password reset. Use this OTP to reset your password:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 10px;">
            ${otp}
          </div>
          <p>This OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">EventHub Team</p>
        </div>
      `,
    });

    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Failed to send reset OTP" });
  }
});

// POST /reset-password — Verifies the reset OTP and updates the user's password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters with at least one number and one special character" });
    }

    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasNumber || !hasSpecial) {
      return res.status(400).json({ success: false, message: "Password must contain at least one number and one special character" });
    }

    // Verify OTP from database
    const otpResult = await verifyOtp(email, otp, "password_reset");
    if (!otpResult.valid) {
      return res.status(400).json({ success: false, message: otpResult.message });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.update({ password: hashed }, { where: { email } });

    res.json({ success: true, message: "Password reset successfully. You can now login with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

module.exports = router;
