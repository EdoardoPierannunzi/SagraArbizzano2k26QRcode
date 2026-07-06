/**
 * Main Application Logic
 * Orchestrates menu, cart, and QR generation
 */

import offlineHandler from './offline-handler.js';
import menuSync from './menu-sync.js';
import { cart } from './cart.js';
import { loadQRCodeLibrary, qrGenerator } from './qr-generator.js';

// ============================================
// APP INITIALIZATION
// ============================================

window.app = {
  initialized: false,

  async init() {
    console.log('🚀 [App] Initializing...');

    try {
      // 1. Initialize service worker
      this.registerServiceWorker();

      // 2. Initialize offline detection
      offlineHandler.init();

      // 3. Load menu
      const menu = await menuSync.loadMenu();
      console.log(`📋 [App] Loaded ${menu.length} menu items`);

      // 4. Load and restore cart
      this.restoreCart();

      // 5. Render UI
      this.renderMenu();
      this.renderCart();

      // 6. Setup event listeners
      this.setupEventListeners();

      // 7. Load QR library
      try {
        await loadQRCodeLibrary();
        console.log('📦 [App] QR library loaded');
      } catch {
        console.warn('⚠️ [App] QR library not available');
      }

      this.initialized = true;
      console.log('✓ [App] Ready');
    } catch (error) {
      console.error('✗ [App] Initialization error:', error);
    }
  },

  // Register service worker
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(reg => {
          console.log('✓ Service Worker registered');
        })
        .catch(err => {
          console.warn('⚠️ Service Worker registration failed:', err);
        });
    }
  },

  // Setup event listeners
  setupEventListeners() {
    // Menu update
    window.addEventListener('menu-updated', () => {
      console.log('🔄 Rendering menu after update...');
      this.renderMenu();
      this.renderCart();
    });

    // Cart update
    window.addEventListener('cart-updated', () => {
      this.renderCart();
    });

    // Cart validation warning
    window.addEventListener('cart-validation-warning', e => {
      this.showAlert(
        `⚠️ Cart items updated: ${e.detail.issues.join(', ')}`,
        'warning'
      );
    });

    // Online/offline change
    offlineHandler.subscribe(isOnline => {
      if (!isOnline) {
        this.showAlert('📵 You are offline. Orders will be synced when online.', 'warning');
      }
    });
  },

  // Restore cart from storage
  restoreCart() {
    const savedCart = cart.getCart();
    if (savedCart.length > 0) {
      console.log(`🛒 [App] Restored ${savedCart.length} items in cart`);
    }
  },

  // Render menu
  renderMenu() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    const menu = menuSync.getCachedMenu();
    const categories = menuSync.getCategories();

    let html = '';

    // Group by category
    for (const category of categories) {
      const items = menuSync.getItemsByCategory(category);
      html += `<div class="category-section">`;
      if (category) {
        html += `<h2 class="category-title">${category}</h2>`;
      }
      html += `<div class="grid grid-3">`;

      for (const item of items) {
        const priceEur = (item.price_cents / 100).toFixed(2);
        const outOfStock = !item.in_stock;
        const stockClass = outOfStock ? 'out-of-stock' : '';

        html += `
          <div class="card menu-item ${stockClass}" data-item-id="${item.id}">
            <div class="menu-item-header">
              <div class="menu-item-name">${this.escapeHTML(item.name)}</div>
              <div class="menu-item-price">€${priceEur}</div>
            </div>
            <div class="menu-item-controls">
              <input type="number" class="qty-input" min="1" max="20" value="1"
                ${outOfStock ? 'disabled' : ''}>
              <button class="btn btn-primary btn-small add-to-cart"
                ${outOfStock ? 'disabled' : ''}>
                ${outOfStock ? 'Out of Stock' : 'Add'}
              </button>
            </div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    container.innerHTML = html;

    // Add event listeners to add-to-cart buttons
    container.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', e => {
        const menuItem = e.target.closest('.menu-item');
        const itemId = parseInt(menuItem.dataset.itemId, 10);
        const qtyInput = menuItem.querySelector('.qty-input');
        const qty = parseInt(qtyInput.value, 10) || 1;

        const result = cart.addItem(itemId, qty);
        if (result.success) {
          this.showAlert(`✓ Added to cart`, 'success');
          qtyInput.value = 1;
        } else {
          this.showAlert(`✗ ${result.error}`, 'danger');
        }
      });
    });
  },

  // Render cart
  renderCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;

    const currentCart = cart.getCart();
    const total = cart.getTotal();
    const totalEur = (total / 100).toFixed(2);

    if (currentCart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <p>🛒 Your cart is empty</p>
          <p style="font-size: 0.875rem; color: var(--gray-400);">Add items to get started</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="cart-header">
        <h3 class="card-title">Shopping Cart (${currentCart.length} items)</h3>
        <button class="btn btn-danger btn-small" id="clear-cart-btn">Clear</button>
      </div>
    `;

    for (const item of currentCart) {
      const itemTotal = (item.quantity * item.priceCents / 100).toFixed(2);
      html += `
        <div class="cart-item" data-item-id="${item.itemId}">
          <div class="cart-item-info">
            <div class="cart-item-name">${this.escapeHTML(item.name)}</div>
            <div class="cart-item-qty">
              <input type="number" class="qty-input" min="0" max="20" value="${item.quantity}">
              × €${(item.priceCents / 100).toFixed(2)}
            </div>
          </div>
          <div class="cart-item-price">€${itemTotal}</div>
          <button class="btn btn-danger btn-small remove-btn">Remove</button>
        </div>
      `;
    }

    html += `
      <div class="cart-summary">
        <span>Total:</span>
        <span>€${totalEur}</span>
      </div>
      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        <button class="btn btn-primary" style="flex: 1;" id="checkout-btn">
          Generate QR & Checkout
        </button>
      </div>
    `;

    container.innerHTML = html;

    // Clear cart button
    const clearBtn = container.querySelector('#clear-cart-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear entire cart?')) {
          cart.clear();
        }
      });
    }

    // Quantity update
    container.querySelectorAll('.qty-input').forEach(input => {
      input.addEventListener('change', e => {
        const cartItem = e.target.closest('.cart-item');
        const itemId = parseInt(cartItem.dataset.itemId, 10);
        const newQty = parseInt(e.target.value, 10) || 0;

        if (newQty === 0) {
          cart.removeItem(itemId);
        } else {
          cart.updateQuantity(itemId, newQty);
        }
      });
    });

    // Remove button
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const cartItem = e.target.closest('.cart-item');
        const itemId = parseInt(cartItem.dataset.itemId, 10);
        cart.removeItem(itemId);
      });
    });

    // Checkout button
    const checkoutBtn = container.querySelector('#checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        this.checkout();
      });
    }
  },

  // Checkout flow
  async checkout() {
    const currentCart = cart.getCart();

    if (currentCart.length === 0) {
      this.showAlert('Cart is empty', 'warning');
      return;
    }

    // Generate QR payload
    const payload = cart.exportAsQRPayload();
    if (!payload) {
      this.showAlert('Failed to generate QR', 'danger');
      return;
    }

    console.log('QR Payload:', payload);

    // Show QR modal
    this.showQRModal(payload);
  },

  // Show QR modal
  showQRModal(payload) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
    `;

    content.innerHTML = `
      <h2 style="margin-bottom: 1rem;">QR Code - Show to Cashier</h2>
      <div id="qr-code-display" style="display: flex; justify-content: center; margin-bottom: 1rem;">
      </div>
      <div class="alert alert-warning">
        <strong>⚠️ TURN SCREEN BRIGHTNESS TO MAX BEFORE SCANNING</strong>
      </div>
      <p style="margin: 1rem 0; text-align: center; font-size: 0.875rem; color: var(--gray-600);">
        Payload: <code style="word-break: break-all;">${this.escapeHTML(payload)}</code>
      </p>
      <div style="display: flex; gap: 1rem;">
        <button class="btn btn-primary" style="flex: 1;" id="new-order-btn">New Order</button>
        <button class="btn" style="flex: 1; background: var(--gray-400); color: white;" id="close-modal-btn">Close</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Generate QR code
    qrGenerator.generateQR(payload, 'qr-code-display');

    // New order button
    content.querySelector('#new-order-btn').addEventListener('click', () => {
      cart.clear();
      modal.remove();
      this.showAlert('✓ Cart cleared. Start a new order', 'success');
    });

    // Close button
    content.querySelector('#close-modal-btn').addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  },

  // Show alert
  showAlert(message, type = 'info') {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <span>${message}</span>
      <button style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: inherit; padding: 0;">×</button>
    `;

    container.appendChild(alert);

    // Auto dismiss after 5 seconds
    const timeout = setTimeout(() => {
      alert.remove();
    }, 5000);

    // Close button
    alert.querySelector('button').addEventListener('click', () => {
      clearTimeout(timeout);
      alert.remove();
    });
  },

  // Escape HTML
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
