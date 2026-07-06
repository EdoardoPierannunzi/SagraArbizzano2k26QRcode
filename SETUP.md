# SagraQRCode - Setup & Deployment Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Windows/Linux/macOS** (any OS supported)
- **USB 2D Barcode Scanner** (for cashier system, optional for testing)

## Installation

### 1. Clone & Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

**Edit `.env`:**

```env
# Server
NODE_ENV=production
PORT=3000
HOST=192.168.1.X        # Your LAN IP for cashier access
ADMIN_PASSWORD=change_me_immediately   # CHANGE THIS!

# Database
DB_PATH=./sagra.sqlite
ENABLE_WAL=true

# Backup
BACKUP_INTERVAL_MINUTES=15
BACKUP_PATH=./backups

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# QR Validation
QR_IDEMPOTENCY_WINDOW_MINUTES=10

# CORS
CORS_ORIGIN=*         # Or restrict to specific IPs: http://192.168.1.*
```

## Running the Server

### Development Mode

```bash
npm run dev
```

Server starts on `http://localhost:3000`

**Access Points:**
- **Customer App**: `http://localhost:3000` (or `http://192.168.1.X:3000` from other devices)
- **Admin Dashboard**: `http://localhost:3000/admin-dashboard`
- **Cashier System**: `http://localhost:3000/cashier`

### Production Mode

```bash
npm start
```

## Testing Workflows

### 1. Customer Ordering Flow

1. Open `http://192.168.1.X:3000` on mobile or tablet
2. Browse menu (offline available after 1st load)
3. Add items to cart
4. Tap **"Generate QR & Checkout"**
5. Show QR code to cashier
6. Cart auto-clears for new order

### 2. Offline Testing

1. Load customer app: `http://192.168.1.X:3000`
2. **Disable WiFi/Network** (turn off device WiFi)
3. Add items to cart - **should work offline**
4. Refresh page - **cart should restore**
5. Try to generate QR - **should work (compressed payload doesn't need network)**

### 3. Admin Menu Management

1. Navigate to `http://192.168.1.X:3000/admin-dashboard`
2. Enter password (default: `admin123`)
3. Toggle items "In Stock" / "Out of Stock"
4. Click **"Save Changes"**
5. On customer app, out-of-stock items should disappear/gray out

### 4. Cashier System (USB Scanner)

1. Open cashier interface: `http://192.168.1.X:3000/cashier`
2. Input field auto-focused for scanner
3. Scan QR from customer app (or paste `V1|1704067200|101:2,204:1` format)
4. Order details display
5. Select payment method
6. Click **"Confirm Payment"**
7. Receipt prints, order sent to kitchen (mocked)

### 5. Double-Scan Prevention

1. Scan same QR twice in cashier within 10 minutes
2. **Second scan rejected** with "Recently scanned" message
3. Prevents accidental duplicate payments

## Database Operations

### Initial Setup

Database auto-initializes on first server start. Schema includes:
- `items` - Menu items
- `orders` - Order records
- `order_items` - Line items per order
- `scan_log` - Audit trail for all scans

### View Database

```bash
# Using better-sqlite3 CLI (if installed globally)
sqlite3 sagra.sqlite

# List tables
.tables

# View items
SELECT * FROM items;

# View orders
SELECT * FROM orders;

# View scan log
SELECT * FROM scan_log;
```

### Backup & Recovery

Backups auto-create every 15 minutes in `backend/backups/`:
- Format: `sagra_2026-01-15T10-30-45-123Z.sqlite`
- Last 10 backups kept
- Manual backup: Copy `sagra.sqlite` to safe location

## Network Configuration

### LAN Access (Multiple Cashiers)

1. Find server's IP address:
   ```bash
   # Windows
   ipconfig | findstr IPv4
   
   # Linux/Mac
   ifconfig | grep inet
   ```

2. Update `.env`:
   ```env
   HOST=0.0.0.0        # Listen on all interfaces
   PORT=3000
   ```

3. Cashiers access via: `http://192.168.1.X:3000/cashier`

### Firewall Rules (Windows)

Allow Node.js through firewall:
1. **Windows Defender Firewall** → **Allow an app through firewall**
2. Add Node.js (or specific port 3000)
3. Check both **Private** and **Public** networks

## Hardware Integration (TODO)

### POS Printer

In `backend/services/printerService.js`:

```javascript
// Replace mock console.log with actual SDK:
const printer = new ThermalPrinterSDK(config);
await printer.printReceipt(order);
```

### Kitchen Display System (KDS)

```javascript
// Replace mock with actual API:
const kds = new KDSClient(config);
await kds.sendOrder(order);
```

### Payment Terminal

```javascript
// Replace mock with actual terminal SDK:
const terminal = new PaymentTerminal(config);
const result = await terminal.processPayment(payment);
```

## Monitoring & Debugging

### Logs

```bash
# Error log
tail backend/logs/error.log

# All logs
tail backend/logs/combined.log
```

### API Testing

```bash
# Get menu
curl http://localhost:3000/api/menu

# Validate QR
curl -X POST http://localhost:3000/api/validate-qr \
  -H "Content-Type: application/json" \
  -d '{"qrPayload":"V1|1704067200|101:2,204:1"}'

# Admin menu (with password)
curl http://localhost:3000/api/admin/menu \
  -H "X-Admin-Password: admin123"
```

## Production Checklist

- [ ] Change `ADMIN_PASSWORD` in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure `HOST` to server's LAN IP
- [ ] Enable SSL/TLS (add reverse proxy like nginx)
- [ ] Restrict `CORS_ORIGIN` to specific IPs
- [ ] Set up regular backup verification
- [ ] Test offline mode thoroughly
- [ ] Load test with 100+ concurrent orders
- [ ] Document hardware SDK integration points
- [ ] Train cashiers on scanner interface
- [ ] Create backup recovery procedure
- [ ] Set up monitoring/alerting for errors

## Troubleshooting

### Service Worker Not Caching

1. Check browser console for errors
2. Verify `.js` files are being loaded
3. Clear browser cache: **DevTools → Application → Clear site data**
4. Reload page

### Cart Not Persisting

1. Check `localStorage` availability: `localStorage` disabled or full quota
2. Try `sessionStorage` fallback
3. Clear storage and restart

### QR Scan Not Processing

1. Check QR payload format: `V1|<TIMESTAMP>|<ID>:<QTY>,...`
2. Verify all items exist in menu (check `items` table)
3. Check `scan_log` table for previous scans (idempotency window)

### Database Locked

1. WAL mode enabled - normal behavior
2. Ensure only one Node.js process running
3. Kill zombie processes: `lsof -i :3000`

## Performance Tips

- **Cache Menu**: Loads from cache instantly, background fetch updates
- **Compress QR**: No JSON - string format is 60% smaller
- **Batch Writes**: SQLite WAL mode handles concurrent writes
- **Auto-Backup**: Runs in background every 15 min (configurable)
- **PWA**: Works offline, reduces server load

## Support

For issues:
1. Check `backend/logs/error.log`
2. Review `PROJECT_STATE.md` for architecture
3. Run offline tests
4. Verify QR format: `V1|1704067200|101:2,204:1`
