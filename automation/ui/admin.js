// State
let channels = [];
let currentChannel = null;

// Initialize
init();

function init() {
  loadChannels();
  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById('createChannelForm').addEventListener('submit', createChannel);
  document.getElementById('credentialsFile').addEventListener('change', handleCredentialsFile);
}

async function loadChannels() {
  try {
    const response = await fetch('/api/admin/channels');
    const data = await response.json();
    channels = data.channels;
    renderChannels();
  } catch (error) {
    console.error('Failed to load channels:', error);
  }
}

function renderChannels() {
  const container = document.getElementById('channelsList');

  if (channels.length === 0) {
    container.innerHTML = '<p class="empty-state">No channels yet</p>';
    return;
  }

  container.innerHTML = channels.map(ch => `
    <div class="channel-card">
      <h3>${ch.name} ${ch.hasToken ? '✅' : '⚠️'}</h3>
      <div class="channel-info">
        <div><strong>Account:</strong> ${ch.account}</div>
        <div><strong>Channel ID:</strong> ${ch.channelId}</div>
        <div><strong>Has Credentials:</strong> ${ch.hasCredentials ? 'Yes' : 'No'}</div>
        <div><strong>Has Token:</strong> ${ch.hasToken ? 'Yes' : 'No'}</div>
        <div><strong>Auto Upload:</strong> ${ch.autoUpload ? 'Enabled' : 'Disabled'}</div>
        <div><strong>Language:</strong> ${ch.metadataTemplate?.language || 'N/A'}</div>
      </div>
      <div class="channel-actions">
        ${!ch.hasCredentials ? `
          <button class="btn btn-primary" onclick="openUploadCredentials('${ch.account}', '${ch.channelId}')">
            📁 Upload Credentials
          </button>
        ` : ''}
        ${ch.hasCredentials && !ch.hasToken ? `
          <button class="btn btn-primary" onclick="getToken('${ch.account}', '${ch.channelId}')">
            🔑 Get Token
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="editConfig('${ch.account}', '${ch.channelId}')">
          ✏️ Edit Config
        </button>
        <button class="btn btn-secondary" onclick="viewLogs('${ch.account}', '${ch.channelId}')">
          📜 View Logs
        </button>
        <button class="btn" style="background: var(--error);" onclick="deleteChannel('${ch.account}', '${ch.channelId}')">
          🗑️ Delete
        </button>
      </div>
    </div>
  `).join('');
}

async function createChannel(e) {
  e.preventDefault();

  const account = document.getElementById('newAccount').value.trim();
  const channelId = document.getElementById('newChannelId').value.trim();
  const displayName = document.getElementById('newDisplayName').value.trim();

  if (!account || !channelId || !displayName) {
    alert('Please fill all fields');
    return;
  }

  try {
    const response = await fetch('/api/admin/channels/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, channelId, displayName }),
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('createChannelForm').reset();

      // Reload channels to show the new one
      await loadChannels();

      alert(`✅ Channel created successfully!\n\nNext steps:\n1. Upload credentials.json\n2. Get OAuth token`);
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Create error:', error);
    alert('Failed to create channel');
  }
}

let selectedFile = null;

function openUploadCredentials(account, channelId) {
  currentChannel = { account, channelId };
  selectedFile = null;
  document.getElementById('credentialsModal').classList.add('active');
  document.getElementById('uploadStatus').innerHTML = '';
  document.querySelector('.file-upload p').textContent = '📁 Click to select credentials.json';

  // Setup drag & drop
  const uploadZone = document.querySelector('.file-upload');

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--primary)';
    uploadZone.style.background = 'rgba(99, 102, 241, 0.1)';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
    uploadZone.style.background = '';
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    uploadZone.style.background = '';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      selectedFile = files[0];
      document.querySelector('.file-upload p').textContent = `📄 Selected: ${selectedFile.name}`;
    }
  });
}

function handleCredentialsFile(e) {
  const file = e.target.files[0];
  if (file) {
    selectedFile = file;
    document.querySelector('.file-upload p').textContent = `📄 Selected: ${file.name}`;
  }
}

async function uploadCredentials() {
  const fileInput = document.getElementById('credentialsFile');
  const file = selectedFile || fileInput.files[0];

  if (!file) {
    alert('Please select or drop a file');
    return;
  }

  const formData = new FormData();
  formData.append('credentials', file);
  formData.append('account', currentChannel.account);
  formData.append('channelId', currentChannel.channelId);

  try {
    const response = await fetch('/api/admin/channels/credentials', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('uploadStatus').innerHTML = '<p style="color: var(--success);">✅ Uploaded successfully!</p>';
      setTimeout(() => {
        closeModal('credentialsModal');
        loadChannels();
      }, 1500);
    } else {
      document.getElementById('uploadStatus').innerHTML = `<p style="color: var(--error);">❌ ${result.error}</p>`;
    }
  } catch (error) {
    console.error('Upload error:', error);
    document.getElementById('uploadStatus').innerHTML = '<p style="color: var(--error);">❌ Upload failed</p>';
  }
}

async function getToken(account, channelId) {
  try {
    const response = await fetch(`/api/admin/channels/token?account=${account}&channelId=${channelId}`);
    const result = await response.json();

    if (result.success) {
      document.getElementById('tokenModal').classList.add('active');
      document.getElementById('tokenContent').innerHTML = `
        <p>Visit this URL to authorize:</p>
        <div style="background: var(--bg); padding: 1rem; border-radius: 4px; margin: 1rem 0; word-break: break-all;">
          <a href="${result.authUrl}" target="_blank" style="color: var(--primary);">${result.authUrl}</a>
        </div>
        <div class="form-group">
          <label>Paste the authorization code here:</label>
          <input type="text" id="authCode" placeholder="4/0A..." style="width: 100%;">
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="btn btn-primary" onclick="submitAuthCode('${account}', '${channelId}')">Submit</button>
          <button class="btn btn-secondary" onclick="closeModal('tokenModal')">Cancel</button>
        </div>
        <div id="tokenStatus"></div>
      `;
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Token error:', error);
    alert('Failed to get token URL');
  }
}

async function submitAuthCode(account, channelId) {
  const code = document.getElementById('authCode').value.trim();

  if (!code) {
    alert('Please enter authorization code');
    return;
  }

  try {
    const response = await fetch('/api/admin/channels/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, channelId, code }),
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('tokenStatus').innerHTML = '<p style="color: var(--success);">✅ Token saved! Restarting server...</p>';
      setTimeout(() => {
        closeModal('tokenModal');
        alert('Token saved successfully! Please refresh the page.');
        window.location.reload();
      }, 2000);
    } else {
      document.getElementById('tokenStatus').innerHTML = `<p style="color: var(--error);">❌ ${result.error}</p>`;
    }
  } catch (error) {
    console.error('Submit error:', error);
    document.getElementById('tokenStatus').innerHTML = '<p style="color: var(--error);">❌ Failed to save token</p>';
  }
}

let editingConfig = {};

async function editConfig(account, channelId) {
  try {
    const response = await fetch(`/api/admin/channels/config?account=${account}&channelId=${channelId}`);
    const result = await response.json();

    if (result.success) {
      currentChannel = { account, channelId };
      editingConfig = result.config;

      // Populate form
      document.getElementById('editDisplayName').value = editingConfig.displayName || '';
      document.getElementById('editTitleTemplate').value = editingConfig.metadataTemplate?.titleTemplate || '';
      document.getElementById('editAutoUpload').value = editingConfig.autoUpload ? 'true' : 'false';
      document.getElementById('editLanguage').value = editingConfig.metadataTemplate?.language || 'en';

      // Render conditions
      renderConditions();

      document.getElementById('configModal').classList.add('active');
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Load config error:', error);
    alert('Failed to load config');
  }
}

function renderConditions() {
  const container = document.getElementById('conditionsList');
  const conditions = editingConfig.metadataTemplate?.descriptionConditions || { default: { text: '', tags: [] } };

  container.innerHTML = Object.entries(conditions).map(([keyword, condition], index) => `
    <div class="form-section" style="padding: 1rem; margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <h4 style="margin: 0;">${keyword === 'default' ? '🔹 Default (Fallback)' : `🎵 Genre: ${keyword}`}</h4>
        ${keyword !== 'default' ? `<button class="btn" style="background: var(--error); padding: 0.25rem 0.5rem;" onclick="removeCondition('${keyword}')">🗑️</button>` : ''}
      </div>
      ${keyword !== 'default' ? `
        <div class="form-group">
          <label>Genre Keyword (e.g., "boom bap", "rnb", "trap")</label>
          <input type="text" value="${keyword}" onchange="updateConditionKeyword('${keyword}', this.value)">
        </div>
      ` : ''}
      <div class="form-group">
        <label>Description</label>
        <textarea rows="6" onchange="updateConditionText('${keyword}', this.value)">${condition.text || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Tags (one per line)</label>
        <textarea rows="4" onchange="updateConditionTags('${keyword}', this.value)">${(condition.tags || []).join('\n')}</textarea>
      </div>
    </div>
  `).join('');
}

function addCondition() {
  const keyword = prompt('Enter genre keyword (e.g., "boom bap", "trap", "rnb"):');
  if (!keyword) return;

  if (!editingConfig.metadataTemplate.descriptionConditions) {
    editingConfig.metadataTemplate.descriptionConditions = {};
  }

  editingConfig.metadataTemplate.descriptionConditions[keyword.toLowerCase()] = {
    text: '',
    tags: []
  };

  renderConditions();
}

function removeCondition(keyword) {
  if (confirm(`Remove "${keyword}" condition?`)) {
    delete editingConfig.metadataTemplate.descriptionConditions[keyword];
    renderConditions();
  }
}

function updateConditionKeyword(oldKeyword, newKeyword) {
  const condition = editingConfig.metadataTemplate.descriptionConditions[oldKeyword];
  delete editingConfig.metadataTemplate.descriptionConditions[oldKeyword];
  editingConfig.metadataTemplate.descriptionConditions[newKeyword.toLowerCase()] = condition;
  renderConditions();
}

function updateConditionText(keyword, text) {
  editingConfig.metadataTemplate.descriptionConditions[keyword].text = text;
}

function updateConditionTags(keyword, tagsText) {
  editingConfig.metadataTemplate.descriptionConditions[keyword].tags = tagsText.split('\n').map(t => t.trim()).filter(t => t);
}

async function saveConfig() {
  try {
    // Update config from form
    editingConfig.displayName = document.getElementById('editDisplayName').value;
    editingConfig.autoUpload = document.getElementById('editAutoUpload').value === 'true';
    editingConfig.metadataTemplate.titleTemplate = document.getElementById('editTitleTemplate').value;
    editingConfig.metadataTemplate.language = document.getElementById('editLanguage').value;

    const response = await fetch('/api/admin/channels/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: currentChannel.account,
        channelId: currentChannel.channelId,
        config: editingConfig,
      }),
    });

    const result = await response.json();

    if (result.success) {
      alert('Template saved! Please restart server to apply changes.');
      closeModal('configModal');
      loadChannels();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Save config error:', error);
    alert('Save failed: ' + error.message);
  }
}

async function deleteChannel(account, channelId) {
  if (!confirm(`Delete channel ${account}/${channelId}?\n\nThis will remove all config files but keep uploaded videos.`)) {
    return;
  }

  try {
    const response = await fetch('/api/admin/channels/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, channelId }),
    });

    const result = await response.json();

    if (result.success) {
      alert('Channel deleted! Please restart server.');
      loadChannels();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete channel');
  }
}

function viewLogs(account, channelId) {
  window.open(`/api/admin/channels/logs?account=${account}&channelId=${channelId}`, '_blank');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}
