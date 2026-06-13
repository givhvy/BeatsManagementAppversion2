# Beats Management Studio - Design System

## 🎨 Design Tokens

### Colors
```css
/* Primary Colors */
--primary-blue: #3b82f6;
--primary-blue-hover: #2563eb;
--primary-blue-light: rgba(59, 130, 246, 0.1);

/* Semantic Colors */
--success: #10b981;
--warning: #f59e0b;
--danger: #ef4444;
--info: #3b82f6;

/* Neutral Colors */
--black: #000000;
--gray-950: #0a0a0a;
--gray-900: #0f0f0f;
--gray-850: #1a1a1a;
--gray-800: #2a2a2a;
--gray-700: #333333;
--gray-600: #444444;
--gray-500: #666666;
--gray-400: #888888;
--gray-300: #999999;
--gray-200: #cccccc;
--gray-100: #e5e5e5;
--white: #ffffff;

/* Opacity Variants */
--white-5: rgba(255, 255, 255, 0.05);
--white-10: rgba(255, 255, 255, 0.1);
--white-20: rgba(255, 255, 255, 0.2);
--black-20: rgba(0, 0, 0, 0.2);
--black-35: rgba(0, 0, 0, 0.35);
```

### Spacing Scale
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Typography
```css
/* Font Families */
--font-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Geist Mono', 'Courier New', monospace;

/* Font Sizes */
--text-xs: 11px;
--text-sm: 12px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 18px;
--text-2xl: 20px;
--text-3xl: 24px;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Border Radius
```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 20px;
--radius-full: 9999px;
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.3);
```

## 📐 Layout Standards

### Panel Widths
- Left Panel: 350px
- Right Panel: Flexible (min 400px)
- Middle Panel: Flexible (fills remaining space)

### Consistent Padding
- Panel padding: 24px
- Card padding: 20px
- Button padding: 10px 16px (small), 12px 20px (medium), 14px 24px (large)
- Input padding: 12px 16px

### Gaps
- Small gap: 8px
- Medium gap: 12px
- Large gap: 16px
- XL gap: 24px

## 🎯 Component Standards

### Buttons
- Height: 36px (small), 40px (medium), 44px (large)
- Border radius: 8px
- Font size: 12px (small), 14px (medium)
- Font weight: 600
- Transition: all 0.2s

### Inputs
- Height: 40px
- Border radius: 8px
- Border: 1px solid var(--gray-700)
- Font size: 14px
- Padding: 12px 16px

### Cards
- Border radius: 12px
- Padding: 20px
- Border: 1px solid var(--white-10)
- Background: var(--gray-900)

### Modals
- Max width: 600px (small), 900px (medium), 1200px (large)
- Border radius: 16px
- Padding: 32px
- Backdrop: rgba(0, 0, 0, 0.35) with 4px blur

## 🔤 Typography Hierarchy

### Headings
- H1: 24px, 700 weight, -0.02em letter-spacing
- H2: 20px, 600 weight, -0.01em letter-spacing
- H3: 18px, 600 weight
- H4: 16px, 600 weight

### Body Text
- Large: 16px, 400 weight
- Base: 14px, 400 weight
- Small: 12px, 400 weight
- XS: 11px, 400 weight

### Labels
- Uppercase, 11px, 500 weight, 0.5px letter-spacing

## 🎨 Color Usage

### Backgrounds
- App background: #1a1a1a
- Panel background: rgba(255, 255, 255, 0.02)
- Card background: #0f0f0f
- Input background: #1a1a1a
- Hover background: rgba(255, 255, 255, 0.05)

### Borders
- Default: rgba(255, 255, 255, 0.1)
- Hover: rgba(255, 255, 255, 0.2)
- Focus: #3b82f6

### Text
- Primary: #ffffff
- Secondary: #999999
- Tertiary: #666666
- Disabled: #444444

## ✅ Consistency Checklist

- [ ] All panels use 24px padding
- [ ] All buttons use consistent heights (36px, 40px, 44px)
- [ ] All inputs use 40px height and 12px 16px padding
- [ ] All cards use 12px border radius
- [ ] All modals use consistent backdrop (rgba(0,0,0,0.35))
- [ ] All gaps use 8px, 12px, 16px, or 24px
- [ ] All font sizes follow the scale
- [ ] All colors use design tokens
- [ ] All transitions use 0.2s duration
- [ ] All borders use rgba(255,255,255,0.1)
