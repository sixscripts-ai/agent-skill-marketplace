---
name: Agent Skill Marketplace
description: Autonomous coding skills dashboard and builder.
colors:
  primary: "#050505"
  primary-hover: "#171717"
  primary-foreground: "#ffffff"
  background: "#fafafa"
  foreground: "#111827"
  panel: "#ffffff"
  panel-subtle: "#f5f5f5"
  border: "#e5e5e5"
  border-strong: "#d4d4d8"
  muted: "#737373"
  muted-foreground: "#525252"
  destructive: "#dc2626"
  destructive-foreground: "#ffffff"
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
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Agent Skill Marketplace

## 1. Overview

**Creative North Star: "The Command Center"**

This system is built for AI Engineers operating in a highly technical context. The visual philosophy embraces dense, precise, native-feel macOS terminal vibes. It avoids anything that feels like a fluffy consumer app, prioritizing uncompromising functionality and state-of-the-art power. 

We explicitly reject "ghost-card" SaaS templates, over-rounded elements, decorative gradients, and unstructured brutalist plain HTML.

**Key Characteristics:**
- High-contrast technical monochromes.
- Crisp, tight borders (1px) with constrained radii (max 8px).
- Tonal layering for depth instead of drop shadows.
- Dense but strictly structured typography.

## 2. Colors

High-contrast Technical Monochromes for extreme legibility and focus.

### Primary
- **Obsidian Black** (#050505): Used for top bars, primary interactive actions (buttons), and active states. It anchors the interface with heavy, decisive contrast.
- **Deep Hover** (#171717): The interaction state for primary elements.

### Neutral
- **Cool Paper** (#fafafa): The primary application background.
- **Surface White** (#ffffff): Used for elevated panels, cards, and input backgrounds to stand out against Cool Paper.
- **Subtle Surface** (#f5f5f5): Used for secondary panels or muted UI chrome.
- **Structural Border** (#e5e5e5): The standard 1px dividing line.
- **Strong Border** (#d4d4d8): Used for focused inputs and critical boundaries.
- **Technical Slate** (#111827): The primary foreground text color.

### Named Rules
**The Strict Monochrome Rule.** The interface relies entirely on black, white, and grays for structure. Color (red, green, blue) is reserved strictly for status indicators (destructive actions, success, warnings, info).

## 3. Typography

**Display Font:** Geist (with Inter fallback)
**Body Font:** Geist (with Inter fallback)
**Label/Mono Font:** Geist Mono (with JetBrains Mono fallback)

**Character:** Clinical, geometric, and perfectly legible at high density. The juxtaposition of a crisp sans-serif for UI chrome and a robust monospace for AI/code elements creates the "Command Center" feel.

### Hierarchy
- **Display** (600+ weight): Page headers and critical empty states.
- **Headline** (500 weight): Section dividers and panel titles.
- **Title** (500 weight): Card titles and component headers.
- **Body** (400 weight, ~70ch max): Standard reading text and descriptions.
- **Label** (500 weight, tight tracking): Input labels and small metadata.
- **Mono** (400 weight): Used for terminal logs, code blocks, and data readouts.

## 4. Elevation

The system uses Tonal Layering. Surfaces overlap using slight color contrast (e.g., `#ffffff` panel over `#fafafa` background), avoiding blur shadows entirely. Depth is achieved through sharp 1px borders, not soft shadows.

### Shadow Vocabulary
- **None**: We do not use box-shadows for elevation. 

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Interactive elements do not lift on hover; they shift in tonal background color or border contrast.

## 5. Components

Components are "Tactile and Confident." Buttons and inputs feel like physical hardware switches—sharp corners, solid borders, immediate feedback.

### Buttons
- **Shape:** Gently rounded (8px maximum, 4px preferred for inner elements).
- **Primary:** Solid Obsidian Black with Surface White text.
- **Hover / Focus:** Immediate shift to Deep Hover; no elastic scaling or bouncy transitions.
- **Secondary:** Transparent background with Structural Border.

### Cards / Containers
- **Corner Style:** 8px radius (`rounded-md`).
- **Background:** Surface White (`#ffffff`).
- **Shadow Strategy:** Flat. Relies on Tonal Layering.
- **Border:** 1px solid Structural Border (`#e5e5e5`).

### Inputs / Fields
- **Style:** Surface White background, Strong Border, 8px radius.
- **Focus:** Border shifts to Obsidian Black (`#050505`) with a tight 2px outline for maximum accessibility (`outline: 2px solid rgba(5, 5, 5, 0.08)`).

### AI Elements (Terminal, Message, CodeBlock)
- **Style:** Native macOS aesthetic. Terminal windows use deep dark backgrounds (`#09090b`) with monochromatic text. Messages are dense, relying on padding and borders rather than rounded chat bubbles.

## 6. Do's and Don'ts

### Do:
- **Do** use Tonal Layering (panel color vs background color) combined with 1px borders to separate content.
- **Do** constrain border-radius to a maximum of 8px (`rounded-md`) for all primary surfaces.
- **Do** ensure inputs have a sharp, high-contrast focus state.

### Don't:
- **Don't** use "Ghost-card" SaaS templates or blurry drop shadows.
- **Don't** use over-rounded elements (32px+ radius).
- **Don't** use decorative gradients, stripes, or "fluffy" marketing designs.
- **Don't** use dense data-tables with brutalist plain HTML and zero spacing. All data must have breathable but structured padding.
