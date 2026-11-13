# Resource activity measurements

The eight workbooks and resource library load the shared `fthb/engagement.js`
client and `fthb/engagement-config.js`. This release starts **disabled**. Enable
only after the matching CRM `/engagement` endpoint, registered resource origin,
and reviewed privacy text are deployed and the complete journey has been tested.

## What is measured

When enabled and allowed by the visitor's preference, the client records page
views, scroll milestones, estimated active time, native video playback, workbook
start/review/acknowledgment, outbound resource links, calendar/application clicks
and the opening of a print dialog. The library is the `library` asset; other asset
keys are `payment`, `cash`, `credit`, `ready`, `compare`, `shop`, `offer`, `plan`.

- Active time uses a monotonic wall clock while the page is visible and there was
  interaction in the last 60 seconds. Advancing visible video also refreshes that
  activity window; hidden, paused and seeking video does not. Playing at 2x does
  not double active time. A page visit is capped at four active hours.
- Scroll milestones are 25/50/75/90 percent of the scrollable distance. They do not
  prove reading or comprehension.
- Video duration uses the union of the browser's actual `played` ranges. Seeking
  to the end cannot count as watching the skipped portion. Video completion means
  at least 95 percent of the duration played; it does not prove attention.
- Book/apply clicks do not confirm appointments or applications. A print event
  means the browser entered its print flow; it does not prove printing succeeded.
- `submission_acknowledged` is emitted only after the existing form receives its
  matching successful receipt. It describes the browser's acknowledgment, not an
  independently verified person or a replacement for the submission service's
  authoritative record. The form may include optional `engagement:{token?,session_id}`
  context so that service can record its own accepted-submission event after checking
  the accepted contact against the token binding. This context is excluded from
  answer/retry identity and omitted when opted out or when it would exceed the
  existing browser payload cap.

Analytics never reads or sends answers, names, email addresses, phone numbers,
keystroke values, amounts, account details, documents, URL query strings, referrers
or session replay. An early `no-referrer` page policy also prevents subresource and
beacon requests from forwarding the document URL. Workbook answer review, payloads,
retry IDs and sending remain
in the existing explicit confirmation process.

## Identity, privacy and storage

A personalized link may supply an opaque 64-character lowercase hexadecimal
`ck_et` value. The script removes that parameter from the visible address and
stores only the opaque value and capture time in same-origin `sessionStorage`.
It is carried between these resources within the tab for at most seven days;
the server independently enforces token expiry and workspace/deal scope. Each
page visit has a new random UUID session ID. A forwarded personalized link is
recipient-linked activity, not proof that the named recipient was the visitor.

An unlinked visitor may produce anonymous site-only events. The server must
keep these contact/deal identifiers empty and must not guess an identity.
Explicit malformed, empty or duplicate token parameters clear the cached binding
and stop the page's tracking. Invalid server-rejected tokens also stop tracking;
they do not downgrade into a
new anonymous submission on the same page. Tokens are attribution references and
never grant access to private CRM records.

GPC, Do Not Track and the page activity toggle disable collection. If the browser blocks saving a privacy preference, activity collection also stays off. Turning it off
stops the current queue and removes the tab's opaque reference. `localStorage`
contains only the on/off preference, never an analytics identifier or answers.
Turning it on requires a reload; a new personalized link is needed to restore
recipient attribution after the old reference was deliberately removed.

## Endpoint and delivery

The endpoint is fixed to the existing project's HTTPS `/functions/v1/engagement`
route. No browser service key or authorization credential is included. Requests
contain `{token?,session_id,events}`; each event contains a UUID, type, UTC time,
registered static page/asset and only the allowlisted numeric/CTA fields.

The client batches at most 20 events and 16KiB, with a maximum 100-event memory
queue. A 202 response with an accepted count acknowledges the whole valid batch,
including previously seen event IDs. Network failures retain the same IDs for a
later bounded retry; server deduplication is required. A 401/403 stops tracking.

A visibility/page-hide flush uses `sendBeacon` best effort. It has no server
acknowledgment, so those IDs remain queued while the page is alive and may later
be retried through fetch. A closed browser, blocked script or interrupted network
can lose the last measurements. Counts and duration are not an exact surveillance
or delivery guarantee. Telemetry errors never block workbook actions.

## Tests and release

Serve this repository locally, then run:

```
node tests/engagement-core.cjs
WORKBOOK_URL=http://127.0.0.1:8798 node tests/engagement-browser.cjs
```

The browser suite uses installed Playwright (override `PLAYWRIGHT_MODULE` when
needed). Every backend submission is mocked; tests create no real CRM events,
notifications, appointments or applications. Existing guided/payment form suites
also remain applicable with the default disabled configuration.

Run `python3 scripts/generate-tools.py` when changing the shared template. The
tracking/privacy additions must survive regeneration. Payment and the library
are maintained separately. Publish through a reviewed GitHub PR to main and
verify the exact Pages revision and live assets. Keep `enabled:false` until the
CRM endpoint and privacy/attribution checks pass; the configuration is the
resource-side kill switch and clears any cached token when disabled. No workbook
or tracking deployment itself enrolls a
lead, changes a deal stage, records a human conversation or sends outreach.

Technical references: [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API),
[played ranges](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/played),
[sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon).
