// BACKGROUND MUSIC SECTION
// ============================

let bgMusicState = {
  allMusic: [],
  packs: [],
  currentPackId: null,
  dragCounter: 0,
  currentTab: 'all',
  filterText: '',
  packFilterText: '',
  draggedMusic: null,
  currentAudio: null,
  selectedMusicId: null,
  folderPath: 'D:\\BackgroundMusic',
  showHidden: false
};

function initBackgroundSection() {
  console.log('Background Music section initialized');

  // Set the background music folder path
  bgMusicState.folderPath = 'D:\\BackgroundMusic';

  // Update folder path display
  const folderPathEl = document.getElementById('bgmusic-folder-path');
  if (folderPathEl) {
    folderPathEl.textContent = bgMusicState.folderPath;
  }

  loadBackgroundMusicData();
  bindBackgroundMusicEvents();

  // Auto-load music from folder
  loadMusicFromFolder();
}

async function loadBackgroundMusicData() {
  if (!ipcRenderer) {
    renderBackgroundMusicList();
    renderBackgroundMusicPacks();
    return;
  }

  try {
    const data = await ipcRenderer.invoke('get-background-music-data');
    bgMusicState.allMusic = data.music || [];
    bgMusicState.packs = data.packs || [];

    // Ensure each music has an ID
    bgMusicState.allMusic.forEach((music, idx) => {
      if (!music.id) music.id = `bgm_${Date.now()}_${idx}`;
    });

    // Ensure each pack has an ID and music array
    bgMusicState.packs.forEach((pack, idx) => {
      if (!pack.id) pack.id = `bgpack_${Date.now()}_${idx}`;
      if (!pack.music) pack.music = [];
    });

    renderBackgroundMusicList();
    renderBackgroundMusicPacks();
  } catch (error) {
    console.error('Error loading background music data:', error);
    bgMusicState.allMusic = [];
    bgMusicState.packs = [];
    renderBackgroundMusicList();
    renderBackgroundMusicPacks();
  }
}

async function saveBackgroundMusicData() {
  if (!ipcRenderer) return;

  try {
    await ipcRenderer.invoke('save-background-music-data', {
      music: bgMusicState.allMusic,
      packs: bgMusicState.packs
    });
  } catch (error) {
    console.error('Error saving background music data:', error);
  }
}

