// Registers every IPC module. Add new feature modules here.
const modules = [
  require('./window-controls'),
  require('./dialogs'),
  require('./library'),
  require('./gallery'),
  require('./artist-thumbnails'),
  require('./app-data'),
  require('./drumkit'),
  require('./flstudio'),
  require('./drag-drop'),
  require('./images'),
  require('./autovid'),
  require('./consistency'),
  require('./distro'),
  require('./money'),
  require('./customers'),
  require('./emails'),
  require('./youtube'),
  require('./automation'),
  require('./r2'),
  require('./beatstars'),
  require('./marketing'),
  require('./marketing-plans'),
  require('./ollama'),
  require('./ai-agent'),
  require('./background-music'),
  require('./midi')
];

function registerAll() {
  for (const mod of modules) {
    mod.register();
  }
}

module.exports = { registerAll };
