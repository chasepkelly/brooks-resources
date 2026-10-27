# Brooks Kelly public resources

Public First-Home Resource Library, served at https://resources.brookskellyteam.com/fthb/.

The `fthb/` directory was initially a byte-identical copy of `public/fthb/` from chasepkelly/lead-triage-crm at d56fbaa6d97abad82127a5557e3edb2dde793f94. It matched all 18 live files at https://crm.themortgagechaser.com/fthb/ on October 26, 2026. Keep the original CRM paths available for previous links.

Deployment: GitHub Pages from the root of `main`, with `.nojekyll`. The custom-domain CNAME points to `chasepkelly.github.io`. No application build, private records, credentials, or backend are included.

To update the seven guided tools, edit the public schemas/shared template and run `python3 scripts/generate-tools.py`. Review and test changes before committing and publishing; verify the deployed HTTPS pages and assets. Keep payment on its separately reviewed implementation.

## Payment workbook pilot

The interactive payment workbook is documented in [WORKBOOK-PILOT.md](WORKBOOK-PILOT.md), including data handling, print behavior, backend contract, tests and the deployment gate. Payment uses the reviewed five-question version2 flow. The other seven resources now use the shared version3 guided-tool implementation described below.

## Seven guided tools

See [GUIDED-TOOLS.md](GUIDED-TOOLS.md) for the seven compact interactive resources, shared renderer, version3 contract, generation and release verification. Payment remains on its reviewed version2 implementation.
