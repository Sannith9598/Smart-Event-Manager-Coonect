module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define("Review", {
    userId: DataTypes.INTEGER,
    managerId: DataTypes.INTEGER,
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
      { fields: ["userId"] },
      { unique: true, fields: ["userId", "managerId"] },
    ],
  });

  Review.associate = (models) => {
    Review.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return Review;
};