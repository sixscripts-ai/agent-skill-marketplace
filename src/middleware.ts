import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/auth";
import { allowLocalSeedAuth } from "@/lib/deployment-config.js";

const isProtectedRoute = createRouteMatcher([
  "/builder(.*)",
  "/install(.*)",
  "/traces(.*)",
  "/skills/(.*)/run",
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // Clerk keys present: use normal clerkMiddleware behavior.
  if (isClerkConfigured()) {
    return clerkHandler(req, event);
  }

  // Local development (not Vercel) with missing keys: allow the explicit
  // local seed-auth fallback to serve the app.
  if (allowLocalSeedAuth()) {
    return NextResponse.next();
  }

  // Vercel preview/production with missing Clerk configuration: fail closed.
  // Never silently allow unauthenticated production access.
  return NextResponse.json(
    { error: "Authentication is not configured.", code: "AUTH_NOT_CONFIGURED" },
    { status: 503 },
  );
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
