// DISTROKID SECTION
// ============================

const DISTRO_SONGS_PATH  = 'D:\\Songs';
const DISTRO_RELEASE_PATH = 'D:\\Release';

let distroState = {
  releases: [],
  songs: [],
  draggedSong: null,
  currentFilter: 'all',
  initialized: false
};

function initDistroSection() {
  if (distroState.initialized) return;
  distroState.initialized = true;

  // Filter buttons
  const filterBtns = document.querySelectorAll('.distro-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      distroState.currentFilter = btn.dataset.filter;
      renderDistroReleases(distroState.currentFilter);
    });
  });

  // Refresh songs button
  const refreshBtn = document.getElementById('distro-refresh-songs-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadDistroSongs);

  // Search filter
  const searchEl = document.getElementById('distro-songs-search');
  if (searchEl) searchEl.addEventListener('input', () => renderDistroSongs(searchEl.value.trim()));

  loadDistroSongs();
  loadDistroReleases();
  loadReleaseFromFolder();
}

async function loadDistroReleases() {
  if (!isElectron) {
    console.log('Not running in Electron mode');
    return;
  }

  try {
    const result = await ipcRenderer.invoke('load-distro-releases');
    if (result.success && result.releases) {
      distroState.releases = result.releases;
      renderDistroReleases();
      updateDistroStats();
    }
  } catch (error) {
    console.error('Error loading distro releases:', error);
  }
}

// ── Songs Panel ─────────────────────────────────────────────
async function loadDistroSongs() {
  const listEl = document.getElementById('distro-songs-list');
  if (listEl) listEl.innerHTML = '<div class="distro-songs-loading">Loading tracks...</div>';

  if (!isElectron) {
    if (listEl) listEl.innerHTML = '<div class="distro-songs-loading">Not in Electron mode</div>';
    return;
  }

  try {
    const result = await ipcRenderer.invoke('read-folder-contents', DISTRO_SONGS_PATH);
    if (result && result.beats) {
      distroState.songs = result.beats.map(b => ({
        name: b.name,
        path: b.path,
        ext: b.name.split('.').pop().toLowerCase()
      }));
    } else {
      distroState.songs = [];
    }
    renderDistroSongs('');
  } catch (err) {
    console.error('loadDistroSongs error:', err);
    if (listEl) listEl.innerHTML = '<div class="distro-songs-loading">Error loading songs</div>';
  }
}

function renderDistroSongs(query = '') {
  const listEl = document.getElementById('distro-songs-list');
  if (!listEl) return;

  const filtered = query
    ? distroState.songs.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : distroState.songs;

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="distro-songs-loading">No tracks found</div>';
    return;
  }

  listEl.innerHTML = filtered.map(song => `
    <div class="distro-song-item"
         draggable="true"
         data-path="${song.path}"
         data-name="${song.name}"
         ondragstart="distroOnDragStart(event, '${song.path.replace(/'/g, "\\'")}', '${song.name.replace(/'/g, "\\'")}')">
      <svg class="distro-song-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      <span class="distro-song-name">${song.name.replace(/\.[^/.]+$/, '')}</span>
      <span class="distro-song-ext">${song.ext}</span>
    </div>
  `).join('');
}

// ── Release folder scanning ──────────────────────────────────
async function loadReleaseFromFolder() {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('read-folder-contents', DISTRO_RELEASE_PATH);
    if (!result) return;

    // Each sub-folder = one release
    const folders = result.folders || [];
    const folderReleases = folders.map(folder => ({
      id: `folder-${folder.name}`,
      title: folder.name,
      artist: '',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      artwork: null,
      tracks: folder.beats ? folder.beats.map(b => ({ name: b.name, path: b.path })) : [],
      sourcePath: folder.path
    }));

    // Also pick up loose audio files at the root of D:\Release
    const rootTracks = (result.beats || []).map(b => ({ name: b.name, path: b.path }));
    if (rootTracks.length > 0) {
      folderReleases.push({
        id: 'folder-root',
        title: 'D:\\Release (root)',
        artist: '',
        status: 'draft',
        date: new Date().toISOString().split('T')[0],
        artwork: null,
        tracks: rootTracks,
        sourcePath: DISTRO_RELEASE_PATH
      });
    }

    // Merge with existing saved releases — folder ones override if same id
    const savedIds = new Set(distroState.releases.map(r => r.id));
    folderReleases.forEach(fr => {
      if (!savedIds.has(fr.id)) distroState.releases.push(fr);
    });

    renderDistroReleases(distroState.currentFilter);
    updateDistroStats();
  } catch (err) {
    console.error('loadReleaseFromFolder error:', err);
  }
}

// ── Drag & Drop ──────────────────────────────────────────────
function distroOnDragStart(event, path, name) {
  distroState.draggedSong = { path, name };
  event.dataTransfer.effectAllowed = 'copy';
  event.target.classList.add('dragging');
  document.querySelectorAll('.distro-song-item').forEach(el => {
    if (el.dataset.path === path) el.classList.add('dragging');
  });
  setTimeout(() => {
    document.querySelectorAll('.distro-song-item.dragging').forEach(el => el.classList.remove('dragging'));
  }, 200);
}

