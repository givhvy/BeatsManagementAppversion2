// ============================
// CLOUD SECTION (Cloudflare R2)
// ============================

let cloudInitialized = false;
let cloudConfig = null;
let cloudObjects = [];

// Config form elements
const cloudAccountIdInput   = document.getElementById('cloud-account-id');
const cloudBucketNameInput  = document.getElementById('cloud-bucket-name');
const cloudAccessKeyInput   = document.getElementById('cloud-access-key');
const cloudSecretKeyInput   = document.getElementById('cloud-secret-key');
const cloudPublicUrlInput   = document.getElementById('cloud-public-url');
const cloudPrefixInput      = document.getElementById('cloud-prefix');
const cloudToggleSecretBtn  = document.getElementById('cloud-toggle-secret-btn');
const cloudSaveConfigBtn    = document.getElementById('cloud-save-config-btn');
const cloudTestConnectionBtn = document.getElementById('cloud-test-connection-btn');
const cloudConnectionMessage = document.getElementById('cloud-connection-message');
const cloudStatusIndicator  = document.getElementById('cloud-status-indicator');

// Browser elements
const cloudRefreshBtn       = document.getElementById('cloud-refresh-btn');
const cloudUploadBtn        = document.getElementById('cloud-upload-btn');
const cloudFilterInput      = document.getElementById('cloud-filter-input');
const cloudFileCount        = document.getElementById('cloud-file-count');
const cloudFilesList        = document.getElementById('cloud-files-list');
const cloudUploadProgress   = document.getElementById('cloud-upload-progress');
const cloudUploadProgressFill  = document.getElementById('cloud-upload-progress-fill');
const cloudUploadProgressLabel = document.getElementById('cloud-upload-progress-label');

function initCloudSection() {
  if (cloudInitialized) return;
  cloudInitialized = true;

  if (cloudToggleSecretBtn) cloudToggleSecretBtn.addEventListener('click', toggleCloudSecretVisibility);
  if (cloudSaveConfigBtn) cloudSaveConfigBtn.addEventListener('click', saveCloudConfig);
  if (cloudTestConnectionBtn) cloudTestConnectionBtn.addEventListener('click', testCloudConnection);
  if (cloudRefreshBtn) cloudRefreshBtn.addEventListener('click', refreshCloudFiles);
  if (cloudUploadBtn) cloudUploadBtn.addEventListener('click', uploadCloudFiles);
  if (cloudFilterInput) cloudFilterInput.addEventListener('input', renderCloudFiles);

  if (isElectron) {
    ipcRenderer.on('r2-upload-progress', (event, progress) => {
      updateCloudUploadProgress(progress);
    });
  }

  loadCloudConfig();
}

async function loadCloudConfig() {
  if (!isElectron) {
    setCloudConnectionMessage('Cloud storage requires Electron.', 'error');
    return;
  }

  const result = await ipcRenderer.invoke('r2-load-config');
  if (!result || !result.success) {
    setCloudConnectionMessage(`Failed to load R2 config: ${result ? result.error : 'unknown error'}`, 'error');
    return;
  }

  cloudConfig = result.config;
  populateCloudConfigForm(cloudConfig);
  updateCloudStatusIndicator(result.configured ? 'unverified' : 'unconfigured');

  if (result.configured) {
    refreshCloudFiles();
  } else {
    cloudFilesList.innerHTML = '<div class="empty-state">Set up your R2 bucket on the left, then click Refresh to browse beats.</div>';
  }
}

function populateCloudConfigForm(config) {
  if (cloudAccountIdInput) cloudAccountIdInput.value = config.accountId || '';
  if (cloudBucketNameInput) cloudBucketNameInput.value = config.bucketName || '';
  if (cloudAccessKeyInput) cloudAccessKeyInput.value = config.accessKeyId || '';
  if (cloudSecretKeyInput) cloudSecretKeyInput.value = config.secretAccessKey || '';
  if (cloudPublicUrlInput) cloudPublicUrlInput.value = config.publicUrl || '';
  if (cloudPrefixInput) cloudPrefixInput.value = config.prefix || 'beats/';
}

