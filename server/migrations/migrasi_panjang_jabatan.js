const sequelize = require('../config/database');

async function run() {
  try {
    await sequelize.query('ALTER TABLE "pegawai" ALTER COLUMN "jabatan" TYPE VARCHAR(255);');
    console.log('[OK] Berhasil mengubah tipe kolom jabatan menjadi VARCHAR(255).');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Gagal alter column:', err.message);
    process.exit(1);
  }
}

run();
