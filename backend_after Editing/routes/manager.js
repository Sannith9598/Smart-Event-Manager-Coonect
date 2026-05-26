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


// POST /upload — Uploads an event image to Cloudinary and returns the URL
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


// POST / — Creates a new EventManager profile (one per manager account)
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


// GET / — Returns all manager profiles with optional location, price, and search filters
router.get("/", async (req, res) => {
  try {
    const { location, price, search } = req.query;

    const where = {};

    if (location) where.location = location;
    if (price) where.price = { [Op.lte]: price };

    // Search by business name, service areas, business types
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      where[Op.or] = [
        { businessName: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
        { location: { [Op.like]: searchTerm } },
      ];
    }

    const managers = await EventManager.findAll({
      where,
      include: [{
        model: db.User,
        attributes: ['id', 'name', 'mobile', 'email'],
        ...(search && search.trim() ? {
          required: false,
        } : {})
      }]
    });

    // If searching, also include results matching User name/mobile
    let results = managers;
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const userMatches = await EventManager.findAll({
        include: [{
          model: db.User,
          attributes: ['id', 'name', 'mobile', 'email'],
          where: {
            [Op.or]: [
              { name: { [Op.like]: searchTerm } },
              { mobile: { [Op.like]: searchTerm } },
            ]
          }
        }]
      });
      // Merge results, avoiding duplicates
      const existingIds = new Set(results.map(m => m.id));
      for (const m of userMatches) {
        if (!existingIds.has(m.id)) {
          results.push(m);
        }
      }
    }

    res.json(results);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Fetch failed" });
  }
});


// GET /search/verified — Searches verified managers by name, business type, location, or phone
router.get("/search/verified", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const searchTerm = `%${q.trim()}%`;

    // Search in EventManager fields
    const managerMatches = await EventManager.findAll({
      where: {
        isVerified: true,
        [Op.or]: [
          { businessName: { [Op.like]: searchTerm } },
          { description: { [Op.like]: searchTerm } },
          { location: { [Op.like]: searchTerm } },
        ]
      },
      include: [{
        model: db.User,
        attributes: ['id', 'name', 'mobile', 'email', 'profilePhoto'],
      }]
    });

    // Search in User fields (name, mobile)
    const userMatches = await EventManager.findAll({
      where: { isVerified: true },
      include: [{
        model: db.User,
        attributes: ['id', 'name', 'mobile', 'email', 'profilePhoto'],
        where: {
          [Op.or]: [
            { name: { [Op.like]: searchTerm } },
            { mobile: { [Op.like]: searchTerm } },
          ]
        }
      }]
    });

    // Merge results avoiding duplicates
    const existingIds = new Set(managerMatches.map(m => m.id));
    const allResults = [...managerMatches];
    for (const m of userMatches) {
      if (!existingIds.has(m.id)) {
        allResults.push(m);
      }
    }

    // Also search by businessTypes (JSON field)
    const allVerified = await EventManager.findAll({
      where: { isVerified: true },
      include: [{
        model: db.User,
        attributes: ['id', 'name', 'mobile', 'email', 'profilePhoto'],
      }]
    });

    for (const m of allVerified) {
      if (existingIds.has(m.id)) continue;
      const types = m.businessTypes || [];
      const areas = m.serviceAreas || [];
      const matchesType = types.some(t => t.toLowerCase().includes(q.trim().toLowerCase()));
      const matchesArea = areas.some(a => a.toLowerCase().includes(q.trim().toLowerCase()));
      if (matchesType || matchesArea) {
        allResults.push(m);
        existingIds.add(m.id);
      }
    }

    // Format response
    const formatted = allResults.map(m => ({
      id: m.id,
      userId: m.userId,
      businessName: m.businessName,
      description: m.description,
      location: m.location,
      rating: m.rating || 0,
      totalReviews: m.totalReviews || 0,
      yearsOfExperience: m.yearsOfExperience || 0,
      businessTypes: m.businessTypes || [],
      serviceAreas: m.serviceAreas || [],
      profilePhoto: m.User ? m.User.profilePhoto : null,
      name: m.User ? m.User.name : null,
      mobile: m.User ? m.User.mobile : null,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Search verified managers error:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});


// GET /cloudinary-usage — Returns Cloudinary storage/bandwidth usage stats (admin only)
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


// GET /:id — Returns a single manager profile by ID
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


// DELETE /delete-image — Deletes a Cloudinary image after verifying the user owns it
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


// GET /public-profile/:managerId — Returns a verified manager's public-facing profile with aggregated reviews
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


// GET /public-profile/:managerId/events — Returns paginated past events for a manager's public profile
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


// POST /upload-media — Uploads images or videos for verified managers (max 5MB images, 50MB videos)
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


// POST /past-events — Adds a new past event to the manager's portfolio
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


// PUT /past-events/:eventIndex — Updates an existing past event in the manager's portfolio
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


// DELETE /past-events/:eventIndex — Removes a past event and cleans up its Cloudinary media
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


// POST /compare — Compares up to 5 managers side-by-side with weighted scoring
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