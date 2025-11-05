// Check if running in Electron or browser
const isElectron = typeof require !== 'undefined' && typeof require('electron') !== 'undefined';
const ipcRenderer = isElectron ? require('electron').ipcRenderer : null;

// State
let folders = {
  all: { path: 'D:\\Beats', beats: [], basePath: 'D:\\Beats', currentPath: 'D:\\Beats' },
  tagged: {
    path: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs',
    beats: [],
    basePath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs',
    currentPath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs'
  },
  untagged: {
    path: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged',
    beats: [],
    basePath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged',
    currentPath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\tagged'
  }
};
let currentFolderType = 'all'; // 'all', 'tagged', or 'untagged'
let packs = [];
let fileObjectsCache = new Map(); // Cache file objects by path

// Channel management state
let emails = []; // List of {email, password, used}
let channels = []; // List of created channels
let pageFolders = []; // List of page folders with tags
let folderTags = {}; // Map folder paths to channel tags

// Helper function to get current folder
function getCurrentFolder() {
  return folders[currentFolderType].currentPath || folders[currentFolderType].path;
}

function getBasePath() {
  return folders[currentFolderType].basePath || folders[currentFolderType].path;
}

function getCurrentBeats() {
  return folders[currentFolderType].beats;
}

function setCurrentBeats(beats) {
  folders[currentFolderType].beats = beats;
}

function setCurrentPath(path) {
  folders[currentFolderType].currentPath = path;
}

// DOM Elements
const selectFolderBtn = document.getElementById('select-folder-btn');
const refreshBeatsBtn = document.getElementById('refresh-beats-btn');
const createPackBtn = document.getElementById('create-pack-btn');
const folderPathEl = document.getElementById('folder-path');
const beatsListEl = document.getElementById('beats-list');
const packsGridEl = document.getElementById('packs-grid');
const filterInput = document.getElementById('filter-input');
const filterContainer = document.getElementById('filter-container');
const packFilterInput = document.getElementById('pack-filter-input');
const tabButtons = document.querySelectorAll('.tab-btn');
const breadcrumbContainer = document.getElementById('breadcrumb-container');
const breadcrumbEl = document.getElementById('breadcrumb');

// Resize handle elements
const resizeHandle = document.getElementById('resize-handle');
const leftPanel = document.querySelector('.left-panel');

