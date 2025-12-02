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

// Image database state
let imageFolder = ''; // Path to images folder
let images = []; // List of {path, name, used, beatId}
let beatImages = {}; // Map beatId to image path
let beatPrompts = {}; // Map beatId to prompt text

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
const createVideoFromBeatBtn = document.getElementById('create-video-from-beat');
const uploadBeatToYoutubeBtn = document.getElementById('upload-beat-to-youtube');

// Pack detail panel elements
const middlePanelEl = document.getElementById('middle-panel');
const rightPanelEl = document.getElementById('right-panel');
const packDetailRightPanel = document.getElementById('pack-detail-right-panel');
const resizeHandle = document.getElementById('resize-handle');
const backToPacksBtn = document.getElementById('back-to-packs-btn');
const packDetailTitleEl = document.getElementById('pack-detail-title');
const packDetailCountEl = document.getElementById('pack-detail-count');
const packEmailInfoEl = document.getElementById('pack-email-info');
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

// Image manager elements
const imagesManagerBtn = document.getElementById('images-manager-btn');
const imagesModal = document.getElementById('images-modal');
const closeImagesModalBtn = document.getElementById('close-images-modal-btn');
const imageFolderDisplay = document.getElementById('image-folder-display');
const selectImageFolderBtn = document.getElementById('select-image-folder-btn');
const refreshImagesBtn = document.getElementById('refresh-images-btn');
const imagesGrid = document.getElementById('images-grid');
const imagesTotalCount = document.getElementById('images-total-count');
const imagesUsedCount = document.getElementById('images-used-count');
const imagesUnusedCount = document.getElementById('images-unused-count');
const randomizeImagesBtn = document.getElementById('randomize-images-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');

// Beat image/prompt elements
const beatImagePreview = document.getElementById('beat-image-preview');
const beatImageDisplay = document.getElementById('beat-image-display');
const beatPromptSection = document.getElementById('beat-prompt-section');
const beatPromptDisplay = document.getElementById('beat-prompt-display');
const editPromptBtn = document.getElementById('edit-prompt-btn');
const beatPromptEditor = document.getElementById('beat-prompt-editor');
const promptEditActions = document.getElementById('prompt-edit-actions');
const savePromptBtn = document.getElementById('save-prompt-btn');
const cancelPromptBtn = document.getElementById('cancel-prompt-btn');

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

// Resize functionality
let isResizing = false;
let startX = 0;
let startWidth = 0;

if (resizeHandle && packDetailRightPanel) {
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = packDetailRightPanel.offsetWidth;
    document.body.style.cursor = 'ew-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const diff = startX - e.clientX;
    // Allow resizing from 250px to 80% of window width
    const maxWidth = window.innerWidth * 0.8;
    const newWidth = Math.max(250, Math.min(maxWidth, startWidth + diff));
    packDetailRightPanel.style.width = `${newWidth}px`;
    packDetailRightPanel.style.minWidth = `${newWidth}px`;
    packDetailRightPanel.style.maxWidth = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });
}

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

      // Load image data
      imageFolder = savedData.imageFolder || '';
      images = savedData.images || [];
      beatImages = savedData.beatImages || {};
      beatPrompts = savedData.beatPrompts || {};
      if (imageFolder) {
        imageFolderDisplay.textContent = imageFolder;
      }

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

      // Load image data
      imageFolder = data.imageFolder || '';
      images = data.images || [];
      beatImages = data.beatImages || {};
      beatPrompts = data.beatPrompts || {};

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

  // Image manager modal listeners
  imagesManagerBtn.addEventListener('click', showImagesManager);
  closeImagesModalBtn.addEventListener('click', closeImagesModal);
  selectImageFolderBtn.addEventListener('click', selectImageFolder);
  refreshImagesBtn.addEventListener('click', refreshImages);
  randomizeImagesBtn.addEventListener('click', randomizeImages);
  clearCacheBtn.addEventListener('click', clearImageCache);

  // Close images modal when clicking outside
  imagesModal.addEventListener('click', (e) => {
    if (e.target === imagesModal) {
      closeImagesModal();
    }
  });

  // Prompt editor listeners
  editPromptBtn.addEventListener('click', showPromptEditor);
  savePromptBtn.addEventListener('click', savePrompt);
  cancelPromptBtn.addEventListener('click', cancelPromptEdit);

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

  // Create video from beat context menu item
  if (createVideoFromBeatBtn) {
    createVideoFromBeatBtn.addEventListener('click', () => {
      if (contextMenuTarget && contextMenuTarget.beatPath) {
        // First play the beat to set it as current
        const beatName = contextMenuTarget.beatPath.split('\\').pop();
        playBeat(contextMenuTarget.beatPath, beatName);
        // Then create video
        setTimeout(() => createVideoFromCurrentBeat(), 100);
      }
      hideContextMenu();
    });
  }

  // Upload beat to YouTube context menu item
  if (uploadBeatToYoutubeBtn) {
    uploadBeatToYoutubeBtn.addEventListener('click', async () => {
      if (contextMenuTarget && contextMenuTarget.beatPath) {
        // First play the beat to set it as current
        const beatName = contextMenuTarget.beatPath.split('\\').pop();
        playBeat(contextMenuTarget.beatPath, beatName);
        // Wait for current beat to be set
        await new Promise(r => setTimeout(r, 100));
        // Check if beat has an associated image
        const imagePath = beatImages[contextMenuTarget.beatPath];
        if (!imagePath) {
          alert('This beat needs an image to create a video first. Please assign an image in the Image Database.');
          hideContextMenu();
          return;
        }
        // Create video first, then upload
        await createVideoFromCurrentBeat();
      }
      hideContextMenu();
    });
  }

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

  // Update hide/unhide button text based on pack status
  toggleHidePackBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';

  renderPackEmailInfo();
  renderPackDetailBeats();
}

