/**
 * salaryService.js
 * Perhitungan Gaji Pokok, Masa Kerja Golongan (MKG), dan KGB (Kenaikan Gaji Berkala)
 * Acuan: Data Gaji Pokok 2024 (PP No. 5 Tahun 2024 & Perpres No. 11 Tahun 2024)
 * Kenaikan tiap 2 tahun: 3.15% (0.0315)
 */

const path = require('path');
const fs = require('fs');

let TABEL_GAJI_OFFICIAL = {};

/**
 * Memuat tabel gaji resmi PP No. 5 Tahun 2024 dari data Excel / JSON
 */
function loadTabelGaji() {
  try {
    const jsonPath = path.join(__dirname, '..', 'data', 'tabel_gaji_2024.json');
    if (fs.existsSync(jsonPath)) {
      TABEL_GAJI_OFFICIAL = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return;
    }

    const excelPath = path.join(__dirname, '..', 'data', 'daftar_gaji_pns_pp5_2024.xlsx');
    if (fs.existsSync(excelPath)) {
      const xlsx = require('xlsx');
      const wb = xlsx.readFile(excelPath);
      const rows = xlsx.utils.sheet_to_json(wb.Sheets['Data Terstruktur']);
      const table = {};
      for (const r of rows) {
        const golStr = r['Golongan'];
        if (!golStr) continue;
        const roman = golStr.replace('Golongan ', '').trim();
        const mkg = Number(r['MKG']);
        for (const ruang of ['a', 'b', 'c', 'd', 'e']) {
          if (r[ruang] != null) {
            const key = roman + '/' + ruang;
            if (!table[key]) table[key] = {};
            table[key][mkg] = Number(r[ruang]);
          }
        }
      }
      TABEL_GAJI_OFFICIAL = table;
    }
  } catch (err) {
    console.error('[salaryService] Gagal memuat tabel gaji dari Excel/JSON:', err.message);
  }
}

loadTabelGaji();

// Gaji Pokok Dasar Tahun 2024 pada MKG 0 Tahun (Fallback)
const GAJI_DASAR_2024 = {
  // Golongan I (PP No. 5/2024)
  'I/a': 1685700,
  'I/b': 1840800,
  'I/c': 1918700,
  'I/d': 1999900,
  // Golongan II (PP No. 5/2024)
  'II/a': 2184000,
  'II/b': 2385000,
  'II/c': 2485900,
  'II/d': 2591100,
  // Golongan III (PP No. 5/2024)
  'III/a': 2785700,
  'III/b': 2903600,
  'III/c': 3026400,
  'III/d': 3154400,
  // Golongan IV (PP No. 5/2024)
  'IV/a': 3287800,
  'IV/b': 3426900,
  'IV/c': 3571900,
  'IV/d': 3723000,
  'IV/e': 3880400,
  // PPPK (Perpres No. 11/2024 contoh Golongan IX)
  'IX': 3203300
};

// Persentase kenaikan tiap 2 tahun dari data acuan 2024 (default 3.15%)
let persenKenaikan2Tahun = 0.0315; // 3.15%

function setPersenKgb(percent) {
  const p = Number(percent);
  if (!isNaN(p) && p > 0) {
    persenKenaikan2Tahun = p / 100;
  }
}

function getPersenKgb() {
  return +(persenKenaikan2Tahun * 100).toFixed(2);
}

// Daftar golongan yang tersedia
const GOLONGAN_LIST = Object.keys(GAJI_DASAR_2024);

/**
 * Normalisasi string golongan (misal '3/c', '3c', 'iii/c', 'III/C' -> 'III/c', '4/a' -> 'IV/a', 'ix' -> 'IX')
 */
function normalizeGolongan(golongan) {
  if (!golongan) return '';
  let str = String(golongan).trim().replace(/\s+/g, '').replace(/[.-]/g, '/');

  // Jika formatnya '3c' (tanpa slash), ubah menjadi '3/c'
  if (!str.includes('/')) {
    const match = str.match(/^([0-9]+|[IVXLCDM]+)([a-eA-E])$/i);
    if (match) {
      str = `${match[1]}/${match[2]}`;
    }
  }

  const parts = str.split('/');
  if (parts.length === 2) {
    let tingkat = parts[0].toUpperCase();
    const ruang = parts[1].toLowerCase();

    // Konversi angka latin biasa (1, 2, 3, 4) menjadi angka Romawi (I, II, III, IV)
    const romanMap = {
      '1': 'I',
      '2': 'II',
      '3': 'III',
      '4': 'IV',
      '9': 'IX'
    };
    if (romanMap[tingkat]) {
      tingkat = romanMap[tingkat];
    }

    return `${tingkat}/${ruang}`;
  }

  const pppkMap = { '9': 'IX' };
  const upper = str.toUpperCase();
  return pppkMap[upper] || upper;
}

