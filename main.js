const { app, BrowserWindow, ipcMain, dialog, nativeImage, clipboard, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// MUST be called before app is ready for taskbar icon + pin to work on Windows
app.setAppUserModelId('com.givhvy.beatsmanagementstudio');

// Pre-cached drag icon (populated once app is ready)
let cachedDragIcon = null;

async function loadDragIcon() {
  try {
    // Write a temp empty .mp4 just to get its system icon
    const tmpMp4 = path.join(app.getPath('temp'), '_bms_icon_probe.mp4');
    fs.writeFileSync(tmpMp4, '');
    const icon = await app.getFileIcon(tmpMp4, { size: 'normal' });
    if (icon && !icon.isEmpty()) {
      cachedDragIcon = icon;
      console.log('[Main] Drag icon loaded successfully');
    } else {
      console.log('[Main] Drag icon probe returned empty, will use fallback');
    }
    fs.unlinkSync(tmpMp4);
  } catch (e) {
    console.log('[Main] Could not load drag icon:', e.message);
  }
}

// Set App User Model ID so Windows groups taskbar correctly and allows 'Pin to taskbar'
// (already set at top of file before app ready)

// Video renderer for AutoVid functionality
let videoRenderer = null;
try {
  const VideoRenderer = require('./modules/videoRenderer');
  videoRenderer = new VideoRenderer();
} catch (e) {
  console.log('Video renderer not available:', e.message);
}

let mainWindow;

// Create a desktop .lnk shortcut that can be pinned to the Windows taskbar
function createDesktopShortcut() {
  try {
    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'Beats Management Studio.lnk');
    const exePath = app.getPath('exe');
    const appDir = app.getAppPath();
    const iconFile = path.join(appDir, 'build', 'icon.ico');

    const hasIcon = fs.existsSync(iconFile);

    // Use PowerShell WScript to set IconLocation reliably on Windows
    const { execSync } = require('child_process');
    const iconLocLine = hasIcon ? "$sc.IconLocation = '" + iconFile.replace(/\\/g, '\\\\') + ", 0'" : '';
    const ps = [
      "$ws = New-Object -ComObject WScript.Shell",
      "$sc = $ws.CreateShortcut('" + shortcutPath.replace(/\\/g, '\\\\') + "')",
      "$sc.TargetPath = '" + exePath.replace(/\\/g, '\\\\') + "'",
      "$sc.Arguments = '\"" + appDir.replace(/\\/g, '\\\\') + "\"'",
      "$sc.WorkingDirectory = '" + appDir.replace(/\\/g, '\\\\') + "'",
      "$sc.Description = 'Beats Management Studio'",
      iconLocLine,
      "$sc.Save()"
    ].filter(Boolean).join('; ');

    execSync(`powershell -NoProfile -Command "${ps}"`, { timeout: 10000 });
    console.log('[Main] Desktop shortcut created:', shortcutPath, '| icon:', hasIcon ? iconFile : 'none');
    return { success: true, path: shortcutPath };
  } catch (e) {
    console.error('[Main] Could not create shortcut:', e.message);
    return { success: false, error: e.message };
  }
}

function createWindow() {
  // Remove the menu bar for a cleaner look
  Menu.setApplicationMenu(null);
  
  const iconPath = path.join(__dirname, 'build', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Explicitly set window + taskbar icon on Windows
  const appIcon = nativeImage.createFromPath(iconPath);
  if (!appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  // Kick off icon pre-load (needed for drag-files-start)
  loadDragIcon();

  // Forward ALL renderer console.log/warn/error to main process terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const label = ['verbose', 'info', 'warn', 'error'][level] || 'log';
    console.log(`[renderer:${label}] ${message}`);
  });

  // Auto-start automation server when app starts
  startAutomationServerOnStartup();
}

// Auto-start automation server
async function startAutomationServerOnStartup() {
  const automationPath = path.join(__dirname, 'automation');
  const mainScript = path.join(automationPath, 'main-multi.js');
  
  if (!fs.existsSync(mainScript)) {
    console.log('[Main] Automation script not found, skipping auto-start');
    return;
  }
  
  // Check if server already running
  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:9000/api/channels', (res) => {
        resolve(true);
      });
      req.on('error', () => reject(false));
      req.setTimeout(2000, () => {
        req.destroy();
        reject(false);
      });
    });
    console.log('[Main] Automation server already running');
    return;
  } catch (e) {
    // Server not running, start it
  }
  
  console.log('[Main] Starting automation server...');
  
  const { spawn } = require('child_process');
  automationServerProcess = spawn('node', ['main-multi.js'], {
    cwd: automationPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    shell: true
  });
  
  automationServerProcess.stdout.on('data', (data) => {
    console.log('[Automation Server]:', data.toString());
  });
  
  automationServerProcess.stderr.on('data', (data) => {
    console.error('[Automation Server Error]:', data.toString());
  });
  
  automationServerProcess.on('error', (error) => {
    console.error('[Automation Server Process Error]:', error);
    automationServerProcess = null;
  });
  
  automationServerProcess.on('exit', (code) => {
    console.log('[Automation Server] exited with code:', code);
    automationServerProcess = null;
  });
}

// Variable to track automation server process
let automationServerProcess = null;

// ── Ollama auto-start ──────────────────────────────────────────────
const OLLAMA_EXE = path.join('F:', 'PlaygroundTest', 'foronlytestingforbeatsmanagement', 'ollama', 'ollama.exe');
const OLLAMA_MODELS_PATH = path.join('F:', 'PlaygroundTest', 'foronlytestingforbeatsmanagement', 'ollama', 'models');
let ollamaProcess = null;

function startOllama() {
  const fs = require('fs');
  if (!fs.existsSync(OLLAMA_EXE)) return;
  const http = require('http');
  const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
    res.resume(); // already running
  });
  req.on('error', () => {
    const { spawn } = require('child_process');
    ollamaProcess = spawn(OLLAMA_EXE, ['serve'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, OLLAMA_MODELS: OLLAMA_MODELS_PATH, OLLAMA_VULKAN: '1', OLLAMA_HOST: '127.0.0.1:11434' }
    });
    ollamaProcess.unref();
    console.log('[Ollama] Started serve process');
  });
  req.setTimeout(2000, () => req.destroy());
}

// Wait for Ollama to be ready (polls up to maxTries times)
function waitForOllama(maxTries = 60, intervalMs = 1500) {
  return new Promise((resolve) => {
    const http = require('http');
    let tries = 0;
    const check = () => {
      tries++;
      const req = http.get('http://127.0.0.1:11434/api/tags', (res) => { res.resume(); resolve(true); });
      req.on('error', () => { if (tries < maxTries) setTimeout(check, intervalMs); else resolve(false); });
      req.setTimeout(2000, () => { req.destroy(); if (tries < maxTries) setTimeout(check, intervalMs); else resolve(false); });
    };
    check();
  });
}

