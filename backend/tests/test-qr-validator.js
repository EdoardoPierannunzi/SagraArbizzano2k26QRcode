/**
 * QR Validator Tests
 * Testing: Parse, Validate, Price Computation
 */

import assert from 'assert';
import * as qrValidator from '../services/qrValidator.js';

console.log('🧪 Testing QR Validator...\n');

// Test 1: Parse valid QR payload
try {
  const result = qrValidator.parseQRPayload('V1|1704067200|101:2,204:1');
  assert.strictEqual(result.version, 'V1');
  assert.strictEqual(result.timestamp, 1704067200);
  assert.deepStrictEqual(result.items, [
    { itemId: 101, quantity: 2 },
    { itemId: 204, quantity: 1 },
  ]);
  console.log('✓ Test 1: Parse valid QR payload - PASS');
} catch (e) {
  console.error('✗ Test 1: Parse valid QR payload - FAIL', e.message);
}

// Test 2: Reject invalid version
try {
  const result = qrValidator.parseQRPayload('V2|1704067200|101:1');
  assert.ok(result.error);
  console.log('✓ Test 2: Reject invalid version - PASS');
} catch (e) {
  console.error('✗ Test 2: Reject invalid version - FAIL', e.message);
}

// Test 3: Reject invalid timestamp
try {
  const result = qrValidator.parseQRPayload('V1|invalid|101:1');
  assert.ok(result.error);
  console.log('✓ Test 3: Reject invalid timestamp - PASS');
} catch (e) {
  console.error('✗ Test 3: Reject invalid timestamp - FAIL', e.message);
}

// Test 4: Reject zero quantity
try {
  const result = qrValidator.parseQRPayload('V1|1704067200|101:0');
  assert.ok(result.error);
  console.log('✓ Test 4: Reject zero quantity - PASS');
} catch (e) {
  console.error('✗ Test 4: Reject zero quantity - FAIL', e.message);
}

// Test 5: Reject quantity > max
try {
  const result = qrValidator.parseQRPayload('V1|1704067200|101:21');
  assert.ok(result.error);
  console.log('✓ Test 5: Reject quantity > 20 - PASS');
} catch (e) {
  console.error('✗ Test 5: Reject quantity > 20 - FAIL', e.message);
}

// Test 6: Generate QR hash
try {
  const hash1 = qrValidator.generateQRHash('V1|1704067200|101:1');
  const hash2 = qrValidator.generateQRHash('V1|1704067200|101:1');
  assert.strictEqual(hash1, hash2);
  assert.strictEqual(hash1.length, 64); // SHA256 hex = 64 chars
  console.log('✓ Test 6: Generate consistent QR hash - PASS');
} catch (e) {
  console.error('✗ Test 6: Generate consistent QR hash - FAIL', e.message);
}

// Test 7: Hash different payloads differently
try {
  const hash1 = qrValidator.generateQRHash('V1|1704067200|101:1');
  const hash2 = qrValidator.generateQRHash('V1|1704067200|101:2');
  assert.notStrictEqual(hash1, hash2);
  console.log('✓ Test 7: Different payloads = different hashes - PASS');
} catch (e) {
  console.error('✗ Test 7: Different payloads = different hashes - FAIL', e.message);
}

console.log('\n✓ QR Validator tests completed');
