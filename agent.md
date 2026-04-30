# Agent Instructions for Beats Management Studio

## Critical Rules

### 1. Always Reload App After Changes
**IMPORTANT:** Every time you finish making changes to any file (HTML, CSS, JS), you MUST reload the Electron app so the user can see the results immediately.

Run this command after every change:
```powershell
if (Get-Process -Name "electron" -ErrorAction SilentlyContinue) { Stop-Process -Name "electron" -Force }; Start-Sleep -Seconds 1; echo "App reloaded!"
```

### 2. Application Architecture
- **Type**: Electron desktop application
- **Structure**: Single-page app (SPA) with one HTML file containing all sections
- **Files**: 
  - `index.html` - All UI markup
  - `renderer.js` - All client-side logic
  - `styles.css` - All styling
  - `main.js` - Electron main process & IPC handlers
- **Data Storage**: JSON files in user data directory via IPC communication
- **Database**: NO SQL database - uses JSON files like `beats-data.json`, `background-music-data.json`, `midi-data.json`
- **Tab Switching**: JavaScript shows/hides sections based on `data-section` attribute

### 3. Design System
- **Font**: Geist by Vercel (main UI) and Geist Mono (monospace/code)
- **Theme**: Dark theme with modern gradients
- **Colors**: 
  - Primary: #3b82f6 (blue)
  - Success: #10b981 (green)
  - Warning: #f59e0b (orange)
  - Danger: #ef4444 (red)
  - Background: #1a1a1a
  - Secondary BG: #2a2a2a

### 4. Key Features
- **Beats Tab**: Main beats management with packs
- **Background Music Tab**: Stores files in `D:\BackgroundMusic`
- **MIDI Tab**: Stores files in `D:\MIDI`
- **Customer Tab**: Customer database and email campaigns
- **Money Tab**: Transaction tracking
- **Titles Tab**: Title generation
- **Progress Tab**: Upload progress tracking
- **AutoVid Tab**: Video creation
- **YouTube Tab**: Upload automation

### 5. Common Patterns
- Use `showNotification()` for user feedback instead of `alert()`
- All modals should have modern styling with gradients
- Drag & drop should copy files to dedicated folders
- Pack management follows the same pattern across tabs
- IPC handlers in `main.js` for file operations

### 6. When Adding New Features
1. Add HTML section with proper IDs
2. Add JavaScript initialization in tab switching
3. Add IPC handlers in `main.js` if needed
4. Add state management object
5. Implement render functions
6. Add event handlers
7. **RELOAD THE APP**

## Remember
- User wants to see changes immediately
- Always reload after making changes
- Keep the design modern and consistent
- Use Geist font family
- Follow existing patterns in the codebase
