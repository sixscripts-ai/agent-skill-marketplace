import Link from "next/link";
import { TerminalSquare } from "lucide-react";

export function EveProjectRail({ skillSlug, skillName }: { skillSlug: string; skillName: string }) {
  const href = `/builder/eve?fromSkill=${encodeURIComponent(skillSlug)}`;
  return (
    <aside className="builder-eve-rail" aria-label="Eve agent workspace">
      <div className="builder-eve-rail__header">
        <TerminalSquare className="size-4 text-primary" aria-hidden="true" />
        <div>
          <strong>Eve</strong>
          <p>Project copilot for agent files, approvals, and tests.</p>
        </div>
      </div>
      <p className="builder-eve-rail__body">
        Keep Skill package + Forge here. Open Eve’s agent workspace to refine tools, approvals, and durable project files for{" "}
        <span className="font-mono">{skillName}</span>.
      </p>
      <Link href={href} className="builder-primary-button">
        Open agent workspace
      </Link>
      <p className="builder-eve-rail__hint">Engines stay separate — Forge proves the skill package; Eve owns the agent project.</p>
    </aside>
  );
}
