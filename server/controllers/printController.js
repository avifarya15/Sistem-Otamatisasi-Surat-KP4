const { Pegawai, Pasangan, Anak, Pengaturan } = require('../models');
const pdfGenerator = require('../services/pdfGenerator');

const generatePdf = async (req, res) => {
  try {
    const nip = req.body.nip || req.query.nip || req.params.nip;
    if (!nip) return res.status(400).json({ message: 'NIP required' });
    
    const pegawai = await Pegawai.findOne({
      where: { nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });
    
    if (!pegawai) return res.status(404).json({ message: 'Not found' });

    // Ambil data pejabat penandatangan dari pengaturan
    const settingRows = await Pengaturan.findAll({
      where: {
        kunci: ['kepala_sub_nama', 'kepala_sub_pangkat', 'kepala_sub_nip']
      }
    });
    const settingMap = {};
    for (const r of settingRows) settingMap[r.kunci] = r.nilai;

    const pejabat = {
      nama: settingMap.kepala_sub_nama || 'Drs. ILYAS, M.Ap',
      pangkat: settingMap.kepala_sub_pangkat || 'Pembina',
      nip: settingMap.kepala_sub_nip || '19691211 200212 1 005'
    };
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=KP4_${nip}.pdf`);
    
    pdfGenerator.generateKP4(pegawai.toJSON(), res, pejabat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { generatePdf };
