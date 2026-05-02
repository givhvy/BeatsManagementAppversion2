// ============================
// MAIN NAVIGATION
// ============================

const mainNavTabs = document.querySelectorAll('.main-nav-tab');
const appSections = document.querySelectorAll('.app-section');
const mainNavTabsContainer = document.querySelector('.main-nav-tabs');

if (mainNavTabsContainer) {
  mainNavTabsContainer.addEventListener('wheel', (event) => {
    const canScroll = mainNavTabsContainer.scrollWidth > mainNavTabsContainer.clientWidth;
    if (!canScroll) return;

    event.preventDefault();
    mainNavTabsContainer.scrollLeft += event.deltaY || event.deltaX;
  }, { passive: false });
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
      initAutoVidSection();
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
    } else if (section === 'background') {
      initBackgroundSection();
    } else if (section === 'midi') {
      initMidiSection();
    }
  });
});
