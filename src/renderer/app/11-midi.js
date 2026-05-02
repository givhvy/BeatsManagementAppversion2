// MIDI SECTION
// ============================

let midiState = {
  allMidi: [],
  packs: [],
  currentPackId: null,
  dragCounter: 0,
  currentTab: 'all',
  filterText: '',
  packFilterText: '',
  draggedMidi: null,
  selectedMidiId: null,
  folderPath: 'D:\\MIDI',
  showHidden: false
};

function initMidiSection() {
  console.log('MIDI section initialized');

  midiState.folderPath = 'D:\\MIDI';

  const folderPathEl = document.getElementById('midi-folder-path');
  if (folderPathEl) {
    folderPathEl.textContent = midiState.folderPath;
  }

  loadMidiData();
  bindMidiEvents();
  loadMidiFromFolder();
}

async function loadMidiData() {
  if (!ipcRenderer) {
    renderMidiList();
    renderMidiPacks();
    return;
  }

  try {
    const data = await ipcRenderer.invoke('get-midi-data');
    midiState.allMidi = data.midi || [];
    midiState.packs = data.packs || [];

    midiState.allMidi.forEach((midi, idx) => {
      if (!midi.id) midi.id = `midi_${Date.now()}_${idx}`;
    });

    midiState.packs.forEach((pack, idx) => {
      if (!pack.id) pack.id = `midipack_${Date.now()}_${idx}`;
      if (!pack.midi) pack.midi = [];
      if (pack.thumbnail === undefined) pack.thumbnail = null;
    });

    renderMidiList();
    renderMidiPacks();
  } catch (error) {
    console.error('Error loading MIDI data:', error);
    midiState.allMidi = [];
    midiState.packs = [];
    renderMidiList();
    renderMidiPacks();
  }
}

async function saveMidiData() {
  if (!ipcRenderer) return;

  try {
    await ipcRenderer.invoke('save-midi-data', {
      midi: midiState.allMidi,
      packs: midiState.packs
    });
  } catch (error) {
    console.error('Error saving MIDI data:', error);
  }
}

