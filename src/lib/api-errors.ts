import { NextResponse } from "next/server";
import { AuthorizationError } from "./access-control";
import { AuthRequiredError } from "./auth";

export function securityErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return undefined;
}