function bindBackgroundMusicEvents() {
  // Refresh button - reload from folder
  const refreshBtn = document.getElementById('refresh-bgmusic-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadMusicFromFolder();
      showNotification('Refreshing music from D:\\BackgroundMusic...', 'info');
    });
  }

  // Create pack button
  const createPackBtn = document.getElementById('bgmusic-create-pack-btn');
  if (createPackBtn) {
    createPackBtn.addEventListener('click', createBackgroundMusicPack);
  }

  // Tab buttons
  document.querySelectorAll('[data-bgmusic-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-bgmusic-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bgMusicState.currentTab = btn.dataset.bgmusicType;
      renderBackgroundMusicList();
    });
  });

  // Filter input
  const filterInput = document.getElementById('bgmusic-filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      bgMusicState.filterText = e.target.value.toLowerCase();
      renderBackgroundMusicList();
    });
  }

  // Pack filter input
  const packFilterInput = document.getElementById('bgmusic-pack-filter-input');
  if (packFilterInput) {
    packFilterInput.addEventListener('input', (e) => {
      bgMusicState.packFilterText = e.target.value.toLowerCase();
      renderBackgroundMusicPacks();
    });
  }

  // Back to packs button
  const backBtn = document.getElementById('bgmusic-back-to-packs-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      bgMusicState.currentPackId = null;
      document.getElementById('bgmusic-middle-panel').style.display = 'flex';
      document.getElementById('bgmusic-right-panel').style.display = 'none';
    });
  }

  // Pack detail title (edit pack name)
  const packTitleInput = document.getElementById('bgmusic-pack-detail-title');
  if (packTitleInput) {
    packTitleInput.addEventListener('change', () => {
      const pack = bgMusicState.packs.find(p => p.id === bgMusicState.currentPackId);
      if (pack) {
        pack.name = packTitleInput.value.trim() || 'Unnamed Pack';
        saveBackgroundMusicData();
        renderBackgroundMusicPacks();
      }
    });
  }

  // Delete pack button
  const deletePackBtn = document.getElementById('bgmusic-delete-current-pack-btn');
  if (deletePackBtn) {
    deletePackBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this pack?')) {
        bgMusicState.packs = bgMusicState.packs.filter(p => p.id !== bgMusicState.currentPackId);
        bgMusicState.currentPackId = null;
        saveBackgroundMusicData();
        document.getElementById('bgmusic-middle-panel').style.display = 'flex';
        document.getElementById('bgmusic-right-panel').style.display = 'none';
        renderBackgroundMusicPacks();
      }
    });
  }

  // Hide/Unhide pack button
  const toggleHideBtn = document.getElementById('bgmusic-toggle-hide-pack-btn');
  if (toggleHideBtn) {
    toggleHideBtn.addEventListener('click', () => {
      const pack = bgMusicState.packs.find(p => p.id === bgMusicState.currentPackId);
      if (pack) {
        pack.hidden = !pack.hidden;
        toggleHideBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';
        saveBackgroundMusicData();
        renderBackgroundMusicPacks();
      }
    });
  }

  // Toggle hidden view button
  const toggleHiddenViewBtn = document.getElementById('bgmusic-toggle-hidden-view-btn');
  if (toggleHiddenViewBtn) {
    toggleHiddenViewBtn.addEventListener('click', () => {
      bgMusicState.showHidden = !bgMusicState.showHidden;
      renderBackgroundMusicPacks();
    });
  }

  // Zoom buttons
  const zoomInBtn = document.getElementById('bgmusic-packs-zoom-in');
  const zoomOutBtn = document.getElementById('bgmusic-packs-zoom-out');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      // Implement zoom if needed
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      // Implement zoom if needed
    });
  }
}

