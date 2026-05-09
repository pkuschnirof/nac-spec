# NAC v2.0 -- Scope & Ecosystem Convergence

**Status**: Draft for peer review (Round 3, post-v1.9.0).
**Date**: 2026-05-09.
**Authors**: Pablo Adrian Kuschniroff, Sumi.
**License**: MIT.

This document is the input to the next peer-review round. It scopes
v2.0 explicitly along the **implementation/adoption axis** that the
v1.7 -> v1.9 review rounds did not cover, and discloses every
trade-off, limit, and assumption the spec author has chosen to date.

The v1.7 -> v1.9 rounds validated NAC as a **contract**. This round
asks reviewers to validate NAC as an **ecosystem** -- a piece of
infrastructure that will be adopted (or not) by typical web teams,
that will be implemented (or not) by third parties under market
pressure, and that will run (or not) on a range of devices over the
next 5 years.

Reviewers are asked to flag every gap, mismatch, or wrong assumption
explicitly.

---

## 1. Why this scope document exists

Reading `docs/PEER_REVIEW.md` against the work output of the v1.7 ->
v1.9 rounds:

- 30+ action items closed across 6 reviewers.
- All items belonged to one of: accessibility primitives, security,
  observability, conformance, cognitive accessibility.
- Zero items addressed: composition primitives (hierarchical
  scoping), auto-derivation of slugs from DOM, third-party adoption
  paths (compliant + non-compliant), ecosystem tooling (framework
  plugins, devtools, codemods), or quantified cost-of-adoption.

The closing arbiter (Claude, May 2026) flagged this gap indirectly
with a single number: **Adoption ease 6/10 -- "Real cost; rewards
design-system discipline, punishes its absence."** That score is
the symptom; this document is the diagnosis.

A typical web team adopting NAC v1.9 today must:
- write its own slug naming convention (NAC v1.9 has no scope
  constructor),
- write `data-nac-id` attributes manually on every interactive
  element,
- write its own MutationObserver if elements appear after load,
- write its own bridge for components inside Shadow DOM,
- write its own adoption rules for any third-party widget that has
  not yet emitted NAC attributes,
- write its own focus trap for any modal it opens,
- write its own `aria-label` derivation from `label_i18n`,
- handle locale resolution manually if it ships in 10 languages.

None of this is exotic engineering -- but **the cumulative cost is
the entire reason adoption is 6/10 and not 9/10**, and none of it is
in the contract today.

NAC v2.0 closes that gap. This document scopes how, and what is
deliberately left for v2.1+.

---

## 2. Disclosure: limits the author has chosen to date

These are choices the author made, with the trade-off Sumi (the AI
collaborator) flagged for each. Reviewers can argue any of them.

### 2.1 Naming model: flat plugin-namespaced

**Choice**: NAC v1.x uses `plugin_slug.element_id` (two-level flat).
**Trade-off flagged**: hierarchical UIs (shell -> hub -> card ->
modal) cannot express depth in the slug; teams collide on
`hub.card.X` slugs across surfaces; idempotent re-registration is
not formally guaranteed.
**Limit imposed**: v1.9 ships only the flat model. Hierarchical
naming was not in the v1.7 review brief and was not raised by any
reviewer.

### 2.2 No DOM auto-derivation

**Choice**: every element registered with NAC must be declared by
the host (manifest) or annotated with `data-nac-id` by hand.
**Trade-off flagged**: dynamically-rendered UI (catalog browsers,
plugin-driven tiles, agent-generated chat blocks) needs hand-coded
attributes everywhere, which is the friction that produces the 6/10
adoption score.
**Limit imposed**: v1.9 has no `auto-register from DOM` primitive.

### 2.3 No third-party adoption primitive

**Choice**: NAC v1.x has no API for declaring "this third-party
widget that does NOT emit NAC attributes should appear in the
manifest as if it did".
**Trade-off flagged**: any team using Stripe Elements, Slack widget,
Mapbox, or any non-NAC component must wrap or hand-annotate. There
is no shared library of "rules for famous widgets".
**Limit imposed**: v1.9 silently treats non-compliant subtrees as
invisible to the agent.

