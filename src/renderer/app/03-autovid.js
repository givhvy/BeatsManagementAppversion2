// ============================
// AUTOVID SECTION
// ============================

let autovidState = {
  boards: [],
  currentPins: [],
  selectedImage: null,
  selectedImagePath: null,
  selectedAudioPath: null,
  isRendering: false,
  allBeats: [],
  currentLeftTab: 'images', // 'images' | 'beats'
  selectedBeatPath: null
};

// AutoVid DOM Elements
const loadBoardsBtn = document.getElementById('load-boards-btn');
const pinterestSearchInput = document.getElementById('pinterest-search');
const searchPinsBtn = document.getElementById('search-pins-btn');
const boardsList = document.getElementById('boards-list');
const randomizePinBtn = document.getElementById('randomize-pin-btn');
const previewImage = document.getElementById('preview-image');
const imagePlaceholder = document.getElementById('image-placeholder');
const imageInfo = document.getElementById('image-info');
const imageTitle = document.getElementById('image-title');
const imageSource = document.getElementById('image-source');
const selectAudioBtn = document.getElementById('select-audio-btn');
const audioFilePath = document.getElementById('audio-file-path');
const audioPreviewContainer = document.getElementById('audio-preview-container');
const autovidAudioPlayer = document.getElementById('autovid-audio-player');
const outputNameInput = document.getElementById('output-name');
const videoResolution = document.getElementById('video-resolution');
const renderVideoBtn = document.getElementById('render-video-btn');
const renderProgress = document.getElementById('render-progress');
const renderProgressFill = document.getElementById('render-progress-fill');
const renderProgressText = document.getElementById('render-progress-text');
const renderOutput = document.getElementById('render-output');
const openOutputFolderBtn = document.getElementById('open-output-folder-btn');

let autovidInitialized = false;

// Local image selection button
const selectLocalImageBtn = document.getElementById('select-local-image-btn');

