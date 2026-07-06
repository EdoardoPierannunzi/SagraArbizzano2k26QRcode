# SagraQRCode - Project State & Architecture Memory

## 📋 Overall Architecture & Tech Stack

### Frontend (PWA)
- **Tech**: HTML5, Vanilla JS (ES6+), Tailwind CSS via CDN, Alpine.js (optional)
- **Bundle Size Target**: < 150KB (gzipped)
- **Key Libraries**: 
  - `qrcode.js` for QR generation
  - No frameworks (pure vanilla)
  - Service Worker for offline capability
  - IndexedDB + localStorage for persistence

### Backend (Node.js + SQLite)
- **Tech**: Node.js 18+, Express.js
- **Database**: SQLite with WAL (Write-Ahead Logging) mode
- **Concurrency**: WAL mode enables multiple concurrent readers
- **Server Mode**: Local LAN master node (e.g., `192.168.1.X:3000`)

### Admin Panel
- **Route**: `/admin-dashboard`
- **Auth**: Password-based (stored in `.env` as `ADMIN_PASSWORD`)
- **Features**: Menu in/out of stock toggle, JSON export/import

### Cashier System
- **Hardware**: USB 2D Barcode Scanner (Keyboard HID)
- **Interface**: Web-based, permanently focused input field
- **Source of Truth**: Backend SQLite (prices always computed server-side)

---

## 🔐 QR Payload Format (CRITICAL)

### Compressed Format
```
V1|<TIMESTAMP>|<ITEMS>
```

**Example:**
```
V1|1704067200|101:2,204:1,305:3
```

**Breakdown:**
- `V1` = Payload Version
- `1704067200` = Unix timestamp (nonce for idempotency)
- `101:2,204:1,305:3` = Item ID:Quantity pairs (comma-separated)

**Why No JSON?**
- QR capacity: JSON is verbose; compact format reduces QR code size
- Parsing speed: Simple string split is faster
- Security: Reduced surface area for injection

---

## 📊 SQLite Schema

### Table: `items`
```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL,
  category TEXT,
  in_stock BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `orders`
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_hash TEXT UNIQUE NOT NULL,
  qr_payload TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  payment_method TEXT,
  scanner_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  notes TEXT
);
```

### Table: `order_items`
```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);
```

### Table: `scan_log`
```sql
CREATE TABLE scan_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_hash TEXT NOT NULL,
  payload TEXT,
  status TEXT, -- valid, invalid, duplicate, out_of_stock
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qr_hash (qr_hash),
  INDEX idx_timestamp (timestamp)
);
```

---

## 🗂️ File Structure

```
SagraQRCode/
├── frontend/
│   ├── index.html                 # Main PWA entry point
│   ├── admin.html                 # Admin dashboard
│   ├── cashier.html               # Cashier interface
│   ├── manifest.json              # PWA manifest
│   ├── service-worker.js          # Offline caching & sync
│   ├── css/
│   │   └── styles.css             # Tailwind + custom styles
│   └── js/
│       ├── app.js                 # Main app logic
│       ├── menu-sync.js           # Stale-while-revalidate
│       ├── cart.js                # Cart management
│       ├── qr-generator.js        # QR code generation
│       ├── offline-handler.js     # Offline detection & UI
│       ├── storage.js             # localStorage abstraction
│       └── admin-panel.js         # Admin dashboard logic
│
├── backend/
│   ├── server.js                  # Express app & entry point
│   ├── package.json
│   ├── .env.example
│   ├── routes/
│   │   ├── api.js                 # API endpoints (/api/menu, /api/validate)
│   │   ├── cashier.js             # Cashier routes
│   │   └── admin.js               # Admin routes
│   ├── services/
│   │   ├── printerService.js      # POS printer abstraction
│   │   ├── qrValidator.js         # QR parsing & validation
│   │   ├── idempotencyService.js  # Double-scan prevention
│   │   └── backupService.js       # DB auto-backup (cron)
│   ├── middleware/
│   │   ├── auth.js                # Admin password auth
│   │   ├── logger.js              # Request/response logging
│   │   ├── errorHandler.js        # Global error handler
│   │   └── sanitizer.js           # Input sanitization
│   ├── db/
│   │   ├── database.js            # SQLite connection & init
│   │   └── schema.sql             # DB schema
│   ├── config/
│   │   ├── constants.js           # App-wide constants
│   │   └── logger-config.js       # Winston logger config
│   ├── logs/                      # Generated at runtime
│   └── backups/                   # Generated at runtime
│
├── public/
│   └── menu.json                  # Menu data (source of truth)
│
├── .gitignore
├── PROJECT_STATE.md               # This file (persistent memory)
├── package.json                   # Root package.json
└── README.md
```

