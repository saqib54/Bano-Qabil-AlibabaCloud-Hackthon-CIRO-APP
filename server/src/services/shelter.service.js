/**
 * Shelter & safe-places service — Sprint 8
 */
const shelterRepository = require('../repositories/shelter.repository');
const ApiError = require('../utils/ApiError');

function listShelters(query = {}) {
  const activeOnly = query.all !== 'true';
  return shelterRepository.listAll({ activeOnly });
}

function getShelter(id) {
  const shelter = shelterRepository.findById(id);
  if (!shelter) throw ApiError.notFound('Shelter not found');
  return shelter;
}

function createShelter(data) {
  if (!data.name || data.latitude == null || data.longitude == null) {
    throw ApiError.badRequest('Name, latitude and longitude are required');
  }
  return shelterRepository.create(data);
}

function updateShelter(id, data) {
  const existing = shelterRepository.findById(id);
  if (!existing) throw ApiError.notFound('Shelter not found');
  return shelterRepository.update(id, data);
}

function toggleShelter(id) {
  const result = shelterRepository.toggle(id);
  if (!result) throw ApiError.notFound('Shelter not found');
  return result;
}

function deleteShelter(id) {
  const existing = shelterRepository.findById(id);
  if (!existing) throw ApiError.notFound('Shelter not found');
  shelterRepository.delete(id);
  return { id, deleted: true };
}

module.exports = {
  listShelters,
  getShelter,
  createShelter,
  updateShelter,
  toggleShelter,
  deleteShelter
};
