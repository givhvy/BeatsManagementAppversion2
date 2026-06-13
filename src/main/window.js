// Main window creation + window-adjacent helpers (drag icon cache, desktop shortcut).
const { app, BrowserWindow, nativeImage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('./paths');
const state = require('./app-state');
const { getGrabberCode } = require('./services/dom-grabber');
const automationServer = require('./services/automation-server');

// Pre-cache the system icon for .mp4 files (used by drag-files-start)
async function loadDragIcon() {
  try {
    // Write a temp empty .mp4 just to get its system icon
    const tmpMp4 = path.join(app.getPath('temp'), '_bms_icon_probe.mp4');
    fs.writeFileSync(tmpMp4, '');
    const icon = await app.getFileIcon(tmpMp4, { size: 'normal' });
    if (icon && !icon.isEmpty()) {
      state.cachedDragIcon = icon;
      console.log('[Main] Drag icon loaded successfully');
    } else {
      console.log('[Main] Drag icon probe returned empty, will use fallback');
    }
    fs.unlinkSync(tmpMp4);
  } catch (e) {
    console.log('[Main] Could not load drag icon:', e.message);
  }
}

// Create a desktop .lnk shortcut that can be pinned to the Windows taskbar
function createDesktopShortcut() {
  try {
    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'Beats Management Studio.lnk');
    const exePath = app.getPath('exe');
    const appDir = app.getAppPath();
    const iconFile = path.join(APP_ROOT, 'build', 'icon.ico');

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

  const iconPath = path.join(APP_ROOT, 'build', 'icon.ico');

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  state.mainWindow = mainWindow;

  mainWindow.loadFile(path.join(APP_ROOT, 'src', 'renderer', 'index.html'));

  // Open DevTools automatically for debugging
  mainWindow.webContents.openDevTools();

  // --- Easy DOM Grabber: inject on page load ---
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(getGrabberCode()).catch(() => {});
  });

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
  automationServer.startOnStartup();

  return mainWindow;
}

module.exports = { createWindow, createDesktopShortcut, loadDragIcon };
