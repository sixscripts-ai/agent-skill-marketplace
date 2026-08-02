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

## Google Jules AI Workflow

This repository is optimized for autonomous development using **Google Jules AI** (powered by Gemini 3.1 Pro).

1. **Connect**: Link this GitHub repository at [jules.google](https://jules.google).
2. **Prompt**: Issue tasks directly to Jules (e.g., "Add a new Prisma model for UserSubscriptions").
3. **Automated CI**: Jules relies on the GitHub Actions pipeline (`.github/workflows/ci.yml`) to verify its changes via ESLint, TypeScript compilation, and Playwright tests before opening a Pull Request.
4. **Context**: Jules will automatically ingest the `DESIGN.md` and `PRODUCT.md` files to ensure new UI components match the "Flat-By-Default" dark-mode styling rules.


## Local Development

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Vercel Deployment

Production Vercel deployments require durable storage and real auth. The app fails fast instead of falling back to disposable `/tmp` JSON storage or the local demo admin account.

To deploy to Vercel, you must provision the following resources and configure these environment variables:

1. **Postgres Database (e.g., Vercel Postgres, Neon, Supabase)**
   Create a Postgres database and set the connection string. This is used by Prisma for skills, runs, packages, traces, and ownership data.
   - `DATABASE_URL`: Postgres connection string (e.g. `postgres://user:pass@host/db`)

2. **Vercel Blob Storage**
   Create a Vercel Blob store in your Vercel project dashboard. This is used for uploaded skill package files.
   - `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for read/write access.

3. **Clerk Authentication**
   Create a Clerk application and retrieve the API keys. Without Clerk, protected API routes return unauthenticated responses on Vercel.
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk Publishable Key.
   - `CLERK_SECRET_KEY`: Clerk Secret Key.

Optional production environment variables:

- `ENABLE_REAL_SANDBOX=true`: Enables real shell execution through Vercel Sandbox. Leave unset to use the virtual provider route.
- `VERCEL_OIDC_TOKEN`, or `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID`: Sandbox authentication for real shell execution, depending on runtime context.
- `NEXT_PUBLIC_APP_URL`: Public deployment URL, used for provider metadata.
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`: Live provider configuration. Without provider keys, the virtual runner uses deterministic local behavior.

## Notes

The local MVP can use seeded in-app data and a deterministic mock sandbox runner. Production deployments should use Clerk, Postgres, Vercel Blob, and optionally Vercel Sandbox for real isolated execution.

## How We Use Jules AI

Jules AI is used in the development of this project to assist with coding tasks, such as solving bugs, implementing features, and writing tests. It helps maintain code quality, verify functionality, and accelerate the development workflow.
