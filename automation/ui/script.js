// State
let currentFile = null;
let statusInterval = null;

// Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadForm = document.getElementById('uploadForm');
const queueList = document.getElementById('queueList');
const historyList = document.getElementById('historyList');
const connectionStatus = document.getElementById('connection-status');
const channelName = document.getElementById('channel-name');
const queueCount = document.getElementById('queueCount');
const historyCount = document.getElementById('historyCount');

// Initialize
init();

function init() {
  setupEventListeners();
  startStatusPolling();
  loadChannelInfo();
}

function setupEventListeners() {
  // Drag & Drop
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  });

  // Form submit
  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormUpload();
  });
}

function handleFiles(files) {
  const videoFiles = files.filter(f =>
    f.type.startsWith('video/') ||
    ['.mp4', '.mov', '.avi', '.mkv'].some(ext => f.name.toLowerCase().endsWith(ext))
  );

  if (videoFiles.length === 0) {
    alert('Vui lòng chọn file video hợp lệ');
    return;
  }

  // Auto upload multiple files
  videoFiles.forEach(file => {
    currentFile = file;
    uploadVideo(file);
  });

  fileInput.value = '';
}

async function handleFormUpload() {
  if (!currentFile) {
    alert('Vui lòng chọn video trước');
    return;
  }

  const title = document.getElementById('videoTitle').value;
  const description = document.getElementById('videoDescription').value;
  const tags = document.getElementById('videoTags').value;

  await uploadVideo(currentFile, { title, description, tags });

  // Reset form
  uploadForm.reset();
  currentFile = null;
}

async function uploadVideo(file, metadata = {}) {
  const formData = new FormData();
  formData.append('video', file);

  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.description) formData.append('description', metadata.description);
  if (metadata.tags) formData.append('tags', metadata.tags);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('Upload queued:', result.queueItem);
      showNotification('Video đã được thêm vào hàng đợi', 'success');
    } else {
      showNotification('Lỗi: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showNotification('Lỗi kết nối server', 'error');
  }
}

async function loadStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    updateConnectionStatus(data.isYouTubeReady);
    updateQueue(data.queue);
    updateHistory(data.history);
  } catch (error) {
    console.error('Failed to load status:', error);
    updateConnectionStatus(false);
  }
}

async function loadChannelInfo() {
  try {
    const response = await fetch('/api/channel');
    const data = await response.json();

    if (data.success && data.channel) {
      channelName.textContent = data.channel.snippet.title;
    }
  } catch (error) {
    console.error('Failed to load channel info:', error);
  }
}

function updateConnectionStatus(isReady) {
  if (isReady) {
    connectionStatus.textContent = 'Kết nối';
    connectionStatus.className = 'status-badge connected';
  } else {
    connectionStatus.textContent = 'Chưa sẵn sàng';
    connectionStatus.className = 'status-badge disconnected';
  }
}

