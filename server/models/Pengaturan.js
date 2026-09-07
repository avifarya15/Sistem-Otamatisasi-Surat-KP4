const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pengaturan = sequelize.define('Pengaturan', {
  kunci: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  nilai: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  keterangan: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'pengaturan',
  timestamps: true
});

module.exports = Pengaturan;
