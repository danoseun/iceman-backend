module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    type: DataTypes.STRING,
    date: DataTypes.DATE
  }, { });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      references: {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      }
    });
  };
  return Notification;
};