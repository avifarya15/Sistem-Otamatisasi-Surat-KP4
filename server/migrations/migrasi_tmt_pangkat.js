/**
 * migrasi_tmt_pangkat.js
 * Menambah kolom tmt_pangkat dan mkg_offset ke tabel pegawai (jika belum ada).
 * Jalankan sekali: node server/migrations/migrasi_tmt_pangkat.js
 */

const sequelize = require('../config/database');

async function run() {
  const qi = sequelize.getQueryInterface();

  try {
    // Tambah kolom tmt_pangkat
    await qi.addColumn('pegawai', 'tmt_pangkat', {
      type: require('sequelize').DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null
    });
    console.log('[OK] Kolom tmt_pangkat berhasil ditambahkan.');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('[SKIP] Kolom tmt_pangkat sudah ada, tidak perlu ditambahkan.');
    } else {
      console.error('[ERROR] Gagal menambahkan tmt_pangkat:', err.message);
    }
  }

  try {
    // Tambah kolom mkg_offset
    await qi.addColumn('pegawai', 'mkg_offset', {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    console.log('[OK] Kolom mkg_offset berhasil ditambahkan.');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('[SKIP] Kolom mkg_offset sudah ada, tidak perlu ditambahkan.');
    } else {
      console.error('[ERROR] Gagal menambahkan mkg_offset:', err.message);
    }
  }

  // Isi tmt_pangkat dengan tmt_cpns untuk semua pegawai yang tmt_pangkat masih null
  try {
    const [result] = await sequelize.query(`
      UPDATE pegawai
      SET tmt_pangkat = tmt_cpns
      WHERE tmt_pangkat IS NULL AND tmt_cpns IS NOT NULL
    `);
    console.log('[OK] tmt_pangkat diisi otomatis dari tmt_cpns untuk pegawai yang belum diisi.');
  } catch (err) {
    console.error('[ERROR] Gagal mengisi tmt_pangkat dari tmt_cpns:', err.message);
  }

  await sequelize.close();
  console.log('\nMigrasi selesai!');
}

run();
