# Independent Peer Review Pass

NAC v1.9.0 is the result of an iterative review-and-respond cycle
across six independent AI systems. This document records each
reviewer's verdict, the items they flagged, and the spec/runtime
section that closed each item.

This file is the public, link-able evidence of NAC's review history.
If you are evaluating NAC for adoption and want to know whether the
contract has been stress-tested by parties outside the author, this
is where to look.

**License of this document:** MIT, same as the spec.

---

## Why this review process

NAC's primary beneficiary is a human with a disability whose access
to a UI depends on the contract being right. The cost of "wrong" is
not a CI failure -- it is a user locked out of a system they need.
A small spec written by a single author cannot earn the trust that
contract requires.

Six independent AI reviewers were asked the same structured prompt
across two rounds (v1.7 -> v1.8 in late April 2026, v1.8 -> v1.9 in
early May 2026). Each was given the full normative spec, the
reference runtime source, the reference demo, and the prior
reviewer comments. Each was asked the same closing question:

> *Can NAC be announced as v2.0 today, or does something specific
> block it?*

Each reviewer's verdict + their flagged items + the v1.9 spec
section that addressed each item is recorded below. The author's
work was to respond to every item the panel marked
`should-land-before-2.0` and either close it or document a
justified deferral to v2.1.

---

## Round 1: v1.7 -> v1.8 four-AI panel (April 2026)

The v1.7 round used four reviewers. The aggregate produced ~15
action items; 8 landed in v1.8.0. The remaining 7 were carried into
the v1.8 -> v1.9 round below.

(Round 1 detail is in spec history; the relevant claims are the
v1.8 baseline this document audits.)

---

## Round 2: v1.8 -> v1.9 five-AI panel (May 2026)

The v1.8 round added ChatGPT to the four v1.7 reviewers. Each
reviewer was given v1.8 spec + runtime + the prompt
`PromptEvaluacion3.txt` (in the repo) and produced a structured
review across 10 tasks (T1..T10). The closing-recommendation lines
below are direct quotes; the items are paraphrased with normative
references to where each landed in v1.9.

### DeepSeek (Pensamiento Profundo)

**Position on v2.0 readiness:** *"yes, but with ARIA drift
tolerance window and inert preflight"* -- announce v2.0 after
adding those two items (estimated 40 hours of work). Without them,
teams will abandon after the first ARIA false positive on a
React/Vue app.

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| ARIA drift tolerance window (200ms) | **CLOSED** -- sec 7.3.2 |
| `inert` ancestor preflight | **CLOSED** -- sec 7.3.3 (`inert` -> `nac:command:rejected` reason=`inert`) |
| Performance benchmark normative | **CLOSED** -- sec 6.2.27 perf budget table |
| Test harness for custom plugins | **CLOSED** -- sec 13.10 (`assert_event_fired`, `assert_event_count`, `perf_probe`) |
| `data-nac-braille-label` for refreshable braille displays (deaf-blind population) | **CLOSED** -- sec 3.1 |
| Drag-type case-insensitive matching | **CLOSED** -- sec 13.4 + sec 13.4.1 drag-type registry |
| `prefers-contrast: more` media query for focus pulse | **CLOSED** -- sec 7.6 |
| Hint priority normative ordering | **CLOSED** -- sec 3.1 (9-entry order + `sort_hints_by_priority`) |
| Cross-origin iframe support | **DEFERRED to v2.1** |

DeepSeek's deaf-blind recommendation (line 511 of the v1.8 review)
is the highest-leverage single line in the panel: it identified
deaf-blind users as a population that the v1.8 contract did not
serve at all, and proposed a 20-line runtime fix. v1.9 ships it.

### ChatGPT

