// Electron API bridge
// This provides a clean interface to Electron IPC

const isElectron = typeof window !== 'undefined' && window.electron;

export const electron = {
  isElectron,

  // File system operations
  selectFolder: async () => {
    if (!isElectron) return null;
    return await window.electron.ipcRenderer.invoke('select-folder');
  },

  selectImage: async () => {
    if (!isElectron) return null;
    return await window.electron.ipcRenderer.invoke('select-image');
  },

  selectAudioFile: async () => {
    if (!isElectron) return null;
    return await window.electron.ipcRenderer.invoke('select-audio-file');
  },

  readBeatsFolder: async (folderPath) => {
    if (!isElectron) return [];
    return await window.electron.ipcRenderer.invoke('read-beats-folder', folderPath);
  },

  readFolderContents: async (folderPath) => {
    if (!isElectron) return { folders: [], beats: [] };
    return await window.electron.ipcRenderer.invoke('read-folder-contents', folderPath);
  },

  readImagesFolder: async (folderPath) => {
    if (!isElectron) return [];
    return await window.electron.ipcRenderer.invoke('read-images-folder', folderPath);
  },

  // Data persistence
  saveData: async (data) => {
    if (!isElectron) return false;
    return await window.electron.ipcRenderer.invoke('save-data', data);
  },

  loadData: async () => {
    if (!isElectron) return null;
    return await window.electron.ipcRenderer.invoke('load-data');
  },

  // Video rendering
  renderVideo: async (options) => {
    if (!isElectron) return { success: false, error: 'Not in Electron' };
    return await window.electron.ipcRenderer.invoke('render-video', options);
  },

  getVideoOutputDir: async () => {
    if (!isElectron) return '';
    return await window.electron.ipcRenderer.invoke('get-video-output-dir');
  },

  downloadImage: async (imageUrl, savePath) => {
    if (!isElectron) return { success: false };
    return await window.electron.ipcRenderer.invoke('download-image', imageUrl, savePath);
  },

  // Utility
  openFolder: async (folderPath) => {
    if (!isElectron) return { success: false };
    return await window.electron.ipcRenderer.invoke('open-folder', folderPath);
  },

  revealInExplorer: async (filePath) => {
    if (!isElectron) return { success: false };
    return await window.electron.ipcRenderer.invoke('reveal-in-explorer', filePath);
  },

  // Drag and drop
  startDrag: (files, beatName) => {
    if (!isElectron) return;
    window.electron.ipcRenderer.send('drag-files-start', { files, beatName });
  },

  // Events
  onRenderProgress: (callback) => {
    if (!isElectron) return () => {};
    window.electron.ipcRenderer.on('render-progress', (event, progress) => {
      callback(progress);
    });
    return () => {
      window.electron.ipcRenderer.removeAllListeners('render-progress');
    };
  },
};
