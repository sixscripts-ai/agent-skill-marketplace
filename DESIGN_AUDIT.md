# Agent Skill Marketplace — Visual Design Audit

Audit target: `redesign/phase-1-working`

This audit focuses on visual consistency, color-system integrity, responsive behavior, information hierarchy, navigation, accessibility, and component reuse. It is based on the current branch source. The production domain is still serving an older login-gated deployment, so this document evaluates the redesign branch rather than the currently aliased production build.

## Executive summary

The application currently contains three competing visual systems:

1. A legacy neon-green/cyber system in `globals.css`.
2. A newer Firecrawl-inspired orange/graphite/paper token layer in `theme-production.css`.
3. Large amounts of hardcoded Tailwind neutral, white, blue, cyan, green, purple, yellow, and pink classes inside individual pages.

The marketplace shell is the most coherent area. The landing page, skill detail, builder, Eve Builder, runner, traces, evals, My Skills, and AI Elements still use older or hardcoded styles. The result is not a single product identity; it looks like several separate prototypes sharing one repository.

The highest-risk flaw is theme contrast. Many pages use `text-neutral-950` and `text-neutral-600` while the global theme can switch to dark surfaces through `prefers-color-scheme`. Other areas use `text-white` while the global theme can render a light paper background. This creates predictable low-contrast or invisible text states.

## Severity overview

### P0 — release blockers

- Remove the legacy Volt Green token system and all remaining `#39FF14`, `#CEFF00`, `heat-*`, and `cyber-*` presentation dependencies.
- Replace hardcoded light-only and dark-only text colors with semantic tokens.
- Rebuild the landing page against the same public design system as the marketplace.
- Rebuild skill detail against the production component set.
- Fix navigation entries that are misleading, duplicated, fake, or routed to the wrong destination.

### P1 — major consistency and usability defects

- Redesign Builder, Runner, Traces, Evals, My Skills, and AI Elements with shared page headers, panels, controls, tables, empty states, and status treatments.
- Bring Eve Builder into the same product identity without changing its workflow behavior.
- Remove fake account and system-status information from the shell.
- Add a deliberate theme strategy instead of relying only on system preference.
- Remove decorative effects that conflict with the restrained Firecrawl-inspired direction.

### P2 — polish and product maturity

- Improve mobile navigation and filter discoverability.
- Standardize typography, iconography, spacing, radii, shadows, code surfaces, and status colors.
- Add branded auth, loading, empty, error, and not-found states.
- Replace implementation-facing copy with user-facing product language.

## System-wide findings

### 1. Legacy neon tokens remain globally active

`globals.css` still defines bright green cards, popovers, focus rings, heat scales, brand colors, glow values, and a complete cyber marketplace component set. The later production theme overrides some variables, but it does not erase the legacy classes or every legacy token. Any component using `heat-*`, `cyber-*`, or a hardcoded green bypasses the intended orange theme.

Required fix:

- Delete the legacy `marketplace-cyber`, `cyber-card`, `cyber-btn-*`, `cyber-pill`, `cyber-select`, `cyber-badge`, `cyber-code`, and `cyber-card-selected` rules.
- Remove the Volt Green heat scale or remap it to semantic status colors only.
- Keep one authoritative token source.

### 2. Hardcoded colors defeat light and dark mode

The production theme changes the canvas, panels, text, borders, sidebar, and controls based on system preference. Many page files still specify `text-neutral-950`, `text-neutral-600`, `text-white`, `bg-neutral-950`, `bg-[#0a0a0a]`, `bg-[#39FF14]`, and fixed blue/green surfaces. Those classes do not adapt to the selected surface.

Required fix:

- Use `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-primary`, and status tokens.
- Reserve explicit red/amber/green for actual error, warning, and success meaning.
- Add an explicit theme control or force a single intentional dark theme until both modes are complete.

### 3. The app has inconsistent visual identities

The landing page is a dark generic SaaS page. Marketplace is orange/paper. Skill detail is cyan/green cyber. Builder is a light dashboard with fluorescent green fields. Eve Builder is a black full-screen IDE. AI Elements is an internal component catalog. These are visually separate products.

