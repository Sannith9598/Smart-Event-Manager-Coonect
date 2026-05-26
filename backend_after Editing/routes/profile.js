const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../models");
const auth = require("../middleware/auth");
const { uploadToCloudinary, cloudinary } = require("../config/cloudinary");
const multer = require("multer");

// Helper to extract the Cloudinary public ID from a URL and delete the asset
const deleteCloudinaryImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return;
  try {
    const parts = imageUrl.split("/upload/");
    if (parts[1]) {
      let publicId = parts[1];
      publicId = publicId.replace(/^v\d+\//, "");
      publicId = publicId.replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error("Failed to delete Cloudinary image:", err.message);
  }
};

// Multer config for profile photo
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype) && allowed.test(file.originalname.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// GET / — Returns the logged-in user's profile (includes manager profile if applicable)
router.get("/", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userData = user.toJSON();

    // If manager, include manager profile data
    if (user.role === "manager") {
      const managerProfile = await db.EventManager.findOne({
        where: { userId: user.id },
      });
      userData.managerProfile = managerProfile;
    }

    res.json({ success: true, data: userData });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Failed to get profile" });
  }
});

// PUT /update — Updates the user's name and/or mobile number
router.put("/update", auth, async (req, res) => {
  try {
    const { name, mobile } = req.body;
    const user = await db.User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if mobile is already taken by another user
    if (mobile && mobile !== user.mobile) {
      const existingMobile = await db.User.findOne({
        where: { mobile, id: { [db.Sequelize.Op.ne]: req.user.id } },
      });
      if (existingMobile) {
        return res.status(400).json({ success: false, message: "Mobile number already in use" });
      }
    }

    await user.update({
      name: name || user.name,
      mobile: mobile || user.mobile,
    });

    const updatedUser = user.toJSON();
    res.json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

// PUT /change-password — Changes the user's password after verifying the current one
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters with a number and special character" });
    }

    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasNumber || !hasSpecial) {
      return res.status(400).json({ success: false, message: "Password must contain at least one number and one special character" });
    }

    const user = await db.User.unscoped().findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "Failed to change password" });
  }
});

// PUT /manager-profile — Updates the manager's business details (location, description, service areas)
router.put("/manager-profile", auth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Only managers can update business profile" });
    }

    const { location, description, serviceAreas, businessTypes } = req.body;

    const managerProfile = await db.EventManager.findOne({
      where: { userId: req.user.id },
    });

    if (!managerProfile) {
      return res.status(404).json({ success: false, message: "Manager profile not found" });
    }

    await managerProfile.update({
      location: location !== undefined ? location : managerProfile.location,
      description: description !== undefined ? description : managerProfile.description,
      serviceAreas: serviceAreas !== undefined ? serviceAreas : managerProfile.serviceAreas,
      businessTypes: businessTypes !== undefined ? businessTypes : managerProfile.businessTypes,
    });

    res.json({ success: true, message: "Business profile updated", data: managerProfile });
  } catch (error) {
    console.error("Update manager profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update business profile" });
  }
});

// PUT /photo — Uploads a new profile photo to Cloudinary (replaces the old one)
router.put("/photo", auth, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Delete old photo from Cloudinary before uploading new one
    if (user.profilePhoto) {
      await deleteCloudinaryImage(user.profilePhoto);
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, "profile_photos");

    await user.update({ profilePhoto: result.secure_url });

    res.json({
      success: true,
      message: "Profile photo updated successfully",
      data: { profilePhoto: result.secure_url },
    });
  } catch (error) {
    console.error("Upload profile photo error:", error);
    res.status(500).json({ success: false, message: "Failed to upload profile photo" });
  }
});

// DELETE /photo — Removes the user's profile photo from Cloudinary and the database
router.delete("/photo", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Delete from Cloudinary before removing reference
    if (user.profilePhoto) {
      await deleteCloudinaryImage(user.profilePhoto);
    }

    await user.update({ profilePhoto: null });

    res.json({ success: true, message: "Profile photo removed" });
  } catch (error) {
    console.error("Remove profile photo error:", error);
    res.status(500).json({ success: false, message: "Failed to remove profile photo" });
  }
});

// GET /client/:clientId — Returns a client's profile visible to managers who have a booking with them
router.get("/client/:clientId", auth, async (req, res) => {
  try {
    // Only managers can view client profiles
    if (req.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { clientId } = req.params;
    const managerId = req.user.id;

    // Verify booking relationship exists
    const qualifyingBooking = await db.Booking.findOne({
      where: {
        managerId,
        customerId: clientId,
        status: { [db.Sequelize.Op.in]: ['pending', 'confirmed', 'completed', 'cancelled'] }
      }
    });

    if (!qualifyingBooking) {
      return res.status(403).json({
        success: false,
        message: "No qualifying booking relationship with this client"
      });
    }

    // Get client user data
    const client = await db.User.findByPk(clientId, {
      attributes: ['id', 'name', 'profilePhoto', 'createdAt']
    });

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    // Get all bookings for this client
    const allBookings = await db.Booking.findAll({
      where: { customerId: clientId }
    });

    const totalBookings = allBookings.length;
    const completedBookings = allBookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;
    const isNewCustomer = completedBookings === 0 && cancelledBookings === 0;

    // Get average rating given by this client
    const clientReviews = await db.Review.findAll({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']]
    });

    const averageRatingGiven = clientReviews.length > 0
      ? parseFloat((clientReviews.reduce((sum, r) => sum + r.rating, 0) / clientReviews.length).toFixed(1))
      : null;

    // Get recent reviews (max 20, newest first, manager names anonymized)
    const recentReviews = clientReviews.slice(0, 20).map(review => ({
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      managerName: "Anonymous"
    }));

    res.status(200).json({
      success: true,
      data: {
        name: client.name,
        profilePhoto: client.profilePhoto || null,
        totalBookings,
        completedBookings,
        cancelledBookings,
        accountCreatedAt: client.createdAt,
        averageRatingGiven,
        isNewCustomer,
        recentReviews
      }
    });
  } catch (error) {
    console.error("Client profile error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch client profile" });
  }
});

module.exports = router;