function initAutoVidSection() {
  if (autovidInitialized) return;
  autovidInitialized = true;

  // Event listeners
  if (loadBoardsBtn) {
    loadBoardsBtn.addEventListener('click', () => {
      if (autovidState.currentLeftTab === 'beats') {
        loadAutovidBeats();
      } else {
        loadLocalImageFolder();
      }
    });
  }

  // Left panel tabs (Images / Beats)
  document.querySelectorAll('.autovid-left-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchAutovidLeftTab(btn.dataset.avtab);
    });
  });

  // Beats filter
  const beatsFilterInput = document.getElementById('autovid-beats-filter');
  if (beatsFilterInput) {
    beatsFilterInput.addEventListener('input', filterAutovidBeats);
  }

  if (searchPinsBtn) {
    searchPinsBtn.addEventListener('click', filterLocalImages);
  }

  if (pinterestSearchInput) {
    pinterestSearchInput.addEventListener('input', filterLocalImages);
    pinterestSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') filterLocalImages();
    });
  }

  if (randomizePinBtn) {
    randomizePinBtn.addEventListener('click', randomizePin);
  }

  if (selectAudioBtn) {
    selectAudioBtn.addEventListener('click', selectAutovidAudio);
  }

  if (renderVideoBtn) {
    renderVideoBtn.addEventListener('click', renderVideo);
  }

  if (openOutputFolderBtn) {
    openOutputFolderBtn.addEventListener('click', openAutovidOutput);
  }

  // Reset workspace button
  const resetWorkspaceBtn = document.getElementById('reset-workspace-btn');
  if (resetWorkspaceBtn) {
    resetWorkspaceBtn.addEventListener('click', resetAutovidWorkspace);
  }

  // Upload to YouTube button
  const uploadToYoutubeBtn = document.getElementById('upload-to-youtube-btn');
  if (uploadToYoutubeBtn) {
    uploadToYoutubeBtn.addEventListener('click', uploadCurrentVideoToYouTube);
  }

  // Local image selection
  if (selectLocalImageBtn) {
    selectLocalImageBtn.addEventListener('click', selectLocalImage);
  }

  // Clear audio button
  const clearAudioBtn = document.getElementById('clear-audio-btn');
  if (clearAudioBtn) {
    clearAudioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAutovidAudio();
    });
  }

  // Drag-drop for image preview zone
  const imageDropZone = document.getElementById('image-preview-container');
  if (imageDropZone) {
    imageDropZone.addEventListener('click', () => {
      if (!autovidState.selectedImagePath) selectLocalImage();
    });
    imageDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      imageDropZone.classList.add('drag-over');
      const overlay = document.getElementById('image-drop-overlay');
      if (overlay) overlay.classList.add('visible');
    });
    imageDropZone.addEventListener('dragleave', (e) => {
      if (!imageDropZone.contains(e.relatedTarget)) {
        imageDropZone.classList.remove('drag-over');
        const overlay = document.getElementById('image-drop-overlay');
        if (overlay) overlay.classList.remove('visible');
      }
    });
    imageDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      imageDropZone.classList.remove('drag-over');
      const overlay = document.getElementById('image-drop-overlay');
      if (overlay) overlay.classList.remove('visible');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleDroppedImage(file);
      }
    });
    imageDropZone.addEventListener('paste', handlePastedImage);
    imageDropZone.setAttribute('tabindex', '0');
  }

  document.addEventListener('paste', (e) => {
    const activeSection = document.getElementById('autovid-section');
    if (activeSection && activeSection.classList.contains('active')) {
      handlePastedImage(e);
    }
  });

  // Drag-drop for audio zone
  const audioDropZoneEl = document.getElementById('audio-drop-zone');
  if (audioDropZoneEl) {
    audioDropZoneEl.addEventListener('click', (e) => {
      if (!e.target.closest('.audio-clear-btn')) selectAutovidAudio();
    });
    audioDropZoneEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      audioDropZoneEl.classList.add('drag-over');
      const overlay = document.getElementById('audio-drop-overlay');
      if (overlay) overlay.classList.add('visible');
    });
    audioDropZoneEl.addEventListener('dragleave', (e) => {
      if (!audioDropZoneEl.contains(e.relatedTarget)) {
        audioDropZoneEl.classList.remove('drag-over');
        const overlay = document.getElementById('audio-drop-overlay');
        if (overlay) overlay.classList.remove('visible');
      }
    });
    audioDropZoneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      audioDropZoneEl.classList.remove('drag-over');
      const overlay = document.getElementById('audio-drop-overlay');
      if (overlay) overlay.classList.remove('visible');
      const file = e.dataTransfer.files[0];
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (['mp3','wav','flac','m4a','aac','ogg'].includes(ext)) {
          handleDroppedAudio(file);
        }
      }
    });
  }

  updateRenderButton();
  initCustomAudioPlayer();

  // Auto-load local image folder on first open
  loadLocalImageFolder();
}

function handleDroppedImage(file) {
  // In Electron, file.path is the real FS path
  const filePath = file.path || '';
  if (filePath) {
    autovidState.selectedImagePath = filePath;
    autovidState.selectedImage = null;
    if (previewImage && imagePlaceholder) {
      previewImage.src = `file://${filePath}`;
      previewImage.style.display = 'block';
      imagePlaceholder.style.display = 'none';
    }
    if (imageInfo) {
      imageInfo.style.display = 'block';
      imageTitle.textContent = file.name;
      imageSource.textContent = 'Local file';
    }
  } else {
    // Browser fallback  use object URL
    const url = URL.createObjectURL(file);
    autovidState.selectedImagePath = url;
    autovidState.selectedImage = null;
    if (previewImage && imagePlaceholder) {
      previewImage.src = url;
      previewImage.style.display = 'block';
      imagePlaceholder.style.display = 'none';
    }
  }
  updateRenderButton();
}

