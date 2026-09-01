const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const incidentRoutes = require('./incident.routes');
const adminRoutes = require('./admin.routes');
const staffRoutes = require('./staff.routes');
const notificationRoutes = require('./notification.routes');
const mapRoutes = require('./map.routes');
const assistantRoutes = require('./assistant.routes');
const aiRoutes = require('./ai.routes');
const weatherRoutes = require('./weather.routes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'CIRO API is operational',
    data: { service: 'ciro-server', time: new Date().toISOString() }
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/incidents', incidentRoutes);
router.use('/admin', adminRoutes);
router.use('/staff', staffRoutes);
router.use('/notifications', notificationRoutes);
router.use('/', mapRoutes);
router.use('/assistant', assistantRoutes);
router.use('/ai', aiRoutes);
router.use('/weather', weatherRoutes);

module.exports = router;
