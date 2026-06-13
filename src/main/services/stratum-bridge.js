// Stratum DAW bridge: TCP server on 127.0.0.1:9003 that lets the DAW focus the
// app, navigate tabs, and trigger video renders. When a render is initiated
// from the DAW, the socket is kept so render progress can stream back.
const net = require('net');
const state = require('../app-state');

let stratumRenderSocket = null;

// Send a JSON line back to the DAW if a render socket is active
function stratumSend(obj) {
  if (!stratumRenderSocket) return;
  try { stratumRenderSocket.write(JSON.stringify(obj) + '\n'); } catch (e) { /* ignore */ }
}

// Called by the render-video IPC handler once a render finishes/fails
function releaseSocket() {
  stratumRenderSocket = null;
}

function hasActiveSocket() {
  return stratumRenderSocket !== null;
}

function start() {
  const server = net.createServer((socket) => {
    socket.on('data', (data) => {
      try {
        const msg = JSON.parse(data.toString().trim());
        console.log('[Stratum Bridge] Received command:', msg);
        const mainWindow = state.mainWindow;
        if (msg.action === 'focus') {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        } else if (msg.action === 'navigate') {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.executeJavaScript(`
              (function() {
                const tab = document.querySelector('.main-nav-tab[data-section="${msg.tab}"]');
                if (tab) {
                  tab.click();
                  return 'navigated';
                }
                return 'tab_not_found';
              })();
            `).then(res => {
              console.log('[Stratum Bridge] Navigation result:', res);
            }).catch(err => {
              console.error('[Stratum Bridge] Navigation JS error:', err);
            });
          }
        } else if (msg.action === 'renderVideo') {
          // DAW asked us to render a video for a freshly-exported beat.
          // Navigate to the Create (autovid) tab, then drive the render.
          // Keep this socket so we can stream progress back to the DAW.
          stratumRenderSocket = socket;
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            const payloadJson = JSON.stringify({
              audioPath: msg.audioPath || '',
              outputName: msg.outputName || ''
            });
            mainWindow.webContents.executeJavaScript(`
              (function() {
                const tab = document.querySelector('.main-nav-tab[data-section="autovid"]');
                if (tab) tab.click();
                const payload = ${payloadJson};
                // The tab may need a tick to initialise its DOM/state.
                setTimeout(function() {
                  if (typeof window.stratumRenderVideo === 'function') {
                    window.stratumRenderVideo(payload);
                  } else {
                    console.error('[Stratum Bridge] stratumRenderVideo not available');
                  }
                }, 600);
                return 'render_started';
              })();
            `).then(res => {
              console.log('[Stratum Bridge] Render result:', res);
            }).catch(err => {
              console.error('[Stratum Bridge] Render JS error:', err);
            });
          }
        }
      } catch (e) {
        console.error('[Stratum Bridge] JSON parse error:', e);
      }
    });
    socket.on('error', (err) => {
      // Ignore socket connection reset errors
      if (stratumRenderSocket === socket) stratumRenderSocket = null;
    });
    socket.on('close', () => {
      if (stratumRenderSocket === socket) stratumRenderSocket = null;
    });
  });

  server.listen(9003, '127.0.0.1', () => {
    console.log('[Stratum Bridge] TCP Server listening on port 9003');
  });

  return server;
}

module.exports = { start, stratumSend, releaseSocket, hasActiveSocket };
