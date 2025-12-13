import express from 'express';
import multer from 'multer';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import ChannelScanner from './modules/channelScanner.js';
import MultiChannelYouTubeUploader from './modules/multiChannelYoutube.js';
import AIMetadataGenerator from './modules/ai.js';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = await fs.readJson(path.join(__dirname, 'config/config.json'));

const app = express();
const PORT = config.port || 3000;

app.use(express.json());
app.use(express.static('ui'));

// Multer config for file uploads
const upload = multer({
  dest: path.join(__dirname, 'temp'),
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB
});

// Redirect trang chủ sang UI multi-channel
app.get('/', (_req, res) => {
  res.redirect('/index.html');
});

// Khởi tạo Channel Scanner
const scanner = new ChannelScanner(path.join(__dirname, 'config'));

// Lưu trữ channels và watchers
const channels = [];
const channelUploaders = new Map(); // channelId -> YouTubeUploader
const channelWatchers = new Map(); // channelId -> watcher
const channelQueues = new Map(); // channelId -> uploadQueue
const channelHistories = new Map(); // channelId -> uploadHistory
const channelLoggers = new Map(); // channelId -> logger

// History persistence file
const HISTORY_FILE = path.join(__dirname, 'config', 'upload-history.json');

// AI Generator (dùng chung)
const aiGenerator = new AIMetadataGenerator(config);

/**
 * Load history from persistent storage
 */
async function loadHistoryFromFile() {
  try {
    if (await fs.pathExists(HISTORY_FILE)) {
      const data = await fs.readJson(HISTORY_FILE);
      for (const [channelId, history] of Object.entries(data)) {
        channelHistories.set(channelId, history);
      }
      console.log(`📂 Loaded history for ${Object.keys(data).length} channels`);
    }
  } catch (error) {
    console.error('Failed to load history:', error.message);
  }
}

/**
 * Save history to persistent storage
 */
async function saveHistoryToFile() {
  try {
    const data = {};
    for (const [channelId, history] of channelHistories.entries()) {
      data[channelId] = history;
    }
    await fs.writeJson(HISTORY_FILE, data, { spaces: 2 });
  } catch (error) {
    console.error('Failed to save history:', error.message);
  }
}

/**
 * Khởi tạo logger cho từng channel
 */
