/**
 * Express 4 does not forward rejected promises from async handlers to the
 * error middleware. This wrapper guarantees every thrown error reaches it.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
