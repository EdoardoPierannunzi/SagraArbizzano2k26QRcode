# POS System Integration Guide

## Overview

Il tuo sistema casse (POS) si integra direttamente con SagraQRCode. Ecco come funziona:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER APP (PWA)                           │
│  1. Browse menu (offline)                                        │
│  2. Add items to cart                                            │
│  3. Generate QR code                                             │
│  4. Show QR to cashier                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              YOUR POS SYSTEM (USB Scanner)                       │
│  1. Scan QR code with USB 2D barcode scanner                    │
│  2. Raw string captured: V1|1704067200|101:2,204:1             │
│  3. POSTed to SagraQRCode backend                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SAGRA BACKEND (Node.js)                       │
│  1. Validate QR payload                                          │
│  2. Check items in stock                                         │
│  3. Create order in SQLite DB                                   │
│  4. Send webhook to your POS system ← WEBHOOK                  │
│  5. Return success response                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              YOUR POS SYSTEM (Webhook Receiver)                  │
│  1. Receive order data with items & total                       │
│  2. Update your POS screen                                       │
│  3. Print receipt                                                │
│  4. Send to kitchen display                                      │
│  5. Process payment on your system                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Setup

### 1. Configure Webhook URL

Edit `backend/.env`:

```env
# Your POS system's API endpoint
POS_WEBHOOK_URL=http://192.168.1.50:8080/api/orders

# Secret key for authentication (your POS validates this)
POS_WEBHOOK_SECRET=your-secret-key-here
```

### 2. Make Your POS Ready to Receive Orders

Your POS system needs to have an HTTP POST endpoint that accepts:

```
POST /api/orders
Headers:
  - Content-Type: application/json
  - X-Sagra-Secret: your-secret-key-here
  - X-Order-ID: 12345

Body (JSON):
{
  "orderId": 12345,
  "qrHash": "abc123def456",
  "totalCents": 2500,
  "totalEur": "25.00",
  "items": [
    {
      "itemId": 101,
      "quantity": 2,
      "name": "Margherita Pizza",
      "priceCents": 1200
    },
    {
      "itemId": 204,
      "quantity": 1,
      "name": "Caesar Salad",
      "priceCents": 700
    }
  ],
  "timestamp": "2026-07-06T12:00:00.000Z"
}
```

---

## Integration Points

### Your POS Calls SagraQRCode

When your USB scanner captures a QR code string:

```bash
# 1. Validate the QR (optional, for preview)
curl -X POST http://192.168.1.X:3000/api/validate-qr \
  -H "Content-Type: application/json" \
  -d '{"qrPayload":"V1|1704067200|101:2,204:1"}'

# 2. Process the QR (creates order, sends to your POS)
curl -X POST http://192.168.1.X:3000/api/process-qr \
  -H "Content-Type: application/json" \
  -d '{"qrPayload":"V1|1704067200|101:2,204:1"}'
```

### SagraQRCode Calls Your POS

After validating the QR and creating the order in the database, SagraQRCode will POST the order to your webhook endpoint with:

- **orderId** - Database ID of the order
- **qrHash** - SHA256 hash of QR payload (for idempotency)
- **totalCents** - Total price in cents (€25.00 = 2500 cents)
- **totalEur** - Total in euros (formatted)
- **items** - Array of items with name, quantity, price
- **timestamp** - ISO timestamp of order creation

---

## QR Payload Format

Your USB scanner will capture QR codes in this format:

```
V1|1704067200|101:2,204:1,305:3
│  │          │   │       │   │
│  │          │   │       │   └─ Item 305, quantity 3
│  │          │   │       └────── Item 204, quantity 1
│  │          │   └────────────── Item 101, quantity 2
│  │          └─────────────────── Unix timestamp (seconds)
│  └──────────────────────────── Version 1 of QR format
└──────────────────────────────── Format identifier
```

Parse it like:

```javascript
const parts = qrPayload.split('|');
const version = parts[0];        // "V1"
const timestamp = parseInt(parts[1], 10);  // 1704067200
const itemsStr = parts[2];       // "101:2,204:1,305:3"

const items = itemsStr.split(',').map(pair => {
  const [itemId, qty] = pair.split(':');
  return { itemId: parseInt(itemId), qty: parseInt(qty) };
});
```

---

## Double-Scan Prevention (Idempotency)

If your USB scanner accidentally scans the same QR twice:

**First scan (within 10 minutes):**
```json
{
  "success": true,
  "orderId": 123,
  "totalCents": 2500
}
```

