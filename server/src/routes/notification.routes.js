const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// All notification routes require authentication
router.use(requireAuth);

// User notifications (any authenticated user)
router.get('/', notificationController.listNotifications);
router.patch('/mark-all-read', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

// Public alerts — active emergency broadcasts (any authenticated user)
router.get('/alerts', notificationController.listAlerts);

module.exports = router;
