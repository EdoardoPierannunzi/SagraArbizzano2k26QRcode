/**
 * Cashier System Logic
 * Handles QR scanning and payment processing
 */

import offlineHandler from './offline-handler.js';

const cashier = {
  currentOrder: null,
  scanCount: 0,
  lastScanTime: null,

  async init() {
    console.log('💳 [Cashier] Initializing...');

    // Initialize offline detector
    offlineHandler.init();

    // Setup QR input
    this.setupQRInput();

    // Restore scan count
    this.scanCount = parseInt(sessionStorage.getItem('scan_count') || '0', 10);
    this.updateUI();

    console.log('✓ Cashier ready');
  },

  setupQRInput() {
    const input = document.getElementById('qr-input');
    if (!input) return;

    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.scanQR(input.value.trim());
        input.value = '';
        input.focus();
      }
    });
  },

  async scanQR(payload) {
    if (!payload) {
      this.showAlert('Empty QR payload', 'warning');
      return;
    }

    console.log(`📱 Scanned QR: ${payload}`);

    try {
      // Validate QR first
      const response = await fetch('/api/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload: payload }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.isDuplicate) {
          this.showAlert('⚠️ This QR was already scanned recently', 'warning');
        } else {
          this.showAlert(`✗ Invalid QR: ${data.error}`, 'danger');
        }
        return;
      }

      // Display order details
      this.currentOrder = {
        qrHash: data.qrHash,
        items: data.items,
        totalCents: data.totalCents,
      };

      this.renderOrderDetails();
      this.renderPaymentPanel();
      this.showAlert('✓ QR scanned successfully', 'success');

      this.lastScanTime = new Date();
      this.scanCount++;
      sessionStorage.setItem('scan_count', this.scanCount.toString());
      this.updateUI();
    } catch (error) {
      this.showAlert('Scan error: ' + error.message, 'danger');
    }
  },

  renderOrderDetails() {
    const container = document.getElementById('current-order');
    const order = this.currentOrder;

    const totalEur = (order.totalCents / 100).toFixed(2);

    let html = `
      <div style="color: white;">
        <h3 style="margin-bottom: 1rem; color: var(--success);">✓ Order Loaded</h3>
        <div style="background: var(--gray-600); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
          <div style="font-weight: 700; margin-bottom: 0.5rem;">Items:</div>
    `;

    for (const item of order.items) {
      const itemTotal = (item.quantity * item.priceCents / 100).toFixed(2);
      html += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
          <span>${this.escapeHTML(item.name)} ×${item.quantity}</span>
          <span>€${itemTotal}</span>
        </div>
      `;
    }

    html += `
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.25rem; border-top: 1px solid var(--gray-500); padding-top: 1rem;">
            <span>Total:</span>
            <span style="color: var(--success);">€${totalEur}</span>
          </div>
        </div>
    `;

    container.innerHTML = html;
  },

  renderPaymentPanel() {
    const container = document.getElementById('payment-panel');
    const order = this.currentOrder;

    if (!order) {
      container.innerHTML = '<p style="text-align: center; color: var(--gray-400);">No order loaded</p>';
      return;
    }

    const totalEur = (order.totalCents / 100).toFixed(2);

    let html = `
      <div style="background: var(--gray-700); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
        <div style="font-size: 0.875rem; color: var(--gray-400); margin-bottom: 0.5rem;">Amount to Pay</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--success);">€${totalEur}</div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <label style="font-size: 0.875rem; color: var(--gray-300);">Payment Method:</label>
        <select id="payment-method" style="background: var(--gray-700); color: white; border-color: var(--gray-600);">
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
          <option value="mobile">📱 Mobile</option>
        </select>
      </div>

      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="btn btn-success" style="flex: 1;" id="confirm-payment-btn">
          Confirm Payment
        </button>
        <button class="btn btn-danger" style="flex: 1;" id="cancel-order-btn">
          Cancel
        </button>
      </div>
    `;

    container.innerHTML = html;

    // Event listeners
    document.getElementById('confirm-payment-btn').addEventListener('click', () => {
      this.confirmPayment();
    });

    document.getElementById('cancel-order-btn').addEventListener('click', () => {
      this.cancelOrder();
    });
  },

  async confirmPayment() {
    if (!this.currentOrder) return;

    const paymentMethod = document.getElementById('payment-method').value;

    try {
      // Process QR to create order
      const qrInput = document.getElementById('qr-input');
      const payload = this.currentOrder.qrHash;

      const response = await fetch('/api/process-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload: payload }),
      });

      const data = await response.json();

      if (!data.success) {
        this.showAlert(`✗ ${data.error}`, 'danger');
        return;
      }

      // Confirm payment
      const paymentResponse = await fetch('/api/cashier/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderId,
          paymentMethod,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        this.showAlert(`✗ Payment failed: ${paymentData.error}`, 'danger');
        return;
      }

      this.showAlert('✓ Payment confirmed! Order sent to kitchen.', 'success');

      // Clear order
      this.clearOrder();
    } catch (error) {
      this.showAlert('Payment error: ' + error.message, 'danger');
    }
  },

  cancelOrder() {
    this.clearOrder();
    this.showAlert('Order cancelled', 'info');
  },

  clearOrder() {
    this.currentOrder = null;
    document.getElementById('current-order').innerHTML =
      '<p style="text-align: center; margin-top: 3rem; color: var(--gray-400);">Waiting for scan...</p>';
    document.getElementById('payment-panel').innerHTML =
      '<p style="text-align: center; color: var(--gray-400);">No order loaded</p>';
    document.getElementById('qr-input').focus();
  },

  updateUI() {
    document.getElementById('scan-count').textContent = `Scans: ${this.scanCount}`;

    if (this.lastScanTime) {
      const timeStr = this.lastScanTime.toLocaleTimeString();
      document.getElementById('last-scan-time').textContent = timeStr;
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
  document.addEventListener('DOMContentLoaded', () => cashier.init());
} else {
  cashier.init();
}
