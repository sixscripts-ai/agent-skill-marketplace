# Coding Agent Instructions

This repository is an Agent Skill Marketplace built with Next.js 15, Prisma, Neon Postgres, Clerk, Vercel Sandbox, and multiple AI providers.

## Operating rules

1. Inspect the active branch and open pull requests before modifying code.
2. Prefer small, focused diffs.
3. Do not commit `.env*`, `.cursor/`, `tmp/`, credentials, tokens, or generated test output.
4. Do not force-push, delete branches, rewrite history, merge, or deploy unless explicitly requested.
5. Validate mutating inputs and enforce resource ownership on the server.
6. Preserve complete skill packages, including `scripts/`, `references/`, `assets/`, and `examples/`.
7. Add or update focused tests for bug fixes and data-boundary changes.

## Design direction

Use the Firebench system already present in the application:

- paper background
- heat orange accent (`#fa5d19`)
- monospace labels
- restrained technical density
- soft heat washes

Do not introduce neon green, generic purple AI gradients, or dark-mode-first styling. Reuse existing Firebench components and tokens rather than creating a parallel theme.

## Verification

Run the quality-gate commands documented in `CONTRIBUTING.md`. Do not treat the legacy `pnpm lint` result as sufficient; use `eslint.quality.config.mjs` until the legacy configuration is replaced.

## Important areas

- Terminal: `src/components/live-terminal-client.tsx`, `src/lib/terminal-session.ts`
- My Skills: `src/components/my-skills-client.tsx`
- Skill detail/run: `src/components/skill-detail-client.tsx`, `src/components/runner-client.tsx`
- Package validation: `src/lib/skill-package-profile.ts`
- Persistence: `src/lib/repository.ts`
- Publish API: `src/app/api/skills/route.ts`