ipcMain.handle('start-ollama', async () => {
  const fs = require('fs');
  if (!fs.existsSync(OLLAMA_EXE)) return { success: false, error: 'ollama.exe not found at ' + OLLAMA_EXE };
  const http = require('http');
  // Check if already running
  const alreadyRunning = await new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:11434/api/tags', (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
  if (alreadyRunning) return { success: true, alreadyRunning: true };

  const { spawn } = require('child_process');
  let spawnError = null;
  ollamaProcess = spawn(OLLAMA_EXE, ['serve'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, OLLAMA_MODELS: OLLAMA_MODELS_PATH, OLLAMA_VULKAN: '1', OLLAMA_HOST: '127.0.0.1:11434' }
  });
  ollamaProcess.on('error', (err) => { spawnError = err.message; });
  ollamaProcess.unref();
  // Give it a moment to fail fast if exe is bad, then start polling
  await new Promise(r => setTimeout(r, 1500));
  if (spawnError) return { success: false, error: 'Failed to spawn Ollama: ' + spawnError };
  // Poll up to 90 seconds (AMD GPU Vulkan init can take a while)
  const ready = await waitForOllama(60, 1500);
  return { success: ready, error: ready ? null : 'Ollama is taking too long to start. Try clicking Start again, or launch ollama.exe manually.' };
});

ipcMain.handle('stop-ollama', async () => {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    exec('taskkill /IM ollama.exe /F', (err) => {
      ollamaProcess = null;
      resolve({ success: !err });
    });
  });
});

app.whenReady().then(() => { startOllama(); createWindow(); });

