/**
 * errorHandler.js - Centralized Production Express Error Handler
 * Returns normalized JSON payloads and prevents leaking sensitive stack traces or API keys.
 */
const config = require('../config/env');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');

  // Sanitize message to never leak secrets
  let message = err.message || 'An unexpected error occurred.';
  if (message.includes('API key') || message.includes('sk_') || message.includes('gsk_')) {
    message = 'An external service authentication error occurred. Please contact support.';
  }

  // Structured logging of error
  console.error(`[Error Handler] ${req.method} ${req.originalUrl} [${statusCode}] ${errorCode}:`, err.message);

  const responsePayload = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  if (!config.isProduction && err.stack) {
    responsePayload.error.details = err.stack.split('\n').slice(0, 4);
  }

  res.status(statusCode).json(responsePayload);
}

module.exports = errorHandler;
