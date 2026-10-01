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
  agama: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: null
  },
  kebangsaan: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Indonesia'
  },
  alamat: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Alamat/tempat tinggal pegawai untuk formulir KP4 (butir 11)'
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
  tmt_pangkat: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'TMT efektif golongan/pangkat saat ini. MKG otomatis dihitung dari tanggal ini.'
  },
  mkg_tahun: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mkg_bulan: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mkg_offset: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Offset MKG dalam tahun (negatif = potongan). Diisi admin untuk kasus naik pangkat lintas golongan utama. I→II: -6, II→III: -5'
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