const databaseInfoBtn = document.getElementById('database-info-btn');
const databaseModal = document.getElementById('database-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const dbPathDisplay = document.getElementById('db-path-display');
const copyPathBtn = document.getElementById('copy-path-btn');
const exportDbBtn = document.getElementById('export-db-btn');
const importDbBtn = document.getElementById('import-db-btn');

// Context menu elements
const beatContextMenu = document.getElementById('beat-context-menu');
const markLastUsedBtn = document.getElementById('mark-last-used');
const unmarkLastUsedBtn = document.getElementById('unmark-last-used');

// Pack detail panel elements
const middlePanelEl = document.getElementById('middle-panel');
const rightPanelEl = document.getElementById('right-panel');
const backToPacksBtn = document.getElementById('back-to-packs-btn');
const packDetailTitleEl = document.getElementById('pack-detail-title');
const packDetailCountEl = document.getElementById('pack-detail-count');
const packDetailBeatsEl = document.getElementById('pack-detail-beats');
const deleteCurrentPackBtn = document.getElementById('delete-current-pack-btn');
const toggleHidePackBtn = document.getElementById('toggle-hide-pack-btn');

// Hidden packs view elements
const toggleHiddenViewBtn = document.getElementById('toggle-hidden-view-btn');
const packsHeaderTitle = document.getElementById('packs-header-title');

// Total beats elements
const totalBeatsCountEl = document.getElementById('total-beats-count');
const totalBeatsProgressFillEl = document.getElementById('total-beats-progress-fill');

// Channel management elements
const channelManagementEl = document.getElementById('channel-management');
const createChannelsBtn = document.getElementById('create-channels-btn');
const autoAddChannelBtn = document.getElementById('auto-add-channel-btn');
const addEmailBtn = document.getElementById('add-email-btn');
const totalChannelsEl = document.getElementById('total-channels');
const availableEmailsEl = document.getElementById('available-emails');
const usedFoldersEl = document.getElementById('used-folders');
const createChannelsModal = document.getElementById('create-channels-modal');
const closeChannelsModalBtn = document.getElementById('close-channels-modal-btn');
const numChannelsInput = document.getElementById('num-channels-input');
const beatsPerChannelInput = document.getElementById('beats-per-channel-input');
const confirmCreateChannelsBtn = document.getElementById('confirm-create-channels-btn');
const cancelCreateChannelsBtn = document.getElementById('cancel-create-channels-btn');

// Add email modal elements
const addEmailModal = document.getElementById('add-email-modal');
const closeAddEmailModalBtn = document.getElementById('close-add-email-modal-btn');
const bulkEmailInput = document.getElementById('bulk-email-input');
const confirmAddEmailBtn = document.getElementById('confirm-add-email-btn');
const cancelAddEmailBtn = document.getElementById('cancel-add-email-btn');

// View emails modal elements
const viewEmailsBtn = document.getElementById('view-emails-btn');
const viewEmailsModal = document.getElementById('view-emails-modal');
const closeViewEmailsModalBtn = document.getElementById('close-view-emails-modal-btn');
const emailsListContainer = document.getElementById('emails-list-container');
const filterAllEmailsBtn = document.getElementById('filter-all-emails-btn');
const filterAvailableEmailsBtn = document.getElementById('filter-available-emails-btn');
const filterUsedEmailsBtn = document.getElementById('filter-used-emails-btn');
const countAllEl = document.getElementById('count-all');
const countAvailableEl = document.getElementById('count-available');
const countUsedEl = document.getElementById('count-used');

let currentEmailFilter = 'all'; // 'all', 'available', 'used'

let currentPackId = null;
let showingHiddenPacks = false; // Track if viewing hidden or active packs

// Context menu state
let contextMenuTarget = null; // Stores {packId, beatPath}

// Audio Player Elements
const audioElement = document.getElementById('audio-element');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const nowPlayingEl = document.getElementById('now-playing');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const progressBar = document.getElementById('progress-bar');
const volumeSlider = document.getElementById('volume-slider');

// Audio State
let currentBeat = null;
let isPlaying = false;

// Initialize
init();

async function init() {
  // Load saved data
  if (isElectron) {
    const savedData = await ipcRenderer.invoke('load-data');
    if (savedData) {
      // Load folders if available, otherwise use defaults
      if (savedData.folders) {
        folders = savedData.folders;
      }
      if (savedData.currentFolderType) {
        currentFolderType = savedData.currentFolderType;
      }
      packs = savedData.packs || [];

      // Update UI for current folder
      updateFolderDisplay();

      // Load beats for current folder
      await loadBeats(getCurrentFolder());

      renderPacks();
    } else {
      // First time - load default folder
      updateFolderDisplay();
      await loadBeats(getCurrentFolder());
    }
  } else {
    // Browser mode - load from localStorage
    const savedData = localStorage.getItem('beats-data');
    if (savedData) {
      const data = JSON.parse(savedData);
      if (data.folders) {
        folders = data.folders;
      }
      if (data.currentFolderType) {
        currentFolderType = data.currentFolderType;
      }
      packs = data.packs || [];

      updateFolderDisplay();
      renderPacks();
    }
  }

  // Event listeners
  selectFolderBtn.addEventListener('click', selectFolder);
  refreshBeatsBtn.addEventListener('click', refreshBeats);
  createPackBtn.addEventListener('click', createPack);
  filterInput.addEventListener('input', renderBeats);
  packFilterInput.addEventListener('input', renderPacks);
  backToPacksBtn.addEventListener('click', showPacksGrid);
  deleteCurrentPackBtn.addEventListener('click', deleteCurrentPack);
  toggleHidePackBtn.addEventListener('click', toggleCurrentPackHidden);
  toggleHiddenViewBtn.addEventListener('click', toggleHiddenPacksView);

  // Tab button listeners
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const folderType = btn.getAttribute('data-folder-type');
      switchFolder(folderType);
    });
  });

  // Database modal listeners
  databaseInfoBtn.addEventListener('click', showDatabaseInfo);
  closeModalBtn.addEventListener('click', closeDatabaseModal);
  copyPathBtn.addEventListener('click', copyDatabasePath);
  exportDbBtn.addEventListener('click', exportDatabase);
  importDbBtn.addEventListener('click', importDatabase);

  // Close modal when clicking outside
  databaseModal.addEventListener('click', (e) => {
    if (e.target === databaseModal) {
      closeDatabaseModal();
    }
  });

  packDetailTitleEl.addEventListener('input', (e) => {
    if (currentPackId) {
      const pack = packs.find(p => p.id === currentPackId);
      if (pack) {
        pack.name = e.target.value;
        renderPacks();
        renderBeats(); // Update beats list to reflect new pack name in tags
        saveData();
      }
    }
  });

  // Context menu event listeners
  markLastUsedBtn.addEventListener('click', () => {
    if (contextMenuTarget) {
      markBeatAsLastUsed(contextMenuTarget.packId, contextMenuTarget.beatPath);
    }
    hideContextMenu();
  });

  unmarkLastUsedBtn.addEventListener('click', () => {
    if (contextMenuTarget) {
      unmarkBeatAsLastUsed(contextMenuTarget.packId, contextMenuTarget.beatPath);
    }
    hideContextMenu();
  });

  // Hide context menu when clicking anywhere
  document.addEventListener('click', () => {
    hideContextMenu();
  });

  // Prevent context menu from closing when clicking inside it
  beatContextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Audio player event listeners
  setupAudioPlayer();

  // Channel management listeners
  createChannelsBtn.addEventListener('click', showCreateChannelsModal);
  autoAddChannelBtn.addEventListener('click', autoAddChannel);
  closeChannelsModalBtn.addEventListener('click', closeCreateChannelsModal);
  cancelCreateChannelsBtn.addEventListener('click', closeCreateChannelsModal);
  confirmCreateChannelsBtn.addEventListener('click', createChannels);

  // Close channel modal when clicking outside
  createChannelsModal.addEventListener('click', (e) => {
    if (e.target === createChannelsModal) {
      closeCreateChannelsModal();
    }
  });

  // Add email modal listeners
  addEmailBtn.addEventListener('click', showAddEmailModal);
  closeAddEmailModalBtn.addEventListener('click', closeAddEmailModal);
  cancelAddEmailBtn.addEventListener('click', closeAddEmailModal);
  confirmAddEmailBtn.addEventListener('click', addNewEmail);

  // Close add email modal when clicking outside
  addEmailModal.addEventListener('click', (e) => {
    if (e.target === addEmailModal) {
      closeAddEmailModal();
    }
  });

  // View emails modal listeners
  viewEmailsBtn.addEventListener('click', showViewEmailsModal);
  closeViewEmailsModalBtn.addEventListener('click', closeViewEmailsModal);
  filterAllEmailsBtn.addEventListener('click', () => filterEmails('all'));
  filterAvailableEmailsBtn.addEventListener('click', () => filterEmails('available'));
  filterUsedEmailsBtn.addEventListener('click', () => filterEmails('used'));

  // Close view emails modal when clicking outside
  viewEmailsModal.addEventListener('click', (e) => {
    if (e.target === viewEmailsModal) {
      closeViewEmailsModal();
    }
  });

  // Load emails and page folders for channel management
  if (isElectron) {
    await loadChannelData();
  }

  // Setup resize functionality
  setupResizeHandle();
}