function renderPackDetailBeats() {
  packDetailBeatsEl.innerHTML = '';

  const pack = packs.find(p => p.id === currentPackId);
  if (!pack) return;

  // Add beat count at the top
  const beatCountEl = document.createElement('div');
  beatCountEl.className = 'pack-detail-count';
  beatCountEl.id = 'pack-detail-count';
  beatCountEl.textContent = `${pack.beats.length} beats`;
  packDetailBeatsEl.appendChild(beatCountEl);

  if (pack.beats.length === 0) {
    const emptyMessageEl = document.createElement('div');
    emptyMessageEl.style.cssText = 'padding: 20px; text-align: center; color: #999;';
    emptyMessageEl.textContent = 'No beats in this pack yet. Drag beats from the left panel to add them.';
    packDetailBeatsEl.appendChild(emptyMessageEl);
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

function renderPackEmailInfo() {
  const pack = packs.find(p => p.id === currentPackId);
  if (!pack) return;

  packEmailInfoEl.innerHTML = '';

  const hasEmail = pack.email && pack.email !== 'No email available yet';

  if (hasEmail) {
    // Show existing email/password
    packEmailInfoEl.innerHTML = `
      <div style="margin-bottom: 10px;">
        <div style="font-weight: bold; color: #3b82f6; font-size: 14px; margin-bottom: 8px;">📧 Account Information</div>
        <div style="font-size: 13px; color: #ddd; margin-bottom: 5px;">
          <span style="color: #999;">Email:</span> <span style="font-family: monospace;">${pack.email}</span>
        </div>
        <div style="font-size: 13px; color: #ddd; margin-bottom: 5px;">
          <span style="color: #999;">Password:</span> <span style="font-family: monospace;">${pack.password || 'N/A'}</span>
        </div>
        ${pack.description && pack.description.includes(':') ? `
        <div style="font-size: 11px; color: #666; margin-top: 5px;">
          <span style="color: #888;">Recovery:</span> ${pack.description.split(':')[2] || 'N/A'}
        </div>` : ''}
      </div>
    `;
  } else {
    // Show form to add email/password
    packEmailInfoEl.innerHTML = `
      <div>
        <div style="font-weight: bold; color: #f59e0b; font-size: 14px; margin-bottom: 10px;">⚠️ No Email Assigned</div>
        <div style="font-size: 12px; color: #999; margin-bottom: 10px;">
          Paste format: <span style="font-family: monospace; color: #3b82f6;">email	password|recovery</span>
        </div>
        <input type="text" id="pack-email-input" placeholder="email@example.com" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #404040; border-radius: 4px; color: white; margin-bottom: 8px; font-size: 13px;">
        <input type="text" id="pack-password-input" placeholder="password" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #404040; border-radius: 4px; color: white; margin-bottom: 8px; font-size: 13px;">
        <input type="text" id="pack-recovery-input" placeholder="recovery email (optional)" style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #404040; border-radius: 4px; color: white; margin-bottom: 10px; font-size: 13px;">
        <button id="save-pack-email-btn" class="btn-primary" style="width: 100%; padding: 8px;">Save Email</button>
      </div>
    `;

    // Add event listener for save button
    const saveBtn = document.getElementById('save-pack-email-btn');
    const emailInput = document.getElementById('pack-email-input');
    const passwordInput = document.getElementById('pack-password-input');
    const recoveryInput = document.getElementById('pack-recovery-input');

    // Auto-parse paste format: email	password|recovery
    if (emailInput) {
      emailInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').trim();

        // Try to parse format: email	password|recovery
        // Split by tab first
        const parts = pastedText.split('\t');

        if (parts.length >= 2) {
          // Has tab separator
          const email = parts[0].trim();
          const passwordAndRecovery = parts[1].trim();

          // Check if password part has | separator for recovery
          const passwordParts = passwordAndRecovery.split('|');
          const password = passwordParts[0].trim();
          const recovery = passwordParts[1] ? passwordParts[1].trim() : '';

          // Fill in the fields
          emailInput.value = email;
          passwordInput.value = password;
          recoveryInput.value = recovery;
        } else {
          // No tab, just paste as email
          emailInput.value = pastedText;
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const recovery = recoveryInput.value.trim();

        if (!email || !password) {
          alert('Please enter both email and password');
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          alert('Please enter a valid email address');
          return;
        }

        // Update pack
        pack.email = email;
        pack.password = password;
        pack.description = recovery ? `${email}:${password}:${recovery}` : `${email}:${password}`;

        // Mark email as used in emails array
        const emailObj = emails.find(e => e.email === email);
        if (emailObj) {
          emailObj.used = true;
          if (recovery) emailObj.recovery = recovery;
        } else {
          // Add to emails array if not exists
          emails.push({ email, password, used: true, recovery: recovery || '' });
        }

        await saveData();
        renderPackEmailInfo(); // Re-render
        alert('✅ Email saved successfully!');
      });
    }
  }
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

  // Show image and prompt if available
  const imagePath = beatImages[beatPath];
  const prompt = beatPrompts[beatPath];

  if (imagePath) {
    beatImagePreview.style.display = 'block';
    beatImageDisplay.src = 'file://' + imagePath;
    beatImageDisplay.dataset.imagePath = imagePath;

    // Set up drag-and-drop for image
    beatImageDisplay.ondragstart = (e) => {
      e.preventDefault();

      if (isElectron) {
        // Use Electron's native drag for files
        ipcRenderer.send('drag-files-start', [imagePath]);
      }
    };
  } else {
    beatImagePreview.style.display = 'none';
  }

  // Always show prompt section when playing a beat (even if empty)
  beatPromptSection.style.display = 'block';
  if (prompt) {
    beatPromptDisplay.textContent = prompt;
  } else {
    beatPromptDisplay.textContent = 'No prompt available';
  }

  // Make sure editor is hidden and display is shown
  beatPromptEditor.style.display = 'none';
  promptEditActions.style.display = 'none';
  beatPromptDisplay.style.display = 'block';
  editPromptBtn.style.display = 'block';
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

    // Show channel management buttons in header
    createChannelsBtn.style.display = 'inline-block';
    autoAddChannelBtn.style.display = 'inline-block';
    addEmailBtn.style.display = 'inline-block';
    viewEmailsBtn.style.display = 'inline-block';
  } else {
    channelManagementEl.style.display = 'none';

    // Hide channel management buttons in header
    createChannelsBtn.style.display = 'none';
    autoAddChannelBtn.style.display = 'none';
    addEmailBtn.style.display = 'none';
    viewEmailsBtn.style.display = 'none';
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
      folderEl.draggable = true; // Make folders draggable
      folderEl.dataset.folderPath = folder.path;
      folderEl.dataset.folderName = folder.name;

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
      folderEl.addEventListener('click', async (e) => {
        // Don't navigate if dragging
        if (e.defaultPrevented) return;

        setCurrentPath(folder.path);
        await loadFolderContents(folder.path);
        updateFolderDisplay();
        await saveData();
      });

      // Drag start event for folders
      folderEl.addEventListener('dragstart', (e) => {
        draggedFolder = {
          name: folder.name,
          path: folder.path
        };
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
      });

      folderEl.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
        draggedFolder = null;
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
        e.preventDefault();

        // Extract beat name (e.g., "Untitled - Brightelle_tagged.wav" -> "Brightelle")
        const beatName = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, ''); // Remove extension
        const nameMatch = beatName.match(/[-–]\s*([^_]+)_/); // Match text between "- " and "_"
        const extractedName = nameMatch ? nameMatch[1].trim() : beatName;

        // Check if beat has associated image
        const imagePath = beatImages[beat.path];
        const filesToDrag = [beat.path];

        if (imagePath) {
          // Add image to drag if it exists
          filesToDrag.push(imagePath);
        }

        // Use Electron's native drag for multiple files (includes beat name)
        ipcRenderer.send('drag-files-start', { files: filesToDrag, beatName: extractedName });

        // Since Electron native drag bypasses dragend event, re-render after a short delay
        setTimeout(() => {
          if (currentPackId) {
            renderPackDetailBeats();
          }
        }, 100);
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

// Helper function to format timestamp as time ago
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
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

  sortedPacks.forEach((pack, index) => {
    const packCardEl = createPackCard(pack, index + 1);
    packsGridEl.appendChild(packCardEl);
  });
}

