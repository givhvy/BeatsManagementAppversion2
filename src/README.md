# Modular Architecture - Refactoring Plan

## Overview
We're refactoring the monolithic Electron app into a modular structure for better maintainability.

## Current Structure (Before)
```
├── index.html          (3000+ lines - ALL tabs in one file)
├── renderer.js         (12000+ lines - ALL logic in one file)
├── styles.css          (9000+ lines - ALL styles in one file)
└── main.js             (Electron main process)
```

## New Structure (After)
```
src/
├── renderer/
│   ├── index.html              (Shell - navigation only)
│   ├── app.js                  (App initialization & routing)
│   │
│   ├── pages/                  (Each tab as separate module)
│   │   ├── beats/
│   │   │   ├── beats.html
│   │   │   ├── beats.js
│   │   │   └── beats.css
│   │   ├── create/
│   │   ├── uploader/
│   │   ├── progress/
│   │   ├── customer/
│   │   ├── beatstars/
│   │   ├── money/
│   │   ├── titles/
│   │   ├── background/
│   │   └── midi/
│   │
│   ├── shared/                 (Shared utilities)
│   │   ├── state.js           (Global state management)
│   │   ├── notifications.js   (Toast notifications)
│   │   ├── audio-player.js    (Audio playback)
│   │   └── utils.js           (Helper functions)
│   │
│   └── styles/
│       ├── design-tokens.css  (CSS variables)
│       ├── global.css         (Global styles)
│       └── components.css     (Shared component styles)
│
└── main/
    └── main.js                 (Electron main process)
```

## How It Works

### 1. Main Shell (index.html)
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles/design-tokens.css">
  <link rel="stylesheet" href="styles/global.css">
</head>
<body>
  <!-- Navigation Bar -->
  <nav class="nav-bar">
    <button data-page="beats">Beats</button>
    <button data-page="create">Create</button>
    <!-- ... -->
  </nav>

  <!-- Content Container (pages load here) -->
  <div id="app-container"></div>

  <!-- Core Scripts -->
  <script src="shared/state.js"></script>
  <script src="shared/notifications.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

### 2. App Router (app.js)
```javascript
// Simple page loader
async function loadPage(pageName) {
  const container = document.getElementById('app-container');
  
  // Load HTML
  const html = await fetch(`pages/${pageName}/${pageName}.html`).then(r => r.text());
  container.innerHTML = html;
  
  // Load CSS
  loadCSS(`pages/${pageName}/${pageName}.css`);
  
  // Load JS
  await loadScript(`pages/${pageName}/${pageName}.js`);
  
  // Initialize page
  if (window[`init${capitalize(pageName)}Page`]) {
    window[`init${capitalize(pageName)}Page`]();
  }
}

// Navigation
document.querySelectorAll('[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    loadPage(btn.dataset.page);
  });
});
```

### 3. Page Module Example (money/money.js)
```javascript
// Money page logic (extracted from renderer.js)
let moneyState = {
  transactions: [],
  period: 'week',
  // ...
};

async function initMoneyPage() {
  // Load data
  const data = await ipcRenderer.invoke('load-money-data');
  moneyState.transactions = data.transactions || [];
  
  // Bind events
  bindMoneyEvents();
  
  // Render
  renderMoney();
}

function bindMoneyEvents() {
  // Event listeners...
}

function renderMoney() {
  // Rendering logic...
}

// Export for app.js to call
window.initMoneyPage = initMoneyPage;
```

## Migration Strategy

### Phase 1: Setup (✅ Done)
- [x] Create folder structure
- [x] Create README with plan

### Phase 2: Extract One Page (Money - In Progress)
- [ ] Create money.html
- [ ] Create money.js
- [ ] Create money.css
- [ ] Test that Money tab works

### Phase 3: Create App Router
- [ ] Create new index.html (shell only)
- [ ] Create app.js (page loader)
- [ ] Test Money tab loads dynamically

### Phase 4: Migrate Remaining Pages (One at a time)
- [ ] Beats
- [ ] Create
- [ ] Uploader
- [ ] Progress
- [ ] Customer
- [ ] Beatstars
- [ ] Titles
- [ ] Background
- [ ] MIDI

### Phase 5: Extract Shared Code
- [ ] notifications.js
- [ ] state.js
- [ ] utils.js
- [ ] audio-player.js

### Phase 6: Cleanup
- [ ] Remove old index.html
- [ ] Remove old renderer.js
- [ ] Remove old styles.css
- [ ] Update main.js to point to src/renderer/index.html

## Benefits

✅ **Easier to find code** - Each feature in its own folder
✅ **Easier to add features** - Just create a new page folder
✅ **Easier to maintain** - Changes are isolated
✅ **Better collaboration** - Multiple people can work on different pages
✅ **Reusable code** - Shared utilities in one place
✅ **Still vanilla JS** - No build step, no frameworks

## Next Steps

1. Finish extracting Money page
2. Test that it works
3. Create app router
4. Migrate remaining pages one by one

---

**Status**: Phase 2 in progress (Money page extraction)
