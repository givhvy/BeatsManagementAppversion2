// Image utilities: square cropping cache, downloads, pasted-clipboard images.
const { ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');
const state = require('../app-state');

function register() {
  // Convert image to 1:1 aspect ratio
  ipcMain.handle('convert-image-to-square', async (event, imagePath) => {
    try {
      // Create cache directory if not exists
      const cacheDir = path.join(APP_ROOT, '.cache', 'images');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Generate cache filename
      const ext = path.extname(imagePath);
      const baseName = path.basename(imagePath, ext);
      const cachedPath = path.join(cacheDir, `${baseName}_1x1${ext}`);

      // Check if cached version exists
      if (fs.existsSync(cachedPath)) {
        return { success: true, cachedPath };
      }

      // Load image using nativeImage
      const image = nativeImage.createFromPath(imagePath);
      const size = image.getSize();

      if (size.width === 0 || size.height === 0) {
        return { success: false, error: 'Invalid image' };
      }

      // Calculate crop dimensions for center crop
      const minDimension = Math.min(size.width, size.height);
      const cropX = Math.floor((size.width - minDimension) / 2);
      const cropY = Math.floor((size.height - minDimension) / 2);

      // Crop to square
      const squareImage = image.crop({
        x: cropX,
        y: cropY,
        width: minDimension,
        height: minDimension
      });

      // Save as PNG with high quality
      const pngBuffer = squareImage.toPNG();
      fs.writeFileSync(cachedPath, pngBuffer);

      return { success: true, cachedPath };
    } catch (error) {
      console.error('Error converting image:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear image cache
  ipcMain.handle('clear-image-cache', async () => {
    try {
      const cacheDir = path.join(APP_ROOT, '.cache', 'images');
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(cacheDir, file));
        });
        return { success: true, count: files.length };
      }
      return { success: true, count: 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Download image from URL
  ipcMain.handle('download-image', async (event, imageUrl, savePath) => {
    try {
      const https = require('https');
      const http = require('http');

      const protocol = imageUrl.startsWith('https') ? https : http;

      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(savePath);

        protocol.get(imageUrl, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve({ success: true, path: savePath });
          });
        }).on('error', (err) => {
          fs.unlink(savePath, () => {});
          reject(err);
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Save pasted clipboard image to a real file so FFmpeg can render it
  ipcMain.handle('save-pasted-image', async (event, dataUrl) => {
    try {
      const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        return { success: false, error: 'Invalid clipboard image data' };
      }

      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const outputDir = state.videoRenderer ? state.videoRenderer.getOutputDirectory() : path.join(APP_ROOT, 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, `pasted_image_${Date.now()}.${ext}`);
      fs.writeFileSync(filePath, buffer);
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
