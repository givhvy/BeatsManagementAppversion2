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
- **Design Tokens**: All styling uses CSS variables from `design-tokens.css`
- **Spacing**: 8px grid system (4px, 8px, 12px, 16px, 20px, 24px)
- **Typography**: 7 consistent sizes (11px to 24px)
- **Colors**: 
  - Primary: #3b82f6 (blue) → var(--primary)
  - Success: #10b981 (green) → var(--success)
  - Warning: #f59e0b (orange) → var(--warning)
  - Danger: #ef4444 (red) → var(--danger)
  - Background: #1a1a1a → var(--gray-850)
  - Secondary BG: #2a2a2a → var(--gray-800)
  - All grays: var(--gray-950) through var(--gray-100)
- **Consistency**: All components follow the same design system
  - Buttons: 36px (small), 40px (medium), 44px (large)
  - Inputs: 40px height, 12px 16px padding
  - Cards: 12px border radius, consistent padding
  - Modals: 24px border radius, consistent backdrop

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
- **Always use design tokens**: Never hardcode colors, spacing, or font sizes
- **Follow the 8px grid**: Use var(--space-1) through var(--space-6)
- **Use semantic colors**: var(--primary), var(--success), var(--danger), etc.
- **Consistent components**: All buttons, inputs, cards follow the design system

### 6. When Adding New Features
1. Add HTML section with proper IDs
2. Add JavaScript initialization in tab switching
3. Add IPC handlers in `main.js` if needed
4. Add state management object
5. Implement render functions
6. Add event handlers
7. **Use design tokens for all styling** (never hardcode values)
8. **Follow existing component patterns** (buttons, inputs, cards)
9. **RELOAD THE APP**

## Design System Files
- `design-tokens.css` - All CSS variables (colors, spacing, typography, etc.)
- `DESIGN_SYSTEM.md` - Complete design system documentation
- `DESIGN_AUDIT.md` - List of inconsistencies (now resolved)
- `DESIGN_CONSISTENCY_UPDATE.md` - Summary of consistency improvements
- `BEFORE_AFTER_COMPARISON.md` - Detailed before/after comparison

## Remember
- User wants to see changes immediately
- Always reload after making changes
- Keep the design modern and consistent
- Use Geist font family
- Follow existing patterns in the codebase
- **Always use design tokens** - never hardcode spacing, colors, or typography
- The entire app now follows a professional design system


## Refactoring Status 🚧

**Current Work**: Migrating from monolithic to modular architecture

### Architecture Change
- **From**: Single 12000+ line `renderer.js` file
- **To**: Modular page-based structure in `src/renderer/pages/`
- **Approach**: Vanilla HTML/CSS/JS (NO React, NO build step)
- **Goal**: Better maintainability and easier feature development

### Refactoring Plan
See `src/README.md` for complete details.

**Current Phase**: Phase 2 - Extracting Money page as proof of concept
- Created folder structure in `src/`
- Money page files created in `src/renderer/pages/money/`
- Next: Create app router and test Money page loads dynamically

### Important Notes
- Keep old files working until migration is complete
- Test each page after extraction
- Migrate one page at a time to minimize risk