function createChannelLogger(channel) {
  const logDir = path.join(__dirname, 'logs');
  fs.ensureDirSync(logDir);

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${channel.name}] ${level.toUpperCase()}: ${message}`;
      })
    ),
    transports: [
      new winston.transports.File({
        filename: channel.logPath,
      }),
      new winston.transports.Console(),
    ],
  });

  return logger;
}

/**
 * Khởi tạo watcher cho từng channel
 */
async function setupChannelWatcher(channel) {
  await fs.ensureDir(channel.uploadsPath);

  const watcher = chokidar.watch(channel.uploadsPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 45000, // Đợi 45 giây để đảm bảo video render xong
      pollInterval: 100,
    },
  });

  watcher.on('add', async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      return;
    }

    const logger = channelLoggers.get(channel.channelId);
    const fileName = path.basename(filePath);

    logger.info(`Phát hiện video mới: ${fileName}`);
    console.log(`\n🎬 [${channel.name}] Phát hiện video mới: ${fileName}`);

    try {
      let metadata = null;
      let scheduleDate = null;
      
      // Check for metadata JSON file first (created by Beats Management app)
      const metadataFilePath = filePath.replace(/\.[^.]+$/, '.json');
      if (await fs.pathExists(metadataFilePath)) {
        console.log(`📄 [${channel.name}] Tìm thấy metadata file, đang đọc...`);
        const savedMetadata = await fs.readJson(metadataFilePath);
        
        // Use saved metadata
        metadata = {
          title: savedMetadata.title || fileName.replace(/\.[^.]+$/, ''),
          description: savedMetadata.description || '',
          tags: savedMetadata.tags || []
        };
        
        // Get schedule date if provided
        if (savedMetadata.scheduleDate) {
          scheduleDate = savedMetadata.scheduleDate;
          console.log(`📅 [${channel.name}] Schedule date từ metadata: ${scheduleDate}`);
        }
        
        console.log(`📝 [${channel.name}] Title (từ metadata): ${metadata.title}`);
      } else {
        // Generate metadata với template của channel
        console.log(`🤖 [${channel.name}] Đang tạo metadata...`);
        metadata = await aiGenerator.generateMetadata(fileName, filePath, channel.metadataTemplate);
        console.log(`📝 [${channel.name}] Title: ${metadata.title}`);
      }

      const queueItem = {
        id: `${channel.channelId}-${Date.now()}`,
        channelId: channel.channelId,
        channelName: channel.name,
        fileName,
        filePath,
        metadata,
        scheduleDate, // Add schedule date to queue item
        status: channel.autoUpload ? 'pending' : 'draft',
        addedAt: new Date().toISOString(),
      };

      const queue = channelQueues.get(channel.channelId) || [];
      queue.push(queueItem);
      channelQueues.set(channel.channelId, queue);

      if (channel.autoUpload) {
        logger.info(`Tự động upload: ${fileName}`);
        console.log(`🚀 [${channel.name}] Auto-upload enabled, đang upload...`);
        processChannelQueue(channel.channelId);
      } else {
        logger.info(`Đã thêm vào queue (draft): ${fileName}`);
        console.log(`✅ [${channel.name}] Video đã được thêm vào hàng đợi. Vào UI để xác nhận upload!`);
      }
    } catch (error) {
      logger.error(`Lỗi xử lý file ${fileName}: ${error.message}`);
      console.error(`❌ [${channel.name}] Lỗi xử lý file: ${error.message}`);
    }
  });

  return watcher;
}

/**
 * Xử lý upload queue cho channel
 */
async function processChannelQueue(channelId) {
  const queue = channelQueues.get(channelId) || [];
  const uploader = channelUploaders.get(channelId);
  const logger = channelLoggers.get(channelId);
  const history = channelHistories.get(channelId) || [];

  if (!uploader || !uploader.isReady) {
    return;
  }

  const pendingItems = queue.filter(item => item.status === 'pending');

  for (const item of pendingItems) {
    item.status = 'uploading';

    try {
      logger.info(`Bắt đầu upload: ${item.fileName}`);

      // Pass scheduleDate to uploadVideo if available
      const result = await uploader.uploadVideo(item.filePath, item.metadata, item.scheduleDate);

      item.status = result.success ? 'completed' : 'failed';
      item.result = result;
      item.completedAt = new Date().toISOString();

      if (result.success) {
        const scheduleInfo = item.scheduleDate ? new Date(item.scheduleDate).toLocaleString() : result.publishAt;
        logger.info(`✅ Upload thành công: ${item.fileName} - Scheduled: ${scheduleInfo}`);
      } else {
        logger.error(`❌ Upload thất bại: ${item.fileName} - ${result.error}`);
      }

      history.push({ ...item });
      channelHistories.set(channelId, history);
      await saveHistoryToFile(); // Persist history

      // Xóa khỏi queue
      const updatedQueue = queue.filter(q => q.id !== item.id);
      channelQueues.set(channelId, updatedQueue);
    } catch (error) {
      item.status = 'failed';
      item.error = error.message;
      logger.error(`❌ Lỗi upload: ${item.fileName} - ${error.message}`);

      history.push({ ...item });
      channelHistories.set(channelId, history);
      await saveHistoryToFile(); // Persist history
    }
  }
}

// ==================== API ENDPOINTS ====================

app.get('/api/channels', async (req, res) => {
  // Rescan channels để lấy danh sách mới nhất
  const latestChannels = await scanner.scanChannels();

  const channelList = latestChannels.map(ch => ({
    ...ch,
    configPath: undefined,
    credentialsPath: undefined,
    tokenPath: undefined,
    queueCount: (channelQueues.get(ch.channelId) || []).length,
    historyCount: (channelHistories.get(ch.channelId) || []).length,
    isReady: channelUploaders.get(ch.channelId)?.isReady || false,
  }));

  res.json({ channels: channelList });
});

app.get('/api/status/:channelId', (req, res) => {
  const { channelId } = req.params;
  const queue = channelQueues.get(channelId) || [];
  const history = channelHistories.get(channelId) || [];
  const uploader = channelUploaders.get(channelId);

  res.json({
    channelId,
    isReady: uploader?.isReady || false,
    queue,
    history: history.slice(-20),
  });
});

app.patch('/api/queue/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, tags } = req.body;

  let found = false;

  for (const [channelId, queue] of channelQueues.entries()) {
    const item = queue.find(q => q.id === id);
    if (item) {
      if (title) item.metadata.title = title;
      if (description) item.metadata.description = description;
      if (tags) item.metadata.tags = tags.split(',').map(t => t.trim());
      found = true;
      res.json({ success: true, item });
      break;
    }
  }

  if (!found) {
    res.status(404).json({ error: 'Video không tìm thấy' });
  }
});

app.post('/api/queue/:id/confirm', async (req, res) => {
  const { id } = req.params;

  for (const [channelId, queue] of channelQueues.entries()) {
    const item = queue.find(q => q.id === id);
    if (item) {
      const uploader = channelUploaders.get(channelId);

      if (!uploader || !uploader.isReady) {
        return res.status(400).json({ error: 'Channel chưa sẵn sàng' });
      }

      item.status = 'pending';
      res.json({ success: true });

      // Process queue
      processChannelQueue(channelId);
      return;
    }
  }

  res.status(404).json({ error: 'Video không tìm thấy' });
});

app.delete('/api/queue/:id', (req, res) => {
  const { id } = req.params;

  for (const [channelId, queue] of channelQueues.entries()) {
    const index = queue.findIndex(q => q.id === id);
    if (index > -1) {
      queue.splice(index, 1);
      channelQueues.set(channelId, queue);
      return res.json({ success: true });
    }
  }

  res.status(404).json({ error: 'Video không tìm thấy' });
});

app.post('/api/upload', upload.single('video'), async (req, res) => {
  const { channelId } = req.body;
  const file = req.file;

  if (!file || !channelId) {
    return res.status(400).json({ error: 'Thiếu file hoặc channelId' });
  }

  try {
    const channel = channels.find(ch => ch.channelId === channelId);
    if (!channel) {
      await fs.remove(file.path);
      return res.status(404).json({ error: 'Channel không tồn tại' });
    }

    // Move file to channel's upload folder
    const targetPath = path.join(channel.uploadsPath, file.originalname);
    await fs.move(file.path, targetPath, { overwrite: true });

    res.json({ success: true, fileName: file.originalname });
  } catch (error) {
    console.error('Upload error:', error);
    if (file) await fs.remove(file.path);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const channel = channels.find(ch => ch.channelId === channelId);

  if (!channel) {
    return res.status(404).json({ error: 'Channel không tồn tại' });
  }

  try {
    if (await fs.pathExists(channel.logPath)) {
      const logs = await fs.readFile(channel.logPath, 'utf-8');
      const logLines = logs.split('\n').slice(-100).reverse(); // 100 dòng gần nhất
      res.json({ logs: logLines });
    } else {
      res.json({ logs: [] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN API ====================

app.get('/api/admin/channels', async (req, res) => {
  try {
    const configBasePath = path.join(__dirname, 'config');
    const channelData = [];

    // Scan all account folders
    const accounts = await fs.readdir(configBasePath);

    for (const account of accounts) {
      const accountPath = path.join(configBasePath, account);
      const stat = await fs.stat(accountPath);

      if (!stat.isDirectory() || account.startsWith('.')) continue;

      // Scan all channel folders in this account
      const channelDirs = await fs.readdir(accountPath);

      for (const channelDir of channelDirs) {
        const channelPath = path.join(accountPath, channelDir);
        const channelStat = await fs.stat(channelPath);

        if (!channelStat.isDirectory() || channelDir.startsWith('.')) continue;

        const credentialsPath = path.join(channelPath, 'credentials.json');
        const tokenPath = path.join(channelPath, 'token.json');
        const configPath = path.join(channelPath, 'config.json');

        // Load config if exists
        let channelConfig = { displayName: `${account} - ${channelDir}`, autoUpload: false };
        if (await fs.pathExists(configPath)) {
          try {
            const loadedConfig = await fs.readJson(configPath);
            channelConfig = { ...channelConfig, ...loadedConfig };
          } catch (error) {
            console.warn(`⚠️  Error reading config for ${channelDir}:`, error.message);
          }
        }

        channelData.push({
          account,
          channelId: channelDir,
          name: channelConfig.displayName,
          hasCredentials: await fs.pathExists(credentialsPath),
          hasToken: await fs.pathExists(tokenPath),
          autoUpload: channelConfig.autoUpload,
          metadataTemplate: channelConfig.metadataTemplate,
        });
      }
    }

    res.json({ success: true, channels: channelData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/channels/create', async (req, res) => {
  const { account, channelId, displayName } = req.body;

  try {
    const result = await scanner.createChannelStructure(account, channelId);

    // Create default config.json with Filmora-like mode enabled
    const configPath = path.join(result.configPath, 'config.json');
    const defaultConfig = {
      displayName,
      autoUpload: true,
      metadataTemplate: {
        titleTemplate: "(FREE) Type Beat - \"[Name]\"",
        descriptionConditions: {
          default: {
            text: "💰 Free beat for non-profit use",
            tags: ["type beat", "free beat", "instrumental"]
          }
        },
        category: "10",
        privacy: "private",
        language: "en"
      },
      // === FILMORA-LIKE MODE (Default for all new channels) ===
      // Targets 60-70% US audience by mimicking Filmora upload behavior
      audienceMode: {
        enabled: true,           // Enable Filmora-like upload by default
        mode: "filmora-like",    // Upload mode
        useUSProxy: false,       // Set to true if you have US proxy
        proxyURL: ""            // Example: "http://us-proxy.example.com:8080"
      }
    };

    await fs.writeJson(configPath, defaultConfig, { spaces: 2 });

    res.json({ success: true, message: 'Channel created successfully' });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/channels/credentials', upload.single('credentials'), async (req, res) => {
  const { account, channelId } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const credentialsPath = path.join(__dirname, 'config', account, channelId, 'credentials.json');
    await fs.move(file.path, credentialsPath, { overwrite: true });

    res.json({ success: true, message: 'Credentials uploaded' });
  } catch (error) {
    if (file) await fs.remove(file.path);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/channels/token', async (req, res) => {
  const { account, channelId } = req.query;

  try {
    const credentialsPath = path.join(__dirname, 'config', account, channelId, 'credentials.json');

    if (!await fs.pathExists(credentialsPath)) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    const credentials = await fs.readJson(credentialsPath);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const { google } = await import('googleapis');
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.upload'],
    });

    res.json({ success: true, authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/channels/token', async (req, res) => {
  const { account, channelId, code } = req.body;

  try {
    const credentialsPath = path.join(__dirname, 'config', account, channelId, 'credentials.json');
    const tokenPath = path.join(__dirname, 'config', account, channelId, 'token.json');

    const credentials = await fs.readJson(credentialsPath);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const { google } = await import('googleapis');
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const { tokens } = await oAuth2Client.getToken(code);
    await fs.writeJson(tokenPath, tokens, { spaces: 2 });

    res.json({ success: true, message: 'Token saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/channels/config', async (req, res) => {
  const { account, channelId } = req.query;

  try {
    const configPath = path.join(__dirname, 'config', account, channelId, 'config.json');

    if (!await fs.pathExists(configPath)) {
      return res.status(404).json({ error: 'Config not found' });
    }

    const config = await fs.readJson(configPath);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/channels/config', async (req, res) => {
  const { account, channelId, config } = req.body;

  try {
    const configPath = path.join(__dirname, 'config', account, channelId, 'config.json');
    await fs.writeJson(configPath, config, { spaces: 2 });

    res.json({ success: true, message: 'Config saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/channels/delete', async (req, res) => {
  const { account, channelId } = req.body;

  try {
    const channelConfigPath = path.join(__dirname, 'config', account, channelId);
    await fs.remove(channelConfigPath);

    res.json({ success: true, message: 'Channel deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry failed uploads for a channel
app.post('/api/retry-failed/:channelId', async (req, res) => {
  const { channelId } = req.params;
  
  try {
    const history = channelHistories.get(channelId) || [];
    const failedItems = history.filter(item => item.status === 'failed');
    
    if (failedItems.length === 0) {
      return res.json({ success: true, message: 'No failed uploads to retry', retried: 0 });
    }
    
    const uploader = channelUploaders.get(channelId);
    const logger = channelLoggers.get(channelId);
    
    if (!uploader) {
      return res.status(400).json({ error: 'Channel uploader not found' });
    }
    
    // Reload token from file before retrying
    console.log(`🔄 [${channelId}] Reloading token before retry...`);
    await uploader.reloadTokenFromFile();
    
    let retriedCount = 0;
    const results = [];
    
    for (const item of failedItems) {
      // Check if file still exists
      if (!await fs.pathExists(item.filePath)) {
        results.push({ fileName: item.fileName, status: 'skipped', reason: 'File not found' });
        continue;
      }
      
      logger.info(`🔄 Retry upload: ${item.fileName}`);
      console.log(`🔄 [${channelId}] Retrying: ${item.fileName}`);
      
      try {
        const result = await uploader.uploadVideo(item.filePath, item.metadata, item.scheduleDate);
        
        if (result.success) {
          // Update history item
          item.status = 'completed';
          item.result = result;
          item.retriedAt = new Date().toISOString();
          
          const scheduleInfo = item.scheduleDate ? new Date(item.scheduleDate).toLocaleString() : result.publishAt;
          logger.info(`✅ Retry thành công: ${item.fileName} - Scheduled: ${scheduleInfo}`);
          
          results.push({ fileName: item.fileName, status: 'success', scheduleInfo });
          retriedCount++;
        } else {
          logger.error(`❌ Retry thất bại: ${item.fileName} - ${result.error}`);
          results.push({ fileName: item.fileName, status: 'failed', error: result.error });
        }
      } catch (error) {
        logger.error(`❌ Retry error: ${item.fileName} - ${error.message}`);
        results.push({ fileName: item.fileName, status: 'error', error: error.message });
      }
    }
    
    await saveHistoryToFile();
    
    res.json({ 
      success: true, 
      message: `Retried ${retriedCount}/${failedItems.length} failed uploads`,
      retried: retriedCount,
      total: failedItems.length,
      results 
    });
  } catch (error) {
    console.error(`❌ Retry failed error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Retry a specific failed upload by ID
