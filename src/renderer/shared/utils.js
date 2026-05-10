/**
 * Utility Functions
 * Shared helper functions across the application
 */

const Utils = {
  /**
   * Format time in seconds to MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in ms
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Convert Windows path to file:/// URL
   * @param {string} path - Windows path
   * @returns {string} File URL
   */
  pathToFileUrl(path) {
    if (!path) return '';
    if (path.startsWith('file:///')) return path;
    if (path.startsWith('data:')) return path;
    
    return 'file:///' + path.replace(/\\/g, '/');
  },

  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} Extension (lowercase, with dot)
   */
  getFileExtension(filename) {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '';
  },

  /**
   * Remove file extension
   * @param {string} filename - File name
   * @returns {string} Name without extension
   */
  removeFileExtension(filename) {
    return filename.replace(/\.[^.]+$/, '');
  },

  /**
   * Check if file is audio
   * @param {string} filename - File name
   * @returns {boolean} Is audio file
   */
  isAudioFile(filename) {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
    const ext = this.getFileExtension(filename);
    return audioExtensions.includes(ext);
  },

  /**
   * Check if file is image
   * @param {string} filename - File name
   * @returns {boolean} Is image file
   */
  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = this.getFileExtension(filename);
    return imageExtensions.includes(ext);
  },

  /**
   * Sanitize filename
   * @param {string} filename - File name
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_');
  },

  /**
   * Deep clone object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Type (success, error, info, warning)
   */
  showNotification(message, type = 'info') {
    // Check if global showNotification exists
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  },

  /**
   * Escape HTML
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Parse email/password from paste format
   * @param {string} text - Pasted text (email\tpassword|recovery)
   * @returns {Object} Parsed data {email, password, recovery}
   */
  parseEmailPasswordPaste(text) {
    const parts = text.split('\t');
    
    if (parts.length >= 2) {
      const email = parts[0].trim();
      const passwordAndRecovery = parts[1].trim();
      const passwordParts = passwordAndRecovery.split('|');
      const password = passwordParts[0].trim();
      const recovery = passwordParts[1] ? passwordParts[1].trim() : '';
      
      return { email, password, recovery };
    }
    
    return { email: text.trim(), password: '', recovery: '' };
  },

  /**
   * Sort array by property
   * @param {Array} array - Array to sort
   * @param {string} property - Property to sort by
   * @param {boolean} ascending - Sort ascending
   * @returns {Array} Sorted array
   */
  sortBy(array, property, ascending = true) {
    return [...array].sort((a, b) => {
      const aVal = a[property];
      const bVal = b[property];
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  },

  /**
   * Group array by property
   * @param {Array} array - Array to group
   * @param {string} property - Property to group by
   * @returns {Object} Grouped object
   */
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  },

  /**
   * Wait for specified time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after wait
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Clamp number between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else {
  window.Utils = Utils;
}
