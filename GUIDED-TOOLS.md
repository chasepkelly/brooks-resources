# Seven guided homebuying tools

The cash, credit, compare, ready, offer, shop and plan resources now collect a short set of optional answers, review exactly what will be sent to Brooks, and print populated notes without requiring identity. Payment remains unchanged on its existing version2 implementation. The seven replacements use four or five guided steps rather than twenty generic exercises.

| Tool | Steps | Optional answer fields | Result |
| --- | --- | --- | --- |
| Cash | 5 | 11 | Known purchase costs, savings to keep and missing estimates |
| Credit | 4 | 5 | Credit question before making a change |
| Compare | 5 | 18 | Two written estimates with differences to explain |
| Ready | 4 | 9 | Requested document statuses and next missing item |
| Offer | 4 | 10 | Actual transaction dates, next task and questions |
| Shop | 5 | 12 | Two-home cost/condition questions |
| Plan | 4 | 10 | Buyer-chosen next step and timing |

No calculations, qualification decisions, credit actions, rankings, uploads, assumed deadlines or program eligibility are provided. Unknown values can be left blank or entered as “not sure” / “need quote.” Name and email are required only for sending, with optional phone. The action header, verified Brooks calendar/application links, bottom disclosures and full identity are retained. Calendar loads only on request; no answer/identity prefills are sent to it.

## Shared implementation

- `fthb/tools-config-v3.json`: public copy, steps, field IDs/types/limits and allowed select options; no private evidence.
- `fthb/guided-tools-v3.js`: shared renderer, safe text-only review, receipt validation, error preservation, retry IDs and print mirrors.
- `fthb/guided-tools-v3.css`: shared layout, Planet/Brooks styling, responsive sticky header and print rules.
- `scripts/tool-page-template.html` and `scripts/tool-disclosures.json`: existing brand/identity/legal layout and per-resource references.
- `scripts/generate-tools.py`: standard-library generator; run from any directory to regenerate all seven pages.

Each page embeds only its public schema, so it does not need a network fetch to render its fields. One controller serves all seven. Payment and its version1/version2 files remain byte-identical, protecting existing/cached payment pages. Existing original seven static pages had no submit controller; their cached content remains printable.

## Submission contract

POST the existing workbook-submit endpoint with `{workbook,version:3,submission_id,contact,website,answers}`. Workbook is one of the seven registry keys; answers is a flat object of strings keyed by the public schema's exact field IDs. Text lengths are200/500/1000/2000, dates blank or ISO YYYY-MM-DD, and select values must match the schema. Answers are optional; unknown keys/types are invalid. Browser UTF-8 cap is32,000 bytes, below the server32KiB bound. No browser secret is required or embedded.

All state stays in tab memory. Refresh/close discards unsent entries. Sending requires review and a second explicit confirmation. Pending sends disable answer edits and submission controls; unchanged retries retain the UUID and edited payloads get a new UUID. Only a matching successful backend receipt displays success. Failure leaves answers intact. The backend owns validation, abuse limits, persistence, resource-specific CRM note/task and team notification; no flow activation is implied.

## Verification and release

Serve this repository on8794, then run `node tests/guided-tools-v3.cjs`. Optional `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `WORKBOOK_URL` and `SCREENSHOT_DIR` configure installed browser tooling, local URL and private evidence output. All HTTP submissions are mocked; the test never creates CRM activity. It checks75 answer values across seven forms for payload/review/print parity, empty defaults, validation, failure/retry behavior, safe rendering, idempotency, double-submit prevention, no persistence and four responsive sizes. Private PDFs/screenshots and client-language source records are outside this public repository.

Before publication: independent review and root copy/UI approval; deploy the backward-compatible version3 backend; perform the authorized backend smoke test once; then merge the reviewed static-site PR and verify exact Pages commit plus normal HTTPS byte parity. This work does not publish videos, alter native journey schedules or send campaigns.
