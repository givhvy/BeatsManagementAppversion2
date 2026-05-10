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
const drumkitCarouselWrapper = document.getElementById('drumkit-carousel-wrapper');
const drumkitMiddlePanelEl = document.getElementById('drumkit-middle-panel');
const drumkitRightPanelEl = document.getElementById('drumkit-right-panel');
const drumkitPackDetailTitleEl = document.getElementById('drumkit-pack-detail-title');
const drumkitPackDetailCountEl = document.getElementById('drumkit-pack-detail-count');
const drumkitPackDetailListEl = document.getElementById('drumkit-pack-detail-list');
const drumkitPacksHeaderTitle = document.getElementById('drumkit-packs-header-title');
const drumkitFilterInput = document.getElementById('drumkit-filter-input');

// Swiper instance
let drumkitSwiper = null;

// Buttons
const refreshDrumkitBtn = document.getElementById('refresh-drumkit-btn');
const drumkitCreatePackBtn = document.getElementById('drumkit-create-pack-btn');
const drumkitChangeThumbnailBtn = document.getElementById('drumkit-change-thumbnail-btn');
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
let currentCarouselContextPackId = null; // Track which pack was right-clicked

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

  // Refresh drum kit files
  if (refreshDrumkitBtn) {
    refreshDrumkitBtn.addEventListener('click', refreshDrumkitFiles);
  }

  // Filter inputs
  if (drumkitFilterInput) {
    drumkitFilterInput.addEventListener('input', renderDrumkitFiles);
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

  // Change thumbnail button in pack detail
  if (drumkitChangeThumbnailBtn) {
    drumkitChangeThumbnailBtn.addEventListener('click', (e) => {
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

  // Fallback 1: try old beats-data.json file via IPC (migration from shared file)
  if (isElectron && (!loaded || drumkitPacks.length === 0)) {
    try {
      const oldData = await ipcRenderer.invoke('load-data');
      console.log('[Drum Kit] Old file migration fallback:', oldData?.drumkitPacks?.length || 0, 'packs');
      if (oldData && oldData.drumkitPacks && oldData.drumkitPacks.length > 0) {
        drumkitFolders = oldData.drumkitFolders || drumkitFolders;
        currentDrumkitFolderType = oldData.currentDrumkitFolderType || 'all';
        drumkitPacks = oldData.drumkitPacks;
        drumkitInfos = oldData.drumkitInfos || {};
        loaded = true;
        // Migrate to dedicated file immediately
        await saveDrumkitData();
        console.log('[Drum Kit] Migrated from beats-data.json to drumkit-data.json');
      }
    } catch (e) {
      console.error('[Drum Kit] Error loading old file data:', e);
    }
  }

  // Fallback 2: try localStorage (browser mode or very old data)
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
      // Also play the drum kit file
      if (window.playBeat) {
        window.playBeat(file.path, file.name);
      }
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

// Render drum kit packs in carousel
function renderDrumkitPacks() {
  if (!drumkitCarouselWrapper) return;

  drumkitCarouselWrapper.innerHTML = '';

  if (drumkitPacks.length === 0) {
    drumkitCarouselWrapper.innerHTML = `
      <div class="swiper-slide">
        <div class="drumkit-carousel-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <div>No drum kit packs yet.<br>Create one to organize your kits!</div>
        </div>
      </div>
    `;
    initDrumkitSwiper();
    return;
  }

  // Filter by hidden status
  let visiblePacks = drumkitPacks.filter(pack => {
    const isHidden = pack.hidden === true;
    return showingHiddenDrumkitPacks ? isHidden : !isHidden;
  });

  // Sort by number
  const sortedPacks = sortPacksByNumber(visiblePacks);

  if (sortedPacks.length === 0) {
    const message = showingHiddenDrumkitPacks ? 'No hidden packs yet' : 'No active packs';
    drumkitCarouselWrapper.innerHTML = `
      <div class="swiper-slide">
        <div class="drumkit-carousel-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <div>${message}</div>
        </div>
      </div>
    `;
    initDrumkitSwiper();
    return;
  }

  sortedPacks.forEach((pack, index) => {
    const slideEl = createDrumkitCarouselSlide(pack, index + 1);
    drumkitCarouselWrapper.appendChild(slideEl);
  });

  // Initialize or update Swiper
  initDrumkitSwiper();
}

// Create carousel slide
function createDrumkitCarouselSlide(pack, orderNumber) {
  const slideEl = document.createElement('div');
  slideEl.className = 'swiper-slide';
  slideEl.dataset.packId = pack.id;

  const cardEl = document.createElement('div');
  cardEl.className = 'drumkit-carousel-card';

  // Pack image/thumbnail (full card)
  const imageEl = document.createElement('div');
  imageEl.className = 'drumkit-carousel-card-image-only';

  if (pack.thumbnail && pack.thumbnail !== 'auto') {
    const img = document.createElement('img');
    img.src = pack.thumbnail;
    img.alt = pack.name;
    imageEl.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'drumkit-carousel-card-placeholder';
    placeholder.textContent = pack.name;
    imageEl.appendChild(placeholder);
  }

  cardEl.appendChild(imageEl);

  // Left click to view details
  cardEl.addEventListener('click', (e) => {
    if (e.button === 0) { // Left click only
      showDrumkitPackDetail(pack.id);
    }
  });

  // Right click for context menu
  cardEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showDrumkitCarouselContextMenu(e, pack);
  });

  slideEl.appendChild(cardEl);
  return slideEl;
}

// Initialize Swiper carousel
function initDrumkitSwiper() {
  // Check if Swiper is loaded
  if (typeof Swiper === 'undefined') {
    console.error('[Drumkit] Swiper library not loaded!');
    return;
  }

  // Destroy existing instance
  if (drumkitSwiper) {
    drumkitSwiper.destroy(true, true);
  }

  // Wait for DOM to be ready
  setTimeout(() => {
    // Get visible packs count
    let visiblePacks = drumkitPacks.filter(pack => {
      const isHidden = pack.hidden === true;
      return showingHiddenDrumkitPacks ? isHidden : !isHidden;
    });
    
    const packsCount = visiblePacks.length;
    
    // Create new Swiper instance
    drumkitSwiper = new Swiper('.drumkit-swiper', {
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      loop: packsCount >= 3, // Only enable loop if 3 or more slides
      coverflowEffect: {
        rotate: 40,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: true,
      },
      pagination: {
        el: '.drumkit-carousel-pagination',
        clickable: true,
      },
    });
    
    console.log('[Drumkit] Swiper initialized with', packsCount, 'slides, loop:', packsCount >= 3);
  }, 100);
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
      // Update hero image if we're viewing this pack's detail
      if (currentDrumkitPackId === packId) {
        showDrumkitPackThumbnailInDetail(pack);
      }
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
          // Update hero image if we're viewing this pack's detail
          if (currentDrumkitPackId === packId) {
            showDrumkitPackThumbnailInDetail(pack);
          }
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

  // Sync pack thumbnail to hero section
  showDrumkitPackThumbnailInDetail(pack);

  renderDrumkitPackDetail();
}

// Show pack thumbnail in detail view hero section
function showDrumkitPackThumbnailInDetail(pack) {
  const drumkitImagePreview = document.getElementById('drumkit-image-preview');
  const drumkitImageDisplay = document.getElementById('drumkit-image-display');
  const drumkitCoverPlaceholder = document.getElementById('drumkit-cover-placeholder');
  
  if (!drumkitImagePreview || !drumkitImageDisplay || !drumkitCoverPlaceholder) return;

  if (pack?.thumbnail && pack.thumbnail !== 'auto') {
    // Show the image
    drumkitImagePreview.style.display = 'block';
    drumkitCoverPlaceholder.style.display = 'none';
    drumkitImageDisplay.src = pack.thumbnail;
    drumkitImageDisplay.ondragstart = (e) => e.preventDefault();
  } else {
    // Show placeholder
    drumkitImagePreview.style.display = 'none';
    drumkitCoverPlaceholder.style.display = 'flex';
    drumkitImageDisplay.removeAttribute('src');
  }
}

// Render pack detail
function renderDrumkitPackDetail() {
  const pack = drumkitPacks.find(p => p.id === currentDrumkitPackId);
  if (!pack) return;

  // Update count text
  if (drumkitPackDetailCountEl) {
    drumkitPackDetailCountEl.textContent = `${pack.files.length} ${pack.files.length === 1 ? 'kit' : 'kits'}`;
  }

  // Clear the list
  drumkitPackDetailListEl.innerHTML = '';

  // Add header
  const headerEl = document.createElement('div');
  headerEl.className = 'pack-tracks-header';
  headerEl.innerHTML = `
    <span>#</span>
    <span>Title</span>
    <span>Status</span>
    <span></span>
  `;
  drumkitPackDetailListEl.appendChild(headerEl);

  if (pack.files.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'pack-empty-drop-zone';
    emptyEl.textContent = 'No drum kits in this pack yet. Drag kits from the left panel to add them.';
    drumkitPackDetailListEl.appendChild(emptyEl);
    return;
  }

  pack.files.forEach((file, index) => {
    const fileEl = document.createElement('div');
    fileEl.className = 'pack-beat-item';
    fileEl.setAttribute('data-beat-path', file.path);
    fileEl.setAttribute('data-beat-name', file.name);
    fileEl.setAttribute('draggable', 'false');
    
    const displayName = file.name.replace(/\.(wav|mp3|flac|m4a|aac|ogg)$/i, '');
    
    fileEl.innerHTML = `
      <div class="beat-number-badge">${index + 1}</div>
      <div class="beat-content-container">
        <span>${displayName}</span>
      </div>
      <button class="remove-beat-btn" onclick="removeDrumkitFromPack('${pack.id}', ${index})"></button>
    `;
    
    // Add click handler to play the drum kit file
    fileEl.addEventListener('click', (e) => {
      // Don't play if clicking the remove button
      if (e.target.classList.contains('remove-beat-btn')) return;
      
      // Use the global playBeat function from beats-library.js
      if (window.playBeat) {
        window.playBeat(file.path, file.name);
      }
    });
    
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
  } else {
    drumkitToggleHiddenViewBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Hidden';
  }

  renderDrumkitPacks();
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

// Carousel Context Menu Functions
function showDrumkitCarouselContextMenu(event, pack) {
  const contextMenu = document.getElementById('drumkit-carousel-context-menu');
  if (!contextMenu) return;

  currentCarouselContextPackId = pack.id;

  // Update hide/unhide text
  const toggleHideItem = document.getElementById('drumkit-carousel-toggle-hide');
  if (toggleHideItem) {
    const hideText = pack.hidden ? 'Unhide Pack' : 'Hide Pack';
    toggleHideItem.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      ${hideText}
    `;
  }

  // Position context menu
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${event.pageX}px`;
  contextMenu.style.top = `${event.pageY}px`;
}

function hideDrumkitCarouselContextMenu() {
  const contextMenu = document.getElementById('drumkit-carousel-context-menu');
  if (contextMenu) {
    contextMenu.style.display = 'none';
  }
  currentCarouselContextPackId = null;
}

// Context menu item handlers
function handleCarouselChangeThumbnail() {
  if (currentCarouselContextPackId) {
    selectDrumkitThumbnail(currentCarouselContextPackId);
  }
  hideDrumkitCarouselContextMenu();
}

function handleCarouselRenamePack() {
  if (!currentCarouselContextPackId) return;
  
  const pack = drumkitPacks.find(p => p.id === currentCarouselContextPackId);
  if (!pack) return;

  const newName = prompt('Enter new pack name:', pack.name);
  if (newName && newName.trim()) {
    pack.name = newName.trim();
    renderDrumkitPacks();
    saveDrumkitData();
  }
  hideDrumkitCarouselContextMenu();
}

function handleCarouselToggleHide() {
  if (!currentCarouselContextPackId) return;
  
  const pack = drumkitPacks.find(p => p.id === currentCarouselContextPackId);
  if (!pack) return;

  pack.hidden = !pack.hidden;
  saveDrumkitData();
  
  // If hiding and currently showing active packs, or unhiding and showing hidden packs, refresh
  if ((pack.hidden && !showingHiddenDrumkitPacks) || (!pack.hidden && showingHiddenDrumkitPacks)) {
    renderDrumkitPacks();
  }
  
  hideDrumkitCarouselContextMenu();
}

function handleCarouselDeletePack() {
  if (!currentCarouselContextPackId) return;
  
  const pack = drumkitPacks.find(p => p.id === currentCarouselContextPackId);
  if (!pack) return;

  if (confirm(`Are you sure you want to delete "${pack.name}"?`)) {
    drumkitPacks = drumkitPacks.filter(p => p.id !== currentCarouselContextPackId);
    renderDrumkitPacks();
    saveDrumkitData();
  }
  
  hideDrumkitCarouselContextMenu();
}

// Initialize context menu listeners
document.addEventListener('DOMContentLoaded', () => {
  // Hide context menu when clicking anywhere
  document.addEventListener('click', hideDrumkitCarouselContextMenu);

  // Context menu item listeners
  const changeThumbnailItem = document.getElementById('drumkit-carousel-change-thumbnail');
  const renamePackItem = document.getElementById('drumkit-carousel-rename-pack');
  const toggleHideItem = document.getElementById('drumkit-carousel-toggle-hide');
  const deletePackItem = document.getElementById('drumkit-carousel-delete-pack');

  if (changeThumbnailItem) {
    changeThumbnailItem.addEventListener('click', handleCarouselChangeThumbnail);
  }
  if (renamePackItem) {
    renamePackItem.addEventListener('click', handleCarouselRenamePack);
  }
  if (toggleHideItem) {
    toggleHideItem.addEventListener('click', handleCarouselToggleHide);
  }
  if (deletePackItem) {
    deletePackItem.addEventListener('click', handleCarouselDeletePack);
  }
});
