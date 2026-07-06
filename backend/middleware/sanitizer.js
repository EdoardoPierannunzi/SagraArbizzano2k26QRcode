/**
 * Input Sanitization Middleware
 * Prevents SQL injection and other input attacks
 */

/**
 * Sanitize string input
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;

  // Remove any characters that aren't alphanumeric, dots, pipes, colons, or commas
  // (valid for QR payloads like "V1|1704067200|101:2,204:1")
  return input.replace(/[^a-zA-Z0-9.|:,\s\-_]/g, '');
};

/**
 * Middleware to sanitize QR payload input
 */
export const sanitizeQRPayload = (req, res, next) => {
  if (req.body && req.body.qrPayload) {
    req.body.qrPayload = sanitizeString(req.body.qrPayload).trim();
  }

  if (req.query && req.query.qr) {
    req.query.qr = sanitizeString(req.query.qr).trim();
  }

  next();
};

/**
 * Middleware to sanitize admin password
 */
export const sanitizePassword = (req, res, next) => {
  if (req.body && req.body.password) {
    req.body.password = sanitizeString(req.body.password);
  }

  if (req.headers['x-admin-password']) {
    req.headers['x-admin-password'] = sanitizeString(req.headers['x-admin-password']);
  }

  next();
};

export default {
  sanitizeString,
  sanitizeQRPayload,
  sanitizePassword,
};
