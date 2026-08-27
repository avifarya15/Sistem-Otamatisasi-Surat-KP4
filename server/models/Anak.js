const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Pegawai = require('./Pegawai');

const Anak = sequelize.define('Anak', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nip: {
    type: DataTypes.STRING(18),
    allowNull: false,
    references: {
      model: Pegawai,
      key: 'nip'
    }
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tempat_lahir: {
    type: DataTypes.STRING(50)
  },
  tanggal_lahir: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status_anak: {
    type: DataTypes.STRING(20),
    defaultValue: 'Kandung'
  },
  status_pendidikan: {
    type: DataTypes.STRING(30)
  }
}, {
  tableName: 'anak',
  timestamps: true
});

module.exports = Anak;
