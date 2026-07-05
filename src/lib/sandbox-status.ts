export type SandboxReadiness = {
  realShellEnabled: boolean;
  sandboxAuthStatus: "vercel-oidc" | "explicit-credentials" | "missing";
  projectLinked: boolean;
  commandRequired: boolean;
  networkDefault: "deny-all";
};

export function getSandboxReadiness(env: NodeJS.ProcessEnv = process.env): SandboxReadiness {
  const hasExplicitCredentials = Boolean(env.VERCEL_TOKEN && env.VERCEL_TEAM_ID && env.VERCEL_PROJECT_ID);
  const hasVercelRuntimeIdentity = env.VERCEL === "1" || env.VERCEL === "true" || Boolean(env.VERCEL_ENV);

  return {
    realShellEnabled: env.ENABLE_REAL_SANDBOX === "true",
    sandboxAuthStatus: hasVercelRuntimeIdentity ? "vercel-oidc" : hasExplicitCredentials ? "explicit-credentials" : "missing",
    projectLinked: hasVercelRuntimeIdentity || Boolean(env.VERCEL_PROJECT_ID),
    commandRequired: true,
    networkDefault: "deny-all",
  };
}
