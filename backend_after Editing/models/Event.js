// An event service listing created by a manager.
// Holds pricing, availability, customization options, and review stats.
module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define("Event", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    category: {
      type: DataTypes.STRING,
      defaultValue: "event",
    },

    description: {
      type: DataTypes.TEXT,
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    duration: {
      type: DataTypes.STRING, 
      allowNull: true,
    },

    maxGuests: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    includes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    images: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    status: {
      type: DataTypes.ENUM("available", "unavailable"),
      defaultValue: "available",
    },

    managerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',  
        key: 'id'
      }
    },

    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 5 },
    },

    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    baseCustomizations: {
      type: DataTypes.JSON,
      defaultValue: {
        catering: false,
        decoration: false,
        photography: false,
        music: false,
        transport: false,
      },
    },

    addonPrices: {
      type: DataTypes.JSON,
      defaultValue: {
        catering: 0,
        decoration: 0,
        photography: 0,
        music: 0,
        transport: 0,
      },
    },

    // Detailed addon services with sub-categories and items
    // Structure: {
    //   catering: { enabled: true, categories: [{ name: "Indian", items: [{ name: "Biryani", rate: 250, unit: "per plate" }] }] },
    //   decoration: { enabled: true, categories: [{ name: "Floral", items: [{ name: "Flower Arch", rate: 3000, unit: "per unit" }] }] },
    //   photography: { enabled: true, categories: [{ name: "Indoor", items: [{ name: "2-hour coverage", rate: 8000, unit: "per session" }] }] },
    //   music: { enabled: true, categories: [{ name: "DJ", items: [{ name: "DJ Setup 4hrs", rate: 10000, unit: "per event" }] }] },
    //   transport: { enabled: true, categories: [{ name: "Luxury", items: [{ name: "Sedan", rate: 2000, unit: "per trip" }] }] }
    // }
    addonServices: {
      type: DataTypes.JSON,
      defaultValue: {},
    },

    // Custom add-ons defined by the manager (flexible packages)
    // Structure: [{ name: "string", price: number, description: "string (optional)" }]
    customAddons: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    perExtraGuestPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    availableDates: {
      type: DataTypes.JSON, 
      defaultValue: [],
    },

    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },

  }, {
    tableName: "Events",
    timestamps: true,
    indexes: [
      { fields: ["managerId"] },
      { fields: ["status"] },
      { fields: ["category"] },
      { fields: ["managerId", "status"] },
    ],
  });

  Event.associate = (models) => {
    Event.belongsTo(models.User, {
      foreignKey: "managerId",
      as: 'manager'
    });

    Event.hasMany(models.Booking, {
      foreignKey: "eventId",
      as: 'bookings'
    });

    Event.hasMany(models.Review, {
      foreignKey: "eventId",
      as: 'reviews'
    });
  };

  return Event;
};