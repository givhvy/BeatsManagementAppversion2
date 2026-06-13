# Design Tokens Quick Reference Guide

## 🎨 How to Use Design Tokens

This guide shows you exactly which design token to use for common scenarios.

---

## 📏 Spacing

### Panel & Container Padding
```css
.my-panel {
  padding: var(--panel-padding);  /* 24px - Use for all panels */
}
```

### Card Padding
```css
.my-card {
  padding: var(--card-padding);  /* 20px - Use for all cards */
}
```

### Common Spacing
```css
/* Small gap between items */
gap: var(--space-1);  /* 4px */

/* Standard gap between items */
gap: var(--space-2);  /* 8px */

/* Medium gap */
gap: var(--space-3);  /* 12px */

/* Large gap */
gap: var(--space-4);  /* 16px */

/* Extra large gap */
gap: var(--space-5);  /* 20px */

/* Section spacing */
gap: var(--space-6);  /* 24px */
```

### Margins
```css
/* Small margin */
margin-bottom: var(--space-2);  /* 8px */

/* Standard margin */
margin-bottom: var(--space-4);  /* 16px */

/* Large margin */
margin-bottom: var(--space-6);  /* 24px */
```

---

## 🔤 Typography

### Font Sizes
```css
/* Small labels, metadata */
font-size: var(--text-xs);  /* 11px */

/* Secondary text, captions */
font-size: var(--text-sm);  /* 12px */

/* Body text, buttons, inputs */
font-size: var(--text-base);  /* 14px */

/* Large text, emphasized content */
font-size: var(--text-lg);  /* 16px */

/* Subheadings */
font-size: var(--text-xl);  /* 18px */

/* Section headings */
font-size: var(--text-2xl);  /* 20px */

/* Page titles */
font-size: var(--text-3xl);  /* 24px */
```

### Font Weights
```css
/* Normal text */
font-weight: var(--font-normal);  /* 400 */

/* Slightly emphasized */
font-weight: var(--font-medium);  /* 500 */

/* Headings, buttons */
font-weight: var(--font-semibold);  /* 600 */

/* Strong emphasis */
font-weight: var(--font-bold);  /* 700 */
```

### Font Families
```css
/* UI text */
font-family: var(--font-sans);  /* Geist */

/* Code, monospace */
font-family: var(--font-mono);  /* Geist Mono */
```

---

## 🎨 Colors

### Primary Colors
```css
/* Primary blue */
background-color: var(--primary);  /* #3b82f6 */
color: var(--primary);

/* Primary hover state */
background-color: var(--primary-hover);  /* #2563eb */

/* Primary light background */
background-color: var(--primary-light);  /* rgba(59, 130, 246, 0.1) */
```

### Semantic Colors
```css
/* Success (green) */
color: var(--success);  /* #10b981 */

/* Warning (orange) */
color: var(--warning);  /* #f59e0b */

/* Danger (red) */
color: var(--danger);  /* #ef4444 */

/* Info (blue) */
color: var(--info);  /* #3b82f6 */
```

### Gray Scale
```css
/* Darkest background */
background-color: var(--gray-950);  /* #0a0a0a */

/* Very dark background */
background-color: var(--gray-900);  /* #0f0f0f */

/* Main background */
background-color: var(--gray-850);  /* #1a1a1a */

/* Secondary background */
background-color: var(--gray-800);  /* #2a2a2a */

/* Tertiary background */
background-color: var(--gray-700);  /* #333333 */

/* Border color */
border-color: var(--gray-600);  /* #444444 */

/* Disabled text */
color: var(--gray-500);  /* #666666 */

/* Secondary text */
color: var(--gray-400);  /* #888888 */

/* Tertiary text */
color: var(--gray-300);  /* #999999 */

/* Light text */
color: var(--gray-200);  /* #cccccc */

/* Very light text */
color: var(--gray-100);  /* #e5e5e5 */

/* White text */
color: var(--white);  /* #ffffff */
```

### Opacity Variants
```css
/* Subtle background */
background-color: var(--white-5);  /* rgba(255, 255, 255, 0.05) */

/* Light background */
background-color: var(--white-10);  /* rgba(255, 255, 255, 0.1) */

/* Medium background */
background-color: var(--white-20);  /* rgba(255, 255, 255, 0.2) */

/* Dark overlay */
background-color: var(--black-35);  /* rgba(0, 0, 0, 0.35) */
```

