const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const userRepository = require('../repositories/user.repository');

/**
 * Verifies the Bearer access token and attaches the user to req.user.
 */
function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Authentication required');
    }

    const payload = jwt.verify(token, env.jwt.secret);
    const user = userRepository.findById(payload.sub);

    if (!user || !user.is_active) {
      throw ApiError.unauthorized('Account is not active or no longer exists');
    }

    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token expired'));
    }
    return next(ApiError.unauthorized('Invalid access token'));
  }
}

/**
 * Role-based access control. Usage: requireRoles('ADMIN', 'STAFF')
 * Roles are always enforced server-side; frontend role claims are never trusted.
 */
function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRoles };
