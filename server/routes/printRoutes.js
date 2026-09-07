const express = require('express');
const router = express.Router();
const pegawaiController = require('../controllers/pegawaiController');
const printController = require('../controllers/printController');

router.post('/validate', pegawaiController.validatePegawai);
router.post('/update-mkg', pegawaiController.updateMasaKerja);
router.get('/config', pegawaiController.getSystemConfig);
router.post('/generate', printController.generatePdf);
router.get('/generate', printController.generatePdf); // Allow GET as well for easier testing/download

module.exports = router;
