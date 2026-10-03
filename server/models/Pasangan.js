const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Pegawai = require('./Pegawai');

const Pasangan = sequelize.define('Pasangan', {
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
    type: DataTypes.DATEONLY
  },
  pekerjaan: {
    type: DataTypes.STRING(100)
  },
  tanggal_menikah: {
    type: DataTypes.DATEONLY
  },
  penghasilan: {
    type: DataTypes.DECIMAL(15, 0),
    defaultValue: 0
  },
  nama_sekolah: {
    type: DataTypes.STRING(150),
    allowNull: true
  }
}, {
  tableName: 'pasangan',
  timestamps: true
});

module.exports = Pasangan;
