// FL Studio tab: project scanning, launching, and notes persistence.
const { app, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function register() {
  ipcMain.handle('read-flstudio-folder', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        return [];
      }

      function scanDir(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        const projects = [];

        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            // Scan subdirectories for .flp files
            projects.push(...scanDir(fullPath));
          } else if (path.extname(item.name).toLowerCase() === '.flp') {
            const stat = fs.statSync(fullPath);
            projects.push({
              name: item.name,
              path: fullPath,
              size: stat.size,
              modified: stat.mtimeMs
            });
          }
        }
        return projects;
      }

      return scanDir(folderPath);
    } catch (error) {
      console.error('Error reading FL Studio folder:', error);
      return [];
    }
  });

  ipcMain.handle('open-in-flstudio', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Project file not found: ' + filePath };
      }

      const { exec } = require('child_process');

      // Try common FL Studio paths
      const flPaths = [
        'C:\\Program Files\\Image-Line\\FL Studio 2024\\FL64.exe',
        'C:\\Program Files\\Image-Line\\FL Studio 2025\\FL64.exe',
        'C:\\Program Files\\Image-Line\\FL Studio 21\\FL64.exe',
        'C:\\Program Files\\Image-Line\\FL Studio 20\\FL64.exe',
        'C:\\Program Files (x86)\\Image-Line\\FL Studio 21\\FL64.exe',
        'C:\\Program Files (x86)\\Image-Line\\FL Studio 20\\FL64.exe'
      ];

      let flExe = null;
      for (const p of flPaths) {
        if (fs.existsSync(p)) {
          flExe = p;
          break;
        }
      }

      if (flExe) {
        exec(`"${flExe}" "${filePath}"`, (err) => {
          if (err) console.error('Error launching FL Studio:', err);
        });
      } else {
        // Fallback: open with OS default handler for .flp
        await shell.openPath(filePath);
      }

      return { success: true };
    } catch (error) {
      console.error('Error opening in FL Studio:', error);
      return { success: false, error: error.message };
    }
  });

  // FL Studio data (notes) persistence
  ipcMain.handle('save-flstudio-data', async (event, data) => {
    const dataPath = path.join(app.getPath('userData'), 'flstudio-data.json');
    try {
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(dataPath, json, 'utf8');
      return { success: true };
    } catch (error) {
      console.error('Error saving FL Studio data:', error);
      return { success: false };
    }
  });

  ipcMain.handle('load-flstudio-data', async () => {
    const dataPath = path.join(app.getPath('userData'), 'flstudio-data.json');
    try {
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(raw);
      }
      return null;
    } catch (error) {
      console.error('Error loading FL Studio data:', error);
      return null;
    }
  });
}

module.exports = { register };