### 2.4 No Shadow DOM penetration

**Choice**: `document.querySelectorAll('[data-nac-id]')` does not
descend into Shadow Roots.
**Trade-off flagged**: Web Components and Lit-based widgets are
opaque to NAC by default. Any modern component library is partially
invisible.
**Limit imposed**: v1.9 + DeepSeek deferred cross-origin iframes to
v2.1 but did not surface Shadow DOM at all.

### 2.5 No virtual manifest for large lists

**Choice**: `describe()` walks every `[data-nac-id]` in the live
DOM.
**Trade-off flagged**: virtualized lists (50 visible rows of 10000
total) make the agent see only 50. The agent cannot operate on row
8472 because the manifest never names it.
**Limit imposed**: v1.9 has no `declareVirtual` API.

### 2.6 Optional HMAC at NAC-3

**Choice**: `sign_provenance` and `verify_provenance` ship in v1.9
but signing is optional.
**Trade-off flagged**: closing arbiter (Claude) wrote:
*"An audit pipeline that accepts unsigned `source: { type: 'agent' }`
is back to where it started... For users in regulated environments
this is the gap that swallows the rest of the work."*
**Limit imposed**: v1.9 keeps HMAC optional. The `V1.9.1_HMAC_
MANDATORY_PATCH.md` DRAFT exists but is not yet shipped.

### 2.7 Single reference implementation

**Choice**: only `js/nac.js` exists.
**Trade-off flagged**: closing arbiter wrote:
*"Without a second-party port, the contract has not been validated
as independently implementable."*
**Limit imposed**: no Python, Rust, Go, or Kotlin port. No native
mobile (iOS/Android). No second JS implementation.

### 2.8 No tooling beyond the runtime

**Choice**: no babel plugin, no Vue/Svelte preprocessor, no devtools
browser extension, no codemod for brownfield migration, no cookbook
of resolved patterns.
**Trade-off flagged**: ChatGPT v1.8 review marked "Framework
integration guides" as DEFERRED to v2.1 with the reasoning "doc
work, not blocking". Sumi argues this is mis-categorized -- it is
not doc work, it is a missing tooling layer.
**Limit imposed**: no tooling. Adopters write everything themselves.

---

## 3. The four adoption cases (the model NAC v2.0 must serve)

Any web codebase contains four kinds of UI source, and NAC v2.0 must
have a clear answer for each:

### Case A -- Static own code

UI structure is known at compile time. Example: a fixed shell
(topbar + sidebar + main).

**Today (v1.9)**: declare manifest at boot, hand-code slugs,
hand-code `data-nac-id` per element. Hierarchy expressed by string
convention only.

**Pain point**: ~30 lines of boilerplate per interactive element
(see appendix A). Teams that ship 200 components write ~6000 lines
of NAC scaffolding.

### Case B -- Dynamic own code

UI is generated at runtime from data. Example: a hub that renders
N catalog cards from an API; a chat assistant that emits new
buttons each turn.

**Today (v1.9)**: developer must write a MutationObserver, walk the
DOM ancestor chain to find the parent scope, generate the slug
manually, register it with NAC, and remember to unregister on
removal.

**Pain point**: every team reinvents the same MutationObserver +
ancestor walk. There is no shared primitive. Idempotency
(double-registration when React re-renders) is silently broken
unless the developer wires their own guard.

### Case C -- Third-party code, NAC-compliant

A third-party component that ships with `data-nac-id` and a
manifest section.

**Today (v1.9)**: works. The third-party manifest gets read by
`describe()` automatically.

**Pain point**: very few third parties ship NAC compliance today.
Section 5 below covers what would change that.

### Case D -- Third-party code, NOT NAC-compliant

A third-party widget that has no NAC attributes (every popular
widget today).

**Today (v1.9)**: invisible to the agent. No primitive to bridge.

**Pain point**: in real production deployments, ~30-60% of the UI
is third-party (analytics, payments, maps, chat embeds, video
players). NAC v1.9 cannot operate any of it. This is the largest
single coverage gap.