**Position on v2.0 readiness:** *"yes, I would recommend NAC v1.8.0
today for enterprise apps serving users with motor or cognitive
disabilities, particularly where voice control or AI delegation
matters. The contract is no longer just 'automation-friendly'; it
is becoming meaningfully auditable. The remaining risks are
ecosystem discipline and governance, not conceptual viability."*

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| HMAC signing of `source` ProvenanceBlock | **CLOSED** -- sec 6.2.1 (`source.signature` + `sign_provenance`/`verify_provenance`) |
| Recursive `source.parent` for nested delegation chains | **CLOSED** -- sec 6.2.1 |
| `recommended_remediation` field on rejection events | **CLOSED** -- sec 6.2.30 (13-entry normative lookup table) |
| Action confirmation as wire-level event | **CLOSED** -- sec 6.2.32 `nac:action:confirm:{requested,granted,denied}` |
| Capability/version negotiation in manifest | **DEFERRED to v2.1** (justification: needs careful design to avoid breaking v1.x strict-superset invariant) |
| Framework integration guides (React/Vue/Svelte) | **DEFERRED to v2.1** (doc work, not blocking) |
| Independent interoperability test suite | **DEFERRED to v2.1** (separate repo) |

ChatGPT's three deferrals are the only deferrals where the
reviewer's explicit gate was *not* fully met by v1.9. The
v1.9 closing arbiter (Claude, below) accepted these deferrals as
defensible but flagged capability negotiation as the v2.1
critical-path item.

### Mistral Le Chat

**Position on v2.0 readiness:** v2.0-after-helper. Mistral's
position emphasised cognitive-accessibility primitives and
auditability, plus governance around `skip`. Closing
recommendation: *"add first-class support for 'guided task flows'
aimed at cognitive accessibility... declarative notion of step
dependencies, reversible checkpoints, or interruption recovery
would materially help users with executive-function variability
and AI-assisted delegation."*

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| ARIA bridge for `data-nac-a11y-hint` | **CLOSED** -- sec 3.1 (hidden `aria-live` region + `aria-describedby` append) |
| Drag-type registry (24 canonical patterns) | **CLOSED** -- sec 13.4.1 |
| ProvenanceBlock validation in conformance | **CLOSED** -- sec 6.2.27 |
| `attention_profile` manifest field with presets | **CLOSED** -- sec 13.5 (5 presets: default / high_contrast / reduced_motion / extended_pulse / maximum_salience) |
| `skip_no_remediate_date` validator finding (skip drifts permanent risk) | **CLOSED** -- sec 3.1 |
| Hint priority normative | **CLOSED** -- sec 3.1 |
| Guided task flows for cognitive disability | **DEFERRED to v2.x** (post v2.1, no fixed date -- not yet shaped into normative spec) |

### Grok Fast

**Position on v2.0 readiness:** *"Announce v2.0 after landing the 3
critical items above"* -- conditional yes. Of the v1.7 panel, Grok
had been the most-yes ("yes-with-patches"); v1.8 closed several of
his patches and v1.9 closed the remainder.

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| Drag-type registry | **CLOSED** -- sec 13.4.1 |
| ARIA bridge for a11y_hint | **CLOSED** -- sec 3.1 |
| `nac:action:confirm` wire-level event family | **CLOSED** -- sec 6.2.32 |
| `data-nac-confirmation-message` per-element override | **CLOSED** -- sec 3.1 |
| Action `undoable` flag for AI agents | **CLOSED** -- sec 6.2.33 (`action_undoable`, `action_undo_window_ms`) |
| `attention_profile` presets | **CLOSED** -- sec 13.5 |

Grok's `data-nac-confirmation-message` recommendation (line 1206
of v1.8 review) was the most-cited item across the panel because
it served voice-control users specifically: a localized, declared
confirmation message that voice tools and AI agents could read
directly without the host re-implementing for every action.

### Microsoft Copilot

