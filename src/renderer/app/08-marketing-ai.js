// =============================================
// EMAIL MARKETING SYSTEM
// =============================================

const marketingState = {
  beatStatus: {},       // beatPath -> { sentAt, campaignIds, campaignCount }
  campaigns: [],
  currentCampaignBeats: [],  // selected beat paths in campaign creator
};

async function loadBeatMarketing() {
  if (!isElectron) return;
  try {
    const data = await ipcRenderer.invoke('load-beat-marketing');
    marketingState.beatStatus = data || {};
  } catch (e) {}
}

async function saveBeatMarketing() {
  if (!isElectron) return;
  await ipcRenderer.invoke('save-beat-marketing', marketingState.beatStatus);
}

async function loadCampaigns() {
  if (!isElectron) return;
  try {
    const data = await ipcRenderer.invoke('load-campaigns');
    marketingState.campaigns = (data && data.campaigns) ? data.campaigns : [];
  } catch (e) {}
}

async function saveCampaigns() {
  if (!isElectron) return;
  await ipcRenderer.invoke('save-campaigns', { campaigns: marketingState.campaigns });
}

// Switch between Customers and Campaigns views
function switchCustomerView(view) {
  document.querySelectorAll('.cview-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
  });
  document.getElementById('customers-view').style.display = (view === 'customers') ? '' : 'none';
  document.getElementById('campaigns-view').style.display = (view === 'campaigns') ? '' : 'none';
  if (view === 'campaigns') renderCampaignsList();
}

// Open Resend settings modal
async function openResendSettings() {
  if (!isElectron) return;
  try {
    const config = await ipcRenderer.invoke('load-resend-config');
    document.getElementById('resend-api-key-input').value = config.apiKey || '';
    document.getElementById('resend-from-email-input').value = config.fromEmail || '';
    document.getElementById('resend-from-name-input').value = config.fromName || '';
    const configPath = await ipcRenderer.invoke('get-resend-config-path');
    document.getElementById('resend-config-path-display').textContent = configPath;
  } catch (e) {}
  document.getElementById('resend-settings-modal').style.display = 'flex';
}

async function saveResendConfig() {
  if (!isElectron) return;
  const config = {
    apiKey: document.getElementById('resend-api-key-input').value.trim(),
    fromEmail: document.getElementById('resend-from-email-input').value.trim(),
    fromName: document.getElementById('resend-from-name-input').value.trim(),
  };
  const result = await ipcRenderer.invoke('save-resend-config', config);
  if (result.success) {
    document.getElementById('resend-settings-modal').style.display = 'none';
    showNotification('Marketing settings saved!', 'success');
  } else {
    showNotification('Error saving settings: ' + result.error, 'error');
  }
}

// Open Campaign Creator
async function openCampaignCreator(preselectedBeatPath) {
  marketingState.currentCampaignBeats = preselectedBeatPath ? [preselectedBeatPath] : [];

  // Reset form
  document.getElementById('campaign-name-input').value = '';
  document.getElementById('campaign-discount-input').value = '';
  document.getElementById('campaign-goal-input').value = '';
  document.getElementById('campaign-subject-input').value = '';
  document.getElementById('campaign-body-textarea').value = '';
  document.getElementById('campaign-send-status').textContent = 'Ready';

  // Populate beat selector from loaded beats
  renderBeatSelectorInModal();
  updateCampaignRecipientCount();

  // Check Ollama status
  checkOllamaStatus();

  document.getElementById('campaign-creator-modal').style.display = 'flex';
}

function closeCampaignModal() {
  document.getElementById('campaign-creator-modal').style.display = 'none';
}

function renderBeatSelectorInModal() {
  const container = document.getElementById('campaign-beat-selector');
  if (!container) return;

  const allBeats = getCurrentBeats ? getCurrentBeats().filter(i => i.type === 'beat' || !i.type) : [];
  if (allBeats.length === 0) {
    container.innerHTML = '<div class="empty-state" style="font-size:12px;">Load beats first from the Beats tab</div>';
    return;
  }

  container.innerHTML = '';
  allBeats.slice(0, 40).forEach(beat => {
    const pill = document.createElement('div');
    pill.className = 'beat-selector-pill' + (marketingState.currentCampaignBeats.includes(beat.path) ? ' selected' : '');
    pill.textContent = beat.name.replace(/\.[^/.]+$/, '');
    pill.title = beat.path;
    pill.addEventListener('click', () => {
      const idx = marketingState.currentCampaignBeats.indexOf(beat.path);
      if (idx >= 0) {
        marketingState.currentCampaignBeats.splice(idx, 1);
        pill.classList.remove('selected');
      } else {
        marketingState.currentCampaignBeats.push(beat.path);
        pill.classList.add('selected');
      }
    });
    container.appendChild(pill);
  });
}

