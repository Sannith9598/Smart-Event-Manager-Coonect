const crypto = require("crypto");

/**
 * Middleware that attaches a unique request ID to each request.
 * Useful for tracing requests through logs in production.
 */
module.exports = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};
