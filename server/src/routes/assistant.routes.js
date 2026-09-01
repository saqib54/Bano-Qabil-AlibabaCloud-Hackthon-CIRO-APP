const express = require('express');
const assistantController = require('../controllers/assistant.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// POST /api/v1/assistant/chat — AI emergency assistant
router.post('/chat', assistantController.chat);

module.exports = router;
