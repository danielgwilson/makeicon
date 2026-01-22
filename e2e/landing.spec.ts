import { expect, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
}

async function expectHalftoneNotBlank(page: Page) {
  const alphaSum = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="halftone-field"]');
    if (!el || !(el instanceof HTMLCanvasElement)) return 0;
    const ctx = el.getContext("2d");
    if (!ctx) return 0;

    const w = el.width;
    const h = el.height;
    if (!w || !h) return 0;

    const samples = [
      [0.2, 0.16],
      [0.26, 0.22],
      [0.68, 0.32],
      [0.74, 0.36],
      [0.5, 0.12],
    ];

    let sum = 0;
    const box = 9;
    for (const [fx, fy] of samples) {
      const cx = Math.floor(w * fx);
      const cy = Math.floor(h * fy);
      const x = Math.max(0, Math.min(w - box, cx - Math.floor(box / 2)));
      const y = Math.max(0, Math.min(h - box, cy - Math.floor(box / 2)));
      const img = ctx.getImageData(x, y, box, box);
      for (let i = 3; i < img.data.length; i += 4) sum += img.data[i];
    }
    return sum;
  });

  expect(alphaSum).toBeGreaterThan(0);
}

test.describe("landing", () => {
  test("desktop: halftone visible, no overflow", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(page.getByText("makeicon", { exact: true })).toBeVisible();
    await expect(page.getByTestId("halftone-field")).toBeVisible();
    await page.waitForTimeout(250);

    await expectNoHorizontalOverflow(page);
    await expectHalftoneNotBlank(page);

    await page.screenshot({
      path: testInfo.outputPath("landing-desktop.png"),
      fullPage: false,
    });
  });

  test("mobile: halftone visible, no overflow", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(page.getByText("makeicon", { exact: true })).toBeVisible();
    await expect(page.getByTestId("halftone-field")).toBeVisible();
    await page.waitForTimeout(250);

    await expectNoHorizontalOverflow(page);
    await expectHalftoneNotBlank(page);

    await page.screenshot({
      path: testInfo.outputPath("landing-mobile.png"),
      fullPage: false,
    });
  });
});
