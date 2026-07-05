import { createZip } from "@/lib/zip";

export async function GET() {
  const cli = `#!/usr/bin/env node
const [, , command, slug = "agent-observer"] = process.argv;
const baseUrl = process.env.AGENT_SKILL_MARKETPLACE_URL || "http://localhost:3000";

async function main() {
  if (!command || command === "help") {
    console.log("agent-skill commands:");
    console.log("  install <slug>    Download a skill package zip");
    console.log("  run <slug>        Start a live browser-sandbox run");
    return;
  }
  if (command === "install") {
    const res = await fetch(baseUrl + "/api/packages/" + slug);
    if (!res.ok) throw new Error("Package download failed: " + res.status);
    const bytes = Buffer.from(await res.arrayBuffer());
    const file = slug + ".zip";
    await require("node:fs/promises").writeFile(file, bytes);
    console.log("Downloaded " + file);
    return;
  }
  if (command === "run") {
    const res = await fetch(baseUrl + "/api/runs/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillSlug: slug, input: "CLI sandbox run", provider: "local" })
    });
    const text = await res.text();
    console.log(text);
    return;
  }
  throw new Error("Unknown command: " + command);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
`;

  const readme = `# agent-skill CLI

Portable CLI for the Agent Skill Marketplace.

## Install

\`\`\`bash
chmod +x bin/agent-skill.mjs
./bin/agent-skill.mjs help
\`\`\`

## Commands

\`\`\`bash
AGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs install agent-observer
AGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs run agent-observer
\`\`\`
`;

  const zip = createZip([
    { path: "package.json", content: JSON.stringify({ name: "agent-skill-cli", version: "0.1.0", bin: { "agent-skill": "bin/agent-skill.mjs" }, type: "module" }, null, 2) },
    { path: "bin/agent-skill.mjs", content: cli },
    { path: "README.md", content: readme },
  ]);

  return new Response(zip, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="agent-skill-cli.zip"',
    },
  });
}