function createPackCard(pack, orderNumber) {
  const packCardEl = document.createElement('div');
  packCardEl.className = 'pack-card';
  packCardEl.dataset.packId = pack.id;

  // Pack image/thumbnail
  const imageEl = document.createElement('div');
  imageEl.className = 'pack-card-image';

  // Show thumbnail image if available, otherwise show auto-generated text thumbnail
  if (pack.thumbnail && pack.thumbnail !== 'auto') {
    const img = document.createElement('img');
    img.src = pack.thumbnail;
    img.alt = pack.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    imageEl.appendChild(img);
  } else {
    // Auto-generate text-based thumbnail with pack name
    const textThumb = document.createElement('div');
    textThumb.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); font-size: 48px; font-weight: bold; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);';
    textThumb.textContent = pack.name;
    imageEl.appendChild(textThumb);
  }

  // Beat count badge on image
  const countBadge = document.createElement('div');
  countBadge.className = 'pack-card-count';
  countBadge.textContent = pack.beats.length;
  imageEl.appendChild(countBadge);

  // Order number badge on image (top left)
  if (orderNumber) {
    const orderBadge = document.createElement('div');
    orderBadge.className = 'pack-card-order';
    orderBadge.textContent = `#${orderNumber}`;
    imageEl.appendChild(orderBadge);
  }

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

  // Last used beat info
  const lastUsedBeat = pack.beats.find(beat => beat.lastUsed);
  if (lastUsedBeat) {
    const lastUsedIndex = pack.beats.indexOf(lastUsedBeat);
    const lastUsedEl = document.createElement('div');
    lastUsedEl.className = 'pack-card-last-used';
    lastUsedEl.innerHTML = `<span style="color: #ff9500;">Last Used:</span> #${lastUsedIndex + 1}`;
    infoEl.appendChild(lastUsedEl);
  }

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

  // Last used display
  if (pack.lastUsed) {
    const lastUsedEl = document.createElement('div');
    lastUsedEl.style.cssText = 'font-size: 11px; color: #888; margin-top: 6px;';
    lastUsedEl.textContent = `Last used: ${formatTimeAgo(pack.lastUsed)}`;
    infoEl.appendChild(lastUsedEl);
  }

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
      e.preventDefault();

      // Extract beat name (e.g., "Untitled - Brightelle_tagged.wav" -> "Brightelle")
      const beatName = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, ''); // Remove extension
      const nameMatch = beatName.match(/[-–]\s*([^_]+)_/); // Match text between "- " and "_"
      const extractedName = nameMatch ? nameMatch[1].trim() : beatName;

      // Check if beat has associated image
      const imagePath = beatImages[beat.path];
      const filesToDrag = [beat.path];

      if (imagePath) {
        // Add image to drag if it exists
        filesToDrag.push(imagePath);
      }

      // Use Electron's native drag for multiple files (includes beat name)
      ipcRenderer.send('drag-files-start', { files: filesToDrag, beatName: extractedName });

      // Mark as "Last Used" immediately when dragging
      if (packId) {
        const pack = packs.find(p => p.id === packId);
        if (pack) {
          // Remove lastUsed from all beats in this pack
          pack.beats.forEach(b => {
            b.lastUsed = false;
          });

          // Find and mark this beat as last used
          const targetBeat = pack.beats.find(b => b.path === beat.path);
          if (targetBeat) {
            targetBeat.lastUsed = true;
          }

          // Save data and re-render to show the badge after short delay
          saveData();
          setTimeout(() => {
            if (currentPackId === packId) {
              renderPackDetailBeats();
            }
          }, 100);
        }
      }
    } else {
      // Browser mode - MUST get file from cache since beat.file is lost after render
      const fileObj = fileObjectsCache.get(beat.path);
      if (fileObj) {
        e.dataTransfer.effectAllowed = 'copy';
        // Just add file, don't set DownloadURL (same as All Beats)
        e.dataTransfer.items.add(fileObj);
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
let draggedFolder = null;

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
  // Re-render to show "Last Used" badge after drag ends
  if (currentPackId) {
    renderPackDetailBeats();
  }
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e, packId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  const pack = packs.find(p => p.id === packId);
  if (!pack) return;

  // Handle folder drop
  if (draggedFolder) {
    // Store folder info in local variables before any async operations
    const folderPath = draggedFolder.path;
    const folderName = draggedFolder.name;

    try {
      // Safety check
      if (!folderPath) {
        console.error('Dragged folder has no path:', draggedFolder);
        alert('Error: Folder path is missing');
        draggedFolder = null;
        return;
      }

      // Load all beats from the folder
      const folderBeats = await ipcRenderer.invoke('read-beats-folder', folderPath);

      if (!folderBeats || folderBeats.length === 0) {
        alert(`No beats found in folder: ${folderName}`);
        draggedFolder = null;
        return;
      }

      // Add all beats from folder to pack (skip duplicates)
      let addedCount = 0;
      folderBeats.forEach(beat => {
        const beatExists = pack.beats.some(b => b.path === beat.path);
        if (!beatExists) {
          const newBeat = {
            name: beat.name,
            path: beat.path,
            file: beat.file
          };

          // Cache file object for browser mode
          if (beat.file && !isElectron) {
            fileObjectsCache.set(beat.path, beat.file);
          }

          pack.beats.push(newBeat);
          addedCount++;
        }
      });

      // Update folderTags - add or append channel tag
      const channelTag = pack.name; // Use pack name as channel tag (e.g., "C10")

      if (folderTags[folderPath]) {
        // Folder already has tags, check if this channel is already there
        const existingTags = folderTags[folderPath].split(', ');
        if (!existingTags.includes(channelTag)) {
          folderTags[folderPath] = existingTags.concat(channelTag).join(', ');
        }
      } else {
        // First time this folder is tagged
        folderTags[folderPath] = channelTag;
      }

      // Update last used timestamp
      pack.lastUsed = Date.now();

      // Update UI
      if (currentPackId === packId) {
        packDetailCountEl.textContent = `${pack.beats.length} beats`;
        renderPackDetailBeats();
      }

      renderPacks();
      renderBeats(); // Update beats list and folder tags
      saveData();

      // Show success message
      alert(`Added ${addedCount} beats from "${folderName}" to ${pack.name}`);

    } catch (error) {
      console.error('Error adding folder to pack:', error);
      alert(`Error adding folder: ${error.message}`);
    } finally {
      draggedFolder = null;
    }
    return;
  }

  // Handle single beat drop (existing logic)
  if (!draggedBeat) return;

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

    // Update last used timestamp
    pack.lastUsed = Date.now();

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
    folderTags,
    imageFolder,
    images,
    beatImages,
    beatPrompts
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
      folderTags,
      imageFolder,
      images,
      beatImages,
      beatPrompts
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

    // Load image data if not already loaded
    if (!imageFolder && savedData.imageFolder) {
      imageFolder = savedData.imageFolder;
      images = savedData.images || [];
      beatImages = savedData.beatImages || {};
      beatPrompts = savedData.beatPrompts || {};
      if (imageFolder) {
        imageFolderDisplay.textContent = imageFolder;
      }
    }
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
      const folderNameEl = folderEl.querySelector('.folder-name');
      if (folderNameEl) {
        const folderName = folderNameEl.textContent.trim();

        // Try to find this folder in our tags using the full path from dataset
        const folderPath = folderEl.dataset.folderPath;

        if (folderPath && folderTags[folderPath]) {
          // Split multiple tags (e.g., "C10, C12" -> ["C10", "C12"])
          const tags = folderTags[folderPath].split(', ');

          // Create a tag badge for each channel
          tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'pack-tag';
            tagEl.style.marginLeft = '8px';
            tagEl.textContent = tag;
            folderEl.appendChild(tagEl);
          });
        }
      }
    });
  }
}

// ===== Image Management Functions =====

function showImagesManager() {
  imagesModal.style.display = 'flex';
  renderImagesGrid();
}

function closeImagesModal() {
  imagesModal.style.display = 'none';
}

async function selectImageFolder() {
  if (!isElectron) return;

  const folderPath = await ipcRenderer.invoke('select-folder');
  if (folderPath) {
    imageFolder = folderPath;
    imageFolderDisplay.textContent = folderPath;
    await loadImages();
    await saveData();
  }
}

