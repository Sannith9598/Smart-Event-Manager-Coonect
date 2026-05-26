const express = require("express");
const router = express.Router();
const db = require("../models");
const auth = require("../middleware/auth");

const { Verification, User, EventManager, AuditLog, Notification } = db;

// Helper to log admin actions for the audit trail
const logAdminAction = async (adminId, action, targetType, targetId, details = {}, ip = null) => {
  try {
    await AuditLog.create({ adminId, action, targetType, targetId, details, ipAddress: ip });
  } catch (err) {
    console.error("Audit log error:", err);
  }
};

// Helper to create an in-app notification for a user
const createNotification = async (userId, title, message, type, link = null) => {
  try {
    await Notification.create({ userId, title, message, type, link });
  } catch (err) {
    console.error("Notification error:", err);
  }
};

// Middleware to verify the user has admin role before proceeding
const checkAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ 
      success: false, 
      message: "Access denied. Admin only." 
    });
  }
  next();
};

// GET /verified — Public endpoint that returns all verified managers for homepage display
router.get("/verified", async (req, res) => {
  // Public endpoint - intentionally unauthenticated for homepage display
  try {
    const managers = await EventManager.findAll({
      where: { isVerified: true }, 
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "profilePhoto"]
        }
      ],
      order: [["updatedAt", "DESC"]]
    });

    const formatted = managers.map((m) => ({
      id: m.id,
      businessName: m.businessName,
      businessTypes: m.businessTypes,
      serviceAreas: m.serviceAreas,
      location: m.location,
      yearsOfExperience: m.yearsOfExperience,
      rating: m.rating,
      startingPrice: m.price,
      images: m.portfolioImages,
      verified: m.isVerified,
      name: m.User?.name,
      profilePhoto: m.User?.profilePhoto,
      pastEvents: m.pastEvents,
    }));

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error("Error fetching verified managers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch verified managers"
    });
  }
});


// GET /verifications — Returns paginated list of all verification requests with optional status filter
router.get("/verifications", auth, checkAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: verifications } = await Verification.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],  
          required: false  
        }
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    const formattedVerifications = await Promise.all(verifications.map(async (v) => {
      const verification = v.toJSON();
      const eventManager = await EventManager.findOne({
        where: { userId: verification.userId },
        attributes: ['location', 'price', 'rating', 'isVerified', 'businessName', 'yearsOfExperience']
      });
      
      return {
        ...verification,
        eventManager: eventManager,
        managerName: verification.User?.name || 'Unknown'
      };
    }));
    
    res.status(200).json({
      success: true,
      data: formattedVerifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification requests',
      error: error.message
    });
  }
});

// GET /verifications/pending — Returns only pending verification requests for quick admin review
router.get("/verifications/pending", auth, checkAdmin, async (req, res) => {
  try {
    const verifications = await Verification.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['submittedAt', 'DESC']]
    });
    
    const formattedVerifications = verifications.map(v => ({
      id: v.id,
      businessName: v.businessName,
      yearsOfExperience: v.yearsOfExperience,
      businessTypes: v.businessTypes,
      serviceAreas:v.serviceAreas,
      description: v.description,
      images: v.images,
      pastEvents: v.pastEvents,
      status: v.status,
      submittedAt: v.submittedAt,
      userId: v.userId,
      managerName: v.User?.name || 'Unknown',
      managerEmail: v.User?.email || 'Unknown'
    }));
    
    res.status(200).json({
      success: true,
      data: formattedVerifications
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending verifications',
      error: error.message
    });
  }
});

// GET /verifications/:id — Returns full details of a single verification request
router.get("/verifications/:id", auth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const verification = await Verification.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }
    
    const eventManager = await EventManager.findOne({
      where: { userId: verification.userId }
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...verification.toJSON(),
        eventManager: eventManager,
        managerName: verification.User?.name
      }
    });
  } catch (error) {
    console.error('Get verification details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification details',
      error: error.message
    });
  }
});

