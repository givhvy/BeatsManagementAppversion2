// Check if running in Electron or browser
const isElectron = typeof require !== 'undefined' && typeof require('electron') !== 'undefined';
const ipcRenderer = isElectron ? require('electron').ipcRenderer : null;

// State
let currentFolder = null;
let allBeats = [];
let packs = [];
let fileObjectsCache = new Map(); // Cache file objects by path

// DOM Elements
const selectFolderBtn = document.getElementById('select-folder-btn');
const refreshBeatsBtn = document.getElementById('refresh-beats-btn');
const createPackBtn = document.getElementById('create-pack-btn');
const folderPathEl = document.getElementById('folder-path');
const beatsListEl = document.getElementById('beats-list');
const packsGridEl = document.getElementById('packs-grid');
const filterInput = document.getElementById('filter-input');
const packFilterInput = document.getElementById('pack-filter-input');
const databaseInfoBtn = document.getElementById('database-info-btn');
const databaseModal = document.getElementById('database-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const dbPathDisplay = document.getElementById('db-path-display');
const copyPathBtn = document.getElementById('copy-path-btn');
const exportDbBtn = document.getElementById('export-db-btn');
const importDbBtn = document.getElementById('import-db-btn');

// Pack detail panel elements
const middlePanelEl = document.getElementById('middle-panel');
const rightPanelEl = document.getElementById('right-panel');
const backToPacksBtn = document.getElementById('back-to-packs-btn');
const packDetailTitleEl = document.getElementById('pack-detail-title');
const packDetailCountEl = document.getElementById('pack-detail-count');
const packDetailBeatsEl = document.getElementById('pack-detail-beats');
const deleteCurrentPackBtn = document.getElementById('delete-current-pack-btn');

let currentPackId = null;

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
      currentFolder = savedData.currentFolder;
      packs = savedData.packs || [];

      if (currentFolder) {
        folderPathEl.textContent = currentFolder;
        await loadBeats(currentFolder);
      }

      renderPacks();
    }
  } else {
    // Browser mode - load from localStorage
    const savedData = localStorage.getItem('beats-data');
    if (savedData) {
      const data = JSON.parse(savedData);
      currentFolder = data.currentFolder;
      packs = data.packs || [];

      if (currentFolder) {
        folderPathEl.textContent = currentFolder;
      }

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
        saveData();
      }
    }
  });

  // Audio player event listeners
  setupAudioPlayer();
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
    saveData();
  }
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

async function selectFolder() {
  if (isElectron) {
    const folderPath = await ipcRenderer.invoke('select-folder');
    if (folderPath) {
      currentFolder = folderPath;
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
        currentFolder = 'Selected Files';
        folderPathEl.textContent = `${files.length} audio files selected`;

        const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
        allBeats = files
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

        renderBeats();
        await saveData();
      }
    };

    input.click();
  }
}

async function loadBeats(folderPath) {
  if (isElectron) {
    allBeats = await ipcRenderer.invoke('read-beats-folder', folderPath);
    renderBeats();
  }
}

async function refreshBeats() {
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

  if (allBeats.length === 0) {
    beatsListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No beats found in this folder</div>';
    return;
  }

  // Get filter value
  const filterValue = filterInput.value.trim();

  // Filter beats by number if filter is provided
  let filteredBeats = allBeats;
  if (filterValue) {
    filteredBeats = allBeats.filter(beat => {
      const num = extractNumber(beat.name);
      return num !== null && num.toString() === filterValue;
    });
  }

  // Sort filtered beats by number (high to low)
  const sortedBeats = sortBeatsByNumber(filteredBeats);

  if (sortedBeats.length === 0) {
    beatsListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No beats match the filter</div>';
    return;
  }

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
    if (containingPacks.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'beat-tags';

      containingPacks.forEach(pack => {
        const tag = document.createElement('span');
        tag.className = 'pack-tag';
        tag.textContent = formatPackTag(pack.name);
        tagsContainer.appendChild(tag);
      });

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

function renderPacks() {
  packsGridEl.innerHTML = '';

  if (packs.length === 0) {
    packsGridEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; grid-column: 1/-1;">No packs yet. Create one to organize your beats!</div>';
    return;
  }

  // Get filter value
  const filterValue = packFilterInput.value.trim().toLowerCase();

  // Filter packs by number if filter is provided
  let filteredPacks = packs;
  if (filterValue) {
    filteredPacks = packs.filter(pack => {
      const num = extractPackNumber(pack.name);
      // Support both "C2" and "2" formats
      const filterNum = extractPackNumber(filterValue);
      return num !== null && num === filterNum;
    });
  }

  // Sort filtered packs by number (ascending order)
  const sortedPacks = sortPacksByNumber(filteredPacks);

  if (sortedPacks.length === 0) {
    packsGridEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; grid-column: 1/-1;">No packs match the filter</div>';
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

  infoEl.appendChild(titleEl);
  infoEl.appendChild(subtitleEl);

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

  const nameEl = document.createElement('span');
  // Remove file extension from display name
  const displayName = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
  nameEl.textContent = displayName;

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

  beatItemEl.appendChild(numberBadge);
  beatItemEl.appendChild(nameEl);
  beatItemEl.appendChild(removeBtn);

  return beatItemEl;
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
    currentFolder,
    packs
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
      currentFolder,
      packs: packsToSave
    }));
  }
}
