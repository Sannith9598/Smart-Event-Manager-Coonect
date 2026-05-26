const router = require("express").Router();
const db = require("../models");
const auth = require("../middleware/auth");
const { cloudinary } = require("../config/cloudinary");


// POST /add-event — Creates a new event listing (manager must be verified)
router.post("/add-event", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Role check
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Only managers can add events" });
    }

    const verification = await db.Verification.findOne({
      where: {
        userId,
        status: "approved"
      }
    });

    if (!verification) {
      return res.status(403).json({
        message: "You must be verified to add events"
      });
    }

    const { name, price, status, image, images, category, description, includes, duration, maxGuests, addonPrices, addonServices, perExtraGuestPrice, customAddons } = req.body;

    // Input validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Event name is required" });
    }
    if (!price || parseFloat(price) <= 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    // Validate customAddons if provided
    if (customAddons && Array.isArray(customAddons)) {
      for (const addon of customAddons) {
        if (!addon.name || !addon.name.trim()) {
          return res.status(400).json({ message: "Each custom add-on must have a name" });
        }
        if (addon.price === undefined || addon.price === null || parseFloat(addon.price) < 0) {
          return res.status(400).json({ message: "Each custom add-on must have a valid price (≥ 0)" });
        }
      }
    }

    const event = await db.Event.create({
      name,
      price,
      status: status || "available",
      image,
      images: images || [],
      category: category || "event",
      description: description || verification.description,
      includes,
      duration,
      maxGuests,
      addonPrices,
      addonServices: addonServices || {},
      perExtraGuestPrice,
      customAddons: customAddons || [],
      managerId: userId,
    });

    res.json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating event" });
  }
});

// GET /all-events — Public endpoint that returns paginated, filterable, sortable event listings
router.get("/all-events", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100 max
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const sortBy = req.query.sortBy || "newest";

    const where = { status: "available" };
    
    if (category && category !== "all") {
      where.category = category;
    }

    // Search by name, description, or location (#2)
    if (search && search.trim()) {
      where[db.Sequelize.Op.and] = [
        {
          [db.Sequelize.Op.or]: [
            { name: { [db.Sequelize.Op.like]: `%${search}%` } },
            { description: { [db.Sequelize.Op.like]: `%${search}%` } },
            { location: { [db.Sequelize.Op.like]: `%${search}%` } },
          ],
        },
      ];
    }

    // Price range filter (#2)
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[db.Sequelize.Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[db.Sequelize.Op.lte] = parseFloat(maxPrice);
    }

    // Sort options (#2)
    let order;
    switch (sortBy) {
      case "price-low":
        order = [["price", "ASC"]];
        break;
      case "price-high":
        order = [["price", "DESC"]];
        break;
      case "rating":
        order = [["rating", "DESC"]];
        break;
      case "oldest":
        order = [["createdAt", "ASC"]];
        break;
      default:
        order = [["createdAt", "DESC"]];
    }

    const { count, rows: events } = await db.Event.findAndCountAll({
      where,
      include: [
        { model: db.User, as: "manager", attributes: ["id", "name"] }
      ],
      order,
      limit,
      offset,
    });

    res.json({
      events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching events" });
  }
});