async function loadImages() {
  if (!imageFolder || !isElectron) return;

  const imageFiles = await ipcRenderer.invoke('read-images-folder', imageFolder);

  // Merge with existing images data to preserve 'used' status
  const newImages = imageFiles.map(img => {
    const existing = images.find(i => i.path === img.path);
    return existing || { ...img, used: false, beatId: null };
  });

  images = newImages;
  renderImagesGrid();
}

async function refreshImages() {
  await loadImages();
}

function renderImagesGrid() {
  if (!imageFolder) {
    imagesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">Select an image folder to get started</div>';
    return;
  }

  const usedImages = images.filter(img => img.used);
  const unusedImages = images.filter(img => !img.used);

  imagesTotalCount.textContent = images.length;
  imagesUsedCount.textContent = usedImages.length;
  imagesUnusedCount.textContent = unusedImages.length;

  if (images.length === 0) {
    imagesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">No images found in this folder</div>';
    return;
  }

  imagesGrid.innerHTML = '';

  images.forEach(img => {
    const imgEl = document.createElement('div');
    imgEl.style.cssText = 'position: relative; aspect-ratio: 1/1; background: #2a2a2a; border-radius: 4px; overflow: hidden; cursor: pointer; border: 2px solid ' + (img.used ? '#3b82f6' : '#404040');

    const imgTag = document.createElement('img');
    imgTag.src = 'file://' + img.path;
    imgTag.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    imgTag.alt = img.name;

    if (img.used && img.beatId) {
      // Find beat and pack info
      let beatName = '';
      let packName = '';

      for (const pack of packs) {
        const beat = pack.beats.find(b => b.path === img.beatId);
        if (beat) {
          beatName = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
          packName = pack.name;
          break;
        }
      }

      const badge = document.createElement('div');
      badge.style.cssText = 'position: absolute; top: 4px; right: 4px; background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;';
      badge.textContent = 'USED';
      imgEl.appendChild(badge);

      // Add tooltip with beat and pack info
      if (beatName && packName) {
        imgEl.title = `Used in: ${packName}\nBeat: ${beatName}`;

        // Add info label at bottom
        const infoLabel = document.createElement('div');
        infoLabel.style.cssText = 'position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); color: white; padding: 4px 6px; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        infoLabel.innerHTML = `<span style="color: #3b82f6; font-weight: bold;">${packName}</span><br/>${beatName}`;
        imgEl.appendChild(infoLabel);
      }
    }

    imgEl.appendChild(imgTag);
    imagesGrid.appendChild(imgEl);
  });
}

async function randomizeImages() {
  // Get all beats from ACTIVE (non-hidden) packs that don't have images assigned
  const allBeats = [];
  packs.forEach(pack => {
    // Skip hidden packs
    if (pack.hidden) return;

    pack.beats.forEach(beat => {
      if (!beatImages[beat.path]) {
        allBeats.push(beat);
      }
    });
  });

  if (allBeats.length === 0) {
    alert('No beats without images found!');
    return;
  }

  // Get unused images
  const unusedImages = images.filter(img => !img.used);

  if (unusedImages.length === 0) {
    alert('No unused images available!');
    return;
  }

  // Randomize assignment
  const assignCount = Math.min(allBeats.length, unusedImages.length);
  const shuffledImages = [...unusedImages].sort(() => Math.random() - 0.5);

  // Show progress
  const progressMsg = `Converting ${assignCount} images to 1:1...`;
  console.log(progressMsg);

  let convertedCount = 0;

  for (let i = 0; i < assignCount; i++) {
    const beat = allBeats[i];
    const image = shuffledImages[i];

    // Convert image to 1:1 if using Electron
    let imagePath = image.path;
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('convert-image-to-square', image.path);
        if (result.success) {
          imagePath = result.cachedPath;
          convertedCount++;
        } else {
          console.warn(`Failed to convert image: ${image.name}`, result.error);
          // Use original if conversion fails
        }
      } catch (error) {
        console.error('Error converting image:', error);
        // Use original if error
      }
    }

    beatImages[beat.path] = imagePath;
    image.used = true;
    image.beatId = beat.path;
  }

  await saveData();
  renderImagesGrid();

  alert(`✅ Assigned ${assignCount} images to beats!\n${convertedCount} converted to 1:1 aspect ratio.`);
}


// ===== Prompt Editor Functions =====

function showPromptEditor() {
  if (!currentBeat) return;

  // Hide display, show editor
  beatPromptDisplay.style.display = 'none';
  beatPromptEditor.style.display = 'block';
  promptEditActions.style.display = 'flex';
  editPromptBtn.style.display = 'none';

  // Load current prompt
  const currentPrompt = beatPrompts[currentBeat.path] || '';
  beatPromptEditor.value = currentPrompt;
  beatPromptEditor.focus();
}

function cancelPromptEdit() {
  // Hide editor, show display
  beatPromptEditor.style.display = 'none';
  promptEditActions.style.display = 'none';
  beatPromptDisplay.style.display = 'block';
  editPromptBtn.style.display = 'block';
}

async function savePrompt() {
  if (!currentBeat) return;

  const newPrompt = beatPromptEditor.value.trim();

  if (newPrompt) {
    beatPrompts[currentBeat.path] = newPrompt;
    beatPromptDisplay.textContent = newPrompt;
  } else {
    delete beatPrompts[currentBeat.path];
    beatPromptDisplay.textContent = 'No prompt available';
  }

  await saveData();
  cancelPromptEdit();
}


async function clearImageCache() {
  if (!isElectron) return;

  if (!confirm('Clear all cached 1:1 images? This will free up disk space but images will need to be converted again when used.')) {
    return;
  }

  try {
    const result = await ipcRenderer.invoke('clear-image-cache');
    if (result.success) {
      alert(`✅ Cleared ${result.count} cached images!`);
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    alert(`❌ Error clearing cache: ${error.message}`);
  }
}

// ============================
// MAIN NAVIGATION
// ============================

const mainNavTabs = document.querySelectorAll('.main-nav-tab');
const appSections = document.querySelectorAll('.app-section');

mainNavTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const section = tab.dataset.section;
    
    // Update active tab
    mainNavTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show corresponding section
    appSections.forEach(s => {
      s.classList.remove('active');
      if (s.id === `${section}-section`) {
        s.classList.add('active');
      }
    });

    // Initialize section if needed
    if (section === 'youtube') {
      initYouTubeSection();
    } else if (section === 'autovid') {
      initAutoVidSection();
    }
  });
});

// ============================
// AUTOVID SECTION
// ============================

let autovidState = {
  boards: [],
  currentPins: [],
  selectedImage: null,
  selectedImagePath: null,
  selectedAudioPath: null,
  isRendering: false
};

