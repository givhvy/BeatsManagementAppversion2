// ============================
// GALLERY SECTION
// ============================

let galleryInitialized = false;
let galleryFolderPath = localStorage.getItem('gallery-folder-path') || '';
let galleryImages = [];
let selectedGalleryImage = null;

const gallerySelectFolderBtn = document.getElementById('gallery-select-folder-btn');
const galleryRefreshBtn = document.getElementById('gallery-refresh-btn');
const galleryFolderPathEl = document.getElementById('gallery-folder-path');
const galleryFilterInput = document.getElementById('gallery-filter-input');
const galleryGrid = document.getElementById('gallery-grid');
const galleryCount = document.getElementById('gallery-count');
const galleryPreview = document.getElementById('gallery-preview');
const galleryPreviewInfo = document.getElementById('gallery-preview-info');
const galleryPreviewName = document.getElementById('gallery-preview-name');
const galleryCopyPathBtn = document.getElementById('gallery-copy-path-btn');

function initGallerySection() {
  if (galleryInitialized) return;
  galleryInitialized = true;

  if (gallerySelectFolderBtn) gallerySelectFolderBtn.addEventListener('click', selectGalleryFolder);
  if (galleryRefreshBtn) galleryRefreshBtn.addEventListener('click', loadGalleryImages);
  if (galleryFilterInput) galleryFilterInput.addEventListener('input', renderGalleryGrid);
  if (galleryCopyPathBtn) galleryCopyPathBtn.addEventListener('click', copySelectedGalleryPath);

  updateGalleryFolderDisplay();
  if (galleryFolderPath) loadGalleryImages();
}

async function selectGalleryFolder() {
  if (!isElectron) return;
  const folderPath = await ipcRenderer.invoke('select-folder');
  if (!folderPath) return;

  galleryFolderPath = folderPath;
  localStorage.setItem('gallery-folder-path', galleryFolderPath);
  updateGalleryFolderDisplay();
  await loadGalleryImages();
}

function updateGalleryFolderDisplay() {
  if (galleryFolderPathEl) {
    galleryFolderPathEl.textContent = galleryFolderPath || 'No folder selected';
    galleryFolderPathEl.title = galleryFolderPath || '';
  }
}

async function loadGalleryImages() {
  if (!galleryGrid) return;
  if (!isElectron) {
    galleryGrid.innerHTML = '<div class="gallery-empty">Gallery requires Electron.</div>';
    return;
  }
  if (!galleryFolderPath) {
    galleryGrid.innerHTML = '<div class="gallery-empty">Select a folder to load cover arts.</div>';
    return;
  }

  galleryGrid.innerHTML = '<div class="gallery-empty">Loading cover arts...</div>';
  try {
    galleryImages = await ipcRenderer.invoke('read-images-folder', galleryFolderPath) || [];
    renderGalleryGrid();
  } catch (error) {
    galleryGrid.innerHTML = `<div class="gallery-empty">Error: ${error.message}</div>`;
  }
}

function renderGalleryGrid() {
  if (!galleryGrid) return;
  const keyword = (galleryFilterInput?.value || '').trim().toLowerCase();
  const images = keyword
    ? galleryImages.filter(image => image.name.toLowerCase().includes(keyword))
    : galleryImages;

  if (galleryCount) galleryCount.textContent = `${images.length} image${images.length === 1 ? '' : 's'}`;

  if (images.length === 0) {
    galleryGrid.innerHTML = '<div class="gallery-empty">No cover arts found.</div>';
    return;
  }

  galleryGrid.innerHTML = '';
  images.forEach(image => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    if (selectedGalleryImage?.path === image.path) card.classList.add('active');
    card.innerHTML = `
      <img src="file://${image.path}" alt="${image.name}">
      <div class="gallery-card-name" title="${image.name}">${image.name}</div>
    `;
    card.addEventListener('click', () => selectGalleryImage(image));
    galleryGrid.appendChild(card);
  });
}

function selectGalleryImage(image) {
  selectedGalleryImage = image;
  if (galleryPreview) {
    galleryPreview.innerHTML = `<img src="file://${image.path}" alt="${image.name}">`;
  }
  if (galleryPreviewName) {
    galleryPreviewName.textContent = image.name;
    galleryPreviewName.title = image.path;
  }
  if (galleryPreviewInfo) galleryPreviewInfo.style.display = 'flex';
  renderGalleryGrid();
}

async function copySelectedGalleryPath() {
  if (!selectedGalleryImage) return;
  try {
    await navigator.clipboard.writeText(selectedGalleryImage.path);
    showNotification('Image path copied', 'success');
  } catch (error) {
    showNotification('Failed to copy image path', 'error');
  }
}
