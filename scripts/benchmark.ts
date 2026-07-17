import { performance } from "perf_hooks";

function sanitizeSandboxPath(p: string) { return p; }
function executableMode(p: string) { return undefined; }
async function packageFileContent(content?: string, blobUrl?: string) {
  if (content) return content;
  // simulate network request
  await new Promise(r => setTimeout(r, 50));
  return new Uint8Array(0);
}

const packageFiles = Array(20).fill(0).map((_, i) => ({
  path: `/test-${i}.txt`,
  blobUrl: `http://example.com/${i}`
}));

async function oldWay() {
  const files = new Map<string, any>();
  for (const file of packageFiles) {
    const path = sanitizeSandboxPath(file.path);
    const content = await packageFileContent(undefined, file.blobUrl);
    if (content === undefined) continue;
    files.set(path, { path, content, mode: executableMode(path) });
  }
  return files;
}

async function newWay() {
  const files = new Map<string, any>();
  const resolved = await Promise.all(
    packageFiles.map(async (file) => {
      const path = sanitizeSandboxPath(file.path);
      const content = await packageFileContent(undefined, file.blobUrl);
      return { path, content };
    })
  );

  for (const { path, content } of resolved) {
    if (content === undefined) continue;
    files.set(path, { path, content, mode: executableMode(path) });
  }
  return files;
}

async function run() {
  const t0 = performance.now();
  await oldWay();
  const t1 = performance.now();

  const t2 = performance.now();
  await newWay();
  const t3 = performance.now();

  console.log(`Sequential baseline: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Concurrent optimization: ${(t3 - t2).toFixed(2)}ms`);
}
run();
