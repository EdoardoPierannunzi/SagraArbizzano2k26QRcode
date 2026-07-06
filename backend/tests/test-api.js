/**
 * API Routes Tests
 * Testing: /api/menu, /api/validate-qr, /api/process-qr
 */

import assert from 'assert';
import { initializeDatabase, getAllItems } from '../db/database.js';

console.log('🧪 Testing API Routes...\n');

// Initialize database first
await initializeDatabase();

// Start a test server
import express from 'express';
import apiRoutes from '../routes/api.js';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

const server = app.listen(3001, () => {
  console.log('Test server running on port 3001\n');
});

// Helper to make requests
const request = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const http = new (await import('http')).Server();

    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// Test 1: GET /api/menu
try {
  const http = await import('http');
  const response = await new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/menu', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.success, true);
  assert.ok(Array.isArray(response.data.items));
  assert.ok(response.data.items.length > 0);
  console.log(`✓ Test 1: GET /api/menu (${response.data.items.length} items) - PASS`);
} catch (e) {
  console.error('✗ Test 1: GET /api/menu - FAIL', e.message);
}

// Test 2: POST /api/validate-qr (valid payload)
try {
  const http = await import('http');
  const response = await new Promise((resolve) => {
    const req = http.request('http://localhost:3001/api/validate-qr',
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        });
      }
    );
    req.write(JSON.stringify({ qrPayload: 'V1|1704067200|101:1' }));
    req.end();
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.success, true);
  assert.ok(response.data.qrHash);
  assert.ok(response.data.totalCents > 0);
  console.log(`✓ Test 2: POST /api/validate-qr (€${(response.data.totalCents / 100).toFixed(2)}) - PASS`);
} catch (e) {
  console.error('✗ Test 2: POST /api/validate-qr - FAIL', e.message);
}

// Test 3: POST /api/validate-qr (invalid item)
try {
  const http = await import('http');
  const response = await new Promise((resolve) => {
    const req = http.request('http://localhost:3001/api/validate-qr',
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        });
      }
    );
    req.write(JSON.stringify({ qrPayload: 'V1|1704067200|99999:1' }));
    req.end();
  });

  assert.strictEqual(response.status, 400);
  assert.strictEqual(response.data.success, false);
  console.log('✓ Test 3: POST /api/validate-qr rejects invalid item - PASS');
} catch (e) {
  console.error('✗ Test 3: POST /api/validate-qr invalid item - FAIL', e.message);
}

// Cleanup
setTimeout(() => {
  server.close();
  console.log('\n✓ API tests completed');
  process.exit(0);
}, 2000);
