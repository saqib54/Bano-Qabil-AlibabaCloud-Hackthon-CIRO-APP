const { z } = require('zod');

const CATEGORIES = [
  'FLOOD', 'FIRE', 'ACCIDENT', 'MEDICAL', 'POWER_OUTAGE',
  'BUILDING_COLLAPSE', 'GAS_LEAK', 'SECURITY', 'EXTREME_WEATHER', 'OTHER'
];

const createIncidentSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(15, 'Please describe the emergency in at least 15 characters').max(2000),
  category: z.enum(CATEGORIES),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  locationName: z.string().trim().max(250).optional().or(z.literal('')),
  peopleAffected: z.coerce.number().int().min(0).max(100000).optional(),
  contactPhone: z.string().trim().max(30).optional().or(z.literal('')),
  extraDetails: z.string().trim().max(1000).optional().or(z.literal(''))
});

const STATUSES = [
  'REPORTED', 'AI_ANALYZED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED',
  'ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'RESOLUTION_SUBMITTED', 'RESOLVED',
  'REJECTED', 'DUPLICATE', 'CANCELLED', 'REOPENED'
];

const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  notes: z.string().trim().max(500).optional()
});

module.exports = { createIncidentSchema, updateStatusSchema, CATEGORIES, STATUSES };
