# What AIs think of NAC

> An open, ongoing experiment: ask multiple free-tier AIs to read NAC,
> imagine operating a NAC-equipped UI, and write an honest review.
> Their unedited reviews live in this document.

## Why this document

NAC (Native Accessibility Contract) is positioned as a UI contract for
autonomous operators -- AI agents, voice assistants, RPA bots, test
runners. The most direct way to validate the design is to ask the
operators it targets: large language models from different vendors.

This doc collects unfiltered first-impression reviews from multiple
free-tier AIs. Each AI receives the same prompt (section 1 below)
with no priming and no coaching from the user. Their full responses
appear as-is in section 2, attributed to the model + version + tier.
Section 3 is the human synthesis -- patterns across reviews, common
gaps, common surprises, action items.

The bias we are trying to expose: NAC was designed by humans plus
one AI collaborator (Sumi / Claude). It might be overfit to the
authors' assumptions. Letting a wider sample of LLMs review it from
cold is the cheapest way to surface that overfit.

## How to add a review

1. Open the AI's interface (gemini.google.com, chat.deepseek.com,
   grok.x.ai, claude.ai, chat.openai.com, chat.mistral.ai,
   kimi.moonshot.cn, etc).
2. Paste the prompt in section 1 verbatim. Do not edit it. Do not
   coach the AI. Do not steer follow-up questions toward a result.
3. Wait for the output. If the AI cannot fetch the linked URLs,
   paste the file contents when it asks (do not paraphrase).
4. Copy the AI's full output into a new subsection of section 2.
5. At the top of the subsection, record: model name, free/paid
   tier, date, browsing on/off, prompt language used.
6. Open a PR if you are external. If you are the maintainer,
   commit directly.

The point is comparable answers, not nice ones. Unflattering
reviews are the most useful ones.

---

## 1. Prompt (verbatim)

The block below is what each AI receives. Do not modify it -- the
test is whether the spec is self-explanatory enough for a cold AI
to evaluate it from this brief plus the linked materials.

