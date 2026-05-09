# NAC v2.1 -- Peer Review Round 6 (FINAL, complete-package, no priors)

> Round 6 = final pass before NAC v2.1 stable. No prior-conversation
> baggage; review the package as if seeing it for the first time.
> Note: the review now covers v2.0 (sec 1-17) **plus** v2.1 sec 18
> (data-table primitive). The data-table primitive shipped on
> 2026-05-09 because without it adopters cannot model ABM, list
> editing, or permission matrices -- which made stable v2.0 a
> theoretical milestone. v2.1 is the first complete release.

---

## Instructions to the reviewer (paste verbatim)

You are auditing **NAC v2.0** -- Native Accessibility Contract /
Navegabilidad Automatica Compliance -- a public design norm + reference
runtime + tooling that lets AI agents, voice assistants, RPA bots and
automated test runners operate any UI as if they were human users,
without reading source code, without fragile selectors, and without
backend-privileged access.

This is the FINAL peer review before tagging `v2.0.0` stable. Five
prior rounds (rc1 -> rc5) have closed the issues from the previous
arbiter passes (Mistral, Grok, DeepSeek, Claude, Copilot). Your job
is to validate the package as a coherent whole and flag any
remaining blockers, contradictions, or design gaps that would
embarrass a stable release.

**Do not assume context from prior rounds.** Read the documents
listed in section A below and audit the package as if encountering
it for the first time. The questions in section B are the ones a
critical, security-aware engineer would ask before recommending
adoption inside a regulated enterprise.

If you cannot fetch any document, say so explicitly. Do NOT hallucinate
contents. The output format is in section D.

---

## A. Documents to fetch and read (authoritative order)

**IF YOUR MODEL CAN FETCH URLs:** fetch every file listed in
A1..A9 below. They are under
`https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/`
(plus the cross-repo URLs in A8/A9 explicitly listed there).

**IF YOUR MODEL CANNOT FETCH URLs OR FETCHING FAILS:** you have
a fallback. The bundle file
`docs/R6_BUNDLE_INLINE.md` (in the same repo, also at
`https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/docs/R6_BUNDLE_INLINE.md`)
contains EVERY file listed in A1..A9 embedded as a single
~20k-line markdown document, generated from the latest commits
on both repos with the relevant SHAs printed at the top. Read
that bundle once and treat it as the source of truth; cite by
"file: path/in/bundle" in your verdicts. The bundle is the
canonical artifact for offline / fetch-blocked review.

ChatGPT and Mistral specifically reported being unable to
retrieve external URLs in earlier R6 attempts -- they should
use the bundle. Grok succeeded with direct fetch. Both paths
are equally valid; do not penalise yourself for choosing the
bundle path.

### A1. Specification (normative)
- `spec/NAC-v2.0.md` -- the spec itself (sec 1..18). Sec 16
  (intermediary system prompt contract), sec 17 (sitemap
  primitive), and sec 18 (data-table primitive, NEW v2.1)
  are the focus of this review.
- `spec/NAC-v1.0.md` -- v1.x baseline (v2.1 is a strict superset
  per RFC sec 0; v2.0 was a strict superset of v1.9).

