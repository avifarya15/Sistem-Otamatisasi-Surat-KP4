/**
 * migrasi_agama_kebangsaan.js
 * Menambah kolom agama dan kebangsaan ke tabel pegawai (jika belum ada).
 * Jalankan sekali: node server/migrations/migrasi_agama_kebangsaan.js
 */

const sequelize = require('../config/database');

async function run() {
  const qi = sequelize.getQueryInterface();

  try {
    await qi.addColumn('pegawai', 'agama', {
      type: require('sequelize').DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null
    });
    console.log('[OK] Kolom agama berhasil ditambahkan.');
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate column'))) {
      console.log('[SKIP] Kolom agama sudah ada.');
    } else {
      console.error('[ERROR] Gagal menambahkan agama:', err.message);
    }
  }

  try {
    await qi.addColumn('pegawai', 'kebangsaan', {
      type: require('sequelize').DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Indonesia'
    });
    console.log('[OK] Kolom kebangsaan berhasil ditambahkan.');
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate column'))) {
      console.log('[SKIP] Kolom kebangsaan sudah ada.');
    } else {
      console.error('[ERROR] Gagal menambahkan kebangsaan:', err.message);
    }
  }

  // Isi default kebangsaan untuk data yang masih null
  try {
    await sequelize.query(`
      UPDATE pegawai
      SET kebangsaan = 'Indonesia'
      WHERE kebangsaan IS NULL
    `);
    console.log('[OK] Default kebangsaan "Indonesia" diisi untuk pegawai yang masih kosong.');
  } catch (err) {
    console.error('[ERROR] Gagal mengisi default kebangsaan:', err.message);
  }

  try {
    await qi.addColumn('pegawai', 'alamat', {
      type: require('sequelize').DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });
    console.log('[OK] Kolom alamat berhasil ditambahkan.');
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate column'))) {
      console.log('[SKIP] Kolom alamat sudah ada.');
    } else {
      console.error('[ERROR] Gagal menambahkan alamat:', err.message);
    }
  }

  await sequelize.close();
  console.log('\nMigrasi agama & kebangsaan selesai!');
}

run();
