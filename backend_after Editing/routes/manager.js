const router = require("express").Router();
const fs = require("fs");
const db = require("../models");
const { EventManager } = db;
const auth = require("../middleware/auth");
const { Op } = require("sequelize");


const {
  cloudinary,
  uploadEventImage,
  uploadToCloudinary,
  uploadMediaToCloudinary,
  uploadMediaFile
} = require("../config/cloudinary");


router.post("/upload", auth, uploadEventImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "events/images"
    );

    res.json({
      success: true,
      imageUrl: result.secure_url, 
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Image upload failed"
    });
  }
});


router.post("/", auth, async (req, res) => {
  try {
    // Role check - only managers can create EventManager profiles
    const user = await require("../models").User.findByPk(req.user.id);
    if (!user || user.role !== "manager") {
      return res.status(403).json({ message: "Only managers can create profiles" });
    }

    // Duplicate check
    const existing = await EventManager.findOne({ where: { userId: req.user.id } });
    if (existing) {
      return res.status(400).json({ message: "Manager profile already exists" });
    }

    const data = await EventManager.create({
      ...req.body,
      userId: req.user.id,
    });

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Create failed" });
  }
});


router.get("/", async (req, res) => {
  try {
    const { location, price } = req.query;

    const managers = await EventManager.findAll({
      where: {
        ...(location && { location }),
        ...(price && { price: { [Op.lte]: price } }),
      },
    });

    res.json(managers);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Fetch failed" });
  }
});


// Check Cloudinary usage (must be before /:id route) - Admin only
router.get("/cloudinary-usage", auth, async (req, res) => {
  try {
    // Only admins can check Cloudinary usage
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    const result = await cloudinary.api.usage();
    res.json({
      success: true,
      data: {
        plan: result.plan,
        credits: {
          used: result.credits?.used_percent || result.used_percent || 0,
          limit: result.credits?.limit || result.limit || 0,
          usedValue: result.credits?.usage || 0,
        },
        storage: {
          used: result.storage?.used_percent || 0,
          usedBytes: result.storage?.usage || 0,
          limitBytes: result.storage?.limit || 0,
        },
        bandwidth: {
          used: result.bandwidth?.used_percent || 0,
          usedBytes: result.bandwidth?.usage || 0,
          limitBytes: result.bandwidth?.limit || 0,
        },
        transformations: {
          used: result.transformations?.used_percent || 0,
          usageCount: result.transformations?.usage || 0,
          limit: result.transformations?.limit || 0,
        },
        resources: result.resources || 0,
        lastUpdated: result.last_updated || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Cloudinary usage error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Cloudinary usage" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const manager = await EventManager.findByPk(req.params.id);

    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    res.json(manager);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching manager" });
  }
});


// Delete image from Cloudinary — with ownership verification
router.delete("/delete-image", auth, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ success: false, message: "Public ID is required" });
    }

    // Verify the image belongs to the requesting user's manager profile
    const manager = await db.EventManager.findOne({ where: { userId: req.user.id } });
    if (!manager) {
      return res.status(403).json({ success: false, message: "Manager profile not found" });
    }

    // Check if publicId belongs to this manager's portfolio images or past events
    const portfolioImages = manager.portfolioImages || [];
    const pastEvents = manager.pastEvents || [];
    
    const ownsInPortfolio = portfolioImages.some(img => 
      (img.publicId && img.publicId === publicId) || 
      (img.url && img.url.includes(publicId))
    );
    
    const ownsInPastEvents = pastEvents.some(event => 
      (event.media || []).some(m => m.publicId === publicId)
    );

    if (!ownsInPortfolio && !ownsInPastEvents) {
      // Also check if it's in their events
      const userEvents = await db.Event.findAll({ where: { managerId: req.user.id }, attributes: ['image', 'images'] });
      const ownsInEvents = userEvents.some(evt => {
        const allImages = [...(evt.images || [])];
        if (evt.image) allImages.push(evt.image);
        return allImages.some(img => img && img.includes(publicId));
      });

      if (!ownsInEvents) {
        return res.status(403).json({ success: false, message: "You can only delete your own images" });
      }
    }

    const result = await cloudinary.uploader.destroy(publicId);

    res.json({
      success: true,
      message: "Image deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ success: false, message: "Failed to delete image" });
  }
});


