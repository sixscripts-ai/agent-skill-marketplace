import { execFileSync } from "node:child_process";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const forbiddenPatterns = [
  { label: "environment files", pattern: /(^|\/)\.env(?:\..+)?$/ },
  { label: "Cursor workspace data", pattern: /(^|\/)\.cursor\// },
  { label: "temporary work files", pattern: /(^|\/)tmp\// },
  { label: "Playwright output", pattern: /(^|\/)(?:playwright-report|test-results)\// },
  { label: "Playwright authentication state", pattern: /(^|\/)playwright\/.+\.json$/ },
  { label: "private keys", pattern: /\.(?:pem|key|p12|pfx)$/i },
];

const allowedFiles = new Set([".env.example"]);
const violations = [];

for (const file of trackedFiles) {
  if (allowedFiles.has(file)) continue;

  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(file)) {
      violations.push(`${file} (${rule.label})`);
      break;
    }
  }
}

if (violations.length > 0) {
  console.error("Repository hygiene check failed. Remove these tracked files:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Repository hygiene check passed for ${trackedFiles.length} tracked files.`);