A first iteration of this prompt was more pointed (explicit "do
not flatter, find weaknesses, disagree with the framing"). Gemini
2.x free rejected that version with a generic safety-filter
message on 2026-05-06 ("Your request may go against my
guidelines"). The version below is the softened iteration that
has been accepted by every AI we have polled so far. The earlier
draft is preserved in section 4 (methodology) for the record.

```
Please give me a thorough, balanced technical review of a public
open-source specification called NAC -- Native Accessibility
Contract. License MIT. Repo: github.com/pkuschnirof/nac-spec.

NAC adds HTML attributes plus a small JavaScript runtime plus a
JSON manifest to web UIs, so that test runners, voice assistants,
and automation frameworks can identify and operate elements
without depending on CSS selectors. I would like to assess
whether the design holds up.

### Materials to read

- Specification (1700 lines):
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/spec/NAC-v1.0.md
- Reference implementation (1500 lines, MIT, no dependencies):
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/js/nac.js
- Authoring manual:
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/docs/MANUAL.md
- Design rationale and how NAC relates to ARIA:
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/docs/PHILOSOPHY.md
- Public demo page:
  https://yujin.app/nac-spec/example.php
- Changelog:
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/CHANGELOG.md

If you cannot fetch any URL, please ask me to paste the file or
section you need. Please do not invent content you have not
actually read.

### Tasks

T1. SUMMARY (under 120 words): in your own words, what does NAC
    propose, who is the intended audience, and what does it ship.

T2. ARCHITECTURAL REVIEW (200-400 words): looking at the seven
    pillars P1 to P7, the role and verb vocabulary across versions
    1.0 through 1.4, the manifest contract, and the event model --
    describe the strongest design decision, the weakest design
    decision, and at least one specific section that you think
    would have trouble being adopted by a real production codebase.
    Cite section numbers when possible.

T3. PROGRAMMING WALKTHROUGH (200-400 words): if a developer were
    writing automated tests against the demo page using only the
    documented window.NAC.* API, write the JavaScript call sequence
    they would use to:
    a) read the labels and current values of the KPI cards on the
       page,
    b) trigger the action whose verb is "apply_all", if it exists,
    c) switch to the tab named "failed" inside the patch_manager
       plugin,
    d) detect whether a confirmation dialog is currently blocking
       input.
    For each step, note any case where the spec is ambiguous about
    which method to call or what value is returned.

T4. RELATIONSHIP TO ARIA (150-300 words): the spec positions NAC as
    a complement to ARIA rather than a replacement (section 1.5).
    Do you find that argument convincing? Are there overlaps in
    attribute semantics that could confuse implementers? Would you
    adopt NAC alongside ARIA in a real project, or pick one of
    them?

T5. ADOPTION ANALYSIS (150-300 words): for a frontend team
    considering adopting NAC at compliance level 3, what is the
    minimum amount of work, what is the part of the rollout most
    likely to be underestimated, and what would cause a team to
    abandon the effort midway. Be specific.

T6. SCORES AND CLOSING LINE (one short paragraph): score on a 1 to
    10 scale on four axes -- clarity of the specification,
    usefulness for automated test or assistant tooling, ease of
    adoption for a typical web team, and ambition versus
    feasibility. Conclude with one sentence on whether you would
    recommend NAC for a specific use case (you pick the use case).

### Style requests

- Be specific. Cite section numbers and line ranges when possible.
- Include both strengths and limitations. Limitations are
  especially useful for the author. Generic praise is not.
- If you do not know something, please say so rather than guessing.
- Reply in English so multiple AI reviews can be compared.
- Stay under 1500 words total.

Thank you.
```

---

## 2. Reviews

> One subsection per AI. Pasted verbatim. Do not edit, summarize,
> or correct typos. If a reviewer refused or fell back to bluffing,
> capture that too -- it is data about the AI's capabilities.

### 2.1 Gemini -- rejected on first prompt, pending retry

Model: Gemini 2.x (free tier, web), "Razonamiento" mode
Date:  2026-05-06
Browsing: on
Prompt language: en (original aggressive prompt)
Outcome: Safety-filter rejection. Gemini replied verbatim:
  "Your request may go against my guidelines. Would you like to
  try something else?"

Likely triggers (not confirmed by Gemini): the "You are an
autonomous AI agent (LLM with tool use)" persona-setting opening,
the "Imagine you are given a tool that exposes window.NAC.*"
simulation framing, and the explicit anti-sycophancy clause that
told the model to delete any sentence beginning with "this is
innovative". The combination reads to a safety classifier as
either jailbreak persona-shaping or unauthorised automation
against a third-party site.

The softened version of the prompt (now in section 1) has not
yet been retested with Gemini. To-do: rerun in a fresh Gemini
session with the sanitized prompt and capture either a full
review (if accepted) or a second rejection (which itself is data
about how restrictive Gemini Free is on critical-review tasks).

```
(full output to be pasted here once a sanitized retry succeeds,
or this slot stays as the rejection record)
```

### 2.2 DeepSeek

Model: DeepSeek (chat.deepseek.com, free tier, web)
Date:  2026-05-06
Browsing: on (visible page-fetching + keyword-search trail in the
  reasoning trace -- DeepSeek opened all 6 raw URLs and searched
  the spec for "pillar", "role and verb", "manifest", "event",
  "data-nac-", "v1.4", "NAC-3", "describe")
Prompt language: en (sanitized version)

```
T1. SUMMARY

NAC is a declarative contract for web UIs that adds a small set of data-nac-* attributes, a JSON manifest, and a window.NAC JavaScript runtime to enable AI agents, test runners, and automation frameworks to identify and operate UI elements without fragile CSS selectors. The intended audience includes frontend developers, QA engineers, and AI/RPA practitioners who need reliable, introspectable UI automation. NAC ships with a stable specification, an MIT-licensed reference implementation (~1500 lines of dependency-free JavaScript), a validator, and a changelog.

T2. ARCHITECTURAL REVIEW

The strongest design decision is P7 (Manifest declared), which requires plugins to publish a static JSON manifest at registration time, describing every exposed element, action, field, tab, and KPI. This makes the UI's contract introspectable without traversing the DOM, enabling automated planning and test generation.

The weakest design decision is the reliance on DOM event emission for write operations (e.g., nac:action:succeeded, nac:action:failed). The reference implementation uses timeouts (200ms) if no event is detected, which can lead to false positives. A real production system with unpredictable network latency could see race conditions and flaky tests unless the event protocol is made mandatory and reliable.

Section 6 (Compliance Levels) would likely cause adoption trouble. NAC-3 mandates all seven pillars and is required for production. However, P6 (Accessible Semantics) demands ARIA attributes (aria-label, role="dialog", focus trap) alongside NAC attributes, effectively requiring teams to implement both NAC and ARIA to achieve NAC-3 compliance. Many teams will struggle to meet these overlapping requirements, especially for complex widgets.

T3. PROGRAMMING WALKTHROUGH

A developer could automate the demo page as follows:

```js
// (a) Read KPI cards: use NAC.describe() to introspect all plugins
const snapshot = NAC.describe();
const kpis = snapshot.plugins.flatMap(p =>
  p.elements.filter(el => el.role === 'kpi')
);
kpis.forEach(kpi => {
  console.log(kpi.label, kpi.value); // label from manifest, value from DOM
});
```
The spec is ambiguous about how to retrieve the current value of a KPI card -- describe() returns element metadata, but only fields expose a value property. The intention may be to use snapshot_state() instead.

```js
// (b) Trigger "apply_all" action
await NAC.click('apply_all'); // resolves when nac:action:succeeded/fired or after timeout
```
The return value is ambiguous: click() returns { ok: true, event: {...} } or null if neither success nor failure events are captured.

```js
// (c) Switch to "failed" tab inside patch_manager plugin
await NAC.select('failed_tab', 'failed'); // or perhaps await NAC.tab('patch_manager', 'failed')
```
The specification does not document NAC.tab() in v1.0; the API shows only NAC.select(), but the manual and spec imply a dedicated tab() function.

```js
// (d) Detect blocking confirmation dialog
const hasDialog = document.querySelector('[role="dialog"][data-nac-role="modal"]') !== null;
// or use NAC.read_feedback() to check for blocking messages
```
The spec does not provide a dedicated API for detecting modals, requiring DOM inspection instead.

T4. RELATIONSHIP TO ARIA

The argument that NAC complements rather than replaces ARIA is convincing. ARIA targets screen readers (declarative, accessibility-focused), while NAC targets autonomous operators (imperative, with events and a driver API). The spec cites ARIA's declarative-only design and slow evolution as key differentiators.

However, there is overlap in attribute semantics that could confuse implementers. Both NAC and ARIA define roles (data-nac-role vs role), states (data-nac-state vs aria-*), and labels (aria-label). P6 (Accessible Semantics) explicitly demands ARIA attributes alongside NAC ones for NAC-3 compliance. This forces developers to maintain two parallel sets of semantics, increasing cognitive load and potential drift.

In a real project, I would adopt NAC alongside ARIA only if the team already has strong ARIA expertise. For teams starting fresh, I would pick one -- likely ARIA for accessibility-first apps, NAC for testability/AI-automation-first apps. The two contracts are complementary in theory but overlapping in practice, and maintaining both correctly is non-trivial.

T5. ADOPTION ANALYSIS

For a frontend team adopting NAC at compliance level 3 (production), the minimum work includes: (1) adding data-nac-* attributes to every interactive element (P2), (2) implementing a JSON manifest (P7), (3) emitting all required events (P4, P5), (4) exposing a compliant window.NAC API (P5), and (5) meeting ARIA constraints (P6). The spec estimates onboarding at about one hour, but a realistic team might need 2-3 days for a medium-sized app.

The most underestimated part of the rollout is P4: emitting the full set of lifecycle events (nac:plugin:opening, nac:action:dispatching, nac:field:changed, etc.). Many existing UIs have no event emission for each user interaction, retrofitting this into legacy code is far more difficult than adding static attributes.

A team would abandon NAC midway if the manifest-driven validation fails in CI due to frequent drift between declared manifests and actual DOM. The spec warns that drift is a CI blocker, but in practice, dynamic SPAs with conditional rendering cause constant drift, making the validator overly strict and adoption infeasible.

T6. SCORES AND CLOSING LINE

Clarity: 7/10 (good but has ambiguous sections); usefulness for automation: 9/10 (solid for AI/RPA); ease of adoption: 5/10 (manifest and events require significant rearchitecting); ambition versus feasibility: 8/10 (ambitious but feasible for new projects). I recommend NAC for greenfield internal tools where reliability of end-to-end tests is more important than developer convenience, but not for existing large SPAs without a committed automation rewrite.
```

#### Reviewer accuracy notes (added by maintainer, not by DeepSeek)

DeepSeek reads the spec and reference implementation in earnest --
it cites P1..P7 correctly, identifies the 200ms event timeout in
nac.js (real number, see js/nac.js), and surfaces section 6
overlap with ARIA. Two factual errors in T3 are themselves
informative because they show what an attentive reviewer can
still miss in a 1700-line document:

1. "The specification does not document NAC.tab() in v1.0; the
   API shows only NAC.select()". This is incorrect. Section 3 P5
   explicitly lists `tab(plugin: string, tab_key: string):
   Promise<NacResult>` in the canonical TypeScript interface.
   DeepSeek likely missed this because the interface block sits
   inside a long ASCII pseudo-typescript declaration.
2. "The spec does not provide a dedicated API for detecting
   modals". This is incorrect for v1.3 onward. Section 15.5 ships
   `NAC.confirm(prompt, opts) -> Promise<boolean>` and
   `NAC.list_pending_confirms() -> ConfirmDialog[]` for exactly
   this. DeepSeek may have stopped reading at section 13/14 or
   underweighted the v1.3 additions.

Action items prompted by these errors:
- Consider adding a one-page driver-API cheat sheet at the top
  of the spec or in MANUAL.md so readers do not have to scan a
  TypeScript block for method names.
- Consider reorganising so v1.3 / v1.4 driver functions are
  visually adjacent to their use cases, not buried inside
  sections 15-16 numbered subsections.

These are annotations, not edits to DeepSeek's review. The review
itself stays verbatim above.

### 2.3 Claude (claude.ai free)

Model: Claude (claude.ai web, free tier; specific Sonnet version
  not surfaced in the UI -- assume Sonnet 4.x family)
Date:  2026-05-06
Browsing: on (fetched 3 of the 6 linked materials and explained
  the budget decision in the trace: "I have enough material; spec
  is the bulk of what I need; reference impl is fully read; demo
  page contents seen. I won't fetch the manual, philosophy, and
  changelog -- they'd push me over budget and the user's tasks
  are answerable from what I have.")
Prompt language: en (sanitized version)

Fetching trail visible in Claude's reasoning:
  1. Fetched spec/NAC-v1.0.md (full)
  2. Fetched js/nac.js (full)
  3. Fetched yujin.app/nac-spec/example.php (extracted)
  4. Did NOT fetch: MANUAL.md, PHILOSOPHY.md, CHANGELOG.md
     (explicit budget choice).

Claude was epistemically careful: it explicitly noted that the
public demo page (example.php) does NOT contain the
patch_manager plugin or the apply_all action that T3 asks about,
and answered T3 against the spec contract instead of fabricating
demo behavior. This is the kind of honest limitation-report the
prompt asks for, and the kind that DeepSeek did not perform on
the same question.

````
Review of NAC v1.0-v1.4

T1. Summary

NAC ("Native Accessibility Contract" / "Navegabilidad Automatica Compliance") is an MIT-licensed UI contract that lets autonomous operators -- test runners, voice assistants, AI agents, RPA bots -- drive a web page through the same surface a human uses, instead of scraping CSS selectors. It ships three things: (1) five data-nac-* HTML attributes (id, role, state, action, field-type) plus a per-plugin manifest_nac JSON object; (2) a standardized nac:* event family on document; (3) a dependency-free 1500-line reference runtime that installs window.NAC with read methods (describe, find, manifest) and write methods (click, fill, tab, etc.). Audience: frontend teams that want auto-generated E2E coverage and AI-driveability without committing to ARIA's full surface.

T2. Architectural review

Strongest decision. The two principles in section 1.6 -- "the system disappears" and "the AI agent acts as a human, not as another system" -- are genuinely load-bearing. They give the spec an honest reason to live next to MCP (section 1.7) instead of competing with it: NAC inherits permission, audit, i18n, and drift-resistance from the UI gate for free. The reference implementation makes this concrete: NAC.click() literally calls el.click() on the same DOM node a human would press, so authorization parity is a property of the design, not a promise. This is cleaner thinking than most "agent-friendly UI" proposals I've read.

Weakest decision. Versioning. The document is titled "NAC v1.0" but contains v1.1 (section 13), v1.2 (section 14), v1.3 (section 15), and v1.4 (section 16) all inline, all marked "normative", all dated 2026-05-06. Each minor version adds ~7-16 new roles, ~10 new events, and ~10 new driver functions. By v1.3 (section 15.1) the role vocabulary has grown from 12 to ~35 and the API from 16 functions to ~70. Calling this "MINOR per semver" (sections 13.8, 14.6, 15.8, 16.8) stretches the word -- a v1.0-only operator that hits a treenode or carousel-slide will silently degrade per sections 15.8/16.8, but the spec authors have implicitly committed to ~70 driver functions before any production deployment is described. The "5 attributes, 7 events, 5 functions, ~1 hour onboarding" promise made in section 1.5 to justify NAC over ARIA does not survive contact with sections 13-16.

Section likely to fail in production: section 7 + the click implementation. Section 7.2 says writes resolve "only after the corresponding event fires"; the reference click() (lines ~225-240 of nac.js) instead races nac:action:succeeded against nac:action:failed against a 200ms fallback that resolves { ok: true, event: null } regardless. So a click that triggers no event at all is reported as success after 200ms. For a CI test runner this is a flake factory: any slow backend that takes >200ms to emit nac:action:succeeded will get a phantom success, and the runner will move to the next assertion before the action has actually completed. The spec's awaitable-write contract and the reference implementation disagree.

Secondary concerns: section P7's "manifest is validated against the rendered DOM; drift is a CI blocker" is enforced only by NAC.validate(), which checks presence but not types, options, or depends_on graphs. Section 14.3's three-layer system map is well-shaped but has no normative way to declare which layer a system implements, so an agent has to probe by catching exceptions.

T3. Programming walkthrough

I should flag upfront: I read the demo page (yujin.app/nac-spec/example.php) and I do not see KPI cards or a patch_manager plugin on it. Those identifiers come from the spec's examples (sections 3-P1, 1.5). The demo ships a piano, a "secret modal", form fields, a tablist with Overview/Details/History, an accordion, a combobox, a slider, a sortable table, drag-and-drop, a dropzone, remote autocomplete, system map, self-test. So the questions below have to be answered against the spec contract, not against confirmed demo identifiers. If patch_manager and apply_all exist on the page I'd expect to find them; the rendered text I retrieved does not show them.

```js
// (a) KPI cards: spec defines role="kpi" (P2). Read every kpi globally:
const kpis = NAC.list('kpi').map(e => ({
  id: e.nac_id, label: e.label, value: e.value
}));
// AMBIGUITY: a kpi is typically a non-input <div>. _readElementValue
// (nac.js ~line 130) returns null for non-INPUT/SELECT/TEXTAREA nodes.
// In practice the value lives in textContent of an inner ".yj-kpi-value"
// child, which the serializer's label-fallback heuristic (lines ~110-120)
// captures only when no aria-label is set. The spec does not say where a
// KPI's *current value* lives; P7's NacKpi declares format/unit but not
// a value-bearing attribute. Implementers improvise.

// (b) verb "apply_all". The spec uses "apply" as a canonical verb (3-P2)
// and "apply_all" as an example nac_id, not a verb. Two readings:
const byId   = await NAC.click('apply_all');                 // by nac_id
const byVerb = NAC.list('action').find(a => a.action === 'apply_all');
if (byVerb) await NAC.click(byVerb.nac_id);
// AMBIGUITY: NAC.click takes a nac_id, not a verb. There is no
// NAC.dispatch_verb(). If two plugins both expose action verb="apply",
// the spec's only disambiguator is plugin scoping (4 instance_id) but
// the runtime resolves via _activePlugin() heuristic (most-recently-mounted
// with state=ready), which is not declared in the spec.

// (c) switch to tab "failed" inside patch_manager:
await NAC.tab('patch_manager', 'failed');
// AMBIGUITY: NAC.tab(plugin, tab_key) where tab_key matches data-nac-id
// of the tab element (nac.js ~line 280). The manifest's NacTab entry
// uses {nac_id, label_i18n} -- the second arg is the nac_id, not the
// label "failed". An agent driven by voice ("switch to the failed tab")
// must look up the manifest first to map label -> nac_id.

// (d) detect a confirmation dialog blocking input:
const blocking = NAC.list_pending_confirms();   // v1.3, 15.1
const isBlocked = blocking.length > 0;
// Correct API. Note: any v1.3 modal added via NAC.confirm() is detected,
// but a hand-rolled <div role="dialog"> the page renders itself is NOT
// (the v1.3 detector requires data-nac-role="confirm-dialog" +
// data-nac-state="pending"). For arbitrary dialogs the only generic
// signal is a plugin root with data-nac-plugin-state="ready" + role=dialog,
// which the spec does not formalize.
```

T4. Relationship to ARIA

Section 1.5 argues NAC is complementary, not a replacement, and the dual-attribute example (role="button" aria-label="Apply all" + data-nac-id="patch_manager.apply_all" data-nac-action="apply") is sound -- there is no semantic conflict between the layers. The argument that ARIA's WG has explicitly excluded imperative driver APIs is true and a fair reason to ship outside ARIA.

That said, the "complementary" claim is weakest where the surfaces visibly overlap. data-nac-state="loading" overlaps with aria-busy. data-nac-state="invalid" overlaps with aria-invalid. data-nac-state="expanded|collapsed" (v1.1, 13.6) overlaps with aria-expanded. data-nac-role="tab|tablist|tabpanel" reproduces ARIA roles by the same name. P6 says "NAC complements ARIA" and requires aria-label etc., but does not say which side is authoritative when they disagree, nor does the validator catch divergence (e.g. data-nac-state="loading" while aria-busy="false"). For an implementer, this is real friction: every state mutation has to update both attributes or risk silent disagreement between assistive tech and the test runner.

For a real project: if the team has no E2E framework and no AI-agent ambitions, ARIA alone is enough. If they need automation today and accept the parallel-attribute cost, NAC alongside ARIA is defensible. Picking NAC instead of ARIA would be wrong -- NAC explicitly does not cover screen-reader semantics (P6 outsources them).

T5. Adoption analysis

Minimum work for NAC-3 v1.0 on a typical SPA: tag every interactive element with five attributes, write one manifest_nac per plugin, wire the seven required events (3-P4), and load nac.js. For a 30-screen app this is roughly 1-2 engineer-weeks if done with a codemod against a component library.

Most underestimated cost. Keeping the manifest in sync with the DOM. P7 declares manifest drift a "CI blocker" but the reference validate() only checks ID presence -- not field types, not options_source, not depends_on graphs, not v1.1 table column declarations, not the v1.4 breadcrumb path. Teams will discover that adding a field to a form requires editing the component, the manifest, possibly a translations file, and a test runner expects all four to agree. This is the same drift problem GraphQL schemas, OpenAPI specs, and Storybook stories all have, and it is consistently underestimated.

What kills the rollout midway. Three likely causes. (1) The 200ms phantom-success in click() produces flaky CI; the team blames NAC and reverts. (2) Versioning anxiety: a team adopting "NAC v1.0" finds that the spec has v1.1-v1.4 inline, with sixteen new primitive families in v1.3 alone, and concludes the contract is not stable enough to bet on. (3) The NAC-3 v1.2+ manifest requirements (options_source, depends_on, transitions[]) require backend cooperation for any non-trivial dropdown -- what looked like a frontend-only contract turns into a cross-team project.

T6. Scores

- Clarity of specification: 6/10. Section structure is clean, examples are concrete, but four "normative" extensions inline in a "v1.0" document creates real confusion about what is stable.
- Usefulness for automated test/assistant tooling: 7/10. The manifest + verb vocabulary is the right primitive for AI agents and is meaningfully better than CSS-selector test suites. Capped by the click-resolution bug and the manifest-drift gap.
- Ease of adoption: 5/10. Easy at NAC-1; non-trivial at NAC-3 v1.0; substantial at NAC-3 v1.2+.
- Ambition vs. feasibility: 6/10. The principles are right and the core idea is sound; the surface area added in v1.1-v1.4 outruns the "1 hour onboarding" promise that justifies NAC's existence in section 1.5.

Closing line. I would recommend NAC at level NAC-2 v1.0 (baseline only) for an internal-tools team that wants AI-driven E2E test generation against a stable design system -- fix the click() resolution timeout before relying on it in CI, and treat anything past v1.1 as experimental until the spec collapses its extensions into a numbered release.
````

#### Reviewer accuracy notes (added by maintainer, not by Claude)

Claude reads the spec and the reference implementation
end-to-end and applies them with unusual precision. Verified
findings:

1. **The 200ms phantom-success in click() is real.** Confirmed
   in js/nac.js line 282:
   `new Promise(function (resolve) { setTimeout(function () { resolve({ ok: true, event: null }); }, 200); })`.
   This Promise is one of three legs of a Promise.race against
   `nac:action:succeeded` (5000ms) and `nac:action:failed`
   (5000ms). The 200ms leg always wins when no event fires at
   all, returning `{ ok: true, event: null }`. Spec section 7.2
   says writes resolve only after the corresponding event fires.
   The implementation does not honor this contract. DeepSeek
   independently flagged the same line. Two-reviewer
   corroboration on the same number on the same line in the same
   file is high signal. Action item committed to section 3.4.
2. **`NAC.click` takes nac_id, not verb.** Verified. Spec
   section 3 P5 declares `click(nac_id: string)`. Spec section 3
   P2 separates "verb" (the canonical operation name like
   `apply`) from "nac_id" (the plugin-namespaced identifier of
   one specific button). The manual conflates the two informally;
   the runtime API only exposes nac_id-keyed lookup. Action
   item: clarify in MANUAL.md.
3. **`NAC.tab(plugin, tab_key)` uses the tab's nac_id, not its
   label.** Verified. js/nac.js line ~280 (in the v1.0 tab
   resolver) queries by `data-nac-id`. Voice agents asking
   "switch to the failed tab" must first call `manifest()` to
   map label -> nac_id. Action item: spec section 3 P5 should
   note this explicitly; consider an additional driver
   `NAC.tab_by_label(plugin, label)` in v1.5.
4. **`NAC.list_pending_confirms()` is the right answer for
   detecting modals (v1.3 onward).** Verified -- spec section
   15.5. Note: this contradicts DeepSeek's claim in section 2.2
   T3 that "the spec does not provide a dedicated API for
   detecting modals". Claude got it right; DeepSeek did not.
5. **Role-vocabulary growth claim is conservative.** Claude says
   "from 12 to ~35 by v1.3 and ~70 driver functions by v1.4".
   Actual count: 12 (v1.0 P2) + 15 (v1.1 13.1) + 20 (v1.3 15.1)
   + 7 (v1.4 16.1) = **54 roles** by v1.4. Driver-function count
   is similar order of magnitude to Claude's estimate. The
   versioning critique is therefore even sharper than Claude
   argued.
6. **Demo-page mismatch is real and is a problem with our
   diffusion plan, not a problem with NAC.** The public demo at
   yujin.app/nac-spec/example.php was always a piano + tabs +
   accordion + dropzone showcase; the headline "patch_manager /
   apply_all" example in the spec lives at yujin.app/crm Centro
   de Control which is admin-gated and therefore unreachable
   from a cold AI review. Action item: either rewrite the spec
   examples to use the public-demo identifiers, or ship a
   public-accessible patch_manager-style showcase that matches
   the spec text.

These are annotations, not edits to Claude's review. The review
itself stays verbatim above.

### 2.4 Grok (grok.com free, Fast tier)

Model: Grok Fast (free tier; the "Reasoning" / "Think" tier was
  not used because the user reported it required a paid plan in
  their region/account state)
Date:  2026-05-06
Browsing: on (implicit; Grok did not surface a fetching trail in
  the visible output, but the review references material that
  comes from the spec body)
Prompt language: en (sanitized version)

Tier note: Grok ships two free tiers in the consumer UI, "Fast"
and "Reasoning" / "Think". Reasoning was unavailable for this
session (paywall hit). Fast is the cheaper / quicker variant
and tends to be less thorough on long-document tasks. Capture
this in cross-AI comparisons: Grok Fast is not equivalent to the
other two reviews above (DeepSeek with web-search reasoning,
Claude with tool use) and the difference shows in the output.

````
T1. SUMMARY
NAC (Native Accessibility Contract) proposes a lightweight, declarative contract for web (and potentially native) UIs: a small set of data-nac-* HTML attributes, a JSON manifest per "plugin" (self-contained UI surface), a fixed set of semantic verbs/roles/states, and a thin window.NAC JavaScript runtime. This enables test runners, AI agents, voice assistants, and RPA bots to discover, read, and operate elements via stable semantic IDs and verbs instead of brittle CSS selectors or DOM inspection.

Intended audience: frontend teams wanting high E2E test coverage and AI/voice operability without heavy per-screen scripting; automation/AI practitioners needing reliable UI driving. It ships a ~1700-line spec (v1.0 core + extensions to v1.4), reference JS runtime (~1500 LOC, zero deps), authoring manual, and demo. Compliance levels (NAC-1/2/3) scale from basic marking to full manifest + events.

T2. ARCHITECTURAL REVIEW
Strongest design decision: P1 Stable identity combined with the plugin-namespaced data-nac-id + manifest (sections 3/P1, 4, ~lines 270-288 in spec). This creates a human-readable, refactor-resistant addressing scheme that survives re-renders and locale changes, directly addressing the core pain of selector fragility. The manifest-as-contract (with kpis/actions/fields/tabs) enables pre-rendering discovery and planning, which is powerful for agents.

Weakest: Heavy reliance on global document event dispatching for the nac:* family (lifecycle, action, plugin, field events) without built-in scoping or namespacing beyond plugin_slug in payloads. In complex SPAs with multiple independent plugins or shadow DOM, this risks event collision or noisy global listeners; the reference impl's _activePlugin() heuristic (most recent ready plugin) is pragmatic but brittle.

One adoption trouble spot: Section 6 (compliance levels) and the evolving vocabulary (v1.0 -> v1.4 additions in sections 14-16: toasts, trees, carousels, breadcrumbs, etc.). A production codebase adopting at NAC-3 must maintain the full manifest, emit precise events on every primitive, and handle versioned extensions. Teams will underestimate the ongoing tax of keeping manifests in sync with dynamic UI (e.g., generated tables, conditional fields) and wiring 30+ event types. The spec notes backwards compatibility, but real maintenance across releases could fatigue teams.

T3. PROGRAMMING WALKTHROUGH
Using only window.NAC.* on the demo page:

```javascript
// a) Read KPI cards (labels + values)
const snap = NAC.describe();  // or NAC.list('kpi') for filtered
const kpis = snap.plugins.flatMap(p => p.elements)
  .filter(e => e.role === 'kpi' || e.nac_id.startsWith('kpi.'));
console.log(kpis.map(k => ({label: k.label, value: k.value})));

// b) Trigger "apply_all" if exists
const applyResult = await NAC.click('apply_all');  // auto-waits for succeeded/failed
if (!applyResult.ok) console.error(applyResult.event);

// c) Switch tab
await NAC.tab('patch_manager', 'tab.failed');  // or equivalent nac_id

// d) Detect blocking confirmation dialog
const pending = NAC.list('confirm-dialog');  // or check snapshot_state / describe for role=confirm-dialog
const blocking = pending.some(d => d.visible && d.state !== 'dismissed');
```

Ambiguities: Spec is clear on most (NAC.click, NAC.tab, NAC.describe/list), but "KPI cards" mapping relies on convention (role=kpi or naming) -- not rigidly defined in core v1.0 for all static readouts (P6 observability helps via label/value). Confirmation detection has no single canonical NAC.isBlocked(); one scans via list/describe or listens for nac:confirm:requested (v1.3). NAC.read_feedback() covers errors but not always modals. Reference impl behavior (e.g., _findElement scoping) is reliable but not exhaustively documented for edge cases like nested plugins.

T4. RELATIONSHIP TO ARIA
The argument in section 1.5 is convincing: ARIA targets human assistive tech (primarily screen readers, declarative audio map); NAC targets autonomous programmatic operators (imperative driver API, verbs, manifest, events). Audiences and affordances differ -- ARIA is not designed for NAC.click() or structured event subscriptions. Complementary layering on the same elements works cleanly, as shown in examples.

Minor overlaps exist (e.g., states vs. aria-busy, roles), but semantics diverge enough (NAC data-nac-action="apply" vs. ARIA role="button") to avoid deep confusion if teams follow the manual's guidance. I would adopt NAC alongside ARIA in a real project for teams needing strong automation/AI support; ARIA alone suffices for basic a11y compliance, but NAC adds the operable contract that modern agent tooling desperately needs. Neither fully replaces the other.

T5. ADOPTION ANALYSIS
Minimum work for NAC-3: (1) Add ~3-5 data-nac-* attributes per interactive element + plugin root; (2) Register a JSON manifest once per plugin (fields/actions/kpis/tabs); (3) Emit ~5-10 key nac:* events on mount/action/field lifecycle; (4) Include the nac.js runtime. For a medium app, this is days to weeks initially if using a design system.

Most underestimated: Ongoing manifest synchronization and event wiring as UI evolves (dynamic forms, A/B tests, new primitives in v1.3/1.4). Teams often ship static markup but forget runtime updates or conditional elements, leading to stale contracts. Validation/runtime errors from mismatched manifests compound this.

Abandonment triggers: High churn in complex/dynamic UIs where manifest maintenance exceeds perceived test/AI gains; lack of framework integrations (React/Vue/Svelte helpers missing in core); or when selectors + existing tools already "work well enough" for their scale. Without strong internal champions or measurable ROI (e.g., test coverage jump), mid-rollout fatigue is likely.

T6. SCORES AND CLOSING LINE
Clarity of spec: 8/10 (well-structured, principled, but dense with extensions). Usefulness for test/assistant tooling: 9/10 (semantic + events + API solve real pains). Ease of adoption for typical web team: 6/10 (lightweight start, but discipline tax). Ambition vs. feasibility: 8/10 (pragmatic evolution, strong compat).

I would recommend NAC for internal enterprise tools or products targeting AI/voice copilots and high test automation, where the stable contract yields clear long-term ROI over selector fragility.
````

#### Reviewer accuracy notes (added by maintainer, not by Grok)

Grok Fast is the lightest of the three reviews so far. It hits
the high notes correctly (P1 stable identity as strongest; P7
manifest as second pillar; semver/extensions as adoption risk)
but skips the deep-spec verification that Claude performed. Two
findings that DeepSeek and Claude caught are absent here:

1. **Did NOT catch the line 282 phantom-success bug.** Grok
   wrote `await NAC.click('apply_all'); // auto-waits for
   succeeded/failed`. This is the spec contract (section 7.2),
   not what the reference implementation does. The 200ms
   fallback in js/nac.js line 282 silently resolves to
   `{ ok: true, event: null }` regardless of whether any event
   fired -- exactly the gap DeepSeek and Claude both caught.
   Grok did not read the implementation closely enough to
   notice the contract violation. Two-of-three reviewers caught
   the bug; corroboration on action item 3.4-A still holds.
2. **Did NOT flag the demo-vs-spec mismatch.** Grok confidently
   wrote `await NAC.click('apply_all')` and
   `NAC.tab('patch_manager', 'tab.failed')` against the public
   demo. The public demo (yujin.app/nac-spec/example.php) does
   NOT contain a patch_manager plugin or an apply_all action
   -- those identifiers come from the spec's narrative
   examples, which point to the admin-gated yujin.app/crm
   showcase. Claude flagged this honestly; DeepSeek and Grok
   did not. Action item 3.3-C still holds.

But Grok contributed one new finding that neither of the other
reviewers raised, and it is verifiable:

3. **Global event dispatch with no per-plugin scoping.** Grok
   pointed out that all `nac:*` events fire on `document` with
   `bubbles: true`, with the only scoping signal being
   `plugin_slug` inside the payload. Verified in js/nac.js:
   every `_emit*()` helper calls `document.dispatchEvent(new
   CustomEvent('nac:...', { detail, bubbles: true }))` (lines
   61, 305, 360, 451, 546, and several more). Listeners on
   `document` therefore see events from every NAC plugin in
   the page; consumers must filter on `event.detail.plugin`
   manually. In SPAs that mount multiple plugin instances
   (multi-window CRM views, modal stacks, shadow-DOM-encased
   web components), this requires every listener to be
   payload-aware, and there is no spec-level guarantee that
   plugin slugs are unique across mounted instances of the
   same plugin (e.g. two open patch_manager modals). This is
   a legitimate gap and produces a new action item, 3.2-E
   below.

Score commentary: Grok scored higher than the other two
reviewers (8/9/6/8 vs Claude's 6/7/5/6 and DeepSeek's 7/9/5/8).
Plausible explanations: (a) Grok Fast tier is lighter on rigor
than Reasoning, so penalties for deep bugs were not applied
because the bugs were not noticed; (b) Grok's RLHF profile may
drift more positive on novel-but-coherent specs; (c) the
sanitized prompt removed the explicit anti-sycophancy clause,
and Grok Fast appears more sensitive to that absence than
Claude or DeepSeek were. Cross-AI score comparison should be
read with the model-tier asymmetry in mind, not as a clean
ranking.

These are annotations, not edits to Grok's review. The review
itself stays verbatim above.

### 2.5 Microsoft Copilot

Model: Microsoft Copilot (free, web). Underlying model not
  surfaced in the UI; assume GPT-4-class with browsing. Pablo
  pasted the spec contents during the session when Copilot
  asked, so the review is grounded in v1.4.1 (post-AI-peer-
  review patch), not v1.4.0 like the previous three reviewers.
Date:  2026-05-06 (post v1.4.1 release)
Browsing: on (Copilot fetched the spec, then asked Pablo to
  paste the runtime + manifest + ARIA-NAC sections directly)
Prompt language: en (sanitized version)

Tier note: Copilot is the first reviewer to read the v1.4.1
spec. The earlier three (DeepSeek, Claude, Grok) reviewed
v1.4.0. Score deltas are partially attributable to the
in-flight contract tightening, not only to Copilot's reviewer
profile. Capture this asymmetry explicitly in cross-AI
comparisons.

````
I now have the full normative spec, including:

P1-P7

Manifest schema

Event model

Awaitable-write contract

ARIA-NAC authority rules

Compliance levels

v1.1 widget extensions

This is everything required to produce the full technical review.

Full Technical Review of NAC (v1.0-v1.4.1)
(T1-T6, <=1500 words, with citations to the spec you provided)

T1. SUMMARY (<=120 words)
NAC is an open-source UI contract that adds five DOM attributes, seven lifecycle events, and a driver API (window.NAC.*) so autonomous operators -- AI agents, voice assistants, RPA bots, and test runners -- can reliably navigate and operate a UI without selectors. It targets frontend teams, QA, and automation engineers. NAC ships: a normative spec (roles, states, events, manifest), a reference JS runtime, a validator, and a test runner. Its goal is to make UIs machine-operable with the same semantics humans see, while remaining compatible with ARIA (S1.5).

T2. ARCHITECTURAL REVIEW (200-400 words)
Strongest design decision: the seven pillars (P1-P7)
The spec's backbone is the seven pillars (S3), especially P1 stable identity, P2 semantic roles, P3 explicit state, and P4 lifecycle events. Together they form a coherent, minimal contract that is both human-readable and machine-operable. The insistence that data-nac-id be semantic, stable, plugin-namespaced, and non-generated (S3 P1) is the single most important stabilizer for automation. The awaitable-write contract (S7.1) is also excellent: it eliminates flake by requiring that click() resolve only on real events, not timers.

Weakest design decision: plugin-instance scoping and multi-mount complexity
The multi-instance rules in P5.1 and S7.4 are correct but heavy. Requiring operators to pass plugin_instance_id to avoid ambiguity is realistic, yet the fallback ("last ready plugin in DOM order") is brittle for large apps. This is the one area where NAC's simplicity breaks: multi-mount UIs become significantly more complex to reason about, and the spec's rules are long and easy to misapply.

Most adoption-challenging section: ARIA-NAC authority rules (S7.2)
The requirement that authors synchronize NAC state and ARIA attributes atomically is correct but difficult in real production codebases. Many frameworks batch DOM updates asynchronously; guaranteeing that data-nac-state="loading" and aria-busy="true" update in the same tick is nontrivial. The fallback (aria_lag_ms in the manifest) is helpful but adds cognitive load.

Other adoption risks
Manifest drift rules (P7): requiring CI to fail when manifest and DOM diverge is good, but teams with dynamic UIs may underestimate the maintenance burden.

Event vocabulary explosion (v1.1 S13.3): dozens of widget-specific events increase surface area; teams may implement only partially, leading to inconsistent operator behavior.

State vocabulary richness (S7.3): mapping NAC -> ARIA is clear, but the reverse is not; developers may forget to mirror ARIA attributes.

Overall, the architecture is strong, but multi-instance scoping and ARIA synchronization are the most fragile parts.

T3. PROGRAMMING WALKTHROUGH (200-400 words)
Using only window.NAC.* against the public demo (example_demo), here is how a test runner would operate:

a) Read labels and current values of KPI cards
js
const snap = NAC.describe();   // P5
const kpis = snap.kpis;        // spec: NacSnapshot includes kpis[]
for (const k of kpis) {
  console.log(k.nac_id, k.label, k.value);
}
Ambiguity:
The spec defines NacSnapshot only narratively (S P5) and does not explicitly list the shape of kpis[]. The manual implies { nac_id, label, value }, but the normative spec does not define the exact fields.

b) Trigger the action whose verb is "apply_all"
Two options:

js
await NAC.click('apply_all');                 // P5
// or (v1.4.1 ergonomic helper)
await NAC.click_by_verb(null, 'apply');       // S P5, S 9
Ambiguity:
click_by_verb matches actions[].verb, not nac_id. If the verb is "apply" but the ID is "apply_all", the helper works; if a plugin has multiple "apply" verbs, behavior is underspecified (spec says "search manifest first" but not how ties break).

c) Switch to the tab named "failed" inside patch_manager
js
await NAC.tab('patch_manager', 'tab.failed');     // P5
// or (v1.4.1)
await NAC.tab_by_label('patch_manager', 'failed');
Ambiguity:
tab_by_label matches label or label_i18n, but the spec does not define whether matching is case-insensitive or locale-aware.

