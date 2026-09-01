const { z } = require('zod');

const statusUpdateSchema = z.object({
  status: z.enum(['EN_ROUTE', 'ON_SCENE']),
  notes: z.string().trim().max(500).optional()
});

const situationLogSchema = z.object({
  note: z.string().trim().min(3, 'Note must be at least 3 characters').max(500)
});

const resolutionSchema = z.object({
  resolutionNotes: z.string().trim().min(10, 'Resolution notes must be at least 10 characters').max(2000),
  resourcesUsed: z.string().trim().max(500).optional().or(z.literal('')),
  followUpRequired: z.coerce.boolean().optional()
});

const dutyStatusSchema = z.object({
  dutyStatus: z.enum(['ON_DUTY', 'OFF_DUTY'])
});

module.exports = { statusUpdateSchema, situationLogSchema, resolutionSchema, dutyStatusSchema };
