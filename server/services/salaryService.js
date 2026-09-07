/**
 * salaryService.js
 * Perhitungan Gaji Pokok, Masa Kerja Golongan (MKG), dan KGB (Kenaikan Gaji Berkala)
 * Acuan: Data Gaji Pokok 2024 (PP No. 5 Tahun 2024 & Perpres No. 11 Tahun 2024)
 * Kenaikan tiap 2 tahun: 3.15% (0.0315)
 */

// Gaji Pokok Dasar Tahun 2024 pada MKG 0 Tahun
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
 * Normalisasi string golongan (misal 'iii/a' atau 'III/A' -> 'III/a', 'ix' -> 'IX')
 */
function normalizeGolongan(golongan) {
  if (!golongan) return '';
  const trimmed = String(golongan).trim();
  const parts = trimmed.split('/');
  if (parts.length === 2) {
    return `${parts[0].toUpperCase()}/${parts[1].toLowerCase()}`;
  }
  return trimmed.toUpperCase();
}

/**
 * Hitung gaji pokok berdasarkan Golongan dan MKG Tahun.
 * Kenaikan tiap 2 tahun masa kerja adalah persenKgb (default 3.15%) dari data dasar tahun 2024.
 * @param {string} golongan - Golongan ruang (e.g. 'III/a', 'III/c', 'IX')
 * @param {number} mkgTahun - Masa Kerja Golongan dalam tahun (diinput oleh user)
 * @param {number} [customPersen] - Persen custom (opsional)
 * @returns {number|null} Gaji pokok hasil kalkulasi
 */
function getGajiPokok(golongan, mkgTahun, customPersen = null) {
  const normGol = normalizeGolongan(golongan);
  const baseSalary = GAJI_DASAR_2024[normGol];
  if (!baseSalary) return null;

  const rate = customPersen != null ? (Number(customPersen) / 100) : persenKenaikan2Tahun;
  const tahun = Math.max(0, Math.floor(Number(mkgTahun) || 0));
  const stepKenaikan = Math.floor(tahun / 2); // Tiap 2 tahun
  // Rumus: Base 2024 * (1 + rate)^step
  const gajiHasil = Math.round(baseSalary * Math.pow(1 + rate, stepKenaikan));
  return gajiHasil;
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
  normalizeGolongan,
  getGajiPokok,
  hitungKenaikanKgb,
  hitungMasaKerjaDanGaji,
  hitungTunjanganKeluarga,
  setPersenKgb,
  getPersenKgb
};