function updateQueue(queue) {
  queueCount.textContent = queue.length;

  if (queue.length === 0) {
    queueList.innerHTML = '<p class="empty-state">Chưa có video trong hàng đợi</p>';
    return;
  }

  queueList.innerHTML = queue.map(item => `
    <div class="video-item" id="video-${item.id}">
      <div class="video-icon">🎬</div>
      <div class="video-info">
        <h4 class="video-title-display">${item.metadata.title || item.fileName}</h4>
        <div class="video-meta">
          <span>📁 ${item.fileName}</span>
          <span>⏰ ${formatDate(item.addedAt)}</span>
        </div>
        ${item.metadata.description ? `
          <div class="video-description" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px; max-width: 600px;">
            ${item.metadata.description.substring(0, 100)}${item.metadata.description.length > 100 ? '...' : ''}
          </div>
        ` : ''}
        ${item.metadata.tags && item.metadata.tags.length > 0 ? `
          <div class="video-tags" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
            🏷️ ${item.metadata.tags.slice(0, 5).join(', ')}${item.metadata.tags.length > 5 ? '...' : ''}
          </div>
        ` : ''}
        <span class="video-status ${item.status}">${getStatusText(item.status)}</span>
      </div>
      <div class="video-actions">
        ${item.status === 'draft' ? `
          <button class="btn btn-secondary" onclick="editVideo('${item.id}')">✏️ Sửa</button>
          <button class="btn btn-primary" onclick="confirmUpload('${item.id}')" style="width: auto; padding: 8px 16px;">🚀 Upload</button>
          <button class="btn btn-secondary" onclick="removeFromQueue('${item.id}')" style="background: var(--error);">🗑️</button>
        ` : item.status === 'pending' || item.status === 'uploading' ? `
          <span style="color: var(--warning);">⏳ Đang xử lý...</span>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function updateHistory(history) {
  historyCount.textContent = history.length;

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">Chưa có video nào được upload</p>';
    return;
  }

  historyList.innerHTML = history.reverse().map(item => `
    <div class="video-item">
      <div class="video-icon">${item.status === 'completed' ? '✅' : '❌'}</div>
      <div class="video-info">
        <h4>${item.metadata.title || item.fileName}</h4>
        <div class="video-meta">
          <span>📁 ${item.fileName}</span>
          <span>⏰ ${formatDate(item.completedAt || item.addedAt)}</span>
        </div>
        ${item.result && item.result.videoUrl ? `
          <a href="${item.result.videoUrl}" target="_blank" class="video-link">
            🔗 Xem video trên YouTube
          </a>
        ` : ''}
        ${item.error ? `
          <div class="video-meta" style="color: var(--error); margin-top: 5px;">
            ⚠️ ${item.error}
          </div>
        ` : ''}
        <span class="video-status ${item.status}">${getStatusText(item.status)}</span>
      </div>
      <div class="video-actions">
        ${item.status === 'failed' ? `
          <button class="btn btn-secondary" onclick="retryUpload('${item.id}')">Thử lại</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function removeFromQueue(id) {
  try {
    const response = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    const result = await response.json();

    if (result.success) {
      showNotification('Đã xóa khỏi hàng đợi', 'success');
      loadStatus();
    }
  } catch (error) {
    console.error('Failed to remove from queue:', error);
    showNotification('Lỗi khi xóa', 'error');
  }
}

async function retryUpload(id) {
  try {
    const response = await fetch(`/api/retry/${id}`, { method: 'POST' });
    const result = await response.json();

    if (result.success) {
      showNotification('Đang thử lại upload...', 'success');
      loadStatus();
    }
  } catch (error) {
    console.error('Failed to retry upload:', error);
    showNotification('Lỗi khi thử lại', 'error');
  }
}

async function editVideo(id) {
  const response = await fetch('/api/status');
  const data = await response.json();
  const item = data.queue.find(v => v.id === id);

  if (!item) {
    alert('Không tìm thấy video');
    return;
  }

  const newTitle = prompt('Tiêu đề:', item.metadata.title);
  if (newTitle === null) return; // User cancelled

  const newDescription = prompt('Mô tả:', item.metadata.description || '');
  if (newDescription === null) return;

  const newTags = prompt('Tags (cách nhau bởi dấu phẩy):', item.metadata.tags.join(', '));
  if (newTags === null) return;

  try {
    const updateResponse = await fetch(`/api/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription,
        tags: newTags,
      }),
    });

    const result = await updateResponse.json();

    if (result.success) {
      showNotification('Đã cập nhật metadata', 'success');
      loadStatus();
    } else {
      showNotification('Lỗi: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Edit error:', error);
    showNotification('Lỗi khi cập nhật', 'error');
  }
}

async function confirmUpload(id) {
  if (!confirm('Xác nhận upload video này lên YouTube?')) {
    return;
  }

  try {
    const response = await fetch(`/api/queue/${id}/confirm`, {
      method: 'POST',
    });

    const result = await response.json();

    if (result.success) {
      showNotification('Đã bắt đầu upload!', 'success');
      loadStatus();
    } else {
      showNotification('Lỗi: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Confirm error:', error);
    showNotification('Lỗi khi upload', 'error');
  }
}

function getStatusText(status) {
  const statusMap = {
    draft: 'Nháp - Chờ xác nhận',
    pending: 'Đang chờ upload',
    uploading: 'Đang upload...',
    completed: 'Hoàn thành',
    failed: 'Thất bại',
  };
  return statusMap[status] || status;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN');
}

function showNotification(message, type = 'info') {
  // Simple console notification for now
  console.log(`[${type.toUpperCase()}] ${message}`);

  // You can implement a toast notification here
  alert(message);
}

function startStatusPolling() {
  loadStatus(); // Load immediately
  statusInterval = setInterval(loadStatus, 3000); // Update every 3s
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});
