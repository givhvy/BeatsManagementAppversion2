// =============================================
// UPLOAD PROGRESS TRACKING FUNCTIONS
// =============================================

/**
 * Add item to progress tracker
 */
function addProgressItem(name, channelName) {
  const item = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    name: name,
    channel: channelName,
    status: PROGRESS_STATUS.QUEUED,
    scheduleDate: null,
    error: null,
    startTime: new Date()
  };

  uploadProgress.items.unshift(item);
  updateProgressUI();
  updateProgressBadge();

  return item.id;
}

/**
 * Update progress item status
 */
function updateProgressItem(id, status, extraData = {}) {
  const item = uploadProgress.items.find(i => i.id === id);
  if (!item) return;

  const oldStatus = item.status;
  item.status = status;

  if (extraData.scheduleDate) item.scheduleDate = extraData.scheduleDate;
  if (extraData.error) item.error = extraData.error;
  if (extraData.videoId) item.videoId = extraData.videoId;

  // Update counts
  if (oldStatus === PROGRESS_STATUS.RENDERING) uploadProgress.renderingCount--;
  if (oldStatus === PROGRESS_STATUS.UPLOADING) uploadProgress.uploadingCount--;

  if (status === PROGRESS_STATUS.RENDERING) uploadProgress.renderingCount++;
  if (status === PROGRESS_STATUS.UPLOADING) uploadProgress.uploadingCount++;
  if (status === PROGRESS_STATUS.COMPLETED) uploadProgress.completedCount++;
  if (status === PROGRESS_STATUS.FAILED) uploadProgress.failedCount++;

  updateProgressUI();
  updateProgressBadge();

  // Check if batch is complete
  checkBatchComplete();
}

/**
 * Start a new batch
 */
function startProgressBatch(total, channelName) {
  uploadProgress.currentBatch = {
    total: total,
    completed: 0,
    channelName: channelName
  };

  // Switch to Progress tab automatically
  const progressTab = document.querySelector('.main-nav-tab[data-section="progress"]');
  if (progressTab) {
    progressTab.click();
  }

  updateProgressUI();
}

/**
 * Increment batch progress
 */
function incrementBatchProgress() {
  if (uploadProgress.currentBatch) {
    uploadProgress.currentBatch.completed++;
    updateProgressUI();
  }
}

/**
 * End current batch
 */
function endProgressBatch() {
  uploadProgress.currentBatch = null;
  updateProgressUI();
}

/**
 * Check if batch is complete and show notification
 */
function checkBatchComplete() {
  if (!uploadProgress.currentBatch) return;

  const batch = uploadProgress.currentBatch;
  if (batch.completed >= batch.total) {
    // All done!
    showNotification(`Batch complete! ${uploadProgress.completedCount} uploaded to ${batch.channelName}`, 'success');

    // Flash the progress tab
    const progressTab = document.querySelector('[data-section="progress"]');
    if (progressTab) {
      progressTab.classList.add('flash-complete');
      setTimeout(() => progressTab.classList.remove('flash-complete'), 3000);
    }

    endProgressBatch();
  }
}

/**
 * Update progress badge on tab
 */
function updateProgressBadge() {
  const badge = document.getElementById('progress-badge');
  if (!badge) return;

  const activeCount = uploadProgress.renderingCount + uploadProgress.uploadingCount;

  if (activeCount > 0) {
    badge.textContent = activeCount;
    badge.style.display = 'inline';
    badge.classList.add('active');
  } else {
    badge.style.display = 'none';
    badge.classList.remove('active');
  }
}

/**
 * Update all progress UI elements
 */
function updateProgressUI() {
  // Update summary counts
  const renderingCountEl = document.getElementById('rendering-count');
  const uploadingCountEl = document.getElementById('uploading-count');
  const completedCountEl = document.getElementById('completed-count');
  const failedCountEl = document.getElementById('failed-count');

  if (renderingCountEl) renderingCountEl.textContent = uploadProgress.renderingCount;
  if (uploadingCountEl) uploadingCountEl.textContent = uploadProgress.uploadingCount;
  if (completedCountEl) completedCountEl.textContent = uploadProgress.completedCount;
  if (failedCountEl) failedCountEl.textContent = uploadProgress.failedCount;

  // Update batch info
  const batchInfo = document.getElementById('current-batch-info');
  const batchProgressText = document.getElementById('batch-progress-text');
  const batchProgressFill = document.getElementById('batch-progress-fill');
  const batchChannelName = document.getElementById('batch-channel-name');

  if (uploadProgress.currentBatch) {
    if (batchInfo) batchInfo.style.display = 'block';
    if (batchProgressText) {
      batchProgressText.textContent = `${uploadProgress.currentBatch.completed}/${uploadProgress.currentBatch.total}`;
    }
    if (batchProgressFill) {
      const percent = (uploadProgress.currentBatch.completed / uploadProgress.currentBatch.total) * 100;
      batchProgressFill.style.width = `${percent}%`;
    }
    if (batchChannelName) {
      batchChannelName.textContent = `Channel: ${uploadProgress.currentBatch.channelName}`;
    }
  } else {
    if (batchInfo) batchInfo.style.display = 'none';
  }

  // Update progress list
  renderProgressList();
}

