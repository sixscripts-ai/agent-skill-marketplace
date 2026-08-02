import { test, expect } from "@playwright/test";

test.describe("Anonymous Visitor Flow", () => {
  test("should be able to view the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/portable skills/i);
    await expect(page.getByText(/Discover, evaluate, run, and install AI skills/i)).toBeVisible();
  });

  test("landing dynamic assets resolve under /landing-cyan/assets", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator("#logoTiles img").first();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", /\/landing-cyan\/assets\//);
  });

  test("should be able to browse the marketplace", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { level: 1, name: /Agent Skill/i })).toBeVisible();
    await expect(page.getByTestId("marketplace-search")).toBeVisible();
    const skillCards = page.locator('[data-testid="skill-card"]');
    await expect(skillCards.first()).toBeVisible();
  });

  test("should be redirected to Clerk sign-in when accessing builder", async ({ page }) => {
    await page.goto("/builder");
    await page.waitForURL(/sign-in/);
  });

  test("should be redirected to Clerk sign-in when accessing Eve", async ({ page }) => {
    await page.goto("/builder/eve");
    await page.waitForURL(/sign-in/);
  });

  test("should be redirected to Clerk sign-in when accessing projects", async ({ page }) => {
    await page.goto("/projects/new");
    await page.waitForURL(/sign-in/);
  });

  test("should be redirected to Clerk sign-in when accessing terminal", async ({ page }) => {
    await page.goto("/terminal");
    await page.waitForURL(/sign-in/);
  });

  test("should be redirected to Clerk sign-in when accessing settings", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/sign-in/);
  });
});
