const { chromium, devices } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3005/marketplace');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/Users/villain/.gemini/antigravity-ide/brain/73c0af26-c1e2-47b4-8fa4-00a9da85bc0f/marketplace_desktop_local.png', fullPage: true });
  await context.close();

  const mobileContext = await browser.newContext({
    ...devices['Pixel 5'],
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3005/marketplace');
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: '/Users/villain/.gemini/antigravity-ide/brain/73c0af26-c1e2-47b4-8fa4-00a9da85bc0f/marketplace_mobile_local.png', fullPage: true });
  await mobileContext.close();

  await browser.close();
})();
