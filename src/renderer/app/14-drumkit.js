// ============================
// DRUM KIT SECTION
// ============================

// State
let drumkitFolders = {
  all: { path: 'D:\\DrumKits', files: [], basePath: 'D:\\DrumKits', currentPath: 'D:\\DrumKits' },
  tagged: { path: 'D:\\DrumKits\\tagged', files: [], basePath: 'D:\\DrumKits\\tagged', currentPath: 'D:\\DrumKits\\tagged' },
  untagged: { path: 'D:\\DrumKits\\untagged', files: [], basePath: 'D:\\DrumKits\\untagged', currentPath: 'D:\\DrumKits\\untagged' }
};
let currentDrumkitFolderType = 'all';
let drumkitPacks = [];
let currentDrumkitPackId = null;
let showingHiddenDrumkitPacks = false;
let drumkitInfos = {}; // Map drumkitPath to info text

// DOM Elements
const drumkitListEl = document.getElementById('drumkit-list');
const drumkitPacksGridEl = document.getElementById('drumkit-packs-grid');
const drumkitMiddlePanelEl = document.getElementById('drumkit-middle-panel');
const drumkitRightPanelEl = document.getElementById('drumkit-right-panel');
const drumkitPackDetailTitleEl = document.getElementById('drumkit-pack-detail-title');
const drumkitPackDetailCountEl = document.getElementById('drumkit-pack-detail-count');
const drumkitPackDetailListEl = document.getElementById('drumkit-pack-detail-list');
const drumkitPackDetailThumbnailEl = document.getElementById('drumkit-pack-detail-thumbnail');
const drumkitPackDetailThumbnailImgEl = document.getElementById('drumkit-pack-detail-thumbnail-img');
const drumkitPacksHeaderTitle = document.getElementById('drumkit-packs-header-title');
const drumkitFolderPathEl = document.getElementById('drumkit-folder-path');
const drumkitFilterInput = document.getElementById('drumkit-filter-input');
const drumkitPackFilterInput = document.getElementById('drumkit-pack-filter-input');
const totalDrumkitCountEl = document.getElementById('total-drumkit-count');
const totalDrumkitProgressFillEl = document.getElementById('total-drumkit-progress-fill');

// Buttons
const refreshDrumkitBtn = document.getElementById('refresh-drumkit-btn');
const drumkitSelectFolderBtn = document.getElementById('drumkit-select-folder-btn');
const drumkitCreatePackBtn = document.getElementById('drumkit-create-pack-btn');
const drumkitChangeThumbnailHeaderBtn = document.getElementById('drumkit-change-thumbnail-header-btn');
const drumkitBackToPacksBtn = document.getElementById('drumkit-back-to-packs-btn');
const drumkitDeleteCurrentPackBtn = document.getElementById('drumkit-delete-current-pack-btn');
const drumkitToggleHidePackBtn = document.getElementById('drumkit-toggle-hide-pack-btn');
const drumkitToggleHiddenViewBtn = document.getElementById('drumkit-toggle-hidden-view-btn');
const drumkitPacksZoomInBtn = document.getElementById('drumkit-packs-zoom-in');
const drumkitPacksZoomOutBtn = document.getElementById('drumkit-packs-zoom-out');

// Info editor elements
const drumkitInfoSection = document.getElementById('drumkit-info-section');
const drumkitInfoDisplay = document.getElementById('drumkit-info-display');
const drumkitInfoEditor = document.getElementById('drumkit-info-editor');
const drumkitEditInfoBtn = document.getElementById('drumkit-edit-info-btn');
const drumkitSaveInfoBtn = document.getElementById('drumkit-save-info-btn');
const drumkitCancelInfoBtn = document.getElementById('drumkit-cancel-info-btn');
const drumkitInfoEditActions = document.getElementById('drumkit-info-edit-actions');

let currentDrumkitFile = null;

// Create Pack Modal refs
let drumkitCreatePackModalEl = null;
let drumkitCreatePackInputEl = null;

let drumkitSectionInitialized = false;