async function handlePastedImage(e) {
  const items = e.clipboardData?.items;
  if (!items) return;

  const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
  if (!imageItem) return;

  e.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const dataUrl = reader.result;
      let imagePath = dataUrl;

      if (isElectron) {
        const result = await ipcRenderer.invoke('save-pasted-image', dataUrl);
        if (!result.success) {
          showNotification(`Failed to paste image: ${result.error}`, 'error');
          return;
        }
        imagePath = result.path;
      }

      autovidState.selectedImagePath = imagePath;
      autovidState.selectedImage = null;

      if (previewImage && imagePlaceholder) {
        previewImage.src = isElectron ? `file://${imagePath}` : dataUrl;
        previewImage.style.display = 'block';
        imagePlaceholder.style.display = 'none';
      }

      if (imageInfo) {
        imageInfo.style.display = 'block';
        imageTitle.textContent = 'Pasted image';
        imageSource.textContent = isElectron ? imagePath : 'Clipboard';
      }

      updateRenderButton();
      showNotification('Pasted image loaded into preview', 'success');
    } catch (error) {
      console.error('Error handling pasted image:', error);
      showNotification(`Failed to paste image: ${error.message}`, 'error');
    }
  };
  reader.readAsDataURL(file);
}

function handleDroppedAudio(file) {
  const filePath = file.path || '';
  const displayName = file.name;
  const audioFilePathEl = document.getElementById('audio-file-path');
  const audioDropHint = document.getElementById('audio-drop-hint');
  const audioSelectedInfo = document.getElementById('audio-selected-info');
  const audioFileNameEl = document.getElementById('audio-file-name');

  if (filePath) {
    autovidState.selectedAudioPath = filePath;
    if (audioFilePathEl) audioFilePathEl.value = displayName;
    if (audioDropHint) audioDropHint.style.display = 'none';
    if (audioSelectedInfo) audioSelectedInfo.style.display = 'flex';
    if (audioFileNameEl) audioFileNameEl.textContent = displayName;
    if (audioPreviewContainer) {
      audioPreviewContainer.style.display = 'block';
      autovidAudioPlayer.src = `file://${filePath}`;
    }
    if (outputNameInput) {
      const baseName = displayName.replace(/\.[^/.]+$/, '');
      outputNameInput.value = extractBeatName ? extractBeatName(baseName) : baseName;
    }
  }
  updateRenderButton();
}

function clearAutovidAudio() {
  autovidState.selectedAudioPath = null;
  const audioFilePathEl = document.getElementById('audio-file-path');
  const audioDropHint = document.getElementById('audio-drop-hint');
  const audioSelectedInfo = document.getElementById('audio-selected-info');
  if (audioFilePathEl) audioFilePathEl.value = '';
  if (audioDropHint) audioDropHint.style.display = 'flex';
  if (audioSelectedInfo) audioSelectedInfo.style.display = 'none';
  if (audioPreviewContainer) audioPreviewContainer.style.display = 'none';
  updateRenderButton();
}

