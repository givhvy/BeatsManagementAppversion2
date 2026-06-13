# Modular Architecture Refactoring

## Overview

This document describes the new modular architecture implemented to improve code maintainability, reduce duplication, and create a clearer separation of concerns.

## Architecture Structure

```
src/renderer/
├── core/                    # Core infrastructure (loaded first)
│   ├── state-manager.js     # Centralized state management
│   ├── audio-player.js      # Shared audio player
│   ├── data-service.js      # Data persistence layer
│   ├── ipc-bridge.js        # Electron IPC wrapper
│   └── core-init.js         # Core initialization
│
├── shared/                  # Shared utilities
│   ├── pack-manager.js      # Pack operations (beats & drumkits)
│   └── utils.js             # Helper functions
│
├── features/                # Feature modules (future)
│   ├── beats/
│   ├── drumkit/
│   └── ...
│
└── app/                     # Legacy app modules (to be refactored)
    ├── 01-beats-library.js
    ├── 14-drumkit.js
    └── ...
```

## Core Modules

### 1. State Manager (`core/state-manager.js`)

**Purpose**: Centralized state management with reactive updates

**Features**:
- Single source of truth for application state
- Reactive subscriptions to state changes
- Dot notation path access (e.g., `stateManager.get('beats.packs')`)
- Automatic listener notifications

**Usage**:
```javascript
// Get state
const packs = stateManager.get('beats.packs');

// Set state
stateManager.set('beats.currentPackId', 'pack-123');

// Subscribe to changes
const unsubscribe = stateManager.subscribe('beats.packs', (packs) => {
  console.log('Packs updated:', packs);
});

// Unsubscribe
unsubscribe();
```

**State Structure**:
```javascript
{
  beats: {
    folders: {...},
    currentFolderType: 'all',
    packs: [],
    genrePacks: [],
    currentPackView: 'channel',
    currentPackId: null,
    showingHiddenPacks: false
  },
  drumkit: {
    folders: {...},
    currentFolderType: 'all',
    packs: [],
    currentPackId: null,
    showingHiddenPacks: false,
    infos: {}
  },
  images: {
    folder: '',
    list: [],
    beatImages: {},
    beatPrompts: {}
  },
  audio: {
    currentBeat: null,
    isPlaying: false,
    volume: 0.7
  },
  ui: {
    currentSection: 'beats',
    navbarStyle: 'elegant-dark'
  }
}
```

### 2. Audio Player (`core/audio-player.js`)

**Purpose**: Centralized audio playback for all sections

**Features**:
- Single audio player instance
- Event-based architecture
- Automatic state management
- Cross-section audio playback

**Usage**:
```javascript
// Play audio
audioPlayer.play('/path/to/beat.mp3', 'Beat Name');

// Pause/Resume
audioPlayer.pause();
audioPlayer.resume();
audioPlayer.togglePlayPause();

// Seek
audioPlayer.seek(30); // Seek to 30 seconds

// Volume
audioPlayer.setVolume(0.8); // 80% volume

// Subscribe to events
audioPlayer.on('play', (beat) => {
  console.log('Playing:', beat);
});

audioPlayer.on('timeUpdate', ({ currentTime, duration }) => {
  console.log(`${currentTime} / ${duration}`);
});
```

**Events**:
- `play` - Audio started playing
- `pause` - Audio paused
- `timeUpdate` - Playback position updated
- `ended` - Audio finished playing
- `error` - Playback error occurred

### 3. Data Service (`core/data-service.js`)

**Purpose**: Unified data persistence layer

**Features**:
- Abstracts localStorage and Electron IPC
- Consistent API for all data operations
- Error handling and logging

**Usage**:
```javascript
// Save data
await dataService.saveBeatsData(data);
await dataService.saveDrumkitData(data);

// Load data
const beatsData = await dataService.loadBeatsData();
const drumkitData = await dataService.loadDrumkitData();

// File operations (Electron only)
const files = await dataService.readFolder('/path/to/folder');
const folderPath = await dataService.selectFolder();
const imagePath = await dataService.selectImage();
await dataService.revealInExplorer('/path/to/file');

// Local storage
dataService.saveLocal('key', value);
const value = dataService.loadLocal('key');
```

### 4. IPC Bridge (`core/ipc-bridge.js`)

**Purpose**: Wrapper for Electron IPC communication

**Features**:
- Graceful fallbacks for browser mode
- Consistent error handling
- Event subscription management

