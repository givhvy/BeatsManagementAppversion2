// ============================
// ARTIST THUMBNAIL PACKS
// ============================

let artistsInitialized = false;
let artistThumbnailPacks = [];
let selectedArtistPackId = null;
const ARTIST_THUMBNAIL_ROOT = 'D:\\artistthumbnail';
const ARTIST_THUMBNAIL_DB_LABEL = `${ARTIST_THUMBNAIL_ROOT}\\artist-thumbnails.json`;

function parseArtistThumbnailJson(raw) {
  return JSON.parse(String(raw || '').replace(/^\uFEFF/, '').trim() || '{}');
}

const artistNewPackBtn = document.getElementById('artist-new-pack-btn');
const artistNewPackInput = document.getElementById('artist-new-pack-input');
const artistCreatePackBtn = document.getElementById('artist-create-pack-btn');
const artistPackSearch = document.getElementById('artist-pack-search');
const artistPackList = document.getElementById('artist-pack-list');
const artistPackCount = document.getElementById('artist-pack-count');
const artistImageCount = document.getElementById('artist-image-count');
const artistUsedCount = document.getElementById('artist-used-count');
const artistSelectedTitle = document.getElementById('artist-selected-title');
const artistSelectedMeta = document.getElementById('artist-selected-meta');
const artistRenamePackBtn = document.getElementById('artist-rename-pack-btn');
const artistDeletePackBtn = document.getElementById('artist-delete-pack-btn');
const artistDropZone = document.getElementById('artist-drop-zone');
const artistDropEmpty = document.getElementById('artist-drop-empty');
const artistThumbnailGrid = document.getElementById('artist-thumbnail-grid');

function initArtistsSection() {
  if (artistsInitialized) return;
  artistsInitialized = true;

  if (artistNewPackBtn) artistNewPackBtn.addEventListener('click', createArtistPack);
  if (artistCreatePackBtn) artistCreatePackBtn.addEventListener('click', createArtistPackFromInput);
  if (artistNewPackInput) {
    artistNewPackInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createArtistPackFromInput();
    });
  }
  if (artistPackSearch) artistPackSearch.addEventListener('input', renderArtistPacks);
  if (artistRenamePackBtn) artistRenamePackBtn.addEventListener('click', renameSelectedArtistPack);
  if (artistDeletePackBtn) artistDeletePackBtn.addEventListener('click', deleteSelectedArtistPack);

  if (artistDropZone) {
    artistDropZone.addEventListener('dragover', handleArtistDragOver);
    artistDropZone.addEventListener('dragleave', handleArtistDragLeave);
    artistDropZone.addEventListener('drop', handleArtistDrop);
  }

  loadArtistThumbnailData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArtistsSection);
} else {
  initArtistsSection();
}

async function loadArtistThumbnailData() {
  try {
    let data = null;
    const localData = loadArtistThumbnailDataFromDisk();
    if (localData) {
      data = localData;
    } else if (isElectron && typeof ipcRenderer !== 'undefined') {
      data = await ipcRenderer.invoke('load-artist-thumbnail-data');
    } else {
      data = JSON.parse(localStorage.getItem('artist-thumbnail-data') || '{}');
    }

    artistThumbnailPacks = Array.isArray(data?.artistThumbnailPacks) ? data.artistThumbnailPacks : [];
    selectedArtistPackId = data?.selectedArtistPackId || artistThumbnailPacks[0]?.id || null;
  } catch (error) {
    console.error('[Artists] Failed to load artist thumbnail data:', error);
    artistThumbnailPacks = [];
  }

  renderArtistPacks();
  renderSelectedArtistPack();
}

async function saveArtistThumbnailData() {
  const payload = { artistThumbnailPacks, selectedArtistPackId };
  try {
    if (saveArtistThumbnailDataToDisk(payload)) {
      return;
    }

    if (isElectron && typeof ipcRenderer !== 'undefined') {
      const result = await ipcRenderer.invoke('save-artist-thumbnail-data', payload);
      if (result && result.success === false) throw new Error(result.error || 'Save failed');
    } else {
      localStorage.setItem('artist-thumbnail-data', JSON.stringify(payload));
    }
  } catch (error) {
    console.error('[Artists] Failed to save artist thumbnail data:', error);
    showNotification?.(`Failed to save artist thumbnails: ${error.message}`, 'error');
  }
}

