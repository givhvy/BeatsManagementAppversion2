// Consistency tracker data (upload streaks per channel).
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function register() {
  ipcMain.handle('load-consistency-data', async () => {
    try {
      const dataPath = path.join(app.getPath('userData'), 'consistency-data.json');

      if (!fs.existsSync(dataPath)) {
        return { success: true, data: { uploads: {} } };
      }

      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return { success: true, data };
    } catch (error) {
      console.error('Error loading consistency data:', error);
      return { success: false, error: error.message, data: { uploads: {} } };
    }
  });

  ipcMain.handle('save-consistency-data', async (event, data) => {
    try {
      const dataPath = path.join(app.getPath('userData'), 'consistency-data.json');
      const backupPath = path.join(app.getPath('userData'), 'consistency-data.backup.json');

      // Create backup of existing data before saving
      if (fs.existsSync(dataPath)) {
        try {
          fs.copyFileSync(dataPath, backupPath);
        } catch (backupError) {
          console.error('Warning: Could not create backup:', backupError);
        }
      }

      // Save new data
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      console.log('Consistency data saved successfully');

      return { success: true };
    } catch (error) {
      console.error('Error saving consistency data:', error);

      // Try to restore from backup if save failed
      const dataPath = path.join(app.getPath('userData'), 'consistency-data.json');
      const backupPath = path.join(app.getPath('userData'), 'consistency-data.backup.json');

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
