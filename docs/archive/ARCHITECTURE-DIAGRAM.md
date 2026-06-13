# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  (Beats, Drum Kits, Gallery, Videos, YouTube, Settings, etc.)  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APP MODULES (Legacy)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ beats-library│  │   drumkit    │  │   gallery    │  ...    │
│  │     .js      │  │     .js      │  │     .js      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED UTILITIES                             │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  Pack Manager    │         │      Utils       │            │
│  │  - createPack    │         │  - formatTime    │            │
│  │  - sortPacks     │         │  - debounce      │            │
│  │  - filterPacks   │         │  - pathToUrl     │            │
│  │  - addItem       │         │  - isAudioFile   │            │
│  └──────────────────┘         └──────────────────┘            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CORE INFRASTRUCTURE                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    State     │  │    Audio     │  │     Data     │         │
│  │   Manager    │  │    Player    │  │   Service    │         │
│  │              │  │              │  │              │         │
│  │ - get/set    │  │ - play       │  │ - save       │         │
│  │ - subscribe  │  │ - pause      │  │ - load       │         │
│  │ - notify     │  │ - events     │  │ - readFolder │         │
│  └──────────────┘  └──────────────┘  └──────┬───────┘         │
│                                              │                  │
│  ┌──────────────────────────────────────────┘                  │
│  │                                                              │
│  │  ┌──────────────┐                                           │
│  │  │  IPC Bridge  │                                           │
│  │  │              │                                           │
│  │  │ - invoke     │                                           │
│  │  │ - send       │                                           │
│  │  │ - on/once    │                                           │
│  │  └──────┬───────┘                                           │
│  │         │                                                    │
└──┼─────────┼────────────────────────────────────────────────────┘
   │         │
   │         ▼
   │  ┌─────────────────────────────────────────┐
   │  │         ELECTRON MAIN PROCESS            │
   │  │  - File System                           │
   │  │  - Dialogs                               │
   │  │  - OS Integration                        │
   │  └─────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────┐
│         BROWSER STORAGE                      │
│  - localStorage                              │
│  - IndexedDB (future)                        │
└──────────────────────────────────────────────┘
```

## Data Flow

### Example: Playing Audio

```
User clicks beat
      │
      ▼
beats-library.js
      │
      ├─→ audioPlayer.play(path, name)
      │         │
      │         ├─→ Audio Element (HTML5)
      │         │
      │         └─→ Emit 'play' event
      │                   │
      │                   └─→ Update UI
      │
      └─→ stateManager.set('audio.currentBeat', {...})
                │
                └─→ Notify subscribers
                          │
                          └─→ Update UI components
```

### Example: Creating a Pack

```
User clicks "Create Pack"
      │
      ▼
beats-library.js
      │
      ├─→ packManager.createPack('Pack 1', 'beat')
      │         │
      │         └─→ Returns new pack object
      │
      ├─→ stateManager.get('beats.packs')
      │         │
      │         └─→ Returns current packs array
      │
      ├─→ packs.push(newPack)
      │
      ├─→ stateManager.set('beats.packs', packs)
      │         │
      │         └─→ Notify subscribers → Update UI
      │
      └─→ dataService.saveBeatsData({...})
                │
                ├─→ ipcBridge.invoke('save-data', data)
                │         │
                │         └─→ Electron Main Process
                │                   │
                │                   └─→ Write to disk
                │
                └─→ Utils.showNotification('Pack created!', 'success')
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    APP MODULES                              │
│  (beats-library, drumkit, gallery, etc.)                    │
└────────────┬────────────────────────────────────────────────┘
             │ depends on
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 SHARED UTILITIES                            │
│  (packManager, Utils)                                       │
└────────────┬────────────────────────────────────────────────┘
             │ depends on
             ▼
┌─────────────────────────────────────────────────────────────┐
│                CORE INFRASTRUCTURE                          │
│  (stateManager, audioPlayer, dataService, ipcBridge)        │
└────────────┬────────────────────────────────────────────────┘
             │ depends on
             ▼