// Initialize section
async function initDrumkitSection() {
  if (drumkitSectionInitialized) return;
  drumkitSectionInitialized = true;
  console.log('[Drum Kit] Initializing section...');

  // Load data from file (Electron) or localStorage (browser)
  await loadDrumkitData();
  console.log('[Drum Kit] After loadDrumkitData - packs count:', drumkitPacks.length);

  // Wire up Create Pack modal
  drumkitCreatePackModalEl = document.getElementById('drumkit-create-pack-modal');
  drumkitCreatePackInputEl = document.getElementById('drumkit-create-pack-input');
  const createPackConfirmBtn = document.getElementById('drumkit-create-pack-confirm');
  const createPackCancelBtn = document.getElementById('drumkit-create-pack-cancel');

  if (createPackConfirmBtn) {
    createPackConfirmBtn.addEventListener('click', confirmCreateDrumkitPack);
  }
  if (createPackCancelBtn) {
    createPackCancelBtn.addEventListener('click', closeCreateDrumkitPackModal);
  }
  if (drumkitCreatePackInputEl) {
    drumkitCreatePackInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmCreateDrumkitPack();
      if (e.key === 'Escape') closeCreateDrumkitPackModal();
    });
  }
  if (drumkitCreatePackModalEl) {
    drumkitCreatePackModalEl.addEventListener('click', (e) => {
      if (e.target === drumkitCreatePackModalEl) closeCreateDrumkitPackModal();
    });
  }

  // Back to packs
  if (drumkitBackToPacksBtn) {
    drumkitBackToPacksBtn.addEventListener('click', showDrumkitPacksGrid);
  }

  // Delete current pack
  if (drumkitDeleteCurrentPackBtn) {
    drumkitDeleteCurrentPackBtn.addEventListener('click', deleteDrumkitPack);
  }

  // Hide/unhide current pack
  if (drumkitToggleHidePackBtn) {
    drumkitToggleHidePackBtn.addEventListener('click', toggleDrumkitPackHidden);
  }

  // Toggle hidden packs view
  if (drumkitToggleHiddenViewBtn) {
    drumkitToggleHiddenViewBtn.addEventListener('click', toggleDrumkitHiddenView);
  }

  // Select drum kit folder
  if (drumkitSelectFolderBtn) {
    drumkitSelectFolderBtn.addEventListener('click', selectDrumkitFolder);
  }

  // Refresh drum kit files
  if (refreshDrumkitBtn) {
    refreshDrumkitBtn.addEventListener('click', refreshDrumkitFiles);
  }

  // Tab buttons (All Kits / Untagged / Tagged)
  document.querySelectorAll('[data-drumkit-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-drumkit-type');
      switchDrumkitFolder(type);
      document.querySelectorAll('[data-drumkit-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Filter inputs
  if (drumkitFilterInput) {
    drumkitFilterInput.addEventListener('input', renderDrumkitFiles);
  }
  if (drumkitPackFilterInput) {
    drumkitPackFilterInput.addEventListener('input', renderDrumkitPacks);
  }

  // Pack detail title editing
  if (drumkitPackDetailTitleEl) {
    drumkitPackDetailTitleEl.addEventListener('change', () => {
      const pack = drumkitPacks.find(p => p.id === currentDrumkitPackId);
      if (pack) {
        pack.name = drumkitPackDetailTitleEl.value.trim() || pack.name;
        renderDrumkitPacks();
        saveDrumkitData();
      }
    });
  }

  // Zoom buttons
  let drumkitGridColumns = 4;
  if (drumkitPacksZoomInBtn) {
    drumkitPacksZoomInBtn.addEventListener('click', () => {
      const grid = document.getElementById('drumkit-packs-grid');
      if (grid) {
        drumkitGridColumns = Math.max(2, drumkitGridColumns - 1);
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${280 - drumkitGridColumns * 20}px, 1fr))`;
      }
    });
  }
  if (drumkitPacksZoomOutBtn) {
    drumkitPacksZoomOutBtn.addEventListener('click', () => {
      const grid = document.getElementById('drumkit-packs-grid');
      if (grid) {
        drumkitGridColumns = Math.min(8, drumkitGridColumns + 1);
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${280 - drumkitGridColumns * 20}px, 1fr))`;
      }
    });
  }

  // Change thumbnail button in pack detail header
  if (drumkitChangeThumbnailHeaderBtn) {
    drumkitChangeThumbnailHeaderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentDrumkitPackId) {
        selectDrumkitThumbnail(currentDrumkitPackId);
      }
    });
  }

  // Info editor buttons
  if (drumkitEditInfoBtn) {
    drumkitEditInfoBtn.addEventListener('click', showDrumkitInfoEditor);
  }
  if (drumkitSaveInfoBtn) {
    drumkitSaveInfoBtn.addEventListener('click', saveDrumkitInfo);
  }
  if (drumkitCancelInfoBtn) {
    drumkitCancelInfoBtn.addEventListener('click', cancelDrumkitInfoEdit);
  }

  // Load folder contents on init
  refreshDrumkitFiles();
  renderDrumkitPacks();
  updateDrumkitFolderDisplay();

  console.log('[Drum Kit] Section initialized. Packs:', drumkitPacks.length);
}

