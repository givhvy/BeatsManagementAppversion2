// Window controls, shell helpers, and DOM-grabber bridge.
const { ipcMain, BrowserWindow, shell, clipboard } = require('electron');
const state = require('../app-state');
const { createDesktopShortcut } = require('../window');
const { getGrabberCode } = require('../services/dom-grabber');

function register() {
  ipcMain.handle('window-control', (event, action) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return;

    if (action === 'minimize') {
      targetWindow.minimize();
    } else if (action === 'maximize') {
      if (targetWindow.isMaximized()) {
        targetWindow.unmaximize();
      } else {
        targetWindow.maximize();
      }
    } else if (action === 'close') {
      targetWindow.close();
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

  // Open an external URL in the default browser
  ipcMain.handle('open-external-url', async (event, url) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Invalid URL' };
  });

  // Debug IPC: renderer can send arbitrary debug messages to main terminal
  ipcMain.on('renderer-debug', (event, msg) => {
    console.log('[RENDERER DEBUG]', msg);
  });

  // --- Easy DOM Grabber ---
  ipcMain.handle('edg-copy-to-clipboard', async (_event, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.on('edg-toggle-grabber', () => {
    if (state.mainWindow) {
      state.mainWindow.webContents.executeJavaScript(`
        if (window.__edgToggle) window.__edgToggle();
        else ${getGrabberCode()}
      `).catch(() => {});
    }
  });
}

module.exports = { register };