Required fix:

- Define public, authenticated workspace, and full-canvas builder shells.
- Share typography, tokens, controls, badges, cards, tables, code blocks, and empty states across all three shells.

### 4. Shared primitives are underused

The repository has reusable Button, Card, Badge, and tokenized surfaces, but feature pages continue to hand-build buttons, inputs, panels, tabs, status badges, and tables with local classes.

Required fix:

- Add shared `PageHeader`, `SectionHeader`, `Field`, `Select`, `Toolbar`, `DataTable`, `Tabs`, `StatusBadge`, `EmptyState`, `CodePanel`, and `Metric` primitives.
- Ban direct hex colors in route and feature components.

### 5. Layout width is applied globally when some tools need full canvas

The shell wraps every route in a centered `max-w-7xl` container. That works for marketplace and documentation but constrains Builder, Runner, graph, and evaluation workspaces. Eve Builder escapes with `fixed inset-0`, which creates a separate layering model instead of a supported full-width route mode.

Required fix:

- Add shell layout modes: `content`, `wide`, and `canvas`.
- Let Builder, Runner, Traces, Evals, and graph use `wide`.
- Let Eve Builder use `canvas` without fixed-position hacks.

## Page-by-page audit

## Landing page

Current problems:

- It does not use the public shell or production page components.
- It hardcodes white text and dark neutral borders while the global theme may render a light paper background.
- Category icons use six unrelated colors, weakening the orange/graphite identity.
- Category cards still use `cyber-card`.
- Category cards show a pointer cursor but are not links or buttons.
- The header has no mobile menu, account state, theme control, or connection to the authenticated shell.
- The CTA hierarchy is generic black/white rather than the product accent system.
- The page lacks real marketplace proof: featured skills, trust model, permission transparency, evals, traces, install targets, or usage workflow.

Recommended direction:

- Rebuild as a public Firecrawl-inspired landing page using paper/graphite/orange.
- Use one accent color plus semantic statuses.
- Add product proof sections: featured skills, how it works, trust and permissions, supported agent targets, and builder CTA.
- Make categories real links to filtered marketplace views.
- Add responsive public navigation and sign-in/account actions.

## Marketplace

Current strengths:

- The new hero, discovery rail, and skill cards use semantic tokens and the `*-v2` production classes.
- The card hierarchy is clearer than the legacy cyber version.

Current problems:

- The hero can reach 5.75rem with very tight tracking, making it visually dominant relative to the actual marketplace content.
- The “Autonomous Agent Skill System” badge is vague and sounds like internal positioning rather than a user benefit.
- The technology strip advertises implementation details instead of trust, compatibility, or marketplace value.
- The one-line filter rail contains search, five pills, and five selects. On smaller screens it becomes a long horizontal strip with no clear scroll cue.
- Select labels are screen-reader-only, so visible context depends on option text.
- There is no persistent clear/reset control when results exist.
- Trust badge colors add another green/blue/amber palette alongside orange.
- Cards lack a visible version, compatibility target, or permission-risk cue, which are central to this product.

Recommended direction:

- Reduce hero height and move featured or trending content above the full grid.
- Replace the technology strip with trust and compatibility indicators.
- Split discovery into search/sort and a compact filter drawer or popover on mobile.
- Add active-filter chips and a visible reset action.
- Keep status colors muted and reserve orange for product actions.

## Skill detail

Current problems:

- The page still uses the complete legacy cyber system.
- Headings, body copy, links, tabs, cards, badges, and CTAs use hardcoded white, gray, cyan, and green.
- Active tabs use the legacy `heat-100` green token.
- The “Quick Run” CTA includes a lightning emoji instead of the icon system.
- The metrics panel presents four equal values without indicating which are trust-critical.
- Project links are plain cyan text and visually detached from the rest of the page.
- Reviews use index keys and have no author identity, date, rating distribution, or empty-state treatment.
- Permission risk is visually colored but not organized by capability or consequence.

Recommended direction:

