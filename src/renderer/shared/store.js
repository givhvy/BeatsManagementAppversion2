import { create } from 'zustand';

// Global app store using Zustand for state management
export const useAppStore = create((set, get) => ({
  // Current active tab
  currentTab: 'beats',
  setCurrentTab: (tab) => set({ currentTab: tab }),

  // Beats state
  beats: [],
  packs: [],
  currentFolderType: 'all',
  currentFolder: '',
  folders: {
    all: { path: '', beats: [] },
    tagged: { path: '', beats: [] },
    untagged: { path: '', beats: [] },
  },
  
  setBeats: (beats) => set({ beats }),
  setPacks: (packs) => set({ packs }),
  setCurrentFolderType: (type) => set({ currentFolderType: type }),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  updateFolder: (type, data) => set((state) => ({
    folders: {
      ...state.folders,
      [type]: { ...state.folders[type], ...data }
    }
  })),

  // Create/AutoVid state
  selectedImage: null,
  selectedImagePath: null,
  selectedAudioPath: null,
  isRendering: false,
  lastOutputPath: null,

  setSelectedImage: (image) => set({ selectedImage: image }),
  setSelectedImagePath: (path) => set({ selectedImagePath: path }),
  setSelectedAudioPath: (path) => set({ selectedAudioPath: path }),
  setIsRendering: (isRendering) => set({ isRendering }),
  setLastOutputPath: (path) => set({ lastOutputPath: path }),

  // Reset workspace
  resetWorkspace: () => set({
    selectedImage: null,
    selectedImagePath: null,
    selectedAudioPath: null,
    lastOutputPath: null,
  }),

  // YouTube/Uploader state
  channels: [],
  uploadQueue: [],
  uploadHistory: [],
  serverOnline: false,

  setChannels: (channels) => set({ channels }),
  setUploadQueue: (queue) => set({ uploadQueue: queue }),
  setUploadHistory: (history) => set({ uploadHistory: history }),
  setServerOnline: (online) => set({ serverOnline: online }),

  // Load data from Electron
  loadData: async () => {
    if (window.electron) {
      const data = await window.electron.ipcRenderer.invoke('load-data');
      if (data) {
        set({
          beats: data.beats || [],
          packs: data.packs || [],
          folders: data.folders || get().folders,
        });
      }
    }
  },

  // Save data to Electron
  saveData: async () => {
    if (window.electron) {
      const state = get();
      await window.electron.ipcRenderer.invoke('save-data', {
        beats: state.beats,
        packs: state.packs,
        folders: state.folders,
      });
    }
  },
}));
