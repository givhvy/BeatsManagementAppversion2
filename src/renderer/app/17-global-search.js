// ============================
// GLOBAL SEARCH
// ============================

const globalSearchOverlay = document.getElementById('global-search-overlay');
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchResults = document.getElementById('global-search-results');

let searchActiveIndex = -1;
let searchResultItems = [];

// Toggle search with Ctrl+K
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    toggleGlobalSearch();
  }
  if (e.key === 'Escape' && globalSearchOverlay.style.display !== 'none') {
    closeGlobalSearch();
  }
});

// Click backdrop to close
const backdrop = document.querySelector('.global-search-backdrop');
if (backdrop) {
  backdrop.addEventListener('click', closeGlobalSearch);
}

function toggleGlobalSearch() {
  if (globalSearchOverlay.style.display !== 'none') {
    closeGlobalSearch();
  } else {
    openGlobalSearch();
  }
}

function openGlobalSearch() {
  globalSearchOverlay.style.display = 'flex';
  globalSearchInput.value = '';
  globalSearchInput.focus();
  searchActiveIndex = -1;
  searchResultItems = [];
  globalSearchResults.innerHTML = '<div class="global-search-hint">Start typing to search across all sections...</div>';
}

function closeGlobalSearch() {
  globalSearchOverlay.style.display = 'none';
  globalSearchInput.value = '';
  searchActiveIndex = -1;
  searchResultItems = [];
}

// Search input handler
if (globalSearchInput) {
  globalSearchInput.addEventListener('input', () => {
    const query = globalSearchInput.value.trim();
    if (!query) {
      globalSearchResults.innerHTML = '<div class="global-search-hint">Start typing to search across all sections...</div>';
      searchResultItems = [];
      searchActiveIndex = -1;
      return;
    }
    performGlobalSearch(query);
  });

  globalSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateSearch(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateSearch(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchActiveIndex >= 0 && searchActiveIndex < searchResultItems.length) {
        activateSearchResult(searchActiveIndex);
      }
    }
  });
}

// Navigate search results with arrow keys
function navigateSearch(direction) {
  if (searchResultItems.length === 0) return;

  // Remove active from current
  if (searchActiveIndex >= 0) {
    searchResultItems[searchActiveIndex].classList.remove('active');
  }

  searchActiveIndex += direction;
  if (searchActiveIndex < 0) searchActiveIndex = searchResultItems.length - 1;
  if (searchActiveIndex >= searchResultItems.length) searchActiveIndex = 0;

  searchResultItems[searchActiveIndex].classList.add('active');
  searchResultItems[searchActiveIndex].scrollIntoView({ block: 'nearest' });
}

// Fuzzy match — returns true if query chars appear in order in text
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  // Fast path: substring match
  if (t.includes(q)) return true;

  // Fuzzy: each char of query must appear in order
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

// Highlight matching characters
function highlightMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  // If substring match, highlight the substring
  const idx = t.indexOf(q);
  if (idx !== -1) {
    return text.substring(0, idx) + '<mark>' + text.substring(idx, idx + q.length) + '</mark>' + text.substring(idx + q.length);
  }

  // Fuzzy highlight: mark each matched char
  let result = '';
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) {
      // shouldn't happen if fuzzyMatch passed, but safety
      result += text.substring(ti);
      break;
    }
    result += text.substring(ti, found) + '<mark>' + text[found] + '</mark>';
    ti = found + 1;
  }
  result += text.substring(ti);
  return result;
}

// Collect all searchable items from all sections
function collectSearchItems() {
  const items = [];

  // Beats
  try {
    if (typeof folders !== 'undefined') {
      Object.values(folders).forEach(folder => {
        if (folder.beats) {
          folder.beats.forEach(beat => {
            items.push({
              name: beat.name,
              path: beat.path,
              type: 'beats',
              label: 'Beats',
              icon: '♪',
              iconClass: 'beats',
              action: () => {
                switchToSection('beats');
                if (typeof selectBeat === 'function') selectBeat(beat.path);
              }
            });
          });
        }
      });
    }
  } catch (e) { /* beats not loaded */ }

  // Drum Kits
  try {
    if (typeof drumkitFolders !== 'undefined') {
      Object.values(drumkitFolders).forEach(folder => {
        if (folder.files) {
          folder.files.forEach(kit => {
            items.push({
              name: kit.name,
              path: kit.path,
              type: 'kits',
              label: 'Drum Kit',
              icon: '⬡',
              iconClass: 'kits',
              action: () => {
                switchToSection('drumkit');
              }
            });
          });
        }
      });
    }
  } catch (e) { /* drumkit not loaded */ }

  // FL Studio Projects
  try {
    if (typeof flstudioState !== 'undefined' && flstudioState.projects) {
      flstudioState.projects.forEach(project => {
        items.push({
          name: project.name,
          path: project.path,
          type: 'projects',
          label: 'FL Studio',
          icon: 'FL',
          iconClass: 'projects',
          action: () => {
            switchToSection('flstudio');
            if (typeof showFlstudioProjectDetail === 'function') showFlstudioProjectDetail(project);
          }
        });
      });
    }
  } catch (e) { /* flstudio not loaded */ }

  // Distro Releases
  try {
    if (typeof distroState !== 'undefined' && distroState.releases) {
      distroState.releases.forEach(release => {
        items.push({
          name: release.name || release.title || 'Untitled Release',
          path: release.path || '',
          type: 'releases',
          label: 'Distro',
          icon: '◉',
          iconClass: 'releases',
          action: () => {
            switchToSection('distro');
          }
        });
      });
    }
  } catch (e) { /* distro not loaded */ }

  // Distro Songs
  try {
    if (typeof distroState !== 'undefined' && distroState.songs) {
      distroState.songs.forEach(song => {
        items.push({
          name: song.name,
          path: song.path,
          type: 'songs',
          label: 'Distro Songs',
          icon: '♫',
          iconClass: 'songs',
          action: () => {
            switchToSection('distro');
          }
        });
      });
    }
  } catch (e) { /* distro songs not loaded */ }

  return items;
}

