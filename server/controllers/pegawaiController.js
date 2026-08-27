const { Pegawai, Pasangan, Anak } = require('../models');

const validatePegawai = async (req, res) => {
  try {
    const { nip, tanggal_lahir } = req.body;
    if (!nip || !tanggal_lahir) {
      return res.status(400).json({ message: 'NIP and tanggal_lahir are required' });
    }
    const pegawai = await Pegawai.findOne({
      where: { nip, tanggal_lahir },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });
    if (!pegawai) {
      return res.status(404).json({ message: 'Data pegawai tidak ditemukan atau tanggal lahir tidak sesuai' });
    }
    res.json(pegawai);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { validatePegawai };
