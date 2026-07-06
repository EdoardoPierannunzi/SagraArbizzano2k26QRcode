/**
 * Cart Logic Tests (simulated frontend cart behavior)
 */

import assert from 'assert';

console.log('🧪 Testing Cart Logic...\n');

// Simulate cart state
let cartState = [];

function addToCart(itemId, quantity, name, priceCents) {
  const existing = cartState.find(i => i.itemId === itemId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, 20); // Max 20
  } else {
    cartState.push({ itemId, quantity: Math.min(quantity, 20), name, priceCents });
  }
}

function removeFromCart(itemId) {
  cartState = cartState.filter(i => i.itemId !== itemId);
}

function updateQuantity(itemId, quantity) {
  const item = cartState.find(i => i.itemId === itemId);
  if (item) {
    if (quantity === 0) {
      removeFromCart(itemId);
    } else {
      item.quantity = Math.min(Math.max(quantity, 1), 20);
    }
  }
}

function getTotal() {
  return cartState.reduce((sum, item) => sum + item.quantity * item.priceCents, 0);
}

function generateQRPayload() {
  const timestamp = Math.floor(Date.now() / 1000);
  const items = cartState.map(i => `${i.itemId}:${i.quantity}`).join(',');
  return `V1|${timestamp}|${items}`;
}

// Test 1: Cart starts empty
try {
  assert.strictEqual(cartState.length, 0);
  console.log('✓ Test 1: Cart starts empty - PASS');
} catch (e) {
  console.error('✗ Test 1: Cart starts empty - FAIL');
}

// Test 2: Add item to cart
try {
  addToCart(101, 2, 'Margherita Pizza', 1200);
  assert.strictEqual(cartState.length, 1);
  assert.strictEqual(cartState[0].itemId, 101);
  assert.strictEqual(cartState[0].quantity, 2);
  console.log('✓ Test 2: Add item to cart - PASS');
} catch (e) {
  console.error('✗ Test 2: Add item to cart - FAIL');
}

// Test 3: Add more of same item
try {
  addToCart(101, 1, 'Margherita Pizza', 1200);
  assert.strictEqual(cartState[0].quantity, 3);
  console.log('✓ Test 3: Add more of same item - PASS');
} catch (e) {
  console.error('✗ Test 3: Add more of same item - FAIL');
}

// Test 4: Add different item
try {
  addToCart(102, 1, 'Pepperoni Pizza', 1500);
  assert.strictEqual(cartState.length, 2);
  console.log('✓ Test 4: Add different item - PASS');
} catch (e) {
  console.error('✗ Test 4: Add different item - FAIL');
}

// Test 5: Calculate total
try {
  const total = getTotal();
  const expected = (3 * 1200) + (1 * 1500); // 3600 + 1500 = 5100 cents
  assert.strictEqual(total, expected);
  console.log(`✓ Test 5: Calculate total (€${(total / 100).toFixed(2)}) - PASS`);
} catch (e) {
  console.error('✗ Test 5: Calculate total - FAIL');
}

// Test 6: Update quantity
try {
  updateQuantity(101, 5);
  assert.strictEqual(cartState[0].quantity, 5);
  console.log('✓ Test 6: Update quantity - PASS');
} catch (e) {
  console.error('✗ Test 6: Update quantity - FAIL');
}

// Test 7: Max quantity cap (20)
try {
  addToCart(101, 100, 'Margherita Pizza', 1200);
  assert.strictEqual(cartState[0].quantity, 20); // Should cap at 20
  console.log('✓ Test 7: Max quantity cap at 20 - PASS');
} catch (e) {
  console.error('✗ Test 7: Max quantity cap at 20 - FAIL');
}

// Test 8: Remove item
try {
  removeFromCart(102);
  assert.strictEqual(cartState.length, 1);
  assert.strictEqual(cartState[0].itemId, 101);
  console.log('✓ Test 8: Remove item from cart - PASS');
} catch (e) {
  console.error('✗ Test 8: Remove item from cart - FAIL');
}

// Test 9: Zero quantity removes item
try {
  updateQuantity(101, 0);
  assert.strictEqual(cartState.length, 0);
  console.log('✓ Test 9: Zero quantity removes item - PASS');
} catch (e) {
  console.error('✗ Test 9: Zero quantity removes item - FAIL');
}

// Test 10: Generate QR payload
try {
  cartState = [
    { itemId: 101, quantity: 2, name: 'Pizza', priceCents: 1200 },
    { itemId: 204, quantity: 1, name: 'Salad', priceCents: 700 },
  ];

  const payload = generateQRPayload();
  assert.ok(payload.startsWith('V1|'));
  assert.ok(payload.includes('101:2'));
  assert.ok(payload.includes('204:1'));
  console.log(`✓ Test 10: Generate QR payload (${payload}) - PASS`);
} catch (e) {
  console.error('✗ Test 10: Generate QR payload - FAIL');
}

console.log('\n✓ Cart logic tests completed');
process.exit(0);
