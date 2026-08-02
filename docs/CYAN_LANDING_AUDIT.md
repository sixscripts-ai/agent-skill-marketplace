# Cyan Landing Audit

**Landing URL:** https://agent-skill-marketplace-cyan.vercel.app/
**Local source:** `/Users/villain/Projects/agent-skill-marketplace-cyan`
**Target app:** `Exe=order66` (`agent/cyan-theme-migration`)
**Inspected:** 2026-08-02

Preview PNGs in source: `preview-full-desktop.png`, `preview-full-mobile.png`, `preview-light-hero.png`, fold shots.

## 1–2. Screenshots

Use source preview assets (copied into migration notes):

- Desktop full: `agent-skill-marketplace-cyan/preview-full-desktop.png`
- Mobile full: `agent-skill-marketplace-cyan/preview-full-mobile.png`
- Light hero: `agent-skill-marketplace-cyan/preview-light-hero.png`

## 3. Global color tokens

From `styles.css` `:root` (dark default) and `html[data-theme="light"]`:

| Token | Dark | Light |
|-------|------|-------|
| `--heat` / brand | `#06b6d4` | same |
| `--heat-hover` | `#0891b2` | same |
| `--heat-glow` | `rgba(6,182,212,0.4)` | same |
| `--heat-soft` | `rgba(6,182,212,0.1)` | same |
| `--canvas` | `#0a0a0a` | `#ffffff` |
| `--surface` | `#141414` | `#f8fafc` |
| `--border` | `#262626` | `#e2e8f0` |
| `--text` | `#f6f7f8` | `#17191c` |
| `--text-muted` | `#989ca2` | `#626973` |
| `--container` | `1112px` | same |

## 4. Typography scale

Geist / Geist Mono (repo fonts). From `DESIGN_SYSTEM.md`:

- Hero: `clamp(2.35rem, 6.5vw, 4.25rem)`
- Section headings: `clamp(1.65rem, 3.2vw, 2.35rem)`
- Hero lead: `1.05rem`
- Body: `1rem`
- Card title / body: `1.05rem` / `0.92rem`
- Nav/buttons: `0.875rem`
- Labels/code: `0.78rem`

## 5. Button styles

- Primary: solid `--heat`, white text, press scale, cyan glow on emphasis
- Quiet/ghost: bordered surface
- Icon buttons: square, soft border
- Focus: cyan soft ring

## 6. Card styles

Dark raised `#141414`, border `#262626` / soft white alpha, hover elevation + cyan border highlight on bento.

## 7. Form controls

Playground inputs: mono font, dark surface, cyan focus ring; terminal-like panels.

## 8. Navigation styles

Sticky blurred header (~100px) under announcement (~64px); desktop mega-menus; mobile sheet from icon button ≥1024 breakpoint.

## 9. Animation inventory

Includes: `flame-pulse`, status border pulse, cursor blink, reverse spin, fade-in-up reveals, shine gradient, realtime ring, marquee scroll, playground typing, accordion/tab transitions (see source `styles.css` `@keyframes`).

## 10. Responsive behavior

Breakpoints around mobile nav at `<1024px`; container `1112px` with `24px` page pad; hero labels hide/compress on small screens.

## 11. Dark / light theme

`html[data-theme="dark"|"light"]` (source defaults dark). Persisted as `localStorage.agent-skills-cyan-theme`.

## 12. Differences vs application routes (pre-migration)

| Surface | Landing (cyan) | App (was orange Firebench) |
|---------|----------------|----------------------------|
| Accent | `#06b6d4` | `#fa5d19` |
| Default surface | Near-black canvas | Paper `#f9f9f7` |
| Theme API | `data-theme` | `prefers-color-scheme` in theme-production |
| Chrome | Marketing header | AppShell sidebar |
| Landing | Full bento/EVE story | Older shorter landing |

Migration goal: app routes inherit cyan tokens; landing port matches static source; AppShell stays, recolored.
