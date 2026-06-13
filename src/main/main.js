// Main process entry point. Wires together:
//   window.js              - BrowserWindow creation
//   ipc/                   - all IPC handlers, grouped by feature
//   services/              - child processes (automation server, Ollama) and the Stratum DAW bridge
//   app-state.js / paths.js - shared state and path constants
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { APP_ROOT } = require('./paths');
const state = require('./app-state');
const { createWindow } = require('./window');
const ipc = require('./ipc');
const automationServer = require('./services/automation-server');
const ollamaManager = require('./services/ollama-manager');
const stratumBridge = require('./services/stratum-bridge');

// Enable hot reload in development
try {
  require('electron-reload')(APP_ROOT, {
    electron: path.join(APP_ROOT, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
    // Ignore: node_modules, hidden files, automation folders, JSON data files, and output folder
    ignored: /node_modules|[\/\\]\.|automation|autovid|autodownload|.*\.json$|output/
  });
  console.log('Hot reload enabled!');
} catch (e) {
  console.log('Hot reload not available:', e.message);
}

// MUST be called before app is ready for taskbar icon + pin to work on Windows
app.setAppUserModelId('com.givhvy.beatsmanagementstudio');
app.commandLine.appendSwitch('remote-debugging-port', process.env.BEATS_CDP_PORT || '9223');

// Video renderer for AutoVid functionality
try {
  const VideoRenderer = require(path.join(APP_ROOT, 'modules', 'videoRenderer'));
  state.videoRenderer = new VideoRenderer();
} catch (e) {
  console.log('Video renderer not available:', e.message);
}

ipc.registerAll();
stratumBridge.start();

app.whenReady().then(() => {
  ollamaManager.startOnStartup();
  createWindow();
});

app.on('window-all-closed', () => {
  // Cleanup automation server when app closes
  automationServer.stopOnQuit();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
