/**
 * migrasi_nama_sekolah_pasangan.js
 * Menambah kolom nama_sekolah ke tabel pasangan (jika belum ada).
 * Acuan: Butir formulir KP4 resmi (Nama Sekolah / Perguruan Tinggi Pasangan)
 */

const sequelize = require('../config/database');

async function run() {
  const qi = sequelize.getQueryInterface();

  try {
    await qi.addColumn('pasangan', 'nama_sekolah', {
      type: require('sequelize').DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null
    });
    console.log('[OK] Kolom nama_sekolah berhasil ditambahkan ke tabel pasangan.');
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate column'))) {
      console.log('[SKIP] Kolom nama_sekolah sudah ada di tabel pasangan.');
    } else {
      console.error('[ERROR] Gagal menambahkan nama_sekolah:', err.message);
    }
  }

  process.exit(0);
}

run();
