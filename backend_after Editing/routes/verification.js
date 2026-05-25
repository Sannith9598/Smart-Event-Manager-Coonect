const express = require("express");
const router = express.Router();
const fs = require("fs");
const db = require("../models");
const auth = require("../middleware/auth");
const { cloudinary, uploadVerificationImage, uploadToCloudinary, uploadMediaToCloudinary, uploadMediaFile } = require("../config/cloudinary");


// Task 2.1: Media upload endpoint for verification
router.post("/upload-media", auth, uploadMediaFile, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file uploaded'
      });
    }

    // Determine resource type from mimetype
    const imageTypes = /jpeg|jpg|png|webp/;
    const videoTypes = /mp4|mov|webm|quicktime/;
    const isImage = imageTypes.test(req.file.mimetype);
    const isVideo = videoTypes.test(req.file.mimetype);

    if (!isImage && !isVideo) {
      // Clean up temp file
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Only image (JPEG, PNG, WEBP) and video (MP4, MOV, WEBM) files are allowed'
      });
    }

    // Enforce per-type size limits
    if (isImage && req.file.size > 5 * 1024 * 1024) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(413).json({
        success: false,
        message: 'File too large. Max 5MB for images, 50MB for videos'
      });
    }
    if (isVideo && req.file.size > 50 * 1024 * 1024) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(413).json({
        success: false,
        message: 'File too large. Max 5MB for images, 50MB for videos'
      });
    }

    const resourceType = isImage ? 'image' : 'video';
    // Use file path for disk-stored files, buffer for memory-stored
    const fileData = req.file.path || req.file.buffer;
    const result = await uploadMediaToCloudinary(fileData, 'verification/media', resourceType);

    // Clean up temp file after upload
    if (req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }

    // Generate thumbnail URL
    let thumbnailUrl = result.secure_url;
    if (isImage) {
      thumbnailUrl = result.secure_url.replace('/upload/', '/upload/w_200,c_limit,q_auto/');
    } else if (isVideo && result.eager && result.eager[0]) {
      thumbnailUrl = result.eager[0].secure_url;
    }

    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      mediaType: resourceType,
      thumbnailUrl
    });
  } catch (error) {
    // Clean up temp file on error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: error.message
    });
  }
});