/**
 * Render progress items list
 */
function renderProgressList() {
  const listEl = document.getElementById('progress-list');
  const emptyEl = document.getElementById('progress-empty');

  if (!listEl) return;

  if (uploadProgress.items.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    listEl.innerHTML = '';
    listEl.appendChild(emptyEl);
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = uploadProgress.items.map(item => {
    const statusClass = item.status;
    const statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);

    let scheduleText = '--';
    if (item.scheduleDate) {
      // scheduleDate is already a formatted string like "Dec 5"
      scheduleText = item.scheduleDate;
    }

    let errorText = '';
    if (item.error) {
      errorText = `<div class="progress-item-error" title="${item.error}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:3px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${item.error.substring(0, 30)}${item.error.length > 30 ? '...' : ''}</div>`;
    }

    return `
      <div class="progress-item ${statusClass}" data-id="${item.id}">
        <div class="progress-item-name" title="${item.name}">${item.name}</div>
        <div class="progress-item-channel">${item.channel}</div>
        <div class="progress-item-status">
          <span class="status-dot ${statusClass}"></span>
          <span class="status-text ${statusClass}">${statusText}</span>
        </div>
        <div class="progress-item-schedule ${item.scheduleDate ? 'has-date' : ''}">${scheduleText}</div>
        ${errorText}
      </div>
    `;
  }).join('');
}

/**
 * Clear completed items from progress
 */
function clearCompletedProgress() {
  uploadProgress.items = uploadProgress.items.filter(item =>
    item.status !== PROGRESS_STATUS.COMPLETED && item.status !== PROGRESS_STATUS.FAILED
  );
  uploadProgress.completedCount = 0;
  uploadProgress.failedCount = 0;
  updateProgressUI();
  updateProgressBadge();
}

/**
 * Clear all progress items
 */
function clearAllProgress() {
  uploadProgress.items = [];
  uploadProgress.renderingCount = 0;
  uploadProgress.uploadingCount = 0;
  uploadProgress.completedCount = 0;
  uploadProgress.failedCount = 0;
  uploadProgress.currentBatch = null;
  updateProgressUI();
  updateProgressBadge();
}

// Initialize progress buttons
document.addEventListener('DOMContentLoaded', () => {
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const clearAllBtn = document.getElementById('clear-all-progress-btn');

  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', clearCompletedProgress);
  }
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllProgress);
  }

  // Initialize global queue control buttons
  const startQueueBtn = document.getElementById('start-queue-btn');
  const pauseQueueBtn = document.getElementById('pause-queue-btn');
  const clearQueueBtn = document.getElementById('clear-queue-btn');

  if (startQueueBtn) {
    startQueueBtn.addEventListener('click', () => {
      if (globalUploadQueue.isPaused) {
        resumeGlobalQueue();
      } else {
        startGlobalQueueProcessing();
      }
    });
  }
  if (pauseQueueBtn) {
    pauseQueueBtn.addEventListener('click', pauseGlobalQueue);
  }
  if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
      if (confirm('Clear all queued items?')) {
        clearGlobalQueue();
        clearAllProgress();
      }
    });
  }

  // Initialize Batch Upload Channels Modal
  initBatchUploadModal();

  // Initial UI update
  updateGlobalQueueUI();

  // Check Ollama status on startup so nav widget reflects state immediately
  checkOllamaStatus();
});

// =============================================
// BATCH UPLOAD CHANNELS MODAL
// =============================================

let batchUploadState = {
  selectedChannels: new Set(),
  channelData: [] // [{pack, channel, availableBeats}]
};

