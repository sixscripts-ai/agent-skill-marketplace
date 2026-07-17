import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Bot,
  Braces,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

const categories = [
  { name: "Development", description: "Code review, debugging, migration, and delivery workflows.", icon: Braces },
  { name: "Research", description: "Source-backed discovery, analysis, and synthesis.", icon: Bot },
  { name: "Automation", description: "Repeatable agent workflows with visible permissions.", icon: GitBranch },
];

const proof = [
  { value: "Inspectable", label: "Read the instructions and permissions before running." },
  { value: "Evaluated", label: "Compare test results and version history." },
  { value: "Sandboxed", label: "Run skills with explicit execution controls." },
  { value: "Portable", label: "Install across supported agent environments." },
];

export default function Home() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-container flex h-16 items-center gap-5">
          <Link href="/" className="flex items-center gap-3 font-semibold text-foreground">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span>Agent Skill Marketplace</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 md:flex" aria-label="Public navigation">
            <Link className="public-nav-link" href="/marketplace">Marketplace</Link>
            <Link className="public-nav-link" href="/docs">Docs</Link>
            <Link className="public-nav-link" href="/cli">CLI</Link>
          </nav>
          <Link className="public-secondary ml-auto md:ml-0" href="/sign-in">Sign in</Link>
          <Link className="public-primary hidden sm:inline-flex" href="/builder">Create a skill</Link>
        </div>
      </header>

      <main>
        <section className="public-container public-hero">
          <div className="public-kicker">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Inspect before you install
          </div>
          <h1>Skills for agents that need to do real work.</h1>
          <p className="public-lede">
            Discover, evaluate, run, and install portable AI skills with transparent permissions,
            version history, sandbox controls, and traceable execution.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/marketplace" className="public-primary">
              Browse marketplace <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/builder" className="public-secondary">
              <TerminalSquare className="size-4" aria-hidden="true" /> Build a skill
            </Link>
          </div>

          <div className="public-proof-grid mt-14">
            {proof.map((item) => (
              <div key={item.value} className="public-card">
                <div className="text-sm font-semibold text-foreground">{item.value}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="public-section">
          <div className="public-container">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Explore</div>
              <h2 className="mt-3">Find the right capability without guessing what it can access.</h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                Every skill should communicate its workflow, permissions, compatibility, evaluations,
                and install targets before a user runs it.
              </p>
            </div>
            <div className="public-category-grid mt-10">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.name}
                    href={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    className="public-card group"
                  >
                    <span className="grid size-10 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold text-foreground group-hover:text-primary">{category.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      View skills <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="public-container grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workflow</div>
              <h2 className="mt-3">From discovery to a verified run.</h2>
            </div>
            <div className="grid gap-3">
              {[
                [Blocks, "Inspect", "Review instructions, compatibility, versions, and required permissions."],
                [CheckCircle2, "Evaluate", "Use saved tests and regression results to understand quality."],
                [TerminalSquare, "Run", "Execute in a controlled workspace and inspect the resulting trace."],
              ].map(([Icon, title, body], index) => {
                const StepIcon = Icon as typeof Blocks;
                return (
                  <div key={String(title)} className="public-card flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                      <StepIcon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="text-xs font-mono text-muted-foreground">0{index + 1}</div>
                      <h3 className="mt-1 font-semibold text-foreground">{String(title)}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{String(body)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-container flex flex-wrap items-center justify-between gap-3">
          <span>Agent Skill Marketplace</span>
          <div className="flex gap-5">
            <Link href="/docs">Documentation</Link>
            <Link href="/marketplace">Marketplace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
