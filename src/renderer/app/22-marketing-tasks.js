// ============================
// MARKETING TASKS SECTION
// ============================

let mtkInitialized = false;
let mtkState = {
  tasks: [],
  filterStatus: 'all',
  filterPlatform: 'all'
};

const MTK_PLATFORMS = [
  'YouTube', 'Instagram', 'TikTok', 'Twitter/X', 'Email',
  'Beatstars', 'SoundCloud', 'Discord', 'Reddit', 'Other'
];

function initMarketingSection() {
  if (mtkInitialized) return;
  mtkInitialized = true;

  mtkBindFilterEvents();
  mtkLoadData();

  document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('mtk-modal-overlay');
    if (event.key === 'Escape' && modal?.style.display === 'flex') {
      mtkCloseModal();
    }
  });
}

function mtkBindFilterEvents() {
  document.querySelectorAll('#mtk-status-filters .mtk-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mtkState.filterStatus = btn.dataset.status;
      document.querySelectorAll('#mtk-status-filters .mtk-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mtkRenderTasks();
    });
  });

  const platformFilter = document.getElementById('mtk-platform-filter');
  if (platformFilter) {
    platformFilter.addEventListener('change', () => {
      mtkState.filterPlatform = platformFilter.value;
      mtkRenderTasks();
    });
  }
}

async function mtkLoadData() {
  try {
    let data = null;
    if (isElectron) {
      data = await ipcRenderer.invoke('load-marketing-tasks');
    } else {
      data = JSON.parse(localStorage.getItem('beats-marketing-tasks') || '{}');
    }
    mtkState.tasks = Array.isArray(data?.tasks) ? data.tasks : [];
    mtkRenderTasks();
    mtkUpdateStats();
  } catch (error) {
    console.error('[Marketing Tasks] Failed to load data:', error);
    mtkRenderTasks();
    mtkUpdateStats();
  }
}

async function mtkSaveData() {
  const payload = { tasks: mtkState.tasks };
  try {
    if (isElectron) {
      const result = await ipcRenderer.invoke('save-marketing-tasks', payload);
      if (!result || !result.success) throw new Error(result?.error || 'save-marketing-tasks failed');
    } else {
      localStorage.setItem('beats-marketing-tasks', JSON.stringify(payload));
    }
  } catch (error) {
    console.error('[Marketing Tasks] Failed to save data:', error);
    showNotification?.(`Could not save marketing tasks: ${error.message}`, 'error');
  }
}

function mtkOpenModal(taskId = null) {
  const overlay = document.getElementById('mtk-modal-overlay');
  const heading = document.getElementById('mtk-modal-heading');
  const idInput = document.getElementById('mtk-modal-edit-id');
  const titleInput = document.getElementById('mtk-modal-title-input');
  const descInput = document.getElementById('mtk-modal-desc-input');
  const platformInput = document.getElementById('mtk-modal-platform-input');
  const priorityInput = document.getElementById('mtk-modal-priority-input');
  const statusInput = document.getElementById('mtk-modal-status-input');
  const dueInput = document.getElementById('mtk-modal-due-input');
  const beatsInput = document.getElementById('mtk-modal-beats-input');

  const task = taskId ? mtkState.tasks.find(t => t.id === taskId) : null;

  if (heading) heading.textContent = task ? 'Edit Marketing Task' : 'New Marketing Task';
  if (idInput) idInput.value = task?.id || '';
  if (titleInput) titleInput.value = task?.title || '';
  if (descInput) descInput.value = task?.description || '';
  if (platformInput) platformInput.value = task?.platform || 'Other';
  if (priorityInput) priorityInput.value = task?.priority || 'medium';
  if (statusInput) statusInput.value = task?.status || 'todo';
  if (dueInput) dueInput.value = task?.dueDate ? task.dueDate.slice(0, 10) : '';
  if (beatsInput) beatsInput.value = (task?.beats || []).join(', ');

  if (overlay) overlay.style.display = 'flex';
  setTimeout(() => titleInput?.focus(), 0);
}

