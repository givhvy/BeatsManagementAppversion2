# Design Rollback Guide

This guide explains how to restore the old design (before the Foundry-inspired redesign).

## Overview

The application was redesigned with a Foundry-inspired design system featuring:
- Glassmorphism effects with backdrop-filter
- Blue gradient color scheme (sky/cyan tones)
- Geist and Inter fonts
- Rounded buttons and modern UI elements
- Border-gradient effects

The old design featured:
- Simpler purple color scheme
- Standard borders without glassmorphism
- Default system fonts
- Traditional button styles

## Backup Files

Two backup files were created before the Foundry redesign:

1. **styles.backup-old-design.css** - Contains the complete old CSS
2. **index.backup-old-design.html** - Contains the old HTML structure

## How to Restore Old Design

### Method 1: Using Backup Files (Recommended)

```bash
# Restore old styles
cp styles.backup-old-design.css styles.css

# Restore old HTML
cp index.backup-old-design.html index.html
```

### Method 2: Manual Restoration

If backup files are missing, follow these steps:

#### 1. Remove Google Fonts from index.html

Remove these lines from `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

#### 2. Restore Tab Names in index.html

Change tab button text:
- "Untagged" → "Untagged Beats"
- "Tagged" → "Tagged Beats"

```html
<!-- Before (Foundry design) -->
<button class="tab-btn" data-folder-type="tagged">Untagged</button>
<button class="tab-btn" data-folder-type="untagged">Tagged</button>

<!-- After (Old design) -->
<button class="tab-btn" data-folder-type="tagged">Untagged Beats</button>
<button class="tab-btn" data-folder-type="untagged">Tagged Beats</button>
```

#### 3. Restore CSS Styles

Major CSS changes to revert in `styles.css`:

**Background:**
```css
/* Old design - keep as is */
body {
  background-color: #1a1a1a;
}
```

**Remove Glassmorphism:**
```css
/* Remove backdrop-filter from all elements */
.left-panel,
.right-panel,
.beats-list,
.pack-card,
.pack-beat-item {
  backdrop-filter: none; /* Remove this property */
}
```

**Restore Button Styles:**
```css
/* Old btn-primary */
.btn-primary {
  background-color: #0066ff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #0052cc;
}

/* Old btn-secondary */
.btn-secondary {
  background-color: #333;
  color: white;
  border: 1px solid #555;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background-color: #444;
  border-color: #666;
}
```

**Restore Purple Color Scheme:**
```css
/* Change from blue to purple */
/* Old active tab */
.tab-btn.active {
  background-color: #6366f1; /* Purple instead of blue gradient */
  color: white;
}

/* Old pack-card-image */
.pack-card-image {
  background: linear-gradient(135deg, #6366f1, #8b5cf6); /* Purple gradient */
}

/* Old control button */
.control-btn {
  background-color: #6366f1; /* Purple instead of blue gradient */
}
```

**Remove Border-Gradient Effects:**
```css
/* Remove ::before pseudo-elements used for border gradients */
.btn-secondary::before,
.pack-card::before,
.pack-email-info::before,
.modal-content::before {
  display: none; /* Or remove entirely */
}
```

**Restore Font Families:**
```css
/* Remove Geist font, use system fonts */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* Remove font-family from all elements using Geist */
.tab-btn,
.btn-primary,
.btn-secondary,
.btn-back,
.btn-danger,
.pack-detail-count,
.pack-email-info,
h1, h2, h3, h4, h5, h6 {
  font-family: inherit; /* Use body font */
}
```

**Restore Simple Borders:**
```css
/* Use simple borders instead of glassmorphism */
.beat-item,
.pack-card,
.pack-beat-item {
  background-color: #2a2a2a;
  border: 1px solid #404040;
  border-radius: 6px; /* Smaller radius */
}
```

## Key Differences Summary

| Element | Old Design | Foundry Design |
|---------|-----------|----------------|
| **Colors** | Purple (#6366f1, #8b5cf6) | Blue (#38bdf8, #3b82f6) |
| **Buttons** | Rounded 6px, solid colors | Rounded 24px, gradients |
| **Effects** | None | Glassmorphism, backdrop-filter |
| **Fonts** | System fonts | Geist, Inter |
| **Borders** | Solid 1px | Border-gradient effects |
| **Background** | #1a1a1a | #1a1a1a (kept same) |

## Git History

To see the exact changes made during the redesign:

```bash
# View commit history
git log --oneline

# View specific file changes
git diff HEAD~5 styles.css
git diff HEAD~5 index.html

# Restore from specific commit (if needed)
git checkout <commit-hash> -- styles.css
git checkout <commit-hash> -- index.html
```

## Notes

- The redesign maintained ALL functionality - only visual styles changed
- No JavaScript changes were required for the redesign
- renderer.js remains unchanged between designs
- main.js remains unchanged between designs
- Database structure and data remain compatible

## Verification

After restoring the old design, verify:

1. ✅ Buttons have solid colors (not gradients)
2. ✅ Purple color scheme (not blue)
3. ✅ No glassmorphism/blur effects
4. ✅ System fonts (not Geist)
5. ✅ Simpler, smaller border-radius (6px not 24px)
6. ✅ All functionality still works

## Support

If you encounter issues during rollback:
1. Check that backup files exist and are complete
2. Verify git history for the exact state before redesign
3. Test all features after rollback to ensure functionality