// PUT /verifications/:id/approve — Approves a verification and marks the manager as verified (transactional)
router.put("/verifications/:id/approve", auth, checkAdmin, async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const verification = await Verification.findByPk(id, { transaction: t });
    
    if (!verification) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }
    
    await verification.update({
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: new Date()
    }, { transaction: t });

    // Mark pastEvents with source: "verification" for badge display
    const pastEventsWithSource = (verification.pastEvents || []).map(event => ({
      ...event,
      source: "verification",
      addedAt: new Date().toISOString()
    }));
    
    await EventManager.update({
      isVerified: true,
      verificationStatus: 'approved',
      verifiedAt: new Date(),
      businessName: verification.businessName,
      businessTypes: verification.businessTypes,
      serviceAreas: verification.serviceAreas,
      yearsOfExperience: verification.yearsOfExperience,
      portfolioImages: verification.images,
      pastEvents: pastEventsWithSource,
      description: verification.description
    }, {
      where: { userId: verification.userId },
      transaction: t
    });

    await t.commit();
    
    // Log admin action (outside transaction — non-critical)
    await logAdminAction(adminId, "approve_verification", "verification", id, { businessName: verification.businessName }, req.ip);

    // Notify the manager
    await createNotification(
      verification.userId,
      "Verification Approved! 🎉",
      "Congratulations! Your manager verification has been approved. You can now add events.",
      "verification_approved",
      "/manager-dashboard"
    );

    // Emit socket notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${verification.userId}`).emit("notification", {
        title: "Verification Approved! 🎉",
        message: "You can now add events.",
        type: "verification_approved",
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification request approved successfully',
      data: verification
    });
  } catch (error) {
    await t.rollback();
    console.error('Approve verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Approval failed, transaction rolled back',
      error: error.message
    });
  }
});

// PUT /verifications/:id/reject — Rejects a verification request with a required reason
router.put("/verifications/:id/reject", auth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const verification = await Verification.findByPk(id);
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }
    
    await verification.update({
      status: 'rejected',
      rejectionReason: rejectionReason,
      reviewedBy: adminId,
      reviewedAt: new Date()
    });
    
    await EventManager.update({
      verificationStatus: 'rejected',
      verificationRejectionReason: rejectionReason,
      isVerified: false
    }, {
      where: { userId: verification.userId }
    });
    
    // Log admin action
    await logAdminAction(adminId, "reject_verification", "verification", id, { rejectionReason }, req.ip);

    // Notify the manager
    await createNotification(
      verification.userId,
      "Verification Rejected",
      `Your verification was rejected. Reason: ${rejectionReason}`,
      "verification_rejected",
      "/manager-dashboard"
    );

    // Emit socket notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${verification.userId}`).emit("notification", {
        title: "Verification Rejected",
        message: rejectionReason,
        type: "verification_rejected",
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification request rejected',
      data: verification
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject verification',
      error: error.message
    });
  }
});

// GET /statistics — Returns platform-wide verification and manager stats for the admin dashboard
router.get("/statistics", auth, checkAdmin, async (req, res) => {
  try {
    const totalVerifications = await Verification.count();
    const pendingVerifications = await Verification.count({ where: { status: 'pending' } });
    const approvedVerifications = await Verification.count({ where: { status: 'approved' } });
    const rejectedVerifications = await Verification.count({ where: { status: 'rejected' } });
    const verifiedManagers = await EventManager.count({ where: { isVerified: true } });
    
    res.status(200).json({
      success: true,
      data: {
        totalVerifications,
        pendingVerifications,
        approvedVerifications,
        rejectedVerifications,
        verifiedManagers
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
});

// ==================== CUSTOMER MANAGEMENT ROUTES ====================

// GET /customers — Returns paginated list of all customers with booking stats
router.get("/customers", auth, checkAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    const where = { role: "customer" };
    if (search && search.trim()) {
      where[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.like]: `%${search}%` } },
        { email: { [db.Sequelize.Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: customers } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.Booking,
          as: "customerBookings",
          attributes: ["id", "totalPrice", "status"],
          required: false,
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Compute stats from included bookings (avoids N+1)
    const customersWithStats = customers.map((customer) => {
      const bookings = customer.customerBookings || [];
      const totalSpent = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const completedBookings = bookings.filter(b => b.status === "completed").length;
      
      const customerJson = customer.toJSON();
      delete customerJson.customerBookings;
      
      return {
        ...customerJson,
        bookingsCount: bookings.length,
        completedBookingsCount: completedBookings,
        totalSpent
      };
    });

    res.json({
      success: true,
      data: customersWithStats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message
    });
  }
});

// GET /customers/stats — Returns aggregate customer and booking counts for the admin dashboard
router.get("/customers/stats", auth, checkAdmin, async (req, res) => {
  try {
    const totalCustomers = await db.User.count({ where: { role: "customer" } });
    const activeCustomers = await db.User.count({ 
      where: { role: "customer", status: "active" } 
    });
    const blockedCustomers = await db.User.count({ 
      where: { role: "customer", status: "blocked" } 
    });
    
    const totalBookings = await db.Booking.count();

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        blockedCustomers,
        totalBookings
      }
    });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer statistics",
      error: error.message
    });
  }
});

