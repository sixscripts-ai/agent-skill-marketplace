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

## Vercel Deployment

Production Vercel deployments require durable storage and real auth. The app fails fast instead of falling back to disposable `/tmp` JSON storage or the local demo admin account.

Required production environment variables:

- `DATABASE_URL`: Postgres connection string used by Prisma for skills, runs, packages, traces, and ownership data.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token used for uploaded skill package files.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: Clerk auth keys. Without Clerk, protected API routes return unauthenticated responses on Vercel.

Optional production environment variables:

- `ENABLE_REAL_SANDBOX=true`: Enables real shell execution through Vercel Sandbox. Leave unset to use the virtual provider route.
- `VERCEL_OIDC_TOKEN`, or `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID`: Sandbox authentication for real shell execution, depending on runtime context.
- `NEXT_PUBLIC_APP_URL`: Public deployment URL, used for provider metadata.
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`: Live provider configuration. Without provider keys, the virtual runner uses deterministic local behavior.

## Notes

The local MVP can use seeded in-app data and a deterministic mock sandbox runner. Production deployments should use Clerk, Postgres, Vercel Blob, and optionally Vercel Sandbox for real isolated execution.

## How We Use Jules AI

Jules AI is used in the development of this project to assist with coding tasks, such as solving bugs, implementing features, and writing tests. It helps maintain code quality, verify functionality, and accelerate the development workflow.