function initBatchUploadModal() {
  const batchUploadBtn = document.getElementById('batch-upload-channels-btn');
  const closeBtn = document.getElementById('close-batch-upload-modal-btn');
  const cancelBtn = document.getElementById('cancel-batch-upload-btn');
  const confirmBtn = document.getElementById('confirm-batch-upload-btn');
  const selectAllBtn = document.getElementById('batch-select-all-btn');
  const deselectAllBtn = document.getElementById('batch-deselect-all-btn');

  if (batchUploadBtn) {
    batchUploadBtn.addEventListener('click', openBatchUploadModal);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBatchUploadModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeBatchUploadModal);
  }
  if (confirmBtn) {
    confirmBtn.addEventListener('click', executeBatchUpload);
  }
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', batchSelectAll);
  }
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', batchDeselectAll);
  }
}

function openBatchUploadModal() {
  const modal = document.getElementById('batch-upload-modal');
  if (!modal) return;

  // Reset state
  batchUploadState.selectedChannels.clear();
  batchUploadState.channelData = [];

  // Populate channels from visible packs
  populateBatchChannels();

  modal.style.display = 'flex';
}

function closeBatchUploadModal() {
  const modal = document.getElementById('batch-upload-modal');
  if (modal) modal.style.display = 'none';
}

