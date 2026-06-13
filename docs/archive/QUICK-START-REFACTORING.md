# Quick Start: Using the New Modular Architecture

## ✅ What's Already Working

The core infrastructure is now loaded and ready to use! Here's what you can do right now:

## 1. Audio Player (Global)

The audio player now works across ALL sections (Beats, Drum Kits, Gallery, etc.)

```javascript
// Simple way - use the global helper
window.playBeat('/path/to/audio.mp3', 'Song Name');

// Advanced way - use the audio player directly
window.audioPlayer.play('/path/to/audio.mp3', 'Song Name');
window.audioPlayer.pause();
window.audioPlayer.resume();
window.audioPlayer.setVolume(0.8);

// Listen to events
window.audioPlayer.on('play', (beat) => {
  console.log('Now playing:', beat.name);
});

window.audioPlayer.on('timeUpdate', ({ currentTime, duration }) => {
  console.log(`${currentTime}s / ${duration}s`);
});
```

## 2. State Manager

Centralized state for the entire app:

```javascript
// Get any state
const packs = window.stateManager.get('beats.packs');
const currentSection = window.stateManager.get('ui.currentSection');

// Set state
window.stateManager.set('beats.currentPackId', 'pack-123');
window.stateManager.set('ui.navbarStyle', 'elegant-dark');

// Subscribe to changes (reactive!)
window.stateManager.subscribe('beats.packs', (packs) => {
  console.log('Packs changed!', packs.length);
  // Update UI here
});

// Update (merge for objects)
window.stateManager.update('audio', { volume: 0.9, isPlaying: true });
```

## 3. Pack Manager

Shared pack operations:

```javascript
// Create a new pack
const newPack = window.packManager.createPack('Pack 1', 'beat');
// or
const drumkitPack = window.packManager.createPack('DK1', 'drumkit');

// Sort packs by number (C1, C2, C3...)
const sorted = window.packManager.sortPacksByNumber(packs);

// Filter hidden/visible
const visible = window.packManager.filterPacksByHidden(packs, false);
const hidden = window.packManager.filterPacksByHidden(packs, true);

// Find pack by ID
const pack = window.packManager.findPackById(packs, 'pack-123');

// Add item to pack
const success = window.packManager.addItemToPack(pack, {
  path: '/path/to/beat.mp3',
  name: 'Beat Name'
}, 'beat');

// Remove item
window.packManager.removeItemFromPack(pack, 0, 'beat');

// Toggle hidden
const isHidden = window.packManager.togglePackHidden(pack);

// Validate pack name
const { valid, error } = window.packManager.validatePackName('Pack 1');
if (!valid) {
  console.error(error);
}

// Search packs
const results = window.packManager.searchPacks(packs, 'trap');
```

## 4. Utils

Handy utility functions:

```javascript
// Format time
window.Utils.formatTime(125); // "2:05"
window.Utils.formatTime(3661); // "61:01"

// Debounce (wait for user to stop typing)
const search = window.Utils.debounce((query) => {
  console.log('Searching for:', query);
}, 300);

// Throttle (limit how often function runs)
const onScroll = window.Utils.throttle(() => {
  console.log('Scrolled!');
}, 100);

// File utilities
window.Utils.pathToFileUrl('C:\\Music\\beat.mp3');
// → "file:///C:/Music/beat.mp3"

window.Utils.isAudioFile('song.mp3'); // true
window.Utils.isImageFile('cover.jpg'); // true
window.Utils.getFileExtension('song.mp3'); // ".mp3"
window.Utils.removeFileExtension('song.mp3'); // "song"

// Show notification
window.Utils.showNotification('Pack created!', 'success');
window.Utils.showNotification('Error occurred', 'error');

// Parse email/password from paste
const { email, password, recovery } = 
  window.Utils.parseEmailPasswordPaste('user@email.com\tpass123|recovery');

// Wait/delay
await window.Utils.wait(1000); // Wait 1 second

// Clamp value between min/max
window.Utils.clamp(150, 0, 100); // 100
window.Utils.clamp(-5, 0, 100); // 0
window.Utils.clamp(50, 0, 100); // 50

// Sort array
const sorted = window.Utils.sortBy(items, 'name', true);

// Group array
const grouped = window.Utils.groupBy(items, 'category');
```

