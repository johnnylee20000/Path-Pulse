# Path Pulse — Theme & Style Guide

This guide explains the current **Obsidian Lab** theme and how to improve the app’s style using the same theme and color system.

---

## Current theme

- **Look:** Dark “tactical” / lab: dark background, cyan as primary accent, lime for success/positive, red for alerts.
- **Palette (in `styles.css` `:root`):**
  - **`--obsidian`** `#0B0E11` — main background
  - **`--cyan`** `#00F5FF` — primary accent (headings, CTAs, borders, glows)
  - **`--lime`** `#39FF14` — success, highlights, strong text
  - **`--red`** `#FF3131` — errors, warnings, danger
  - **`--white`** `#ffffff` — primary text
  - **`--gray`** `#9ca3af` — secondary text, muted UI
  - **`--gray-dim`** `rgba(255,255,255,0.1)` — borders, dividers, subtle elements

All important UI should use these variables so the theme stays consistent and easy to change.

---

## How to improve style (using this theme)

### 1. **Contrast & readability**

- **Text on dark:** Keep body text at or near `--white`; keep secondary text at `--gray`. Avoid pure white (`#fff`) everywhere so accents stand out.
- **Accent on dark:** Cyan and lime already have good contrast on obsidian. If you add more surfaces (e.g. cards), keep them slightly lighter than `--obsidian` (e.g. `#12161a`) so they don’t flatten.
- **WCAG:** For critical labels and buttons, ensure contrast ratio ≥ 4.5:1. Cyan on obsidian and white on obsidian are strong; gray is for non-critical text.

**Idea:** Add a “surface” variable for cards/panels:

```css
:root {
  --surface: #12161a;   /* slightly lighter than obsidian */
}
```

Use `--surface` for `.card`, panels, and modals so hierarchy is clear.

---

### 2. **Visual hierarchy**

- **Primary actions:** Keep one clear primary per screen (e.g. “Accept Oath”, “Start Expedition”) using `--cyan` and `.btn-primary`.
- **Secondary actions:** Use `.btn-secondary` or text buttons with `--gray`; hover to `--white`.
- **Headings:** Use `--cyan` for main titles (e.g. `h1`), `--white` or `--gray` for subheadings so the order is: cyan > white > gray.
- **Numbers / stats:** Use `--lime` or a dedicated “stat” class for key metrics so they pop without competing with the primary CTA.

**Idea:** Add a small scale for “importance”:

```css
.text-primary   { color: var(--cyan); }
.text-success   { color: var(--lime); }
.text-muted     { color: var(--gray); }
.stat-value     { color: var(--lime); font-weight: 600; }
```

Use `.stat-value` for step counts, distance, XP, etc.

---

### 3. **Accent usage**

- **Cyan:** Primary brand, main CTAs, key borders, focus rings, and “active” state. Don’t overuse or it loses impact.
- **Lime:** Success, completed goals, positive deltas, highlights in lists. Pairs well with cyan for a tech/lab feel.
- **Red:** Only for errors, warnings, or destructive actions. Use sparingly.

**Idea:** Standardize focus and active states:

```css
:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
.btn-primary:focus-visible { outline-color: var(--white); }
```

Use `box-shadow` for a soft glow on primary buttons:

```css
.btn-primary:hover { box-shadow: 0 0 12px rgba(0,245,255,0.35); }
```

---

### 4. **Typography**

- **Font:** Currently `'Segoe UI', system-ui, sans-serif`. For a more distinct “lab” feel, consider a monospace or tech sans (e.g. `'JetBrains Mono'`, `'Space Grotesk'`) for headings or stats only; keep body readable with system-ui.
- **Scale:** Use a simple scale (e.g. 0.75rem, 0.875rem, 1rem, 1.25rem, 1.5rem) and stick to it for consistency.
- **Letter-spacing:** You already use `letter-spacing` on titles (e.g. “EXPLORER'S OATH”); keep that for headings and labels, normal for body.

**Idea:** Add type scale variables:

```css
:root {
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
}
```

Use these for font-size so spacing and size stay consistent.

---

### 5. **Spacing & layout**

- **Cards:** Use consistent padding (e.g. `1rem` or `1.25rem`) and a small gap between cards so the layout breathes.
- **Sections:** Add a bit more margin between major sections (e.g. Home stats vs. widgets) to reinforce hierarchy.
- **Touch targets:** Keep buttons and nav items at least 44px tall for mobile.

---

### 6. **Borders & depth**

- **Borders:** Prefer `--gray-dim` or `rgba(0,245,255,0.2)` for card borders so they don’t overpower the content.
- **Depth:** On dark themes, a very subtle gradient (e.g. top slightly lighter than bottom) or a 1px lighter top border can add depth without changing the palette.
- **Glow:** Use cyan/lime glows sparingly (e.g. active tab, focused input, key stat) so they feel intentional.

**Idea:** Card style that fits the theme:

```css
.card {
  background: var(--surface, #12161a);
  border: 1px solid var(--gray-dim);
  border-radius: 12px;
  padding: 1rem;
}
.card-highlight { border-color: rgba(0,245,255,0.25); }
```

---

### 7. **States (hover, active, disabled)**

- **Hover:** Slight brightness or glow (e.g. `filter: brightness(1.05)` or a soft `box-shadow`) on buttons; gray → white on text links.
- **Active:** Slight scale or darker background (e.g. `transform: scale(0.98)` on buttons).
- **Disabled:** Reduce opacity (e.g. `opacity: 0.5`) and avoid strong accent so it’s clearly inactive.
- **Loading:** Use the existing cyan spinner; keep it the only animated accent on the screen during load.

---

### 8. **Map & tiles**

- CartoDB dark tiles already match the obsidian/cyan look. If you change the base palette, keep tile choice dark so the rest of the UI doesn’t clash.

---

## Quick wins

1. **Add `--surface`** and use it for cards/panels.
2. **Add `.stat-value`** (lime, semibold) for main numbers.
3. **Add `:focus-visible`** styles using `--cyan` for accessibility.
4. **Add a type scale** (e.g. `--text-sm`, `--text-base`, `--text-lg`) and use it everywhere.
5. **Standardize card style** with one border color and optional `.card-highlight` for emphasis.
6. **Slightly increase spacing** between sections and use consistent padding in cards.

All of this keeps the existing **theme and color aspects** (obsidian, cyan, lime, red, gray) and only refines hierarchy, contrast, and consistency. You can implement these in `styles.css` step by step without changing the overall “tactical lab” feel.