- Rebuild with a structured header, metadata row, primary Run action, secondary Install action, and tertiary Fork/Edit actions when authorized.
- Use tokenized tabs.
- Elevate trust, permissions, compatibility, version, eval score, and last update above vanity metrics.
- Present permissions as a risk table or grouped cards with plain-language consequences.
- Use the shared status badge system.

## Builder

Current problems:

- Fluorescent green is hardcoded across API Keys, workflow steps, selects, uploads, package previews, parser controls, editor tabs, model select, and other controls.
- The page mixes light dashboard styling, blue AI Copilot styling, black publish actions, and green accents.
- It uses many local form implementations rather than shared fields and controls.
- The page is extremely dense: long onboarding guides, metadata, permissions, uploads, editor, Copilot, preview, validation, testing, and publishing are presented at once.
- The global `max-w-7xl` constraint compresses a three-column authoring interface.
- Primary actions are not consistently prioritized; API Keys can look more prominent than publishing.
- Validation is spread across badges, warnings, and helper copy rather than a single actionable checklist.

Recommended direction:

- Use a wide workspace shell.
- Move onboarding into a dismissible guide or first-run state.
- Create a stable three-area layout: left configuration, center editor, right validation/preview.
- Keep Publish as the only primary accent action.
- Move API settings to account/settings or a subdued utility action.
- Replace all direct green and blue styling with tokens.

## Eve Builder

Current problems:

- It is a separate black application with fixed positioning, oversized rounded panels, translucent borders, motion entrances, and neon green export controls.
- `fixed inset-0` bypasses the normal shell instead of using a supported canvas route.
- The 320px left panel and 450px right panel are fixed widths.
- The right preview disappears below `xl` with no replacement workflow.
- There is no documented compact/mobile layout.
- The green export button uses legacy heat tokens and a glow shadow.
- The page does not share the normal navigation, breadcrumbs, account state, typography hierarchy, or control styling.

Recommended direction:

- Preserve all node, state, editor, and export behavior.
- Place it inside a canvas shell with a compact top toolbar.
- Use resizable/collapsible side panels.
- Provide inspector and preview drawers at smaller widths.
- Replace glow and neon with the shared orange accent and neutral surfaces.
- Reduce decorative entrance motion and honor reduced motion at the component level.

## Runner / Sandbox

Current problems:

- The page uses a light-only neutral palette with hardcoded black actions and fluorescent green suggestion chips.
- It includes a lightning emoji in the Quick Run action.
- The three-column layout only appears at very large breakpoints and contains many stacked explanation panels before the operational workspace.
- Prompt, execution controls, permissions, files, conversation, tools, terminal, and trace summary compete for attention.
- Controls use mixed shared and hand-built components.
- “Virtual agent” and “real shell” are presented as badge states rather than a clear mode switch with consequences.

Recommended direction:

- Make the conversation/workspace the center of the page.
- Put execution mode, provider, network, and permissions in a collapsible inspector.
- Keep files and artifacts in a dockable panel.
- Use one primary Run action and explicit approval states.
- Replace green suggestions with neutral suggestion chips.

## Traces

Current problems:

- Conversation output, artifact previews, and tool containers use fluorescent green backgrounds.
- The page is highly dense and repeats the same neutral panel treatment for every section.
- Raw run IDs dominate the page title.
- Metadata is a long key/value list without grouping or severity prioritization.
- Timeline, terminal, files, artifacts, JSON, and replay controls lack a clear debugging sequence.

Recommended direction:

- Lead with status, skill, time, duration, provider, cost, and failure summary.
- Use a chronological timeline as the primary surface.
- Move raw JSON and exports into secondary tabs or drawers.
- Use neutral code and artifact surfaces.
- Highlight blocked/failed events semantically, not with whole-panel color fills.

## Evaluations

Current problems:

- The Run Suite control and case rows use fluorescent green.
- The page is structurally a form plus repeated panels, with limited visual distinction between creating a case, viewing cases, and analyzing results.
- Score trend is a simple bar and does not communicate version history well.
- The interface does not clearly separate draft cases, last run, regressions, and historical results.

Recommended direction:

- Use a suite list/sidebar and a focused suite detail view.
- Present score history as a real version timeline or compact chart.
- Make regressions the strongest visual signal.
- Move case creation into a drawer or dedicated form panel.

## My Skills

Current problems:

- Entire table rows use fluorescent green.
- The table has a fixed minimum width of 860px and only falls back to horizontal scrolling.
- The page lacks a clear title, summary, empty-state CTA, ownership indicator, visibility explanation, and draft/published grouping.
- Edit and Run actions use unrelated green and black treatments.

Recommended direction:

- Use a responsive table on desktop and cards/list rows on mobile.
- Add a page header with Create Skill.
- Use visibility/status badges and owner metadata.
- Keep rows neutral and use hover/selection only.

## AI Elements

Current problems:

- The route reads like an internal implementation catalog rather than a customer-facing product feature.
- Copy such as “Installed next,” registry commands, and component bundle planning exposes development notes.
- Recommended bundle cards and component menus use fluorescent green.
- The page is long, text-heavy, and visually repetitive.

Recommended direction:

- Decide whether this is public documentation, a developer playground, or an internal admin route.
- For a public playground, show live interactive examples first and implementation details second.
- For internal use, move it behind authenticated developer navigation.
- Remove roadmap language from production UI.

## Docs

Current problems:

- It is a grid of six generic panels plus two large explanatory components.
- There is no documentation navigation, search, breadcrumbs, table of contents, deep links, or code-first quickstart.
- Hardcoded neutral text colors do not adapt safely to dark mode.
- The page explains features but does not function as a usable documentation system.

Recommended direction:

- Add docs sidebar, search, article layout, headings with anchors, quickstart, install/run examples, and route-based pages.
- Use the public docs shell rather than the application workspace shell where appropriate.

## CLI

Current problems:

- The route is only two panels and a local-development command example.
- It tells production users to point the CLI at `http://localhost:3000`.
- There are no install prerequisites, version information, authentication instructions, command reference, update path, or platform notes.

Recommended direction:

- Replace the local URL with production-aware examples.
- Add install, authenticate, search, inspect, install, run, trace, and update sections.
- Present the download action as a clear primary or secondary choice depending on the intended distribution strategy.

## Install

Current problems:

- Every platform target is presented with the same weight.
- There is no recommended target, detected environment, copy confirmation, or step-by-step progression.
- The page depends on repeated code blocks and generic panels.
- Hardcoded neutral heading/body colors create dark-mode risk.

Recommended direction:

- Add target tabs or a target selector.
- Put the recommended path first.
- Add copy buttons, success feedback, verification commands, and troubleshooting.
- Separate package download from platform-specific installation.

## Versions

Current problems:

- The current version and rollback versions have similar card weight.
- The diff is two independent code blocks rather than a semantic diff.
- Version metadata is minimal.
- Hardcoded neutral heading colors create theme risk.

Recommended direction:

- Use a timeline with current, prior, and rollback states.
- Add release date, author, eval delta, permissions delta, and compatibility delta.
- Use a real line or unified diff component.

## Dependency graph / Collections

Current problems:

- The route is called a graph but renders grouped cards and text edges rather than a visual graph.
- Counts, nodes, and edges are repetitive neutral panels.
- The name “Collections” in navigation does not match “Dependency Graph” in the page.

Recommended direction:

- Choose one concept and name it consistently.
- Render an actual interactive graph for dependencies, or rename the page to Dependency Inventory.
- Add filtering, selection, inspector details, and risk highlighting.

## Authentication

Current problems:

- Sign-in and sign-up render the default Clerk widget on a bare centered page.
- There is no product branding, context, public navigation, support link, privacy copy, or design-system integration.

Recommended direction:

- Add a branded auth shell using the same paper/graphite/orange theme.
- Configure Clerk appearance tokens.
- Explain what requires an account and provide a clear route back to the public marketplace.

## App shell and navigation

Current problems:

