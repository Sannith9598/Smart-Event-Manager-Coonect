// Core user account - handles customers, managers, and admins.
// Password is excluded from queries by default via defaultScope.
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },

    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[0-9]{10}$/
      }
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    role: {
      type: DataTypes.ENUM("customer", "manager", "admin"),
      defaultValue: "customer"
    },

    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    verificationToken: {
      type: DataTypes.STRING
    },

    verificationTokenExpires: {   
      type: DataTypes.DATE
    },

    status: {
      type: DataTypes.ENUM("active", "blocked"),
      defaultValue: "active"
    },

    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },

    profilePhoto: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    defaultScope: {
      attributes: { exclude: ["password"] }
    }
  });

  User.associate = (models) => {
    User.hasMany(models.Verification, {
      foreignKey: "userId"
    });
  };

  return User;
};