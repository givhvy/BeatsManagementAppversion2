// ============================
// YOUTUBE SECTION
// ============================

let youtubeState = {
  channels: [],
  selectedChannel: null,
  queue: [],
  history: [],
  serverOnline: false,
  uploadedBeats: new Set(), // Track uploaded beats by audio file name
  uploadedBeatsInfo: new Map() // Map beat name -> { scheduleDate, videoId, channelName }
};

// Show notification toast
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.innerHTML = `
    <span class="notification-icon">${type === 'success'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : type === 'error'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    }</span>
    <span class="notification-message">${message}</span>
  `;
  document.body.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Show modal dialog
function showModal(content) {
  // Remove existing modal
  closeModal();

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  const modal = document.createElement('div');
  modal.className = 'modal-dialog';
  modal.innerHTML = content;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Add animation
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
}

// Close modal dialog
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 200);
  }
}

// YouTube DOM Elements
const youtubeStatusEl = document.getElementById('youtube-status');
const serverLastCheckEl = document.getElementById('server-last-check');
let lastServerCheckTime = null;
const youtubeChannelList = document.getElementById('youtube-channel-list');
const refreshChannelsBtn = document.getElementById('refresh-channels-btn');
const scanChannelsBtn = document.getElementById('scan-channels-btn');
const startServerBtn = document.getElementById('start-server-btn');
const serverStatusDot = document.getElementById('server-status-dot');
const serverStatusText = document.getElementById('server-status-text');
const videoDropzone = document.getElementById('video-dropzone');
const videoFileInput = document.getElementById('video-file-input');
const uploadQueueList = document.getElementById('upload-queue-list');
const queueCountBadge = document.getElementById('queue-count-badge');
const uploadHistoryList = document.getElementById('upload-history-list');
const uploadsTodayEl = document.getElementById('uploads-today');
const uploadsTotalEl = document.getElementById('uploads-total');
const uploadsFailedEl = document.getElementById('uploads-failed');
const publishTimeInput = document.getElementById('publish-time');
const defaultPrivacySelect = document.getElementById('default-privacy');
const autoUploadCheckbox = document.getElementById('auto-upload');
const reauthenticateBtn = document.getElementById('reauthenticate-btn');

// Video edit modal elements
const videoEditModal = document.getElementById('video-edit-modal');
const closeVideoEditModalBtn = document.getElementById('close-video-edit-modal-btn');
const videoTitleInput = document.getElementById('video-title-input');
const videoDescriptionInput = document.getElementById('video-description-input');
const videoTagsInput = document.getElementById('video-tags-input');
const videoPrivacySelect = document.getElementById('video-privacy-select');
const saveVideoMetadataBtn = document.getElementById('save-video-metadata-btn');
const cancelVideoEditBtn = document.getElementById('cancel-video-edit-btn');

// Add Channel modal elements
const addChannelBtn = document.getElementById('add-channel-btn');
const addChannelModal = document.getElementById('add-channel-modal');
const closeAddChannelModalBtn = document.getElementById('close-add-channel-modal-btn');
const newChannelId = document.getElementById('new-channel-id');
const credentialsDropzone = document.getElementById('credentials-dropzone');
const credentialsFileInput = document.getElementById('credentials-file-input');
const credentialsFileName = document.getElementById('credentials-file-name');
const createChannelBtn = document.getElementById('create-channel-btn');
const cancelAddChannelBtn = document.getElementById('cancel-add-channel-btn');

// Global settings elements
const activeTemplateSelect = document.getElementById('active-template');
const editTemplatesBtn = document.getElementById('edit-templates-btn');
const applyTemplateAllBtn = document.getElementById('apply-template-all-btn');
const autoScheduleCheckbox = document.getElementById('auto-schedule');
const daysBetweenUploadsInput = document.getElementById('days-between-uploads');

// Edit Templates modal elements
const editTemplatesModal = document.getElementById('edit-templates-modal');
const closeEditTemplatesModalBtn = document.getElementById('close-edit-templates-modal-btn');
const editTemplateSelect = document.getElementById('edit-template-select');
const templateNameInput = document.getElementById('template-name-input');
const templateTitleInput = document.getElementById('template-title-input');
const templateDescriptionInput = document.getElementById('template-description-input');
const templateTagsInput = document.getElementById('template-tags-input');
const saveTemplateBtn = document.getElementById('save-template-btn');
const cancelEditTemplatesBtn = document.getElementById('cancel-edit-templates-btn');

let youtubeInitialized = false;
let editingVideoId = null;
let selectedCredentialsContent = null;
let globalSettings = null;

function initYouTubeSection() {
  if (youtubeInitialized) return;
  youtubeInitialized = true;

  // Event listeners
  if (refreshChannelsBtn) {
    refreshChannelsBtn.addEventListener('click', refreshYouTubeChannels);
  }

  if (scanChannelsBtn) {
    scanChannelsBtn.addEventListener('click', scanYouTubeChannels);
  }

  // Start Server button
  if (startServerBtn) {
    startServerBtn.addEventListener('click', toggleAutomationServer);
  }

  // Re-authenticate button
  if (reauthenticateBtn) {
    reauthenticateBtn.addEventListener('click', reauthenticateYouTube);
  }

  // Add Channel button and modal
  if (addChannelBtn) {
    addChannelBtn.addEventListener('click', openAddChannelModal);
  }
  if (closeAddChannelModalBtn) {
    closeAddChannelModalBtn.addEventListener('click', closeAddChannelModal);
  }
  if (cancelAddChannelBtn) {
    cancelAddChannelBtn.addEventListener('click', closeAddChannelModal);
  }
  if (createChannelBtn) {
    createChannelBtn.addEventListener('click', createNewChannel);
  }

  // Credentials dropzone - drag and drop
  if (credentialsDropzone && credentialsFileInput) {
    credentialsDropzone.addEventListener('click', () => credentialsFileInput.click());
    credentialsFileInput.addEventListener('change', handleCredentialsFile);

    credentialsDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      credentialsDropzone.style.borderColor = '#9147ff';
      credentialsDropzone.style.background = 'rgba(145, 71, 255, 0.1)';
    });

    credentialsDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      credentialsDropzone.style.borderColor = '#555';
      credentialsDropzone.style.background = 'transparent';
    });

    credentialsDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      credentialsDropzone.style.borderColor = '#555';
      credentialsDropzone.style.background = 'transparent';

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.json')) {
          handleDroppedCredentialsFile(file);
        } else {
          showNotification('Please drop a .json file', 'error');
        }
      }
    });
  }

  // Global Settings event listeners
  if (editTemplatesBtn) {
    editTemplatesBtn.addEventListener('click', openEditTemplatesModal);
  }
  if (closeEditTemplatesModalBtn) {
    closeEditTemplatesModalBtn.addEventListener('click', closeEditTemplatesModal);
  }
  if (cancelEditTemplatesBtn) {
    cancelEditTemplatesBtn.addEventListener('click', closeEditTemplatesModal);
  }
  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', saveTemplate);
  }
  if (editTemplateSelect) {
    editTemplateSelect.addEventListener('change', loadTemplateForEditing);
  }
  if (applyTemplateAllBtn) {
    applyTemplateAllBtn.addEventListener('click', applyTemplateToAllChannels);
  }
  if (activeTemplateSelect) {
    activeTemplateSelect.addEventListener('change', saveGlobalSettings);
  }
  if (autoScheduleCheckbox) {
    autoScheduleCheckbox.addEventListener('change', saveGlobalSettings);
  }
  if (daysBetweenUploadsInput) {
    daysBetweenUploadsInput.addEventListener('change', saveGlobalSettings);
  }

  // Load global settings on init
  loadGlobalSettings();

  // Video dropzone
  if (videoDropzone && videoFileInput) {
    videoDropzone.addEventListener('click', () => videoFileInput.click());

    videoDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      videoDropzone.classList.add('dragover');
    });

    videoDropzone.addEventListener('dragleave', () => {
      videoDropzone.classList.remove('dragover');
    });

    videoDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      videoDropzone.classList.remove('dragover');
      handleVideoFiles(e.dataTransfer.files);
    });

    videoFileInput.addEventListener('change', (e) => {
      handleVideoFiles(e.target.files);
    });
  }

  // Video edit modal
  if (closeVideoEditModalBtn) {
    closeVideoEditModalBtn.addEventListener('click', closeVideoEditModal);
  }

  if (cancelVideoEditBtn) {
    cancelVideoEditBtn.addEventListener('click', closeVideoEditModal);
  }

  if (saveVideoMetadataBtn) {
    saveVideoMetadataBtn.addEventListener('click', saveVideoMetadata);
  }

  // Initial load - load history from local file immediately, then try server
  setTimeout(async () => {
    // First, load from local file (instant, works offline)
    if (isElectron) {
      await loadHistoryFromLocalFile();
    }

    // Then try server for latest data
    const serverReady = await checkYouTubeServerWithRetry();
    if (serverReady) {
      // Load upload history to track uploaded beats (will merge with local)
      await loadAllChannelsHistory();
    }
  }, 500);
}

/**
 * Load history from local file when server is offline
 */
async function loadHistoryFromLocalFile() {
  try {
    const result = await ipcRenderer.invoke('load-upload-history');
    if (result.success && result.history) {
      // Process history from all channels
      Object.values(result.history).forEach(channelHistory => {
        if (Array.isArray(channelHistory)) {
          channelHistory.forEach(item => {
            if (!youtubeState.history.find(h => h.id === item.id)) {
              youtubeState.history.push(item);
            }
          });
        }
      });

      // Update uploaded beats set
      updateUploadedBeatsFromHistory();

      // Refresh beats list to show uploaded badges
      if (typeof renderBeats === 'function') {
        renderBeats();
      }

      console.log(`Loaded ${youtubeState.uploadedBeats.size} uploaded beats from local file`);
    }
  } catch (error) {
    console.error('Error loading history from local file:', error);
  }
}

/**
 * Load history from all channels to build uploaded beats set
 */
async function loadAllChannelsHistory() {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/channels`);
    if (!response.ok) return;

    const data = await response.json();
    const channels = data.channels || [];

    // Load history from each channel
    for (const channel of channels) {
      try {
        const statusResponse = await fetch(`${AUTOMATION_SERVER_URL}/api/status/${channel.channelId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.history) {
            // Add to global history
            statusData.history.forEach(item => {
              // Avoid duplicates
              if (!youtubeState.history.find(h => h.id === item.id)) {
                youtubeState.history.push(item);
              }
            });
          }
        }
      } catch (e) {
        console.log(`Failed to load history for ${channel.name}:`, e.message);
      }
    }

    // Update uploaded beats set
    updateUploadedBeatsFromHistory();

    // Refresh beats list to show uploaded badges
    if (typeof renderBeats === 'function') {
      renderBeats();
    }

    console.log(`Loaded history from ${channels.length} channels, ${youtubeState.uploadedBeats.size} uploaded beats tracked`);
  } catch (error) {
    console.error('Error loading all channels history:', error);
  }
}

// Automation server port
const AUTOMATION_SERVER_PORT = 9000;
const AUTOMATION_SERVER_URL = `http://localhost:${AUTOMATION_SERVER_PORT}`;

// Check server with retry logic
async function checkYouTubeServerWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    const isOnline = await checkYouTubeServer();
    if (isOnline) {
      scanYouTubeChannels();
      return true;
    }
    if (i < retries - 1) {
      console.log(`Server not ready, retrying in ${delay/1000}s... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  console.log('Server offline after retries');
  return false;
}

async function checkYouTubeServer() {
  try {
    // Try to connect to automation server directly
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/channels`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    youtubeState.serverOnline = response.ok;

    // Update last check time
    lastServerCheckTime = new Date();
    updateLastCheckTimeUI();

    // Update main status (hidden)
    if (youtubeStatusEl) {
      if (response.ok) {
        youtubeStatusEl.textContent = 'YouTube: Online';
        youtubeStatusEl.classList.remove('offline');
        youtubeStatusEl.classList.add('online');
      } else {
        youtubeStatusEl.textContent = 'YouTube: Offline';
        youtubeStatusEl.classList.remove('online');
        youtubeStatusEl.classList.add('offline');
      }
    }

    // Update settings modal status
    const youtubeStatusSettings = document.getElementById('youtube-status-settings');
    if (youtubeStatusSettings) {
      if (response.ok) {
        youtubeStatusSettings.textContent = 'Online';
        youtubeStatusSettings.classList.remove('offline');
        youtubeStatusSettings.classList.add('online');
      } else {
        youtubeStatusSettings.textContent = 'Offline';
        youtubeStatusSettings.classList.remove('online');
        youtubeStatusSettings.classList.add('offline');
      }
    }

    // Update server status box
    updateServerStatusUI(response.ok);

    return response.ok;
  } catch (error) {
    youtubeState.serverOnline = false;
    lastServerCheckTime = new Date();
    updateLastCheckTimeUI();

    // Update main status (hidden)
    if (youtubeStatusEl) {
      youtubeStatusEl.textContent = 'YouTube: Offline';
      youtubeStatusEl.classList.remove('online');
      youtubeStatusEl.classList.add('offline');
    }

    // Update settings modal status
    const youtubeStatusSettings = document.getElementById('youtube-status-settings');
    if (youtubeStatusSettings) {
      youtubeStatusSettings.textContent = 'Offline';
      youtubeStatusSettings.classList.remove('online');
      youtubeStatusSettings.classList.add('offline');
    }

    updateServerStatusUI(false);
    return false;
  }
}

