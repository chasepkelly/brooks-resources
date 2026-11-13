const assert = require("node:assert/strict");
const {
  sanitize,
  rangeMilliseconds,
  advancingVideo,
  create,
} = require("../fthb/engagement.js");
let tests = 0;
async function test(name, fn) {
  await fn();
  tests++;
  console.log("PASS " + name);
}
function fixture(send = async () => true) {
  let t = 0,
    id = 0;
  const engine = create({
    asset: "payment",
    path: "/fthb/payment.html",
    uuid: () => String(++id),
    now: () => t,
    wallTime: () => "2026-11-13T12:00:00.000Z",
    send,
  });
  return { engine, set: (t2) => (t = t2) };
}
(async () => {
  await test("event payload drops all answers, URLs, email and unknown fields", () => {
    assert.deepEqual(
      sanitize("form_start", {
        answers: { income: "SECRET" },
        email: "private@example.com",
        url: "https://evil.test/?ssn=secret",
        target_key: "anything",
      }),
      {},
    );
    assert.equal(sanitize("keystroke", { value: "secret" }), null);
    assert.deepEqual(
      sanitize("outbound_click", {
        target_key: "apply_now",
        question: "secret",
      }),
      { target_key: "apply_now" },
    );
  });
  await test("active duration excludes hidden and idle time", () => {
    const f = fixture();
    f.set(10000);
    assert.equal(f.engine.active, 10000);
    f.engine.setVisible(false);
    f.set(50000);
    assert.equal(f.engine.active, 10000);
    f.engine.setVisible(true);
    f.set(100000);
    assert.equal(f.engine.active, 20000); // Only initial60secminus40hidden.
    f.engine.interact();
    f.set(110000);
    assert.equal(f.engine.active, 30000);
  });
  await test("duplicate lifecycle milestones and inactive pulses are suppressed", () => {
    const f = fixture();
    assert.equal(f.engine.track("page_view", {}, "page"), true);
    assert.equal(f.engine.track("page_view", {}, "page"), false);
    f.engine.pulse();
    assert.equal(f.engine.queued, 1);
    f.set(1000);
    f.engine.pulse();
    assert.equal(f.engine.queued, 2);
    f.engine.pulse();
    assert.equal(f.engine.queued, 2);
  });
  await test("video ranges merge overlap and never count seek gaps", () => {
    assert.equal(
      rangeMilliseconds(
        [
          [0, 2],
          [98, 100],
        ],
        100,
      ),
      4000,
    );
    assert.equal(
      rangeMilliseconds(
        [
          [0, 10],
          [5, 15],
          [40, 45],
        ],
        100,
      ),
      20000,
    );
    assert.equal(
      rangeMilliseconds(
        [
          [NaN, 4],
          [-10, 2],
          [99, 101],
        ],
        100,
      ),
      3000,
    );
    assert.equal(rangeMilliseconds([[0, 99]], NaN), 0);
  });
  await test("failed transport retries exact event IDs, bounded20perbatch", async () => {
    const sent = [];
    let ok = false;
    const f = fixture(async (p) => {
      sent.push(p);
      return ok;
    });
    for (let i = 0; i < 25; i++) f.engine.track("page_view");
    await f.engine.flush();
    assert.equal(f.engine.queued, 25);
    ok = true;
    await f.engine.flush();
    assert.equal(f.engine.queued, 5);
    assert.deepEqual(sent[0], sent[1]);
    assert.equal(sent[1].events.length, 20);
    await f.engine.flush();
    assert.equal(f.engine.queued, 0);
  });
  await test("no simultaneous flush and stop clears queue", async () => {
    let release,
      n = 0;
    const f = fixture(() => {
      n++;
      return new Promise((r) => (release = r));
    });
    f.engine.track("page_view");
    const pending = f.engine.flush();
    await f.engine.flush();
    assert.equal(n, 1);
    release(true);
    await pending;
    f.engine.track("page_view");
    f.engine.stop();
    await f.engine.flush();
    assert.equal(n, 1);
    assert.equal(f.engine.queued, 0);
  });
  await test("invalid identity disables session without anonymous retry", async () => {
    const f = fixture(async () => "disabled");
    f.engine.track("page_view");
    await f.engine.flush();
    assert.equal(f.engine.track("page_view"), false);
    assert.equal(f.engine.queued, 0);
  });
  await test("beacon has no acknowledgement and retains IDs until fetch acknowledgement", async () => {
    const sent = [];
    const f = fixture(async (p, beacon) => {
      sent.push(p);
      return !beacon;
    });
    f.engine.track("page_view");
    await f.engine.flush(true);
    assert.equal(f.engine.queued, 1);
    await f.engine.flush(false);
    assert.deepEqual(sent[0], sent[1]);
    assert.equal(f.engine.queued, 0);
  });
  await test("foreground advancing playback extends active time without using media speed", () => {
    assert.equal(advancingVideo(true, false, false, 1000, 3000), true);
    for (const args of [
      [false, false, false, 1, 2],
      [true, true, false, 1, 2],
      [true, false, true, 1, 2],
      [true, false, false, 2, 2],
    ])
      assert.equal(advancingVideo(...args), false);
    const f = fixture();
    f.set(1000);
    if (advancingVideo(true, false, false, 0, 2000)) f.engine.interact();
    assert.equal(f.engine.active, 1000);
  });
  await test("only registered resource paths can be instrumented", () =>
    assert.throws(() =>
      create({ asset: "payment", path: "/private/income@example.com" }),
    ));
  console.log(JSON.stringify({ pass: true, tests, realRequests: 0 }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
