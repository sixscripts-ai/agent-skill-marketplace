import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

interface SkillVersionInput {
  version: string;
  skillMd: string;
  readme: string;
  changelog: string;
  compatibilityTargets: unknown;
}

interface SkillPermissionInput {
  key: string;
  reason: string;
  risk: string;
}

interface InstallTargetInput {
  platform: string;
  installCommand: string;
  configSnippet: string;
  packageFormat: string;
  notes: string;
}

interface EvaluationCaseInput {
  input: string;
  expected: string;
  assertionType: string;
}

interface EvaluationResultInput {
  version: string;
  score: number;
  passed: number;
  failed: number;
  regressions: number;
}

interface EvaluationSuiteInput {
  name: string;
  cases: EvaluationCaseInput[];
  results: EvaluationResultInput[];
}

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const skills = await req.json();

    if (!Array.isArray(skills)) {
      return NextResponse.json({ error: "Expected an array of skills" }, { status: 400 });
    }

    // Default to the admin user
    let user = await prisma.user.findUnique({ where: { email: "admin@admin.com" } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Admin",
          email: "admin@admin.com",
          role: "admin",
          clerkId: "admin",
        },
      });
    }

    const results = [];
    for (const skill of skills) {
      const existing = await prisma.skill.findUnique({ where: { slug: skill.slug } });
      if (existing) {
        results.push({ slug: skill.slug, status: "skipped", reason: "Already exists" });
        continue;
      }

      await prisma.skill.create({
        data: {
          slug: skill.slug,
          name: skill.name,
          summary: skill.summary,
          category: skill.category,
          trustLevel: skill.trustLevel,
          installCount: skill.installCount,
          rating: skill.rating,
          visibility: skill.visibility,
          currentVersion: skill.currentVersion,
          author: { connect: { id: user.id } },
          versions: {
            create: skill.versions.map((v: SkillVersionInput) => ({
              version: v.version,
              skillMd: v.skillMd,
              readme: v.readme,
              changelog: v.changelog,
              compatibilityTargets: JSON.stringify(v.compatibilityTargets),
            })),
          },
          permissions: {
            create: skill.permissions?.map((p: SkillPermissionInput) => ({
              key: p.key,
              reason: p.reason,
              risk: p.risk,
            })) || [],
          },
          installTargets: {
            create: skill.installTargets?.map((t: InstallTargetInput) => ({
              platform: t.platform,
              installCommand: t.installCommand,
              configSnippet: t.configSnippet,
              packageFormat: t.packageFormat,
              notes: t.notes,
            })) || [],
          },
          evalSuites: {
            create: skill.evalSuites?.map((suite: EvaluationSuiteInput) => ({
              name: suite.name,
              cases: {
                create: suite.cases.map((c: EvaluationCaseInput) => ({
                  input: c.input,
                  expected: c.expected,
                  assertionType: c.assertionType,
                })),
              },
              results: {
                create: suite.results.map((r: EvaluationResultInput) => ({
                  version: r.version,
                  score: r.score,
                  passed: r.passed,
                  failed: r.failed,
                  regressions: r.regressions,
                })),
              },
            })) || [],
          },
        },
      });
      results.push({ slug: skill.slug, status: "imported" });
    }

    return NextResponse.json({ success: true, imported: results.filter(r => r.status === "imported").length, results });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
