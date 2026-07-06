---
name: Agent Skill Marketplace
description: Autonomous coding skills dashboard and builder.
colors:
  light:
    primary: "#050505"
    primary-hover: "#171717"
    primary-foreground: "#ffffff"
    background: "#fafafa"
    foreground: "#111827"
    card: "#ffffff"
    card-foreground: "#111827"
    muted: "#f5f5f5"
    muted-foreground: "#525252"
    border: "#e5e5e5"
    border-strong: "#d4d4d8"
    destructive: "#dc2626"
  dark:
    primary: "#fafafa"
    primary-hover: "#e4e4e7"
    primary-foreground: "#09090b"
    background: "#09090b"
    foreground: "#fafafa"
    card: "#111113"
    card-foreground: "#fafafa"
    muted: "#18181b"
    muted-foreground: "#a1a1aa"
    border: "#27272a"
    border-strong: "#3f3f46"
    destructive: "#ef4444"
typography:
  display:
    fontFamily: "\"Geist\", \"Inter\", ui-sans-serif, system-ui, sans-serif"
  body:
    fontFamily: "\"Geist\", \"Inter\", ui-sans-serif, system-ui, sans-serif"
  mono:
    fontFamily: "\"Geist Mono\", \"JetBrains Mono\", ui-monospace, SFMono-Regular, monospace"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
---

# Design System: Agent Skill Marketplace

## 1. Overview

**Creative North Star: "The Command Center"**

This system is built for AI Engineers operating in a highly technical context. The visual philosophy embraces dense, precise, native-feel macOS terminal vibes. It avoids anything that feels like a fluffy consumer app, prioritizing uncompromising functionality and state-of-the-art power.

We explicitly reject "ghost-card" SaaS templates, over-rounded elements, decorative gradients, and unstructured brutalist plain HTML.

**Key Characteristics:**
- High-contrast technical monochromes.
- Crisp, tight borders (1px) with constrained radii (max 8px for cards, 12px for larger containers).
- Tonal layering for depth instead of drop shadows.
- Dense but strictly structured typography.
- Automatic dark mode via `prefers-color-scheme`.

