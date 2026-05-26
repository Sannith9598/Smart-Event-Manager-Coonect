// routes/favorites.js - Wishlist/Favorites feature (#3)
const router = require("express").Router();
const db = require("../models");
const auth = require("../middleware/auth");

// GET / — Returns all favorited events for the logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const favorites = await db.Favorite.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: db.Event,
          as: "event",
          include: [
            { model: db.User, as: "manager", attributes: ["id", "name", "email"] }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ success: false, message: "Failed to get favorites" });
  }
});

// POST /:eventId — Adds an event to the user's favorites list
router.post("/:eventId", auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await db.Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Check if already favorited
    const existing = await db.Favorite.findOne({
      where: { userId: req.user.id, eventId },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Event already in favorites" });
    }

    const favorite = await db.Favorite.create({
      userId: req.user.id,
      eventId: parseInt(eventId),
    });

    res.json({ success: true, message: "Added to favorites", data: favorite });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ success: false, message: "Failed to add favorite" });
  }
});

// DELETE /:eventId — Removes an event from the user's favorites list
router.delete("/:eventId", auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const deleted = await db.Favorite.destroy({
      where: { userId: req.user.id, eventId },
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Favorite not found" });
    }

    res.json({ success: true, message: "Removed from favorites" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ success: false, message: "Failed to remove favorite" });
  }
});

// GET /check/:eventId — Quick check if a specific event is in the user's favorites
router.get("/check/:eventId", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const favorite = await db.Favorite.findOne({
      where: { userId: req.user.id, eventId },
    });

    res.json({ success: true, isFavorited: !!favorite });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to check favorite" });
  }
});

module.exports = router;
