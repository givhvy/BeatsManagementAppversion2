/**
 * Data Service
 * Handles all data persistence (localStorage and Electron IPC)
 */

class DataService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.ipcRenderer;
  }

  /**
   * Save beats data
   * @param {Object} data - Data to save
   */
  async saveBeatsData(data) {
    try {
      if (this.isElectron) {
        await window.ipcRenderer.invoke('save-data', data);
      } else {
        localStorage.setItem('beats-data', JSON.stringify(data));
      }
      console.log('[DataService] Beats data saved');
    } catch (error) {
      console.error('[DataService] Error saving beats data:', error);
      throw error;
    }
  }

  /**
   * Load beats data
   * @returns {Object|null} Loaded data
   */
  async loadBeatsData() {
    try {
      if (this.isElectron) {
        const data = await window.ipcRenderer.invoke('load-data');
        console.log('[DataService] Beats data loaded from file');
        return data;
      } else {
        const savedData = localStorage.getItem('beats-data');
        if (savedData) {
          console.log('[DataService] Beats data loaded from localStorage');
          return JSON.parse(savedData);
        }
      }
      return null;
    } catch (error) {
      console.error('[DataService] Error loading beats data:', error);
      return null;
    }
  }

  /**
   * Save drum kit data
   * @param {Object} data - Data to save
   */
  async saveDrumkitData(data) {
    try {
      if (this.isElectron) {
        await window.ipcRenderer.invoke('save-drumkit-data', data);
      } else {
        localStorage.setItem('drumkit-data', JSON.stringify(data));
      }
      console.log('[DataService] Drumkit data saved');
    } catch (error) {
      console.error('[DataService] Error saving drumkit data:', error);
      throw error;
    }
  }

  /**
   * Load drum kit data
   * @returns {Object|null} Loaded data
   */
  async loadDrumkitData() {
    try {
      if (this.isElectron) {
        const data = await window.ipcRenderer.invoke('load-drumkit-data');
        console.log('[DataService] Drumkit data loaded from file');
        return data;
      } else {
        const savedData = localStorage.getItem('drumkit-data');
        if (savedData) {
          console.log('[DataService] Drumkit data loaded from localStorage');
          return JSON.parse(savedData);
        }
      }
      return null;
    } catch (error) {
      console.error('[DataService] Error loading drumkit data:', error);
      return null;
    }
  }

  /**
   * Read folder contents
   * @param {string} folderPath - Path to folder
   * @returns {Array} List of files
   */
  async readFolder(folderPath) {
    if (!this.isElectron) {
      console.warn('[DataService] readFolder only works in Electron');
      return [];
    }

    try {
      const files = await window.ipcRenderer.invoke('read-folder', folderPath);
      return files;
    } catch (error) {
      console.error('[DataService] Error reading folder:', error);
      return [];
    }
  }

  /**
   * Read drum kit folder contents
   * @param {string} folderPath - Path to folder
   * @returns {Array} List of drum kit files
   */
  async readDrumkitFolder(folderPath) {
    if (!this.isElectron) {
      console.warn('[DataService] readDrumkitFolder only works in Electron');
      return [];
    }

    try {
      const files = await window.ipcRenderer.invoke('read-drumkit-folder', folderPath);
      return files;
    } catch (error) {
      console.error('[DataService] Error reading drumkit folder:', error);
      return [];
    }
  }

  /**
   * Select folder dialog
   * @returns {string|null} Selected folder path
   */
  async selectFolder() {
    if (!this.isElectron) {
      console.warn('[DataService] selectFolder only works in Electron');
      return null;
    }

    try {
      const folderPath = await window.ipcRenderer.invoke('select-folder');
      return folderPath;
    } catch (error) {
      console.error('[DataService] Error selecting folder:', error);
      return null;
    }
  }

  /**
   * Select image dialog
   * @returns {string|null} Selected image path
   */
  async selectImage() {
    if (!this.isElectron) {
      console.warn('[DataService] selectImage only works in Electron');
      return null;
    }

    try {
      const imagePath = await window.ipcRenderer.invoke('select-image');
      return imagePath;
    } catch (error) {
      console.error('[DataService] Error selecting image:', error);
      return null;
    }
  }

  /**
   * Reveal file in explorer
   * @param {string} filePath - Path to file
   */
  async revealInExplorer(filePath) {
    if (!this.isElectron) {
      console.warn('[DataService] revealInExplorer only works in Electron');
      return;
    }

    try {
      await window.ipcRenderer.invoke('reveal-in-explorer', filePath);
    } catch (error) {
      console.error('[DataService] Error revealing in explorer:', error);
    }
  }

  /**
   * Save generic data to localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to save
   */
  saveLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[DataService] Error saving to localStorage (${key}):`, error);
    }
  }

  /**
   * Load generic data from localStorage
   * @param {string} key - Storage key
   * @returns {*} Loaded value
   */
  loadLocal(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`[DataService] Error loading from localStorage (${key}):`, error);
      return null;
    }
  }
}

// Create singleton instance
const dataService = new DataService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dataService;
} else {
  window.dataService = dataService;
}
