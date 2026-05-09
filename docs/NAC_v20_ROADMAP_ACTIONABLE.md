# NAC v2.0 -- Actionable Roadmap

**Status**: Plan of work, draft.
**Date**: 2026-05-09.
**Authors**: Pablo Adrian Kuschniroff, Sumi.
**License**: MIT.

This is the operational counterpart to `NAC_v20_SCOPE_AND_ECOSYSTEM.md`.
That document scopes WHAT v2.0 ships and WHY. This one scopes WHEN,
WHO, and HOW MUCH.

The v1.9.0 release tag is on commit `185c7df` (May 2026). This
roadmap projects v2.0.0 release between **2026-08-01 and 2026-09-01**.

**2026-05-09 update**: the originally-planned v1.9.1 HMAC stepping
stone is **superseded** -- absorbed directly into v2.0 along with
the new `user_gesture_attested` primitive that closes the user/script
impersonation paths the HMAC patch alone left open. v2.0 ships the
complete tri-source attestation as a single peer-reviewed unit. New
phase 5.5 (Yujin migration as case study) inserted before closing
peer review so the panel evaluates v2.0 with a real adopter case in
hand, not just the spec.

---

## 1. Phase overview

| Phase | Wall-clock | Workstream parallelism | Gate |
|---|---|---|---|
| 1 -- v2.0 RFC (incl. HMAC + isTrusted) | ~9 days | sequential (Sumi authoring) | RFC published in repo |
| 2 -- Peer review of RFC + scope doc | ~3 days wall-clock | 4-6 reviewers parallel | arbiter pass |
| 3 -- Core spec + runtime impl (HMAC + isTrusted included) | ~16 days | F/G/H/I workers parallel per primitive | conformance suite green |
| 4 -- Tooling impl | ~21 days | independent workstream | each plugin shipped + smoke-tested |
| **4.5 NEW -- Refactor + test demo (example.php) for v2.0** | **~4 days** | **Sumi + 1 worker** | **demo passes conformance NAC-3 + showcases all 8 primitives** |
| 5 -- Conformance suite + perf benchmarks | ~7 days | parallel with phase 3-4 | budget validated on low-tier mobile |
| **5.5 NEW -- Yujin migration as case study** | **~5 days dev + 2 days documentation** | **F/G/H workers parallel; Sumi documents** | **case-studies/yujin.md published** |
| 6 -- Closing peer review of v2.0 implementation | ~3 days wall-clock | same panel + Yujin case study + demo attached | arbiter sign-off |
| 7 -- Tag + announce v2.0.0 | ~2 days | sequential | tag pushed |

**Total wall-clock**: ~72 days (aggressive) to ~99 days (realistic).
**Earliest v2.0 release**: 2026-08-05.
**Realistic v2.0 release**: 2026-09-05.

**Phase 0 (v1.9.1 HMAC stepping stone) was eliminated 2026-05-09**:
HMAC mandatory + `user_gesture_attested` primitive ship together in
v2.0 to close the user/script impersonation paths the HMAC patch
alone left open. See scope doc section 4b for the threat model.

---

## 2. Phase 0 -- ELIMINATED (2026-05-09)

The originally-drafted v1.9.1 HMAC stepping stone (see
`docs/V1.9.1_HMAC_MANDATORY_PATCH.md`, kept for historical record)
was superseded by the decision to absorb HMAC mandatory + the new
`user_gesture_attested` primitive directly into v2.0.

**Reason**: HMAC mandatory only on `source.type === 'agent'` events
is half a defence. A malicious agent can declare `type='user'` or
`type='script'` and bypass the requirement entirely. Closing all
three impersonation paths (forged-agent, user-impersonation,
script-claiming-user) requires the `user_gesture_attested` field
derived from DOM `Event.isTrusted`. Shipping HMAC alone first would
publish a partial defence that the next iteration must immediately
amend.