---

## 4. The eight primitives proposed for v2.0

Each is presented with: what it does, what gap it closes, what the
author chose to defer.

### 4.1 `NAC.scope(spec)` -- hierarchical constructor (closes A, partial B)

```javascript
const shell  = NAC.scope({slug: 'shell',  label_i18n: {...}});
const topbar = shell.scope({slug: 'topbar'});
topbar.register({slug: 'tb-me', label_i18n: {...}});
// -> manifest entry 'shell.topbar.tb-me' with parent chain walkable
```

**Closes**: hierarchical naming, idempotent re-registration,
parent-child traversal, structured introspection.
**Limit imposed**: separator `.` is fixed (not configurable in v2.0
to keep ecosystem consistent; consumers asking for other separators
defer to v2.1 RFC).
**Open question for reviewers**: should `scope()` be allowed
arbitrary depth, or capped at N levels (4? 6?) to prevent
unmaintainable trees?

### 4.2 `NAC.autoRegister(el, opts)` -- DOM-driven registration (closes B)

```javascript
NAC.autoRegister(buttonEl, {
  inheritScope: true,        // walk ancestors for [data-nac-scope]
  derive: {role: 'auto', label: 'auto'}
});
```

**Closes**: dynamically-rendered UI, agent-generated UI, plugin-
generated tiles.
**Limit imposed**: throttled at 50ms by default; consumers needing
realtime register must opt out explicitly. Cap at 200 calls per
second per page (excess silently batched).
**Open question for reviewers**: is automatic `label_i18n` derivation
from `el.textContent` acceptable for monolingual apps, or must it
ALWAYS reference an `data-i18n-key` -> 10-locale catalog
(strict mode)?

### 4.3 `NAC.adopt({selector, parent, derive})` -- third-party non-compliant (closes D)

```javascript
NAC.adopt({
  selector: '.stripe-button',
  parent: 'shell.checkout',
  derive: {
    slug: el => el.dataset.action || hash(el.textContent),
    role: () => 'button',
    label_i18n: el => ({es: el.getAttribute('aria-label')})
  }
});
```

**Closes**: third-party widgets that have not yet shipped NAC
compliance.
**Limit imposed**: rules library for famous widgets (Stripe, Slack,
Mapbox, Mux, DocuSign) ships SEPARATELY from `nac.js` core, in
`@nac-spec/rules-*` packages. Core spec defines the API; the rules
themselves are community-curated.
**Open question for reviewers**: should `derive.label_i18n` be
forced to return all 10 locales (and fail/warn if it does not), or
allow mono-locale fallback for non-compliant third-parties whose
labels exist only in the user's current locale?

### 4.4 `NAC.bridgeShadowRoot(host)` -- Web Components (closes part of C, D)

```javascript
NAC.bridgeShadowRoot(myCustomElement);
// recursive walk of shadow root + sub-shadows; manifest merges in.
```

**Closes**: Lit-based widgets, native Web Components, design system
libraries that use Shadow DOM internally.
**Limit imposed**: closed shadow roots cannot be penetrated (by
browser security); the bridge fails gracefully and emits a
`nac:shadow_blocked` event so the host can decide what to do.
**Open question**: should this be opt-in per host, or run
automatically on all encountered shadow roots?

### 4.5 `NAC.bridgeIframe(iframeEl, channel)` -- cross-origin (closes ChatGPT v2.1 deferral)

```javascript
NAC.bridgeIframe(stripeIframe, {
  postMessageNamespace: 'nac.iframe.v1',
  trusted_origins: ['https://js.stripe.com']
});
```

**Closes**: iframes from same trusted vendor; same-origin iframes
already work.
**Limit imposed**: cross-origin requires the iframe content to also
load `nac.js` and respond to the postMessage handshake. Untrusted
iframes (ads) cannot be operated -- by security design, not by gap.
**Open question**: should the postMessage handshake be a separate
mini-spec ("NAC iframe wire protocol") subject to its own peer
review?

