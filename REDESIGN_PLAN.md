# Agent Skill Marketplace Redesign Plan

## Objective

Replace the current cyberpunk prototype styling with a cohesive, production-ready product system for discovering, creating, evaluating, running, and distributing agent skills.

## Phase 1: Foundation

- Replace legacy neon and cyber-specific tokens with a neutral product palette.
- Establish light and dark theme variables.
- Normalize typography, spacing, radii, shadows, focus rings, and motion.
- Redesign global buttons, inputs, cards, badges, navigation, dialogs, empty states, and loading states.
- Rebuild the authenticated application shell with clearer information architecture.
- Preserve existing routing and backend behavior.
- Add consistent responsive behavior and accessibility states.

## Phase 2: Public Experience

- Create a public landing page.
- Make public marketplace and skill detail routes readable without authentication.
- Redesign marketplace discovery, filters, skill cards, collections, and search.
- Add public documentation and CLI onboarding.

## Phase 3: Creator Workflows

- Redesign My Skills.
- Redesign the builder without replacing working server behavior.
- Restyle Eve Builder while preserving existing XYFlow graph logic.
- Improve publishing, validation, import, versioning, and installation flows.

## Phase 4: Execution and Evaluation

- Redesign sandbox execution.
- Redesign run history and trace inspection.
- Redesign evaluations, comparisons, regressions, and artifacts.
- Improve status feedback for queued, running, blocked, failed, and completed runs.

## Phase 5: Administration and Quality

- Add a role-gated admin information architecture.
- Use real data where available and honest empty states where backend support is missing.
- Complete accessibility, responsive, performance, and content reviews.
- Expand Playwright coverage for public, author, and administrator flows.

## Phase 1 Acceptance Criteria

- No visible route depends on neon green or cyber-specific styling.
- Shared components use design tokens rather than page-specific colors.
- Keyboard focus is visible on every interactive control.
- Navigation works at desktop, tablet, and mobile widths.
- Existing feature behavior remains intact.
- TypeScript, lint, build, security tests, and Playwright tests are run before merge.

## Working Branch

`redesign/phase-1-foundation`

All changes remain isolated from `main` until reviewed and merged.