function renderBackgroundMusicList() {
  const listContainer = document.getElementById('bgmusic-list');
  if (!listContainer) return;

  // Filter music based on tab and search
  let filteredMusic = [...bgMusicState.allMusic];

  // Apply tab filter
  if (bgMusicState.currentTab === 'tagged') {
    filteredMusic = filteredMusic.filter(m => {
      return bgMusicState.packs.some(pack => pack.music && pack.music.some(pm => pm.id === m.id));
    });
  } else if (bgMusicState.currentTab === 'untagged') {
    filteredMusic = filteredMusic.filter(m => {
      return !bgMusicState.packs.some(pack => pack.music && pack.music.some(pm => pm.id === m.id));
    });
  }

  // Apply search filter
  if (bgMusicState.filterText) {
    filteredMusic = filteredMusic.filter(m =>
      m.name.toLowerCase().includes(bgMusicState.filterText)
    );
  }

  if (filteredMusic.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: #666; padding: 40px 20px; font-size: 13px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.5;">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <div style="margin-bottom: 15px; font-weight: 500;">No background music yet</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 8px;"> Storage: <span style="color: #3b82f6; font-weight: 500;">D:\\BackgroundMusic</span></div>
        <div style="font-size: 11px; color: #888; margin-bottom: 15px;"> Drag & drop audio files here<br>Files will be copied to the folder above</div>
        <button class="btn-primary" onclick="importBackgroundMusicFiles()">Import Music Files</button>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filteredMusic.map((music) => {
    // Find which packs contain this music
    const packTags = bgMusicState.packs
      .filter(pack => pack.music && pack.music.some(pm => pm.id === music.id))
      .map(pack => pack.name);

    return `
      <div class="beat-item" data-music-id="${music.id}" draggable="true">
        <div class="beat-item-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div class="beat-item-info">
          <div class="beat-item-name">${music.name}</div>
          ${music.duration ? `<div class="beat-item-meta">${formatDuration(music.duration)}</div>` : ''}
          ${packTags.length > 0 ? `<div class="beat-item-tags">${packTags.join(', ')}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add event handlers
  listContainer.querySelectorAll('.beat-item').forEach(item => {
    const musicId = item.dataset.musicId;
    const music = bgMusicState.allMusic.find(m => m.id === musicId);

    if (!music) return;

    // Click to play
    item.addEventListener('click', () => {
      playBackgroundMusic(musicId);
    });

    // Drag start
    item.addEventListener('dragstart', (e) => {
      bgMusicState.draggedMusic = music;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';
    });

    // Drag end
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      bgMusicState.draggedMusic = null;
    });
  });
}

function renderBackgroundMusicPacks() {
  const grid = document.getElementById('bgmusic-packs-grid');
  if (!grid) return;

  // Filter packs
  let filteredPacks = bgMusicState.showHidden
    ? bgMusicState.packs.filter(p => p.hidden)
    : bgMusicState.packs.filter(p => !p.hidden);

  // Apply search filter
  if (bgMusicState.packFilterText) {
    filteredPacks = filteredPacks.filter(pack =>
      pack.name.toLowerCase().includes(bgMusicState.packFilterText) ||
      pack.name.replace(/\D/g, '').includes(bgMusicState.packFilterText.replace(/\D/g, ''))
    );
  }

  if (filteredPacks.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #666; padding: 60px 20px; font-size: 14px;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.4;">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <div style="margin-bottom: 15px; font-weight: 500;">No packs yet</div>
        <button class="btn-primary" onclick="createBackgroundMusicPack()">+ Create First Pack</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredPacks.map((pack, index) => {
    const musicCount = pack.music ? pack.music.length : 0;

    return `
      <div class="pack-card" data-pack-id="${pack.id}"
           ondragover="handleBgMusicPackDragOver(event, '${pack.id}')"
           ondragleave="handleBgMusicPackDragLeave(event)"
           ondrop="handleBgMusicPackDrop(event, '${pack.id}')">
        <div class="pack-card-image">
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: bold; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
            ${pack.name}
          </div>
          <div class="pack-card-count">${musicCount}</div>
          <div class="pack-card-order">#${index + 1}</div>
        </div>
        <div class="pack-card-info">
          <div class="pack-card-title">${pack.name}</div>
          <div class="pack-card-subtitle">${musicCount === 1 ? '1 track' : `${musicCount} tracks`}</div>
          <div class="pack-progress-container">
            <div class="pack-progress-bar">
              <div class="pack-progress-fill" style="width: ${Math.min(100, (musicCount / 40) * 100)}%;"></div>
            </div>
            <div class="pack-progress-text">${musicCount}/40</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  grid.querySelectorAll('.pack-card').forEach(card => {
    const packId = card.dataset.packId;
    card.addEventListener('click', (e) => {
      // Don't open if clicking during drag
      if (!bgMusicState.draggedMusic) {
        showBgMusicPackDetail(packId);
      }
    });
  });

  // Update total count
  const totalCount = bgMusicState.packs.reduce((sum, pack) => sum + (pack.music ? pack.music.length : 0), 0);
  const totalCountEl = document.getElementById('total-bgmusic-count');
  if (totalCountEl) {
    totalCountEl.textContent = `${totalCount}/10000`;
  }
  const progressFillEl = document.getElementById('total-bgmusic-progress-fill');
  if (progressFillEl) {
    progressFillEl.style.width = `${Math.min(100, (totalCount / 10000) * 100)}%`;
  }
}

function createBackgroundMusicPack() {
  // Create a simple input modal
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';

  const dialog = document.createElement('div');
  dialog.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 12px; min-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);';

  dialog.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #fff; font-size: 18px;">Create Background Music Pack</h3>
    <input type="text" id="pack-name-input" placeholder="Enter pack name (e.g., BG1, Chill Music...)" style="width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 14px; margin-bottom: 20px;" />
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="cancel-pack-btn" class="btn-secondary" style="padding: 10px 20px;">Cancel</button>
      <button id="create-pack-confirm-btn" class="btn-primary" style="padding: 10px 20px;">Create</button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  const input = document.getElementById('pack-name-input');
  input.focus();

  // Handle create
  document.getElementById('create-pack-confirm-btn').addEventListener('click', () => {
    const packName = input.value.trim();
    if (!packName) {
      showNotification('Please enter a pack name', 'error');
      return;
    }

    const newPack = {
      id: `bgpack_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: packName,
      music: [],
      hidden: false,
      createdAt: new Date().toISOString()
    };

    bgMusicState.packs.push(newPack);

    saveBackgroundMusicData();
    renderBackgroundMusicPacks();
    document.body.removeChild(modal);

    showNotification(`Pack "${packName}" created`, 'success');
  });

  // Handle cancel
  document.getElementById('cancel-pack-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Handle Enter key
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('create-pack-confirm-btn').click();
    }
  });

  // Handle Escape key
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
    }
  });

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

