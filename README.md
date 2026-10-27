# Brooks Kelly public resources

Public First-Home Resource Library, served at https://resources.brookskellyteam.com/fthb/.

The `fthb/` directory was initially a byte-identical copy of `public/fthb/` from chasepkelly/lead-triage-crm at d56fbaa6d97abad82127a5557e3edb2dde793f94. It matched all 18 live files at https://crm.themortgagechaser.com/fthb/ on October 26, 2026. Keep the original CRM paths available for previous links.

Deployment: GitHub Pages from the root of `main`, with `.nojekyll`. The custom-domain CNAME points to `chasepkelly.github.io`. No application build, private records, credentials, or backend are included.

To update, copy only the reviewed public asset directory from the CRM source, compare hashes, commit, push, and verify HTTPS pages and links.

## Payment workbook pilot

The interactive payment workbook is documented in [WORKBOOK-PILOT.md](WORKBOOK-PILOT.md), including data handling, print behavior, backend contract, tests and the deployment gate. This branch changes only the payment workbook; the other seven resources retain their original content.