### 4.6 `NAC.declareVirtual({pattern, count, resolver})` -- virtualized lists (closes E)

```javascript
NAC.declareVirtual({
  slug_pattern: 'pipeline.runs.row.{i}',
  count: 10000,
  resolver: i => fetchRow(i)  // lazy-loaded on agent request
});
```

**Closes**: virtualized data grids, infinite-scroll feeds, large
catalogs.
**Limit imposed**: resolver MUST be synchronous-or-fast (target:
<10ms p95) to keep agent latency acceptable. Async resolvers (DB
fetch) are allowed but flagged in `describe()` so the agent knows
to expect latency.
**Open question**: should `count` be pre-declared (static cap) or
dynamic (live row count)? Trade-off: static is simpler, dynamic is
correct-er.

### 4.7 `NAC.captureEphemeral({duration_ms})` -- transient UI (closes toasts/dropdowns)

```javascript
NAC.captureEphemeral({duration_ms: 3000, ring_size: 100});
// any [data-nac-id] that appears + disappears within the window
// is recorded in a ring buffer; describe() exposes the trail.
```

**Closes**: toasts that flash for 3s, dropdowns that close on blur,
drag previews.
**Limit imposed**: ring buffer has a memory ceiling (default 100
events); agents must read the buffer within 30s of an event or
risk losing it.
**Open question**: should this be on by default, or opt-in?

### 4.8 `NAC.setTenantPrefix(slug)` -- multi-tenant naming (closes 9)

```javascript
NAC.setTenantPrefix('acme');
// every subsequent register adds 'acme.' prefix automatically.
// duplicate-id lint becomes cross-tenant aware.
```

**Closes**: SaaS platforms hosting N tenants where the same plugin
slug appears in each. Without this, the agent's unified manifest
across tenants has guaranteed collisions.
**Limit imposed**: prefix is set once per page load; cannot change
mid-session.
**Open question**: should this be the only way to disambiguate, or
should `scope()` also accept an explicit `tenant` parameter?

---

## 5. Performance impact in growing-device context

Performance is the single biggest fear about adopting an
"observability layer" on every interactive element. This section
addresses it with quantified targets and a 5-year device trajectory.

### 5.1 Cost per primitive (estimated, pending benchmark)

Same table as the implementation analysis (see PEER_REVIEW prompt
attachment 4), reproduced here:

| Operation | Mid-tier laptop 2026 | Mid-tier mobile 2026 | Low-tier mobile 2026 |
|---|---|---|---|
| Boot register 100 elements | <1ms | ~2ms | ~5ms |
| MutationObserver subtree=true (1 mutation) | 0.3ms | 0.8ms | 2ms |
| `autoRegister(el)` ancestor walk | 0.05-0.2ms | 0.15-0.5ms | 0.4-1.2ms |
| `adopt` selector re-eval per mutation | 0.5-2ms | 1.5-5ms | 4-12ms |
| `describe()` 100 elements | ~3ms / ~5KB | ~7ms | ~15ms |
| `describe()` 1000 elements | ~25ms | ~60ms | ~120ms |
| `describe()` 10000 elements (virtual) | ~5ms | ~12ms | ~25ms |
| HMAC sign per command | 0.3ms | 0.8ms | 2ms |

### 5.2 Device trajectory 2026 -> 2030

The reviewers should consider that adoption decisions made in 2026
operate on devices of 2026-2030. Single-thread CPU performance has
historically improved 8-15% per year compounding (post-Apple-Silicon
era; ARM v9 + Snapdragon 8 Gen N).

Projecting low-tier mobile (the worst case in the table above) at
12% per year:

| Year | `adopt` worst case | `describe()` 1000 | `describe()` virtual 10k |
|---|---|---|---|
| 2026 (today) | 12ms | 120ms | 25ms |
| 2027 | 10.7ms | 107ms | 22ms |
| 2028 | 9.5ms | 96ms | 20ms |
| 2029 | 8.5ms | 85ms | 18ms |
| 2030 | 7.6ms | 76ms | 16ms |