**Outcome**: v2.0 ships the complete tri-source attestation
(HMAC + isTrusted derivation + matrix enforcement at NAC-3) as a
single peer-reviewed unit. See scope doc section 4b for the threat
model and section 4.7b for the API surface.

**The original HMAC patch DRAFT remains in
`docs/V1.9.1_HMAC_MANDATORY_PATCH.md` for historical context but is
flagged as superseded.** No v1.9.1 release will be cut.

---

## 3. Phase 1 -- v2.0 RFC

**Output**: `nac-spec/RFC_v2.0.0.md` -- a structured spec proposal
mirroring the scope document, but in normative form (each section
is "shall/may/must" language, with reference impl signatures).

### 3.1 Items

| # | Item | Owner | Days |
|---|---|---|---|
| 1 | RFC outline (mirroring scope doc sections) | Sumi | 0.5 |
| 2 | Section: hierarchical scope constructor (API, semantics, error handling) | Sumi | 1 |
| 3 | Section: autoRegister (DOM walk algorithm, throttle/batch semantics) | Sumi | 1 |
| 4 | Section: adopt (selector matching, derive contract, lint) | Sumi | 1 |
| 5 | Section: bridgeShadowRoot (recursion rules, closed-shadow-root handling) | Sumi | 0.5 |
| 6 | Section: bridgeIframe (postMessage protocol -- mini-spec) | Sumi | 1.5 |
| 7 | Section: declareVirtual (resolver contract, async-flag, pagination semantics) | Sumi | 1 |
| 8 | Section: captureEphemeral (ring buffer semantics, GC) | Sumi | 0.5 |
| 9 | Section: setTenantPrefix + multi-tenant lint | Sumi | 0.5 |
| 10 | Section: backward compat (strict-superset proof) | Sumi | 0.5 |
| 11 | Section: perf budget (numbers + measurement methodology) | Sumi | 0.5 |
| 12 | Section: tooling (link to phase 4 scope) | Sumi | 0.25 |
| 13 | Section: deferrals to v2.1+ | Sumi | 0.25 |

**Total**: ~9 days wall-clock for sole author, ~6 days if Sumi runs
2-3 sections in parallel via /loop.

---

## 4. Phase 2 -- Peer review of RFC + scope doc

### 4.1 Items

| # | Item | Owner | Days |
|---|---|---|---|
| 1 | Send `NAC_v20_SCOPE_AND_ECOSYSTEM.md` + `RFC_v2.0.0.md` + `PEER_REVIEW.md` (v1.9 trail) to 6 reviewers | Pablo + Sumi | 0.5 |
| 2 | Reviewers respond (DeepSeek, ChatGPT, Mistral, Grok, MS Copilot, Claude arbiter) | reviewers | 2 |
| 3 | Aggregate findings + author response cycle | Sumi | 1 |
| 4 | RFC delta v2.0.0-rc1 -> v2.0.0-rc2 incorporating findings | Sumi | 1 |
| 5 | Optional second arbitration if reviewer disagreement is >30% on any single primitive | Sumi + Pablo | 1 (conditional) |

**Total**: ~3-5 days wall-clock.

**Gate**: arbiter pass on RFC ("conditional yes" minimum) before
any implementation code lands.

**Acceptance criteria**:
- All 10 reviewer questions in scope doc section 11 answered.
- No "critical-path" findings unresolved.
- Strict-superset invariant verified (no breaking change).

---

## 5. Phase 3 -- Core spec + runtime impl

**Workstream**: workers F/G/H/I parallel per primitive. Each primitive
is an independent unit with clear input/output contract from the RFC.

### 5.1 Worker assignments (target)

