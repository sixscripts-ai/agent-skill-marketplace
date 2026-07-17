import { NextResponse } from "next/server";
import { latestVersion } from "@/lib/data";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { findSkill, savePackageExport } from "@/lib/repository";
import { createZip } from "@/lib/zip";
import type { Skill } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
  const { skillId } = await params;
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
    files: ["SKILL.md", "README.md", "skill.json", "examples/sample-inputs.json"],
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
  const uploadedFiles = await uploadedPackageZipFiles(skill);
  const generatedPaths = new Set(["SKILL.md", "README.md", "skill.json", "examples/sample-inputs.json", "install/cli.md", ...Object.keys(installDocs)]);
  const zip = createZip([
    ...uploadedFiles.filter((file) => !generatedPaths.has(file.path)),
    { path: "SKILL.md", content: version.skillMd },
    { path: "README.md", content: version.readme },
    { path: "skill.json", content: JSON.stringify(manifest, null, 2) },
    { path: "examples/sample-inputs.json", content: JSON.stringify([{ input: "Run this skill against an uploaded package and return a trace-backed report." }], null, 2) },
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

async function uploadedPackageZipFiles(skill: Skill) {
  const latestPackage = skill.packages?.[0];
  if (!latestPackage) return [];

  const filesPromises = latestPackage.files.map(async (file) => {
    if (file.content !== undefined) {
      return { path: file.path, content: decodeStoredPackageContent(file.content) };
    }
    if (file.blobUrl) {
      const response = await fetch(file.blobUrl);
      if (response.ok) {
        return { path: file.path, content: new Uint8Array(await response.arrayBuffer()) };
      }
    }
    return null;
  });

  const results = await Promise.all(filesPromises);
  const files = [];
  for (const result of results) {
    if (result !== null) {
      files.push(result);
    }
  }
  return files;
}

function decodeStoredPackageContent(content: string) {
  const match = content.match(/^data:[^;]+;base64,(.+)$/);
  return match ? Uint8Array.from(Buffer.from(match[1], "base64")) : content;
}
