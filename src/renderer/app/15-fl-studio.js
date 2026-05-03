// ============================
// FL STUDIO SECTION
// ============================

// State
const flstudioState = {
  projects: [],
  currentSort: 'date-desc',
  currentProject: null,
  notes: {},
  initialized: false
};

// Default FL Studio projects folder
const FLSTUDIO_DEFAULT_PATH = 'D:\\FL Studio Projects';

// DOM Elements
const flstudioListEl = document.getElementById('flstudio-list');
const flstudioProjectsGridEl = document.getElementById('flstudio-projects-grid');
const flstudioMiddlePanelEl = document.getElementById('flstudio-middle-panel');
const flstudioRightPanelEl = document.getElementById('flstudio-right-panel');
const flstudioProjectDetailTitleEl = document.getElementById('flstudio-project-detail-title');
const flstudioProjectDetailCountEl = document.getElementById('flstudio-project-detail-count');
const flstudioProjectDetailListEl = document.getElementById('flstudio-project-detail-list');
const flstudioPacksHeaderTitle = document.getElementById('flstudio-packs-header-title');
const flstudioFilterInput = document.getElementById('flstudio-filter-input');
const flstudioSortDropdown = document.getElementById('flstudio-sort-dropdown');

// Buttons
const refreshFlstudioBtn = document.getElementById('flstudio-refresh-btn');
const flstudioSortBtn = document.getElementById('flstudio-sort-btn');
const flstudioOpenFolderBtn = document.getElementById('flstudio-open-folder-btn');
const flstudioBackToGridBtn = document.getElementById('flstudio-back-to-grid-btn');
const flstudioOpenInDawBtn = document.getElementById('flstudio-open-in-daw-btn');
const flstudioRevealBtn = document.getElementById('flstudio-reveal-btn');
const flstudioPacksZoomInBtn = document.getElementById('flstudio-packs-zoom-in');
const flstudioPacksZoomOutBtn = document.getElementById('flstudio-packs-zoom-out');

// Notes editor elements
const flstudioNotesSection = document.getElementById('flstudio-notes-section');
const flstudioNotesDisplay = document.getElementById('flstudio-notes-display');
const flstudioNotesEditor = document.getElementById('flstudio-notes-editor');
const flstudioEditNotesBtn = document.getElementById('flstudio-edit-notes-btn');
const flstudioSaveNotesBtn = document.getElementById('flstudio-save-notes-btn');
const flstudioCancelNotesBtn = document.getElementById('flstudio-cancel-notes-btn');
const flstudioNotesEditActions = document.getElementById('flstudio-notes-edit-actions');

