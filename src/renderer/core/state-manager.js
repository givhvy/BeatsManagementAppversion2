/**
 * Centralized State Manager
 * Manages application state with reactive updates
 */

class StateManager {
  constructor() {
    this.state = {
      // Beats state
      beats: {
        folders: {
          all: { path: 'D:\\Beats', beats: [], basePath: 'D:\\Beats', currentPath: 'D:\\Beats' },
          genre: {
            path: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\Genres',
            beats: [],
            basePath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\Genres',
            currentPath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\Genres'
          },
          tagged: {
            path: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs',
            beats: [],
            basePath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs',
            currentPath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs'
          },
          untagged: {
            path: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged',
            beats: [],
            basePath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged',
            currentPath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged'
          }
        },
        currentFolderType: 'all',
        packs: [],
        genrePacks: [],
        currentPackView: 'channel',
        currentPackId: null,
        showingHiddenPacks: false
      },

      // Drum kit state
      drumkit: {
        folders: {
          all: { path: 'D:\\DrumKits', files: [], basePath: 'D:\\DrumKits', currentPath: 'D:\\DrumKits' },
          tagged: { path: 'D:\\DrumKits\\tagged', files: [], basePath: 'D:\\DrumKits\\tagged', currentPath: 'D:\\DrumKits\\tagged' },
          untagged: { path: 'D:\\DrumKits\\untagged', files: [], basePath: 'D:\\DrumKits\\untagged', currentPath: 'D:\\DrumKits\\untagged' }
        },
        currentFolderType: 'all',
        packs: [],
        currentPackId: null,
        showingHiddenPacks: false,
        infos: {}
      },

      // Image database state
      images: {
        folder: '',
        list: [],
        beatImages: {},
        beatPrompts: {}
      },

      // Audio player state
      audio: {
        currentBeat: null,
        isPlaying: false,
        volume: 0.7
      },

      // UI state
      ui: {
        currentSection: 'beats',
        navbarStyle: 'elegant-dark'
      }
    };

    this.listeners = new Map();
  }

  /**
   * Get state value by path
   * @param {string} path - Dot notation path (e.g., 'beats.packs')
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  /**
   * Set state value by path
   * @param {string} path - Dot notation path
   * @param {*} value - New value
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key], this.state);
    
    target[lastKey] = value;
    this.notify(path, value);
  }

  /**
   * Update state value (merge for objects)
   * @param {string} path - Dot notation path
   * @param {*} value - Value to merge
   */
  update(path, value) {
    const current = this.get(path);
    
    if (typeof current === 'object' && !Array.isArray(current)) {
      this.set(path, { ...current, ...value });
    } else {
      this.set(path, value);
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} path - Path to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Notify listeners of state change
   * @param {string} path - Changed path
   * @param {*} value - New value
   */
  notify(path, value) {
    // Notify exact path listeners
    const callbacks = this.listeners.get(path);
    if (callbacks) {
      callbacks.forEach(cb => cb(value));
    }

    // Notify parent path listeners (e.g., 'beats' when 'beats.packs' changes)
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentCallbacks = this.listeners.get(parentPath);
      if (parentCallbacks) {
        parentCallbacks.forEach(cb => cb(this.get(parentPath)));
      }
    }
  }

  /**
   * Get entire state (for debugging)
   */
  getState() {
    return this.state;
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = this.constructor().state;
    this.listeners.clear();
  }
}

// Create singleton instance
const stateManager = new StateManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = stateManager;
} else {
  window.stateManager = stateManager;
}
