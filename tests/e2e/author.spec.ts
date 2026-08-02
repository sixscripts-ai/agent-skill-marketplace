import { test } from "@playwright/test";

test.describe("Author Flow", () => {
  test("covered by authenticated.spec.ts when E2E credentials are present", async () => {
    test.skip(true, "See tests/e2e/authenticated.spec.ts");
  });
});
