import { NextResponse } from "next/server";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill, savePackageExport } from "@/lib/repository";
import { createZip } from "@/lib/zip";

export async function GET(_request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const user = await getCurrentUser();
  const skill = await findSkill(skillId, user);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
  const version = latestVersion(skill);
  const target = new URL(_request.url).searchParams.get("target") ?? "all";
  const record = await savePackageExport(skill, target, user);
  const manifest = {
    name: skill.name,
    slug: skill.slug,
    version: version.version,
    files: ["SKILL.md", "README.md", "skill.json", "examples/demo-inputs.json"],
    permissions: skill.permissions.map((permission) => permission.key),
    compatibility: version.compatibilityTargets,
    exportId: record.id,
  };
  const installDocs = Object.fromEntries(
    skill.installTargets.map((item) => [
      `install/${item.platform.toLowerCase().replaceAll(" ", "-")}.md`,
      `# ${item.platform} install\n\n\`\`\`bash\n${item.installCommand}\n\`\`\`\n\n\`\`\`json\n${item.configSnippet}\n\`\`\`\n\n${item.notes}\n`,
    ]),
  );
  const zip = createZip([
    { path: "SKILL.md", content: version.skillMd },
    { path: "README.md", content: version.readme },
    { path: "skill.json", content: JSON.stringify(manifest, null, 2) },
    { path: "examples/demo-inputs.json", content: JSON.stringify([{ input: "Run this skill in browser sandbox mode." }], null, 2) },
    {
      path: "install/cli.md",
      content: `# CLI install\n\nDownload the marketplace CLI from /api/cli, then run:\n\n\`\`\`bash\nAGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs install ${skill.slug}\nAGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs run ${skill.slug}\n\`\`\`\n`,
    },
    ...Object.entries(installDocs).map(([filePath, content]) => ({ path: filePath, content })),
  ]);

  return new Response(zip, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${record.filename}"`,
    },
  });
}