**Design Inspirations:**
- [Kernel + Vercel Template](https://kernel-nextjs-template.vercel.app/) — Dark-first, `#0A0A0A` cards, `border-white/5` dividers, radial gradient hero
- [Vercel Platform Engineering](https://vercel.com/solutions/platform-engineering) — Monochromatic grid layouts, metric-heavy dashboards
- [Turso Per-User Starter](https://turso-per-user-starter.vercel.app/) — Glassmorphism-lite, subtle dividers, auth-focused UX

## 2. Dark Mode

Dark mode activates automatically via `@media (prefers-color-scheme: dark)` in `globals.css`. All colors flow through CSS custom properties — no `!important` overrides needed.

### Token Inversion Table

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#fafafa` (Cool Paper) | `#09090b` (Near-black) |
| `--foreground` | `#111827` (Technical Slate) | `#fafafa` (Cool Paper) |
| `--card` | `#ffffff` (Surface White) | `#111113` (Elevated Dark) |
| `--border` | `#e5e5e5` (Structural) | `#27272a` (Zinc-800) |
| `--primary` | `#050505` (Obsidian Black) | `#fafafa` (Inverted White) |
| `--muted` | `#f5f5f5` (Subtle Surface) | `#18181b` (Zinc-900) |
| `--muted-foreground` | `#525252` (Mid-gray) | `#a1a1aa` (Zinc-400) |

### Named Rule
**The Auto-Dark Rule.** Dark mode is system-controlled — no manual toggle. The interface adapts to the operating system's color scheme preference.

## 3. Component Library

All UI components use **shadcn/ui** (style: `base-nova`) with **Base UI** primitives.

### Inventory (29 components)

| Component | File | Primitives |
|-----------|------|-----------|
| Alert | `ui/alert.tsx` | CVA |
| Avatar | `ui/avatar.tsx` | Base UI |
| Badge | `ui/badge.tsx` | Base UI + CVA (tone variants: neutral/green/amber/red/blue) |
| Button | `ui/button.tsx` | Base UI + CVA |
| ButtonLink | `ui/button-link.tsx` | Button + Next.js Link |
| ButtonGroup | `ui/button-group.tsx` | Base UI |
| Card | `ui/card.tsx` | Native HTML |
| Collapsible | `ui/collapsible.tsx` | Base UI |
| Command | `ui/command.tsx` | cmdk |
| Dialog | `ui/dialog.tsx` | Base UI |
| DropdownMenu | `ui/dropdown-menu.tsx` | Base UI |
| HoverCard | `ui/hover-card.tsx` | Base UI |
| Input | `ui/input.tsx` | Base UI |
| InputGroup | `ui/input-group.tsx` | Composite |
| Label | `ui/label.tsx` | Base UI |
| Metric | `ui/metric.tsx` | Native HTML |
| Progress | `ui/progress.tsx` | Base UI |
| ScrollArea | `ui/scroll-area.tsx` | Base UI |
| Select | `ui/select.tsx` | Base UI |
| Separator | `ui/separator.tsx` | Base UI |
| Sheet | `ui/sheet.tsx` | Base UI |
| Sidebar | `ui/sidebar.tsx` | Base UI + CVA (collapsible, mobile sheet) |
| Skeleton | `ui/skeleton.tsx` | Native HTML |
| Spinner | `ui/spinner.tsx` | Native HTML |
| Switch | `ui/switch.tsx` | Base UI |
| Tabs | `ui/tabs.tsx` | Base UI |
| Textarea | `ui/textarea.tsx` | Base UI |
| Toggle | `ui/toggle.tsx` | Base UI + CVA |
| ToggleGroup | `ui/toggle-group.tsx` | Base UI |
| Tooltip | `ui/tooltip.tsx` | Base UI |

### Legacy Re-exports (`ui.tsx`)
The barrel file `src/components/ui.tsx` re-exports `Badge`, `ButtonLink`, `Metric`, and aliases `Panel` → `Card` for backwards compatibility.

## 4. Typography

**Display Font:** Geist (with Inter fallback)
**Body Font:** Geist (with Inter fallback)
**Label/Mono Font:** Geist Mono (with JetBrains Mono fallback)

**Character:** Clinical, geometric, and perfectly legible at high density.

### Hierarchy
- **Display** (600+ weight): Page headers and critical empty states.
- **Headline** (500 weight): Section dividers and panel titles.
- **Title** (500 weight): Card titles and component headers.
- **Body** (400 weight, ~70ch max): Standard reading text and descriptions.
- **Label** (500 weight, tight tracking): Input labels and small metadata.
- **Mono** (400 weight): Used for terminal logs, code blocks, and data readouts.

## 5. Elevation

Tonal Layering. Surfaces overlap using slight color contrast (card over background), avoiding blur shadows entirely.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The shadcn Card component uses `ring-1 ring-foreground/10` as its border.

## 6. Sidebar

Uses shadcn's composable `Sidebar` component with:
- **Collapsible modes:** `icon` (collapsed to icon-only), `offcanvas` (slides off-screen)
- **Mobile behavior:** Automatically becomes a `Sheet` on mobile viewport
- **Keyboard shortcut:** `Cmd+B` to toggle
- **SidebarRail:** Drag handle for resizing
- **Tokens:** Uses `--sidebar-*` CSS custom properties for independent theming

## 7. Do's and Don'ts

### Do:
- **Do** use design tokens (CSS variables) for all colors — never hardcode hex values in components.
- **Do** use Tonal Layering (card color vs background color) combined with `ring-1` borders.
- **Do** constrain border-radius to `rounded-md` (8px) for cards, `rounded-lg` (12px) for larger containers.
- **Do** use the `tone` prop on `Badge` for semantic coloring (green=success, red=error, amber=warning, blue=info).

### Don't:
- **Don't** use `!important` in CSS — fix the component to use design tokens instead.
- **Don't** use "Ghost-card" SaaS templates or blurry drop shadows.
- **Don't** use over-rounded elements (32px+ radius).
- **Don't** use decorative gradients, stripes, or "fluffy" marketing designs.
- **Don't** hardcode color values like `text-neutral-950` — use semantic tokens like `text-foreground`.
