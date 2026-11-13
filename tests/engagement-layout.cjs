/* Local layout only; engagement requests mocked. */
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/chasekelly/atomic-crm/node_modules/@playwright/test",
);
const assert = require("node:assert/strict"),
  fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/engagement-config.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "window.BKEngagementConfig={enabled:true,endpoint:'https://oznktsrggzrzjgzzhyxv.supabase.co/functions/v1/engagement'}",
    }),
  );
  await page.route("**/functions/v1/engagement", (r) =>
    r.fulfill({ status: 202, json: { accepted: 0 } }),
  );
  const folder = process.env.SCREENSHOT_DIR;
  if (folder) fs.mkdirSync(folder, { recursive: true });
  const result = [];
  for (const slug of [
    "index",
    "payment",
    "cash",
    "credit",
    "ready",
    "compare",
    "shop",
    "offer",
    "plan",
  ]) {
    await page.goto(
      (process.env.WORKBOOK_URL || "http://127.0.0.1:8798") +
        "/fthb/" +
        slug +
        ".html",
      { waitUntil: "domcontentloaded" },
    );
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator("[data-engagement-notice]").scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        slug + " overflow " + width,
      );
      assert.ok(
        (await page.locator("[data-engagement-toggle]").boundingBox()).height >=
          44,
        slug + " tap height",
      );
      result.push({ slug, width, pass: true });
      if (
        folder &&
        ((slug === "payment" && width === 390) ||
          (slug === "index" && width === 1440))
      )
        await page.screenshot({
          path: folder + "/" + slug + "-" + width + ".png",
          fullPage: false,
        });
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      pass: true,
      cases: result.length,
      consoleErrors: errors.length,
      realBackendRequests: 0,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