function resetAutovidWorkspace() {
  // Reset audio
  autovidState.selectedAudioPath = null;
  autovidState.selectedBeatPath = null;
  const audioFilePathEl = document.getElementById('audio-file-path');
  const audioDropHint = document.getElementById('audio-drop-hint');
  const audioSelectedInfo = document.getElementById('audio-selected-info');
  const audioFileName = document.getElementById('audio-file-name');
  if (audioFilePathEl) audioFilePathEl.value = '';
  if (audioFileName) audioFileName.textContent = 'No file selected';
  if (audioDropHint) audioDropHint.style.display = 'flex';
  if (audioSelectedInfo) audioSelectedInfo.style.display = 'none';
  if (audioPreviewContainer) audioPreviewContainer.style.display = 'none';

  // Stop audio if playing
  if (autovidAudioPlayer) {
    autovidAudioPlayer.pause();
    autovidAudioPlayer.currentTime = 0;
  }

  // Reset image
  autovidState.selectedImage = null;
  autovidState.selectedImagePath = null;
  const previewImage = document.getElementById('preview-image');
  const imagePlaceholder = document.getElementById('image-placeholder');
  if (previewImage) previewImage.src = '';
  if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
  if (previewImage) previewImage.style.display = 'none';

  // Reset output name
  if (outputNameInput) outputNameInput.value = '';

  // Hide rendered video card
  const renderedVideoCard = document.getElementById('rendered-video-card');
  if (renderedVideoCard) renderedVideoCard.style.display = 'none';

  // Hide render output
  if (renderOutput) renderOutput.style.display = 'none';

  // Update render button state
  updateRenderButton();

  // Show notification
  showNotification('Workspace reset successfully', 'success');
}

async function selectLocalImage() {
  if (!isElectron) return;

  try {
    const filePath = await ipcRenderer.invoke('select-image');
    if (filePath) {
      autovidState.selectedImagePath = filePath;
      autovidState.selectedImage = null; // Clear Pinterest selection

      // Update preview
      if (previewImage && imagePlaceholder) {
        previewImage.src = `file://${filePath}`;
        previewImage.style.display = 'block';
        imagePlaceholder.style.display = 'none';
      }

      if (imageInfo) {
        imageInfo.style.display = 'block';
        const fileName = filePath.split('\\').pop();
        imageTitle.textContent = fileName;
        imageSource.textContent = 'Local file';
      }

      updateRenderButton();
    }
  } catch (error) {
    console.error('Error selecting image:', error);
  }
}

const LOCAL_IMAGE_FOLDER = 'D:\\folderforpinterest';
let allLocalImages = [];

async function loadLocalImageFolder() {
  if (!isElectron) {
    boardsList.innerHTML = '<div class="empty-state">Requires Electron</div>';
    return;
  }
  boardsList.innerHTML = '<div class="empty-state">Loading images...</div>';
  try {
    const files = await ipcRenderer.invoke('read-images-folder', LOCAL_IMAGE_FOLDER);
    allLocalImages = files || [];
    renderLocalImages(allLocalImages);
  } catch (error) {
    boardsList.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
  }
}

function filterLocalImages() {
  const keyword = (pinterestSearchInput?.value || '').toLowerCase().trim();
  const filtered = keyword
    ? allLocalImages.filter(f => f.name.toLowerCase().includes(keyword))
    : allLocalImages;
  renderLocalImages(filtered);
}

function renderLocalImages(files) {
  if (!boardsList) return;
  if (!files || files.length === 0) {
    boardsList.innerHTML = '<div class="empty-state">No images found in folder</div>';
    return;
  }
  boardsList.innerHTML = '';
  files.forEach(file => {
    const item = document.createElement('div');
    item.className = 'pin-item';
    item.style.cssText = 'cursor:pointer; padding:4px; border-radius:6px; overflow:hidden; position:relative;';
    const img = document.createElement('img');
    img.src = 'file://' + file.path;
    img.alt = file.name;
    img.style.cssText = 'width:100%; height:80px; object-fit:cover; border-radius:4px; display:block;';
    img.onerror = () => { item.style.display = 'none'; };
    item.appendChild(img);
    // Click to set as preview
    item.addEventListener('click', () => selectLocalImage(file));
    // Drag to image drop zone
    item.addEventListener('dragstart', (e) => {
      e.preventDefault();
      if (isElectron) ipcRenderer.send('drag-files-start', [file.path]);
    });
    item.draggable = true;
    boardsList.appendChild(item);
  });
}

