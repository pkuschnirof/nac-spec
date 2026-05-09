# RPA + Testing breakthrough: one manifest, every operator class

> Status: 2026-05-09. Companion to NAC v2.0.0-rc5 release notes
> and to the `@nac-spec/test-runner` package (`packages/test-runner/`).

## TL;DR

NAC v2.0 + the autonomous test runner (`@nac-spec/test-runner`)
collapse three historically separate engineering disciplines into
a single surface:

1. **End-to-end testing** (Selenium, Playwright, Cypress)
2. **RPA** (UiPath, Automation Anywhere, Power Automate)
3. **AI agent integrations** (Anthropic Computer Use, OpenAI
   Operator, voice assistants, chat copilots)

All three reduce to the same operation: read the NAC manifest,
plan an action sequence, dispatch. Same planner, same assertion
primitives, same coverage metric. **One manifest, one driver,
every operator class.**

This document explains what that means, what it costs, and what
it unlocks.

---

## 1. The three-headed cost problem

Before NAC, a typical SaaS that wants to ship "test coverage +
RPA-friendliness + AI agent support" pays three independent costs:

### 1a. E2E test suite

- Hand-written selectors (`[data-testid=foo]`, XPath, CSS).
- Brittle: every refactor or copy change breaks N tests.
- Locale-blind: tests written in English don't survive translation.
- Cross-page tests are state-machine code (`storageState`,
  `context.newPage()`, multi-tab orchestration).
- Result: 30-50% of an engineering team's time on test maintenance,
  per published industry surveys.

### 1b. RPA enablement

- Vendor's selector recorder produces fragile locators.
- Each UI revision triggers an RPA "regression sprint" where
  every recorded flow is re-recorded.
- The RPA team works on a parallel surface from the dev team --
  changes to the UI don't reach the RPA scripts until someone
  notices something broke in production.

### 1c. AI agent / Computer Use integration

- The agent needs to "know" the app. Today this means either
  (a) prompt-engineering a giant system prompt with screenshots
  and HTML excerpts, or (b) fine-tuning a model on the app, or
  (c) hand-writing tools/MCP-actions that wrap each privileged
  backend call.
- Path (a) breaks on every UI change.
- Path (b) is expensive AND privileges trained-against agents over
  fresh ones, breaking accessibility equity.
- Path (c) gives the agent admin keys -- moving the security
  boundary from the UI to a parallel API surface, which then
  needs its own audit + rate limiting + role checks (NAC RFC
  sec 0a.1 on why this is dangerous).

---

## 2. What changes with NAC v2.0 + test-runner

The unifying observation: **all three problems are the same
problem**. They all need a stable, semantic, locale-tolerant
description of what the UI exposes, plus a way to dispatch
actions against that description.

NAC's `describe_v2()` IS that description. The autonomous runner's
`plan()` + `runIntent()` IS that dispatch.

### One snapshot, three consumers

| Consumer | What it does with `describe_v2()` |
|---|---|
| **CI test suite** | Runs `runIntent(page, { intent, expected_terminal_slug })` to assert a user journey works end-to-end. |
| **RPA bot** | Identical call from Python or .NET; dispatches against the same UI a human operates. No bot-specific surface. |
| **AI agent** (Computer Use, voice copilot, chat assistant) | Reads the same manifest into its context window; matches user phrases to slugs via NAC's matcher; dispatches via the same primitives. |
| **Human user with assistive tech** | Reads `label_i18n` through the screen reader. Same labels the matcher uses. |

The same plan that a unit test asserts is the plan that the agent
will produce in production. **If the test passes, the agent path
works.** That's the key claim.

### Cost collapse

| Concern | Pre-NAC | With NAC + runner |
|---|---|---|
| Test maintenance | 30-50% of dev time | Slug renames are caught by matcher; intent stays stable. |
| RPA suite refresh | Per-release re-recording | Zero; the bot reads the same manifest. |
| Agent integration | Prompt-engineering + fine-tuning | Manifest is the prompt. |
| Security review | UI + API + agent surfaces | UI surface only (sec 16.6). |
| i18n testing | Per-locale test corpus | One intent, matcher resolves any locale. |

---

## 3. Eight things this enables that didn't exist before

### 3.1 Self-writing tests

