// Centralized filesystem paths and external locations used by the main process.
const path = require('path');

const APP_ROOT = path.join(__dirname, '..', '..');

module.exports = {
  APP_ROOT,

  // YouTube automation
  AUTOMATION_CONFIG_PATH: path.join(APP_ROOT, 'automation', 'config'),

  // Artist thumbnails (external drive)
  ARTIST_THUMBNAIL_ROOT: 'D:\\artistthumbnail',
  ARTIST_THUMBNAIL_DB: path.join('D:\\artistthumbnail', 'artist-thumbnails.json'),

  // Email accounts file (shared with the old BeatsManagement install)
  EMAIL_FILE_PATH: 'F:\\PlaygroundTest\\BeatsManagement\\email.txt',

  // Suno tagged pages folder
  SUNO_TAGGED_PATH: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged',

  // Marketing (Resend) config folder
  MARKETING_BASE: 'F:\\PlaygroundTest\\foronlytestingforbeatsmanagement',

  // Local Ollama install
  OLLAMA_EXE: path.join('F:', 'PlaygroundTest', 'foronlytestingforbeatsmanagement', 'ollama', 'ollama.exe'),
  OLLAMA_MODELS_PATH: path.join('F:', 'PlaygroundTest', 'foronlytestingforbeatsmanagement', 'ollama', 'models')
};
