import createLogger from '../config/logger-config.js';

const logger = createLogger(process.env.LOG_LEVEL || 'info');

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

export { logger };
export default requestLogger;
