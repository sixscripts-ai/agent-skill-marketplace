import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { createOrUpdateSkill } from "@/lib/repository";
import type { SkillDraftInput } from "@/lib/types";

type BulkSkillInput = {
  slug: string;
  name: string;
  summary?: string;
  category?: string;
  skillMd?: string;
  permissions?: string[];
  compatibilityTargets?: string[];
  visibility?: SkillDraftInput["visibility"];
  versions?: Array<{ skillMd?: string; compatibilityTargets?: string[] }>;
};

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser();
    const skills = (await req.json()) as unknown;

    if (!Array.isArray(skills)) {
      return NextResponse.json({ error: "Expected an array of skills" }, { status: 400 });
    }

    const results: Array<{ slug: string; status: string; reason?: string }> = [];

    for (const raw of skills as BulkSkillInput[]) {
      const slug = String(raw.slug || "").trim();
      if (!slug) {
        results.push({ slug: "(missing)", status: "skipped", reason: "Missing slug" });
        continue;
      }

      const version = raw.versions?.[0];
      const skillMd = raw.skillMd ?? version?.skillMd ?? `# ${raw.name || slug}\n`;
      const draft: SkillDraftInput = {
        name: raw.name || slug,
        slug,
        category: raw.category || "Automation",
        summary: raw.summary || "Bulk imported skill.",
        skillMd,
        permissions: raw.permissions?.length ? raw.permissions : ["read_files"],
        compatibilityTargets: raw.compatibilityTargets ?? version?.compatibilityTargets ?? ["Codex", "Claude", "VS Code"],
        visibility: raw.visibility === "public" || raw.visibility === "unlisted" ? "private" : (raw.visibility ?? "private"),
      };

      try {
        await createOrUpdateSkill(draft, user);
        results.push({ slug, status: "imported" });
      } catch (error) {
        results.push({
          slug,
          status: "failed",
          reason: error instanceof Error ? error.message : "Import failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.filter((item) => item.status === "imported").length,
      results,
    });
  } catch (error) {
    return securityErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