function updateOllamaNavWidget(state) {
  // state: 'online' | 'offline' | 'checking'
  const dot = document.getElementById('ollama-nav-dot');
  const label = document.getElementById('ollama-nav-label');
  const navBtn = document.getElementById('ollama-nav-toggle-btn');
  const settingsStatus = document.getElementById('ollama-status-settings');
  const settingsBtn = document.getElementById('ollama-toggle-settings-btn');

  if (dot) dot.className = 'ollama-nav-dot ' + state;

  if (state === 'online') {
    if (label) label.textContent = 'AI Online';
    if (navBtn) { navBtn.textContent = 'Stop'; navBtn.className = 'btn-ollama-nav btn-ollama-stop'; navBtn.disabled = false; }
    if (settingsStatus) { settingsStatus.textContent = 'Online'; settingsStatus.classList.remove('offline'); settingsStatus.classList.add('online'); }
    if (settingsBtn) { settingsBtn.textContent = 'Stop'; settingsBtn.className = 'btn-settings-action btn-ollama-stop'; settingsBtn.disabled = false; }
  } else if (state === 'offline') {
    if (label) label.textContent = 'AI Offline';
    if (navBtn) { navBtn.textContent = 'Start'; navBtn.className = 'btn-ollama-nav btn-ollama-start'; navBtn.disabled = false; }
    if (settingsStatus) { settingsStatus.textContent = 'Offline'; settingsStatus.classList.remove('online'); settingsStatus.classList.add('offline'); }
    if (settingsBtn) { settingsBtn.textContent = 'Start'; settingsBtn.className = 'btn-settings-action btn-ollama-start'; settingsBtn.disabled = false; }
  } else {
    if (label) label.textContent = 'AI...';
    if (navBtn) navBtn.disabled = true;
    if (settingsStatus) { settingsStatus.textContent = 'Checking...'; settingsStatus.classList.remove('online', 'offline'); }
    if (settingsBtn) settingsBtn.disabled = true;
  }
}

async function checkOllamaStatus(retries = 0) {
  const badge = document.getElementById('ollama-status-badge');
  const toggleBtn = document.getElementById('ollama-toggle-btn');
  if (!isElectron) return;
  updateOllamaNavWidget('checking');
  if (badge) { badge.textContent = 'Checking...'; badge.className = 'ollama-badge checking'; }
  if (toggleBtn) { toggleBtn.disabled = true; toggleBtn.textContent = '...'; }
  try {
    const result = await ipcRenderer.invoke('check-ollama');
    if (result.running) {
      updateOllamaNavWidget('online');
      if (badge) { badge.textContent = 'Online'; badge.className = 'ollama-badge online'; }
      if (toggleBtn) {
        toggleBtn.textContent = 'Stop AI';
        toggleBtn.className = 'btn-ollama-toggle btn-ollama-stop';
        toggleBtn.disabled = false;
      }
    } else {
      // If app just launched, Ollama may still be booting  retry a few times
      if (retries < 5) {
        setTimeout(() => checkOllamaStatus(retries + 1), 1500);
        if (badge) { badge.textContent = 'Starting...'; badge.className = 'ollama-badge checking'; }
        return;
      }
      updateOllamaNavWidget('offline');
      if (badge) { badge.textContent = 'Offline'; badge.className = 'ollama-badge offline'; }
      if (toggleBtn) {
        toggleBtn.textContent = 'Start AI';
        toggleBtn.className = 'btn-ollama-toggle btn-ollama-start';
        toggleBtn.disabled = false;
      }
    }
  } catch(e) {
    updateOllamaNavWidget('offline');
    if (badge) { badge.textContent = 'Offline'; badge.className = 'ollama-badge offline'; }
    if (toggleBtn) {
      toggleBtn.textContent = 'Start AI';
      toggleBtn.className = 'btn-ollama-toggle btn-ollama-start';
      toggleBtn.disabled = false;
    }
  }
}

async function toggleOllama() {
  const badge = document.getElementById('ollama-status-badge');
  const toggleBtn = document.getElementById('ollama-toggle-btn');
  const navDot = document.getElementById('ollama-nav-dot');
  // Detect current state from nav dot (always present) or campaign badge
  const isOnline = (navDot && navDot.classList.contains('online')) ||
                   (badge && badge.classList.contains('online'));

  updateOllamaNavWidget('checking');
  if (toggleBtn) { toggleBtn.disabled = true; toggleBtn.textContent = isOnline ? 'Stopping...' : 'Starting...'; }
  if (badge) { badge.textContent = isOnline ? 'Stopping...' : 'Starting...'; badge.className = 'ollama-badge checking'; }

  try {
    if (isOnline) {
      await ipcRenderer.invoke('stop-ollama');
      updateOllamaNavWidget('offline');
      if (badge) { badge.textContent = 'Offline'; badge.className = 'ollama-badge offline'; }
      if (toggleBtn) { toggleBtn.textContent = 'Start AI'; toggleBtn.className = 'btn-ollama-toggle btn-ollama-start'; toggleBtn.disabled = false; }
      showNotification('Ollama stopped. AI features disabled.', 'info');
    } else {
      showNotification('Starting Ollama AI server... (AMD GPU init can take 30-60s, please wait)', 'info');
      const result = await ipcRenderer.invoke('start-ollama');
      if (result.success) {
        updateOllamaNavWidget('online');
        if (badge) { badge.textContent = 'Online'; badge.className = 'ollama-badge online'; }
        if (toggleBtn) { toggleBtn.textContent = 'Stop AI'; toggleBtn.className = 'btn-ollama-toggle btn-ollama-stop'; toggleBtn.disabled = false; }
        showNotification('Ollama started! AI features ready.', 'success');
      } else {
        updateOllamaNavWidget('offline');
        if (badge) { badge.textContent = 'Offline'; badge.className = 'ollama-badge offline'; }
        if (toggleBtn) { toggleBtn.textContent = 'Start AI'; toggleBtn.className = 'btn-ollama-toggle btn-ollama-start'; toggleBtn.disabled = false; }
        showNotification('Failed to start Ollama: ' + (result.error || 'unknown error'), 'error');
      }
    }
  } catch(e) {
    if (toggleBtn) { toggleBtn.disabled = false; }
    showNotification('Error: ' + e.message, 'error');
  }
}

