import { mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { seedUser, isAuthenticatedUser } from "./auth";
import { AuthorizationError, canReadOwnedRun, canWriteOwnedResource } from "./access-control";
import { getSkill, latestVersion, skills as seededSkills } from "./data";
import { assertDurableDatabaseConfigured, isDatabaseConfigured, isVercelDeployment } from "./deployment-config.js";
import { parseSkillMarkdown } from "./skill-import";
import { prisma } from "./prisma";
import type {
  CompatibilityTarget,
  MarketplaceState,
  MarketplaceUser,
  PackageExport,
  PermissionKey,
  Skill,
  SkillDraftInput,
  SkillPackage,
  SkillPackageFile,
  SkillRun,
  SkillTraceEvent,
} from "./types";

assertDurableDatabaseConfigured();

const dataDir = isVercelDeployment()
  ? path.join(os.tmpdir(), "agent-skill-marketplace")
  : path.join(process.cwd(), ".local-data");
const dataFile = path.join(dataDir, "marketplace.json");
const hasDatabase = isDatabaseConfigured();
let seedPromise: Promise<void> | null = null;

const initialState: MarketplaceState = {
  users: [seedUser],
  skills: seededSkills,
  runs: [],
  packageExports: [],
};

async function readState(): Promise<MarketplaceState> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as MarketplaceState;
    const parsedSkills = parsed.skills?.length ? parsed.skills : [];
    const parsedSkillSlugs = new Set(parsedSkills.map((skill) => skill.slug));
    return {
      users: parsed.users?.length ? parsed.users : [seedUser],
      skills: parsedSkills.length
        ? [...parsedSkills, ...seededSkills.filter((skill) => !parsedSkillSlugs.has(skill.slug))]
        : seededSkills,
      runs: parsed.runs ?? [],
      packageExports: parsed.packageExports ?? [],
    };
  } catch {
    await writeState(initialState);
    return structuredClone(initialState);
  }
}

async function writeState(state: MarketplaceState) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
}

async function ensureSeeded() {
  if (!hasDatabase) return;
  seedPromise ??= seedDatabase();
  await seedPromise;
}

async function seedDatabase() {
  await upsertUser(seedUser);
  for (const skill of seededSkills) {
    const author = await upsertUser({
      ...seedUser,
      id: skill.ownerId ?? seedUser.id,
      name: skill.author,
      email: seedUser.email,
    });
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      create: {
        id: skill.id,
        slug: skill.slug,
        name: skill.name,
        summary: skill.summary,
        category: skill.category,
        trustLevel: skill.trustLevel,
        installCount: skill.installCount,
        rating: skill.rating,
        ownerId: skill.ownerId ?? author.id,
        visibility: skill.visibility ?? "public",
        currentVersion: skill.currentVersion,
        author: { connect: { id: author.id } },
        permissions: {
          create: skill.permissions.map((permission) => ({
            key: permission.key,
            reason: permission.reason,
            risk: permission.risk,
          })),
        },
        versions: {
          create: skill.versions.map((version) => ({
            version: version.version,
            skillMd: version.skillMd,
            readme: version.readme,
            changelog: version.changelog,
            compatibilityTargets: version.compatibilityTargets,
            createdAt: new Date(`${version.createdAt}T00:00:00.000Z`),
          })),
        },
        installTargets: { create: skill.installTargets },
        evalSuites: {
          create: skill.evalSuites.map((suite) => ({
            name: suite.name,
            cases: { create: suite.cases },
            results: {
              create: suite.results.map((result) => ({
                ...result,
                createdAt: new Date(`${result.createdAt}T00:00:00.000Z`),
              })),
            },
          })),
        },
        reviews: {
          create: skill.reviews.map((review, index) => ({
            rating: review.rating,
            comment: review.comment,
            user: {
              connectOrCreate: {
                where: { email: `${skill.slug}-review-${index}@seed.local` },
                create: {
                  id: `${skill.slug}-review-${index}`,
                  name: review.user,
                  email: `${skill.slug}-review-${index}@seed.local`,
                  role: "author",
                },
              },
            },
          })),
        },
      },
      update: {},
    });
  }
}