// Resize handle functionality
function setupResizeHandle() {
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = leftPanel.offsetWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;

    // Apply min/max width constraints (250px - 800px)
    const constrainedWidth = Math.max(250, Math.min(800, newWidth));
    leftPanel.style.width = `${constrainedWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

function showPacksGrid() {
  currentPackId = null;
  middlePanelEl.style.display = 'flex';
  rightPanelEl.style.display = 'none';
}

function showPackDetail(packId) {
  currentPackId = packId;
  const pack = packs.find(p => p.id === packId);
  if (!pack) return;

  middlePanelEl.style.display = 'none';
  rightPanelEl.style.display = 'flex';

  packDetailTitleEl.value = pack.name;
  packDetailCountEl.textContent = `${pack.beats.length} beats`;

  // Update hide/unhide button text based on pack status
  toggleHidePackBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';

  renderPackDetailBeats();
}

function renderPackDetailBeats() {
  packDetailBeatsEl.innerHTML = '';

  const pack = packs.find(p => p.id === currentPackId);
  if (!pack) return;

  if (pack.beats.length === 0) {
    packDetailBeatsEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No beats in this pack yet. Drag beats from the left panel to add them.</div>';
    return;
  }

  pack.beats.forEach((beat, index) => {
    const beatItemEl = createPackBeatElement(beat, currentPackId, index);
    packDetailBeatsEl.appendChild(beatItemEl);
  });

  // Add drag over events to the detail beats container
  packDetailBeatsEl.addEventListener('dragover', handleDragOver);
  packDetailBeatsEl.addEventListener('dragleave', handleDragLeave);
  packDetailBeatsEl.addEventListener('drop', (e) => handleDrop(e, currentPackId));
}

function deleteCurrentPack() {
  if (currentPackId && confirm('Are you sure you want to delete this pack?')) {
    packs = packs.filter(p => p.id !== currentPackId);
    showPacksGrid();
    renderPacks();
    renderBeats(); // Update beats list to remove deleted pack tags
    saveData();
  }
}

function toggleCurrentPackHidden() {
  if (!currentPackId) return;

  const pack = packs.find(p => p.id === currentPackId);
  if (!pack) return;

  // Toggle hidden status
  pack.hidden = !pack.hidden;

  // Update button text
  toggleHidePackBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';

  // Save and update UI
  saveData();

  // If we just hid a pack and we're viewing active packs, or unhid a pack while viewing hidden packs,
  // go back to packs grid as the pack won't be visible in current view
  if ((pack.hidden && !showingHiddenPacks) || (!pack.hidden && showingHiddenPacks)) {
    showPacksGrid();
    renderPacks();
  }
}

function toggleHiddenPacksView() {
  showingHiddenPacks = !showingHiddenPacks;

  // Update UI
  if (showingHiddenPacks) {
    toggleHiddenViewBtn.innerHTML = '👁️ Active';
    toggleHiddenViewBtn.title = 'View Active Packs';
    packsHeaderTitle.textContent = 'Hidden Packs';
  } else {
    toggleHiddenViewBtn.innerHTML = '👁️ Hidden';
    toggleHiddenViewBtn.title = 'View Hidden Packs';
    packsHeaderTitle.textContent = 'Packs';
  }

  // Re-render packs with new filter
  renderPacks();
}

function setupAudioPlayer() {
  // Set initial volume
  audioElement.volume = 0.7;

  // Play/Pause button
  playPauseBtn.addEventListener('click', togglePlayPause);

  // Audio events
  audioElement.addEventListener('loadedmetadata', () => {
    durationTimeEl.textContent = formatTime(audioElement.duration);
    progressBar.max = Math.floor(audioElement.duration);
    progressBar.disabled = false;
  });

  audioElement.addEventListener('timeupdate', () => {
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
    progressBar.value = Math.floor(audioElement.currentTime);
  });

  audioElement.addEventListener('ended', () => {
    isPlaying = false;
    playIcon.textContent = '▶';
    updatePlayingState();
  });

  audioElement.addEventListener('play', () => {
    isPlaying = true;
    playIcon.textContent = '❚❚';
  });

  audioElement.addEventListener('pause', () => {
    isPlaying = false;
    playIcon.textContent = '▶';
  });

  // Progress bar
  progressBar.addEventListener('input', (e) => {
    audioElement.currentTime = e.target.value;
  });

  // Volume slider
  volumeSlider.addEventListener('input', (e) => {
    audioElement.volume = e.target.value / 100;
  });
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function playBeat(beatPath, beatName) {
  currentBeat = { path: beatPath, name: beatName };
  audioElement.src = beatPath;
  audioElement.play();
  // Remove file extension from display name
  const displayName = beatName.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
  nowPlayingEl.textContent = displayName;
  playPauseBtn.disabled = false;
  updatePlayingState();
}

function togglePlayPause() {
  if (isPlaying) {
    audioElement.pause();
  } else {
    audioElement.play();
  }
}

function updatePlayingState() {
  // Remove playing class from all beats
  document.querySelectorAll('.beat-item, .pack-beat-item').forEach(el => {
    el.classList.remove('playing');
  });

  // Add playing class to current beat
  if (currentBeat) {
    document.querySelectorAll('.beat-item, .pack-beat-item').forEach(el => {
      const beatPath = el.dataset.beatPath || el.querySelector('span')?.textContent;
      if (beatPath === currentBeat.path || beatPath === currentBeat.name) {
        if (isPlaying) {
          el.classList.add('playing');
        }
      }
    });
  }
}

// Update folder display based on current folder type
function updateFolderDisplay() {
  folderPathEl.textContent = getCurrentFolder();

  // Update active tab button
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-folder-type') === currentFolderType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show/hide breadcrumb for tagged/untagged only
  if (currentFolderType === 'tagged' || currentFolderType === 'untagged') {
    breadcrumbContainer.style.display = 'block';
    renderBreadcrumb();
  } else {
    breadcrumbContainer.style.display = 'none';
  }

  // Show channel management only for "untagged" (Tagged Beats) tab
  if (currentFolderType === 'untagged') {
    channelManagementEl.style.display = 'block';
    updateChannelStats();
  } else {
    channelManagementEl.style.display = 'none';
  }

  // Hide filter for "untagged" (Tagged Beats) tab
  if (currentFolderType === 'untagged') {
    filterContainer.style.display = 'none';
  } else {
    filterContainer.style.display = 'block';
  }
}

// Render breadcrumb navigation
function renderBreadcrumb() {
  const basePath = getBasePath();
  const currentPath = getCurrentFolder();

  breadcrumbEl.innerHTML = '';

  // Get path segments relative to base path
  const relativePath = currentPath.replace(basePath, '').replace(/^[\\\/]/, '');
  const segments = relativePath ? relativePath.split(/[\\\/]/) : [];

  // Add root (base folder name)
  const basePathSegments = basePath.split(/[\\\/]/);
  const baseName = basePathSegments[basePathSegments.length - 1];

  const rootItem = document.createElement('span');
  rootItem.className = segments.length === 0 ? 'breadcrumb-current' : 'breadcrumb-item';
  rootItem.textContent = baseName;
  if (segments.length > 0) {
    rootItem.onclick = () => navigateToPath(basePath);
  }
  breadcrumbEl.appendChild(rootItem);

  // Add subsequent path segments
  let builtPath = basePath;
  segments.forEach((segment, index) => {
    const separator = document.createElement('span');
    separator.className = 'breadcrumb-separator';
    separator.textContent = ' › ';
    breadcrumbEl.appendChild(separator);

    builtPath += `\\${segment}`;
    const item = document.createElement('span');
    item.className = index === segments.length - 1 ? 'breadcrumb-current' : 'breadcrumb-item';
    item.textContent = segment;

    if (index < segments.length - 1) {
      const pathToNavigate = builtPath;
      item.onclick = () => navigateToPath(pathToNavigate);
    }

    breadcrumbEl.appendChild(item);
  });
}

// Navigate to a specific path in breadcrumb
async function navigateToPath(targetPath) {
  setCurrentPath(targetPath);
  await loadFolderContents(targetPath);
  updateFolderDisplay();
  await saveData();
}

// Switch between different folder types
async function switchFolder(folderType) {
  if (folderType === currentFolderType) return;

  currentFolderType = folderType;

  // Reset to base path when switching tabs
  const basePath = getBasePath();
  setCurrentPath(basePath);

  updateFolderDisplay();

  // Load beats/folders based on type
  if (folderType === 'tagged' || folderType === 'untagged') {
    await loadFolderContents(getCurrentFolder());
  } else {
    await loadBeats(getCurrentFolder());
  }

  // Save the current folder type
  await saveData();
}

// Load folder contents (folders + beats) for tagged/untagged tabs
async function loadFolderContents(folderPath) {
  if (isElectron) {
    const { folders: subFolders, beats } = await ipcRenderer.invoke('read-folder-contents', folderPath);

    // Store both folders and beats
    const allItems = [...subFolders, ...beats];
    setCurrentBeats(allItems);
    renderBeats();
  }
}

async function selectFolder() {
  if (isElectron) {
    const folderPath = await ipcRenderer.invoke('select-folder');
    if (folderPath) {
      folders[currentFolderType].path = folderPath;
      folderPathEl.textContent = folderPath;
      await loadBeats(folderPath);
      await saveData();
    }
  } else {
    // Browser mode - use file input
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.accept = 'audio/*';

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        folders[currentFolderType].path = 'Selected Files';
        folderPathEl.textContent = `${files.length} audio files selected`;

        const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
        const beats = files
          .filter(file => audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))
          .map(file => {
            const blobUrl = URL.createObjectURL(file);
            // Cache file object
            fileObjectsCache.set(blobUrl, file);
            return {
              name: file.name,
              path: blobUrl,
              file: file // Store file object for drag
            };
          });

        setCurrentBeats(beats);
        renderBeats();
        await saveData();
      }
    };

    input.click();
  }
}

async function loadBeats(folderPath) {
  if (isElectron) {
    const beats = await ipcRenderer.invoke('read-beats-folder', folderPath);
    setCurrentBeats(beats);
    renderBeats();
  }
}

async function refreshBeats() {
  const currentFolder = getCurrentFolder();
  if (!currentFolder) {
    alert('Please select a folder first');
    return;
  }

  if (isElectron) {
    // Reload beats from the current folder
    await loadBeats(currentFolder);
  } else {
    // Browser mode - need to reselect files
    alert('In browser mode, please use "Select Folder" to reload files');
  }
}

function extractNumber(filename) {
  // Extract number from filename (e.g., "1.mp3" -> 1, "Beat 2.wav" -> 2)
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[0]) : null;
}

function sortBeatsByNumber(beats) {
  // Sort beats by number in descending order (high to low)
  return beats.slice().sort((a, b) => {
    const numA = extractNumber(a.name);
    const numB = extractNumber(b.name);

    // If both have numbers, sort by number (descending)
    if (numA !== null && numB !== null) {
      return numB - numA;
    }

    // If only one has a number, put the one with number first
    if (numA !== null) return -1;
    if (numB !== null) return 1;

    // If neither has a number, sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

// Helper function to find which packs contain a beat
function getPacksForBeat(beatPath) {
  return packs.filter(pack =>
    pack.beats.some(b => b.path === beatPath)
  );
}

// Helper function to format pack name as tag (returns full pack name)
function formatPackTag(packName) {
  return packName;
}

function renderBeats() {
  beatsListEl.innerHTML = '';

  const allItems = getCurrentBeats();

  if (allItems.length === 0) {
    beatsListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No beats found in this folder</div>';
    return;
  }

  // Get filter value
  const filterValue = filterInput.value.trim();

  // Separate folders and beats
  const folders = allItems.filter(item => item.type === 'folder');
  let beats = allItems.filter(item => item.type === 'beat' || !item.type);

  // Filter beats by number if filter is provided
  if (filterValue) {
    beats = beats.filter(beat => {
      const num = extractNumber(beat.name);
      return num !== null && num.toString() === filterValue;
    });
  }

  // Sort beats by number (high to low)
  const sortedBeats = sortBeatsByNumber(beats);

  // Render folders first (for tagged/untagged tabs)
  if (currentFolderType === 'tagged' || currentFolderType === 'untagged') {
    folders.forEach(folder => {
      const folderEl = document.createElement('div');
      folderEl.className = 'folder-item';

      const iconEl = document.createElement('span');
      iconEl.className = 'folder-icon';
      iconEl.textContent = '📁';

      const nameEl = document.createElement('div');
      nameEl.className = 'folder-name';
      nameEl.textContent = folder.name;

      folderEl.appendChild(iconEl);
      folderEl.appendChild(nameEl);
      beatsListEl.appendChild(folderEl);

      // Click to navigate into folder
      folderEl.addEventListener('click', async () => {
        setCurrentPath(folder.path);
        await loadFolderContents(folder.path);
        updateFolderDisplay();
        await saveData();
      });
    });
  }

  if (sortedBeats.length === 0 && folders.length === 0) {
    beatsListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No items match the filter</div>';
    return;
  }

  // Render beats
  sortedBeats.forEach(beat => {
    const beatEl = document.createElement('div');
    beatEl.className = 'beat-item';
    beatEl.draggable = true;
    beatEl.dataset.beatPath = beat.path;
    beatEl.dataset.beatName = beat.name;

    // Create container for beat name and tags
    const beatContentEl = document.createElement('div');
    beatContentEl.className = 'beat-content';

    const beatNameEl = document.createElement('div');
    beatNameEl.className = 'beat-name';
    // Remove file extension from display name
    const displayName = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
    beatNameEl.textContent = displayName;

    beatContentEl.appendChild(beatNameEl);

    // Find packs containing this beat and add tags
    const containingPacks = getPacksForBeat(beat.path);

    // Also check if this beat's folder is tagged with a channel (for Tagged Beats tab)
    let folderChannelTag = null;
    if (currentFolderType === 'untagged') {
      // Get parent folder of this beat
      const beatFolder = beat.path.substring(0, beat.path.lastIndexOf('\\'));
      folderChannelTag = folderTags[beatFolder];
    }

    if (containingPacks.length > 0 || folderChannelTag) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'beat-tags';

      // Add pack tags
      containingPacks.forEach(pack => {
        const tag = document.createElement('span');
        tag.className = 'pack-tag';
        tag.textContent = formatPackTag(pack.name);
        tagsContainer.appendChild(tag);
      });

      // Add folder channel tag if exists
      if (folderChannelTag) {
        const tag = document.createElement('span');
        tag.className = 'pack-tag';
        tag.textContent = folderChannelTag;
        tagsContainer.appendChild(tag);
      }

      beatContentEl.appendChild(tagsContainer);
    }

    beatEl.appendChild(beatContentEl);
    beatsListEl.appendChild(beatEl);

    // Click to play
    beatEl.addEventListener('click', (e) => {
      // Don't play if dragging
      if (e.target.classList.contains('dragging')) return;
      playBeat(beat.path, beat.name);
    });

    // Drag events for moving to packs (internal) and external drag
    beatEl.addEventListener('dragstart', (e) => {
      // For internal drag to packs
      draggedBeat = {
        name: beat.name,
        path: beat.path,
        file: beat.file // Include file object for browser mode
      };
      e.target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';

      // For external drag to desktop/Chrome/Filmora
      if (isElectron) {
        // Use file:// protocol for Electron drag out
        e.dataTransfer.setData('text/uri-list', 'file:///' + beat.path.replace(/\\/g, '/'));
        e.dataTransfer.setData('text/plain', beat.path);
      } else if (beat.file) {
        // Browser mode - add file to drag
        e.dataTransfer.items.add(beat.file);
      }
    });
    beatEl.addEventListener('dragend', handleDragEnd);
  });
}

function createPack() {
  const pack = {
    id: Date.now().toString(),
    name: 'New Pack',
    beats: [],
    thumbnail: null // Add thumbnail field
  };

  packs.push(pack);
  renderPacks();
  saveData();
}

// Helper function to extract pack number from name (e.g., "C2 - Boom Bap" -> 2)
function extractPackNumber(packName) {
  const match = packName.match(/[cC]?(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// Helper function to sort packs by number (ascending order)
function sortPacksByNumber(packs) {
  return packs.slice().sort((a, b) => {
    const numA = extractPackNumber(a.name);
    const numB = extractPackNumber(b.name);

    if (numA !== null && numB !== null) {
      return numA - numB; // Ascending order (C1, C2, C3...)
    }
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return a.name.localeCompare(b.name);
  });
}

function updateTotalBeatsCounter() {
  // Calculate total beats across all packs
  const totalBeats = packs.reduce((sum, pack) => sum + pack.beats.length, 0);
  const goal = 20000;
  const percentage = Math.min((totalBeats / goal) * 100, 100);

  // Update text
  totalBeatsCountEl.textContent = `${totalBeats}/${goal}`;

  // Update progress bar
  totalBeatsProgressFillEl.style.width = `${percentage}%`;
}

function renderPacks() {
  packsGridEl.innerHTML = '';

  // Update total beats counter
  updateTotalBeatsCounter();

  // Update channel stats
  if (currentFolderType === 'untagged') {
    updateChannelStats();
  }

  if (packs.length === 0) {
    packsGridEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; grid-column: 1/-1;">No packs yet. Create one to organize your beats!</div>';
    return;
  }

  // Filter by hidden status based on view mode
  let visiblePacks = packs.filter(pack => {
    const isHidden = pack.hidden === true;
    return showingHiddenPacks ? isHidden : !isHidden;
  });

  // Get filter value
  const filterValue = packFilterInput.value.trim().toLowerCase();

  // Filter packs by number if filter is provided
  let filteredPacks = visiblePacks;
  if (filterValue) {
    filteredPacks = visiblePacks.filter(pack => {
      const num = extractPackNumber(pack.name);
      // Support both "C2" and "2" formats
      const filterNum = extractPackNumber(filterValue);
      return num !== null && num === filterNum;
    });
  }

  // Sort filtered packs by number (ascending order)
  const sortedPacks = sortPacksByNumber(filteredPacks);

  if (sortedPacks.length === 0) {
    const message = showingHiddenPacks
      ? 'No hidden packs yet'
      : (filterValue ? 'No packs match the filter' : 'No active packs');
    packsGridEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #999; grid-column: 1/-1;">${message}</div>`;
    return;
  }

  sortedPacks.forEach(pack => {
    const packCardEl = createPackCard(pack);
    packsGridEl.appendChild(packCardEl);
  });
}

