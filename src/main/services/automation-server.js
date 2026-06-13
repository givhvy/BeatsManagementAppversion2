// Lifecycle management for the YouTube automation server (automation/main-multi.js),
// spawned as a child node process and reachable on http://localhost:9000.
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');

let automationServerProcess = null;

function attachProcessLogging(proc) {
  proc.stdout.on('data', (data) => {
    console.log('[Automation Server]:', data.toString());
  });

  proc.stderr.on('data', (data) => {
    console.error('[Automation Server Error]:', data.toString());
  });

  proc.on('error', (error) => {
    console.error('[Automation Server Process Error]:', error);
    automationServerProcess = null;
  });

  proc.on('exit', (code) => {
    console.log('[Automation Server] exited with code:', code);
    automationServerProcess = null;
  });
}

function spawnServer(automationPath) {
  const { spawn } = require('child_process');
  automationServerProcess = spawn('node', ['main-multi.js'], {
    cwd: automationPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    shell: true
  });
  attachProcessLogging(automationServerProcess);
}

// Auto-start on app launch (no-op if the script is missing or a server already answers)
async function startOnStartup() {
  const automationPath = path.join(APP_ROOT, 'automation');
  const mainScript = path.join(automationPath, 'main-multi.js');

  if (!fs.existsSync(mainScript)) {
    console.log('[Main] Automation script not found, skipping auto-start');
    return;
  }

  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:9000/api/channels', () => resolve(true));
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
  spawnServer(automationPath);
}

// Manual start from the renderer (returns a result object)
async function start() {
  try {
    const automationPath = path.join(APP_ROOT, 'automation');
    const mainScript = path.join(automationPath, 'main-multi.js');

    if (!fs.existsSync(mainScript)) {
      return { success: false, error: 'Không tìm thấy main-multi.js' };
    }

    if (automationServerProcess && !automationServerProcess.killed) {
      return { success: true, message: 'Server đang chạy' };
    }

    spawnServer(automationPath);
    return { success: true, message: 'Server đã khởi động' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function stop() {
  try {
    if (automationServerProcess && !automationServerProcess.killed) {
      if (process.platform === 'win32') {
        // On Windows we need to kill the whole process tree
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
}

// Cleanup when the app is closing
function stopOnQuit() {
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
}

module.exports = { startOnStartup, start, stop, stopOnQuit };