app.on('window-all-closed', () => {
  // Cleanup automation server when app closes
  if (automationServerProcess && !automationServerProcess.killed) {
    console.log('[Main] Stopping automation server...');
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${automationServerProcess.pid} /f /t`);
    } else {
      automationServerProcess.kill('SIGTERM');
    }
    automationServerProcess = null;
  }
  
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
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(dataPath, json);
    // Mirror to data/ folder so git can track it
    const mirrorPath = path.join(__dirname, 'data', 'beats-data.json');
    try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
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

// Create a desktop shortcut that can be pinned to the Windows taskbar
ipcMain.handle('create-shortcut', async () => {
  return createDesktopShortcut();
});

// Reveal a file in Windows Explorer (select it, don't just open the folder)
ipcMain.handle('reveal-in-explorer', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Debug IPC: renderer can send arbitrary debug messages to main terminal
ipcMain.on('renderer-debug', (event, msg) => {
  console.log('[RENDERER DEBUG]', msg);
});

// Handle drag multiple files to external apps (beat + image)
ipcMain.on('drag-files-start', (event, data) => {
  // Handle both old format (array) and new format (object with files and beatName)
  let filePaths, beatName;

  if (Array.isArray(data)) {
    // Old format: just array of file paths
    filePaths = data;
    beatName = null;
  } else {
    // New format: object with files array and beatName
    filePaths = data.files;
    beatName = data.beatName;
  }

  if (!filePaths || filePaths.length === 0) return;

  // Copy beat name to clipboard if provided
  if (beatName) {
    clipboard.writeText(beatName);
  }

  // Use first file as icon (audio or image)
  let icon;

  try {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const hasImage = filePaths.some(p => imageExtensions.includes(path.extname(p).toLowerCase()));

    if (hasImage) {
      const imagePath = filePaths.find(p => imageExtensions.includes(path.extname(p).toLowerCase()));
      const img = nativeImage.createFromPath(imagePath);
      icon = (img && !img.isEmpty()) ? img.resize({ width: 64, height: 64 }) : (cachedDragIcon || nativeImage.createEmpty());
    } else {
      // Use the pre-cached system icon for MP4/audio files
      // Falls back to app.getFileIcon for this specific file if cache isn't ready
      if (cachedDragIcon) {
        icon = cachedDragIcon;
      } else {
        // Try to get file icon synchronously via a pre-loaded version
        icon = nativeImage.createEmpty();
        // Async fallback: pre-load for next time
        app.getFileIcon(filePaths[0], { size: 'normal' }).then(i => { if (i && !i.isEmpty()) cachedDragIcon = i; }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[drag-files-start] icon error:', error.message);
    icon = cachedDragIcon || nativeImage.createEmpty();
  }

  // Drag single file or multiple files
  try {
    const dragItem = filePaths.length === 1
      ? { file: filePaths[0], icon }
      : { files: filePaths, icon };

    console.log('[drag-files-start] startDrag:', JSON.stringify(filePaths));
    event.sender.startDrag(dragItem);
    console.log('[drag-files-start] startDrag OK');
  } catch (err) {
    console.error('[drag-files-start] startDrag FAILED:', err.message);
  }
});

// Convert image to 1:1 aspect ratio
ipcMain.handle('convert-image-to-square', async (event, imagePath) => {
  try {
    // Create cache directory if not exists
    const cacheDir = path.join(__dirname, '.cache', 'images');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Generate cache filename
    const ext = path.extname(imagePath);
    const baseName = path.basename(imagePath, ext);
    const cachedPath = path.join(cacheDir, `${baseName}_1x1${ext}`);

    // Check if cached version exists
    if (fs.existsSync(cachedPath)) {
      return { success: true, cachedPath };
    }

    // Load image using nativeImage
    const image = nativeImage.createFromPath(imagePath);
    const size = image.getSize();

    if (size.width === 0 || size.height === 0) {
      return { success: false, error: 'Invalid image' };
    }

    // Calculate crop dimensions for center crop
    const minDimension = Math.min(size.width, size.height);
    const cropX = Math.floor((size.width - minDimension) / 2);
    const cropY = Math.floor((size.height - minDimension) / 2);

    // Crop to square
    const squareImage = image.crop({
      x: cropX,
      y: cropY,
      width: minDimension,
      height: minDimension
    });

    // Save as PNG with high quality
    const pngBuffer = squareImage.toPNG();
    fs.writeFileSync(cachedPath, pngBuffer);

    return { success: true, cachedPath };
  } catch (error) {
    console.error('Error converting image:', error);
    return { success: false, error: error.message };
  }
});

// Clear image cache
ipcMain.handle('clear-image-cache', async () => {
  try {
    const cacheDir = path.join(__dirname, '.cache', 'images');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(cacheDir, file));
      });
      return { success: true, count: files.length };
    }
    return { success: true, count: 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================
// AUTOVID IPC HANDLERS
// ============================

// Select audio file for video creation
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Select video files for upload
ipcMain.handle('select-video-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return [];
});

// Open folder in explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get system info
ipcMain.handle('get-system-info', async () => {
  const os = require('os');
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg'
  };
});

// Render video from image and audio
ipcMain.handle('render-video', async (event, data) => {
  if (!videoRenderer) {
    return { success: false, error: 'Video renderer not available' };
  }

  try {
    const { imagePath, audioPath, outputName, resolution } = data;
    
    // Validate inputs
    if (!imagePath || !fs.existsSync(imagePath)) {
      return { success: false, error: 'Image file not found' };
    }
    if (!audioPath || !fs.existsSync(audioPath)) {
      return { success: false, error: 'Audio file not found' };
    }

    const result = await videoRenderer.createVideo(
      imagePath,
      audioPath,
      outputName || `video_${Date.now()}`,
      resolution || '1080',
      (progress) => {
        mainWindow.webContents.send('render-progress', progress);
      }
    );

    return { success: true, outputPath: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get video output directory
ipcMain.handle('get-video-output-dir', async () => {
  if (!videoRenderer) {
    return path.join(__dirname, 'output');
  }
  return videoRenderer.getOutputDirectory();
});

// Download image from URL
ipcMain.handle('download-image', async (event, imageUrl, savePath) => {
  try {
    const https = require('https');
    const http = require('http');
    
    const protocol = imageUrl.startsWith('https') ? https : http;
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(savePath);
      
      protocol.get(imageUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ success: true, path: savePath });
        });
      }).on('error', (err) => {
        fs.unlink(savePath, () => {});
        reject(err);
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================
// YOUTUBE AUTOMATION IPC HANDLERS
// ============================

// YouTube state
let youtubeChannels = [];
let uploadQueue = [];
let uploadHistory = [];
let youtubeServerRunning = false;

// Get automation config path
const automationConfigPath = path.join(__dirname, 'automation', 'config');

// Load upload history from file
ipcMain.handle('load-upload-history', async () => {
  try {
    const historyPath = path.join(automationConfigPath, 'upload-history.json');
    
    if (!fs.existsSync(historyPath)) {
      return { success: true, history: [] };
    }
    
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    return { success: true, history };
  } catch (error) {
    console.error('Error loading upload history:', error);
    return { success: false, error: error.message, history: [] };
  }
});

// Load global settings
ipcMain.handle('load-global-settings', async () => {
  try {
    const settingsPath = path.join(automationConfigPath, 'global-settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      // Return default settings
      const defaultSettings = {
        templates: {
          template1: {
            name: "Default LVMH Template",
            titleTemplate: '[FREE] [STYLE] TYPE BEAT - "[NAME]"',
            description: "💰PURCHASE on instagram @sheloveslvmh\n\n• You must credit with (PROD. LVMH) in the title",
            tags: ["type beat", "free type beat", "free beat", "instrumental", "type beat 2025"]
          }
        },
        activeTemplate: "template1",
        scheduling: {
          autoSchedule: true,
          daysBetweenUploads: 1,
          publishTime: "12:00",
          timezone: "America/Los_Angeles"
        }
      };
      return { success: true, settings: defaultSettings };
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return { success: true, settings };
  } catch (error) {
    console.error('Error loading global settings:', error);
    return { success: false, error: error.message };
  }
});

// Save global settings
ipcMain.handle('save-global-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(automationConfigPath, 'global-settings.json');
    
    // Ensure directory exists
    if (!fs.existsSync(automationConfigPath)) {
      fs.mkdirSync(automationConfigPath, { recursive: true });
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving global settings:', error);
    return { success: false, error: error.message };
  }
});

// Load customers database
ipcMain.handle('load-customers', async () => {
  try {
    const customersPath = path.join(app.getPath('userData'), 'customers.json');
    if (!fs.existsSync(customersPath)) {
      return { customers: [], emailHistory: [] };
    }
    // Strip BOM in case file was written by PowerShell
    let raw = fs.readFileSync(customersPath, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const data = JSON.parse(raw);
    // Unwrap PowerShell "value" serialization artifact if present
    let customers = data.customers;
    if (customers && !Array.isArray(customers) && Array.isArray(customers.value)) {
      customers = customers.value;
    }
    let emailHistory = data.emailHistory || [];
    if (emailHistory && !Array.isArray(emailHistory) && Array.isArray(emailHistory.value)) {
      emailHistory = emailHistory.value;
    }
    return { customers: Array.isArray(customers) ? customers : [], emailHistory };
  } catch (error) {
    console.error('Error loading customers:', error);
    return { customers: [], emailHistory: [] };
  }
});

// Save customers database
ipcMain.handle('save-customers', async (event, data) => {
  try {
    const customersPath = path.join(app.getPath('userData'), 'customers.json');
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(customersPath, json);
    // Mirror to data/ folder so git can track it
    const mirrorPath = path.join(__dirname, 'data', 'customers.json');
    try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
    return { success: true };
  } catch (error) {
    console.error('Error saving customers:', error);
    return { success: false, error: error.message };
  }
});

// Load channel history (for specific channel)
ipcMain.handle('load-channel-history', async (event, channelId) => {
  try {
    // channelId format: "AccountA/channel1"
    const channelPath = path.join(automationConfigPath, channelId);
    const historyPath = path.join(channelPath, 'upload-history.json');
    
    if (!fs.existsSync(historyPath)) {
      return { success: true, history: [] };
    }
    
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    return { success: true, history };
  } catch (error) {
    console.error('Error loading channel history:', error);
    return { success: false, error: error.message, history: [] };
  }
});

// Create new YouTube channel folder structure
ipcMain.handle('create-youtube-channel', async (event, { accountName, channelId, channelName, channelStyle, credentials }) => {
  try {
    // Create folder structure: config/AccountName/channelId/
    const channelPath = path.join(automationConfigPath, accountName, channelId);
    
    if (fs.existsSync(channelPath)) {
      return { success: false, error: 'Channel folder already exists' };
    }
    
    // Create directories
    fs.mkdirSync(channelPath, { recursive: true });
    
    // Save credentials.json
    const credentialsPath = path.join(channelPath, 'credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    
    // Create config.json with default template
    const configPath = path.join(channelPath, 'config.json');
    const defaultConfig = {
      channelName: channelName || channelId,
      channelStyle: channelStyle || '',
      autoUpload: true,
      metadataTemplate: {
        titleTemplate: '(FREE) MF DOOM x Joey Bada$$ x 90s Boom Bap Type Beat - "[NAME]"',
        description: '💰PURCHASE on instagram @prodvince\n\n• You must credit with (PROD. VINCE) in the title\n• You must purchase a lease to upload your track to streaming platforms like Spotify, Apple Music, etc.\n\nThis beat is free for NON PROFIT USE ONLY',
        tags: ['beats'],
        descriptionConditions: {
          default: {
            text: '💰PURCHASE on instagram @prodvince\n\nThis beat is free for NON PROFIT USE ONLY',
            tags: 'beats'
          }
        }
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    
    // Create uploads folder
    const uploadsPath = path.join(__dirname, 'automation', 'uploads', accountName, channelId, 'BeatsUpload');
    fs.mkdirSync(uploadsPath, { recursive: true });
    
    // Create Processed folder
    const processedPath = path.join(__dirname, 'automation', 'uploads', accountName, channelId, 'Processed');
    fs.mkdirSync(processedPath, { recursive: true });
    
    console.log(`[create-youtube-channel] Created channel: ${accountName}/${channelId}`);
    
    return { 
      success: true, 
      channelPath,
      message: `Channel ${channelId} created successfully`
    };
  } catch (error) {
    console.error('Error creating YouTube channel:', error);
    return { success: false, error: error.message };
  }
});

// Scan for YouTube channels
ipcMain.handle('scan-youtube-channels', async () => {
  try {
    const channels = [];
    const configPath = automationConfigPath;
    
    if (!fs.existsSync(configPath)) {
      return { success: false, channels: [], error: 'Automation config folder not found' };
    }

    // Read account folders
    const items = fs.readdirSync(configPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory() && item.name.startsWith('Account')) {
        const accountPath = path.join(configPath, item.name);
        const channelFolders = fs.readdirSync(accountPath, { withFileTypes: true });
        
        for (const channelFolder of channelFolders) {
          if (channelFolder.isDirectory() && channelFolder.name.startsWith('channel')) {
            const channelPath = path.join(accountPath, channelFolder.name);
            const configFile = path.join(channelPath, 'config.json');
            const tokenFile = path.join(channelPath, 'token.json');
            
            let channelConfig = {};
            let hasToken = fs.existsSync(tokenFile);
            
            if (fs.existsSync(configFile)) {
              try {
                channelConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
              } catch (e) {}
            }
            
            channels.push({
              id: `${item.name}/${channelFolder.name}`,
              name: channelConfig.channelName || channelFolder.name,
              account: item.name,
              path: channelPath,
              hasToken: hasToken,
              ready: hasToken,
              uploadFolder: path.join(__dirname, 'automation', 'uploads', item.name, channelFolder.name)
            });
          }
        }
      }
    }

    youtubeChannels = channels;
    return { success: true, channels };
  } catch (error) {
    console.error('Error scanning channels:', error);
    return { success: false, channels: [], error: error.message };
  }
});

// Get YouTube channels
ipcMain.handle('get-youtube-channels', async () => {
  return youtubeChannels;
});

// Get upload queue
ipcMain.handle('get-upload-queue', async () => {
  return uploadQueue;
});

// Get upload history
ipcMain.handle('get-upload-history', async () => {
  return uploadHistory;
});

// Add video to upload queue
ipcMain.handle('add-to-upload-queue', async (event, videoData) => {
  try {
    const queueItem = {
      id: Date.now().toString(),
      fileName: path.basename(videoData.filePath),
      filePath: videoData.filePath,
      channelId: videoData.channelId,
      metadata: {
        title: videoData.title || path.parse(videoData.filePath).name,
        description: videoData.description || '',
        tags: videoData.tags || [],
        privacy: videoData.privacy || 'private'
      },
      status: 'draft',
      addedAt: new Date().toISOString()
    };

    uploadQueue.push(queueItem);
    return { success: true, item: queueItem };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update queue item
ipcMain.handle('update-queue-item', async (event, itemId, updates) => {
  const item = uploadQueue.find(q => q.id === itemId);
  if (item) {
    Object.assign(item.metadata, updates);
    return { success: true, item };
  }
  return { success: false, error: 'Item not found' };
});

// Remove from queue
ipcMain.handle('remove-from-queue', async (event, itemId) => {
  const index = uploadQueue.findIndex(q => q.id === itemId);
  if (index > -1) {
    uploadQueue.splice(index, 1);
    return { success: true };
  }
  return { success: false, error: 'Item not found' };
});

// Start YouTube automation server
ipcMain.handle('start-youtube-server', async () => {
  try {
    if (youtubeServerRunning) {
      return { success: true, message: 'Server already running' };
    }

    // The automation server runs separately, we just track if it should be running
    youtubeServerRunning = true;
    return { success: true, port: 3000 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check YouTube server status
ipcMain.handle('check-youtube-server', async () => {
  try {
    // Try to fetch from the automation server
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get('http://localhost:9000/api/status', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const status = JSON.parse(data);
            resolve({ success: true, online: true, ...status });
          } catch (e) {
            resolve({ success: true, online: true });
          }
        });
      });
      req.on('error', () => {
        resolve({ success: false, online: false });
      });
      req.setTimeout(2000, () => {
        req.destroy();
        resolve({ success: false, online: false });
      });
    });
  } catch (error) {
    return { success: false, online: false, error: error.message };
  }
});

// Start automation server
ipcMain.handle('start-automation-server', async () => {
  try {
    const automationPath = path.join(__dirname, 'automation');
    const mainScript = path.join(automationPath, 'main-multi.js');
    
    // Check if script exists
    if (!fs.existsSync(mainScript)) {
      return { success: false, error: 'Không tìm thấy main-multi.js' };
    }
    
    // Check if server is already running
    if (automationServerProcess && !automationServerProcess.killed) {
      return { success: true, message: 'Server đang chạy' };
    }
    
    const { spawn } = require('child_process');
    
    // Start the server
    automationServerProcess = spawn('node', ['main-multi.js'], {
      cwd: automationPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      shell: true
    });
    
    automationServerProcess.stdout.on('data', (data) => {
      console.log('[Automation Server]:', data.toString());
    });
    
    automationServerProcess.stderr.on('data', (data) => {
      console.error('[Automation Server Error]:', data.toString());
    });
    
    automationServerProcess.on('error', (error) => {
      console.error('[Automation Server Process Error]:', error);
      automationServerProcess = null;
    });
    
    automationServerProcess.on('exit', (code) => {
      console.log('[Automation Server] exited with code:', code);
      automationServerProcess = null;
    });
    
    return { success: true, message: 'Server đã khởi động' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Stop automation server
ipcMain.handle('stop-automation-server', async () => {
  try {
    if (automationServerProcess && !automationServerProcess.killed) {
      // Kill the process
      if (process.platform === 'win32') {
        // On Windows, we need to kill the process tree
        const { exec } = require('child_process');
        exec(`taskkill /pid ${automationServerProcess.pid} /f /t`, (error) => {
          if (error) {
            console.error('Error killing process:', error);
          }
        });
      } else {
        automationServerProcess.kill('SIGTERM');
      }
      automationServerProcess = null;
      return { success: true, message: 'Server đã dừng' };
    }
    
    // If no process tracked, try to kill any server on port 9000
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('netstat -ano | findstr :9000', (error, stdout) => {
          if (stdout) {
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                exec(`taskkill /pid ${pid} /f`, () => {});
              }
            }
          }
          resolve({ success: true, message: 'Server đã dừng' });
        });
      } else {
        exec('lsof -t -i:9000 | xargs kill -9', () => {
          resolve({ success: true, message: 'Server đã dừng' });
        });
      }
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Copy video to channel upload folder
ipcMain.handle('copy-video-to-channel', async (event, videoPath, channelId) => {
  try {
    const channel = youtubeChannels.find(c => c.id === channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }

    // Ensure upload folder exists
    if (!fs.existsSync(channel.uploadFolder)) {
      fs.mkdirSync(channel.uploadFolder, { recursive: true });
    }

    const fileName = path.basename(videoPath);
    const destPath = path.join(channel.uploadFolder, fileName);
    
    fs.copyFileSync(videoPath, destPath);
    
    return { success: true, destPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Copy video for upload - fetches channel info from automation server
ipcMain.handle('copy-video-for-upload', async (event, { videoPath, channelId, metadata }) => {
  try {
    const http = require('http');
    
    // Get channel info from automation server
    const channelData = await new Promise((resolve, reject) => {
      http.get('http://localhost:9000/api/channels', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        });
      }).on('error', reject);
    });
    
    // Extract channel number from channelId (e.g., "AccountA/channel25" -> "25", "C25/C25" -> "25")
    const channelNumMatch = channelId.match(/(\d+)/);
    const channelNum = channelNumMatch ? channelNumMatch[1] : null;
    
    // Find channel with flexible matching
    let channel = channelData.channels.find(c => {
      // Exact match
      if (c.channelId === channelId) return true;
      
      // Match by channel number
      if (channelNum) {
        const serverChannelNum = c.channelId.match(/(\d+)/);
        if (serverChannelNum && serverChannelNum[1] === channelNum) return true;
        
        // Also check if channelId is like "C25"
        if (c.channelId === `C${channelNum}`) return true;
        if (c.channelId === `channel${channelNum}`) return true;
      }
      
      return false;
    });
    
    if (!channel) {
      console.error(`[copy-video-for-upload] Channel not found. Looking for: ${channelId}, available:`, channelData.channels.map(c => c.channelId));
      return { success: false, error: `Channel not found on server (looking for: ${channelId})` };
    }
    
    // Get the uploads path from channel
    const uploadsPath = channel.uploadsPath;
    if (!uploadsPath) {
      return { success: false, error: 'Channel upload path not configured' };
    }
    
    // Ensure upload folder exists
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    const fileName = path.basename(videoPath);
    const destPath = path.join(uploadsPath, fileName);
    
    // Copy video file
    fs.copyFileSync(videoPath, destPath);
    
    // Save metadata alongside video (optional - for manual uploads)
    if (metadata) {
      const metadataPath = destPath.replace(/\.[^.]+$/, '.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
    
    return { success: true, destPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open an external URL in the default browser
ipcMain.handle('open-external-url', async (event, url) => {
  const { shell } = require('electron');
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Invalid URL' };
});

// Money Management data
ipcMain.handle('save-money-data', async (event, data) => {
  const dataPath = path.join(app.getPath('userData'), 'money-data.json');
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(dataPath, json);
    const mirrorPath = path.join(__dirname, 'data', 'money-data.json');
    try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
    return true;
  } catch (error) {
    console.error('Error saving money data:', error);
    return false;
  }
});

ipcMain.handle('load-money-data', async () => {
  const dataPath = path.join(app.getPath('userData'), 'money-data.json');
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading money data:', error);
    return null;
  }
});

// Re-authenticate YouTube token for a channel
// This will generate auth URL, open browser, and return URL for code input
ipcMain.handle('reauthenticate-youtube', async (event, channelId) => {
  try {
    const { google } = require('googleapis');
    const { shell } = require('electron');
    
    // channelId can be:
    // - "AccountA/channel1" (old format)
    // - "C14" (new format, folder is C14/C14)
    // - "C14/C14" (if passed full path)
    
    let channelConfigPath = path.join(automationConfigPath, channelId);
    let credentialsPath = path.join(channelConfigPath, 'credentials.json');
    
    console.log('[Re-auth] Trying path 1:', credentialsPath);
    
    // If not found, try nested path (C14 -> C14/C14)
    if (!fs.existsSync(credentialsPath)) {
      // Check if it's a new-style channel (C14)
      const parts = channelId.split('/');
      if (parts.length === 1) {
        // Try nested: C14/C14
        channelConfigPath = path.join(automationConfigPath, channelId, channelId);
        credentialsPath = path.join(channelConfigPath, 'credentials.json');
        console.log('[Re-auth] Trying path 2 (nested):', credentialsPath);
      }
    }
    
    if (!fs.existsSync(credentialsPath)) {
      return { success: false, error: `credentials.json not found. Tried paths under: ${automationConfigPath}/${channelId}` };
    }
    
    // Update channelId to full path for complete-reauth
    const fullChannelId = channelConfigPath.replace(automationConfigPath + path.sep, '').replace(/\\/g, '/');
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    if (!client_id || !client_secret) {
      return { success: false, error: 'Invalid credentials.json - missing client_id or client_secret' };
    }
    
    const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
    
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    console.log('[Re-auth] Generated auth URL for channel:', fullChannelId);
    
    // Open browser with auth URL
    shell.openExternal(authUrl);
    
    // Return success with needsCode flag so UI can show code input dialog
    return { 
      success: true, 
      needsCode: true, 
      channelId: fullChannelId,  // Return full path for complete-reauth
      authUrl: authUrl 
    };
  } catch (error) {
    console.error('[Re-auth] Error:', error);
    return { success: false, error: error.message };
  }
});

// Complete re-authentication by exchanging auth code for token
ipcMain.handle('complete-reauth', async (event, { channelId, authCode }) => {
  try {
    const { google } = require('googleapis');
    
    const channelConfigPath = path.join(automationConfigPath, channelId);
    const credentialsPath = path.join(channelConfigPath, 'credentials.json');
    const tokenPath = path.join(channelConfigPath, 'token.json');
    
    console.log('[Complete Re-auth] Channel:', channelId);
    console.log('[Complete Re-auth] Credentials path:', credentialsPath);
    
    if (!fs.existsSync(credentialsPath)) {
      return { success: false, error: 'credentials.json not found' };
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    
    // Exchange auth code for tokens
    const { tokens } = await oAuth2Client.getToken(authCode.trim());
    
    // Save token
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    
    console.log('[Complete Re-auth] Token saved to:', tokenPath);
    
    return { success: true, message: 'Token saved successfully!' };
  } catch (error) {
    console.error('[Complete Re-auth] Error:', error);
    return { success: false, error: error.message };
  }
});
// ============================
// BEATSTARS AUDIO PROCESSING
// ============================

// Scan audio files in folder
ipcMain.handle('beatstars-scan-folder', async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder does not exist' };
    }
    
    const files = fs.readdirSync(folderPath);
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
    
    const audioFiles = files
      .filter(file => audioExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => {
        const ext = path.extname(file).toLowerCase();
        const stats = fs.statSync(path.join(folderPath, file));
        return {
          name: file,
          path: path.join(folderPath, file),
          format: ext.slice(1).toUpperCase(),
          size: stats.size,
          isWav: ext === '.wav'
        };
      });
    
    return { 
      success: true, 
      files: audioFiles,
      stats: {
        total: audioFiles.length,
        wav: audioFiles.filter(f => f.isWav).length,
        other: audioFiles.filter(f => !f.isWav).length
      }
    };
  } catch (error) {
    console.error('[Beatstars] Scan error:', error);
    return { success: false, error: error.message };
  }
});

// Process single audio file
ipcMain.handle('beatstars-process-file', async (event, { 
  inputPath, 
  outputFolder, 
  removeSilence, 
  convertToWav, 
  rename,
  silenceDb,
  silenceDuration 
}) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const inputName = path.basename(inputPath);
    const inputExt = path.extname(inputPath).toLowerCase();
    let outputName = inputName;
    let outputExt = inputExt;
    
    // Rename logic: "Title - Artist.wav" -> "Artist.wav"
    if (rename) {
      const baseName = path.basename(inputPath, inputExt);
      if (baseName.includes(' - ')) {
        const parts = baseName.split(' - ');
        outputName = parts[parts.length - 1].trim() + (convertToWav ? '.wav' : inputExt);
      } else if (convertToWav && inputExt !== '.wav') {
        outputName = baseName + '.wav';
      }
    } else if (convertToWav && inputExt !== '.wav') {
      outputName = path.basename(inputPath, inputExt) + '.wav';
    }
    
    if (convertToWav) {
      outputExt = '.wav';
    }
    
    const outputPath = path.join(outputFolder || path.dirname(inputPath), outputName);
    
    // Check if ffmpeg is available
    try {
      await execPromise('ffmpeg -version');
    } catch (e) {
      return { 
        success: false, 
        error: 'FFmpeg not found. Please install FFmpeg and add it to PATH.' 
      };
    }
    
    let ffmpegCmd = '';
    
    if (removeSilence) {
      // Use silenceremove filter to trim silence from start
      // silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB
      const silenceFilter = `silenceremove=start_periods=1:start_duration=${silenceDuration}:start_threshold=${silenceDb}dB`;
      
      if (convertToWav && inputExt !== '.wav') {
        // Remove silence AND convert to WAV
        ffmpegCmd = `ffmpeg -y -i "${inputPath}" -af "${silenceFilter}" -acodec pcm_s16le "${outputPath}"`;
      } else if (inputExt === '.wav' && outputExt === '.wav') {
        // Already WAV, just remove silence
        ffmpegCmd = `ffmpeg -y -i "${inputPath}" -af "${silenceFilter}" -acodec pcm_s16le "${outputPath}"`;
      } else {
        // Remove silence and keep format
        ffmpegCmd = `ffmpeg -y -i "${inputPath}" -af "${silenceFilter}" "${outputPath}"`;
      }
    } else if (convertToWav && inputExt !== '.wav') {
      // Just convert to WAV
      ffmpegCmd = `ffmpeg -y -i "${inputPath}" -acodec pcm_s16le "${outputPath}"`;
    } else if (rename && inputPath !== outputPath) {
      // Just copy file (keep original)
      fs.copyFileSync(inputPath, outputPath);
      
      return {
        success: true,
        inputPath,
        outputPath,
        originalName: inputName,
        newName: outputName,
        action: 'renamed'
      };
    } else {
      // Nothing to do
      return {
        success: true,
        inputPath,
        outputPath: inputPath,
        originalName: inputName,
        newName: inputName,
        action: 'skipped',
        message: 'No processing needed'
      };
    }
    
    // Execute ffmpeg command
    console.log('[Beatstars] Running:', ffmpegCmd);
    await execPromise(ffmpegCmd);
    
    // Keep original files - do not delete
    
    return {
      success: true,
      inputPath,
      outputPath,
      originalName: inputName,
      newName: outputName,
      action: removeSilence ? 'processed' : (convertToWav ? 'converted' : 'renamed')
    };
    
  } catch (error) {
    console.error('[Beatstars] Process error:', error);
    return { 
      success: false, 
      error: error.message,
      inputPath 
    };
  }
});

// Get new name preview
ipcMain.handle('beatstars-preview-name', async (event, { fileName, rename }) => {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  
  if (rename && baseName.includes(' - ')) {
    const parts = baseName.split(' - ');
    return parts[parts.length - 1].trim();
  }
  
  return baseName;
});

// Scan subfolders in a directory
ipcMain.handle('beatstars-scan-subfolders', async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder does not exist' };
    }
    
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
    
    const folders = items
      .filter(item => item.isDirectory())
      .map(item => {
        const folderFullPath = path.join(folderPath, item.name);
        // Count audio files in folder
        let audioCount = 0;
        try {
          const folderItems = fs.readdirSync(folderFullPath);
          audioCount = folderItems.filter(f => 
            audioExtensions.includes(path.extname(f).toLowerCase())
          ).length;
        } catch (e) {
          // Ignore errors reading subfolders
        }
        return {
          name: item.name,
          path: folderFullPath,
          audioCount
        };
      })
      .filter(f => f.audioCount > 0) // Only show folders with audio files
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    
    return { success: true, folders };
  } catch (error) {
    console.error('[Beatstars] Scan subfolders error:', error);
    return { success: false, error: error.message };
  }
});

// Ensure output folder exists
ipcMain.handle('beatstars-ensure-folder', async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================
// EMAIL MARKETING IPC HANDLERS
// ============================

const MARKETING_BASE = 'F:\\PlaygroundTest\\foronlytestingforbeatsmanagement';

function getResendConfig() {
  const configPath = path.join(MARKETING_BASE, 'resend-config.json');
  if (fs.existsSync(configPath)) {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
  }
  return { apiKey: '', fromEmail: 'onboarding@resend.dev', fromName: 'Beats Marketing' };
}

ipcMain.handle('load-resend-config', async () => {
  return getResendConfig();
});

ipcMain.handle('save-resend-config', async (event, config) => {
  try {
    if (!fs.existsSync(MARKETING_BASE)) fs.mkdirSync(MARKETING_BASE, { recursive: true });
    const configPath = path.join(MARKETING_BASE, 'resend-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-resend-config-path', async () => {
  return path.join(MARKETING_BASE, 'resend-config.json');
});

ipcMain.handle('send-marketing-email', async (event, { to, subject, html }) => {
  try {
    const config = getResendConfig();
    if (!config.apiKey) {
      return { success: false, error: 'No Resend API key configured. Open Marketing Settings to add your key.' };
    }
    const { Resend } = require('resend');
    const resend = new Resend(config.apiKey);
    const { data, error } = await resend.emails.send({
      from: `${config.fromName || 'Beats Marketing'} <${config.fromEmail || 'onboarding@resend.dev'}>`,
      to: [to],
      subject,
      html
    });
    if (error) return { success: false, error: error.message };
    return { success: true, emailId: data.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-email-status', async (event, emailId) => {
  try {
    const config = getResendConfig();
    if (!config.apiKey) return { success: false, error: 'No API key' };
    const { Resend } = require('resend');
    const resend = new Resend(config.apiKey);
    const email = await resend.emails.get(emailId);
    return { success: true, email };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('check-ollama', async () => {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ running: true, models: (parsed.models || []).map(m => m.name) });
          } catch (e) {
            resolve({ running: true, models: [] });
          }
        });
      });
      req.on('error', () => resolve({ running: false, models: [] }));
      req.setTimeout(3000, () => { req.destroy(); resolve({ running: false, models: [] }); });
    });
  } catch (e) {
    return { running: false, models: [] };
  }
});

ipcMain.handle('generate-ai-email', async (event, { customerName, beatNames, discount, prompt, model }) => {
  try {
    const http = require('http');
    const usedModel = model || 'qwen3:4b';
    const systemPrompt = `You are a professional music marketing copywriter for a beats producer. Write concise, engaging marketing emails under 250 words. Use a conversational, personal tone. Always include a greeting, the value proposition, and a clear call to action. Format the email body in HTML using only <p>, <b>, <br>, and <a> tags. Output the HTML email body only.`;
    const beatList = Array.isArray(beatNames) ? beatNames.join(', ') : (beatNames || 'exclusive beats');
    const userPrompt = `Write a marketing email:\n- Customer: ${customerName || 'there'}\n- Beat(s): ${beatList}\n- Offer: ${discount || 'none'}\n- Goal: ${prompt || 'Promote beats and drive sales'}\nOutput HTML body only.`;
    const postData = JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: false, think: false, options: { temperature: 0.7, num_predict: 800 } });
    return new Promise((resolve) => {
      const options = { hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return resolve({ success: false, error: 'Ollama error: ' + parsed.error });
            if (!parsed.message || !parsed.message.content) return resolve({ success: false, error: 'Unexpected Ollama response format.' });
            let content = parsed.message.content;
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            resolve({ success: true, content });
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse Ollama response: ' + e.message });
          }
        });
      });
      req.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
          resolve({ success: false, error: 'Ollama is not running. Start it with start-ollama.bat in your testing folder.' });
        } else {
          resolve({ success: false, error: e.message });
        }
      });
      req.setTimeout(60000, () => { req.destroy(); resolve({ success: false, error: 'Ollama timed out (60s).' }); });
      req.write(postData);
      req.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-campaigns', async () => {
  try {
    const p = path.join(app.getPath('userData'), 'campaigns.json');
    if (!fs.existsSync(p)) return { campaigns: [] };
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return { campaigns: [] };
  }
});

ipcMain.handle('save-campaigns', async (event, data) => {
  try {
    const p = path.join(app.getPath('userData'), 'campaigns.json');
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(p, json);
    // Mirror to data/ folder so git can track it
    try { fs.writeFileSync(path.join(__dirname, 'data', 'campaigns.json'), json); } catch (e) { /* non-critical */ }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-beat-marketing', async () => {
  try {
    const p = path.join(app.getPath('userData'), 'beat-marketing.json');
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return {};
  }
});

ipcMain.handle('save-beat-marketing', async (event, data) => {
  try {
    const p = path.join(app.getPath('userData'), 'beat-marketing.json');
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(p, json);
    // Mirror to data/ folder so git can track it
    try { fs.writeFileSync(path.join(__dirname, 'data', 'beat-marketing.json'), json); } catch (e) { /* non-critical */ }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});


// Analyze customer image via Ollama vision model
ipcMain.handle('analyze-customer-image', async (event, { imageBase64, mimeType, vision_model }) => {
  try {
    const http = require('http');
    const model = vision_model || 'qwen3.5:9b';

    const prompt = `/no_think You are a precise OCR assistant. Look at this image carefully.

This is most likely an Instagram screenshot. The person's display name appears at the TOP in larger/bold text, and their username (handle) appears directly below in smaller, lighter text.

CRITICAL OCR RULES:
- Social media names use intentionally creative spellings with repeated characters (e.g. "Luuuiyyyi", "xxtentacion", "iilovemakonnen").
- Read EVERY character exactly as it appears — never autocorrect or normalize.
- For names with repeated similar characters (multiple u, i, y, l, o etc): count each character one by one before writing. Get the exact count right.
- The letters u, i, y can look similar at small sizes — look carefully at each one.
- Do NOT add or remove characters from what you see.

Extract ONLY:
1. The display name at the top (copy exactly — count repeated chars carefully)
2. The Instagram handle below it (copy exactly)
3. Email address ONLY if explicitly typed out and visible
4. Any beat titles or music track names mentioned

Respond ONLY with valid JSON, no markdown, no explanation:
{"name":"","instagram":"","email":"","beats_bought":[],"notes":"","confidence":"high|medium|low"}`;


    // Use Ollama native /api/generate — images are passed as raw base64 array (no data URL prefix)
    const postData = JSON.stringify({
      model: model,
      prompt: prompt,
      images: [imageBase64],
      stream: false,
      think: false,
      options: { temperature: 0.1, num_predict: 2000 }
    });

    return new Promise((resolve) => {
      const options = {
        hostname: '127.0.0.1',  // explicit IPv4 — avoids Windows localhost→::1 IPv6 issue
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            let content = (parsed.response || '').trim();
            // Strip thinking mode tags (qwen3.5 outputs <think>...</think> before JSON)
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            // Strip markdown code fences (```json ... ``` or ``` ... ```)
            content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return resolve({ success: false, error: 'AI did not return JSON. Response: ' + content.substring(0, 300) });
            const extracted = JSON.parse(jsonMatch[0]);
            resolve({ success: true, data: extracted });
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse AI response: ' + e.message });
          }
        });
      });
      req.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
          resolve({ success: false, error: 'Cannot connect to Ollama on 127.0.0.1:11434. Click Start in the nav bar to start it.' });
        } else {
          resolve({ success: false, error: e.message });
        }
      });
      req.setTimeout(120000, () => { req.destroy(); resolve({ success: false, error: 'Vision model timed out (120s). Try again — first run loads the model.' }); });
      req.write(postData);
      req.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Get available Ollama models
ipcMain.handle('get-ollama-models', async () => {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ success: true, models: (parsed.models || []).map(m => m.name) });
          } catch (e) {
            resolve({ success: true, models: [] });
          }
        });
      });
      req.on('error', () => resolve({ success: false, models: [] }));
      req.setTimeout(3000, () => { req.destroy(); resolve({ success: false, models: [] }); });
    });
  } catch (e) {
    return { success: false, models: [] };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI AGENT — Ollama function-calling loop
// ─────────────────────────────────────────────────────────────────────────────
const AI_AGENT_TOOLS = [
  { type: 'function', function: { name: 'get_stats', description: 'Get overall app stats: total packs, beats across all packs, and customers.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_packs', description: 'List all beat packs with their names and how many beats each contains.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_beats_in_pack', description: 'List all beats (audio files) inside a specific pack.', parameters: { type: 'object', required: ['pack_name'], properties: { pack_name: { type: 'string', description: 'Pack name or partial name to look up' } } } } },
  { type: 'function', function: { name: 'create_pack', description: 'Create a new empty beat pack with the given name.', parameters: { type: 'object', required: ['name'], properties: { name: { type: 'string', description: 'Name for the new pack' } } } } },
  { type: 'function', function: { name: 'rename_pack', description: 'Rename an existing beat pack.', parameters: { type: 'object', required: ['current_name', 'new_name'], properties: { current_name: { type: 'string', description: 'Current pack name (partial match ok)' }, new_name: { type: 'string', description: 'New name for the pack' } } } } },
  { type: 'function', function: { name: 'add_beats_to_pack', description: 'Scan a folder on disk for audio files (.wav, .mp3, .flac, etc.) and add them all to an existing pack.', parameters: { type: 'object', required: ['pack_name', 'folder_path'], properties: { pack_name: { type: 'string', description: 'Name of the pack to add beats into (partial match ok)' }, folder_path: { type: 'string', description: 'Full file system path to the folder containing the audio files' } } } } },
  { type: 'function', function: { name: 'get_folders', description: 'Get the list of beat source folders configured in the app.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_customers', description: 'List all customers in the database. Optionally filter by type.', parameters: { type: 'object', properties: { type: { type: 'string', description: 'Filter by: lead | customer | vip (optional)' } } } } },
  { type: 'function', function: { name: 'add_customer', description: 'Add a new customer to the customer database.', parameters: { type: 'object', required: ['email'], properties: { email: { type: 'string', description: 'Customer email address' }, instagram: { type: 'string', description: 'Instagram handle, include the @' }, type: { type: 'string', description: 'lead | customer | vip (default: lead)' }, notes: { type: 'string', description: 'Optional notes' } } } } },
  { type: 'function', function: { name: 'navigate_tab', description: 'Switch the visible tab in the Beats Management app UI.', parameters: { type: 'object', required: ['tab'], properties: { tab: { type: 'string', description: 'Tab to navigate to: beats | video | youtube | progress | customers | beatstars' } } } } }
];

async function executeAgentTool(toolName, toolArgs) {
  const beatsDataPath = path.join(app.getPath('userData'), 'beats-data.json');
  const customersDataPath = path.join(app.getPath('userData'), 'customers.json');
  const readBeats = () => fs.existsSync(beatsDataPath) ? JSON.parse(fs.readFileSync(beatsDataPath, 'utf8')) : { packs: [], folders: [] };
  const writeBeats = (data) => {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(beatsDataPath, json);
    // Mirror to data/ folder for git tracking
    try { fs.writeFileSync(path.join(__dirname, 'data', 'beats-data.json'), json); } catch (e) { /* non-critical */ }
  };
  const readCustomersFile = () => {
    if (!fs.existsSync(customersDataPath)) return { customers: [], emailHistory: [] };
    const raw = JSON.parse(fs.readFileSync(customersDataPath, 'utf8'));
    // Handle both formats: plain array (legacy) and correct { customers, emailHistory } object
    if (Array.isArray(raw)) return { customers: raw, emailHistory: [] };
    return { customers: raw.customers || [], emailHistory: raw.emailHistory || [] };
  };
  const readCustomers = () => readCustomersFile().customers;
  const writeCustomers = (arr, emailHistory) => {
    const existing = readCustomersFile();
    const data = { customers: arr, emailHistory: emailHistory !== undefined ? emailHistory : existing.emailHistory };
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(customersDataPath, json);
    // Mirror to data/ folder for git tracking
    try { fs.writeFileSync(path.join(__dirname, 'data', 'customers.json'), json); } catch (e) { /* non-critical */ }
  };

  switch (toolName) {
    case 'get_stats': {
      const data = readBeats();
      const customers = readCustomers();
      const packs = data.packs || [];
      const totalBeats = packs.reduce((sum, p) => sum + (p.beats || []).length, 0);
      return JSON.stringify({ packs: packs.length, beats_in_packs: totalBeats, customers: customers.length });
    }

    case 'list_packs': {
      const data = readBeats();
      return JSON.stringify((data.packs || []).map(p => ({ id: p.id, name: p.name, beats: (p.beats || []).length })));
    }

    case 'list_beats_in_pack': {
      const data = readBeats();
      const pack = (data.packs || []).find(p => p.name.toLowerCase().includes(toolArgs.pack_name.toLowerCase()));
      if (!pack) return `No pack found matching "${toolArgs.pack_name}"`;
      return JSON.stringify({ pack: pack.name, beats: (pack.beats || []).map(b => b.name) });
    }

    case 'create_pack': {
      const data = readBeats();
      if (!data.packs) data.packs = [];
      const exists = data.packs.find(p => p.name.toLowerCase() === toolArgs.name.toLowerCase());
      if (exists) return `Pack "${toolArgs.name}" already exists.`;
      const newPack = { id: Date.now().toString(), name: toolArgs.name, beats: [], thumbnail: null };
      data.packs.push(newPack);
      writeBeats(data);
      return `Created pack "${toolArgs.name}"`;
    }

    case 'rename_pack': {
      const data = readBeats();
      const pack = (data.packs || []).find(p => p.name.toLowerCase().includes(toolArgs.current_name.toLowerCase()));
      if (!pack) return `No pack found matching "${toolArgs.current_name}"`;
      const old = pack.name;
      pack.name = toolArgs.new_name;
      writeBeats(data);
      return `Renamed "${old}" → "${toolArgs.new_name}"`;
    }

    case 'add_beats_to_pack': {
      const data = readBeats();
      const pack = (data.packs || []).find(p => p.name.toLowerCase().includes(toolArgs.pack_name.toLowerCase()));
      if (!pack) return `No pack found matching "${toolArgs.pack_name}"`;
      if (!fs.existsSync(toolArgs.folder_path)) return `Folder not found: ${toolArgs.folder_path}`;
      const audioExts = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma']);
      const files = fs.readdirSync(toolArgs.folder_path).filter(f => audioExts.has(path.extname(f).toLowerCase()));
      if (!files.length) return `No audio files found in "${toolArgs.folder_path}"`;
      const existing = new Set((pack.beats || []).map(b => b.path));
      const toAdd = files
        .map(f => ({ name: f, path: path.join(toolArgs.folder_path, f), lastUsed: false }))
        .filter(b => !existing.has(b.path));
      if (!toAdd.length) return `All ${files.length} audio files already in "${pack.name}"`;
      pack.beats = [...(pack.beats || []), ...toAdd];
      writeBeats(data);
      return `Added ${toAdd.length} beats to "${pack.name}" (${files.length - toAdd.length} already existed)`;
    }

    case 'get_folders': {
      const data = readBeats();
      return JSON.stringify(data.folders || []);
    }

    case 'list_customers': {
      let c = readCustomers();
      if (toolArgs.type) c = c.filter(x => x.type === toolArgs.type);
      return JSON.stringify(c.map(x => ({ name: x.instagram || x.email, email: x.email, type: x.type, notes: x.notes })));
    }

    case 'add_customer': {
      const c = readCustomers();
      if (c.find(x => x.email && x.email === toolArgs.email)) return `Customer ${toolArgs.email} already exists.`;
      const newC = {
        id: Date.now().toString(),
        name: toolArgs.instagram ? toolArgs.instagram.replace('@', '') : toolArgs.email.split('@')[0],
        email: toolArgs.email,
        instagram: toolArgs.instagram || '',
        phone: '',
        type: toolArgs.type || 'lead',
        tags: [],
        notes: toolArgs.notes || '',
        totalSpent: 0,
        beatsInterested: [],
        dateAdded: new Date().toISOString(),
        lastContact: null,
        source: 'ai-agent'
      };
      c.push(newC);
      writeCustomers(c);
      return `Added customer: ${newC.instagram || newC.email} (type: ${newC.type})`;
    }

    case 'navigate_tab': {
      const tabMap = { beats: 0, video: 1, youtube: 2, progress: 3, customers: 4, beatstars: 5 };
      const idx = tabMap[toolArgs.tab];
      if (idx === undefined) return `Unknown tab: ${toolArgs.tab}`;
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(
          `const tabs = document.querySelectorAll('.main-nav-tab'); if (tabs[${idx}]) tabs[${idx}].click();`
        ).catch(() => {});
      }
      return `Switched to ${toolArgs.tab} tab`;
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

const AI_DATA_MODIFYING = new Set(['create_pack', 'rename_pack', 'add_beats_to_pack', 'add_customer']);

ipcMain.handle('ai-command', async (event, { message, history }) => {
  try {
    const http = require('http');
    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant built into Beats Management Studio — a music producer app for managing beat packs, customers, and marketing campaigns. You control the app directly using the available tools. Be concise and action-oriented. After completing tasks, briefly summarize what you did.`
      },
      ...(history || []),
      { role: 'user', content: message }
    ];
    let dataModified = false;
    let customersModified = false;
    const log = [];

    for (let iter = 0; iter < 8; iter++) {
      const postData = JSON.stringify({
        model: 'qwen3.5:9b',
        messages,
        tools: AI_AGENT_TOOLS,
        stream: false,
        think: false,
        options: { temperature: 0.2, num_predict: 800 }
      });

      const parsed = await new Promise((resolve, reject) => {
        const opts = {
          hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };
        const req = http.request(opts, (res) => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
        });
        req.on('error', reject);
        req.setTimeout(90000, () => { req.destroy(); reject(new Error('Ollama timeout (90s)')); });
        req.write(postData); req.end();
      });

      if (parsed.error) throw new Error(parsed.error);
      const assistantMsg = parsed.message;
      messages.push(assistantMsg);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        let content = (assistantMsg.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (dataModified && mainWindow) mainWindow.webContents.send('ai-data-updated');
        if (customersModified && mainWindow) mainWindow.webContents.send('ai-customers-updated');
        return { success: true, response: content, log };
      }

      for (const tc of assistantMsg.tool_calls) {
        const name = tc.function.name;
        const args = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : (tc.function.arguments || {});
        let result;
        try { result = await executeAgentTool(name, args); }
        catch (e) { result = 'Error: ' + e.message; }
        log.push({ tool: name, args, result });
        if (AI_DATA_MODIFYING.has(name)) dataModified = true;
        if (name === 'add_customer') customersModified = true;
        messages.push({ role: 'tool', content: String(result) });
      }
    }

    return { success: false, error: 'Agent exceeded maximum iterations.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
