/* First-party activity measurements. Never reads or sends workbook answers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.BKEngagementCore = api;
    api.boot(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ASSETS = [
    "library",
    "payment",
    "cash",
    "credit",
    "ready",
    "compare",
    "shop",
    "offer",
    "plan",
  ];
  const TYPES = new Set([
    "page_view",
    "engagement_pulse",
    "scroll_milestone",
    "video_start",
    "video_pause",
    "video_progress",
    "video_complete",
    "form_start",
    "review_open",
    "submission_acknowledged",
    "book_click",
    "apply_click",
    "outbound_click",
    "print_dialog_open",
  ]);
  const TARGETS = new Set([
    "book_call",
    "apply_now",
    "print_workbook",
    "calendar_embed",
    "privacy_policy",
    "licensing",
    "instagram",
    "video_download",
    ...ASSETS.map((x) => "resource_" + x),
  ]);
  const IDLE_MS = 60000;
  function metric(value, max) {
    return Number.isFinite(value)
      ? Math.max(0, Math.min(max, Math.round(value)))
      : undefined;
  }
  function sanitize(type, details) {
    if (!TYPES.has(type)) return null;
    const d = details || {},
      out = {};
    if (d.active_ms !== undefined)
      out.active_ms = metric(d.active_ms, 14400000);
    if (d.scroll_percent !== undefined)
      out.scroll_percent = metric(d.scroll_percent, 100);
    if (ASSETS.includes(d.video_key) && d.video_key !== "library")
      out.video_key = d.video_key;
    if (d.played_ms !== undefined)
      out.played_ms = metric(d.played_ms, 14400000);
    if (d.video_percent !== undefined)
      out.video_percent = metric(d.video_percent, 100);
    if (TARGETS.has(d.target_key)) out.target_key = d.target_key;
    return Object.fromEntries(
      Object.entries(out).filter(([, v]) => v !== undefined),
    );
  }
  function rangeMilliseconds(ranges, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    const sorted = ranges
      .filter(
        (r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite),
      )
      .map(([a, b]) => [Math.max(0, a), Math.min(duration, b)])
      .filter(([a, b]) => b > a)
      .sort((a, b) => a[0] - b[0]);
    let total = 0,
      end = 0;
    for (const [a, b] of sorted) {
      if (b > end) {
        total += b - Math.max(a, end);
        end = b;
      }
    }
    return Math.round(total * 1000);
  }
  function advancingVideo(
    visible,
    paused,
    seeking,
    before,
    after,
    elapsedMs,
    rate,
  ) {
    const advancedMs = (after - before) * 1000;
    return (
      visible &&
      !paused &&
      !seeking &&
      [before, after, elapsedMs, rate].every(Number.isFinite) &&
      elapsedMs > 0 &&
      elapsedMs <= 5000 &&
      rate > 0 &&
      rate <= 16 &&
      advancedMs > 0 &&
      advancedMs <= elapsedMs * rate + 250
    );
  }
  function create(options) {
    const { asset, path, uuid, now, wallTime, send } = options;
    if (
      !ASSETS.includes(asset) ||
      path !== "/fthb/" + (asset === "library" ? "index" : asset) + ".html"
    )
      throw Error("Unsupported resource");
    const session = uuid(),
      queue = [];
    let active = 0,
      lastPulse = 0,
      last = now(),
      interacted = last,
      visible = true,
      stopped = false,
      sending = false;
    const once = new Set();
    function tick() {
      const t = now();
      if (visible)
        active += Math.max(0, Math.min(t, interacted + IDLE_MS) - last);
      active = Math.min(active, 14400000);
      last = t;
      return Math.round(active);
    }
    function track(type, details, unique) {
      if (stopped || (unique && once.has(unique))) return false;
      const safe = sanitize(type, details);
      if (!safe) return false;
      if (unique) once.add(unique);
      if (queue.length >= 100) return false;
      queue.push({
        event_id: uuid(),
        event_type: type,
        occurred_at: wallTime(),
        page_path: path,
        asset_key: asset,
        ...safe,
      });
      return true;
    }
    async function flush(beacon) {
      if (stopped || sending || !queue.length) return;
      const batch = queue.slice(0, 20);
      sending = true;
      try {
        const accepted = await send(
          { session_id: session, events: batch },
          !!beacon,
        );
        if (accepted === "disabled") {
          stopped = true;
          queue.length = 0;
        } else if (accepted === true) queue.splice(0, batch.length);
      } catch (_) {
        /* Preserve the same event IDs for a later bounded retry. */
      } finally {
        sending = false;
      }
    }
    return {
      track,
      flush,
      interact() {
        tick();
        interacted = now();
      },
      setVisible(value) {
        tick();
        visible = value;
        last = now();
      },
      pulse() {
        const ms = tick();
        if (ms > lastPulse) {
          lastPulse = ms;
          track("engagement_pulse", { active_ms: ms });
        }
      },
      stop() {
        stopped = true;
        queue.length = 0;
      },
      get active() {
        return tick();
      },
      get queued() {
        return queue.length;
      },
      get enabled() {
        return !stopped;
      },
      sessionId: session,
    };
  }
  function boot(win) {
    const doc = win.document,
      cfg = win.BKEngagementConfig || {};
    const slug =
      win.location.pathname.match(
        /^\/fthb\/(payment|cash|credit|ready|compare|shop|offer|plan|index)\.html$/,
      )?.[1] || (win.location.pathname === "/fthb/" ? "index" : null);
    if (!slug) return;
    const asset = slug === "index" ? "library" : slug;
    const pagePath = "/fthb/" + slug + ".html";
    const tokenKey = "bk-engagement-link-v1",
      preferenceKey = "bk-engagement-off-v1";
    const safeGet = (store, key) => {
      try {
        return win[store].getItem(key);
      } catch (_) {
        return null;
      }
    };
    const safeRemove = (store, key) => {
      try {
        win[store].removeItem(key);
      } catch (_) {}
    };
    const safeSet = (store, key, value) => {
      try {
        win[store].setItem(key, value);
      } catch (_) {}
    };
    let token = "",
      invalidIncoming = false;
    try {
      const url = new URL(win.location.href),
        incoming = url.searchParams.getAll("ck_et");
      if (incoming.length) {
        invalidIncoming =
          incoming.length !== 1 || !/^[a-f0-9]{64}$/.test(incoming[0]);
        if (!invalidIncoming) token = incoming[0];
      }
      if (url.searchParams.has("ck_et")) {
        url.searchParams.delete("ck_et");
        win.history.replaceState(
          win.history.state,
          "",
          url.pathname + url.search + url.hash,
        );
      }
    } catch (_) {
      invalidIncoming = true;
      token = "";
    }
    const protectedPrivacy =
      win.navigator.globalPrivacyControl === true ||
      win.navigator.doNotTrack === "1" ||
      win.doNotTrack === "1";
    let off =
      protectedPrivacy ||
      invalidIncoming ||
      safeGet("localStorage", preferenceKey) === "1";
    if (off) safeRemove("sessionStorage", tokenKey);
    if (cfg.enabled !== true) {
      safeRemove("sessionStorage", tokenKey);
      win.BKEngagement = {
        track() {
          return false;
        },
        enabled: false,
      };
      return;
    }
    let preferenceAvailable = true;
    try {
      const existing = win.localStorage.getItem(preferenceKey);
      win.localStorage.setItem(
        preferenceKey,
        existing === null ? "0" : existing,
      );
      if (existing === null) win.localStorage.removeItem(preferenceKey);
    } catch (_) {
      preferenceAvailable = false;
      off = true;
      safeRemove("sessionStorage", tokenKey);
    }
    const notice = doc.querySelector("[data-engagement-notice]");
    if (notice) notice.hidden = false;
    const button = doc.querySelector("[data-engagement-toggle]");
    function label() {
      if (button) {
        button.textContent = protectedPrivacy
          ? "Activity measurement is off (browser preference)"
          : off
            ? "Turn on activity measurement"
            : "Turn off activity measurement";
        button.disabled =
          protectedPrivacy || invalidIncoming || !preferenceAvailable;
        if (invalidIncoming)
          button.textContent = "Activity measurement is off (invalid link)";
        if (!preferenceAvailable)
          button.textContent =
            "Activity measurement is off (privacy preference storage unavailable)";
      }
    }
    label();
    let engine;
    button?.addEventListener("click", () => {
      off = !off;
      safeSet("localStorage", preferenceKey, off ? "1" : "0");
      if (off) {
        engine?.stop();
        safeRemove("sessionStorage", tokenKey);
        token = "";
      }
      label();
      if (!off) win.location.reload();
    });
    if (off) {
      win.BKEngagement = {
        track() {
          return false;
        },
        enabled: false,
      };
      return;
    }
    if (token)
      safeSet(
        "sessionStorage",
        tokenKey,
        JSON.stringify({ token, at: Date.now() }),
      );
    else {
      try {
        const stored = JSON.parse(
          safeGet("sessionStorage", tokenKey) || "null",
        );
        if (
          stored &&
          Date.now() - stored.at >= 0 &&
          Date.now() - stored.at < 604800000 &&
          /^[a-f0-9]{64}$/.test(stored.token)
        )
          token = stored.token;
        else safeRemove("sessionStorage", tokenKey);
      } catch (_) {
        safeRemove("sessionStorage", tokenKey);
      }
    }
    let endpoint;
    try {
      endpoint = new URL(cfg.endpoint);
      if (
        endpoint.protocol !== "https:" ||
        endpoint.hostname !== "oznktsrggzrzjgzzhyxv.supabase.co" ||
        endpoint.pathname !== "/functions/v1/engagement"
      )
        return;
    } catch (_) {
      return;
    }
    const send = async (payload, beacon) => {
      const body = JSON.stringify({ ...(token ? { token } : {}), ...payload });
      if (new TextEncoder().encode(body).length > 16384) return false;
      // A beacon has no acknowledgement. Retain event IDs: the server deduplicates a later fetch.
      if (beacon && win.navigator.sendBeacon) {
        try {
          win.navigator.sendBeacon(
            endpoint.href,
            new Blob([body], { type: "application/json" }),
          );
        } catch (_) {}
        return false;
      }
      const controller = new AbortController(),
        timer = win.setTimeout(() => controller.abort(), 8000);
      try {
        const r = await win.fetch(endpoint.href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (r.status === 401 || r.status === 403) {
          safeRemove("sessionStorage", tokenKey);
          return "disabled";
        }
        if (r.status !== 202) return false;
        const result = await r.json();
        return (
          Number.isInteger(result.accepted) &&
          result.accepted >= 0 &&
          result.accepted <= payload.events.length
        );
      } finally {
        win.clearTimeout(timer);
      }
    };
    engine = create({
      asset,
      path: pagePath,
      uuid: () => win.crypto.randomUUID(),
      now: () => win.performance.now(),
      wallTime: () => new Date().toISOString(),
      send,
    });
    win.BKEngagement = {
      track: (type, details, unique) => engine.track(type, details, unique),
      get enabled() {
        return engine.enabled && !off;
      },
      submissionContext: () =>
        engine.enabled && !off
          ? { ...(token ? { token } : {}), session_id: engine.sessionId }
          : undefined,
    };
    engine.setVisible(doc.visibilityState === "visible");
    engine.track("page_view", {}, "page");
    for (const name of ["pointerdown", "keydown", "touchstart", "scroll"])
      win.addEventListener(name, () => engine.interact(), { passive: true });
    doc.addEventListener("visibilitychange", () => {
      engine.setVisible(doc.visibilityState === "visible");
      engine.pulse();
      void engine.flush(doc.visibilityState !== "visible");
    });
    win.addEventListener("pagehide", () => {
      engine.pulse();
      void engine.flush(true);
    });
    win.addEventListener("pageshow", () =>
      engine.setVisible(doc.visibilityState === "visible"),
    );
    win.setInterval(() => {
      engine.pulse();
      void engine.flush(false);
    }, 15000);
    win.setTimeout(() => void engine.flush(false), 1500);
    const depths = [25, 50, 75, 90];
    win.addEventListener(
      "scroll",
      () => {
        const total = doc.documentElement.scrollHeight - win.innerHeight;
        if (total <= 0) return;
        const pct = Math.min(100, (100 * win.scrollY) / total);
        for (const n of depths)
          if (pct >= n)
            engine.track(
              "scroll_milestone",
              { scroll_percent: n },
              "scroll:" + n,
            );
      },
      { passive: true },
    );
    for (const video of doc.querySelectorAll("video")) {
      const milestones = new Set();
      let sample;
      function resetSample() {
        sample = { media: video.currentTime, wall: win.performance.now() };
      }
      resetSample();
      function progress(type) {
        const ranges = [];
        for (let i = 0; i < video.played.length; i++)
          ranges.push([video.played.start(i), video.played.end(i)]);
        const ms = rangeMilliseconds(ranges, video.duration);
        if (
          advancingVideo(
            doc.visibilityState === "visible",
            video.paused,
            video.seeking,
            sample.media,
            video.currentTime,
            win.performance.now() - sample.wall,
            video.playbackRate,
          )
        )
          engine.interact();
        resetSample();
        const pct =
          video.duration > 0
            ? Math.min(100, (100 * ms) / (video.duration * 1000))
            : 0;
        const details = { video_key: asset, played_ms: ms, video_percent: pct };
        if (type) engine.track(type, details);
        for (const n of [25, 50, 75, 95])
          if (pct >= n && !milestones.has(n)) {
            milestones.add(n);
            engine.track(
              n === 95 ? "video_complete" : "video_progress",
              details,
              "video:" + n,
            );
          }
      }
      video.addEventListener("play", () => {
        resetSample();
        if (doc.visibilityState === "visible" && !video.seeking)
          engine.interact();
        progress("video_start");
      });
      for (const name of ["seeking", "seeked", "ratechange"])
        video.addEventListener(name, resetSample);
      doc.addEventListener("visibilitychange", resetSample);
      video.addEventListener("pause", () => progress("video_pause"));
      video.addEventListener("timeupdate", () => progress());
      video.addEventListener("ended", () => progress());
    }
    win.addEventListener("beforeprint", () =>
      engine.track("print_dialog_open", { target_key: "print_workbook" }),
    );
    doc.addEventListener(
      "input",
      (event) => {
        if (event.target.closest?.("[data-answer],#send-form"))
          engine.track("form_start", {}, "form:start");
      },
      { passive: true },
    );
    doc.addEventListener("click", (event) => {
      const el = event.target.closest?.("a,button");
      if (!el) return;
      if (["quick-book", "load-calendar"].includes(el.id)) {
        engine.track("book_click", { target_key: "calendar_embed" });
        return;
      }
      if (el.id === "print-workbook") return;
      if (el.tagName !== "A") return;
      let dest;
      try {
        dest = new URL(el.getAttribute("href"), win.location.href);
      } catch (_) {
        return;
      }
      let target;
      if (dest.hostname === "apply.planethomelending.com") {
        engine.track("apply_click", { target_key: "apply_now" });
        return;
      }
      if (dest.hostname === "calendly.com") {
        engine.track("book_click", { target_key: "book_call" });
        return;
      }
      if (dest.origin === win.location.origin) {
        const match = dest.pathname.match(
          /^\/fthb\/(payment|cash|credit|ready|compare|shop|offer|plan|index)\.html$/,
        );
        if (match)
          target = "resource_" + (match[1] === "index" ? "library" : match[1]);
        else if (/^\/fthb\/videos\/[a-z]+\/video\.mp4$/.test(dest.pathname))
          target = "video_download";
      } else if (
        dest.hostname === "www.instagram.com" ||
        dest.hostname === "instagram.com"
      )
        target = "instagram";
      else if (
        dest.hostname === "planethomelending.com" ||
        dest.hostname === "www.planethomelending.com"
      ) {
        if (dest.pathname.includes("privacy")) target = "privacy_policy";
        else if (dest.pathname.includes("licens")) target = "licensing";
      }
      if (target) engine.track("outbound_click", { target_key: target });
    });
  }
  return { sanitize, rangeMilliseconds, advancingVideo, create, boot, IDLE_MS };
});