An AI assistant receives a goal in natural language ("verify a
user can configure SMTP and that the form validates port 0").
It:

1. Reads the live `describe_v2()` of the running app.
2. Plans a sequence using the runner's pure `plan()` function.
3. Predicts the expected terminal slug.
4. Emits a Playwright spec that calls `runIntent()` with that
   intent + asserts the navigation completed.
5. Runs it; if it fails, inspects the structured `result.steps`
   to see EXACTLY which step diverged, then proposes a fix to
   either the UI or the test.

The test author writes intents, not selectors. The agent fills
in the rest, mechanically.

### 3.2 Equivalence under operator class

```js
// Production agent code:
const plan = NACTestRunner.plan({ intent: userMessage, snapshot });
await NACTestRunner.runIntent(page, { intent: userMessage });

// Test code:
test('agent handles "configure SMTP"', async ({ page }) => {
  const result = await runIntent(page, { intent: 'configure SMTP' });
  expect(result.passed).toBe(true);
});
```

**Same code path.** If the test goes green, the production agent
path works. If the production agent reports a regression, the
same intent reproduces it in CI. There is no agent-specific bug
class anymore -- it's all UI-correctness.

### 3.3 Cross-page tests without state machines

Today: `await context.storageState()`, manual session juggling,
sticky cookies, signed JWT carry-over.

NAC: the intent travels in a URL query (`?nac_autopilot=...`).
Each page boots, declares its own sitemap, and resumes the
continuation. **No client-side state. No session orchestration
in test code.**

This works identically against:
- Single-page apps (router + virtual nav).
- Multi-page apps (every link is HTTP GET).
- Hybrid apps (some routes SPA, others full reload).

The runner doesn't know or care.

### 3.4 Coverage as a first-class metric

`sitemapCoverageReport()` answers: of the N declared UI surfaces,
what fraction has any test ever reached? `treeCoverageReport()`
answers the same at the slug level.

Two consequences:

- A11y audit and test coverage become **the same metric**. Every
  `data-nac-id` is both a test target and an accessibility
  landmark.
- "Dead UI" -- elements rendered but never reached by any test
  or any user -- shows up as missing slugs. Refactor candidates
  surface automatically.

### 3.5 Locale-equality by construction

Most i18n testing today is "the string `Settings` appears on
the page in language X". That validates the translation, not the
operability.

NAC: the matcher resolves `intent="configurar SMTP"` against
`label_i18n.es`, then `intent="SMTP einstellungen"` against
`label_i18n.de`, against the SAME slug. One assertion -- "did
the user reach `settings.system.smtp.save`?" -- proves
operability across all 10 supported locales.

### 3.6 Adversarial / fuzzing tests

Generate 100 paraphrases of "configurar SMTP" in 10 locales using
an LLM. Run all 1000 through `runIntent()`. Assert all reach
`settings.system.smtp.save`. The handful that fail are paraphrase
gaps in `label_i18n`; the manifest gets fixed, not the test code.

### 3.7 Performance budgets per step

```js
const result = await runIntent(page, { intent });
const slowStep = result.steps.find(s => s.latency_ms > 1000);
expect(slowStep).toBeUndefined();
```

The runner already captures per-step latency. Performance
regressions surface as "step X went from 220ms to 1400ms"
without bespoke instrumentation.

### 3.8 Security testing by isolation

Run the test suite with a CI worker that has **only** the user's
session token -- no admin keys, no service accounts, no
backend privilege. The suite still passes.

That's a live proof of the equality-of-access security model
(spec sec 16.6). If a malicious actor compromises the test
worker, the blast radius is exactly the user's UI scope --
the same scope a malicious human user could reach -- because
there is no privileged operator class (no `source.type='admin'`,
no agent-only API).

The test suite **is** the security proof.

---

## 4. Concrete impact on RPA

RPA today:

- 90% of UiPath / Automation Anywhere bots break on UI changes.
- "Bot maintenance engineers" are a job category that exists
  only because selectors are unstable.
- Bots have less context than human operators (they don't see
  tooltips, hover-revealed actions, ARIA descriptions).

RPA on NAC:

- The bot reads `describe_v2()` once per page; gets every
  available action with its `label_i18n` and role.
- Slug renames trigger a re-run of the matcher with the new slug
  set. Most renames don't change the matcher's confidence on the
  user's natural-language phrase.
- The bot has the SAME context an assistive-tech user has -- the
  `label_i18n`, the role, the `description_i18n`, the recovery
  candidates on no-match. No more context gap.

Practical migration path for an existing UiPath suite:

1. Add `data-nac-id` + `label_i18n` to every component the bot
   touches. Most apps already have `aria-label` or
   `data-testid`; mapping is mechanical.
2. Replace UiPath selectors with `runIntent(page, { intent })`
   calls.
3. Bot maintenance engineers transition into bot **author**
   roles. The tooling carries the maintenance.

---

## 5. Concrete impact on testing

### 5.1 Test-pyramid inversion

Classic test pyramid: lots of unit tests, few E2E tests because
E2E is expensive.

NAC: `runIntent` makes E2E tests **deterministic and fast**
(planner is pure, dispatch is millisecond-level). The pyramid
tilts: fewer unit tests focused on logic, far more
intent-level tests focused on user outcomes. The unit/E2E
maintenance ratio inverts.

### 5.2 PR review surface

When a developer renames a slug, the matcher's confidence drops
on every test that referenced the old slug. CI surfaces this as
"slug X removed, tests Y / Z lost confidence" -- BEFORE the
tests run, BEFORE production. Slug rename becomes a code-review
checklist item, not a midnight production incident.

### 5.3 Visual diff testing without image comparison

Visual regression today: pixel diff a baseline screenshot. Slow,
flaky, locale-specific.

With NAC: snapshot the manifest BEFORE and AFTER. Diff the
slugs. Any slug that disappeared OR changed role OR lost a
locale OR changed action set is a visual change. **Visual diff
becomes a structural diff.** Faster, deterministic, locale-
agnostic.

### 5.4 Self-healing tests

When `runIntent` fails because the slug matcher confidence drops
(because someone renamed the underlying slug), the runner can
emit an `auto-fix proposal`: "replace `'old.slug'` with
`'new.slug'` in tests/foo.spec.js -- new slug confidence 0.92".
A human approves, CI re-runs. The test never goes red for a
mechanical rename.

---

## 6. What the manifest is now, conceptually

Before: a per-plugin accessibility hint table, optional, often
incomplete.

Now: a **public contract** between the UI and every consumer:
- The CI test suite.
- The accessibility tools.
- The RPA bots.
- The AI agents.
- The intermediary LLM.
- The human user via voice / chat.

When the manifest is the contract, the team that maintains the
manifest IS the team that owns "is the app operable". Test
maintenance, accessibility, RPA, agent support all flow from one
artifact. The historical separation of those concerns goes away.

---

## 7. What it costs

Honest accounting:

- **Per-component overhead at authoring time.** Five extra
  attributes per element + one manifest call per plugin. ~10
  characters per element on average. Authoring tools (codemod,
  babel/vue/svelte plugins under `packages/`) cut this further.
- **Discipline at refactor time.** Renaming a slug is a contract
  change. Tooling (DevTools extension, validator) flags it.
- **Initial migration of a legacy app.** `NAC.adopt()` +
  `NAC.autoRegister.watch()` cover most cases without DOM rewrite,
  but the team has to walk the surface once.

Net: the cost of paying these once is far smaller than paying
the three separate costs in section 1 every quarter forever.

---

## 8. Where this goes next

- **rc6 / v2.0 stable**: ship `@nac-spec/test-runner` to npm
  alongside the spec. Adopters can `npm install` and write tests
  on day one.
- **Agent SDK adapters**: thin glue between popular agent
  frameworks (LangChain, Anthropic SDK, OpenAI tools) and the
  runner's pure `plan()` so an agent's tool inventory is
  populated FROM the manifest, not FROM hand-coded function
  schemas.
- **Coverage CI integration**: pre-built GitHub Action that posts
  sitemap coverage to PR comments, fails CI when coverage drops.
- **Recorder**: a browser extension that records a human user's
  session as a sequence of `runIntent()` calls. The human walks
  the flow once; the suite is generated.

---

## Closing

The "AI agents need backend admin access" pattern is a security
disaster that the industry was sleepwalking into. The "RPA bots
break every release" pattern was a tax we'd accepted as
unavoidable. The "E2E tests rot" pattern was a folklore.

Each of those was a symptom of the same underlying gap: there
was no semantic, public, machine-readable description of what
the UI exposes. NAC v2.0 fixes that. `@nac-spec/test-runner` is
the first consumer that exercises the fix at scale.

The downstream consequence -- one manifest, every operator class
-- is the breakthrough.

---

*Author: Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>,
collaborator: Claude (Anthropic). License: MIT, same as NAC.*