function gatherCloudConfigForm() {
  let prefix = (cloudPrefixInput && cloudPrefixInput.value.trim()) || '';
  if (prefix && !prefix.endsWith('/')) prefix += '/';
  if (prefix.startsWith('/')) prefix = prefix.slice(1);

  return {
    accountId: cloudAccountIdInput ? cloudAccountIdInput.value.trim() : '',
    bucketName: cloudBucketNameInput ? cloudBucketNameInput.value.trim() : '',
    accessKeyId: cloudAccessKeyInput ? cloudAccessKeyInput.value.trim() : '',
    secretAccessKey: cloudSecretKeyInput ? cloudSecretKeyInput.value : '',
    publicUrl: cloudPublicUrlInput ? cloudPublicUrlInput.value.trim() : '',
    prefix
  };
}

function toggleCloudSecretVisibility() {
  if (!cloudSecretKeyInput) return;
  cloudSecretKeyInput.type = cloudSecretKeyInput.type === 'password' ? 'text' : 'password';
}

async function saveCloudConfig() {
  if (!isElectron) return;
  const config = gatherCloudConfigForm();

  if (!config.accountId || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
    setCloudConnectionMessage('Account ID, Bucket Name, Access Key ID and Secret Access Key are all required.', 'error');
    return;
  }

  const result = await ipcRenderer.invoke('r2-save-config', config);
  if (result.success) {
    cloudConfig = result.config;
    updateCloudStatusIndicator('unverified');
    setCloudConnectionMessage('Config saved. Click "Test Connection" to verify.', 'success');
    showNotification('R2 config saved', 'success');
  } else {
    setCloudConnectionMessage(`Failed to save config: ${result.error}`, 'error');
    showNotification(`Failed to save config: ${result.error}`, 'error');
  }
}

async function testCloudConnection() {
  if (!isElectron) return;
  const config = gatherCloudConfigForm();

  if (!config.accountId || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
    setCloudConnectionMessage('Fill in Account ID, Bucket Name, Access Key ID and Secret Access Key first.', 'error');
    return;
  }

  setCloudConnectionMessage('Testing connection...', 'info');
  const result = await ipcRenderer.invoke('r2-test-connection', config);

  if (result.success) {
    updateCloudStatusIndicator('online');
    setCloudConnectionMessage('Connected — bucket is reachable.', 'success');
  } else {
    updateCloudStatusIndicator('offline');
    setCloudConnectionMessage(`Connection failed: ${result.error}`, 'error');
  }
}

function updateCloudStatusIndicator(state) {
  if (!cloudStatusIndicator) return;
  cloudStatusIndicator.classList.remove('online', 'offline', 'unconfigured', 'unverified');

  switch (state) {
    case 'online':
      cloudStatusIndicator.classList.add('online');
      cloudStatusIndicator.textContent = 'Connected';
      break;
    case 'offline':
      cloudStatusIndicator.classList.add('offline');
      cloudStatusIndicator.textContent = 'Connection failed';
      break;
    case 'unverified':
      cloudStatusIndicator.classList.add('unverified');
      cloudStatusIndicator.textContent = 'Saved — not verified';
      break;
    default:
      cloudStatusIndicator.classList.add('unconfigured');
      cloudStatusIndicator.textContent = 'Not configured';
  }
}

function setCloudConnectionMessage(message, type) {
  if (!cloudConnectionMessage) return;
  if (!message) {
    cloudConnectionMessage.style.display = 'none';
    return;
  }
  cloudConnectionMessage.textContent = message;
  cloudConnectionMessage.className = `cloud-connection-message ${type || 'info'}`;
  cloudConnectionMessage.style.display = 'block';
}

async function refreshCloudFiles() {
  if (!isElectron || !cloudFilesList) return;
  const config = gatherCloudConfigForm();

  if (!config.accountId || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
    cloudFilesList.innerHTML = '<div class="empty-state">Set up your R2 bucket on the left, then click Refresh to browse beats.</div>';
    return;
  }

  cloudFilesList.innerHTML = '<div class="empty-state">Loading files from R2...</div>';

  const result = await ipcRenderer.invoke('r2-list-objects', config);

  if (result.success) {
    cloudObjects = result.objects;
    updateCloudStatusIndicator('online');
    renderCloudFiles();
  } else {
    cloudObjects = [];
    updateCloudStatusIndicator('offline');
    cloudFilesList.innerHTML = `<div class="empty-state">Failed to load files: ${escapeCloudHtml(result.error)}</div>`;
    if (cloudFileCount) cloudFileCount.textContent = '0 files';
  }
}

