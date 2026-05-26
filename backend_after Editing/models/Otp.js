// Stores one-time passwords for email verification and password resets.
// OTPs expire after a set time and are marked as used once consumed.
module.exports = (sequelize, DataTypes) => {
  const Otp = sequelize.define("Otp", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    purpose: {
      type: DataTypes.ENUM("registration", "password_reset"),
      allowNull: false,
      defaultValue: "registration",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: "Otps",
    timestamps: true,
    indexes: [
      { fields: ["email", "purpose"] },
      { fields: ["expiresAt"] },
    ],
  });

  return Otp;
};
