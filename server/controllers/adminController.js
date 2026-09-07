const { Pegawai, Pasangan, Anak, LogAktivitas, Pengaturan } = require('../models');
const { hitungMasaKerjaDanGaji, hitungTunjanganKeluarga, getGajiPokok, hitungKenaikanKgb, getPersenKgb, setPersenKgb } = require('../services/salaryService');

const cleanBody = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned = { ...obj };
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === '') {
      cleaned[key] = null;
    }
  }
  return cleaned;
};

const logActivity = async (req, aksi, detail) => {
  try {
    await LogAktivitas.create({
      admin_id: req.admin ? req.admin.id : null,
      admin_username: req.admin ? req.admin.username : 'admin',
      aksi,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ip_address: req.ip || req.connection?.remoteAddress
    });
  } catch (error) {
    console.error('Log error', error);
  }
};

const getAllPegawai = async (req, res) => {
  try {
    const data = await Pegawai.findAll({
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }],
      order: [['nama', 'ASC']]
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPegawaiByNip = async (req, res) => {
  try {
    const data = await Pegawai.findOne({
      where: { nip: req.params.nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });
    if (!data) return res.status(404).json({ message: 'Not found' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createPegawai = async (req, res) => {
  try {
    const payload = cleanBody(req.body);
    // Jika gaji_pokok belum diisi tetapi golongan & mkg_tahun diisi, hitung otomatis (+3.15% per 2 thn acuan 2024)
    if (!payload.gaji_pokok && payload.golongan && payload.mkg_tahun != null) {
      const gajiOtomatis = getGajiPokok(payload.golongan, Number(payload.mkg_tahun));
      if (gajiOtomatis) {
        payload.gaji_pokok = gajiOtomatis;
      }
    }
    const data = await Pegawai.create(payload);
    await logActivity(req, `Create Pegawai NIP ${data.nip}`, payload);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updatePegawai = async (req, res) => {
  try {
    const { nip } = req.params;
    const pegawai = await Pegawai.findOne({ where: { nip } });
    if (!pegawai) return res.status(404).json({ message: 'Not found' });
    const payload = cleanBody(req.body);
    // Jika gaji_pokok kosong/null dan ada perubahan golongan & mkg_tahun, hitung otomatis
    if (!payload.gaji_pokok && payload.golongan && payload.mkg_tahun != null) {
      const gajiOtomatis = getGajiPokok(payload.golongan, Number(payload.mkg_tahun));
      if (gajiOtomatis) {
        payload.gaji_pokok = gajiOtomatis;
      }
    }
    await pegawai.update(payload);
    await logActivity(req, `Update Pegawai NIP ${nip}`, payload);
    res.json(pegawai);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deletePegawai = async (req, res) => {
  try {
    const { nip } = req.params;
    const pegawai = await Pegawai.findOne({ where: { nip } });
    if (!pegawai) return res.status(404).json({ message: 'Not found' });
    await Pasangan.destroy({ where: { nip } });
    await Anak.destroy({ where: { nip } });
    await pegawai.destroy();
    await logActivity(req, `Delete Pegawai NIP ${nip}`, null);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createPasangan = async (req, res) => {
  try {
    const payload = cleanBody(req.body);
    const data = await Pasangan.create(payload);
    await logActivity(req, `Create Pasangan untuk NIP ${data.nip}`, payload);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updatePasangan = async (req, res) => {
  try {
    const { id } = req.params;
    const pasangan = await Pasangan.findByPk(id);
    if (!pasangan) return res.status(404).json({ message: 'Not found' });
    const payload = cleanBody(req.body);
    await pasangan.update(payload);
    await logActivity(req, `Update Pasangan ID ${id} NIP ${pasangan.nip}`, payload);
    res.json(pasangan);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deletePasangan = async (req, res) => {
  try {
    const { id } = req.params;
    const pasangan = await Pasangan.findByPk(id);
    if (!pasangan) return res.status(404).json({ message: 'Not found' });
    await pasangan.destroy();
    await logActivity(req, `Delete Pasangan ID ${id}`, null);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createAnak = async (req, res) => {
  try {
    const payload = cleanBody(req.body);
    const data = await Anak.create(payload);
    await logActivity(req, `Create Anak untuk NIP ${data.nip}`, payload);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateAnak = async (req, res) => {
  try {
    const { id } = req.params;
    const anak = await Anak.findByPk(id);
    if (!anak) return res.status(404).json({ message: 'Not found' });
    const payload = cleanBody(req.body);
    await anak.update(payload);
    await logActivity(req, `Update Anak ID ${id} NIP ${anak.nip}`, payload);
    res.json(anak);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteAnak = async (req, res) => {
  try {
    const { id } = req.params;
    const anak = await Anak.findByPk(id);
    if (!anak) return res.status(404).json({ message: 'Not found' });
    await anak.destroy();
    await logActivity(req, `Delete Anak ID ${id}`, null);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const logs = await LogAktivitas.findAll({
      order: [['timestamp', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ========================= KGB ENDPOINTS =========================

/**
 * GET /api/admin/kgb/eligible
 * Return list of pegawai whose KGB is due (≥ 2 years since tmt_kgb_terakhir or marked as Waktunya KGB)
 */
const getKgbEligible = async (req, res) => {
  try {
    const allPegawai = await Pegawai.findAll({
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }],
      order: [['nama', 'ASC']]
    });

    const eligible = [];
    for (const p of allPegawai) {
      const result = hitungMasaKerjaDanGaji(
        p.golongan,
        p.tmt_kgb_terakhir,
        p.mkg_tahun || 0,
        p.mkg_bulan || 0,
        p.status_kgb
      );
      if (result.layakNaik) {
        const jmlPasangan = p.pasangan ? p.pasangan.length : 0;
        const jmlAnak = p.anak ? p.anak.length : 0;
        const gajiBaru = result.gajiSetelahKgb || hitungKenaikanKgb(p.gaji_pokok);
        const tunjangan = hitungTunjanganKeluarga(gajiBaru, jmlPasangan, jmlAnak);
        eligible.push({
          ...p.toJSON(),
          kgb_info: {
            ...result,
            gajiPokokBaru: gajiBaru,
            gajiPokokLama: Number(p.gaji_pokok) || 0,
            mkgLama: p.mkg_tahun || 0,
            mkgBaru: (p.mkg_tahun || 0) + 2,
            ...tunjangan
          }
        });
      }
    }

    res.json(eligible);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/admin/kgb/process/:nip
 * Process KGB for a specific pegawai: bump MKG +2, update gaji +3.15%, reset TMT
 */
const processKgb = async (req, res) => {
  try {
    const { nip } = req.params;
    const pegawai = await Pegawai.findOne({
      where: { nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });
    if (!pegawai) return res.status(404).json({ message: 'Pegawai tidak ditemukan' });

    // Process: increase MKG by 2 years
    const mkgLama = pegawai.mkg_tahun || 0;
    const mkgBaru = mkgLama + 2;
    // Hitung gaji baru: berdasarkan formula 3.15% per 2 tahun dari acuan 2024
    const gajiBaru = getGajiPokok(pegawai.golongan, mkgBaru) || hitungKenaikanKgb(pegawai.gaji_pokok);
    const today = new Date().toISOString().split('T')[0];

    await pegawai.update({
      mkg_tahun: mkgBaru,
      mkg_bulan: pegawai.mkg_bulan || 0,
      gaji_pokok: gajiBaru || pegawai.gaji_pokok,
      tmt_kgb_terakhir: today,
      status_kgb: 'Normal'
    });

    await logActivity(req, `Proses KGB (+3.15%) NIP ${nip}`, {
      mkg_lama: mkgLama,
      mkg_baru: mkgBaru,
      gaji_lama: Number(pegawai.gaji_pokok),
      gaji_baru: gajiBaru,
      kenaikan_persen: '3.15%',
      tmt_kgb_baru: today
    });

    // Return updated data with tunjangan info
    const jmlPasangan = pegawai.pasangan ? pegawai.pasangan.length : 0;
    const jmlAnak = pegawai.anak ? pegawai.anak.length : 0;
    const tunjangan = hitungTunjanganKeluarga(gajiBaru || pegawai.gaji_pokok, jmlPasangan, jmlAnak);

    res.json({
      message: 'KGB berhasil diproses dengan kenaikan gaji 3.15%',
      pegawai: pegawai.toJSON(),
      kgb_result: {
        mkg_baru: mkgBaru,
        gaji_baru: gajiBaru,
        tmt_kgb_baru: today,
        ...tunjangan
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    res.json({
      persen_kenaikan_kgb: getPersenKgb()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { persen_kenaikan_kgb } = req.body;
    if (persen_kenaikan_kgb == null) {
      return res.status(400).json({ message: 'persen_kenaikan_kgb wajib diisi' });
    }
    const val = Number(persen_kenaikan_kgb);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ message: 'Nilai persentase harus angka positif' });
    }
    setPersenKgb(val);
    await Pengaturan.upsert({
      kunci: 'persen_kenaikan_kgb',
      nilai: String(val),
      keterangan: 'Persentase kenaikan gaji berkala tiap 2 tahun (%)'
    });
    await logActivity(req, `Update Persentase KGB menjadi ${val}%`, { persen_kenaikan_kgb: val });
    res.json({
      message: 'Pengaturan persentase kenaikan berhasil disimpan',
      persen_kenaikan_kgb: getPersenKgb()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllPegawai, getPegawaiByNip, createPegawai, updatePegawai, deletePegawai,
  createPasangan, updatePasangan, deletePasangan,
  createAnak, updateAnak, deleteAnak,
  getLogs,
  getKgbEligible, processKgb,
  getSettings, updateSettings
};