async function selectDrumkitFolder() {
  if (!isElectron) return;
  const folderPath = await ipcRenderer.invoke('select-folder');
  if (folderPath) {
    drumkitFolders[currentDrumkitFolderType].basePath = folderPath;
    drumkitFolders[currentDrumkitFolderType].currentPath = folderPath;
    drumkitFolders[currentDrumkitFolderType].path = folderPath;
    await refreshDrumkitFiles();
    await saveDrumkitData();
    showNotification('Folder selected: ' + folderPath, 'success');
  }
}

async function refreshDrumkitFiles() {
  if (!isElectron) return;
  const currentPath = drumkitFolders[currentDrumkitFolderType].currentPath;
  if (!currentPath) return;

  try {
    const kits = await ipcRenderer.invoke('read-drumkit-folder', currentPath);
    drumkitFolders[currentDrumkitFolderType].files = kits;
    renderDrumkitFiles();
    updateDrumkitFolderDisplay();
  } catch (e) {
    console.error('[Drum Kit] Error refreshing files:', e);
  }
}

async function switchDrumkitFolder(folderType) {
  if (!drumkitFolders[folderType]) return;
  currentDrumkitFolderType = folderType;
  await refreshDrumkitFiles();
}

// Make functions global so they can be called from onclick
window.createDrumkitPack = createDrumkitPack;
window.showDrumkitPacksGrid = showDrumkitPacksGrid;
window.deleteDrumkitPack = deleteDrumkitPack;
window.toggleDrumkitPackHidden = toggleDrumkitPackHidden;
window.toggleDrumkitHiddenView = toggleDrumkitHiddenView;
window.removeDrumkitFromPack = removeDrumkitFromPack;

// Load saved data (dedicated drumkit-data.json — no cross-tab conflicts)
async function loadDrumkitData() {
  let loaded = false;

  if (isElectron) {
    try {
      const savedData = await ipcRenderer.invoke('load-drumkit-data');
      console.log('[Drum Kit] Loaded from drumkit-data.json:', savedData ? 'yes' : 'none', '| packs:', savedData?.drumkitPacks?.length || 0);
      if (savedData) {
        drumkitFolders = savedData.drumkitFolders || drumkitFolders;
        currentDrumkitFolderType = savedData.currentDrumkitFolderType || 'all';
        drumkitPacks = savedData.drumkitPacks || [];
        drumkitInfos = savedData.drumkitInfos || {};
        loaded = true;
      }
    } catch (e) {
      console.error('[Drum Kit] Error loading drumkit data:', e);
    }
  }

  // Fallback: try localStorage if dedicated file is empty (migration from old shared file)
  if (!loaded || drumkitPacks.length === 0) {
    const savedData = localStorage.getItem('beats-data');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        console.log('[Drum Kit] localStorage migration fallback:', data.drumkitPacks?.length || 0, 'packs');
        if (data.drumkitPacks && data.drumkitPacks.length > 0) {
          drumkitFolders = data.drumkitFolders || drumkitFolders;
          currentDrumkitFolderType = data.currentDrumkitFolderType || 'all';
          drumkitPacks = data.drumkitPacks;
          drumkitInfos = data.drumkitInfos || {};
          // Migrate to dedicated file
          await saveDrumkitData();
        }
      } catch (e) {
        console.error('[Drum Kit] Error parsing localStorage data:', e);
      }
    }
  }

  console.log('[Drum Kit] Final loaded packs:', drumkitPacks.length);
}

