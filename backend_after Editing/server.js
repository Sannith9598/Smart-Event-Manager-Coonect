require("dotenv").config();

// ==================== ENV VALIDATION ====================
const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "CLOUD_NAME",
  "API_KEY",
  "API_SECRET",
];

// Database: require either DATABASE_URL or individual DB vars
const hasDbUrl = !!process.env.DATABASE_URL;
const hasDbVars = process.env.DB_NAME && process.env.DB_USER !== undefined;
if (!hasDbUrl && !hasDbVars) {
  REQUIRED_ENV_VARS.push("DATABASE_URL"); // will trigger the missing var error below
}

const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Please set them in your .env file or environment.");
  process.exit(1);
}
// ==========================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");
const db = require("./models");

const app = express();
const server = http.createServer(app);

// Security: Helmet for secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
}));

// Trust proxy - needed for correct req.ip behind Render/load balancers
app.set("trust proxy", 1);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Render free tier: prefer polling first, then upgrade to WebSocket
  transports: ["polling", "websocket"],
});

// Socket.io authentication middleware
const jwt = require("jsonwebtoken");
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    return next(new Error("Invalid token"));
  }
});

// Make io accessible in routes
app.set("io", io);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "userId:", socket.userId);

  // Auto-join user's personal room based on authenticated userId
  socket.join(`user_${socket.userId}`);
  console.log(`User ${socket.userId} joined room user_${socket.userId}`);

  // Legacy support: still allow explicit join (but only for own room)
  socket.on("join", (userId) => {
    if (String(userId) === String(socket.userId)) {
      socket.join(`user_${userId}`);
    }
  });

  // User joins a booking chat room — with authorization check
  socket.on("join_booking", async (bookingId) => {
    try {
      const booking = await db.Booking.findByPk(bookingId, { attributes: ["id", "customerId", "managerId"] });
      if (booking && (booking.customerId === socket.userId || booking.managerId === socket.userId)) {
        socket.join(`booking_${bookingId}`);
      } else {
        socket.emit("error", { message: "Unauthorized to join this booking chat" });
      }
    } catch (err) {
      console.error("join_booking auth error:", err.message);
    }
  });

  // Handle real-time chat messages
  socket.on("send_message", (data) => {
    // Broadcast to the booking room EXCEPT the sender
    socket.to(`booking_${data.bookingId}`).emit("receive_message", data);
  });

  // Handle typing indicator
  socket.on("typing", (data) => {
    socket.to(`booking_${data.bookingId}`).emit("user_typing", data);
  });

  // Leave booking chat room
  socket.on("leave_booking", (bookingId) => {
    socket.leave(`booking_${bookingId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Request ID for tracing
app.use(require("./middleware/requestId"));

// Security: Request body size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes - API v1 (#11 - API Versioning)
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/event", require("./routes/event"));
app.use("/api/v1/chatbot", require("./routes/chatbot"));
app.use("/api/v1/manager", require("./routes/manager"));
app.use("/api/v1/booking", require("./routes/booking"));
app.use("/api/v1/review", require("./routes/review"));
app.use("/api/v1/verification", require("./routes/verification"));
app.use("/api/v1/admin", require("./routes/admin"));
app.use("/api/v1/profile", require("./routes/profile"));
app.use("/api/v1/messages", require("./routes/message"));
app.use("/api/v1/notifications", require("./routes/notification"));
app.use("/api/v1/favorites", require("./routes/favorites"));

// Backward compatibility - keep old /api/ routes working
app.use("/api/auth", require("./routes/auth"));
app.use("/api/event", require("./routes/event"));
app.use("/api/chatbot", require("./routes/chatbot"));
app.use("/api/manager", require("./routes/manager"));
app.use("/api/booking", require("./routes/booking"));
app.use("/api/review", require("./routes/review"));
app.use("/api/verification", require("./routes/verification"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/messages", require("./routes/message"));
app.use("/api/notifications", require("./routes/notification"));
app.use("/api/favorites", require("./routes/favorites"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

// Database sync strategy:
// - Production: only authenticate (use migrations for schema changes)
// - Development: sync without alter to avoid duplicate index issues
// ─── Auto-seed admin on startup if not exists ────────────────────────────────
const ensureAdminExists = async () => {
  try {
    const bcrypt = require("bcryptjs");
    const adminEmail = "sannithsanni2005@gmail.com";
    const existing = await db.User.unscoped().findOne({ where: { email: adminEmail } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash("Sannith@123", 10);
      await db.User.create({
        name: "Admin",
        email: adminEmail,
        mobile: "0000000000",
        password: hashedPassword,
        role: "admin",
        isVerified: true,
        status: "active",
      });
      console.log("👤 Admin user auto-seeded on startup");
    }
  } catch (err) {
    console.error("Admin seed check error (non-fatal):", err.message);
  }
};

const startServer = async () => {
  if (process.env.NODE_ENV === "production") {
    await db.sequelize.authenticate();
    console.log("Database connected (production - no sync)");
  } else {
    await db.sequelize.sync({});
    console.log("Database synced (development)");
  }

  // Ensure admin exists after DB is ready
  await ensureAdminExists();

  server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
};

startServer()
  .then(() => {

    // Booking Reminders Cron Job (#14) - Runs every day at 9 AM IST
    cron.schedule("0 9 * * *", async () => {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        const upcomingBookings = await db.Booking.findAll({
          where: {
            eventDate: tomorrowStr,
            status: "confirmed",
          },
          include: [
            { model: db.Event, as: "event" },
            { model: db.User, as: "customer" },
            { model: db.User, as: "manager" },
          ],
        });

        for (const booking of upcomingBookings) {
          // Notify customer
          if (booking.customer) {
            await db.Notification.create({
              userId: booking.customerId,
              title: "Event Tomorrow! 📅",
              message: `Reminder: Your event "${booking.event?.name || 'booking'}" is scheduled for tomorrow.`,
              type: "booking_reminder",
              link: "/customer/bookings",
            });

            io.to(`user_${booking.customerId}`).emit("notification", {
              title: "Event Tomorrow! 📅",
              message: `Reminder: Your event "${booking.event?.name || 'booking'}" is scheduled for tomorrow.`,
              type: "booking_reminder",
            });
          }

          // Notify manager
          if (booking.manager) {
            await db.Notification.create({
              userId: booking.managerId,
              title: "Event Tomorrow! 📅",
              message: `Reminder: You have "${booking.event?.name || 'an event'}" scheduled for tomorrow with ${booking.customer?.name || 'a customer'}.`,
              type: "booking_reminder",
              link: "/manager-dashboard",
            });

            io.to(`user_${booking.managerId}`).emit("notification", {
              title: "Event Tomorrow! 📅",
              message: `Reminder: Event tomorrow with ${booking.customer?.name || 'a customer'}.`,
              type: "booking_reminder",
            });
          }
        }

        if (upcomingBookings.length > 0) {
          console.log(`📅 Sent ${upcomingBookings.length} booking reminders`);
        }
      } catch (err) {
        console.error("Cron job error (booking reminders):", err);
      }
    }, { timezone: "Asia/Kolkata" });

    console.log("📅 Booking reminder cron job scheduled (daily at 9 AM IST)");

    // Cleanup Cron Job - Runs daily at 2 AM IST
    // Removes expired OTPs, old notifications, and expired login attempts
    cron.schedule("0 2 * * *", async () => {
      try {
        const now = new Date();

        // Delete expired OTPs
        const deletedOtps = await db.Otp.destroy({
          where: { expiresAt: { [db.Sequelize.Op.lt]: now } }
        });

        // Delete used OTPs older than 1 day
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const deletedUsedOtps = await db.Otp.destroy({
          where: { used: true, createdAt: { [db.Sequelize.Op.lt]: oneDayAgo } }
        });

        // Delete expired login attempts (lockout expired)
        const deletedAttempts = await db.LoginAttempt.destroy({
          where: {
            lockedUntil: { [db.Sequelize.Op.lt]: now, [db.Sequelize.Op.ne]: null }
          }
        });

        // Delete read notifications older than 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const deletedNotifs = await db.Notification.destroy({
          where: {
            isRead: true,
            createdAt: { [db.Sequelize.Op.lt]: ninetyDaysAgo }
          }
        });

        // Delete audit logs older than 1 year
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const deletedLogs = await db.AuditLog.destroy({
          where: { createdAt: { [db.Sequelize.Op.lt]: oneYearAgo } }
        });

        const totalCleaned = deletedOtps + deletedUsedOtps + deletedAttempts + deletedNotifs + deletedLogs;
        if (totalCleaned > 0) {
          console.log(`🧹 Cleanup: ${deletedOtps + deletedUsedOtps} OTPs, ${deletedAttempts} login attempts, ${deletedNotifs} notifications, ${deletedLogs} audit logs`);
        }
      } catch (err) {
        console.error("Cron job error (cleanup):", err);
      }
    }, { timezone: "Asia/Kolkata" });

    console.log("🧹 Cleanup cron job scheduled (daily at 2 AM IST)");

    // Cloudinary orphan cleanup - Runs every Sunday at 3 AM IST
    // Logs orphan detection (manual review recommended before bulk delete)
    cron.schedule("0 3 * * 0", async () => {
      try {
        const { cloudinary } = require("./config/cloudinary");
        
        // Collect all image URLs stored in the database
        const [allEvents, allUsers, allManagers] = await Promise.all([
          db.Event.findAll({ attributes: ["image", "images"] }),
          db.User.findAll({ attributes: ["profilePhoto"] }),
          db.EventManager.findAll({ attributes: ["portfolioImages", "pastEvents"] }),
        ]);

        const dbUrls = new Set();
        allEvents.forEach(event => {
          if (event.image) dbUrls.add(event.image);
          (event.images || []).forEach(img => { if (img) dbUrls.add(img); });
        });
        allUsers.forEach(user => {
          if (user.profilePhoto) dbUrls.add(user.profilePhoto);
        });
        allManagers.forEach(manager => {
          (manager.portfolioImages || []).forEach(img => { if (img) dbUrls.add(img); });
          (manager.pastEvents || []).forEach(pe => {
            if (pe.imageUrl) dbUrls.add(pe.imageUrl);
            (pe.media || []).forEach(m => { if (m.url) dbUrls.add(m.url); });
          });
        });

        // Check all Cloudinary folders used by the app
        const folders = ["events/", "profile_photos/", "verification/", "manager/"];
        let totalOrphans = 0;

        for (const prefix of folders) {
          try {
            const result = await cloudinary.api.resources({
              type: "upload",
              prefix,
              max_results: 500,
            });

            const orphanResources = (result.resources || []).filter(r => !dbUrls.has(r.secure_url));
            totalOrphans += orphanResources.length;

            // Auto-delete orphans older than 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            for (const resource of orphanResources) {
              const createdAt = new Date(resource.created_at);
              if (createdAt < sevenDaysAgo) {
                try {
                  await cloudinary.uploader.destroy(resource.public_id);
                } catch (e) { /* ignore individual failures */ }
              }
            }
          } catch (folderErr) {
            // Folder may not exist yet, skip
          }
        }

        if (totalOrphans > 0) {
          console.log(`☁️ Cloudinary orphan check: ${totalOrphans} potentially orphaned files across all folders`);
        }
      } catch (err) {
        console.error("Cron job error (cloudinary orphan cleanup):", err.message);
      }
    }, { timezone: "Asia/Kolkata" });

    console.log("☁️ Cloudinary orphan cleanup scheduled (weekly Sunday 3 AM IST)");
  })
  .catch(err => {
    console.error("DB Error ❌", err);
    process.exit(1);
  });

// Graceful shutdown for production (Render sends SIGTERM)
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    db.sequelize.close().then(() => {
      console.log("Database connection closed.");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down...");
  server.close(() => {
    db.sequelize.close().then(() => process.exit(0));
  });
});
