/**
 * Admin Panel Logic
 * Menu management and authentication
 */

import storage from './storage.js';

const admin = {
  authKey: 'admin_auth_token',
  passwordInputId: 'admin-password',

  async init() {
    console.log('🔐 [Admin] Initializing...');

    // Check if authenticated
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

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });
  },

  isAuthenticated() {
    return !!storage.getItem(this.authKey);
  },

  setupAuthForm() {
    const passwordInput = document.getElementById(this.passwordInputId);
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

      // Store auth token
      storage.setItem(this.authKey, password);

      // Reload page
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

    // Load menu
    this.loadMenu();

    // Setup buttons
    document.getElementById('refresh-menu-btn').addEventListener('click', () => {
      this.loadMenu();
    });

    document.getElementById('export-menu-btn').addEventListener('click', () => {
      this.exportMenu();
    });

    document.getElementById('save-menu-btn').addEventListener('click', () => {
      this.saveMenu();
    });
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

      this.renderMenu(data.items);
      this.showAlert('✓ Menu loaded', 'success');
    } catch (error) {
      this.showAlert('Load error: ' + error.message, 'danger');
    }
  },

  renderMenu(items) {
    const container = document.getElementById('menu-list');

    let html = '';
    for (const item of items) {
      const priceEur = (item.price_cents / 100).toFixed(2);

      html += `
        <div class="card" style="margin-bottom: 1rem;">
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center;">
            <div>
              <div style="font-weight: 700; margin-bottom: 0.25rem;">${this.escapeHTML(item.name)}</div>
              <div style="font-size: 0.875rem; color: var(--gray-600);">
                Category: ${this.escapeHTML(item.category || 'Uncategorized')}
              </div>
              <div style="font-size: 0.875rem; color: var(--gray-600);">
                Price: €${priceEur}
              </div>
            </div>
            <div class="toggle" style="flex-direction: column; align-items: center;">
              <label style="font-size: 0.875rem; margin-bottom: 0.5rem;">In Stock</label>
              <div class="toggle-switch ${item.in_stock ? 'active' : ''}" data-item-id="${item.id}"></div>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Setup toggle switches
    container.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
      });
    });
  },

  async saveMenu() {
    try {
      // Collect current state
      const items = [];
      document.querySelectorAll('.toggle-switch').forEach(toggle => {
        const itemId = parseInt(toggle.dataset.itemId, 10);
        const inStock = toggle.classList.contains('active');

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

      this.showAlert(`✓ Menu saved (${data.itemsUpdated} items updated)`, 'success');
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

      // Download as JSON file
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

    // Close button
    alert.querySelector('button').addEventListener('click', () => {
      alert.remove();
    });

    // Auto dismiss
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => admin.init());
} else {
  admin.init();
}
