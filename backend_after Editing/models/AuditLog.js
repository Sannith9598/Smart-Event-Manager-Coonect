// Tracks admin actions like approving verifications, blocking users, etc.
// Used for accountability and audit trail in the admin panel.
module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define("AuditLog", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      // Actions: approve_verification, reject_verification, block_customer, unblock_customer, verify_manager, unverify_manager
    },
    targetType: {
      type: DataTypes.STRING,
      allowNull: false,
      // Types: user, manager, verification, booking
    },
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: "AuditLogs",
    timestamps: true,
    indexes: [
      { fields: ["adminId"] },
      { fields: ["action"] },
      { fields: ["targetType", "targetId"] },
      { fields: ["createdAt"] },
    ],
  });

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: "adminId", as: "admin" });
  };

  return AuditLog;
};
