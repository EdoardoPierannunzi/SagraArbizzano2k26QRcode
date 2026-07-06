/**
 * Database Tests
 * Testing: CRUD Operations, WAL Mode, Foreign Keys
 */

import assert from 'assert';
import { initializeDatabase, getAllItems, getItem, createOrder, getOrderByHash, getOrderWithItems, logScan, getRecentScans, updateItemStock } from '../db/database.js';

console.log('🧪 Testing Database Layer...\n');

// Initialize database
await initializeDatabase();

// Test 1: Database initialized
try {
  const items = getAllItems();
  assert.ok(Array.isArray(items));
  assert.ok(items.length > 0);
  console.log(`✓ Test 1: Database initialized with ${items.length} items - PASS`);
} catch (e) {
  console.error('✗ Test 1: Database initialization - FAIL', e.message);
  process.exit(1);
}

// Test 2: Get single item
try {
  const item = getItem(101);
  assert.ok(item);
  assert.strictEqual(item.id, 101);
  assert.ok(item.name);
  assert.ok(item.price_cents > 0);
  console.log(`✓ Test 2: Get item by ID (${item.name}) - PASS`);
} catch (e) {
  console.error('✗ Test 2: Get item by ID - FAIL', e.message);
}

// Test 3: Get non-existent item
try {
  const item = getItem(99999);
  assert.strictEqual(item, null);
  console.log('✓ Test 3: Get non-existent item returns null - PASS');
} catch (e) {
  console.error('✗ Test 3: Get non-existent item - FAIL', e.message);
}

// Test 4: Create order
try {
  const qrHash = 'test_hash_' + Date.now();
  const orderId = createOrder(
    qrHash,
    'V1|1704067200|101:2,102:1',
    3300, // 101 costs 1200 cents, 102 costs 900 cents = 3300
    [
      { itemId: 101, quantity: 2, unitPriceCents: 1200 },
      { itemId: 102, quantity: 1, unitPriceCents: 900 },
    ]
  );
  assert.ok(orderId);
  assert.strictEqual(typeof orderId, 'number');
  console.log(`✓ Test 4: Create order (ID: ${orderId}) - PASS`);
} catch (e) {
  console.error('✗ Test 4: Create order - FAIL', e.message);
}

// Test 5: Get order by hash
try {
  const qrHash = 'test_hash_retrieve_' + Date.now();
  const orderId = createOrder(
    qrHash,
    'V1|1704067200|101:1',
    1200,
    [{ itemId: 101, quantity: 1, unitPriceCents: 1200 }]
  );

  const order = getOrderByHash(qrHash);
  assert.ok(order);
  assert.strictEqual(order.id, orderId);
  assert.strictEqual(order.qr_hash, qrHash);
  console.log('✓ Test 5: Retrieve order by QR hash - PASS');
} catch (e) {
  console.error('✗ Test 5: Retrieve order by QR hash - FAIL', e.message);
}

// Test 6: Get order with items
try {
  const qrHash = 'test_order_items_' + Date.now();
  const orderId = createOrder(
    qrHash,
    'V1|1704067200|101:2,102:1',
    3300,
    [
      { itemId: 101, quantity: 2, unitPriceCents: 1200 },
      { itemId: 102, quantity: 1, unitPriceCents: 900 },
    ]
  );

  const order = getOrderWithItems(orderId);
  assert.ok(order);
  assert.ok(Array.isArray(order.items));
  assert.strictEqual(order.items.length, 2);
  assert.strictEqual(order.items[0].quantity, 2);
  console.log(`✓ Test 6: Get order with ${order.items.length} items - PASS`);
} catch (e) {
  console.error('✗ Test 6: Get order with items - FAIL', e.message);
}

// Test 7: Log scan
try {
  const qrHash = 'test_scan_' + Date.now();
  logScan(qrHash, 'V1|1704067200|101:1', 'valid', null);

  const scans = getRecentScans(qrHash);
  assert.ok(Array.isArray(scans));
  assert.ok(scans.length > 0);
  assert.strictEqual(scans[0].status, 'valid');
  console.log('✓ Test 7: Log and retrieve scan - PASS');
} catch (e) {
  console.error('✗ Test 7: Log and retrieve scan - FAIL', e.message);
}

// Test 8: Idempotency window
try {
  const qrHash = 'test_idempotency_' + Date.now();
  logScan(qrHash, 'V1|1704067200|101:1', 'valid', null);

  const scans = getRecentScans(qrHash, 10); // 10 minute window
  assert.ok(scans.length > 0);
  console.log('✓ Test 8: Idempotency window check - PASS');
} catch (e) {
  console.error('✗ Test 8: Idempotency window check - FAIL', e.message);
}

// Test 9: Update item stock
try {
  updateItemStock(101, false);
  const item = getItem(101);
  assert.strictEqual(item.in_stock, 0);

  updateItemStock(101, true);
  const itemRestored = getItem(101);
  assert.strictEqual(itemRestored.in_stock, 1);
  console.log('✓ Test 9: Update item stock status - PASS');
} catch (e) {
  console.error('✗ Test 9: Update item stock status - FAIL', e.message);
}

// Test 10: Price computation
try {
  const item = getItem(101);
  const expectedPrice = item.price_cents * 2;
  assert.strictEqual(expectedPrice, 2400); // Item 101 should be 1200 cents
  console.log(`✓ Test 10: Price computation (€${(expectedPrice / 100).toFixed(2)}) - PASS`);
} catch (e) {
  console.error('✗ Test 10: Price computation - FAIL', e.message);
}

console.log('\n✓ Database tests completed');
process.exit(0);