function selectLocalImage(file) {
  autovidState.selectedImage = { imageUrl: 'file://' + file.path, title: file.name };
  autovidState.selectedImagePath = file.path;
  if (previewImage && imagePlaceholder) {
    previewImage.src = 'file://' + file.path;
    previewImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';
  }
  if (imageInfo) {
    imageInfo.style.display = 'block';
    if (imageTitle) imageTitle.textContent = file.name;
    if (imageSource) { imageSource.href = '#'; imageSource.textContent = file.path; }
  }
  updateRenderButton();
}

function randomizePin() {
  if (allLocalImages.length === 0) {
    alert('No images loaded. Click the refresh button first.');
    return;
  }
  const randomIndex = Math.floor(Math.random() * allLocalImages.length);
  selectLocalImage(allLocalImages[randomIndex]);
}

function selectPin(pin) {
  autovidState.selectedImage = pin;

  if (previewImage && imagePlaceholder) {
    previewImage.src = pin.imageUrl;
    previewImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';
  }

  if (imageInfo) {
    imageInfo.style.display = 'block';
    imageTitle.textContent = pin.title || 'Untitled';
    imageSource.href = pin.link || '#';
    imageSource.textContent = pin.link ? 'View on Pinterest' : '-';
  }

  updateRenderButton();
}

async function selectAutovidAudio() {
  if (!isElectron) return;

  try {
    const filePath = await ipcRenderer.invoke('select-audio-file');
    if (filePath) {
      autovidState.selectedAudioPath = filePath;
      const displayName = filePath.split('\\').pop();
      if (audioFilePath) audioFilePath.value = displayName;

      // Update drop zone UI
      const audioDropHint = document.getElementById('audio-drop-hint');
      const audioSelectedInfo = document.getElementById('audio-selected-info');
      const audioFileNameEl = document.getElementById('audio-file-name');
      if (audioDropHint) audioDropHint.style.display = 'none';
      if (audioSelectedInfo) audioSelectedInfo.style.display = 'flex';
      if (audioFileNameEl) audioFileNameEl.textContent = displayName;

      // Set audio preview
      if (audioPreviewContainer) audioPreviewContainer.style.display = 'block';
      if (autovidAudioPlayer) autovidAudioPlayer.src = `file://${filePath}`;

      // Auto-fill output name - extract clean beat name
      const baseName = displayName.replace(/\.[^/.]+$/, '');
      const cleanName = extractBeatName(baseName);
      if (outputNameInput) outputNameInput.value = cleanName;

      updateRenderButton();
    }
  } catch (error) {
    console.error('Error selecting audio:', error);
  }
}

function updateRenderButton() {
  if (renderVideoBtn) {
    const canRender = autovidState.selectedAudioPath &&
                      (autovidState.selectedImage || autovidState.selectedImagePath);
    renderVideoBtn.disabled = !canRender || autovidState.isRendering;
  }
}

//  Left-panel tab switching
function switchAutovidLeftTab(tab) {
  autovidState.currentLeftTab = tab;
  const imagesSearch = document.getElementById('autovid-images-search');
  const imagesList   = document.getElementById('boards-list');
  const beatsSearch  = document.getElementById('autovid-beats-search');
  const beatsList    = document.getElementById('autovid-beats-list');

  const isImages = tab === 'images';
  if (imagesSearch) imagesSearch.style.display = isImages ? '' : 'none';
  if (imagesList)   imagesList.style.display   = isImages ? '' : 'none';
  if (beatsSearch)  beatsSearch.style.display  = isImages ? 'none' : '';
  if (beatsList)    beatsList.style.display    = isImages ? 'none' : '';

  document.querySelectorAll('.autovid-left-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.avtab === tab);
  });

  if (tab === 'beats' && autovidState.allBeats.length === 0) {
    loadAutovidBeats();
  }
}

