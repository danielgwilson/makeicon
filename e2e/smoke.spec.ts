import { expect, test } from "@playwright/test";

test("renders E2E page", async ({ page }) => {
  await page.goto("/e2e");
  await expect(page.getByRole("heading", { name: "E2E OK" })).toBeVisible();
});
