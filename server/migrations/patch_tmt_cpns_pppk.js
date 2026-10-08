/**
 * patch_tmt_cpns_pppk.js
 * Patch untuk memperbaiki tmt_cpns null pada pegawai PPPK.
 * NIP PPPK digit 13-14 menggunakan kode angka > 12 (mis. 20, 21).
 * Jalankan: node server/migrations/patch_tmt_cpns_pppk.js
 */

const { sequelize, Pegawai } = require('../models');
const { hitungMKGOtomatis, getGajiPokok } = require('../services/salaryService');

function extractTmtCpnsFromNip(nip) {
  if (!nip || nip.length < 14) return null;
  const yyyy = nip.substring(8, 12);
  const mm = nip.substring(12, 14);
  const y = Number(yyyy);
  const m = Number(mm);
  if (y >= 1970 && y <= 2030) {
    if (m >= 1 && m <= 12) return yyyy + '-' + mm.padStart(2, '0') + '-01';
    if (m >= 13) return yyyy + '-01-01';
  }
  return null;
}

async function runPatch() {
  console.log('=== PATCH: Fix tmt_cpns PPPK (kode bulan > 12) ===');
  const list = await Pegawai.findAll({ where: sequelize.literal(' tmt_cpns IS NULL') });
  console.log('Pegawai dengan tmt_cpns = null:', list.length);

  let updated = 0, skipped = 0, errors = 0;
  for (const p of list) {
    const tmtCpns = extractTmtCpnsFromNip(p.nip);
    if (!tmtCpns) { skipped++; continue; }
    try {
      const mkg = hitungMKGOtomatis(tmtCpns, tmtCpns, p.mkg_offset || 0);
      let gaji = Number(p.gaji_pokok) || 0;
      if (gaji < 2000000) gaji = getGajiPokok(p.golongan, mkg.tahun) || 2785700;
      await p.update({
        tmt_cpns: tmtCpns,
        tmt_pangkat: p.tmt_pangkat || tmtCpns,
        tmt_kgb_terakhir: p.tmt_kgb_terakhir || tmtCpns,
        mkg_tahun: p.mkg_tahun > 0 ? p.mkg_tahun : mkg.tahun,
        mkg_bulan: (p.mkg_bulan != null && p.mkg_bulan > 0) ? p.mkg_bulan : mkg.bulan,
        gaji_pokok: gaji
      });
      console.log('[OK]', p.nip, p.nama, '->', tmtCpns, 'MKG:', mkg.tahun + 'T', mkg.bulan + 'B', 'Gaji: Rp', gaji.toLocaleString('id-ID'));
      updated++;
    } catch (e) { console.error('[ERROR]', p.nip, e.message); errors++; }
  }

  console.log('\n=== RINGKASAN ===');
  console.log('Updated:', updated, '| Skipped:', skipped, '| Errors:', errors);
  const masihNull = await Pegawai.count({ where: sequelize.literal('tmt_cpns IS NULL') });
  console.log('Masih null setelah patch:', masihNull);
  await sequelize.close();
}

runPatch().catch(e => { console.error('[FATAL]:', e); process.exit(1); });
