// Extended profile for users with the "manager" role.
// Stores business info, verification status, portfolio, and past events.
module.exports = (sequelize, DataTypes) => {
  const EventManager = sequelize.define("EventManager", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    location: DataTypes.STRING,
    price: DataTypes.FLOAT,
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    description: DataTypes.TEXT,
    portfolioUrl: DataTypes.STRING,
    // Verification fields
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationStatus: {
      type: DataTypes.ENUM('not_submitted', 'pending', 'approved', 'rejected'),
      defaultValue: 'not_submitted'
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    businessTypes: {
      type: DataTypes.JSON,
      defaultValue: []
    },
     serviceAreas: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    yearsOfExperience: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    portfolioImages: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    // pastEvents JSON structure:
    // [
    //   {
    //     title: "string",
    //     description: "string",
    //     date: "2024-01-15",
    //     clientName: "string (optional)",
    //     imageUrl: "string (legacy)",
    //     media: [
    //       { url: "string", publicId: "string", mediaType: "image"|"video" }
    //     ],
    //     cost: 50000 (optional),
    //     source: "verification" | "manual",
    //     addedAt: "2024-06-01T00:00:00Z"
    //   }
    // ]
    pastEvents: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    verificationRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'EventManagers',
    indexes: [
      { unique: true, fields: ["userId"] },
      { fields: ["isVerified"] },
      { fields: ["verificationStatus"] },
    ]
  });

  return EventManager;
};