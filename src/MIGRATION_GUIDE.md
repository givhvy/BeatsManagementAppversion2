# Migration Guide - Extracting Pages from Monolithic Code

This guide shows exactly what to extract from the old files for each page.

## How to Migrate a Page

For each page (e.g., "money"):

1. **Extract HTML** from `index.html`
   - Find: `<div class="app-section" id="money-section">`
   - Copy everything inside (not the wrapper div)
   - Save to: `src/renderer/pages/money/money.html`

2. **Extract JavaScript** from `renderer.js`
   - Find: Section starting with `// ==== MONEY SECTION ====` or `let moneyState =`
   - Copy all functions until next section
   - Save to: `src/renderer/pages/money/money.js`
   - Wrap init function: `window.initMoneyPage = async function() { ... }`

3. **Extract CSS** from `styles.css`
   - Find: All `.money-*` classes
   - Copy to: `src/renderer/pages/money/money.css`

4. **Test the page**
   - Run app: `npm start`
   - Click Money tab
   - Verify all functionality works

## Page Extraction Checklist

### ✅ Money (Example - Complete)
- [ ] HTML extracted
- [ ] JavaScript extracted
- [ ] CSS extracted
- [ ] Tested and working

### 🔲 Beats
**HTML**: Lines ~500-1000 in index.html
**JS**: Lines ~1500-3000 in renderer.js (search for `let folders =`, `renderBeats()`)
**CSS**: All `.beat-*`, `.folder-*`, `.pack-*` classes

### 🔲 Create (AutoVid)
**HTML**: Lines ~500-700 in index.html
**JS**: Lines ~3300-4200 in renderer.js (search for `autovidState`, `renderVideo()`)
**CSS**: All `.autovid-*` classes

### 🔲 Uploader (YouTube)
**HTML**: Lines ~700-1200 in index.html
**JS**: Lines ~4200-6500 in renderer.js (search for `youtubeState`, `uploadQueue`)
**CSS**: All `.youtube-*`, `.queue-*` classes

### 🔲 Progress
**HTML**: Lines ~1200-1400 in index.html
**JS**: Lines ~6500-7500 in renderer.js (search for `progressState`)
**CSS**: All `.progress-*` classes

### 🔲 Customer
**HTML**: Lines ~1400-1600 in index.html
**JS**: Lines ~7500-8500 in renderer.js (search for `customerState`)
**CSS**: All `.customer-*` classes

### 🔲 Beatstars
**HTML**: Lines ~1600-1900 in index.html
**JS**: Lines ~8500-10000 in renderer.js (search for `beatstarsState`)
**CSS**: All `.beatstars-*` classes

### 🔲 Titles
**HTML**: Lines ~2300-2600 in index.html
**JS**: Lines ~10000-10200 in renderer.js (search for `titlesState`)
**CSS**: All `.titles-*` classes

### 🔲 Background Music
**HTML**: Lines ~2600-2900 in index.html
**JS**: Lines ~10900-11500 in renderer.js (search for `bgMusicState`)
**CSS**: All `.bgmusic-*` classes

### 🔲 MIDI
**HTML**: Lines ~2900-3200 in index.html
**JS**: Lines ~11500-12000 in renderer.js (search for `midiState`)
**CSS**: All `.midi-*` classes

## Template for Page JavaScript

```javascript
// ============================
// [PAGE NAME] PAGE
// ============================

// Page state
let [page]State = {
  // ... state variables
};

// Initialize page
window.init[Page]Page = async function() {
  console.log('[Page] page initialized');
  
  // Load data
  await load[Page]Data();
  
  // Bind events
  bind[Page]Events();
  
  // Render
  render[Page]();
};

// Load data from IPC
async function load[Page]Data() {
  if (!window.ipcRenderer) return;
  
  try {
    const data = await window.ipcRenderer.invoke('load-[page]-data');
    [page]State.items = data.items || [];
    // ...
  } catch (error) {
    console.error('Error loading [page] data:', error);
  }
}

// Bind event listeners
function bind[Page]Events() {
  // Event listeners...
}

// Render UI
function render[Page]() {
  // Rendering logic...
}

// Save data via IPC
async function save[Page]Data() {
  if (!window.ipcRenderer) return;
  
  try {
    await window.ipcRenderer.invoke('save-[page]-data', [page]State);
  } catch (error) {
    console.error('Error saving [page] data:', error);
  }
}
```

## After All Pages Are Migrated

1. **Update main.js**
   - Change: `mainWindow.loadFile('index.html')`
   - To: `mainWindow.loadFile('src/renderer/index.html')`

2. **Delete old files**
   - Backup first: `git commit -m "backup before cleanup"`
   - Delete: `index.html` (root)
   - Delete: `renderer.js` (root)
   - Keep: `styles.css` (for reference, can delete later)

3. **Test everything**
   - Test each tab
   - Test all features
   - Test IPC communication
   - Test data persistence

4. **Commit to Git**
   ```bash
   git add src/
   git commit -m "feat: Complete modular refactoring"
   git push origin main
   ```

## Benefits Achieved

✅ **Maintainability**: Each page is ~200-500 lines instead of 12000
✅ **Discoverability**: Easy to find code for each feature
✅ **Scalability**: Easy to add new pages
✅ **Collaboration**: Multiple people can work on different pages
✅ **Testing**: Can test pages in isolation
✅ **Performance**: Only load code for active page

---

**Current Status**: Infrastructure complete, ready to migrate pages!
