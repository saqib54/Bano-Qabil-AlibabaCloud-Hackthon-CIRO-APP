const express = require('express');
const weatherController = require('../controllers/weather.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// AI weather intelligence: current, 15-day forecast, AQI, alerts, radar coords
router.get('/', weatherController.weather);

module.exports = router;
