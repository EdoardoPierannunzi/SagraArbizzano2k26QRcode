import express from 'express';
import { getOrderWithItems } from '../db/database.js';
import { updateOrderStatus } from '../db/database.js';
import * as printerService from '../services/printerService.js';

const router = express.Router();

/**
 * GET /cashier
 * Serve the cashier HTML interface
 */
router.get('/', (req, res) => {
  // Frontend will serve this
  res.send('Cashier interface would be served here');
});

/**
 * POST /api/cashier/confirm-payment
 * Cashier confirms payment for an order
 */
router.post('/api/confirm-payment', (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderId or paymentMethod',
      });
    }

    // Fetch order with items
    const order = getOrderWithItems(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: 'Order is no longer pending',
        status: order.status,
      });
    }

    // Update order status
    updateOrderStatus(orderId, 'completed', paymentMethod);

    // Trigger hardware integration (printer, KDS, payment terminal)
    // These calls are mocked in the printerService
    printerService.processCompleteOrder(order, paymentMethod).catch(err => {
      console.error('Hardware integration error:', err.message);
      // Don't fail the order if hardware fails
    });

    res.json({
      success: true,
      orderId,
      status: 'completed',
      paymentMethod,
      totalCents: order.total_cents,
      message: 'Payment confirmed. Order is being prepared.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/cashier/order/:orderId
 * Get order details for display
 */
router.get('/api/order/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = getOrderWithItems(parseInt(orderId, 10));

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
