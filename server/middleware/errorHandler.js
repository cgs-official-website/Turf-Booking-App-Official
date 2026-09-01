const { ZodError } = require('zod');
const { sendError } = require('../utils/response');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return sendError(res, messages, 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return sendError(res, 'Invalid JSON payload received', 400, 'INVALID_JSON');
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'SERVER_ERROR';

  return sendError(res, message, statusCode, code);
};

module.exports = errorHandler;
