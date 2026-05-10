// ============================
// MAIN NAVIGATION
// ============================

const mainNavTabs = document.querySelectorAll('.main-nav-tab');
const appSections = document.querySelectorAll('.app-section');
const mainNavTabsContainer = document.querySelector('.main-nav-tabs');

// Add drag-to-scroll functionality
if (mainNavTabsContainer) {
  let isDragging = false;
  let startX;
  let scrollLeft;

  mainNavTabsContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    mainNavTabsContainer.style.cursor = 'grabbing';
    mainNavTabsContainer.style.userSelect = 'none';
    startX = e.pageX - mainNavTabsContainer.offsetLeft;
    scrollLeft = mainNavTabsContainer.scrollLeft;
  });

  mainNavTabsContainer.addEventListener('mouseleave', () => {
    isDragging = false;
    mainNavTabsContainer.style.cursor = 'grab';
    mainNavTabsContainer.style.userSelect = '';
  });

  mainNavTabsContainer.addEventListener('mouseup', () => {
    isDragging = false;
    mainNavTabsContainer.style.cursor = 'grab';
    mainNavTabsContainer.style.userSelect = '';
  });

  mainNavTabsContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - mainNavTabsContainer.offsetLeft;
    const walk = (x - startX) * 2; // Multiply by 2 for faster scrolling
    mainNavTabsContainer.scrollLeft = scrollLeft - walk;
  });

  // Mouse wheel horizontal scroll
  mainNavTabsContainer.addEventListener('wheel', (event) => {
    const canScroll = mainNavTabsContainer.scrollWidth > mainNavTabsContainer.clientWidth;
    if (!canScroll) return;

    event.preventDefault();
    mainNavTabsContainer.scrollLeft += event.deltaY || event.deltaX;
  }, { passive: false });

  // Set initial cursor
  mainNavTabsContainer.style.cursor = 'grab';
}

mainNavTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const section = tab.dataset.section;

    // Update active tab
    mainNavTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Show corresponding section
    appSections.forEach(s => {
      s.classList.remove('active');
      if (s.id === `${section}-section`) {
        s.classList.add('active');
      }
    });

    // Initialize section if needed
    if (section === 'youtube') {
      initYouTubeSection();
    } else if (section === 'autovid') {
      if (typeof initAutoVidSection === 'function') {
        initAutoVidSection();
      }
    } else if (section === 'videos') {
      initVideosSection();
    } else if (section === 'consistency') {
      initConsistencySection();
    } else if (section === 'distro') {
      initDistroSection();
    } else if (section === 'beatstars') {
      initBeatstarsSection();
    } else if (section === 'money') {
      initMoneySection();
    } else if (section === 'midi') {
      initMidiSection();
    } else if (section === 'drumkit') {
      initDrumkitSection();
    } else if (section === 'flstudio') {
      initFlstudioSection();
    } else if (section === 'gallery') {
      initGallerySection();
    }
  });
});

// Background pill button: swap content panels inside beats-section
(function setupBackgroundPillBtn() {
  const bgViewBtn      = document.getElementById('background-view-btn');
  const channelViewBtn = document.getElementById('channel-view-btn');
  const genreViewBtn   = document.getElementById('genre-view-btn');

  const bgPanel        = document.getElementById('bg-view-panel');
  const beatsLeftPanel = document.getElementById('beats-left-panel');
  const middlePanel    = document.getElementById('middle-panel');
  const rightPanel     = document.getElementById('right-panel');

  function showBeatsPanel() {
    if (bgPanel)       bgPanel.style.display       = 'none';
    if (beatsLeftPanel) beatsLeftPanel.style.display = '';
    if (middlePanel)   middlePanel.style.display   = '';
    if (bgViewBtn)   bgViewBtn.classList.remove('active');
    // restore correct active pill based on currentPackView
    const activeView = (typeof currentPackView !== 'undefined') ? currentPackView : 'channel';
    document.querySelectorAll('#middle-panel .pack-view-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === activeView);
    });
  }

  function showBgPanel() {
    if (beatsLeftPanel) beatsLeftPanel.style.display = 'none';
    if (middlePanel)    middlePanel.style.display    = 'none';
    if (rightPanel)     rightPanel.style.display     = 'none';
    if (bgPanel)        bgPanel.style.display        = 'flex';
    document.querySelectorAll('.pack-view-btn').forEach(b => b.classList.remove('active'));
    if (bgViewBtn)   bgViewBtn.classList.add('active');
    // mark Background active in bg panel pills too
    document.querySelectorAll('#bgmusic-middle-panel .pack-view-btn[data-view="background"]')
      .forEach(b => b.classList.add('active'));
    initBackgroundSection();
  }

  if (bgViewBtn)      bgViewBtn.addEventListener('click', showBgPanel);
  if (channelViewBtn) channelViewBtn.addEventListener('click', showBeatsPanel);
  if (genreViewBtn)   genreViewBtn.addEventListener('click', showBeatsPanel);

  // Wire bg-panel proxy pill buttons to trigger real beats pill buttons
  document.querySelectorAll('#bgmusic-middle-panel .pack-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      const realBtn = document.querySelector(`#middle-panel .pack-view-btn[data-view="${view}"]`);
      if (realBtn) realBtn.click();
    });
  });

}());
