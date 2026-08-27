const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pegawai = sequelize.define('Pegawai', {
  nip: {
    type: DataTypes.STRING(18),
    primaryKey: true,
    allowNull: false
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
  golongan: {
    type: DataTypes.STRING(10)
  },
  jabatan: {
    type: DataTypes.STRING(100)
  },
  unit_kerja: {
    type: DataTypes.STRING(150)
  },
  gaji_pokok: {
    type: DataTypes.DECIMAL(15, 2)
  }
}, {
  tableName: 'pegawai',
  timestamps: true
});

module.exports = Pegawai;
