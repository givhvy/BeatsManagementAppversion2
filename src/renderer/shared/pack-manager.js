/**
 * Pack Manager
 * Shared pack operations for beats and drum kits
 */

class PackManager {
  /**
   * Create a new pack
   * @param {string} name - Pack name
   * @param {string} type - Pack type ('beat' or 'drumkit')
   * @returns {Object} New pack
   */
  createPack(name, type = 'beat') {
    return {
      id: `${type}-pack-${Date.now()}`,
      name: name,
      files: type === 'beat' ? [] : [],
      beats: type === 'beat' ? [] : undefined,
      hidden: false,
      thumbnail: 'auto',
      email: type === 'beat' ? 'No email available yet' : undefined,
      password: type === 'beat' ? '' : undefined,
      description: type === 'beat' ? '' : undefined
    };
  }

  /**
   * Sort packs by number in name
   * @param {Array} packs - Array of packs
   * @returns {Array} Sorted packs
   */
  sortPacksByNumber(packs) {
    return [...packs].sort((a, b) => {
      const numA = this.extractNumber(a.name);
      const numB = this.extractNumber(b.name);
      
      if (numA !== null && numB !== null) {
        return numA - numB;
      }
      
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Extract number from pack name
   * @param {string} name - Pack name
   * @returns {number|null} Extracted number
   */
  extractNumber(name) {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  /**
   * Filter packs by hidden status
   * @param {Array} packs - Array of packs
   * @param {boolean} showHidden - Show hidden packs
   * @returns {Array} Filtered packs
   */
  filterPacksByHidden(packs, showHidden) {
    return packs.filter(pack => {
      const isHidden = pack.hidden === true;
      return showHidden ? isHidden : !isHidden;
    });
  }

  /**
   * Find pack by ID
   * @param {Array} packs - Array of packs
   * @param {string} packId - Pack ID
   * @returns {Object|null} Found pack
   */
  findPackById(packs, packId) {
    return packs.find(p => p.id === packId) || null;
  }

  /**
   * Add item to pack
   * @param {Object} pack - Pack object
   * @param {Object} item - Item to add
   * @param {string} type - Pack type ('beat' or 'drumkit')
   * @returns {boolean} Success
   */
  addItemToPack(pack, item, type = 'beat') {
    if (!pack) return false;

    const items = type === 'beat' ? pack.beats : pack.files;
    
    // Check if item already exists
    const exists = items.some(i => i.path === item.path);
    if (exists) return false;

    items.push(item);
    return true;
  }

  /**
   * Remove item from pack
   * @param {Object} pack - Pack object
   * @param {number} index - Item index
   * @param {string} type - Pack type ('beat' or 'drumkit')
   * @returns {boolean} Success
   */
  removeItemFromPack(pack, index, type = 'beat') {
    if (!pack) return false;

    const items = type === 'beat' ? pack.beats : pack.files;
    
    if (index < 0 || index >= items.length) return false;

    items.splice(index, 1);
    return true;
  }

  /**
   * Toggle pack hidden status
   * @param {Object} pack - Pack object
   * @returns {boolean} New hidden status
   */
  togglePackHidden(pack) {
    if (!pack) return false;
    pack.hidden = !pack.hidden;
    return pack.hidden;
  }

  /**
   * Update pack thumbnail
   * @param {Object} pack - Pack object
   * @param {string} thumbnailPath - Thumbnail path or data URL
   */
  updatePackThumbnail(pack, thumbnailPath) {
    if (!pack) return;
    pack.thumbnail = thumbnailPath;
  }

  /**
   * Get pack item count
   * @param {Object} pack - Pack object
   * @param {string} type - Pack type ('beat' or 'drumkit')
   * @returns {number} Item count
   */
  getPackItemCount(pack, type = 'beat') {
    if (!pack) return 0;
    const items = type === 'beat' ? pack.beats : pack.files;
    return items?.length || 0;
  }

  /**
   * Validate pack name
   * @param {string} name - Pack name
   * @returns {Object} Validation result {valid, error}
   */
  validatePackName(name) {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Pack name cannot be empty' };
    }

    if (name.length > 100) {
      return { valid: false, error: 'Pack name is too long (max 100 characters)' };
    }

    return { valid: true, error: null };
  }

  /**
   * Search packs by name
   * @param {Array} packs - Array of packs
   * @param {string} query - Search query
   * @returns {Array} Filtered packs
   */
  searchPacks(packs, query) {
    if (!query || query.trim().length === 0) {
      return packs;
    }

    const lowerQuery = query.toLowerCase();
    return packs.filter(pack => 
      pack.name.toLowerCase().includes(lowerQuery)
    );
  }
}

// Create singleton instance
const packManager = new PackManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = packManager;
} else {
  window.packManager = packManager;
}
