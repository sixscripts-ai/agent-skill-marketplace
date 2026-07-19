# Contributing

## Branching

- Use `redesign/phase-1-working` as the integration branch until the redesign is merged into `main`.
- Create focused branches using `agent/<scope>` or `fix/<scope>`.
- Keep each pull request limited to one concern. Do not combine UI redesigns, schema changes, sandbox changes, and dependency upgrades in one diff.
- Do not force-push shared branches or run destructive Git commands without explicit approval.

## Required checks

Before requesting review, run:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma validate
node scripts/check-repository-hygiene.mjs
pnpm exec eslint --config eslint.quality.config.mjs src tests
pnpm exec tsc --noEmit
pnpm test:security
pnpm build
```

Run focused Playwright tests for user-facing changes. Full end-to-end coverage can be run with `pnpm test:e2e`.

## Repository safety

Never commit:

- `.env*` files other than a sanitized `.env.example`
- `.cursor/`
- `tmp/`
- Vercel credentials or provider API keys
- Playwright reports, test results, or authenticated browser state
- private keys or certificates

Rotate any secret that appears in a terminal transcript, issue, pull request, or chat.

## Architecture rules

- Validate all mutating API inputs at the route boundary.
- Enforce ownership server-side; client-side visibility is not authorization.
- Keep database writes that must succeed together inside one transaction.
- Prefer Prisma-generated payload types over `any` in repository mappers.
- Keep local demo persistence isolated from production database code.
- Preserve the full-package skill profile and complete package trees.

## UI rules

Firebench is the canonical design direction:

- light paper surfaces
- heat orange accent (`#fa5d19`)
- monospace kickers and technical labels
- restrained heat washes
- no neon green, generic purple AI styling, or dark-mode-first redesigns

Reuse `src/app/firebench.css`, `src/components/firebench/*`, `src/app/my-skills-console.css`, and `src/app/skill-workspace.css` before adding new page-level systems.

## Pull requests

Every pull request should explain:

- what changed
- why it changed
- risk or migration impact
- how it was validated
- what remains intentionally out of scope
