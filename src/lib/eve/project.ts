export type AgentExecutionMode = "read-only" | "supervised" | "autonomous" | "custom";
export type AgentMemoryMode = "none" | "session" | "persistent" | "vector" | "database";
export type AgentDeploymentTarget = "local" | "vercel" | "docker" | "github-actions";
export type AgentPermissionDecision = "allow" | "ask" | "block";

export type AgentProjectFile = {
  path: string;
  content: string;
  generated?: boolean;
};

export type AgentEnvironmentVariable = {
  name: string;
  description: string;
 