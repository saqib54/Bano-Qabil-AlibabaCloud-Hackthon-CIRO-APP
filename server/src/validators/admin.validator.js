const { z } = require('zod');

const verifySchema = z.object({
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  notes: z.string().trim().max(500).optional()
});

const assignSchema = z.object({
  departmentId: z.string().uuid('Invalid department ID'),
  staffId: z.string().uuid('Invalid staff ID').optional().nullable(),
  notes: z.string().trim().max(500).optional()
});

const resolutionActionSchema = z.object({
  notes: z.string().trim().max(500).optional()
});

const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name required').max(100),
  code: z.string().trim().min(2).max(30).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  description: z.string().trim().max(300).optional(),
  contact: z.string().trim().max(30).optional()
});

const departmentUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(300).optional(),
  contact: z.string().trim().max(30).optional()
});

const staffCreateSchema = z.object({
  fullName: z.string().trim().min(3, 'Full name must be at least 3 characters').max(100),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
  departmentId: z.string().uuid('Invalid department ID'),
  designation: z.string().trim().min(2, 'Designation is required').max(100)
});

const staffUpdateSchema = z.object({
  fullName: z.string().trim().min(3).max(100).optional(),
  email: z.string().trim().toLowerCase().email('A valid email is required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72).optional(),
  designation: z.string().trim().max(100).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  dutyStatus: z.enum(['ON_DUTY', 'OFF_DUTY', 'DEPLOYED']).optional()
});

const userCreateSchema = z.object({
  fullName: z.string().trim().min(3, 'Full name must be at least 3 characters').max(100),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
  role: z.enum(['PUBLIC', 'STAFF']).default('PUBLIC')
});

const userUpdateSchema = z.object({
  fullName: z.string().trim().min(3, 'Full name must be at least 3 characters').max(100).optional(),
  email: z.string().trim().toLowerCase().email('A valid email is required').optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72).optional(),
  isActive: z.boolean().optional()
});

const broadcastCreateSchema = z.object({
  title: z.string().trim().min(3, 'Title required').max(200),
  message: z.string().trim().min(10, 'Message required (min 10 chars)').max(2000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  targetAudience: z.enum(['ALL', 'PUBLIC', 'STAFF']).default('ALL'),
  regions: z.string().trim().max(200).optional()
});

module.exports = { verifySchema, assignSchema, resolutionActionSchema, departmentCreateSchema, departmentUpdateSchema, staffCreateSchema, staffUpdateSchema, userCreateSchema, userUpdateSchema, broadcastCreateSchema };