//  Load beats from the same folder as the main Beats tab
async function loadAutovidBeats() {
  if (!isElectron) return;
  const beatsList = document.getElementById('autovid-beats-list');
  if (beatsList) beatsList.innerHTML = '<div class="empty-state">Loading beats...</div>';
  try {
    const folder = (folders.all && folders.all.path) ? folders.all.path : 'D:\\Beats';
    const beats = await ipcRenderer.invoke('read-beats-folder', folder);
    autovidState.allBeats = beats || [];
    renderAutovidBeats(autovidState.allBeats);
  } catch (err) {
    const beatsList = document.getElementById('autovid-beats-list');
    if (beatsList) beatsList.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
  }
}

function filterAutovidBeats() {
  const q = (document.getElementById('autovid-beats-filter')?.value || '').toLowerCase();
  const filtered = q
    ? autovidState.allBeats.filter(b => b.name.toLowerCase().includes(q))
    : autovidState.allBeats;
  renderAutovidBeats(filtered);
}

function renderAutovidBeats(beats) {
  const listEl = document.getElementById('autovid-beats-list');
  if (!listEl) return;
  if (!beats || beats.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No beats found</div>';
    return;
  }
  // Sort same way as main beats tab
  const sorted = sortBeatsByNumber ? sortBeatsByNumber(beats) : beats;
  listEl.innerHTML = '';
  sorted.forEach(beat => {
    const item = document.createElement('div');
    item.className = 'autovid-beat-item';
    if (autovidState.selectedBeatPath === beat.path) item.classList.add('selected');
    item.innerHTML = `
      <svg class="autovid-beat-item-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      <span class="autovid-beat-item-name">${beat.name.replace(/\.[^/.]+$/, '')}</span>
    `;
    item.addEventListener('click', () => setAutovidAudioFromBeat(beat));
    listEl.appendChild(item);
  });
}

function setAutovidAudioFromBeat(beat) {
  autovidState.selectedAudioPath = beat.path;
  autovidState.selectedBeatPath  = beat.path;

  const displayName  = beat.name;
  const audioDropHint    = document.getElementById('audio-drop-hint');
  const audioSelectedInfo = document.getElementById('audio-selected-info');
  const audioFileNameEl  = document.getElementById('audio-file-name');
  const audioFilePathEl  = document.getElementById('audio-file-path');

  if (audioDropHint)     audioDropHint.style.display     = 'none';
  if (audioSelectedInfo) audioSelectedInfo.style.display = 'flex';
  if (audioFileNameEl)   audioFileNameEl.textContent     = displayName;
  if (audioFilePathEl)   audioFilePathEl.value           = displayName;

  if (audioPreviewContainer) audioPreviewContainer.style.display = 'block';
  if (autovidAudioPlayer) {
    autovidAudioPlayer.src = `file://${beat.path}`;
    autovidAudioPlayer.load();
    autovidAudioPlayer.play().catch(() => {});
  }

  const baseName  = displayName.replace(/\.[^/.]+$/, '');
  const cleanName = typeof extractBeatName === 'function' ? extractBeatName(baseName) : baseName;
  if (outputNameInput) outputNameInput.value = cleanName;

  // Highlight selected item
  document.querySelectorAll('.autovid-beat-item').forEach(el => el.classList.remove('selected'));
  event?.currentTarget?.classList.add('selected');

  updateRenderButton();
}

