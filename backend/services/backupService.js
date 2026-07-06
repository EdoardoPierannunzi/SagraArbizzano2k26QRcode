import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Backup Service
 * Auto-backup SQLite database at regular intervals
 */

/**
 * Create a database backup
 */
export const createBackup = (dbPath, backupDir) => {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `sagra_${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFilename);

    // Copy database file
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✓ Database backup created: ${backupFilename}`);
      return { success: true, backupPath, timestamp };
    } else {
      console.warn('⚠ Database file not found for backup');
      return { success: false, error: 'Database file not found' };
    }
  } catch (error) {
    console.error('✗ Backup creation failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Clean old backups (keep only last N backups)
 */
export const cleanOldBackups = (backupDir, maxBackups = 10) => {
  try {
    if (!fs.existsSync(backupDir)) {
      return { cleaned: 0 };
    }

    const files = fs
      .readdirSync(backupDir)
      .filter(f => f.startsWith('sagra_') && f.endsWith('.sqlite'))
      .map(f => ({
        filename: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    let cleaned = 0;
    for (let i = maxBackups; i < files.length; i++) {
      fs.unlinkSync(files[i].path);
      console.log(`✓ Removed old backup: ${files[i].filename}`);
      cleaned++;
    }

    return { cleaned, remaining: files.length - cleaned };
  } catch (error) {
    console.error('✗ Backup cleanup failed:', error.message);
    return { error: error.message };
  }
};

/**
 * Schedule automatic backups using cron
 */
export const scheduleAutoBackup = (dbPath, backupDir, intervalMinutes = 15) => {
  try {
    // Convert minutes to cron expression (e.g., "*/15 * * * *" for every 15 minutes)
    const cronExpression = `*/${intervalMinutes} * * * *`;

    const task = cron.schedule(cronExpression, () => {
      const result = createBackup(dbPath, backupDir);
      if (result.success) {
        cleanOldBackups(backupDir, 10);
      }
    });

    console.log(`✓ Backup scheduler started: every ${intervalMinutes} minutes`);
    return task;
  } catch (error) {
    console.error('✗ Failed to schedule backups:', error.message);
    return null;
  }
};

export default {
  createBackup,
  cleanOldBackups,
  scheduleAutoBackup,
};
