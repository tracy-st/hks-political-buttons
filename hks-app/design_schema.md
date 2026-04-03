# CLAUDE.md

## Project Aesthetic

Inspired by editorial portfolio sites on cargo.site — typographically driven, raw, and
considered. Not sterile minimalism. There should be texture in the type and intentional
tension between elements. Think independent art publication meets functional interface.

---

## Typography

### Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">
```

| Role             | Font      | Weight / Treatment                        |
|------------------|-----------|-------------------------------------------|
| Display / Hero   | Syne      | 700–800, uppercase, tight leading         |
| Headings h1–h3   | Syne      | 600–700                                   |
| Body             | DM Sans   | 300–400                                   |
| Labels / Meta    | DM Mono   | 400, uppercase, wide tracking             |
| Code / Technical | DM Mono   | 300–400                                   |

### Typographic Rules

- **Display**: `letter-spacing: -0.02em`, `line-height: 0.95–1.05` (intentionally tight)
- **Headings**: `letter-spacing: 0.01em`, `line-height: 1.15`
- **Body**: `line-height: 1.75`, `font-weight: 300`
- **Labels/Nav**: ALL-CAPS, `letter-spacing: 0.12em`, `font-size: 0.68rem`
- Prefer fluid type with `clamp()` over fixed px sizes
- Do not use bold weight in body copy — create hierarchy through size and color only

---

## Color Tokens

### Light Mode

```css
:root {
  /* Backgrounds */
  --bg-primary:      #F4F2EC;   /* warm parchment — never pure white */
  --bg-secondary:    #ECEAE1;   /* subtle surface variation */
  --bg-elevated:     #FAFAF7;   /* cards, overlays */

  /* Text */
  --text-primary:    #111110;   /* near-black with warm undertone */
  --text-secondary:  #6B6860;   /* muted, for metadata and captions */
  --text-tertiary:   #A9A59E;   /* placeholders, disabled states */

  /* Accent — use sparingly, one color only */
  --accent:          #C4622D;   /* terracotta */
  --accent-muted:    #EDD5C4;   /* tinted surface behind accent elements */

  /* Borders */
  --border:          #D6D2C8;   /* default divider */
  --border-strong:   #111110;   /* high-contrast outline */
}
```

### Dark Mode

```css
[data-theme="dark"] {
  /* Backgrounds */
  --bg-primary:      #111110;   /* near-black with warmth */
  --bg-secondary:    #1B1A17;   /* subtle surface variation */
  --bg-elevated:     #242320;   /* cards, overlays */

  /* Text */
  --text-primary:    #F0EDE5;   /* warm off-white */
  --text-secondary:  #87847D;   /* muted warm gray */
  --text-tertiary:   #57544E;   /* placeholders, disabled states */

  /* Accent — same hue, slightly lighter for dark context */
  --accent:          #D4724A;   /* terracotta, lifted */
  --accent-muted:    #271A12;   /* dark tinted surface */

  /* Borders */
  --border:          #2A2924;   /* barely-there divider */
  --border-strong:   #F0EDE5;   /* inverted for dark mode */
}
```

### Theme Switching

Toggled via `data-theme="dark"` on `<html>`.
Respect `prefers-color-scheme` as the default, allow manual override.

```css
@media (prefers-color-scheme: dark) {
  :root { /* apply dark tokens here as fallback */ }
}
```

---

## Spacing & Layout

- **Base unit**: `8px`
- **Content max-width**: `1200px`
- **Text column max**: `68ch`
- **Section vertical rhythm**: `80px` minimum, `120px` preferred
- Layouts should feel **asymmetric and editorial** — wide margins, offset columns
- Let images and content breathe; resist the urge to fill space

---

## Component Rules

### Foundational Constraints

- `border-radius: 0` — no rounded corners, anywhere, ever
- No `box-shadow` — use borders and background contrast instead
- No gradients — flat color only
- Transition: `150ms ease` max — nothing decorative

### Buttons

```css
/* Default */
background: transparent;
border: 1px solid var(--border-strong);
padding: 10px 22px;
font-family: 'DM Mono', monospace;
font-size: 0.72rem;
letter-spacing: 0.1em;
text-transform: uppercase;

/* Hover — hard invert */
background: var(--text-primary);
color: var(--bg-primary);

/* Primary / CTA — use accent */
background: var(--accent);
border-color: var(--accent);
color: #FAFAF7;
```

### Inputs & Forms

- Border: `1px solid var(--border)`
- Focus state: border becomes `var(--border-strong)` — no glow, no ring, no shadow
- Background: `var(--bg-elevated)`
- Font: DM Sans 300 for input text, DM Mono for labels
- Placeholder color: `var(--text-tertiary)`

### Navigation

- Font: DM Mono, uppercase, `letter-spacing: 0.12em`, `font-size: 0.68rem`
- No underline at rest
- Hover: `text-decoration: underline`, `text-decoration-thickness: 1px`
- Active/current: `color: var(--accent)`

### Dividers

- Prefer raw whitespace over visible lines
- When a rule is needed: `1px solid var(--border)`
- Never use decorative dividers (no thick rules, no ornaments)

### Images & Media

- Flush to container edges or fully bleed — no internal padding around images
- No rounded corners, no borders unless intentional
- Captions: DM Mono, `font-size: 0.68rem`, `color: var(--text-secondary)`, uppercase

---

## What to Avoid

- ❌ `border-radius` of any value
- ❌ `box-shadow` or `drop-shadow` of any kind
- ❌ Gradients (including subtle ones)
- ❌ Animations or transitions over `200ms`
- ❌ Multiple accent colors — terracotta is the only chromatic color
- ❌ Centered body text (reserve center-align for display/hero only)
- ❌ Emoji or decorative iconography in UI
- ❌ Pure `#FFFFFF` or `#000000` backgrounds
- ❌ Heavy body weight or bold paragraph text
- ❌ Default Tailwind aesthetic, Material Design, or "SaaS dashboard" patterns
- ❌ Stock illustration or generic placeholder art

---

## Reference Aesthetic

> "Precise but not cold. Editorial but still functional.
> The kind of interface a graphic designer would actually want to use."

**Loose references**: cargo.site portfolio sites, Are.na, early SSENSE,
Serpentine Galleries website, Letterform Archive, DIA Studio work.