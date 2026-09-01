const express = require('express');
const shelterController = require('../controllers/shelter.controller');
const { requireAuth, requireRoles } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// ── Map data (any authenticated user) ─────────────────────
router.get('/map/incidents', shelterController.mapIncidents);
router.get('/map/responders', shelterController.mapResponders);

// ── Shelters — public list (any authenticated user) ────────
router.get('/shelters', shelterController.listShelters);
router.get('/shelters/:id', shelterController.shelterDetail);

// ── Shelter CRUD (admin only) ──────────────────────────────
router.post('/shelters', requireRoles('ADMIN'), shelterController.createShelter);
router.patch('/shelters/:id', requireRoles('ADMIN'), shelterController.updateShelter);
router.patch('/shelters/:id/toggle', requireRoles('ADMIN'), shelterController.toggleShelter);
router.delete('/shelters/:id', requireRoles('ADMIN'), shelterController.deleteShelter);

module.exports = router;
