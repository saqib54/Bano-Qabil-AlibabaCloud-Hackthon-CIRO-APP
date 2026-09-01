const express = require('express');
const staffController = require('../controllers/staff.controller');
const validate = require('../middleware/validate.middleware');
const { requireAuth, requireRoles } = require('../middleware/auth.middleware');
const { statusUpdateSchema, situationLogSchema, resolutionSchema, dutyStatusSchema } = require('../validators/staff.validator');

const router = express.Router();

router.use(requireAuth, requireRoles('STAFF'));

// KPIs & duty status
router.get('/kpi', staffController.kpis);
router.patch('/duty-status', validate(dutyStatusSchema), staffController.toggleDuty);

// Assignments
router.get('/assignments', staffController.assignments);
router.get('/assignments/:id', staffController.detail);
router.patch('/assignments/:id/accept', staffController.accept);
router.patch('/assignments/:id/status', validate(statusUpdateSchema), staffController.updateStatus);
router.post('/assignments/:id/situation-log', validate(situationLogSchema), staffController.addSituationLog);
router.post('/assignments/:id/resolve', validate(resolutionSchema), staffController.submitResolution);

// History
router.get('/history', staffController.history);

module.exports = router;
