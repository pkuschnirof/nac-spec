# NAC v2.0 -- Peer Review Round 6 (FINAL, complete-package, no priors)

> Round 6 = final pass before NAC v2.0 stable. No prior-conversation
> baggage; review the package as if seeing it for the first time.

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

Fetch ALL of these. They are all under `https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/`.

### A1. Specification (normative)
- `spec/NAC-v2.0.md` -- the spec itself (sec 1..17). Sec 16
  (intermediary system prompt contract) and sec 17 (sitemap
  primitive) are NEW in v2.0 and the focus of this review.
- `spec/NAC-v1.0.md` -- v1.x baseline (v2.0 is a strict superset
  per RFC sec 0).

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

### B4. Test runner (`@nac-spec/test-runner`, NEW)

10. The planner is claimed to be "pure" (no DOM dep). Can it
    actually be unit-tested in pure node (no jsdom)? Run
    `node packages/test-runner/tests/run-all.js` mentally
    against the source.
11. The runner forwards an intent through 4 layers: matcher
    -> planner -> Playwright adapter -> dispatchByNacId.
    Where is the "tree is authority" rule enforced at run
    time, vs. at plan time? Find both.
12. Coverage reports (`coverage.js`) cover sitemap + tree.
    Does that capture v1 plugin elements that are NOT in
    v2_scope_entries? Test against the fixtures.

### B5. Equality of access in practice

13. The two-principle claim (RFC sec 0a) only holds if the
    same code path that an LLM agent uses in production runs
    in the test runner. Is that literally true? Trace
    `runIntent` -> `plan` -> `resolveIntent` and confirm.
14. The voice/chat error analysis reports 8 fault categories
    from a real session. Are those fixed in code, or just in
    docs? Pick C1, C5, and C7; verify each in the diff.

### B6. Ambiguities and missing pieces

15. Are there any spec sections where the runtime emits a
    different shape than the spec mandates? (E.g. event
    detail mismatches, missing `source` envelope, optional
    fields treated as required.)
16. Is there any v1.9 plugin idiom that "still works but
    nobody documents how"? Adopters will hit this in
    practice.
17. Is the version constant truly the source of truth?
    Cross-check `NAC.version` (in `js/nac.js`),
    `NAC.version_v2` (in `js/nac-v2-extensions.js`),
    `describe_v2().nac_version`, and the README badge. They
    should all agree. (Spoiler: the README badge says rc5;
    the runtime exports rc5; if you find drift, that's a
    blocker.)

### B7. Real-world pitfalls

18. Browser compatibility: does `js/nac-v2-extensions.js`
    use any API not available in Safari 16+, Firefox 115+,
    Chrome 119+? (`crypto.subtle`, `WeakMap`, `Object.create(null)`,
    Set with primitives, etc.)
19. ASCII-purity (CLAUDE.md rule): does any spec / runtime /
    runner file contain non-ASCII bytes? Demo files are
    allowed Unicode; spec / runtime / runner files are not.
20. Memory leak surface: are there any `EventTarget`s the
    runtime attaches listeners to without a cleanup hook?
    What about `_intermediateScopes` (rc4 fix `gcIntermediateScopes`)
    -- is the GC documented enough that an adopter knows
    when to call it?

### B8. Documentation completeness

21. Could a competent engineer who has NEVER seen NAC ship
    a NAC-3-conformant plugin in 1 day from these docs?
    Quote the doc(s) they would read in order.
22. Are there topics covered in CHANGELOG that are missing
    from spec or RFC (i.e. "we did this but didn't bother to
    spec it")?
23. The README claims a security framing. Does an enterprise
    security review team have what they need (threat model,
    trust boundaries, key management) without DM-ing
    Pablo? If not, what is missing?

### B9. The breakthrough claim (`docs/RPA_AND_TESTING_BREAKTHROUGH.md`)

24. The doc lists 8 capabilities NAC + the runner unlock
    ("self-writing tests", "equivalence under operator
    class", etc). Pick the one that sounds most exaggerated.
    Is the claim defensible from the code, or marketing?
25. The doc says E2E + RPA + AI agent integration "collapse
    into a single surface". Is there one capability that any
    of those disciplines has TODAY that NAC + the runner
    cannot match? (Examples: Selenium's element-of-element
    chained selectors? UiPath's OCR fallback? A specific
    Anthropic Computer Use feature?)

### B10. Final go/no-go

26. Is `v2.0.0` ready to tag as stable, OR are there blockers?
    If blockers, list them numbered, each <= 30 words. If no
    blockers, list 3 concerns to address in the v2.0.1 patch
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
