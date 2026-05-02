// ============================
// MONEY MANAGEMENT SECTION
// ============================

let moneyState = {
  transactions: [],      // all stored transactions
  filtered: [],          // currently visible after filters
  period: 'week',
  typeFilter: 'all',
  platformFilter: 'all',
  searchQuery: '',
  sortOrder: 'date-desc',
  initialized: false,
  editingId: null        // id of transaction being edited, or null
};

// ------- Init -------
async function initMoneySection() {
  if (moneyState.initialized) {
    renderMoney();
    return;
  }
  moneyState.initialized = true;

  // Set today as default date
  const dateInput = document.getElementById('money-date-input');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Load saved data
  const saved = await ipcRenderer.invoke('load-money-data');
  if (saved && Array.isArray(saved.transactions)) {
    moneyState.transactions = saved.transactions;
  }

  bindMoneyEvents();
  renderMoney();
}

function bindMoneyEvents() {
  // Period buttons
  document.querySelectorAll('.money-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.money-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      moneyState.period = btn.dataset.period;
      renderMoney();
    });
  });

  // Type filter pills
  document.querySelectorAll('#money-type-filter .money-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#money-type-filter .money-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      moneyState.typeFilter = pill.dataset.type;
      renderMoney();
    });
  });

  // Platform filter pills
  document.querySelectorAll('#money-platform-filter .money-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#money-platform-filter .money-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      moneyState.platformFilter = pill.dataset.platform;
      renderMoney();
    });
  });

  // Search
  const searchInput = document.getElementById('money-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      moneyState.searchQuery = searchInput.value.toLowerCase().trim();
      renderMoney();
    });
  }

  // Sort
  const sortSelect = document.getElementById('money-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      moneyState.sortOrder = sortSelect.value;
      renderMoney();
    });
  }

  // Add / Save button
  const addBtn = document.getElementById('money-add-btn');
  if (addBtn) addBtn.addEventListener('click', handleMoneyAdd);

  // Cancel edit button
  const cancelBtn = document.getElementById('money-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', cancelMoneyEdit);

  // Enter key on inputs triggers add/save
  ['money-beat-name', 'money-customer-input', 'money-notes-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleMoneyAdd(); });
  });
}

// ------- Add Transaction -------
async function handleMoneyAdd() {
  const beatName = (document.getElementById('money-beat-name')?.value || '').trim();
  if (!beatName) {
    showNotification('Beat name is required', 'error');
    document.getElementById('money-beat-name')?.focus();
    return;
  }

  const typeInput = document.getElementById('money-type-input');
  const platformInput = document.getElementById('money-platform-input');
  const amountInput = document.getElementById('money-amount-input');
  const dateInput = document.getElementById('money-date-input');
  const customerInput = document.getElementById('money-customer-input');
  const notesInput = document.getElementById('money-notes-input');

  const type = typeInput?.value || 'lease';
  const platform = platformInput?.value || 'beatstars';
  const amount = parseFloat(amountInput?.value || '0') || 0;
  const date = dateInput?.value || new Date().toISOString().split('T')[0];
  const customer = (customerInput?.value || '').trim();
  const notes = (notesInput?.value || '').trim();

  if (moneyState.editingId) {
    // Update existing transaction
    const idx = moneyState.transactions.findIndex(t => t.id === moneyState.editingId);
    if (idx !== -1) {
      moneyState.transactions[idx] = {
        ...moneyState.transactions[idx],
        beatName, type, platform, amount, date, customer, notes
      };
    }
    moneyState.editingId = null;
    await saveMoneyData();
    resetMoneyForm();
    showNotification(`Transaction updated: ${beatName}`, 'success');
    renderMoney();
    return;
  }

  const tx = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    beatName,
    type,
    platform,
    amount,
    date,
    customer,
    notes,
    createdAt: new Date().toISOString()
  };

  moneyState.transactions.push(tx);
  await saveMoneyData();
  resetMoneyForm();
  showNotification(`Transaction added: ${beatName}`, 'success');
  renderMoney();
}