**Position on v2.0 readiness:** *"I would recommend NAC v1.8.0 for
an enterprise team building for motor/cognitive disabilities
provided the team commits to (a) a short retrofit plan for
provenance and stable IDs, and (b) governance around
data-nac-validate='skip' usage; otherwise the contract's benefits
will be diluted."* -- conditional yes contingent on adopter
discipline + spec-side hardening on provenance authenticity and
skip governance.

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| Machine-readable skip justification (`data-nac-skip-reason`) | **CLOSED** -- sec 3.1 (REQUIRED at NAC-3 with categories + remediate-by date) |
| Provenance authenticity (HMAC) | **CLOSED** -- sec 6.2.1 (HMAC-SHA256 + constant-time compare) |
| ARIA-to-NAC mapping table normative | **CLOSED** -- sec 7.3.3 |
| Replay buffer for events fired before NAC loads | **CLOSED** -- sec 13.11 (`window.__NAC_PENDING__` + `replay_pending`) |
| `attention_profile` preset (cross-flagged with Mistral + Grok) | **CLOSED** -- sec 13.5 |
| CI dashboard / reporting tool | **DEFERRED to v2.1** |

Copilot's `data-nac-skip-reason` line (line 1325 of v1.8 review)
was, like DeepSeek's braille label, a single-line recommendation
that fundamentally changed the contract: skip without justification
becomes a permanent escape hatch, so v1.9 promotes
`data-nac-skip-reason` to REQUIRED at NAC-3 with a normative
category list and an optional `remediate-by=YYYY-MM-DD` token. The
validator emits both `skip_without_reason` (error) and
`skip_no_remediate_date` (warn).

---

## Round 3: v1.9 Closing Arbitration -- Claude (May 2026)

After the five v1.8 panel reviews + author response cycle landed
in v1.9.0 (commit `185c7df` on the `nac-spec` repo, tag `v1.9.0`),
a closing arbitration pass was run with Claude. The arbiter was
given the full v1.8 panel reviews + the v1.9 delta + the prompt
`PromptEvaluacion4_Claude.txt` (in the repo). The arbiter's role
was to determine whether the panel's gates had been met and
whether v2.0 could announce.

**Verdict (verbatim):** *"Conditional YES -- v2.0 can announce
within the next week, with disclosures and a verifiable release
tag... The v1.8 panel's bars are met or defensibly justified-
deferred. The 22 closed items in v1.9 trace cleanly to specific
reviewer findings; nothing was closed by relabeling. The deferred
items are real gaps but each has a stated reason that holds up.
Veto: NOT EXERCISED."*

**Scores per axis (closing pass):**

| Axis | Score | One-line |
|---|---|---|
| Spec clarity | 8/10 | Each section has rationale + reviewer attribution |
| AI/test tooling utility | 9/10 | Test harness + replay + perf_probe + provenance is a complete primitive set |
| Adoption ease (typical web team) | 6/10 | Real cost; rewards design-system discipline, punishes its absence |
| Ambition vs feasibility | 7/10 | 22+ items in one round is a lot |
| Public 2.0 readiness | 8/10 | If evidence reflects HEAD: ready with disclosures |

**Aggregate of v1.8 panel verdict audit (per Claude arbiter):**

- DeepSeek: bar **fully met**.
- ChatGPT: bar **partially met** with stated justification (capability negotiation, framework guides, interop suite all deferred to v2.1 with defensible reasons).
- Mistral: bar **fully met**.
- Grok: bar **fully met**.
- Microsoft Copilot: bar **fully met**.

**Required before announce (3 conditions):**

1. **`git tag v1.9.0`** on commit `185c7df`. Without a tag,
   "v1.9.0 is on main" is unverifiable for any reviewer hitting raw
   URLs through different CDN edges. **DONE** (tag pushed).
2. **Disclose v2.1 deferrals in the announce.** Specifically:
   capability/version negotiation, cross-origin iframes, framework
   integration guides, independent interop test suite, CI dashboard.
3. **Disclose limitations honestly.** Single reference
   implementation (no second-party port yet), perf budget validated
   only against synthetic 1000-element fixture, conformance
   verified via self-test only.

**Substantive concerns deferred to v2.1 priorities (per arbiter):**

1. **HMAC signing should become MANDATORY at NAC-3** for events
   with `source.type === 'agent'`. v1.9 ships the helpers
   (`sign_provenance`, `verify_provenance`) but the spec keeps
   signing optional. The arbiter's argument: *"An audit pipeline
   that accepts unsigned `source: { type: 'agent' }` is back to
   where it started... For users in regulated environments
   (healthcare, finance, legal -- exactly the populations the
   `audit_required` hint serves), this is the gap that swallows
   the rest of the work."* **Critical-path for v2.1.**
