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
const createPackBtn = document.getElementById('create-pack-btn');
const folderPathEl = document.getElementById('folder-path');
const beatsListEl = document.getElementById('beats-list');
const packsContainerEl = document.getElementById('packs-container');

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
  createPackBtn.addEventListener('click', createPack);

  // Audio player event listeners
  setupAudioPlayer();
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
  nowPlayingEl.textContent = beatName;
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

function renderBeats() {
  beatsListEl.innerHTML = '';

  if (allBeats.length === 0) {
    beatsListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No beats found in this folder</div>';
    return;
  }

  allBeats.forEach(beat => {
    const beatEl = document.createElement('div');
    beatEl.className = 'beat-item';
    beatEl.draggable = true;
    beatEl.dataset.beatPath = beat.path;
    beatEl.dataset.beatName = beat.name;

    const beatNameEl = document.createElement('div');
    beatNameEl.className = 'beat-name';
    beatNameEl.textContent = beat.name;

    beatEl.appendChild(beatNameEl);
    beatsListEl.appendChild(beatEl);

    // Click to play
    beatEl.addEventListener('click', (e) => {
      // Don't play if dragging
      if (e.target.classList.contains('dragging')) return;
      playBeat(beat.path, beat.name);
    });

    // Drag events for moving to packs (internal)
    beatEl.addEventListener('dragstart', (e) => {
      // For internal drag to packs
      draggedBeat = {
        name: beat.name,
        path: beat.path,
        file: beat.file // Include file object for browser mode
      };
      e.target.classList.add('dragging');

      // For external drag to desktop/Chrome
      if (isElectron) {
        ipcRenderer.send('ondragstart', beat.path);
      } else if (beat.file) {
        // Browser mode - add file to drag
        e.dataTransfer.effectAllowed = 'copy';
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
    beats: []
  };

  packs.push(pack);
  renderPacks();
  saveData();
}

function renderPacks() {
  packsContainerEl.innerHTML = '';

  if (packs.length === 0) {
    packsContainerEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No packs yet. Create one to organize your beats!</div>';
    return;
  }

  packs.forEach(pack => {
    const packEl = createPackElement(pack);
    packsContainerEl.appendChild(packEl);
  });
}

function createPackElement(pack) {
  const packEl = document.createElement('div');
  packEl.className = 'pack';
  packEl.dataset.packId = pack.id;

  // Pack header
  const headerEl = document.createElement('div');
  headerEl.className = 'pack-header';

  const titleEl = document.createElement('input');
  titleEl.type = 'text';
  titleEl.className = 'pack-title';
  titleEl.value = pack.name;
  titleEl.addEventListener('input', (e) => {
    pack.name = e.target.value;
    saveData();
  });

  const countEl = document.createElement('span');
  countEl.className = 'pack-count';
  countEl.textContent = `${pack.beats.length} beats`;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-pack-btn';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => deletePack(pack.id));

  headerEl.appendChild(titleEl);
  headerEl.appendChild(countEl);
  headerEl.appendChild(deleteBtn);

  // Pack beats container
  const beatsEl = document.createElement('div');
  beatsEl.className = 'pack-beats';
  beatsEl.dataset.packId = pack.id;

  // Add existing beats
  pack.beats.forEach(beat => {
    const beatItemEl = createPackBeatElement(beat, pack.id);
    beatsEl.appendChild(beatItemEl);
  });

  // Drop zone events
  beatsEl.addEventListener('dragover', handleDragOver);
  beatsEl.addEventListener('dragleave', handleDragLeave);
  beatsEl.addEventListener('drop', (e) => handleDrop(e, pack.id));

  packEl.appendChild(headerEl);
  packEl.appendChild(beatsEl);

  return packEl;
}

function createPackBeatElement(beat, packId) {
  const beatItemEl = document.createElement('div');
  beatItemEl.className = 'pack-beat-item';
  beatItemEl.dataset.beatPath = beat.path;
  beatItemEl.dataset.beatName = beat.name;
  beatItemEl.draggable = true;

  const nameEl = document.createElement('span');
  nameEl.textContent = beat.name;

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
      // Use Electron's native drag feature to drag file out
      ipcRenderer.send('ondragstart', beat.path);
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

  beatItemEl.appendChild(nameEl);
  beatItemEl.appendChild(removeBtn);

  return beatItemEl;
}

function deletePack(packId) {
  packs = packs.filter(p => p.id !== packId);
  renderPacks();
  saveData();
}

function removeBeatFromPack(packId, beatPath) {
  const pack = packs.find(p => p.id === packId);
  if (pack) {
    pack.beats = pack.beats.filter(b => b.path !== beatPath);
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
    renderPacks();
    saveData();
  }

  draggedBeat = null;
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
