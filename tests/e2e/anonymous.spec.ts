import { test, expect } from "@playwright/test";

test.describe("Anonymous Visitor Flow", () => {
  test("should be able to view the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /portable skills/i })).toBeVisible();
    await expect(page.getByText("Discover, evaluate, run, and install AI skills")).toBeVisible();
  });

  test("should be able to browse the marketplace", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { level: 1, name: /Agent Skill/i })).toBeVisible();
    await expect(page.getByTestId("marketplace-search")).toBeVisible();
    // Assuming there are skills, a skill card should be visible
    const skillCards = page.locator('[data-testid="skill-card"]');
    await expect(skillCards.first()).toBeVisible();
  });

  test("should be redirected to Clerk sign-in when accessing builder", async ({ page }) => {
    await page.goto("/builder");
    await page.waitForURL(/sign-in/);
  });

  test("should be redirected to Clerk sign-in when accessing projects", async ({ page }) => {
    await page.goto("/projects/new");
    await page.waitForURL(/sign-in/);
  });
});
