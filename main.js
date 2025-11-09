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

// Read images from folder
ipcMain.handle('read-images-folder', async (event, folderPath) => {
  try {
    const files = fs.readdirSync(folderPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

    const images = files
      .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
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

// Email management handlers
ipcMain.handle('load-emails', async () => {
  const emailFilePath = 'F:\\PlaygroundTest\\BeatsManagement\\email.txt';
  try {
    // Check if email file exists
    if (!fs.existsSync(emailFilePath)) {
      return { emails: [], error: 'Email file not found at F:\\PlaygroundTest\\BeatsManagement\\email.txt' };
    }

    // Read email file content
    const content = fs.readFileSync(emailFilePath, 'utf8');
    const emails = [];

    // Parse emails from file (format: email:password:recovery per line)
    const lines = content.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const parts = line.trim().split(':');
      if (parts.length >= 2) {
        const email = parts[0];
        const password = parts[1];
        const recovery = parts[2] || ''; // Optional recovery email

        if (email && password) {
          emails.push({ email, password, recovery, used: false });
        }
      }
    }

    console.log(`✅ Loaded ${emails.length} emails from email.txt`);
    return { emails, error: null };
  } catch (error) {
    console.error('Error loading emails:', error);
    return { emails: [], error: error.message };
  }
});

ipcMain.handle('add-email', async (event, emailData) => {
  const emailFilePath = 'F:\\PlaygroundTest\\BeatsManagement\\email.txt';
  try {
    // Create file if it doesn't exist
    if (!fs.existsSync(emailFilePath)) {
      fs.writeFileSync(emailFilePath, '', 'utf8');
    }

    // Append new email:password:recovery to file
    const recovery = emailData.recovery || '';
    const newLine = recovery
      ? `${emailData.email}:${emailData.password}:${recovery}\n`
      : `${emailData.email}:${emailData.password}\n`;
    fs.appendFileSync(emailFilePath, newLine, 'utf8');

    console.log(`✅ Added new email: ${emailData.email}${recovery ? ' with recovery' : ''}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error adding email:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-emails-bulk', async (event, emailsArray) => {
  const emailFilePath = 'F:\\PlaygroundTest\\BeatsManagement\\email.txt';
  try {
    // Create file if it doesn't exist
    if (!fs.existsSync(emailFilePath)) {
      fs.writeFileSync(emailFilePath, '', 'utf8');
    }

    // Build all lines
    const lines = emailsArray.map(emailData => {
      const recovery = emailData.recovery || '';
      return recovery
        ? `${emailData.email}:${emailData.password}:${recovery}`
        : `${emailData.email}:${emailData.password}`;
    });

    // Append all lines at once
    const bulkContent = lines.join('\n') + '\n';
    fs.appendFileSync(emailFilePath, bulkContent, 'utf8');

    console.log(`✅ Added ${emailsArray.length} emails in bulk`);
    return { success: true, count: emailsArray.length, error: null };
  } catch (error) {
    console.error('Error adding emails in bulk:', error);
    return { success: false, count: 0, error: error.message };
  }
});

// Get all page folders from tagged directory
ipcMain.handle('get-page-folders', async () => {
  const taggedPath = 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged';
  try {
    const items = fs.readdirSync(taggedPath, { withFileTypes: true });
    const pageFolders = items
      .filter(item => item.isDirectory() && item.name.startsWith('page-'))
      .map(item => ({
        name: item.name,
        path: path.join(taggedPath, item.name),
        tags: [] // Will store channel tags
      }));

    return pageFolders;
  } catch (error) {
    console.error('Error reading page folders:', error);
    return [];
  }
});

// Handle drag multiple files to external apps (beat + image)
ipcMain.on('drag-files-start', (event, filePaths) => {
  if (!filePaths || filePaths.length === 0) return;

  // Use first file as icon (audio or image)
  const iconPath = filePaths[0];
  let icon;

  try {
    // Try to create icon from image if available
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const hasImage = filePaths.some(p => imageExtensions.includes(path.extname(p).toLowerCase()));

    if (hasImage) {
      const imagePath = filePaths.find(p => imageExtensions.includes(path.extname(p).toLowerCase()));
      icon = nativeImage.createFromPath(imagePath);
      icon = icon.resize({ width: 64, height: 64 });
    } else {
      icon = nativeImage.createEmpty();
    }
  } catch (error) {
    icon = nativeImage.createEmpty();
  }

  // Drag single file or multiple files
  if (filePaths.length === 1) {
    event.sender.startDrag({
      file: filePaths[0],
      icon: icon
    });
  } else {
    event.sender.startDrag({
      files: filePaths,
      icon: icon
    });
  }
});
