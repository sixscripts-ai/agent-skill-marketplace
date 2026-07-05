import { NextResponse } from "next/server";
import { addEvalCase, runEvalSuite } from "@/lib/repository";

export async function POST(request: Request, { params }: { params: Promise<{ skillSlug: string }> }) {
  const { skillSlug } = await params;
  const body = (await request.json()) as {
    action?: "add-case" | "run-suite";
    suiteName?: string;
    input?: string;
    expected?: string;
    assertionType?: string;
  };

  if (body.action === "add-case") {
    const suite = await addEvalCase(
      skillSlug,
      body.suiteName ?? "Draft Quality",
      body.input ?? "Run the skill.",
      body.expected ?? "Returns useful output.",
      body.assertionType ?? "usefulness",
    );
    return NextResponse.json({ suite });
  }

  const result = await runEvalSuite(skillSlug, body.suiteName ?? "Draft Quality");
  return NextResponse.json(result);
}