async function loadMidiFromFolder() {
  if (!ipcRenderer) return;

  try {
    const files = await ipcRenderer.invoke('scan-midi-folder', midiState.folderPath);

    if (files && files.length > 0) {
      let newCount = 0;
      files.forEach(filePath => {
        const fileName = nodePath.basename(filePath);
        const existing = midiState.allMidi.find(m => m.filePath === filePath);

        if (!existing) {
          midiState.allMidi.push({
            id: `midi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: fileName,
            filePath: filePath,
            createdAt: new Date().toISOString()
          });
          newCount++;
        }
      });

      if (newCount > 0) {
        await saveMidiData();
      }

      renderMidiList();
    }
  } catch (error) {
    console.error('Error loading MIDI from folder:', error);
  }
}

function bindMidiEvents() {
  const refreshBtn = document.getElementById('refresh-midi-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadMidiFromFolder();
      showNotification('Refreshing MIDI from D:\\MIDI...', 'info');
    });
  }

  const createPackBtn = document.getElementById('midi-create-pack-btn');
  if (createPackBtn) {
    createPackBtn.addEventListener('click', createMidiPack);
  }

  document.querySelectorAll('[data-midi-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-midi-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      midiState.currentTab = btn.dataset.midiType;
      renderMidiList();
    });
  });

  const filterInput = document.getElementById('midi-filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      midiState.filterText = e.target.value.toLowerCase();
      renderMidiList();
    });
  }

  const packFilterInput = document.getElementById('midi-pack-filter-input');
  if (packFilterInput) {
    packFilterInput.addEventListener('input', (e) => {
      midiState.packFilterText = e.target.value.toLowerCase();
      renderMidiPacks();
    });
  }

  const backBtn = document.getElementById('midi-back-to-packs-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      midiState.currentPackId = null;
      document.getElementById('midi-middle-panel').style.display = 'flex';
      document.getElementById('midi-right-panel').style.display = 'none';
    });
  }

  const packTitleInput = document.getElementById('midi-pack-detail-title');
  if (packTitleInput) {
    packTitleInput.addEventListener('change', () => {
      const pack = midiState.packs.find(p => p.id === midiState.currentPackId);
      if (pack) {
        pack.name = packTitleInput.value.trim() || 'Unnamed Pack';
        saveMidiData();
        renderMidiPacks();
      }
    });
  }

  const deletePackBtn = document.getElementById('midi-delete-current-pack-btn');
  if (deletePackBtn) {
    deletePackBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this pack?')) {
        midiState.packs = midiState.packs.filter(p => p.id !== midiState.currentPackId);
        midiState.currentPackId = null;
        saveMidiData();
        document.getElementById('midi-middle-panel').style.display = 'flex';
        document.getElementById('midi-right-panel').style.display = 'none';
        renderMidiPacks();
      }
    });
  }

  const toggleHideBtn = document.getElementById('midi-toggle-hide-pack-btn');
  if (toggleHideBtn) {
    toggleHideBtn.addEventListener('click', () => {
      const pack = midiState.packs.find(p => p.id === midiState.currentPackId);
      if (pack) {
        pack.hidden = !pack.hidden;
        toggleHideBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';
        saveMidiData();
        renderMidiPacks();
      }
    });
  }

  const toggleHiddenViewBtn = document.getElementById('midi-toggle-hidden-view-btn');
  if (toggleHiddenViewBtn) {
    toggleHiddenViewBtn.addEventListener('click', () => {
      midiState.showHidden = !midiState.showHidden;
      renderMidiPacks();
    });
  }
}

function renderMidiList() {
  const listContainer = document.getElementById('midi-list');
  if (!listContainer) return;

  let filteredMidi = [...midiState.allMidi];

  if (midiState.currentTab === 'tagged') {
    filteredMidi = filteredMidi.filter(m => {
      return midiState.packs.some(pack => pack.midi && pack.midi.some(pm => pm.id === m.id));
    });
  } else if (midiState.currentTab === 'untagged') {
    filteredMidi = filteredMidi.filter(m => {
      return !midiState.packs.some(pack => pack.midi && pack.midi.some(pm => pm.id === m.id));
    });
  }

  if (midiState.filterText) {
    filteredMidi = filteredMidi.filter(m =>
      m.name.toLowerCase().includes(midiState.filterText)
    );
  }

  if (filteredMidi.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: #666; padding: 40px 20px; font-size: 13px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.5;">
          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/>
        </svg>
        <div style="margin-bottom: 15px; font-weight: 500;">No MIDI files yet</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 8px;"> Storage: <span style="color: #3b82f6; font-weight: 500;">D:\\MIDI</span></div>
        <div style="font-size: 11px; color: #888; margin-bottom: 15px;"> Drag & drop MIDI files here<br>Files will be copied to the folder above</div>
        <button class="btn-primary" onclick="importMidiFiles()">Import MIDI Files</button>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filteredMidi.map((midi) => {
    const packTags = midiState.packs
      .filter(pack => pack.midi && pack.midi.some(pm => pm.id === midi.id))
      .map(pack => pack.name);

    return `
      <div class="beat-item" data-midi-id="${midi.id}" draggable="true">
        <div class="beat-item-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/>
          </svg>
        </div>
        <div class="beat-item-info">
          <div class="beat-item-name">${midi.name}</div>
          ${packTags.length > 0 ? `<div class="beat-item-tags">${packTags.join(', ')}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  listContainer.querySelectorAll('.beat-item').forEach(item => {
    const midiId = item.dataset.midiId;
    const midi = midiState.allMidi.find(m => m.id === midiId);

    if (!midi) return;

    item.addEventListener('dragstart', (e) => {
      midiState.draggedMidi = midi;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';
    });

    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      midiState.draggedMidi = null;
    });
  });
}

function renderMidiPacks() {
  const grid = document.getElementById('midi-packs-grid');
  if (!grid) return;

  let filteredPacks = midiState.showHidden
    ? midiState.packs.filter(p => p.hidden)
    : midiState.packs.filter(p => !p.hidden);

  if (midiState.packFilterText) {
    filteredPacks = filteredPacks.filter(pack =>
      pack.name.toLowerCase().includes(midiState.packFilterText) ||
      pack.name.replace(/\D/g, '').includes(midiState.packFilterText.replace(/\D/g, ''))
    );
  }

  if (filteredPacks.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #666; padding: 60px 20px; font-size: 14px;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.4;">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
        </svg>
        <div style="margin-bottom: 15px; font-weight: 500;">No packs yet</div>
        <button class="btn-primary" onclick="createMidiPack()">+ Create First Pack</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredPacks.map((pack, index) => {
    const midiCount = pack.midi ? pack.midi.length : 0;

    return `
      <div class="pack-card" data-pack-id="${pack.id}"
           ondragover="handleMidiPackDragOver(event, '${pack.id}')"
           ondragleave="handleMidiPackDragLeave(event)"
           ondrop="handleMidiPackDrop(event, '${pack.id}')">
        <div class="pack-card-image">
          ${renderMidiPackThumbnail(pack)}
          <div class="pack-card-count">${midiCount}</div>
          <div class="pack-card-order">#${index + 1}</div>
          <button class="pack-thumbnail-btn midi-thumbnail-btn" data-pack-id="${pack.id}" title="Change image" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
        </div>
        <div class="pack-card-info">
          <div class="pack-card-title">${pack.name}</div>
          <div class="pack-card-subtitle">${midiCount === 1 ? '1 file' : `${midiCount} files`}</div>
          <div class="pack-progress-container">
            <div class="pack-progress-bar">
              <div class="pack-progress-fill" style="width: ${Math.min(100, (midiCount / 40) * 100)}%;"></div>
            </div>
            <div class="pack-progress-text">${midiCount}/40</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.pack-card').forEach(card => {
    const packId = card.dataset.packId;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.midi-thumbnail-btn')) return;
      if (!midiState.draggedMidi) {
        showMidiPackDetail(packId);
      }
    });
  });

  grid.querySelectorAll('.midi-thumbnail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectMidiPackThumbnail(btn.dataset.packId);
    });
  });

  const totalCount = midiState.packs.reduce((sum, pack) => sum + (pack.midi ? pack.midi.length : 0), 0);
  const totalCountEl = document.getElementById('total-midi-count');
  if (totalCountEl) {
    totalCountEl.textContent = `${totalCount}/10000`;
  }
  const progressFillEl = document.getElementById('total-midi-progress-fill');
  if (progressFillEl) {
    progressFillEl.style.width = `${Math.min(100, (totalCount / 10000) * 100)}%`;
  }
}

function renderMidiPackThumbnail(pack) {
  if (pack.thumbnail && pack.thumbnail !== 'auto') {
    return `<img src="${pack.thumbnail}" alt="${escapeMidiHtml(pack.name)}" style="width: 100%; height: 100%; object-fit: cover;">`;
  }

  return `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: bold; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
      ${escapeMidiHtml(pack.name)}
    </div>
  `;
}

async function selectMidiPackThumbnail(packId) {
  const pack = midiState.packs.find(p => p.id === packId);
  if (!pack) return;

  try {
    if (isElectron && ipcRenderer) {
      const imagePath = await ipcRenderer.invoke('select-image');
      if (!imagePath) return;
      pack.thumbnail = 'file:///' + imagePath.replace(/\\/g, '/');
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      const imageData = await new Promise(resolve => {
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        };
        input.click();
      });
      if (!imageData) return;
      pack.thumbnail = imageData;
    }

    await saveMidiData();
    renderMidiPacks();
    showNotification(`Updated image for "${pack.name}"`, 'success');
  } catch (error) {
    console.error('Error selecting MIDI pack image:', error);
    showNotification('Failed to update pack image', 'error');
  }
}

function escapeMidiHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showMidiPackDetail(packId) {
  midiState.currentPackId = packId;
  const pack = midiState.packs.find(p => p.id === packId);
  if (!pack) return;

  document.getElementById('midi-middle-panel').style.display = 'none';
  document.getElementById('midi-right-panel').style.display = 'flex';

  const titleInput = document.getElementById('midi-pack-detail-title');
  if (titleInput) titleInput.value = pack.name;

  const hideBtn = document.getElementById('midi-toggle-hide-pack-btn');
  if (hideBtn) hideBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';

  renderMidiPackDetail();
}

function renderMidiPackDetail() {
  const listContainer = document.getElementById('midi-pack-detail-list');
  if (!listContainer) return;

  const pack = midiState.packs.find(p => p.id === midiState.currentPackId);
  if (!pack) return;

  listContainer.innerHTML = '';

  const countEl = document.createElement('div');
  countEl.className = 'pack-detail-count';
  countEl.id = 'midi-pack-detail-count';
  countEl.textContent = `${pack.midi ? pack.midi.length : 0} files`;
  listContainer.appendChild(countEl);

  if (!pack.midi || pack.midi.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'padding: 20px; text-align: center; color: #999;';
    emptyEl.textContent = 'No MIDI files in this pack yet. Drag MIDI files from the left panel to add them.';
    listContainer.appendChild(emptyEl);
    return;
  }

  pack.midi.forEach((midi, index) => {
    const midiEl = createMidiPackElement(midi, pack.id, index);
    listContainer.appendChild(midiEl);
  });

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

    if (midiState.draggedMidi) {
      addMidiToPack(pack.id, midiState.draggedMidi);
    }
  });
}

