const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const message =
    status >= 500 && !env.isProduction ? err.message : status >= 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    message,
    errors: err.details || undefined
  });
}

module.exports = { notFoundHandler, errorHandler };
