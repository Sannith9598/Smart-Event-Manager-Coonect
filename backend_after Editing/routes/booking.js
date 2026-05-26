const router = require("express").Router();
const db = require("../models");
const auth = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const {
  sendBookingConfirmation,
  sendBookingRejection,
  sendNewBookingToManager,
  sendBookingCompleted,
} = require("../utils/emailTemplates");

// Rate limiter for booking creation — max 5 per minute per IP
const bookingCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many booking requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /create — Creates a new booking with server-side price calculation to prevent manipulation
router.post("/create", auth, bookingCreateLimiter, async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      eventId,
      eventDate,
      guests,
      specialRequests,
      selectedAddons,
      selectedCustomAddons,
      selectedServiceItems,
      managerId,
    } = req.body;

    // Input validation
    if (!eventId || !eventDate || !guests || !managerId) {
      return res.status(400).json({ success: false, message: "Missing required fields: eventId, eventDate, guests, managerId" });
    }

    // Date validation - prevent past dates
    const selectedDate = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({ success: false, message: "Event date cannot be in the past" });
    }

    if (guests < 1) {
      return res.status(400).json({ success: false, message: "Number of guests must be at least 1" });
    }

    const user = await db.User.findByPk(customerId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, message: "Only customers can book events" });
    }

    const event = await db.Event.findByPk(eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    if (event.status !== "available") {
      return res
        .status(400)
        .json({ success: false, message: "Event not available" });
    }

    // Verify managerId matches the event's manager
    if (event.managerId !== managerId) {
      return res.status(400).json({ success: false, message: "Invalid manager for this event" });
    }

    // Server-side price calculation to prevent price manipulation
    let calculatedPrice = parseFloat(event.price) || 0;

    // Add extra guest charges
    const maxGuests = event.maxGuests || 0;
    const perExtraGuestPrice = event.perExtraGuestPrice || 0;
    if (maxGuests > 0 && guests > maxGuests) {
      const extraGuests = guests - maxGuests;
      calculatedPrice += extraGuests * perExtraGuestPrice;
    }

    // Add addon charges (standard add-ons - legacy flat pricing)
    const addons = selectedAddons || {};
    const addonPrices = event.addonPrices || {};
    if (addons.catering && addonPrices.catering) calculatedPrice += addonPrices.catering;
    if (addons.decoration && addonPrices.decoration) calculatedPrice += addonPrices.decoration;
    if (addons.photography && addonPrices.photography) calculatedPrice += addonPrices.photography;
    if (addons.music && addonPrices.music) calculatedPrice += addonPrices.music;
    if (addons.transport && addonPrices.transport) calculatedPrice += addonPrices.transport;

    // Add detailed service item charges (new system)
    const serviceItems = selectedServiceItems || {};
    const eventAddonServices = event.addonServices || {};
    for (const [serviceName, selectedCategories] of Object.entries(serviceItems)) {
      const serviceConfig = eventAddonServices[serviceName];
      if (!serviceConfig || !serviceConfig.enabled) continue;

      for (const [categoryName, items] of Object.entries(selectedCategories)) {
        const category = (serviceConfig.categories || []).find(
          (c) => c.name === categoryName
        );
        if (!category) continue;

        for (const selectedItem of items) {
          // Verify item exists in the event's service config and use server-side price
          const matchingItem = (category.items || []).find(
            (i) => i.name === selectedItem.name
          );
          if (matchingItem) {
            const quantity = parseInt(selectedItem.quantity) || 1;
            const rate = parseFloat(matchingItem.rate) || 0;
            // For catering items, multiply by number of guests since food is per guest
            if (serviceName === "catering" && guests > 0) {
              calculatedPrice += rate * quantity * guests;
            } else {
              calculatedPrice += rate * quantity;
            }
          }
        }
      }
    }

    // Add custom add-on charges (manager-defined packages)
    const customAddonsSelected = selectedCustomAddons || [];
    const eventCustomAddons = event.customAddons || [];
    for (const selected of customAddonsSelected) {
      // Verify the add-on exists in the event's custom add-ons and use the server-side price
      const matchingAddon = eventCustomAddons.find(
        a => a.name.toLowerCase() === selected.name.toLowerCase()
      );
      if (matchingAddon) {
        calculatedPrice += parseFloat(matchingAddon.price) || 0;
      }
    }

    // Check for duplicate booking (same customer, event, date) — inside a transaction to prevent race conditions
    const t = await db.sequelize.transaction({ isolationLevel: db.Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE });
    try {
      const existingBooking = await db.Booking.findOne({
        where: {
          customerId,
          eventId,
          eventDate,
          status: { [db.Sequelize.Op.in]: ["pending", "confirmed"] },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (existingBooking) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "You already have a booking for this event on this date" });
      }

      const booking = await db.Booking.create({
        customerId,
        eventId,
        managerId,
        eventDate,
        guests,
        specialRequests: specialRequests || null,
        selectedAddons: addons,
        selectedCustomAddons: customAddonsSelected,
        selectedServiceItems: serviceItems,
        totalPrice: calculatedPrice,
        finalPrice: calculatedPrice,
        status: "pending",
        bookingDate: new Date(),
      }, { transaction: t });

      await t.commit();

    // Send email notification to manager
    try {
      const manager = await db.User.findByPk(managerId);
      const customer = await db.User.findByPk(customerId);
      if (manager && manager.email) {
        await sendNewBookingToManager(manager.email, manager.name, booking, event, customer);
      }

      // Create in-app notification
      await db.Notification.create({
        userId: managerId,
        title: "New Booking Request 📋",
        message: `${customer?.name || "A customer"} booked ${event.name}`,
        type: "booking_new",
        link: "/manager-dashboard",
      });

      // Emit socket notification
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${managerId}`).emit("notification", {
          title: "New Booking Request 📋",
          message: `${customer?.name || "A customer"} booked ${event.name}`,
          type: "booking_new",
        });
      }
    } catch (emailErr) {
      console.error("Notification failed:", emailErr);
    }

    res.json({ success: true, message: "Booking created", data: booking });
    } catch (txError) {
      await t.rollback();
      throw txError;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /manager/booking/:id — Lets the manager update booking status (confirm, reject, cancel)
router.put("/manager/booking/:id", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user || user.role !== "manager") {
      return res.status(403).json({ message: "Manager only" });
    }
    const booking = await db.Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.managerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    const { status, confirmedDate, confirmedTime, depositAmount, notes } =
      req.body;

    // Status transition validation
    const allowedTransitions = {
      pending: ["confirmed", "cancelled", "rejected"],
      confirmed: ["completed", "cancelled"],
      rejected: [],
      completed: [],
      cancelled: [],
    };
    if (status && status !== booking.status) {
      const allowed = allowedTransitions[booking.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: `Cannot change status from '${booking.status}' to '${status}'` });
      }
    }

    // Use !== undefined to allow setting values to 0 or empty string
    booking.status = status !== undefined ? status : booking.status;
    booking.confirmedDate = confirmedDate !== undefined ? confirmedDate : booking.confirmedDate;
    booking.confirmedTime = confirmedTime !== undefined ? confirmedTime : booking.confirmedTime;
    booking.depositAmount = depositAmount !== undefined ? depositAmount : booking.depositAmount;
    booking.notes = notes !== undefined ? notes : booking.notes;
    await booking.save();

    // Send email notification to customer
    try {
      const customer = await db.User.findByPk(booking.customerId);
      const event = await db.Event.findByPk(booking.eventId);
      const manager = await db.User.findByPk(req.user.id);

      if (customer && customer.email) {
        if (status === "confirmed") {
          await sendBookingConfirmation(customer.email, customer.name, booking, event, manager);
        } else if (status === "cancelled" || status === "rejected") {
          await sendBookingRejection(customer.email, customer.name, booking, event, notes);
        }
      }

      // Create in-app notification
      const notifTitle = status === "confirmed" ? "Booking Confirmed! ✅" : "Booking Update";
      const notifMessage = status === "confirmed"
        ? `Your booking for ${event?.name || "event"} has been confirmed!`
        : `Your booking for ${event?.name || "event"} has been ${status}`;

      await db.Notification.create({
        userId: booking.customerId,
        title: notifTitle,
        message: notifMessage,
        type: status === "confirmed" ? "booking_confirmed" : "booking_rejected",
        link: "/customer/bookings",
      });

      // Emit socket notification
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${booking.customerId}`).emit("notification", {
          title: notifTitle,
          message: notifMessage,
          type: status === "confirmed" ? "booking_confirmed" : "booking_rejected",
        });
      }
    } catch (emailErr) {
      console.error("Notification failed:", emailErr);
    }

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /my-bookings — Returns paginated list of the logged-in customer's bookings
router.get("/my-bookings", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const where = { customerId: req.user.id };
    if (status && status !== "all") {
      where.status = status;
    }

    const { count, rows: bookings } = await db.Booking.findAndCountAll({
      where,
      include: [
        { model: db.Event, as: "event" },
        { model: db.User, as: "manager", attributes: ["id", "name", "email", "mobile"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // If page param was explicitly provided, return paginated format
    // Otherwise return array for backward compatibility
    if (req.query.page) {
      res.json({
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      });
    } else {
      res.json(bookings);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /manager/bookings — Returns paginated list of bookings assigned to the logged-in manager
router.get("/manager/bookings", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user || user.role !== "manager") {
      return res.status(403).json({ message: "Manager only" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const where = { managerId: req.user.id };
    if (status && status !== "all") {
      where.status = status;
    }

    const { count, rows: bookings } = await db.Booking.findAndCountAll({
      where,
      include: [
        { model: db.Event, as: "event" },
        { model: db.User, as: "customer", attributes: ["id", "name", "email", "mobile"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // If page param was explicitly provided, return paginated format
    // Otherwise return array for backward compatibility
    if (req.query.page) {
      res.json({
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      });
    } else {
      res.json(bookings);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /:id — Fetches a single booking (accessible by either the customer or the manager)
router.get("/:id", auth, async (req, res) => {
  try {
    const booking = await db.Booking.findOne({
      where: {
        id: req.params.id,
        [db.Sequelize.Op.or]: [
          { customerId: req.user.id },
          { managerId: req.user.id },
        ],
      },
      include: [
        { model: db.Event, as: "event" },
        { model: db.User, as: "manager", attributes: ["id", "name", "email", "mobile"] },
        { model: db.User, as: "customer", attributes: ["id", "name", "email", "mobile"] },
      ],
    });
    if (!booking) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /cancel/:id — Allows a customer to cancel their own pending or confirmed booking
router.put("/cancel/:id", auth, async (req, res) => {
  try {
    const booking = await db.Booking.findOne({
      where: {
        id: req.params.id,
        customerId: req.user.id,
      },
    });
    if (!booking) {
      return res.status(404).json({ message: "Not found" });
    }
    // Only pending or confirmed bookings can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: `Cannot cancel a booking that is already ${booking.status}` });
    }
    booking.status = "cancelled";
    await booking.save();
    res.json({ message: "Cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /manager/special-request-price/:id — Manager sets a price for the customer's special request and recalculates total
router.put("/manager/special-request-price/:id", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user || user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Manager only" });
    }

    const booking = await db.Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.managerId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // Only allow pricing on pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Can only set special request price on pending or confirmed bookings" });
    }

    const { specialRequestPrice } = req.body;

    if (specialRequestPrice === undefined || specialRequestPrice === null) {
      return res.status(400).json({ success: false, message: "specialRequestPrice is required" });
    }

    const priceValue = parseFloat(specialRequestPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      return res.status(400).json({ success: false, message: "Special request price must be a non-negative number" });
    }

    // Update the booking with special request price and recalculate final price
    const finalPrice = (booking.totalPrice || 0) + priceValue - (parseFloat(booking.discountAmount) || 0);

    await booking.update({
      specialRequestPrice: priceValue,
      finalPrice: finalPrice
    });

    // Notify the customer about the price update
    try {
      const event = await db.Event.findByPk(booking.eventId);
      await db.Notification.create({
        userId: booking.customerId,
        title: "Special Request Priced 💰",
        message: `Your special request for "${event?.name || 'event'}" has been priced at ₹${priceValue.toLocaleString()}. Updated total: ₹${finalPrice.toLocaleString()}`,
        type: "booking_update",
        link: "/customer/bookings",
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user_${booking.customerId}`).emit("notification", {
          title: "Special Request Priced 💰",
          message: `Special request priced at ₹${priceValue.toLocaleString()}`,
          type: "booking_update",
        });
      }
    } catch (notifErr) {
      console.error("Notification failed:", notifErr);
    }

    res.json({
      success: true,
      message: "Special request price updated successfully",
      data: {
        specialRequestPrice: priceValue,
        totalPrice: booking.totalPrice,
        finalPrice: finalPrice
      }
    });
  } catch (error) {
    console.error("Special request price error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /manager/discount/:id — Applies a discount to a booking and recalculates the final price
router.put("/manager/discount/:id", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user || user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Manager only" });
    }

    const booking = await db.Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.managerId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Can only apply discount on pending or confirmed bookings" });
    }

    const { discountAmount, discountReason } = req.body;

    if (discountAmount === undefined || discountAmount === null) {
      return res.status(400).json({ success: false, message: "discountAmount is required" });
    }

    const discountValue = parseFloat(discountAmount);
    if (isNaN(discountValue) || discountValue < 0) {
      return res.status(400).json({ success: false, message: "Discount amount must be a non-negative number" });
    }

    const totalBeforeDiscount = parseFloat(booking.totalPrice || 0) + parseFloat(booking.specialRequestPrice || 0);
    if (discountValue > totalBeforeDiscount) {
      return res.status(400).json({ success: false, message: "Discount cannot exceed total amount" });
    }

    const finalPrice = totalBeforeDiscount - discountValue;

    await booking.update({
      discountAmount: discountValue,
      discountReason: discountReason || null,
      finalPrice: finalPrice,
    });

    // Notify the customer about the discount
    try {
      const event = await db.Event.findByPk(booking.eventId);
      await db.Notification.create({
        userId: booking.customerId,
        title: "Discount Applied! 🎉",
        message: `A discount of ₹${discountValue.toLocaleString()} has been applied to your booking for "${event?.name || 'event'}". New total: ₹${finalPrice.toLocaleString()}`,
        type: "booking_update",
        link: "/customer/bookings",
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user_${booking.customerId}`).emit("notification", {
          title: "Discount Applied! 🎉",
          message: `Discount of ₹${discountValue.toLocaleString()} applied`,
          type: "booking_update",
        });
      }
    } catch (notifErr) {
      console.error("Notification failed:", notifErr);
    }

    res.json({
      success: true,
      message: "Discount applied successfully",
      data: {
        discountAmount: discountValue,
        discountReason: discountReason || null,
        totalPrice: booking.totalPrice,
        specialRequestPrice: booking.specialRequestPrice,
        finalPrice: finalPrice,
      },
    });
  } catch (error) {
    console.error("Discount error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /manager/complete/:id — Marks a confirmed booking as completed and notifies the customer
router.put("/manager/complete/:id", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user || user.role !== "manager") {
      return res.status(403).json({ message: "Manager only" });
    }
    
    const booking = await db.Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    if (booking.managerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    
    // Only confirmed bookings can be marked as completed
    if (booking.status !== "confirmed") {
      return res.status(400).json({ 
        message: "Only confirmed bookings can be marked as completed" 
      });
    }
    
    booking.status = "completed";
    booking.completedAt = new Date();
    await booking.save();

    // Send completion email to customer
    try {
      const customer = await db.User.findByPk(booking.customerId);
      const event = await db.Event.findByPk(booking.eventId);
      if (customer && customer.email) {
        await sendBookingCompleted(customer.email, customer.name, booking, event);
      }
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.json({
      success: true,
      message: "Booking marked as completed successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /details/:id — Returns full booking details for the customer (used for invoice generation)
router.get("/details/:id", auth, async (req, res) => {
  try {
    const booking = await db.Booking.findOne({
      where: {
        id: req.params.id,
        customerId: req.user.id,
      },
      include: [
        { 
          model: db.Event, 
          as: "event" 
        },
        { 
          model: db.User, 
          as: "manager", 
          attributes: ["id", "name", "email", "mobile"] 
        }
      ],
    });
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /manager/details/:id — Returns full booking details for the manager (used for invoice generation)
router.get("/manager/details/:id", auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    
    // Check if user is a manager
    if (!user || user.role !== "manager") {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Manager privileges required." 
      });
    }
    
    const booking = await db.Booking.findOne({
      where: {
        id: req.params.id,
        managerId: req.user.id, // Allow manager to access their own bookings
      },
      include: [
        { 
          model: db.Event, 
          as: "event" 
        },
        { 
          model: db.User, 
          as: "customer", 
          attributes: ["id", "name", "email", "mobile"] 
        }
      ],
    });
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found or you don't have permission to access it" 
      });
    }
    
    // Transform the data to match what the frontend expects
    const responseData = {
      ...booking.toJSON(),
      User: booking.customer, // For compatibility with frontend code
    };
    
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching booking details for manager:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
