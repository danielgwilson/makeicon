import { expect, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
}

async function expectDropzoneAboveFold(page: Page) {
  const { visiblePx, minPx } = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("*"));
    const drop = nodes.find(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        (el.textContent || "").trim() === "Drop an image.",
    );

    let zone: HTMLElement | null = null;
    if (drop) {
      let p: HTMLElement | null = drop;
      for (let i = 0; i < 8 && p; i++) {
        const cls = p.getAttribute("class") || "";
        if (cls.includes("border-dashed") || cls.includes("min-h-")) {
          zone = p;
          break;
        }
        p = p.parentElement;
      }
    }

    if (!zone) return { visiblePx: 0, minPx: 0 };
    const rect = zone.getBoundingClientRect();
    const h = window.innerHeight;
    const visiblePx = Math.max(
      0,
      Math.min(h, rect.bottom) - Math.max(0, rect.top),
    );
    const minPx = Math.min(200, Math.floor(h * 0.22));
    return { visiblePx, minPx };
  });

  expect(visiblePx).toBeGreaterThan(minPx);
}

async function expectPixelGridNotBlank(page: Page) {
  const alphaSum = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="pixel-grid-field"]');
    if (!el || !(el instanceof HTMLCanvasElement)) return 0;
    const ctx = el.getContext("2d");
    if (!ctx) return 0;

    const w = el.width;
    const h = el.height;
    if (!w || !h) return 0;

    const samples = [
      [0.12, 0.72],
      [0.24, 0.78],
      [0.5, 0.74],
      [0.76, 0.8],
      [0.88, 0.7],
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
  test("desktop: pixel grid visible, no overflow", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(page.getByText("makeicon", { exact: true })).toBeVisible();
    await expect(page.getByTestId("pixel-grid-field")).toBeVisible();
    await page.waitForTimeout(250);

    await expectNoHorizontalOverflow(page);
    await expectDropzoneAboveFold(page);
    await expectPixelGridNotBlank(page);

    await page.screenshot({
      path: testInfo.outputPath("landing-desktop.png"),
      fullPage: false,
    });
  });

  test("tablet: pixel grid visible, no overflow", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(page.getByText("makeicon", { exact: true })).toBeVisible();
    await expect(page.getByTestId("pixel-grid-field")).toBeVisible();
    await page.waitForTimeout(250);

    await expectNoHorizontalOverflow(page);
    await expectDropzoneAboveFold(page);
    await expectPixelGridNotBlank(page);

    await page.screenshot({
      path: testInfo.outputPath("landing-tablet.png"),
      fullPage: false,
    });
  });

  test("mobile: pixel grid visible, no overflow", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(page.getByText("makeicon", { exact: true })).toBeVisible();
    await expect(page.getByTestId("pixel-grid-field")).toBeVisible();
    await page.waitForTimeout(250);

    await expectNoHorizontalOverflow(page);
    await expectDropzoneAboveFold(page);
    await expectPixelGridNotBlank(page);

    await page.screenshot({
      path: testInfo.outputPath("landing-mobile.png"),
      fullPage: false,
    });
  });

  test("small mobile: pixel grid visible, no overflow", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(page.getByText("makeicon", { exact: true })).toBeVisible();
    await expect(page.getByTestId("pixel-grid-field")).toBeVisible();
    await page.waitForTimeout(250);

    await expectNoHorizontalOverflow(page);
    await expectDropzoneAboveFold(page);
    await expectPixelGridNotBlank(page);

    await page.screenshot({
      path: testInfo.outputPath("landing-small-mobile.png"),
      fullPage: false,
    });
  });
});
