// App-wide constants
export const CONSTANTS = {
  // QR Payload
  QR_VERSION: 'V1',
  QR_PAYLOAD_SEPARATOR: '|',
  QR_ITEM_SEPARATOR: ',',
  QR_ITEM_PAIR_SEPARATOR: ':',

  // Cart Validation
  MAX_QUANTITY_PER_ITEM: 20,
  MAX_ITEMS_IN_ORDER: 100,

  // Idempotency
  IDEMPOTENCY_WINDOW_MINUTES: 10,

  // Backup
  DEFAULT_BACKUP_INTERVAL_MINUTES: 15,

  // Order Status
  ORDER_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  // Scan Status
  SCAN_STATUS: {
    VALID: 'valid',
    INVALID: 'invalid',
    DUPLICATE: 'duplicate',
    OUT_OF_STOCK: 'out_of_stock',
    MALFORMED: 'malformed',
  },

  // HTTP Status Codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
  },
};

export default CONSTANTS;