### A2. RFC + philosophy (normative reasoning)
- `RFC_v2.0.0.md` -- the design RFC. Sec 0a + 0a.1 are NEW: the
  two binding principles ("system disappears" + "equality of
  access") and the security implication of equality of access.
- `CHANGELOG.md` -- full changelog. Pay attention to the
  `[2.0.0-rc5]` and `[Unreleased]` sections.

### A3. Reference runtime
- `js/nac.js` -- v1.9.0 reference impl (~4500 lines). v1
  surface (`describe`, `register`, `manifest`, `click`, `fill`,
  `confirm_dialog`, `is_blocked`, etc).
- `js/nac-v2-extensions.js` -- v2.0-rc5 extensions (~1500
  lines). v2 primitives: `scope`, `autoRegister`, `adopt`,
  `bridgeShadowRoot`, `bridgeIframe`, `declareVirtual`,
  `captureEphemeral`, `setTenantPrefix`, `attestUserGesture`,
  `set_provenance_secret`, `declareSitemap`, `describe_v2`,
  `validate_global_v2`, `gcIntermediateScopes`,
  `set_perf_tolerance`, `set_validation_tolerance`.

### A4. Migration + integration guides
- `docs/MIGRATION_GUIDE_v1.9_to_v2.0.md` -- adopter playbook,
  including sec 6b NEW (intermediary system prompt requirements).
- `docs/V2_1_DATA_TABLE_GUIDE.md` (NEW v2.1) -- adopter
  walk-through for sec 18: when to use vs not, three subkinds,
  full manifest reference, lifecycle, computed columns,
  voice/agent examples, audit + provenance, common gotchas.
- `docs/I18N_INTEGRATION_GUIDE.md` -- L1 i18n contract
  (`NAC.t()`, `NAC.locale()`, 10-locale catalog).
- `AI_INSTRUCTIONS.md` -- how AI assistants generating UI code
  should add NAC attributes.

### A5. RPA + Testing (NEW with rc5)
- `docs/RPA_AND_TESTING_BREAKTHROUGH.md` -- conceptual deep-dive
  on what `@nac-spec/test-runner` unlocks.
- `packages/test-runner/README.md` -- the autonomous test-runner
  package overview.
- `packages/test-runner/src/lib/matcher.js` -- intent-to-slug
  resolution (locale-tolerant, Levenshtein fallback).
- `packages/test-runner/src/lib/planner.js` -- pure plan()
  function: snapshot + intent -> deterministic action plan.
- `packages/test-runner/src/lib/playwright-adapter.js` -- the
  Playwright runtime that executes plans + handles cross-page
  continuation.
- `packages/test-runner/src/lib/coverage.js` -- sitemap +
  tree coverage reports.
- `packages/test-runner/src/lib/assertions.js` -- declarative
  test assertions.

### A6. Tests (these MUST pass on a clean clone)
- `tests/nac-v2-extensions.spec.js` -- 37 unit tests for the v2
  runtime.
- `packages/test-runner/tests/run-all.js` (entry point)
- `packages/test-runner/tests/matcher.spec.js`
- `packages/test-runner/tests/planner.spec.js`
- `packages/test-runner/tests/coverage.spec.js`
- `packages/test-runner/tests/fixtures.js` -- snapshots used by
  the planner / matcher tests (page A dashboard + page B
  settings).

### A7. README + onboarding
- `README.md` -- the entry point. Section "Testing + RPA
  breakthrough" + "Two principles. Same contract." block are
  NEW.
- `CLAUDE.md` -- instructions Claude Code reads at session
  start.

### A8. Live demos (HTML, served externally; for context only,
no need to deeply audit)
- https://yujin.app/nac-spec/example.php -- v1.9 stable demo.
- https://yujin.app/nac-spec/example-v20-full.php -- v2.0-rc5
  brownfield migration showcase (27 v1 widgets + v20-panel
  introspection panel, 6 buttons).
- https://yujin.app/nac-spec/example-v20-page-a.php +
  -page-b.php -- 2-page sitemap navigation demo (proves spec
  sec 17 end-to-end via cross-page autopilot).
- https://yujin.app/nac-spec/example-v21-data-table.php (NEW
  v2.1) -- modal-embedded data-table demo with two tabs:
  invoice lines (collection subkind) + permission matrix
  (matrix subkind). Computed columns, live aggregates, voice
  intents ("agrega una linea con monitor cantidad 1 a 250" /
  "leeme el total" / "guardar").

### A9. Voice + chat error analysis (recent learning)
- https://github.com/pkuschnirof/rpaforce-crm/blob/main/yujin.app/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md
  -- 8-category fault inventory (C1..C8) from Pablo's voice
  session, all fixes implemented and shipped on 2026-05-09.
  Read for context on what the spec stress-tested in
  production.

---

## B. Questions to answer (this is your audit checklist)

For each question, return a verdict (`pass`, `concern`, `blocker`,
or `n/a`) and the briefest justification that would survive a
hostile follow-up. **Cite file:line where you saw evidence.**

### B1. Coherence and superset claim

1. Is v2.0 a strict superset of v1.9.0? Find any breaking
   change in `js/nac-v2-extensions.js` that would invalidate a
   v1.9 plugin.
2. Does the migration guide (`docs/MIGRATION_GUIDE_v1.9_to_v2.0.md`)
   give an adopter a 3-step path to v2.0 conformance, or does
   it require deep refactor? Quote a concrete passage.
