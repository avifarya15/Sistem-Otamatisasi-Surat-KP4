const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Pegawai
router.get('/pegawai', adminController.getAllPegawai);
router.get('/pegawai/:nip', adminController.getPegawaiByNip);
router.post('/pegawai', adminController.createPegawai);
router.put('/pegawai/:nip', adminController.updatePegawai);
router.delete('/pegawai/:nip', adminController.deletePegawai);

// Pasangan
router.post('/pasangan', adminController.createPasangan);
router.put('/pasangan/:id', adminController.updatePasangan);
router.delete('/pasangan/:id', adminController.deletePasangan);

// Anak
router.post('/anak', adminController.createAnak);
router.put('/anak/:id', adminController.updateAnak);
router.delete('/anak/:id', adminController.deleteAnak);

// Log
router.get('/logs', adminController.getLogs);

// KGB (Kenaikan Gaji Berkala)
router.get('/kgb/eligible', adminController.getKgbEligible);
router.post('/kgb/process/:nip', adminController.processKgb);

// Settings (Persentase Kenaikan KGB)
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);

module.exports = router;
