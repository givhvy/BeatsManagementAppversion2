// BeatStars audio processing: scan folders, trim silence / convert to WAV via FFmpeg.
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function register() {
  // Scan audio files in folder
  ipcMain.handle('beatstars-scan-folder', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'Folder does not exist' };
      }

      const files = fs.readdirSync(folderPath);
      const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];

      const audioFiles = files
        .filter(file => audioExtensions.includes(path.extname(file).toLowerCase()))
        .map(file => {
          const ext = path.extname(file).toLowerCase();
          const stats = fs.statSync(path.join(folderPath, file));
          return {
            name: file,
            path: path.join(folderPath, file),
            format: ext.slice(1).toUpperCase(),
            size: stats.size,
            isWav: ext === '.wav'
          };
        });

      return {
        success: true,
        files: audioFiles,
        stats: {
          total: audioFiles.length,
          wav: audioFiles.filter(f => f.isWav).length,
          other: audioFiles.filter(f => !f.isWav).length
        }
      };
    } catch (error) {
      console.error('[Beatstars] Scan error:', error);
      return { success: false, error: error.message };
    }
  });

  // Process single audio file
  ipcMain.handle('beatstars-process-file', async (event, {
    inputPath,
    outputFolder,
    removeSilence,
    convertToWav,
    rename,
    silenceDb,
    silenceDuration
  }) => {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      const inputName = path.basename(inputPath);
      const inputExt = path.extname(inputPath).toLowerCase();
      let outputName = inputName;
      let outputExt = inputExt;

      // Rename logic: "Title - Artist.wav" -> "Artist.wav"
      if (rename) {
        const baseName = path.basename(inputPath, inputExt);
        if (baseName.includes(' - ')) {
          const parts = baseName.split(' - ');
          outputName = parts[parts.length - 1].trim() + (convertToWav ? '.wav' : inputExt);
        } else if (convertToWav && inputExt !== '.wav') {
          outputName = baseName + '.wav';
        }
      } else if (convertToWav && inputExt !== '.wav') {
        outputName = path.basename(inputPath, inputExt) + '.wav';
      }

      if (convertToWav) {
        outputExt = '.wav';
      }

      const outputPath = path.join(outputFolder || path.dirname(inputPath), outputName);

      // Check if ffmpeg is available
      try {
        await execPromise('ffmpeg -version');
      } catch (e) {
        return {
          success: false,
          error: 'FFmpeg not found. Please install FFmpeg and add it to PATH.'
        };
      }

      let ffmpegCmd = '';

      if (removeSilence) {
        // Use silenceremove filter to trim silence from start
        // silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB
        const silenceFilter = `silenceremove=start_periods=1:start_duration=${silenceDuration}:start_threshold=${silenceDb}dB`;

        if (convertToWav && inputExt !== '.wav') {
          // Remove silence AND convert to WAV
          ffmpegCmd = `ffmpeg -y -i "${inputPath}" -af "${silenceFilter}" -acodec pcm_s16le "${outputPath}"`;
        } else if (inputExt === '.wav' && outputExt === '.wav') {
          // Already WAV, just remove silence
          ffmpegCmd = `ffmpeg -y -i "${inputPath}" -af "${silenceFilter}" -acodec pcm_s16le "${outputPath}"`;
        } else {
          // Remove silence and keep format
          ffmpegCmd = `ffmpeg -y -i "${inputPath}" -af "${silenceFilter}" "${outputPath}"`;
        }
      } else if (convertToWav && inputExt !== '.wav') {
        // Just convert to WAV
        ffmpegCmd = `ffmpeg -y -i "${inputPath}" -acodec pcm_s16le "${outputPath}"`;
      } else if (rename && inputPath !== outputPath) {
        // Just copy file (keep original)
        fs.copyFileSync(inputPath, outputPath);

        return {
          success: true,
          inputPath,
          outputPath,
          originalName: inputName,
          newName: outputName,
          action: 'renamed'
        };
      } else {
        // Nothing to do
        return {
          success: true,
          inputPath,
          outputPath: inputPath,
          originalName: inputName,
          newName: inputName,
          action: 'skipped',
          message: 'No processing needed'
        };
      }

      // Execute ffmpeg command
      console.log('[Beatstars] Running:', ffmpegCmd);
      await execPromise(ffmpegCmd);

      // Keep original files - do not delete

      return {
        success: true,
        inputPath,
        outputPath,
        originalName: inputName,
        newName: outputName,
        action: removeSilence ? 'processed' : (convertToWav ? 'converted' : 'renamed')
      };

    } catch (error) {
      console.error('[Beatstars] Process error:', error);
      return {
        success: false,
        error: error.message,
        inputPath
      };
    }
  });

  // Get new name preview
  ipcMain.handle('beatstars-preview-name', async (event, { fileName, rename }) => {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);

    if (rename && baseName.includes(' - ')) {
      const parts = baseName.split(' - ');
      return parts[parts.length - 1].trim();
    }

    return baseName;
  });

  // Scan subfolders in a directory
  ipcMain.handle('beatstars-scan-subfolders', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'Folder does not exist' };
      }

      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];

      const folders = items
        .filter(item => item.isDirectory())
        .map(item => {
          const folderFullPath = path.join(folderPath, item.name);
          // Count audio files in folder
          let audioCount = 0;
          try {
            const folderItems = fs.readdirSync(folderFullPath);
            audioCount = folderItems.filter(f =>
              audioExtensions.includes(path.extname(f).toLowerCase())
            ).length;
          } catch (e) {
            // Ignore errors reading subfolders
          }
          return {
            name: item.name,
            path: folderFullPath,
            audioCount
          };
        })
        .filter(f => f.audioCount > 0) // Only show folders with audio files
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      return { success: true, folders };
    } catch (error) {
      console.error('[Beatstars] Scan subfolders error:', error);
      return { success: false, error: error.message };
    }
  });

  // Ensure output folder exists
  ipcMain.handle('beatstars-ensure-folder', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
