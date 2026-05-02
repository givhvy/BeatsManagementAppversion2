// Check if running in Electron or browser
const isElectron = typeof require !== 'undefined' && typeof require('electron') !== 'undefined';
const ipcRenderer = isElectron ? require('electron').ipcRenderer : null;
const nodeFs = isElectron ? require('fs') : null;
const nodePath = isElectron ? require('path') : null;

// =============================================
// THEME MANAGEMENT
// =============================================
const themeManager = {
  STORAGE_KEY: 'bms-theme',
  COLOR_SCHEME_KEY: 'bms-color-scheme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY) || 'default';
    this.apply(saved);

    const savedScheme = localStorage.getItem(this.COLOR_SCHEME_KEY) || 'dark';
    this.applyColorScheme(savedScheme);

    this.bindEvents();
  },

  apply(themeName) {
    if (themeName === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
    }
    localStorage.setItem(this.STORAGE_KEY, themeName);
    this.updateCards(themeName);
  },

  updateCards(themeName) {
    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('active', card.dataset.theme === themeName);
    });
  },

  applyColorScheme(scheme) {
    if (scheme === 'light') {
      document.documentElement.setAttribute('data-colorscheme', 'light');
    } else {
      document.documentElement.removeAttribute('data-colorscheme');
    }
    localStorage.setItem(this.COLOR_SCHEME_KEY, scheme);
    this.updateCSCards(scheme);
  },

  updateCSCards(scheme) {
    document.querySelectorAll('.cs-card').forEach(card => {
      card.classList.toggle('active', card.dataset.scheme === scheme);
    });
  },

  bindEvents() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('close-settings-btn');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
      });
    }

    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          settingsModal.style.display = 'none';
        }
      });
    }

    document.getElementById('window-minimize-btn')?.addEventListener('click', () => {
      ipcRenderer?.invoke('window-control', 'minimize');
    });

    document.getElementById('window-maximize-btn')?.addEventListener('click', () => {
      ipcRenderer?.invoke('window-control', 'maximize');
    });

    document.getElementById('window-close-btn')?.addEventListener('click', () => {
      ipcRenderer?.invoke('window-control', 'close');
    });

    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        this.apply(card.dataset.theme);
      });
    });

    document.querySelectorAll('.cs-card').forEach(card => {
      card.addEventListener('click', () => {
        this.applyColorScheme(card.dataset.scheme);
      });
    });
  }
};

// Initialize theme on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => themeManager.init());
} else {
  themeManager.init();
}

// =============================================
// NOTIFICATION SOUND
// =============================================
const notificationSound = {
  audioContext: null,

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  // Play success sound (pleasant chime)
  playSuccess() {
    this.init();
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Two-tone chime
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    });
  },

  // Play completion sound (triumphant fanfare)
  playComplete() {
    this.init();
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Three-tone fanfare
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.4);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  },

  // Play error sound
  playError() {
    this.init();
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 200;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
};

// =============================================
// UPLOAD PROGRESS TRACKING STATE
// =============================================
const uploadProgress = {
  items: [], // Array of {id, name, channel, status, scheduleDate, error, startTime}
  currentBatch: null, // {total, completed, channelName}
  renderingCount: 0,
  uploadingCount: 0,
  completedCount: 0,
  failedCount: 0
};