// GET /customers/:id/details — Returns a customer's full profile including their booking history
router.get("/customers/:id/details", auth, checkAdmin, async (req, res) => {
  try {
    const customer = await db.User.findOne({
      where: { id: req.params.id, role: "customer" },
      attributes: { exclude: ["password"] }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Get bookings separately without association alias
    const bookings = await db.Booking.findAll({
      where: { customerId: customer.id },
      include: [
        { model: db.Event, as: "event" },
        { model: db.User, as: "manager", attributes: ["id", "name", "email", "mobile"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    const totalSpent = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    res.json({
      success: true,
      data: {
        ...customer.toJSON(),
        bookings: bookings,
        totalSpent
      }
    });
  } catch (error) {
    console.error("Error fetching customer details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer details",
      error: error.message
    });
  }
});

// PUT /customers/:id/status — Blocks or unblocks a customer account
router.put("/customers/:id/status", auth, checkAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active' or 'blocked'"
      });
    }

    const customer = await db.User.findOne({
      where: { id: req.params.id, role: "customer" }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    await customer.update({ status });

    // Log admin action
    await logAdminAction(
      req.user.id,
      status === "blocked" ? "block_customer" : "unblock_customer",
      "user",
      customer.id,
      { customerName: customer.name, customerEmail: customer.email, newStatus: status },
      req.ip
    );

    // Notify the customer
    await createNotification(
      customer.id,
      status === "blocked" ? "Account Blocked" : "Account Unblocked",
      status === "blocked"
        ? "Your account has been blocked by an administrator. Please contact support for more information."
        : "Your account has been unblocked. You can now use all features again.",
      status === "blocked" ? "account_blocked" : "account_unblocked",
      null
    );

    res.json({
      success: true,
      message: `Customer ${status} successfully`,
      data: customer
    });
  } catch (error) {
    console.error("Error updating customer status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer status",
      error: error.message
    });
  }
});


// GET /managers — Returns all managers with their business profiles and aggregated stats
router.get("/managers", auth, checkAdmin, async (req, res) => {
  try {
    const managers = await db.User.findAll({
      where: { role: "manager" },
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.EventManager,
          required: false,
        },
      ],
    });

    // Batch-fetch event counts and booking stats for all managers at once
    const managerIds = managers.map(m => m.id);

    const [eventCounts, bookingStats] = await Promise.all([
      db.Event.findAll({
        where: { managerId: managerIds },
        attributes: ["managerId", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
        group: ["managerId"],
        raw: true,
      }),
      db.Booking.findAll({
        where: { managerId: managerIds },
        attributes: [
          "managerId",
          [db.sequelize.fn("COUNT", db.sequelize.col("id")), "bookingsCount"],
          [db.sequelize.fn("SUM", db.sequelize.col("totalPrice")), "totalRevenue"],
          [db.sequelize.fn("SUM", db.sequelize.literal(`CASE WHEN status = 'completed' THEN 1 ELSE 0 END`)), "completedEvents"],
        ],
        group: ["managerId"],
        raw: true,
      }),
    ]);

    const eventCountMap = Object.fromEntries(eventCounts.map(e => [e.managerId, parseInt(e.count)]));
    const bookingStatsMap = Object.fromEntries(bookingStats.map(b => [b.managerId, b]));

    const managersWithStats = managers.map((manager) => {
      const em = manager.EventManager;
      const stats = bookingStatsMap[manager.id] || {};
      return {
        ...manager.toJSON(),
        businessName: em?.businessName,
        yearsOfExperience: em?.yearsOfExperience,
        businessTypes: em?.businessTypes,
        serviceAreas: em?.serviceAreas,
        isVerified: em?.isVerified || false,
        verificationStatus: em?.verificationStatus || "not_submitted",
        rating: em?.rating,
        startingPrice: em?.price,
        eventsCount: eventCountMap[manager.id] || 0,
        bookingsCount: parseInt(stats.bookingsCount) || 0,
        totalRevenue: parseFloat(stats.totalRevenue) || 0,
        completedEvents: parseInt(stats.completedEvents) || 0,
      };
    });

    res.json({
      success: true,
      data: managersWithStats
    });
  } catch (error) {
    console.error("Error fetching managers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch managers",
      error: error.message
    });
  }
});

