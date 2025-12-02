// State
let channels = [];
let currentChannelId = null;
let statusInterval = null;

// Elements
const channelSelect = document.getElementById('channelSelect');
const refreshBtn = document.getElementById('refreshBtn');
const channelInfo = document.getElementById('channelInfo');
const uploadSection = document.getElementById('uploadSection');
const queueSection = document.getElementById('queueSection');
const historySection = document.getElementById('historySection');
const logsSection = document.getElementById('logsSection');
const refreshLogsBtn = document.getElementById('refreshLogsBtn');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

// Initialize
init();

function init() {
  setupEventListeners();
  loadChannels();
}

function setupEventListeners() {
  channelSelect.addEventListener('change', (e) => {
    currentChannelId = e.target.value;
    if (currentChannelId) {
      showChannelData(currentChannelId);
      startStatusPolling();
    } else {
      hideChannelData();
      stopStatusPolling();
    }
  });

  refreshBtn.addEventListener('click', () => {
    loadChannels();
    if (currentChannelId) {
      loadChannelStatus(currentChannelId);
    }
  });

  refreshLogsBtn.addEventListener('click', () => {
    if (currentChannelId) {
      loadChannelLogs(currentChannelId);
    }
  });

  // Drag & Drop
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFiles);

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
    const files = e.dataTransfer.files;
    handleFiles({ target: { files } });
  });
}

async function loadChannels() {
  try {
    const response = await fetch('/api/channels');
    const data = await response.json();

    channels = data.channels;

    // Update selector
    channelSelect.innerHTML = '<option value="">-- Chọn channel --</option>';
    channels.forEach(ch => {
      const option = document.createElement('option');
      option.value = ch.channelId;
      option.textContent = `${ch.name} ${ch.isReady ? '✅' : '⚠️'}`;
      channelSelect.appendChild(option);
    });

    // Update stats
    document.getElementById('total-channels').textContent = channels.length;
    document.getElementById('ready-channels').textContent = channels.filter(ch => ch.isReady).length;

    console.log(`Loaded ${channels.length} channels`);
  } catch (error) {
    console.error('Failed to load channels:', error);
  }
}

function showChannelData(channelId) {
  const channel = channels.find(ch => ch.channelId === channelId);
  if (!channel) return;

  // Show sections
  channelInfo.style.display = 'block';
  uploadSection.style.display = channel.isReady ? 'block' : 'none';
  queueSection.style.display = 'block';
  historySection.style.display = 'block';
  logsSection.style.display = 'block';

  // Update channel info
  document.getElementById('currentChannelName').textContent = channel.name;
  document.getElementById('uploadPath').textContent = channel.uploadsPath;
  document.getElementById('logPath').textContent = channel.logPath;

  const statusBadge = document.getElementById('channelStatus');
  if (channel.isReady) {
    statusBadge.textContent = 'Sẵn sàng';
    statusBadge.className = 'status-badge connected';
  } else {
    statusBadge.textContent = 'Chưa có token';
    statusBadge.className = 'status-badge disconnected';
  }

  loadChannelStatus(channelId);
  loadChannelLogs(channelId);
}

function hideChannelData() {
  channelInfo.style.display = 'none';
  uploadSection.style.display = 'none';
  queueSection.style.display = 'none';
  historySection.style.display = 'none';
  logsSection.style.display = 'none';
}

async function handleFiles(event) {
  if (!currentChannelId) {
    alert('Vui lòng chọn channel trước!');
    return;
  }

  const channel = channels.find(ch => ch.channelId === currentChannelId);
  if (!channel || !channel.isReady) {
    alert('Channel chưa sẵn sàng!');
    return;
  }

  const files = Array.from(event.target.files);
  const videoFiles = files.filter(file => {
    const ext = file.name.toLowerCase();
    return ext.endsWith('.mp4') || ext.endsWith('.mov') || ext.endsWith('.avi') || ext.endsWith('.mkv');
  });

  if (videoFiles.length === 0) {
    alert('Vui lòng chọn file video hợp lệ (MP4, MOV, AVI, MKV)');
    return;
  }

  for (const file of videoFiles) {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('channelId', currentChannelId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        console.log(`Uploaded: ${file.name}`);
      } else {
        alert(`Lỗi upload ${file.name}: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Lỗi upload ${file.name}`);
    }
  }

  // Reset input
  fileInput.value = '';

  // Reload status
  setTimeout(() => loadChannelStatus(currentChannelId), 1000);
  alert(`Đã upload ${videoFiles.length} video!`);
}