function createPackCard(pack) {
  const packCardEl = document.createElement('div');
  packCardEl.className = 'pack-card';
  packCardEl.dataset.packId = pack.id;

  // Pack image/thumbnail
  const imageEl = document.createElement('div');
  imageEl.className = 'pack-card-image';

  // Show thumbnail image if available, otherwise show default icon
  if (pack.thumbnail) {
    const img = document.createElement('img');
    img.src = pack.thumbnail;
    img.alt = pack.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    imageEl.appendChild(img);
  } else {
    imageEl.innerHTML = '🎵';
  }

  // Beat count badge on image
  const countBadge = document.createElement('div');
  countBadge.className = 'pack-card-count';
  countBadge.textContent = pack.beats.length;
  imageEl.appendChild(countBadge);

  // Add thumbnail button overlay
  const thumbnailBtn = document.createElement('button');
  thumbnailBtn.className = 'pack-thumbnail-btn';
  thumbnailBtn.innerHTML = '📷';
  thumbnailBtn.title = 'Change thumbnail';
  thumbnailBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Don't trigger pack detail view
    selectThumbnail(pack.id);
  });
  imageEl.appendChild(thumbnailBtn);

  // Pack info
  const infoEl = document.createElement('div');
  infoEl.className = 'pack-card-info';

  const titleEl = document.createElement('div');
  titleEl.className = 'pack-card-title';
  titleEl.textContent = pack.name;

  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'pack-card-subtitle';
  subtitleEl.textContent = pack.beats.length === 1 ? '1 beat' : `${pack.beats.length} beats`;

  // Progress bar (goal: 40 beats)
  const progressContainer = document.createElement('div');
  progressContainer.className = 'pack-progress-container';

  const progressBar = document.createElement('div');
  progressBar.className = 'pack-progress-bar';

  const progressFill = document.createElement('div');
  progressFill.className = 'pack-progress-fill';
  const progressPercent = Math.min((pack.beats.length / 40) * 100, 100);
  progressFill.style.width = `${progressPercent}%`;

  progressBar.appendChild(progressFill);

  const progressText = document.createElement('div');
  progressText.className = 'pack-progress-text';
  progressText.textContent = `${pack.beats.length}/40`;

  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressText);

  infoEl.appendChild(titleEl);
  infoEl.appendChild(subtitleEl);
  infoEl.appendChild(progressContainer);

  packCardEl.appendChild(imageEl);
  packCardEl.appendChild(infoEl);

  // Click to open pack detail
  packCardEl.addEventListener('click', () => showPackDetail(pack.id));

  // Drop zone events
  packCardEl.addEventListener('dragover', handleDragOver);
  packCardEl.addEventListener('dragleave', handleDragLeave);
  packCardEl.addEventListener('drop', (e) => handleDrop(e, pack.id));

  return packCardEl;
}