The implication: **NAC v2.0 perf budgets defined for 2026 low-tier
mobile have automatic headroom over the 5-year adoption horizon.**
What is "marginal" in 2026 is "comfortable" by 2028 and "trivial" by
2030.

### 5.3 Proposed perf budget for v2.0

Hard limits that conformance enforces; reviewers should challenge
the numbers:

| Operation | Worst-case low-tier mobile 2026 | Hard fail threshold |
|---|---|---|
| Boot register 1000 elements | 50ms | 100ms |
| `autoRegister` per mutation | 2ms | 5ms |
| `adopt` per mutation | 5ms | 15ms |
| `describe()` ANY size (with pagination) | 30ms | 100ms |
| HMAC sign per command | 3ms | 10ms |

Conformance `perf_probe` (sec 13.10 v1.9) becomes mandatory at
NAC-3 and emits a finding when any operation exceeds hard fail
threshold for >5% of samples in a 5-second window.

### 5.4 Memory budget

Manifest memory: ~150 bytes per registered element. A page with
1000 elements -> ~150KB. A page with 10000 (virtualized) ->
~1.5MB. Modern browsers allocate this in ~10ms; the cost is
negligible compared to a typical SPA bundle (1-3MB JS heap).

Ring buffer for `captureEphemeral`: ring of 100 events x ~500 bytes
each = ~50KB. Capped per page.

### 5.5 Battery impact

NAC operations are CPU-bound, not network-bound. The MutationObserver
+ autoRegister chain is the only ambient work; with 50ms throttle
default, ambient drain is <0.1% of CPU on idle pages and <2% on
active pages. Negligible for battery.

### 5.6 Bandwidth

Manifest serialization is local-only by default. Telemetry hook
(`nac:telemetry`) is opt-in. Default deployment has zero NAC
network traffic.

---

## 6. Ecosystem convergence assumption

The author's commercial assumption: **third-party widget vendors
will adopt NAC compliance under market pressure within 2-4 years**,
analogous to how WAI-ARIA went from "few adopters" in 2012 to
"shipped in every major design system" by 2018.

The drivers:

1. **Regulatory** -- EAA (European Accessibility Act, 2025+), ADA
   web case law, and analogous mandates in 5 jurisdictions push
   accessibility from "nice-to-have" to "audit-required". NAC offers
   the audit trail (HMAC + provenance) that ARIA alone does not.

2. **AI-driven UI operation** -- as Anthropic Computer Use,
   OpenAI's equivalent, and RPA tools become first-class
   procurement items, vendors that are not operable by AI lose
   accounts. NAC compliance is the cheapest path to "AI-operable".

3. **Voice control resurgence** -- voice-first UIs (CarPlay,
   Android Auto, Vision Pro) reward declarative UI contracts. NAC's
   `command_*` event family is voice-friendly out of the box.

4. **Cost reduction via tooling** -- the babel/vue/svelte plugins
   defined in section 7 take third-party compliance from "two
   sprints" to "install plugin + ship". When the cost is 2 hours
   instead of 200, vendors comply.

This assumption is testable: if no famous third-party ships NAC
compliance within 24 months of v2.0, the assumption is wrong and
case D becomes structural rather than transitional. The spec
must be designed for that risk -- which is why `NAC.adopt` exists
as a spec primitive (not an afterthought).

**Reviewer ask**: do you find the convergence assumption defensible,
or should NAC v2.0 plan for a world where case D remains 60%+ of
typical UIs indefinitely?

---

## 7. Tooling that ships WITH v2.0 (not separately)

Sumi argues that without these, v2.0 is "v1.9 with extra primitives"
rather than a genuinely-adoptable platform.

### 7.1 `@nac-spec/babel-plugin-react`

Auto-injects `data-nac-id` derived from React component name + key
prop. One line in `.babelrc`. Cuts greenfield React adoption to
"install plugin, build, ship".

### 7.2 `@nac-spec/vue-plugin`

Analogous for Vue 3 SFC.

### 7.3 `@nac-spec/svelte-preprocessor`

