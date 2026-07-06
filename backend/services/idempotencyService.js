import { getRecentScans, logScan } from '../db/database.js';
import CONSTANTS from '../config/constants.js';

/**
 * Idempotency Service
 * Prevents double-scan of QR codes within a time window
 */

/**
 * Check if QR hash was recently scanned
 */
export const isQRRecentlyScanned = (qrHash, windowMinutes = CONSTANTS.IDEMPOTENCY_WINDOW_MINUTES) => {
  const recentScans = getRecentScans(qrHash, windowMinutes);
  return recentScans.length > 0;
};

/**
 * Get most recent scan status
 */
export const getMostRecentScan = (qrHash, windowMinutes = CONSTANTS.IDEMPOTENCY_WINDOW_MINUTES) => {
  const recentScans = getRecentScans(qrHash, windowMinutes);
  return recentScans.length > 0 ? recentScans[0] : null;
};

/**
 * Record a scan attempt
 */
export const recordScanAttempt = (qrHash, payload, status, errorMessage = null) => {
  return logScan(qrHash, payload, status, errorMessage);
};

/**
 * Validate idempotency for a QR scan
 * Returns: { allowed: boolean, reason?: string, previousScan?: object }
 */
export const checkIdempotency = (
  qrHash,
  windowMinutes = CONSTANTS.IDEMPOTENCY_WINDOW_MINUTES
) => {
  const previousScan = getMostRecentScan(qrHash, windowMinutes);

  if (!previousScan) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `QR was already scanned ${windowMinutes} minutes ago`,
    previousScan: {
      id: previousScan.id,
      status: previousScan.status,
      timestamp: previousScan.timestamp,
    },
  };
};

export default {
  isQRRecentlyScanned,
  getMostRecentScan,
  recordScanAttempt,
  checkIdempotency,
};
