import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
    // Use an explicit type or unknown to satisfy the linter
    const slugs = skills.map((s: { slug: string } | any) => s.slug);
    const existingSkills = await prisma.skill.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true }
    });
    const existingSlugs = new Set(existingSkills.map((s) => s.slug));

    const createOperations = [];

    for (const skill of skills) {
      if (existingSlugs.has(skill.slug)) {
        results.push({ slug: skill.slug, status: "skipped", reason: "Already exists" });
        continue;
      }

      createOperations.push(
        prisma.skill.create({
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
              create: skill.versions.map((v: any) => ({
                version: v.version,
                skillMd: v.skillMd,
                readme: v.readme,
                changelog: v.changelog,
                compatibilityTargets: JSON.stringify(v.compatibilityTargets),
              })),
            },
            permissions: {
              create: skill.permissions?.map((p: any) => ({
                key: p.key,
                reason: p.reason,
                risk: p.risk,
              })) || [],
            },
            installTargets: {
              create: skill.installTargets?.map((t: any) => ({
                platform: t.platform,
                installCommand: t.installCommand,
                configSnippet: t.configSnippet,
                packageFormat: t.packageFormat,
                notes: t.notes,
              })) || [],
            },
            evalSuites: {
              create: skill.evalSuites?.map((suite: any) => ({
                name: suite.name,
                cases: {
                  create: suite.cases.map((c: any) => ({
                    input: c.input,
                    expected: c.expected,
                    assertionType: c.assertionType,
                  })),
                },
                results: {
                  create: suite.results.map((r: any) => ({
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
        })
      );
      existingSlugs.add(skill.slug);
      results.push({ slug: skill.slug, status: "imported" });
    }

    if (createOperations.length > 0) {
      await prisma.$transaction(createOperations);
    }

    return NextResponse.json({ success: true, imported: createOperations.length, results });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