// Progress status types
const PROGRESS_STATUS = {
  QUEUED: 'queued',
  RENDERING: 'rendering',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// =============================================
// GLOBAL UPLOAD QUEUE MANAGER (Multi-Pack Support)
// =============================================
const globalUploadQueue = {
  items: [], // All queued items from all packs: {id, beat, pack, channel, imagePath, status, progressId}
  isProcessing: false,
  isPaused: false,

  // Scheduling cache per channel to prevent conflicts
  channelScheduleCache: new Map(), // channelId -> lastScheduleDate

  // Stats
  totalQueued: 0,
  totalProcessed: 0,

  // Batch settings
  CONCURRENT_RENDERS: 3,
  CONCURRENT_UPLOADS: 1, // Keep sequential for scheduling accuracy
};

/**
 * Add beats to global queue from a pack
 * Can be called multiple times for different packs
 */
function addToGlobalQueue(beats, pack, channel) {
  const newItems = beats.map(beat => ({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    beat: beat,
    pack: pack,
    channel: channel,
    imagePath: beatImages[beat.path],
    status: 'queued', // queued, rendering, rendered, uploading, completed, failed
    progressId: null,
    videoPath: null,
    cleanBeatName: null,
    error: null
  }));

  globalUploadQueue.items.push(...newItems);
  globalUploadQueue.totalQueued += newItems.length;

  // Add to progress tracker
  newItems.forEach(item => {
    const beatNameWithoutExt = item.beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
    item.cleanBeatName = extractBeatName(beatNameWithoutExt);
    item.progressId = addProgressItem(item.cleanBeatName, item.channel.name);
  });

  updateGlobalQueueUI();

  return newItems.length;
}

/**
 * Start processing the global queue
 */
async function startGlobalQueueProcessing() {
  if (globalUploadQueue.isProcessing) {
    showNotification('Queue is already processing', 'info');
    return;
  }

  if (globalUploadQueue.items.length === 0) {
    showNotification('Queue is empty', 'info');
    return;
  }

  globalUploadQueue.isProcessing = true;
  globalUploadQueue.isPaused = false;
  updateGlobalQueueUI();

  // Switch to Progress tab
  const progressTab = document.querySelector('.main-nav-tab[data-section="progress"]');
  if (progressTab) progressTab.click();

  const queuedItems = globalUploadQueue.items.filter(i => i.status === 'queued');

  showNotification(`Starting queue processing: ${queuedItems.length} beats`, 'info');

  // ====== PHASE 1: BATCH RENDER (Parallel) ======
  await processRenderPhase();

  if (globalUploadQueue.isPaused) {
    showNotification('Queue paused after render phase', 'info');
    return;
  }

  // ====== PHASE 2: BATCH UPLOAD (Sequential per channel for scheduling) ======
  await processUploadPhase();

  globalUploadQueue.isProcessing = false;
  updateGlobalQueueUI();

  // Final summary
  const completed = globalUploadQueue.items.filter(i => i.status === 'completed').length;
  const failed = globalUploadQueue.items.filter(i => i.status === 'failed').length;
  showNotification(`Queue complete! ${completed} uploaded, ${failed} failed`, completed > 0 ? 'success' : 'error');

  // Play completion sound
  if (completed > 0) {
    notificationSound.playComplete();
  } else {
    notificationSound.playError();
  }

  // Refresh UI
  renderPackDetailBeats();
  renderBeats();
  saveData();
}

/**
 * Process render phase - renders all queued items in parallel batches
 */
async function processRenderPhase() {
  const toRender = globalUploadQueue.items.filter(i => i.status === 'queued');

  if (toRender.length === 0) return;

  showNotification(`Rendering ${toRender.length} videos...`, 'info');

  // Process in batches
  for (let i = 0; i < toRender.length; i += globalUploadQueue.CONCURRENT_RENDERS) {
    if (globalUploadQueue.isPaused) break;

    const batch = toRender.slice(i, i + globalUploadQueue.CONCURRENT_RENDERS);
    const batchNum = Math.floor(i / globalUploadQueue.CONCURRENT_RENDERS) + 1;
    const totalBatches = Math.ceil(toRender.length / globalUploadQueue.CONCURRENT_RENDERS);

    showNotification(`Render batch ${batchNum}/${totalBatches} (${batch.length} videos)...`, 'info');

    const batchPromises = batch.map(async (item) => {
      if (!item.imagePath) {
        item.status = 'failed';
        item.error = 'No image assigned';
        updateProgressItem(item.progressId, PROGRESS_STATUS.FAILED, { error: 'No image assigned' });
        return;
      }

      item.status = 'rendering';
      updateProgressItem(item.progressId, PROGRESS_STATUS.RENDERING);

      try {
        const renderResult = await ipcRenderer.invoke('render-video', {
          imagePath: item.imagePath,
          audioPath: item.beat.path,
          outputName: item.cleanBeatName,
          resolution: '1080'
        });

        if (renderResult.success) {
          item.status = 'rendered';
          item.videoPath = renderResult.outputPath;
          showNotification(`Rendered: ${item.cleanBeatName}`, 'success');
        } else {
          item.status = 'failed';
          item.error = renderResult.error;
          updateProgressItem(item.progressId, PROGRESS_STATUS.FAILED, { error: renderResult.error });
        }
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
        updateProgressItem(item.progressId, PROGRESS_STATUS.FAILED, { error: err.message });
      }
    });

    await Promise.all(batchPromises);
    updateGlobalQueueUI();
  }

  const rendered = globalUploadQueue.items.filter(i => i.status === 'rendered').length;
  const failed = globalUploadQueue.items.filter(i => i.status === 'failed').length;
  showNotification(`Render complete: ${rendered} success, ${failed} failed`, 'info');
}

/**
 * Process upload phase - uploads sequentially per channel for correct scheduling
 */
async function processUploadPhase() {
  const toUpload = globalUploadQueue.items.filter(i => i.status === 'rendered');

  if (toUpload.length === 0) return;

  showNotification(`Uploading ${toUpload.length} videos...`, 'info');

  // Group by channel for sequential scheduling
  const byChannel = new Map();
  toUpload.forEach(item => {
    const channelId = item.channel.id;
    if (!byChannel.has(channelId)) {
      byChannel.set(channelId, []);
    }
    byChannel.get(channelId).push(item);
  });

  // Process all channels in parallel, but items within each channel sequentially
  const channelPromises = Array.from(byChannel.entries()).map(async ([channelId, items]) => {
    for (const item of items) {
      if (globalUploadQueue.isPaused) break;

      item.status = 'uploading';
      updateProgressItem(item.progressId, PROGRESS_STATUS.UPLOADING);

      try {
        // Get active template
        const activeTemplate = getActiveTemplate();
        let videoTitle = item.cleanBeatName;
        let videoDescription = '';
        let videoTags = [];

        if (activeTemplate) {
          if (activeTemplate.titleTemplate) {
            videoTitle = activeTemplate.titleTemplate.replace(/\[NAME\]/gi, item.cleanBeatName);
          }
          videoDescription = activeTemplate.description || '';
          videoTags = activeTemplate.tags || [];
        }

        // Calculate schedule date using global cache
        const schedulingSettings = getSchedulingSettings();
        let scheduleDate = null;

        if (schedulingSettings.autoSchedule) {
          // Check cache first, then fall back to server
          let lastScheduleDate = globalUploadQueue.channelScheduleCache.get(channelId);

          if (!lastScheduleDate) {
            lastScheduleDate = await getLastScheduleDateForChannel(channelId);
          }

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

          // Update cache for next item in this channel
          globalUploadQueue.channelScheduleCache.set(channelId, scheduleDate);
        }

        // Copy to upload folder
        const copyResult = await ipcRenderer.invoke('copy-video-for-upload', {
          videoPath: item.videoPath,
          channelId: channelId,
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
        item.pack.beats.forEach(b => b.lastUsed = false);
        item.beat.lastUsed = true;

        // Wait for upload and track
        const scheduleInfo = await waitForUploadComplete(videoTitle, channelId);

        if (scheduleInfo) {
          youtubeState.uploadedBeats.add(videoTitle.toLowerCase());
          youtubeState.uploadedBeatsInfo.set(videoTitle.toLowerCase(), {
            scheduleDate: scheduleInfo.publishAt || scheduleInfo.publishAtLA,
            videoId: scheduleInfo.videoId,
            channelName: item.channel.name,
            uploadedAt: new Date().toISOString()
          });
        }

        item.status = 'completed';
        const scheduleDateStr = scheduleDate ? scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
        updateProgressItem(item.progressId, PROGRESS_STATUS.COMPLETED, { scheduleDate: scheduleDateStr });

        showNotification(`${videoTitle}  ${item.channel.name} ${scheduleDateStr || 'Now'}`, 'success');
        notificationSound.playSuccess(); // Play success sound

      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
        updateProgressItem(item.progressId, PROGRESS_STATUS.FAILED, { error: error.message });
        showNotification(`Upload failed: ${item.cleanBeatName} - ${error.message}`, 'error');
        notificationSound.playError(); // Play error sound
      }

      updateGlobalQueueUI();

      // Small delay between uploads to same channel
      await new Promise(r => setTimeout(r, 300));
    }
  });

  await Promise.all(channelPromises);
}

/**
 * Pause global queue processing
 */
function pauseGlobalQueue() {
  globalUploadQueue.isPaused = true;
  showNotification('Queue paused', 'info');
  updateGlobalQueueUI();
}

/**
 * Resume global queue processing
 */
function resumeGlobalQueue() {
  if (!globalUploadQueue.isPaused) return;

  globalUploadQueue.isPaused = false;
  showNotification('Queue resumed', 'info');

  // Continue processing
  if (globalUploadQueue.isProcessing) {
    // Already in a processing loop, it will continue
  } else {
    startGlobalQueueProcessing();
  }

  updateGlobalQueueUI();
}

/**
 * Clear global queue (only items not being processed)
 */
function clearGlobalQueue() {
  const activeStatuses = ['rendering', 'uploading'];
  globalUploadQueue.items = globalUploadQueue.items.filter(i => activeStatuses.includes(i.status));
  globalUploadQueue.channelScheduleCache.clear();

  showNotification('Queue cleared', 'info');
  updateGlobalQueueUI();
}

/**
 * Update global queue UI elements
 */
function updateGlobalQueueUI() {
  const queueCountEl = document.getElementById('global-queue-count');
  const queueStatusEl = document.getElementById('global-queue-status');
  const startQueueBtn = document.getElementById('start-queue-btn');
  const pauseQueueBtn = document.getElementById('pause-queue-btn');
  const clearQueueBtn = document.getElementById('clear-queue-btn');

  const queued = globalUploadQueue.items.filter(i => i.status === 'queued').length;
  const rendering = globalUploadQueue.items.filter(i => i.status === 'rendering').length;
  const rendered = globalUploadQueue.items.filter(i => i.status === 'rendered').length;
  const uploading = globalUploadQueue.items.filter(i => i.status === 'uploading').length;
  const completed = globalUploadQueue.items.filter(i => i.status === 'completed').length;
  const failed = globalUploadQueue.items.filter(i => i.status === 'failed').length;

  if (queueCountEl) {
    queueCountEl.textContent = `${queued} queued | ${rendering} rendering | ${uploading} uploading | ${completed} done | ${failed} failed`;
  }

  if (queueStatusEl) {
    if (globalUploadQueue.isPaused) {
      queueStatusEl.textContent = 'Paused';
      queueStatusEl.className = 'queue-status paused';
    } else if (globalUploadQueue.isProcessing) {
      queueStatusEl.textContent = 'Processing...';
      queueStatusEl.className = 'queue-status processing';
    } else {
      queueStatusEl.textContent = queued > 0 ? 'Ready' : 'Idle';
      queueStatusEl.className = 'queue-status idle';
    }
  }

  // Update button states
  if (startQueueBtn) {
    startQueueBtn.disabled = globalUploadQueue.isProcessing || queued === 0;
    startQueueBtn.innerHTML = globalUploadQueue.isPaused
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="5 3 19 12 5 21 5 3"/></svg>Resume`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Start Queue`;
  }
  if (pauseQueueBtn) {
    pauseQueueBtn.disabled = !globalUploadQueue.isProcessing || globalUploadQueue.isPaused;
  }
  if (clearQueueBtn) {
    clearQueueBtn.disabled = globalUploadQueue.items.length === 0;
  }

  // Update progress badge
  updateProgressBadge();
}