// AutoVid DOM Elements
const loadBoardsBtn = document.getElementById('load-boards-btn');
const pinterestSearchInput = document.getElementById('pinterest-search');
const searchPinsBtn = document.getElementById('search-pins-btn');
const boardsList = document.getElementById('boards-list');
const randomizePinBtn = document.getElementById('randomize-pin-btn');
const previewImage = document.getElementById('preview-image');
const imagePlaceholder = document.getElementById('image-placeholder');
const imageInfo = document.getElementById('image-info');
const imageTitle = document.getElementById('image-title');
const imageSource = document.getElementById('image-source');
const selectAudioBtn = document.getElementById('select-audio-btn');
const audioFilePath = document.getElementById('audio-file-path');
const audioPreviewContainer = document.getElementById('audio-preview-container');
const autovidAudioPlayer = document.getElementById('autovid-audio-player');
const outputNameInput = document.getElementById('output-name');
const videoResolution = document.getElementById('video-resolution');
const renderVideoBtn = document.getElementById('render-video-btn');
const renderProgress = document.getElementById('render-progress');
const renderProgressFill = document.getElementById('render-progress-fill');
const renderProgressText = document.getElementById('render-progress-text');
const renderOutput = document.getElementById('render-output');
const openOutputFolderBtn = document.getElementById('open-output-folder-btn');

let autovidInitialized = false;

// Local image selection button
const selectLocalImageBtn = document.getElementById('select-local-image-btn');

function initAutoVidSection() {
  if (autovidInitialized) return;
  autovidInitialized = true;

  // Event listeners
  if (loadBoardsBtn) {
    loadBoardsBtn.addEventListener('click', loadPinterestBoards);
  }

  if (searchPinsBtn) {
    searchPinsBtn.addEventListener('click', searchPinterestPins);
  }

  if (pinterestSearchInput) {
    pinterestSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchPinterestPins();
    });
  }

  if (randomizePinBtn) {
    randomizePinBtn.addEventListener('click', randomizePin);
  }

  if (selectAudioBtn) {
    selectAudioBtn.addEventListener('click', selectAutovidAudio);
  }

  if (renderVideoBtn) {
    renderVideoBtn.addEventListener('click', renderVideo);
  }

  if (openOutputFolderBtn) {
    openOutputFolderBtn.addEventListener('click', openAutovidOutput);
  }

  // Upload to YouTube button
  const uploadToYoutubeBtn = document.getElementById('upload-to-youtube-btn');
  if (uploadToYoutubeBtn) {
    uploadToYoutubeBtn.addEventListener('click', uploadCurrentVideoToYouTube);
  }

  // Local image selection
  if (selectLocalImageBtn) {
    selectLocalImageBtn.addEventListener('click', selectLocalImage);
  }

  updateRenderButton();
}

async function selectLocalImage() {
  if (!isElectron) return;

  try {
    const filePath = await ipcRenderer.invoke('select-image');
    if (filePath) {
      autovidState.selectedImagePath = filePath;
      autovidState.selectedImage = null; // Clear Pinterest selection
      
      // Update preview
      if (previewImage && imagePlaceholder) {
        previewImage.src = `file://${filePath}`;
        previewImage.style.display = 'block';
        imagePlaceholder.style.display = 'none';
      }

      if (imageInfo) {
        imageInfo.style.display = 'block';
        const fileName = filePath.split('\\').pop();
        imageTitle.textContent = fileName;
        imageSource.textContent = 'Local file';
      }

      updateRenderButton();
    }
  } catch (error) {
    console.error('Error selecting image:', error);
  }
}

async function loadPinterestBoards() {
  if (!isElectron) {
    alert('Pinterest integration requires Electron');
    return;
  }

  boardsList.innerHTML = '<div class="empty-state">Loading boards...</div>';

  try {
    // Note: Pinterest API integration would go here
    // For now, show a placeholder message
    boardsList.innerHTML = `
      <div class="empty-state">
        <p>Pinterest integration requires API setup.</p>
        <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
          Configure your Pinterest token in .env file
        </p>
      </div>
    `;
  } catch (error) {
    boardsList.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
  }
}

async function searchPinterestPins() {
  const keyword = pinterestSearchInput?.value?.trim();
  if (!keyword) {
    alert('Please enter a search keyword');
    return;
  }

  // Placeholder for Pinterest search
  console.log('Searching Pinterest for:', keyword);
}

function randomizePin() {
  if (autovidState.currentPins.length === 0) {
    alert('No pins loaded. Load boards and search first.');
    return;
  }

  const randomIndex = Math.floor(Math.random() * autovidState.currentPins.length);
  const pin = autovidState.currentPins[randomIndex];
  selectPin(pin);
}

function selectPin(pin) {
  autovidState.selectedImage = pin;
  
  if (previewImage && imagePlaceholder) {
    previewImage.src = pin.imageUrl;
    previewImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';
  }

  if (imageInfo) {
    imageInfo.style.display = 'block';
    imageTitle.textContent = pin.title || 'Untitled';
    imageSource.href = pin.link || '#';
    imageSource.textContent = pin.link ? 'View on Pinterest' : '-';
  }

  updateRenderButton();
}

async function selectAutovidAudio() {
  if (!isElectron) return;

  try {
    const filePath = await ipcRenderer.invoke('select-audio-file');
    if (filePath) {
      autovidState.selectedAudioPath = filePath;
      audioFilePath.value = filePath.split('\\').pop();
      
      // Set audio preview
      audioPreviewContainer.style.display = 'block';
      autovidAudioPlayer.src = `file://${filePath}`;
      
      // Auto-fill output name
      const baseName = filePath.split('\\').pop().replace(/\.[^/.]+$/, '');
      outputNameInput.value = baseName;
      
      updateRenderButton();
    }
  } catch (error) {
    console.error('Error selecting audio:', error);
  }
}

function updateRenderButton() {
  if (renderVideoBtn) {
    const canRender = autovidState.selectedAudioPath && 
                      (autovidState.selectedImage || autovidState.selectedImagePath);
    renderVideoBtn.disabled = !canRender || autovidState.isRendering;
  }
}

// Listen for render progress updates from main process
if (isElectron) {
  ipcRenderer.on('render-progress', (event, progress) => {
    if (renderProgressFill && renderProgressText) {
      renderProgressFill.style.width = `${progress}%`;
      renderProgressText.textContent = `${progress}%`;
    }
  });
}

async function renderVideo() {
  if (!isElectron) return;
  
  if (autovidState.isRendering) return;

  // Validate inputs
  if (!autovidState.selectedAudioPath) {
    alert('Please select an audio file first');
    return;
  }

  let imagePath = autovidState.selectedImagePath;
  
  // If we have a selected image from Pinterest, download it first
  if (!imagePath && autovidState.selectedImage?.imageUrl) {
    try {
      const tempDir = await ipcRenderer.invoke('get-video-output-dir');
      const tempImagePath = `${tempDir}\\temp_image_${Date.now()}.jpg`;
      const downloadResult = await ipcRenderer.invoke('download-image', autovidState.selectedImage.imageUrl, tempImagePath);
      if (downloadResult.success) {
        imagePath = downloadResult.path;
      } else {
        alert('Failed to download image');
        return;
      }
    } catch (error) {
      alert(`Error downloading image: ${error.message}`);
      return;
    }
  }

  if (!imagePath) {
    alert('Please select an image first');
    return;
  }

  autovidState.isRendering = true;
  renderVideoBtn.disabled = true;
  renderProgress.style.display = 'block';
  renderOutput.style.display = 'none';
  renderProgressFill.style.width = '0%';
  renderProgressText.textContent = '0%';

  try {
    const outputName = outputNameInput?.value || `video_${Date.now()}`;
    const resolution = videoResolution?.value || '1080';

    const result = await ipcRenderer.invoke('render-video', {
      imagePath,
      audioPath: autovidState.selectedAudioPath,
      outputName,
      resolution
    });

    if (result.success) {
      autovidState.lastOutputPath = result.outputPath;
      renderOutput.style.display = 'block';
    } else {
      alert(`Render error: ${result.error}`);
    }
  } catch (error) {
    alert(`Render error: ${error.message}`);
  } finally {
    autovidState.isRendering = false;
    updateRenderButton();
  }
}

