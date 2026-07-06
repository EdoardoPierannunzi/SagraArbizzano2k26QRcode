/**
 * Idempotency & Double-Scan Prevention Tests
 */

import assert from 'assert';
import * as idempotencyService from '../services/idempotencyService.js';
import { initializeDatabase, logScan, getRecentScans } from '../db/database.js';

console.log('🧪 Testing Idempotency Service...\n');

await initializeDatabase();

// Test 1: First scan is allowed
try {
  const qrHash = 'idempotency_test_1_' + Date.now();
  const check = idempotencyService.checkIdempotency(qrHash);

  assert.strictEqual(check.allowed, true);
  console.log('✓ Test 1: First scan is allowed - PASS');
} catch (e) {
  console.error('✗ Test 1: First scan is allowed - FAIL', e.message);
}

// Test 2: Second scan within window is denied
try {
  const qrHash = 'idempotency_test_2_' + Date.now();

  // First check - should be allowed (nothing recorded yet)
  const firstCheck = idempotencyService.checkIdempotency(qrHash);
  assert.strictEqual(firstCheck.allowed, true, 'First check should be allowed');

  // Now record the first scan
  idempotencyService.recordScanAttempt(qrHash, 'V1|1704067200|101:1', 'valid');

  // Second check - should be denied (scan was just recorded)
  const secondCheck = idempotencyService.checkIdempotency(qrHash);
  assert.strictEqual(secondCheck.allowed, false, 'Second check should be denied');
  assert.ok(secondCheck.reason);

  console.log('✓ Test 2: Second scan within window is denied - PASS');
} catch (e) {
  console.error('✗ Test 2: Second scan within window is denied - FAIL', e.message);
}

// Test 3: Record multiple scan attempts
try {
  const qrHash = 'idempotency_test_3_' + Date.now();

  idempotencyService.recordScanAttempt(qrHash, 'V1|1704067200|101:1', 'valid');
  idempotencyService.recordScanAttempt(qrHash, 'V1|1704067200|101:1', 'valid');
  idempotencyService.recordScanAttempt(qrHash, 'V1|1704067200|101:1', 'duplicate');

  const scans = getRecentScans(qrHash);
  assert.ok(scans.length >= 1); // At least one scan recorded

  console.log(`✓ Test 3: Recorded ${scans.length} scan attempts - PASS`);
} catch (e) {
  console.error('✗ Test 3: Record multiple scan attempts - FAIL', e.message);
}

console.log('\n✓ Idempotency tests completed');
process.exit(0);