async function loadChannelStatus(channelId) {
  try {
    const response = await fetch(`/api/status/${channelId}`);
    const data = await response.json();

    updateQueue(data.queue);
    updateHistory(data.history);

    document.getElementById('channelQueueCount').textContent = data.queue.length;
    document.getElementById('channelHistoryCount').textContent = data.history.length;
  } catch (error) {
    console.error('Failed to load status:', error);
  }
}

function updateQueue(queue) {
  const queueList = document.getElementById('queueList');
  document.getElementById('queueCount').textContent = queue.length;

  if (queue.length === 0) {
    queueList.innerHTML = '<p class="empty-state">Chưa có video trong hàng đợi</p>';
    return;
  }

  queueList.innerHTML = queue.map(item => `
    <div class="video-item" id="video-${item.id}">
      <div class="video-icon">🎬</div>
      <div class="video-info">
        <h4>${item.metadata.title || item.fileName}</h4>
        <div class="video-meta">
          <span>📁 ${item.fileName}</span>
          <span>🏷️ ${item.channelName}</span>
          <span>⏰ ${formatDate(item.addedAt)}</span>
        </div>
        ${item.metadata.description ? `
          <div class="video-description" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">
            ${item.metadata.description.substring(0, 100)}${item.metadata.description.length > 100 ? '...' : ''}
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
  const historyList = document.getElementById('historyList');
  document.getElementById('historyCount').textContent = history.length;

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
          <span>🏷️ ${item.channelName}</span>
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
    </div>
  `).join('');
}

async function loadChannelLogs(channelId) {
  try {
    const response = await fetch(`/api/logs/${channelId}`);
    const data = await response.json();

    const logsList = document.getElementById('logsList');

    if (data.logs.length === 0) {
      logsList.innerHTML = '<p class="empty-state">Không có logs</p>';
      return;
    }

    logsList.innerHTML = `<pre>${data.logs.join('\n')}</pre>`;
  } catch (error) {
    console.error('Failed to load logs:', error);
  }
}

async function editVideo(id) {
  if (!currentChannelId) return;

  const response = await fetch(`/api/status/${currentChannelId}`);
  const data = await response.json();
  const item = data.queue.find(v => v.id === id);

  if (!item) {
    alert('Không tìm thấy video');
    return;
  }

  const newTitle = prompt('Tiêu đề:', item.metadata.title);
  if (newTitle === null) return;

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
      alert('Đã cập nhật metadata');
      loadChannelStatus(currentChannelId);
    } else {
      alert('Lỗi: ' + result.error);
    }
  } catch (error) {
    console.error('Edit error:', error);
    alert('Lỗi khi cập nhật');
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
      alert('Đã bắt đầu upload!');
      loadChannelStatus(currentChannelId);
    } else {
      alert('Lỗi: ' + result.error);
    }
  } catch (error) {
    console.error('Confirm error:', error);
    alert('Lỗi khi upload');
  }
}

async function removeFromQueue(id) {
  if (!confirm('Xóa video này khỏi hàng đợi?')) {
    return;
  }

  try {
    const response = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    const result = await response.json();

    if (result.success) {
      alert('Đã xóa khỏi hàng đợi');
      loadChannelStatus(currentChannelId);
    }
  } catch (error) {
    console.error('Failed to remove:', error);
    alert('Lỗi khi xóa');
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

function startStatusPolling() {
  stopStatusPolling();
  statusInterval = setInterval(() => {
    if (currentChannelId) {
      loadChannelStatus(currentChannelId);
    }
  }, 3000);
}

function stopStatusPolling() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

window.addEventListener('beforeunload', () => {
  stopStatusPolling();
});
