// DISTROKID SECTION
// ============================

let distroState = {
  releases: [], // Array of release objects
  initialized: false
};

function initDistroSection() {
  if (distroState.initialized) return;
  distroState.initialized = true;

  const newReleaseBtn = document.getElementById('new-release-btn');

  if (newReleaseBtn) {
    newReleaseBtn.addEventListener('click', openNewReleaseModal);
  }

  // Initialize filter buttons
  const filterBtns = document.querySelectorAll('.distro-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterReleases(btn.dataset.filter);
    });
  });

  loadDistroReleases();
}

async function loadDistroReleases() {
  if (!isElectron) {
    console.log('Not running in Electron mode');
    return;
  }

  try {
    const result = await ipcRenderer.invoke('load-distro-releases');
    if (result.success && result.releases) {
      distroState.releases = result.releases;
      renderDistroReleases();
      updateDistroStats();
    }
  } catch (error) {
    console.error('Error loading distro releases:', error);
  }
}

function renderDistroReleases(filter = 'all') {
  const releasesGrid = document.getElementById('releases-grid');
  if (!releasesGrid) return;

  let filteredReleases = distroState.releases;

  if (filter !== 'all') {
    filteredReleases = distroState.releases.filter(r => r.status === filter);
  }

  if (filteredReleases.length === 0) {
    releasesGrid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3; margin-bottom: 16px;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
          <path d="M2 12h20"/>
        </svg>
        <p>No ${filter === 'all' ? '' : filter} releases yet</p>
        <p style="font-size: 12px; opacity: 0.5; margin-top: 8px;">Click "New Release" to get started</p>
      </div>
    `;
    return;
  }

  releasesGrid.innerHTML = filteredReleases.map(release => `
    <div class="release-card" data-id="${release.id}">
      <div class="release-artwork">
        ${release.artwork ?
          `<img src="${release.artwork}" alt="${release.title}">` :
          `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>`
        }
      </div>
      <div class="release-info">
        <div class="release-title">${release.title}</div>
        <div class="release-artist">${release.artist}</div>
      </div>
      <div class="release-meta">
        <span class="release-status ${release.status}">${release.status}</span>
        <span>${release.date}</span>
      </div>
    </div>
  `).join('');
}

function filterReleases(filter) {
  renderDistroReleases(filter);
}

function updateDistroStats() {
  const published = distroState.releases.filter(r => r.status === 'published').length;
  const pending = distroState.releases.filter(r => r.status === 'pending').length;
  const total = distroState.releases.length;

  // Calculate this month releases
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthReleases = distroState.releases.filter(r => r.date.startsWith(thisMonth)).length;

  const publishedEl = document.getElementById('distro-published');
  const pendingEl = document.getElementById('distro-pending');
  const totalEl = document.getElementById('distro-total');
  const thisMonthEl = document.getElementById('distro-this-month');

  if (publishedEl) publishedEl.textContent = published;
  if (pendingEl) pendingEl.textContent = pending;
  if (totalEl) totalEl.textContent = total;
  if (thisMonthEl) thisMonthEl.textContent = thisMonthReleases;
}

function openNewReleaseModal() {
  showNotification('New Release feature coming soon!', 'info');
  // TODO: Implement new release modal
}

// Make functions global
window.openNewReleaseModal = openNewReleaseModal;