| Primitive | Worker | Days | Files touched |
|---|---|---|---|
| `NAC.scope()` constructor | F | 2 | `js/nac.js` (~120 lines), `tests/scope.spec.js` (~200 lines) |
| `NAC.autoRegister()` + DOM walker + cache | G | 2.5 | `js/nac.js` (~180 lines), `tests/auto-register.spec.js` (~250 lines) |
| `NAC.adopt()` + scoped observer | G | 3.5 | `js/nac.js` (~250 lines), `tests/adopt.spec.js` (~300 lines) |
| `NAC.bridgeShadowRoot()` | H | 1.5 | `js/nac.js` (~80 lines), `tests/shadow.spec.js` (~150 lines) |
| `NAC.bridgeIframe()` + postMessage protocol | H | 3 | `js/nac.js` (~180 lines), `js/nac-iframe-channel.js` (~80 lines), `tests/iframe.spec.js` (~250 lines) |
| `NAC.declareVirtual()` | I | 2 | `js/nac.js` (~140 lines), `tests/virtual.spec.js` (~180 lines) |
| `NAC.captureEphemeral()` | I | 1.5 | `js/nac.js` (~110 lines), `tests/ephemeral.spec.js` (~140 lines) |
| `NAC.setTenantPrefix()` + lint upgrade | F | 1 | `js/nac.js` (~40 lines), `tests/tenant.spec.js` (~80 lines) |
| Spec normative text | Sumi | 3 | `spec/NAC-v2.0.md` (~700 lines net-new) |

**Total wall-clock with 4 workers parallel**: ~5-6 days dev (slowest
chain is `adopt` 3.5d + `bridgeIframe` 3d sequential within worker
H).

**Sumi's spec write-up runs in parallel with workers; integration day
after worker completion.**

### 5.2 Gates

- Each primitive: tests pass + Sumi review + Pablo touchpoint OK.
- Integration: `nac.js` final has zero lint warnings, zero conformance
  failures, zero perf budget violations on the synthetic test page.
- Spec text mirrors implementation 1:1 (no spec drift).

---

## 6. Phase 4 -- Tooling impl

**Workstream**: independent of phase 3. Can start as soon as RFC
section signatures are stable. Probably week 2-3 of phase 3.

### 6.1 Items

| Tool | Owner | Days | Notes |
|---|---|---|---|
| `@nac-spec/babel-plugin-react` | F | 3 | injects `data-nac-id` from React component name + key prop. Tests against React 17/18/19. |
| `@nac-spec/vue-plugin` | G | 2 | analogous for Vue 3 SFC. |
| `@nac-spec/svelte-preprocessor` | H | 2 | analogous. |
| `@nac-spec/devtools` (Chrome ext) | I | 5 | live manifest tree, validate, fix suggestions. Manifest V3, Firefox port follows. |
| `@nac-spec/codemod` (CLI tool) | F | 4 | scan codebase, infer NAC annotations, output PR. ~60% auto-coverage target. |
| `@nac-spec/cookbook` (30 patterns) | Sumi + asistido AI | 5 | each pattern: HTML + manifest + tests + 1-paragraph explanation. |
| `@nac-spec/rules-stripe` | community + Sumi seed | 1 | reference rule for adopt. |
| `@nac-spec/rules-slack` | community + Sumi seed | 1 | reference rule. |
| `@nac-spec/rules-mapbox` | community + Sumi seed | 1 | reference rule. |
| Repo packaging (npm publishing config) | Sumi | 2 | monorepo with lerna or nx, CI publishes on tag. |

**Total wall-clock with 4 workers parallel**: ~14-16 days.

**Realistic**: 21 days incl. testing on real codebases (greenfield
demo + Yujin brownfield).

### 6.2 Optional (nice-to-have, can defer to v2.0.x patches)

- `@nac-spec/storybook-addon` -- shows manifest tree per story.
- `@nac-spec/playwright-fixture` -- reusable fixture for E2E tests.
- `@nac-spec/percy-integration` -- visual regression with manifest
  diffs.

---

## 6b. Phase 4.5 -- Refactor + test demo (example.php) for v2.0

