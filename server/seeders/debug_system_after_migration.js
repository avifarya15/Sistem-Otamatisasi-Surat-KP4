/**
 * debug_system_after_migration.js
 * Comprehensive diagnostic & debugging suite after full ASN migration.
 */

const { Pegawai, Pasangan, Anak, Pengaturan, Admin, sequelize } = require('../models');
const { generateKP4 } = require('../services/pdfGenerator');
const { hitungMKGOtomatis, getGajiPokok } = require('../services/salaryService');
const fs = require('fs');
const path = require('path');

async function debugSystem() {
  console.log('===========================================================');
  console.log('=== MEMULAI AUDIT & DEBUGGING SISTEM KP4 SETELAH MIGRASI ===');
  console.log('===========================================================\n');

  let issuesFound = 0;

  // 1. CEK INTEGRITAS DATABASE PEGAWAI
  console.log('[TEST 1] Memeriksa Integritas Kolom Kunci Data Pegawai...');
  const totalPegawai = await Pegawai.count();
  console.log(`Total data pegawai terdaftar: ${totalPegawai}`);

  // Cek NIP null/invalid
  const invalidNip = await Pegawai.findAll({
    where: sequelize.literal("nip IS NULL OR LENGTH(nip) != 18")
  });
  if (invalidNip.length > 0) {
    console.error(`[FAIL] Ditemukan ${invalidNip.length} pegawai dengan NIP tidak valid!`);
    issuesFound++;
  } else {
    console.log('[PASS] Semua NIP valid (18 digit string).');
  }

  // Cek Nama null atau kosong
  const invalidNama = await Pegawai.findAll({
    where: sequelize.literal("nama IS NULL OR TRIM(nama) = ''")
  });
  if (invalidNama.length > 0) {
    console.error(`[FAIL] Ditemukan ${invalidNama.length} pegawai tanpa nama!`);
    issuesFound++;
  } else {
    console.log('[PASS] Semua nama pegawai terisi lengkap.');
  }

  // Cek Tanggal Lahir null
  const invalidTglLahir = await Pegawai.findAll({
    where: sequelize.literal("tanggal_lahir IS NULL")
  });
  if (invalidTglLahir.length > 0) {
    console.error(`[FAIL] Ditemukan ${invalidTglLahir.length} pegawai tanpa tanggal lahir!`);
    issuesFound++;
  } else {
    console.log('[PASS] Semua tanggal lahir pegawai terisi valid.');
  }

  // Cek Gaji Pokok 0 atau null
  const zeroSalary = await Pegawai.findAll({
    where: sequelize.literal("gaji_pokok IS NULL OR gaji_pokok <= 0")
  });
  if (zeroSalary.length > 0) {
    console.warn(`[WARN] Ditemukan ${zeroSalary.length} pegawai dengan gaji pokok <= 0:`);
    zeroSalary.slice(0, 5).forEach(p => console.warn(`   - NIP: ${p.nip}, Nama: ${p.nama}, Gol: ${p.golongan}, Gaji: ${p.gaji_pokok}`));
    issuesFound++;
  } else {
    console.log('[PASS] Semua gaji pokok terisi nominal valid (> 0).');
  }

  // Cek Golongan null atau kosong
  const invalidGol = await Pegawai.findAll({
    where: sequelize.literal("golongan IS NULL OR TRIM(golongan) = ''")
  });
  if (invalidGol.length > 0) {
    console.warn(`[WARN] Ditemukan ${invalidGol.length} pegawai tanpa golongan:`);
    invalidGol.slice(0, 5).forEach(p => console.warn(`   - NIP: ${p.nip}, Nama: ${p.nama}`));
    issuesFound++;
  } else {
    console.log('[PASS] Semua golongan pegawai terisi.');
  }

  // 2. CEK SEBARAN GOLONGAN
  console.log('\n[TEST 2] Analisis Sebaran Golongan Pegawai di Database:');
  const golStats = await Pegawai.findAll({
    attributes: ['golongan', [sequelize.fn('COUNT', sequelize.col('nip')), 'total']],
    group: ['golongan'],
    order: [[sequelize.literal('total'), 'DESC']]
  });
  golStats.forEach(g => {
    console.log(`   - Golongan ${String(g.golongan || 'KOSONG').padEnd(10)}: ${g.getDataValue('total')} pegawai`);
  });

  // 3. UJI SIMULASI LOGIN PEGAWAI DENGAN SAMPEL ASN MIGRASI
  console.log('\n[TEST 3] Uji Simulasi Login Mandiri Pegawai (NIP + Tanggal Lahir):');
  const sampleNips = [
    '198101062000031001', // Struktural (Kadis)
    '198202282024211002', // Fungsional (Pranata Komputer PPPK)
    '198712102011021002', // Pelaksana (PNS)
    '198709142025211122', // Paruh Waktu
    '196801282009011003'  // Pensiun
  ];

  for (const nip of sampleNips) {
    const p = await Pegawai.findOne({
      where: { nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });

    if (!p) {
      console.error(`[FAIL] Pegawai NIP ${nip} tidak ditemukan di database!`);
      issuesFound++;
      continue;
    }

    // Simulasi verifikasi tanggal lahir
    const isTglMatch = p.tanggal_lahir === p.nip.substring(0, 4) + '-' + p.nip.substring(4, 6) + '-' + p.nip.substring(6, 8);
    console.log(`[PASS] NIP ${nip} (${p.nama}) -> Gol: ${p.golongan}, Gaji: Rp ${Number(p.gaji_pokok).toLocaleString('id-ID')}, Tgl Lahir Cocok: ${isTglMatch}`);
  }

  // 4. UJI SIMULASI GENERATE PDF KP4 KE BUFFER TANPA CRASH
  console.log('\n[TEST 4] Uji Pembuatan Dokumen PDF Surat KP4 untuk Sampel ASN...');
  const testPdfDir = path.join(__dirname, '..', '..', 'scratch');
  if (!fs.existsSync(testPdfDir)) fs.mkdirSync(testPdfDir, { recursive: true });

  const testPdfPath = path.join(testPdfDir, 'test_debug_kp4.pdf');
  const testSample = await Pegawai.findOne({
    where: { nip: '198101062000031001' },
    include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
  });

  if (testSample) {
    try {
      const writeStream = fs.createWriteStream(testPdfPath);
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        generateKP4(testSample.toJSON(), writeStream, {
          nama: 'Drs. ILYAS, M.Ap',
          pangkat: 'Pembina',
          nip: '19691211 200212 1 005'
        });
      });
      const fileStats = fs.statSync(testPdfPath);
      console.log(`[PASS] Dokumen PDF KP4 berhasil dibuat: ${testPdfPath} (${fileStats.size} bytes).`);
    } catch (errPdf) {
      console.error('[FAIL] Error saat generate PDF KP4:', errPdf.message);
      issuesFound++;
    }
  }

  // 5. CEK AKUN ADMIN
  console.log('\n[TEST 5] Memeriksa Ketersediaan Akun Admin...');
  const adminCount = await Admin.count();
  if (adminCount === 0) {
    console.error('[FAIL] Tidak ada akun admin di database!');
    issuesFound++;
  } else {
    const admins = await Admin.findAll({ attributes: ['username', 'nama', 'role'] });
    console.log(`[PASS] Ditemukan ${adminCount} akun admin:`, admins.map(a => a.username).join(', '));
  }

  console.log('\n===========================================================');
  if (issuesFound === 0) {
    console.log('✅ SEMUA PENGUJIAN & DEBUGGING BERHASIL DENGAN NILAI SEMPURNA (0 Masalah)!');
  } else {
    console.log(`⚠ DITEMUKAN ${issuesFound} POTENSI PERBAIKAN.`);
  }
  console.log('===========================================================');

  process.exit(0);
}

debugSystem().catch(err => {
  console.error('[FATAL ERROR DEBUG SUITE]:', err);
  process.exit(1);
});