// Task 4.1: Public profile endpoint (unauthenticated)
router.get("/public-profile/:managerId", async (req, res) => {
  try {
    const { managerId } = req.params;

    const manager = await db.EventManager.findOne({
      where: { id: managerId, isVerified: true },
      include: [{
        model: db.User,
        attributes: ['id', 'name', 'profilePhoto']
      }]
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or not verified'
      });
    }

    // Aggregate reviews
    const reviews = await db.Review.findAll({
      where: { managerId: manager.id }
    });
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        id: manager.id,
        userId: manager.userId,
        businessName: manager.businessName,
        profilePhoto: manager.User ? manager.User.profilePhoto : null,
        name: manager.User ? manager.User.name : null,
        rating: avgRating,
        totalReviews,
        yearsOfExperience: manager.yearsOfExperience,
        serviceAreas: manager.serviceAreas || [],
        businessTypes: manager.businessTypes || [],
        description: manager.description,
        portfolioUrl: manager.portfolioUrl || null,
        portfolioImages: manager.portfolioImages || [],
        totalPastEvents: (manager.pastEvents || []).length
      }
    });
  } catch (error) {
    console.error("Public profile error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch public profile" });
  }
});


// Task 4.2: Paginated past events for public profile (unauthenticated)
router.get("/public-profile/:managerId/events", async (req, res) => {
  try {
    const { managerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 100);

    const manager = await db.EventManager.findOne({
      where: { id: managerId, isVerified: true }
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or not verified'
      });
    }

    const allEvents = (manager.pastEvents || [])
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA; // descending
      });

    const totalItems = allEvents.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedEvents = allEvents.slice(startIndex, startIndex + limit);

    res.status(200).json({
      success: true,
      data: paginatedEvents,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error("Public profile events error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch past events" });
  }
});


// Task 4.3: Upload media for verified managers
router.post("/upload-media", auth, uploadMediaFile, async (req, res) => {
  try {
    const manager = await db.EventManager.findOne({ where: { userId: req.user.id } });
    if (!manager || !manager.isVerified) {
      if (req.file && req.file.path) { try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ } }
      return res.status(403).json({ success: false, message: "Only verified managers can upload media" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No media file uploaded' });
    }

    const imageTypes = /jpeg|jpg|png|webp/;
    const videoTypes = /mp4|mov|webm|quicktime/;
    const isImage = imageTypes.test(req.file.mimetype);
    const isVideo = videoTypes.test(req.file.mimetype);

    if (isImage && req.file.size > 5 * 1024 * 1024) {
      if (req.file.path) { try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ } }
      return res.status(413).json({ success: false, message: 'File too large. Max 5MB for images, 50MB for videos' });
    }
    if (isVideo && req.file.size > 50 * 1024 * 1024) {
      if (req.file.path) { try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ } }
      return res.status(413).json({ success: false, message: 'File too large. Max 5MB for images, 50MB for videos' });
    }

    const resourceType = isImage ? 'image' : 'video';
    const fileData = req.file.path || req.file.buffer;
    const result = await uploadMediaToCloudinary(fileData, 'manager/media', resourceType);

    // Clean up temp file after upload
    if (req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }

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
    if (req.file && req.file.path) { try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ } }
    console.error('Manager upload media error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload media' });
  }
});