function renderCloudFiles() {
  if (!cloudFilesList) return;

  const filterText = (cloudFilterInput && cloudFilterInput.value.trim().toLowerCase()) || '';
  const filtered = filterText
    ? cloudObjects.filter(obj => obj.name.toLowerCase().includes(filterText))
    : cloudObjects;

  if (cloudFileCount) {
    cloudFileCount.textContent = `${filtered.length} file${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length === 0) {
    cloudFilesList.innerHTML = cloudObjects.length === 0
      ? '<div class="empty-state">No beats uploaded yet. Click "Upload Beats" to get started.</div>'
      : '<div class="empty-state">No files match your search.</div>';
    return;
  }

  cloudFilesList.innerHTML = filtered.map(obj => {
    const safeKey = escapeCloudJs(obj.key);
    const safeName = escapeCloudHtml(obj.name);
    const size = formatCloudFileSize(obj.size);
    const date = obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '';

    return `
      <div class="cloud-file-item">
        <div class="cloud-file-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <div class="cloud-file-info">
          <div class="cloud-file-name" title="${escapeCloudHtml(obj.key)}">${safeName}</div>
          <div class="cloud-file-meta">${size}${date ? ` &middot; ${date}` : ''}</div>
        </div>
        <div class="cloud-file-actions">
          <button class="cloud-file-action-btn" title="Copy link" onclick="copyCloudFileUrl('${safeKey}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="cloud-file-action-btn cloud-file-action-danger" title="Delete from R2" onclick="deleteCloudFile('${safeKey}', '${escapeCloudJs(obj.name)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function uploadCloudFiles() {
  if (!isElectron) return;
  const config = gatherCloudConfigForm();

  if (!config.accountId || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
    showNotification('Fill in and save your R2 config first', 'error');
    return;
  }

  const filePaths = await ipcRenderer.invoke('r2-select-files');
  if (!filePaths || filePaths.length === 0) return;

  if (cloudUploadProgress) cloudUploadProgress.style.display = 'flex';
  updateCloudUploadProgress({ current: 0, total: filePaths.length, fileName: '' });

  const result = await ipcRenderer.invoke('r2-upload-files', { config, filePaths });

  if (cloudUploadProgress) cloudUploadProgress.style.display = 'none';

  if (result.success) {
    const succeeded = result.results.filter(r => r.success).length;
    const failed = result.results.filter(r => !r.success);

    if (failed.length > 0) {
      showNotification(`Uploaded ${succeeded}/${result.results.length} beat(s). ${failed.length} failed — see console.`, 'error');
      console.error('[Cloud] R2 upload failures:', failed);
    } else {
      showNotification(`Uploaded ${succeeded} beat${succeeded === 1 ? '' : 's'} to R2`, 'success');
    }

    await refreshCloudFiles();
  } else {
    showNotification(`Upload failed: ${result.error}`, 'error');
  }
}

function updateCloudUploadProgress(progress) {
  if (!cloudUploadProgressFill || !cloudUploadProgressLabel) return;
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  cloudUploadProgressFill.style.width = `${pct}%`;
  cloudUploadProgressLabel.textContent = progress.current >= progress.total
    ? 'Upload complete'
    : `Uploading ${progress.current + 1} / ${progress.total}: ${progress.fileName}`;
}

async function copyCloudFileUrl(key) {
  if (!isElectron) return;
  const config = gatherCloudConfigForm();
  const result = await ipcRenderer.invoke('r2-get-object-url', { config, key });

  if (!result.success) {
    showNotification(`Failed to generate URL: ${result.error}`, 'error');
    return;
  }

  await navigator.clipboard.writeText(result.url);
  showNotification(
    result.type === 'public' ? 'Public URL copied to clipboard' : 'Signed URL copied to clipboard (valid 1 hour)',
    'success'
  );
}

async function deleteCloudFile(key, name) {
  if (!isElectron) return;
  if (!confirm(`Delete "${name}" from R2? This cannot be undone.`)) return;

  const config = gatherCloudConfigForm();
  const result = await ipcRenderer.invoke('r2-delete-object', { config, key });

  if (result.success) {
    showNotification(`Deleted ${name} from R2`, 'success');
    await refreshCloudFiles();
  } else {
    showNotification(`Failed to delete: ${result.error}`, 'error');
  }
}

function formatCloudFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function escapeCloudHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function escapeCloudJs(value) {
  return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