function getArtistNodeRuntime() {
  try {
    if (typeof require === 'undefined') return null;
    return { fs: require('fs'), path: require('path') };
  } catch (error) {
    return null;
  }
}

function ensureArtistThumbnailRoot() {
  const runtime = getArtistNodeRuntime();
  if (!runtime) return null;
  const { fs, path } = runtime;
  fs.mkdirSync(ARTIST_THUMBNAIL_ROOT, { recursive: true });
  return { fs, path, dbPath: path.join(ARTIST_THUMBNAIL_ROOT, 'artist-thumbnails.json') };
}

function loadArtistThumbnailDataFromDisk() {
  const runtime = ensureArtistThumbnailRoot();
  if (!runtime) return null;

  const { fs, dbPath } = runtime;
  if (!fs.existsSync(dbPath)) {
    const initialData = { artistThumbnailPacks: [], selectedArtistPackId: null };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    return initialData;
  }

  const data = parseArtistThumbnailJson(fs.readFileSync(dbPath, 'utf8'));
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  return data;
}

function saveArtistThumbnailDataToDisk(payload) {
  const runtime = ensureArtistThumbnailRoot();
  if (!runtime) return false;
  runtime.fs.writeFileSync(runtime.dbPath, JSON.stringify(payload, null, 2));
  return true;
}

function sanitizeArtistFolderName(name) {
  return String(name || 'Artist')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Artist';
}

function saveArtistImagesToDisk(imagePaths, artistName) {
  const runtime = ensureArtistThumbnailRoot();
  if (!runtime) return null;

  const { fs, path } = runtime;
  const artistFolder = path.join(ARTIST_THUMBNAIL_ROOT, sanitizeArtistFolderName(artistName));
  fs.mkdirSync(artistFolder, { recursive: true });
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const saved = [];

  for (const imagePath of imagePaths || []) {
    if (!imagePath || !fs.existsSync(imagePath)) continue;
    const ext = path.extname(imagePath).toLowerCase();
    if (!imageExtensions.includes(ext)) continue;

    const parsed = path.parse(imagePath);
    let targetPath = path.join(artistFolder, parsed.base);
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(artistFolder, `${parsed.name}-${counter}${parsed.ext}`);
      counter += 1;
    }

    fs.copyFileSync(imagePath, targetPath);
    saved.push({ name: path.basename(targetPath), path: targetPath });
  }

  return saved;
}

function createArtistPack() {
  // Focus the existing input instead of prompt() — Electron blocks prompt()
  if (artistNewPackInput) {
    artistNewPackInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    artistNewPackInput.focus();
    artistNewPackInput.select();
  }
}

function createArtistPackFromInput() {
  const name = (artistNewPackInput?.value || '').trim();
  if (!name) return;
  addArtistPackByName(name);
  if (artistNewPackInput) artistNewPackInput.value = '';
}

