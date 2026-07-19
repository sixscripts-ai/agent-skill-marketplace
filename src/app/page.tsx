import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Package,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

import "@/app/firebench.css";
import "@/app/landing.css";

const features = [
  {
    title: "Inspect",
    body: "Read instructions, permissions, compatibility, and version history before you install or run.",
    icon: Eye,
    href: "/marketplace",
  },
  {
    title: "Sandbox run",
    body: "Execute skills with explicit controls, network policy, and a full trace of what happened.",
    icon: TerminalSquare,
    href: "/docs",
  },
  {
    title: "Install",
    body: "Ship portable skills into agent environments with CLI install targets and clear provenance.",
    icon: Package,
    href: "/cli",
  },
];

const steps = [
  {
    title: "Discover",
    body: "Browse the marketplace for capabilities that match your agent’s job.",
  },
  {
    title: "Evaluate",
    body: "Check permissions, evals, and versions so you know what you’re trusting.",
  },
  {
    title: "Run & install",
    body: "Prove the skill in a sandbox, then install it where your agents work.",
  },
];

const faqs = [
  {
    q: "What is Agent Skill Marketplace?",
    a: "A place to discover, inspect, evaluate, run, and install portable AI skills with transparent permissions and sandboxed execution.",
  },
  {
    q: "Can I run a skill before installing it?",
    a: "Yes. Open any skill’s run lab to execute in a controlled workspace, review artifacts, and inspect the resulting trace.",
  },
  {
    q: "How do agents install skills?",
    a: "Use the CLI install targets published with each skill, or pull the skill package into supported agent environments.",
  },
  {
    q: "What stack powers the marketplace?",
    a: "Next.js, Prisma, Vercel Sandbox, and Clerk — with Firebench UI for inspectable, developer-first surfaces.",
  },
];

export default function Home() {
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-container lp-header__inner">
          <Link href="/" className="lp-logo">
            <span className="lp-logo__mark" aria-hidden="true">
              <Sparkles className="size-3.5" />
            </span>
            <span className="lp-logo__name">Agent Skill Marketplace</span>
          </Link>
          <nav className="lp-nav" aria-label="Public navigation">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/cli">CLI</Link>
          </nav>
          <div className="lp-header__actions">
            <Link className="lp-link" href="/sign-in">
              Sign in
            </Link>
            <Link className="fb-cta fb-cta--primary hidden sm:inline-flex" href="/builder">
              Create a skill
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero__wash" aria-hidden="true" />
          <div className="lp-container lp-hero__inner">
            <div className="lp-hero__copy">
              <p className="lp-kicker">// Inspect before you install</p>
              <h1 className="lp-title">
                Power agents with <em>portable skills</em>
              </h1>
              <p className="lp-lead">
                Discover, evaluate, run, and install AI skills with transparent permissions,
                sandbox controls, and traceable execution.
              </p>
              <div className="lp-cta-row">
                <Link href="/marketplace" className="fb-cta fb-cta--primary">
                  Browse marketplace <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/builder" className="fb-cta fb-cta--ghost">
                  <TerminalSquare className="size-4" aria-hidden="true" /> Create a skill
                </Link>
              </div>
            </div>

            <div className="lp-play" aria-label="Product preview">
              <div className="lp-play__tabs" role="tablist" aria-label="Skill workflow">
                <span className="lp-play__tab" data-active="true" role="tab" aria-selected="true">
                  Browse
                </span>
                <span className="lp-play__tab" role="tab" aria-selected="false">
                  Run
                </span>
                <span className="lp-play__tab" role="tab" aria-selected="false">
                  Trace
                </span>
              </div>
              <div className="lp-play__body">
                <div className="lp-play__meta">
                  <span>[ .SKILL ]</span>
                  <span>sandbox · deny-all</span>
                </div>
                <pre className="lp-code">
                  <span className="lp-code__muted"># skill: code-review</span>
                  {"\n"}permissions:{"\n"}
                  {"  "}fs: read{"\n"}
                  {"  "}network: deny-all{"\n"}
                  <span className="lp-code__heat">status: ready</span>
                  {"\n"}
                  <span className="lp-code__muted"># inspect → evaluate → run</span>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <div className="lp-trust">
          <div className="lp-container lp-trust__inner">
            <span>Next.js</span>
            <span className="lp-trust__sep" aria-hidden="true">
              ·
            </span>
            <span>Prisma</span>
            <span className="lp-trust__sep" aria-hidden="true">
              ·
            </span>
            <span>Vercel Sandbox</span>
            <span className="lp-trust__sep" aria-hidden="true">
              ·
            </span>
            <span>Clerk</span>
          </div>
        </div>

        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-section__head">
              <p className="lp-kicker lp-kicker--section">// Developer first</p>
              <h2>Built for agents that do real work</h2>
              <p>
                Every skill should show its workflow, permissions, and install path before it
                touches your environment.
              </p>
            </div>
            <div className="lp-features">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="lp-feature">
                    <span className="lp-feature__icon" aria-hidden="true">
                      <Icon className="size-4" />
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                    <Link className="lp-feature__link" href={feature.href}>
                      Learn more <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-section__head">
              <p className="lp-kicker lp-kicker--section">// How it works</p>
              <h2>From discovery to a verified run</h2>
              <p>Three steps from browsing a skill to proving it in a sandbox.</p>
            </div>
            <div className="lp-steps">
              {steps.map((step, index) => (
                <div key={step.title} className="lp-step">
                  <span className="lp-step__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container lp-agent">
            <div className="lp-section__head" style={{ marginBottom: 0 }}>
              <p className="lp-kicker lp-kicker--section">// Agent ready</p>
              <h2>Install skills where your agents live</h2>
              <p>
                One command to pull a skill into your agent toolkit. Inspect first, then install
                with confidence.
              </p>
              <div className="lp-cta-row" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                <Link href="/cli" className="fb-cta fb-cta--primary">
                  View CLI docs <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/docs" className="fb-cta fb-cta--ghost">
                  <ShieldCheck className="size-4" aria-hidden="true" /> Permissions guide
                </Link>
              </div>
            </div>
            <div className="lp-agent__panel">
              <div className="lp-agent__bar">
                <span className="lp-agent__dot" aria-hidden="true" />
                skill install
              </div>
              <pre className="lp-code">{`# Install a marketplace skill
npx asm skill install code-review

# Or fetch the skill package
curl -s https://asm.dev/skills/code-review/SKILL.md
`}</pre>
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--center">
          <div className="lp-container">
            <div className="lp-section__head">
              <p className="lp-kicker lp-kicker--section">// FAQ</p>
              <h2>Frequently asked questions</h2>
              <p>Everything you need to know about browsing, running, and installing skills.</p>
            </div>
            <div className="lp-faq">
              {faqs.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <span>Agent Skill Marketplace</span>
          <div className="lp-footer__links">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/cli">CLI</Link>
            <Link href="/builder">Create</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
