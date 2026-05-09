# @nac-spec/test-runner

> NAC-driven autonomous test runner. Plan from `describe_v2()` +
> sitemap, execute on Playwright, assert + measure UI coverage.
> Any operator class --human voice, RPA bot, AI agent-- drives
> the same suite.

`v0.1.0` -- requires NAC v2.0.0-rc5+ on the page under test.

## What this is

A **test runner** that thinks the way a human user does. Instead
of writing brittle CSS / XPath / `data-testid` selectors, you
hand it a **natural-language intent** ("configurar SMTP", "create
a contact") and it:

1. Reads the live `NAC.describe_v2()` snapshot of the page.
2. Resolves the intent to a slug -- match by label, locale-tolerant.
3. Plans the action sequence (single click? cross-page navigation
   via the sitemap? reject with top-3 candidates?).
4. Executes the plan in a real browser via Playwright.
5. Reports a structured result with per-step latency + status,
   plus dispatched-slug coverage for the run.

The same path resolution that a chatbot LLM would do at runtime
is what runs in the test. Equality of access (NAC RFC sec 0a)
holds across operator classes -- so your test suite proves your
agent integration works.

## Why this exists

Today's E2E testing is broken in three ways:

| Problem | Status quo | NAC test-runner |
|---|---|---|
| **Selectors break on refactor.** | `[data-testid=foo]`, hand-written. | Slugs are semantic; `label_i18n` survives reskin. |
| **Tests need cross-page orchestration code.** | `await context.storageState()`, manual session juggling. | Intent travels in URL query; cross-page is HTTP-native. |
| **One suite per operator class.** | Selenium suite + accessibility suite + agent suite. | One suite. Same surface a human, a screen reader, an RPA bot, an AI agent each see. |

And one new gap that didn't exist before:

| Problem | NAC test-runner |
|---|---|
| **AI agent integrations are usually untested in CI.** | Same planner runs in CI as in the agent. If your agent regresses, your tests catch it. |

## Quickstart

```bash
npm install --save-dev @nac-spec/test-runner @playwright/test
```

```js
const { test, expect } = require('@playwright/test');
const {
  runIntent,
  assertNavigationCompletes,
  sitemapCoverageReport
} = require('@nac-spec/test-runner');

test('user can configure SMTP from the dashboard', async ({ page }) => {
  await page.goto('https://app.example.com/dashboard');

  const result = await runIntent(page, {
    intent: 'configurar SMTP',
    fill_values: {
      'settings.system.smtp.host': 'smtp.gmail.com',
      'settings.system.smtp.port': 587,
      'settings.system.smtp.user': 'demo@example.com'
    },
    expected_terminal_slug: 'settings.system.smtp.save'
  });

  assertNavigationCompletes(result, 'settings.system.smtp.save');
  expect(result.passed).toBe(true);
});
```

That's it. No selectors. The intent string survives DOM reshuffles,
copy changes, locale switches, and even the SMTP form moving to a
different page (the sitemap covers that).

## API surface

### Pure (no DOM, deterministic, fully unit-tested)

```js
const { plan, resolveIntent } = require('@nac-spec/test-runner');

// Plan from a snapshot:
const p = plan({
  intent: 'configurar SMTP',
  snapshot: NACSnapshotFromYourPage,
  fill_values: {...},
  continuation_value: 'smtp_demo'
});
// p.strategy === 'sitemap_navigate' | 'tree_dispatch' | 'reject'
// p.steps:    ordered action list
// p.candidates_top3: when strategy === 'reject'
// p.trace:    human-readable explanation

// Resolve an intent to a slug:
const r = resolveIntent({ intent, snapshot });
// r.resolved_slug, r.resolved_source ('tree'|'sitemap'), r.confidence
```

### With Playwright

```js
const { runIntent, snapshot, dispatchByNacId } = require('@nac-spec/test-runner');

await snapshot(page);                // returns describe_v2()
await dispatchByNacId(page, 'topbar.settings');
await runIntent(page, { intent: '...', fill_values: {...} });
```

### Assertions

```js
const {
  assertNavigationCompletes,
  assertPlanShape,
  assertConfidence
} = require('@nac-spec/test-runner');

assertNavigationCompletes(result, 'settings.system.smtp.save');
assertPlanShape(plan, { strategy: 'sitemap_navigate', has_page_break: true });
assertConfidence(result, 0.7);   // matcher confidence floor
```

### Coverage

```js
const { sitemapCoverageReport, treeCoverageReport } = require('@nac-spec/test-runner');

const report = sitemapCoverageReport({
  sitemap_paths: snap.sitemap.paths,
  reached_slugs: aggregateAcrossAllTests(...)
});
// report.percent, report.missing, report.by_tag
```

## What runIntent gives you back

```js
{
  passed: true,
  intent: 'configurar SMTP',
  resolved_slug: 'settings.system.smtp',
  strategy: 'sitemap_navigate',
  confidence: 0.85,
  steps: [
    { action: 'click', target_slug: 'topbar.settings',
      started_at: 1715000001234, ended_at: 1715000001838,
      latency_ms: 604, status: 'ok' },
    { action: 'fill',  target_slug: 'settings.system.smtp.host',
      latency_ms: 312, status: 'ok' },
    /* ... */
    { action: 'click', target_slug: 'settings.system.smtp.save',
      latency_ms: 198, status: 'ok' }
  ],
  latency_ms_total: 4127,
  log: ['snapshot ok: ...', 'plan: strategy=sitemap_navigate ...', ...],
  dispatched_slugs: [
    'topbar.settings', 'settings.system.smtp.host', /* ... */
    'settings.system.smtp.save'
  ]
}
```

Every step carries millisecond timing. CI can assert
"STEP 1 -> STEP 5 completed under 3000ms" without parsing logs.

## Design properties

- **Visible tree is authority.** The planner NEVER fabricates a
  step against a slug that's not in the visible tree at dispatch
  time. The sitemap is metadata, not a license.
- **Pure planner.** `plan()` is a pure function -- snapshot in,
  plan out. Trivially unit-testable, browser-independent.
- **Locale tolerant.** Intent matching works against
  `label_i18n` in any of NAC's 10 supported locales, regardless
  of the page's primary locale. "Settings", "Configuracion",
  "Settings", "Reglages" all resolve.
- **Cross-page transparent.** The runner detects when a step
  crosses a page break (the planner flagged it
  `requires_page_break_guard`), decorates the anchor with a
  continuation query, follows the navigation, re-snapshots, and
  re-plans. No client-side state, no session juggling.
- **Recovery on no-match.** Below-threshold intents return
  `strategy: 'reject'` with `candidates_top3` -- the runner
  surfaces "did you mean X / Y / Z" rather than silently passing.

## Coverage as a first-class metric

Today, accessibility audits and E2E tests measure different things.
NAC unifies them: every `data-nac-id` is both an accessibility
landmark AND a test target. So `treeCoverageReport()` answers
**both** questions at once -- "which UI elements are dispatchable
from a test?" and "which UI elements are exposed to assistive
technology?".

`sitemapCoverageReport()` is the cross-page equivalent: "which
declared paths in the app surface have any test ever reached?".

Hook these into your CI:

```js
// at end of test suite
const treeCov = treeCoverageReport({
  tree_entries: collectAllSnapshots(),
  dispatched_slugs: collectAllDispatchedSlugs()
});
console.log(`UI coverage: ${treeCov.percent}% (${treeCov.reached_slugs}/${treeCov.total_slugs})`);
if (treeCov.percent < 80) process.exit(1);
```

## Running this package's own tests

```bash
node tests/run-all.js
# 25 passed, 0 failed
```

Pure-JS test suite, no Playwright dependency at the unit level.

## Related

- [`@nac-spec/playwright-fixture`](../playwright-fixture) --
  Playwright fixture style (`page.nac.find()`,
  `expect.toMatchNacSnapshot`) for tests that want classic
  selector-style.
- NAC v2.0 spec sec 16 (intermediary contract) + sec 17 (sitemap)
  for the runtime semantics this runner depends on.
- `docs/RPA_AND_TESTING_BREAKTHROUGH.md` for the conceptual deep
  dive on what changes when one manifest serves all operator
  classes.

## License

MIT.
