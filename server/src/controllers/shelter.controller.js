/**
 * Shelter & map controller — Sprint 8
 */
const shelterService = require('../services/shelter.service');
const incidentService = require('../services/incident.service');
const asyncHandler = require('../utils/asyncHandler');

// ── Shelter CRUD (admin) ─────────────────────────────

async function listShelters(req, res) {
  const data = shelterService.listShelters(req.query);
  res.json({ success: true, message: 'Shelters', data });
}

async function shelterDetail(req, res) {
  const data = shelterService.getShelter(req.params.id);
  res.json({ success: true, message: 'Shelter detail', data });
}

async function createShelter(req, res) {
  const data = shelterService.createShelter(req.body);
  res.status(201).json({ success: true, message: 'Shelter created', data });
}

async function updateShelter(req, res) {
  const data = shelterService.updateShelter(req.params.id, req.body);
  res.json({ success: true, message: 'Shelter updated', data });
}

async function toggleShelter(req, res) {
  const data = shelterService.toggleShelter(req.params.id);
  res.json({ success: true, message: 'Shelter toggled', data });
}

async function deleteShelter(req, res) {
  const data = shelterService.deleteShelter(req.params.id);
  res.json({ success: true, message: 'Shelter deleted', data });
}

// ── Map data (shared) ────────────────────────────────

async function mapIncidents(req, res) {
  const data = incidentService.getMapIncidents(req.query);
  res.json({ success: true, message: 'Map incidents', data });
}

async function mapResponders(req, res) {
  const data = incidentService.getMapResponders();
  res.json({ success: true, message: 'Active responders', data });
}

module.exports = {
  listShelters: asyncHandler(listShelters),
  shelterDetail: asyncHandler(shelterDetail),
  createShelter: asyncHandler(createShelter),
  updateShelter: asyncHandler(updateShelter),
  toggleShelter: asyncHandler(toggleShelter),
  deleteShelter: asyncHandler(deleteShelter),
  mapIncidents: asyncHandler(mapIncidents),
  mapResponders: asyncHandler(mapResponders)
};