async function openAutovidOutput() {
  if (!isElectron) return;
  
  try {
    const outputDir = await ipcRenderer.invoke('get-video-output-dir');
    await ipcRenderer.invoke('open-folder', outputDir);
  } catch (error) {
    console.error('Error opening output folder:', error);
  }
}

// ============================
// YOUTUBE SECTION
// ============================

let youtubeState = {
  channels: [],
  selectedChannel: null,
  queue: [],
  history: [],
  serverOnline: false
};

// Show notification toast
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.innerHTML = `
    <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span class="notification-message">${message}</span>
  `;
  document.body.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// YouTube DOM Elements
const youtubeStatusEl = document.getElementById('youtube-status');
const youtubeChannelList = document.getElementById('youtube-channel-list');
const refreshChannelsBtn = document.getElementById('refresh-channels-btn');
const scanChannelsBtn = document.getElementById('scan-channels-btn');
const startServerBtn = document.getElementById('start-server-btn');
const serverStatusDot = document.getElementById('server-status-dot');
const serverStatusText = document.getElementById('server-status-text');
const videoDropzone = document.getElementById('video-dropzone');
const videoFileInput = document.getElementById('video-file-input');
const uploadQueueList = document.getElementById('upload-queue-list');
const queueCountBadge = document.getElementById('queue-count-badge');
const uploadHistoryList = document.getElementById('upload-history-list');
const uploadsTodayEl = document.getElementById('uploads-today');
const uploadsTotalEl = document.getElementById('uploads-total');
const uploadsFailedEl = document.getElementById('uploads-failed');
const publishTimeInput = document.getElementById('publish-time');
const defaultPrivacySelect = document.getElementById('default-privacy');
const autoUploadCheckbox = document.getElementById('auto-upload');

// Video edit modal elements
const videoEditModal = document.getElementById('video-edit-modal');
const closeVideoEditModalBtn = document.getElementById('close-video-edit-modal-btn');
const videoTitleInput = document.getElementById('video-title-input');
const videoDescriptionInput = document.getElementById('video-description-input');
const videoTagsInput = document.getElementById('video-tags-input');
const videoPrivacySelect = document.getElementById('video-privacy-select');
const saveVideoMetadataBtn = document.getElementById('save-video-metadata-btn');
const cancelVideoEditBtn = document.getElementById('cancel-video-edit-btn');

let youtubeInitialized = false;
let editingVideoId = null;

function initYouTubeSection() {
  if (youtubeInitialized) return;
  youtubeInitialized = true;

  // Event listeners
  if (refreshChannelsBtn) {
    refreshChannelsBtn.addEventListener('click', refreshYouTubeChannels);
  }

  if (scanChannelsBtn) {
    scanChannelsBtn.addEventListener('click', scanYouTubeChannels);
  }

  // Start Server button
  if (startServerBtn) {
    startServerBtn.addEventListener('click', toggleAutomationServer);
  }

  // Video dropzone
  if (videoDropzone && videoFileInput) {
    videoDropzone.addEventListener('click', () => videoFileInput.click());
    
    videoDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      videoDropzone.classList.add('dragover');
    });

    videoDropzone.addEventListener('dragleave', () => {
      videoDropzone.classList.remove('dragover');
    });

    videoDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      videoDropzone.classList.remove('dragover');
      handleVideoFiles(e.dataTransfer.files);
    });

    videoFileInput.addEventListener('change', (e) => {
      handleVideoFiles(e.target.files);
    });
  }

  // Video edit modal
  if (closeVideoEditModalBtn) {
    closeVideoEditModalBtn.addEventListener('click', closeVideoEditModal);
  }

  if (cancelVideoEditBtn) {
    cancelVideoEditBtn.addEventListener('click', closeVideoEditModal);
  }

  if (saveVideoMetadataBtn) {
    saveVideoMetadataBtn.addEventListener('click', saveVideoMetadata);
  }

  // Initial load - wait for server to be ready
  setTimeout(() => {
    checkYouTubeServerWithRetry();
  }, 1000);
}

// Automation server port
const AUTOMATION_SERVER_PORT = 9000;
const AUTOMATION_SERVER_URL = `http://localhost:${AUTOMATION_SERVER_PORT}`;

// Check server with retry logic
async function checkYouTubeServerWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    const isOnline = await checkYouTubeServer();
    if (isOnline) {
      scanYouTubeChannels();
      return true;
    }
    if (i < retries - 1) {
      console.log(`Server not ready, retrying in ${delay/1000}s... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  console.log('Server offline after retries');
  return false;
}

async function checkYouTubeServer() {
  try {
    // Try to connect to automation server directly
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/channels`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    youtubeState.serverOnline = response.ok;
    
    // Update main status
    if (youtubeStatusEl) {
      if (response.ok) {
        youtubeStatusEl.textContent = '● YouTube: Online';
        youtubeStatusEl.classList.remove('offline');
        youtubeStatusEl.classList.add('online');
      } else {
        youtubeStatusEl.textContent = '● YouTube: Offline';
        youtubeStatusEl.classList.remove('online');
        youtubeStatusEl.classList.add('offline');
      }
    }
    
    // Update server status box
    updateServerStatusUI(response.ok);
    
    return response.ok;
  } catch (error) {
    youtubeState.serverOnline = false;
    if (youtubeStatusEl) {
      youtubeStatusEl.textContent = '● YouTube: Offline';
      youtubeStatusEl.classList.remove('online');
      youtubeStatusEl.classList.add('offline');
    }
    updateServerStatusUI(false);
    return false;
  }
}

function updateServerStatusUI(isOnline) {
  if (serverStatusDot) {
    serverStatusDot.className = 'status-dot ' + (isOnline ? 'online' : 'offline');
  }
  if (serverStatusText) {
    serverStatusText.textContent = isOnline ? 'Server đang chạy' : 'Server đang tắt';
  }
  if (startServerBtn) {
    startServerBtn.textContent = isOnline ? '⏹ Dừng Server' : '▶ Khởi động Server';
    startServerBtn.classList.toggle('stop', isOnline);
  }
}

async function toggleAutomationServer() {
  if (startServerBtn) {
    startServerBtn.disabled = true;
    startServerBtn.textContent = '⏳ Đang xử lý...';
  }
  
  try {
    if (youtubeState.serverOnline) {
      // Stop server
      const result = await ipcRenderer.invoke('stop-automation-server');
      if (result.success) {
        showNotification('Đã dừng Automation Server', 'success');
        youtubeState.serverOnline = false;
        updateServerStatusUI(false);
        if (youtubeChannelList) {
          youtubeChannelList.innerHTML = '<div class="empty-state">Server offline. Click "Khởi động Server" to start.</div>';
        }
      } else {
        showNotification('Lỗi dừng server: ' + result.error, 'error');
      }
    } else {
      // Start server
      showNotification('Đang khởi động server...', 'info');
      const result = await ipcRenderer.invoke('start-automation-server');
      if (result.success) {
        // Wait and retry checking server
        const serverReady = await checkYouTubeServerWithRetry(10, 1000);
        if (serverReady) {
          showNotification('Automation Server đã sẵn sàng!', 'success');
        } else {
          showNotification('Server khởi động nhưng chưa sẵn sàng', 'error');
        }
      } else {
        showNotification('Lỗi khởi động server: ' + result.error, 'error');
      }
    }
  } catch (error) {
    showNotification('Lỗi: ' + error.message, 'error');
  } finally {
    if (startServerBtn) {
      startServerBtn.disabled = false;
      updateServerStatusUI(youtubeState.serverOnline);
    }
  }
}

