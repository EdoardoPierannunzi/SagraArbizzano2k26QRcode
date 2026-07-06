/**
 * QR Code Generator Service
 * Uses qrcode.js library to generate QR codes from cart payload
 */

export const qrGenerator = {
  // Generate QR code from payload string
  // Payload format: V1|<TIMESTAMP>|<ID>:<QTY>,...
  generateQR(payload, containerId) {
    if (!payload) {
      console.error('[QR] Empty payload');
      return false;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[QR] Container not found:', containerId);
      return false;
    }

    try {
      // Clear previous QR code
      container.innerHTML = '';

      // Create canvas element
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);

      // Generate QR code using qrcode.js
      // Note: qrcode.js must be loaded in HTML
      if (typeof QRCode === 'undefined') {
        console.error('[QR] QRCode library not loaded');
        return false;
      }

      new QRCode(canvas, {
        text: payload,
        width: 300,
        height: 300,
        colorDark: '#111827',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H, // High error correction
      });

      return true;
    } catch (error) {
      console.error('[QR] Generation error:', error);
      return false;
    }
  },

  // Get QR code data URL (for sharing)
  getQRDataURL(payload) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Simple QR generation fallback
      const qrText = `QR: ${payload}`;
      canvas.width = 300;
      canvas.height = 300;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = 'black';
      ctx.font = '12px Arial';
      ctx.fillText(qrText, 10, 150);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('[QR] DataURL error:', error);
      return null;
    }
  },
};

// Load qrcode.js library
export const loadQRCodeLibrary = () => {
  return new Promise((resolve, reject) => {
    if (typeof QRCode !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default qrGenerator;
