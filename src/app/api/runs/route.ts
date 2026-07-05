import { NextResponse } from "next/server";
import { buildMockRun } from "@/lib/runner";
import { saveRun } from "@/lib/repository";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    skillSlug?: string;
    input?: string;
    deniedPermissions?: string[];
  };

  const run = buildMockRun(
    body.skillSlug ?? "agent-observer",
    body.input ?? "Run the skill with demo input.",
    body.deniedPermissions ?? [],
  );
  await saveRun(run);

  return NextResponse.json(run);
}
