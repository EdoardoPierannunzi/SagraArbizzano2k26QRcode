/**
 * Shopping Cart Service
 * Manages cart state with localStorage persistence
 */

import storage from './storage.js';
import menuSync from './menu-sync.js';

export const cart = {
  cacheKey: 'cart_items',
  maxQtyPerItem: 20,

  // Get current cart
  getCart() {
    return storage.getItem(this.cacheKey, []);
  },

  // Add item to cart
  addItem(itemId, quantity = 1) {
    if (quantity <= 0 || quantity > this.maxQtyPerItem) {
      return { success: false, error: 'Invalid quantity' };
    }

    // Check item exists and is in stock
    const item = menuSync.getItem(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    if (!item.in_stock) {
      return { success: false, error: 'Item out of stock' };
    }

    // Get current cart
    const currentCart = this.getCart();

    // Find existing item
    const existingItem = currentCart.find(i => i.itemId === itemId);

    if (existingItem) {
      // Update quantity (with cap)
      const newQty = Math.min(
        existingItem.quantity + quantity,
        this.maxQtyPerItem
      );
      existingItem.quantity = newQty;
    } else {
      // Add new item
      currentCart.push({
        itemId,
        quantity,
        name: item.name,
        priceCents: item.price_cents,
      });
    }

    // Persist to storage
    storage.setItem(this.cacheKey, currentCart);

    // Trigger update event
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: currentCart }));

    return { success: true, cart: currentCart };
  },

  // Update item quantity
  updateQuantity(itemId, quantity) {
    if (quantity < 0 || quantity > this.maxQtyPerItem) {
      return { success: false, error: 'Invalid quantity' };
    }

    const currentCart = this.getCart();
    const item = currentCart.find(i => i.itemId === itemId);

    if (!item) {
      return { success: false, error: 'Item not in cart' };
    }

    if (quantity === 0) {
      // Remove item
      return this.removeItem(itemId);
    }

    item.quantity = quantity;
    storage.setItem(this.cacheKey, currentCart);

    window.dispatchEvent(new CustomEvent('cart-updated', { detail: currentCart }));

    return { success: true, cart: currentCart };
  },

  // Remove item from cart
  removeItem(itemId) {
    const currentCart = this.getCart();
    const filtered = currentCart.filter(i => i.itemId !== itemId);

    storage.setItem(this.cacheKey, filtered);
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: filtered }));

    return { success: true, cart: filtered };
  },

  // Clear entire cart
  clear() {
    storage.removeItem(this.cacheKey);
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: [] }));
    return { success: true };
  },

  // Get cart total (in cents)
  getTotal() {
    const currentCart = this.getCart();
    return currentCart.reduce((sum, item) => sum + item.quantity * item.priceCents, 0);
  },

  // Get item count
  getItemCount() {
    const currentCart = this.getCart();
    return currentCart.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Validate cart (check items still in stock)
  validate() {
    const currentCart = this.getCart();
    const issues = [];
    const updated = [];

    for (const cartItem of currentCart) {
      const menuItem = menuSync.getItem(cartItem.itemId);

      if (!menuItem) {
        issues.push(`Item ${cartItem.name} no longer exists`);
        continue;
      }

      if (!menuItem.in_stock) {
        issues.push(`Item ${cartItem.name} is out of stock`);
        continue;
      }

      // Update price in case it changed
      updated.push({
        ...cartItem,
        priceCents: menuItem.price_cents,
      });
    }

    if (updated.length < currentCart.length) {
      storage.setItem(this.cacheKey, updated);
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: updated }));
    }

    return { valid: issues.length === 0, issues, cart: updated };
  },

  // Export cart as QR payload string
  // Format: V1|<TIMESTAMP>|<ID>:<QTY>,...
  exportAsQRPayload() {
    const currentCart = this.getCart();

    if (currentCart.length === 0) {
      return null;
    }

    const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
    const items = currentCart
      .map(item => `${item.itemId}:${item.quantity}`)
      .join(',');

    return `V1|${timestamp}|${items}`;
  },
};

// Listen for menu updates and validate cart
window.addEventListener('menu-updated', () => {
  const validation = cart.validate();
  if (!validation.valid && validation.issues.length > 0) {
    console.warn('⚠️ Cart validation issues:', validation.issues);
    window.dispatchEvent(
      new CustomEvent('cart-validation-warning', {
        detail: { issues: validation.issues },
      })
    );
  }
});

export default cart;