// GET /managers/verified — Returns only managers who have been verified
router.get("/managers/verified", auth, checkAdmin, async (req, res) => {
  try {
    const eventManagers = await db.EventManager.findAll({
      where: { isVerified: true }
    });
    
    const userIds = eventManagers.map(em => em.userId);
    
    const managers = await db.User.findAll({
      where: { id: userIds, role: "manager" },
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]]
    });

    const managersWithData = managers.map(manager => {
      const eventManager = eventManagers.find(em => em.userId === manager.id);
      return {
        ...manager.toJSON(),
        businessName: eventManager?.businessName,
        yearsOfExperience: eventManager?.yearsOfExperience,
        isVerified: true,
        rating: eventManager?.rating,
        startingPrice: eventManager?.price
      };
    });

    res.json({
      success: true,
      data: managersWithData
    });
  } catch (error) {
    console.error("Error fetching verified managers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch verified managers",
      error: error.message
    });
  }
});

// GET /managers/pending-verification — Returns managers awaiting verification approval
router.get("/managers/pending-verification", auth, checkAdmin, async (req, res) => {
  try {
    const pendingVerifications = await db.Verification.findAll({
      where: { status: "pending" },
      include: [
        {
          model: db.User,
          as: "User"
        }
      ]
    });

    const managers = await Promise.all(pendingVerifications.map(async (v) => {
      const user = v.User;
      const eventManager = await db.EventManager.findOne({
        where: { userId: user.id }
      });
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        businessName: v.businessName,
        yearsOfExperience: v.yearsOfExperience,
        businessTypes: v.businessTypes,
        serviceAreas: v.serviceAreas,
        description: v.description,
        images: v.images,
        pastEvents: v.pastEvents,
        isVerified: false,
        verificationStatus: "pending",
        verificationId: v.id,
        rating: eventManager?.rating,
        startingPrice: eventManager?.price
      };
    }));

    res.json({
      success: true,
      data: managers
    });
  } catch (error) {
    console.error("Error fetching pending managers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending managers",
      error: error.message
    });
  }
});

// GET /managers/stats — Returns aggregate manager and event counts for the admin dashboard
router.get("/managers/stats", auth, checkAdmin, async (req, res) => {
  try {
    const totalManagers = await db.User.count({ where: { role: "manager" } });
    const verifiedManagers = await db.EventManager.count({ where: { isVerified: true } });
    const pendingVerification = await db.Verification.count({ where: { status: "pending" } });
    const totalEvents = await db.Event.count();

    res.json({
      success: true,
      data: {
        totalManagers,
        verifiedManagers,
        pendingVerification,
        totalEvents
      }
    });
  } catch (error) {
    console.error("Error fetching manager stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch manager statistics",
      error: error.message
    });
  }
});

// GET /managers/:id/details — Returns a manager's full profile, events, bookings, and revenue
router.get("/managers/:id/details", auth, checkAdmin, async (req, res) => {
  try {
    const manager = await db.User.findOne({
      where: { id: req.params.id, role: "manager" },
      attributes: { exclude: ["password"] }
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found"
      });
    }

    const eventManager = await db.EventManager.findOne({
      where: { userId: manager.id }
    });
    
    const events = await db.Event.findAll({
      where: { managerId: manager.id }
    });
    
    const bookings = await db.Booking.findAll({
      where: { managerId: manager.id },
      include: [
        { model: db.User, as: "customer", attributes: ["id", "name", "email", "mobile"] },
        { model: db.Event, as: "event" }
      ]
    });

    const verification = await db.Verification.findOne({
      where: { userId: manager.id }
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const completedEvents = bookings.filter(b => b.status === "completed").length;

    const responseData = {
      ...manager.toJSON(),
      eventManager: eventManager,
      businessName: eventManager?.businessName,
      yearsOfExperience: eventManager?.yearsOfExperience,
      businessTypes: eventManager?.businessTypes,
      serviceAreas: eventManager?.serviceAreas,
      description: eventManager?.description,
      portfolioImages: eventManager?.portfolioImages,
      pastEvents: eventManager?.pastEvents,
      isVerified: eventManager?.isVerified || false,
      verificationStatus: eventManager?.verificationStatus || "not_submitted",
      rating: eventManager?.rating,
      startingPrice: eventManager?.price,
      events: events,
      managerBookings: bookings,
      verification: verification || null,
      totalRevenue: totalRevenue,
      completedEvents: completedEvents
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("Error fetching manager details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch manager details",
      error: error.message
    });
  }
});

// PUT /managers/:id/verify — Manually verifies or unverifies a manager from the admin panel
router.put("/managers/:id/verify", auth, checkAdmin, async (req, res) => {
  try {
    const { isVerified } = req.body;
    
    const manager = await db.User.findOne({
      where: { id: req.params.id, role: "manager" }
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found"
      });
    }

    const eventManager = await db.EventManager.findOne({
      where: { userId: manager.id }
    });

    if (!eventManager) {
      return res.status(404).json({
        success: false,
        message: "Event manager profile not found"
      });
    }

    await eventManager.update({
      isVerified: isVerified,
      verificationStatus: isVerified ? "approved" : "not_submitted",
      verifiedAt: isVerified ? new Date() : null
    });

    if (isVerified) {
      const pendingVerification = await db.Verification.findOne({
        where: { userId: manager.id, status: "pending" }
      });
      
      if (pendingVerification) {
        await pendingVerification.update({
          status: "approved",
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        });
      }
    }

    // Log admin action
    await logAdminAction(
      req.user.id,
      isVerified ? "verify_manager" : "unverify_manager",
      "manager",
      manager.id,
      { managerName: manager.name, businessName: eventManager.businessName, isVerified },
      req.ip
    );

    // Notify the manager
    await createNotification(
      manager.id,
      isVerified ? "Account Verified! 🎉" : "Verification Removed",
      isVerified
        ? "Congratulations! Your manager account has been verified by an administrator."
        : "Your manager verification has been removed by an administrator.",
      isVerified ? "manager_verified" : "manager_unverified",
      "/manager-dashboard"
    );

    res.json({
      success: true,
      message: `Manager ${isVerified ? "verified" : "unverified"} successfully`,
      data: { isVerified: eventManager.isVerified }
    });
  } catch (error) {
    console.error("Error updating manager verification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update manager verification",
      error: error.message
    });
  }
});

