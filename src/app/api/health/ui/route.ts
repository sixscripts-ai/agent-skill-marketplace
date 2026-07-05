import { NextResponse } from "next/server";
import { skills } from "@/lib/data";
import { isDatabaseConfigured } from "@/lib/deployment-config.js";
import { getSandboxReadiness } from "@/lib/sandbox-status";

export async function GET() {
  const readiness = getSandboxReadiness();
  return NextResponse.json({
    databaseConfigured: isDatabaseConfigured(),
    realShellEnabled: readiness.realShellEnabled,
    sandboxAuthStatus: readiness.sandboxAuthStatus,
    projectLinked: readiness.projectLinked,
    seedSkillCount: skills.length,
  });
}