// Save data (dedicated drumkit-data.json — no cross-tab conflicts)
async function saveDrumkitData() {
  console.log('[Drum Kit] Saving data...', drumkitPacks.length, 'packs');

  try {
    const payload = {
      drumkitPacks,
      drumkitFolders,
      currentDrumkitFolderType,
      drumkitInfos
    };
    if (isElectron) {
      await ipcRenderer.invoke('save-drumkit-data', payload);
    } else {
      localStorage.setItem('drumkit-data', JSON.stringify(payload));
    }
    console.log('[Drum Kit] Data saved to drumkit-data.json');
  } catch (e) {
    console.error('[Drum Kit] Error saving data:', e);
  }
}

// Update folder display
function updateDrumkitFolderDisplay() {
  const currentPath = drumkitFolders[currentDrumkitFolderType].currentPath;
  drumkitFolderPathEl.textContent = currentPath || 'No folder selected';
}

// Render drum kit files
function renderDrumkitFiles() {
  drumkitListEl.innerHTML = '';
  const files = drumkitFolders[currentDrumkitFolderType].files || [];
  
  const filterValue = drumkitFilterInput.value.toLowerCase();
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(filterValue)
  );

  if (filteredFiles.length === 0) {
    drumkitListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No drum kits found</div>';
    return;
  }

  filteredFiles.forEach(file => {
    const fileEl = document.createElement('div');
    fileEl.className = 'beat-item';
    fileEl.draggable = true;
    fileEl.dataset.filePath = file.path;

    fileEl.innerHTML = `
      <div class="beat-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <div class="beat-item-name">${file.name}</div>
    `;

    fileEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('drumkit-file', file.path);
      e.dataTransfer.effectAllowed = 'copy';
    });

    fileEl.addEventListener('click', () => {
      selectDrumkitFile(file.path);
    });

    drumkitListEl.appendChild(fileEl);
  });
}

// Select drum kit file
function selectDrumkitFile(filePath) {
  currentDrumkitFile = filePath;
  
  // Show info section
  drumkitInfoSection.style.display = 'block';
  
  // Load and display info
  const info = drumkitInfos[filePath] || '';
  drumkitInfoDisplay.textContent = info || 'No info available';
  drumkitInfoEditor.value = info;
}

// Render drum kit packs
function renderDrumkitPacks() {
  drumkitPacksGridEl.innerHTML = '';
  
  updateTotalDrumkitCounter();

  if (drumkitPacks.length === 0) {
    drumkitPacksGridEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; grid-column: 1/-1;">No drum kit packs yet. Create one to organize your kits!</div>';
    return;
  }

  // Filter by hidden status
  let visiblePacks = drumkitPacks.filter(pack => {
    const isHidden = pack.hidden === true;
    return showingHiddenDrumkitPacks ? isHidden : !isHidden;
  });

  // Filter by search
  const filterValue = drumkitPackFilterInput.value.trim().toLowerCase();
  if (filterValue) {
    visiblePacks = visiblePacks.filter(pack => {
      const num = extractPackNumber(pack.name);
      const filterNum = extractPackNumber(filterValue);
      return num !== null && num === filterNum;
    });
  }

  // Sort by number
  const sortedPacks = sortPacksByNumber(visiblePacks);

  if (sortedPacks.length === 0) {
    const message = showingHiddenDrumkitPacks ? 'No hidden packs yet' : (filterValue ? 'No packs match the filter' : 'No active packs');
    drumkitPacksGridEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #999; grid-column: 1/-1;">${message}</div>`;
    return;
  }

  sortedPacks.forEach((pack, index) => {
    const packCardEl = createDrumkitPackCard(pack, index + 1);
    drumkitPacksGridEl.appendChild(packCardEl);
  });
}

// Create pack card
function createDrumkitPackCard(pack, orderNumber) {
  const packCardEl = document.createElement('div');
  packCardEl.className = 'pack-card';
  packCardEl.dataset.packId = pack.id;

  // Pack image/thumbnail
  const imageEl = document.createElement('div');
  imageEl.className = 'pack-card-image';

  if (pack.thumbnail && pack.thumbnail !== 'auto') {
    const img = document.createElement('img');
    img.src = pack.thumbnail;
    img.alt = pack.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    imageEl.appendChild(img);
  } else {
    const textThumb = document.createElement('div');
    textThumb.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); font-size: 48px; font-weight: bold; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);';
    textThumb.textContent = pack.name;
    imageEl.appendChild(textThumb);
  }

  packCardEl.appendChild(imageEl);

  // Pack title below the image
  const infoEl = document.createElement('div');
  infoEl.className = 'pack-card-info';

  const titleEl = document.createElement('div');
  titleEl.className = 'pack-card-title';
  titleEl.textContent = pack.name;

  infoEl.appendChild(titleEl);

  packCardEl.appendChild(infoEl);

  // Click to view details
  packCardEl.addEventListener('click', () => {
    showDrumkitPackDetail(pack.id);
  });

  return packCardEl;
}

