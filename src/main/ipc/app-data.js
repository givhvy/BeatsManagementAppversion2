// Core beats database (beats-data.json in userData, mirrored to data/ for git).
const { app, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');
const state = require('../app-state');

function register() {
  ipcMain.handle('save-data', async (event, data) => {
    const dataPath = path.join(app.getPath('userData'), 'beats-data.json');
    try {
      // Load existing data and merge to prevent cross-tab data loss
      let existing = {};
      if (fs.existsSync(dataPath)) {
        try {
          const raw = fs.readFileSync(dataPath, 'utf8');
          existing = JSON.parse(raw);
        } catch (e) { /* ignore parse errors, start fresh */ }
      }
      const merged = { ...existing, ...data };
      const json = JSON.stringify(merged, null, 2);
      fs.writeFileSync(dataPath, json);
      // Mirror to data/ folder so git can track it
      const mirrorPath = path.join(APP_ROOT, 'data', 'beats-data.json');
      try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  });

  ipcMain.handle('load-data', async () => {
    const dataPath = path.join(app.getPath('userData'), 'beats-data.json');
    console.log('Database file location:', dataPath);
    try {
      if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error loading data:', error);
      return null;
    }
  });

  ipcMain.handle('get-database-path', async () => {
    return path.join(app.getPath('userData'), 'beats-data.json');
  });

  ipcMain.handle('export-database', async () => {
    const dataPath = path.join(app.getPath('userData'), 'beats-data.json');

    if (!fs.existsSync(dataPath)) {
      return { success: false, error: 'No database found to export' };
    }

    const result = await dialog.showSaveDialog(state.mainWindow, {
      defaultPath: 'beats-data-backup.json',
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      try {
        fs.copyFileSync(dataPath, result.filePath);
        return { success: true, path: result.filePath };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: false, error: 'Export cancelled' };
  });

  ipcMain.handle('import-database', async () => {
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const importPath = result.filePaths[0];
        const data = fs.readFileSync(importPath, 'utf8');

        // Validate JSON
        JSON.parse(data);

        // Copy to database location
        const dataPath = path.join(app.getPath('userData'), 'beats-data.json');
        fs.writeFileSync(dataPath, data);

        return { success: true, path: importPath };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: false, error: 'Import cancelled' };
  });
}

module.exports = { register };