function createPackBeatElement(beat, packId, index) {
  const beatItemEl = document.createElement('div');
  beatItemEl.className = 'pack-beat-item';
  beatItemEl.dataset.beatPath = beat.path;
  beatItemEl.dataset.beatName = beat.name;
  beatItemEl.draggable = true;

  // Add number badge
  const numberBadge = document.createElement('div');
  numberBadge.className = 'beat-number-badge';
  numberBadge.textContent = index + 1;

  // Container for name and badges
  const contentContainer = document.createElement('div');
  contentContainer.className = 'beat-content-container';

  const nameEl = document.createElement('span');
  // Remove file extension from display name
  const displayName = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
  nameEl.textContent = displayName;

  contentContainer.appendChild(nameEl);

  // Add "Last Used" badge if marked
  if (beat.lastUsed) {
    const lastUsedBadge = document.createElement('span');
    lastUsedBadge.className = 'last-used-badge';
    lastUsedBadge.textContent = 'Last Used';
    contentContainer.appendChild(lastUsedBadge);
  }

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-beat-btn';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent playing when clicking remove
    removeBeatFromPack(packId, beat.path);
  });

  // Click to play
  beatItemEl.addEventListener('click', (e) => {
    // Don't play if clicking the remove button
    if (e.target === removeBtn) return;
    playBeat(beat.path, beat.name);
  });

  // Drag events for external apps (desktop, Chrome, etc.)
  beatItemEl.addEventListener('dragstart', (e) => {
    if (isElectron) {
      // Use file:// protocol for Electron drag out
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/uri-list', 'file:///' + beat.path.replace(/\\/g, '/'));
      e.dataTransfer.setData('text/plain', beat.path);
    } else {
      // Browser mode - MUST get file from cache since beat.file is lost after render
      const fileObj = fileObjectsCache.get(beat.path);
      if (fileObj) {
        e.dataTransfer.effectAllowed = 'copy';
        // Just add file, don't set DownloadURL (same as All Beats)
        e.dataTransfer.items.add(fileObj);

        console.log('✓ Dragging pack beat:', beat.name, 'Type:', fileObj.type);
      } else {
        console.error('✗ File object not found in cache for:', beat.name, 'Path:', beat.path);
        console.log('Cache keys:', Array.from(fileObjectsCache.keys()));
      }
    }
  });

  // Right-click context menu
  beatItemEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, packId, beat.path, beat.lastUsed);
  });

  beatItemEl.appendChild(numberBadge);
  beatItemEl.appendChild(contentContainer);
  beatItemEl.appendChild(removeBtn);

  return beatItemEl;
}

