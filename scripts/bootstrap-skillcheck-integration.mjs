#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_SHA256 = "c0bbeb99d2ae27cc7acf47c63b1db87b198ed59b5d7171ba59247f7838e27046";
const root = resolve(import.meta.dirname, "..");
const integrationDir = join(root, ".integration");
const releaseGate = join(root, "src", "lib", "skillcheck", "release-gate.ts");

if (existsSync(releaseGate)) {
  console.log("SkillCheck Studio source is already present.");
  process.exit(0);
}

if (!existsSync(integrationDir)) {
  throw new Error("SkillCheck integration bundle is missing.");
}

const chunks = readdirSync(integrationDir)
  .filter((name) => /^skillcheck\.chunk-\d+$/.test(name))
  .sort();

if (!chunks.length) {
  throw new Error("No SkillCheck integration chunks were found.");
}

const encoded = chunks
  .map((name) => readFileSync(join(integrationDir, name), "utf8").trim())
  .join("");
const archive = Buffer.from(encoded, "base64");
const digest = createHash("sha256").update(archive).digest("hex");

if (digest !== EXPECTED_SHA256) {
  throw new Error(`SkillCheck integration checksum mismatch: expected ${EXPECTED_SHA256}, received ${digest}.`);
}

const archivePath = join(tmpdir(), `asm-skillcheck-${process.pid}.tar.gz`);
writeFileSync(archivePath, archive);
const extraction = spawnSync("tar", ["-xzf", archivePath, "-C", root], {
  cwd: root,
  stdio: "inherit",
});
rmSync(archivePath, { force: true });

if (extraction.status !== 0) {
  throw new Error(`SkillCheck integration extraction failed with exit code ${extraction.status ?? "unknown"}.`);
}
if (!existsSync(releaseGate)) {
  throw new Error("SkillCheck integration extracted without the expected release-gate source.");
}

console.log(`SkillCheck Studio source verified and applied (${digest}).`);