// Select thumbnail for pack
async function selectDrumkitThumbnail(packId) {
  const pack = drumkitPacks.find(p => p.id === packId);
  if (!pack) return;

  if (isElectron) {
    const imagePath = await ipcRenderer.invoke('select-image');
    if (imagePath) {
      pack.thumbnail = 'file:///' + imagePath.replace(/\\/g, '/');
      renderDrumkitPacks();
      saveDrumkitData();
    }
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          pack.thumbnail = event.target.result;
          renderDrumkitPacks();
          saveDrumkitData();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }
}

// Show pack detail
function showDrumkitPackDetail(packId) {
  currentDrumkitPackId = packId;
  const pack = drumkitPacks.find(p => p.id === packId);
  if (!pack) return;

  drumkitMiddlePanelEl.style.display = 'none';
  drumkitRightPanelEl.style.display = 'flex';

  drumkitPackDetailTitleEl.value = pack.name;
  drumkitToggleHidePackBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';

  renderDrumkitPackDetail();
}

// Render pack detail
function renderDrumkitPackDetail() {
  const pack = drumkitPacks.find(p => p.id === currentDrumkitPackId);
  if (!pack) return;

  // Update count text
  if (drumkitPackDetailCountEl) {
    drumkitPackDetailCountEl.textContent = `${pack.files.length} ${pack.files.length === 1 ? 'kit' : 'kits'}`;
  }

  // Remove dynamically added items (everything after drumkitPackDetailCountEl)
  const children = Array.from(drumkitPackDetailListEl.children);
  let reachedCount = false;
  for (const child of children) {
    if (child.id === 'drumkit-pack-detail-count') {
      reachedCount = true;
      continue;
    }
    if (reachedCount) {
      child.remove();
    }
  }

  if (pack.files.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'padding: 20px; text-align: center; color: #999;';
    emptyEl.textContent = 'No drum kits in this pack yet. Drag kits from the left panel to add them.';
    drumkitPackDetailListEl.appendChild(emptyEl);
    return;
  }

  pack.files.forEach((file, index) => {
    const fileEl = document.createElement('div');
    fileEl.className = 'beat-item';
    fileEl.innerHTML = `
      <div class="beat-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <div class="beat-item-name">${file.name}</div>
      <button class="beat-item-remove" onclick="removeDrumkitFromPack('${pack.id}', ${index})">×</button>
    `;
    drumkitPackDetailListEl.appendChild(fileEl);
  });
}

// Back to packs grid
function showDrumkitPacksGrid() {
  currentDrumkitPackId = null;
  drumkitMiddlePanelEl.style.display = 'flex';
  drumkitRightPanelEl.style.display = 'none';
}

// Create new pack (opens modal)
function createDrumkitPack() {
  console.log('[Drum Kit] Opening create pack modal');
  if (!drumkitCreatePackModalEl || !drumkitCreatePackInputEl) return;
  drumkitCreatePackInputEl.value = '';
  drumkitCreatePackModalEl.style.display = 'flex';
  drumkitCreatePackInputEl.focus();
}

function closeCreateDrumkitPackModal() {
  if (drumkitCreatePackModalEl) drumkitCreatePackModalEl.style.display = 'none';
}

function confirmCreateDrumkitPack() {
  if (!drumkitCreatePackInputEl) return;
  const name = drumkitCreatePackInputEl.value.trim();
  if (!name) {
    showNotification('Please enter a pack name', 'error');
    return;
  }

  const newPack = {
    id: 'drumkit-pack-' + Date.now(),
    name: name,
    files: [],
    hidden: false,
    thumbnail: 'auto'
  };

  drumkitPacks.push(newPack);
  closeCreateDrumkitPackModal();
  renderDrumkitPacks();
  saveDrumkitData();

  showNotification(`Pack "${name}" created!`, 'success');
  console.log('[Drum Kit] Pack created. Total packs:', drumkitPacks.length);
}

