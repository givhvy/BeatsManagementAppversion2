// ============================
// MARKETING PLANS SECTION
// ============================

let mpInitialized = false;
let mpState = {
  plans: [],
  filterStatus: 'all'
};

const MP_PLATFORMS = [
  'All Platforms', 'YouTube', 'Instagram', 'TikTok', 'Twitter/X',
  'Email', 'Beatstars', 'SoundCloud', 'Discord', 'Reddit', 'Other'
];

const MP_STATUS_CYCLE = {
  'draft': 'active',
  'active': 'completed',
  'completed': 'archived',
  'archived': 'draft'
};

function initMarketingPlansSection() {
  if (mpInitialized) return;
  mpInitialized = true;

  mpBindFilterEvents();
  mpLoadData();

  document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('mp-modal-overlay');
    if (event.key === 'Escape' && modal?.style.display === 'flex') {
      mpCloseModal();
    }
  });
}

function mpBindFilterEvents() {
  document.querySelectorAll('#mp-status-filters .mp-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mpState.filterStatus = btn.dataset.status;
      document.querySelectorAll('#mp-status-filters .mp-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mpRenderPlans();
    });
  });
}

async function mpLoadData() {
  try {
    let data = null;
    if (isElectron) {
      data = await ipcRenderer.invoke('load-marketing-plans');
    } else {
      data = JSON.parse(localStorage.getItem('beats-marketing-plans') || '{}');
    }
    mpState.plans = Array.isArray(data?.plans) ? data.plans : [];
    mpRenderPlans();
    mpUpdateStats();
  } catch (error) {
    console.error('[Marketing Plans] Failed to load data:', error);
    mpRenderPlans();
    mpUpdateStats();
  }
}

async function mpSaveData() {
  const payload = { plans: mpState.plans };
  try {
    if (isElectron) {
      const result = await ipcRenderer.invoke('save-marketing-plans', payload);
      if (!result || !result.success) throw new Error(result?.error || 'save-marketing-plans failed');
    } else {
      localStorage.setItem('beats-marketing-plans', JSON.stringify(payload));
    }
  } catch (error) {
    console.error('[Marketing Plans] Failed to save data:', error);
    showNotification?.(`Could not save marketing plans: ${error.message}`, 'error');
  }
}

function mpOpenModal(planId = null) {
  const overlay = document.getElementById('mp-modal-overlay');
  const heading = document.getElementById('mp-modal-heading');
  const idInput = document.getElementById('mp-modal-edit-id');
  const nameInput = document.getElementById('mp-modal-name-input');
  const descInput = document.getElementById('mp-modal-desc-input');
  const statusInput = document.getElementById('mp-modal-status-input');
  const platformInput = document.getElementById('mp-modal-platform-input');
  const startInput = document.getElementById('mp-modal-start-input');
  const endInput = document.getElementById('mp-modal-end-input');
  const goalsInput = document.getElementById('mp-modal-goals-input');
  const notesInput = document.getElementById('mp-modal-notes-input');

  const plan = planId ? mpState.plans.find(p => p.id === planId) : null;

  if (heading) heading.textContent = plan ? 'Edit Marketing Plan' : 'New Marketing Plan';
  if (idInput) idInput.value = plan?.id || '';
  if (nameInput) nameInput.value = plan?.name || '';
  if (descInput) descInput.value = plan?.description || '';
  if (statusInput) statusInput.value = plan?.status || 'draft';
  if (platformInput) platformInput.value = plan?.platform || 'All Platforms';
  if (startInput) startInput.value = plan?.startDate ? plan.startDate.slice(0, 10) : '';
  if (endInput) endInput.value = plan?.endDate ? plan.endDate.slice(0, 10) : '';
  if (goalsInput) goalsInput.value = plan?.goals || '';
  if (notesInput) notesInput.value = plan?.notes || '';

  if (overlay) overlay.style.display = 'flex';
  setTimeout(() => nameInput?.focus(), 0);
}