Analogous for Svelte.

### 7.4 `@nac-spec/devtools`

Browser extension (Chrome + Firefox). Renders the live manifest
tree in a DevTools panel; validates against conformance; suggests
fixes for missing `data-nac-action` / orphan slugs / locale gaps.
Without this, brownfield migration is dark-room debugging.

### 7.5 `@nac-spec/codemod`

CLI tool that scans an existing codebase, infers NAC annotations
from existing JSX/Vue/Svelte handlers and ARIA attributes, and
outputs a PR with `data-nac-action` + `data-nac-scope` attributes.
Estimated 60% auto-coverage; 40% manual cleanup.

### 7.6 `@nac-spec/cookbook`

30 resolved patterns: form, multi-step wizard, drag-drop, virtualized
list, dropdown, autocomplete, drawer, modal-with-form, file-upload,
date-picker, map-with-markers, video-player-with-controls, etc.
Each pattern: HTML markup + manifest snippet + tests + 1-paragraph
explanation. Without cookbook, every team rediscovers the same 30
patterns.

### 7.7 `@nac-spec/rules-stripe`, `rules-slack`, `rules-mapbox`...

Pre-baked `NAC.adopt` rules for famous third-party widgets. Each
package is community-maintained, semver-versioned independently from
spec. Adopter installs `@nac-spec/rules-stripe` and the Stripe
Elements widgets become operable without the adopter writing
selectors.

---

## 8. Spec/consumer division of responsibility

The cleanest expression of the v2.0 design ethic. Reviewers should
challenge any cell.

| Capability | Spec provides (zero-config) | Spec default + override | Consumer must declare |
|---|---|---|---|
| Hierarchical constructor | yes | separator | leaf slugs |
| Slug derivation | yes (path concat) | custom resolver | base slug per leaf |
| Stable_id | tree-path hash | strategy | nothing |
| Lint duplicates | runtime | warn/error/silent level | nothing |
| MutationObserver | scoped to `[data-nac-watch]` | throttle ms | mark watched containers |
| describe()/find()/list() | yes | pagination | nothing |
| Manifest serialization | JSON default | MessagePack opt-in | nothing |
| Locale resolver | 10-locale fallback | defaultLocale | catalog `label_i18n` 10 locales |
| ARIA landmarks | banner/nav/main/dialog | override per root | nothing |
| ARIA labels | derived from `label_i18n` | literal override | label_i18n source |
| Focus trap | auto on `[data-nac-modal]` | escape/backdrop policy | declare modal as such |
| Keyboard nav | Tab/Arrow/Esc | extra bindings | declare role |
| HMAC sign/verify | always v1.9.1 | algorithm | key distribution backend |
| reduced-motion | always | profiles | nothing |
| RTL | auto for ar/he/fa | nothing | nothing |
| CJK font fallback | in tokens | font stack | nothing |
| `command_rejected` on agent + irreversible | always | policy | declare `irreversible: true` |
| Telemetry hook | off by default | endpoint + signing | opt-in |
| Auto-detect actions | `data-nac-action` + heuristic | strategy | declare `data-nac-action` |
| Adopt third-party | API | rules library separate | custom rules |
| Validation engine | yes | tolerance | nothing |
| Tree visualization | DevTools extension | nothing | nothing |

**Adopter cost for greenfield app of 50 components + 10 modals**:
~10h dev (per cost analysis appendix).

**Adopter cost for brownfield (e.g. Yujin)**: ~36h dev. Codemod
covers ~60%; remainder is manual.

---

## 9. Pillars impact

Eight pillars of NAC and how v2.0 moves each:

