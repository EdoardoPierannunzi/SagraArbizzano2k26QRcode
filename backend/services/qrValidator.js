import crypto from 'crypto';
import CONSTANTS from '../config/constants.js';
import { getItem, logScan, getOrderByHash } from '../db/database.js';

/**
 * QR Validator Service
 * Parses and validates QR payloads in format: V1|<TIMESTAMP>|<ID>:<QTY>,...
 */

export const parseQRPayload = (rawPayload) => {
  const parts = rawPayload.trim().split(CONSTANTS.QR_PAYLOAD_SEPARATOR);

  if (parts.length < 3) {
    return { error: 'Malformed QR: insufficient parts' };
  }

  const [version, timestampStr, itemsStr] = parts;

  // Validate version
  if (version !== CONSTANTS.QR_VERSION) {
    return { error: `Invalid QR version: expected ${CONSTANTS.QR_VERSION}, got ${version}` };
  }

  // Validate timestamp
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { error: 'Invalid timestamp in QR' };
  }

  // Parse items
  const items = [];
  const itemPairs = itemsStr.split(CONSTANTS.QR_ITEM_SEPARATOR);

  for (const pair of itemPairs) {
    const [idStr, qtyStr] = pair.split(CONSTANTS.QR_ITEM_PAIR_SEPARATOR);
    const itemId = parseInt(idStr, 10);
    const quantity = parseInt(qtyStr, 10);

    if (isNaN(itemId) || isNaN(quantity)) {
      return { error: `Invalid item pair: ${pair}` };
    }

    if (quantity <= 0 || quantity > CONSTANTS.MAX_QUANTITY_PER_ITEM) {
      return { error: `Invalid quantity: ${quantity}` };
    }

    items.push({ itemId, quantity });
  }

  if (items.length === 0 || items.length > CONSTANTS.MAX_ITEMS_IN_ORDER) {
    return { error: 'Invalid number of items in QR' };
  }

  return { version, timestamp, items };
};

/**
 * Validate items exist and are in stock
 */
export const validateItemsAvailability = (items) => {
  const validatedItems = [];

  for (const { itemId, quantity } of items) {
    const item = getItem(itemId);

    if (!item) {
      return { error: `Item not found: ${itemId}` };
    }

    if (!item.in_stock) {
      return { error: `Item out of stock: ${item.name}` };
    }

    validatedItems.push({
      itemId,
      quantity,
      name: item.name,
      priceCents: item.price_cents,
    });
  }

  return { validatedItems };
};

/**
 * Compute total price server-side (SECURITY CRITICAL)
 * NEVER trust frontend pricing
 */
export const computeOrderTotal = (validatedItems) => {
  let totalCents = 0;

  for (const { quantity, priceCents } of validatedItems) {
    totalCents += quantity * priceCents;
  }

  return totalCents;
};

/**
 * Generate QR hash for idempotency checking
 */
export const generateQRHash = (payload) => {
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Comprehensive QR validation
 */
export const validateQR = (rawPayload) => {
  // 1. Parse payload
  const parseResult = parseQRPayload(rawPayload);
  if (parseResult.error) {
    return { valid: false, error: parseResult.error };
  }

  // 2. Validate items exist and are in stock
  const availabilityResult = validateItemsAvailability(parseResult.items);
  if (availabilityResult.error) {
    return { valid: false, error: availabilityResult.error };
  }

  // 3. Compute total price
  const totalCents = computeOrderTotal(availabilityResult.validatedItems);

  // 4. Generate hash
  const qrHash = generateQRHash(rawPayload);

  // 5. Check if order already exists (double-scan detection)
  const existingOrder = getOrderByHash(qrHash);
  if (existingOrder) {
    return {
      valid: false,
      isDuplicate: true,
      error: 'This QR has already been scanned',
      existingOrderId: existingOrder.id,
    };
  }

  return {
    valid: true,
    qrHash,
    payload: rawPayload,
    timestamp: parseResult.timestamp,
    items: availabilityResult.validatedItems,
    totalCents,
  };
};

export default {
  parseQRPayload,
  validateItemsAvailability,
  computeOrderTotal,
  generateQRHash,
  validateQR,
};