async function generateCampaignEmail() {
  if (!isElectron) return;
  const btn = document.getElementById('ai-generate-email-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  const beatNames = marketingState.currentCampaignBeats.map(p => p.split(/[\\/]/).pop().replace(/\.[^/.]+$/, ''));
  const discount = document.getElementById('campaign-discount-input').value.trim();
  const goal = document.getElementById('campaign-goal-input').value.trim();
  const model = document.getElementById('campaign-model-select').value;

  try {
    const result = await ipcRenderer.invoke('generate-ai-email', {
      customerName: '{name}',
      beatNames,
      discount,
      prompt: goal,
      model
    });
    if (result.success) {
      document.getElementById('campaign-body-textarea').value = result.content;
      // Auto-generate subject if empty
      if (!document.getElementById('campaign-subject-input').value.trim()) {
        const subjectHint = discount ? `${discount}  Exclusive Beats` : 'New Beats Drop ';
        document.getElementById('campaign-subject-input').value = subjectHint;
      }
      showNotification('Email generated!', 'success');
    } else {
      showNotification('AI Error: ' + result.error, 'error');
    }
  } catch (e) {
    showNotification('Error: ' + e.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>Generate Email with AI';
}

function updateCampaignRecipientCount() {
  const segment = document.getElementById('campaign-segment-select');
  if (!segment) return;
  const segVal = segment.value;
  const customers = (customerState && customerState.customers) ? customerState.customers : [];
  const filtered = segVal === 'all' ? customers : customers.filter(c => c.type === segVal);
  const withEmail = filtered.filter(c => c.email && c.email.trim());
  const el = document.getElementById('campaign-recipient-count');
  if (el) el.textContent = withEmail.length;
  const unitEl = el ? el.nextElementSibling : null;
  if (unitEl && unitEl.classList.contains('cm-stat-unit')) unitEl.textContent = withEmail.length !== 1 ? 'contacts' : 'contact';
}

// Send campaign to all recipients
async function sendCampaign() {
  if (!isElectron) return;
  const name = document.getElementById('campaign-name-input').value.trim() || ('Campaign ' + new Date().toLocaleDateString());
  const subject = document.getElementById('campaign-subject-input').value.trim();
  const bodyTemplate = document.getElementById('campaign-body-textarea').value.trim();
  const segment = document.getElementById('campaign-segment-select').value;

  if (!subject) { showNotification('Please enter an email subject.', 'error'); return; }
  if (!bodyTemplate) { showNotification('Please enter email body content.', 'error'); return; }

  const customers = (customerState && customerState.customers) ? customerState.customers : [];
  const filtered = segment === 'all' ? customers : customers.filter(c => c.type === segment);
  const withEmail = filtered.filter(c => c.email && c.email.trim());

  if (withEmail.length === 0) { showNotification('No customers with email addresses in this segment.', 'error'); return; }

  const sendBtn = document.getElementById('send-campaign-btn');
  sendBtn.disabled = true;
  const statusEl = document.getElementById('campaign-send-status');

  const campaign = {
    id: 'cmp_' + Date.now(),
    name,
    subject,
    bodyTemplate,
    segment,
    beatPaths: [...marketingState.currentCampaignBeats],
    createdAt: new Date().toISOString(),
    sentAt: null,
    recipients: [],
    stats: { sent: 0, opened: 0, clicked: 0, failed: 0 }
  };

  let sent = 0, failed = 0;
  for (const customer of withEmail) {
    statusEl.textContent = `Sending ${sent + failed + 1}/${withEmail.length}...`;
    const personalizedHtml = bodyTemplate.replace(/\{name\}/g, customer.name || 'there').replace(/\{email\}/g, customer.email || '');
    const result = await ipcRenderer.invoke('send-marketing-email', {
      to: customer.email,
      subject,
      html: personalizedHtml
    });
    if (result.success) {
      sent++;
      campaign.recipients.push({ customerId: customer.id, email: customer.email, name: customer.name, emailId: result.emailId, sentAt: new Date().toISOString() });
    } else {
      failed++;
      campaign.recipients.push({ customerId: customer.id, email: customer.email, name: customer.name, emailId: null, sentAt: null, error: result.error });
    }
  }

  campaign.sentAt = new Date().toISOString();
  campaign.stats.sent = sent;
  campaign.stats.failed = failed;
  marketingState.campaigns.unshift(campaign);
  await saveCampaigns();

  // Mark beats as marketed
  for (const beatPath of marketingState.currentCampaignBeats) {
    if (!marketingState.beatStatus[beatPath]) {
      marketingState.beatStatus[beatPath] = { sentAt: campaign.sentAt, campaignIds: [], campaignCount: 0 };
    }
    marketingState.beatStatus[beatPath].campaignIds.push(campaign.id);
    marketingState.beatStatus[beatPath].campaignCount = marketingState.beatStatus[beatPath].campaignIds.length;
    marketingState.beatStatus[beatPath].sentAt = campaign.sentAt;
  }
  await saveBeatMarketing();

  statusEl.textContent = `Done! Sent: ${sent}, Failed: ${failed}`;
  sendBtn.disabled = false;
  showNotification(`Campaign sent to ${sent} recipient${sent !== 1 ? 's' : ''}!`, 'success');

  if (typeof renderBeats === 'function') renderBeats();
  setTimeout(() => closeCampaignModal(), 2000);
}

// Render campaigns list
function renderCampaignsList() {
  const list = document.getElementById('campaigns-list');
  if (!list) return;
  if (marketingState.campaigns.length === 0) {
    list.innerHTML = '<div class="empty-state">No campaigns yet. Click "New Campaign" to send your first email blast.</div>';
    return;
  }
  list.innerHTML = '';
  marketingState.campaigns.forEach(c => {
    const openRate = c.stats.sent > 0 ? Math.round((c.stats.opened / c.stats.sent) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'campaign-card';
    card.innerHTML = `
      <div class="campaign-card-top">
        <div class="campaign-card-name">${escapeHtml(c.name)}</div>
        <div class="campaign-card-date">${c.sentAt ? new Date(c.sentAt).toLocaleDateString() : 'Draft'}</div>
      </div>
      <div class="campaign-card-subject">${escapeHtml(c.subject)}</div>
      <div class="campaign-card-stats">
        <span class="cstat"><b>${c.stats.sent}</b> sent</span>
        <span class="cstat"><b>${c.stats.opened}</b> opened</span>
        <span class="cstat"><b>${openRate}%</b> open rate</span>
        ${c.stats.failed > 0 ? `<span class="cstat cstat-err"><b>${c.stats.failed}</b> failed</span>` : ''}
      </div>
      <div class="campaign-stats-bar"><div class="campaign-stats-fill" style="width:${openRate}%"></div></div>
      <button class="btn-secondary btn-xs campaign-refresh-btn" data-id="${c.id}">Refresh Stats</button>
    `;
    card.querySelector('.campaign-refresh-btn').addEventListener('click', () => refreshCampaignStats(c.id));
    list.appendChild(card);
  });
}

// Refresh open/click stats from Resend
async function refreshCampaignStats(campaignId) {
  if (!isElectron) return;
  const campaign = marketingState.campaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  let opened = 0, clicked = 0;
  for (const r of campaign.recipients) {
    if (!r.emailId) continue;
    const result = await ipcRenderer.invoke('get-email-status', r.emailId);
    if (result.success && result.email) {
      if (result.email.opened_at) opened++;
      if (result.email.clicked_at) clicked++;
    }
  }
  campaign.stats.opened = opened;
  campaign.stats.clicked = clicked;
  await saveCampaigns();
  renderCampaignsList();
  showNotification('Stats updated!', 'success');
}

// Helper to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Market this Beat: right-click handler
const marketThisBeatBtn = document.getElementById('market-this-beat-btn');
if (marketThisBeatBtn) {
  marketThisBeatBtn.addEventListener('click', () => {
    const beatPath = contextMenuTarget ? contextMenuTarget.beatPath : null;
    hideContextMenu();
    if (beatPath) {
      // Switch to customers tab -> campaigns view
      const tab = document.querySelector('[data-section="customers"]') || document.querySelector('[data-tab="customers"]');
      if (tab) tab.click();
      setTimeout(() => {
        switchCustomerView('campaigns');
        openCampaignCreator(beatPath);
      }, 150);
    }
  });
}

// Beat marketing badge helper
function getBeatMarketingBadge(beatPath) {
  const status = marketingState.beatStatus[beatPath];
  if (!status || !status.campaignCount) return '';
  return `<span class="marketing-sent-badge" title="Marketed ${status.campaignCount}x (last: ${new Date(status.sentAt).toLocaleDateString()})">Marketed</span>`;
}

// Campaign segment selector
const segmentSelect = document.getElementById('campaign-segment-select');
if (segmentSelect) segmentSelect.addEventListener('change', updateCampaignRecipientCount);

// Initialize marketing data on load
(async () => {
  await loadBeatMarketing();
  await loadCampaigns();
})();

//
// AI Customer Scanner
//

// State
let aiScanFile = null;
let aiScanMode = 'single';
let aiBatchFiles = [null, null, null, null, null];
let aiBatchResults = [null, null, null, null, null];
let aiBatchTargetSlot = -1;

function openAIScanModal() {
  document.getElementById('ai-scan-modal').style.display = 'flex';
  switchAIMode('single');
  clearAIScan();
  setupAIDropZone();
}

function closeAIScanModal() {
  document.getElementById('ai-scan-modal').style.display = 'none';
  clearAIScan();
}

function switchAIMode(mode) {
  aiScanMode = mode;
  const singleBtn = document.getElementById('ai-mode-single-btn');
  const batchBtn = document.getElementById('ai-mode-batch-btn');
  const singleLeft = document.getElementById('ai-single-mode-left');
  const batchLeft = document.getElementById('ai-batch-mode-left');
  const singleRight = document.getElementById('ai-single-mode-right');
  const batchRight = document.getElementById('ai-batch-mode-right');
  if (singleBtn) singleBtn.classList.toggle('active', mode === 'single');
  if (batchBtn) batchBtn.classList.toggle('active', mode === 'batch');
  if (singleLeft) singleLeft.style.display = mode === 'single' ? 'flex' : 'none';
  if (batchLeft) batchLeft.style.display = mode === 'batch' ? 'flex' : 'none';
  if (singleRight) singleRight.style.display = mode === 'single' ? 'flex' : 'none';
  if (batchRight) batchRight.style.display = mode === 'batch' ? 'flex' : 'none';
  setAIScanStatus('', '');
  if (mode === 'batch') setupBatchGrid();
}

function clearAIScan() {
  aiScanFile = null;
  aiBatchFiles = [null, null, null, null, null];
  aiBatchResults = [null, null, null, null, null];
  const preview = document.getElementById('ai-preview-img');
  const inner = document.getElementById('ai-dropzone-inner');
  if (preview) { preview.style.display = 'none'; preview.src = ''; }
  if (inner) inner.style.display = 'flex';
  setAIScanStatus('', '');
  ['ai-extracted-name','ai-extracted-instagram','ai-extracted-email','ai-extracted-beats'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const notes = document.getElementById('ai-extracted-notes');
  if (notes) notes.value = '';
  const badge = document.getElementById('ai-confidence-badge');
  if (badge) { badge.style.display = 'none'; badge.textContent = ''; }
  const typeEl = document.getElementById('ai-extracted-type');
  if (typeEl) typeEl.value = 'lead';
  // Reset batch grid
  if (aiScanMode === 'batch') renderBatchSlots();
  const resultsList = document.getElementById('ai-batch-results-list');
  if (resultsList) resultsList.innerHTML = '<p class="ai-batch-results-empty">Add images on the left, then click Scan All.</p>';
}

function setupAIDropZone() {
  const zone = document.getElementById('ai-image-dropzone');
  const fileInput = document.getElementById('ai-image-file-input');
  if (!zone || zone._aiSetup) return;
  zone._aiSetup = true;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadAIPreview(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadAIPreview(fileInput.files[0]);
    fileInput.value = '';
  });

  // Ctrl+V paste support  listens on document while modal is open
  if (!document._aiPasteHandler) {
    document._aiPasteHandler = (e) => {
      const modal = document.getElementById('ai-scan-modal');
      if (!modal || modal.style.display === 'none') return;
      const items = (e.clipboardData || e.originalEvent && e.originalEvent.clipboardData || {}).items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            loadAIPreview(file);
            setAIScanStatus('Screenshot pasted! Click Scan Image to analyze.', 'success');
          }
          break;
        }
      }
    };
    document.addEventListener('paste', document._aiPasteHandler);
  }
}

function loadAIPreview(file) {
  aiScanFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('ai-preview-img');
    const inner = document.getElementById('ai-dropzone-inner');
    preview.src = e.target.result;
    preview.style.display = 'block';
    inner.style.display = 'none';
    setAIScanStatus('', '');
  };
  reader.readAsDataURL(file);
}