**Usage**:
```javascript
// Invoke IPC method
const result = await ipcBridge.invoke('channel-name', arg1, arg2);

// Send one-way message
ipcBridge.send('channel-name', data);

// Listen to events
const unsubscribe = ipcBridge.on('channel-name', (data) => {
  console.log('Received:', data);
});

// Check if Electron
if (ipcBridge.isElectronApp()) {
  // Electron-specific code
}
```

## Shared Modules

### 1. Pack Manager (`shared/pack-manager.js`)

**Purpose**: Shared pack operations for beats and drum kits

**Features**:
- Create, sort, filter packs
- Add/remove items from packs
- Pack validation
- Search functionality

**Usage**:
```javascript
// Create pack
const newPack = packManager.createPack('Pack 1', 'beat');

// Sort packs
const sorted = packManager.sortPacksByNumber(packs);

// Filter by hidden status
const visible = packManager.filterPacksByHidden(packs, false);

// Find pack
const pack = packManager.findPackById(packs, 'pack-123');

// Add item to pack
packManager.addItemToPack(pack, item, 'beat');

// Remove item
packManager.removeItemFromPack(pack, 0, 'beat');

// Toggle hidden
packManager.togglePackHidden(pack);

// Validate name
const { valid, error } = packManager.validatePackName('Pack 1');

// Search
const results = packManager.searchPacks(packs, 'query');
```

### 2. Utils (`shared/utils.js`)

**Purpose**: Common utility functions

**Features**:
- Time formatting
- Debounce/throttle
- File path utilities
- String manipulation
- Array operations

**Usage**:
```javascript
// Format time
Utils.formatTime(125); // "2:05"

// Debounce
const debouncedFn = Utils.debounce(() => {
  console.log('Called after 300ms');
}, 300);

// Path to URL
Utils.pathToFileUrl('C:\\path\\to\\file.mp3');
// "file:///C:/path/to/file.mp3"

// File checks
Utils.isAudioFile('song.mp3'); // true
Utils.isImageFile('cover.jpg'); // true

// Remove extension
Utils.removeFileExtension('song.mp3'); // "song"

// Show notification
Utils.showNotification('Success!', 'success');

// Parse email/password
const { email, password, recovery } = 
  Utils.parseEmailPasswordPaste('user@email.com\tpass123|recovery');

// Wait
await Utils.wait(1000); // Wait 1 second

// Clamp value
Utils.clamp(150, 0, 100); // 100
```

## Migration Guide

### Phase 1: Core Infrastructure ✅ COMPLETE
- [x] Create state manager
- [x] Create audio player
- [x] Create data service
- [x] Create IPC bridge
- [x] Create pack manager
- [x] Create utils
- [x] Update index.html to load core modules

### Phase 2: Integrate Core Modules (IN PROGRESS)
- [ ] Migrate beats-library.js to use core modules
- [ ] Migrate drumkit.js to use core modules
- [ ] Update other sections to use audio player
- [ ] Centralize data operations through data service

### Phase 3: Feature Modules (PLANNED)
- [ ] Extract beats feature module
- [ ] Extract drumkit feature module
- [ ] Extract gallery feature module
- [ ] Extract other feature modules

### Phase 4: Remove Duplication (PLANNED)
- [ ] Remove duplicate pack management code
- [ ] Remove duplicate audio player code
- [ ] Remove duplicate data persistence code
- [ ] Consolidate UI components

## Benefits

### 1. **Maintainability**
- Clear separation of concerns
- Single responsibility principle
- Easier to locate and fix bugs

### 2. **Reusability**
- Shared code in one place
- No duplication
- Consistent behavior across features

### 3. **Testability**
- Isolated modules
- Easy to mock dependencies
- Unit testing friendly

### 4. **Scalability**
- Easy to add new features
- Modular architecture
- Clear dependencies

### 5. **Developer Experience**
- Better code organization
- Easier onboarding
- Self-documenting structure

## Next Steps

1. **Test Core Modules**: Verify all core modules work correctly
2. **Migrate Beats Section**: Update beats-library.js to use core modules
3. **Migrate Drumkit Section**: Update drumkit.js to use core modules
4. **Extract Feature Modules**: Create dedicated feature modules
5. **Remove Legacy Code**: Clean up old duplicate code

## Notes

- All core modules are singletons (one instance per app)
- Core modules are loaded before app modules
- Legacy app modules still work during migration
- Gradual migration approach (no breaking changes)
- Backward compatible with existing code

## Questions?

For questions or issues with the refactoring, please refer to this document or check the inline code documentation in each module.
