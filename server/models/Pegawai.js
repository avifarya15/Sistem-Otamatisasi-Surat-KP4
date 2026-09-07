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
  },
  tmt_cpns: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  tmt_kgb_terakhir: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  mkg_tahun: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mkg_bulan: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status_kgb: {
    type: DataTypes.STRING(20),
    defaultValue: 'Normal'
  }
}, {
  tableName: 'pegawai',
  timestamps: true
});

module.exports = Pegawai;
