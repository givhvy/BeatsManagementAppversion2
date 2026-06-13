// Beats library folder scanning + copying.
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { SUNO_TAGGED_PATH } = require('../paths');

function register() {
  ipcMain.handle('read-beats-folder', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const files = fs.readdirSync(folderPath);
      const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];

      const beats = files
        .filter(file => audioExtensions.includes(path.extname(file).toLowerCase()))
        .map(file => ({
          name: file,
          path: path.join(folderPath, file)
        }));

      return beats;
    } catch (error) {
      console.error('Error reading folder:', error);
      return [];
    }
  });

  ipcMain.handle('copy-beats-to-folder', async (event, { files, targetFolder, allowedExtensions }) => {
    try {
      if (!targetFolder) {
        return { success: false, error: 'No target folder provided' };
      }

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      const audioExtensions = Array.isArray(allowedExtensions) && allowedExtensions.length > 0
        ? allowedExtensions.map(ext => ext.toLowerCase())
        : ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
      const copied = [];

      for (const sourceFile of files || []) {
        if (!sourceFile || !fs.existsSync(sourceFile)) continue;

        const stat = fs.statSync(sourceFile);
        if (!stat.isFile()) continue;

        const ext = path.extname(sourceFile).toLowerCase();
        if (!audioExtensions.includes(ext)) continue;

        const parsed = path.parse(sourceFile);
        let targetFile = path.join(targetFolder, parsed.base);
        let counter = 1;

        while (fs.existsSync(targetFile)) {
          targetFile = path.join(targetFolder, `${parsed.name}-${counter}${parsed.ext}`);
          counter += 1;
        }

        fs.copyFileSync(sourceFile, targetFile);
        copied.push({
          name: path.basename(targetFile),
          path: targetFile
        });
      }

      return { success: true, copied, targetFolder };
    } catch (error) {
      console.error('Error copying beats to folder:', error);
      return { success: false, error: error.message };
    }
  });

  // Read folder contents with both folders and beats
  ipcMain.handle('read-folder-contents', async (event, folderPath) => {
    try {
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];

      const folders = [];
      const beats = [];

      items.forEach(item => {
        const fullPath = path.join(folderPath, item.name);
        if (item.isDirectory()) {
          folders.push({
            name: item.name,
            path: fullPath,
            type: 'folder'
          });
        } else if (audioExtensions.includes(path.extname(item.name).toLowerCase())) {
          beats.push({
            name: item.name,
            path: fullPath,
            type: 'beat'
          });
        }
      });

      return { folders, beats };
    } catch (error) {
      console.error('Error reading folder contents:', error);
      return { folders: [], beats: [] };
    }
  });

  // Get all page folders from tagged directory
  ipcMain.handle('get-page-folders', async () => {
    try {
      const items = fs.readdirSync(SUNO_TAGGED_PATH, { withFileTypes: true });
      const pageFolders = items
        .filter(item => item.isDirectory() && item.name.startsWith('page-'))
        .map(item => ({
          name: item.name,
          path: path.join(SUNO_TAGGED_PATH, item.name),
          tags: [] // Will store channel tags
        }));

      return pageFolders;
    } catch (error) {
      console.error('Error reading page folders:', error);
      return [];
    }
  });
}

module.exports = { register };
