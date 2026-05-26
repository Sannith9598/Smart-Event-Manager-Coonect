// routes/review.js
const router = require("express").Router();
const { Review, EventManager, User, Booking, Event } = require("../models");
const auth = require("../middleware/auth");
const { sanitizeText } = require("../utils/sanitize");

// POST / — Creates a new manager review (only allowed after completing a booking with them)
router.post("/", auth, async (req, res) => {
  try {
    const { managerId, rating, comment } = req.body;

    if (!managerId || !rating) {
      return res.status(400).json({ success: false, message: "Manager ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Find the EventManager profile to get the userId
    const managerProfile = await EventManager.findByPk(managerId);
    if (!managerProfile) {
      return res.status(404).json({ success: false, message: "Manager profile not found" });
    }

    // Check if user has a completed booking with this manager (using userId from EventManager)
    const completedBooking = await Booking.findOne({
      where: {
        customerId: req.user.id,
        managerId: managerProfile.userId,
        status: "completed",
      },
    });

    if (!completedBooking) {
      return res.status(403).json({
        success: false,
        message: "You can only review a manager after completing an event with them",
      });
    }

    const existing = await Review.findOne({
      where: {
        userId: req.user.id,
        managerId,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this manager",
      });
    }

    const review = await Review.create({
      userId: req.user.id,
      managerId,
      rating,
      comment: comment ? sanitizeText(comment) : null,
    });

    const reviews = await Review.findAll({
      where: { managerId },
    });

    const avg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await EventManager.update(
      { rating: avg, totalReviews: reviews.length },
      { where: { id: managerId } }
    );

    res.json({ success: true, data: review });
  } catch (error) {
    console.error("Review creation error:", error);
    res.status(500).json({ success: false, message: "Failed to create review" });
  }
});

// GET /:managerId — Fetches all reviews for a specific manager profile
router.get("/:managerId", async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { managerId: req.params.managerId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(reviews);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

// PUT /:reviewId/respond — Lets a manager post a one-time response to a review on their profile
router.put("/:reviewId/respond", auth, async (req, res) => {
  try {
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ success: false, message: "Response text is required" });
    }

    const review = await Review.findByPk(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Verify the current user is the manager being reviewed
    const managerProfile = await EventManager.findOne({
      where: { id: review.managerId, userId: req.user.id }
    });

    if (!managerProfile) {
      return res.status(403).json({ success: false, message: "You can only respond to reviews on your profile" });
    }

    if (review.managerResponse) {
      return res.status(400).json({ success: false, message: "You have already responded to this review" });
    }

    await review.update({
      managerResponse: sanitizeText(response.trim()),
      managerRespondedAt: new Date(),
    });

    res.json({ success: true, message: "Response added successfully", data: review });
  } catch (error) {
    console.error("Review response error:", error);
    res.status(500).json({ success: false, message: "Failed to add response" });
  }
});

// ===== EVENT REVIEWS =====

// POST /event — Creates a new event review tied to a completed booking
router.post("/event", auth, async (req, res) => {
  try {
    const { eventId, bookingId, rating, comment } = req.body;

    if (!eventId || !rating) {
      return res.status(400).json({ success: false, message: "Event ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Verify the event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Check if user has a completed booking for this event
    const completedBooking = await Booking.findOne({
      where: {
        customerId: req.user.id,
        eventId: eventId,
        status: "completed",
        ...(bookingId ? { id: bookingId } : {}),
      },
    });

    if (!completedBooking) {
      return res.status(403).json({
        success: false,
        message: "You can only review an event after completing a booking for it",
      });
    }

    // Check if user already reviewed this event for this booking
    const existing = await Review.findOne({
      where: {
        userId: req.user.id,
        eventId,
        bookingId: completedBooking.id,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this event for this booking",
      });
    }

    const review = await Review.create({
      userId: req.user.id,
      eventId,
      bookingId: completedBooking.id,
      managerId: null,
      rating,
      comment: comment ? sanitizeText(comment) : null,
    });

    // Update event's average rating
    const eventReviews = await Review.findAll({
      where: { eventId },
    });

    const avg = eventReviews.reduce((sum, r) => sum + r.rating, 0) / eventReviews.length;

    await Event.update(
      { rating: parseFloat(avg.toFixed(1)), totalReviews: eventReviews.length },
      { where: { id: eventId } }
    );

    res.json({ success: true, data: review });
  } catch (error) {
    console.error("Event review creation error:", error);
    res.status(500).json({ success: false, message: "Failed to create event review" });
  }
});

// GET /event/:eventId — Fetches all reviews for a specific event
router.get("/event/:eventId", async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { eventId: req.params.eventId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(reviews);
  } catch (error) {
    console.error("Fetch event reviews error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch event reviews" });
  }
});

module.exports = router;