# SagraQRCode - Stateless QR Code Ordering System

A production-ready, offline-first Progressive Web App (PWA) for managing orders at high-traffic food festivals (5000+ attendees/night) using QR codes and a local LAN cashier system.

## 🎯 Key Features

- **100% Offline Capable**: After initial load, the PWA operates completely offline
- **Dynamic Menu with Background Sync**: Stale-while-revalidate pattern for instant menu + background updates
- **Cart Persistence**: Full restoration on page reload or browser restart via localStorage
- **Lightweight Bundle**: < 150KB for frontend (Vanilla JS, no frameworks)
- **Secure Backend**: Server-side price computation, SQLite with WAL concurrency, strict input sanitization
- **Idempotency**: Double-scan prevention using timestamp-based hashing
- **Auto-Backup**: 15-minute interval SQLite database backups
- **Hardware Integration Ready**: Abstracted POS printer module with placeholders for SDK injection

## 🏗️ Architecture

### Frontend (PWA)
- **Framework**: Vanilla JS (ES6+), HTML5, Tailwind CSS
- **Offline Mode**: Service Worker + IndexedDB + localStorage
- **QR Payload**: Compressed format `V1|<TIMESTAMP>|<ITEMID>:<QTY>,...`
- **Menu Sync**: Stale-while-revalidate from `menu.json`

### Backend (Node.js)
- **Server**: Express.js on local LAN (e.g., `192.168.1.X:3000`)
- **Database**: SQLite with WAL mode for concurrent access
- **Cashier System**: USB 2D barcode scanner integration (Keyboard HID)
- **Admin Panel**: Password-protected menu management at `/admin-dashboard`

## 📁 Project Structure

```
SagraQRCode/
├── frontend/          # PWA files (HTML, CSS, JS, service worker)
├── backend/           # Node.js/Express server
├── public/            # Static files (menu.json)
├── PROJECT_STATE.md   # Architecture & status memory
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Modern browser with PWA support

### Installation

```bash
cd backend
npm install
```

### Development

```bash
npm run dev
```

Frontend: `http://localhost:3000`  
Admin Dashboard: `http://localhost:3000/admin-dashboard`  
Cashier System: `http://localhost:3000/cashier`

### Production

```bash
npm start
```

## 🔐 Security

- **Admin Password**: Set `ADMIN_PASSWORD` in `.env`
- **Database**: Prices computed server-side; frontend is hints only
- **Input Validation**: Strict sanitization on all QR scans
- **Secrets**: `.env` and `*.sqlite` files excluded from git

## 📊 SQLite Schema

See `PROJECT_STATE.md` for full schema documentation:
- `items`: Menu items with pricing
- `orders`: Scanned orders with status tracking
- `order_items`: Line items per order
- `scan_log`: Audit log of all scans (idempotency checks)

## 🔄 QR Payload Format

```
V1|1704067200|101:2,204:1,305:3
├── V1           = Version
├── 1704067200   = Timestamp (Unix, nonce for idempotency)
└── 101:2,...    = Item ID:Quantity pairs
```

## 🛠️ Development Workflow

1. **Before Changes**: Read `PROJECT_STATE.md`
2. **During Development**: Incremental commits with Conventional Commits
3. **After Milestones**: Update `PROJECT_STATE.md` and push to origin

## 📝 Roadmap

- [ ] Frontend PWA implementation
- [ ] Backend Express server
- [ ] SQLite database & schema
- [ ] Admin dashboard
- [ ] Cashier system
- [ ] QR validation & idempotency
- [ ] Auto-backup service
- [ ] Logging & error handling
- [ ] Load testing
- [ ] Hardware integration docs

## 📧 Contact

For questions or issues, refer to `PROJECT_STATE.md` for architectural details.

---

**Build for resilience. Test offline. Ship with confidence.**
