const router = require("express").Router();
const db = require("../models");
const auth = require("../middleware/auth");

// Get all notifications for current user
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows: notifications } = await db.Notification.findAndCountAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: "Failed to get notifications" });
  }
});

// Get unread count
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await db.Notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get count" });
  }
});

// Mark single notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    await db.Notification.update(
      { isRead: true },
      { where: { id: req.params.id, userId: req.user.id } }
    );
    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update" });
  }
});

// Mark all as read
router.put("/mark-all-read", auth, async (req, res) => {
  try {
    await db.Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    res.json({ success: true, message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update" });
  }
});

// Delete a notification
router.delete("/:id", auth, async (req, res) => {
  try {
    await db.Notification.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete" });
  }
});

module.exports = router;
