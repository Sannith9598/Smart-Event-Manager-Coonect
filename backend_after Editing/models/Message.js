module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define("Message", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: "Messages",
    timestamps: true,
    indexes: [
      { fields: ["bookingId"] },
      { fields: ["senderId"] },
      { fields: ["receiverId"] },
      { fields: ["receiverId", "isRead"] },
    ],
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Booking, { foreignKey: "bookingId", as: "booking" });
    Message.belongsTo(models.User, { foreignKey: "senderId", as: "sender" });
    Message.belongsTo(models.User, { foreignKey: "receiverId", as: "receiver" });
  };

  return Message;
};