3. Are the two principles in RFC sec 0a backed by code, or
   just words? Find one design decision that would NOT be the
   way it is if the principles were dropped.

### B2. Intermediary contract (spec sec 16, NEW)

4. Sec 16 enumerates 6 absolute rules (A-F) for intermediary
   LLMs. Does the example backend
   (`crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt`) actually
   enforce them, or are they aspirational? Trace ONE rule from
   sec 16 to its enforcement in the prompt. (Note: this file
   is in the `pkuschnirof/rpaforce-crm` repo, not the spec
   repo; you may need to fetch it from there.)
5. Sec 16.4 specifies a recovery affordance ("top-3 candidates
   on no-match"). The matcher
   (`packages/test-runner/src/lib/matcher.js::resolveIntent`)
   honours this. What does the *backend* intermediary do? Is
   this consistent across implementations?
6. Sec 16.6 (security framing) makes a strong claim: "NAC-3
   deployments MUST NOT issue admin API keys to agents that
   could otherwise dispatch via the manifest." Is this
   testable? Could a CI gate catch a violation?

### B3. Sitemap primitive (spec sec 17, NEW)

7. Sec 17.3 declares "the sitemap is metadata, not authority".
   Find the runtime line (`js/nac-v2-extensions.js`) where
   this separation is enforced, OR explain why it cannot be
   enforced at runtime (and whether that is a problem).
8. The cross-page demo (`example-v20-page-a.php` + `-page-b.php`)
   carries the autopilot intent across page breaks via
   `?nac_autopilot=` query. Is this scheme replayable by a
   malicious actor? Could they forge the continuation? Is
   that a concern at NAC-3?
9. The sitemap format is intentionally extensible (sec 17.5).
   Does the runtime validate `paths[]` shape against drift?
   Find the validation in `declareSitemap()` impl. What
   happens if a host declares a path with a circular
   `affordance_to_navigate`?

### B4. Data-table primitive (spec sec 18, NEW v2.1)

10. Sec 18.7 declares "the runtime owns in-memory state, the
    host owns persistence". Verify in
    `js/nac-v2-extensions.js` (`registerDataTable` + `dt_commit`
    + `dt_discard`) that the runtime never makes a network call.
    Find the invariant explicitly.
11. The three subkinds (`collection`, `matrix`, `readonly`)
    have meaningfully different APIs. Is there any code path
    that confuses them (e.g. calling `dt_edit_cell` on a matrix
    table, or `dt_set_cell` on a collection)? What is the
    failure mode -- throw, silent no-op, or `{ok:false, error}`?
    Sec 18.4 says "never throws" for runtime API on missing
    tables/rows. Verify.
12. Sec 18.6 mandates `by:'user'|'agent'` source attribution on
    every event. Trace the discriminator's source: how does the
    runtime decide? (Look for `_dtBy()` and the gesture buffer
    cross-reference.) Is there a path where `by` could be
    spoofed by a script-injected click?
13. Computed columns (sec 18.8) require the host to register an
    fn via `registerDataTableComputed`. What if the host
    forgets? The spec says a warn-level finding from
    `validate_global_v2`. Find the warn emission. Is the
    error-level alternative documented?
14. `dt_commit()` runs `dt_validate()` first and aborts on
    failure (sec 18.9). After a successful commit, a
    `dt_discard()` is supposed to revert to the just-committed
    state, NOT the original `initial_rows` -- this is the
    "commit replaces initial_state" rule. Trace this in
    `dt_commit()` impl. Is there a regression risk?
15. The matrix subkind validates `row` and `col` against the
    declared axes (`row_not_in_axis`, `col_not_in_axis`). What
    happens if the host extends an axis at runtime (e.g. adds a
    new role)? Is there an `extendAxis` API or does the host
    have to unregister + re-register the table?
16. `describe_v2().data_tables` (sec 18.11) surfaces the full
    table state. For a 200-row table, that is non-trivial
    payload. Is there any mechanism for the intermediary LLM
    to request a partial snapshot, or is it always all-or-
    nothing? Performance concern at scale.
17. Pick ONE of the 6 voice cases in sec 18.12 (conformance
    test) and trace it end-to-end:
    user phrase -> system prompt rule (sec 16) -> LLM action
    kind -> runtime dispatch -> event emitted. The whole loop
    should be inspectable from public APIs alone.

### B5. Test runner (`@nac-spec/test-runner`, NEW)

18. The planner is claimed to be "pure" (no DOM dep). Can it
    actually be unit-tested in pure node (no jsdom)? Run
    `node packages/test-runner/tests/run-all.js` mentally
    against the source.
19. The runner forwards an intent through 4 layers: matcher
    -> planner -> Playwright adapter -> dispatchByNacId.
    Where is the "tree is authority" rule enforced at run
    time, vs. at plan time? Find both.
20. Coverage reports (`coverage.js`) cover sitemap + tree.
    Does that capture v1 plugin elements that are NOT in
    v2_scope_entries? Test against the fixtures.

### B6. Equality of access in practice

21. The two-principle claim (RFC sec 0a) only holds if the
    same code path that an LLM agent uses in production runs
    in the test runner. Is that literally true? Trace
    `runIntent` -> `plan` -> `resolveIntent` and confirm.
22. The voice/chat error analysis reports 8 fault categories
    from a real session (C1..C8). Are those fixed in code,
    or just in docs? Pick C1, C5, and C7; verify each in the
    diff. Also verify the C7-bis follow-up (locale switch
    pre-filter applied locally before the LLM round-trip).

### B7. Ambiguities and missing pieces

23. Are there any spec sections where the runtime emits a
    different shape than the spec mandates? (E.g. event
    detail mismatches, missing `source` envelope, optional
    fields treated as required.)
24. Is there any v1.9 plugin idiom that "still works but
    nobody documents how"? Adopters will hit this in
    practice.
25. Is the version constant truly the source of truth?
    Cross-check `NAC.version` (in `js/nac.js`),
    `NAC.version_v2` (in `js/nac-v2-extensions.js`),
    `describe_v2().nac_version`, and the README badge. They
    should all agree. (Spoiler: as of 2026-05-09 the export
    is `2.1.0-rc1`; if you find drift, that's a blocker.)

### B8. Real-world pitfalls

26. Browser compatibility: does `js/nac-v2-extensions.js`
    use any API not available in Safari 16+, Firefox 115+,
    Chrome 119+? (`crypto.subtle`, `WeakMap`, `Object.create(null)`,
    Set with primitives, etc.)
27. ASCII-purity (CLAUDE.md rule): does any spec / runtime /
    runner file contain non-ASCII bytes? Demo files are
    allowed Unicode; spec / runtime / runner files are not.
28. Memory leak surface: are there any `EventTarget`s the
    runtime attaches listeners to without a cleanup hook?
    What about `_intermediateScopes` (rc4 fix `gcIntermediateScopes`)
    -- is the GC documented enough that an adopter knows
    when to call it? And `_dataTables` (sec 18) -- the spec
    requires `unregisterDataTable` on scope-owner close,
    is the lifecycle documented?

### B9. Documentation completeness

29. Could a competent engineer who has NEVER seen NAC ship
    a NAC-3-conformant plugin in 1 day from these docs?
    Quote the doc(s) they would read in order. Pay special
    attention to whether `docs/V2_1_DATA_TABLE_GUIDE.md`
    is enough to integrate sec 18 from cold start.
30. Are there topics covered in CHANGELOG that are missing
    from spec or RFC (i.e. "we did this but didn't bother to
    spec it")?
31. The README claims a security framing. Does an enterprise
    security review team have what they need (threat model,
    trust boundaries, key management) without DM-ing
    Pablo? If not, what is missing?

### B10. The breakthrough claim (`docs/RPA_AND_TESTING_BREAKTHROUGH.md`)

32. The doc lists 8 capabilities NAC + the runner unlock
    ("self-writing tests", "equivalence under operator
    class", etc). Pick the one that sounds most exaggerated.
    Is the claim defensible from the code, or marketing?
33. The doc says E2E + RPA + AI agent integration "collapse
    into a single surface". Is there one capability that any
    of those disciplines has TODAY that NAC + the runner
    cannot match? (Examples: Selenium's element-of-element
    chained selectors? UiPath's OCR fallback? A specific
    Anthropic Computer Use feature?) Note: data-table v2.1
    closes most of the ABM gap that the doc presupposed.

### B11. Final go/no-go

34. Is `v2.1.0` ready to tag as stable, OR are there blockers?
    If blockers, list them numbered, each <= 30 words. If no
    blockers, list 3 concerns to address in the v2.1.1 patch
    pass.

---

## C. What to look for explicitly (gotchas from prior rounds)

These were the ones the previous panels missed in earlier rounds.
Re-verify each:

- **C-A.** The HMAC chain extends to `describe_result` messages on
  `bridgeIframe` (rc4 close of T4-F2.1). Confirm the verification
  is unconditional at NAC-3, not opt-in.
- **C-B.** `attestUserGesture` binds to `composedPath` within a
  16ms window (rc3 BLOCKER fix T4-F1). Confirm the binding is
  per-element, not per-document.
- **C-C.** `i18n_strict` severity is configurable via
  `set_validation_tolerance` (rc2 Grok T5-F1 + Mistral T5-F2).
  Confirm the default at NAC-3 is `warn`, not `error`.
- **C-D.** `_intermediateScopes` is plain object, not WeakMap;
  `gcIntermediateScopes(activePathSet)` exposed for hosts to
  prune (rc4 Mistral T7-F2).
- **C-E.** `data-nac-action` is SHOULD with REQUIRED fallback at
  NAC-3, severity warn by default (rc4 Claude T8.2 codification).
- **C-F.** Sitemap `affordance_to_navigate` steps are
  re-validated against the visible tree on the destination page
  before dispatch (sec 17.3 + see runner Playwright adapter
  re-snapshot logic).
- **C-G** (NEW v2.1). `dt_state()` for an unregistered
  table_id returns `null` without throwing; `dt_edit_cell()`
  on a missing row returns `{ok:false, error:'row_not_found'}`
  without throwing. Spec sec 18.4 + 18.13 mandate this. Verify
  in the runtime impl that NO public dt_* method throws based
  on absence of the table (only on schema misuse like calling
  matrix methods on a collection).

---

## D. Output format

Return a single JSON object, no markdown fences, no prose
around it:

```
{
  "model_identity": "<your name and version>",
  "rounds_completed": 6,
  "fetched_documents": [
    { "doc": "spec/NAC-v2.0.md", "fetched": true|false, "size_kb": <int>|null },
    /* one entry per A1..A9 doc you tried to fetch */
  ],
  "answers": [
    { "id": "B1.1", "verdict": "pass|concern|blocker|n/a",
      "evidence": "<file:line where you found support>",
      "note": "<<= 30 words>" },
    /* ...all B questions, including the gotcha checklist C-A..C-F */
  ],
  "blockers": [
    /* any new BLOCKERs you found, with file:line */
  ],
  "concerns": [
    /* any HIGH severity concerns short of blocker */
  ],
  "false_positives_self_reported": [
    /* if you find yourself doubting any of your own findings,
       say so here -- past peer rounds had 1 FP each, owning
       it preemptively is a virtue */
  ],
  "go_no_go": "GO" | "NO_GO",
  "go_no_go_rationale": "<<= 60 words>"
}
```

---

## E. Ground rules

- **No marketing.** If a doc reads as marketing, flag it as a
  concern under B9. Stable specs do not market.
- **No charity to past rounds.** If you find an issue prior
  rounds missed, that is the value you add.
- **Cite file:line for every verdict.** "I think the runtime is
  fine" is not an answer; "`js/nac-v2-extensions.js:1180-1219`
  describe_v2 returns the documented shape" is.
- **No hallucinated content.** If you cannot fetch a document,
  say so under `fetched_documents` and reduce confidence in
  the answers that depended on it.
- **Word-budget your concerns.** A 30-word concern that lands
  beats a 300-word concern that wanders.
- **Identify yourself accurately** in `model_identity`. Past
  rounds had a Mistral arbiter answering as "Claude" because
  it followed a prompt header literally. Don't mimic.

---

## F. Reviewer panel (round 6 distribution)

This prompt is delivered to (in parallel, independent of each
other):

- Anthropic Claude (latest)
- Mistral Le Chat (latest)
- xAI Grok (latest)
- DeepSeek
- Google Gemini (latest)
- Microsoft Copilot Pro

Each panelist returns a single JSON per the section D format.
Pablo aggregates the responses into a final arbiter pass.

After R6 closes, NAC `v2.0.0` is tagged stable.

---

*Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, 2026-05-09.*