function mtkCloseModal() {
  const overlay = document.getElementById('mtk-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function mtkModalOverlayClick(event) {
  if (event.target?.id === 'mtk-modal-overlay') mtkCloseModal();
}

async function mtkSaveTask() {
  const id = document.getElementById('mtk-modal-edit-id')?.value || '';
  const title = document.getElementById('mtk-modal-title-input')?.value.trim() || '';
  const description = document.getElementById('mtk-modal-desc-input')?.value.trim() || '';
  const platform = document.getElementById('mtk-modal-platform-input')?.value || 'Other';
  const priority = document.getElementById('mtk-modal-priority-input')?.value || 'medium';
  const status = document.getElementById('mtk-modal-status-input')?.value || 'todo';
  const dueDateRaw = document.getElementById('mtk-modal-due-input')?.value || '';
  const beats = (document.getElementById('mtk-modal-beats-input')?.value || '')
    .split(',')
    .map(b => b.trim())
    .filter(Boolean);

  if (!title) {
    showNotification?.('Please enter a task title', 'error');
    return;
  }

  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;

  if (id) {
    const index = mtkState.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      const existing = mtkState.tasks[index];
      mtkState.tasks[index] = {
        ...existing,
        title,
        description,
        platform,
        priority,
        status,
        dueDate,
        beats,
        completedAt: status === 'done' ? (existing.completedAt || new Date().toISOString()) : null,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    mtkState.tasks.unshift({
      id: `mtk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      platform,
      priority,
      status,
      dueDate,
      beats,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: status === 'done' ? new Date().toISOString() : null
    });
  }

  await mtkSaveData();
  mtkRenderTasks();
  mtkUpdateStats();
  mtkCloseModal();
  showNotification?.('Marketing task saved', 'success');
}

async function mtkToggleTaskStatus(taskId) {
  const task = mtkState.tasks.find(t => t.id === taskId);
  if (!task) return;

  const cycle = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };
  task.status = cycle[task.status] || 'todo';
  task.completedAt = task.status === 'done' ? new Date().toISOString() : null;
  task.updatedAt = new Date().toISOString();

  await mtkSaveData();
  mtkRenderTasks();
  mtkUpdateStats();
}

async function mtkDeleteTask(taskId) {
  const task = mtkState.tasks.find(t => t.id === taskId);
  if (!task) return;

  mtkState.tasks = mtkState.tasks.filter(t => t.id !== taskId);
  await mtkSaveData();
  mtkRenderTasks();
  mtkUpdateStats();
  showNotification?.('Task deleted', 'info');
}

function mtkRenderTasks() {
  const list = document.getElementById('mtk-tasks-list');
  const empty = document.getElementById('mtk-empty-state');
  if (!list) return;

  const query = (document.getElementById('mtk-search')?.value || '').trim().toLowerCase();

  let tasks = mtkState.tasks.slice().sort((a, b) => {
    const statusOrder = { 'todo': 0, 'in-progress': 1, 'done': 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (mtkState.filterStatus !== 'all') {
    tasks = tasks.filter(t => t.status === mtkState.filterStatus);
  }
  if (mtkState.filterPlatform !== 'all') {
    tasks = tasks.filter(t => t.platform === mtkState.filterPlatform);
  }
  if (query) {
    tasks = tasks.filter(t => {
      const haystack = [t.title, t.description, t.platform, ...(t.beats || [])].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  list.innerHTML = '';

  if (tasks.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';

  tasks.forEach(task => {
    const isDone = task.status === 'done';
    const isInProgress = task.status === 'in-progress';
    const statusLabel = task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1);
    const statusClass = isDone ? 'done' : isInProgress ? 'in-progress' : 'todo';
    const priorityClass = task.priority || 'medium';

    let dueLabel = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const isOverdue = !isDone && due < new Date().setHours(0, 0, 0, 0);
      dueLabel = `<span class="mtk-due-label ${isOverdue ? 'overdue' : ''}">Due ${due.toLocaleDateString()}</span>`;
    }

    const beatsHtml = (task.beats || []).length
      ? `<div class="mtk-task-beats">${task.beats.map(b => `<span class="mtk-beat-chip">${mtkEscapeHtml(b)}</span>`).join('')}</div>`
      : '';

    const card = document.createElement('div');
    card.className = `mtk-task-card ${isDone ? 'mtk-task-done' : ''}`;
    card.innerHTML = `
      <div class="mtk-task-left">
        <button class="mtk-status-toggle mtk-status-${statusClass}" onclick="mtkToggleTaskStatus('${task.id}')" title="Click to cycle status">
          ${isDone
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : `<span class="mtk-status-dot"></span>`
          }
        </button>
        <div class="mtk-task-content">
          <div class="mtk-task-title-row">
            <div class="mtk-task-title">${mtkEscapeHtml(task.title)}</div>
            <span class="mtk-priority-badge mtk-priority-${priorityClass}">${task.priority || 'medium'}</span>
          </div>
          ${task.description ? `<div class="mtk-task-desc">${mtkEscapeHtml(task.description)}</div>` : ''}
          <div class="mtk-task-meta">
            <span class="mtk-platform-badge">${mtkEscapeHtml(task.platform || 'Other')}</span>
            <span class="mtk-status-text mtk-status-text-${statusClass}">${statusLabel}</span>
            ${dueLabel}
          </div>
          ${beatsHtml}
        </div>
      </div>
      <div class="mtk-task-actions">
        <button class="mtk-task-btn" onclick="mtkOpenModal('${task.id}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"/></svg>
        </button>
        <button class="mtk-task-btn mtk-task-btn-danger" onclick="mtkDeleteTask('${task.id}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

function mtkUpdateStats() {
  const total = mtkState.tasks.length;
  const done = mtkState.tasks.filter(t => t.status === 'done').length;
  const inProgress = mtkState.tasks.filter(t => t.status === 'in-progress').length;
  const todo = mtkState.tasks.filter(t => t.status === 'todo').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statTotal = document.getElementById('mtk-stat-total');
  const statDone = document.getElementById('mtk-stat-done');
  const statProgress = document.getElementById('mtk-stat-progress');
  const statTodo = document.getElementById('mtk-stat-todo');
  const completionPct = document.getElementById('mtk-completion-pct');
  const completionFill = document.getElementById('mtk-completion-fill');

  if (statTotal) statTotal.textContent = total;
  if (statDone) statDone.textContent = done;
  if (statProgress) statProgress.textContent = inProgress;
  if (statTodo) statTodo.textContent = todo;
  if (completionPct) completionPct.textContent = `${pct}%`;
  if (completionFill) completionFill.style.width = `${pct}%`;
}

function mtkEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.initMarketingSection = initMarketingSection;
window.mtkOpenModal = mtkOpenModal;
window.mtkCloseModal = mtkCloseModal;
window.mtkModalOverlayClick = mtkModalOverlayClick;
window.mtkSaveTask = mtkSaveTask;
window.mtkToggleTaskStatus = mtkToggleTaskStatus;
window.mtkDeleteTask = mtkDeleteTask;
window.mtkRenderTasks = mtkRenderTasks;

setTimeout(() => {
  const section = document.getElementById('marketing-tasks-section');
  if (section?.classList.contains('active')) initMarketingSection();
}, 0);
