module.exports = (sequelize, DataTypes) => {
  const Favorite = sequelize.define("Favorite", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: "Favorites",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "eventId"],
      },
    ],
  });

  Favorite.associate = (models) => {
    Favorite.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Favorite.belongsTo(models.Event, { foreignKey: "eventId", as: "event" });
  };

  return Favorite;
};