| Pillar | v1.9 status | v2.0 with all primitives | Risk |
|---|---|---|---|
| P1 Discoverability | adequate | strong (tree + virtual + ephemeral) | none |
| P2 Operability | adequate | strong (auto-detect + adopt) | heuristic accuracy 50-60% on non-semantic widgets |
| P3 Observability | strong | strong | none |
| P4 Accessibility | strong | strong (auto ARIA from manifest) | none |
| P5 Security | partial | strong (HMAC mandatory + multi-tenant prefix) | adopted slugs may be unstable across third-party refactors |
| P6 Idempotency | weak | strong (tree-aware re-register guard) | autoRegister + React re-render needs explicit guard |
| P7 i18n 10-locale | strong (when declared) | tension (autoRegister derives 1 locale) | strict-mode flag forces 10-locale or fail |
| P8 Identifiability | weak (flat plus convention) | strong (scope hierarchy + lint) | adopt rules can collide on selectors |

**The four tensions** (already analyzed in the implementation
review; reproduced for reviewer ergonomics):

1. **Security under refactor** -- third-party renames a button ->
   adopted slug changes -> agent audit log inconsistent. Mitigation:
   `stable_id_strategy: 'backend-frozen'` opt for production
   deployments.
2. **Idempotency under React re-render** -- MutationObserver fires
   on every render. Mitigation: GC pass that reaps orphan
   registrations + register guard.
3. **i18n under autoRegister** -- `el.textContent` is mono-locale.
   Mitigation: strict mode requires `data-i18n-key` -> catalog or
   refuses to autoRegister.
4. **Identifiability under adopt** -- `selector: '.btn-primary'`
   matches multiple distinct buttons. Mitigation: lint duplicates
   in adopt rules + tree-context in `derive.slug`.

---

## 10. What v2.0 explicitly does NOT do (deferrals)

Reviewers should validate the deferral list:

| Item | Defer to | Reason |
|---|---|---|
| Capability/version negotiation in manifest | v2.1 | needs careful design to avoid breaking the strict-superset invariant |
| Independent runtime port (Python/Rust/Kotlin) | v2.1+ | community-driven; not blocked on NAC v2.0 |
| iOS/Android native NAC | v2.1+ | requires separate spec (UIKit/Compose semantics differ) |
| Guided task flows (cognitive accessibility) | v2.x | not yet shaped into normative spec; Mistral v1.8 raised |
| Independent interoperability test suite | v2.1 | gates on second runtime existing |
| CI dashboard / reporting tool | v2.1 | tooling, not spec |
| Capability negotiation between browser <-> NAC <-> agent | v2.1 | RFC pending |

---

## 11. Questions for reviewers

The author requests structured answers on these:

**Q1**: Is the hierarchical scope constructor (`scope().scope()`)
the right primitive, or should v2.0 model the tree as a graph
(elements with multiple parents)?

**Q2**: Is `autoRegister` strict mode (require `data-i18n-key` ->
catalog) acceptable for a typical mono-locale app? Should it default
to strict (force 10-locale catalog) or permissive (mono-locale OK
with warn)?

**Q3**: Should `NAC.adopt` rules library live in the spec repo
(`nac-spec/rules/*`) or in a separate community-curated repo?

**Q4**: Is the convergence assumption defensible (third-parties
will adopt within 2-4 years), or should v2.0 design for the world
where case D remains 60%+ indefinitely?

**Q5**: Is the perf budget (table 5.3) realistic for low-tier mobile
2026, or too aggressive/conservative?

**Q6**: Should the framework plugins (babel/vue/svelte) ship as
part of `@nac-spec/*` or as community-driven? If the former, they
become spec author's maintenance burden.

**Q7**: Is the tooling list in section 7 the minimum viable set for
"v2.0 is adoptable", or are there gaps?

**Q8**: Is the deferral list in section 10 acceptable, or do any
items belong in v2.0?

**Q9**: Is the spec/consumer division (table in section 8) correct?
Specifically: is `Auto-detect actions` correctly placed (default +
override), or should `data-nac-action` be unconditionally required
at NAC-3?

**Q10**: Does the v2.0 plan honor the v1.7 -> v1.9 contract
(strict-superset invariant: every v1.9 client keeps working under
v2.0)?

---

## 12. Author's confidence

Sumi's honest assessment per primitive (subject to reviewer
correction):