function resetMoneyForm() {
  if (document.getElementById('money-beat-name')) document.getElementById('money-beat-name').value = '';
  const amountInput = document.getElementById('money-amount-input');
  const customerInput = document.getElementById('money-customer-input');
  const notesInput = document.getElementById('money-notes-input');
  const dateInput = document.getElementById('money-date-input');
  if (amountInput) amountInput.value = '';
  if (customerInput) customerInput.value = '';
  if (notesInput) notesInput.value = '';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  // Reset type/platform selects to defaults
  const typeInput = document.getElementById('money-type-input');
  const platformInput = document.getElementById('money-platform-input');
  if (typeInput) typeInput.value = 'lease';
  if (platformInput) platformInput.value = 'beatstars';
  setMoneyFormMode('add');
}

function setMoneyFormMode(mode) {
  const addBtn = document.getElementById('money-add-btn');
  const cancelBtn = document.getElementById('money-cancel-btn');
  const form = document.getElementById('money-form-block');
  if (mode === 'edit') {
    if (addBtn) {
      addBtn.querySelector('.money-btn-label').textContent = 'Save Changes';
      addBtn.querySelector('svg').innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    }
    if (cancelBtn) cancelBtn.style.display = 'flex';
    if (form) form.classList.add('money-form--editing');
  } else {
    if (addBtn) {
      addBtn.querySelector('.money-btn-label').textContent = 'Add Transaction';
      addBtn.querySelector('svg').innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (form) form.classList.remove('money-form--editing');
  }
}

function handleMoneyEdit(id) {
  const tx = moneyState.transactions.find(t => t.id === id);
  if (!tx) return;

  moneyState.editingId = id;

  // Populate form
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
  set('money-beat-name', tx.beatName);
  set('money-type-input', tx.type);
  set('money-platform-input', tx.platform);
  set('money-amount-input', tx.type === 'free' ? '0' : (tx.amount || 0));
  set('money-date-input', tx.date);
  set('money-customer-input', tx.customer || '');
  set('money-notes-input', tx.notes || '');

  setMoneyFormMode('edit');

  // Scroll right panel to top so form is visible
  const inner = document.querySelector('.money-right-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('money-beat-name')?.focus();
}

function cancelMoneyEdit() {
  moneyState.editingId = null;
  resetMoneyForm();
}

async function handleMoneyDelete(id) {
  moneyState.transactions = moneyState.transactions.filter(t => t.id !== id);
  await saveMoneyData();
  renderMoney();
}

async function saveMoneyData() {
  await ipcRenderer.invoke('save-money-data', { transactions: moneyState.transactions });
}

// ------- Period Filtering -------
function getFilteredByPeriod(txs, period) {
  const now = new Date();
  return txs.filter(tx => {
    const d = new Date(tx.date);
    if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      start.setHours(0,0,0,0);
      return d >= start;
    } else if (period === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    } else if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true; // 'all'
  });
}

// ------- Render -------
function renderMoney() {
  let txs = getFilteredByPeriod(moneyState.transactions, moneyState.period);

  // Type filter
  if (moneyState.typeFilter !== 'all') {
    txs = txs.filter(t => t.type === moneyState.typeFilter);
  }
  // Platform filter
  if (moneyState.platformFilter !== 'all') {
    txs = txs.filter(t => t.platform === moneyState.platformFilter);
  }
  // Search
  if (moneyState.searchQuery) {
    txs = txs.filter(t =>
      t.beatName.toLowerCase().includes(moneyState.searchQuery) ||
      (t.customer || '').toLowerCase().includes(moneyState.searchQuery) ||
      (t.notes || '').toLowerCase().includes(moneyState.searchQuery)
    );
  }

  // Sort
  txs = [...txs].sort((a, b) => {
    if (moneyState.sortOrder === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (moneyState.sortOrder === 'date-asc')  return new Date(a.date) - new Date(b.date);
    if (moneyState.sortOrder === 'amount-desc') return b.amount - a.amount;
    if (moneyState.sortOrder === 'amount-asc')  return a.amount - b.amount;
    return 0;
  });

  moneyState.filtered = txs;

  // Revenue = period txs (all types/platforms, before type/platform filter for KPI accuracy)
  const periodTxs = getFilteredByPeriod(moneyState.transactions, moneyState.period);
  const paidTxs = periodTxs.filter(t => t.type !== 'free');
  const totalRevenue = paidTxs.reduce((s, t) => s + (t.amount || 0), 0);
  const salesCount = paidTxs.length;
  const avgSale = salesCount ? totalRevenue / salesCount : 0;
  const exclCount = periodTxs.filter(t => t.type === 'exclusive').length;
  const freeCount = periodTxs.filter(t => t.type === 'free').length;

  // Update KPI
  const revEl = document.getElementById('money-total-revenue');
  if (revEl) revEl.textContent = '$' + totalRevenue.toFixed(2);

  const periodLabels = { week: 'this week', month: 'this month', year: 'this year', all: 'all time' };
  const kpiPeriodEl = document.getElementById('money-kpi-period-label');
  if (kpiPeriodEl) kpiPeriodEl.textContent = periodLabels[moneyState.period] || '';

  const txCountEl = document.getElementById('money-tx-count');
  if (txCountEl) txCountEl.textContent = salesCount;
  const avgEl = document.getElementById('money-avg-sale');
  if (avgEl) avgEl.textContent = '$' + Math.round(avgSale);
  const exclEl = document.getElementById('money-excl-count');
  if (exclEl) exclEl.textContent = exclCount;
  const freeEl = document.getElementById('money-free-count');
  if (freeEl) freeEl.textContent = freeCount;

  // Top beat (by revenue in period)
  const beatRevMap = {};
  paidTxs.forEach(t => { beatRevMap[t.beatName] = (beatRevMap[t.beatName] || 0) + t.amount; });
  const topBeat = Object.entries(beatRevMap).sort((a,b) => b[1]-a[1])[0];
  const topBeatEl = document.getElementById('money-top-beat');
  const topBeatAmtEl = document.getElementById('money-top-beat-amount');
  if (topBeatEl) topBeatEl.textContent = topBeat ? topBeat[0] : '';
  if (topBeatAmtEl) topBeatAmtEl.textContent = topBeat ? '$' + topBeat[1].toFixed(2) : '';

  // Chart
  renderMoneyChart(periodTxs);

  // Badge
  const badge = document.getElementById('money-tx-badge');
  if (badge) badge.textContent = txs.length + (txs.length === 1 ? ' transaction' : ' transactions');

  // Transactions
  renderMoneyTxList(txs);

  // Breakdowns
  renderMoneyBreakdown(periodTxs, 'type', 'money-type-breakdown',
    { lease: '#F59E0B', exclusive: '#EF4444', stem: '#8B5CF6', free: '#6B7280' }
  );
  renderMoneyBreakdown(periodTxs, 'platform', 'money-platform-breakdown',
    { beatstars: '#F59E0B', airbit: '#3B82F6', direct: '#10B981', other: '#6B7280' }
  );
}

// ------- Chart -------
function renderMoneyChart(periodTxs) {
  const container = document.getElementById('money-chart-bars');
  const titleEl = document.getElementById('money-chart-title');
  if (!container) return;

  const period = moneyState.period;
  let groups = [];

  if (period === 'week') {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    groups = days.map((label, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      return { label, dateStr: ds };
    });
    if (titleEl) titleEl.textContent = 'Daily Revenue - This Week';
  } else if (period === 'month') {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    // Group into 4-5 week buckets
    const weeks = [[], [], [], [], []];
    for (let d = 1; d <= daysInMonth; d++) {
      const weekIdx = Math.floor((d-1) / 7);
      weeks[Math.min(weekIdx, 4)].push(d);
    }
    groups = weeks.filter(w => w.length > 0).map((w, i) => ({
      label: `W${i+1}`,
      days: w.map(d => {
        const dt = new Date(now.getFullYear(), now.getMonth(), d);
        return dt.toISOString().split('T')[0];
      })
    }));
    if (titleEl) titleEl.textContent = 'Weekly Revenue  This Month';
  } else if (period === 'year') {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const yr = new Date().getFullYear();
    groups = months.map((label, i) => ({ label, year: yr, month: i }));
    if (titleEl) titleEl.textContent = 'Monthly Revenue  This Year';
  } else {
    // All time: group by year
    const years = [...new Set(periodTxs.map(t => new Date(t.date).getFullYear()))].sort();
    if (years.length === 0) years.push(new Date().getFullYear());
    groups = years.map(y => ({ label: '' + y, year: y }));
    if (titleEl) titleEl.textContent = 'Annual Revenue  All Time';
  }

  // Calculate totals per group
  const groupTotals = groups.map(g => {
    const txsInGroup = periodTxs.filter(t => {
      const d = new Date(t.date);
      if (period === 'week')   return t.date === g.dateStr;
      if (period === 'month')  return (g.days || []).includes(t.date);
      if (period === 'year')   return d.getFullYear() === g.year && d.getMonth() === g.month;
      if (period === 'all')    return d.getFullYear() === g.year;
      return false;
    });
    return {
      label: g.label,
      lease:     txsInGroup.filter(t => t.type === 'lease').reduce((s,t) => s+t.amount, 0),
      exclusive: txsInGroup.filter(t => t.type === 'exclusive').reduce((s,t) => s+t.amount, 0),
      stem:      txsInGroup.filter(t => t.type === 'stem').reduce((s,t) => s+t.amount, 0),
      free:      txsInGroup.filter(t => t.type === 'free').length,
      total:     txsInGroup.filter(t => t.type !== 'free').reduce((s,t) => s+t.amount, 0)
    };
  });

  const maxTotal = Math.max(...groupTotals.map(g => g.lease + g.exclusive + g.stem), 1);

  // Empty state: all groups have zero revenue
  const hasAnyData = groupTotals.some(g => g.total > 0);
  if (!hasAnyData) {
    container.innerHTML = `<div class="money-chart-empty">
      <div class="money-chart-empty-labels">
        ${groupTotals.map(g => `<span>${g.label}</span>`).join('')}
      </div>
      <div class="money-chart-empty-msg">No revenue data yet</div>
    </div>`;
    return;
  }

  container.innerHTML = groupTotals.map(g => {
    const stackHeightPct = ((g.lease + g.exclusive + g.stem) / maxTotal) * 100;
    const stackH = Math.max(stackHeightPct * 1.34, g.total > 0 ? 3 : 1); // max 134px for 140px container
    const leaseH  = g.total > 0 ? (g.lease / (g.lease + g.exclusive + g.stem || 1)) * stackH : 0;
    const exclH   = g.total > 0 ? (g.exclusive / (g.lease + g.exclusive + g.stem || 1)) * stackH : 0;
    const stemH   = g.total > 0 ? (g.stem / (g.lease + g.exclusive + g.stem || 1)) * stackH : 0;
    const amtLabel = g.total > 0 ? '$'+Math.round(g.total) : '';

    return `<div class="money-bar-group">
      ${amtLabel ? `<div class="money-bar-amt">${amtLabel}</div>` : '<div class="money-bar-amt"></div>'}
      <div class="money-bar-stack" style="height:${Math.max(stackH,2)}px">
        ${stemH  > 0 ? `<div class="money-bar-seg" style="height:${stemH}px;background:#8B5CF6"></div>` : ''}
        ${exclH  > 0 ? `<div class="money-bar-seg" style="height:${exclH}px;background:#EF4444"></div>` : ''}
        ${leaseH > 0 ? `<div class="money-bar-seg" style="height:${leaseH}px;background:#F59E0B"></div>` : ''}
        ${g.total === 0 ? `<div class="money-bar-seg" style="height:2px;background:rgba(255,255,255,0.08)"></div>` : ''}
      </div>
      <div class="money-bar-label">${g.label}</div>
    </div>`;
  }).join('');
}

// ------- Transaction List -------
function renderMoneyTxList(txs) {
  const list = document.getElementById('money-tx-list');
  if (!list) return;

  if (txs.length === 0) {
    list.innerHTML = `<div class="money-empty-state">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      <p>No transactions match your filters.</p>
    </div>`;
    return;
  }

  list.innerHTML = txs.map(tx => {
    const typeLabels = { lease: 'Lease', exclusive: 'Exclusive', stem: 'Stem', free: 'Free DL' };
    const platformLabels = { beatstars: 'Beatstars', airbit: 'Airbit', direct: 'Direct', other: 'Other' };
    const amountDisplay = tx.type === 'free' ? 'Free' : '$' + (tx.amount || 0).toFixed(2);
    const dateDisplay = new Date(tx.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `<div class="money-tx-card" data-type="${tx.type}" data-id="${tx.id}">
      <div class="money-tx-type-dot"></div>
      <div class="money-tx-info">
        <div class="money-tx-beat" title="${tx.beatName}">${tx.beatName}</div>
        <div class="money-tx-meta">
          <span class="money-tx-tag type-tag">${typeLabels[tx.type] || tx.type}</span>
          <span class="money-tx-tag platform-tag">${platformLabels[tx.platform] || tx.platform}</span>
          ${tx.customer ? `<span class="money-tx-customer"> ${tx.customer}</span>` : ''}
          ${tx.notes ? `<span class="money-tx-notes-text">${tx.notes}</span>` : ''}
        </div>
      </div>
      <div class="money-tx-right">
        <span class="money-tx-amount">${amountDisplay}</span>
        <span class="money-tx-date">${dateDisplay}</span>
        <div class="money-tx-actions">
          <button class="money-tx-edit" data-id="${tx.id}" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="money-tx-delete" data-id="${tx.id}" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Bind edit buttons
  list.querySelectorAll('.money-tx-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleMoneyEdit(btn.dataset.id);
    });
  });

  // Bind delete buttons
  list.querySelectorAll('.money-tx-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      handleMoneyDelete(id);
    });
  });
}

// ------- Breakdown Bars -------
function renderMoneyBreakdown(txs, field, containerId, colorMap) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const groups = {};
  txs.forEach(t => {
    const key = t[field] || 'other';
    if (!groups[key]) groups[key] = { amount: 0, count: 0 };
    groups[key].amount += (t.type !== 'free' ? (t.amount || 0) : 0);
    groups[key].count++;
  });

  const entries = Object.entries(groups).sort((a,b) => b[1].amount - a[1].amount);
  const maxAmt = Math.max(...entries.map(e => e[1].amount), 1);

  if (entries.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.2);padding:4px 0">No data</div>';
    return;
  }

  container.innerHTML = entries.map(([key, data]) => {
    const pct = (data.amount / maxAmt) * 100;
    const color = colorMap[key] || '#6B7280';
    const amtLabel = data.amount > 0 ? '$'+Math.round(data.amount) : (data.count + 'x');
    return `<div class="money-breakdown-row">
      <div class="money-breakdown-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
      <div class="money-breakdown-bar-wrap">
        <div class="money-breakdown-bar-fill" style="width:${Math.max(pct,2)}%;background:${color}"></div>
      </div>
      <div class="money-breakdown-amount">${amtLabel}</div>
      <div class="money-breakdown-count">${data.count}x</div>
    </div>`;
  }).join('');
}


// ============================