// Switch to a section tab
function switchToSection(sectionName) {
  const tabs = document.querySelectorAll('.main-nav-tab');
  const sections = document.querySelectorAll('.app-section');

  tabs.forEach(t => t.classList.remove('active'));
  sections.forEach(s => s.classList.remove('active'));

  tabs.forEach(t => {
    if (t.dataset.section === sectionName) t.classList.add('active');
  });
  sections.forEach(s => {
    if (s.id === `${sectionName}-section`) s.classList.add('active');
  });

  // Initialize section if needed
  if (sectionName === 'drumkit' && typeof initDrumkitSection === 'function') initDrumkitSection();
  if (sectionName === 'flstudio' && typeof initFlstudioSection === 'function') initFlstudioSection();
  if (sectionName === 'distro' && typeof initDistroSection === 'function') initDistroSection();
  if (sectionName === 'beatstars' && typeof initBeatstarsSection === 'function') initBeatstarsSection();
}

// Perform the search
function performGlobalSearch(query) {
  const items = collectSearchItems();
  const matched = items.filter(item => fuzzyMatch(item.name, query));

  globalSearchResults.innerHTML = '';
  searchResultItems = [];
  searchActiveIndex = -1;

  if (matched.length === 0) {
    globalSearchResults.innerHTML = '<div class="global-search-no-results">No results found for "' + escapeHtml(query) + '"</div>';
    return;
  }

  // Group by type
  const groups = {};
  matched.forEach(item => {
    if (!groups[item.type]) groups[item.type] = [];
    groups[item.type].push(item);
  });

  // Limit total results to 30
  let totalRendered = 0;
  const maxResults = 30;

  const typeOrder = ['beats', 'projects', 'kits', 'releases', 'songs'];

  typeOrder.forEach(type => {
    if (!groups[type] || totalRendered >= maxResults) return;

    const groupItems = groups[type].slice(0, maxResults - totalRendered);
    if (groupItems.length === 0) return;

    const label = document.createElement('div');
    label.className = 'global-search-group-label';
    label.textContent = groupItems[0].label;
    globalSearchResults.appendChild(label);

    groupItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'global-search-item';
      el.innerHTML = `
        <div class="global-search-item-icon ${item.iconClass}">${item.icon}</div>
        <div class="global-search-item-body">
          <div class="global-search-item-name">${highlightMatch(item.name, query)}</div>
          <div class="global-search-item-path">${escapeHtml(item.path)}</div>
        </div>
      `;

      el.addEventListener('click', () => {
        activateSearchResult(searchResultItems.indexOf(el));
      });

      globalSearchResults.appendChild(el);
      searchResultItems.push(el);
      totalRendered++;
    });
  });
}

// Activate a search result
function activateSearchResult(index) {
  if (index < 0 || index >= searchResultItems.length) return;

  // Find the item data by re-searching
  const query = globalSearchInput.value.trim();
  const items = collectSearchItems();
  const matched = items.filter(item => fuzzyMatch(item.name, query));

  // Group and order same as render
  const groups = {};
  matched.forEach(item => {
    if (!groups[item.type]) groups[item.type] = [];
    groups[item.type].push(item);
  });

  const typeOrder = ['beats', 'projects', 'kits', 'releases', 'songs'];
  const ordered = [];
  typeOrder.forEach(type => {
    if (groups[type]) ordered.push(...groups[type]);
  });

  const item = ordered[index];
  if (item && item.action) {
    closeGlobalSearch();
    item.action();
  }
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
