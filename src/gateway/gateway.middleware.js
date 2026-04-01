'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * API Gateway Middleware
 * - Assigns unique X-Request-ID to every request
 * - Logs method, path, status, and duration
 * - Adds basic security headers
 */
function gatewayMiddleware(req, res, next) {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(
      `[GATEWAY] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms) [${requestId}]`
    );
  });

  next();
}

/**
 * Global error handler — catches any error passed via next(err)
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] [${req.requestId || '-'}]`, err.message || err);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    requestId: req.requestId,
  });
}

module.exports = { gatewayMiddleware, errorHandler };
