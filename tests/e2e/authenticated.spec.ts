import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, ".auth/user.json");
const hasAuth = fs.existsSync(authFile);

test.describe("Authenticated product flows", () => {
  if (hasAuth) {
    test.use({ storageState: authFile });
  }

  test.beforeEach(() => {
    test.skip(!hasAuth, "Run with E2E_USER_EMAIL/E2E_USER_PASSWORD to generate tests/e2e/.auth/user.json");
  });

  test("opens Eve builder", async ({ page }) => {
    await page.goto("/builder/eve");
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { name: /build a durable ai agent/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /eve builder journey/i })).toBeVisible();
  });

  test("opens projects list", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("opens new project studio", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByText(/build|intent|prove|ship/i).first()).toBeVisible();
  });

  test("opens live terminal", async ({ page }) => {
    await page.goto("/terminal");
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("opens settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("opens skill sandbox stage", async ({ page }) => {
    await page.goto("/skills/pr-sentinel?stage=sandbox");
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByText(/sandbox|run|virtual|trace/i).first()).toBeVisible();
  });
});
