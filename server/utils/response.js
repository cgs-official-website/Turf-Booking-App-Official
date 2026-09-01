/**
 * Standard REST Response Helpers
 * Uniform format:
 * Success: { success: true, data: { ... }, error: null }
 * Error:   { success: false, data: null, error: { code: '...', message: '...' } }
 */

const sendSuccess = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR') => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message,
    },
  });
};

const sendPaginated = (res, items = [], nextCursor = null, meta = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data: {
      items,
      nextCursor,
      ...meta,
    },
    error: null,
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
};