// Task 4.3: Add past event (verified managers only)
router.post("/past-events", auth, async (req, res) => {
  try {
    const manager = await db.EventManager.findOne({ where: { userId: req.user.id } });
    if (!manager || !manager.isVerified) {
      return res.status(403).json({ success: false, message: "Only verified managers can add past events" });
    }

    const { title, description, date, clientName, cost, media } = req.body;

    // Validation
    if (!title || !title.trim() || title.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Title is required (max 100 characters)" });
    }
    if (!description || !description.trim() || description.trim().length > 1000) {
      return res.status(400).json({ success: false, message: "Description is required (max 1000 characters)" });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: "Event date is required" });
    }
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime()) || eventDate >= new Date()) {
      return res.status(400).json({ success: false, message: "Event date must be in the past" });
    }
    if (media && Array.isArray(media) && media.length > 10) {
      return res.status(400).json({ success: false, message: "Maximum 10 media files per past event" });
    }
    if (cost !== undefined && cost !== null) {
      const costVal = parseFloat(cost);
      if (isNaN(costVal) || costVal < 0 || costVal > 999999999.99) {
        return res.status(400).json({ success: false, message: "Cost must be between 0 and 999,999,999.99" });
      }
    }

    const newEvent = {
      title: title.trim(),
      description: description.trim(),
      date,
      clientName: clientName ? clientName.trim().substring(0, 100) : null,
      cost: cost !== undefined && cost !== null ? parseFloat(cost) : null,
      media: media || [],
      source: "manual",
      addedAt: new Date().toISOString()
    };

    const pastEvents = [...(manager.pastEvents || []), newEvent];
    await manager.update({ pastEvents });

    res.status(201).json({
      success: true,
      data: newEvent
    });
  } catch (error) {
    console.error("Add past event error:", error);
    res.status(500).json({ success: false, message: "Failed to add past event" });
  }
});


// Task 4.3: Update past event (verified managers only)
router.put("/past-events/:eventIndex", auth, async (req, res) => {
  try {
    const manager = await db.EventManager.findOne({ where: { userId: req.user.id } });
    if (!manager || !manager.isVerified) {
      return res.status(403).json({ success: false, message: "Only verified managers can edit past events" });
    }

    const eventIndex = parseInt(req.params.eventIndex);
    const pastEvents = [...(manager.pastEvents || [])];

    if (isNaN(eventIndex) || eventIndex < 0 || eventIndex >= pastEvents.length) {
      return res.status(404).json({ success: false, message: "Past event not found" });
    }

    const { title, description, date, clientName, cost, media } = req.body;

    // Validation
    if (!title || !title.trim() || title.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Title is required (max 100 characters)" });
    }
    if (!description || !description.trim() || description.trim().length > 1000) {
      return res.status(400).json({ success: false, message: "Description is required (max 1000 characters)" });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: "Event date is required" });
    }
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime()) || eventDate >= new Date()) {
      return res.status(400).json({ success: false, message: "Event date must be in the past" });
    }
    if (media && Array.isArray(media) && media.length > 10) {
      return res.status(400).json({ success: false, message: "Maximum 10 media files per past event" });
    }

    pastEvents[eventIndex] = {
      ...pastEvents[eventIndex],
      title: title.trim(),
      description: description.trim(),
      date,
      clientName: clientName ? clientName.trim().substring(0, 100) : null,
      cost: cost !== undefined && cost !== null ? parseFloat(cost) : null,
      media: media || pastEvents[eventIndex].media || [],
      addedAt: pastEvents[eventIndex].addedAt || new Date().toISOString()
    };

    await manager.update({ pastEvents });

    res.status(200).json({
      success: true,
      data: pastEvents[eventIndex]
    });
  } catch (error) {
    console.error("Update past event error:", error);
    res.status(500).json({ success: false, message: "Failed to update past event" });
  }
});


// Task 4.3: Delete past event (verified managers only)
// Uses unique event identifier (addedAt timestamp) instead of array index to prevent race conditions
router.delete("/past-events/:eventIndex", auth, async (req, res) => {
  try {
    const manager = await db.EventManager.findOne({ where: { userId: req.user.id } });
    if (!manager || !manager.isVerified) {
      return res.status(403).json({ success: false, message: "Only verified managers can delete past events" });
    }

    const eventIndex = parseInt(req.params.eventIndex);
    const pastEvents = [...(manager.pastEvents || [])];

    // Support both index-based (legacy) and ID-based deletion
    let removedEvent;
    let newPastEvents;
    const eventId = req.query.eventId; // unique identifier (addedAt timestamp)

    if (eventId) {
      // ID-based deletion (preferred - race-condition safe)
      const idx = pastEvents.findIndex(e => e.addedAt === eventId || String(e.addedAt) === eventId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Past event not found" });
      }
      removedEvent = pastEvents[idx];
      newPastEvents = pastEvents.filter((_, i) => i !== idx);
    } else {
      // Legacy index-based deletion (kept for backward compatibility)
      if (isNaN(eventIndex) || eventIndex < 0 || eventIndex >= pastEvents.length) {
        return res.status(404).json({ success: false, message: "Past event not found" });
      }
      removedEvent = pastEvents[eventIndex];
      newPastEvents = pastEvents.filter((_, i) => i !== eventIndex);
    }

    // Optionally delete Cloudinary assets
    if (removedEvent.media && removedEvent.media.length > 0) {
      for (const mediaItem of removedEvent.media) {
        if (mediaItem.publicId) {
          try {
            await cloudinary.uploader.destroy(mediaItem.publicId, {
              resource_type: mediaItem.mediaType === 'video' ? 'video' : 'image'
            });
          } catch (err) {
            console.error("Failed to delete Cloudinary asset:", err.message);
          }
        }
      }
    }

    await manager.update({ pastEvents: newPastEvents });

    res.status(200).json({
      success: true,
      message: "Past event removed"
    });
  } catch (error) {
    console.error("Delete past event error:", error);
    res.status(500).json({ success: false, message: "Failed to delete past event" });
  }
});


