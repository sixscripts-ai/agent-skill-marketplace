# Agent Skill Marketplace

A portfolio-grade SaaS MVP for browsing, testing, evaluating, versioning, tracing, and exporting portable AI agent skills.

## What It Demonstrates

- Marketplace for reusable `SKILL.md` packages
- In-browser mock skill runner with permission approvals
- Sandbox-style trace events, blocked commands, latency, and cost
- Skill builder with validation, preview, test run, and publish state
- Version history with `SKILL.md` comparison
- Evaluation suites with regression indicators
- Install/export pages for Codex, Claude, Antigravity, OpenCode, Grok, and VS Code
- Prisma schema for the production data model

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma schema targeting Postgres
- Seeded demo data and deterministic mock runner

## Local Development

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Notes

The MVP intentionally uses seeded in-app data and a deterministic mock sandbox runner. Real isolated execution, real auth, and persisted Postgres writes are intended production follow-ups.
