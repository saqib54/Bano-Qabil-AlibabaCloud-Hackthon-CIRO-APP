const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth.middleware');
const profileController = require('../controllers/profile.controller');

const router = express.Router();

// Placeholder — expanded in later sprints (staff management, profiles, etc.)
router.get('/', requireAuth, requireRoles('ADMIN'), (_req, res) => {
  res.json({ success: true, message: 'Users endpoint available', data: [] });
});

// Profile (Sprint 10) — available to all authenticated users
router.get('/profile', requireAuth, profileController.getProfile);
router.patch('/profile', requireAuth, profileController.updateProfile);

// Profile picture upload (multipart)
router.post('/profile/avatar', requireAuth, profileController.parseAvatarUpload, profileController.uploadAvatar);

// Account preferences (theme, language) — saved to the account so they
// follow the citizen across devices
router.patch('/prefs', requireAuth, profileController.updatePrefs);

// Terms & conditions / consent — accepted once per account
router.post('/terms/accept', requireAuth, profileController.acceptTerms);

module.exports = router;
