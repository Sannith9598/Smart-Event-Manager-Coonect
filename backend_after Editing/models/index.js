const { Sequelize } = require("sequelize");
const sequelize = require("../config/db");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require("./User")(sequelize, Sequelize);
db.Event = require("./Event")(sequelize, Sequelize);
db.Booking = require("./Booking")(sequelize, Sequelize);
db.Review = require("./Review")(sequelize, Sequelize);
db.EventManager = require("./EventManager")(sequelize, Sequelize);
db.Verification = require("./Verification")(sequelize, Sequelize);
db.Message = require("./Message")(sequelize, Sequelize);
db.Notification = require("./Notification")(sequelize, Sequelize);
db.AuditLog = require("./AuditLog")(sequelize, Sequelize);
db.Favorite = require("./Favorite")(sequelize, Sequelize);
db.Otp = require("./Otp")(sequelize, Sequelize);
db.LoginAttempt = require("./LoginAttempt")(sequelize, Sequelize);

// ─── User → EventManager (1:1) ──────────────────────────────────────────────
db.User.hasOne(db.EventManager, { foreignKey: "userId", onDelete: "CASCADE" });
db.EventManager.belongsTo(db.User, { foreignKey: "userId" });

// ─── User → Verification ────────────────────────────────────────────────────
db.User.hasMany(db.Verification, { foreignKey: "userId", onDelete: "CASCADE" });
db.Verification.belongsTo(db.User, { foreignKey: "userId" });

// ─── User → Event (manager creates events) ──────────────────────────────────
db.User.hasMany(db.Event, { foreignKey: "managerId", as: "events", onDelete: "CASCADE" });
db.Event.belongsTo(db.User, { foreignKey: "managerId", as: "manager" });

// ─── Event → Booking ─────────────────────────────────────────────────────────
db.Event.hasMany(db.Booking, { foreignKey: "eventId", as: "bookings", onDelete: "CASCADE" });
db.Booking.belongsTo(db.Event, { foreignKey: "eventId", as: "event" });

// ─── User → Booking (customer) ──────────────────────────────────────────────
db.User.hasMany(db.Booking, { foreignKey: "customerId", as: "customerBookings", onDelete: "CASCADE" });
db.Booking.belongsTo(db.User, { foreignKey: "customerId", as: "customer" });

// ─── User → Booking (manager) ───────────────────────────────────────────────
db.User.hasMany(db.Booking, { foreignKey: "managerId", as: "managerBookings", onDelete: "SET NULL" });
db.Booking.belongsTo(db.User, { foreignKey: "managerId", as: "manager" });

// ─── Review relations ────────────────────────────────────────────────────────
db.EventManager.hasMany(db.Review, { foreignKey: "managerId", onDelete: "CASCADE" });
db.Review.belongsTo(db.EventManager, { foreignKey: "managerId" });

db.User.hasMany(db.Review, { foreignKey: "userId", as: "reviews", onDelete: "CASCADE" });
db.Review.belongsTo(db.User, { foreignKey: "userId", as: "user" });

// ─── Message relations ───────────────────────────────────────────────────────
db.Booking.hasMany(db.Message, { foreignKey: "bookingId", as: "messages", onDelete: "CASCADE" });
db.Message.belongsTo(db.Booking, { foreignKey: "bookingId", as: "booking" });
db.User.hasMany(db.Message, { foreignKey: "senderId", as: "sentMessages", onDelete: "CASCADE" });
db.Message.belongsTo(db.User, { foreignKey: "senderId", as: "sender" });

// ─── Notification relations ──────────────────────────────────────────────────
db.User.hasMany(db.Notification, { foreignKey: "userId", onDelete: "CASCADE" });
db.Notification.belongsTo(db.User, { foreignKey: "userId" });

// ─── AuditLog relations ──────────────────────────────────────────────────────
db.User.hasMany(db.AuditLog, { foreignKey: "adminId", onDelete: "SET NULL" });
db.AuditLog.belongsTo(db.User, { foreignKey: "adminId", as: "admin" });

// ─── Favorite relations ──────────────────────────────────────────────────────
db.User.hasMany(db.Favorite, { foreignKey: "userId", as: "favorites", onDelete: "CASCADE" });
db.Favorite.belongsTo(db.User, { foreignKey: "userId", as: "user" });
db.Event.hasMany(db.Favorite, { foreignKey: "eventId", as: "favorites", onDelete: "CASCADE" });
db.Favorite.belongsTo(db.Event, { foreignKey: "eventId", as: "event" });

module.exports = db;