// GET /all-events/:id — Public endpoint that returns full details for a single event
router.get("/all-events/:id", async (req, res) => {
  try {
    const event = await db.Event.findOne({
      where: { id: req.params.id },
      include: [
        { model: db.User, as: "manager", attributes: ["id", "name", "email", "mobile"] }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching event details" });
  }
});


// GET /events — Returns all events owned by the logged-in manager
router.get("/events", auth, async (req, res) => {
  try {
    const events = await db.Event.findAll({
      where: { managerId: req.user.id },
     order: [
        ["updatedAt", "DESC"], 
        ["createdAt", "DESC"] 
      ],
    });

    res.json(events);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching manager events" });
  }
});


// GET /manager/:userId — Public endpoint that returns available events for a specific manager
router.get("/manager/:userId", async (req, res) => {
  try {
    const events = await db.Event.findAll({
      where: { 
        managerId: req.params.userId,
        status: "available" 
      },
      order: [["createdAt", "DESC"]],
    });

    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.name,
      name: event.name,
      description: event.description,
      price: event.price,
      image: event.image,
      status: event.status,
      category: event.category,
      duration: event.duration,
      maxGuests: event.maxGuests,
      includes: event.includes,
      eventDate: event.createdAt,
      eventType: event.category,
      location: event.location || "Location not specified",
      rating: event.rating,
      totalReviews: event.totalReviews,
      managerId: event.managerId,
      baseCustomizations: event.baseCustomizations,
      addonPrices: event.addonPrices,
      perExtraGuestPrice: event.perExtraGuestPrice,
      availableDates: event.availableDates
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching manager events:", error);
    res.status(500).json({ message: "Error fetching manager events" });
  }
});


// PUT /edit-event/:id — Updates an existing event and cleans up removed images from Cloudinary
router.put("/edit-event/:id", auth, async (req, res) => {
  try {
    const event = await db.Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.managerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { name, price, status, image, images, category, description, includes, duration, maxGuests, addonPrices, addonServices, perExtraGuestPrice, customAddons } = req.body;

    // Delete removed images from Cloudinary
    const oldImages = [...(event.images || [])];
    if (event.image && !oldImages.includes(event.image)) {
      oldImages.push(event.image);
    }
    const newImages = [...(images || [])];
    if (image && !newImages.includes(image)) {
      newImages.push(image);
    }

    const removedImages = oldImages.filter((img) => !newImages.includes(img));
    for (const imageUrl of removedImages) {
      if (imageUrl && imageUrl.includes("cloudinary")) {
        try {
          const parts = imageUrl.split("/upload/");
          if (parts[1]) {
            let publicId = parts[1];
            publicId = publicId.replace(/^v\d+\//, "");
            publicId = publicId.replace(/\.[^/.]+$/, "");
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (err) {
          console.error("Failed to delete old Cloudinary image:", err.message);
        }
      }
    }

    await event.update({
      name,
      price,
      status,
      image,
      images,
      category,
      description,
      includes,
      duration,
      maxGuests,
      addonPrices,
      addonServices: addonServices !== undefined ? addonServices : event.addonServices,
      perExtraGuestPrice,
      customAddons: customAddons !== undefined ? customAddons : event.customAddons,
    });

    res.json({
      success: true,
      message: "Event updated",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Update failed" });
  }
});

// PUT /toggle-status/:id — Toggles an event between available and unavailable
router.put("/toggle-status/:id", auth, async (req, res) => {
  try {
    const event = await db.Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.managerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const newStatus = event.status === "available" ? "unavailable" : "available";
    await event.update({ status: newStatus });

    res.json({
      success: true,
      message: `Event status updated to ${newStatus}`,
      data: { id: event.id, status: newStatus }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update event status" });
  }
});


// DELETE /event/:id — Permanently deletes an event (blocked if it has existing bookings)
router.delete("/event/:id", auth, async (req, res) => {
  try {
    const event = await db.Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.managerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const existingBookings = await db.Booking.findOne({
      where: { eventId: event.id }
    });

    if (existingBookings) {
      return res.status(400).json({ 
        message: "Cannot delete event with existing bookings" 
      });
    }

    // Delete images from Cloudinary before destroying the event
    const allImages = [...(event.images || [])];
    if (event.image && !allImages.includes(event.image)) {
      allImages.push(event.image);
    }

    for (const imageUrl of allImages) {
      if (imageUrl && imageUrl.includes("cloudinary")) {
        try {
          const parts = imageUrl.split("/upload/");
          if (parts[1]) {
            let publicId = parts[1];
            // Remove version number if present
            publicId = publicId.replace(/^v\d+\//, "");
            // Remove file extension
            publicId = publicId.replace(/\.[^/.]+$/, "");
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (err) {
          console.error("Failed to delete Cloudinary image:", err.message);
        }
      }
    }

    await event.destroy();

    res.json({
      success: true,
      message: "Event deleted",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Delete failed" });
  }
});


// PUT /availability/:id — Updates the available dates calendar for an event
router.put("/availability/:id", auth, async (req, res) => {
  try {
    const event = await db.Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.managerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { availableDates } = req.body;

    await event.update({
      availableDates: availableDates || event.availableDates,
    });

    res.json({
      success: true,
      message: "Availability updated",
      data: { availableDates: event.availableDates },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update availability" });
  }
});

// GET /booked-dates/:id — Returns dates that already have pending/confirmed bookings for an event
router.get("/booked-dates/:id", async (req, res) => {
  try {
    const bookings = await db.Booking.findAll({
      where: {
        eventId: req.params.id,
        status: { [db.Sequelize.Op.in]: ["pending", "confirmed"] },
      },
      attributes: ["eventDate"],
    });

    const bookedDates = bookings.map((b) => b.eventDate);

    res.json({ success: true, data: bookedDates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get booked dates" });
  }
});


// GET /trending — Returns the most-booked events across all managers, sorted by popularity
router.get("/trending", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    // Use DB-level aggregation instead of loading all bookings into memory
    const events = await db.Event.findAll({
      where: { status: "available" },
      include: [
        { model: db.User, as: "manager", attributes: ["id", "name", "profilePhoto"] },
      ],
      attributes: {
        include: [
          [
            db.sequelize.literal(`(SELECT COUNT(*) FROM Bookings WHERE Bookings.eventId = Event.id)`),
            "bookingsCount"
          ]
        ]
      },
      order: [[db.sequelize.literal("bookingsCount"), "DESC"]],
      limit,
      subQuery: false,
    });

    const data = events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      price: event.price,
      image: event.image,
      images: event.images,
      category: event.category,
      duration: event.duration,
      maxGuests: event.maxGuests,
      includes: event.includes,
      rating: event.rating,
      location: event.location,
      managerId: event.managerId,
      managerName: event.manager?.name,
      managerPhoto: event.manager?.profilePhoto,
      bookingsCount: parseInt(event.getDataValue("bookingsCount")) || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Trending events error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch trending events" });
  }
});

// GET /analytics — Returns dashboard stats for the logged-in manager (revenue, bookings, trends)
router.get("/analytics", auth, async (req, res) => {
  try {
    const managerId = req.user.id;

    // Total events
    const totalEvents = await db.Event.count({ where: { managerId } });
    const availableEvents = await db.Event.count({ where: { managerId, status: "available" } });

    // Booking stats
    const totalBookings = await db.Booking.count({ where: { managerId } });
    const pendingBookings = await db.Booking.count({ where: { managerId, status: "pending" } });
    const confirmedBookings = await db.Booking.count({ where: { managerId, status: "confirmed" } });
    const completedBookings = await db.Booking.count({ where: { managerId, status: "completed" } });
    const cancelledBookings = await db.Booking.count({ where: { managerId, status: "cancelled" } });

    // Revenue
    const allBookings = await db.Booking.findAll({
      where: { managerId, status: { [db.Sequelize.Op.in]: ["confirmed", "completed"] } },
      attributes: ["totalPrice", "eventDate", "createdAt"],
    });

    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 5; i >= 0; i--) {
      const now = new Date();
      const targetMonth = now.getMonth() - i;
      const date = new Date(now.getFullYear(), targetMonth, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Use UTC dates to match how Sequelize stores timestamps in MySQL
      const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

      const monthBookings = await db.Booking.findAll({
        where: {
          managerId,
          status: { [db.Sequelize.Op.in]: ["confirmed", "completed"] },
          createdAt: { [db.Sequelize.Op.between]: [monthStart, monthEnd] },
        },
        attributes: ["totalPrice"],
      });

      const revenue = monthBookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);
      monthlyRevenue.push({
        month: `${monthNames[month]} ${year}`,
        revenue,
        bookings: monthBookings.length,
      });
    }

    // Conversion rate
    const conversionRate = totalBookings > 0 
      ? ((confirmedBookings + completedBookings) / totalBookings * 100).toFixed(1)
      : 0;

    // Popular events (top 5 by bookings)
    const events = await db.Event.findAll({
      where: { managerId },
      include: [{ model: db.Booking, as: "bookings" }],
    });

    const popularEvents = events
      .map(e => ({
        id: e.id,
        name: e.name,
        bookingsCount: e.bookings?.length || 0,
        revenue: e.bookings?.reduce((sum, b) => sum + (b.totalPrice || 0), 0) || 0,
      }))
      .sort((a, b) => b.bookingsCount - a.bookingsCount)
      .slice(0, 5);

    // Peak booking days
    const dayCount = {};
    allBookings.forEach(b => {
      const day = new Date(b.createdAt).toLocaleString("default", { weekday: "long" });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const peakDays = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])
      .map(([day, count]) => ({ day, count }));

    res.json({
      success: true,
      data: {
        totalEvents,
        availableEvents,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        conversionRate: parseFloat(conversionRate),
        monthlyRevenue,
        popularEvents,
        peakDays,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ success: false, message: "Failed to get analytics" });
  }
});


module.exports = router;