async function scanYouTubeChannels() {
  if (!youtubeChannelList) return;
  
  youtubeChannelList.innerHTML = '<div class="empty-state">Scanning channels...</div>';

  // Check if server is online first
  if (!youtubeState.serverOnline) {
    youtubeChannelList.innerHTML = '<div class="empty-state">Server offline. Click "Khởi động Server" to start.</div>';
    return;
  }

  try {
    // First try to get from automation server (if running)
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/channels`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      youtubeState.channels = data.channels.map(ch => ({
        id: ch.channelId,
        name: ch.name,
        account: ch.accountName,
        ready: ch.isReady,
        hasToken: ch.hasToken,
        uploadFolder: ch.uploadsPath,
        queueCount: ch.queueCount,
        historyCount: ch.historyCount
      }));
      youtubeState.serverOnline = true;
      renderYouTubeChannels();
      
      // Update status
      if (youtubeStatusEl) {
        youtubeStatusEl.textContent = '● YouTube: Online';
        youtubeStatusEl.classList.remove('offline');
        youtubeStatusEl.classList.add('online');
      }
      updateServerStatusUI(true);
    } else {
      throw new Error('Server not available');
    }
  } catch (error) {
    console.error('Error scanning channels:', error.message);
    
    // Fallback to local scan via IPC
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('scan-youtube-channels');
        if (result.success) {
          youtubeState.channels = result.channels;
          renderYouTubeChannels();
        } else {
          youtubeChannelList.innerHTML = `<div class="empty-state">Error: ${result.error}</div>`;
        }
      } catch (ipcError) {
        youtubeChannelList.innerHTML = `<div class="empty-state">Error: ${ipcError.message}</div>`;
      }
    } else {
      youtubeChannelList.innerHTML = `
        <div class="empty-state">
          <p>⚠️ Automation server offline</p>
          <p style="font-size: 12px; margin-top: 10px;">
            Start the server: <code>cd automation && npm start</code>
          </p>
        </div>
      `;
    }
  }
}

async function refreshYouTubeChannels() {
  await checkYouTubeServer();
  await scanYouTubeChannels();
}

function renderYouTubeChannels() {
  if (!youtubeChannelList) return;

  if (youtubeState.channels.length === 0) {
    youtubeChannelList.innerHTML = '<div class="empty-state">No channels found</div>';
    return;
  }

  youtubeChannelList.innerHTML = youtubeState.channels.map(channel => `
    <div class="channel-item ${youtubeState.selectedChannel?.id === channel.id ? 'selected' : ''}" 
         data-channel-id="${channel.id}">
      <span class="channel-name">${channel.name}</span>
      <span class="channel-status ${channel.ready ? 'ready' : 'offline'}">
        ${channel.ready ? '✓ Ready' : '⚠ Setup needed'}
      </span>
    </div>
  `).join('');

  // Add click handlers
  youtubeChannelList.querySelectorAll('.channel-item').forEach(item => {
    item.addEventListener('click', () => {
      const channelId = item.dataset.channelId;
      selectYouTubeChannel(channelId);
    });
  });
}

function selectYouTubeChannel(channelId) {
  const channel = youtubeState.channels.find(c => c.id === channelId);
  youtubeState.selectedChannel = channel;
  renderYouTubeChannels();
  
  // Load channel's queue and history
  if (channel && youtubeState.serverOnline) {
    loadChannelStatus(channelId);
  }
}

async function loadChannelStatus(channelId) {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/status/${channelId}`);
    if (response.ok) {
      const data = await response.json();
      
      // Update queue from server
      if (data.queue) {
        // Merge with local queue
        data.queue.forEach(serverItem => {
          const existsLocally = youtubeState.queue.find(q => q.fileName === serverItem.fileName);
          if (!existsLocally) {
            youtubeState.queue.push({
              id: serverItem.id,
              fileName: serverItem.fileName,
              filePath: serverItem.filePath,
              metadata: serverItem.metadata,
              status: serverItem.status
            });
          }
        });
        renderUploadQueue();
      }
      
      // Update history from server
      if (data.history) {
        youtubeState.history = data.history;
        renderUploadHistory();
        updateHistoryStats();
      }
    }
  } catch (error) {
    console.error('Error loading channel status:', error);
  }
}

function handleVideoFiles(files) {
  const videoFiles = Array.from(files).filter(f => 
    f.type.startsWith('video/') || 
    ['.mp4', '.mov', '.avi', '.mkv', '.webm'].some(ext => f.name.toLowerCase().endsWith(ext))
  );

  if (videoFiles.length === 0) {
    alert('Please select valid video files');
    return;
  }

  videoFiles.forEach(file => {
    addVideoToQueue({
      filePath: file.path,
      fileName: file.name,
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      tags: [],
      privacy: defaultPrivacySelect?.value || 'private'
    });
  });
}

async function addVideoToQueue(videoData) {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('add-to-upload-queue', {
      ...videoData,
      channelId: youtubeState.selectedChannel?.id
    });

    if (result.success) {
      youtubeState.queue.push(result.item);
      renderUploadQueue();
    }
  } catch (error) {
    console.error('Error adding to queue:', error);
  }
}

function renderUploadQueue() {
  if (!uploadQueueList) return;

  if (youtubeState.queue.length === 0) {
    uploadQueueList.innerHTML = '<div class="empty-state">No videos in queue</div>';
    queueCountBadge.textContent = '0';
    return;
  }

  queueCountBadge.textContent = youtubeState.queue.length;

  uploadQueueList.innerHTML = youtubeState.queue.map(item => `
    <div class="queue-item" data-item-id="${item.id}">
      <div class="video-info">
        <div class="video-title">${item.metadata.title}</div>
        <div class="video-meta">
          <span class="upload-status ${item.status}">${item.status}</span>
          · ${item.fileName}
        </div>
      </div>
      <div class="queue-actions">
        <button class="btn-secondary edit-btn" title="Edit">✏️</button>
        <button class="btn-secondary upload-btn" title="Upload" ${item.status !== 'draft' ? 'disabled' : ''}>▶️</button>
        <button class="btn-danger remove-btn" title="Remove">🗑️</button>
      </div>
    </div>
  `).join('');

  // Add event handlers
  uploadQueueList.querySelectorAll('.queue-item').forEach(item => {
    const itemId = item.dataset.itemId;
    
    item.querySelector('.edit-btn')?.addEventListener('click', () => openVideoEditModal(itemId));
    item.querySelector('.upload-btn')?.addEventListener('click', () => startUpload(itemId));
    item.querySelector('.remove-btn')?.addEventListener('click', () => removeFromQueue(itemId));
  });
}

function openVideoEditModal(itemId) {
  const item = youtubeState.queue.find(q => q.id === itemId);
  if (!item) return;

  editingVideoId = itemId;

  videoTitleInput.value = item.metadata.title || '';
  videoDescriptionInput.value = item.metadata.description || '';
  videoTagsInput.value = (item.metadata.tags || []).join(', ');
  videoPrivacySelect.value = item.metadata.privacy || 'private';

  videoEditModal.style.display = 'flex';
}

