/**
 * Admin Panel Logic - Complete Menu Management
 * Add, edit, delete, toggle items
 */

import storage from './storage.js';

const admin = {
  authKey: 'admin_auth_token',
  items: [],

  async init() {
    console.log('🔐 [Admin] Initializing...');

    const isAuth = this.isAuthenticated();
    const authForm = document.getElementById('auth-form');
    const dashboardContent = document.getElementById('dashboard-content');

    if (isAuth) {
      authForm.style.display = 'none';
      dashboardContent.style.display = 'block';
      this.setupDashboard();
    } else {
      authForm.style.display = 'block';
      dashboardContent.style.display = 'none';
      this.setupAuthForm();
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });
  },

  isAuthenticated() {
    return !!storage.getItem(this.authKey);
  },

  setupAuthForm() {
    const passwordInput = document.getElementById('admin-password');
    const submitBtn = document.getElementById('submit-password-btn');

    submitBtn.addEventListener('click', () => {
      this.authenticate(passwordInput.value);
    });

    passwordInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.authenticate(passwordInput.value);
      }
    });

    passwordInput.focus();
  },

  async authenticate(password) {
    if (!password) {
      this.showAlert('Password required', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/admin/menu', {
        method: 'GET',
        headers: {
          'X-Admin-Password': password,
        },
      });

      if (response.status === 401) {
        this.showAlert('Invalid password', 'danger');
        return;
      }

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      storage.setItem(this.authKey, password);
      location.reload();
    } catch (error) {
      this.showAlert('Authentication error: ' + error.message, 'danger');
    }
  },

  logout() {
    storage.removeItem(this.authKey);
    location.reload();
  },

  getPassword() {
    return storage.getItem(this.authKey);
  },

  setupDashboard() {
    console.log('✓ [Admin] Authenticated');
    this.loadMenu();

    document.getElementById('refresh-menu-btn').addEventListener('click', () => {
      this.loadMenu();
    });

    document.getElementById('export-menu-btn').addEventListener('click', () => {
      this.exportMenu();
    });

    document.getElementById('save-menu-btn').addEventListener('click', () => {
      this.saveMenu();
    });

    // Add new item form
    this.setupAddItemForm();
  },

  setupAddItemForm() {
    const container = document.getElementById('menu-list');

    // Add "New Item" section at the top
    const newItemForm = document.createElement('div');
    newItemForm.className = 'card';
    newItemForm.style.marginBottom = '1.5rem';
    newItemForm.style.background = '#f0f9ff';
    newItemForm.style.borderColor = '#3b82f6';

    newItemForm.innerHTML = `
      <div class="card-header">
        <h3 class="card-title" style="color: #3b82f6;">➕ Add New Item</h3>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 1rem; padding: 1rem;">
        <div>
          <label style="font-size: 0.875rem; color: var(--gray-600);">Item Name</label>
          <input type="text" id="new-item-name" placeholder="e.g., Margherita Pizza"
            style="width: 100%; margin-top: 0.25rem;">
        </div>
        <div>
          <label style="font-size: 0.875rem; color: var(--gray-600);">Price (€)</label>
          <input type="number" id="new-item-price" placeholder="12.00" step="0.01" min="0"
            style="width: 100%; margin-top: 0.25rem;">
        </div>
        <div>
          <label style="font-size: 0.875rem; color: var(--gray-600);">Category</label>
          <input type="text" id="new-item-category" placeholder="e.g., Pizza"
            style="width: 100%; margin-top: 0.25rem;">
        </div>
        <button class="btn btn-success" id="add-item-btn" style="align-self: flex-end; height: 38px;">
          Add Item
        </button>
      </div>
    `;

    container.insertBefore(newItemForm, container.firstChild);

    document.getElementById('add-item-btn').addEventListener('click', () => {
      const name = document.getElementById('new-item-name').value.trim();
      const price = parseFloat(document.getElementById('new-item-price').value);
      const category = document.getElementById('new-item-category').value.trim();

      if (!name || !price || price <= 0) {
        this.showAlert('Please fill in all fields correctly', 'warning');
        return;
      }

      this.addNewItem(name, Math.round(price * 100), category);
    });
  },

  async addNewItem(name, priceCents, category) {
    try {
      const response = await fetch('/api/admin/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': this.getPassword(),
        },
        body: JSON.stringify({ name, priceCents, category }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      this.showAlert('✓ Item added! Reload to see it.', 'success');
      document.getElementById('new-item-name').value = '';
      document.getElementById('new-item-price').value = '';
      document.getElementById('new-item-category').value = '';

      setTimeout(() => this.loadMenu(), 1000);
    } catch (error) {
      this.showAlert('Error: ' + error.message, 'danger');
    }
  },

  async loadMenu() {
    try {
      const response = await fetch('/api/admin/menu', {
        headers: {
          'X-Admin-Password': this.getPassword(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load menu');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      this.items = data.items;
      this.renderMenu(data.items);
      this.showAlert('✓ Menu loaded', 'success');
    } catch (error) {
      this.showAlert('Load error: ' + error.message, 'danger');
    }
  },

  renderMenu(items) {
    const container = document.getElementById('menu-list');

    // Keep the add item form
    const addFormElement = container.querySelector('[style*="background: #f0f9ff"]');

    let html = addFormElement ? addFormElement.outerHTML : '';

    // Group by category
    const categories = [...new Set(items.map(i => i.category || 'Uncategorized'))];

    for (const category of categories) {
      const categoryItems = items.filter(i => (i.category || 'Uncategorized') === category);

      html += `<div style="margin-top: 1.5rem;">
        <h3 style="color: var(--gray-700); margin-bottom: 1rem; font-weight: 700;">${this.escapeHTML(category)}</h3>
        <div class="grid grid-2">`;

      for (const item of categoryItems) {
        const priceEur = (item.price_cents / 100).toFixed(2);
        const statusClass = item.in_stock ? 'success' : 'warning';
        const statusText = item.in_stock ? 'In Stock' : 'Out of Stock';

        html += `
          <div class="card" data-item-id="${item.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
              <div>
                <input type="text" class="item-name" value="${this.escapeHTML(item.name)}"
                  style="font-weight: 700; font-size: 1.1rem; width: 200px; margin-bottom: 0.5rem;">
                <div style="color: var(--gray-500); font-size: 0.875rem;">ID: ${item.id}</div>
              </div>
              <button class="btn btn-danger btn-small delete-btn" data-item-id="${item.id}">Delete</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div>
                <label style="font-size: 0.75rem; color: var(--gray-600); text-transform: uppercase;">Price (€)</label>
                <input type="number" class="item-price" value="${priceEur}" step="0.01" min="0"
                  style="width: 100%; margin-top: 0.25rem;">
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--gray-600); text-transform: uppercase;">Category</label>
                <input type="text" class="item-category" value="${this.escapeHTML(item.category || '')}"
                  style="width: 100%; margin-top: 0.25rem;">
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" class="item-stock" ${item.in_stock ? 'checked' : ''}
                  style="width: 1.2rem; height: 1.2rem; cursor: pointer;">
                <span style="font-size: 0.875rem;">In Stock</span>
              </label>
              <span class="alert-${statusClass}" style="padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                ${statusText}
              </span>
            </div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    container.innerHTML = html;

    // Setup event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.itemId;
        if (confirm('Are you sure? This will delete the item forever.')) {
          this.deleteItem(itemId);
        }
      });
    });

    // Setup add item form again (since we replaced the HTML)
    this.setupAddItemForm();
  },

  async deleteItem(itemId) {
    try {
      const response = await fetch(`/api/admin/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Password': this.getPassword(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      this.showAlert('✓ Item deleted', 'success');
      this.loadMenu();
    } catch (error) {
      this.showAlert('Delete error: ' + error.message, 'danger');
    }
  },

  async saveMenu() {
    try {
      const items = [];

      document.querySelectorAll('.card[data-item-id]').forEach(card => {
        const itemId = parseInt(card.dataset.itemId, 10);
        const inStock = card.querySelector('.item-stock').checked;

        items.push({ id: itemId, in_stock: inStock });
      });

      if (items.length === 0) {
        this.showAlert('No items to save', 'warning');
        return;
      }

      const response = await fetch('/api/admin/menu', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': this.getPassword(),
        },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      this.showAlert(
        `✓ Menu saved (${data.itemsUpdated} items updated)`,
        'success'
      );
    } catch (error) {
      this.showAlert('Save error: ' + error.message, 'danger');
    }
  },

  async exportMenu() {
    try {
      const response = await fetch('/api/admin/menu-export', {
        method: 'POST',
        headers: {
          'X-Admin-Password': this.getPassword(),
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      const json = JSON.stringify(data.export, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.showAlert('✓ Menu exported', 'success');
    } catch (error) {
      this.showAlert('Export error: ' + error.message, 'danger');
    }
  },

  showAlert(message, type = 'info') {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <span>${message}</span>
      <button style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: inherit; padding: 0;">×</button>
    `;

    container.innerHTML = '';
    container.appendChild(alert);

    alert.querySelector('button').addEventListener('click', () => {
      alert.remove();
    });

    setTimeout(() => {
      alert.remove();
    }, 5000);
  },

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => admin.init());
} else {
  admin.init();
}