## 5. Data Service

Unified data operations:

```javascript
// Save data
await window.dataService.saveBeatsData({
  packs: [...],
  folders: {...}
});

await window.dataService.saveDrumkitData({
  packs: [...],
  folders: {...}
});

// Load data
const beatsData = await window.dataService.loadBeatsData();
const drumkitData = await window.dataService.loadDrumkitData();

// File operations (Electron only)
const files = await window.dataService.readFolder('/path/to/folder');
const drumkits = await window.dataService.readDrumkitFolder('/path/to/drumkits');

// Dialogs
const folderPath = await window.dataService.selectFolder();
const imagePath = await window.dataService.selectImage();

// Reveal in explorer
await window.dataService.revealInExplorer('/path/to/file.mp3');

// Local storage helpers
window.dataService.saveLocal('myKey', { data: 'value' });
const data = window.dataService.loadLocal('myKey');
```

## 6. IPC Bridge

Electron IPC wrapper:

```javascript
// Check if Electron
if (window.ipcBridge.isElectronApp()) {
  // Electron-specific code
}

// Invoke IPC
const result = await window.ipcBridge.invoke('my-channel', arg1, arg2);

// Send message
window.ipcBridge.send('my-channel', data);

// Listen to events
const unsubscribe = window.ipcBridge.on('my-channel', (data) => {
  console.log('Received:', data);
});

// Unsubscribe
unsubscribe();
```

## Testing in DevTools

Open DevTools (F12) and try these:

```javascript
// Check if modules loaded
console.log('State Manager:', window.stateManager);
console.log('Audio Player:', window.audioPlayer);
console.log('Pack Manager:', window.packManager);
console.log('Utils:', window.Utils);

// Get current state
console.log('Beats packs:', stateManager.get('beats.packs'));
console.log('Current section:', stateManager.get('ui.currentSection'));

// Test audio player
audioPlayer.play('file:///C:/Music/test.mp3', 'Test Song');

// Test pack manager
const pack = packManager.createPack('Test Pack', 'beat');
console.log('Created pack:', pack);

// Test utils
console.log('Formatted time:', Utils.formatTime(125));
```

## Common Patterns

### Pattern 1: Create and Save Pack

```javascript
// Create pack
const newPack = packManager.createPack('Pack 1', 'beat');

// Add to state
const packs = stateManager.get('beats.packs');
packs.push(newPack);
stateManager.set('beats.packs', packs);

// Save to disk
await dataService.saveBeatsData({
  packs: packs,
  // ... other data
});

// Show notification
Utils.showNotification('Pack created!', 'success');
```

### Pattern 2: Play Audio with State Update

```javascript
// Play audio
audioPlayer.play(beatPath, beatName);

// Update state
stateManager.set('audio.currentBeat', { path: beatPath, name: beatName });
stateManager.set('audio.isPlaying', true);

// Listen for playback end
audioPlayer.on('ended', () => {
  stateManager.set('audio.isPlaying', false);
});
```

### Pattern 3: Reactive UI Updates

```javascript
// Subscribe to state changes
stateManager.subscribe('beats.packs', (packs) => {
  // Re-render packs grid
  renderPacksGrid(packs);
});

// Now any change to packs will auto-update UI
stateManager.set('beats.packs', updatedPacks);
```

## Next Steps

1. **Test the modules** - Try the examples above in DevTools
2. **Start using in code** - Replace duplicate code with module calls
3. **Migrate gradually** - One section at a time
4. **Remove old code** - Once migrated, delete duplicate code

## Need Help?

- **Full documentation**: See `REFACTORING.md`
- **Architecture overview**: See `REFACTORING-SUMMARY.md`
- **Questions**: Check inline code comments in each module

---

**Remember**: All modules are already loaded and working! Start using them today! 🚀
