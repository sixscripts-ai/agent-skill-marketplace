import assert from "node:assert/strict";
import test from "node:test";
import { detectRunnableCommands } from "../src/lib/run-state";

test("detectRunnableCommands handles invalid package.json silently and finds shell scripts", () => {
  const skill = {
    slug: "test-skill",
    name: "Test Skill",
    packages: [],
  };

  const workspaceFiles = [
    {
      path: "package.json",
      content: "{ invalid json ",
    },
    {
      path: "script.sh",
      content: "echo 'hello'",
    }
  ];

  const commands = detectRunnableCommands(skill as any, workspaceFiles as any);
  assert.deepEqual(commands, ["bash 'script.sh'"]);
});