d) Detect whether a confirmation dialog is blocking input
Use v1.3 confirm API:

js
const pending = NAC.list_pending_confirms();   // API_REFERENCE v1.3
const isBlocking = pending.length > 0;
Ambiguity:
The normative spec does not define confirm dialogs at all; they exist only in the API reference. There is no section in the spec describing confirm lifecycle events or required DOM attributes.

T4. RELATIONSHIP TO ARIA (150-300 words)
The argument in S1.5 is convincing: ARIA and NAC serve different audiences and different layers. ARIA is declarative and screen-reader-oriented; NAC is imperative and operator-oriented. The spec is careful to avoid semantic overlap: NAC roles (action, field, kpi) do not conflict with ARIA roles (button, textbox, status). The authority rule (S7.2) is particularly strong: it explicitly states that ARIA governs assistive tech and NAC governs autonomous operators, resolving ambiguity.

However, there are overlapping concepts that may confuse implementers:

data-nac-state="loading" vs aria-busy="true"

data-nac-state="invalid" vs aria-invalid="true"

tab role vs ARIA role="tab"

The mapping table (S7.3) helps, but developers must maintain both layers manually, which increases cognitive load.

Would I adopt NAC alongside ARIA?
Yes, if the project requires automation, voice control, or AI assistance. NAC does not replace ARIA; it fills a gap ARIA intentionally leaves open. If the project is accessibility-only, ARIA alone suffices; if the project is automation-heavy, NAC is the better investment.

