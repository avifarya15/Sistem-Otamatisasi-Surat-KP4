/**
 * migrasi_semua_asn.js
 * Script migrasi otomatis untuk memuat seluruh data ASN dari file Excel "DATA ASN SEPTEMBER 2026.xlsx"
 * ke dalam basis data PostgreSQL.
 *
 * Mengakomodasi 5 kategori sheet:
 * 1. STRUKTURAL
 * 2. FUNGSIONAL
 * 3. PELAKSANA
 * 4. PARUH WAKTU
 * 5. PENSIUN DAN MUTASI
 *
 * Menghitung otomatis:
 * - Tanggal Lahir (dari 8 digit pertama NIP)
 * - TMT CPNS / Pengangkatan (dari digit 9-14 NIP)
 * - MKG Otomatis (Tahun & Bulan)
 * - Gaji Pokok 2024 resmi (PP No. 5 Tahun 2024 & Perpres No. 11 Tahun 2024)
 * - Mempertahankan data keluarga (pasangan/anak), agama, dan alamat yang sudah ada (aman tanpa overwrite).
 */

const path = require('path');
const xlsx = require('xlsx');
const { sequelize, Pegawai } = require('../models');
const {
  normalizeGolongan,
  hitungMKGOtomatis,
  getGajiPokok
} = require('../services/salaryService');

const EXCEL_PATH = path.join(__dirname, '..', '..', 'DATA ASN SEPTEMBER 2026.xlsx');

/**
 * Helper untuk parsing tanggal lahir dari NIP
 * NIP: YYYYMMDD YYYYMM G NNN (18 digit)
 */
