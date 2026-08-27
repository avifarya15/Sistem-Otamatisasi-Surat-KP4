const { Pegawai, Pasangan, Anak } = require('../models');
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
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=KP4_${nip}.pdf`);
    
    pdfGenerator.generateKP4(pegawai.toJSON(), res);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { generatePdf };
