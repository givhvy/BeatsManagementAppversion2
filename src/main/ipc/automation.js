// Start/stop the automation server child process from the renderer.
const { ipcMain } = require('electron');
const automationServer = require('../services/automation-server');

function register() {
  ipcMain.handle('start-automation-server', async () => {
    return automationServer.start();
  });

  ipcMain.handle('stop-automation-server', async () => {
    return automationServer.stop();
  });
}

module.exports = { register };
