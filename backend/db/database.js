import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'sagra.sqlite');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
export const db = new Database(dbPath);

// Enable WAL mode for concurrent access
if (process.env.ENABLE_WAL !== 'false') {
  db.pragma('journal_mode = WAL');
}

// Set foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export const initializeDatabase = () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute each statement separately to handle multiple statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    statements.forEach(statement => {
      db.exec(statement);
    });

    console.log('✓ Database schema initialized');
    return true;
  } catch (error) {
    console.error('✗ Database initialization failed:', error.message);
    throw error;
  }
};

// Helper: Get item by ID with availability check
export const getItem = (itemId) => {
  return db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
};

// Helper: Get all items
export const getAllItems = () => {
  return db.prepare('SELECT * FROM items ORDER BY category, name').all();
};

// Helper: Update item stock status
export const updateItemStock = (itemId, inStock) => {
  return db.prepare(
    'UPDATE items SET in_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(inStock ? 1 : 0, itemId);
};

// Helper: Create order
export const createOrder = (qrHash, qrPayload, totalCents, items) => {
  const insertOrder = db.prepare(
    'INSERT INTO orders (qr_hash, qr_payload, total_cents) VALUES (?, ?, ?)'
  );
  const insertOrderItems = db.prepare(
    'INSERT INTO order_items (order_id, item_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    const orderResult = insertOrder.run(qrHash, qrPayload, totalCents);
    const orderId = orderResult.lastInsertRowid;

    items.forEach(({ itemId, quantity, unitPriceCents }) => {
      insertOrderItems.run(orderId, itemId, quantity, unitPriceCents);
    });

    return orderId;
  });

  return transaction();
};

// Helper: Get order by hash
export const getOrderByHash = (qrHash) => {
  return db.prepare('SELECT * FROM orders WHERE qr_hash = ?').get(qrHash);
};

// Helper: Get order with items
export const getOrderWithItems = (orderId) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;

  const items = db.prepare(
    `SELECT oi.*, i.name FROM order_items oi
     JOIN items i ON oi.item_id = i.id
     WHERE oi.order_id = ?`
  ).all(orderId);

  return { ...order, items };
};

// Helper: Update order status
export const updateOrderStatus = (orderId, status, processingNotes = null) => {
  return db.prepare(
    `UPDATE orders SET status = ?, processed_at = CURRENT_TIMESTAMP, notes = ? WHERE id = ?`
  ).run(status, processingNotes, orderId);
};

// Helper: Log scan (for audit trail and idempotency)
export const logScan = (qrHash, payload, status, errorMessage = null) => {
  return db.prepare(
    'INSERT INTO scan_log (qr_hash, payload, status, error_message) VALUES (?, ?, ?, ?)'
  ).run(qrHash, payload, status, errorMessage);
};

// Helper: Get recent scans for idempotency check
export const getRecentScans = (qrHash, windowMinutes = 10) => {
  const windowMs = windowMinutes * 60 * 1000;
  const cutoffTime = new Date(Date.now() - windowMs).toISOString();

  return db.prepare(
    'SELECT * FROM scan_log WHERE qr_hash = ? AND timestamp > ? ORDER BY timestamp DESC'
  ).all(qrHash, cutoffTime);
};

// Helper: Bulk update items (for menu refresh)
export const bulkUpdateItems = (items) => {
  const updateItem = db.prepare(
    'UPDATE items SET in_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );

  const transaction = db.transaction(() => {
    items.forEach(({ id, in_stock }) => {
      updateItem.run(in_stock ? 1 : 0, id);
    });
  });

  transaction();
};

export default db;
