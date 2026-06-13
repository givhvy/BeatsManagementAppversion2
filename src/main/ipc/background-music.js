// Background music tab: data persistence + folder scanning/copying.
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function register() {
  ipcMain.handle('get-background-music-data', async () => {
    const dataPath = path.join(app.getPath('userData'), 'background-music-data.json');
    try {
      if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
      }
      return { music: [], packs: [] };
    } catch (error) {
      console.error('Error loading background music data:', error);
      return { music: [], packs: [] };
    }
  });

  ipcMain.handle('save-background-music-data', async (event, data) => {
    const dataPath = path.join(app.getPath('userData'), 'background-music-data.json');
    try {
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(dataPath, json);
      return true;
    } catch (error) {
      console.error('Error saving background music data:', error);
      return false;
    }
  });

  ipcMain.handle('scan-background-music-folder', async (event, folderPath) => {
    try {
      // Create folder if it doesn't exist
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log('[Main] Created background music folder:', folderPath);
        return [];
      }

      // Read all files in the folder
      const files = fs.readdirSync(folderPath);
      const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'];

      const audioFiles = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return audioExtensions.includes(ext);
        })
        .map(file => path.join(folderPath, file));

      console.log('[Main] Found', audioFiles.length, 'audio files in', folderPath);
      return audioFiles;
    } catch (error) {
      console.error('Error scanning background music folder:', error);
      return [];
    }
  });

  ipcMain.handle('copy-to-background-music-folder', async (event, { files, targetFolder }) => {
    try {
      // Create target folder if it doesn't exist
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
        console.log('[Main] Created background music folder:', targetFolder);
      }

      const copiedFiles = [];
      const errors = [];

      for (const sourceFile of files) {
        try {
          const fileName = path.basename(sourceFile);
          const targetFile = path.join(targetFolder, fileName);

          // Check if file already exists
          if (fs.existsSync(targetFile)) {
            console.log('[Main] File already exists, skipping:', fileName);
            copiedFiles.push(targetFile);
            continue;
          }

          // Copy the file
          fs.copyFileSync(sourceFile, targetFile);
          console.log('[Main] Copied:', fileName, 'to', targetFolder);
          copiedFiles.push(targetFile);
        } catch (err) {
          console.error('[Main] Error copying file:', sourceFile, err);
          errors.push({ file: sourceFile, error: err.message });
        }
      }

      return {
        success: true,
        copiedFiles: copiedFiles,
        errors: errors
      };
    } catch (error) {
      console.error('Error copying files to background music folder:', error);
      return {
        success: false,
        error: error.message,
        copiedFiles: [],
        errors: []
      };
    }
  });
}

module.exports = { register };
