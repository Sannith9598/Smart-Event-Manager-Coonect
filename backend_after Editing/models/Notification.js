// In-app notifications for users (booking updates, verification results, etc.).
// Supports read/unread state and optional deep links.
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define("Notification", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: "info",
      // Types: booking_new, booking_confirmed, booking_rejected, booking_completed, verification_approved, verification_rejected, message, system
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: "Notifications",
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["userId", "isRead"] },
      { fields: ["createdAt"] },
    ],
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Notification;
};
