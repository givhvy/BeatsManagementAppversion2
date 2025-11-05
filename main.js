const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-beats-folder', async (event, folderPath) => {
  try {
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

ipcMain.handle('save-data', async (event, data) => {
  const dataPath = path.join(app.getPath('userData'), 'beats-data.json');
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
});

ipcMain.handle('load-data', async () => {
  const dataPath = path.join(app.getPath('userData'), 'beats-data.json');
  console.log('📂 Database file location:', dataPath);
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

  const result = await dialog.showSaveDialog(mainWindow, {
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
  const result = await dialog.showOpenDialog(mainWindow, {
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

ipcMain.on('ondragstart', (event, filePath) => {
  try {
    // Create a simple drag icon (empty image)
    const icon = nativeImage.createEmpty();

    // Start drag operation for external apps
    event.sender.startDrag({
      file: filePath,
      icon: icon
    });
  } catch (error) {
    console.error('Error starting drag:', error);
  }
});