// Context menu functions
function showContextMenu(x, y, packId, beatPath, isLastUsed) {
  contextMenuTarget = { packId, beatPath };

  // Show/hide menu items based on current state
  if (isLastUsed) {
    markLastUsedBtn.style.display = 'none';
    unmarkLastUsedBtn.style.display = 'block';
  } else {
    markLastUsedBtn.style.display = 'block';
    unmarkLastUsedBtn.style.display = 'none';
  }

  beatContextMenu.style.display = 'block';
  beatContextMenu.style.left = `${x}px`;
  beatContextMenu.style.top = `${y}px`;
}

function hideContextMenu() {
  beatContextMenu.style.display = 'none';
  contextMenuTarget = null;
}

function markBeatAsLastUsed(packId, beatPath) {
  const pack = packs.find(p => p.id === packId);
  if (pack) {
    // First, remove lastUsed from all beats in this pack
    pack.beats.forEach(b => {
      b.lastUsed = false;
    });

    // Then mark the selected beat as last used
    const beat = pack.beats.find(b => b.path === beatPath);
    if (beat) {
      beat.lastUsed = true;
      renderPackDetailBeats();
      saveData();
    }
  }
}

function unmarkBeatAsLastUsed(packId, beatPath) {
  const pack = packs.find(p => p.id === packId);
  if (pack) {
    const beat = pack.beats.find(b => b.path === beatPath);
    if (beat) {
      beat.lastUsed = false;
      renderPackDetailBeats();
      saveData();
    }
  }
}

function removeBeatFromPack(packId, beatPath) {
  const pack = packs.find(p => p.id === packId);
  if (pack) {
    pack.beats = pack.beats.filter(b => b.path !== beatPath);

    // Update UI based on current view
    if (currentPackId === packId) {
      // Update detail view
      packDetailCountEl.textContent = `${pack.beats.length} beats`;
      renderPackDetailBeats();
    }

    renderPacks();
    renderBeats(); // Update beats list to remove pack tags
    saveData();
  }
}

// Drag and Drop handlers
let draggedBeat = null;

function handleDragStart(e) {
  draggedBeat = {
    name: e.target.dataset.beatName,
    path: e.target.dataset.beatPath
  };
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, packId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  if (!draggedBeat) return;

  const pack = packs.find(p => p.id === packId);
  if (!pack) return;

  // Check if beat already exists in this pack
  const beatExists = pack.beats.some(b => b.path === draggedBeat.path);
  if (!beatExists) {
    // Keep the file object for browser mode drag-out
    const newBeat = {
      name: draggedBeat.name,
      path: draggedBeat.path,
      file: draggedBeat.file // Keep file object for drag out
    };

    // Make sure file object is in cache
    if (draggedBeat.file && !isElectron) {
      fileObjectsCache.set(draggedBeat.path, draggedBeat.file);
    }

    pack.beats.push(newBeat);

    // Update UI based on current view
    if (currentPackId === packId) {
      // Update detail view
      packDetailCountEl.textContent = `${pack.beats.length} beats`;
      renderPackDetailBeats();
    }

    renderPacks();
    renderBeats(); // Update beats list to show new pack tags
    saveData();
  }

  draggedBeat = null;
}

// Function to select thumbnail image for a pack
async function selectThumbnail(packId) {
  const pack = packs.find(p => p.id === packId);
  if (!pack) return;

  if (isElectron) {
    // Electron mode - use IPC to show native file picker
    const imagePath = await ipcRenderer.invoke('select-image');
    if (imagePath) {
      // Use file:// protocol for local file path
      pack.thumbnail = 'file:///' + imagePath.replace(/\\/g, '/');
      renderPacks();
      saveData();
    }
  } else {
    // Browser mode - use file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          pack.thumbnail = event.target.result; // Base64 data URL
          renderPacks();
          saveData();
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }
}

// Database modal functions
async function showDatabaseInfo() {
  databaseModal.style.display = 'flex';

  if (isElectron) {
    const dbPath = await ipcRenderer.invoke('get-database-path');
    dbPathDisplay.textContent = dbPath;
  } else {
    dbPathDisplay.textContent = 'Browser Mode: Data stored in localStorage';
    copyPathBtn.style.display = 'none';
    exportDbBtn.textContent = 'Export as JSON';
    importDbBtn.textContent = 'Import JSON';
  }
}