---

## 📈 Current Status

### ✅ Completed
- [x] Git repository initialization
- [x] Project structure creation
- [x] `PROJECT_STATE.md` initialization
- [x] `.gitignore` creation (strict security)
- [x] Backend infrastructure (Express, SQLite, WAL mode)
- [x] Database schema & helpers
- [x] QR validation service
- [x] Idempotency service (double-scan prevention)
- [x] Printer service (abstraction layer with TODO placeholders)
- [x] Auto-backup service (15-min cron)
- [x] Middleware (auth, logging, sanitizer, error handler)
- [x] API routes (/api/menu, /api/validate-qr, /api/process-qr)
- [x] Cashier routes (/api/cashier/confirm-payment)
- [x] Admin routes (/api/admin/menu with auth)
- [x] Express server with middleware pipeline
- [x] Frontend PWA (index.html)
- [x] Service Worker (offline caching, network-first/cache-first)
- [x] CSS (responsive, dark mode, accessibility)
- [x] Storage module (localStorage abstraction)
- [x] Offline handler (status detection)
- [x] Menu sync (stale-while-revalidate)
- [x] Cart service (persistence, validation)
- [x] QR generator (qrcode.js integration)
- [x] Main app logic (app.js)
- [x] Admin dashboard (admin.html + admin-panel.js)
- [x] Cashier system (cashier.html + cashier.js)
- [x] Seed menu (public/menu.json)

### 🔄 In Progress
- [ ] Testing & verification

### ⏳ Pending
- [ ] Hardware integration (printer SDK injection)
- [ ] Production deployment docs
- [ ] Load testing (5000+ attendees/night)
- [ ] SSL/TLS configuration for production

---

## 🔑 Key Decisions & Trade-offs

1. **Vanilla JS Over Frameworks**: Keeps bundle < 150KB; trade-off is more boilerplate
2. **Compressed QR Format**: String-based (not JSON) for compact payloads
3. **Backend Price Computation**: Security critical; frontend prices are hints only
4. **SQLite WAL Mode**: Enables concurrency; trade-off is slightly larger DB file
5. **Stale-While-Revalidate**: Instant menu load from cache; background refresh
6. **No Session Auth on Cashier**: Trust LAN security; QR hash prevents fraud

---

## 🚨 Critical Rules

1. **Before any code changes**: READ this file
2. **After each milestone**: UPDATE this file with status
3. **Security First**: Never commit `.env`, `*.sqlite`, or `*.sqlite-wal`
4. **Test Offline**: Always test without network before marking complete
5. **Double-scan Prevention**: Every QR MUST be validated against `scan_log`

---

## 📝 Notes for Next Session

- UI visual indicator for Online/Offline status in top-right corner
- Max quantity per item: 20 (configurable in `constants.js`)
- QR timeout for idempotency: 10 minutes
- Auto-backup interval: 15 minutes
- Default admin password: `admin123` (change immediately in `.env`)

---

**Last Updated**: 2026-07-06
**Status**: Core implementation complete. Ready for testing and deployment.
**Next Steps**: 
1. Run `npm install` in backend
2. Copy `.env.example` to `.env` and configure
3. Test all workflows (see SETUP.md)
4. Integrate hardware SDKs (printer/KDS/payment terminal)
