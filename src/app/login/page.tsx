"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await login(formData);
    },
    null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-8 ">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Admin Login</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in to manage the marketplace.</p>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Username</span>
            <input
              name="username"
              type="text"
              required
              placeholder="Enter username"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Password</span>
            <input
              name="password"
              type="password"
              required
              placeholder="Enter password"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>

          {state?.error && (
            <p className="text-sm text-destructive font-medium">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:brightness-110 disabled:opacity-70"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