function showBgMusicPackDetail(packId) {
  bgMusicState.currentPackId = packId;
  const pack = bgMusicState.packs.find(p => p.id === packId);
  if (!pack) return;

  // Hide middle panel, show right panel
  document.getElementById('bgmusic-middle-panel').style.display = 'none';
  document.getElementById('bgmusic-right-panel').style.display = 'flex';

  // Set pack title
  const titleInput = document.getElementById('bgmusic-pack-detail-title');
  if (titleInput) titleInput.value = pack.name;

  // Update hide button text
  const hideBtn = document.getElementById('bgmusic-toggle-hide-pack-btn');
  if (hideBtn) hideBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';

  // Render pack music list
  renderBgMusicPackDetail();
}

function renderBgMusicPackDetail() {
  const listContainer = document.getElementById('bgmusic-pack-detail-list');
  if (!listContainer) return;

  const pack = bgMusicState.packs.find(p => p.id === bgMusicState.currentPackId);
  if (!pack) return;

  listContainer.innerHTML = '';

  // Add count
  const countEl = document.createElement('div');
  countEl.className = 'pack-detail-count';
  countEl.id = 'bgmusic-pack-detail-count';
  countEl.textContent = `${pack.music ? pack.music.length : 0} tracks`;
  listContainer.appendChild(countEl);

  if (!pack.music || pack.music.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'padding: 20px; text-align: center; color: #999;';
    emptyEl.textContent = 'No music in this pack yet. Drag music from the left panel to add them.';
    listContainer.appendChild(emptyEl);
    return;
  }

  pack.music.forEach((music, index) => {
    const musicEl = createBgMusicPackElement(music, pack.id, index);
    listContainer.appendChild(musicEl);
  });

  // Add drag over events
  listContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    listContainer.classList.add('drag-over');
  });

  listContainer.addEventListener('dragleave', (e) => {
    if (e.target === listContainer) {
      listContainer.classList.remove('drag-over');
    }
  });

  listContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    listContainer.classList.remove('drag-over');

    if (bgMusicState.draggedMusic) {
      addBgMusicToPack(pack.id, bgMusicState.draggedMusic);
    }
  });
}