function addArtistPackByName(name) {
  if (!name) return;

  const pack = {
    id: `artist-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    artist: name,
    images: [],
    createdAt: Date.now()
  };

  artistThumbnailPacks.unshift(pack);
  selectedArtistPackId = pack.id;
  renderArtistPacks();
  renderSelectedArtistPack();
  saveArtistThumbnailData();
}

function getSelectedArtistPack() {
  return artistThumbnailPacks.find(pack => pack.id === selectedArtistPackId) || null;
}

function getArtistInitials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

function escapeArtistHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderArtistPacks() {
  if (!artistPackList) return;

  const query = (artistPackSearch?.value || '').trim().toLowerCase();
  const filtered = query
    ? artistThumbnailPacks.filter(pack => pack.artist.toLowerCase().includes(query))
    : artistThumbnailPacks;

  const totalImages = artistThumbnailPacks.reduce((sum, pack) => sum + pack.images.length, 0);
  const usedImages = artistThumbnailPacks.reduce((sum, pack) => sum + pack.images.filter(image => image.used).length, 0);
  if (artistPackCount) artistPackCount.textContent = artistThumbnailPacks.length;
  if (artistImageCount) artistImageCount.textContent = totalImages;
  if (artistUsedCount) artistUsedCount.textContent = usedImages;

  if (filtered.length === 0) {
    artistPackList.innerHTML = '<div class="gallery-empty">No artist packs yet. Create one to start.</div>';
    return;
  }

  artistPackList.innerHTML = '';
  filtered.forEach(pack => {
    const used = pack.images.filter(image => image.used).length;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'artist-pack-card';
    if (pack.id === selectedArtistPackId) card.classList.add('active');
    card.innerHTML = `
      <span class="artist-pack-avatar">${escapeArtistHtml(getArtistInitials(pack.artist))}</span>
      <span class="artist-pack-info">
        <span class="artist-pack-name">${escapeArtistHtml(pack.artist)}</span>
        <span class="artist-pack-meta">${pack.images.length} image${pack.images.length === 1 ? '' : 's'} · ${used} used</span>
      </span>
    `;
    card.addEventListener('click', () => {
      selectedArtistPackId = pack.id;
      renderArtistPacks();
      renderSelectedArtistPack();
      saveArtistThumbnailData();
    });
    artistPackList.appendChild(card);
  });
}

function renderSelectedArtistPack() {
  const pack = getSelectedArtistPack();
  const hasPack = Boolean(pack);

  if (artistRenamePackBtn) artistRenamePackBtn.disabled = !hasPack;
  if (artistDeletePackBtn) artistDeletePackBtn.disabled = !hasPack;

  if (!pack) {
    if (artistSelectedTitle) artistSelectedTitle.textContent = 'Select an artist pack';
    if (artistSelectedMeta) artistSelectedMeta.textContent = `Local database: ${ARTIST_THUMBNAIL_DB_LABEL}`;
    if (artistDropEmpty) artistDropEmpty.style.display = 'flex';
    if (artistThumbnailGrid) artistThumbnailGrid.innerHTML = '';
    return;
  }

  const used = pack.images.filter(image => image.used).length;
  if (artistSelectedTitle) artistSelectedTitle.textContent = pack.artist;
  if (artistSelectedMeta) {
    artistSelectedMeta.textContent = `${pack.images.length} thumbnails · ${used} marked used · Stored in dataartistthumbnails`;
  }

  if (artistDropEmpty) {
    artistDropEmpty.style.display = pack.images.length ? 'none' : 'flex';
    artistDropEmpty.innerHTML = `
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L6 18"/></svg>
      <h3>Drop ${escapeArtistHtml(pack.artist)} thumbnails here</h3>
      <p>Use images that fit this artist's type beat uploads.</p>
    `;
  }

  if (!artistThumbnailGrid) return;
  artistThumbnailGrid.innerHTML = '';
  pack.images.forEach(image => {
    const card = document.createElement('div');
    card.className = 'artist-thumb-card';
    if (image.used) card.classList.add('used');
    card.draggable = true;
    card.innerHTML = `
      <img src="file://${image.path}" alt="${escapeArtistHtml(image.name)}">
      <div class="artist-thumb-footer">
        <span class="artist-thumb-name">${escapeArtistHtml(image.name)}</span>
        <button type="button" class="artist-used-toggle">${image.used ? 'Used' : 'Mark Used'}</button>
      </div>
    `;

    card.addEventListener('dragstart', (e) => {
      if (isElectron && typeof ipcRenderer !== 'undefined') {
        ipcRenderer.send('ondragstart', image.path);
      }
      e.dataTransfer.setData('text/plain', image.path);
      e.dataTransfer.effectAllowed = 'copy';
    });

    card.querySelector('.artist-used-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      image.used = !image.used;
      renderArtistPacks();
      renderSelectedArtistPack();
      saveArtistThumbnailData();
    });

    artistThumbnailGrid.appendChild(card);
  });
}

function renameSelectedArtistPack() {
  const pack = getSelectedArtistPack();
  if (!pack) return;
  const titleEl = document.getElementById('artist-selected-title');
  if (!titleEl) return;

  // If already in rename mode, commit it
  if (titleEl.querySelector('input')) {
    commitArtistRename(pack, titleEl);
    return;
  }

  // Replace title text with an editable input
  const currentName = pack.artist;
  titleEl.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'filter-input';
  input.style.cssText = 'width:100%; font-size:inherit; font-weight:inherit; padding:4px 8px;';
  titleEl.appendChild(input);
  input.focus();
  input.select();

  const commit = () => commitArtistRename(pack, titleEl);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { titleEl.textContent = currentName; }
  });
  input.addEventListener('blur', commit);

  if (artistRenamePackBtn) artistRenamePackBtn.textContent = 'Save';
}

function commitArtistRename(pack, titleEl) {
  const input = titleEl.querySelector('input');
  const trimmed = (input ? input.value : titleEl.textContent || '').trim();
  if (trimmed && trimmed !== pack.artist) {
    pack.artist = trimmed;
    saveArtistThumbnailData();
    renderArtistPacks();
  }
  renderSelectedArtistPack();
  if (artistRenamePackBtn) artistRenamePackBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Rename`;
}

let _deleteConfirmTimer = null;

function deleteSelectedArtistPack() {
  const pack = getSelectedArtistPack();
  if (!pack) return;
  if (!artistDeletePackBtn) return;

  // Two-click confirm: first click arms it, second click executes
  if (artistDeletePackBtn.dataset.confirmArmed === '1') {
    clearTimeout(_deleteConfirmTimer);
    artistDeletePackBtn.dataset.confirmArmed = '';
    artistDeletePackBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg> Delete`;
    artistDeletePackBtn.style.background = '';
    artistDeletePackBtn.style.borderColor = '';
    artistDeletePackBtn.style.color = '';

    artistThumbnailPacks = artistThumbnailPacks.filter(item => item.id !== pack.id);
    selectedArtistPackId = artistThumbnailPacks[0]?.id || null;
    renderArtistPacks();
    renderSelectedArtistPack();
    saveArtistThumbnailData();
    showNotification?.(`Deleted pack "${pack.artist}"`, 'info');
    return;
  }

  // Arm the button
  artistDeletePackBtn.dataset.confirmArmed = '1';
  artistDeletePackBtn.textContent = `Delete "${pack.artist}"?`;
  artistDeletePackBtn.style.background = 'rgba(239,68,68,0.18)';
  artistDeletePackBtn.style.borderColor = 'rgba(239,68,68,0.5)';
  artistDeletePackBtn.style.color = '#fca5a5';

  // Auto-disarm after 3 seconds
  _deleteConfirmTimer = setTimeout(() => {
    if (artistDeletePackBtn) {
      artistDeletePackBtn.dataset.confirmArmed = '';
      artistDeletePackBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg> Delete`;
      artistDeletePackBtn.style.background = '';
      artistDeletePackBtn.style.borderColor = '';
      artistDeletePackBtn.style.color = '';
    }
  }, 3000);
}

function handleArtistDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  if (artistDropZone) artistDropZone.classList.add('drag-over');
}

function handleArtistDragLeave(e) {
  if (!artistDropZone?.contains(e.relatedTarget)) {
    artistDropZone?.classList.remove('drag-over');
  }
}

async function handleArtistDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  artistDropZone?.classList.remove('drag-over');

  const pack = getSelectedArtistPack();
  if (!pack) {
    showNotification?.('Create or select an artist pack first', 'warning');
    return;
  }

  const files = Array.from(e.dataTransfer?.files || []);
  const imageFiles = files.filter(file => file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || ''));
  const paths = imageFiles.map(file => file.path).filter(Boolean);
  if (paths.length === 0) return;

  let savedImages = paths.map(imagePath => ({
    path: imagePath,
    name: imagePath.split(/[\\/]/).pop() || 'thumbnail'
  }));

  const localSavedImages = saveArtistImagesToDisk(paths, pack.artist);
  if (localSavedImages) {
    savedImages = localSavedImages;
  } else if (isElectron && typeof ipcRenderer !== 'undefined') {
    const result = await ipcRenderer.invoke('save-artist-thumbnail-images', {
      imagePaths: paths,
      artistName: pack.artist
    });

    if (!result.success) {
      showNotification?.(`Failed to save thumbnails: ${result.error}`, 'error');
      return;
    }

    savedImages = result.saved || [];
  }

  let added = 0;
  savedImages.forEach(imageFile => {
    if (pack.images.some(image => image.path === imageFile.path)) return;
    pack.images.unshift({
      id: `thumb-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      path: imageFile.path,
      name: imageFile.name,
      used: false,
      addedAt: Date.now()
    });
    added++;
  });

  renderArtistPacks();
  renderSelectedArtistPack();
  saveArtistThumbnailData();
  if (added > 0) {
    showNotification?.(`Added ${added} thumbnail${added === 1 ? '' : 's'} to ${pack.artist}`, 'success');
  }
}