function closeDatabaseModal() {
  databaseModal.style.display = 'none';
}

async function copyDatabasePath() {
  if (isElectron) {
    const dbPath = await ipcRenderer.invoke('get-database-path');
    navigator.clipboard.writeText(dbPath);

    // Visual feedback
    const originalText = copyPathBtn.textContent;
    copyPathBtn.textContent = 'Copied!';
    copyPathBtn.style.backgroundColor = '#00aa00';
    setTimeout(() => {
      copyPathBtn.textContent = originalText;
      copyPathBtn.style.backgroundColor = '';
    }, 2000);
  }
}

async function exportDatabase() {
  if (isElectron) {
    const result = await ipcRenderer.invoke('export-database');
    if (result.success) {
      alert(`Database exported successfully to:\n${result.path}`);
    } else {
      alert(`Export failed: ${result.error}`);
    }
  } else {
    // Browser mode - download as JSON
    const data = localStorage.getItem('beats-data');
    if (!data) {
      alert('No data to export');
      return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beats-data-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('Database exported successfully!');
  }
}

async function importDatabase() {
  if (isElectron) {
    const result = await ipcRenderer.invoke('import-database');
    if (result.success) {
      alert(`Database imported successfully from:\n${result.path}\n\nReloading application...`);
      location.reload();
    } else if (result.error !== 'Import cancelled') {
      alert(`Import failed: ${result.error}`);
    }
  } else {
    // Browser mode - upload JSON file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            localStorage.setItem('beats-data', JSON.stringify(data));
            alert('Database imported successfully!\n\nReloading application...');
            location.reload();
          } catch (error) {
            alert(`Import failed: Invalid JSON file`);
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }
}

async function saveData() {
  const data = {
    folders,
    currentFolderType,
    packs,
    emails,
    channels,
    folderTags
  };

  if (isElectron) {
    await ipcRenderer.invoke('save-data', data);
  } else {
    // Browser mode - save to localStorage (without file objects)
    const packsToSave = packs.map(pack => ({
      ...pack,
      beats: pack.beats.map(beat => ({
        name: beat.name,
        path: beat.path
        // Don't save file object
      }))
    }));

    localStorage.setItem('beats-data', JSON.stringify({
      folders,
      currentFolderType,
      packs: packsToSave,
      emails,
      channels,
      folderTags
    }));
  }
}

// ===== Channel Management Functions =====

async function loadChannelData() {
  // Load emails
  const emailsResult = await ipcRenderer.invoke('load-emails');
  if (emailsResult.error) {
    console.warn('Email loading warning:', emailsResult.error);
  }

  // Load saved channel data
  const savedData = await ipcRenderer.invoke('load-data');
  if (savedData) {
    emails = savedData.emails || [];
    channels = savedData.channels || [];
    folderTags = savedData.folderTags || {};
  }

  // Merge newly loaded emails with saved ones, updating used status
  if (emailsResult.emails && emailsResult.emails.length > 0) {
    emailsResult.emails.forEach(newEmail => {
      const existing = emails.find(e => e.email === newEmail.email);
      if (!existing) {
        emails.push(newEmail);
      }
    });
  }

  // Load page folders
  pageFolders = await ipcRenderer.invoke('get-page-folders');

  updateChannelStats();
}

function updateChannelStats() {
  const unusedEmails = emails.filter(e => !e.used).length;
  const usedFolderCount = Object.keys(folderTags).length;

  // Total Channels = total number of all packs
  totalChannelsEl.textContent = packs.length;
  availableEmailsEl.textContent = unusedEmails;
  usedFoldersEl.textContent = usedFolderCount;
}

function showCreateChannelsModal() {
  createChannelsModal.style.display = 'flex';
}

function closeCreateChannelsModal() {
  createChannelsModal.style.display = 'none';
}

function showAddEmailModal() {
  // Clear previous inputs
  bulkEmailInput.value = '';
  addEmailModal.style.display = 'flex';
}

function closeAddEmailModal() {
  addEmailModal.style.display = 'none';
}

function showViewEmailsModal() {
  currentEmailFilter = 'all';
  renderEmailsList();
  viewEmailsModal.style.display = 'flex';
}

function closeViewEmailsModal() {
  viewEmailsModal.style.display = 'none';
}

function filterEmails(filter) {
  currentEmailFilter = filter;
  renderEmailsList();

  // Update button active states
  filterAllEmailsBtn.style.backgroundColor = filter === 'all' ? '#4a90e2' : '';
  filterAvailableEmailsBtn.style.backgroundColor = filter === 'available' ? '#4a90e2' : '';
  filterUsedEmailsBtn.style.backgroundColor = filter === 'used' ? '#4a90e2' : '';
}

function renderEmailsList() {
  emailsListContainer.innerHTML = '';

  if (!emails || emails.length === 0) {
    emailsListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No emails found. Click "+ Add Email" to add some.</div>';
    countAllEl.textContent = '0';
    countAvailableEl.textContent = '0';
    countUsedEl.textContent = '0';
    return;
  }

  // Calculate counts
  const totalCount = emails.length;
  const usedCount = emails.filter(e => e.used).length;
  const availableCount = totalCount - usedCount;

  // Update count badges
  countAllEl.textContent = totalCount;
  countAvailableEl.textContent = availableCount;
  countUsedEl.textContent = usedCount;

  // Filter emails based on current filter
  let filteredEmails = emails;
  if (currentEmailFilter === 'available') {
    filteredEmails = emails.filter(e => !e.used);
  } else if (currentEmailFilter === 'used') {
    filteredEmails = emails.filter(e => e.used);
  }

  if (filteredEmails.length === 0) {
    emailsListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No emails in this category.</div>';
    return;
  }

  // Render email items
  filteredEmails.forEach((emailObj, index) => {
    const emailItem = document.createElement('div');
    emailItem.style.cssText = 'padding: 12px; margin-bottom: 8px; background: #2a2a2a; border-radius: 4px; border-left: 4px solid ' + (emailObj.used ? '#e74c3c' : '#27ae60');

    const statusBadge = emailObj.used
      ? '<span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">USED</span>'
      : '<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">AVAILABLE</span>';

    emailItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <div style="font-weight: bold; color: #4a90e2;">${emailObj.email}</div>
        ${statusBadge}
      </div>
      <div style="font-size: 12px; color: #999; font-family: monospace;">
        Password: <span style="color: #ddd;">${emailObj.password}</span>
      </div>
      ${emailObj.recovery ? `<div style="font-size: 12px; color: #999; margin-top: 3px;">Recovery: <span style="color: #ddd;">${emailObj.recovery}</span></div>` : ''}
    `;

    emailsListContainer.appendChild(emailItem);
  });
}

async function addNewEmail() {
  const bulkText = bulkEmailInput.value.trim();

  if (!bulkText) {
    alert('Please paste at least one email line');
    return;
  }

  // Parse multiple lines
  const lines = bulkText.split('\n');
  const emailsToAdd = [];

  for (let line of lines) {
    // Remove quotes from start and end FIRST
    line = line.trim();
    if (line.startsWith('"')) line = line.substring(1);
    if (line.endsWith('"')) line = line.substring(0, line.length - 1);
    line = line.trim(); // Trim again after removing quotes

    // Skip empty lines
    if (!line) continue;

    // Parse format: email[TAB]password|recovery
    if (line.includes('\t')) {
      const parts = line.split('\t').filter(p => p.trim()); // Filter out empty parts
      if (parts.length >= 2) {
        const email = parts[parts.length - 2].trim(); // Second to last (email)
        const passwordAndRecovery = parts[parts.length - 1].trim(); // Last part (password|recovery)

        // Split password and recovery email
        let password = passwordAndRecovery;
        let recovery = '';

        if (passwordAndRecovery.includes('|')) {
          const subParts = passwordAndRecovery.split('|');
          password = subParts[0].trim();
          recovery = subParts[1] ? subParts[1].trim() : '';
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(email) && password) {
          emailsToAdd.push({ email, password, recovery });
          console.log('✅ Parsed:', email);
        } else {
          console.warn('⚠️ Skipping invalid line:', line);
        }
      } else {
        console.warn('⚠️ Not enough parts in line:', line);
      }
    } else {
      console.warn('⚠️ No TAB found in line:', line);
    }
  }

  if (emailsToAdd.length === 0) {
    alert('No valid emails found. Format should be: email[TAB]password|recovery');
    return;
  }

  // Add all emails via IPC
  if (isElectron) {
    const result = await ipcRenderer.invoke('add-emails-bulk', emailsToAdd);
    if (result.success) {
      alert(`✅ Successfully added ${result.count} email(s)!`);
      closeAddEmailModal();

      // Reload emails to update the list
      await loadChannelData();
    } else {
      alert(`❌ Failed to add emails: ${result.error}`);
    }
  }
}

async function createChannels() {
  const numChannels = parseInt(numChannelsInput.value);
  const beatsPerChannel = parseInt(beatsPerChannelInput.value);

  if (!numChannels || numChannels < 1) {
    alert('Please enter a valid number of channels');
    return;
  }

  if (!beatsPerChannel || beatsPerChannel < 1) {
    alert('Please enter a valid number of beats per channel');
    return;
  }

  // Calculate required folders (assuming 20 beats per folder)
  const foldersNeeded = Math.ceil(beatsPerChannel / 20);

  // Get available page folders (not yet tagged)
  const availableFolders = pageFolders.filter(folder => !folderTags[folder.path]);

  if (availableFolders.length < numChannels * foldersNeeded) {
    alert(`Not enough available folders! You need ${numChannels * foldersNeeded} folders, but only ${availableFolders.length} are available.`);
    return;
  }

  // Create channels (no need to check for emails - will use "No email available yet" if none)
  for (let i = 0; i < numChannels; i++) {
    await createSingleChannel(beatsPerChannel, foldersNeeded);
  }

  closeCreateChannelsModal();
  renderPacks();
  renderBeats(); // Update beats list to show new channel tags
  await saveData();
}

async function createSingleChannel(beatsPerChannel, foldersNeeded) {
  // Find next channel number
  const existingNumbers = channels.map(ch => {
    const match = ch.name.match(/C(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const channelName = `C${nextNumber}`;

  // Get next unused email (if available)
  const email = emails.find(e => !e.used);
  let emailAddress = 'No email available yet';
  let password = '';

  if (email) {
    email.used = true;
    emailAddress = email.email;
    password = email.password;
  }

  // Get available folders
  const availableFolders = pageFolders.filter(folder => !folderTags[folder.path]);
  const selectedFolders = availableFolders.slice(0, foldersNeeded);

  // Tag folders with channel name
  selectedFolders.forEach(folder => {
    folderTags[folder.path] = channelName;
  });

  // Get all beats from selected folders
  const allBeats = [];
  for (const folder of selectedFolders) {
    const folderBeats = await ipcRenderer.invoke('read-beats-folder', folder.path);
    allBeats.push(...folderBeats);
  }

  // Take the exact number of beats needed (or all if less)
  const beatsToAdd = allBeats.slice(0, beatsPerChannel);

  // Create pack/channel
  const channel = {
    id: Date.now().toString() + Math.random(),
    name: channelName,
    beats: beatsToAdd,
    email: emailAddress,
    password: password,
    description: password ? `${emailAddress}:${password}` : emailAddress,
    folders: selectedFolders.map(f => f.name)
  };

  channels.push(channel);
  packs.push(channel); // Add to packs so it shows in the grid
}

async function autoAddChannel() {
  const beatsPerChannel = 40; // Default
  const foldersNeeded = Math.ceil(beatsPerChannel / 20);

  // Check if we have available resources
  const availableFolders = pageFolders.filter(folder => !folderTags[folder.path]);

  if (availableFolders.length < foldersNeeded) {
    alert(`Not enough available folders! You need ${foldersNeeded} folders, but only ${availableFolders.length} are available.`);
    return;
  }

  await createSingleChannel(beatsPerChannel, foldersNeeded);

  renderPacks();
  renderBeats(); // Update beats list to show new channel tags
  updateChannelStats();
  await saveData();

  alert(`Channel created successfully! Check the Packs section.`);
}

// Update renderBeats to show folder tags
const originalRenderBeats = renderBeats;
renderBeats = function() {
  // Call original render
  originalRenderBeats.call(this);

  // Add folder tags to folders in the untagged (Tagged Beats) tab
  if (currentFolderType === 'untagged') {
    const folderEls = document.querySelectorAll('.folder-item');
    folderEls.forEach(folderEl => {
      const folderName = folderEl.querySelector('.folder-name');
      if (folderName) {
        // Try to find this folder in our tags
        const folderPath = Object.keys(folderTags).find(path => path.includes(folderName.textContent));
        if (folderPath && folderTags[folderPath]) {
          // Add tag
          const tagEl = document.createElement('span');
          tagEl.className = 'pack-tag';
          tagEl.style.marginLeft = '8px';
          tagEl.textContent = folderTags[folderPath];
          folderEl.appendChild(tagEl);
        }
      }
    });
  }
}
