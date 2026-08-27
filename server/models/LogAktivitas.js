const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Admin = require('./Admin');

const LogAktivitas = sequelize.define('LogAktivitas', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  admin_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Admin,
      key: 'id'
    }
  },
  admin_username: {
    type: DataTypes.STRING(50)
  },
  aksi: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  detail: {
    type: DataTypes.TEXT
  },
  ip_address: {
    type: DataTypes.STRING(45)
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'log_aktivitas',
  timestamps: false
});

module.exports = LogAktivitas;
