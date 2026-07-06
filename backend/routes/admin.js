import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllItems, bulkUpdateItems } from '../db/database.js';
import verifyAdminPassword from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * GET /admin-dashboard
 * Serve admin HTML interface
 */
router.get('/', (req, res) => {
  // Frontend will serve this
  res.send('Admin dashboard would be served here');
});

/**
 * GET /api/admin/menu
 * Fetch menu for admin (requires auth)
 */
router.get('/api/menu', verifyAdminPassword, (req, res) => {
  try {
    const items = getAllItems();
    res.json({
      success: true,
      items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/menu
 * Update menu items (requires auth)
 */
router.put('/api/menu', verifyAdminPassword, (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array',
      });
    }

    // Update items in database
    bulkUpdateItems(items);

    // Also update menu.json file
    const menuPath = path.join(__dirname, '..', '..', 'public', 'menu.json');
    const updatedItems = getAllItems();
    fs.writeFileSync(menuPath, JSON.stringify(updatedItems, null, 2));

    res.json({
      success: true,
      message: 'Menu updated successfully',
      itemsUpdated: items.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/menu-export
 * Export menu as JSON (requires auth)
 */
router.post('/api/menu-export', verifyAdminPassword, (req, res) => {
  try {
    const items = getAllItems();
    res.json({
      success: true,
      export: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        items,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
