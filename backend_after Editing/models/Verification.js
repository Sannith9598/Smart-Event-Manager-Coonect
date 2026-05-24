module.exports = (sequelize, DataTypes) => {
  const Verification = sequelize.define("Verification", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: false
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
      allowNull: false
    },
    description: DataTypes.TEXT,
    portfolioLinks: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    pastEvents: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending"
    },
    rejectionReason: DataTypes.TEXT,
    reviewedBy: DataTypes.INTEGER,
    reviewedAt: DataTypes.DATE,
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: "Verifications",
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["status"] },
      { fields: ["userId", "status"] },
    ]
  });

  Verification.associate = (models) => {
    Verification.belongsTo(models.User, {
      foreignKey: "userId"
    });
  };

  return Verification;
};