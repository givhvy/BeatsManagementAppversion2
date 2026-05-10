// ============================
// GALLERY SECTION
// ============================

let galleryInitialized = false;
const DEFAULT_GALLERY_FOLDER = 'D:\\coverimages';
let galleryFolderPath = localStorage.getItem('gallery-folder-path') || DEFAULT_GALLERY_FOLDER;
let galleryImages = [];
let selectedGalleryImage = null;

const gallerySelectFolderBtn = document.getElementById('gallery-select-folder-btn');
const galleryRefreshBtn = document.getElementById('gallery-refresh-btn');
const galleryFolderPathEl = document.getElementById('gallery-folder-path');
const galleryFilterInput = document.getElementById('gallery-filter-input');
const galleryGrid = document.getElementById('gallery-grid');
const galleryCount = document.getElementById('gallery-count');
const galleryImageModal = document.getElementById('gallery-image-modal');
const galleryModalImage = document.getElementById('gallery-modal-image');
const galleryModalClose = document.getElementById('gallery-modal-close');

function initGallerySection() {
  if (galleryInitialized) return;
  galleryInitialized = true;

  if (gallerySelectFolderBtn) gallerySelectFolderBtn.addEventListener('click', selectGalleryFolder);
  if (galleryRefreshBtn) galleryRefreshBtn.addEventListener('click', loadGalleryImages);
  if (galleryFilterInput) galleryFilterInput.addEventListener('input', renderGalleryGrid);
  if (galleryModalClose) galleryModalClose.addEventListener('click', closeGalleryImageModal);
  if (galleryImageModal) {
    galleryImageModal.addEventListener('click', (e) => {
      if (e.target === galleryImageModal) closeGalleryImageModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGalleryImageModal();
    
    // Navigate images with arrow keys when modal is open
    if (galleryImageModal && galleryImageModal.style.display === 'flex') {
      if (e.key === 'ArrowLeft') {
        navigateGalleryImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateGalleryImage('next');
      }
    }
  });
  if (galleryGrid) {
    galleryGrid.addEventListener('dragover', handleGalleryDragOver);
    galleryGrid.addEventListener('dragleave', handleGalleryDragLeave);
    galleryGrid.addEventListener('drop', handleGalleryDrop);
  }

  updateGalleryFolderDisplay();
  loadGalleryImages();
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

function handleGalleryDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  galleryGrid.classList.add('drag-over');
}

function handleGalleryDragLeave(e) {
  if (!galleryGrid.contains(e.relatedTarget)) {
    galleryGrid.classList.remove('drag-over');
  }
}

async function handleGalleryDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  galleryGrid.classList.remove('drag-over');

  const files = Array.from(e.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'));
  if (files.length === 0) return;

  try {
    const paths = files.map(file => file.path).filter(Boolean);
    if (paths.length === 0) {
      showNotification('Could not read dropped image paths', 'error');
      return;
    }

    const result = await ipcRenderer.invoke('save-gallery-images', {
      imagePaths: paths,
      targetFolder: galleryFolderPath || DEFAULT_GALLERY_FOLDER
    });

    if (!result.success) {
      showNotification(`Failed to save images: ${result.error}`, 'error');
      return;
    }

    galleryFolderPath = result.targetFolder || galleryFolderPath || DEFAULT_GALLERY_FOLDER;
    localStorage.setItem('gallery-folder-path', galleryFolderPath);
    updateGalleryFolderDisplay();
    showNotification(`Saved ${result.saved.length} image${result.saved.length === 1 ? '' : 's'} to Gallery`, 'success');
    await loadGalleryImages();
  } catch (error) {
    showNotification(`Failed to save images: ${error.message}`, 'error');
  }
}

async function loadGalleryImages() {
  if (!galleryGrid) return;
  if (!isElectron) {
    galleryGrid.innerHTML = '<div class="gallery-empty">Gallery requires Electron.</div>';
    return;
  }
  if (!galleryFolderPath) {
    galleryFolderPath = DEFAULT_GALLERY_FOLDER;
    localStorage.setItem('gallery-folder-path', galleryFolderPath);
    updateGalleryFolderDisplay();
  }
  if (!galleryFolderPath) {
    galleryGrid.innerHTML = '<div class="gallery-empty">Select a folder or drop images here.</div>';
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
    galleryGrid.innerHTML = '<div class="gallery-empty">No cover arts found. Drag and drop images here to save them.</div>';
    return;
  }

  galleryGrid.innerHTML = '';
  images.forEach(image => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    if (selectedGalleryImage?.path === image.path) card.classList.add('active');
    card.innerHTML = `
      <img src="file://${image.path}" alt="${image.name}">
    `;
    card.addEventListener('click', () => openGalleryImageModal(image));
    card.addEventListener('contextmenu', (e) => showGalleryContextMenu(e, image));
    galleryGrid.appendChild(card);
  });
}

function openGalleryImageModal(image) {
  selectedGalleryImage = image;
  if (galleryModalImage) {
    galleryModalImage.src = `file://${image.path}`;
    galleryModalImage.alt = image.name;
  }
  if (galleryImageModal) {
    galleryImageModal.style.display = 'flex';
  }
  renderGalleryGrid();
}

function navigateGalleryImage(direction) {
  if (!selectedGalleryImage || galleryImages.length === 0) return;
  
  // Get filtered images (respect current filter)
  const keyword = (galleryFilterInput?.value || '').trim().toLowerCase();
  const images = keyword
    ? galleryImages.filter(image => image.name.toLowerCase().includes(keyword))
    : galleryImages;
  
  if (images.length === 0) return;
  
  // Find current index
  const currentIndex = images.findIndex(img => img.path === selectedGalleryImage.path);
  if (currentIndex === -1) return;
  
  // Calculate next index
  let nextIndex;
  if (direction === 'next') {
    nextIndex = (currentIndex + 1) % images.length; // Loop to start
  } else {
    nextIndex = (currentIndex - 1 + images.length) % images.length; // Loop to end
  }
  
  // Open the next/previous image
  openGalleryImageModal(images[nextIndex]);
}

function closeGalleryImageModal() {
  if (galleryImageModal) {
    galleryImageModal.style.display = 'none';
  }
  if (galleryModalImage) {
    galleryModalImage.src = '';
  }
}

async function showGalleryContextMenu(e, image = selectedGalleryImage) {
  e.preventDefault();
  e.stopPropagation();
  if (!image || !isElectron) return;

  try {
    const result = await ipcRenderer.invoke('show-gallery-image-context-menu', image.path);
    if (result?.action === 'show-in-explorer') {
      await ipcRenderer.invoke('reveal-in-explorer', image.path);
    }
  } catch (error) {
    showNotification('Could not show image in Windows Explorer', 'error');
  }
}

window.showGalleryContextMenu = showGalleryContextMenu;