function populateBatchChannels() {
  const grid = document.getElementById('batch-channels-grid');
  if (!grid) return;

  // Get visible (non-hidden) packs
  const visiblePacks = packs.filter(p => !p.hidden);

  if (visiblePacks.length === 0) {
    grid.innerHTML = '<div class="loading-channels">No visible packs found</div>';
    return;
  }

  batchUploadState.channelData = [];

  // Build channel data for each pack
  visiblePacks.forEach(pack => {
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
      }
    }

    if (!channel) return;

    // Find last used beat index
    const lastUsedIndex = pack.beats.findIndex(b => b.lastUsed);
    const startIndex = lastUsedIndex >= 0 ? lastUsedIndex + 1 : 0;

    // Calculate remaining beats after last used
    const remainingBeatsCount = pack.beats.length - startIndex;

    // Count available beats (after last used, not uploaded, has image)
    let availableCount = 0;
    const availableBeats = [];

    for (let i = startIndex; i < pack.beats.length && availableBeats.length < 6; i++) {
      const beat = pack.beats[i];

      // Skip if already uploaded
      if (isBeatUploaded(beat.name)) continue;

      // Skip if no image
      if (!beatImages[beat.path]) continue;

      // Skip if already in global queue
      const alreadyQueued = globalUploadQueue.items.some(item =>
        item.beat.path === beat.path && !['completed', 'failed'].includes(item.status)
      );
      if (alreadyQueued) continue;

      availableBeats.push(beat);
      availableCount++;
    }

    batchUploadState.channelData.push({
      pack: pack,
      channel: channel,
      availableBeats: availableBeats,
      availableCount: availableCount,
      lastUsedIndex: lastUsedIndex,
      totalBeats: pack.beats.length,
      remainingBeats: remainingBeatsCount
    });
  });

  // Sort by pack name (C1, C2, C3...)
  batchUploadState.channelData.sort((a, b) => {
    const numA = parseInt(a.pack.name.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.pack.name.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  // Render channel cards
  grid.innerHTML = batchUploadState.channelData.map((data, index) => {
    const isDisabled = data.availableCount === 0;
    const disabledClass = isDisabled ? 'disabled' : '';
    const beatsClass = data.availableCount === 0 ? 'none' : '';

    // Show remaining vs available (to explain why some beats aren't available)
    const remainingInfo = data.remainingBeats > data.availableCount
      ? `<div class="beats-note">(${data.remainingBeats - data.availableCount} need images)</div>`
      : '';

    return `
      <div class="batch-channel-card ${disabledClass}"
           data-index="${index}"
           data-pack-id="${data.pack.id}"
           ${isDisabled ? '' : 'onclick="toggleBatchChannel(this)"'}>
        <div class="check-indicator">${isDisabled ? '' : ''}</div>
        <div class="channel-name">${data.pack.name}</div>
        <div class="channel-info">
          ${data.lastUsedIndex >= 0 ? `<span style="color: #ff9500;">Last Used:</span> #${data.lastUsedIndex + 1}` : 'No last used'}
        </div>
        <div class="channel-total">${data.totalBeats} beats total</div>
        <div class="beats-available ${beatsClass}">
          ${data.availableCount > 0 ? `${data.availableCount} beats ready` : 'No beats available'}
        </div>
        ${remainingInfo}
      </div>
    `;
  }).join('');

  updateBatchSummary();
}

function toggleBatchChannel(element) {
  const index = parseInt(element.dataset.index);
  const data = batchUploadState.channelData[index];

  if (!data || data.availableCount === 0) return;

  if (batchUploadState.selectedChannels.has(index)) {
    batchUploadState.selectedChannels.delete(index);
    element.classList.remove('selected');
    element.querySelector('.check-indicator').textContent = '';
  } else {
    batchUploadState.selectedChannels.add(index);
    element.classList.add('selected');
    element.querySelector('.check-indicator').textContent = '';
  }

  updateBatchSummary();
}

function batchSelectAll() {
  batchUploadState.channelData.forEach((data, index) => {
    if (data.availableCount > 0) {
      batchUploadState.selectedChannels.add(index);
    }
  });

  document.querySelectorAll('.batch-channel-card:not(.disabled)').forEach(card => {
    card.classList.add('selected');
    card.querySelector('.check-indicator').textContent = '';
  });

  updateBatchSummary();
}

function batchDeselectAll() {
  batchUploadState.selectedChannels.clear();

  document.querySelectorAll('.batch-channel-card').forEach(card => {
    card.classList.remove('selected');
    card.querySelector('.check-indicator').textContent = '';
  });

  updateBatchSummary();
}

function updateBatchSummary() {
  const countEl = document.getElementById('batch-selected-count');
  const summaryEl = document.getElementById('batch-summary');
  const totalBeatsEl = document.getElementById('batch-total-beats');
  const channelCountEl = document.getElementById('batch-channel-count');
  const confirmBtn = document.getElementById('confirm-batch-upload-btn');

  const selectedCount = batchUploadState.selectedChannels.size;
  let totalBeats = 0;

  batchUploadState.selectedChannels.forEach(index => {
    const data = batchUploadState.channelData[index];
    if (data) {
      totalBeats += data.availableCount;
    }
  });

  if (countEl) {
    countEl.textContent = `${selectedCount} channel${selectedCount !== 1 ? 's' : ''} selected`;
  }

  if (summaryEl) {
    summaryEl.style.display = selectedCount > 0 ? 'block' : 'none';
  }

  if (totalBeatsEl) {
    totalBeatsEl.textContent = totalBeats;
  }

  if (channelCountEl) {
    channelCountEl.textContent = selectedCount;
  }

  if (confirmBtn) {
    confirmBtn.disabled = selectedCount === 0;
    confirmBtn.innerHTML = selectedCount > 0
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Upload ${totalBeats} beats from ${selectedCount} channels`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Continue with Auto Upload 6`;
  }
}

async function executeBatchUpload() {
  if (batchUploadState.selectedChannels.size === 0) {
    showNotification('No channels selected', 'error');
    return;
  }

  // Collect all beats from selected channels
  let totalAdded = 0;

  batchUploadState.selectedChannels.forEach(index => {
    const data = batchUploadState.channelData[index];
    if (data && data.availableBeats.length > 0) {
      const added = addToGlobalQueue(data.availableBeats, data.pack, data.channel);
      totalAdded += added;
    }
  });

  // Close modal
  closeBatchUploadModal();

  if (totalAdded > 0) {
    showNotification(`Added ${totalAdded} beats from ${batchUploadState.selectedChannels.size} channels to queue`, 'success');

    // Auto-start the queue
    if (!globalUploadQueue.isProcessing) {
      showNotification('Starting queue processing...', 'info');
      await startGlobalQueueProcessing();
    }
  } else {
    showNotification('No beats were added to queue', 'warning');
  }
}

// Make toggle function globally available for onclick
window.toggleBatchChannel = toggleBatchChannel;

// Make functions globally available
window.autoUploadNextBeats = autoUploadNextBeats;
window.autoUploadSingleBeat = autoUploadSingleBeat;
window.autoUpload6FromHere = autoUpload6FromHere;
window.findChannelForPack = findChannelForPack;
window.addProgressItem = addProgressItem;
window.updateProgressItem = updateProgressItem;
window.startProgressBatch = startProgressBatch;
window.incrementBatchProgress = incrementBatchProgress;
window.PROGRESS_STATUS = PROGRESS_STATUS;

// Global queue functions
window.addToGlobalQueue = addToGlobalQueue;
window.startGlobalQueueProcessing = startGlobalQueueProcessing;
window.pauseGlobalQueue = pauseGlobalQueue;
window.resumeGlobalQueue = resumeGlobalQueue;
window.clearGlobalQueue = clearGlobalQueue;
window.globalUploadQueue = globalUploadQueue;
