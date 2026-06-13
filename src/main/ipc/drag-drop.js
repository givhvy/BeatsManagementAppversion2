// Native drag-and-drop of files out of the app (to Explorer, DAWs, browsers).
const { app, ipcMain, nativeImage, clipboard } = require('electron');
const path = require('path');
const state = require('../app-state');

function register() {
  ipcMain.on('ondragstart', (event, filePath) => {
    try {
      // Create a simple drag icon (empty image)
      const icon = nativeImage.createEmpty();

      // Start drag operation for external apps
      event.sender.startDrag({
        file: filePath,
        icon: icon
      });
    } catch (error) {
      console.error('Error starting drag:', error);
    }
  });

  // Handle drag multiple files to external apps (beat + image)
  ipcMain.on('drag-files-start', (event, data) => {
    // Handle both old format (array) and new format (object with files and beatName)
    let filePaths, beatName;

    if (Array.isArray(data)) {
      // Old format: just array of file paths
      filePaths = data;
      beatName = null;
    } else {
      // New format: object with files array and beatName
      filePaths = data.files;
      beatName = data.beatName;
    }

    if (!filePaths || filePaths.length === 0) return;

    // Copy beat name to clipboard if provided
    if (beatName) {
      clipboard.writeText(beatName);
    }

    // Use first file as icon (audio or image)
    let icon;

    try {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const hasImage = filePaths.some(p => imageExtensions.includes(path.extname(p).toLowerCase()));

      if (hasImage) {
        const imagePath = filePaths.find(p => imageExtensions.includes(path.extname(p).toLowerCase()));
        const img = nativeImage.createFromPath(imagePath);
        icon = (img && !img.isEmpty()) ? img.resize({ width: 64, height: 64 }) : (state.cachedDragIcon || nativeImage.createEmpty());
      } else {
        // Use the pre-cached system icon for MP4/audio files
        // Falls back to app.getFileIcon for this specific file if cache isn't ready
        if (state.cachedDragIcon) {
          icon = state.cachedDragIcon;
        } else {
          // Try to get file icon synchronously via a pre-loaded version
          icon = nativeImage.createEmpty();
          // Async fallback: pre-load for next time
          app.getFileIcon(filePaths[0], { size: 'normal' }).then(i => { if (i && !i.isEmpty()) state.cachedDragIcon = i; }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('[drag-files-start] icon error:', error.message);
      icon = state.cachedDragIcon || nativeImage.createEmpty();
    }

    // Drag single file or multiple files
    try {
      const dragItem = filePaths.length === 1
        ? { file: filePaths[0], icon }
        : { files: filePaths, icon };

      console.log('[drag-files-start] startDrag:', JSON.stringify(filePaths));
      event.sender.startDrag(dragItem);
      console.log('[drag-files-start] startDrag OK');
    } catch (err) {
      console.error('[drag-files-start] startDrag FAILED:', err.message);
    }
  });
}

module.exports = { register };
