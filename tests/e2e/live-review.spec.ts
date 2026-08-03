import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type RouteResult = {
  route: string;
  status: number | null;
  finalUrl: string;
  title: string;
  headings: string[];
  buttons: string[];
  bodySnippet: string;
  horizontalOverflow: boolean;
  consoleErrors: string[];
  pageErrors: string[];
  screenshot: string;
};

type InteractionResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const routes = [
  "/marketplace",
  "/skills",
  "/skills/agent-observer",
  "/builder",
  "/builder/eve",
  "/ai-elements",
  "/skills/agent-observer/run",
  "/skills/agent-observer/evals",
  "/skills/agent-observer/graph",
  "/install/agent-observer",
  "/docs",
  "/cli",
  "/api-docs",
];

function safeName(route: string) {
  return route.replace(/^\//, "").replaceAll("/", "-") || "home";
}

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill(process.env.AUDIT_USERNAME ?? "Admin");
  await page.getByLabel("Password").fill(process.env.AUDIT_PASSWORD ?? "Admin");
  await Promise.all([
    page.waitForURL(/\/marketplace/, { timeout: 20_000 }),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
}

async function recordRoute(page: Page, route: string, testInfo: TestInfo): Promise<RouteResult> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 600));
  };
  const onPageError = (error: Error) => pageErrors.push(error.message.slice(0, 600));
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1_500);
  const screenshotDir = path.join("audit", "screenshots", testInfo.project.name);
  await mkdir(screenshotDir, { recursive: true });
  const screenshot = path.join(screenshotDir, `${safeName(route)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const result: RouteResult = {
    route,
    status: response?.status() ?? null,
    finalUrl: page.url(),
    title: await page.title(),
    headings: (await page.locator("h1, h2").allTextContents()).map((value) => value.trim()).filter(Boolean).slice(0, 12),
    buttons: (await page.getByRole("button").allTextContents()).map((value) => value.trim()).filter(Boolean).slice(0, 30),
    bodySnippet: ((await page.locator("body").innerText()).replace(/\s+/g, " ").trim()).slice(0, 1_200),
    horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2),
    consoleErrors: [...new Set(consoleErrors)],
    pageErrors: [...new Set(pageErrors)],
    screenshot,
  };

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  return result;
}

async function tryInteraction(name: string, action: () => Promise<string>): Promise<InteractionResult> {
  try {
    return { name, passed: true, detail: await action() };
  } catch (error) {
    return { name, passed: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

test("authenticated live product audit", async ({ page }, testInfo) => {
  test.setTimeout(10 * 60_000);
  await login(page);

  const routeResults: RouteResult[] = [];
  for (const route of routes) routeResults.push(await recordRoute(page, route, testInfo));

  const interactions: InteractionResult[] = [];

  interactions.push(await tryInteraction("marketplace search", async () => {
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    const search = page.getByLabel("Global search");
    if (!(await search.isVisible().catch(() => false))) return "Global search is hidden at this viewport.";
    await search.fill("security");
    await search.press("Enter");
    await page.waitForTimeout(1_000);
    return `Navigated to ${page.url()}`;
  }));

  interactions.push(await tryInteraction("skill builder metadata and parser", async () => {
    await page.goto("/builder", { waitUntil: "domcontentloaded" });
    await page.getByTestId("builder-name").fill("Audit Reliability Skill");
    await page.getByTestId("builder-slug").fill("audit-reliability-skill");
    await page.getByTestId("builder-summary").fill("Audits an AI workflow for permission, reliability, and regression risks before release.");
    await page.getByTestId("builder-parse").click();
    await page.waitForTimeout(1_200);
    const publishDisabled = await page.getByTestId("builder-publish").isDisabled();
    return `Parser completed; publish disabled=${publishDisabled}.`;
  }));

  interactions.push(await tryInteraction("skill builder copilot", async () => {
    await page.goto("/builder", { waitUntil: "domcontentloaded" });
    const markdown = page.locator("#builder-skill-md");
    const before = await markdown.inputValue();
    const prompt = page.getByPlaceholder(/Add a workflow step/i);
    await prompt.fill("Add a concise Safety section that requires human confirmation before shell commands.");
    await prompt.press("Enter");
    await page.waitForTimeout(20_000);
    const after = await markdown.inputValue();
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return `Markdown changed=${before !== after}; visible response excerpt=${body.slice(-500)}`;
  }));

  interactions.push(await tryInteraction("skill builder canvas toggle", async () => {
    await page.goto("/builder", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Canvas" }).click();
    await page.waitForTimeout(1_000);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    await page.getByRole("button", { name: "Markdown" }).click();
    return `Canvas rendered=${text.includes("AI Elements Canvas")}.`;
  }));

  interactions.push(await tryInteraction("EVE configuration and export", async () => {
    await page.goto("/builder/eve", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Agent Name").fill("audit-eve-agent");
    await page.getByLabel("Base Model").selectOption("google/gemini-2.5-flash");
    const checkboxes = page.getByRole("checkbox");
    if (await checkboxes.count()) await checkboxes.first().check();
    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await page.getByRole("button", { name: /Export Agent/i }).click();
    const download = await downloadPromise;
    return `Exported ${download.suggestedFilename()}; first tool selected=${await checkboxes.count() ? await checkboxes.first().isChecked() : false}.`;
  }));

  interactions.push(await tryInteraction("EVE copilot without BYOK", async () => {
    await page.goto("/builder/eve", { waitUntil: "domcontentloaded" });
    const prompt = page.getByPlaceholder(/Ask Copilot/i);
    await prompt.fill("Add a verification phase and a least-privilege safety boundary.");
    await page.getByRole("button", { name: "Generate" }).click();
    await page.waitForTimeout(1_000);
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return body.includes("No API key found") ? "Correctly blocked and displayed the BYOK error." : `No expected BYOK error. Tail=${body.slice(-400)}`;
  }));

  interactions.push(await tryInteraction("runner prompt", async () => {
    await page.goto("/skills/agent-observer/run", { waitUntil: "domcontentloaded" });
    const inputs = page.locator("textarea, input").filter({ hasNot: page.locator('[type="hidden"]') });
    const count = await inputs.count();
    if (!count) return "No runnable prompt input found.";
    const target = inputs.last();
    await target.fill("Summarize the reliability risks in a tool-calling agent with broad shell access.");
    const runButton = page.getByRole("button", { name: /run|execute|start/i }).last();
    if (!(await runButton.isVisible().catch(() => false))) return "Prompt filled, but no visible run button was found.";
    await runButton.click();
    await page.waitForTimeout(12_000);
    return ((await page.locator("body").innerText()).replace(/\s+/g, " ")).slice(-700);
  }));

  interactions.push(await tryInteraction("evaluations page action", async () => {
    await page.goto("/skills/agent-observer/evals", { waitUntil: "domcontentloaded" });
    const button = page.getByRole("button", { name: /run|evaluate|suite/i }).first();
    if (!(await button.isVisible().catch(() => false))) return "No visible evaluation action found.";
    await button.click();
    await page.waitForTimeout(8_000);
    return ((await page.locator("body").innerText()).replace(/\s+/g, " ")).slice(-700);
  }));

  const outputDir = "audit";
  await mkdir(outputDir, { recursive: true });
  const output = path.join(outputDir, `live-review-${testInfo.project.name}.json`);
  await writeFile(output, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseURL: testInfo.project.use.baseURL,
    project: testInfo.project.name,
    routes: routeResults,
    interactions,
  }, null, 2));

  expect(routeResults.length).toBe(routes.length);
});
