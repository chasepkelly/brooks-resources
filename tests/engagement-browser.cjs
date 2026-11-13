/* Mocked engagement/workbook endpoints only. Never writes CRM records. */
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/chasekelly/atomic-crm/node_modules/@playwright/test",
);
const assert = require("node:assert/strict");
const BASE = process.env.WORKBOOK_URL || "http://127.0.0.1:8798";
const endpoint =
  "https://oznktsrggzrzjgzzhyxv.supabase.co/functions/v1/engagement";
(async () => {
  const browser = await chromium.launch({ headless: true });
  let checks = 0;
  async function page(options = {}) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 900 },
    });
    const p = await ctx.newPage(),
      requests = [],
      submissions = [];
    await p.route("**/engagement-config.js", (r) => {
      assert.equal(r.request().headers().referer, undefined);
      return r.fulfill({
        contentType: "text/javascript",
        body: `window.BKEngagementConfig={enabled:${options.enabled !== false},endpoint:${JSON.stringify(endpoint)}};`,
      });
    });
    await p.route(endpoint, (r) => {
      requests.push(r.request().postDataJSON());
      return r.fulfill({
        status: 202,
        json: { accepted: r.request().postDataJSON().events.length },
      });
    });
    await p.route("https://calendly.com/**", (r) =>
      r.fulfill({ status: 200, body: "<html>Mock calendar</html>" }),
    );
    await p.route("**/workbook-submit", (r) => {
      submissions.push(r.request().postDataJSON());
      return r.fulfill({
        status: 202,
        json: {
          ok: true,
          submission_id: r.request().postDataJSON().submission_id,
        },
      });
    });
    if (options.cachedToken)
      await p.addInitScript(
        (token) =>
          sessionStorage.setItem(
            "bk-engagement-link-v1",
            JSON.stringify({ token, at: Date.now() }),
          ),
        options.cachedToken,
      );
    if (options.blockedStorage)
      await p.addInitScript(() =>
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new Error("blocked");
          },
        }),
      );
    if (options.dnt)
      await p.addInitScript(() =>
        Object.defineProperty(navigator, "doNotTrack", { value: "1" }),
      );
    if (options.gpc)
      await p.addInitScript(() =>
        Object.defineProperty(navigator, "globalPrivacyControl", {
          value: true,
        }),
      );
    return { p, ctx, requests, submissions };
  }
  // Every public resource renders the shared tracker with disabled collection.
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
    const { p, ctx, requests } = await page({ enabled: false });
    await p.goto(`${BASE}/fthb/${slug}.html`);
    await p.waitForFunction(() => !!window.BKEngagement);
    assert.equal(await p.evaluate(() => BKEngagement.enabled), false);
    assert.equal(
      await p.evaluate(() => localStorage.length + sessionStorage.length),
      0,
    );
    assert.equal(requests.length, 0);
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    checks++;
    await ctx.close();
  }
  const { p, ctx, requests, submissions } = await page();
  await p.goto(
    `${BASE}/fthb/payment.html?ck_et=${"a".repeat(64)}&email=PRIVATEQUERY@example.com`,
  );
  await p.waitForTimeout(1800);
  assert.equal(new URL(p.url()).searchParams.has("ck_et"), false);
  assert.ok(requests[0].token);
  assert.equal(requests[0].events[0].event_type, "page_view");
  checks++;
  await p.locator("#take_home_income_figure").fill("SECRET-FINANCIAL-123456");
  await p.locator("#send-form input[name=name]").fill("PRIVATE NAME");
  await p
    .locator("#send-form input[name=email]")
    .fill("PRIVATEFORM@example.com");
  await p.locator("#quick-review").click();
  await p.locator("#confirm-send").click();
  await p.getByText("Your workbook was received", { exact: false }).waitFor();
  await p.evaluate(() => {
    window.print = () => window.dispatchEvent(new Event("beforeprint"));
  });
  await p.locator("#print-workbook").click();
  await p.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await p.waitForTimeout(100);
  await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await p.waitForTimeout(300);
  assert.equal(submissions[0].engagement.token, "a".repeat(64));
  const events = requests.flatMap((r) => r.events);
  assert.ok(
    events.some(
      (e) => e.event_type === "scroll_milestone" && e.scroll_percent === 90,
    ),
  );
  for (const event of [
    "form_start",
    "review_open",
    "submission_acknowledged",
    "print_dialog_open",
  ])
    assert.ok(
      events.some((e) => e.event_type === event),
      event,
    );
  assert.ok(
    !JSON.stringify(requests).match(/PRIVATE|SECRET|answers|take_home_income/),
  );
  checks++;
  // No false video completion after seeking to the end; only actual played ranges count.
  await p.evaluate(() => {
    const v = document.querySelector("video");
    Object.defineProperty(v, "duration", { value: 100 });
    Object.defineProperty(v, "played", {
      value: {
        length: 2,
        start: (i) => (i === 0 ? 0 : 98),
        end: (i) => (i === 0 ? 2 : 100),
      },
    });
    v.dispatchEvent(new Event("ended"));
    window.dispatchEvent(new Event("pagehide"));
  });
  await p.waitForTimeout(300);
  assert.ok(
    !requests
      .flatMap((r) => r.events)
      .some((e) => e.event_type === "video_complete"),
  );
  checks++;
  // Same-origin resource navigation carries opaque attribution but creates a distinct visit.
  const oldSession = requests[0].session_id;
  await p.goto(`${BASE}/fthb/cash.html`);
  await p.waitForTimeout(1800);
  assert.equal(requests.at(-1).token, "a".repeat(64));
  assert.notEqual(requests.at(-1).session_id, oldSession);
  checks++;
  await p.locator("[data-engagement-toggle]").click();
  const n = requests.length;
  await p.locator("#question").fill("NO UPLOAD");
  await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await p.waitForTimeout(200);
  assert.equal(requests.length, n);
  assert.equal(
    await p.evaluate(() => BKEngagement.submissionContext()),
    undefined,
  );
  assert.equal(
    await p.evaluate(() => sessionStorage.getItem("bk-engagement-link-v1")),
    null,
  );
  await p.locator("#send-form input[name=name]").fill("OFF PERSON");
  await p.locator("#send-form input[name=email]").fill("off@example.com");
  await p.locator("#quick-review").click();
  await p.locator("#confirm-send").click();
  await p.getByText("Your answers were received", { exact: false }).waitFor();
  assert.equal("engagement" in submissions.at(-1), false);
  checks++;
  await ctx.close();
  // Anonymous events contain no inferred identity; browser privacy preference disables all uploads.
  const anon = await page();
  await anon.p.goto(`${BASE}/fthb/index.html`);
  await anon.p.waitForTimeout(1800);
  assert.ok(anon.requests.length);
  assert.equal("token" in anon.requests[0], false);
  checks++;
  await anon.ctx.close();
  const gpc = await page({ gpc: true });
  await gpc.p.goto(`${BASE}/fthb/payment.html?ck_et=${"b".repeat(64)}`);
  await gpc.p.waitForTimeout(1800);
  assert.equal(gpc.requests.length, 0);
  assert.equal(await gpc.p.evaluate(() => sessionStorage.length), 0);
  checks++;
  await gpc.ctx.close();
  for (const options of [{ dnt: true }, { blockedStorage: true }]) {
    const f = await page(options);
    await f.p.goto(`${BASE}/fthb/payment.html?ck_et=${"c".repeat(64)}`);
    await f.p.waitForTimeout(1800);
    assert.equal(f.requests.length, 0);
    assert.equal(await f.p.evaluate(() => BKEngagement.enabled), false);
    checks++;
    await f.ctx.close();
  }
  // Explicit malformed, empty, or ambiguous identity never falls back to cached or anonymous attribution.
  for (const query of [
    "ck_et=bad",
    "ck_et=",
    `ck_et=${"a".repeat(64)}&ck_et=${"b".repeat(64)}`,
  ]) {
    for (const cachedToken of [undefined, "d".repeat(64)]) {
      const invalid = await page({ cachedToken });
      await invalid.p.goto(`${BASE}/fthb/payment.html?${query}`);
      await invalid.p.waitForTimeout(1800);
      assert.equal(invalid.requests.length, 0);
      assert.equal(await invalid.p.evaluate(() => BKEngagement.enabled), false);
      assert.equal(
        await invalid.p.evaluate(() =>
          sessionStorage.getItem("bk-engagement-link-v1"),
        ),
        null,
      );
      assert.equal(new URL(invalid.p.url()).searchParams.has("ck_et"), false);
      checks++;
      await invalid.ctx.close();
    }
  }
  const disabled = await page({ enabled: false, cachedToken: "e".repeat(64) });
  await disabled.p.goto(`${BASE}/fthb/payment.html`);
  assert.equal(
    await disabled.p.evaluate(() =>
      sessionStorage.getItem("bk-engagement-link-v1"),
    ),
    null,
  );
  checks++;
  await disabled.ctx.close();
  console.log(JSON.stringify({ pass: true, checks, realBackendRequests: 0 }));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