- Top navigation and sidebar duplicate many destinations.
- “Settings” routes to `/cli`.
- “Installed” routes to a hardcoded `agent-observer` package.
- The API link points to `/api-docs`, but no route is present in the current repository search.
- The account fallback displays a real-looking personal name and generated workspace even when no user is loaded.
- The system status says routes are operational without querying real health data.
- The shell wrapper combines `app-shell-v2` with `contents`; because `display: contents` removes the wrapper box, its own background and min-height declarations cannot render.
- Mobile navigation duplicates top navigation in a horizontally scrolling strip.
- The notification popover has no focus management, click-outside handling, or escape behavior.

Recommended direction:

- Separate public navigation from authenticated workspace navigation.
- Use one primary workspace navigation system.
- Replace hardcoded destinations with real inventory/settings routes.
- Remove fake status and user content.
- Add a real account menu and route-level authorization states.
- Replace the `contents` wrapper with a real shell container.

## Shared component audit

### Buttons

The shared Button primitive correctly maps the primary token, but many pages bypass it with local `<button>` styles. This creates inconsistent heights, radii, hover states, disabled states, and colors.

### Cards / Panels

`Panel` is an alias for the shared Card, but most pages pass direct neutral borders, backgrounds, and text colors into their content. The production CSS also overrides the Card radius, creating two sources of truth.

### Badges

Badges have neutral, green, amber, red, and blue tones. These are useful for status, but they are frequently used decoratively. Green and blue should not be generic accents when orange is the product accent.

### Forms

Inputs and selects are repeatedly handwritten. Labels, help text, validation, error states, heights, and focus behavior vary by page. A shared field system is required.

### Typography

The app mixes large monospace headings, standard sans headings, uppercase micro-labels, raw IDs, and very tight hero tracking. Monospace should be reserved for code, versions, paths, commands, and identifiers.

### Iconography

Lucide is available, but emoji are still used for Quick Run and errors. Use the icon set consistently and pair icons with text only when they add meaning.

### Motion

The shell and marketplace are restrained, while Eve Builder animates major panels from multiple directions. Motion should be subtle, purposeful, and disabled under reduced-motion preferences.

## Accessibility and responsive issues

- Hardcoded light/dark text colors can fail contrast depending on system theme.
- Horizontally scrolling navigation, filters, and tables lack strong scroll affordances.
- Category cards use pointer styling without interactive semantics.
- Some popovers and custom controls lack focus trapping, escape handling, and click-outside behavior.
- Visible labels are missing for marketplace selects.
- Fixed-width builder panels are not viable on smaller displays.
- The default Clerk views are not visually integrated with the surrounding page.
- Emoji used as icons may be announced inconsistently.
- Some dense tool pages place instructional content before the task users came to perform.

## Recommended implementation sequence

1. Consolidate tokens and remove legacy cyber/green CSS.
2. Replace all direct neon colors and hardcoded foreground/background colors in shared feature components.
3. Rebuild the landing page and public navigation.
4. Rebuild skill detail.
5. Correct the shell, navigation destinations, account state, fake status, and layout modes.
6. Redesign Builder and Eve Builder using wide/canvas shell modes.
7. Redesign Runner, Traces, and Evals as a consistent execution workspace.
8. Redesign My Skills, Install, Versions, and Dependency Graph.
9. Reframe AI Elements, Docs, and CLI for their intended audiences.
10. Brand authentication, loading, empty, error, and not-found states.
11. Run contrast, keyboard, mobile, visual-regression, lint, build, security, and Playwright checks.

## Acceptance criteria

The redesign is ready for production when:

- No feature component contains `#39FF14`, `#CEFF00`, `heat-*`, or `cyber-*` presentation classes.
- Route and feature components do not use direct light-only or dark-only text/background colors except for deliberate code canvases.
- Landing, marketplace, skill detail, and auth clearly belong to the same product.
- Builder, Eve Builder, Runner, Traces, and Evals share a coherent workspace design.
- Every navigation item has a real route and accurate label.
- No fake user, status, metric, or operational claim is displayed.
- Desktop, tablet, and mobile layouts are intentionally designed rather than horizontally overflowed by default.
- Keyboard navigation, focus states, contrast, and reduced motion are verified.
- Lint, build, security tests, and Playwright tests pass on the release commit.