**Why this exists (added 2026-05-09)**: the public demo at
`yujin.app/nac-spec/example.php` is the **first thing reviewers and
adopters touch** when they evaluate NAC. It must showcase v2.0
primitives in working form before the closing review opens. The
demo doubles as **smoke-test of the SDK**: if babel plugin / devtools
extension / cookbook patterns work on the demo, they likely work
elsewhere; if they don't, the gap surfaces here cheap, before Yujin
migration commits to anything.

The demo is also the **NAC-3 conformance showcase**: it must
self-validate at NAC-3 strict with zero error-severity findings, or
the public spec lacks visible proof of conformance.

### 6b.1 Items

| # | Item | Owner | Days |
|---|---|---|---|
| 1 | Audit current `example.php` v1.9 against v2.0 spec; list every primitive that should be demonstrated (8 from scope doc section 4 + HMAC + isTrusted) | Sumi | 0.5 |
| 2 | Refactor shell of demo to use `NAC.scope()` hierarchical constructor (replace flat plugin-namespaced slugs with shell.section.element pattern) | Sumi | 0.5 |
| 3 | Add a section showcasing `NAC.autoRegister()` -- a dynamic catalog that adds cards on click; each new card auto-registers with proper i18n + a11y_hint | F (worker) | 0.5 |
| 4 | Add a section showcasing `NAC.adopt()` -- embed a small "uncompliant third-party" widget (a hand-coded toolbar) and adopt it via selector rules | F | 0.5 |
| 5 | Add a Shadow DOM Web Component example + `NAC.bridgeShadowRoot()` demo | G | 0.5 |
| 6 | Add a virtualized list section (1000-item synthetic) with `NAC.declareVirtual()` showing the agent operating on row 472 directly | G | 0.5 |
| 7 | Add an ephemeral toast capture demo (`NAC.captureEphemeral()`) where the agent reads the toast trail | H | 0.25 |
| 8 | Wire HMAC mandatory + register provenance secret + add a panel that shows the difference between signed and unsigned agent events (the latter rejected) | H | 0.5 |
| 9 | Add a `user_gesture_attested` showcase: panel with two buttons -- one clicked physically, one triggered by JS -- showing isTrusted distinction in real time | Sumi | 0.5 |
| 10 | Update `example-navmap.js` + `example.js` autopilot to demo each new primitive in order, with naturalized speech + screen-reader compatible captions | Sumi | 0.5 |
| 11 | Run conformance suite against the migrated demo; fix every error-severity finding | Sumi | 0.5 |
| 12 | Lighthouse + axe-core audit; fix to AAA where v2.0 enforces it | Sumi | 0.25 |
| 13 | Cross-browser smoke (Chrome / Firefox / Safari / Edge / mobile WebView) | Pablo | 0.5 |
| 14 | Update `example.php` README header + assetVersion bump | Sumi | 0.1 |

**Total**: ~5.5 days dev (parallelisable to ~3.5 wall-clock with
F/G/H workers in parallel) + 0.5 day Pablo cross-browser.

### 6b.2 Gates

- Demo passes conformance NAC-3 strict with zero error-severity
  findings.
- Lighthouse a11y >= 95 on the demo home page.
- Manual NVDA + VoiceOver pass on the autopilot tour.
- All 8 primitives + HMAC + isTrusted demonstrably working.
- Cross-browser smoke green.

### 6b.3 Why this is BEFORE Yujin case study (phase 5.5)

Three reasons:
1. **Smoke test the SDK cheap**: the demo is small. If babel
   plugin breaks on it, that finding costs 1 hour to fix on the
   demo vs days on Yujin.
