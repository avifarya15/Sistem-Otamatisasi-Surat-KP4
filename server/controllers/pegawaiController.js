const { Pegawai, Pasangan, Anak, Pengaturan } = require('../models');
const { getGajiPokok, getPersenKgb } = require('../services/salaryService');

const validatePegawai = async (req, res) => {
  try {
    const { nip, tanggal_lahir } = req.body;
    if (!nip || !tanggal_lahir) {
      return res.status(400).json({ message: 'NIP dan tanggal lahir wajib diisi' });
    }
    const pegawai = await Pegawai.findOne({
      where: { nip, tanggal_lahir },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });
    if (!pegawai) {
      return res.status(404).json({ message: 'Data pegawai tidak ditemukan atau tanggal lahir tidak sesuai' });
    }
    res.json({
      ...pegawai.toJSON(),
      persen_kenaikan_kgb: getPersenKgb()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update Masa Kerja Golongan (MKG) oleh user/pegawai
 * Sistem akan menghitung gaji pokok otomatis sesuai masa kerja & persentase KGB (3.15% per 2 thn)
 */
const updateMasaKerja = async (req, res) => {
  try {
    const { nip, tanggal_lahir, mkg_tahun, mkg_bulan } = req.body;
    if (!nip || !tanggal_lahir) {
      return res.status(400).json({ message: 'NIP dan tanggal lahir diperlukan untuk verifikasi' });
    }

    const pegawai = await Pegawai.findOne({
      where: { nip, tanggal_lahir }
    });
    if (!pegawai) {
      return res.status(404).json({ message: 'Data pegawai tidak ditemukan atau kredensial tidak sesuai' });
    }

    const tahun = Math.max(0, Math.floor(Number(mkg_tahun) || 0));
    const bulan = Math.max(0, Math.min(11, Math.floor(Number(mkg_bulan) || 0)));

    // Hitung gaji pokok baru dari MKG berdasarkan persenan sistem (default 3.15% per 2 thn dari acuan 2024)
    const gajiOtomatis = getGajiPokok(pegawai.golongan, tahun);
    const gajiBaru = gajiOtomatis || pegawai.gaji_pokok;

    await pegawai.update({
      mkg_tahun: tahun,
      mkg_bulan: bulan,
      gaji_pokok: gajiBaru
    });

    const updated = await Pegawai.findOne({
      where: { nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });

    res.json({
      message: 'Masa kerja berhasil disimpan dan gaji pokok otomatis dihitung',
      pegawai: updated,
      kalkulasi: {
        mkg_tahun: tahun,
        mkg_bulan: bulan,
        gaji_pokok: gajiBaru,
        persen_kenaikan: getPersenKgb(),
        step_kenaikan: Math.floor(tahun / 2)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getSystemConfig = async (req, res) => {
  try {
    res.json({
      persen_kenaikan_kgb: getPersenKgb()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  validatePegawai,
  updateMasaKerja,
  getSystemConfig
};