// Update the last check time UI
function updateLastCheckTimeUI() {
  if (serverLastCheckEl && lastServerCheckTime) {
    const timeStr = lastServerCheckTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    serverLastCheckEl.textContent = `(Updated: ${timeStr})`;
  }
}

function updateServerStatusUI(isOnline) {
  if (serverStatusDot) {
    serverStatusDot.className = 'status-dot ' + (isOnline ? 'online' : 'offline');
  }
  if (serverStatusText) {
    serverStatusText.textContent = isOnline ? 'Server online' : 'Server offline';
  }
  if (startServerBtn) {
    startServerBtn.textContent = isOnline ? 'Stop Server' : 'Start Server';
    startServerBtn.classList.toggle('stop', isOnline);
  }
}

async function toggleAutomationServer() {
  if (startServerBtn) {
    startServerBtn.disabled = true;
    startServerBtn.textContent = 'Working...';
  }

  try {
    if (youtubeState.serverOnline) {
      const result = await ipcRenderer.invoke('stop-automation-server');
      if (result.success) {
        showNotification('Automation Server stopped', 'success');
        youtubeState.serverOnline = false;
        updateServerStatusUI(false);
        if (youtubeChannelList) {
          youtubeChannelList.innerHTML = '<div class="empty-state">Server offline. Click "Start Server" to start.</div>';
        }
      } else {
        showNotification('Error stopping server: ' + result.error, 'error');
      }
    } else {
      showNotification('Starting server...', 'info');
      const result = await ipcRenderer.invoke('start-automation-server');
      if (result.success) {
        const serverReady = await checkYouTubeServerWithRetry(10, 1000);
        if (serverReady) {
          showNotification('Automation Server is ready', 'success');
        } else {
          showNotification('Server started but is not ready yet', 'error');
        }
      } else {
        showNotification('Error starting server: ' + result.error, 'error');
      }
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  } finally {
    if (startServerBtn) {
      startServerBtn.disabled = false;
      updateServerStatusUI(youtubeState.serverOnline);
    }
  }
}
/**
 * Re-authenticate YouTube token for selected channel
 */
async function reauthenticateYouTube() {
  if (!youtubeState.selectedChannel) {
    showNotification('Select a channel first', 'error');
    return;
  }

  if (!isElectron) {
    showNotification('This feature is only available in Electron', 'error');
    return;
  }

  try {
    showNotification('Opening browser for authentication...', 'info');

    // Use configPath (account/channelId) for re-auth
    const channelPath = youtubeState.selectedChannel.configPath || youtubeState.selectedChannel.id;
    const result = await ipcRenderer.invoke('reauthenticate-youtube', channelPath);

    if (result.success && result.needsCode) {
      // Show dialog to input auth code
      showAuthCodeDialog(result.channelId, result.authUrl);
    } else if (result.success) {
      showNotification('Authentication successful. Token refreshed.', 'success');
      await refreshYouTubeChannels();
    } else {
      showNotification('Authentication error: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

/**
 * Open Add Channel modal
 */
function openAddChannelModal() {
  if (!isElectron) {
    showNotification('This feature is only available in Electron', 'error');
    return;
  }

  // Reset form
  if (newChannelId) newChannelId.value = '';
  if (credentialsFileName) {
    credentialsFileName.textContent = 'Drop credentials.json here';
    credentialsFileName.style.color = '#888';
  }
  if (credentialsDropzone) {
    credentialsDropzone.style.borderColor = '#555';
    credentialsDropzone.style.background = 'transparent';
  }
  if (credentialsFileInput) credentialsFileInput.value = '';
  selectedCredentialsContent = null;

  if (addChannelModal) {
    addChannelModal.style.display = 'flex';
  }
}

/**
 * Close Add Channel modal and reset form
 */
function closeAddChannelModal() {
  if (addChannelModal) {
    addChannelModal.style.display = 'none';
  }
  // Reset form
  if (newChannelId) newChannelId.value = '';
  if (credentialsFileName) {
    credentialsFileName.textContent = 'Drop credentials.json here';
    credentialsFileName.style.color = '#888';
  }
  if (credentialsDropzone) {
    credentialsDropzone.style.borderColor = '#555';
    credentialsDropzone.style.background = 'transparent';
  }
  if (credentialsFileInput) credentialsFileInput.value = '';
  selectedCredentialsContent = null;
}

/**
 * Handle credentials file selection
 */
function handleCredentialsFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  handleDroppedCredentialsFile(file);
}

/**
 * Handle dropped credentials file (drag-drop or file input)
 */
function handleDroppedCredentialsFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const content = JSON.parse(event.target.result);
      selectedCredentialsContent = content;
      credentialsFileName.textContent = file.name;
      credentialsFileName.style.color = '#4CAF50';
      if (credentialsDropzone) {
        credentialsDropzone.style.borderColor = '#4CAF50';
      }
    } catch (err) {
      showNotification('Invalid JSON file', 'error');
      credentialsFileName.textContent = 'Invalid file';
      credentialsFileName.style.color = '#f44336';
      selectedCredentialsContent = null;
    }
  };
  reader.readAsText(file);
}

/**
 * Create new channel - simplified version
 * Only requires Channel ID (e.g., C20) and credentials.json
 * Creates folder structure: config/C20/C20/
 */
async function createNewChannel() {
  const channelId = newChannelId?.value?.trim();

  if (!channelId) {
    showNotification('Please enter Channel ID (e.g., C20)', 'error');
    return;
  }

  if (!selectedCredentialsContent) {
    showNotification('Please drop credentials.json file', 'error');
    return;
  }

  try {
    showNotification('Creating channel...', 'info');

    // Use channelId for both account folder and channel folder
    // e.g., C20 -> config/C20/C20/
    const result = await ipcRenderer.invoke('create-youtube-channel', {
      accountName: channelId,  // Folder name = channelId
      channelId: channelId,   // Subfolder name = channelId
      channelName: channelId, // Display name = channelId
      channelStyle: '',       // Empty, will use template
      credentials: selectedCredentialsContent
    });

    if (result.success) {
      showNotification(`Channel "${channelId}" created successfully!`, 'success');
      closeAddChannelModal();

      // Refresh channels list
      await scanYouTubeChannels();

      // Auto-authenticate the new channel (confirm() blocked by Electron)
      showNotification(`Channel "${channelId}" created! Authenticating...`, 'success');
      const newChannelFullId = `${channelId}/${channelId}`;
      youtubeState.selectedChannel = { id: newChannelFullId, name: channelId };
      await reauthenticateYouTube();
    } else {
      showNotification('Error: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

// ============================
// VIDEO FOLDER VIEWER SECTION
// ============================

const VIDEO_OUTPUT_PATH = 'F:\\PlaygroundTest\\BeatsManagementVersion2\\output';

let videosState = {
  videos: [],
  initialized: false
};

function initVideosSection() {
  if (videosState.initialized) return;
  videosState.initialized = true;

  const refreshVideosBtn = document.getElementById('refresh-videos-btn');
  const openVideosFolderBtn = document.getElementById('open-videos-folder-btn');

  if (refreshVideosBtn) {
    refreshVideosBtn.addEventListener('click', loadVideos);
  }

  if (openVideosFolderBtn) {
    openVideosFolderBtn.addEventListener('click', openVideosFolder);
  }

  // Load consistency data first, then load videos
  loadConsistencyData().then(() => {
    loadVideos();
  });
}

async function loadVideos() {
  if (!isElectron) {
    console.log('Not running in Electron mode');
    return;
  }

  const videosGrid = document.getElementById('videos-grid');
  if (!videosGrid) {
    console.error('videos-grid element not found');
    return;
  }

  videosGrid.innerHTML = '<div class="empty-state">Loading videos...</div>';

  try {
    console.log('Loading videos from:', VIDEO_OUTPUT_PATH);
    const result = await ipcRenderer.invoke('load-videos', VIDEO_OUTPUT_PATH);
    console.log('Load videos result:', result);

    if (result.success && result.videos) {
      videosState.videos = result.videos;
      renderVideosGrid();
    } else {
      videosGrid.innerHTML = `<div class="empty-state">${result.error || 'No videos found'}</div>`;
    }
  } catch (error) {
    console.error('Error loading videos:', error);
    videosGrid.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
  }
}

function renderVideosGrid() {
  const videosGrid = document.getElementById('videos-grid');
  if (!videosGrid) return;

  if (videosState.videos.length === 0) {
    videosGrid.innerHTML = '<div class="empty-state">No videos found in output folder</div>';
    return;
  }

  videosGrid.innerHTML = videosState.videos.map(video => {
    // Check if video is marked as posted
    const postedInfo = getVideoPostedInfo(video.name);
    const isPosted = postedInfo !== null;

    const safePath = video.path.replace(/\\/g, '\\\\');
    return `
    <div class="video-card ${isPosted ? 'video-posted' : ''}" draggable="true" data-path="${video.path}" ondragstart="handleVideoCardDragStart(event, '${safePath}')" title="Drag to upload to YouTube">
      ${isPosted ? `
        <div class="video-posted-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Posted ${postedInfo.date}
        </div>
      ` : ''}
      <div class="video-thumbnail" data-video-path="${video.path}" onclick="playVideo('${video.path.replace(/\\/g, '\\\\')}')">
        <div class="video-thumbnail-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </div>
        <img class="video-thumbnail-img" style="display: none;" />
        <div class="video-play-overlay">
          <div class="video-play-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="video-info">
        <div class="video-name" title="${video.name}">${video.name}</div>
        <div class="video-meta">
          <div class="video-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${video.date}
          </div>
          <div class="video-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            ${video.size}
          </div>
        </div>
      </div>
      <div class="video-actions">
        <button class="video-action-btn" onclick="playVideo('${video.path.replace(/\\/g, '\\\\')}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Play
        </button>
        <button class="video-action-btn" onclick="revealVideo('${video.path.replace(/\\/g, '\\\\')}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Show
        </button>
        <button class="video-action-btn video-action-mark ${isPosted ? 'marked' : ''}"
                onclick="markVideoAsPosted('${video.path.replace(/\\/g, '\\\\')}', '${video.name.replace(/'/g, "\\'")}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${isPosted ? 'Posted' : 'Mark Posted'}
        </button>
      </div>
    </div>
  `;
  }).join('');

  // Load thumbnails asynchronously
  loadVideoThumbnails();
}

// Helper function to check if video is posted
function getVideoPostedInfo(videoName) {
  for (const [date, videos] of Object.entries(consistencyState.uploads)) {
    if (videos.includes(videoName)) {
      const dateObj = new Date(date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return { date: formattedDate, fullDate: date };
    }
  }
  return null;
}

async function loadVideoThumbnails() {
  if (!isElectron) return;

  const thumbnailContainers = document.querySelectorAll('.video-thumbnail[data-video-path]');

  // Process thumbnails in batches of 3 to avoid overwhelming FFmpeg
  const batchSize = 3;
  for (let i = 0; i < thumbnailContainers.length; i += batchSize) {
    const batch = Array.from(thumbnailContainers).slice(i, i + batchSize);

    await Promise.all(batch.map(async (container) => {
      const videoPath = container.getAttribute('data-video-path');
      const img = container.querySelector('.video-thumbnail-img');
      const placeholder = container.querySelector('.video-thumbnail-placeholder');

      try {
        const result = await ipcRenderer.invoke('generate-video-thumbnail', videoPath);

        if (result.success && result.thumbnailPath) {
          img.src = result.thumbnailPath;
          img.onload = () => {
            img.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
          };
        }
      } catch (error) {
        console.error('Error loading thumbnail:', error);
      }
    }));
  }
}

async function playVideo(videoPath) {
  // Open video in built-in player instead of external app
  openVideoPlayer(videoPath);
}

let customVideoPlayerInitialized = false;

function formatVideoTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function updateCustomVideoPlayerUI() {
  const modal = document.getElementById('video-player-modal');
  const videoElement = document.getElementById('video-player-element');
  const progress = document.getElementById('vp-progress');
  const currentTime = document.getElementById('vp-current-time');
  const duration = document.getElementById('vp-duration');

  if (!modal || !videoElement) return;

  const isPlaying = !videoElement.paused && !videoElement.ended;
  modal.classList.toggle('is-playing', isPlaying);
  modal.classList.toggle('is-paused', !isPlaying);

  if (currentTime) currentTime.textContent = formatVideoTime(videoElement.currentTime);
  if (duration) duration.textContent = formatVideoTime(videoElement.duration);

  if (progress) {
    const percent = videoElement.duration
      ? (videoElement.currentTime / videoElement.duration) * 1000
      : 0;
    progress.value = String(percent);
    progress.style.setProperty('--vp-progress', `${percent / 10}%`);
  }
}

function toggleCustomVideoPlayback() {
  const videoElement = document.getElementById('video-player-element');
  if (!videoElement) return;

  if (videoElement.paused || videoElement.ended) {
    videoElement.play().catch(err => {
      console.error('Error playing video:', err);
    });
  } else {
    videoElement.pause();
  }
}

function seekCustomVideo(seconds) {
  const videoElement = document.getElementById('video-player-element');
  if (!videoElement || !Number.isFinite(videoElement.duration)) return;
  videoElement.currentTime = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + seconds));
}

function initCustomVideoPlayerControls() {
  if (customVideoPlayerInitialized) return;
  customVideoPlayerInitialized = true;

  const modal = document.getElementById('video-player-modal');
  const videoElement = document.getElementById('video-player-element');
  const progress = document.getElementById('vp-progress');
  const playToggle = document.getElementById('vp-play-toggle');
  const centerPlay = document.getElementById('vp-center-play');
  const skipBack = document.getElementById('vp-skip-back');
  const skipForward = document.getElementById('vp-skip-forward');
  const volumeToggle = document.getElementById('vp-volume-toggle');
  const fullscreen = document.getElementById('vp-fullscreen');

  if (!modal || !videoElement) return;

  videoElement.addEventListener('click', toggleCustomVideoPlayback);
  videoElement.addEventListener('play', updateCustomVideoPlayerUI);
  videoElement.addEventListener('pause', updateCustomVideoPlayerUI);
  videoElement.addEventListener('ended', updateCustomVideoPlayerUI);
  videoElement.addEventListener('timeupdate', updateCustomVideoPlayerUI);
  videoElement.addEventListener('loadedmetadata', updateCustomVideoPlayerUI);
  videoElement.addEventListener('durationchange', updateCustomVideoPlayerUI);

  playToggle?.addEventListener('click', toggleCustomVideoPlayback);
  centerPlay?.addEventListener('click', toggleCustomVideoPlayback);
  skipBack?.addEventListener('click', () => seekCustomVideo(-10));
  skipForward?.addEventListener('click', () => seekCustomVideo(10));

  progress?.addEventListener('input', () => {
    if (!Number.isFinite(videoElement.duration)) return;
    videoElement.currentTime = (Number(progress.value) / 1000) * videoElement.duration;
    updateCustomVideoPlayerUI();
  });

  volumeToggle?.addEventListener('click', () => {
    videoElement.muted = !videoElement.muted;
    modal.classList.toggle('is-muted', videoElement.muted);
  });

  fullscreen?.addEventListener('click', () => {
    const container = document.querySelector('.video-player-container');
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      container.requestFullscreen?.();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (modal.style.display === 'none') return;

    if (event.key === 'Escape') {
      closeVideoPlayer();
    } else if (event.key === ' ') {
      event.preventDefault();
      toggleCustomVideoPlayback();
    } else if (event.key === 'ArrowLeft') {
      seekCustomVideo(-10);
    } else if (event.key === 'ArrowRight') {
      seekCustomVideo(10);
    }
  });
}

function openVideoPlayer(videoPath) {
  const modal = document.getElementById('video-player-modal');
  const videoElement = document.getElementById('video-player-element');
  const videoSource = document.getElementById('video-player-source');
  const videoTitle = document.getElementById('video-player-title');

  if (!modal || !videoElement || !videoSource) return;

  initCustomVideoPlayerControls();

  // Set video source
  const fileName = videoPath.split('\\').pop();
  videoTitle.textContent = fileName;
  videoSource.src = videoPath;
  videoElement.load();
  updateCustomVideoPlayerUI();

  // Show modal
  modal.style.display = 'flex';
  modal.classList.add('is-paused');

  // Play video
  videoElement.play().catch(err => {
    console.error('Error playing video:', err);
  });
}

function closeVideoPlayer() {
  const modal = document.getElementById('video-player-modal');
  const videoElement = document.getElementById('video-player-element');

  if (!modal || !videoElement) return;

  // Pause and reset video
  videoElement.pause();
  videoElement.currentTime = 0;
  updateCustomVideoPlayerUI();

  // Hide modal
  modal.style.display = 'none';
}

// Make function global
window.closeVideoPlayer = closeVideoPlayer;

async function revealVideo(videoPath) {
  if (!isElectron) return;

  try {
    await ipcRenderer.invoke('reveal-video', videoPath);
  } catch (error) {
    console.error('Error revealing video:', error);
    showNotification('Error showing video in explorer', 'error');
  }
}

async function openVideosFolder() {
  if (!isElectron) return;

  try {
    await ipcRenderer.invoke('open-videos-folder', VIDEO_OUTPUT_PATH);
  } catch (error) {
    console.error('Error opening videos folder:', error);
    showNotification('Error opening folder', 'error');
  }
}

async function handleVideoCardDragStart(e, videoPath) {
  e.preventDefault();
  if (isElectron && videoPath) {
    console.log('[video-card drag] sending drag-files-start for', videoPath);
    ipcRenderer.send('drag-files-start', [videoPath]);

    // Auto-mark as posted and sync with Consistency tab
    const videoName = videoPath.split(/[\\/]/).pop();
    if (videoName && typeof markVideoAsPosted === 'function') {
      await markVideoAsPosted(videoPath, videoName);
    }
  }
}

// Make functions global
window.playVideo = playVideo;
window.revealVideo = revealVideo;
window.handleVideoCardDragStart = handleVideoCardDragStart;

// =============================================
// GLOBAL SETTINGS FUNCTIONS
// =============================================

/**
 * Load global settings from file
 */
async function loadGlobalSettings() {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('load-global-settings');
    if (result.success && result.settings) {
      globalSettings = result.settings;

      // Update UI
      if (activeTemplateSelect && globalSettings.activeTemplate) {
        activeTemplateSelect.value = globalSettings.activeTemplate;
      }
      if (autoScheduleCheckbox && globalSettings.scheduling) {
        autoScheduleCheckbox.checked = globalSettings.scheduling.autoSchedule !== false;
      }
      if (daysBetweenUploadsInput && globalSettings.scheduling) {
        daysBetweenUploadsInput.value = globalSettings.scheduling.daysBetweenUploads || 1;
      }
      if (publishTimeInput && globalSettings.scheduling) {
        publishTimeInput.value = globalSettings.scheduling.publishTime || '12:00';
      }

      console.log('Global settings loaded:', globalSettings);
    }
  } catch (error) {
    console.error('Error loading global settings:', error);
  }
}

/**
 * Save global settings to file
 */
async function saveGlobalSettings() {
  if (!isElectron || !globalSettings) return;

  // Update settings from UI
  globalSettings.activeTemplate = activeTemplateSelect?.value || 'template1';
  globalSettings.scheduling = globalSettings.scheduling || {};
  globalSettings.scheduling.autoSchedule = autoScheduleCheckbox?.checked !== false;
  globalSettings.scheduling.daysBetweenUploads = parseInt(daysBetweenUploadsInput?.value) || 1;
  globalSettings.scheduling.publishTime = publishTimeInput?.value || '12:00';

  try {
    const result = await ipcRenderer.invoke('save-global-settings', globalSettings);
    if (result.success) {
      console.log('Global settings saved');
    }
  } catch (error) {
    console.error('Error saving global settings:', error);
  }
}

/**
 * Open Edit Templates modal
 */
function openEditTemplatesModal() {
  if (!isElectron) {
    showNotification('This feature is only available in Electron', 'error');
    return;
  }

  if (editTemplatesModal) {
    editTemplatesModal.style.display = 'flex';
    loadTemplateForEditing();
  }
}

/**
 * Close Edit Templates modal
 */
function closeEditTemplatesModal() {
  if (editTemplatesModal) {
    editTemplatesModal.style.display = 'none';
  }
}

/**
 * Load selected template for editing
 */
function loadTemplateForEditing() {
  if (!globalSettings || !globalSettings.templates) return;

  const templateId = editTemplateSelect?.value || 'template1';
  const template = globalSettings.templates[templateId];

  if (template) {
    if (templateNameInput) templateNameInput.value = template.name || '';
    if (templateTitleInput) templateTitleInput.value = template.titleTemplate || '';
    if (templateDescriptionInput) templateDescriptionInput.value = template.description || '';
    if (templateTagsInput) templateTagsInput.value = (template.tags || []).join(', ');
  }
}

/**
 * Save template
 */
async function saveTemplate() {
  if (!globalSettings) {
    showNotification('Settings not loaded', 'error');
    return;
  }

  const templateId = editTemplateSelect?.value || 'template1';

  globalSettings.templates = globalSettings.templates || {};
  globalSettings.templates[templateId] = {
    name: templateNameInput?.value || 'Template',
    titleTemplate: templateTitleInput?.value || '[FREE] [STYLE] TYPE BEAT - "[NAME]"',
    description: templateDescriptionInput?.value || '',
    tags: (templateTagsInput?.value || '').split(',').map(t => t.trim()).filter(t => t)
  };

  try {
    const result = await ipcRenderer.invoke('save-global-settings', globalSettings);
    if (result.success) {
      showNotification('Template saved successfully!', 'success');

      // Update dropdown text
      const option = activeTemplateSelect?.querySelector(`option[value="${templateId}"]`);
      if (option) {
        option.textContent = globalSettings.templates[templateId].name;
      }
    } else {
      showNotification('Error saving template: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

/**
 * Apply active template to all channels
 */
async function applyTemplateToAllChannels() {
  if (!globalSettings || !globalSettings.templates) {
    showNotification('Settings not loaded', 'error');
    return;
  }

  const templateId = activeTemplateSelect?.value || 'template1';
  const template = globalSettings.templates[templateId];

  if (!template) {
    showNotification('Template not found', 'error');
    return;
  }

  // confirm() blocked by Electron — button is already labeled as "Apply to All", which is intent enough

  try {
    showNotification('Applying template to all channels...', 'info');

    const result = await ipcRenderer.invoke('apply-template-to-all-channels', {
      templateId,
      template
    });

    if (result.success) {
      showNotification(`Template applied to ${result.channelCount} channels!`, 'success');
    } else {
      showNotification('Error: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

/**
 * Get current active template
 */
function getActiveTemplate() {
  if (!globalSettings || !globalSettings.templates) return null;
  const templateId = globalSettings.activeTemplate || 'template1';
  return globalSettings.templates[templateId];
}

/**
 * Get scheduling settings
 */
function getSchedulingSettings() {
  if (!globalSettings || !globalSettings.scheduling) {
    return {
      autoSchedule: true,
      daysBetweenUploads: 1,
      publishTime: '12:00',
      timezone: 'America/Los_Angeles'
    };
  }
  return globalSettings.scheduling;
}

/**
 * Track scheduled dates for current upload session (to calculate next date incrementally)
 */
const sessionScheduledDates = new Map(); // channelId -> lastScheduledDate

/**
 * Get the last scheduled date for a channel from upload history
 * @param {string} channelId - Channel ID like "AccountA/channel1" or "C16/C16"
 * @returns {Promise<Date|null>} Last scheduled date or null
 */
async function getLastScheduleDateForChannel(channelId) {
  try {
    // First check session cache (for incremental scheduling within same batch)
    if (sessionScheduledDates.has(channelId)) {
      return sessionScheduledDates.get(channelId);
    }

    // Extract channel key from channelId
    const channelKey = channelId.split('/').pop(); // e.g., "channel1" or "C16"

    // Get upload history for this channel
    const result = await ipcRenderer.invoke('load-upload-history', channelKey);

    // Handle both array and object response
    let history = result;
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      history = result.history || result[channelKey] || [];
    }

    if (!history || !Array.isArray(history) || history.length === 0) {
      return null;
    }

    // Find the most recent scheduled date
    let latestDate = null;
    for (const entry of history) {
      const dateStr = entry.publishAt || entry.publishAtLA || entry.scheduleDate;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date) && (!latestDate || date > latestDate)) {
          latestDate = date;
        }
      }
    }

    return latestDate;
  } catch (error) {
    console.error('[getLastScheduleDateForChannel] Error:', error);
    return null;
  }
}

/**
 * Update session scheduled date after successful upload
 */
function updateSessionScheduledDate(channelId, date) {
  sessionScheduledDates.set(channelId, date);
}

/**
 * Clear session scheduled dates (call when starting new batch)
 */
function clearSessionScheduledDates() {
  sessionScheduledDates.clear();
}

function showAuthCodeDialog(channelId, authUrl) {
  // Remove any existing dialog
  document.getElementById('auth-code-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'auth-code-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(180deg, #1c1c1c 0%, #131313 100%);
    border-radius: 18px;
    padding: 28px;
    max-width: 480px;
    width: 90%;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.7);
    border: 1px solid rgba(255,255,255,0.07);
  `;

  dialog.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <h3 style="margin:0;color:#fff;font-size:16px;font-weight:600">YouTube Re-Authorization</h3>
    </div>
    <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px;margin-bottom:18px">
      <p style="color:rgba(255,255,255,0.75);margin:0;font-size:13px;line-height:1.7">
        <span style="color:#F59E0B;font-weight:600">Step 1:</span> A browser window has opened. Sign in to Google and allow access.<br>
        <span style="color:#F59E0B;font-weight:600">Step 2:</span> Google will show you a code. Copy it.<br>
        <span style="color:#F59E0B;font-weight:600">Step 3:</span> Paste the code below and click Confirm.
      </p>
    </div>
    ${authUrl ? `<p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.3)">If the browser didn't open, <a href="#" id="open-auth-link" style="color:#F59E0B;text-decoration:none">click here</a>.</p>` : ''}
    <input type="text" id="auth-code-input" placeholder="Paste the authorization code here..." style="
      width: 100%;
      padding: 11px 14px;
      border: none;
      border-radius: 10px;
      background: #050505;
      color: #fff;
      font-size: 13px;
      margin-bottom: 14px;
      box-sizing: border-box;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);
      outline: none;
      font-family: monospace;
    ">
    <div style="display:flex;gap:10px">
      <button id="auth-submit-btn" style="
        flex: 1;
        padding: 11px;
        background: linear-gradient(180deg, #FCD34D 0%, #D97706 100%);
        border: none;
        border-radius: 10px;
        color: #381E02;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(217,119,6,0.3);
      ">Confirm Code</button>
      <button id="auth-cancel-btn" style="
        padding: 11px 18px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 10px;
        color: rgba(255,255,255,0.6);
        font-size: 13px;
        cursor: pointer;
      ">Cancel</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const input = dialog.querySelector('#auth-code-input');
  const submitBtn = dialog.querySelector('#auth-submit-btn');
  const cancelBtn = dialog.querySelector('#auth-cancel-btn');
  const openLink = dialog.querySelector('#open-auth-link');

  if (openLink) {
    openLink.onclick = (e) => {
      e.preventDefault();
      ipcRenderer.invoke('open-external-url', authUrl);
    };
  }

  input.focus();

  submitBtn.onclick = async () => {
    const code = input.value.trim();
    if (!code) {
      showNotification('Please paste the authorization code first', 'error');
      return;
    }

    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    try {
      const result = await ipcRenderer.invoke('complete-reauth', { channelId, authCode: code });

      if (result.success) {
        showNotification('Token refreshed successfully!', 'success');
        overlay.remove();
        await refreshYouTubeChannels();
      } else {
        showNotification('Error: ' + result.error, 'error');
        submitBtn.textContent = 'Confirm Code';
        submitBtn.disabled = false;
      }
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
      submitBtn.textContent = 'Confirm Code';
      submitBtn.disabled = false;
    }
  };

  // Submit on Enter
  input.onkeydown = (e) => {
    if (e.key === 'Enter') submitBtn.click();
  };

  cancelBtn.onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

async function scanYouTubeChannels() {
  if (!youtubeChannelList) return;

  youtubeChannelList.innerHTML = '<div class="empty-state">Scanning channels...</div>';

  // Check if server is online first
  if (!youtubeState.serverOnline) {
    youtubeChannelList.innerHTML = '<div class="empty-state">Server offline. Click "Start Server" to start.</div>';
    return;
  }

  try {
    // First try to get from automation server (if running)
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/channels`, {
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      youtubeState.channels = data.channels.map(ch => ({
        id: ch.channelId,
        name: ch.name,
        account: ch.account, // Account folder name
        configPath: `${ch.account}/${ch.channelId}`, // Full path for re-auth
        ready: ch.isReady,
        hasToken: ch.hasToken,
        uploadFolder: ch.uploadsPath,
        queueCount: ch.queueCount,
        historyCount: ch.historyCount,
        tokenStatus: ch.tokenStatus || { valid: false, message: 'Unknown' }
      }));
      youtubeState.serverOnline = true;
      renderYouTubeChannels();

      // Check for expired tokens and show notification
      checkExpiredTokens();

      // Update status
      if (youtubeStatusEl) {
        youtubeStatusEl.textContent = 'YouTube: Online';
        youtubeStatusEl.classList.remove('offline');
        youtubeStatusEl.classList.add('online');
      }
      updateServerStatusUI(true);
    } else {
      throw new Error('Server not available');
    }
  } catch (error) {
    console.error('Error scanning channels:', error.message);

    // Fallback to local scan via IPC
    if (isElectron) {
      try {
        const result = await ipcRenderer.invoke('scan-youtube-channels');
        if (result.success) {
          youtubeState.channels = result.channels;
          renderYouTubeChannels();
        } else {
          youtubeChannelList.innerHTML = `<div class="empty-state">Error: ${result.error}</div>`;
        }
      } catch (ipcError) {
        youtubeChannelList.innerHTML = `<div class="empty-state">Error: ${ipcError.message}</div>`;
      }
    } else {
      youtubeChannelList.innerHTML = `
        <div class="empty-state">
          <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Automation server offline</p>
          <p style="font-size: 12px; margin-top: 10px;">
            Start the server: <code>cd automation && npm start</code>
          </p>
        </div>
      `;
    }
  }
}

/**
 * Check for expired tokens and show notification
 */
function checkExpiredTokens() {
  const expiredChannels = youtubeState.channels.filter(ch =>
    ch.tokenStatus && !ch.tokenStatus.valid
  );

  if (expiredChannels.length > 0) {
    showExpiredTokensNotification(expiredChannels);
  } else {
    hideExpiredTokensNotification();
  }
}

/**
 * Show notification for expired tokens
 */
function showExpiredTokensNotification(expiredChannels) {
  let notificationEl = document.getElementById('expired-tokens-notification');

  if (!notificationEl) {
    notificationEl = document.createElement('div');
    notificationEl.id = 'expired-tokens-notification';
    notificationEl.className = 'expired-tokens-notification';

    // Insert after youtube status or at top of youtube section
    const youtubeSection = document.querySelector('.youtube-section') || document.querySelector('#youtube-tab');
    if (youtubeSection) {
      youtubeSection.insertBefore(notificationEl, youtubeSection.firstChild);
    }
  }

  const channelNames = expiredChannels.map(ch => ch.name).join(', ');
  const count = expiredChannels.length;

  notificationEl.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
      <span class="notification-text">
        <strong>${count} channel${count > 1 ? 's' : ''} with expired token${count > 1 ? 's' : ''}:</strong>
        ${channelNames.length > 100 ? channelNames.substring(0, 100) + '...' : channelNames}
      </span>
      <button class="notification-action" onclick="showExpiredTokensDetails()">Details</button>
      <button class="notification-close" onclick="hideExpiredTokensNotification()">x</button>
    </div>
  `;

  notificationEl.style.display = 'block';
}

/**
 * Hide expired tokens notification
 */
function hideExpiredTokensNotification() {
  const notificationEl = document.getElementById('expired-tokens-notification');
  if (notificationEl) {
    notificationEl.style.display = 'none';
  }
}

/**
 * Show detailed modal for expired tokens
 */
function showExpiredTokensDetails() {
  const expiredChannels = youtubeState.channels.filter(ch =>
    ch.tokenStatus && !ch.tokenStatus.valid
  );

  const modalContent = `
    <div class="modal-header">
      <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Channels need Re-authentication</h3>
      <button class="modal-close" onclick="closeModal()">x</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom: 15px;">These channels have expired tokens and need re-authentication:</p>
      <div class="expired-channels-list">
        ${expiredChannels.map(ch => `
          <div class="expired-channel-item">
            <span class="channel-name">${ch.name}</span>
            <span class="token-message">${ch.tokenStatus?.message || 'Token expired'}</span>
            <button class="btn-reauth" data-channel-id="${ch.id}">Re-auth</button>
          </div>
        `).join('')}
      </div>
      <div class="modal-tip" style="margin-top: 15px; padding: 10px; background: #2a2a40; border-radius: 8px;">
        <strong><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Tip:</strong> Google OAuth testing mode tokens expire after 7 days.
        After re-authentication, <strong>restart server</strong> to load the new token.
      </div>
    </div>
  `;

  showModal(modalContent);

  // Add click handlers for re-auth buttons
  document.querySelectorAll('.btn-reauth[data-channel-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      reAuthChannel(btn.dataset.channelId);
    });
  });
}

/**
 * Re-authenticate a specific channel
 */
async function reAuthChannel(channelId) {
  const channel = youtubeState.channels.find(c => c.id === channelId);
  if (!channel) return;

  try {
    showNotification(`Opening browser for ${channel.name}...`, 'info');

    const channelPath = channel.configPath || channelId;
    const result = await ipcRenderer.invoke('reauthenticate-youtube', channelPath);

    if (result.success && result.needsCode) {
      // Browser opened  now show code input dialog
      showAuthCodeDialog(result.channelId, result.authUrl);
    } else if (!result.success) {
      showNotification(`Auth error: ${result.error}`, 'error');
    }
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

async function refreshYouTubeChannels() {
  await checkYouTubeServer();
  await scanYouTubeChannels();
}

function renderYouTubeChannels() {
  if (!youtubeChannelList) return;

  if (youtubeState.channels.length === 0) {
    youtubeChannelList.innerHTML = '<div class="empty-state">No channels found</div>';
    return;
  }

  youtubeChannelList.innerHTML = youtubeState.channels.map(channel => {
    const tokenValid = channel.tokenStatus?.valid !== false;
    const tokenMessage = channel.tokenStatus?.message || '';
    const tokenExpired = !tokenValid && channel.hasToken;

    let statusClass = 'offline';
    let statusText = 'Setup needed';

    if (channel.ready && tokenValid) {
      statusClass = 'ready';
      statusText = 'Ready';
    } else if (tokenExpired) {
      statusClass = 'expired';
      statusText = 'Token expired';
    } else if (channel.ready) {
      statusClass = 'warning';
      statusText = 'Token issue';
    }

    return `
      <div class="channel-item ${youtubeState.selectedChannel?.id === channel.id ? 'selected' : ''} ${tokenExpired ? 'token-expired' : ''}"
           data-channel-id="${channel.id}"
           data-token-expired="${tokenExpired}"
           title="${tokenMessage}">
        <span class="channel-name">${channel.name}</span>
        <span class="channel-status ${statusClass}">
          ${tokenExpired ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:3px"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>' : ''}${statusText}
        </span>
      </div>
    `;
  }).join('');

  // Add click handlers
  youtubeChannelList.querySelectorAll('.channel-item').forEach(item => {
    item.addEventListener('click', () => {
      const channelId = item.dataset.channelId;
      if (item.dataset.tokenExpired === 'true') {
        reAuthChannel(channelId);
      } else {
        selectYouTubeChannel(channelId);
      }
    });
  });
}

function selectYouTubeChannel(channelId) {
  const channel = youtubeState.channels.find(c => c.id === channelId);
  youtubeState.selectedChannel = channel;
  renderYouTubeChannels();

  // Load channel's queue and history
  if (channel && youtubeState.serverOnline) {
    loadChannelStatus(channelId);
  }
}

async function loadChannelStatus(channelId) {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/status/${channelId}`);
    if (response.ok) {
      const data = await response.json();

      // Update queue from server
      if (data.queue) {
        // Merge with local queue
        data.queue.forEach(serverItem => {
          const existsLocally = youtubeState.queue.find(q => q.fileName === serverItem.fileName);
          if (!existsLocally) {
            youtubeState.queue.push({
              id: serverItem.id,
              fileName: serverItem.fileName,
              filePath: serverItem.filePath,
              metadata: serverItem.metadata,
              status: serverItem.status
            });
          }
        });
        renderUploadQueue();
      }

      // Update history from server
      if (data.history) {
        youtubeState.history = data.history;
        // Update uploaded beats set from history
        updateUploadedBeatsFromHistory();
        renderUploadHistory();
        updateHistoryStats();
      }
    }
  } catch (error) {
    console.error('Error loading channel status:', error);
  }
}

/**
 * Update uploadedBeats set from YouTube history
 * This tracks which beats have been successfully uploaded
 */
function updateUploadedBeatsFromHistory() {
  // Clear and rebuild the set from all history
  youtubeState.uploadedBeats.clear();
  youtubeState.uploadedBeatsInfo.clear();

  youtubeState.history.forEach(item => {
    if (item.status === 'completed' || item.status === 'success') {
      // Extract beat name from video title or filename
      const title = item.metadata?.title || '';
      const fileName = item.fileName || '';

      // Store upload info including schedule date
      // Server stores as publishAt, not scheduleDate
      const uploadInfo = {
        scheduleDate: item.scheduleDate || item.result?.publishAt || item.result?.scheduleDate || null,
        videoId: item.result?.videoId || item.videoId || null,
        channelName: item.result?.channelName || item.channelName || null,
        uploadedAt: item.completedAt || item.addedAt || null
      };

      // Add fileName without extension (e.g., "Endless" from "Endless.mp4")
      const fileNameNoExt = fileName.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '').toLowerCase();
      if (fileNameNoExt) {
        youtubeState.uploadedBeats.add(fileNameNoExt);
        youtubeState.uploadedBeatsInfo.set(fileNameNoExt, uploadInfo);
      }

      // Also try to extract beat name from title like "[FREE] TYPE BEAT - "NAME""
      // Handle both regular quotes and escaped quotes
      const titleMatch = title.match(/["""]([^"""]+)["""]$/);
      if (titleMatch) {
        const beatName = titleMatch[1].trim().toLowerCase();
        youtubeState.uploadedBeats.add(beatName);
        youtubeState.uploadedBeatsInfo.set(beatName, uploadInfo);
      }

      // Also try to extract from "Untitled - Name_tagged" format
      const match = fileNameNoExt.match(/[-]\s*([^_]+)(?:_tagged)?$/i);
      if (match) {
        const extractedName = match[1].trim().toLowerCase();
        youtubeState.uploadedBeats.add(extractedName);
        youtubeState.uploadedBeatsInfo.set(extractedName, uploadInfo);
      }
    }
  });

  console.log('Uploaded beats tracked:', Array.from(youtubeState.uploadedBeats));
  console.log('Upload info:', Object.fromEntries(youtubeState.uploadedBeatsInfo));
}

/**
 * Check if a beat has been uploaded to YouTube
 */
function isBeatUploaded(beatName) {
  if (!beatName) return false;

  const baseName = beatName.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '').toLowerCase();

  // Check exact match
  if (youtubeState.uploadedBeats.has(baseName)) return true;

  // Check extracted name (e.g., "Spectrum" from "Untitled - Spectrum_tagged")
  const match = baseName.match(/[-]\s*([^_]+)(?:_tagged)?$/i);
  if (match && youtubeState.uploadedBeats.has(match[1].trim().toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Get upload info for a beat (schedule date, video ID, etc.)
 */
function getBeatUploadInfo(beatName) {
  if (!beatName) return null;

  const baseName = beatName.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '').toLowerCase();

  // Check exact match
  if (youtubeState.uploadedBeatsInfo.has(baseName)) {
    return youtubeState.uploadedBeatsInfo.get(baseName);
  }

  // Check extracted name
  const match = baseName.match(/[-]\s*([^_]+)(?:_tagged)?$/i);
  if (match) {
    const extractedName = match[1].trim().toLowerCase();
    if (youtubeState.uploadedBeatsInfo.has(extractedName)) {
      return youtubeState.uploadedBeatsInfo.get(extractedName);
    }
  }

  return null;
}

function handleVideoFiles(files) {
  const videoFiles = Array.from(files).filter(f =>
    f.type.startsWith('video/') ||
    ['.mp4', '.mov', '.avi', '.mkv', '.webm'].some(ext => f.name.toLowerCase().endsWith(ext))
  );

  if (videoFiles.length === 0) {
    alert('Please select valid video files');
    return;
  }

  videoFiles.forEach(file => {
    addVideoToQueue({
      filePath: file.path,
      fileName: file.name,
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      tags: [],
      privacy: defaultPrivacySelect?.value || 'private'
    });
  });
}

async function addVideoToQueue(videoData) {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('add-to-upload-queue', {
      ...videoData,
      channelId: youtubeState.selectedChannel?.id
    });

    if (result.success) {
      youtubeState.queue.push(result.item);
      renderUploadQueue();
      return result.item;
    }

    showNotification(result.error || 'Failed to add video to queue', 'error');
    return null;
  } catch (error) {
    console.error('Error adding to queue:', error);
    showNotification('Error adding video to queue', 'error');
    return null;
  }
}

function renderUploadQueue() {
  if (!uploadQueueList) return;

  if (youtubeState.queue.length === 0) {
    uploadQueueList.innerHTML = '<div class="empty-state">No videos in queue</div>';
    queueCountBadge.textContent = '0';
    return;
  }

  queueCountBadge.textContent = youtubeState.queue.length;

  uploadQueueList.innerHTML = youtubeState.queue.map(item => `
    <div class="queue-item" data-item-id="${item.id}">
      <div class="video-info">
        <div class="video-title">${item.metadata.title}</div>
        <div class="video-meta">
          <span class="upload-status ${item.status}">${item.status}</span>
           ${item.fileName}
        </div>
      </div>
      <div class="queue-actions">
        <button class="btn-secondary edit-btn" title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn-secondary upload-btn" title="Upload" ${item.status !== 'draft' ? 'disabled' : ''}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
        <button class="btn-danger remove-btn" title="Remove"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
      </div>
    </div>
  `).join('');

  // Add event handlers
  uploadQueueList.querySelectorAll('.queue-item').forEach(item => {
    const itemId = item.dataset.itemId;

    item.querySelector('.edit-btn')?.addEventListener('click', () => openVideoEditModal(itemId));
    item.querySelector('.upload-btn')?.addEventListener('click', () => startUpload(itemId));
    item.querySelector('.remove-btn')?.addEventListener('click', () => removeFromQueue(itemId));
  });
}

function openVideoEditModal(itemId) {
  const item = youtubeState.queue.find(q => q.id === itemId);
  if (!item) return;

  editingVideoId = itemId;

  videoTitleInput.value = item.metadata.title || '';
  videoDescriptionInput.value = item.metadata.description || '';
  videoTagsInput.value = (item.metadata.tags || []).join(', ');
  videoPrivacySelect.value = item.metadata.privacy || 'private';

  videoEditModal.style.display = 'flex';
}

function closeVideoEditModal() {
  videoEditModal.style.display = 'none';
  editingVideoId = null;
}

async function saveVideoMetadata() {
  if (!editingVideoId || !isElectron) return;

  try {
    const updates = {
      title: videoTitleInput.value,
      description: videoDescriptionInput.value,
      tags: videoTagsInput.value.split(',').map(t => t.trim()).filter(t => t),
      privacy: videoPrivacySelect.value
    };

    const result = await ipcRenderer.invoke('update-queue-item', editingVideoId, updates);

    if (result.success) {
      const item = youtubeState.queue.find(q => q.id === editingVideoId);
      if (item) {
        Object.assign(item.metadata, updates);
      }
      renderUploadQueue();
      closeVideoEditModal();
    }
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
}

async function startUpload(itemId) {
  const item = youtubeState.queue.find(q => q.id === itemId);
  if (!item) {
    alert('Video not found in queue');
    return;
  }

  if (!youtubeState.selectedChannel) {
    alert('Please select a channel first');
    return;
  }

  if (!youtubeState.selectedChannel.ready) {
    alert('Selected channel is not ready. Please authenticate with YouTube first.');
    return;
  }

  if (!youtubeState.serverOnline) {
    alert('Automation server is offline. Please start the server first.');
    return;
  }

  item.status = 'uploading';
  renderUploadQueue();

  try {
    // Copy video to channel's upload folder - server will auto-detect and upload
    if (isElectron) {
      const result = await ipcRenderer.invoke('copy-video-for-upload', {
        videoPath: item.filePath,
        channelId: youtubeState.selectedChannel.id,
        metadata: item.metadata
      });

      if (result.success) {
        item.status = 'pending';
        item.serverPath = result.destPath;
        showNotification(`Video sent to ${youtubeState.selectedChannel.name}. Server will upload it automatically.`, 'success');
        renderUploadQueue();

        // Start polling for status updates
        pollUploadStatus(item.id, youtubeState.selectedChannel.id);
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    item.status = 'failed';
    item.error = error.message;
    renderUploadQueue();
    alert(`Upload error: ${error.message}`);
  }
}

// Poll automation server for upload status
async function pollUploadStatus(itemId, channelId) {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  const poll = async () => {
    try {
      const response = await fetch(`${AUTOMATION_SERVER_URL}/api/status/${channelId}`);
      const data = await response.json();

      // Check if video is completed or failed in history
      const historyItem = data.history?.find(h => h.fileName === youtubeState.queue.find(q => q.id === itemId)?.fileName);

      if (historyItem) {
        const item = youtubeState.queue.find(q => q.id === itemId);
        if (item) {
          item.status = historyItem.status;
          item.result = historyItem.result;

          // Move to history
          youtubeState.history.push(item);
          youtubeState.queue = youtubeState.queue.filter(q => q.id !== itemId);

          renderUploadQueue();
          renderUploadHistory();
          updateHistoryStats();

          if (historyItem.status === 'completed') {
            console.log(' Upload completed:', historyItem.result?.videoUrl);
          }
        }
        return; // Stop polling
      }

      // Continue polling
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    } catch (error) {
      console.error('Polling error:', error);
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000);
      }
    }
  };

  poll();
}

function updateHistoryStats() {
  const today = new Date().toDateString();
  const todayUploads = youtubeState.history.filter(h =>
    new Date(h.completedAt || h.addedAt).toDateString() === today && h.status === 'completed'
  ).length;

  const totalUploads = youtubeState.history.filter(h => h.status === 'completed').length;
  const failedUploads = youtubeState.history.filter(h => h.status === 'failed').length;

  if (uploadsTodayEl) uploadsTodayEl.textContent = todayUploads;
  if (uploadsTotalEl) uploadsTotalEl.textContent = totalUploads;
  if (uploadsFailedEl) uploadsFailedEl.textContent = failedUploads;
}

async function removeFromQueue(itemId) {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('remove-from-queue', itemId);
    if (result.success) {
      youtubeState.queue = youtubeState.queue.filter(q => q.id !== itemId);
      renderUploadQueue();
    }
  } catch (error) {
    console.error('Error removing from queue:', error);
  }
}

function renderUploadHistory() {
  if (!uploadHistoryList) return;

  if (youtubeState.history.length === 0) {
    uploadHistoryList.innerHTML = '<div class="empty-state">No upload history</div>';
    return;
  }

  uploadHistoryList.innerHTML = youtubeState.history.slice(-20).reverse().map(item => `
    <div class="history-item">
      <div class="video-info">
        <div class="video-title">${item.metadata?.title || item.fileName}</div>
        <div class="video-meta">
          <span class="upload-status ${item.status}">${item.status}</span>
           ${new Date(item.completedAt || item.addedAt).toLocaleString()}
        </div>
      </div>
    </div>
  `).join('');
}

// Periodic YouTube status check
setInterval(() => {
  if (youtubeInitialized) {
    checkYouTubeServer();
  }
}, 30000);


// ============================
// CROSS-SECTION INTEGRATION
// ============================

/**
 * Create video from currently playing beat
 * Uses the beat's associated image if available
 */
async function createVideoFromCurrentBeat() {
  if (!currentBeat) {
    alert('Please select a beat first');
    return;
  }

  // Mark beat as "used for upload" in all packs that contain it
  if (typeof markBeatAsUsedForUpload === 'function') {
    markBeatAsUsedForUpload(currentBeat.path);
  }

  // Switch to AutoVid section
  document.querySelector('.main-nav-tab[data-section="autovid"]')?.click();

  // Wait for section to initialize
  await new Promise(r => setTimeout(r, 100));

  // Set audio
  autovidState.selectedAudioPath = currentBeat.path;
  if (audioFilePath) {
    audioFilePath.value = currentBeat.name;
  }
  if (audioPreviewContainer) {
    audioPreviewContainer.style.display = 'block';
    autovidAudioPlayer.src = `file://${currentBeat.path}`;
  }

  // Set image if available
  const imagePath = beatImages[currentBeat.path];
  if (imagePath) {
    autovidState.selectedImagePath = imagePath;
    if (previewImage && imagePlaceholder) {
      previewImage.src = `file://${imagePath}`;
      previewImage.style.display = 'block';
      imagePlaceholder.style.display = 'none';
    }
    if (imageInfo) {
      imageInfo.style.display = 'block';
      imageTitle.textContent = imagePath.split('\\').pop();
      imageSource.textContent = 'From beat library';
    }
  }

  // Set output name - extract just the beat name (e.g., "Spectrum" from "Untitled - Spectrum_tagged")
  const beatNameWithoutExt = currentBeat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
  const extractedName = extractBeatName(beatNameWithoutExt);
  if (outputNameInput) {
    outputNameInput.value = extractedName;
  }

  updateRenderButton();
}

/**
 * Extract clean beat name from filename
 * e.g., "Untitled - Spectrum_tagged" -> "Spectrum"
 * e.g., "My Beat - Melody_v2" -> "Melody"
 */
function extractBeatName(fullName) {
  // Try to match pattern: "Something - Name_something" or "Something - Name"
  const match = fullName.match(/[-]\s*([^_]+?)(?:_[^_]*)?$/);
  if (match) {
    return match[1].trim();
  }

  // Fallback: remove common suffixes and return
  return fullName.replace(/_tagged|_v\d+|_final|_master/gi, '').trim();
}

/**
 * Upload video to YouTube from current selection
 */
async function uploadCurrentVideoToYouTube() {
  const currentVideoPath = getCurrentRenderedVideoPath();

  if (!currentVideoPath) {
    alert('Please render a video first');
    return;
  }

  // Switch to YouTube section
  document.querySelector('.main-nav-tab[data-section="youtube"]')?.click();

  // Wait for section to initialize
  await new Promise(r => setTimeout(r, 100));

  // Add video to queue
  const fileName = nodePath ? nodePath.basename(currentVideoPath) : currentVideoPath.split('\\').pop();
  const title = fileName.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '');

  const queueItem = await addVideoToQueue({
    filePath: currentVideoPath,
    fileName: fileName,
    title: title,
    description: '',
    tags: [],
    privacy: defaultPrivacySelect?.value || 'private'
  });

  if (!queueItem) return;

  if (!youtubeState.selectedChannel) {
    showNotification('Video added to queue. Select a YouTube channel to upload it.', 'info');
    return;
  }

  if (!youtubeState.selectedChannel.ready) {
    showNotification('Video added to queue. Authenticate the selected channel to upload it.', 'info');
    return;
  }

  if (!youtubeState.serverOnline) {
    showNotification('Video added to queue. Start the automation server to upload it.', 'info');
    return;
  }

  await startUpload(queueItem.id);
}

// Make functions globally available
window.createVideoFromCurrentBeat = createVideoFromCurrentBeat;
window.uploadCurrentVideoToYouTube = uploadCurrentVideoToYouTube;

// ============================
// AUTO RENDER & UPLOAD SYSTEM
// ============================

/**
 * Map pack name to corresponding YouTube channel
 * Pack names like "C1", "C2 - Boom Bap" should map to channels with similar names
 */
function findChannelForPack(packName) {
  if (!packName || youtubeState.channels.length === 0) return null;

  // Extract channel number from pack name (e.g., "C1" from "C1 - Boom Bap")
  const packMatch = packName.match(/^C(\d+)/i);
  if (!packMatch) return null;

  const packNumber = packMatch[1];

  // Find channel with matching number
  const channel = youtubeState.channels.find(ch => {
    const channelName = ch.name || ch.id || '';
    const channelId = ch.id || '';

    // Match "C1", "channel1", "Channel 1", etc.
    const channelMatch = channelName.match(/(?:channel\s*|C)(\d+)/i);
    const idMatch = channelId.match(/(\d+)/);

    return (channelMatch && channelMatch[1] === packNumber) ||
           (idMatch && idMatch[1] === packNumber);
  });

  // If found, normalize the channel ID for new-style channels (C16+)
  if (channel) {
    // Check if this is a new-style channel (C16, C17, etc.)
    const isNewStyle = channel.id && channel.id.match(/^C\d+\/C\d+$/i);
    if (isNewStyle) {
      // Return channel with normalized ID
      return {
        ...channel,
        id: `C${packNumber}` // Use simple format like "C25"
      };
    }
  }

  return channel;
}

/**
 * Auto render a single beat and upload to the pack's corresponding channel
 * @param {string} beatPath - Path to the audio file
 * @param {string} packId - Pack ID to determine the channel
 * @returns {Promise<{success: boolean, error?: string, videoPath?: string}>}
 */
async function autoRenderAndUploadBeat(beatPath, packId) {
  const pack = packs.find(p => p.id === packId);
  if (!pack) {
    return { success: false, error: 'Pack not found' };
  }

  // Find the beat in the pack
  const beat = pack.beats.find(b => b.path === beatPath);
  if (!beat) {
    return { success: false, error: 'Beat not found in pack' };
  }

  // Check if beat has an image
  const imagePath = beatImages[beatPath];
  if (!imagePath) {
    return { success: false, error: 'Beat has no image assigned' };
  }

  // Find corresponding channel for this pack
  let channel = findChannelForPack(pack.name);

  // Fallback: create channel object from pack name if not found
  if (!channel) {
    const packMatch = pack.name.match(/^C(\d+)/i);
    if (packMatch) {
      const channelNum = packMatch[1];
      channel = {
        id: `AccountA/channel${channelNum}`,
        name: `channel${channelNum}`,
        ready: true
      };
    } else {
      return { success: false, error: `No channel found for pack "${pack.name}". Make sure channel name matches (e.g., C1, C2, etc.)` };
    }
  }

  // Extract clean beat name for video title
  const beatNameWithoutExt = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
  const cleanBeatName = extractBeatName(beatNameWithoutExt);

  // Get active template for title and description
  const activeTemplate = getActiveTemplate();
  let videoTitle = cleanBeatName;
  let videoDescription = '';
  let videoTags = [];

  if (activeTemplate) {
    // Apply title template - replace [NAME] with beat name
    if (activeTemplate.titleTemplate) {
      videoTitle = activeTemplate.titleTemplate.replace(/\[NAME\]/gi, cleanBeatName);
    }
    videoDescription = activeTemplate.description || '';
    videoTags = activeTemplate.tags || [];
  }

  console.log(`[Auto Upload] Rendering: ${cleanBeatName} for channel ${channel.name}`);
  console.log(`[Auto Upload] Title: ${videoTitle}`);
  console.log(`[Auto Upload] Image path: ${imagePath}`);
  console.log(`[Auto Upload] Audio path: ${beatPath}`);

  try {
    // Check if files exist before rendering
    const fs = require('fs');
    if (!fs.existsSync(imagePath)) {
      return { success: false, error: `Image file not found: ${imagePath}` };
    }
    if (!fs.existsSync(beatPath)) {
      return { success: false, error: `Audio file not found: ${beatPath}` };
    }

    // Step 1: Render video
    const renderResult = await ipcRenderer.invoke('render-video', {
      imagePath: imagePath,
      audioPath: beatPath,
      outputName: cleanBeatName, // Use clean name without special chars
      resolution: '1080'
    });

    if (!renderResult.success) {
      return { success: false, error: `Render failed: ${renderResult.error}` };
    }

    const videoPath = renderResult.outputPath;
    console.log(`[Auto Upload] Rendered: ${videoPath}`);

    // Step 2: Copy to channel's upload folder (works even if server is offline)
    // Calculate schedule date if auto-scheduling is enabled
    const schedulingSettings = getSchedulingSettings();
    let scheduleDate = null;

    if (schedulingSettings.autoSchedule) {
      // Get the last scheduled date for this channel from upload history OR session
      const lastScheduleDate = await getLastScheduleDateForChannel(channel.id);

      if (lastScheduleDate) {
        // Schedule for daysBetweenUploads days after the last scheduled video
        const nextDate = new Date(lastScheduleDate);
        nextDate.setDate(nextDate.getDate() + (schedulingSettings.daysBetweenUploads || 1));
        scheduleDate = nextDate;
      } else {
        // First upload - schedule for tomorrow
        scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      // Set the publish time
      if (schedulingSettings.publishTime) {
        const [hours, minutes] = schedulingSettings.publishTime.split(':');
        scheduleDate.setHours(parseInt(hours) || 12, parseInt(minutes) || 0, 0, 0);
      }

      // Update session cache so next video in batch gets +1 day
      updateSessionScheduledDate(channel.id, scheduleDate);

      console.log(`[Auto Upload] Auto-scheduled for: ${scheduleDate.toISOString()}`);
    }

    const copyResult = await ipcRenderer.invoke('copy-video-for-upload', {
      videoPath: videoPath,
      channelId: channel.id,
      metadata: {
        title: videoTitle,
        description: videoDescription,
        tags: videoTags,
        privacy: scheduleDate ? 'private' : 'private',
        scheduleDate: scheduleDate ? scheduleDate.toISOString() : null
      }
    });

    if (!copyResult.success) {
      return { success: false, error: `Copy failed: ${copyResult.error}` };
    }

    console.log(`[Auto Upload] Sent to channel: ${channel.name} at ${copyResult.destPath}`);

    // Mark beat as last used
    pack.beats.forEach(b => b.lastUsed = false);
    beat.lastUsed = true;

    // Step 3: Wait for upload to complete and get schedule date
    const scheduleInfo = await waitForUploadComplete(videoTitle, channel.id);

    // Store upload info for this beat
    if (scheduleInfo) {
      const uploadInfo = {
        scheduleDate: scheduleInfo.publishAt || scheduleInfo.publishAtLA,
        videoId: scheduleInfo.videoId,
        channelName: channel.name,
        uploadedAt: new Date().toISOString()
      };

      // Store in uploadedBeatsInfo
      youtubeState.uploadedBeats.add(videoTitle.toLowerCase());
      youtubeState.uploadedBeatsInfo.set(videoTitle.toLowerCase(), uploadInfo);

      console.log(`[Auto Upload] Schedule info saved: ${videoTitle} -> ${uploadInfo.scheduleDate}`);
    }

    saveData();

    return {
      success: true,
      videoPath: videoPath,
      channel: channel.name,
      title: videoTitle,
      scheduleDate: scheduleInfo?.publishAtLA || scheduleInfo?.publishAt
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Wait for a video to be uploaded and get its schedule info
 * @param {string} videoTitle - Title of the video to wait for
 * @param {string} channelId - Channel ID
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds (default 5 minutes)
 * @returns {Promise<Object|null>} Upload result with schedule info or null
 */
async function waitForUploadComplete(videoTitle, channelId, maxWaitMs = 60000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  // Extract beat name from title for matching
  // Title format: (FREE) MF DOOM x Joey Bada$$ x 90s Boom Bap Type Beat - "Ice"
  const beatNameMatch = videoTitle.match(/-\s*"([^"]+)"$/);
  const beatName = beatNameMatch ? beatNameMatch[1].toLowerCase() : videoTitle.toLowerCase();

  console.log(`[Auto Upload] Waiting for upload: "${beatName}" (channel: ${channelId})`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`${AUTOMATION_SERVER_URL}/api/status/${channelId}`);
      if (!response.ok) {
        await new Promise(r => setTimeout(r, pollInterval));
        continue;
      }

      const data = await response.json();

      // Check if our video is in history (completed)
      if (data.history && data.history.length > 0) {
        // Filter to only completed/success items first, then search
        const completedItems = data.history.filter(h =>
          h.status === 'completed' || h.status === 'success'
        );

        const uploadedVideo = completedItems.find(h => {
          const historyTitle = h.metadata?.title || h.fileName || '';
          const historyTitleLower = historyTitle.toLowerCase();

          // Try multiple matching strategies
          // 1. Exact beat name in title
          if (historyTitleLower.includes(`"${beatName}"`)) return true;

          // 2. Beat name in filename (e.g., Ice.mp4)
          const fileName = (h.fileName || '').toLowerCase().replace('.mp4', '').replace('.mov', '');
          if (fileName === beatName) return true;

          // 3. Partial match on title
          if (historyTitleLower.includes(beatName)) return true;

          // 4. Original full title match
          if (historyTitleLower.includes(videoTitle.toLowerCase())) return true;

          return false;
        });

        if (uploadedVideo) {
          console.log(`[Auto Upload] Found completed upload for: ${videoTitle}`);
          return uploadedVideo.result || uploadedVideo;
        }

        // Log recent history items for debugging
        if (data.history.length > 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[Auto Upload] ${elapsed}s - History has ${data.history.length} items (${completedItems.length} completed), looking for: "${beatName}"`);
          const recentItems = completedItems.slice(0, 3).map(h => ({
            title: (h.metadata?.title || h.fileName || '').substring(0, 50),
            status: h.status
          }));
          console.log('[Auto Upload] Recent completed items:', recentItems);
        }
      }
    } catch (error) {
      console.log(`[Auto Upload] Polling error: ${error.message}`);
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  console.log(`[Auto Upload] Timeout waiting for upload: ${videoTitle}`);
  return null;
}

/**
 * Get next N unuploaded beats from a pack
 * @param {string} packId - Pack ID
 * @param {number} count - Number of beats to get
 * @returns {Array} Array of beat objects
 */
function getNextUnuploadedBeats(packId, count = 6) {
  const pack = packs.find(p => p.id === packId);
  if (!pack) return [];

  // Find the last used beat index
  let startIndex = 0;
  const lastUsedIndex = pack.beats.findIndex(b => b.lastUsed);
  if (lastUsedIndex !== -1) {
    startIndex = lastUsedIndex + 1;
  }

  // Get beats that haven't been uploaded yet
  const unuploadedBeats = [];
  for (let i = 0; i < pack.beats.length && unuploadedBeats.length < count; i++) {
    const index = (startIndex + i) % pack.beats.length;
    const beat = pack.beats[index];

    // Skip if already uploaded
    if (isBeatUploaded(beat.name)) continue;

    // Skip if no image assigned
    if (!beatImages[beat.path]) continue;

    unuploadedBeats.push(beat);
  }

  return unuploadedBeats;
}

/**
 * Auto upload next N beats from the current pack
/**
 * Auto upload next N beats from the current pack
 * @param {number} count - Number of beats to upload (default 6)
 */
async function autoUploadNextBeats(count = 6) {
  // Clear session scheduled dates when starting new batch
  clearSessionScheduledDates();

  if (!currentPackId) {
    showNotification('Please select a pack first', 'error');
    return;
  }

  const pack = packs.find(p => p.id === currentPackId);
  if (!pack) {
    showNotification('Pack not found', 'error');
    return;
  }

  // Find channel for this pack (we need channel info even if server is offline)
  // First try from cached channels, then calculate from pack name
  let channel = findChannelForPack(pack.name);

  // If no channel found in cache but we have a valid pack name, create a minimal channel object
  if (!channel) {
    const packMatch = pack.name.match(/^C(\d+)/i);
    if (packMatch) {
      const channelNum = packMatch[1];
      channel = {
        id: `AccountA/channel${channelNum}`,
        name: pack.name,
        ready: true // Assume ready, will fail gracefully if not
      };
      showNotification(`Using fallback channel mapping for ${pack.name}`, 'info');
    } else {
      showNotification(`No channel found for pack "${pack.name}". Make sure pack name starts with C1, C2, etc.`, 'error');
      return;
    }
  }

  // Get next unuploaded beats
  const beatsToUpload = getNextUnuploadedBeats(currentPackId, count);

  if (beatsToUpload.length === 0) {
    showNotification('No unuploaded beats with images found in this pack', 'error');
    return;
  }

  // Warn if server is offline but allow proceeding
  if (!youtubeState.serverOnline) {
    showNotification('Server offline - videos will be queued in upload folder. Start server to upload.', 'info');
  }

  // Start progress tracking
  startProgressBatch(beatsToUpload.length, channel.name);
  const progressIds = {};

  // Add all items to progress tracker
  beatsToUpload.forEach(beat => {
    const beatNameWithoutExt = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
    const cleanBeatName = extractBeatName(beatNameWithoutExt);
    progressIds[beat.path] = addProgressItem(cleanBeatName, channel.name);
  });

  showNotification(`Starting batch render of ${beatsToUpload.length} beats...`, 'info');

  // ====== PHASE 1: BATCH RENDER (Parallel) ======
  const CONCURRENT_RENDERS = 3; // Number of FFmpeg processes to run in parallel
  const renderResults = [];
  let renderSuccessCount = 0;
  let renderFailCount = 0;

  // Prepare render tasks
  const renderTasks = beatsToUpload.map((beat, index) => ({
    beat,
    index,
    imagePath: beatImages[beat.path]
  }));

  // Process renders in batches (autoUploadNextBeats)
  for (let i = 0; i < renderTasks.length; i += CONCURRENT_RENDERS) {
    const batch = renderTasks.slice(i, i + CONCURRENT_RENDERS);

    showNotification(`Rendering batch ${Math.floor(i/CONCURRENT_RENDERS) + 1}/${Math.ceil(renderTasks.length/CONCURRENT_RENDERS)} (${batch.length} videos)...`, 'info');

    const batchPromises = batch.map(async (task) => {
      const { beat, imagePath } = task;
      const progressId = progressIds[beat.path];

      if (!imagePath) {
        updateProgressItem(progressId, PROGRESS_STATUS.FAILED, { error: 'No image assigned' });
        return { success: false, beat, error: 'No image assigned' };
      }

      const beatNameWithoutExt = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
      const cleanBeatName = extractBeatName(beatNameWithoutExt);

      // Update progress: rendering
      updateProgressItem(progressId, PROGRESS_STATUS.RENDERING);

      try {
        const renderResult = await ipcRenderer.invoke('render-video', {
          imagePath: imagePath,
          audioPath: beat.path,
          outputName: cleanBeatName,
          resolution: '1080'
        });

        if (renderResult.success) {
          updateProgressItem(progressId, PROGRESS_STATUS.UPLOADING); // Ready for upload
          return { success: true, beat, videoPath: renderResult.outputPath, cleanBeatName, progressId };
        } else {
          updateProgressItem(progressId, PROGRESS_STATUS.FAILED, { error: renderResult.error });
          return { success: false, beat, error: renderResult.error };
        }
      } catch (err) {
        updateProgressItem(progressId, PROGRESS_STATUS.FAILED, { error: err.message });
        return { success: false, beat, error: err.message };
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);

    // Process batch results
    for (const result of batchResults) {
      if (result.success) {
        renderSuccessCount++;
        renderResults.push(result);
        showNotification(`Rendered (${renderSuccessCount}/${renderTasks.length}): ${result.cleanBeatName}`, 'success');
      } else {
        renderFailCount++;
        showNotification(`Render failed: ${result.beat.name} - ${result.error}`, 'error');
      }
    }
  }

  if (renderResults.length === 0) {
    showNotification('All renders failed. Check image/audio files.', 'error');
    endProgressBatch();
    return;
  }

  showNotification(`Render complete: ${renderSuccessCount} success, ${renderFailCount} failed. Now uploading...`, 'info');

  // ====== PHASE 2: COPY + UPLOAD (Sequential for correct scheduling) ======
  let uploadSuccessCount = 0;
  let uploadFailCount = 0;

  for (const renderResult of renderResults) {
    const { beat, videoPath, cleanBeatName, progressId } = renderResult;

    // Update progress: uploading
    updateProgressItem(progressId, 'uploading', 80);

    try {
      // Get active template
      const activeTemplate = getActiveTemplate();
      let videoTitle = cleanBeatName;
      let videoDescription = '';
      let videoTags = [];

      if (activeTemplate) {
        if (activeTemplate.titleTemplate) {
          videoTitle = activeTemplate.titleTemplate.replace(/\[NAME\]/gi, cleanBeatName);
        }
        videoDescription = activeTemplate.description || '';
        videoTags = activeTemplate.tags || [];
      }

      // Calculate schedule date
      const schedulingSettings = getSchedulingSettings();
      let scheduleDate = null;

      if (schedulingSettings.autoSchedule) {
        const lastScheduleDate = await getLastScheduleDateForChannel(channel.id);

        if (lastScheduleDate) {
          const nextDate = new Date(lastScheduleDate);
          nextDate.setDate(nextDate.getDate() + (schedulingSettings.daysBetweenUploads || 1));
          scheduleDate = nextDate;
        } else {
          scheduleDate = new Date();
          scheduleDate.setDate(scheduleDate.getDate() + 1);
        }

        if (schedulingSettings.publishTime) {
          const [hours, minutes] = schedulingSettings.publishTime.split(':');
          scheduleDate.setHours(parseInt(hours) || 12, parseInt(minutes) || 0, 0, 0);
        }

        updateSessionScheduledDate(channel.id, scheduleDate);
      }

      // Copy to upload folder
      const copyResult = await ipcRenderer.invoke('copy-video-for-upload', {
        videoPath: videoPath,
        channelId: channel.id,
        metadata: {
          title: videoTitle,
          description: videoDescription,
          tags: videoTags,
          privacy: 'private',
          scheduleDate: scheduleDate ? scheduleDate.toISOString() : null
        }
      });

      if (!copyResult.success) {
        throw new Error(copyResult.error);
      }

      // Mark beat as last used
      pack.beats.forEach(b => b.lastUsed = false);
      beat.lastUsed = true;

      // Wait for upload and track
      const scheduleInfo = await waitForUploadComplete(videoTitle, channel.id);

      if (scheduleInfo) {
        const uploadInfo = {
          scheduleDate: scheduleInfo.publishAt || scheduleInfo.publishAtLA,
          videoId: scheduleInfo.videoId,
          channelName: channel.name,
          uploadedAt: new Date().toISOString()
        };

        youtubeState.uploadedBeats.add(videoTitle.toLowerCase());
        youtubeState.uploadedBeatsInfo.set(videoTitle.toLowerCase(), uploadInfo);
      }

      uploadSuccessCount++;
      let scheduleText = scheduleDate ? ` ${scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '';
      showNotification(`(${uploadSuccessCount}/${renderResults.length}) ${videoTitle} -> ${channel.name}${scheduleText}`, 'success');

      // Update progress: completed
      const scheduleDateStr = scheduleDate ? scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
      updateProgressItem(progressId, 'completed', 100, scheduleDateStr);

    } catch (error) {
      uploadFailCount++;
      showNotification(`Upload failed: ${cleanBeatName} - ${error.message}`, 'error');
      updateProgressItem(progressId, 'error', 0, null, error.message);
    }

    // Re-render pack detail to update UI
    if (currentPackId) {
      renderPackDetailBeats();
    }

    // Small delay between uploads
    await new Promise(r => setTimeout(r, 500));
  }

  saveData();

  // Final summary & finish progress tracking
  endProgressBatch();
  const serverNote = youtubeState.serverOnline ? '' : ' (Server offline - start server to upload)';
  showNotification(`Complete: ${uploadSuccessCount} uploaded, ${uploadFailCount + renderFailCount} failed${serverNote}`, uploadSuccessCount > 0 ? 'success' : 'error');

  // Refresh beats to update uploaded badges
  renderPackDetailBeats();
  renderBeats();
}

/**
 * Auto upload a single beat (from context menu)
 */
async function autoUploadSingleBeat() {
  if (!contextMenuTarget || !contextMenuTarget.beatPath || !contextMenuTarget.packId) {
    showNotification('No beat selected', 'error');
    return;
  }

  // Warn if server is offline but allow proceeding
  if (!youtubeState.serverOnline) {
    showNotification('Server offline - video will be queued in upload folder', 'info');
  }

  const beatPath = contextMenuTarget.beatPath;
  const packId = contextMenuTarget.packId;

  showNotification('Starting auto render & upload...', 'info');

  const result = await autoRenderAndUploadBeat(beatPath, packId);

  if (result.success) {
    const serverNote = youtubeState.serverOnline ? '' : ' (queued for upload)';
    showNotification(`${result.title}  ${result.channel}${serverNote}`, 'success');

    // Re-render pack detail to update UI
    if (currentPackId) {
      renderPackDetailBeats();
    }
    renderBeats();
  } else {
    showNotification(`Failed: ${result.error}`, 'error');
  }
}

/**
 * Auto upload 6 beats starting from the selected beat
 * Now uses global queue for multi-pack support
 */
async function autoUpload6FromHere() {
  if (!contextMenuTarget || !contextMenuTarget.beatPath || !contextMenuTarget.packId) {
    showNotification('No beat selected', 'error');
    return;
  }

  const packId = contextMenuTarget.packId;
  const startBeatPath = contextMenuTarget.beatPath;

  const pack = packs.find(p => p.id === packId);
  if (!pack) {
    showNotification('Pack not found', 'error');
    return;
  }

  // Find channel for this pack
  let channel = findChannelForPack(pack.name);
  if (!channel) {
    const packMatch = pack.name.match(/^C(\d+)/i);
    if (packMatch) {
      const channelNum = packMatch[1];
      channel = {
        id: `AccountA/channel${channelNum}`,
        name: pack.name,
        ready: true
      };
      showNotification(`Using fallback channel mapping for ${pack.name}`, 'info');
    } else {
      showNotification(`No channel found for pack "${pack.name}"`, 'error');
      return;
    }
  }

  // Find starting beat index
  const startIndex = pack.beats.findIndex(b => b.path === startBeatPath);
  if (startIndex === -1) {
    showNotification('Could not find selected beat in pack', 'error');
    return;
  }

  // Get 6 beats starting from the selected one (skip already uploaded)
  const beatsToQueue = [];
  for (let i = startIndex; i < pack.beats.length && beatsToQueue.length < 6; i++) {
    const beat = pack.beats[i];

    // Skip if already uploaded
    if (isBeatUploaded(beat.name)) continue;

    // Skip if no image assigned
    if (!beatImages[beat.path]) continue;

    // Skip if already in queue
    const alreadyQueued = globalUploadQueue.items.some(item =>
      item.beat.path === beat.path && !['completed', 'failed'].includes(item.status)
    );
    if (alreadyQueued) continue;

    beatsToQueue.push(beat);
  }

  if (beatsToQueue.length === 0) {
    showNotification('No valid beats to queue from this position (all uploaded or already queued)', 'info');
    return;
  }

  // Add to global queue
  const addedCount = addToGlobalQueue(beatsToQueue, pack, channel);

  showNotification(`Added ${addedCount} beats from "${pack.name}" to queue`, 'success');

  // Show queue status
  const totalQueued = globalUploadQueue.items.filter(i => i.status === 'queued').length;
  showNotification(`Total in queue: ${totalQueued} beats | Click "Start Queue" to process`, 'info');

  // Switch to Progress tab to show queue
  const progressTab = document.querySelector('.main-nav-tab[data-section="progress"]');
  if (progressTab) progressTab.click();
}

/**
 * Legacy function - still works for single pack auto upload with immediate processing
 */
async function autoUpload6FromHereLegacy() {
  // Clear session scheduled dates when starting new batch
  clearSessionScheduledDates();

  if (!contextMenuTarget || !contextMenuTarget.beatPath || !contextMenuTarget.packId) {
    showNotification('No beat selected', 'error');
    return;
  }

  const packId = contextMenuTarget.packId;
  const startBeatPath = contextMenuTarget.beatPath;

  const pack = packs.find(p => p.id === packId);
  if (!pack) {
    showNotification('Pack not found', 'error');
    return;
  }

  // Find channel for this pack
  let channel = findChannelForPack(pack.name);
  if (!channel) {
    const packMatch = pack.name.match(/^C(\d+)/i);
    if (packMatch) {
      const channelNum = packMatch[1];
      channel = {
        id: `AccountA/channel${channelNum}`,
        name: pack.name,
        ready: true
      };
      showNotification(`Using fallback channel mapping for ${pack.name}`, 'info');
    } else {
      showNotification(`No channel found for pack "${pack.name}"`, 'error');
      return;
    }
  }

  // Find starting beat index
  const startIndex = pack.beats.findIndex(b => b.path === startBeatPath);
  if (startIndex === -1) {
    showNotification('Could not find selected beat in pack', 'error');
    return;
  }

  // Get 6 beats starting from the selected one (skip already uploaded)
  const beatsToUpload = [];
  for (let i = startIndex; i < pack.beats.length && beatsToUpload.length < 6; i++) {
    const beat = pack.beats[i];

    // Skip if already uploaded
    if (isBeatUploaded(beat.name)) continue;

    // Skip if no image assigned
    if (!beatImages[beat.path]) continue;

    beatsToUpload.push(beat);
  }

  if (beatsToUpload.length === 0) {
    showNotification('No valid beats to upload from this position', 'error');
    return;
  }

  // Warn if server is offline
  if (!youtubeState.serverOnline) {
    showNotification('Server offline - videos will be queued', 'info');
  }

  // Start progress tracking for 6FromHere
  startProgressBatch(beatsToUpload.length, channel.name);
  const progressIds6 = {};

  // Add all items to progress tracker
  beatsToUpload.forEach(beat => {
    const beatNameWithoutExt = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
    const cleanBeatName = extractBeatName(beatNameWithoutExt);
    progressIds6[beat.path] = addProgressItem(cleanBeatName, channel.name);
  });

  showNotification(`Starting batch render of ${beatsToUpload.length} beats...`, 'info');

  // ====== PHASE 1: BATCH RENDER (Parallel) ======
  const CONCURRENT_RENDERS = 3;
  const renderResults = [];
  let renderSuccessCount = 0;
  let renderFailCount = 0;

  // Prepare render tasks
  const renderTasks = beatsToUpload.map((beat, index) => ({
    beat,
    index,
    imagePath: beatImages[beat.path]
  }));

  // Process renders in batches (autoUpload6FromHere)
  for (let i = 0; i < renderTasks.length; i += CONCURRENT_RENDERS) {
    const batch = renderTasks.slice(i, i + CONCURRENT_RENDERS);

    showNotification(`Rendering batch ${Math.floor(i/CONCURRENT_RENDERS) + 1}/${Math.ceil(renderTasks.length/CONCURRENT_RENDERS)} (${batch.length} videos)...`, 'info');

    const batchPromises = batch.map(async (task) => {
      const { beat, imagePath } = task;
      const progressId6 = progressIds6[beat.path];

      if (!imagePath) {
        updateProgressItem(progressId6, PROGRESS_STATUS.FAILED, { error: 'No image assigned' });
        return { success: false, beat, error: 'No image assigned' };
      }

      const beatNameWithoutExt = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
      const cleanBeatName = extractBeatName(beatNameWithoutExt);

      // Update progress: rendering
      updateProgressItem(progressId6, PROGRESS_STATUS.RENDERING);

      try {
        const renderResult = await ipcRenderer.invoke('render-video', {
          imagePath: imagePath,
          audioPath: beat.path,
          outputName: cleanBeatName,
          resolution: '1080'
        });

        if (renderResult.success) {
          updateProgressItem(progressId6, PROGRESS_STATUS.UPLOADING);
          return { success: true, beat, videoPath: renderResult.outputPath, cleanBeatName, progressId: progressId6 };
        } else {
          updateProgressItem(progressId6, PROGRESS_STATUS.FAILED, { error: renderResult.error });
          return { success: false, beat, error: renderResult.error };
        }
      } catch (err) {
        updateProgressItem(progressId6, PROGRESS_STATUS.FAILED, { error: err.message });
        return { success: false, beat, error: err.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.success) {
        renderSuccessCount++;
        renderResults.push(result);
        showNotification(`Rendered (${renderSuccessCount}/${renderTasks.length}): ${result.cleanBeatName}`, 'success');
      } else {
        renderFailCount++;
        showNotification(`Render failed: ${result.beat.name} - ${result.error}`, 'error');
      }
    }
  }

  if (renderResults.length === 0) {
    showNotification('All renders failed', 'error');
    endProgressBatch();
    return;
  }

  showNotification(`Render complete: ${renderSuccessCount} success. Now uploading...`, 'info');

  // ====== PHASE 2: COPY + UPLOAD (Sequential) ======
  let uploadSuccessCount = 0;
  let uploadFailCount = 0;

  for (const renderResult of renderResults) {
    const { beat, videoPath, cleanBeatName, progressId } = renderResult;

    // Update progress: uploading
    updateProgressItem(progressId, PROGRESS_STATUS.UPLOADING);

    try {
      const activeTemplate = getActiveTemplate();
      let videoTitle = cleanBeatName;
      let videoDescription = '';
      let videoTags = [];

      if (activeTemplate) {
        if (activeTemplate.titleTemplate) {
          videoTitle = activeTemplate.titleTemplate.replace(/\[NAME\]/gi, cleanBeatName);
        }
        videoDescription = activeTemplate.description || '';
        videoTags = activeTemplate.tags || [];
      }

      const schedulingSettings = getSchedulingSettings();
      let scheduleDate = null;

      if (schedulingSettings.autoSchedule) {
        const lastScheduleDate = await getLastScheduleDateForChannel(channel.id);

        if (lastScheduleDate) {
          const nextDate = new Date(lastScheduleDate);
          nextDate.setDate(nextDate.getDate() + (schedulingSettings.daysBetweenUploads || 1));
          scheduleDate = nextDate;
        } else {
          scheduleDate = new Date();
          scheduleDate.setDate(scheduleDate.getDate() + 1);
        }

        if (schedulingSettings.publishTime) {
          const [hours, minutes] = schedulingSettings.publishTime.split(':');
          scheduleDate.setHours(parseInt(hours) || 12, parseInt(minutes) || 0, 0, 0);
        }

        updateSessionScheduledDate(channel.id, scheduleDate);
      }

      const copyResult = await ipcRenderer.invoke('copy-video-for-upload', {
        videoPath: videoPath,
        channelId: channel.id,
        metadata: {
          title: videoTitle,
          description: videoDescription,
          tags: videoTags,
          privacy: 'private',
          scheduleDate: scheduleDate ? scheduleDate.toISOString() : null
        }
      });

      if (!copyResult.success) {
        throw new Error(copyResult.error);
      }

      pack.beats.forEach(b => b.lastUsed = false);
      beat.lastUsed = true;

      const scheduleInfo = await waitForUploadComplete(videoTitle, channel.id);

      if (scheduleInfo) {
        youtubeState.uploadedBeats.add(videoTitle.toLowerCase());
        youtubeState.uploadedBeatsInfo.set(videoTitle.toLowerCase(), {
          scheduleDate: scheduleInfo.publishAt || scheduleInfo.publishAtLA,
          videoId: scheduleInfo.videoId,
          channelName: channel.name,
          uploadedAt: new Date().toISOString()
        });
      }

      uploadSuccessCount++;
      let scheduleText = scheduleDate ? ` ${scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '';
      showNotification(`(${uploadSuccessCount}/${renderResults.length}) ${videoTitle}${scheduleText}`, 'success');

      // Update progress: completed
      const scheduleDateStr = scheduleDate ? scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
      updateProgressItem(progressId, PROGRESS_STATUS.COMPLETED, { scheduleDate: scheduleDateStr });

    } catch (error) {
      uploadFailCount++;
      showNotification(`Upload failed: ${cleanBeatName} - ${error.message}`, 'error');
      updateProgressItem(progressId, PROGRESS_STATUS.FAILED, { error: error.message });
    }

    if (currentPackId) {
      renderPackDetailBeats();
    }

    await new Promise(r => setTimeout(r, 500));
  }

  saveData();

  // Final summary & finish progress tracking
  endProgressBatch();
  const serverNote = youtubeState.serverOnline ? '' : ' (queued for upload)';
  showNotification(`Completed: ${uploadSuccessCount} success, ${uploadFailCount + renderFailCount} failed${serverNote}`,
    uploadFailCount + renderFailCount > 0 ? 'warning' : 'success');

  // Refresh UI
  if (currentPackId) {
    renderPackDetailBeats();
  }
  renderBeats();
}

// Initialize auto upload button
const autoUpload6Btn = document.getElementById('auto-upload-6-btn');
if (autoUpload6Btn) {
  autoUpload6Btn.addEventListener('click', () => autoUploadNextBeats(6));
}

// Initialize auto upload context menu item
const autoUploadBeatBtn = document.getElementById('auto-upload-beat');
if (autoUploadBeatBtn) {
  autoUploadBeatBtn.addEventListener('click', () => {
    autoUploadSingleBeat();
    hideContextMenu();
  });
}

// Initialize auto upload 6 from here context menu item
const autoUpload6FromHereBtn = document.getElementById('auto-upload-6-from-here');
if (autoUpload6FromHereBtn) {
  autoUpload6FromHereBtn.addEventListener('click', () => {
    autoUpload6FromHere();
    hideContextMenu();
  });
}