// ==================== AUDIT LOG ROUTES ====================

// GET /audit-logs — Returns paginated admin action history for accountability
router.get("/audit-logs", auth, checkAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      include: [
        { model: User, as: "admin", attributes: ["id", "name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ success: false, message: "Failed to get audit logs" });
  }
});

// Helper to safely escape values for CSV export
const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

// GET /export/customers — Downloads all customer data as a CSV file
router.get("/export/customers", auth, checkAdmin, async (req, res) => {
  try {
    const customers = await db.User.findAll({
      where: { role: "customer" },
      attributes: ["id", "name", "email", "mobile", "status", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    let csv = "ID,Name,Email,Mobile,Status,Joined Date\n";
    customers.forEach((c) => {
      csv += `${c.id},${escapeCsv(c.name)},${escapeCsv(c.email)},${escapeCsv(c.mobile)},${escapeCsv(c.status)},${escapeCsv(new Date(c.createdAt).toLocaleDateString())}\n`;
    });

    // Log export action
    await logAdminAction(req.user.id, "export_customers", "user", 0, { totalExported: customers.length }, req.ip);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=customers.csv");
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: "Failed to export" });
  }
});

// GET /bookings — Returns all bookings across the platform for admin oversight
router.get("/bookings", auth, checkAdmin, async (req, res) => {
  try {
    const bookings = await db.Booking.findAll({
      include: [
        { model: db.Event, as: "event", attributes: ["name", "category"] },
        { model: db.User, as: "customer", attributes: ["id", "name", "email", "mobile"] },
        { model: db.User, as: "manager", attributes: ["id", "name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
});

// GET /export/bookings — Downloads all booking data as a CSV file
router.get("/export/bookings", auth, checkAdmin, async (req, res) => {
  try {
    const bookings = await db.Booking.findAll({
      include: [
        { model: db.Event, as: "event", attributes: ["name", "category"] },
        { model: db.User, as: "customer", attributes: ["name", "email"] },
        { model: db.User, as: "manager", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    let csv = "ID,Event,Category,Customer,Manager,Date,Guests,Price,Status,Booked On\n";
    bookings.forEach((b) => {
      csv += `${b.id},${escapeCsv(b.event?.name || "")},${escapeCsv(b.event?.category || "")},${escapeCsv(b.customer?.name || "")},${escapeCsv(b.manager?.name || "")},${escapeCsv(b.eventDate)},${b.guests},${b.totalPrice},${escapeCsv(b.status)},${escapeCsv(new Date(b.createdAt).toLocaleDateString())}\n`;
    });

    // Log export action
    await logAdminAction(req.user.id, "export_bookings", "booking", 0, { totalExported: bookings.length }, req.ip);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: "Failed to export" });
  }
});

module.exports = router;