/**
 * Hitung gaji pokok berdasarkan Golongan dan MKG Tahun.
 * Mengutamakan tabel nominal resmi dari Excel (PP No. 5 Tahun 2024),
 * dan fallback ke kalkulasi jika menggunakan custom persentase atau golongan khusus.
 * @param {string} golongan - Golongan ruang (e.g. 'III/a', 'III/c', 'IX')
 * @param {number} mkgTahun - Masa Kerja Golongan dalam tahun (diinput oleh user)
 * @param {number} [customPersen] - Persen custom (opsional)
 * @returns {number|null} Gaji pokok hasil kalkulasi
 */
function getGajiPokok(golongan, mkgTahun, customPersen = null) {
  const normGol = normalizeGolongan(golongan);
  const tahun = Math.max(0, Math.floor(Number(mkgTahun) || 0));

  // 1. Jika tidak ada custom persen khusus, ambil nominal persis dari tabel resmi Excel PP 5/2024
  if (customPersen == null && TABEL_GAJI_OFFICIAL[normGol]) {
    const golTable = TABEL_GAJI_OFFICIAL[normGol];

    // Jika ada nilai persis pada MKG tersebut
    if (golTable[tahun] != null) {
      return golTable[tahun];
    }

    // Jika MKG ganjil (1, 3, 5, dst.), gunakan MKG genap sebelumnya (0, 2, 4, dst.)
    const mkgFloor = Math.floor(tahun / 2) * 2;
    if (golTable[mkgFloor] != null) {
      return golTable[mkgFloor];
    }

    // Jika masa kerja melebihi batas maksimum pada tabel (misal > 32 tahun), gunakan nilai batas tertinggi
    const mkgKeys = Object.keys(golTable).map(Number).sort((a, b) => a - b);
    if (mkgKeys.length > 0 && tahun >= mkgKeys[mkgKeys.length - 1]) {
      return golTable[mkgKeys[mkgKeys.length - 1]];
    }
  }

  // 2. Fallback jika golongan tidak ada di tabel atau menggunakan customPersen
  const baseSalary =
    (TABEL_GAJI_OFFICIAL[normGol] && TABEL_GAJI_OFFICIAL[normGol][0]) || GAJI_DASAR_2024[normGol];
  if (!baseSalary) return null;

  const rate = customPersen != null ? Number(customPersen) / 100 : persenKenaikan2Tahun;
  const stepKenaikan = Math.floor(tahun / 2); // Tiap 2 tahun
  return Math.round(baseSalary * Math.pow(1 + rate, stepKenaikan));
}

/**
 * Hitung nominal kenaikan untuk KGB berikutnya (+2 tahun).
 * @param {number} gajiSekarang
 * @param {number} [customPersen]
 * @returns {number} Gaji baru setelah kenaikan
 */
function hitungKenaikanKgb(gajiSekarang, customPersen = null) {
  const rate = customPersen != null ? (Number(customPersen) / 100) : persenKenaikan2Tahun;
  const current = Number(gajiSekarang) || 0;
  return Math.round(current * (1 + rate));
}

/**
 * Hitung Masa Kerja Golongan (MKG) OTOMATIS dari TMT Pangkat.
 *
 * Aturan BKN (Peraturan Resmi):
 * 1. Naik pangkat DALAM rumpun golongan yang sama (misal III/a → III/b):
 *    MKG di golongan baru dimulai dari 0 Tahun 0 Bulan.
 *    → Gunakan tanggal tmt_pangkat sebagai titik mulai MKG.
 *
 * 2. Naik pangkat yang PINDAH golongan utama (misal II → III via Penyesuaian Ijazah/Ujian Dinas):
 *    MKG tidak nol murni, melainkan dipotong sesuai ketentuan BKN:
 *    - Pindah dari Gol I ke Gol II: MKG lama dikurangi 6 tahun
 *    - Pindah dari Gol II ke Gol III: MKG lama dikurangi 5 tahun
 *    → Pada kasus ini, mkg_offset (negatif) disimpan di DB untuk mengurangi hasil auto-hitung.
 *
 * Untuk pegawai baru yang tidak pernah naik pangkat, TMT Pangkat = TMT CPNS.
 *
 * @param {string|Date|null} tmtPangkat - TMT golongan efektif saat ini (atau TMT CPNS jika baru)
 * @param {string|Date|null} tmtCpns   - TMT CPNS sebagai fallback
 * @param {number} [mkgOffset=0]        - Offset (dalam bulan, bisa negatif) akibat potongan lintas golongan
 * @returns {{ tahun: number, bulan: number, refDate: string, sumberTmt: string }}
 */
