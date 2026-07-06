/**
 * Menu Sync Service
 * Implements stale-while-revalidate pattern for menu.json
 * Instantly shows cached menu, silently fetches new version in background
 */

import storage from './storage.js';

export const menuSync = {
  menuUrl: '/api/menu',
  cacheKey: 'menu_data',
  lastSyncKey: 'menu_last_sync',
  syncTimeout: 5000, // 5 second timeout for background fetch

  // Load menu (cached first, then try to update)
  async loadMenu() {
    // 1. Return cached menu immediately
    const cached = this.getCachedMenu();
    if (cached) {
      console.log('📦 [Menu] Loaded from cache');
    }

    // 2. Try to fetch fresh menu in background
    this.syncMenuInBackground();

    return cached || [];
  },

  // Get cached menu
  getCachedMenu() {
    return storage.getItem(this.cacheKey, []);
  },

  // Background sync (stale-while-revalidate)
  async syncMenuInBackground() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.syncTimeout);

      const response = await fetch(this.menuUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[Menu Sync] Server error:', response.status);
        return;
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.items)) {
        console.warn('[Menu Sync] Invalid response format');
        return;
      }

      const newMenu = data.items;
      const cached = this.getCachedMenu();

      // Check if menu changed
      if (JSON.stringify(newMenu) !== JSON.stringify(cached)) {
        console.log('🔄 [Menu] Updated from server');
        storage.setItem(this.cacheKey, newMenu);
        storage.setItem(this.lastSyncKey, new Date().toISOString());

        // Trigger update event
        window.dispatchEvent(
          new CustomEvent('menu-updated', {
            detail: { items: newMenu },
          })
        );

        return true;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[Menu Sync] Fetch timeout');
      } else {
        console.warn('[Menu Sync] Fetch error:', error.message);
      }
    }

    return false;
  },

  // Find item by ID
  getItem(itemId) {
    const menu = this.getCachedMenu();
    return menu.find(item => item.id === itemId);
  },

  // Check if item is in stock
  isInStock(itemId) {
    const item = this.getItem(itemId);
    return item && item.in_stock === true;
  },

  // Get items by category
  getItemsByCategory(category) {
    const menu = this.getCachedMenu();
    return category
      ? menu.filter(item => item.category === category)
      : menu;
  },

  // Get all categories
  getCategories() {
    const menu = this.getCachedMenu();
    const categories = new Set(menu.map(item => item.category).filter(Boolean));
    return Array.from(categories).sort();
  },
};

export default menuSync;
