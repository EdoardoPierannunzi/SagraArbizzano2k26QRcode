import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'sagra.sqlite');

let SQL;
let db;

// Initialize SQL.js
export const initializeDatabase = async () => {
  try {
    console.log('📦 [DB] Loading SQL.js...');
    SQL = await initSqlJs();

    // Load existing database or create new
    if (fs.existsSync(dbPath)) {
      console.log('📂 [DB] Loading database from disk...');
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      console.log('✨ [DB] Creating new database...');
      db = new SQL.Database();
    }

    // Initialize schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute each statement separately
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        db.run(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.error('[DB] Schema error:', error.message);
        }
      }
    }

    // Save to disk
    saveDatabase();

    // Load seed data if database is empty
    const itemCount = db.exec('SELECT COUNT(*) as count FROM items');
    const count = itemCount.length > 0 ? itemCount[0].values[0][0] : 0;

    if (count === 0) {
      console.log('📥 Database empty, loading seed menu...');
      try {
        const menuPath = path.join(__dirname, '..', '..', 'public', 'menu.json');
        if (fs.existsSync(menuPath)) {
          const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

          for (const item of menuData) {
            db.run(
              'INSERT INTO items (id, name, price_cents, category, in_stock) VALUES (?, ?, ?, ?, ?)',
              [item.id, item.name, item.price_cents, item.category, item.in_stock ? 1 : 0]
            );
          }

          saveDatabase();
          console.log(`✓ Loaded ${menuData.length} items from menu.json`);
        }
      } catch (error) {
        console.warn('⚠️ Could not load seed menu:', error.message);
      }
    }

    console.log('✓ Database schema initialized');
    return true;
  } catch (error) {
    console.error('✗ Database initialization failed:', error.message);
    throw error;
  }
};

// Save database to disk
export const saveDatabase = () => {
  try {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error('[DB] Save error:', error.message);
  }
};

// Helper: Get item by ID
export const getItem = (itemId) => {
  try {
    const result = db.exec(
      'SELECT * FROM items WHERE id = ?',
      [itemId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const columns = result[0].columns;
    const values = result[0].values[0];
    return Object.fromEntries(columns.map((col, i) => [col, values[i]]));
  } catch (error) {
    console.error('[DB] Get item error:', error.message);
    return null;
  }
};

// Helper: Get all items
export const getAllItems = () => {
  try {
    const result = db.exec('SELECT * FROM items ORDER BY category, name');

    if (result.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map(values =>
      Object.fromEntries(columns.map((col, i) => [col, values[i]]))
    );
  } catch (error) {
    console.error('[DB] Get all items error:', error.message);
    return [];
  }
};

// Helper: Update item stock status
export const updateItemStock = (itemId, inStock) => {
  try {
    db.run(
      'UPDATE items SET in_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [inStock ? 1 : 0, itemId]
    );
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('[DB] Update stock error:', error.message);
    return { success: false, error: error.message };
  }
};

// Helper: Create order
export const createOrder = (qrHash, qrPayload, totalCents, items) => {
  try {
    // Insert order
    db.run(
      'INSERT INTO orders (qr_hash, qr_payload, total_cents) VALUES (?, ?, ?)',
      [qrHash, qrPayload, totalCents]
    );

    // Get the order ID
    const result = db.exec('SELECT last_insert_rowid() as id');
    const orderId =
      result.length > 0 ? result[0].values[0][0] : null;

    if (!orderId) {
      throw new Error('Failed to get order ID');
    }

    // Insert order items
    for (const { itemId, quantity, unitPriceCents } of items) {
      db.run(
        'INSERT INTO order_items (order_id, item_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)',
        [orderId, itemId, quantity, unitPriceCents]
      );
    }

    saveDatabase();
    return orderId;
  } catch (error) {
    console.error('[DB] Create order error:', error.message);
    throw error;
  }
};

// Helper: Get order by hash
export const getOrderByHash = (qrHash) => {
  try {
    const result = db.exec('SELECT * FROM orders WHERE qr_hash = ?', [qrHash]);

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const columns = result[0].columns;
    const values = result[0].values[0];
    return Object.fromEntries(columns.map((col, i) => [col, values[i]]));
  } catch (error) {
    console.error('[DB] Get order error:', error.message);
    return null;
  }
};

// Helper: Get order with items
export const getOrderWithItems = (orderId) => {
  try {
    const orderResult = db.exec('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orderResult.length === 0 || orderResult[0].values.length === 0) {
      return null;
    }

    const orderColumns = orderResult[0].columns;
    const orderValues = orderResult[0].values[0];
    const order = Object.fromEntries(
      orderColumns.map((col, i) => [col, orderValues[i]])
    );

    // Get items
    const itemsResult = db.exec(
      `SELECT oi.*, i.name FROM order_items oi
       JOIN items i ON oi.item_id = i.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    let items = [];
    if (itemsResult.length > 0) {
      const itemColumns = itemsResult[0].columns;
      items = itemsResult[0].values.map(values =>
        Object.fromEntries(itemColumns.map((col, i) => [col, values[i]]))
      );
    }

    return { ...order, items };
  } catch (error) {
    console.error('[DB] Get order with items error:', error.message);
    return null;
  }
};

// Helper: Update order status
export const updateOrderStatus = (orderId, status, processingNotes = null) => {
  try {
    db.run(
      `UPDATE orders SET status = ?, processed_at = CURRENT_TIMESTAMP, notes = ? WHERE id = ?`,
      [status, processingNotes, orderId]
    );
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('[DB] Update status error:', error.message);
    return { success: false, error: error.message };
  }
};

// Helper: Log scan
export const logScan = (qrHash, payload, status, errorMessage = null) => {
  try {
    db.run(
      'INSERT INTO scan_log (qr_hash, payload, status, error_message) VALUES (?, ?, ?, ?)',
      [qrHash, payload, status, errorMessage]
    );
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('[DB] Log scan error:', error.message);
    return { success: false, error: error.message };
  }
};

// Helper: Get recent scans for idempotency check
export const getRecentScans = (qrHash, windowMinutes = 10) => {
  try {
    // Use SQLite's datetime functions for proper comparison
    const result = db.exec(
      `SELECT * FROM scan_log
       WHERE qr_hash = ?
       AND timestamp > datetime('now', '-${windowMinutes} minutes')
       ORDER BY timestamp DESC`,
      [qrHash]
    );

    if (result.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map(values =>
      Object.fromEntries(columns.map((col, i) => [col, values[i]]))
    );
  } catch (error) {
    console.error('[DB] Get recent scans error:', error.message);
    return [];
  }
};

// Helper: Bulk update items
export const bulkUpdateItems = (items) => {
  try {
    for (const { id, in_stock } of items) {
      db.run(
        'UPDATE items SET in_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [in_stock ? 1 : 0, id]
      );
    }
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('[DB] Bulk update error:', error.message);
    return { success: false, error: error.message };
  }
};

// Export getter for raw db (for advanced queries if needed)
export const getDatabase = () => db;

export default {
  initializeDatabase,
  getItem,
  getAllItems,
  updateItemStock,
  createOrder,
  getOrderByHash,
  getOrderWithItems,
  updateOrderStatus,
  logScan,
  getRecentScans,
  bulkUpdateItems,
};
