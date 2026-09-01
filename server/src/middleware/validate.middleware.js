const ApiError = require('../utils/ApiError');

/**
 * Wraps a Zod schema into Express middleware.
 * On failure responds with the standard error shape containing field errors.
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