2. **Second independent runtime implementation.** Without it,
   "spec" reduces to "what the reference impl does." Without a
   second party port, the contract has not been validated as
   independently implementable.
3. **`aria-haspopup` and `aria-current` in the ARIA-to-NAC mapping
   table** (sec 7.3.3 extension).
4. **`undo_window_ms` REQUIRED when `undoable=true`** (sec 6.2.33
   tightening).

---

## Aggregate

**Six independent reviewers across two rounds + one closing
arbitration pass produced 30+ action items. v1.9.0 closed 22+ of
them. 5 are explicitly deferred to v2.1 with stated reasons. 1
deferred to v2.x (post v2.1, no date -- guided task flows for
cognitive disability).**

**Reviewer-attributed closures in v1.9:**

| Reviewer | Items closed in v1.9 |
|---|---|
| DeepSeek | drift window, inert preflight, perf budget, test harness, braille label, drag case-insensitive, prefers-contrast, hint priority |
| ChatGPT | HMAC signing, source.parent chains, recommended_remediation, confirm event family |
| Mistral | ARIA bridge, drag-type registry, ProvenanceBlock conformance, attention_profile, skip_no_remediate_date warn, hint priority |
| Grok | drag-type registry, ARIA bridge, confirm event, confirmation-message, undoable flag, attention_profile |
| Microsoft Copilot | skip-reason REQUIRED, HMAC, ARIA-NAC mapping, replay buffer, attention_profile |
| Claude (arbiter) | tag verification, disclosures honest, conditional-yes verdict |

---

## Round 3: v1.9 -> v2.0 review (in progress, May 2026)

This round reviews `v2.0.0-rc1` (commits f251a32 + ec0d305 +
9350339 on `main`). The prompt is `PromptEvaluacion5.txt` (URL-fetch
variant) and `PromptEvaluacion5_Inline.txt` (embedded-bundle variant
for reviewers that cannot fetch raw URLs).

**Operational note**: at the time of this writing only Grok 4 was
able to fetch + read the 14 required documents. The remaining
panellists (DeepSeek, ChatGPT, Mistral Le Chat, MS Copilot, Claude
arbiter) reported inability to fetch the canonical raw URLs. The
inline-bundle prompt was created to unblock that -- same review
contract, documents embedded.

### Grok 4 (Fast Model) -- 2026-05-09

**Verdict:** `yes-with-conditions`.
**Score axes:**
- Spec clarity: 9/10
- AI/test tooling: 8/10
- Adoption ease: 7/10 (improved from Claude's 6/10 in v1.9 closing
  via the new primitives)
- Ambition vs feasibility: 8/10
- v2 announce ready: 8/10

**One-liner:** *"Strong v2.0-rc1 with excellent primitives and
security hardening; address WebView quirks, i18n strictness, and
tooling gaps for tag."*

**Findings flagged (3 conditions; zero blockers):**

| ID | Severity | Code | Source |
|---|---|---|---|
| T4-F1 | high | `istrusted_webview_quirks` | scope doc 130-136 + spec 285-288 |
| T5-F1 | medium | `i18n_strict_incremental` | i18n guide 100-109 + spec 352 |
| T7-F1 | high | `tooling_gaps_frameworks` | packages/README + roadmap 173-184 |

**T4-F1 (high)**: `event.isTrusted` derivation is mostly correct
for standard browsers but mobile WebView contexts (Cordova,
Capacitor, React Native WebView), assistive tech polyfills, and
synthetic event runners can produce inconsistent values. Suggested
fix: explicit guidance in spec sec 15.10 + fallback path for
known-good assistive tech (Talon, Voice Access, OS-level Computer
Use) in the enforcement matrix.

