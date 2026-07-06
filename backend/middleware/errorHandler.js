import { logger } from './logger.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Send response
  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.id || 'unknown',
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
  });
};

export default errorHandler;