function setAIScanStatus(msg, type) {
  const el = document.getElementById('ai-scan-status');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.className = 'ai-scan-status ' + (type || '');
  if (type === 'scanning') {
    el.innerHTML = `<div class="ai-spinner"></div><span>${msg}</span>`;
  } else {
    el.textContent = msg;
  }
}

async function runAIScan() {
  if (!aiScanFile) {
    setAIScanStatus('Please drop or select an image first.', 'error');
    return;
  }
  const model = document.getElementById('ai-vision-model-select').value;
  const btn = document.getElementById('ai-scan-analyze-btn');
  btn.disabled = true;
  setAIScanStatus('Analyzing image with ' + model + ' ...', 'scanning');

  try {
    const reader = new FileReader();
    const imageBase64 = await new Promise((resolve, reject) => {
      reader.onload = e => {
        const dataUrl = e.target.result;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(aiScanFile);
    });

    const result = await ipcRenderer.invoke('analyze-customer-image', {
      imageBase64,
      mimeType: aiScanFile.type || 'image/jpeg',
      vision_model: model
    });

    if (!result.success) {
      setAIScanStatus('Error: ' + (result.error || 'Unknown error'), 'error');
      return;
    }

    const d = result.data || {};
    document.getElementById('ai-extracted-name').value = d.name || '';
    document.getElementById('ai-extracted-instagram').value = d.username || d.instagram || '';
    document.getElementById('ai-extracted-email').value = d.email || '';
    document.getElementById('ai-extracted-beats').value = Array.isArray(d.beats_bought) ? d.beats_bought.join(', ') : (d.beats_bought || '');
    document.getElementById('ai-extracted-notes').value = d.notes || '';

    // Confidence badge
    const badge = document.getElementById('ai-confidence-badge');
    if (d.confidence !== undefined) {
      const conf = String(d.confidence).toLowerCase().trim();
      let pct;
      if (conf === 'high') pct = 90;
      else if (conf === 'medium') pct = 60;
      else if (conf === 'low') pct = 30;
      else pct = Math.round(parseFloat(conf) * 100);
      if (isNaN(pct)) pct = 60;
      const cls = pct >= 75 ? 'high' : pct >= 45 ? 'medium' : 'low';
      badge.textContent = `AI Confidence: ${pct}%`;
      badge.className = 'ai-confidence-badge ' + cls;
      badge.style.display = 'block';
    }

    setAIScanStatus('Scan complete! Review and edit the fields, then click Add to Database.', 'success');
  } catch (err) {
    setAIScanStatus('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function saveAIScannedCustomer() {
  const name = document.getElementById('ai-extracted-name').value.trim();
  const instagram = document.getElementById('ai-extracted-instagram').value.trim();
  const email = document.getElementById('ai-extracted-email').value.trim();
  const beatsText = document.getElementById('ai-extracted-beats').value.trim();
  const notes = document.getElementById('ai-extracted-notes').value.trim();
  const type = document.getElementById('ai-extracted-type').value;

  if (!name && !instagram && !email) {
    setAIScanStatus('Please fill in at least a name, username, or email.', 'error');
    return;
  }

  // Build customer object matching the app's schema
  const newCustomer = {
    id: Date.now().toString(),
    name: name || instagram || email,
    email: email || '',
    instagram: instagram.replace(/^@/, '') || '',
    phone: '',
    type: type,
    tags: beatsText ? beatsText.split(',').map(s => s.trim()).filter(Boolean) : [],
    notes: notes || '',
    totalSpent: 0,
    beatsInterested: beatsText ? beatsText.split(',').map(s => s.trim()).filter(Boolean) : [],
    dateAdded: new Date().toISOString(),
    lastContact: null,
    source: 'ai-scan'
  };

  // Use existing save mechanism
  customerState.customers.push(newCustomer);
  await saveCustomers();
  renderCustomerList();
  updateCustomerStats();
  closeAIScanModal();
  showNotification(`Customer "${newCustomer.name}" added via AI scan`, 'success');
  // Select the new customer
  setTimeout(() => selectCustomer(newCustomer.id), 200);
}

// Close AI scan modal on backdrop click
document.addEventListener('click', e => {
  const modal = document.getElementById('ai-scan-modal');
  if (e.target === modal) closeAIScanModal();
});

/*  Batch scan functions  */

function setupBatchGrid() {
  const grid = document.getElementById('ai-batch-grid');
  if (!grid) return;
  renderBatchSlots();

  const fileInput = document.getElementById('ai-batch-file-input');
  if (fileInput && !fileInput._batchSetup) {
    fileInput._batchSetup = true;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file && file.type.startsWith('image/')) {
        const slot = aiBatchTargetSlot >= 0 ? aiBatchTargetSlot : findNextEmptyBatchSlot();
        if (slot !== -1) setBatchSlotFile(slot, file);
      }
      aiBatchTargetSlot = -1;
      fileInput.value = '';
    });
  }

  // Drag multiple files onto the grid (not a specific slot)
  if (grid && !grid._batchSetup) {
    grid._batchSetup = true;
    grid.addEventListener('dragover', e => { e.preventDefault(); });
    grid.addEventListener('drop', e => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      files.forEach(file => {
        const slot = findNextEmptyBatchSlot();
        if (slot !== -1) setBatchSlotFile(slot, file);
      });
    });
  }
}

