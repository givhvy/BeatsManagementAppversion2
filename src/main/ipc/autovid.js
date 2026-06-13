// AutoVid tab: video rendering (FFmpeg) + rendered-video browsing.
const { ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');
const state = require('../app-state');
const stratumBridge = require('../services/stratum-bridge');

function register() {
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

  // Render video from image and audio. If the render was initiated from the
  // Stratum DAW bridge, progress/done/error events stream back over its socket.
  ipcMain.handle('render-video', async (event, data) => {
    if (!state.videoRenderer) {
      stratumBridge.stratumSend({ type: 'error', error: 'Video renderer not available' });
      stratumBridge.releaseSocket();
      return { success: false, error: 'Video renderer not available' };
    }

    try {
      const { imagePath, audioPath, outputName, resolution } = data;

      // Validate inputs
      if (!imagePath || !fs.existsSync(imagePath)) {
        stratumBridge.stratumSend({ type: 'error', error: 'Image file not found' });
        stratumBridge.releaseSocket();
        return { success: false, error: 'Image file not found' };
      }
      if (!audioPath || !fs.existsSync(audioPath)) {
        stratumBridge.stratumSend({ type: 'error', error: 'Audio file not found' });
        stratumBridge.releaseSocket();
        return { success: false, error: 'Audio file not found' };
      }

      const result = await state.videoRenderer.createVideo(
        imagePath,
        audioPath,
        outputName || `video_${Date.now()}`,
        resolution || '1080',
        (progress) => {
          state.mainWindow.webContents.send('render-progress', progress);
          stratumBridge.stratumSend({ type: 'progress', value: Math.round(Number(progress) || 0) });
        }
      );

      // Notify the DAW the render finished and hand back the output path.
      stratumBridge.stratumSend({ type: 'done', outputPath: result });
      stratumBridge.releaseSocket();

      return { success: true, outputPath: result };
    } catch (error) {
      stratumBridge.stratumSend({ type: 'error', error: error.message });
      stratumBridge.releaseSocket();
      return { success: false, error: error.message };
    }
  });

  // Get video output directory
  ipcMain.handle('get-video-output-dir', async () => {
    if (!state.videoRenderer) {
      return path.join(APP_ROOT, 'output');
    }
    return state.videoRenderer.getOutputDirectory();
  });

  // Load videos from output folder
  ipcMain.handle('load-videos', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'Output folder not found' };
      }

      const files = fs.readdirSync(folderPath);
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'];

      const videos = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return videoExtensions.includes(ext);
        })
        .map(file => {
          const filePath = path.join(folderPath, file);
          const stats = fs.statSync(filePath);
          const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          const date = stats.mtime.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return {
            name: file,
            path: filePath,
            size: `${sizeInMB} MB`,
            date: date,
            timestamp: stats.mtime.getTime()
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

      return { success: true, videos };
    } catch (error) {
      console.error('Error loading videos:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate video thumbnail using FFmpeg
  ipcMain.handle('generate-video-thumbnail', async (event, videoPath) => {
    try {
      const { exec } = require('child_process');
      const crypto = require('crypto');

      // Create thumbnails cache directory
      const cacheDir = path.join(APP_ROOT, '.cache', 'video-thumbnails');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Generate unique filename based on video path
      const hash = crypto.createHash('md5').update(videoPath).digest('hex');
      const thumbnailPath = path.join(cacheDir, `${hash}.jpg`);

      // Check if thumbnail already exists
      if (fs.existsSync(thumbnailPath)) {
        return { success: true, thumbnailPath };
      }

      // Use FFmpeg to extract thumbnail at 1 second
      const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
      const command = `"${ffmpegPath}" -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${thumbnailPath}" -y`;

      return new Promise((resolve) => {
        exec(command, { windowsHide: true }, (error) => {
          if (error || !fs.existsSync(thumbnailPath)) {
            resolve({ success: false, error: 'Failed to generate thumbnail' });
          } else {
            resolve({ success: true, thumbnailPath });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Open video in default player
  ipcMain.handle('open-video', async (event, videoPath) => {
    try {
      await shell.openPath(videoPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Reveal video in Windows Explorer
  ipcMain.handle('reveal-video', async (event, videoPath) => {
    try {
      shell.showItemInFolder(videoPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Open videos folder
  ipcMain.handle('open-videos-folder', async (event, folderPath) => {
    try {
      await shell.openPath(folderPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
