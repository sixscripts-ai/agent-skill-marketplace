import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    setup.skip(true, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to enable authenticated e2e");
    return;
  }

  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(email);
  const continueButton = page.getByRole("button", { name: /continue/i });
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /continue|sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 45_000 });
  await expect(page).not.toHaveURL(/sign-in/);
  await page.context().storageState({ path: authFile });
});