async function upsertUser(user: MarketplaceUser) {
  return prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    update: {
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

const skillInclude = {
  author: true,
  permissions: true,
  versions: { orderBy: { createdAt: "desc" as const } },
  evalSuites: {
    include: {
      cases: true,
      results: { orderBy: { createdAt: "desc" as const } },
    },
  },
  installTargets: true,
  reviews: { include: { user: true } },
  packages: { include: { files: true }, orderBy: { createdAt: "desc" as const } },
};

function toSkill(row: any): Skill {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    category: row.category,
    trustLevel: row.trustLevel,
    author: row.author?.name ?? "Unknown author",
    ownerId: row.ownerId ?? undefined,
    visibility: row.visibility as Skill["visibility"],
    installCount: row.installCount,
    rating: row.rating,
    currentVersion: row.currentVersion,
    permissions: (row.permissions ?? []).map((permission: any) => ({
      key: permission.key,
      reason: permission.reason,
      risk: permission.risk,
    })),
    versions: (row.versions ?? []).map((version: any) => ({
      version: version.version,
      skillMd: version.skillMd,
      readme: version.readme,
      changelog: version.changelog,
      compatibilityTargets: version.compatibilityTargets,
      createdAt: dateOnly(version.createdAt),
    })),
    evalSuites: (row.evalSuites ?? []).map((suite: any) => ({
      name: suite.name,
      cases: (suite.cases ?? []).map((item: any) => ({
        input: item.input,
        expected: item.expected,
        assertionType: item.assertionType,
        status: item.status,
      })),
      results: (suite.results ?? []).map((item: any) => ({
        version: item.version,
        score: item.score,
        passed: item.passed,
        failed: item.failed,
        regressions: item.regressions,
        createdAt: dateOnly(item.createdAt),
      })),
    })),
    installTargets: (row.installTargets ?? []).map((target: any) => ({
      platform: target.platform,
      installCommand: target.installCommand,
      configSnippet: target.configSnippet,
      packageFormat: target.packageFormat,
      notes: target.notes,
    })),
    reviews: (row.reviews ?? []).map((review: any) => ({
      rating: review.rating,
      comment: review.comment,
      user: review.user?.name ?? "Reviewer",
    })),
    packages: (row.packages ?? []).map(toPackage),
  };
}

function toPackage(row: any): SkillPackage {
  return {
    id: row.id,
    skillSlug: row.skill?.slug,
    version: row.skillVersion?.version,
    ownerId: row.ownerId,
    uploadSource: row.uploadSource as SkillPackage["uploadSource"],
    originalFilename: row.originalFilename,
    blobPrefix: row.blobPrefix,
    manifest: row.manifest ?? {},
    fileCount: row.fileCount,
    totalBytes: row.totalBytes,
    importStatus: row.importStatus as SkillPackage["importStatus"],
    files: (row.files ?? []).map(toPackageFile),
    createdAt: row.createdAt.toISOString(),
  };
}

function toPackageFile(row: any): SkillPackageFile {
  return {
    path: row.path,
    blobUrl: row.blobUrl ?? undefined,
    content: row.content ?? undefined,
    mimeType: row.mimeType,
    size: row.size,
    role: row.role as SkillPackageFile["role"],
  };
}

function dateOnly(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export async function listVisibleSkills(user: MarketplaceUser = seedUser) {
  if (!hasDatabase) {
    const state = await readState();
    return state.skills.filter(
      (skill) => skill.visibility !== "private" || skill.ownerId === user.id || user.role === "admin",
    );
  }

  await ensureSeeded();
  if (isAuthenticatedUser(user)) await upsertUser(user);
  const rows = await prisma.skill.findMany({
    where: user.role === "admin" ? {} : { OR: [{ visibility: { not: "private" } }, { ownerId: user.id }] },
    include: skillInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toSkill);
}

export async function listMarketplaceSkills() {
  if (!hasDatabase) {
    const state = await readState();
    return state.skills.filter((skill) => (skill.visibility ?? "public") === "public");
  }

  await ensureSeeded();
  const rows = await prisma.skill.findMany({
    where: { visibility: "public" },
    include: skillInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toSkill);
}

export async function findSkill(slug: string, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) {
    const skills = await listVisibleSkills(user);
    return skills.find((skill) => skill.slug === slug || skill.id === slug);
  }

  await ensureSeeded();
  if (isAuthenticatedUser(user)) await upsertUser(user);
  const row = await prisma.skill.findFirst({
    where: {
      AND: [
        { OR: [{ slug }, { id: slug }] },
        user.role === "admin" ? {} : { OR: [{ visibility: { not: "private" } }, { ownerId: user.id }] },
      ],
    },
    include: skillInclude,
  });
  return row ? toSkill(row as any) : undefined;
}

export async function listRuns() {
  if (!hasDatabase) return (await readState()).runs;
  const rows = await prisma.skillRun.findMany({
    include: { skill: true, skillVersion: true, events: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toRun);
}

export async function findRun(runId: string, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) {
    const run = (await readState()).runs.find((item) => item.id === runId);
    return run && canReadOwnedRun(run.ownerId, user) ? run : undefined;
  }
  const row = await prisma.skillRun.findFirst({
    where: {
      id: runId,
      ...(user.role === "admin" ? {} : { ownerId: user.id }),
    },
    include: { skill: true, skillVersion: true, events: { orderBy: { order: "asc" } } },
  });
  return row ? toRun(row as any) : undefined;
}

export async function findLatestRunForSkill(skillSlug: string, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) {
    return (await readState()).runs.find((run) => run.skillSlug === skillSlug && canReadOwnedRun(run.ownerId, user));
  }
  const row = await prisma.skillRun.findFirst({
    where: {
      skill: { slug: skillSlug },
      ...(user.role === "admin" ? {} : { ownerId: user.id }),
    },
    include: { skill: true, skillVersion: true, events: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return row ? toRun(row as any) : undefined;
}

function toRun(row: any): SkillRun {
  return {
    id: row.id,
    ownerId: row.ownerId ?? undefined,
    skillSlug: row.skill.slug,
    skillName: row.skill.name,
    version: row.skillVersion.version,
    input: row.input,
    status: row.status,
    output: row.output,
    latencyMs: row.latencyMs,
    estimatedCost: row.estimatedCost,
    provider: row.provider,
    model: row.model,
    replayOf: row.replayOf ?? undefined,
    workspaceFiles: (row.workspaceFiles as SkillRun["workspaceFiles"]) ?? [],
    artifacts: (row.artifacts as SkillRun["artifacts"]) ?? [],
    events: row.events.map((event: any) => ({
      order: event.order,
      type: event.type,
      title: event.title,
      detail: event.detail,
      status: event.status,
      metadata: event.metadata ?? undefined,
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveRun(run: SkillRun, user: MarketplaceUser = seedUser) {
  const ownedRun = { ...run, ownerId: user.id };
  if (!hasDatabase) {
    const state = await readState();
    state.runs = [ownedRun, ...state.runs.filter((item) => item.id !== ownedRun.id)].slice(0, 200);
    await writeState(state);
    return ownedRun;
  }

  await ensureSeeded();
  const skill = await prisma.skill.findUnique({
    where: { slug: ownedRun.skillSlug },
    include: { versions: { where: { version: ownedRun.version }, take: 1 } },
  });
  if (!skill || !skill.versions[0]) return ownedRun;
  await prisma.skillRun.upsert({
    where: { id: ownedRun.id },
    create: {
      id: ownedRun.id,
      ownerId: ownedRun.ownerId,
      skillId: skill.id,
      skillVersionId: skill.versions[0].id,
      input: ownedRun.input,
      status: ownedRun.status,
      output: ownedRun.output,
      latencyMs: ownedRun.latencyMs,
      estimatedCost: ownedRun.estimatedCost,
      provider: ownedRun.provider ?? "virtual",
      model: ownedRun.model ?? "sandbox-model",
      replayOf: ownedRun.replayOf,
      workspaceFiles: ownedRun.workspaceFiles ?? [],
      artifacts: ownedRun.artifacts ?? [],
      events: { create: ownedRun.events.map((event) => eventToCreate(event)) },
      createdAt: new Date(ownedRun.createdAt),
    },
    update: {
      ownerId: ownedRun.ownerId,
      status: ownedRun.status,
      output: ownedRun.output,
      latencyMs: ownedRun.latencyMs,
      estimatedCost: ownedRun.estimatedCost,
      provider: ownedRun.provider ?? "virtual",
      model: ownedRun.model ?? "sandbox-model",
      replayOf: ownedRun.replayOf,
      workspaceFiles: ownedRun.workspaceFiles ?? [],
      artifacts: ownedRun.artifacts ?? [],
    },
  });
  return ownedRun;
}

export async function appendRunEvent(runId: string, event: SkillTraceEvent, output?: string, status?: SkillRun["status"]) {
  if (!hasDatabase) {
    const state = await readState();
    const run = state.runs.find((item) => item.id === runId);
    if (!run) return;
    run.events = [...run.events.filter((item) => item.order !== event.order), event].sort((a, b) => a.order - b.order);
    if (output !== undefined) run.output = output;
    if (status) run.status = status;
    run.latencyMs = Math.max(run.latencyMs, Date.now() - Date.parse(run.createdAt));
    await writeState(state);
    return;
  }

  const run = await prisma.skillRun.findUnique({ where: { id: runId } });
  if (!run) return;
  await prisma.skillTraceEvent.deleteMany({ where: { runId, order: event.order } });
  await prisma.skillTraceEvent.create({ data: { runId, ...eventToCreate(event) } });
  await prisma.skillRun.update({
    where: { id: runId },
    data: {
      ...(output !== undefined ? { output } : {}),
      ...(status ? { status } : {}),
      latencyMs: Math.max(run.latencyMs, Date.now() - run.createdAt.getTime()),
    },
  });
}

function eventToCreate(event: SkillTraceEvent) {
  return {
    order: event.order,
    type: event.type,
    title: event.title,
    detail: event.detail,
    status: event.status,
    metadata: event.metadata ?? {},
  };
}

export async function createOrUpdateSkill(input: SkillDraftInput, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) return createOrUpdateSkillFile(input, user);

  await ensureSeeded();
  const author = await upsertUser(user);
  const existing = await prisma.skill.findUnique({ where: { slug: input.slug } });
  if (existing && !canWriteOwnedResource(existing.ownerId, user)) {
    throw new AuthorizationError("Only the owner or an admin can update this skill.");
  }
  const version = existing ? bumpPatch(existing.currentVersion) : "v0.1.0";
  const installTargets = buildInstallTargets(input.slug, input.name, input.compatibilityTargets);
  const parsed = parseSkillMarkdown(input.skillMd);

  const skill = await prisma.$transaction(async (tx) => {
    const savedSkill = await tx.skill.upsert({
      where: { slug: input.slug },
      create: {
        slug: input.slug,
        name: input.name,
        summary: input.summary,
        category: input.category,
        trustLevel: "Experimental",
        ownerId: user.id,
        visibility: input.visibility,
        currentVersion: version,
        authorId: author.id,
      },
      update: {
        name: input.name,
        summary: input.summary,
        category: input.category,
        ownerId: existing?.ownerId ?? user.id,
        visibility: input.visibility,
        currentVersion: version,
        authorId: author.id,
      },
    });

    await tx.skillPermission.deleteMany({ where: { skillId: savedSkill.id } });
    await tx.installTarget.deleteMany({ where: { skillId: savedSkill.id } });
    await tx.skillPermission.createMany({
      data: input.permissions.map((permission) => ({
        skillId: savedSkill.id,
        key: permission,
        reason: permissionReason(permission),
        risk: permissionRisk(permission),
      })),
    });
    await tx.installTarget.createMany({
      data: installTargets.map((target) => ({ skillId: savedSkill.id, ...target })),
    });

    const skillVersion = await tx.skillVersion.create({
      data: {
        skillId: savedSkill.id,
        version,
        skillMd: input.skillMd,
        readme: `# ${input.name}\n\n${input.summary}\n\nImported from SKILL.md with ${parsed.issues.length ? `${parsed.issues.length} validation warning(s)` : "no validation warnings"}.`,
        changelog: existing ? "Published from builder as a new version." : "Initial builder publication.",
        compatibilityTargets: input.compatibilityTargets,
        permissions: {
          create: input.permissions.map((permission) => ({
            skillId: savedSkill.id,
            key: permission,
            reason: permissionReason(permission),
            risk: permissionRisk(permission),
          })),
        },
      },
    });

    if (input.packageUploadId) {
      await tx.skillPackage.update({
        where: { id: input.packageUploadId },
        data: { skillId: savedSkill.id, skillVersionId: skillVersion.id, importStatus: "ready" },
      });
    }

    if (!existing) {
      await tx.evaluationSuite.create({
        data: {
          skillId: savedSkill.id,
          name: "Draft Quality",
          cases: {
            create: {
              input: "Run the skill against a realistic uploaded package task.",
              expected: "Returns useful output with clear trace events.",
              assertionType: "usefulness",
              status: "pass",
            },
          },
        },
      });
    }

    return tx.skill.findUniqueOrThrow({ where: { id: savedSkill.id }, include: skillInclude });
  });

  return toSkill(skill as any);
}

async function createOrUpdateSkillFile(input: SkillDraftInput, user: MarketplaceUser = seedUser) {
  const state = await readState();
  const existing = state.skills.find((skill) => skill.slug === input.slug);
  if (existing && !canWriteOwnedResource(existing.ownerId, user)) {
    throw new AuthorizationError("Only the owner or an admin can update this skill.");
  }
  const version = existing ? bumpPatch(existing.currentVersion) : "v0.1.0";
  const installTargets = buildInstallTargets(input.slug, input.name, input.compatibilityTargets);
  const parsed = parseSkillMarkdown(input.skillMd);
  const nextSkill: Skill = {
    id: existing?.id ?? `skill-${input.slug}`,
    slug: input.slug,
    name: input.name,
    summary: input.summary,
    category: input.category,
    trustLevel: existing?.trustLevel ?? "Experimental",
    author: user.name,
    ownerId: user.id,
    visibility: input.visibility,
    installCount: existing?.installCount ?? 0,
    rating: existing?.rating ?? 0,
    currentVersion: version,
    permissions: input.permissions.map((permission) => ({
      key: permission,
      reason: permissionReason(permission),
      risk: permissionRisk(permission),
    })),
    versions: [
      {
        version,
        skillMd: input.skillMd,
        readme: `# ${input.name}\n\n${input.summary}\n\nImported from SKILL.md with ${parsed.issues.length ? `${parsed.issues.length} validation warning(s)` : "no validation warnings"}.`,
        changelog: existing ? "Published from builder as a new version." : "Initial builder publication.",
        compatibilityTargets: input.compatibilityTargets,
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...(existing?.versions ?? []),
    ],
    evalSuites: existing?.evalSuites ?? [
      {
        name: "Draft Quality",
        cases: [
          {
            input: "Run the skill against a realistic uploaded package task.",
            expected: "Returns useful output with clear trace events.",
            assertionType: "usefulness",
            status: "pass",
          },
        ],
        results: [],
      },
    ],
    installTargets,
    reviews: existing?.reviews ?? [],
  };

  state.skills = [nextSkill, ...state.skills.filter((skill) => skill.slug !== input.slug)];
  await writeState(state);
  return nextSkill;
}

export async function forkSkill(skillSlug: string, user: MarketplaceUser = seedUser) {
  const source = await findSkill(skillSlug, user);
  if (!source) throw new Error("Skill not found");
  const version = latestVersion(source);
  const existingSlugs = (await listVisibleSkills(user)).map((skill) => skill.slug);
  const forkSlug = uniqueSlug(existingSlugs, `${source.slug}-remix`);
  return createOrUpdateSkill(
    {
      name: `${source.name} Remix`,
      slug: forkSlug,
      summary: `Remix of ${source.name}. ${source.summary}`,
      category: source.category,
      skillMd: version.skillMd.replace(`# ${source.name}`, `# ${source.name} Remix`),
      permissions: source.permissions.map((permission) => permission.key),
      compatibilityTargets: version.compatibilityTargets,
      visibility: "unlisted",
    },
    user,
  );
}

export async function addEvalCase(skillSlug: string, suiteName: string, input: string, expected: string, assertionType: string, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) {
    const state = await readState();
    const skill = state.skills.find((item) => item.slug === skillSlug);
    if (!skill) throw new Error("Skill not found");
    if (!canWriteOwnedResource(skill.ownerId, user)) throw new AuthorizationError("Only the owner or an admin can edit evaluations.");
    let suite = skill.evalSuites.find((item) => item.name === suiteName);
    if (!suite) {
      suite = { name: suiteName, cases: [], results: [] };
      skill.evalSuites.push(suite);
    }
    suite.cases.push({ input, expected, assertionType, status: "pass" });
    await writeState(state);
    return suite;
  }

  const skill = await prisma.skill.findUnique({ where: { slug: skillSlug } });
  if (!skill) throw new Error("Skill not found");
  if (!canWriteOwnedResource(skill.ownerId, user)) throw new AuthorizationError("Only the owner or an admin can edit evaluations.");
  const suite = await prisma.evaluationSuite.upsert({
    where: { id: `${skill.id}:${suiteName}` },
    create: { id: `${skill.id}:${suiteName}`, skillId: skill.id, name: suiteName },
    update: {},
  });
  await prisma.evaluationCase.create({ data: { suiteId: suite.id, input, expected, assertionType, status: "pass" } });
  const updated = await prisma.evaluationSuite.findUniqueOrThrow({
    where: { id: suite.id },
    include: { cases: true, results: true },
  });
  return {
    name: updated.name,
    cases: updated.cases.map((item) => ({
      input: item.input,
      expected: item.expected,
      assertionType: item.assertionType,
      status: item.status as "pass" | "fail",
    })),
    results: updated.results.map((item) => ({
      version: item.version,
      score: item.score,
      passed: item.passed,
      failed: item.failed,
      regressions: item.regressions,
      createdAt: dateOnly(item.createdAt),
    })),
  };
}

export async function runEvalSuite(skillSlug: string, suiteName: string, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) {
    const state = await readState();
    const skill = state.skills.find((item) => item.slug === skillSlug);
    if (!skill) throw new Error("Skill not found");
    if (!canWriteOwnedResource(skill.ownerId, user)) throw new AuthorizationError("Only the owner or an admin can run evaluations.");
    const suite = skill.evalSuites.find((item) => item.name === suiteName) ?? skill.evalSuites[0];
    if (!suite) throw new Error("Suite not found");
    const failed = suite.cases.filter((item) => item.status === "fail").length;
    const passed = suite.cases.length - failed;
    const score = suite.cases.length ? Math.round((passed / suite.cases.length) * 100) : 0;
    const result = {
      version: skill.currentVersion,
      score,
      passed,
      failed,
      regressions: failed > 0 ? 1 : 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    suite.results = [result, ...suite.results].slice(0, 8);
    await writeState(state);
    return { suite, result };
  }

  const skill = await prisma.skill.findUnique({
    where: { slug: skillSlug },
    include: { evalSuites: { include: { cases: true, results: true } } },
  });
  if (!skill) throw new Error("Skill not found");
  if (!canWriteOwnedResource(skill.ownerId, user)) throw new AuthorizationError("Only the owner or an admin can run evaluations.");
  const suite = skill.evalSuites.find((item) => item.name === suiteName) ?? skill.evalSuites[0];
  if (!suite) throw new Error("Suite not found");
  const failed = suite.cases.filter((item) => item.status === "fail").length;
  const passed = suite.cases.length - failed;
  const score = suite.cases.length ? Math.round((passed / suite.cases.length) * 100) : 0;
  const result = await prisma.evaluationResult.create({
    data: {
      suiteId: suite.id,
      version: skill.currentVersion,
      score,
      passed,
      failed,
      regressions: failed > 0 ? 1 : 0,
    },
  });
  const mappedSuite = {
    name: suite.name,
    cases: suite.cases.map((item) => ({
      input: item.input,
      expected: item.expected,
      assertionType: item.assertionType,
      status: item.status as "pass" | "fail",
    })),
    results: [
      {
        version: result.version,
        score: result.score,
        passed: result.passed,
        failed: result.failed,
        regressions: result.regressions,
        createdAt: dateOnly(result.createdAt),
      },
      ...suite.results.map((item) => ({
        version: item.version,
        score: item.score,
        passed: item.passed,
        failed: item.failed,
        regressions: item.regressions,
        createdAt: dateOnly(item.createdAt),
      })),
    ],
  };
  return { suite: mappedSuite, result: mappedSuite.results[0] };
}

export async function savePackageExport(skill: Skill, target: string, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) {
    const state = await readState();
    const version = latestVersion(skill);
    const record: PackageExport = {
      id: `export-${skill.slug}-${Date.now()}`,
      skillSlug: skill.slug,
      version: version.version,
      target,
      userId: user.id,
      createdAt: new Date().toISOString(),
      filename: `${skill.slug}-${version.version}.zip`,
    };
    state.packageExports = [record, ...state.packageExports].slice(0, 100);
    await writeState(state);
    return record;
  }

  await ensureSeeded();
  await upsertUser(user);
  const version = latestVersion(skill);
  const row = await prisma.packageExport.create({
    data: {
      skillId: skill.id,
      version: version.version,
      target,
      userId: user.id,
      filename: `${skill.slug}-${version.version}.zip`,
    },
  });
  return {
    id: row.id,
    skillSlug: skill.slug,
    version: row.version,
    target: row.target,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    filename: row.filename,
  };
}

export async function createSkillPackage(input: {
  owner: MarketplaceUser;
  uploadSource: SkillPackage["uploadSource"];
  originalFilename: string;
  blobPrefix: string;
  manifest: Record<string, unknown>;
  files: SkillPackageFile[];
}) {
  if (!hasDatabase) {
    const id = `upload-${Date.now()}`;
    return {
      id,
      ownerId: input.owner.id,
      uploadSource: input.uploadSource,
      originalFilename: input.originalFilename,
      blobPrefix: input.blobPrefix,
      manifest: JSON.parse(JSON.stringify(input.manifest)),
      fileCount: input.files.length,
      totalBytes: input.files.reduce((sum, file) => sum + file.size, 0),
      importStatus: "parsed" as const,
      files: input.files,
      createdAt: new Date().toISOString(),
    };
  }

  await upsertUser(input.owner);
  const row = await prisma.skillPackage.create({
    data: {
      ownerId: input.owner.id,
      uploadSource: input.uploadSource,
      originalFilename: input.originalFilename,
      blobPrefix: input.blobPrefix,
      manifest: JSON.parse(JSON.stringify(input.manifest)),
      fileCount: input.files.length,
      totalBytes: input.files.reduce((sum, file) => sum + file.size, 0),
      importStatus: "parsed",
      files: {
        create: input.files.map((file) => ({
          path: file.path,
          blobUrl: file.blobUrl,
          content: file.content,
          mimeType: file.mimeType,
          size: file.size,
          role: file.role,
        })),
      },
    },
    include: { files: true },
  });
  return toPackage(row);
}

export async function findSkillPackage(packageId: string, user: MarketplaceUser = seedUser) {
  if (!hasDatabase) return undefined;
  const row = await prisma.skillPackage.findFirst({
    where: user.role === "admin" ? { id: packageId } : { id: packageId, ownerId: user.id },
    include: { files: true, skill: true, skillVersion: true },
  });
  return row ? toPackage(row) : undefined;
}

function bumpPatch(version: string) {
  const match = version.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return "v0.1.0";
  return `v${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function uniqueSlug(existing: string[], base: string) {
  let candidate = base;
  let index = 2;
  while (existing.includes(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function buildInstallTargets(slug: string, name: string, targets: CompatibilityTarget[]) {
  return targets.map((platform) => ({
    platform,
    installCommand:
      platform === "Codex"
        ? `mkdir -p ~/.codex/skills/${slug} && cp SKILL.md ~/.codex/skills/${slug}/SKILL.md`
        : platform === "Claude"
          ? `cp ${slug}.md .claude/skills/${slug}/SKILL.md`
          : platform === "VS Code"
            ? `cp ${slug}.skill.json .vscode/agent-skills/${slug}.json`
            : `${platform.toLowerCase().replaceAll(" ", "-")} skills install ${slug}`,
    configSnippet: JSON.stringify({ name, slug, entry: "SKILL.md", compatibility: platform }, null, 2),
    packageFormat: platform === "VS Code" ? ".vscode skill manifest" : "SKILL.md package",
    notes: `${platform} export includes instructions, examples, permissions, and version metadata.`,
  }));
}

function permissionRisk(permission: PermissionKey) {
  return permission === "shell" || permission === "api_keys"
    ? "high"
    : permission === "network" || permission === "write_files"
      ? "medium"
      : "low";
}

function permissionReason(permission: PermissionKey) {
  const reasons: Record<PermissionKey, string> = {
    read_files: "Read uploaded sandbox files and skill package context.",
    write_files: "Create artifacts during sandbox execution.",
    network: "Use allowlisted network access.",
    shell: "Execute approved commands inside an isolated sandbox.",
    browser: "Inspect browser/source context.",
    api_keys: "Access redacted provider metadata only.",
  };
  return reasons[permission];
}
