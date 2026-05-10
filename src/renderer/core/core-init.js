/**
 * Core Initialization
 * Loads and initializes all core modules
 */

(function() {
  console.log('[Core] Initializing core modules...');

  // Initialize audio player when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioPlayer);
  } else {
    initAudioPlayer();
  }

  function initAudioPlayer() {
    const audioElement = document.getElementById('audio-element');
    if (audioElement && window.audioPlayer) {
      window.audioPlayer.init(audioElement);
      console.log('[Core] Audio player initialized');
    }
  }

  // Make global playBeat function that uses the audio player
  window.playBeat = function(beatPath, beatName) {
    if (window.audioPlayer) {
      window.audioPlayer.play(beatPath, beatName);
    }
  };

  console.log('[Core] Core modules ready');
})();
