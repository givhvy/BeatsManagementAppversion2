// Cloudflare R2 (Cloud tab) — thin IPC layer over r2-service.
const { app, ipcMain, dialog } = require('electron');
const path = require('path');
const r2Service = require('../r2-service');
const state = require('../app-state');

function register() {
  ipcMain.handle('r2-load-config', async () => {
    try {
      const config = r2Service.loadConfig(app.getPath('userData'));
      return { success: true, config, configured: r2Service.isConfigured(config) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('r2-save-config', async (event, config) => {
    try {
      const saved = r2Service.saveConfig(app.getPath('userData'), config);
      return { success: true, config: saved, configured: r2Service.isConfigured(saved) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('r2-test-connection', async (event, config) => {
    try {
      await r2Service.testConnection(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('r2-list-objects', async (event, config) => {
    try {
      const objects = await r2Service.listObjects(config, config.prefix || '');
      return { success: true, objects };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Pick local beat files to upload to R2
  ipcMain.handle('r2-select-files', async () => {
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });

  ipcMain.handle('r2-upload-files', async (event, { config, filePaths }) => {
    const results = [];
    const total = (filePaths || []).length;

    for (let i = 0; i < total; i++) {
      const filePath = filePaths[i];
      const fileName = path.basename(filePath);
      const key = `${config.prefix || ''}${fileName}`;

      try {
        await r2Service.uploadFile(config, filePath, key);
        results.push({ fileName, key, success: true });
      } catch (error) {
        results.push({ fileName, key, success: false, error: error.message });
      }

      if (state.mainWindow) {
        state.mainWindow.webContents.send('r2-upload-progress', { current: i + 1, total, fileName });
      }
    }

    return { success: true, results };
  });

  ipcMain.handle('r2-delete-object', async (event, { config, key }) => {
    try {
      await r2Service.deleteObject(config, key);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('r2-get-object-url', async (event, { config, key }) => {
    try {
      const result = await r2Service.getObjectUrl(config, key);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