function extractBirthDateFromNip(nip) {
  if (!nip || nip.length < 8) return null;
  const yyyy = nip.substring(0, 4);
  const mm = nip.substring(4, 6);
  const dd = nip.substring(6, 8);
  const y = Number(yyyy);
  const m = Number(mm);
  const d = Number(dd);
  if (y >= 1940 && y <= 2015 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Helper untuk parsing TMT CPNS dari NIP
 *
 * Format NIP standar: YYYYMMDD YYYYMM G NNN (18 digit)
 * - Digit 9-12: Tahun pengangkatan/CPNS
 * - Digit 13-14: Bulan pengangkatan (01-12 untuk PNS)
 *                Untuk PPPK, kode ini bisa berupa angka > 12 (mis. 20, 21)
 *                yang merupakan kode khusus PPPK, bukan bulan kalender.
 *
 * Jika kode bulan > 12 (PPPK), fallback ke 01 Januari tahun pengangkatan.
 */
function extractTmtCpnsFromNip(nip) {
  if (!nip || nip.length < 14) return null;
  const yyyy = nip.substring(8, 12);
  const mm = nip.substring(12, 14);
  const y = Number(yyyy);
  const m = Number(mm);
  if (y >= 1970 && y <= 2030) {
    if (m >= 1 && m <= 12) {
      // NIP standar PNS - bulan valid
      return `${yyyy}-${mm.padStart(2, '0')}-01`;
    } else if (m >= 13) {
      // NIP PPPK - kode angka bukan bulan, gunakan 01 Januari
      return `${yyyy}-01-01`;
    }
  }
  return null;
}

/**
 * Helper estimasi golongan untuk PPPK Paruh Waktu berdasarkan pendidikan
 */
function estimateGolonganFromPendidikan(pendidikan) {
  if (!pendidikan) return 'V';
  const p = String(pendidikan).toUpperCase();
  if (p.includes('S3')) return 'XI';
  if (p.includes('S2')) return 'X';
  if (p.includes('S1') || p.includes('D4') || p.includes('SARJANA')) return 'IX';
  if (p.includes('D3') || p.includes('D-III')) return 'VII';
  if (p.includes('D1') || p.includes('D2')) return 'VI';
  if (p.includes('SMA') || p.includes('SMK') || p.includes('SLTA')) return 'V';
  if (p.includes('SMP') || p.includes('SLTP')) return 'IV';
  if (p.includes('SD')) return 'I';
  return 'V';
}

async function runMigration() {
  console.log('=== MEMULAI MIGRASI DATA ASN SEPTEMBER 2026 KE DATABASE ===');
  console.log('Membaca file Excel:', EXCEL_PATH);

  const wb = xlsx.readFile(EXCEL_PATH);
  const stats = {
    totalParsed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    perSheet: {}
  };

  const sheetsConfig = [
    {
      name: 'STRUKTURAL',
      headerRow: 3,
      colNip: 2,
      colNama: 1,
      colGol: 4,
      colJabatan: 7,
      colUnit: 11,
      kategori: 'Struktural'
    },
    {
      name: 'FUNGSIONAL',
      headerRow: 4,
      colNip: 2,
      colNama: 1,
      colGol: 5,
      colJabatan: 8,
      colUnit: 9,
      kategori: 'Fungsional'
    },
    {
      name: 'PELAKSANA',
      headerRow: 4,
      colNip: 2,
      colNama: 1,
      colGol: 5,
      colJabatan: 8,
      colUnit: 9,
      kategori: 'Pelaksana'
    },
    {
      name: 'PARUH WAKTU',
      headerRow: 4,
      colNip: 2,
      colNama: 1,
      colGol: null, // Berdasarkan pendidikan di col 5
      colPendidikan: 5,
      colJabatan: 6,
      colUnit: 7,
      kategori: 'PPPK Paruh Waktu'
    },
    {
      name: 'PENSIUN DAN MUTASI',
      headerRow: 2,
      colNip: 2,
      colNama: 1,
      colGol: 5,
      colJabatan: 8,
      colUnit: 9,
      kategori: 'Pensiun/Mutasi'
    }
  ];

  const processedNips = new Set();

  for (const cfg of sheetsConfig) {
    const ws = wb.Sheets[cfg.name];
    if (!ws) {
      console.warn(`[WARN] Sheet ${cfg.name} tidak ditemukan.`);
      continue;
    }

    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    stats.perSheet[cfg.name] = { total: 0, inserted: 0, updated: 0 };
    console.log(`\nMemproses sheet [${cfg.name}] (baris raw: ${rows.length})...`);

    for (let rIdx = cfg.headerRow + 1; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row || row.length === 0) continue;

      // Ambil NIP mentah
      let rawNipVal = row[cfg.colNip];
      if (!rawNipVal) {
        // Coba scan cell lain jika kolom bergeser
        for (let c = 0; c < row.length; c++) {
          const s = String(row[c] || '').replace(/['\s]/g, '');
          if (/^\d{18}$/.test(s)) {
            rawNipVal = s;
            break;
          }
        }
      }

      if (!rawNipVal) continue;

      let cleanNip = String(rawNipVal).replace(/['\s]/g, '');
      if (!/^\d{18}$/.test(cleanNip)) continue;

      // Ambil nama
      let rawNama = row[cfg.colNama];
      if (!rawNama || typeof rawNama !== 'string' || rawNama.trim() === '') {
        continue;
      }
      const nama = rawNama.trim();

      // Kasus khusus penanganan duplikasi ketik NIP di sheet Pelaksana:
      // EKA WIRATNO (Laki-laki) salah ketik digit 15 menjadi 2 (sehingga sama dengan Syahriana)
      if (cleanNip === '199101292025212027' && nama.toUpperCase().includes('EKA WIRATNO')) {
        cleanNip = '199101292025211027'; // Koreksi digit gender menjadi 1 (Pria)
        console.log(`[INFO] Koreksi digit NIP pria untuk Eka Wiratno -> ${cleanNip}`);
      }

      // Deteksi duplikasi di sheet berikutnya
      if (processedNips.has(cleanNip)) {
        console.log(`[SKIP DUPLIKAT] NIP ${cleanNip} (${nama}) sudah diproses sebelumnya.`);
        stats.skipped++;
        continue;
      }
      processedNips.add(cleanNip);
      stats.totalParsed++;
      stats.perSheet[cfg.name].total++;

      // Tanggal lahir & TMT CPNS
      const tanggalLahir = extractBirthDateFromNip(cleanNip);
      const tmtCpns = extractTmtCpnsFromNip(cleanNip);

      if (!tanggalLahir) {
        console.warn(`[WARN] NIP ${cleanNip} (${nama}) tanggal lahir tidak valid.`);
      }

      // Golongan
      let golongan = '';
      if (cfg.colGol != null && row[cfg.colGol]) {
        golongan = normalizeGolongan(row[cfg.colGol]);
      } else if (cfg.colPendidikan != null && row[cfg.colPendidikan]) {
        golongan = estimateGolonganFromPendidikan(row[cfg.colPendidikan]);
      } else {
        golongan = 'III/a';
      }

      // Jabatan
      const jabatan = row[cfg.colJabatan] ? String(row[cfg.colJabatan]).trim() : 'Pegawai';

      // Unit Kerja
      let unitKerja = row[cfg.colUnit] ? String(row[cfg.colUnit]).trim() : '';
      if (!unitKerja) {
        unitKerja = 'Dinas Tenaga Kerja dan Transmigrasi';
      }

      // Hitung MKG otomatis
      const mkgOtomatis = hitungMKGOtomatis(tmtCpns, tmtCpns, 0);
      const mkgTahun = mkgOtomatis.tahun;
      const mkgBulan = mkgOtomatis.bulan;

      // Hitung Gaji Pokok 2024
      let gajiPokok = getGajiPokok(golongan, mkgTahun);
      if (!gajiPokok || gajiPokok <= 0) {
        gajiPokok = 2785700; // Standar fallback
      }

      // Cek apakah pegawai sudah ada di database
      try {
        const existing = await Pegawai.findOne({ where: { nip: cleanNip } });

        if (existing) {
          // Update data kepegawaian tanpa menimpa data yang mungkin sudah diisi oleh pegawai/admin
          await existing.update({
            nama,
            golongan,
            jabatan,
            unit_kerja: unitKerja,
            tanggal_lahir: tanggalLahir || existing.tanggal_lahir,
            tmt_cpns: existing.tmt_cpns || tmtCpns,
            tmt_pangkat: existing.tmt_pangkat || tmtCpns,
            mkg_tahun: existing.mkg_tahun || mkgTahun,
            mkg_bulan: existing.mkg_bulan != null ? existing.mkg_bulan : mkgBulan,
            gaji_pokok: existing.gaji_pokok || gajiPokok
          });
          stats.updated++;
          stats.perSheet[cfg.name].updated++;
        } else {
          // Buat baru
          await Pegawai.create({
            nip: cleanNip,
            nama,
            tempat_lahir: 'Palu', // Default lokasi instansi
            tanggal_lahir: tanggalLahir || '1985-01-01',
            golongan,
            jabatan,
            unit_kerja: unitKerja,
            gaji_pokok: gajiPokok,
            tmt_cpns: tmtCpns,
            tmt_pangkat: tmtCpns,
            tmt_kgb_terakhir: tmtCpns,
            mkg_tahun: mkgTahun,
            mkg_bulan: mkgBulan,
            mkg_offset: 0,
            status_kgb: cfg.name === 'PENSIUN DAN MUTASI' ? 'Pensiun' : 'Normal',
            kebangsaan: 'Indonesia'
          });
          stats.created++;
          stats.perSheet[cfg.name].inserted++;
        }
      } catch (err) {
        console.error(`[ERROR] Gagal menyimpan NIP ${cleanNip} (${nama}):`, err.message);
        stats.errors++;
      }
    }
  }

  console.log('\n================== RINGKASAN MIGRASI ==================');
  console.log(`Total Data ASN Terbaca   : ${stats.totalParsed}`);
  console.log(`Pegawai Baru Ditambahkan : ${stats.created}`);
  console.log(`Pegawai Sudah Ada (Update): ${stats.updated}`);
  console.log(`Data Dilewati (Duplikat) : ${stats.skipped}`);
  console.log(`Error Tersimpan          : ${stats.errors}`);
  console.log('Rincian per Kategori Sheet:');
  for (const [sName, sData] of Object.entries(stats.perSheet)) {
    console.log(` - ${sName.padEnd(20)}: ${sData.total} pegawai (${sData.inserted} baru, ${sData.updated} update)`);
  }

  const finalCount = await Pegawai.count();
  console.log(`\nTOTAL PEGAWAI DI BASIS DATA SEKARANG: ${finalCount} Orang`);
  console.log('=======================================================');

  process.exit(0);
}

runMigration().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