T5. ADOPTION ANALYSIS (150-300 words)
Minimum work for NAC-3
A team must implement all pillars P1-P7:

Add five attributes to every interactive element (S3).

Emit seven lifecycle events (S3 P4).

Build and register a manifest (S P7).

Implement the awaitable-write contract (S7.1).

Mirror ARIA attributes (S7.2-7.3).

Ensure validator passes in CI (S P7).

Most underestimated part
Event correctness. Teams often underestimate how hard it is to emit nac:action:succeeded at the exact semantic boundary of an operation. Many UIs have async chains, optimistic updates, or race conditions. Getting events wrong breaks automation more than missing attributes.

What causes abandonment
Manifest drift pain: if the manifest is large and the UI changes frequently, teams may find CI failures too noisy.

Multi-instance complexity: apps with many modals or nested views may struggle with plugin_instance_id rules (S7.4).

ARIA synchronization: teams not already disciplined in accessibility may find dual-layer updates burdensome.

Widget extensions: v1.1 adds many roles/events; partial implementation leads to inconsistent behavior.

The biggest risk is underestimating the rigor required for NAC-3. It is not "add some attributes"; it is "publish a stable contract and never violate it."

T6. SCORES AND CLOSING LINE
Axis    Score (1-10)
Clarity of specification    8 -- very thorough, but long and occasionally redundant.
Usefulness for automation    10 -- best-in-class contract for UI-driven agents.
Ease of adoption    6 -- simple in concept, demanding in practice (events, ARIA sync, manifests).
Ambition vs feasibility    9 -- ambitious but grounded; multi-instance rules are the hardest part.

