// YouTube tab: channel discovery/creation, upload queue, settings, OAuth re-auth,
// and copying rendered videos into channel upload folders.
const { ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT, AUTOMATION_CONFIG_PATH } = require('../paths');

// In-memory YouTube state (per app session)
let youtubeChannels = [];
let uploadQueue = [];
let uploadHistory = [];
let youtubeServerRunning = false;

function register() {
  // Load upload history from file
  ipcMain.handle('load-upload-history', async () => {
    try {
      const historyPath = path.join(AUTOMATION_CONFIG_PATH, 'upload-history.json');

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
      const settingsPath = path.join(AUTOMATION_CONFIG_PATH, 'global-settings.json');

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
      const settingsPath = path.join(AUTOMATION_CONFIG_PATH, 'global-settings.json');

      // Ensure directory exists
      if (!fs.existsSync(AUTOMATION_CONFIG_PATH)) {
        fs.mkdirSync(AUTOMATION_CONFIG_PATH, { recursive: true });
      }

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error saving global settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Load channel history (for specific channel)
  ipcMain.handle('load-channel-history', async (event, channelId) => {
    try {
      // channelId format: "AccountA/channel1"
      const channelPath = path.join(AUTOMATION_CONFIG_PATH, channelId);
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
      const channelPath = path.join(AUTOMATION_CONFIG_PATH, accountName, channelId);

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
      const uploadsPath = path.join(APP_ROOT, 'automation', 'uploads', accountName, channelId, 'BeatsUpload');
      fs.mkdirSync(uploadsPath, { recursive: true });

      // Create Processed folder
      const processedPath = path.join(APP_ROOT, 'automation', 'uploads', accountName, channelId, 'Processed');
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
      const configPath = AUTOMATION_CONFIG_PATH;

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
                uploadFolder: path.join(APP_ROOT, 'automation', 'uploads', item.name, channelFolder.name)
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

  // Re-authenticate YouTube token for a channel
  // This will generate auth URL, open browser, and return URL for code input
  ipcMain.handle('reauthenticate-youtube', async (event, channelId) => {
    try {
      const { google } = require('googleapis');

      // channelId can be:
      // - "AccountA/channel1" (old format)
      // - "C14" (new format, folder is C14/C14)
      // - "C14/C14" (if passed full path)

      let channelConfigPath = path.join(AUTOMATION_CONFIG_PATH, channelId);
      let credentialsPath = path.join(channelConfigPath, 'credentials.json');

      console.log('[Re-auth] Trying path 1:', credentialsPath);

      // If not found, try nested path (C14 -> C14/C14)
      if (!fs.existsSync(credentialsPath)) {
        // Check if it's a new-style channel (C14)
        const parts = channelId.split('/');
        if (parts.length === 1) {
          // Try nested: C14/C14
          channelConfigPath = path.join(AUTOMATION_CONFIG_PATH, channelId, channelId);
          credentialsPath = path.join(channelConfigPath, 'credentials.json');
          console.log('[Re-auth] Trying path 2 (nested):', credentialsPath);
        }
      }

      if (!fs.existsSync(credentialsPath)) {
        return { success: false, error: `credentials.json not found. Tried paths under: ${AUTOMATION_CONFIG_PATH}/${channelId}` };
      }

      // Update channelId to full path for complete-reauth
      const fullChannelId = channelConfigPath.replace(AUTOMATION_CONFIG_PATH + path.sep, '').replace(/\\/g, '/');

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

      const channelConfigPath = path.join(AUTOMATION_CONFIG_PATH, channelId);
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
}

module.exports = { register };
