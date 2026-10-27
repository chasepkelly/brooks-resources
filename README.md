# Brooks Kelly public resources

Public First-Home Resource Library, served at https://resources.brookskellyteam.com/fthb/.

The `fthb/` directory was initially a byte-identical copy of `public/fthb/` from chasepkelly/lead-triage-crm at d56fbaa6d97abad82127a5557e3edb2dde793f94. It matched all 18 live files at https://crm.themortgagechaser.com/fthb/ on October 26, 2026. Keep the original CRM paths available for previous links.

Deployment: GitHub Pages from the root of `main`, with `.nojekyll`. The custom-domain CNAME points to `chasepkelly.github.io`. No application build, private records, credentials, or backend are included.

To update the seven guided tools, edit the public schemas/shared template and run `python3 scripts/generate-tools.py`. Review and test changes before committing and publishing; verify the deployed HTTPS pages and assets. Keep payment on its separately reviewed implementation.

## Payment workbook pilot

The interactive payment workbook is documented in [WORKBOOK-PILOT.md](WORKBOOK-PILOT.md), including data handling, print behavior, backend contract, tests and the deployment gate. Payment uses the reviewed five-question version2 flow. The other seven resources now use the shared version3 guided-tool implementation described below.

## Seven guided tools

See [GUIDED-TOOLS.md](GUIDED-TOOLS.md) for the seven compact interactive resources, shared renderer, version3 contract, generation and release verification. Payment remains on its reviewed version2 implementation.

## Mobile layout correction — October 27, 2026

All eight workbooks load `fthb/workbook-mobile.css`, a shared screen-only override for widths up to 600px. Payment budget cells grow with their labels and answers instead of retaining the old fixed table-cell height. The four sticky actions use equal-width columns, consistent gaps and at least 56px touch targets. Desktop, print, wording, form fields and submission behavior are unchanged. Existing versioned CSS/JS assets remain intact for cached pages. The generator template includes the new stylesheet.

Validation: actual Chrome mobile rendering at 320, 375, 390 and 430 CSS pixels across all eight pages (32 cases): no horizontal overflow, no payment-cell content overflow, and all action targets at least 56px high. At 1440px, control/table/header geometry matched the pre-change live pages in both screen and print media (16 comparisons). Independent existing suites passed payment's 20 checks/32 controls and seven tools' 75 fields without real submissions. All eight HTML pages and the generator template are byte-identical to their prior versions after removing the added stylesheet link. Safari was not directly tested.

Release through a reviewed PR to main, then verify the exact Pages deployment commit and HTTPS bytes for eight HTML files plus the new CSS. A browser refresh loads the new stylesheet; an already-open page retains its previous layout until refreshed. No backend, native flow, storage or service changes are required.

## Unlisted team video reviews

Review pages under `review/` use randomly named paths, responsive native video controls, inline mobile playback, captions and a direct MP4 download. They are omitted from public navigation and request noindex/nofollow/noarchive. These are unlisted public files, not authenticated/private storage: anyone with the URL can access or share them. Publish only the approved video, captions, poster and player HTML; never copy production journals, receipts, credentials or source corpora. Verify exact MP4 hash, deployed HTTPS assets and byte-range playback after Pages deployment.

## Workbook explainer videos — October 27, 2026

Payment, Cash, Credit, Ready, Compare, Shop and Plan now include their matching Brooks-narrated explainer near the top, before the exercises. Each native player supports inline mobile playback, captions and a direct-video link; videos do not autoplay, and the entire video section is hidden when printing. The library links directly to each available player. Offer has no placeholder or broken player while its narration remains under review.

Approved MP4/poster/VTT files live under `fthb/videos/<workbook>/`. `scripts/explainer-videos.json` controls availability and duration, and `generate-tools.py` persists video markup through the shared template. Payment retains its separately maintained HTML. The shared `workbook-video.css` controls only the player section; existing mobile layout, four sticky actions, form fields, submission logic and privacy/disclosure text remain intact. Publish only the approved media files, never internal voice or delivery logs. Verify all seven media bindings/hashes, actual mobile playback layout, print hiding, generator idempotence and mocked form suites before release.