2. **Reviewer touchpoint**: closing review reviewers will
   reasonably probe the demo first ("does NAC.describe() work as
   advertised?") before reading the case study.
3. **Adopter onboarding**: anyone reading docs and pointing at
   the demo gets a v2.0-correct showcase from day one. If demo
   stays on v1.9, every new adopter starts from the wrong example.

### 6b.4 Outputs the closing review can consume

- `https://yujin.app/nac-spec/example.php` running v2.0 live
- Demo conformance results published in repo
- Demo perf benchmarks (separate from Yujin's, smaller scope)
- Side-by-side diff "before/after" of demo source per primitive
  (educational for adopters)

### 6b.5 What this phase does NOT do

- It does NOT replace the conformance suite (phase 5). Demo
  passing is necessary but not sufficient.
- It does NOT replace the Yujin case study. Demo is synthetic;
  Yujin is real.
- It does NOT delay v2.0 if a primitive proves unworkable on the
  demo -- such a finding triggers an RFC delta and a new review
  round (slot reserved in phase 6).

---

## 7. Phase 5 -- Conformance suite + perf benchmarks

**Workstream**: starts during phase 3, finalises after phase 3+4.

### 7.1 Items

| # | Item | Owner | Days |
|---|---|---|---|
| 1 | Conformance suite: 80+ test cases per primitive | Sumi + workers | 4 |
| 2 | Synthetic perf fixture: 100 / 1000 / 10000 elements | Sumi | 1 |
| 3 | Real-world perf fixture: clone of Yujin shell + hub + modal | Sumi | 1 |
| 4 | Benchmark on 6 device tiers (desktop high/mid/low + mobile high/mid/low) | Pablo (manual) | 2 |
| 5 | `perf_probe` validation: hard fail thresholds met | Sumi | 0.5 |
| 6 | Conformance dashboard published in repo (CI page) | Sumi | 1 |
| 7 | Compatibility matrix (Chrome, Firefox, Safari, Edge, mobile WebView) | Sumi | 1 |

**Total**: ~10 days wall-clock, can parallelise w/ phase 3-4.

**Gate**: every primitive passes conformance + every device tier
within perf budget.

---

## 7b. Phase 5.5 -- Yujin migration as case study

**Why this exists (added 2026-05-09)**: the Yujin CRM migration is
the single highest-leverage piece of evidence the closing peer
review can consume. Reviewers seeing only the spec + reference
runtime + conformance suite have to infer adoption cost. Reviewers
seeing a real adopter brownfield migration with commit-by-commit
metrics have ground truth.

This phase does NOT push Yujin migration into NAC's release
critical-path -- it runs in parallel with phases 3-5 once the v2.0
runtime stabilises mid-implementation. The case study delivers
input to the closing review (phase 6) but does not block phases 1-5.

### 7b.1 Items

| # | Item | Owner | Days |
|---|---|---|---|
| 1 | Migrate Yujin shell (topbar + sidebar + Mokuji wrap) to v2.0 strict | F (worker) | 1 |
| 2 | Migrate Yujin Hub primitive (mountUnifiedHubShell) to v2.0 strict | G (worker) | 1.5 |
| 3 | Migrate Yujin Modal primitive (focus trap + escape + ARIA) to v2.0 strict | H (worker) | 0.5 |
| 4 | Apply `NAC.scope()` hierarchy to shell -> hub -> card -> modal chain | F | 0.5 |
| 5 | Apply `NAC.autoRegister()` to dynamic catalogs (sazanami cards, hub tiles) | G | 1 |
| 6 | Apply `NAC.adopt()` rules for one third-party widget already integrated (e.g. Stripe Elements in Yujin checkout) | H | 0.5 |
| 7 | Run conformance suite against migrated Yujin sandbox; collect findings | I (worker) | 0.5 |
| 8 | Measure perf budget on real Yujin pages (catalog browser 400 cards + sazanami runs list 5000 rows virtualized) | I + Pablo (devices) | 1 |
| 9 | Document `case-studies/yujin.md` with: contexto, before/after metrics (lines, dev-h, perf, gaps), commit-by-commit narrative, lecciones learned, gaps that emerged | Sumi | 2 |
| 10 | Cross-link from `nac-spec/README.md` "Adopters" section + from Yujin's own CLAUDE.md | Sumi | 0.25 |

**Total**: ~5 days dev + 2 days documentation, parallel-friendly.

### 7b.2 Gate

`case-studies/yujin.md` published BEFORE phase 6 closing review
opens. Reviewers receive it as required reading attached to the
review prompt.

### 7b.3 Outputs the closing review can consume

- **Cost ratio**: actual h-dev for brownfield migration of an
  app with N components vs the scope doc's appendix A estimate.
  Validates or invalidates the cost model.
- **Perf measurements** on real-data pages, not synthetic
  fixtures. The conformance perf budget either holds or doesn't
  on Yujin's catalog browser + virtualized lists.
- **Gaps that emerged** during real migration that the RFC did
  not anticipate. These become v2.0.1 patch candidates or v2.1
  deferred items, transparent in the case study.
- **Coverage breakdown**: % of components migrated automatically
  (codemod), % manual cleanup, % impossible-without-design-changes.
- **i18n impact**: how many missing 10-locale entries surfaced;
  cost of catalog gap-fill (Yujin already has partial 10-locale
  catalog, brownfield-typical).

### 7b.4 What the case study explicitly does NOT do

- It is NOT a marketing document. Findings include failures.
- It does NOT promise that Yujin's success generalises to every
  app. The convergence assumption (scope doc section 6) remains
  testable independently.
- It does NOT delay v2.0 if Yujin migration uncovers a fatal
  primitive flaw -- such a finding triggers an RFC delta + new
  review round (slot already reserved in phase 6).

---

## 8. Phase 6 -- Closing peer review of v2.0 implementation

### 8.1 Items

| # | Item | Owner | Days |
|---|---|---|---|
| 1 | Bundle: spec v2.0 + runtime nac.js + conformance results + perf benchmarks + tooling links + **case-studies/yujin.md** | Sumi | 0.5 |
| 2 | Re-engage 6-AI panel + Claude arbiter | Pablo | 0.5 |
| 3 | Reviewers run their own probes (NAC.describe() on demo, eyeball spec, **read Yujin case study**) | reviewers | 2 |
| 4 | Aggregate findings | Sumi | 1 |
| 5 | Last-mile fixes (bug + spec polish) | Sumi + workers | 1-2 |
| 6 | Arbiter sign-off | Claude | 0.5 |

**Total**: ~5-6 days wall-clock.

**Acceptance**: arbiter "conditional yes" or stronger; max 5
arbiter-approved deferrals to v2.1.

---

## 9. Phase 7 -- Tag + announce v2.0.0

### 9.1 Items

| # | Item | Owner | Days |
|---|---|---|---|
| 1 | Update `nac-spec/README.md` with v2.0 status block | Sumi | 0.5 |
| 2 | `git tag v2.0.0` on the chosen commit | Pablo | 0.1 |
| 3 | GitHub Release notes (CHANGELOG aggregated) | Sumi | 0.5 |
| 4 | Public announcement: HN, dev.to, Twitter, LinkedIn, Reddit, Bluesky, Mastodon | Pablo | 1 |
| 5 | Update `docs/PEER_REVIEW.md` with Round 4 trail | Sumi | 0.5 |
| 6 | Polar.sh tier price update if applicable | Pablo | 0.25 |
| 7 | Public funding push aligned with announce (renewed sponsor outreach) | Pablo | 1 |

**Total**: ~2 days dev + 1-2 days announcement amplification.

---

## 10. Yujin migration (post v2.0)

**Out of scope of this roadmap** -- starts AFTER v2.0.0 ships.

Brownfield estimate (per scope doc appendix): ~36h dev = ~5 days
Sumi solo, ~2 days with F/G/H workers parallel + Pablo on i18n
catalog gaps.

The branch `nac3-shell-migration` from May 2026 (slice 1) is
discarded -- it predates v2.0 primitives and will be redone with
the new SDK in ~50% the time.

---

## 11. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Reviewers reject convergence assumption (case D structural) | medium | rework section 4.3 (`adopt`) priority | scope doc invites this challenge explicitly |
| `adopt` selector perf doesn't hit budget on low-tier mobile | medium | rework with required scoping | benchmark phase 5 catches early |
| Claude API outage during peer review | low | reschedule | already happened in v1.9 round, recovered |
| Pablo bandwidth conflict with Yujin commercial work | medium | extend wall-clock to 85+ days | this is the most likely real risk |
| Babel plugin breaks on React Server Components | medium | flag as unsupported in v2.0; defer RSC support to v2.0.x | docs warn explicitly |
| ChatGPT v2.1 deferrals re-emerge as v2.0 blockers | low | absorb into v2.0 scope (extends timeline) | RFC prematurely scopes to avoid |
| Independent runtime port not yet existing limits arbiter "yes" | known | accept as v2.1 critical-path | already disclosed in v1.9 release |
| Perf benchmark reveals an unexpected primitive slow on Safari | medium | optimisation pass, possibly delaying release 1-2 weeks | dev iteration cushion in phase 3 |

---

## 12. Decision points reserved for Pablo

These are gates Sumi cannot pass without explicit approval:

1. **v1.9.1 HMAC patch DRAFT approval** -- before phase 0 starts.
2. **RFC v2.0 acceptance** -- before phase 3 (impl) starts.
3. **Tooling scope confirmation** -- which packages ship with v2.0
   (section 7 of scope doc) vs which defer to community.
4. **Convergence assumption** -- accept reviewer feedback or reject.
5. **v2.0.0 tag commit** -- final go/no-go on release.
6. **Yujin migration kickoff** -- after v2.0 stable for X weeks.

---

## 13. Token / compute cost estimate

For Sumi's contribution (does not include Pablo manual time):

| Phase | Sumi tokens (estimate) |
|---|---|
| 0 | ~15K |
| 1 (RFC writing) | ~80K |
| 2 (review aggregation + RFC delta) | ~30K |
| 3 (impl coordination, since workers do bulk) | ~120K |
| 4 (tooling) | ~150K |
| 5 (conformance + benchmarks) | ~50K |
| 6 (review aggregation) | ~40K |
| 7 (release + announce) | ~25K |

**Total**: ~510K Sumi tokens. At Anthropic API pricing for Opus
(~$15/M input + $75/M output, mixed ~$30/M effective), ~$15.

For workers (F/G/H/I) bulk impl: ~3M tokens combined for phase 3+4,
~$90.

**Total project cost**: ~$105 in API tokens. Negligible against the
strategic value (NAC v2.0 is the artifact that unlocks Yujin
commercial story + framework adoption).

---

## 14. Success criteria

v2.0.0 is shipped successfully if:

- All 8 primitives in scope doc section 4 are implemented and
  conformance-passing.
- All 7 tooling packages in section 7 are published to npm + git.
- Peer review arbiter pass: "conditional yes" or stronger.
- Strict-superset invariant verified (zero v1.9 breaks).
- Perf budget met on low-tier mobile 2026.
- Cookbook with 30 patterns published.
- Yujin migration starts within 30 days of v2.0 release.
- Within 6 months: at least 1 third-party widget vendor publishes
  NAC compliance independently (validates convergence assumption).

If the last criterion fails by 12 months post-v2.0, the convergence
assumption is wrong and v2.x must invest more in `adopt` rules
library and `@nac-spec/rules-*` packages.

---

**This roadmap is the operational truth for v2.0. Sumi will execute
it incrementally, gated by the 6 Pablo decisions above. The scope
doc and the RFC are the authoritative input; this is the schedule.**

-- Pablo & Sumi, 2026-05-09
