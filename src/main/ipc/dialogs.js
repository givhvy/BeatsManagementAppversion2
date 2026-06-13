// Native file/folder picker dialogs.
const { ipcMain, dialog } = require('electron');
const state = require('../app-state');

function register() {
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Select audio file for video creation
  ipcMain.handle('select-audio-file', async () => {
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Select video files for upload
  ipcMain.handle('select-video-files', async () => {
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Video', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });

  // Generic file picker (caller passes dialog options)
  ipcMain.handle('select-files', async (event, options) => {
    const result = await dialog.showOpenDialog(state.mainWindow, options);
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });
}

module.exports = { register };
