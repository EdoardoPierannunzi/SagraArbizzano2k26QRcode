-- SagraQRCode SQLite Schema
-- Write-Ahead Logging (WAL) mode enabled for concurrent access

-- Items (Menu)
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  category TEXT,
  in_stock BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders (Master order record)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_hash TEXT UNIQUE NOT NULL,
  qr_payload TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT,
  scanner_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  notes TEXT
);

-- Order Items (Line items per order)
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Scan Log (Audit trail for all QR scans)
CREATE TABLE IF NOT EXISTS scan_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_hash TEXT NOT NULL,
  payload TEXT,
  status TEXT,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_log_qr_hash ON scan_log(qr_hash);
CREATE INDEX IF NOT EXISTS idx_scan_log_timestamp ON scan_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_qr_hash ON orders(qr_hash);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_items_in_stock ON items(in_stock);
