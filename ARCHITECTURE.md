# Architecture — Beats Management Studio

Electron desktop app (no bundler, no framework). Plain CommonJS in the main process, plain script-tag JS in the renderer.

```
main.js                     → 1-line stub, requires src/main/main.js
src/
  main/                     ← MAIN PROCESS
    main.js                 entry: app lifecycle + wiring only (~80 lines)
    window.js               BrowserWindow creation, drag-icon cache, desktop shortcut
    app-state.js            shared mutable state (mainWindow, videoRenderer, cachedDragIcon)
    paths.js                ALL path constants (APP_ROOT, automation config, external drives…)
    r2-service.js           Cloudflare R2 SDK wrapper
    services/               long-lived processes & helpers (no ipcMain here)
      automation-server.js  spawn/stop automation/main-multi.js (port 9000)
      ollama-manager.js     spawn/stop local ollama.exe (port 11434)
      stratum-bridge.js     TCP bridge for the Stratum DAW (port 9003)
      agent-tools.js        AI agent tool definitions + executor
      dom-grabber.js        injectable DOM-inspect devtool (Ctrl+Shift+G)
    ipc/                    one file per feature tab — ALL ipcMain.handle/on live here
      index.js              registers every module (add new modules here)
      window-controls, dialogs, library, gallery, artist-thumbnails,
      app-data, drumkit, flstudio, drag-drop, images, autovid,
      consistency, distro, money, customers, emails, youtube,
      automation, r2, beatstars, marketing, ollama, ai-agent,
      background-music, midi
  renderer/                 ← RENDERER (script-tag globals, numbered load order)
    index.html              loads partials + scripts in dependency order
    bootstrap/include-html.js  data-include partial loader
    core/                   state-manager, audio-player, data-service, ipc-bridge, core-init
    shared/                 utils, pack-manager
    app/                    NN-feature.js — one file per tab (numbered = load order)
    partials/               NN-feature.html — one HTML chunk per tab
    styles/app/             NN-feature.css — one stylesheet per tab
modules/                    videoRenderer (FFmpeg)
automation/                 standalone YouTube upload server (own package.json)
data/                       git-tracked mirror of userData JSON files
docs/archive/               historical docs & dead files (do not load from here)
```

## Conventions

### Thêm một IPC handler mới
1. Tìm file domain phù hợp trong `src/main/ipc/` (hoặc tạo file mới `ipc/<feature>.js` export `{ register }`).
2. Đặt `ipcMain.handle(...)` bên trong hàm `register()`.
3. Nếu là file mới: thêm `require('./<feature>')` vào mảng trong `ipc/index.js`.
4. Renderer gọi qua `ipcRenderer.invoke` (xem `src/renderer/core/ipc-bridge.js`).

### Thêm một tab mới ở renderer
1. Tạo `partials/NN-feature.html`, thêm `<div data-include=...>` vào `index.html`.
2. Tạo `app/NN-feature.js`, thêm `<script>` vào cuối `index.html` (thứ tự = thứ tự phụ thuộc).
3. Tạo `styles/app/NN-feature.css`, thêm `<link>` vào `<head>`.
4. Tạo `ipc/feature.js` cho phần main-process nếu cần.

### Quy tắc chung
- **Đường dẫn cứng** (ổ D:, thư mục ngoài repo) phải khai báo trong `src/main/paths.js`, không rải rác trong handlers.
- **State dùng chung giữa các module main-process** đặt trong `app-state.js` (đọc/ghi qua thuộc tính, không destructure lúc require).
- **Process con / server** (spawn, TCP, polling) đặt trong `services/`, file IPC chỉ là lớp mỏng gọi vào service.
- Data của mỗi tab lưu file JSON riêng trong `userData` (tránh mất dữ liệu chéo tab); một số file mirror về `data/` để git theo dõi.
- Renderer chạy `nodeIntegration: true, contextIsolation: false` — các module renderer có thể `require('electron')` trực tiếp. (Nợ kỹ thuật: nên chuyển sang preload + contextBridge khi có dịp.)

## Ports
| Port | Service |
|------|---------|
| 9000 | Automation server (automation/main-multi.js) |
| 9003 | Stratum DAW bridge (TCP) |
| 9223 | Chrome remote debugging (BEATS_CDP_PORT) |
| 11434 | Ollama |
