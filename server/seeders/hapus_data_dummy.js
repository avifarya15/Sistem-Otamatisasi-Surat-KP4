/**
 * hapus_data_dummy.js
 * Menghapus 23 data dummy pegawai lama (dan data keluarga terkait)
 * sehingga di database HANYA menyisakan 274 data ASN riil Disnakertrans dari Excel.
 */

const xlsx = require('xlsx');
const path = require('path');
const { Pegawai, Pasangan, Anak, sequelize } = require('../models');

const EXCEL_PATH = path.join(__dirname, '..', '..', 'DATA ASN SEPTEMBER 2026.xlsx');

async function cleanDummy() {
  console.log('=== MEMULAI PEMBERSIHAN DATA DUMMY PEGAWAI ===\n');

  // 1. Kumpulkan semua NIP ASN riil yang sah dari file Excel
  const wb = xlsx.readFile(EXCEL_PATH);
  const realNips = new Set();

  const sheets = ['STRUKTURAL', 'FUNGSIONAL', 'PELAKSANA', 'PARUH WAKTU', 'PENSIUN DAN MUTASI'];
  for (const sName of sheets) {
    const ws = wb.Sheets[sName];
    if (!ws) continue;
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    for (const r of rows) {
      if (!r) continue;
      for (let c = 0; c < r.length; c++) {
        const str = String(r[c] || '').replace(/['\s]/g, '');
        if (/^\d{18}$/.test(str)) {
          realNips.add(str);
        }
      }
    }
  }

  // Tambahkan NIP koreksi gender untuk Eka Wiratno
  realNips.add('199101292025211027');

  console.log(`Jumlah NIP ASN riil sah dari Excel: ${realNips.size}`);

  // 2. Ambil semua data pegawai di database
  const allPegawai = await Pegawai.findAll({ attributes: ['nip', 'nama', 'unit_kerja'] });
  console.log(`Total pegawai di DB saat ini: ${allPegawai.length}`);

  const dummyList = allPegawai.filter(p => !realNips.has(p.nip));
  console.log(`Ditemukan ${dummyList.length} data pegawai dummy yang akan dihapus:`);

  dummyList.forEach((d, i) => {
    console.log(`  ${i + 1}. NIP: ${d.nip} | ${d.nama} (${d.unit_kerja})`);
  });

  if (dummyList.length === 0) {
    console.log('\n[OK] Tidak ada data dummy yang perlu dihapus.');
    process.exit(0);
  }

  const dummyNips = dummyList.map(d => d.nip);

  // 3. Hapus data keluarga pasangan & anak yang terkait dengan NIP dummy
  const deletedPasangan = await Pasangan.destroy({ where: { nip: dummyNips } });
  console.log(`\n[OK] Berhasil menghapus ${deletedPasangan} data pasangan terkait dummy.`);

  const deletedAnak = await Anak.destroy({ where: { nip: dummyNips } });
  console.log(`[OK] Berhasil menghapus ${deletedAnak} data anak terkait dummy.`);

  // 4. Hapus data pegawai dummy
  const deletedPegawai = await Pegawai.destroy({ where: { nip: dummyNips } });
  console.log(`[OK] Berhasil menghapus ${deletedPegawai} data pegawai dummy.`);

  // 5. Cek sisa pegawai di database
  const remainingCount = await Pegawai.count();
  console.log(`\n======================================================`);
  console.log(`TOTAL PEGAWAI DI DATABASE SEKARANG: ${remainingCount} Orang (100% ASN Riil Disnakertrans)`);
  console.log(`======================================================`);

  process.exit(0);
}

cleanDummy().catch(err => {
  console.error('[ERROR CLEAN DUMMY]:', err);
  process.exit(1);
});
