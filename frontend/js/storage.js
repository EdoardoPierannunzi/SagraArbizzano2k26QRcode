/**
 * Storage Service
 * Abstraction layer for localStorage with fallback to sessionStorage
 */

const STORAGE_PREFIX = 'sagra_';

export const storage = {
  // Check if localStorage is available
  isAvailable() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  // Get storage backend
  getBackend() {
    return this.isAvailable() ? localStorage : sessionStorage;
  },

  // Get item
  getItem(key, defaultValue = null) {
    try {
      const backend = this.getBackend();
      const item = backend.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('[Storage] Get error:', error);
      return defaultValue;
    }
  },

  // Set item
  setItem(key, value) {
    try {
      const backend = this.getBackend();
      backend.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('[Storage] Set error:', error);
      return false;
    }
  },

  // Remove item
  removeItem(key) {
    try {
      const backend = this.getBackend();
      backend.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch (error) {
      console.error('[Storage] Remove error:', error);
      return false;
    }
  },

  // Clear all
  clear() {
    try {
      const backend = this.getBackend();
      const keysToRemove = [];

      for (let i = 0; i < backend.length; i++) {
        const key = backend.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => backend.removeItem(key));
      return true;
    } catch (error) {
      console.error('[Storage] Clear error:', error);
      return false;
    }
  },

  // Get all items (useful for debugging)
  getAll() {
    const result = {};
    const backend = this.getBackend();

    for (let i = 0; i < backend.length; i++) {
      const key = backend.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const cleanKey = key.substring(STORAGE_PREFIX.length);
        result[cleanKey] = this.getItem(cleanKey);
      }
    }

    return result;
  },
};

export default storage;