// Compare multiple managers (max 5)
router.post("/compare", async (req, res) => {
  try {
    const { managerIds } = req.body;

    if (!managerIds || !Array.isArray(managerIds) || managerIds.length < 2 || managerIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide between 2 and 5 manager IDs to compare"
      });
    }

    const managers = await db.EventManager.findAll({
      where: { id: managerIds, isVerified: true },
      include: [{
        model: db.User,
        attributes: ['id', 'name', 'profilePhoto']
      }]
    });

    if (managers.length < 2) {
      return res.status(404).json({
        success: false,
        message: "Not enough verified managers found for comparison"
      });
    }

    // Aggregate reviews for each manager
    const comparisonData = await Promise.all(managers.map(async (manager) => {
      const reviews = await db.Review.findAll({
        where: { managerId: manager.id }
      });
      const totalReviews = reviews.length;
      const avgRating = totalReviews > 0
        ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 0;

      const totalPastEvents = (manager.pastEvents || []).length;

      return {
        id: manager.id,
        businessName: manager.businessName,
        profilePhoto: manager.User ? manager.User.profilePhoto : null,
        name: manager.User ? manager.User.name : null,
        rating: avgRating,
        totalReviews,
        yearsOfExperience: manager.yearsOfExperience || 0,
        serviceAreas: manager.serviceAreas || [],
        businessTypes: manager.businessTypes || [],
        totalPastEvents,
        price: manager.price || 0,
        description: manager.description
      };
    }));

    // Calculate recommendation scores
    // Weights: rating (35%), experience (25%), past events (20%), reviews count (20%)
    const maxRating = Math.max(...comparisonData.map(m => m.rating), 1);
    const maxExperience = Math.max(...comparisonData.map(m => m.yearsOfExperience), 1);
    const maxEvents = Math.max(...comparisonData.map(m => m.totalPastEvents), 1);
    const maxReviews = Math.max(...comparisonData.map(m => m.totalReviews), 1);

    const scoredManagers = comparisonData.map(manager => {
      const ratingScore = (manager.rating / maxRating) * 35;
      const experienceScore = (manager.yearsOfExperience / maxExperience) * 25;
      const eventsScore = (manager.totalPastEvents / maxEvents) * 20;
      const reviewsScore = (manager.totalReviews / maxReviews) * 20;
      const totalScore = parseFloat((ratingScore + experienceScore + eventsScore + reviewsScore).toFixed(1));

      return {
        ...manager,
        score: totalScore,
        breakdown: {
          rating: parseFloat(ratingScore.toFixed(1)),
          experience: parseFloat(experienceScore.toFixed(1)),
          pastEvents: parseFloat(eventsScore.toFixed(1)),
          reviews: parseFloat(reviewsScore.toFixed(1))
        }
      };
    });

    // Sort by score descending
    scoredManagers.sort((a, b) => b.score - a.score);

    res.status(200).json({
      success: true,
      data: scoredManagers,
      recommended: scoredManagers[0]
    });
  } catch (error) {
    console.error("Compare managers error:", error);
    res.status(500).json({ success: false, message: "Failed to compare managers" });
  }
});


module.exports = router;