function hitungMKGOtomatis(tmtPangkat, tmtCpns, mkgOffset = 0) {
  const now = new Date();

  let refDate = null;
  let sumberTmt = 'TMT CPNS';

  if (tmtPangkat) {
    const d = new Date(tmtPangkat);
    if (!isNaN(d.getTime())) {
      refDate = d;
      sumberTmt = 'TMT Pangkat';
    }
  }

  if (!refDate && tmtCpns) {
    const d = new Date(tmtCpns);
    if (!isNaN(d.getTime())) {
      refDate = d;
      sumberTmt = 'TMT CPNS';
    }
  }

  if (!refDate) {
    return { tahun: 0, bulan: 0, refDate: null, sumberTmt: 'Tidak diketahui' };
  }

  // Hitung selisih bulan dari referensi hingga sekarang
  let totalBulan =
    (now.getFullYear() - refDate.getFullYear()) * 12 +
    (now.getMonth() - refDate.getMonth());
  if (now.getDate() < refDate.getDate()) totalBulan--;

  // Terapkan offset (misal: potongan lintas golongan II→III = -5 tahun = -60 bulan)
  totalBulan = totalBulan + (mkgOffset * 12); // mkgOffset dalam TAHUN
  if (totalBulan < 0) totalBulan = 0;

  const tahun = Math.floor(totalBulan / 12);
  const bulan = totalBulan % 12;
  const refDateStr = refDate.toISOString().split('T')[0];

  return { tahun, bulan, refDate: refDateStr, sumberTmt };
}

/**
 * Hitung total masa kerja sejak TMT CPNS (terlepas dari MKG golongan).
 * Ini adalah masa kerja keseluruhan sejak pertama kali diangkat sebagai CPNS/PNS,
 * berbeda dengan MKG yang dihitung dari TMT Pangkat saat ini.
 *
 * Berguna untuk menampilkan informasi "sudah berapa lama menjadi PNS",
 * bukan untuk kalkulasi gaji (yang menggunakan MKG dari TMT Pangkat).
 *
 * @param {string|Date|null} tmtCpns - Tanggal TMT CPNS
 * @returns {{ totalBulan: number, tahun: number, bulan: number, hari: number, refDate: string|null, valid: boolean }}
 */
function hitungMasaKerjaCpns(tmtCpns) {
  if (!tmtCpns) {
    return { totalBulan: 0, tahun: 0, bulan: 0, hari: 0, refDate: null, valid: false };
  }

  const refDate = new Date(tmtCpns);
  if (isNaN(refDate.getTime())) {
    return { totalBulan: 0, tahun: 0, bulan: 0, hari: 0, refDate: null, valid: false };
  }

  const now = new Date();

  // Hitung selisih tahun dan bulan
  let totalBulan =
    (now.getFullYear() - refDate.getFullYear()) * 12 +
    (now.getMonth() - refDate.getMonth());
  if (now.getDate() < refDate.getDate()) totalBulan--;
  if (totalBulan < 0) totalBulan = 0;

  const tahun = Math.floor(totalBulan / 12);
  const bulan = totalBulan % 12;

  // Hitung sisa hari (estimasi)
  const tmpDate = new Date(refDate);
  tmpDate.setFullYear(tmpDate.getFullYear() + tahun);
  tmpDate.setMonth(tmpDate.getMonth() + bulan);
  const diffMs = now - tmpDate;
  const hari = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return {
    totalBulan,
    tahun,
    bulan,
    hari,
    refDate: refDate.toISOString().split('T')[0],
    valid: true
  };
}

/**
 * Mendapatkan golongan utama (angka roman: I, II, III, IV)
 * @param {string} golongan - misal 'III/c', 'II/a', 'IV/b'
 * @returns {string} - 'I', 'II', 'III', 'IV', atau ''
 */
function getGolonganUtama(golongan) {
  const norm = normalizeGolongan(golongan);
  if (!norm) return '';
  const parts = norm.split('/');
  return parts[0] || '';
}

