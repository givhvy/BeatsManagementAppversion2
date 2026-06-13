// Drum kit tab: folder scanning + dedicated data file (prevents cross-tab data loss).
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');

function register() {
  ipcMain.handle('read-drumkit-folder', async (event, folderPath) => {
    try {
      const files = fs.readdirSync(folderPath);
      const drumkitExtensions = ['.zip', '.rar', '.wav', '.mp3', '.flac', '.flp', '.sf2', '.opus', '.ogg', '.m4a', '.aac', '.kit', '.onekit'];

      const kits = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return drumkitExtensions.includes(ext) || ext === '';
        })
        .map(file => ({
          name: file,
          path: path.join(folderPath, file)
        }));

      return kits;
    } catch (error) {
      console.error('Error reading drumkit folder:', error);
      return [];
    }
  });

  ipcMain.handle('save-drumkit-data', async (event, data) => {
    const dataPath = path.join(app.getPath('userData'), 'drumkit-data.json');
    try {
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(dataPath, json);
      // Mirror to data/ folder so git can track it
      const mirrorPath = path.join(APP_ROOT, 'data', 'drumkit-data.json');
      try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
      return true;
    } catch (error) {
      console.error('Error saving drumkit data:', error);
      return false;
    }
  });

  ipcMain.handle('load-drumkit-data', async () => {
    const dataPath = path.join(app.getPath('userData'), 'drumkit-data.json');
    try {
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(raw);
      }
      return null;
    } catch (error) {
      console.error('Error loading drumkit data:', error);
      return null;
    }
  });
}

module.exports = { register };