function mpCloseModal() {
  const overlay = document.getElementById('mp-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function mpModalOverlayClick(event) {
  if (event.target?.id === 'mp-modal-overlay') mpCloseModal();
}

async function mpSavePlan() {
  const id = document.getElementById('mp-modal-edit-id')?.value || '';
  const name = document.getElementById('mp-modal-name-input')?.value.trim() || '';
  const description = document.getElementById('mp-modal-desc-input')?.value.trim() || '';
  const status = document.getElementById('mp-modal-status-input')?.value || 'draft';
  const platform = document.getElementById('mp-modal-platform-input')?.value || 'All Platforms';
  const startDateRaw = document.getElementById('mp-modal-start-input')?.value || '';
  const endDateRaw = document.getElementById('mp-modal-end-input')?.value || '';
  const goals = document.getElementById('mp-modal-goals-input')?.value.trim() || '';
  const notes = document.getElementById('mp-modal-notes-input')?.value.trim() || '';

  if (!name) {
    showNotification?.('Please enter a plan name', 'error');
    return;
  }

  const startDate = startDateRaw ? new Date(startDateRaw).toISOString() : null;
  const endDate = endDateRaw ? new Date(endDateRaw).toISOString() : null;

  if (id) {
    const index = mpState.plans.findIndex(p => p.id === id);
    if (index !== -1) {
      const existing = mpState.plans[index];
      mpState.plans[index] = {
        ...existing,
        name,
        description,
        status,
        platform,
        startDate,
        endDate,
        goals,
        notes,
        completedAt: status === 'completed' ? (existing.completedAt || new Date().toISOString()) : null,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    mpState.plans.unshift({
      id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      status,
      platform,
      startDate,
      endDate,
      goals,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : null
    });
  }

  await mpSaveData();
  mpRenderPlans();
  mpUpdateStats();
  mpCloseModal();
  showNotification?.('Marketing plan saved', 'success');
}

async function mpTogglePlanStatus(planId) {
  const plan = mpState.plans.find(p => p.id === planId);
  if (!plan) return;

  plan.status = MP_STATUS_CYCLE[plan.status] || 'draft';
  plan.completedAt = plan.status === 'completed' ? new Date().toISOString() : null;
  plan.updatedAt = new Date().toISOString();

  await mpSaveData();
  mpRenderPlans();
  mpUpdateStats();
}

async function mpDeletePlan(planId) {
  const plan = mpState.plans.find(p => p.id === planId);
  if (!plan) return;

  mpState.plans = mpState.plans.filter(p => p.id !== planId);
  await mpSaveData();
  mpRenderPlans();
  mpUpdateStats();
  showNotification?.('Plan deleted', 'info');
}

function mpRenderPlans() {
  const list = document.getElementById('mp-plans-list');
  const empty = document.getElementById('mp-empty-state');
  if (!list) return;

  const query = (document.getElementById('mp-search')?.value || '').trim().toLowerCase();

  let plans = mpState.plans.slice().sort((a, b) => {
    const statusOrder = { 'active': 0, 'draft': 1, 'completed': 2, 'archived': 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  if (mpState.filterStatus !== 'all') {
    plans = plans.filter(p => p.status === mpState.filterStatus);
  }
  if (query) {
    plans = plans.filter(p => {
      const haystack = [p.name, p.description, p.platform, p.goals, p.notes].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  list.innerHTML = '';

  if (plans.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';

  plans.forEach(plan => {
    const statusClass = plan.status || 'draft';
    const statusLabel = plan.status === 'in-progress' ? 'In Progress' : mpCapitalize(plan.status);
    const platformLabel = plan.platform || 'All Platforms';

    let dateRange = '';
    if (plan.startDate || plan.endDate) {
      const start = plan.startDate ? new Date(plan.startDate).toLocaleDateString() : '?';
      const end = plan.endDate ? new Date(plan.endDate).toLocaleDateString() : '?';
      dateRange = `<span class="mp-date-range">${start} → ${end}</span>`;
    }

    const card = document.createElement('div');
    card.className = `mp-plan-card mp-status-${statusClass}`;
    card.innerHTML = `
      <div class="mp-plan-header">
        <div class="mp-plan-title-row">
          <button class="mp-status-toggle mp-status-${statusClass}" onclick="mpTogglePlanStatus('${plan.id}')" title="Click to cycle status">
            <span class="mp-status-dot"></span>
          </button>
          <div class="mp-plan-title">${mpEscapeHtml(plan.name)}</div>
        </div>
        <div class="mp-plan-actions">
          <button class="mp-plan-btn" onclick="mpOpenModal('${plan.id}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"/></svg>
          </button>
          <button class="mp-plan-btn mp-plan-btn-danger" onclick="mpDeletePlan('${plan.id}')" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      ${plan.description ? `<div class="mp-plan-desc">${mpEscapeHtml(plan.description)}</div>` : ''}
      <div class="mp-plan-meta">
        <span class="mp-platform-badge">${mpEscapeHtml(platformLabel)}</span>
        <span class="mp-status-text mp-status-text-${statusClass}">${statusLabel}</span>
        ${dateRange}
      </div>
      ${plan.goals ? `<div class="mp-plan-goals"><strong>Goals:</strong> ${mpEscapeHtml(plan.goals)}</div>` : ''}
      ${plan.notes ? `<div class="mp-plan-notes"><strong>Notes:</strong> ${mpEscapeHtml(plan.notes)}</div>` : ''}
    `;
    list.appendChild(card);
  });
}

function mpUpdateStats() {
  const total = mpState.plans.length;
  const active = mpState.plans.filter(p => p.status === 'active').length;
  const draft = mpState.plans.filter(p => p.status === 'draft').length;
  const completed = mpState.plans.filter(p => p.status === 'completed').length;

  const statTotal = document.getElementById('mp-stat-total');
  const statActive = document.getElementById('mp-stat-active');
  const statDraft = document.getElementById('mp-stat-draft');
  const statCompleted = document.getElementById('mp-stat-completed');

  if (statTotal) statTotal.textContent = total;
  if (statActive) statActive.textContent = active;
  if (statDraft) statDraft.textContent = draft;
  if (statCompleted) statCompleted.textContent = completed;
}

function mpCapitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mpEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.initMarketingPlansSection = initMarketingPlansSection;
window.mpOpenModal = mpOpenModal;
window.mpCloseModal = mpCloseModal;
window.mpModalOverlayClick = mpModalOverlayClick;
window.mpSavePlan = mpSavePlan;
window.mpTogglePlanStatus = mpTogglePlanStatus;
window.mpDeletePlan = mpDeletePlan;
window.mpRenderPlans = mpRenderPlans;

setTimeout(() => {
  const section = document.getElementById('marketing-plans-section');
  if (section?.classList.contains('active')) initMarketingPlansSection();
}, 0);