Recommendation: NAC is an excellent fit for AI-driven E2E testing in large SPAs where selector flake is the dominant cost.
````

#### Reviewer accuracy notes (added by maintainer, not by Copilot)

Copilot is the first reviewer to read v1.4.1 (post-patch). The
earlier three (DeepSeek, Claude, Grok) reviewed v1.4.0. With
that asymmetry stated, Copilot's findings break down as
follows:

**Findings v1.4.1 already addresses (acknowledgement of patch):**

- "Awaitable-write contract is excellent" -- Copilot reads
  S7.1 as the final form, explicitly states this fixes the
  flake-factory criticism that DeepSeek and Claude raised
  against v1.4.0. v1.4.1 sec 7.1 lands this.
- "Authority rule (S7.2) is particularly strong" -- the new
  section that DeepSeek + Claude both implicitly asked for.
- "Stable identity (P1) is the single most important
  stabilizer" -- aligns with Grok's read of v1.4.0.

**New findings not raised by the previous three reviewers:**

1. **NacSnapshot / NacKpi / NacField / NacResult shapes are
   defined narratively, not normatively.** Section P5 declares
   the function signatures via TypeScript interface but does
   not formalise the *return shapes*. The manual implies
   `{ nac_id, label, value }` for kpis but the normative spec
   has no such interface. AI test runners reading the spec
   cold cannot rely on the kpi shape. Action item: 3.5-A.

