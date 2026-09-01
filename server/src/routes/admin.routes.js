const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRoles } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  verifySchema, assignSchema, resolutionActionSchema,
  departmentCreateSchema, departmentUpdateSchema, staffCreateSchema, staffUpdateSchema,
  userCreateSchema, userUpdateSchema,
  broadcastCreateSchema
} = require('../validators/admin.validator');
const notificationController = require('../controllers/notification.controller');
const dispatchController = require('../controllers/dispatch.controller');
const adminOpsController = require('../controllers/adminOps.controller');
const verificationController = require('../controllers/verification.controller');

const router = express.Router();

router.use(requireAuth, requireRoles('ADMIN'));

// KPIs for command dashboard
router.get('/kpis', adminController.kpis);

// Rapid Intelligence Grid — live AI verification pipeline feed
router.get('/verification-feed', verificationController.verificationFeed);

// AI auto-triage (§71) — forecasting + human approval gate
router.get('/forecast', verificationController.forecast);
router.post('/incidents/:id/approve-dispatch', verificationController.approveDispatch);

// Incident operations
router.get('/incidents', adminController.listIncidents);
router.get('/incidents/:id', adminController.detail);
router.patch('/incidents/:id/verify', validate(verifySchema), adminController.verify);
router.patch('/incidents/:id/assign', validate(assignSchema), adminController.assign);
router.post('/incidents/:id/reanalyze', adminController.reanalyze);

// Resolution review (Sprint 6)
router.get('/resolutions', adminController.listResolutions);
router.get('/resolutions/:id', adminController.resolutionDetail);
router.patch('/resolutions/:id/approve', validate(resolutionActionSchema), adminController.approveResolution);
router.patch('/resolutions/:id/reject', validate(resolutionActionSchema), adminController.rejectResolution);
router.patch('/resolutions/:id/reopen', validate(resolutionActionSchema), adminController.reopenIncident);

// Staff management (Sprint 4)
router.post('/staff', validate(staffCreateSchema), adminController.createStaff);
router.get('/staff/detailed', adminController.listStaffDetailed);
router.patch('/staff/:id', validate(staffUpdateSchema), adminController.updateStaff);

// Simple staff list (backward compat — used by incident detail assign dropdown)
router.get('/staff', adminController.listStaffDetailed);

// Citizen / account management — add & edit accounts, reset emails & passwords
router.get('/users', adminController.listUsers);
router.post('/users', validate(userCreateSchema), adminController.createUser);
router.patch('/users/:id', validate(userUpdateSchema), adminController.updateUser);

// Department management (Sprint 4)
router.get('/departments/detailed', adminController.listDepartmentsDetailed);
router.post('/departments', validate(departmentCreateSchema), adminController.createDepartment);
router.patch('/departments/:id', validate(departmentUpdateSchema), adminController.updateDepartment);
router.patch('/departments/:id/toggle', adminController.toggleDepartment);

// Simple department list (backward compat)
router.get('/departments', adminController.listDepartmentsDetailed);

// Broadcast management (Sprint 7)
router.get('/broadcasts', notificationController.listBroadcasts);
router.post('/broadcasts', validate(broadcastCreateSchema), notificationController.createBroadcast);
router.patch('/broadcasts/:id/deactivate', notificationController.deactivateBroadcast);

// Smart Dispatch (Sprint 9)
router.get('/dispatch/recommendations', dispatchController.recommendations);
router.post('/dispatch/auto-assign', dispatchController.autoAssign);

// Operational Analytics (Sprint 10)
router.get('/analytics', adminOpsController.analytics);
router.get('/resources', adminOpsController.resources);
router.get('/weather', adminOpsController.weather);

// Audit Logs (Sprint 10)
router.get('/audit', adminOpsController.listAuditLogs);

// System Settings (Sprint 10)
router.get('/settings', adminOpsController.listSettings);
router.patch('/settings', adminOpsController.updateSettings);

module.exports = router;