router.post("/submit-verification", auth, async (req, res) => {
  try {
    const userId = req.user.id;
   
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }
    
    if (user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only event managers can submit verification requests'
      });
    }
    
    let eventManager = await db.EventManager.findOne({ where: { userId } });
    
    if (!eventManager) {
      eventManager = await db.EventManager.create({
        userId: userId,
        location: null,
        price: null,
        rating: 0,
        description: null,
        portfolioUrl: null,
        isVerified: false,
        verificationStatus: 'not_submitted'
      });
    }
    
    if (eventManager.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your account is already verified'
      });
    }
    
    const existingVerification = await db.Verification.findOne({ 
      where: { userId, status: 'pending' }
    });
    
    if (existingVerification) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification request'
      });
    }

    // --- Enhanced Validation (Task 2.2) ---
    const { businessName, businessTypes, serviceAreas, yearsOfExperience, pastEvents } = req.body;

    // Validate businessName
    if (!businessName || !businessName.trim()) {
      return res.status(400).json({ success: false, message: 'Business name is required' });
    }

    // Validate businessTypes
    if (!businessTypes || !Array.isArray(businessTypes) || businessTypes.length < 1) {
      return res.status(400).json({ success: false, message: 'At least one business type is required' });
    }

    // Validate serviceAreas: max 20, each non-empty string max 100 chars
    if (!serviceAreas || !Array.isArray(serviceAreas) || serviceAreas.length < 1) {
      return res.status(400).json({ success: false, message: 'At least one service area is required' });
    }
    if (serviceAreas.length > 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 service areas allowed' });
    }
    for (const area of serviceAreas) {
      if (!area || typeof area !== 'string' || !area.trim() || area.trim().length > 100) {
        return res.status(400).json({ success: false, message: 'Each service area must be a non-empty string (max 100 characters)' });
      }
    }

    // Validate yearsOfExperience: numeric, 0.1–50.0, max 1 decimal place
    const expValue = parseFloat(yearsOfExperience);
    if (isNaN(expValue)) {
      return res.status(400).json({ success: false, message: 'A numeric value is required for years of experience' });
    }
    if (expValue < 0.1 || expValue > 50.0) {
      return res.status(400).json({ success: false, message: 'Experience must be between 0.1 and 50.0' });
    }
    const expStr = String(yearsOfExperience);
    const decimalPart = expStr.includes('.') ? expStr.split('.')[1] : '';
    if (decimalPart.length > 1) {
      return res.status(400).json({ success: false, message: 'Only one decimal place is permitted for experience' });
    }

    // Validate past events based on experience
    const events = pastEvents || [];
    if (expValue > 0.1 && events.length < 1) {
      return res.status(400).json({ success: false, message: 'At least one past event is required for experienced managers' });
    }

    // Validate each past event
    for (const event of events) {
      if (!event.title || !event.title.trim()) {
        return res.status(400).json({ success: false, message: 'Each past event must have a title and description' });
      }
      if (!event.description || !event.description.trim()) {
        return res.status(400).json({ success: false, message: 'Each past event must have a title and description' });
      }
      if (event.date) {
        const eventDate = new Date(event.date);
        if (isNaN(eventDate.getTime()) || eventDate >= new Date()) {
          return res.status(400).json({ success: false, message: 'Event date must be in the past' });
        }
      }
    }

    // Validate total media count across all past events >= 1
    const totalMedia = events.reduce((count, event) => {
      return count + (event.media ? event.media.length : 0);
    }, 0);
    if (totalMedia < 1) {
      return res.status(400).json({ success: false, message: 'At least one media file is required across all past events' });
    }

    // --- End Validation ---
    
    const verificationData = {
      userId,
      businessName: req.body.businessName,
      businessTypes: req.body.businessTypes,
      serviceAreas: req.body.serviceAreas,
      yearsOfExperience: expValue,
      description: req.body.description || '',
      portfolioLinks: req.body.portfolioLinks || [],
      images: req.body.images || [],
      pastEvents: events,
      status: 'pending',
      submittedAt: new Date()
    };
    
    const verification = await db.Verification.create(verificationData);
    
    await db.EventManager.update({
      verificationStatus: 'pending',
      businessName: req.body.businessName,
      businessTypes: req.body.businessTypes,
      serviceAreas: req.body.serviceAreas,
      yearsOfExperience: expValue,
      portfolioImages: req.body.images || [],
      pastEvents: events
    }, {
      where: { userId }
    });
    
    res.status(201).json({
      success: true,
      message: 'Verification request submitted successfully',
      data: verification
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit verification request',
      error: error.message
    });
  }
});

router.post("/upload-verification-image", auth, uploadVerificationImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }
    
    const result = await uploadToCloudinary(req.file.buffer, 'verification/images');
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

router.get("/admin/verifications", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const verifications = await db.Verification.findAll({
      include: [
        {
          model: db.User,
          attributes: ["id", "name", "email"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.status(200).json({
      success: true,
      data: verifications
    });

  } catch (error) {
    console.error("🔥 ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/verification-status", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Only managers should check verification status
    if (req.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can check verification status"
      });
    }

    let eventManager = await db.EventManager.findOne({
      where: { userId }
    });

    const verification = await db.Verification.findOne({
      where: { userId }
    });

    if (!eventManager) {
      eventManager = await db.EventManager.create({
        userId,
        isVerified: false,
        verificationStatus: "not_submitted"
      });
    }

    let status = "unverified";
    let rejectionReason = null;

    if (eventManager.isVerified) {
      status = "verified";
    } else if (eventManager.verificationStatus === "pending") {
      status = "pending";
    } else if (eventManager.verificationStatus === "rejected") {
      status = "rejected";

      rejectionReason = verification?.rejectionReason || null;
    }

    res.status(200).json({
      success: true,
      status,
      isVerified: eventManager.isVerified,
      verificationStatus: eventManager.verificationStatus,
      businessName: eventManager.businessName,
      businessTypes: eventManager.businessTypes,
      serviceAreas: eventManager.serviceAreas,
      rejectionReason
    });

  } catch (error) {
    console.error("Get verification status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get verification status",
      error: error.message
    });
  }
});

module.exports = router;