// Initialize section
async function initFlstudioSection() {
  if (flstudioState.initialized) return;
  flstudioState.initialized = true;
  console.log('[FL Studio] Initializing section...');

  // Load saved notes
  await loadFlstudioData();

  // Refresh button
  if (refreshFlstudioBtn) {
    refreshFlstudioBtn.addEventListener('click', refreshFlstudioProjects);
  }

  // Sort button toggle
  if (flstudioSortBtn) {
    flstudioSortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const visible = flstudioSortDropdown.style.display !== 'none';
      flstudioSortDropdown.style.display = visible ? 'none' : 'block';
    });
  }

  // Sort options
  document.querySelectorAll('.flstudio-sort-option').forEach(btn => {
    btn.addEventListener('click', () => {
      flstudioState.currentSort = btn.dataset.sort;
      document.querySelectorAll('.flstudio-sort-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      flstudioSortDropdown.style.display = 'none';
      renderFlstudioProjects();
    });
  });

  // Close sort dropdown on outside click
  document.addEventListener('click', () => {
    flstudioSortDropdown.style.display = 'none';
  });

  // Open folder in explorer
  if (flstudioOpenFolderBtn) {
    flstudioOpenFolderBtn.addEventListener('click', openFlstudioFolder);
  }

  // Back to grid
  if (flstudioBackToGridBtn) {
    flstudioBackToGridBtn.addEventListener('click', showFlstudioGrid);
  }

  // Open in DAW
  if (flstudioOpenInDawBtn) {
    flstudioOpenInDawBtn.addEventListener('click', openCurrentInFlStudio);
  }

  // Reveal in explorer
  if (flstudioRevealBtn) {
    flstudioRevealBtn.addEventListener('click', revealCurrentInExplorer);
  }

  // Filter input
  if (flstudioFilterInput) {
    flstudioFilterInput.addEventListener('input', () => {
      renderFlstudioList(flstudioFilterInput.value.trim());
      renderFlstudioProjects();
    });
  }

  // Zoom buttons
  let gridColumns = 4;
  if (flstudioPacksZoomInBtn) {
    flstudioPacksZoomInBtn.addEventListener('click', () => {
      const grid = document.getElementById('flstudio-projects-grid');
      if (grid) {
        gridColumns = Math.max(2, gridColumns - 1);
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${280 - gridColumns * 20}px, 1fr))`;
      }
    });
  }
  if (flstudioPacksZoomOutBtn) {
    flstudioPacksZoomOutBtn.addEventListener('click', () => {
      const grid = document.getElementById('flstudio-projects-grid');
      if (grid) {
        gridColumns = Math.min(8, gridColumns + 1);
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${280 - gridColumns * 20}px, 1fr))`;
      }
    });
  }

  // Notes editor
  if (flstudioEditNotesBtn) {
    flstudioEditNotesBtn.addEventListener('click', showFlstudioNotesEditor);
  }
  if (flstudioSaveNotesBtn) {
    flstudioSaveNotesBtn.addEventListener('click', saveFlstudioNotes);
  }
  if (flstudioCancelNotesBtn) {
    flstudioCancelNotesBtn.addEventListener('click', cancelFlstudioNotesEdit);
  }

  // Load projects
  refreshFlstudioProjects();

  console.log('[FL Studio] Section initialized.');
}

// Load projects from disk
async function refreshFlstudioProjects() {
  if (!isElectron) return;

  try {
    const projects = await ipcRenderer.invoke('read-flstudio-folder', FLSTUDIO_DEFAULT_PATH);
    flstudioState.projects = projects || [];
    renderFlstudioList();
    renderFlstudioProjects();
  } catch (e) {
    console.error('[FL Studio] Error loading projects:', e);
  }
}

// Render left panel list
function renderFlstudioList(filter = '') {
  if (!flstudioListEl) return;
  flstudioListEl.innerHTML = '';

  const filterLower = filter.toLowerCase();
  const filtered = flstudioState.projects.filter(p =>
    p.name.toLowerCase().includes(filterLower)
  );

  if (filtered.length === 0) {
    flstudioListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No projects found</div>';
    return;
  }

  filtered.forEach(project => {
    const fileEl = document.createElement('div');
    fileEl.className = 'beat-item';
    fileEl.dataset.filePath = project.path;

    fileEl.innerHTML = `
      <div class="beat-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="beat-item-name">${project.name}</div>
      <button class="beat-item-open" title="Open in FL Studio">▶</button>
    `;

    fileEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('beat-item-open')) {
        openInFlStudio(project.path);
      } else {
        showFlstudioProjectDetail(project);
      }
    });

    flstudioListEl.appendChild(fileEl);
  });
}

// Sort projects
function sortFlstudioProjects(projects) {
  const sorted = [...projects];
  switch (flstudioState.currentSort) {
    case 'date-desc':
      sorted.sort((a, b) => (b.modified || 0) - (a.modified || 0));
      break;
    case 'date-asc':
      sorted.sort((a, b) => (a.modified || 0) - (b.modified || 0));
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'size-desc':
      sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
      break;
    case 'size-asc':
      sorted.sort((a, b) => (a.size || 0) - (a.size || 0));
      break;
  }
  return sorted;
}

