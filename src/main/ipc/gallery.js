// Gallery image folder scanning + importing.
const { ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const state = require('../app-state');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

function register() {
  // Read images from folder
  ipcMain.handle('read-images-folder', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const files = fs.readdirSync(folderPath);

      const images = files
        .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
        .map(file => ({
          name: file,
          path: path.join(folderPath, file)
        }));

      return images;
    } catch (error) {
      console.error('Error reading images folder:', error);
      return [];
    }
  });

  // One level deep: top-level images plus images inside immediate subfolders
  ipcMain.handle('read-images-folder-recursive', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) return [];
      const results = [];
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
          const sub = fs.readdirSync(fullPath).filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()));
          sub.forEach(f => results.push({ name: f, path: path.join(fullPath, f), folder: entry.name }));
        } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
          results.push({ name: entry.name, path: fullPath, folder: '' });
        }
      }
      return results;
    } catch (error) {
      console.error('read-images-folder-recursive error:', error);
      return [];
    }
  });

  ipcMain.handle('save-gallery-images', async (event, { imagePaths, targetFolder }) => {
    try {
      const galleryFolder = targetFolder || 'D:\\coverimages';
      if (!fs.existsSync(galleryFolder)) {
        fs.mkdirSync(galleryFolder, { recursive: true });
      }

      const saved = [];

      for (const imagePath of imagePaths || []) {
        if (!imagePath || !fs.existsSync(imagePath)) continue;
        const ext = path.extname(imagePath).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(ext)) continue;

        const parsed = path.parse(imagePath);
        let targetPath = path.join(galleryFolder, parsed.base);
        let counter = 1;
        while (fs.existsSync(targetPath)) {
          targetPath = path.join(galleryFolder, `${parsed.name}-${counter}${parsed.ext}`);
          counter += 1;
        }

        fs.copyFileSync(imagePath, targetPath);
        saved.push({ name: path.basename(targetPath), path: targetPath });
      }

      return { success: true, saved, targetFolder: galleryFolder };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('show-gallery-image-context-menu', async () => {
    return new Promise(resolve => {
      const menu = Menu.buildFromTemplate([
        {
          label: 'Show in Windows Explorer',
          click: () => resolve({ action: 'show-in-explorer' })
        }
      ]);

      menu.popup({
        window: state.mainWindow,
        callback: () => resolve(null)
      });
    });
  });
}

module.exports = { register };