/**
 * Hitung masa kerja dan status kelayakan KGB.
 * Masa kerja dapat diinput langsung oleh user (mkgAwalTahun, mkgAwalBulan).
 * Status kelayakan KGB ditentukan dari selisih TMT KGB terakhir atau flag status.
 * @param {string} golongan - Golongan pegawai
 * @param {string|Date} tmtKgbTerakhir - Tanggal TMT KGB/Pangkat terakhir
 * @param {number} mkgAwalTahun - Masa kerja tahun yang diinput user
 * @param {number} mkgAwalBulan - Masa kerja bulan yang diinput user
 * @param {string} statusKgbDb - Status KGB dari DB jika ada
 * @returns {Object}
 */
function hitungMasaKerjaDanGaji(golongan, tmtKgbTerakhir, mkgAwalTahun = 0, mkgAwalBulan = 0, statusKgbDb = 'Normal') {
  const mkgTahun = Math.max(0, Math.floor(Number(mkgAwalTahun) || 0));
  const mkgBulan = Math.max(0, Math.min(11, Math.floor(Number(mkgAwalBulan) || 0)));

  let layakNaik = false;
  let bulanBerjalan = 0;

  if (tmtKgbTerakhir) {
    const now = new Date();
    const tmt = new Date(tmtKgbTerakhir);
    if (!isNaN(tmt.getTime())) {
      bulanBerjalan = (now.getFullYear() - tmt.getFullYear()) * 12 + (now.getMonth() - tmt.getMonth());
      if (now.getDate() < tmt.getDate()) bulanBerjalan--;
      bulanBerjalan = Math.max(0, bulanBerjalan);
      // Genap 2 tahun (24 bulan) sejak TMT KGB terakhir
      if (bulanBerjalan >= 24) {
        layakNaik = true;
      }
    }
  }

  // Jika di database sudah ditandai 'Waktunya KGB'
  if (statusKgbDb === 'Waktunya KGB') {
    layakNaik = true;
  }

  const statusKgb = layakNaik ? 'Waktunya KGB' : 'Normal';

  // Hitung gaji saat ini berdasarkan MKG tahun (acuan 2024 + 3.15% per 2 thn)
  const gajiPokok = getGajiPokok(golongan, mkgTahun);

  // Estimasi gaji setelah KGB berikutnya (+2 tahun, +3.15%)
  const mkgBerikutnya = mkgTahun + 2;
  const gajiSetelahKgb = getGajiPokok(golongan, mkgBerikutnya) || hitungKenaikanKgb(gajiPokok);

  return {
    mkgTahun,
    mkgBulan,
    gajiPokok,
    mkgBerikutnya,
    gajiSetelahKgb,
    persenKenaikan: 3.15,
    statusKgb,
    layakNaik,
    bulanBerjalan
  };
}

/**
 * Hitung tunjangan keluarga berdasarkan gaji pokok.
 * @param {number} gajiPokok - Gaji pokok pegawai
 * @param {number} jumlahPasangan - Jumlah pasangan (0 atau 1)
 * @param {number} jumlahAnakTanggungan - Jumlah anak tanggungan (maks 2 dihitung)
 * @returns {Object} { tunjanganPasangan, tunjanganAnak, totalTunjangan, totalBruto }
 */
function hitungTunjanganKeluarga(gajiPokok, jumlahPasangan, jumlahAnakTanggungan) {
  const gp = Number(gajiPokok) || 0;
  const pasanganEfektif = Math.min(1, Math.max(0, Number(jumlahPasangan) || 0));
  const anakEfektif = Math.min(2, Math.max(0, Number(jumlahAnakTanggungan) || 0));

  const tunjanganPasangan = Math.round(gp * 0.10 * pasanganEfektif);
  const tunjanganAnak = Math.round(gp * 0.02 * anakEfektif);
  const totalTunjangan = tunjanganPasangan + tunjanganAnak;
  const totalBruto = gp + totalTunjangan;

  return {
    tunjanganPasangan,
    tunjanganAnak,
    totalTunjangan,
    totalBruto
  };
}

module.exports = {
  GAJI_DASAR_2024,
  GOLONGAN_LIST,
  TABEL_GAJI_OFFICIAL,
  normalizeGolongan,
  getGajiPokok,
  hitungKenaikanKgb,
  hitungMKGOtomatis,
  hitungMasaKerjaCpns,
  getGolonganUtama,
  hitungMasaKerjaDanGaji,
  hitungTunjanganKeluarga,
  setPersenKgb,
  getPersenKgb
};