// Delete current pack
function deleteDrumkitPack() {
  if (!currentDrumkitPackId) return;
  if (!confirm('Are you sure you want to delete this pack?')) return;

  drumkitPacks = drumkitPacks.filter(p => p.id !== currentDrumkitPackId);
  showDrumkitPacksGrid();
  renderDrumkitPacks();
  saveDrumkitData();
}

// Toggle hide pack
function toggleDrumkitPackHidden() {
  if (!currentDrumkitPackId) return;
  const pack = drumkitPacks.find(p => p.id === currentDrumkitPackId);
  if (!pack) return;

  pack.hidden = !pack.hidden;
  drumkitToggleHidePackBtn.textContent = pack.hidden ? 'Unhide Pack' : 'Hide Pack';
  saveDrumkitData();

  if ((pack.hidden && !showingHiddenDrumkitPacks) || (!pack.hidden && showingHiddenDrumkitPacks)) {
    showDrumkitPacksGrid();
    renderDrumkitPacks();
  }
}

// Toggle hidden packs view
function toggleDrumkitHiddenView() {
  showingHiddenDrumkitPacks = !showingHiddenDrumkitPacks;

  if (showingHiddenDrumkitPacks) {
    drumkitToggleHiddenViewBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Active';
    drumkitPacksHeaderTitle.textContent = 'Hidden Packs';
  } else {
    drumkitToggleHiddenViewBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Hidden';
    drumkitPacksHeaderTitle.textContent = 'Drum Kit Packs';
  }

  renderDrumkitPacks();
}

// Update total counter
function updateTotalDrumkitCounter() {
  const total = drumkitPacks.reduce((sum, pack) => sum + pack.files.length, 0);
  const goal = 1000;
  const percent = Math.min((total / goal) * 100, 100);

  totalDrumkitCountEl.textContent = `${total}/${goal}`;
  totalDrumkitProgressFillEl.style.width = `${percent}%`;
}

// Remove drum kit from pack
function removeDrumkitFromPack(packId, index) {
  const pack = drumkitPacks.find(p => p.id === packId);
  if (!pack) return;

  pack.files.splice(index, 1);
  renderDrumkitPackDetail();
  renderDrumkitPacks();
  saveDrumkitData();
}

// Drag and drop handlers
function handleDrumkitDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  
  const filePath = event.dataTransfer.getData('drumkit-file');
  if (filePath && currentDrumkitPackId) {
    const pack = drumkitPacks.find(p => p.id === currentDrumkitPackId);
    if (pack && !pack.files.find(f => f.path === filePath)) {
      const fileName = filePath.split('\\').pop();
      pack.files.push({ path: filePath, name: fileName });
      renderDrumkitPackDetail();
      renderDrumkitPacks();
      saveDrumkitData();
    }
  }
}

function handleDrumkitDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function handleDrumkitDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

// Info editor functions
function showDrumkitInfoEditor() {
  drumkitInfoDisplay.style.display = 'none';
  drumkitInfoEditor.style.display = 'block';
  drumkitInfoEditActions.style.display = 'flex';
  drumkitEditInfoBtn.style.display = 'none';
  drumkitInfoEditor.focus();
}

function saveDrumkitInfo() {
  if (!currentDrumkitFile) return;
  
  const info = drumkitInfoEditor.value.trim();
  drumkitInfos[currentDrumkitFile] = info;
  drumkitInfoDisplay.textContent = info || 'No info available';
  
  drumkitInfoDisplay.style.display = 'block';
  drumkitInfoEditor.style.display = 'none';
  drumkitInfoEditActions.style.display = 'none';
  drumkitEditInfoBtn.style.display = 'block';
  
  saveDrumkitData();
}

function cancelDrumkitInfoEdit() {
  const info = drumkitInfos[currentDrumkitFile] || '';
  drumkitInfoEditor.value = info;
  
  drumkitInfoDisplay.style.display = 'block';
  drumkitInfoEditor.style.display = 'none';
  drumkitInfoEditActions.style.display = 'none';
  drumkitEditInfoBtn.style.display = 'block';
}
