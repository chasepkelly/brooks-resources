# Interactive payment workbook pilot

Only `fthb/payment.html` changes behavior. The other seven workbooks and their links remain unchanged. This is an unpublished review branch until the backend is deployed and integration has passed review. No video is embedded.

## Reader flow

Use **Fill out workbook** to reach six optional household-plan rows (each has a figure and source/next action), next decision, question, question owner and follow-up date. Twenty existing exercises retain their educational content and offer collapsed, optional notes. Rough text such as “need quote” is accepted; there is no qualification or affordability calculation.

**Print / Save as PDF** copies current values into print-only text mirrors so long answers are not clipped inside controls. Printing requires no identity and sends no request. Blank optional exercises are omitted; completed exercise notes print. Browser print restores the reader’s prior expanded/collapsed state afterward.

**Send to Brooks** leads to full name and email, required only for sending; phone is optional. The page explains that sending asks the team to review and contact the reader about this workbook. Review lists exactly the entries and identity that will be submitted. Values are rendered as text, never interpreted as HTML. No document uploads, automatic saving, localStorage, sessionStorage or background submissions.

The request is sent only after **Send to Brooks** in the review step. While pending, the send button and editable controls are disabled. Only a successful JSON receipt matching the submission UUID displays success. Timeout, network failure, malformed receipts and server failures preserve all inputs. Retries reuse the UUID when the payload is unchanged; edits receive a new UUID. This UI does not promise an email notification was delivered, just that the workbook was received for review.

## Backend contract

POST `https://oznktsrggzrzjgzzhyxv.supabase.co/functions/v1/workbook-submit` with JSON:

- `workbook: "payment"`, `version: 1`, `submission_id`: UUID.
- `contact`: `name` (120 chars), `email` (254), optional `phone` (40).
- `answers`: six row objects named `take_home_income`, `non_housing_spending`, `savings_habits`, `housing_cost`, `maintenance_allowance`, `breathing_room`; each has `figure` (200) and `source` (500).
- `next_decision` (1000), `question` (2000), `question_owner` (120), `follow_up_date` (ISO date or blank), all inside `answers`.
- `answers.exercises`: only filled keys `exercise_01` through `exercise_20`, each at most 1000 chars.
- `website`: hidden honeypot, normally empty.

Client UTF-8 payload cap is 32,000 bytes, under the server’s 32KiB ceiling. No service key or browser secret. Backend owns validation, CORS, rate limits, idempotency and CRM effects. Expected receipt: HTTP202 `{ "ok": true, "submission_id": "..." }`. Error statuses400/409/429/503 never produce success. Network timeout is20seconds.

Answers exist in this tab’s memory only until sent. Refreshing/closing loses them. Submission storage and CRM notes/tasks are backend responsibilities; review the corresponding backend migration/endpoint before publishing this branch.

## Styling and files

The existing official Brooks/Planet lockup, EHL image, legal text and embedded DM Sans fonts are preserved. `payment-workbook.css` adds accessible hard-edged form controls and a true DM Sans Bold Italic font for the blue heading. Measured Planet tokens stay white, navy#00113F, blue#0075FF, black body and #444 legal.

- `fthb/payment-workbook.js`: review/send/print behavior.
- `fthb/payment-workbook.css`: scoped form and print styles.
- `fthb/payment-workbook-bold-italic.ttf`: existing approved DM Sans font, used only by this page; SIL Open Font License accompanies it in `payment-workbook-font-license.txt`.
- `tests/payment-workbook.cjs`: browser contract tests; all submission responses mocked and clearly distinguished from production integration.

## Verification

Serve the repository locally with `python3 -m http.server 8792 --bind 127.0.0.1`. With Playwright installed, run:

```sh
WORKBOOK_URL=http://127.0.0.1:8792 node tests/payment-workbook.cjs
```

The test supports `PLAYWRIGHT_MODULE` for an already-installed module, `CHROME_PATH` for a local browser and `SCREENSHOT_DIR` for private evidence outside this public repository. It covers identity-free populated printing, required send identity, safe review text, error retention, malformed receipts, rate-limit feedback, stable retry UUID, new UUID after edits, double-submit prevention, receipt-only success, no browser persistence and390/1440px overflow. Syntax check: `node --check fthb/payment-workbook.js`.

Before release: deploy and independently review the backend; run an authorized end-to-end submission and verify one expected CRM note/task/notification with unchanged nurture; review actual print output; then publish only reviewed public files and verify HTTPS behavior. Mocked browser tests do not establish backend delivery. No activation, campaign send or video publication is part of this pilot.

### Local verification receipt (October 27, 2026)

Browser contract suite passed17 checks with4 mocked requests, including a UTF-8 payload exceeding32KB: submission was blocked and all notes retained. Print-button and repeated beforeprint-event coverage verifies original expanded/collapsed exercise state is restored, including a second print cycle. Actual populated print PDF was extracted and checked for the entered summary and exercise note; send-only identity controls were absent. Private filled PDFs/screenshots remain outside this public repository. All other seven HTML workbooks matched the baseline byte-for-byte. Production endpoint delivery is not yet verified; release remains held pending backend readiness and an authorized integration check.