// Format file size
function formatSize(bytes) {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Render project cards grid
function renderFlstudioProjects() {
  if (!flstudioProjectsGridEl) return;
  flstudioProjectsGridEl.innerHTML = '';

  const filterLower = (flstudioFilterInput?.value || '').toLowerCase();
  const filtered = flstudioState.projects.filter(p =>
    p.name.toLowerCase().includes(filterLower)
  );

  if (filtered.length === 0) {
    flstudioProjectsGridEl.innerHTML = `
      <div class="flstudio-empty-state" style="grid-column: 1/-1;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No FL Studio projects found in<br>${FLSTUDIO_DEFAULT_PATH}</p>
        <button class="btn-primary" onclick="openFlstudioFolder()" style="padding:8px 20px;font-size:13px;">Open Folder</button>
      </div>`;
    return;
  }

  const sorted = sortFlstudioProjects(filtered);

  sorted.forEach(project => {
    const cardEl = createFlstudioProjectCard(project);
    flstudioProjectsGridEl.appendChild(cardEl);
  });
}

// Create project card
function createFlstudioProjectCard(project) {
  const cardEl = document.createElement('div');
  cardEl.className = 'pack-card';
  cardEl.dataset.projectPath = project.path;

  const nameWithoutExt = project.name.replace(/\.flp$/i, '');

  // Image area with FL Studio branding
  const imageEl = document.createElement('div');
  imageEl.className = 'pack-card-image';
  imageEl.innerHTML = `
    <span class="flp-icon">FLP</span>
    <span class="flp-size-badge">${formatSize(project.size)}</span>
    <span class="flp-date-badge">${formatDate(project.modified)}</span>
    <div class="flp-open-overlay">
      <button class="flp-open-btn" data-path="${project.path}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Open
      </button>
    </div>
  `;

  cardEl.appendChild(imageEl);

  // Info
  const infoEl = document.createElement('div');
  infoEl.className = 'pack-card-info';
  const titleEl = document.createElement('div');
  titleEl.className = 'pack-card-title';
  titleEl.textContent = nameWithoutExt;
  infoEl.appendChild(titleEl);
  cardEl.appendChild(infoEl);

  // Click handlers
  imageEl.querySelector('.flp-open-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openInFlStudio(project.path);
  });

  cardEl.addEventListener('click', () => {
    showFlstudioProjectDetail(project);
  });

  return cardEl;
}

// Show project detail
function showFlstudioProjectDetail(project) {
  flstudioState.currentProject = project;

  flstudioMiddlePanelEl.style.display = 'none';
  flstudioRightPanelEl.style.display = 'flex';

  const nameWithoutExt = project.name.replace(/\.flp$/i, '');
  flstudioProjectDetailTitleEl.value = nameWithoutExt;

  // Render detail info
  renderFlstudioProjectDetail(project);

  // Show notes section
  flstudioNotesSection.style.display = 'block';
  const notes = flstudioState.notes[project.path] || '';
  flstudioNotesDisplay.textContent = notes || 'No notes available';
  flstudioNotesEditor.value = notes;
}

// Render project detail
function renderFlstudioProjectDetail(project) {
  if (!flstudioProjectDetailListEl) return;

  // Remove dynamically added items (after count element)
  const children = Array.from(flstudioProjectDetailListEl.children);
  let reachedCount = false;
  for (const child of children) {
    if (child.id === 'flstudio-project-detail-count') {
      reachedCount = true;
      continue;
    }
    if (reachedCount) child.remove();
  }

  // Add detail rows
  const details = [
    { label: 'File Name', value: project.name },
    { label: 'Path', value: project.path },
    { label: 'Size', value: formatSize(project.size) },
    { label: 'Modified', value: formatDate(project.modified) },
    { label: 'Extension', value: '.flp' }
  ];

  details.forEach(d => {
    const row = document.createElement('div');
    row.className = 'flstudio-detail-row';
    row.innerHTML = `
      <span class="flstudio-detail-label">${d.label}</span>
      <span class="flstudio-detail-value" title="${d.value}">${d.value}</span>
    `;
    flstudioProjectDetailListEl.appendChild(row);
  });
}

