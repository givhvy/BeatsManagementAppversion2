import express from 'express';
import multer from 'multer';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import YouTubeUploader from './modules/youtube.js';
import AIMetadataGenerator from './modules/ai.js';
import logger from './modules/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = await fs.readJson(path.join(__dirname, 'config/config.json'));

const app = express();
const PORT = config.port || 3000;

// Middleware
app.use(express.json());
app.use(express.static('ui'));

// Khởi tạo thư mục
await fs.ensureDir(config.uploadFolder);
await fs.ensureDir(config.logFolder);

// Lưu trạng thái upload
const uploadQueue = [];
const uploadHistory = [];

// Khởi tạo YouTube Uploader
const youtubeUploader = new YouTubeUploader(config);
const aiGenerator = new AIMetadataGenerator(config);

let isYouTubeReady = false;

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file video'));
    }
  },
});

// API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    isYouTubeReady,
    queue: uploadQueue,
    history: uploadHistory.slice(-20), // 20 video gần nhất
  });
});

app.get('/api/channel', async (req, res) => {
  // Bỏ qua việc lấy channel info vì không cần thiết cho upload
  res.json({ success: true, channel: null });
});

app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'Không có file video' });
    }

    const metadata = {
      title: title || path.parse(videoFile.originalname).name,
      description: description || '',
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    };

    const queueItem = {
      id: Date.now().toString(),
      fileName: videoFile.originalname,
      filePath: videoFile.path,
      metadata,
      status: 'pending',
      addedAt: new Date().toISOString(),
    };

    uploadQueue.push(queueItem);

    res.json({ success: true, queueItem });

    // Xử lý upload
    processUploadQueue();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/retry/:id', async (req, res) => {
  const historyItem = uploadHistory.find((h) => h.id === req.params.id);

  if (!historyItem) {
    return res.status(404).json({ error: 'Không tìm thấy video' });
  }

  const queueItem = {
    ...historyItem,
    status: 'pending',
    retryAt: new Date().toISOString(),
  };

  uploadQueue.push(queueItem);
  processUploadQueue();

  res.json({ success: true });
});

app.patch('/api/queue/:id', (req, res) => {
  const item = uploadQueue.find((q) => q.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Không tìm thấy video' });
  }

  const { title, description, tags } = req.body;

  if (title) item.metadata.title = title;
  if (description) item.metadata.description = description;
  if (tags) item.metadata.tags = tags.split(',').map((t) => t.trim());

  res.json({ success: true, item });
});

app.post('/api/queue/:id/confirm', async (req, res) => {
  const item = uploadQueue.find((q) => q.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Không tìm thấy video' });
  }

  if (!isYouTubeReady) {
    return res.status(400).json({ error: 'YouTube API chưa sẵn sàng. Vui lòng xác thực OAuth trước.' });
  }

  // Đổi status từ draft → pending để bắt đầu upload
  item.status = 'pending';
  res.json({ success: true });

  // Bắt đầu upload
  processUploadQueue();
});

app.delete('/api/queue/:id', (req, res) => {
  const index = uploadQueue.findIndex((q) => q.id === req.params.id);

  if (index > -1) {
    uploadQueue.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy trong queue' });
  }
});

// Xử lý upload queue
let isProcessing = false;

async function processUploadQueue() {
  if (isProcessing || uploadQueue.length === 0 || !isYouTubeReady) {
    return;
  }

  isProcessing = true;

  while (uploadQueue.length > 0) {
    const item = uploadQueue[0];
    item.status = 'uploading';

    try {
      logger.info(`Bắt đầu upload: ${item.fileName}`);

      const result = await youtubeUploader.uploadVideo(item.filePath, item.metadata);

      item.status = result.success ? 'completed' : 'failed';
      item.result = result;
      item.completedAt = new Date().toISOString();

      if (result.success) {
        logger.info(`✅ ${item.fileName} uploaded successfully → Scheduled for ${config.publishTime}`);
        console.log(`\n✅ [${item.metadata.title}] uploaded successfully → Scheduled for ${config.publishTime}`);
      } else {
        logger.error(`❌ Upload failed: ${item.fileName}`, result.error);
        console.log(`\n❌ [${item.fileName}] upload failed: ${result.error}`);
      }

      uploadHistory.push({ ...item });

      // Xóa file sau khi upload (tùy chọn)
      // await fs.remove(item.filePath);
    } catch (error) {
      item.status = 'failed';
      item.error = error.message;
      logger.error(`❌ Lỗi upload: ${item.fileName}`, error);
      uploadHistory.push({ ...item });
    }

    uploadQueue.shift();
  }

  isProcessing = false;
}

// File watcher
const watcher = chokidar.watch(config.uploadFolder, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100,
  },
});

watcher.on('add', async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (!['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
    return;
  }

  console.log(`\n🎬 Phát hiện video mới: ${path.basename(filePath)}`);
  logger.info(`New video detected: ${filePath}`);

  try {
    // Generate metadata bằng AI
    const fileName = path.basename(filePath);
    console.log('🤖 Đang tạo metadata bằng AI...');

    const metadata = await aiGenerator.generateMetadata(fileName, filePath);

    console.log(`📝 Title: ${metadata.title}`);
    console.log(`📝 Tags: ${metadata.tags.join(', ')}`);

    const queueItem = {
      id: Date.now().toString(),
      fileName,
      filePath,
      metadata,
      status: 'draft', // Đổi từ 'pending' → 'draft' để cho phép edit
      addedAt: new Date().toISOString(),
    };

    uploadQueue.push(queueItem);
    logger.info(`Added to queue (draft): ${fileName}`);

    console.log(`✅ Video đã được thêm vào hàng đợi. Vào UI để chỉnh sửa và upload!\n`);

    // KHÔNG tự động upload nữa - chỉ thêm vào queue
    // processUploadQueue();
  } catch (error) {
    logger.error(`Error processing ${filePath}:`, error);
    console.error(`❌ Lỗi xử lý file: ${error.message}`);
  }
});

// Khởi động server
async function startServer() {
  console.log('\n🚀 YouTube Auto Uploader đang khởi động...\n');

  // Khởi tạo YouTube API
  console.log('🔐 Đang kết nối YouTube API...');
  isYouTubeReady = await youtubeUploader.initialize();

  if (isYouTubeReady) {
    console.log('✅ YouTube API sẵn sàng - Có thể upload video');
  } else {
    console.log('⚠️  YouTube API chưa sẵn sàng. Vui lòng cấu hình OAuth.');
  }

  // Khởi động Express
  app.listen(PORT, () => {
    console.log(`\n✅ Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📁 Đang theo dõi folder: ${path.resolve(config.uploadFolder)}`);
    console.log(`⏰ Thời gian publish: ${config.publishTime} (${config.timezone})`);
    console.log('\n💡 Thả video vào folder để tự động upload!\n');
  });
}

startServer();
