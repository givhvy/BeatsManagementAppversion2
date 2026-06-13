// Distro tab: release tracking data.
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function register() {
  ipcMain.handle('load-distro-releases', async () => {
    try {
      const dataPath = path.join(app.getPath('userData'), 'distro-releases.json');

      if (!fs.existsSync(dataPath)) {
        return { success: true, releases: [] };
      }

      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return { success: true, releases: data.releases || [] };
    } catch (error) {
      console.error('Error loading distro releases:', error);
      return { success: false, error: error.message, releases: [] };
    }
  });

  ipcMain.handle('save-distro-releases', async (event, releases) => {
    try {
      const dataPath = path.join(app.getPath('userData'), 'distro-releases.json');
      const backupPath = path.join(app.getPath('userData'), 'distro-releases.backup.json');

      // Create backup of existing data before saving
      if (fs.existsSync(dataPath)) {
        try {
          fs.copyFileSync(dataPath, backupPath);
        } catch (backupError) {
          console.error('Warning: Could not create backup:', backupError);
        }
      }

      // Save new data
      const data = {
        releases,
        lastSaved: new Date().toISOString()
      };
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      console.log('Distro releases saved successfully');

      return { success: true };
    } catch (error) {
      console.error('Error saving distro releases:', error);

      // Try to restore from backup if save failed
      const dataPath = path.join(app.getPath('userData'), 'distro-releases.json');
      const backupPath = path.join(app.getPath('userData'), 'distro-releases.backup.json');

      if (fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, dataPath);
          console.log('Restored from backup after save failure');
        } catch (restoreError) {
          console.error('Failed to restore from backup:', restoreError);
        }
      }

      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