app.post('/api/retry-item/:channelId/:itemId', async (req, res) => {
  const { channelId, itemId } = req.params;
  
  try {
    const history = channelHistories.get(channelId) || [];
    const item = history.find(h => h.id === itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found in history' });
    }
    
    if (item.status !== 'failed') {
      return res.json({ success: false, message: 'Item is not in failed status' });
    }
    
    const uploader = channelUploaders.get(channelId);
    const logger = channelLoggers.get(channelId);
    
    if (!uploader) {
      return res.status(400).json({ error: 'Channel uploader not found' });
    }
    
    // Reload token from file
    await uploader.reloadTokenFromFile();
    
    // Check if file exists
    if (!await fs.pathExists(item.filePath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }
    
    logger.info(`🔄 Retry upload: ${item.fileName}`);
    
    const result = await uploader.uploadVideo(item.filePath, item.metadata, item.scheduleDate);
    
    if (result.success) {
      item.status = 'completed';
      item.result = result;
      item.retriedAt = new Date().toISOString();
      await saveHistoryToFile();
      
      const scheduleInfo = item.scheduleDate ? new Date(item.scheduleDate).toLocaleString() : result.publishAt;
      logger.info(`✅ Retry thành công: ${item.fileName} - Scheduled: ${scheduleInfo}`);
      
      res.json({ success: true, message: 'Upload successful', scheduleInfo, result });
    } else {
      logger.error(`❌ Retry thất bại: ${item.fileName} - ${result.error}`);
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== KHỞI ĐỘNG ====================

async function startServer() {
  console.log('\n🚀 YouTube Multi-Channel Uploader đang khởi động...\n');

  // Load saved history first
  await loadHistoryFromFile();

  // Quét tất cả channels
  const scannedChannels = await scanner.scanChannels();
  channels.push(...scannedChannels);

  if (channels.length === 0) {
    console.log('⚠️  Chưa có channel nào. Vui lòng tạo cấu trúc thư mục và thêm credentials.');
    console.log('📖 Xem hướng dẫn trong README.md');
  }

  // Khởi tạo uploader và watcher cho từng channel
  for (const channel of channels) {
    console.log(`\n🔧 Đang khởi tạo: ${channel.name}`);

    // Tạo logger
    const logger = createChannelLogger(channel);
    channelLoggers.set(channel.channelId, logger);

    // Tạo uploader
    const uploader = new MultiChannelYouTubeUploader(channel, config);
    const isReady = await uploader.initialize();

    channelUploaders.set(channel.channelId, uploader);
    channelQueues.set(channel.channelId, []);
    // Preserve loaded history, only initialize if not exists
    if (!channelHistories.has(channel.channelId)) {
      channelHistories.set(channel.channelId, []);
    }

    if (isReady) {
      console.log(`✅ ${channel.name}: Sẵn sàng`);

      // Setup watcher
      const watcher = await setupChannelWatcher(channel);
      channelWatchers.set(channel.channelId, watcher);

      console.log(`👁️  ${channel.name}: Đang theo dõi ${channel.uploadsPath}`);
    } else {
      console.log(`⚠️  ${channel.name}: Chưa có token`);
    }
  }

  // Khởi động Express
  app.listen(PORT, () => {
    console.log(`\n✅ Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📺 Đang quản lý ${channels.length} channel(s)`);
    console.log(`⏰ Thời gian publish: ${config.publishTime} (${config.timezone})`);
    console.log('\n💡 Thả video vào thư mục tương ứng để tự động upload!\n');
  });
}

startServer();
