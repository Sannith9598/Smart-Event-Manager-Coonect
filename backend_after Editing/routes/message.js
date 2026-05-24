const router = require("express").Router();
const db = require("../models");
const auth = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const { sanitizeText } = require("../utils/sanitize");

// Rate limiter for message sending — max 30 per minute
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many messages. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Get messages for a booking
router.get("/booking/:bookingId", auth, async (req, res) => {
  try {
    const booking = await db.Booking.findByPk(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Only customer or manager of this booking can view messages
    if (booking.customerId !== req.user.id && booking.managerId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const messages = await db.Message.findAll({
      where: { bookingId: req.params.bookingId },
      include: [
        { model: db.User, as: "sender", attributes: ["id", "name", "role"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    // Mark unread messages as read
    await db.Message.update(
      { isRead: true },
      {
        where: {
          bookingId: req.params.bookingId,
          receiverId: req.user.id,
          isRead: false,
        },
      }
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ success: false, message: "Failed to get messages" });
  }
});

// Send a message
router.post("/send", auth, messageLimiter, async (req, res) => {
  try {
    const { bookingId, message } = req.body;

    if (!bookingId || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Booking ID and message are required" });
    }

    // Message length limit
    if (message.trim().length > 5000) {
      return res.status(400).json({ success: false, message: "Message is too long (max 5000 characters)" });
    }

    const booking = await db.Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Only allow messaging on active bookings
    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot send messages on cancelled bookings" });
    }

    // Only customer or manager of this booking can send messages
    if (booking.customerId !== req.user.id && booking.managerId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const receiverId = req.user.id === booking.customerId ? booking.managerId : booking.customerId;

    const newMessage = await db.Message.create({
      bookingId,
      senderId: req.user.id,
      receiverId,
      message: sanitizeText(message.trim()),
    });

    // Create notification for receiver
    const sender = await db.User.findByPk(req.user.id);
    await db.Notification.create({
      userId: receiverId,
      title: "New Message",
      message: `${sender.name} sent you a message`,
      type: "message",
      link: `/booking/${bookingId}/chat`,
    });

    // Emit socket event if available
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${receiverId}`).emit("new_message", {
        bookingId,
        message: newMessage,
        senderName: sender.name,
      });
    }

    res.json({ success: true, data: newMessage });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

// Get unread message count
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await db.Message.count({
      where: { receiverId: req.user.id, isRead: false },
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
});

module.exports = router;
