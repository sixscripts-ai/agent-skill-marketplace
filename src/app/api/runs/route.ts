import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Use POST /api/runs/stream. Non-stream run creation has been removed.",
    },
    { status: 410 },
  );
}