2. **`click_by_verb` tie-breaking when multiple actions share
   the same verb in the same plugin.** Section P5 says
   "search manifest first" but does not specify how the
   resolver picks among actions with `verb: "apply"` that
   have different `nac_id`s. Multi-action verbs are common
   (a save button + a save-as button might both verb as
   `apply`). Action item: 3.5-B.

3. **`tab_by_label` matching rules unspecified.** The
   reference runtime does case-insensitive trim; the spec
   does not state this. Locale-aware matching (Turkish
   dotless-i, German esszett) is also unspecified. Action
   item: 3.5-C.

4. **Confirm-dialog contract is in API_REFERENCE.md but the
   normative spec section 15 is thin on lifecycle events and
   required DOM attributes.** A reviewer who reads only the
   spec (not the manual) cannot tell what shape a confirm
   dialog must take. Action item: 3.5-D.

5. **Event vocabulary at NAC-3 is treated as monolithic.**
   Copilot flags v1.1 widget-specific events as a partial-
   implementation risk: a team that ships only the seven
   v1.0 lifecycle events and skips v1.1 widget events still
   claims NAC-3 today. Compliance levels need a MUST/MAY
   split per event family. Action item: 3.5-E.

6. **ARIA synchronisation in batched-update frameworks is
   underdocumented.** React 18 / Vue 3 / Svelte 5 all batch
   DOM writes; guaranteeing that `data-nac-state` and
   `aria-busy` land in the same tick requires framework-
   specific patterns. The `aria_lag_ms` escape hatch in
   manifest exists but the spec does not show how to apply
   it correctly in each framework. Action item: 3.5-F
   (manual addition, not spec change).

7. **Reverse mapping ARIA -> NAC is not documented.**
   Section 7.3 maps NAC states to ARIA but not the reverse.
   Authors who start ARIA-first may forget to mirror back to
   NAC. Action item: 3.5-G (decide whether to add reverse
   mapping or normatively forbid it).

