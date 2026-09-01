const express = require('express');
const verificationController = require('../controllers/verification.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// Smart report extraction — text/voice transcript in English, Roman Urdu or Urdu
router.post('/extract', verificationController.aiExtract);

module.exports = router;
