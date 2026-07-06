/**
 * Offline Handler
 * Detects online/offline status and updates UI
 */

export const offlineHandler = {
  isOnline: navigator.onLine,
  callbacks: [],

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initial status
    this.updateUI();
  },

  handleOnline() {
    this.isOnline = true;
    console.log('🌐 [Offline] Connection restored');
    this.updateUI();
    this.triggerCallbacks();
  },

  handleOffline() {
    this.isOnline = false;
    console.log('📵 [Offline] Connection lost');
    this.updateUI();
    this.triggerCallbacks();
  },

  updateUI() {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    if (indicator) {
      if (this.isOnline) {
        indicator.classList.remove('offline');
        indicator.classList.add('online');
      } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
      }
    }

    if (statusText) {
      statusText.textContent = this.isOnline ? 'Online' : 'Offline';
    }
  },

  subscribe(callback) {
    this.callbacks.push(callback);
  },

  triggerCallbacks() {
    this.callbacks.forEach(cb => {
      try {
        cb(this.isOnline);
      } catch (error) {
        console.error('Offline callback error:', error);
      }
    });
  },
};

export default offlineHandler;