8. **`data-nac-plugin-id` is currently SHOULD; multi-mount
   apps would be safer if it were MUST.** Today the
   active-plugin fallback (P5.1 step 3, "last ready plugin
   in DOM order") is the *fail-soft* mode. Copilot reads
   this as brittle for large apps. Action item: 3.5-H
   (decide whether to upgrade SHOULD -> MUST when a host
   mounts multiple instances of the same plugin slug).

9. **"Event correctness is the most underestimated cost".**
   This is a manual-level guidance gap, not a spec gap. The
   manual currently shows attribute templates but not when
   to fire `nac:action:succeeded` in async-chain / optimistic-
   update / race-condition scenarios. Action item: 3.5-I.

**Score interpretation (cross-AI comparison):**

| Axis              | Claude v1.4.0 | DeepSeek v1.4.0 | Grok v1.4.0 | Copilot v1.4.1 |
|-------------------|--------------|-----------------|-------------|----------------|
| Clarity           | 6            | 7               | 8           | 8              |
| Usefulness        | 7            | 9               | 9           | 10             |
| Ease of adoption  | 5            | 5               | 6           | 6              |
| Ambition vs feasibility | 6     | 8               | 8           | 9              |

Clarity 6 -> 8 and Ambition 6 -> 9 between Claude (v1.4.0) and
Copilot (v1.4.1) is the cleanest read of the patch's effect.
Adoption stayed flat at 6 -- which is honest: tightening the
contracts does not by itself reduce adoption work, only makes
the work more explicit. Usefulness ticked from 7-9 to 10
because every reviewer recognises NAC's automation case once
they read it; the phantom-success bug capped Claude at 7
specifically.

These are annotations, not edits to Copilot's review. The
review itself stays verbatim above.

### 2.6 ChatGPT (free tier) -- pending

```
Model: ___________________ (likely GPT-4o-mini or 5-mini in free tier)
Date:  ___________________
Browsing: on / off
Prompt language: en / es

(paste full output here)
```

### 2.7 Mistral Le Chat -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en / es

(paste full output here)
```

### 2.8 Kimi (moonshot) -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en / es

(paste full output here)
```

### 2.9 Qwen Chat -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en / es

(paste full output here)
```

> Add new subsections for any other free-tier AI worth reviewing.
> Examples to consider: Perplexity (free), Pi (Inflection), Copilot
> (Microsoft, free tier), HuggingChat, Poe.com aggregator, Phind.

---

## 3. Synthesis (running, updated as reviews arrive)

> Currently N=4 (DeepSeek + Claude + Grok Fast on v1.4.0;
> Copilot on v1.4.1). This section is preliminary and will be
> revised as more reviews land. Patterns called out below are
> tagged with the reviewers that raised them so partial
> corroboration is visible.
>
> **Versioning context.** The first three reviews drove the
> v1.4.1 patch release. Copilot's review then ran against
> v1.4.1 and validated several of the fixes, while surfacing
> nine NEW findings (3.5-A through 3.5-I, listed in 3.5
> below) that the earlier reviewers did not raise. The v1.5
> roadmap is the consolidation point for those.

### 3.1 Patterns across reviewers

**Common praises (cited by 2+ reviewers):**
- The "manifest as the contract" principle is the spec's core
  win. DeepSeek and Claude both call P7 the strongest design
  decision; Grok shifts focus to P1 stable identity but credits
  the manifest as the operative second-pillar that makes
  "pre-rendering discovery and planning" possible. Net: 3/3
  reviewers credit the manifest+ID combination as the core
  asset.
- The "act as a human, do not bypass the UI gate" principle
  (section 1.6) is described as "load-bearing" by Claude and is
  implicit in DeepSeek's praise of the design philosophy. Grok
  does not name it explicitly.

**Common critiques (cited by 2+ reviewers):**
- **The 200ms phantom-success in `NAC.click()`** (js/nac.js line
  282) -- DeepSeek and Claude both identify this as a flake
  factory for CI test runners. Spec section 7.2 says writes
  resolve "only after the corresponding event fires"; the
  implementation resolves `{ ok: true, event: null }` after
  200ms regardless. Grok Fast did NOT catch this -- it actually
  asserted the wrong thing ("auto-waits for succeeded/failed")
  and did not read the implementation. Two-of-three corroboration
  on a verifiable bug; action item 3.4-A still holds.
- **Manifest-vs-DOM drift in dynamic SPAs.** P7 declares drift a
  "CI blocker" but the reference `validate()` only checks
  presence, not field types, options graphs, or v1.4 breadcrumb
  paths. DeepSeek and Claude both expect this to bite. Grok
  raises a related but distinct concern: ongoing manifest
  *synchronization* tax (dynamic forms, A/B tests, conditional
  fields), which is a runtime drift problem, not a validator
  scope problem. Two-of-three on the validator gap; three-of-
  three that drift in some form is the rollout's main risk.
  Action item 3.4-B.
- **Versioning sprawl.** Claude makes the strong version of this
  argument: file titled NAC v1.0 contains v1.1..v1.4 inline,
  ~54 roles by v1.4, ~70 driver functions, "MINOR per semver"
  is a stretch. Grok Fast makes the soft version: "evolving
  vocabulary v1.0 -> v1.4 ... teams will underestimate the
  ongoing tax of keeping manifests in sync ... and wiring 30+
  event types ... real maintenance across releases could fatigue
  teams". DeepSeek does not raise versioning. Two-of-three on
  the same underlying concern with different sharpness; action
  item 3.2-A still holds.
- **Adoption is not 1 hour.** Section 1.5 promises "5 attributes
  + 7 events + 5 functions, ~1 hour onboarding". Three
  estimates from three reviewers, all longer than the promise:
  DeepSeek 2-3 days for a medium app; Grok "days to weeks
  initially if using a design system"; Claude 1-2 engineer-weeks
  for a 30-screen SPA. The spread is consistent: nobody believes
  the 1-hour figure once they read the spec.

**ARIA overlap (Claude specific, others mild):**
- Claude names concrete overlaps: `data-nac-state="loading"` vs
  `aria-busy`, `data-nac-state="invalid"` vs `aria-invalid`,
  `data-nac-state="expanded|collapsed"` vs `aria-expanded`,
  `data-nac-role="tab|tablist|tabpanel"` reproduces ARIA roles.
  Grok acknowledges "minor overlaps exist (e.g., states vs
  aria-busy, roles)" without naming the full set. DeepSeek
  describes the overlap as cognitive-load cost without
  enumerating. Three-of-three reviewers find some overlap; only
  Claude makes it specific. Carries action item 3.2-D
  (authoritative-side rule when NAC and ARIA disagree on the
  same element).

**Lone-voice critiques worth taking seriously (cited by one
reviewer, specific and falsifiable):**
- **Global event dispatch with no per-plugin scoping** (Grok
  only). Every `nac:*` event fires on `document` with
  `bubbles: true`; the only scoping signal is `plugin` /
  `plugin_slug` inside the payload. Verified in js/nac.js
  (lines 61, 305, 360, 451, 546+). In SPAs that mount multiple
  plugin instances (multi-window CRM views, modal stacks,
  shadow-DOM-encased web components), every listener must
  filter on payload, and the spec does not guarantee that
  plugin slugs are unique across mounted instances. Action
  item 3.2-E.
- **`NAC.click` takes nac_id, not verb** (Claude only). Voice
  agents that hear "apply all" cannot call `NAC.click('apply')`;
  they must look up the manifest first. The runtime falls back
  to `_activePlugin()` heuristic (most-recently-mounted with
  state=ready) which is not declared in the spec. Action item
  3.2-B.
- **`NAC.tab(plugin, tab_key)` uses nac_id, not label**
  (Claude only). Same voice-agent friction as above.
- **The system_map (section 14.3) has no normative way to
  declare which layer a system implements** (Claude only). An
  agent has to probe by catching exceptions. Action item 3.2-C.

**Disagreements between reviewers:**
- DeepSeek wrote "The spec does not provide a dedicated API for
  detecting modals" (T3-d). Claude wrote `NAC.list_pending_confirms()`
  is the correct API (section 15.5). Claude is correct;
  DeepSeek missed v1.3. This itself is a finding -- the v1.3
  driver-function additions are not as discoverable as they
  should be from a cold read of the spec. Both this disagreement
  and DeepSeek's earlier claim that "NAC.tab() is not documented
  in v1.0" point to the same underlying issue: the canonical
  TypeScript interface in section 3 P5 is dense, and reviewers
  miss methods. Action item 3.3-A.
- DeepSeek's role-count claim ("12 -> not specified, but small")
  vs Claude's count ("12 -> ~35 by v1.3"). Actual count: 54 by
  v1.4. Claude undercounted; DeepSeek did not count. Either way,
  both reviewers underestimate the real surface area, which
  reinforces the versioning concern.

### 3.2 Spec changes prompted by this review round

- [x] **3.2-A**: Reconcile the "~1 hour onboarding" promise in
      section 1.5 with the actual surface area at NAC-3 v1.4.
      Either revise the promise (state realistic numbers like
      "1 hour for NAC-1, 1-2 weeks for NAC-3 on a 30-screen
      SPA") or split the spec into a stable v1.0 core + numbered
      extension packs that teams can opt into. Two reviewers
      independently flag the gap; the right answer is probably
      both.
- [x] **3.2-B**: Document the `_activePlugin()` resolution
      heuristic in section 3 P5 (or in section 4 lifecycle).
      Today the runtime falls back to "most recently mounted
      plugin with state=ready, then topmost in DOM order" --
      this is implementation behavior, not specified contract.
- [x] **3.2-C**: Add a normative way for a `system_map` (section
      14.3) provider to declare which layer (legacy / mid /
      modern) it implements, so agents do not have to probe.
- [x] **3.2-D**: Clarify in section 7.2 that the awaitable-write
      contract is mandatory: implementations MUST NOT resolve
      `click()` / `fill()` / `select()` until either
      `nac:action:succeeded` or `nac:action:failed` has fired,
      OR they MUST raise a typed timeout. The current "resolves
      `{ ok: true, event: null }` after 200ms" pattern in the
      reference implementation contradicts this and should be
      treated as a bug, not a permitted variant. Also add a rule
      for ARIA-NAC disagreement: when `data-nac-state="loading"`
      coexists with `aria-busy="false"` (or any analogous
      mismatch), the spec MUST declare which side is
      authoritative for which kind of consumer (assistive tech
      vs. test runner vs. agent). Today, divergence is silent.
- [x] **3.2-E**: Document event scoping. Either (a) declare
      `event.detail.plugin` (currently named `plugin` /
      `plugin_slug` inconsistently across emitters) the
      canonical filter and require listeners to apply it, plus
      require plugin slugs to be unique within a mounted page;
      OR (b) allow per-plugin event buses (e.g.
      `plugin_root.dispatchEvent(...)` with a documented
      bubbling-stop convention) so listeners can scope locally.
      Today every `nac:*` event fires on `document` with
      `bubbles: true` and there is no spec-level guarantee that
      a multi-mounted plugin is uniquely addressable. Grok
      raised this; verified in js/nac.js lines 61, 305, 360,
      451, 546 and others.

### 3.3 Documentation changes prompted

- [x] **3.3-A**: Add a one-page driver-API cheat sheet to the
      top of MANUAL.md (or as a separate `docs/API_REFERENCE.md`)
      listing every `window.NAC.*` method with its signature,
      version added, and a one-line description. DeepSeek missed
      `NAC.tab()` and `NAC.list_pending_confirms()`; Claude
      caught both but spent budget reading the full spec to do
      it. A cheat sheet would close the gap for less-thorough
      reviewers and for adopters.
- [x] **3.3-B**: Reorder the inline extension sections (13/14/
      15/16) so the driver functions appear earlier in each
      section, not buried in subsection 5/6 of each version.
      OR: pull every driver function into a single API reference
      table that is updated per version, separate from the
      narrative spec.
- [x] **3.3-C**: Reconcile the diffusion-plan demo target with
      the spec example identifiers. The headline example
      (`patch_manager` / `apply_all`) lives behind admin auth at
      yujin.app/crm Centro de Control. The public demo at
      yujin.app/nac-spec/example.php is a piano + tabs +
      accordion + dropzone showcase. Cold AI reviewers cannot
      validate the spec against the headline example -- they
      either fabricate, or (Claude) flag the mismatch honestly.
      Either rewrite spec examples to use the public-demo
      identifiers, or ship a public patch_manager-style showcase.

### 3.4 Implementation changes prompted

- [x] **3.4-A**: Fix the 200ms phantom-success in `NAC.click()`
      (js/nac.js line 282). Two reviewers independently flagged
      this. Recommended fix: replace the unconditional 200ms
      `resolve({ ok: true, event: null })` with a typed timeout
      `reject(NacError('timeout', ...))` after a configurable
      window (default 5000ms, matching the existing succeed/fail
      legs). If a plugin chooses not to emit
      `nac:action:succeeded`, the agent should learn that
      explicitly via the timeout, not silently see "success" and
      move on. Same fix likely applies to `fill()`, `select()`,
      `tab()`.
- [x] **3.4-B**: Strengthen `NAC.validate(slug)` to check field
      types, options_source, depends_on graphs, and v1.1 table
      column declarations against the manifest, not just ID
      presence. P7's "drift is a CI blocker" promise is
      currently vacuous because the validator catches almost no
      drift.
- [x] **3.4-C**: Either add `NAC.click_by_verb(plugin, verb)` or
      document explicitly that `click()` is by nac_id only and
      that voice agents must use `manifest()` -> filter -> nac_id
      lookup. Same for `tab_by_label`.

### 3.5 New action items from Copilot's review of v1.4.1 (target v1.4.2 / v1.5)

> Surfaced 2026-05-06 by Microsoft Copilot reading the v1.4.1
> spec. Items 3.5-A..3.5-I are NEW; the previous reviewers did
> not raise them. Triaged below by category. None are blockers
> for v1.4.1 itself; the v1.4.1 contracts they apply to are
> internally consistent, just under-formalised in places.

#### Spec gaps (need normative additions)

- [x] **3.5-A**: Formalise the return shapes of P5 driver
      functions as normative TypeScript interfaces. Today the
      function signatures use names like `NacSnapshot`,
      `NacElement`, `NacKpi`, `NacField`, `NacResult`,
      `NacFeedback`, `NacEvent`, `NacStateSnapshot`,
      `NacManifest` -- but only `NacManifest`, `NacField`,
      `NacAction`, `NacTab`, `NacKpi` (the manifest pieces)
      are formalised. The runtime *return* shapes from
      `describe()`, `find()`, `read_feedback()`,
      `snapshot_state()`, and the `event` field returned by
      write resolves are defined only narratively. AI test
      runners reading the spec cold cannot rely on the kpi
      shape returned from `describe()`. Action: add a "P5
      return shapes" subsection with full interfaces.

- [x] **3.5-B**: Define tie-breaking rule for
      `click_by_verb()` when multiple actions in the same
      plugin manifest declare the same `verb`. Section P5
      says "search manifest first" but does not specify
      ordering. Recommended: pick the first match in
      `actions[]` array order, document this as the
      deterministic rule, and add an `actions[].verb`
      uniqueness LINT in `NAC.validate()`.

- [x] **3.5-C**: Document `tab_by_label()` matching
      semantics: case-insensitive, whitespace-trimmed,
      locale-aware (Turkish dotless-i etc.). The reference
      runtime today is case-insensitive trim only; spec is
      silent. Either tighten runtime to use locale-aware
      comparison and document, or explicitly call out the
      simplification.

- [x] **3.5-D**: Promote the confirm-dialog contract from
      API_REFERENCE / section 15.5 narrative to a normative
      lifecycle subsection of section 7. Required: confirm
      DOM attributes (`data-nac-role="confirm-dialog"`,
      `data-nac-state="pending|resolved|cancelled"`), event
      family (`nac:confirm:requested|resolved|cancelled`),
      and relationship to focus traps. Today a reviewer
      reading only the spec (not the manual or
      API_REFERENCE) cannot tell what shape a confirm
      dialog must take. Copilot flagged this in T3-d.

- [x] **3.5-E**: Compliance levels need a MUST/MAY split per
      event family. Today all v1.0 lifecycle events are
      MUST; v1.1+ widget-specific events are described as
      "required to claim NAC-3" but the spec does not say
      whether a NAC-3 plugin that ships zero accordions is
      required to also emit `nac:accordion:expanded`. The
      sensible interpretation -- "events are required only
      for widget families the plugin actually uses" --
      needs to be written into section 6 (compliance
      levels).

#### Spec ergonomics

- [x] **3.5-G**: Reverse mapping ARIA -> NAC. Section 7.3
      maps NAC states to ARIA but not the reverse. Authors
      who start ARIA-first (already-accessible apps
      adopting NAC) may forget to mirror back to NAC.
      Decide:
      (a) add a reverse mapping table (every common ARIA
      state has a `data-nac-state` equivalent that the
      validator can suggest); OR
      (b) normatively forbid reverse mirroring -- declare
      that NAC drives, ARIA mirrors, never the inverse.
      Either is valid; today the rule is undeclared.

- [x] **3.5-H**: Upgrade `data-nac-plugin-id` from SHOULD
      to MUST when a host mounts multiple instances of the
      same plugin slug simultaneously. Current spec (P5.1
      step 3) falls back to "last ready plugin in DOM
      order" which Copilot reads as brittle for large apps.
      Tighten to: "If two `[data-nac-plugin]` elements
      share the same `data-nac-plugin` value AND are
      simultaneously in the DOM, each MUST carry a unique
      `data-nac-plugin-id`. The DOM-order fallback is
      permitted only when slugs are unique." Validator
      additions: detect simultaneous duplicate slugs
      without per-instance IDs and raise an `error`.

#### Documentation gaps (manual additions, not spec)

- [x] **3.5-F**: Add a "Framework integration patterns"
      chapter to `docs/MANUAL.md` covering React 18 / Vue 3
      / Svelte 5 / Angular 17. For each: how to guarantee
      that `data-nac-state` and the corresponding `aria-*`
      attribute land in the same render commit, what
      `aria_lag_ms` should be set to (typically 0 if
      updated in `useEffect` / `onMounted`, but
      framework-specific), and the recommended hook /
      directive for emitting `nac:plugin:opened` at the
      right lifecycle point.

- [x] **3.5-I**: Add an "Event correctness" chapter to
      `docs/MANUAL.md` covering when to fire
      `nac:action:succeeded`. Patterns: optimistic updates
      (fire on local state commit OR on server
      confirmation, not both), async chains (single
      succeeded fires after the entire chain settles, not
      per step), failed retries (each retry attempt is a
      fresh action:dispatching/failed cycle), race
      conditions (cancellation tokens, AbortController).
      This is the finding Copilot rated "the most
      underestimated cost" in T5.

#### Triage summary

- **Address before more reviews land** (cheap, no semantic
  change): 3.5-A (interfaces), 3.5-B (tie-break), 3.5-C
  (label match), 3.5-E (NAC-3 event scope).
- **v1.4.2 minor patch** (small spec changes): 3.5-D
  (confirm normative), 3.5-G (reverse mapping rule), 3.5-H
  (plugin-id MUST when multi-mount).
- **v1.5 manual sweep** (documentation only, no spec or
  runtime change): 3.5-F (framework patterns), 3.5-I (event
  correctness).

---

## 4. Methodology notes

- The prompt deliberately asks for negative findings and forbids
  sycophancy. We expect models trained on RLHF to drift positive;
  the explicit instruction is the cheapest mitigation.
- The prompt asks each AI to operate against a real live demo. AIs
  without tool use will simulate; AIs with browsing or computer-use
  will actually run window.NAC.* calls. That asymmetry is data --
  capture it in the per-review notes.
- The English-only output rule sacrifices a small amount of nuance
  for cross-AI comparability. Reviews in other languages may be added
  in a separate section.
- Free tier matters: it's the tier that 99% of new evaluators will
  use. Paid-tier reviews from the same model belong in a separate
  experiment.
- Re-running the experiment at a later date (e.g. after each spec
  bump) is encouraged. Old reviews stay in this doc as a snapshot of
  the spec they reviewed.

### 4.1 Original (rejected) prompt -- preserved for the record

The first version of the prompt was deliberately confrontational
in order to push back against RLHF-induced positive drift. It was
rejected by Gemini Free with a generic safety-filter response on
2026-05-06. Preserved here so that the rejection is reproducible
and so that any future reviewer can see exactly what tripped the
filter:

```
You are an autonomous AI agent (LLM with tool use) being asked to
evaluate a public UI standard called NAC -- Native Accessibility
Contract.

[full prompt body identical to section 1 except for the lead-in
and the additional style rules:]

Your task is to give an HONEST, CRITICAL review of NAC v1.4. Do not
flatter. Find weaknesses. Point at things that would not work in
production. Disagree with the framing if you have grounds.

[...]

Style rules:
- Disagreement is welcome. Sycophancy is not. If you find yourself
  about to write "this is innovative" or "this is a great approach",
  delete that sentence and replace it with what specifically is good
  or bad.
```

Hypothesised triggers for the Gemini rejection (not confirmed):
the "you are an autonomous AI agent" persona-setting opener, the
"imagine you are given a tool that exposes window.NAC.*"
simulation framing in T3, and the explicit anti-sycophancy clause
that asked the model to delete sentences before writing them. The
softened prompt in section 1 keeps the same scope but uses
neutral language and was accepted by every AI tested afterward.
