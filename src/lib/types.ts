export type PermissionKey =
  | "read_files"
  | "write_files"
  | "network"
  | "shell"
  | "browser"
  | "api_keys";

export type CompatibilityTarget =
  | "Codex"
  | "Claude"
  | "Antigravity"
  | "OpenCode"
  | "Grok"
  | "VS Code";

export type TraceEventType =
  | "permission"
  | "model"
  | "tool"
  | "warning"
  | "artifact"
  | "error";

export type SandboxProvider = "openai" | "gemini" | "groq" | "openrouter" | "local";

export type ExecutionMode = "real-shell" | "virtual-agent";

export type WorkspaceFile = {
  path: string;
  content: string;
  size: number;
  updatedAt: string;
};

export type SandboxArtifact = {
  path: string;
  before?: string;
  after: string;
  kind: "created" | "modified" | "report";
};

export type SandboxRunMetadata = {
  executionMode?: ExecutionMode;
  sandboxName?: string;
  sandboxStatus?: string;
  command?: string;
  exitCode?: number;
  networkPolicy?: string;
  stdoutBytes?: number;
  stderrBytes?: number;
  cpuMs?: number;
  networkIngressBytes?: number;
  networkEgressBytes?: number;
};

export type SkillPermission = {
  key: PermissionKey;
  reason: string;
  risk: "low" | "medium" | "high";
};

export type SkillVersion = {
  version: string;
  skillMd: string;
  readme: string;
  changelog: string;
  compatibilityTargets: CompatibilityTarget[];
  createdAt: string;
};

export type EvaluationResult = {
  version: string;
  score: number;
  passed: number;
  failed: number;
  regressions: number;
  createdAt: string;
};

export type EvaluationSuite = {
  name: string;
  cases: {
    input: string;
    expected: string;
    assertionType: string;
    status: "pass" | "fail";
  }[];
  results: EvaluationResult[];
};

export type InstallTarget = {
  platform: CompatibilityTarget;
  installCommand: string;
  configSnippet: string;
  packageFormat: string;
  notes: string;
};

export type Skill = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: string;
  trustLevel: "Verified" | "Reviewed" | "Experimental";
  author: string;
  ownerId?: string;
  visibility?: "public" | "private" | "unlisted";
  installCount: number;
  rating: number;
  currentVersion: string;
  permissions: SkillPermission[];
  versions: SkillVersion[];
  evalSuites: EvaluationSuite[];
  installTargets: InstallTarget[];
  reviews: { rating: number; comment: string; user: string }[];
  packages?: SkillPackage[];
};

export type SkillTraceEvent = {
  order: number;
  type: TraceEventType;
  title: string;
  detail: string;
  status: "approved" | "blocked" | "running" | "complete" | "warning" | "failed";
  metadata?: Record<string, string | number | boolean>;
};

export type SkillRun = {
  id: string;
  skillSlug: string;
  skillName: string;
  version: string;
  input: string;
  status: "pending" | "running" | "complete" | "failed";
  output: string;
  latencyMs: number;
  estimatedCost: number;
  provider?: SandboxProvider;
  model?: string;
  sandbox?: SandboxRunMetadata;
  replayOf?: string;
  workspaceFiles?: WorkspaceFile[];
  artifacts?: SandboxArtifact[];
  events: SkillTraceEvent[];
  createdAt: string;
};

export type MarketplaceUser = {
  id: string;
  clerkId?: string;
  name: string;
  email: string;
  role: "author" | "admin";
};

export type PackageExport = {
  id: string;
  skillSlug: string;
  version: string;
  target: string;
  userId: string;
  createdAt: string;
  filename: string;
};

export type SkillPackageFileRole = "skill_md" | "readme" | "script" | "asset" | "reference" | "config" | "doc" | "example" | "other";

export type SkillPackageFile = {
  path: string;
  blobUrl?: string;
  content?: string;
  mimeType: string;
  size: number;
  role: SkillPackageFileRole;
};

export type SkillPackage = {
  id: string;
  skillSlug?: string;
  version?: string;
  ownerId: string;
  uploadSource: "md" | "skill" | "zip" | "folder" | "paste";
  originalFilename: string;
  blobPrefix: string;
  manifest: Record<string, unknown>;
  fileCount: number;
  totalBytes: number;
  importStatus: "parsed" | "ready" | "failed";
  files: SkillPackageFile[];
  createdAt: string;
};

export type MarketplaceState = {
  users: MarketplaceUser[];
  skills: Skill[];
  runs: SkillRun[];
  packageExports: PackageExport[];
};

export type SkillDraftInput = {
  name: string;
  slug: string;
  category: string;
  summary: string;
  skillMd: string;
  permissions: PermissionKey[];
  compatibilityTargets: CompatibilityTarget[];
  visibility: "public" | "private" | "unlisted";
  packageUploadId?: string;
};

export type ParsedSkillImport = {
  name: string;
  description: string;
  slug: string;
  category: string;
  permissions: PermissionKey[];
  compatibilityTargets: CompatibilityTarget[];
  issues: string[];
  suggestions: string[];
  suggestedSkillMd: string;
  primarySkillMd?: string;
  packageUploadId?: string;
  packageFiles?: SkillPackageFile[];
};
