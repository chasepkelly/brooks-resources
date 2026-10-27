> Current page: version2 guided workbook. Earlier sections below document the original version1 pilot; see “Current guided workbook (version2)” for the current contract and tests.

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

### Client-language and mobile update (October 27, 2026)

The payment workbook uses concrete buyer language about take-home pay, monthly bills, savings and a comfortable payment. All twenty optional questions and the36 answer fields remain. The copy draws on attested FTHB buyer language; the TTO itself remains an internal draft, not a validated targeting claim. Private source quotes, customer records and the before/after ledger are kept outside this public repository. Existing planning exercises remain editorial guidance, not quotations or qualification rules. References and disclosures now sit at the bottom; the send section retains its short explanation of what the visitor is choosing to share.

All four actions remain in a sticky header: Review before sending, Book a call, Apply now and Print / Save PDF. Mobile uses two columns with48px touch targets. Header height is measured to keep scrolled fields and sections below it. The contact/review form follows the budget before the optional questions. Review still validates required identity and never sends automatically; printing still requires no identity.

Brooks’s calendar loads only after the visitor chooses Book a call or Show available times. An always-available direct link provides a fallback. The destination is `https://calendly.com/brookskelly/30min`; an actual browser check confirmed Brooks’s30-minute Personal Loan Consultation and available dates, without making a booking. Apply now opens `https://apply.planethomelending.com/loan-officers/brooks@planethomelending`, verified to identify Brooks Kelly NMLS208792. Loan initiation was not tested. Neither link nor the calendar frame receives workbook answers or identity prefills.

The revised browser suite passes20 checks, including320/390/768/1440px layouts,44px-minimum action targets, sticky top positioning, the existing review flow, opt-in calendar loading and unchanged submission/error/print behavior. Calendar HTTP content is mocked in the automated test; the live event was separately verified in a browser. Seven other workbooks, all36 form-answer contracts and the original legal text remain unchanged. Publication remains held for the backend live smoke/integration and final review.

## Current guided workbook (version2)

The twenty separate exercises have been replaced with five guided questions: preferred payment, what a quote includes, money left each month, an optional comparison of two estimates, and the first question for Brooks. The existing budget appears once: five budget rows above the questions and the existing remaining-money pair within question3. No calculator or qualification assessment is added. The housing row names payment, taxes, insurance and HOA dues; maintenance remains separate.

All answers are optional. Amounts accept text such as “need quote” or “not sure.” The optional comparison starts collapsed with blank amounts. Review and print include text, checkbox and select answers. Sending still requires name/email, shows the review first, and relies on a matching backend receipt. Four actions stay in the top header on desktop and mobile; booking, application links, disclosures and seven other workbooks are preserved.

### Version2 request contract

The envelope remains workbook=`payment`, contact, submission_id and website; version is now2. Answers retain six `{figure,source}` budget objects and `question`. Version2 omits the former exercises/next_decision/question_owner/follow_up_date fields. New `guided` groups:

- `payment_preference`: preferred, too_high (text200 each), unsure (boolean).
- `quoted_payment`: amount(text200); taxes, homeowners_insurance, mortgage_insurance, hoa_dues (blank/included/separate/not_applicable/not_sure); other_costs(text1000).
- `remaining`: needs_to_cover(text1000), comfort(blank/yes/no/not_sure). The amount itself remains solely `answers.breathing_room.figure`.
- `comparison`: option_a and option_b, each cash_at_closing/monthly_payment/savings_left(text200 each); request(text1000).
- `priority`: blank/missing_costs/lower_payment/savings_left/other. Additional question text remains solely `answers.question`(2000).

Six budget figure/source limits remain200/500. Client UTF-8 total cap remains32,000 bytes. Backend must accept version2 before this page deploys and must continue accepting version1 for cached pages.

### Cache compatibility and verification

The new HTML loads `payment-guided.js` and `payment-guided.css`. Original `payment-workbook.js` and `payment-workbook.css` remain byte-identical for cached version1 HTML. Do not overwrite or remove those old files during this rollout.

Run `WORKBOOK_URL=http://127.0.0.1:8793 node tests/payment-guided.cjs` (same optional PLAYWRIGHT_MODULE/CHROME_PATH/SCREENSHOT_DIR environment variables as above). The new suite passes20 behavior checks across32 answer controls: five sections/no old20, one remaining-money input, optional blank comparison, complete print/review/payload parity, select/checkbox values, validation, errors, safe rendering, retry IDs, pending controls, receipt-only success, no storage, four responsive sizes, calendar opt-in and UTF-8 limit. Actual printed PDF text also preserves both estimate columns, selections and literal user notes. Tests mock requests and never send notifications. Existing `tests/payment-workbook.cjs` documents the historical version1 contract, not the new page.

Private source-to-copy evidence and populated test artifacts remain outside this public repo. Root reviewed the five-question proposal and actual page; release still requires independent review plus the backward-compatible backend deployment before Pages publication. No video, application start, booking or campaign activation is included.
