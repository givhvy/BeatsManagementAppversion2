// MIDI tab: data persistence + folder scanning/copying.
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function register() {
  ipcMain.handle('get-midi-data', async () => {
    const dataPath = path.join(app.getPath('userData'), 'midi-data.json');
    try {
      if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
      }
      return { midi: [], packs: [] };
    } catch (error) {
      console.error('Error loading MIDI data:', error);
      return { midi: [], packs: [] };
    }
  });

  ipcMain.handle('save-midi-data', async (event, data) => {
    const dataPath = path.join(app.getPath('userData'), 'midi-data.json');
    try {
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(dataPath, json);
      return true;
    } catch (error) {
      console.error('Error saving MIDI data:', error);
      return false;
    }
  });

  ipcMain.handle('scan-midi-folder', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log('[Main] Created MIDI folder:', folderPath);
        return [];
      }

      const files = fs.readdirSync(folderPath);
      const midiExtensions = ['.mid', '.midi'];

      const midiFiles = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return midiExtensions.includes(ext);
        })
        .map(file => path.join(folderPath, file));

      console.log('[Main] Found', midiFiles.length, 'MIDI files in', folderPath);
      return midiFiles;
    } catch (error) {
      console.error('Error scanning MIDI folder:', error);
      return [];
    }
  });

  ipcMain.handle('copy-to-midi-folder', async (event, { files, targetFolder }) => {
    try {
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
        console.log('[Main] Created MIDI folder:', targetFolder);
      }

      const copiedFiles = [];
      const errors = [];

      for (const sourceFile of files) {
        try {
          const fileName = path.basename(sourceFile);
          const targetFile = path.join(targetFolder, fileName);

          if (fs.existsSync(targetFile)) {
            console.log('[Main] File already exists, skipping:', fileName);
            copiedFiles.push(targetFile);
            continue;
          }

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
      console.error('Error copying files to MIDI folder:', error);
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
