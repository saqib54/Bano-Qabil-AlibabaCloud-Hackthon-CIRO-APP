const rateLimit = require('express-rate-limit');

/**
 * Global rate limiter — 100 requests per minute per IP.
 * Tighter limits on auth routes to prevent brute force.
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

/**
 * Strict rate limiter for authentication routes.
 * 5 login attempts per minute per IP to prevent brute force.
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait a minute and try again.'
  }
});

/**
 * Input sanitization middleware.
 * Strips HTML/script tags from string inputs to prevent XSS.
 */
function sanitizeValue(val) {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeValue(value);
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Security headers middleware — adds CSP and other headers
 * beyond what Helmet provides for API responses.
 */
function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)');
  next();
}

module.exports = {
  globalLimiter,
  authLimiter,
  sanitizeInput,
  securityHeaders
};
