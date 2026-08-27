const { Pegawai, Pasangan, Anak, LogAktivitas } = require('../models');

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

module.exports = {
  getAllPegawai, getPegawaiByNip, createPegawai, updatePegawai, deletePegawai,
  createPasangan, updatePasangan, deletePasangan,
  createAnak, updateAnak, deleteAnak,
  getLogs
};
