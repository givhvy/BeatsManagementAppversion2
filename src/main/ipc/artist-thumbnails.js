// Artist thumbnail packs (stored on D:\artistthumbnail).
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { ARTIST_THUMBNAIL_ROOT, ARTIST_THUMBNAIL_DB } = require('../paths');

function register() {
  ipcMain.handle('load-artist-thumbnail-data', async () => {
    try {
      fs.mkdirSync(ARTIST_THUMBNAIL_ROOT, { recursive: true });
      if (!fs.existsSync(ARTIST_THUMBNAIL_DB)) {
        const initial = { artistThumbnailPacks: [], selectedArtistPackId: null };
        fs.writeFileSync(ARTIST_THUMBNAIL_DB, JSON.stringify(initial, null, 2));
        return initial;
      }
      const raw = fs.readFileSync(ARTIST_THUMBNAIL_DB, 'utf8');
      return JSON.parse(raw.replace(/^﻿/, '').trim() || '{}');
    } catch (error) {
      console.error('load-artist-thumbnail-data error:', error);
      return { artistThumbnailPacks: [], selectedArtistPackId: null };
    }
  });

  ipcMain.handle('save-artist-thumbnail-data', async (event, payload) => {
    try {
      fs.mkdirSync(ARTIST_THUMBNAIL_ROOT, { recursive: true });
      fs.writeFileSync(ARTIST_THUMBNAIL_DB, JSON.stringify(payload, null, 2));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-artist-thumbnail-images', async (event, { imagePaths, artistName }) => {
    try {
      const sanitized = String(artistName || 'Artist').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').trim().slice(0, 80) || 'Artist';
      const artistFolder = path.join(ARTIST_THUMBNAIL_ROOT, sanitized);
      fs.mkdirSync(artistFolder, { recursive: true });
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const saved = [];
      for (const imagePath of imagePaths || []) {
        if (!imagePath || !fs.existsSync(imagePath)) continue;
        const ext = path.extname(imagePath).toLowerCase();
        if (!imageExtensions.includes(ext)) continue;
        const parsed = path.parse(imagePath);
        let targetPath = path.join(artistFolder, parsed.base);
        let counter = 1;
        while (fs.existsSync(targetPath)) {
          targetPath = path.join(artistFolder, `${parsed.name}-${counter}${parsed.ext}`);
          counter++;
        }
        fs.copyFileSync(imagePath, targetPath);
        saved.push({ name: path.basename(targetPath), path: targetPath });
      }
      return { success: true, saved };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