| Primitive | Confidence | Open issues |
|---|---|---|
| `NAC.scope()` | high | only separator choice |
| `NAC.autoRegister` | medium-high | i18n strict-mode default |
| `NAC.adopt` | medium | selector perf in DOM-heavy pages |
| `NAC.bridgeShadowRoot` | medium-high | closed shadow root edge case |
| `NAC.bridgeIframe` | low | postMessage protocol needs its own RFC |
| `NAC.declareVirtual` | medium | sync vs async resolver |
| `NAC.captureEphemeral` | medium-high | ring buffer sizing |
| `NAC.setTenantPrefix` | high | minor |
| Babel/Vue/Svelte plugins | medium | ecosystem timing |
| DevTools extension | high | implementation risk only |
| Codemod | medium | acceptable auto-coverage TBD |

---

## Appendix A -- Cost-of-adoption benchmark (per component)

Component: a "Delete contact" button on a card, irreversible, must
prompt for confirmation, multilingual.

### A.1 In NAC v1.9 today

```javascript
// 1. Hardcode slug
const slug = 'hub.cards-grid.contact-card-' + id + '.delete';

// 2. Register manifest
NAC.register({
  plugin_slug: 'crm',
  elements: [{
    id: slug,
    role: 'button',
    label_i18n: {es:'Eliminar', en:'Delete', /* + 8 mas */},
    a11y_hint: {es:'Esta accion es irreversible', /* + 9 mas */},
    irreversible: true
  }]
});

// 3. Annotate DOM
btn.setAttribute('data-nac-id', slug);
btn.setAttribute('aria-label', 'Eliminar');
btn.setAttribute('role', 'button');
btn.setAttribute('tabindex', '0');

// 4. Wire keyboard
btn.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
});

// 5. Wire click + sign provenance
btn.addEventListener('click', async () => {
  const sig = await NAC.sign_provenance({slug, ts: Date.now()});
  document.dispatchEvent(new CustomEvent('nac:command_pending',
    {detail: {slug, signature: sig}, bubbles: true}));
  // ... actual delete logic ...
});
```

**Cost**: ~30 lines + i18n catalog entry (10 locales) + manual
testing.

### A.2 In NAC v2.0 with full SDK

HTML:
```html
<button data-nac-action="delete"
        data-i18n-key="contact.delete"
        data-nac-irreversible
        onclick="deleteContact(id)">
  <span data-i18n="contact.delete"></span>
</button>
```

JS at boot (once for the whole app):
```javascript
NAC.boot({tenant: 'acme'});
NAC.scope({slug: 'hub.cards-grid'}).adopt(cardEl);
```

**Cost**: 4 lines of HTML + 2 lines of JS at boot + i18n catalog
entry (the only thing that does not get cheaper).

**Reduction**: ~30 lines -> ~4 lines per component. ~87%.

For an app of 200 components: ~6000 lines -> ~800 lines. **5200
lines of boilerplate eliminated.**

---

## Appendix B -- Verification of v1.9 -> v2.0 backward compatibility

Strict-superset invariant: every v1.9 client keeps working under
v2.0.

**Author's claim**: yes. All v2.0 primitives are additive to the
public API. `NAC.register`, `NAC.click`, `NAC.fill`, `NAC.describe`,
`NAC.find`, `NAC.list`, all event names, all attribute names remain
identical. v1.9 clients ignore the new primitives; v2.0 primitives
are no-op when consumers do not call them.

**Risk**: the duplicate-id lint, when promoted to `strict` mode
in v2.0, can fail-build on v1.9 clients that have always-warned
duplicates. Mitigation: strict mode is opt-in, default stays warn.

**Reviewer ask**: validate this claim by walking the public API
diff between v1.9.0 and v2.0.0 RFC and flagging any breaking
change.

---

**Reviewers receive this document plus the v1.9.0 spec, the v1.9
runtime, the proposed v2.0 RFC (separate file), and an honest
account of where the author's confidence is high vs low. The author
asks for plain disagreement -- "this primitive is wrong",
"this assumption is fragile", "this perf budget is fantasy" -- not
politeness.**

-- Pablo & Sumi, 2026-05-09
