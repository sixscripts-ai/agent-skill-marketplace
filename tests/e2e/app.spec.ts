import { expect, test } from "@playwright/test";

const routes = [
  "/marketplace",
  "/skills",
  "/skills/agent-observer",
  "/skills/agent-observer/run",
  "/skills/agent-observer/evals",
  "/builder",
  "/ai-elements",
  "/docs",
  "/api-docs",
  "/install/agent-observer",
  "/cli",
];

test.describe("route smoke", () => {
  for (const route of routes) {
    test(`${route} renders without app error`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception");
      await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
    });
  }
});

test("marketplace search, empty state, and navigation hooks work", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByText("What am I supposed to do?")).toBeVisible();
  await expect(page.getByTestId("skill-card").first()).toBeVisible();

  await page.getByTestId("marketplace-search").fill("research");
  await expect(page.getByTestId("skill-card").first()).toBeVisible();

  await page.getByTestId("marketplace-search").fill("zzzz-no-such-skill");
  await expect(page.getByText("No skills match those filters.")).toBeVisible();

  await page.getByTestId("marketplace-search").fill("");
  await page.getByTestId("marketplace-category").selectOption("Research");
  await expect(page.getByTestId("skill-card").first()).toBeVisible();
});

test("global topbar search opens filtered marketplace", async ({ page, isMobile }) => {
  test.skip(isMobile, "topbar search is hidden behind the compact mobile navigation");
  await page.goto("/marketplace");
  await page.getByLabel("Global search").fill("research");
  await page.getByRole("button", { name: "enter" }).click();
  await expect(page).toHaveURL(/\/marketplace\?search=research/);
  await expect(page.getByTestId("marketplace-search")).toHaveValue("research");
});

test("sandbox explains the flow and exposes primary controls", async ({ page }) => {
  await page.goto("/skills/agent-observer/run");
  await expect(page.getByText("What am I supposed to do?")).toBeVisible();
  await expect(page.getByText("Safe test prompt:")).toBeVisible();
  await expect(page.getByTestId("run-prompt")).toBeVisible();
  await expect(page.getByText("Sandbox readiness")).toBeVisible();

  await page.getByTestId("run-prompt").fill("Inspect the workspace files and summarize risks.");
  await expect(page.getByTestId("run-submit")).toBeEnabled();

  await page.getByTestId("execution-mode").selectOption("real-shell");
  await expect(page.getByTestId("run-command")).toBeVisible();

  await page.getByTestId("permission-deny-read_files").click();
  await expect(page.getByText("permissions restricted")).toBeVisible();
});

test("builder parses malformed skill text and exposes publish workflow", async ({ page }) => {
  await page.goto("/builder");
  await expect(page.getByText("What am I supposed to do?")).toBeVisible();
  await expect(page.getByTestId("builder-file-upload")).toBeVisible();
  await expect(page.getByTestId("builder-parse")).toBeVisible();
  await expect(page.getByTestId("builder-publish")).toBeVisible();

  await page.getByTestId("builder-skill-md").fill("# Broken Skill\n\nNo frontmatter yet.");
  await page.getByTestId("builder-parse").click();
  await expect(page.getByText("Suggested edits")).toBeVisible();
  await expect(page.getByTestId("builder-apply-suggestions")).toBeVisible();
});

test("evals page names the workflow as saved tests", async ({ page }) => {
  await page.goto("/skills/agent-observer/evals");
  await expect(page.getByText("Create a saved test")).toBeVisible();
  await expect(page.getByTestId("eval-save-case")).toBeVisible();
  await expect(page.getByTestId("eval-run-suite").first()).toBeVisible();
});

test("missing trace explains how to create one", async ({ page }) => {
  const response = await page.goto("/traces/not-a-real-run");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Run a skill to create a trace")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Sandbox" })).toBeVisible();
});

test("ui health endpoint returns non-secret readiness fields", async ({ request }) => {
  const response = await request.get("/api/health/ui");
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json).toEqual(
    expect.objectContaining({
      databaseConfigured: expect.any(Boolean),
      realShellEnabled: expect.any(Boolean),
      sandboxAuthStatus: expect.any(String),
      projectLinked: expect.any(Boolean),
      seedSkillCount: expect.any(Number),
    }),
  );
  expect(JSON.stringify(json)).not.toMatch(/sk_|pk_|DATABASE_URL|SECRET|TOKEN/i);
});
