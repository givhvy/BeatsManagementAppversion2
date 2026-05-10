/**
 * Centralized Audio Player
 * Handles all audio playback across the application
 */

class AudioPlayer {
  constructor() {
    this.audioElement = null;
    this.currentBeat = null;
    this.isPlaying = false;
    this.listeners = {
      play: new Set(),
      pause: new Set(),
      timeUpdate: new Set(),
      ended: new Set(),
      error: new Set()
    };
  }

  /**
   * Initialize audio player with DOM element
   * @param {HTMLAudioElement} audioElement - Audio element
   */
  init(audioElement) {
    this.audioElement = audioElement;
    
    // Set up event listeners
    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.emit('play', this.currentBeat);
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.emit('pause', this.currentBeat);
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.emit('timeUpdate', {
        currentTime: this.audioElement.currentTime,
        duration: this.audioElement.duration
      });
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.emit('ended', this.currentBeat);
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('[AudioPlayer] Error:', e);
      this.emit('error', e);
    });
  }

  /**
   * Play a beat
   * @param {string} beatPath - Path to audio file
   * @param {string} beatName - Display name
   */
  play(beatPath, beatName) {
    if (!this.audioElement) {
      console.error('[AudioPlayer] Audio element not initialized');
      return;
    }

    this.currentBeat = { path: beatPath, name: beatName };
    
    // Convert Windows path to file:/// URL if needed
    let audioSrc = beatPath;
    if (beatPath.includes(':\\')) {
      audioSrc = 'file:///' + beatPath.replace(/\\/g, '/');
    }

    this.audioElement.src = audioSrc;
    this.audioElement.play().catch(err => {
      console.error('[AudioPlayer] Play error:', err);
      this.emit('error', err);
    });
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Resume playback
   */
  resume() {
    if (this.audioElement) {
      this.audioElement.play().catch(err => {
        console.error('[AudioPlayer] Resume error:', err);
      });
    }
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  /**
   * Stop playback
   */
  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.currentBeat = null;
    }
  }

  /**
   * Seek to position
   * @param {number} time - Time in seconds
   */
  seek(time) {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
    }
  }

  /**
   * Set volume
   * @param {number} volume - Volume (0-1)
   */
  setVolume(volume) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current time
   * @returns {number} Current time in seconds
   */
  getCurrentTime() {
    return this.audioElement?.currentTime || 0;
  }

  /**
   * Get duration
   * @returns {number} Duration in seconds
   */
  getDuration() {
    return this.audioElement?.duration || 0;
  }

  /**
   * Get current beat info
   * @returns {Object|null} Current beat
   */
  getCurrentBeat() {
    return this.currentBeat;
  }

  /**
   * Check if playing
   * @returns {boolean} Is playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Subscribe to events
   * @param {string} event - Event name (play, pause, timeUpdate, ended, error)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].add(callback);
      
      return () => {
        this.listeners[event].delete(callback);
      };
    }
    
    console.warn(`[AudioPlayer] Unknown event: ${event}`);
    return () => {};
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// Create singleton instance
const audioPlayer = new AudioPlayer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = audioPlayer;
} else {
  window.audioPlayer = audioPlayer;
}