function createBgMusicPackElement(music, packId, index) {
  const el = document.createElement('div');
  el.className = 'beat-item-pack';
  el.dataset.musicId = music.id;

  const numberBadge = document.createElement('div');
  numberBadge.className = 'beat-number-badge';
  numberBadge.textContent = index + 1;

  const contentContainer = document.createElement('div');
  contentContainer.className = 'beat-item-content';

  const icon = document.createElement('div');
  icon.className = 'beat-item-icon';
  icon.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  `;

  const info = document.createElement('div');
  info.className = 'beat-item-info';

  const name = document.createElement('div');
  name.className = 'beat-item-name';
  name.textContent = music.name;

  info.appendChild(name);

  if (music.duration) {
    const meta = document.createElement('div');
    meta.className = 'beat-item-meta';
    meta.textContent = formatDuration(music.duration);
    info.appendChild(meta);
  }

  contentContainer.appendChild(icon);
  contentContainer.appendChild(info);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'beat-remove-btn';
  removeBtn.innerHTML = '';
  removeBtn.title = 'Remove from pack';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeBgMusicFromPack(packId, music.id);
  });

  // Click to play
  el.addEventListener('click', () => {
    playBackgroundMusic(music.id);
  });

  el.appendChild(numberBadge);
  el.appendChild(contentContainer);
  el.appendChild(removeBtn);

  return el;
}

function addBgMusicToPack(packId, music) {
  const pack = bgMusicState.packs.find(p => p.id === packId);
  if (!pack) return;

  if (!pack.music) pack.music = [];

  // Check if already exists
  const exists = pack.music.some(m => m.id === music.id);
  if (exists) {
    showNotification('Music already in pack', 'info');
    return;
  }

  // Add music
  pack.music.push({
    id: music.id,
    name: music.name,
    filePath: music.filePath,
    duration: music.duration
  });

  // Save and update UI
  saveBackgroundMusicData();

  if (bgMusicState.currentPackId === packId) {
    renderBgMusicPackDetail();
  }

  renderBackgroundMusicPacks();
  renderBackgroundMusicList(); // Update tags

  showNotification(`Added "${music.name}" to pack`, 'success');
}

function removeBgMusicFromPack(packId, musicId) {
  const pack = bgMusicState.packs.find(p => p.id === packId);
  if (!pack) return;

  pack.music = pack.music.filter(m => m.id !== musicId);

  // Save and update UI
  saveBackgroundMusicData();

  if (bgMusicState.currentPackId === packId) {
    renderBgMusicPackDetail();
  }

  renderBackgroundMusicPacks();
  renderBackgroundMusicList(); // Update tags
}

// Drag and drop handlers for packs
function handleBgMusicPackDragOver(e, packId) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';
  e.currentTarget.classList.add('drag-over');
}

function handleBgMusicPackDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleBgMusicPackDrop(e, packId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');

  if (bgMusicState.draggedMusic) {
    addBgMusicToPack(packId, bgMusicState.draggedMusic);
  }
}

function playBackgroundMusic(musicId) {
  const music = bgMusicState.allMusic.find(m => m.id === musicId);
  if (!music) return;

  bgMusicState.selectedMusicId = musicId;

  const audioElement = document.getElementById('audio-element');
  if (audioElement && music.filePath) {
    audioElement.src = music.filePath;
    audioElement.play().catch(err => {
      console.error('Error playing audio:', err);
      showNotification('Error playing audio', 'error');
    });

    const nowPlayingEl = document.getElementById('now-playing');
    if (nowPlayingEl) {
      nowPlayingEl.textContent = music.name;
    }
  }
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Drag and Drop Handlers
function handleBackgroundMusicDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';

  if (bgMusicState.dragCounter === 0) {
    bgMusicState.dragCounter = 1;
  }

  const listContainer = document.getElementById('bgmusic-list');
  if (listContainer) {
    listContainer.style.background = 'rgba(59, 130, 246, 0.1)';
    listContainer.style.border = '2px dashed #3b82f6';
  }
}

function handleBackgroundMusicDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();

  bgMusicState.dragCounter--;

  if (bgMusicState.dragCounter <= 0) {
    bgMusicState.dragCounter = 0;
    const listContainer = document.getElementById('bgmusic-list');
    if (listContainer) {
      listContainer.style.background = '';
      listContainer.style.border = '';
    }
  }
}

function handleBackgroundMusicDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  bgMusicState.dragCounter = 0;

  const listContainer = document.getElementById('bgmusic-list');
  if (listContainer) {
    listContainer.style.background = '';
    listContainer.style.border = '';
  }

  const files = Array.from(e.dataTransfer.files);
  const audioFiles = files.filter(file => {
    const ext = file.name.toLowerCase().split('.').pop();
    return ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'].includes(ext);
  });

  if (audioFiles.length === 0) {
    showNotification('No audio files found. Please drop MP3, WAV, M4A, FLAC, OGG, or AAC files.', 'error');
    return;
  }

  copyFilesToBackgroundMusicFolder(audioFiles);
}

async function loadMusicFromFolder() {
  if (!ipcRenderer) return;

  try {
    // Request to scan the background music folder
    const files = await ipcRenderer.invoke('scan-background-music-folder', bgMusicState.folderPath);

    if (files && files.length > 0) {
      // Add any new files to the music list
      let newCount = 0;
      files.forEach(filePath => {
        const fileName = nodePath.basename(filePath);
        const existing = bgMusicState.allMusic.find(m => m.filePath === filePath);

        if (!existing) {
          bgMusicState.allMusic.push({
            id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: fileName,
            filePath: filePath,
            duration: null,
            createdAt: new Date().toISOString()
          });
          newCount++;
        }
      });

      if (newCount > 0) {
        await saveBackgroundMusicData();
      }

      renderBackgroundMusicList();
    }
  } catch (error) {
    console.error('Error loading music from folder:', error);
  }
}

async function copyFilesToBackgroundMusicFolder(files) {
  if (!ipcRenderer) {
    showNotification('This feature requires Electron', 'error');
    return;
  }

  try {
    showNotification('Copying files to D:\\BackgroundMusic...', 'info');

    const filePaths = files.map(f => f.path);
    const result = await ipcRenderer.invoke('copy-to-background-music-folder', {
      files: filePaths,
      targetFolder: bgMusicState.folderPath
    });

    if (result.success) {
      // Add copied files to the music list
      let imported = 0;
      result.copiedFiles.forEach(filePath => {
        const fileName = nodePath.basename(filePath);
        const existing = bgMusicState.allMusic.find(m => m.filePath === filePath);

        if (!existing) {
          bgMusicState.allMusic.push({
            id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: fileName,
            filePath: filePath,
            duration: null,
            createdAt: new Date().toISOString()
          });
          imported++;
        }
      });

      await saveBackgroundMusicData();
      renderBackgroundMusicList();

      showNotification(`Copied ${result.copiedFiles.length} file(s) to D:\\BackgroundMusic`, 'success');
    } else {
      showNotification('Error copying files: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error copying files:', error);
    showNotification('Error copying files: ' + error.message, 'error');
  }
}

function importDroppedBackgroundMusic(files) {
  // This function is now replaced by copyFilesToBackgroundMusicFolder
  copyFilesToBackgroundMusicFolder(files);
}

async function importBackgroundMusicFiles() {
  if (!ipcRenderer) {
    showNotification('This feature requires Electron', 'error');
    return;
  }

  try {
    const result = await ipcRenderer.invoke('select-files', {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'] }
      ]
    });

    if (!result || result.length === 0) return;

    // Copy selected files to the background music folder
    showNotification('Copying files to D:\\BackgroundMusic...', 'info');

    const copyResult = await ipcRenderer.invoke('copy-to-background-music-folder', {
      files: result,
      targetFolder: bgMusicState.folderPath
    });

    if (copyResult.success) {
      // Add copied files to the music list
      let imported = 0;
      copyResult.copiedFiles.forEach(filePath => {
        const fileName = nodePath.basename(filePath);
        const existing = bgMusicState.allMusic.find(m => m.filePath === filePath);

        if (!existing) {
          bgMusicState.allMusic.push({
            id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: fileName,
            filePath: filePath,
            duration: null,
            createdAt: new Date().toISOString()
          });
          imported++;
        }
      });

      await saveBackgroundMusicData();
      renderBackgroundMusicList();

      showNotification(`Copied ${copyResult.copiedFiles.length} file(s) to D:\\BackgroundMusic`, 'success');
    } else {
      showNotification('Error copying files: ' + copyResult.error, 'error');
    }

  } catch (error) {
    console.error('Error importing music:', error);
    showNotification('Error importing music: ' + error.message, 'error');
  }
}

// ============================
