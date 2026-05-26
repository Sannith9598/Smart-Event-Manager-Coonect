// Represents a customer's booking for an event service.
// Tracks pricing, status, add-ons, and links the customer to the event/manager.
module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define("Booking", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    eventDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    guests: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    specialRequests: {
      type: DataTypes.TEXT,
    },

    selectedAddons: {
      type: DataTypes.JSON,
      defaultValue: {},
    },

    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    // Price added by manager for special requests
    specialRequestPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    // Final price including special request charges (totalPrice + specialRequestPrice - discountAmount)
    finalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    // Discount applied by manager
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    discountReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Custom add-ons selected by customer (from manager's customAddons list)
    // Structure: [{ name: "string", price: number }]
    selectedCustomAddons: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    // Detailed service items selected by customer
    // Structure: { catering: { "Indian": [{ name: "Biryani", quantity: 10 }] }, decoration: { ... } }
    selectedServiceItems: {
      type: DataTypes.JSON,
      defaultValue: {},
    },

    status: {
      type: DataTypes.ENUM("pending", "confirmed", "rejected", "cancelled", "completed"),
      defaultValue: "pending",
    },

    bookingDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    confirmedDate: {
  type: DataTypes.DATEONLY,
},

confirmedTime: {
  type: DataTypes.STRING,
},

depositAmount: {
  type: DataTypes.DECIMAL(10, 2),
  defaultValue: 0,
},

notes: {
  type: DataTypes.TEXT,
},

completedAt: {
  type: DataTypes.DATE,
  allowNull: true,
},

  }, {
    tableName: "Bookings",
    timestamps: true,
    indexes: [
      { fields: ["customerId"] },
      { fields: ["managerId"] },
      { fields: ["eventId"] },
      { fields: ["status"] },
      { fields: ["eventDate"] },
      { fields: ["customerId", "eventId", "eventDate"] },
      { fields: ["managerId", "status"] },
    ],
  });

  Booking.associate = (models) => {

    Booking.belongsTo(models.User, {
      foreignKey: "customerId",
      as: "customer"
    });

    Booking.belongsTo(models.User, {
      foreignKey: "managerId",
      as: "manager"
    });

    Booking.belongsTo(models.Event, {
      foreignKey: "eventId",
      as: "event"
    });
  };

  return Booking;
};