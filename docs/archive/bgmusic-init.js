// Background Music Section Initialization
// Add this to renderer.js

// Add to tab switching code:
// } else if (section === 'background') {
//   initBackgroundSection();
// }

function initBackgroundSection() {
  console.log('Background Music section initialized');
  
  // Simple placeholder - will show import button
  const listContainer = document.getElementById('bgmusic-list');
  if (listContainer) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: #666; padding: 40px 20px; font-size: 13px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.5;">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <div style="margin-bottom: 15px;">No background music yet</div>
        <button class="btn-primary" onclick="alert('Import feature coming soon!')">Import Music Files</button>
      </div>
    `;
  }
  
  // Show empty packs grid
  const packsGrid = document.getElementById('bgmusic-packs-grid');
  if (packsGrid) {
    packsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #666; padding: 60px 20px; font-size: 14px;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.4;">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <div style="margin-bottom: 15px;">No packs yet</div>
        <button class="btn-primary" onclick="alert('Create pack feature coming soon!')">+ Create First Pack</button>
      </div>
    `;
  }
}