**T5-F1 (medium)**: NAC-3 default of `error` severity on missing
locale blocks incremental SaaS rollouts where languages are added
one-at-a-time after launch. Suggested fix: default to `warn` at
NAC-3 for missing locales, with opt-in to `error` via
`set_validation_tolerance({i18n_strict: 'error'})`. Tightening
remains available; the gate moves from default to opt-in.

**T7-F1 (high)**: Tooling skeleton list (9 packages) misses
Solid / Qwik / Lit / Web Components frameworks; Storybook /
Playwright / Cypress integrations; telemetry exporters
(Sentry / Datadog / OpenTelemetry); VSCode language server for
manifest schema validation. Suggested fix: prioritise these in
phase 4 or roll into v2.0.1 patch series.

**T11 answer to Q11 (i18n L1 vs L2)**: keep L1 (strong
recommendation; L2 would bloat NAC and conflict with established
i18n libraries).

**Demo evaluation**: source-only structural confirmation (Grok
runtime could not interactively navigate the live demo). 10
locales + CJK/RTL structurally covered.

**Additional observation from Grok**: Yujin case study template is
honest but should be populated before final tag for credibility.

**Author response to Grok's three conditions**:

- **T4-F1**: ACCEPTED. Spec sec 15.10 + scope doc sec 4b will be
  extended with a non-normative annex listing tested assistive
  tech behaviour + WebView quirks. Action item recorded for v2.0
  pre-tag patch.
- **T5-F1**: ACCEPTED with refinement. Default NAC-3 i18n severity
  becomes `warn` with opt-in to `error`; this matches the v1.9
  pattern for `data-nac-skip-reason` (warn at NAC-3 by default,
  error opt-in). Spec sec 15.11 to be updated.
- **T7-F1**: PARTIALLY ACCEPTED. Solid/Qwik/Lit + Storybook +
  Playwright + telemetry + VSCode LS will be added to roadmap
  phase 4 + roadmap phase 5.5 (post-tag patch series). Without
  these v2.0 ships as adoptable but not maximally ergonomic for
  every framework -- that is acceptable for the tag if we
  document the gap honestly in the v2.0 announce.

These three findings + author responses are now part of the v2.0.0
release evidence. Verbatim Grok response retained in
`docs/peer-review-round3-grok.txt`.

### DeepSeek, ChatGPT, Mistral Le Chat, MS Copilot, Claude arbiter -- pending

Pending re-attempt with `PromptEvaluacion5_Inline.txt` (embedded
bundle variant). Their inability to fetch the raw URLs of the 14
required documents downgraded their initial verdicts to
"insufficient-evidence" per the prompt rules. Re-runs once the
inline variant is distributed.

---

## How to verify this independently

```bash
git clone https://github.com/pkuschnirof/nac-spec
cd nac-spec
git checkout v1.9.0
git log -1 --format="%H %s"
# 185c7df fix(nac-1.9): drift cleanup -- README Status block + ROADMAP v2.1 list

# For v2.0.0-rc1:
git log --oneline | head -10
```

The full review corpus lives in:
- `PromptEvaluacion3.txt` (v1.8 round, 5 reviewer outputs verbatim)
- `PromptEvaluacion4_Claude.txt` (v1.9 closing arbiter prompt)
- `EvidenciaInline_v1.9.txt` (the inline-content prompt that broke
  the closing arbiter's CDN cache, included for transparency about
  how the arbiter pass was actually run)
- `PromptEvaluacion5.txt` (v2.0 Round 3 prompt -- URL-fetch variant)
- `PromptEvaluacion5_Inline.txt` (v2.0 Round 3 prompt -- embedded
  bundle variant for reviewers that cannot fetch raw URLs)
- `docs/peer-review-round3-grok.txt` (Grok 4 verbatim review)

**The cost of being wrong about a v2.0 announce is on the author,
not on you.** If you are evaluating NAC for adoption and find the
contract does not hold, file an issue. The peer review pass is
necessary but not sufficient -- production deployment is the next
test.

---

**License:** MIT.
**Authors:** Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, Sumi.
**Last updated:** 2026-05-09 (Round 3 in progress; Grok 4 first responder).
