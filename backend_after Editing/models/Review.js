// Customer reviews for events/managers. Supports manager responses.
// One review per user per event booking to prevent duplicates.
module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define("Review", {
    userId: DataTypes.INTEGER,
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rating: DataTypes.FLOAT,
    comment: DataTypes.TEXT,
    // Manager response (#15)
    managerResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    managerRespondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    indexes: [
      { fields: ["managerId"] },
      { fields: ["eventId"] },
      { fields: ["userId"] },
      { unique: true, fields: ["userId", "managerId"] },
    ],
  });

  Review.associate = (models) => {
    Review.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    Review.belongsTo(models.Event, {
      foreignKey: "eventId",
      as: "event",
    });
  };

  return Review;
};