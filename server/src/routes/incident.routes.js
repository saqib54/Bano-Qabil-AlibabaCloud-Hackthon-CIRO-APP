const express = require('express');
const incidentController = require('../controllers/incident.controller');
const verificationController = require('../controllers/verification.controller');
const validate = require('../middleware/validate.middleware');
const { requireAuth, requireRoles } = require('../middleware/auth.middleware');
const { createIncidentSchema, updateStatusSchema } = require('../validators/incident.validator');

const router = express.Router();

router.use(requireAuth);

// Citizen emergency reporting (multipart: fields + optional image)
router.post('/', requireRoles('PUBLIC'), parse());
router.get('/mine', requireRoles('PUBLIC'), incidentController.mine);
router.get('/', requireRoles('STAFF', 'ADMIN'), incidentController.list);
router.get('/:id', incidentController.detail);
// AI verification pipeline trace (citizens: own reports only — enforced in controller)
router.get('/:id/verification', verificationController.incidentVerification);
// Role + ownership rules enforced in incident.service (citizens may only cancel their own)
router.patch('/:id/status', validate(updateStatusSchema), incidentController.updateStatus);

function parse() {
  return [incidentController.parseUpload, validate(createIncidentSchema), incidentController.create];
}

module.exports = router;
