// ============================
// CONSISTENCY TRACKER SECTION
// ============================

let consistencyState = {
  uploads: {}, // { "2026-05-02": ["video1.mp4", "video2.mp4"] }
  initialized: false,
  dataLoaded: false,
  loadPromise: null
};

function initConsistencySection() {
  if (consistencyState.initialized) return;
  consistencyState.initialized = true;

  loadConsistencyData().then(() => {
    renderContributionGraph();
    updateConsistencyStats();
    renderRecentActivity();
  });
}

async function loadConsistencyData() {
  if (!isElectron) return false;

  if (consistencyState.dataLoaded) return true;
  if (consistencyState.loadPromise) return consistencyState.loadPromise;

  consistencyState.loadPromise = (async () => {
  try {
    const result = await ipcRenderer.invoke('load-consistency-data');
    if (result.success && result.data) {
      consistencyState.uploads = result.data.uploads || {};
      console.log(' Loaded consistency data:', Object.keys(consistencyState.uploads).length, 'days');
      consistencyState.dataLoaded = true;
      return true;
    }
    console.error('Failed to load consistency data:', result.error);
    return false;
  } catch (error) {
    console.error('Error loading consistency data:', error);
    return false;
  } finally {
    consistencyState.loadPromise = null;
  }
  })();

  return consistencyState.loadPromise;
}

async function saveConsistencyData() {
  if (!isElectron) return;

  try {
    const result = await ipcRenderer.invoke('save-consistency-data', {
      uploads: consistencyState.uploads,
      lastSaved: new Date().toISOString()
    });

    if (!result.success) {
      console.error('Failed to save consistency data:', result.error);
      showNotification('Warning: Failed to save data', 'error');
    }
  } catch (error) {
    console.error('Error saving consistency data:', error);
    showNotification('Warning: Failed to save data', 'error');
  }
}

async function markVideoAsPosted(videoPath, videoName) {
  const loaded = await loadConsistencyData();
  if (isElectron && !loaded) {
    showNotification('Could not load posted history, so the video was not marked', 'error');
    return;
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (!consistencyState.uploads[today]) {
    consistencyState.uploads[today] = [];
  }

  // Check if already marked
  if (consistencyState.uploads[today].includes(videoName)) {
    showNotification('Video already marked as posted today', 'info');
    return;
  }

  // Add to today's uploads
  consistencyState.uploads[today].push(videoName);

  // Save data immediately
  await saveConsistencyData();

  // Update UI
  renderContributionGraph();
  updateConsistencyStats();
  renderRecentActivity();

  // Reload video grid to show badge
  renderVideosGrid();

  showNotification(`Marked "${videoName}" as posted!`, 'success');
}

function renderContributionGraph() {
  const graphContainer = document.getElementById('contribution-graph');
  if (!graphContainer) return;

  // Generate 52 weeks of data (1 year)
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setDate(today.getDate() - 364);

  // Start from Sunday of the week containing oneYearAgo
  const startDate = new Date(oneYearAgo);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  const monthLabels = [];
  let currentDate = new Date(startDate);
  let lastMonth = -1;

  for (let week = 0; week < 53; week++) {
    const days = [];

    // Track month changes for labels
    const weekStartMonth = currentDate.getMonth();
    if (weekStartMonth !== lastMonth && week > 0) {
      monthLabels.push({
        index: week,
        name: currentDate.toLocaleDateString('en-US', { month: 'short' })
      });
      lastMonth = weekStartMonth;
    }

    for (let day = 0; day < 7; day++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = consistencyState.uploads[dateStr]?.length || 0;
      // 1 upload = level 4 (greenest), 2+ = level 4
      const level = count === 0 ? 0 : 4;

      days.push({
        date: dateStr,
        count,
        level,
        dayOfWeek: day
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(days);
  }

  // Render graph with month labels
  graphContainer.innerHTML = `
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px;">
      <div></div>
      <div class="contribution-months" style="display: grid; grid-template-columns: repeat(53, 12px); gap: 2px; margin-bottom: 4px;">
        ${weeks.map((week, index) => {
          const monthLabel = monthLabels.find(m => m.index === index);
          return `<div class="contribution-month" style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">${monthLabel ? monthLabel.name : ''}</div>`;
        }).join('')}
      </div>

      <div class="contribution-days">
        <div class="contribution-day-label"></div>
        <div class="contribution-day-label">Mon</div>
        <div class="contribution-day-label"></div>
        <div class="contribution-day-label">Wed</div>
        <div class="contribution-day-label"></div>
        <div class="contribution-day-label">Fri</div>
        <div class="contribution-day-label"></div>
      </div>

      <div class="contribution-weeks">
        ${weeks.map(week => `
          <div class="contribution-week">
            ${week.map(day => `
              <div class="contribution-day level-${day.level}"
                   data-date="${day.date}"
                   data-count="${day.count}"
                   title="${day.date}: ${day.count} upload${day.count !== 1 ? 's' : ''}">
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function updateConsistencyStats() {
  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date();

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (consistencyState.uploads[dateStr] && consistencyState.uploads[dateStr].length > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const allDates = Object.keys(consistencyState.uploads).sort();

  for (let i = 0; i < allDates.length; i++) {
    if (consistencyState.uploads[allDates[i]].length > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Calculate total uploads
  const totalUploads = Object.values(consistencyState.uploads)
    .reduce((sum, arr) => sum + arr.length, 0);

  // Calculate this month uploads
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthUploads = Object.entries(consistencyState.uploads)
    .filter(([date]) => date.startsWith(thisMonth))
    .reduce((sum, [, arr]) => sum + arr.length, 0);

  // Update UI
  const currentStreakEl = document.getElementById('current-streak');
  const longestStreakEl = document.getElementById('longest-streak');
  const totalUploadsEl = document.getElementById('total-uploads');
  const thisMonthUploadsEl = document.getElementById('this-month-uploads');

  if (currentStreakEl) currentStreakEl.textContent = currentStreak;
  if (longestStreakEl) longestStreakEl.textContent = longestStreak;
  if (totalUploadsEl) totalUploadsEl.textContent = totalUploads;
  if (thisMonthUploadsEl) thisMonthUploadsEl.textContent = thisMonthUploads;
}

function renderRecentActivity() {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;

  // Get recent uploads (last 10 days with uploads)
  const recentDates = Object.keys(consistencyState.uploads)
    .filter(date => consistencyState.uploads[date].length > 0)
    .sort()
    .reverse()
    .slice(0, 10);

  if (recentDates.length === 0) {
    activityList.innerHTML = '<div class="empty-state">No uploads tracked yet</div>';
    return;
  }

  activityList.innerHTML = recentDates.map(date => {
    const uploads = consistencyState.uploads[date];
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `
      <div class="activity-item">
        <div class="activity-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="activity-content">
          <div class="activity-title">${uploads.length} video${uploads.length !== 1 ? 's' : ''} uploaded</div>
          <div class="activity-date">${formattedDate}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Make functions global
window.markVideoAsPosted = markVideoAsPosted;

// ============================
