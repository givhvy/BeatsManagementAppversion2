/**
 * IPC Bridge
 * Wrapper for Electron IPC communication with fallbacks
 */

class IPCBridge {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.ipcRenderer;
  }

  /**
   * Check if running in Electron
   * @returns {boolean}
   */
  isElectronApp() {
    return this.isElectron;
  }

  /**
   * Invoke IPC method
   * @param {string} channel - IPC channel
   * @param {...*} args - Arguments
   * @returns {Promise<*>} Result
   */
  async invoke(channel, ...args) {
    if (!this.isElectron) {
      console.warn(`[IPCBridge] IPC not available: ${channel}`);
      return null;
    }

    try {
      return await window.ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error(`[IPCBridge] Error invoking ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Send IPC message (one-way)
   * @param {string} channel - IPC channel
   * @param {...*} args - Arguments
   */
  send(channel, ...args) {
    if (!this.isElectron) {
      console.warn(`[IPCBridge] IPC not available: ${channel}`);
      return;
    }

    try {
      window.ipcRenderer.send(channel, ...args);
    } catch (error) {
      console.error(`[IPCBridge] Error sending ${channel}:`, error);
    }
  }

  /**
   * Listen to IPC events
   * @param {string} channel - IPC channel
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(channel, callback) {
    if (!this.isElectron) {
      console.warn(`[IPCBridge] IPC not available: ${channel}`);
      return () => {};
    }

    const listener = (event, ...args) => callback(...args);
    window.ipcRenderer.on(channel, listener);

    return () => {
      window.ipcRenderer.removeListener(channel, listener);
    };
  }

  /**
   * Listen to IPC events (once)
   * @param {string} channel - IPC channel
   * @param {Function} callback - Callback function
   */
  once(channel, callback) {
    if (!this.isElectron) {
      console.warn(`[IPCBridge] IPC not available: ${channel}`);
      return;
    }

    window.ipcRenderer.once(channel, (event, ...args) => callback(...args));
  }
}

// Create singleton instance
const ipcBridge = new IPCBridge();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ipcBridge;
} else {
  window.ipcBridge = ipcBridge;
}