┌─────────────────────────────────────────────────────────────┐
│              PLATFORM LAYER                                 │
│  (Electron IPC, Browser APIs, File System)                  │
└─────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    STATE MANAGER                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    STATE TREE                      │     │
│  │                                                    │     │
│  │  beats: {                                          │     │
│  │    packs: [...],                                   │     │
│  │    currentPackId: 'pack-123',                      │     │
│  │    showingHiddenPacks: false                       │     │
│  │  }                                                 │     │
│  │                                                    │     │
│  │  drumkit: {                                        │     │
│  │    packs: [...],                                   │     │
│  │    currentPackId: null                             │     │
│  │  }                                                 │     │
│  │                                                    │     │
│  │  audio: {                                          │     │
│  │    currentBeat: {...},                             │     │
│  │    isPlaying: true                                 │     │
│  │  }                                                 │     │
│  │                                                    │     │
│  │  ui: {                                             │     │
│  │    currentSection: 'beats',                        │     │
│  │    navbarStyle: 'elegant-dark'                     │     │
│  │  }                                                 │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                   LISTENERS                        │     │
│  │                                                    │     │
│  │  'beats.packs' → [callback1, callback2]           │     │
│  │  'audio.isPlaying' → [callback3]                  │     │
│  │  'ui.currentSection' → [callback4, callback5]     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  When state changes:                                        │
│  1. Update state tree                                       │
│  2. Notify exact path listeners                             │
│  3. Notify parent path listeners                            │
│  4. Listeners update UI                                     │
└──────────────────────────────────────────────────────────────┘
```

## Audio Player Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    AUDIO PLAYER                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │            HTML5 Audio Element                     │     │
│  │  <audio id="audio-element">                        │     │
│  └────────────┬───────────────────────────────────────┘     │
│               │                                              │
│               │ Events: play, pause, timeupdate, ended      │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Audio Player Controller                   │     │
│  │                                                    │     │
│  │  Methods:                                          │     │
│  │  - play(path, name)                                │     │
│  │  - pause()                                         │     │
│  │  - resume()                                        │     │
│  │  - seek(time)                                      │     │
│  │  - setVolume(vol)                                  │     │
│  │                                                    │     │
│  │  State:                                            │     │
│  │  - currentBeat: {path, name}                       │     │
│  │  - isPlaying: boolean                              │     │
│  └────────────┬───────────────────────────────────────┘     │
│               │                                              │
│               │ Emit events                                  │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Event Listeners                       │     │
│  │                                                    │     │
│  │  'play' → [updateUI, updateState]                 │     │
│  │  'pause' → [updateUI, updateState]                │     │
│  │  'timeUpdate' → [updateProgressBar]               │     │
│  │  'ended' → [playNext, updateState]                │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/renderer/
│
├── core/                          # Core infrastructure (load first)
│   ├── state-manager.js           # Centralized state
│   ├── audio-player.js            # Audio playback
│   ├── data-service.js            # Data persistence
│   ├── ipc-bridge.js              # Electron IPC
│   └── core-init.js               # Initialization
│
├── shared/                        # Shared utilities
│   ├── pack-manager.js            # Pack operations
│   └── utils.js                   # Helper functions
│
├── features/                      # Feature modules (future)
│   ├── beats/
│   │   ├── beats-state.js
│   │   ├── beats-ui.js
│   │   └── beats-controller.js
│   │
│   └── drumkit/
│       ├── drumkit-state.js
│       ├── drumkit-ui.js
│       └── drumkit-controller.js
│
└── app/                           # Legacy modules (to be refactored)
    ├── 00-platform-theme.js
    ├── 01-beats-library.js
    ├── 14-drumkit.js
    └── ...
```

## Load Order (Critical!)

```
1. HTML Partials loaded
2. Core modules loaded:
   - state-manager.js
   - audio-player.js
   - data-service.js
   - ipc-bridge.js
3. Shared utilities loaded:
   - utils.js
   - pack-manager.js
4. Core initialization:
   - core-init.js
5. App modules loaded:
   - 00-platform-theme.js
   - 01-beats-library.js
   - 14-drumkit.js
   - ... (all other modules)
```

This ensures that core infrastructure is available before any app module tries to use it!

---

**Key Principle**: Dependencies flow downward. App modules depend on shared utilities, which depend on core infrastructure, which depends on platform APIs.