function createMidiPackElement(midi, packId, index) {
  const el = document.createElement('div');
  el.className = 'beat-item-pack';
  el.dataset.midiId = midi.id;

  const numberBadge = document.createElement('div');
  numberBadge.className = 'beat-number-badge';
  numberBadge.textContent = index + 1;

  const contentContainer = document.createElement('div');
  contentContainer.className = 'beat-item-content';

  const icon = document.createElement('div');
  icon.className = 'beat-item-icon';
  icon.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/>
    </svg>
  `;

  const info = document.createElement('div');
  info.className = 'beat-item-info';

  const name = document.createElement('div');
  name.className = 'beat-item-name';
  name.textContent = midi.name;

  info.appendChild(name);
  contentContainer.appendChild(icon);
  contentContainer.appendChild(info);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'beat-remove-btn';
  removeBtn.innerHTML = '';
  removeBtn.title = 'Remove from pack';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeMidiFromPack(packId, midi.id);
  });

  el.appendChild(numberBadge);
  el.appendChild(contentContainer);
  el.appendChild(removeBtn);

  return el;
}

function addMidiToPack(packId, midi) {
  const pack = midiState.packs.find(p => p.id === packId);
  if (!pack) return;

  if (!pack.midi) pack.midi = [];

  const exists = pack.midi.some(m => m.id === midi.id);
  if (exists) {
    showNotification('MIDI file already in pack', 'info');
    return;
  }

  pack.midi.push({
    id: midi.id,
    name: midi.name,
    filePath: midi.filePath
  });

  saveMidiData();

  if (midiState.currentPackId === packId) {
    renderMidiPackDetail();
  }

  renderMidiPacks();
  renderMidiList();

  showNotification(`Added "${midi.name}" to pack`, 'success');
}

function removeMidiFromPack(packId, midiId) {
  const pack = midiState.packs.find(p => p.id === packId);
  if (!pack) return;

  pack.midi = pack.midi.filter(m => m.id !== midiId);

  saveMidiData();

  if (midiState.currentPackId === packId) {
    renderMidiPackDetail();
  }

  renderMidiPacks();
  renderMidiList();
}

function handleMidiPackDragOver(e, packId) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';
  e.currentTarget.classList.add('drag-over');
}

function handleMidiPackDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleMidiPackDrop(e, packId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');

  if (midiState.draggedMidi) {
    addMidiToPack(packId, midiState.draggedMidi);
  }
}

function createMidiPack() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';

  const dialog = document.createElement('div');
  dialog.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 12px; min-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);';

  dialog.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #fff; font-size: 18px;">Create MIDI Pack</h3>
    <input type="text" id="pack-name-input" placeholder="Enter pack name (e.g., M1, Piano MIDI...)" style="width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 14px; margin-bottom: 20px;" />
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="cancel-pack-btn" class="btn-secondary" style="padding: 10px 20px;">Cancel</button>
      <button id="create-pack-confirm-btn" class="btn-primary" style="padding: 10px 20px;">Create</button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  const input = document.getElementById('pack-name-input');
  input.focus();

  document.getElementById('create-pack-confirm-btn').addEventListener('click', () => {
    const packName = input.value.trim();
    if (!packName) {
      showNotification('Please enter a pack name', 'error');
      return;
    }

    const newPack = {
      id: `midipack_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: packName,
      midi: [],
      thumbnail: null,
      hidden: false,
      createdAt: new Date().toISOString()
    };

    midiState.packs.push(newPack);

    saveMidiData();
    renderMidiPacks();
    document.body.removeChild(modal);

    showNotification(`Pack "${packName}" created`, 'success');
  });

  document.getElementById('cancel-pack-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('create-pack-confirm-btn').click();
    }
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

function handleMidiDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';

  if (midiState.dragCounter === 0) {
    midiState.dragCounter = 1;
  }

  const listContainer = document.getElementById('midi-list');
  if (listContainer) {
    listContainer.style.background = 'rgba(59, 130, 246, 0.1)';
    listContainer.style.border = '2px dashed #3b82f6';
  }
}

function handleMidiDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();

  midiState.dragCounter--;

  if (midiState.dragCounter <= 0) {
    midiState.dragCounter = 0;
    const listContainer = document.getElementById('midi-list');
    if (listContainer) {
      listContainer.style.background = '';
      listContainer.style.border = '';
    }
  }
}

function handleMidiDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  midiState.dragCounter = 0;

  const listContainer = document.getElementById('midi-list');
  if (listContainer) {
    listContainer.style.background = '';
    listContainer.style.border = '';
  }

  const files = Array.from(e.dataTransfer.files);
  const midiFiles = files.filter(file => {
    const ext = file.name.toLowerCase().split('.').pop();
    return ['mid', 'midi'].includes(ext);
  });

  if (midiFiles.length === 0) {
    showNotification('No MIDI files found. Please drop .mid or .midi files.', 'error');
    return;
  }

  copyFilesToMidiFolder(midiFiles);
}

async function copyFilesToMidiFolder(files) {
  if (!ipcRenderer) {
    showNotification('This feature requires Electron', 'error');
    return;
  }

  try {
    showNotification('Copying files to D:\\MIDI...', 'info');

    const filePaths = files.map(f => f.path);
    const result = await ipcRenderer.invoke('copy-to-midi-folder', {
      files: filePaths,
      targetFolder: midiState.folderPath
    });

    if (result.success) {
      let imported = 0;
      result.copiedFiles.forEach(filePath => {
        const fileName = nodePath.basename(filePath);
        const existing = midiState.allMidi.find(m => m.filePath === filePath);

        if (!existing) {
          midiState.allMidi.push({
            id: `midi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: fileName,
            filePath: filePath,
            createdAt: new Date().toISOString()
          });
          imported++;
        }
      });

      await saveMidiData();
      renderMidiList();

      showNotification(`Copied ${result.copiedFiles.length} file(s) to D:\\MIDI`, 'success');
    } else {
      showNotification('Error copying files: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error copying files:', error);
    showNotification('Error copying files: ' + error.message, 'error');
  }
}

async function importMidiFiles() {
  if (!ipcRenderer) {
    showNotification('This feature requires Electron', 'error');
    return;
  }

  try {
    const result = await ipcRenderer.invoke('select-files', {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'MIDI Files', extensions: ['mid', 'midi'] }
      ]
    });

    if (!result || result.length === 0) return;

    showNotification('Copying files to D:\\MIDI...', 'info');

    const copyResult = await ipcRenderer.invoke('copy-to-midi-folder', {
      files: result,
      targetFolder: midiState.folderPath
    });

    if (copyResult.success) {
      let imported = 0;
      copyResult.copiedFiles.forEach(filePath => {
        const fileName = nodePath.basename(filePath);
        const existing = midiState.allMidi.find(m => m.filePath === filePath);

        if (!existing) {
          midiState.allMidi.push({
            id: `midi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: fileName,
            filePath: filePath,
            createdAt: new Date().toISOString()
          });
          imported++;
        }
      });

      await saveMidiData();
      renderMidiList();

      showNotification(`Copied ${copyResult.copiedFiles.length} file(s) to D:\\MIDI`, 'success');
    } else {
      showNotification('Error copying files: ' + copyResult.error, 'error');
    }

  } catch (error) {
    console.error('Error importing MIDI:', error);
    showNotification('Error importing MIDI: ' + error.message, 'error');
  }
}
