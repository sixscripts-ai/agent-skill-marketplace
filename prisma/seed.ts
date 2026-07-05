import { PrismaClient } from "@prisma/client";
import { skills } from "../src/lib/data";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed user
  const user = await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@admin.com",
      role: "admin",
      clerkId: "admin",
    },
  });

  console.log("Created admin user:", user.id);

  // Seed skills from data.ts
  let allSkills = [...skills];

  // Also include antigravity skills if present
  try {
    const customSkillsPath = path.join(__dirname, "antigravity-skills.json");
    if (fs.existsSync(customSkillsPath)) {
      const customSkills = JSON.parse(fs.readFileSync(customSkillsPath, "utf-8"));
      allSkills = [...allSkills, ...customSkills];
      console.log(`Loaded ${customSkills.length} additional skills from antigravity-skills.json`);
    }
  } catch (e) {
    console.warn("Failed to load antigravity-skills.json", e);
  }

  for (const skill of allSkills) {
    const existing = await prisma.skill.findUnique({
      where: { slug: skill.slug },
    });

    if (existing) {
      console.log(`Skipping ${skill.slug}, already exists.`);
      continue;
    }

    const createdSkill = await prisma.skill.create({
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
        author: {
          connect: { id: user.id },
        },
        versions: {
          create: skill.versions.map((v) => ({
            version: v.version,
            skillMd: v.skillMd,
            readme: v.readme,
            changelog: v.changelog,
            compatibilityTargets: JSON.stringify(v.compatibilityTargets),

          })),
        },
        permissions: {
          create: skill.permissions.map((p) => ({
            key: p.key,
            reason: p.reason,
            risk: p.risk,
          })),
        },
        installTargets: {
          create: skill.installTargets.map((t) => ({
            platform: t.platform,
            installCommand: t.installCommand,
            configSnippet: t.configSnippet,
            packageFormat: t.packageFormat,
            notes: t.notes,
          })),
        },
        evalSuites: {
          create: skill.evalSuites.map((suite) => ({
            name: suite.name,
            cases: {
              create: suite.cases.map((c) => ({
                input: c.input,
                expected: c.expected,
                assertionType: c.assertionType,
              })),
            },
            results: {
              create: suite.results.map((r) => ({
                version: r.version,
                score: r.score,
                passed: r.passed,
                failed: r.failed,
                regressions: r.regressions,
              })),
            },
          })),
        },
      },
    });

    console.log(`Created skill: ${createdSkill.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
