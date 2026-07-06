import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Import database & initialization
import { initializeDatabase } from './db/database.js';

// Import middleware
import { requestLogger, logger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sanitizeQRPayload, sanitizePassword } from './middleware/sanitizer.js';

// Import routes
import apiRoutes from './routes/api.js';
import cashierRoutes from './routes/cashier.js';
import adminRoutes from './routes/admin.js';

// Import services
import { scheduleAutoBackup } from './services/backupService.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ============================================
// DATABASE INITIALIZATION (async)
// ============================================
let dbInitialized = false;

const initDB = async () => {
  try {
    await initializeDatabase();
    dbInitialized = true;
    console.log('✓ Database ready');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// Request logging
app.use(requestLogger);

// Sanitization
app.use(sanitizeQRPayload);
app.use(sanitizePassword);

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
});
app.use('/api/', limiter);

// CORS headers (trust LAN)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  next();
});

// Serve frontend from public directory
const publicPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(publicPath));

// ============================================
// ROUTES
// ============================================

// Serve HTML files (before other routes)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/cashier', (req, res) => {
  res.sendFile(path.join(publicPath, 'cashier.html'));
});

// API routes (after HTML routes)
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// AUTO-BACKUP SERVICE
// ============================================

const dbPath = process.env.DB_PATH || path.join(__dirname, 'sagra.sqlite');
const backupDir = process.env.BACKUP_PATH || path.join(__dirname, 'backups');
const backupInterval =
  parseInt(process.env.BACKUP_INTERVAL_MINUTES, 10) || 15;

scheduleAutoBackup(dbPath, backupDir, backupInterval);

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
  // Initialize database first
  await initDB();

  const server = app.listen(PORT, HOST, () => {
    logger.info(`🚀 Server started on http://${HOST}:${PORT}`);
    logger.info(`📱 Frontend: http://${HOST}:${PORT}`);
    logger.info(`🔐 Admin Dashboard: http://${HOST}:${PORT}/admin-dashboard`);
    logger.info(`💳 Cashier System: http://${HOST}:${PORT}/cashier`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Server shutting down...');
    server.close(() => {
      logger.info('Server stopped');
      process.exit(0);
    });
  });

  // Unhandled rejection catcher
  process.on('unhandledRejection', err => {
    logger.error('Unhandled Rejection:', err);
    process.exit(1);
  });
};

// Start the server
startServer().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
