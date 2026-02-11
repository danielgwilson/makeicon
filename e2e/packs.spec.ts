import { expect, test } from "@playwright/test";

test("packs: landing page links preselect packs in generator", async ({
  page,
}) => {
  await page.goto("/packs");
  await expect(page.getByRole("heading", { name: "Icon packs" })).toBeVisible();

  await page.getByRole("link", { name: /Next\.js App Router icons/i }).click();

  await expect(
    page.getByRole("heading", { name: /Next\.js App Router icons/i }),
  ).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/\?packs=nextjs_app_router/),
    page.getByRole("link", { name: "Generate this pack" }).click(),
  ]);

  await expect(page).toHaveURL(/\/\?packs=nextjs_app_router/);
  await expect(page.getByText("1 selected")).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Next.js (App Router files)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Web (favicon + PWA)" }),
  ).toHaveCount(0);
});
