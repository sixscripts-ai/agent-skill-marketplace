import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { listVisibleSkills } from "@/lib/repository";
import { MySkillsClient } from "@/components/my-skills-client";

export const dynamic = "force-dynamic";

export default async function MySkillsPage() {
  const user = await getCurrentUser();
  const skills = await listVisibleSkills(user);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">My Skills</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Manage published, draft, and remixable agent skills from one workspace.
            </p>
          </div>
          <ButtonLink href="/builder">New Skill</ButtonLink>
        </div>

        <MySkillsClient skills={skills} />
      </div>
    </AppShell>
  );
}