// Back to grid
function showFlstudioGrid() {
  flstudioState.currentProject = null;
  flstudioMiddlePanelEl.style.display = 'flex';
  flstudioRightPanelEl.style.display = 'none';
}

// Open project in FL Studio
async function openInFlStudio(filePath) {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('open-in-flstudio', filePath);
    if (result.success) {
      showNotification('Opening in FL Studio...', 'success');
    } else {
      showNotification(result.error || 'Failed to open FL Studio', 'error');
    }
  } catch (e) {
    console.error('[FL Studio] Error opening project:', e);
    showNotification('Error opening FL Studio', 'error');
  }
}

// Open current project in FL Studio
function openCurrentInFlStudio() {
  if (flstudioState.currentProject) {
    openInFlStudio(flstudioState.currentProject.path);
  }
}

// Reveal current project in explorer
async function revealCurrentInExplorer() {
  if (!isElectron || !flstudioState.currentProject) return;

  try {
    await ipcRenderer.invoke('reveal-in-explorer', flstudioState.currentProject.path);
  } catch (e) {
    console.error('[FL Studio] Error revealing file:', e);
  }
}

// Open FL Studio folder in explorer
async function openFlstudioFolder() {
  if (!isElectron) return;

  try {
    await ipcRenderer.invoke('open-folder', FLSTUDIO_DEFAULT_PATH);
  } catch (e) {
    console.error('[FL Studio] Error opening folder:', e);
  }
}

// Make openFlstudioFolder global for onclick
window.openFlstudioFolder = openFlstudioFolder;

// Notes editor functions
function showFlstudioNotesEditor() {
  flstudioNotesDisplay.style.display = 'none';
  flstudioNotesEditor.style.display = 'block';
  flstudioNotesEditActions.style.display = 'flex';
  flstudioEditNotesBtn.style.display = 'none';
  flstudioNotesEditor.focus();
}

function saveFlstudioNotes() {
  if (!flstudioState.currentProject) return;

  const notes = flstudioNotesEditor.value.trim();
  flstudioState.notes[flstudioState.currentProject.path] = notes;
  flstudioNotesDisplay.textContent = notes || 'No notes available';

  flstudioNotesDisplay.style.display = 'block';
  flstudioNotesEditor.style.display = 'none';
  flstudioNotesEditActions.style.display = 'none';
  flstudioEditNotesBtn.style.display = 'block';

  saveFlstudioData();
}

function cancelFlstudioNotesEdit() {
  const notes = flstudioState.currentProject
    ? flstudioState.notes[flstudioState.currentProject.path] || ''
    : '';
  flstudioNotesEditor.value = notes;

  flstudioNotesDisplay.style.display = 'block';
  flstudioNotesEditor.style.display = 'none';
  flstudioNotesEditActions.style.display = 'none';
  flstudioEditNotesBtn.style.display = 'block';
}

// Load saved notes
async function loadFlstudioData() {
  if (isElectron) {
    try {
      const savedData = await ipcRenderer.invoke('load-flstudio-data');
      if (savedData && savedData.notes) {
        flstudioState.notes = savedData.notes;
      }
    } catch (e) {
      console.error('[FL Studio] Error loading data:', e);
    }
  } else {
    const saved = localStorage.getItem('flstudio-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        flstudioState.notes = data.notes || {};
      } catch (e) {
        console.error('[FL Studio] Error parsing localStorage data:', e);
      }
    }
  }
}

// Save notes
async function saveFlstudioData() {
  const payload = { notes: flstudioState.notes };

  if (isElectron) {
    try {
      await ipcRenderer.invoke('save-flstudio-data', payload);
    } catch (e) {
      console.error('[FL Studio] Error saving data:', e);
    }
  } else {
    localStorage.setItem('flstudio-data', JSON.stringify(payload));
  }
}