### Borders
```css
/* Standard border */
border: var(--border-width) solid var(--border-color);
/* Expands to: 1px solid rgba(255, 255, 255, 0.1) */

/* Hover border */
border-color: var(--border-color-hover);
/* rgba(255, 255, 255, 0.2) */

/* Focus border */
border-color: var(--border-color-focus);
/* var(--primary) */
```

---

## 🔲 Border Radius

```css
/* Small elements (breadcrumbs, small buttons) */
border-radius: var(--radius-sm);  /* 6px */

/* Inputs, standard buttons */
border-radius: var(--radius-md);  /* 8px */

/* Cards, beat items */
border-radius: var(--radius-lg);  /* 12px */

/* Large cards, tabs container */
border-radius: var(--radius-xl);  /* 16px */

/* Special elements */
border-radius: var(--radius-2xl);  /* 20px */

/* Modals, pack cards */
border-radius: var(--radius-3xl);  /* 24px */

/* Circular elements (badges, avatars) */
border-radius: var(--radius-full);  /* 9999px */
```

---

## 🎬 Transitions

```css
/* Fast transition (hover effects) */
transition: var(--transition-fast);  /* 0.15s ease */

/* Standard transition (most common) */
transition: var(--transition-base);  /* 0.2s ease */

/* Slow transition (complex animations) */
transition: var(--transition-slow);  /* 0.3s ease */
```

---

## 📦 Component Heights

```css
/* Input fields */
height: var(--input-height);  /* 40px */

/* Small buttons */
height: var(--button-height-sm);  /* 36px */

/* Medium buttons (most common) */
height: var(--button-height-md);  /* 40px */

/* Large buttons */
height: var(--button-height-lg);  /* 44px */
```

---

## 🎯 Common Patterns

### Button
```css
.my-button {
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  font-family: var(--font-sans);
  height: var(--button-height-md);
  border-radius: var(--radius-3xl);
  transition: var(--transition-base);
}
```

### Input Field
```css
.my-input {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-base);
  font-family: var(--font-sans);
  height: var(--input-height);
  border-radius: var(--radius-md);
  border: var(--border-width) solid var(--border-color);
  background-color: var(--gray-950);
  color: var(--white);
  transition: var(--transition-base);
}

.my-input:focus {
  border-color: var(--border-color-focus);
}
```

### Card
```css
.my-card {
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background-color: var(--white-5);
  border: var(--border-width) solid var(--border-color);
  transition: var(--transition-base);
}

.my-card:hover {
  background-color: var(--white-10);
  border-color: var(--border-color-hover);
}
```

### Modal
```css
.my-modal-overlay {
  background-color: var(--black-35);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
}

.my-modal-content {
  border-radius: var(--radius-3xl);
  background-color: var(--gray-850);
  border: var(--border-width) solid var(--border-color);
  padding: var(--space-6);
  max-width: 600px;
}
```

### Panel
```css
.my-panel {
  padding: var(--panel-padding);
  background-color: var(--white-5);
  border: var(--border-width) solid var(--border-color);
}
```

---

## 💡 Tips

### 1. Always Use Design Tokens
❌ **Don't**: `padding: 20px;`  
✅ **Do**: `padding: var(--space-5);`

### 2. Follow the 8px Grid
Use spacing values that are multiples of 4px or 8px:
- 4px (--space-1)
- 8px (--space-2)
- 12px (--space-3)
- 16px (--space-4)
- 20px (--space-5)
- 24px (--space-6)

### 3. Use Semantic Colors
❌ **Don't**: `color: #999;`  
✅ **Do**: `color: var(--gray-300);`

### 4. Consistent Component Heights
- Inputs: Always 40px
- Buttons: 36px (small), 40px (medium), 44px (large)
- Cards: Use consistent padding (var(--card-padding))

### 5. Standard Transitions
Use `var(--transition-base)` for most transitions (0.2s ease)

---

## 📚 Reference

All design tokens are defined in `design-tokens.css`

For complete documentation, see:
- `DESIGN_SYSTEM.md` - Full design system
- `DESIGN_CONSISTENCY_UPDATE.md` - Update summary
- `BEFORE_AFTER_COMPARISON.md` - Before/after details

---

**Remember**: Using design tokens makes your code:
- ✅ Consistent across the entire app
- ✅ Easy to maintain and update
- ✅ Professional and polished
- ✅ Scalable for future features
