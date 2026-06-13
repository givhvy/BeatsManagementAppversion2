// Shared mutable state for the main process. Modules read/write properties
// at call time, so assignment order during startup does not matter.
module.exports = {
  mainWindow: null,

  // Pre-cached system drag icon for .mp4/audio files (see window.js)
  cachedDragIcon: null,

  // VideoRenderer instance from modules/videoRenderer (null if unavailable)
  videoRenderer: null
};