function closeVideoEditModal() {
  videoEditModal.style.display = 'none';
  editingVideoId = null;
}

async function saveVideoMetadata() {
  if (!editingVideoId || !isElectron) return;

  try {
    const updates = {
      title: videoTitleInput.value,
      description: videoDescriptionInput.value,
      tags: videoTagsInput.value.split(',').map(t => t.trim()).filter(t => t),
      privacy: videoPrivacySelect.value
    };

    const result = await ipcRenderer.invoke('update-queue-item', editingVideoId, updates);
    
    if (result.success) {
      const item = youtubeState.queue.find(q => q.id === editingVideoId);
      if (item) {
        Object.assign(item.metadata, updates);
      }
      renderUploadQueue();
      closeVideoEditModal();
    }
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
}

async function startUpload(itemId) {
  const item = youtubeState.queue.find(q => q.id === itemId);
  if (!item) {
    alert('Video not found in queue');
    return;
  }
  
  if (!youtubeState.selectedChannel) {
    alert('Please select a channel first');
    return;
  }

  if (!youtubeState.selectedChannel.ready) {
    alert('Selected channel is not ready. Please authenticate with YouTube first.');
    return;
  }

  if (!youtubeState.serverOnline) {
    alert('Automation server is offline. Please start the server first.');
    return;
  }

  item.status = 'uploading';
  renderUploadQueue();

  try {
    // Copy video to channel's upload folder - server will auto-detect and upload
    if (isElectron) {
      const result = await ipcRenderer.invoke('copy-video-for-upload', {
        videoPath: item.filePath,
        channelId: youtubeState.selectedChannel.id,
        metadata: item.metadata
      });
      
      if (result.success) {
        item.status = 'pending';
        item.serverPath = result.destPath;
        showNotification(`Video đã gửi đến ${youtubeState.selectedChannel.name}. Server sẽ tự động upload.`, 'success');
        renderUploadQueue();
        
        // Start polling for status updates
        pollUploadStatus(item.id, youtubeState.selectedChannel.id);
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    item.status = 'failed';
    item.error = error.message;
    renderUploadQueue();
    alert(`Upload error: ${error.message}`);
  }
}

// Poll automation server for upload status
async function pollUploadStatus(itemId, channelId) {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  const poll = async () => {
    try {
      const response = await fetch(`${AUTOMATION_SERVER_URL}/api/status/${channelId}`);
      const data = await response.json();
      
      // Check if video is completed or failed in history
      const historyItem = data.history?.find(h => h.fileName === youtubeState.queue.find(q => q.id === itemId)?.fileName);
      
      if (historyItem) {
        const item = youtubeState.queue.find(q => q.id === itemId);
        if (item) {
          item.status = historyItem.status;
          item.result = historyItem.result;
          
          // Move to history
          youtubeState.history.push(item);
          youtubeState.queue = youtubeState.queue.filter(q => q.id !== itemId);
          
          renderUploadQueue();
          renderUploadHistory();
          updateHistoryStats();
          
          if (historyItem.status === 'completed') {
            console.log('✅ Upload completed:', historyItem.result?.videoUrl);
          }
        }
        return; // Stop polling
      }

      // Continue polling
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    } catch (error) {
      console.error('Polling error:', error);
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000);
      }
    }
  };

  poll();
}

function updateHistoryStats() {
  const today = new Date().toDateString();
  const todayUploads = youtubeState.history.filter(h => 
    new Date(h.completedAt || h.addedAt).toDateString() === today && h.status === 'completed'
  ).length;
  
  const totalUploads = youtubeState.history.filter(h => h.status === 'completed').length;
  const failedUploads = youtubeState.history.filter(h => h.status === 'failed').length;

  if (uploadsTodayEl) uploadsTodayEl.textContent = todayUploads;
  if (uploadsTotalEl) uploadsTotalEl.textContent = totalUploads;
  if (uploadsFailedEl) uploadsFailedEl.textContent = failedUploads;
}

async function removeFromQueue(itemId) {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('remove-from-queue', itemId);
    if (result.success) {
      youtubeState.queue = youtubeState.queue.filter(q => q.id !== itemId);
      renderUploadQueue();
    }
  } catch (error) {
    console.error('Error removing from queue:', error);
  }
}

function renderUploadHistory() {
  if (!uploadHistoryList) return;

  if (youtubeState.history.length === 0) {
    uploadHistoryList.innerHTML = '<div class="empty-state">No upload history</div>';
    return;
  }

  uploadHistoryList.innerHTML = youtubeState.history.slice(-20).reverse().map(item => `
    <div class="history-item">
      <div class="video-info">
        <div class="video-title">${item.metadata?.title || item.fileName}</div>
        <div class="video-meta">
          <span class="upload-status ${item.status}">${item.status}</span>
          · ${new Date(item.completedAt || item.addedAt).toLocaleString()}
        </div>
      </div>
    </div>
  `).join('');
}

// Periodic YouTube status check
setInterval(() => {
  if (youtubeInitialized) {
    checkYouTubeServer();
  }
}, 30000);


// ============================
// CROSS-SECTION INTEGRATION
// ============================

/**
 * Create video from currently playing beat
 * Uses the beat's associated image if available
 */
async function createVideoFromCurrentBeat() {
  if (!currentBeat) {
    alert('Please select a beat first');
    return;
  }

  // Switch to AutoVid section
  document.querySelector('.main-nav-tab[data-section="autovid"]')?.click();

  // Wait for section to initialize
  await new Promise(r => setTimeout(r, 100));

  // Set audio
  autovidState.selectedAudioPath = currentBeat.path;
  if (audioFilePath) {
    audioFilePath.value = currentBeat.name;
  }
  if (audioPreviewContainer) {
    audioPreviewContainer.style.display = 'block';
    autovidAudioPlayer.src = `file://${currentBeat.path}`;
  }

  // Set image if available
  const imagePath = beatImages[currentBeat.path];
  if (imagePath) {
    autovidState.selectedImagePath = imagePath;
    if (previewImage && imagePlaceholder) {
      previewImage.src = `file://${imagePath}`;
      previewImage.style.display = 'block';
      imagePlaceholder.style.display = 'none';
    }
    if (imageInfo) {
      imageInfo.style.display = 'block';
      imageTitle.textContent = imagePath.split('\\').pop();
      imageSource.textContent = 'From beat library';
    }
  }

  // Set output name
  const beatNameWithoutExt = currentBeat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
  if (outputNameInput) {
    outputNameInput.value = beatNameWithoutExt;
  }

  updateRenderButton();
}

/**
 * Upload video to YouTube from current selection
 */
async function uploadCurrentVideoToYouTube() {
  if (!autovidState.lastOutputPath) {
    alert('Please render a video first');
    return;
  }

  // Switch to YouTube section
  document.querySelector('.main-nav-tab[data-section="youtube"]')?.click();

  // Wait for section to initialize
  await new Promise(r => setTimeout(r, 100));

  // Add video to queue
  const fileName = autovidState.lastOutputPath.split('\\').pop();
  const title = fileName.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '');

  addVideoToQueue({
    filePath: autovidState.lastOutputPath,
    fileName: fileName,
    title: title,
    description: '',
    tags: [],
    privacy: defaultPrivacySelect?.value || 'private'
  });
}

// Make functions globally available
window.createVideoFromCurrentBeat = createVideoFromCurrentBeat;
window.uploadCurrentVideoToYouTube = uploadCurrentVideoToYouTube;
