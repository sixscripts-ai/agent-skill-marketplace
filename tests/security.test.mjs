import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canReadOwnedRun, canWriteOwnedResource } from "../src/lib/access-control.ts";
import { fallbackUserForAuthState } from "../src/lib/auth.ts";
import {
  allowLocalDemoAuth,
  assertBlobStorageConfigured,
  assertDurableDatabaseConfigured,
  requiresDurableStorage,
} from "../src/lib/deployment-config.js";
import {
  isSafeCommandPath,
  normalizeNetworkAllowlist,
  quoteShellArg,
  sanitizeSandboxPath,
} from "../src/lib/sandbox-security.ts";

const owner = { id: "user-a", name: "A", email: "a@example.com", role: "author" };
const other = { id: "user-b", name: "B", email: "b@example.com", role: "author" };
const admin = { id: "admin", name: "Admin", email: "admin@example.com", role: "admin" };

test("configured Clerk auth does not fall back to demo admin", () => {
  const fallback = fallbackUserForAuthState(true);
  assert.equal(fallback.id, "anonymous-user");
  assert.notEqual(fallback.role, "admin");
});

test("Vercel deployments do not fall back to demo admin auth", () => {
  const env = { VERCEL: "1", NODE_ENV: "production" };
  const fallback = fallbackUserForAuthState(false, env);
  assert.equal(fallback.id, "anonymous-user");
  assert.equal(allowLocalDemoAuth(env), false);
});

test("Vercel production requires durable database and blob configuration", () => {
  const missing = { VERCEL: "1", NODE_ENV: "production" };
  const configured = {
    VERCEL: "1",
    NODE_ENV: "production",
    DATABASE_URL: "postgres://user:pass@example.com/db",
    BLOB_READ_WRITE_TOKEN: "blob-token",
  };

  assert.equal(requiresDurableStorage(missing), true);
  assert.throws(() => assertDurableDatabaseConfigured(missing), /DATABASE_URL is required/);
  assert.throws(() => assertBlobStorageConfigured(missing), /BLOB_READ_WRITE_TOKEN is required/);
  assert.doesNotThrow(() => assertDurableDatabaseConfigured(configured));
  assert.doesNotThrow(() => assertBlobStorageConfigured(configured));
});

test("run ownership blocks cross-user reads and ownerless legacy reads", () => {
  assert.equal(canReadOwnedRun(owner.id, owner), true);
  assert.equal(canReadOwnedRun(owner.id, other), false);
  assert.equal(canReadOwnedRun(undefined, other), false);
  assert.equal(canReadOwnedRun(undefined, admin), true);
});

test("write ownership allows owners and admins only", () => {
  assert.equal(canWriteOwnedResource(owner.id, owner), true);
  assert.equal(canWriteOwnedResource(owner.id, admin), true);
  assert.equal(canWriteOwnedResource(owner.id, other), false);
});

test("network allowlist accepts public hostnames and rejects SSRF-style targets", () => {
  assert.deepEqual(normalizeNetworkAllowlist(["Registry.NPMJS.org.", "github.com"]), ["registry.npmjs.org", "github.com"]);
  assert.throws(() => normalizeNetworkAllowlist(["http://example.com"]), /Unsafe network allowlist/);
  assert.throws(() => normalizeNetworkAllowlist(["localhost"]), /Unsafe network allowlist/);
  assert.throws(() => normalizeNetworkAllowlist(["169.254.169.254"]), /Unsafe network allowlist/);
  assert.throws(() => normalizeNetworkAllowlist(["192.168.1.10"]), /Unsafe network allowlist/);
  assert.throws(() => normalizeNetworkAllowlist(["*.example.com"]), /Unsafe network allowlist/);
});

test("sandbox paths reject traversal and shell metacharacters", () => {
  assert.equal(sanitizeSandboxPath("scripts/build.sh"), "scripts/build.sh");
  assert.equal(isSafeCommandPath("scripts/with space.sh"), true);
  assert.equal(quoteShellArg("scripts/with space.sh"), "'scripts/with space.sh'");
  assert.throws(() => sanitizeSandboxPath("../secret"), /Unsafe sandbox path/);
  assert.throws(() => sanitizeSandboxPath("scripts/build;rm.sh"), /Unsafe sandbox path/);
  assert.equal(isSafeCommandPath("scripts/$(touch owned).sh"), false);
});

test("sandbox markdown rendering uses the safe wrapper policy", async () => {
  const source = await readFile(new URL("../src/components/safe-message-response.tsx", import.meta.url), "utf8");
  assert.match(source, /disallowedElements=\{\["img"\]\}/);
  assert.match(source, /urlTransform=/);
  assert.equal(source.includes('"https://"'), true);
});
