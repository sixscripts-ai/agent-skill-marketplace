import { test, expect } from "@playwright/test";

test.describe("Anonymous Visitor Flow", () => {
  test("should be able to view the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Agent Skill Marketplace")).toBeVisible();
    await expect(page.locator("text=Find ready to use skills for Codex")).toBeVisible();
  });

  test("should be able to browse the marketplace", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.locator("text=Explore Skills")).toBeVisible();
    // Assuming there are skills, a skill card should be visible
    const skillCards = page.locator('[data-testid="skill-card"]');
    await expect(skillCards.first()).toBeVisible();
  });

  test("should be redirected to login when accessing builder", async ({ page }) => {
    await page.goto("/builder");
    // Clerk's sign in page should load or redirect
    await expect(page.url()).toContain("sign-in");
  });
});
