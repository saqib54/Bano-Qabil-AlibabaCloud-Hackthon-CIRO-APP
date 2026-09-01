const { z } = require('zod');

const registerSchema = z.object({
  fullName: z.string().trim().min(3, 'Full name must be at least 3 characters'),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  phone: z.string().trim().min(7, 'Phone number is too short').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20, 'Refresh token is required')
});

// Google sign-in: real GIS ID token, or the dev-only demo flag (no client id configured).
const googleSchema = z
  .object({
    idToken: z.string().min(10, 'Invalid Google token').optional(),
    demo: z.boolean().optional()
  })
  .refine((data) => Boolean(data.idToken) || Boolean(data.demo), {
    message: 'A Google ID token is required'
  });

const otpRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required')
});

const otpVerifySchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from the email')
});

module.exports = { registerSchema, loginSchema, refreshSchema, googleSchema, otpRequestSchema, otpVerifySchema };
