const incidentService = require('../services/incident.service');
const { uploadIncidentImage } = require('../services/storage.service');
const asyncHandler = require('../utils/asyncHandler');

/** Multer runs first (multipart), then validation middleware, then this. */
async function create(req, res) {
  const incident = incidentService.createIncident(req.user, req.body, req.file);
  res.status(201).json({
    success: true,
    message: 'Emergency report submitted successfully',
    data: incident
  });
}

async function mine(req, res) {
  const incidents = incidentService.getMyIncidents(req.user);
  res.json({ success: true, message: 'Your reports', data: incidents });
}

async function list(req, res) {
  const incidents = incidentService.listIncidents(req.query);
  res.json({ success: true, message: 'Incidents fetched', data: incidents });
}

async function detail(req, res) {
  const incident = incidentService.getIncidentDetail(req.user, req.params.id);
  res.json({ success: true, message: 'Incident detail', data: incident });
}

async function updateStatus(req, res) {
  const incident = incidentService.updateStatus(
    req.user,
    req.params.id,
    req.body.status,
    req.body.notes
  );
  res.json({ success: true, message: 'Status updated', data: incident });
}

/** Multer middleware wrapped so validation errors surface consistently. */
const parseUpload = (req, res, next) => {
  uploadIncidentImage(req, res, (err) => {
    if (err) {
      err.statusCode = err.statusCode || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
      if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Image too large — maximum size is 5 MB';
      return next(err);
    }
    next();
  });
};

module.exports = {
  create: asyncHandler(create),
  mine: asyncHandler(mine),
  list: asyncHandler(list),
  detail: asyncHandler(detail),
  updateStatus: asyncHandler(updateStatus),
  parseUpload
};