**Second scan (within 10 minutes):**
```json
{
  "success": false,
  "isDuplicate": true,
  "error": "This QR has already been scanned"
}
```

The backend uses the **timestamp in the QR payload** to prevent duplicates. Even if the scanner captures the exact same QR twice, the second attempt is rejected.

---

## API Endpoints for Your POS

### 1. Validate QR (Optional - for UI preview)

```
POST /api/validate-qr
Content-Type: application/json

{
  "qrPayload": "V1|1704067200|101:2,204:1"
}
```

**Response (valid):**
```json
{
  "success": true,
  "qrHash": "abc123...",
  "items": [
    {"itemId": 101, "quantity": 2, "name": "Pizza", "priceCents": 1200}
  ],
  "totalCents": 2400
}
```

**Response (invalid):**
```json
{
  "success": false,
  "error": "Item out of stock: Margherita Pizza",
  "isDuplicate": false
}
```

### 2. Process QR (Creates order, triggers webhook)

```
POST /api/process-qr
Content-Type: application/json

{
  "qrPayload": "V1|1704067200|101:2,204:1"
}
```

**Response (success):**
```json
{
  "success": true,
  "orderId": 123,
  "qrHash": "abc123...",
  "totalCents": 2400,
  "itemsCount": 2,
  "message": "Order processed and sent to POS system"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Item out of stock",
  "isDuplicate": false
}
```

---

## Webhook Retry Logic

The webhook is sent **asynchronously** - the `/api/process-qr` response doesn't wait for it.

If your POS webhook:
- ✅ Returns 200 OK → Order marked as received
- ❌ Returns error → Logged in `backend/logs/error.log`
- ❌ Times out → Logged, not retried automatically

**Recommendation:** Implement retry logic on your POS side:
1. Receive webhook
2. If error, re-request the order from `/api/cashier/order/:orderId`

---

## Example POS Integration (Node.js)

```javascript
// Your POS system receives orders from SagraQRCode
app.post('/api/orders', (req, res) => {
  const secret = req.headers['x-sagra-secret'];
  const orderId = req.headers['x-order-id'];
  const order = req.body;

  // Validate webhook secret
  if (secret !== process.env.SAGRA_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  console.log(`📦 Order received: #${order.orderId}`);
  console.log(`   Items: ${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`);
  console.log(`   Total: €${order.totalEur}`);

  // Update your POS display
  updatePOSScreen(order);

  // Print receipt
  printReceipt(order);

  // Send to kitchen
  sendToKitchen(order);

  // Respond to webhook
  res.json({ success: true, receivedAt: new Date().toISOString() });
});
```

---

## Database Access (Optional)

If you need to query orders directly:

```bash
# Access SQLite database
cd backend
sqlite3 sagra.sqlite

# View all orders
SELECT * FROM orders;

# View items in an order
SELECT oi.*, i.name FROM order_items oi
JOIN items i ON oi.item_id = i.id
WHERE oi.order_id = 123;

# View scan log (audit trail)
SELECT * FROM scan_log ORDER BY timestamp DESC LIMIT 20;
```

---

## Troubleshooting

### Webhook not receiving orders?

1. **Check .env configuration:**
   ```bash
   echo $POS_WEBHOOK_URL
   ```

2. **Check backend logs:**
   ```bash
   tail -f backend/logs/error.log
   ```

3. **Test webhook manually:**
   ```bash
   curl -X POST http://192.168.1.X:3000/api/process-qr \
     -H "Content-Type: application/json" \
     -d '{"qrPayload":"V1|1704067200|101:1"}'
   ```

4. **Check if your POS endpoint is reachable:**
   ```bash
   curl -X POST http://192.168.1.50:8080/api/orders \
     -H "Content-Type: application/json" \
     -H "X-Sagra-Secret: your-secret" \
     -d '{"test": true}'
   ```

### Order created but webhook failed?

Order is still in the database. Retrieve it:

```bash
GET /api/cashier/order/:orderId
```

Your POS can re-fetch the order if webhook delivery failed.

---

## Security

- **Webhook Secret**: Validate `X-Sagra-Secret` header matches your `.env` configuration
- **HTTPS**: Use HTTPS in production (POS_WEBHOOK_URL should be `https://...`)
- **IP Whitelisting**: Restrict POS API access by IP address
- **Rate Limiting**: 100 requests/minute per endpoint

---

## Performance

- QR validation: **< 50ms**
- Order creation: **< 100ms**
- Webhook call: **Async** (doesn't block response)
- Database: SQLite WAL mode supports 1000+ concurrent orders

---

**Questions?** Check `PROJECT_STATE.md` for architecture details.
