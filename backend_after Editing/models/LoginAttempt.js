module.exports = (sequelize, DataTypes) => {
  const LoginAttempt = sequelize.define("LoginAttempt", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: "LoginAttempts",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["email"] },
    ],
  });

  return LoginAttempt;
};