//  Custom Audio Player
function initCustomAudioPlayer() {
  const audio    = document.getElementById('autovid-audio-player');
  const playBtn  = document.getElementById('ap-play-btn');
  const playIcon = document.getElementById('ap-play-icon');
  const pauseIcon= document.getElementById('ap-pause-icon');
  const currentEl= document.getElementById('ap-current');
  const durationEl= document.getElementById('ap-duration');
  const fillEl   = document.getElementById('ap-progress-fill');
  const thumbEl  = document.getElementById('ap-progress-thumb');
  const progressWrap = document.getElementById('ap-progress-wrap');
  const volBtn   = document.getElementById('ap-vol-btn');
  const volIcon  = document.getElementById('ap-vol-icon');
  const muteIcon = document.getElementById('ap-mute-icon');
  if (!audio || !playBtn) return;

  function fmtTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, '0');
    return `${m}:${sec}`;
  }

  function syncProgress() {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (fillEl)  fillEl.style.width = pct + '%';
    if (thumbEl) thumbEl.style.left = pct + '%';
    if (currentEl) currentEl.textContent = fmtTime(audio.currentTime);
  }

  function setPlayState(playing) {
    if (playIcon)  playIcon.style.display  = playing ? 'none' : '';
    if (pauseIcon) pauseIcon.style.display = playing ? ''     : 'none';
  }

  audio.addEventListener('play',  () => setPlayState(true));
  audio.addEventListener('pause', () => setPlayState(false));
  audio.addEventListener('ended', () => { setPlayState(false); syncProgress(); });
  audio.addEventListener('timeupdate', syncProgress);
  audio.addEventListener('loadedmetadata', () => {
    if (durationEl) durationEl.textContent = fmtTime(audio.duration);
    if (currentEl)  currentEl.textContent  = '0:00';
    if (fillEl)  fillEl.style.width = '0%';
    if (thumbEl) thumbEl.style.left = '0%';
  });

  playBtn.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  if (progressWrap) {
    progressWrap.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = progressWrap.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
    });
  }

  if (volBtn) {
    volBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      if (volIcon)  volIcon.style.display  = audio.muted ? 'none' : '';
      if (muteIcon) muteIcon.style.display = audio.muted ? ''     : 'none';
    });
  }
}

