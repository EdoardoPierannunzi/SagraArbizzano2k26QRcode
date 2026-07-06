import express from 'express';
import { getAllItems, createOrder } from '../db/database.js';
import * as qrValidator from '../services/qrValidator.js';
import * as idempotencyService from '../services/idempotencyService.js';

const router = express.Router();

/**
 * GET /api/menu
 * Fetch all menu items (for PWA sync)
 */
router.get('/menu', (req, res) => {
  try {
    const items = getAllItems();
    res.json({
      success: true,
      items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/validate-qr
 * Validate QR payload (frontend calls before showing order confirmation)
 */
router.post('/validate-qr', (req, res) => {
  try {
    const { qrPayload } = req.body;

    if (!qrPayload) {
      return res.status(400).json({
        success: false,
        error: 'Missing qrPayload in request',
      });
    }

    // Parse and validate QR
    const validation = qrValidator.validateQR(qrPayload);

    if (!validation.valid) {
      idempotencyService.recordScanAttempt(
        validation.qrHash || 'unknown',
        qrPayload,
        validation.isDuplicate ? 'duplicate' : 'invalid',
        validation.error
      );

      return res.status(400).json({
        success: false,
        error: validation.error,
        isDuplicate: validation.isDuplicate || false,
      });
    }

    // Return validation result (but don't create order yet)
    res.json({
      success: true,
      qrHash: validation.qrHash,
      items: validation.items,
      totalCents: validation.totalCents,
      message: 'QR is valid. Proceed to cashier for payment.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/process-qr
 * Process validated QR (create order in database)
 * Called by cashier system after scanning
 */
router.post('/process-qr', (req, res) => {
  try {
    const { qrPayload } = req.body;

    if (!qrPayload) {
      return res.status(400).json({
        success: false,
        error: 'Missing qrPayload in request',
      });
    }

    // Parse and validate QR
    const validation = qrValidator.validateQR(qrPayload);

    if (!validation.valid) {
      idempotencyService.recordScanAttempt(
        validation.qrHash || 'unknown',
        qrPayload,
        'invalid',
        validation.error
      );

      const statusCode = validation.isDuplicate ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        error: validation.error,
        isDuplicate: validation.isDuplicate || false,
      });
    }

    // Check idempotency (prevent double-scan)
    const idempotencyCheck = idempotencyService.checkIdempotency(validation.qrHash);
    if (!idempotencyCheck.allowed) {
      idempotencyService.recordScanAttempt(
        validation.qrHash,
        qrPayload,
        'duplicate',
        'Recently scanned'
      );

      return res.status(409).json({
        success: false,
        error: idempotencyCheck.reason,
        isDuplicate: true,
        previousScan: idempotencyCheck.previousScan,
      });
    }

    // Create order in database
    const orderId = createOrder(
      validation.qrHash,
      qrPayload,
      validation.totalCents,
      validation.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPriceCents: item.priceCents,
      }))
    );

    // Record successful scan
    idempotencyService.recordScanAttempt(
      validation.qrHash,
      qrPayload,
      'valid',
      null
    );

    res.status(201).json({
      success: true,
      orderId,
      qrHash: validation.qrHash,
      totalCents: validation.totalCents,
      message: 'Order created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