function handleDropOnGrid(event) {
  event.preventDefault();
  const grid = document.getElementById('releases-grid');
  if (grid) grid.classList.remove('drag-over-grid');

  const song = distroState.draggedSong;
  if (!song) return;

  // Create a new release card from the dragged track
  const id = `drop-${Date.now()}`;
  const newRelease = {
    id,
    title: song.name.replace(/\.[^/.]+$/, ''),
    artist: '',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    artwork: null,
    tracks: [{ name: song.name, path: song.path }],
    sourcePath: DISTRO_SONGS_PATH
  };

  distroState.releases.push(newRelease);
  distroState.draggedSong = null;
  saveDistroReleases();
  renderDistroReleases(distroState.currentFilter);
}

function handleDropOnCard(event, releaseId) {
  event.preventDefault();
  event.stopPropagation();
  const card = event.currentTarget;
  card.classList.remove('drag-over');
  const grid = document.getElementById('releases-grid');
  if (grid) grid.classList.remove('drag-over-grid');

  const song = distroState.draggedSong;
  if (!song) return;

  const release = distroState.releases.find(r => r.id === releaseId);
  if (!release) return;

  if (!release.tracks) release.tracks = [];
  const already = release.tracks.some(t => t.path === song.path);
  if (!already) {
    release.tracks.push({ name: song.name, path: song.path });
    saveDistroReleases();
    renderDistroReleases(distroState.currentFilter);
  }
  distroState.draggedSong = null;
}

function removeTrackFromRelease(releaseId, trackPath) {
  const release = distroState.releases.find(r => r.id === releaseId);
  if (!release || !release.tracks) return;
  release.tracks = release.tracks.filter(t => t.path !== trackPath);
  saveDistroReleases();
  renderDistroReleases(distroState.currentFilter);
}

// ── Releases rendering ───────────────────────────────────────
function renderDistroReleases(filter = 'all') {
  const releasesGrid = document.getElementById('releases-grid');
  if (!releasesGrid) return;

  let filtered = filter === 'all'
    ? distroState.releases
    : distroState.releases.filter(r => r.status === filter);

  if (filtered.length === 0) {
    releasesGrid.innerHTML = `
      <div class="empty-state" id="releases-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
          <path d="M2 12h20"/>
        </svg>
        <p>No ${filter === 'all' ? '' : filter} releases yet</p>
        <p>Drag a track here or drop a folder in D:\\Release</p>
      </div>`;
    return;
  }

  releasesGrid.innerHTML = filtered.map(release => `
    <div class="release-card"
         data-id="${release.id}"
         ondragover="event.preventDefault(); this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="handleDropOnCard(event, '${release.id}')">
      <div class="release-artwork">
        ${release.artwork
          ? `<img src="${release.artwork}" alt="${release.title}">`
          : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`}
      </div>
      <div class="release-info">
        <div class="release-title">${release.title}</div>
        ${release.artist ? `<div class="release-artist">${release.artist}</div>` : ''}
        ${release.sourcePath ? `<div class="release-source-path">${release.sourcePath}</div>` : ''}
      </div>
      <div class="release-meta">
        <span class="release-status ${release.status}">${release.status}</span>
        <span>${release.date}</span>
      </div>
      ${release.tracks && release.tracks.length > 0 ? `
        <div class="release-tracks">
          ${release.tracks.map((t, i) => `
            <div class="release-track-item">
              <span class="release-track-num">${i + 1}</span>
              <span class="release-track-name">${t.name.replace(/\.[^/.]+$/, '')}</span>
              <button class="release-track-remove" title="Remove" onclick="removeTrackFromRelease('${release.id}', '${t.path.replace(/'/g, "\\'")}')">×</button>
            </div>
          `).join('')}
        </div>` : ''}
    </div>
  `).join('');
}

// ── Persist ──────────────────────────────────────────────────
async function saveDistroReleases() {
  if (!isElectron) return;
  try {
    await ipcRenderer.invoke('save-distro-releases', distroState.releases);
  } catch (err) {
    console.error('saveDistroReleases error:', err);
  }
}

function filterReleases(filter) {
  renderDistroReleases(filter);
}

function updateDistroStats() {
  const published = distroState.releases.filter(r => r.status === 'published').length;
  const pending   = distroState.releases.filter(r => r.status === 'pending').length;
  const total     = distroState.releases.length;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthReleases = distroState.releases.filter(r => r.date && r.date.startsWith(thisMonth)).length;

  const el = id => document.getElementById(id);
  if (el('distro-published')) el('distro-published').textContent = published;
  if (el('distro-pending'))   el('distro-pending').textContent   = pending;
  if (el('distro-total'))     el('distro-total').textContent     = total;
  if (el('distro-this-month')) el('distro-this-month').textContent = thisMonthReleases;
}

function openNewReleaseModal() {
  showNotification('New Release feature coming soon!', 'info');
}

// Expose globals for inline event handlers
window.distroOnDragStart     = distroOnDragStart;
window.handleDropOnGrid      = handleDropOnGrid;
window.handleDropOnCard      = handleDropOnCard;
window.removeTrackFromRelease = removeTrackFromRelease;
window.openNewReleaseModal   = openNewReleaseModal;