//  Show draggable rendered video card
function showRenderedVideoCard(outputPath) {
  const card   = document.getElementById('rendered-video-card');
  const item   = document.getElementById('rendered-video-item');
  const nameEl = document.getElementById('rendered-video-name');
  if (!card || !item || !nameEl) return;
  const fileName = outputPath.split('\\').pop();
  item.dataset.outputPath = outputPath;
  nameEl.textContent = fileName;
  card.style.display = 'block';
  item.ondragstart = (e) => {
    const currentOutputPath = item.dataset.outputPath || outputPath;
    const debugInfo = `ondragstart fired | path=${currentOutputPath} | nodeFs=${!!nodeFs}`;
    console.log('[rendered-video drag]', debugInfo);
    if (isElectron) ipcRenderer.send('renderer-debug', debugInfo);

    if (!currentOutputPath) {
      e.preventDefault();
      showNotification('No rendered video path found', 'error');
      if (isElectron) ipcRenderer.send('renderer-debug', 'BLOCKED: no path');
      return;
    }

    // Normalise slashes for existsSync on Windows
    const normPath = currentOutputPath.replace(/\//g, '\\');
    const fileExists = nodeFs ? (nodeFs.existsSync(normPath) || nodeFs.existsSync(currentOutputPath)) : true;
    if (isElectron) ipcRenderer.send('renderer-debug', `existsSync(${normPath}) = ${fileExists}`);

    if (nodeFs && !fileExists) {
      e.preventDefault();
      showNotification('Rendered video file was not found on disk: ' + normPath, 'error');
      console.warn('[rendered-video drag] file not found:', normPath);
      return;
    }

    e.preventDefault();
    if (isElectron) {
      console.log('[rendered-video drag] sending drag-files-start for', normPath);
      ipcRenderer.send('renderer-debug', 'Sending drag-files-start for ' + normPath);
      ipcRenderer.send('drag-files-start', [normPath]);
    }
  };
}

function getCurrentRenderedVideoPath() {
  const cardItem = document.getElementById('rendered-video-item');
  const outputPath = cardItem?.dataset.outputPath || autovidState.lastOutputPath;

  if (!outputPath) return null;
  if (!nodeFs?.existsSync(outputPath)) return null;

  return outputPath;
}

async function markRenderedVideoAsPosted(outputPath) {
  const videoName = outputPath?.split(/[\\/]/).pop();
  if (!videoName || typeof markVideoAsPosted !== 'function') return;

  await markVideoAsPosted(outputPath, videoName);

  if (typeof videosState !== 'undefined' && videosState.initialized && typeof loadVideos === 'function') {
    await loadVideos();
  }
}

async function revealRenderedVideo() {
  const filePath = getCurrentRenderedVideoPath();
  if (!filePath) {
    showNotification('No rendered video found', 'error');
    return;
  }
  if (isElectron) {
    try {
      await ipcRenderer.invoke('reveal-in-explorer', filePath);
    } catch (e) {
      showNotification('Could not open folder: ' + e.message, 'error');
    }
  }
}

async function createDesktopShortcut() {
  if (!isElectron) return;
  try {
    const result = await ipcRenderer.invoke('create-shortcut');
    if (result.success) {
      showNotification('Shortcut created on Desktop  right-click taskbar icon to pin it!', 'success');
    } else {
      showNotification('Could not create shortcut: ' + result.error, 'error');
    }
  } catch (e) {
    showNotification('Shortcut error: ' + e.message, 'error');
  }
}

// Listen for render progress updates from main process
if (isElectron) {
  ipcRenderer.on('render-progress', (event, progress) => {
    if (renderProgressFill && renderProgressText) {
      renderProgressFill.style.width = `${progress}%`;
      renderProgressText.textContent = `${progress}%`;
    }
  });
}

async function renderVideo() {
  if (!isElectron) return;

  if (autovidState.isRendering) return;

  // Validate inputs
  if (!autovidState.selectedAudioPath) {
    alert('Please select an audio file first');
    return;
  }

  let imagePath = autovidState.selectedImagePath;

  // If we have a selected image from Pinterest, download it first
  if (!imagePath && autovidState.selectedImage?.imageUrl) {
    try {
      const tempDir = await ipcRenderer.invoke('get-video-output-dir');
      const tempImagePath = `${tempDir}\\temp_image_${Date.now()}.jpg`;
      const downloadResult = await ipcRenderer.invoke('download-image', autovidState.selectedImage.imageUrl, tempImagePath);
      if (downloadResult.success) {
        imagePath = downloadResult.path;
      } else {
        alert('Failed to download image');
        return;
      }
    } catch (error) {
      alert(`Error downloading image: ${error.message}`);
      return;
    }
  }

  if (!imagePath) {
    alert('Please select an image first');
    return;
  }

  autovidState.isRendering = true;
  renderVideoBtn.disabled = true;
  renderProgress.style.display = 'block';
  renderOutput.style.display = 'none';
  // Hide stale video card from previous render
  const staleCard = document.getElementById('rendered-video-card');
  if (staleCard) staleCard.style.display = 'none';
  renderProgressFill.style.width = '0%';
  renderProgressText.textContent = '0%';

  try {
    const outputName = outputNameInput?.value || `video_${Date.now()}`;
    const resolution = videoResolution?.value || '1080';

    const result = await ipcRenderer.invoke('render-video', {
      imagePath,
      audioPath: autovidState.selectedAudioPath,
      outputName,
      resolution
    });

    if (result.success) {
      autovidState.lastOutputPath = result.outputPath;
      renderOutput.style.display = 'block';
      showRenderedVideoCard(result.outputPath);
      await markRenderedVideoAsPosted(result.outputPath);
    } else {
      alert(`Render error: ${result.error}`);
    }
  } catch (error) {
    alert(`Render error: ${error.message}`);
  } finally {
    autovidState.isRendering = false;
    updateRenderButton();
  }
}

async function openAutovidOutput() {
  if (!isElectron) return;

  try {
    const outputDir = await ipcRenderer.invoke('get-video-output-dir');
    await ipcRenderer.invoke('open-folder', outputDir);
  } catch (error) {
    console.error('Error opening output folder:', error);
  }
}