function findNextEmptyBatchSlot() {
  return aiBatchFiles.findIndex(f => f === null);
}

function renderBatchSlots() {
  const grid = document.getElementById('ai-batch-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.id = 'ai-batch-slot-' + i;
    slot.className = 'ai-batch-slot' + (aiBatchFiles[i] ? ' filled' : '');
    slot.onclick = () => batchSlotClick(i);

    if (aiBatchFiles[i]) {
      const img = document.createElement('img');
      img.className = 'ai-batch-slot-img';
      img.src = URL.createObjectURL(aiBatchFiles[i]);
      slot.appendChild(img);
      const removeBtn = document.createElement('button');
      removeBtn.className = 'ai-batch-slot-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.onclick = (e) => { e.stopPropagation(); removeBatchSlot(i); };
      slot.appendChild(removeBtn);
    } else {
      const empty = document.createElement('div');
      empty.className = 'ai-batch-slot-empty-icon';
      empty.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span class="ai-batch-slot-num">${i + 1}</span>`;
      slot.appendChild(empty);
    }

    slot.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      slot.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) setBatchSlotFile(i, file);
    });

    grid.appendChild(slot);
  }
  updateBatchScanBtn();
}

function batchSlotClick(index) {
  aiBatchTargetSlot = index;
  document.getElementById('ai-batch-file-input').click();
}

function setBatchSlotFile(index, file) {
  aiBatchFiles[index] = file;
  renderBatchSlots();
}

function removeBatchSlot(index) {
  aiBatchFiles[index] = null;
  aiBatchResults[index] = null;
  renderBatchSlots();
}

function updateBatchScanBtn() {
  const count = aiBatchFiles.filter(Boolean).length;
  const btn = document.getElementById('ai-batch-scan-btn');
  const txt = document.getElementById('ai-batch-btn-text');
  if (btn) btn.disabled = count === 0;
  if (txt) txt.textContent = count > 0 ? `Scan ${count} Image${count > 1 ? 's' : ''}` : 'Scan All Images';
}

async function runBatchScan() {
  const files = aiBatchFiles.filter(Boolean);
  if (files.length === 0) { setAIScanStatus('Add at least one image first.', 'error'); return; }

  const model = document.getElementById('ai-vision-model-select').value;
  const btn = document.getElementById('ai-batch-scan-btn');
  btn.disabled = true;
  aiBatchResults = [null, null, null, null, null];

  const resultsList = document.getElementById('ai-batch-results-list');
  if (resultsList) resultsList.innerHTML = '<p class="ai-batch-results-empty">Processing images...</p>';

  let processed = 0;
  for (let i = 0; i < 5; i++) {
    if (!aiBatchFiles[i]) continue;

    const slotEl = document.getElementById('ai-batch-slot-' + i);
    if (slotEl) {
      slotEl.classList.add('scanning');
      const overlay = document.createElement('div');
      overlay.className = 'ai-batch-slot-overlay';
      overlay.innerHTML = '<div class="ai-spinner" style="border-color:rgba(139,92,246,0.25);border-top-color:rgb(167,139,250)"></div>';
      slotEl.appendChild(overlay);
    }

    processed++;
    setAIScanStatus(`Scanning image ${processed} of ${files.length}...`, 'scanning');

    try {
      const imageBase64 = await fileToBase64(aiBatchFiles[i]);
      const result = await ipcRenderer.invoke('analyze-customer-image', { imageBase64, mimeType: aiBatchFiles[i].type || 'image/jpeg', vision_model: model });
      aiBatchResults[i] = { success: result.success, data: result.data, error: result.error, file: aiBatchFiles[i] };

      if (slotEl) {
        slotEl.classList.remove('scanning');
        slotEl.classList.add(result.success ? 'done' : 'error-slot');
        const overlay = slotEl.querySelector('.ai-batch-slot-overlay');
        if (overlay) overlay.innerHTML = result.success
          ? '<svg width="16" height="16" fill="none" stroke="rgb(74,222,128)" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
          : '<svg width="14" height="14" fill="none" stroke="rgb(248,113,113)" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      }
    } catch (e) {
      aiBatchResults[i] = { success: false, error: e.message, file: aiBatchFiles[i] };
      if (slotEl) { slotEl.classList.remove('scanning'); slotEl.classList.add('error-slot'); }
    }

    renderBatchResults();
  }

  btn.disabled = false;
  setAIScanStatus(`Done! ${processed} image${processed > 1 ? 's' : ''} scanned. Review results and click Add.`, 'success');
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderBatchResults() {
  const list = document.getElementById('ai-batch-results-list');
  if (!list) return;
  const hasAny = aiBatchResults.some(Boolean);
  if (!hasAny) { list.innerHTML = '<p class="ai-batch-results-empty">Processing...</p>'; return; }

  list.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const r = aiBatchResults[i];
    if (!r) continue;
    const card = document.createElement('div');
    card.className = 'ai-batch-result-card';
    card.dataset.index = i;

    if (r.success && r.data) {
      const d = r.data;
      const name = d.name || d.instagram || 'Unknown';
      const handle = d.instagram ? (d.instagram.startsWith('@') ? d.instagram : '@' + d.instagram) : '';
      const thumbSrc = r.file ? URL.createObjectURL(r.file) : '';
      card.innerHTML = `
        ${thumbSrc ? `<img class="ai-batch-result-thumb" src="${escapeHtml(thumbSrc)}">` : ''}
        <div class="ai-batch-result-info">
          <div class="ai-batch-result-name">${escapeHtml(name)}</div>
          <div class="ai-batch-result-handle">${escapeHtml(handle)}</div>
        </div>
        <select class="ai-batch-result-type-select" id="ai-batch-type-${i}">
          <option value="lead">Lead</option>
          <option value="customer">Customer</option>
          <option value="vip">VIP</option>
        </select>
        <button class="ai-batch-result-add-btn" id="ai-batch-add-${i}" onclick="addBatchResult(${i})">Add</button>`;
    } else {
      card.innerHTML = `<div class="ai-batch-result-error"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Image ${i + 1}: ${escapeHtml(r.error || 'Scan failed')}</div>`;
    }
    list.appendChild(card);
  }
}

async function addBatchResult(index) {
  const r = aiBatchResults[index];
  if (!r || !r.success) return;
  const btn = document.getElementById('ai-batch-add-' + index);
  if (btn && btn.classList.contains('added')) return;

  const d = r.data;
  const type = document.getElementById('ai-batch-type-' + index)?.value || 'lead';
  const newCustomer = {
    id: Date.now().toString() + '_' + index,
    name: d.name || d.instagram || d.email || 'Unknown',
    email: d.email || '',
    instagram: (d.instagram || '').replace(/^@/, ''),
    phone: '',
    type,
    tags: Array.isArray(d.beats_bought) ? d.beats_bought : [],
    notes: d.notes || '',
    totalSpent: 0,
    beatsInterested: Array.isArray(d.beats_bought) ? d.beats_bought : [],
    dateAdded: new Date().toISOString(),
    lastContact: null,
    source: 'ai-scan'
  };
  customerState.customers.push(newCustomer);
  await saveCustomers();
  renderCustomerList();
  updateCustomerStats();
  if (btn) { btn.textContent = 'Added'; btn.classList.add('added'); btn.disabled = true; }
  showNotification(`"${newCustomer.name}" added via AI scan`, 'success');
}

async function addAllBatchResults() {
  for (let i = 0; i < 5; i++) {
    const r = aiBatchResults[i];
    if (!r || !r.success) continue;
    const btn = document.getElementById('ai-batch-add-' + i);
    if (btn && !btn.classList.contains('added')) {
      await addBatchResult(i);
      await new Promise(res => setTimeout(res, 50));
    }
  }
}

//
// AI AGENT PANEL
//
(function initAiPanel() {
  const fab       = document.getElementById('ai-agent-fab');
  const panel     = document.getElementById('ai-agent-panel');
  const closeBtn  = document.getElementById('ai-panel-close');
  const messages  = document.getElementById('ai-panel-messages');
  const input     = document.getElementById('ai-panel-input');
  const sendBtn   = document.getElementById('ai-panel-send');
  if (!fab || !panel) return;

  let chatHistory = []; // [{role:'user'|'assistant', content}]

  // Toggle panel
  fab.addEventListener('click', () => {
    panel.classList.toggle('ai-panel-open');
    if (panel.classList.contains('ai-panel-open') && input) input.focus();
  });
  closeBtn.addEventListener('click', () => panel.classList.remove('ai-panel-open'));

  // Example chips
  messages.addEventListener('click', (e) => {
    const chip = e.target.closest('.ai-example-chip');
    if (chip) {
      input.value = chip.dataset.msg || '';
      input.focus();
    }
  });

  // Send on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCommand(); }
  });
  sendBtn.addEventListener('click', sendCommand);

  function removeWelcome() {
    const w = messages.querySelector('.ai-welcome');
    if (w) w.remove();
  }

  function appendUserMsg(text) {
    removeWelcome();
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-user';
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendAssistantMsg(text, log) {
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-assistant';
    if (log && log.length) {
      const toolsWrap = document.createElement('div');
      toolsWrap.className = 'ai-tool-calls';
      log.forEach(t => {
        const badge = document.createElement('div');
        badge.className = 'ai-tool-badge';
        const resultText = String(t.result).substring(0, 100);
        badge.innerHTML = `<span class="ai-tool-name">&#9881; ${t.tool}</span><span class="ai-tool-result">${resultText}</span>`;
        toolsWrap.appendChild(badge);
      });
      el.appendChild(toolsWrap);
    }
    const textEl = document.createElement('div');
    textEl.className = 'ai-msg-text';
    textEl.textContent = text;
    el.appendChild(textEl);
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendThinking() {
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-thinking';
    el.id = 'ai-thinking-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  async function sendCommand() {
    if (!input || !isElectron) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    appendUserMsg(msg);
    chatHistory.push({ role: 'user', content: msg });
    const thinking = appendThinking();
    try {
      const result = await ipcRenderer.invoke('ai-command', {
        message: msg,
        history: chatHistory.slice(-12) // last 6 exchanges
      });
      thinking.remove();
      if (result.success) {
        appendAssistantMsg(result.response, result.log);
        chatHistory.push({ role: 'assistant', content: result.response });
      } else {
        appendAssistantMsg(result.error, []);
      }
    } catch (e) {
      thinking.remove();
      appendAssistantMsg('Error: ' + e.message, []);
    }
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Reload packs/data when AI modifies them
  if (isElectron) {
    ipcRenderer.on('ai-data-updated', async () => {
      try {
        const savedData = await ipcRenderer.invoke('load-data');
        if (savedData && savedData.packs) {
          packs = savedData.packs;
          renderPacks();
          showNotification('App data updated by AI agent', 'success');
        }
      } catch (_) {}
    });

    ipcRenderer.on('ai-customers-updated', async () => {
      try {
        const data = await ipcRenderer.invoke('load-customers');
        if (data && data.customers) {
          customerState.customers = data.customers;
          customerState.emailHistory = data.emailHistory || [];
          renderCustomerList();
          updateCustomerStats();
          showNotification('Customer database updated by AI agent', 'success');
        }
      } catch (_) {}
    });
  }
})();
