const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');
const { registerSchema, loginSchema, refreshSchema, googleSchema, otpRequestSchema, otpVerifySchema } = require('../validators/auth.validator');

const router = express.Router();

// Brute-force protection for credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/google', authLimiter, validate(googleSchema), asyncHandler(authController.google));

// Email OTP sign-in: request is tightly rate-limited (10 per 15 min per IP)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many code requests, please try again later' }
});
router.post('/otp/request', otpLimiter, validate(otpRequestSchema), asyncHandler(authController.otpRequest));
router.post('/otp/verify', authLimiter, validate(otpVerifySchema), asyncHandler(authController.otpVerify));
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
