// Money management tab data.
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');

function register() {
  ipcMain.handle('save-money-data', async (event, data) => {
    const dataPath = path.join(app.getPath('userData'), 'money-data.json');
    try {
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(dataPath, json);
      const mirrorPath = path.join(APP_ROOT, 'data', 'money-data.json');
      try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
      return true;
    } catch (error) {
      console.error('Error saving money data:', error);
      return false;
    }
  });

  ipcMain.handle('load-money-data', async () => {
    const dataPath = path.join(app.getPath('userData'), 'money-data.json');
    try {
      if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error loading money data:', error);
      return null;
    }
  });
}

module.exports = { register };
