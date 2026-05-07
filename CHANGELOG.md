# Changelog

All notable changes to NAC (Native Accessibility Contract) are documented
in this file.

This project adheres to [Keep a Changelog 1.1](https://keepachangelog.com)
and uses [Semantic Versioning 2.0.0](https://semver.org).

Versioning conventions for the spec:

- **MAJOR**  -- breaking changes to the public API contract or to existing
  `data-nac-*` attribute semantics. Existing NAC-3 plugins MUST be
  re-audited.
- **MINOR**  -- new pillars, new roles, new attributes added without
  breaking existing plugins. Existing NAC-3 plugins remain valid.
- **PATCH**  -- clarifications, doc updates, reference-impl bug fixes,
  test additions, badge tweaks. No public-API change.

---

## [Unreleased]

Nothing yet.

## [1.6.3] - 2026-05-07

PATCH release. Two fixes shipped together because they were
raised in the same user-testing session of v1.6.2. Strict
superset of v1.6.2.

### Runtime: NAC.click is role-aware

User-reported bug 2026-05-07: agent picked Buenos Aires from
the cities combobox correctly, but NAC.click('cities.option.4')
timed out with "did not emit nac:action:succeeded" even though
the field changed. Diagnosis: `cities.option.*` has
`data-nac-role="option"` and emits `nac:field:changed`;
NAC.click only listened for `nac:action:succeeded` /
`nac:action:failed`. Same pattern affects every non-action role
with click semantics (tab, breadcrumb-item, accordion-toggle,
step, pagination-item, confirm-button).

`js/nac.js` v1.6.3 makes `NAC.click` consult a role-event-family
map and listen for the appropriate success / failure events:

| role | success | failure |
|---|---|---|
| `action` (default) | `nac:action:succeeded` | `nac:action:failed` |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` | `nac:accordion:collapsed` |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` | `nac:confirm:cancelled` |

For non-action roles the runtime ALSO listens for the action-
contract events as a safety net so a host that emits both
contracts on the same element still works. Unknown / missing
`data-nac-role` keeps the action default for back-compat. Event
filtering walks `event.detail.nac_id`, `target_nac_id`,
`from_nac_id`, `tab_id`, `section_id`, `step_id`, `id`,
`breadcrumb_id`, plus `event.target` containment, so a
background event on an unrelated element does not resolve the
click prematurely.

### Demo backend: tier rotation on parse failure

User-reported bug 2026-05-07 (related): chat occasionally
shows "No pude entender la respuesta del modelo. Probemos de
nuevo." after a single attempt. User instruction verbatim: "No
quiero el matcher local, hay que reintentar el comando contra
la cadena de fallback antes de devolver un error."

`crm_desa/api/v1/yujin.php yjNacDemo` now walks the AiClient
chain explicitly when a tier returns ok=true with unparseable
content. Each next tier sees a stricter "JSON ONLY, exact shape"
reminder appended to the system prompt. Only when EVERY real
tier (claude, deepseek, groq -- canned excluded) fails does the
handler return `parse_degraded: true` with a localised error
message ("I could not structure a response after trying every
provider. Please rephrase and try again."). The local-matcher
fallback that v1.6.2 used has been removed per user request --
the chain rotation IS the retry policy, and the user accepts a
clean error after exhausting the chain.

`AiClient::callTier($tier, $payload, ...)` is the new public
single-tier dispatcher used by yjNacDemo to bypass the chain
logic. The standard `AiClient::call` still handles tier
rotation on TIER failures (network, http 5xx); the new
`callTier` lets callers implement content-aware rotation on
top.

### Demo frontend

- `dispatchAgenticAction` no longer routes `parse_degraded` to
  `interpret(prompt)` (the local matcher); it just shows the
  localised `badge_parse_degraded` message in 10 locales.
- New i18n key `badge_parse_degraded` with full 10-locale
  coverage (es en pt fr it de ja zh hi ar).
- Cache bump v27 -> v28.

## [1.6.2] - 2026-05-07

PATCH release. Implements `NAC.drag_drop` (spec sec 13.4),
which had been declared in the spec since v1.1 but never landed
in the runtime. Discovered same-day by user-testing the v1.6.1
demo: an agent asked to "drag Alpha to the right list" timed
out because the runtime had no programmatic way to invoke a
cross-list drag. The agent fell back to `NAC.click` on the
draggable, which had `data-nac-role="draggable"` (not
`"action"`), so no `nac:action:succeeded` event ever fired and
the awaitable-write contract timed out at 5s. Symptom for the
user: bot says "Voy a arrastrar Alpha", then two timeout
errors. Strict superset of v1.6.1; every v1.6.1 plugin remains
valid.

### Runtime additions

- **`NAC.drag_drop(source_nac_id, target_nac_id, opts?)` (NEW)**.
  Signature matches what spec sec 13.4 declared in v1.1:
  - `source_nac_id` MUST resolve to an element with
    `data-nac-role="draggable"`.
  - `target_nac_id` MUST resolve to an element with
    `data-nac-role="drop-target"`.
  - `opts.to_index` (optional) for ordered drop-targets.
  - `opts.value` (optional) passed through to
    `nac:drag:dropped`.
  - Returns `Promise<{ok, source, target}>` or rejects with
    `NacError('not_found' | 'role_mismatch' | 'invalid')`.
  - Honors v1.4.1 focus barrier on the source (scroll into
    view + visual pulse).
  - Emits the canonical drag event sequence with v1.6.1's
    default-on per-plugin bus + plugin_instance_id payload:
    `nac:drag:started` -> `nac:drag:over` -> `nac:drag:dropped`.
    On failure: `nac:drag:cancelled`.
  - Removes any `.ne-drag-empty` placeholder in the target
    (matches the demo's existing UX).

### Demo backend additions

- **`yjNacDemo` allowedKinds += `drag_drop`** (with extra fields
  `target_nac_id` + optional `to_index`).
- **System prompt teaches the model** when to use `drag_drop`
  vs `click`, with an explicit warning: "NEVER use 'click' on a
  draggable" (the precise mistake that caused the user-reported
  bug).

### Demo frontend additions

- **`dispatchAgenticAction case 'drag_drop'`** routes to
  `NAC.drag_drop()`. Cache bump v25 -> v26.

### Why the gap existed

The spec's sec 13.4 has declared `NAC.drag_drop` since v1.1
(2026-04). The runtime focused on the in-list `reorder` verb
(v1.4) and never circled back. The yujin.app demo wired HTML5
drag-and-drop directly so humans could use the demo, but no
programmatic invocation path existed. The seven v1.6 reviewers
did not catch it because none of them tried drag-and-drop
through the agent. v1.6.2 closes the loop.

### Implication for NAC consumers

Any UI that ships `data-nac-role="draggable"` /
`data-nac-role="drop-target"` is now operable end-to-end via
the documented contract. Test runners + voice + RPA + agentic
chat all converge on the same `NAC.drag_drop` entry point.

## [1.6.1] - 2026-05-07

PATCH release responding to AI peer review of v1.6.0. Seven
reviewers (ChatGPT, Mistral Le Chat, Microsoft Copilot, Claude
4.7 Deep Thinking, DeepSeek, HuggingChat, Grok) evaluated the
spec, runtime, manual, API reference, philosophy doc, and the
public demo. The full reviews are pasted into
`docs/AI_REVIEWS_OF_NAC_SPEC_v1.6.md`; this CHANGELOG entry
records what shipped in response. Strict superset of v1.6.0;
every v1.6.0 plugin remains valid.

### Headline finding from the v1.6 review

Five of seven reviewers raised the same root cause: the
ARIA dual-source-of-truth tax. Keeping `data-nac-state` and
`aria-*` in sync inside batched frameworks (React 18 concurrent,
Vue Suspense, Svelte 5 effects) is non-trivial; the validator
catches drift only ex-post; teams hit a CI failure wall after
the first 10 screens; abandonment follows. v1.6.1 attacks this
on three fronts: spec hard-error, runtime tolerance config, and
a written-out design-system layer pattern in MANUAL.md.

### Spec additions (normative)

- **Section 7.3.2 Drift findings are hard-errors at NAC-3
  (NEW)**. `aria_nac_state_mismatch` and `aria_first_state` MUST
  be emitted as `severity: 'error'` and MUST set
  `report.has_errors === true` so CI blocks the build. Hosts
  that need to retire historic violations incrementally MAY
  demote to warn-level via
  `NAC.set_validation_tolerance({drift_findings:'warn'})`,
  making suppression an explicit, audited choice. Driven by
  Mistral, Copilot, Claude 4.7, HuggingChat, DeepSeek.

- **Section 7.4 Per-plugin event buses default-on (TIGHTENED)**.
  `nac:*` events MUST be dispatched on the plugin root in
  addition to `document`. v1.6.0 said hosts MAY opt in to the
  per-plugin bus; v1.6.1 makes both dispatch surfaces mandatory.
  Driven by Claude 4.7's "data-nac-plugin-bus should arguably be
  the default", echoed by Mistral, Copilot, HuggingChat.

- **Section 7.4 Closed shadow roots out of scope (CLARIFIED)**.
  All seven reviewers raised this. v1.6.1 declares closed shadow
  roots explicitly out of scope and documents the canonical
  bridge pattern: composed-bubble + host-side public-method
  driver + manifest field `"shadow_root":"closed"` so validators
  skip the unreachable DOM checks. The spec does not attempt a
  workaround that would either require WHATWG changes or break
  the encapsulation guarantee the closed root provides.

### Runtime additions

- **`NAC.is_blocked()` (NEW)**. Canonical "is the UI accepting
  operator input right now?" probe. Returns
  `{blocked:bool, reasons:[{kind,nac_id,severity}]}`. Replaces
  the v1.6 antipattern of inferring blocking state from
  `feedback[].severity`. Wraps `list_pending_confirms()` +
  open-modal detection + busy-action detection. Driven by
  ChatGPT, DeepSeek, Mistral.

- **`NAC.set_validation_tolerance(cfg)` (NEW)** and
  **`NAC.get_validation_tolerance()` (NEW)**. Hosts retiring
  historic findings incrementally can register a
  `tolerated_violations` payload that excludes specific
  `(kind, nac_id)` pairs from `.ok` / `.has_errors` while
  surfacing them in `.tolerated[]` for audit. Typically loaded
  from a `tolerated_violations.json` committed alongside the
  codebase. Driven by Mistral, Claude 4.7's "register-time
  console.warn is ignored; 50+ plugin first run sea of red".

- **`validate_global().has_errors` (NEW)**. Explicit boolean for
  CI integration so build scripts do not need to introspect
  `.duplicates.length`.

### Documentation additions

- **MANUAL.md Design-system layer pattern (NEW chapter)**.
  Concrete React 18 + Vue 3 + Svelte 5 primitives that emit NAC
  + ARIA atomically using `flushSync` / `nextTick` /
  `Promise.resolve` commit barriers. Five of seven reviewers
  identified the lack of this pattern as the #1 abandonment
  cause; the chapter writes out the answer.

- **MANUAL.md Event correctness, framework-specific timing
  (NEW section)**. Per-framework commit-barrier table
  (React/Vue/Svelte/Angular/Qwik) for the `data-nac-state` ↔
  `aria-*` boundary. Driven by HuggingChat: "React 18 with
  concurrent features, useTransition or useDeferredValue batch
  and defer DOM commits by design".

- **README.md Honest expectations (NEW section)**. Replaces the
  stale "1 hour" pitch with a realistic cost frame (~1 day per
  screen with AI agent + 1-2 days to build the design-system
  layer up front). Adds a best-fit / worst-fit table so teams
  self-select before adopting. Driven by Copilot, Claude 4.7,
  HuggingChat: "the surface no longer matches the 'one hour'
  claim".

### Demo + backend fixes

- **NAC + Yujin demo (yujin.app/nac-spec/example.php)**: when
  the AI fallback chain (Claude → DeepSeek → Groq) exhausts and
  lands on the canned tier, the backend now short-circuits BEFORE
  attempting JSON parse. Returns the localised "AI temporarily
  unavailable" apology with `unavailable: true` flag instead of
  the previous misleading "could not understand the model
  response" parse-error path. Frontend shows a distinct
  `unavailable` badge state and skips the local-matcher
  degradation (the chain already exhausted every provider).

- **`AiClient::cannedResponse` (rpaforce CRM)**: returned dict
  now includes `last_error` so callers can log which tier failed
  last. Diagnoses prod-config drift (e.g. missing per-tenant
  Groq key) from server logs without manual debugging.

### Score deltas v1.4 -> v1.6 (recorded for reference)

| Axis | v1.4 baseline | v1.6 (7 reviewers) |
|---|---|---|
| Clarity | 7.25 | 7.71 |
| Usefulness | 8.75 | 8.79 |
| Ease of adoption | 5.50 | 5.57 |
| Ambition vs feasibility | 7.75 | 7.71 |

Ease-of-adoption staying flat at 5.57 is the gap v1.6.1 is
designed to close in v1.7+, once the design-system layer
pattern has had time to absorb the dual-attribute tax in real
codebases.

### Deferred to v1.7

The following items from the v1.6 review action list were
captured but NOT shipped in v1.6.1: A1 default timeout
normative, A2 emit-template snippets, A5 reset-completion
semantics, A6 discoverable verbs, A7 NacElement.value
semantics, R1 set_default_timeout, R3 parallel/lazy
validate_global, R5 bridge_shadow_root helper, R6 reset
provider context, D4 out-of-scope state doc, D5
vendor-extension namespace. They are tracked for v1.7 once
v1.6.1 has had at least two weeks of adoption signal in the
field.

## [1.6.0] - 2026-05-06

MINOR release. Adds the **`NAC.reset()` plugin reset primitive**,
the operator-side counterpart to the lifecycle events in P4. An
operator can now ask any NAC-compliant plugin -- or the whole
page -- to return to its declared initial state. Strict superset
of v1.5.4; every v1.0..v1.5.4 plugin remains valid (the reset
primitive is opt-in via `set_reset_provider`, with a generic
fallback when no provider is registered).

### Spec additions (normative)

- **Section 9.3 Plugin reset primitive**. Defines
  `NAC.reset(plugin_slug?)` resolution order:
  1. Custom provider for the named plugin (registered via
     `NAC.set_reset_provider(slug, fn)`) -- run it, emit
     `nac:plugin:reset { plugin: <slug> }`.
  2. No specific plugin -> every registered provider runs in
     order, then a generic reset of the whole document, then a
     final `nac:plugin:reset { plugin: '*' }`.
  3. Specific plugin without provider -> generic reset scoped
     to that plugin root.
- **Generic reset rules** (normative). Without a custom
  provider, the runtime MUST clear every
  `[data-nac-role="field"]` (honouring `data-nac-default-value`
  if declared), set every cleared field to
  `data-nac-state="pristine"`, dispatch input + change events,
  apply `data-nac-default-state` per element, hide every
  `[data-nac-default-hidden]` region.
- **`NacResetResult` shape**. `{ ok, plugin, source: 'custom'
  | 'generic' | 'custom+generic', plugins?, error? }`.
- **`nac:plugin:reset` event**. Bubbles + composed (per spec
  7.4); detail `{ plugin, timestamp }`.
- **NAC-3 compliance**: at NAC-3 `NAC.reset()` MUST exist, the
  generic reset rules MUST work for any plugin without a
  custom provider, and custom providers MUST emit
  `nac:plugin:reset` on completion. NAC-1 / NAC-2 MAY expose
  reset.

### Reference runtime (`js/nac.js`)

- New module-scope `_resetProviders` map keyed by plugin slug.
- `NAC.set_reset_provider(slug, fn)` registers a provider.
- `NAC.reset(plugin_slug?)` async function resolves to a
  `NacResetResult`.
- `_genericReset(slug?)` walks the plugin root (or the whole
  document) and applies the four generic-reset rules.
- `_emitResetEvent(slug)` fires `nac:plugin:reset` with the
  v1.4.1 composed:true scoping rules.
- Version constant bumped to `1.6.0`. Spec version `1.6`.

### Reference demo (`yujin.app/nac-spec/`)

- example.js registers a custom reset provider for
  `example_demo` that closes the secret modal, collapses every
  expanded sumi-e icon, clears the four text inputs, resets the
  mood select + spread checkbox, returns the volume slider to
  50, restores the cities card if minimised, switches back to
  the first tab, collapses any expanded accordion sections,
  removes table sort indicators, and smooth-scrolls to the top
  of the page.
- The autopilot now calls `NAC.reset('example_demo')` as its
  FIRST step before the audio prewarm + the rest of the seq.
  An 800ms pause after the reset settles the smooth-scroll +
  card restore + tab swap before the demo begins. Repeatable
  autopilot runs no longer compound state from the prior run.
- New SECTION_I18N key `auto.reset` (10 locales).

### Documentation

- `docs/API_REFERENCE.md` adds rows for `reset`, and
  `set_reset_provider`. NAC.version constant updated to
  `1.6.0`. Version history block notes 1.6.0.
- README badge bumps v1.5 -> v1.6, with the reset addition
  called out in the lead block.
- MANUAL adds a "Plugin reset" section pointing at spec 9.3.
- AI_INSTRUCTIONS last-updated bumped 1.5.4 -> 1.6.0 with the
  reset primitive in the timeline.

## [1.5.4] - 2026-05-06

Demo-only patch release. Reference runtime contract is unchanged
from v1.5.1; this release ships:

### Reference demo (`yujin.app/nac-spec/`)

- **Exhaustive 10-locale i18n sweep** on every visible string
  in the demo. The Yujin standard locale set
  (`es en pt fr ja zh hi ar de it`) covers the topbar tagline,
  every card heading + sub-title, the lead paragraph, every
  side-panel header, the secret modal title + body + close
  button, every form label + select option, every wizard
  prompt (18 steps + intro + next-step prefix + idle blurb),
  every autopilot bot line (intro + 9 step acknowledgements +
  closing v1.2 paragraph), and every runtime acknowledgement
  (tab activations, accordion expansions, slider volume,
  table sort, table filter, pagination, drag-drop). Total:
  ~75 SECTION_I18N keys, each across 10 locales.
- **Templated localised messages** via a tiny `tFmt(key, vars)`
  helper that substitutes `{value}`, `{dir}`, `{q}` placeholders
  at render time so messages like "Volume at 70%" /
  "Volumen en 70%" / "ボリューム 70%" / "音量 70%" stay
  grammatical across all locales.
- **WIZARD_STEPS** entries now carry a `prompt_key` instead of
  a literal Spanish prompt. The wizard's render / start / skip
  / tryAdvance paths resolve the key via `t()` at display time
  so a mid-tour locale switch updates remaining steps without
  a reload.
- **Autopilot bot lines** routed through `t('auto.*')`. The
  hands-free demo plays in any of the 10 locales depending on
  the dropdown selection.
- **Runtime feedback** (sortable table acks, drag-drop
  confirmations, pagination, file upload simulation) routed
  through `t()` / `tFmt()` -- zero hardcoded Spanish strings
  remain in `js/example.js`.

### Backend

- The agentic chat backend's system prompt continues to honour
  rule 7: "the user may write in any of the 10 locales; match
  user intent against `label_i18n` in ANY locale; reply in the
  user's locale". The 10-locale `label_i18n` maps shipped on
  every action / field / tab in v1.5.1 are what make this work
  end-to-end -- a user typing "弹一个 Do" lands NAC.click
  ('note.c') because the manifest carries `label_i18n.zh`
  alongside `label_i18n.es`.

Runtime version constant bumped to `1.5.4` for traceability.
Plugins do NOT need any change. The runtime contract
(attributes + events + driver API) is unchanged from v1.5.1.

This release is the technical realisation of NAC's first
principle ("the system disappears"). For non-Spanish visitors,
the demo no longer leaks Spanish strings into the chat replies,
the wizard prompts, or the autopilot narration. The system
disappears for them too.

## [1.5.1] - 2026-05-06

Patch release. Two surface areas:

### Spec additions (normative)

- **P7.1 Cross-plugin uniqueness + `NAC.validate_global()`**.
  Answers the user question "how does NAC avoid duplicate
  nac_ids across a large system". Three layers:
  1. Convention (P1 reaffirmed): every `nac_id` SHOULD be
     prefixed with its plugin slug + `.`.
  2. Register-time warning: `NAC.register()` logs
     `console.warn('[NAC] duplicate nac_ids ...')` when a new
     manifest declares an id another plugin already uses.
  3. CI gate: `NAC.validate_global()` returns a structured
     `NacGlobalReport` with `duplicates`, `orphans` (DOM-only
     ids), `unmounted` (manifest-only ids), and
     `convention_violations` (ids not following the
     `plugin_slug.<path>` grammar).
- **P7.2 Recommended nac_id grammar** (informative).
  `plugin_slug "." element_path` with examples. Grammar is
  informative -- runtimes accept any non-empty string -- but
  the CI gate flags violations.

### Reference implementation (`js/nac.js`)

- `register()` runs the cross-plugin duplicate check and emits
  a `console.warn` when it finds collisions. Best-practice
  nudge; never throws.
- `_collectManifestIds(manifest)` helper walks every
  contract-bearing array (`actions`, `fields`, `tabs`, `kpis`,
  `charts`, `rows.cells`, `breadcrumbs.items`).
- `NAC.validate_global()` exposed from `window.NAC.*`. Returns
  the `NacGlobalReport` shape from spec P7.1 above.

### Reference demo (`yujin.app/nac-spec/`)

- **Full 10-locale i18n**. The Yujin standard locale set
  (`es en pt fr ja zh hi ar de it`) covers every UI chrome
  string in the demo plus every action / field / tab in the
  manifests of `example_demo` and `example_assistant`. Locale
  detection chain: `?lang=` URL param > html `lang` attr >
  `navigator.language` > `en`. Runtime override via
  `window.setNacDemoLang('zh')`.
- **TTS BCP-47 lang** now follows the detected locale (was
  hardcoded `es-AR` for both Web Speech synthesis and the
  speech recognizer).
- **System prompt updated** so the LLM knows it MUST match
  user intent against `label_i18n` in any of the 10 locales,
  not just the page's primary locale. A user typing
  `弹一个 Do` ("play a Do" in Chinese) on a
  Spanish-locale page still hits `note.c` because the
  manifest carries `label_i18n.zh` alongside `label_i18n.es`.
  The bot's reply is in the user's locale.
- **Robustness**: `nacDemoSnapshotTree()` now wraps the entire
  snapshot in try/catch + per-plugin `NAC.manifest()` call in
  its own try, so a single brittle plugin does not abort the
  whole agentic dispatch silently.

The runtime contract from v1.5.0 is unchanged. v1.5.1 plugins
are interchangeable with v1.5.0 plugins; the new
`validate_global()` and the duplicate-id warning are additive.

## [1.5.0] - 2026-05-06

MINOR release. The runtime contract (attributes + events +
driver API) is unchanged from v1.4.2; v1.5.0 documents the
canonical NAC + LLM agentic loop and ships a reference
implementation on the public demo. Strict superset of v1.4.2;
every v1.0..v1.4.2 plugin remains valid.

### Spec additions (informative)

- **Section 9.1 NAC + LLM agentic loop**. Four-step canonical
  pattern: `NAC.describe()` snapshot, backend POST that holds
  the API key, structured-output system prompt, sequential
  dispatch via NAC primitives. Covers failure modes
  (provider down, tree too large, model returns non-JSON,
  unknown nac_id) and recommends provider chaining
  (primary + fallback).
- **Section 9.2 Canonical system prompt**. Pseudo-code that
  any implementer can adapt to their target model. Constrains
  the LLM to the seven action kinds (`click`,
  `click_by_verb`, `fill`, `select`, `tab`, `tab_by_label`,
  `say`) and a strict JSON output shape.

The runtime in `js/nac.js` is byte-identical to v1.4.2
behavioural-wise; only the version constant bumped to `1.5.0`
and the header CHANGELOG block updated. The pattern
documented in 9.1 lives entirely on the demo + backend
sides; vendors who copy the demo can swap their own backend
without touching the runtime.

### Reference demo + backend (`yujin.app/nac-spec/`)

- `js/example.js` chat upgraded from a hardcoded local matcher
  to an **agentic dispatcher**:
  - Snapshots the page via `NAC.describe()` + `NAC.manifest()`.
  - POSTs the snapshot + the user prompt to
    `https://yujin.app/crm/api/v1/yujin/nac-demo`.
  - Renders the model's `message` field as a chat reply.
  - Dispatches the model's `actions[]` sequentially through
    `NAC.click` / `NAC.fill` / `NAC.tab` etc, with a 250ms
    pause between actions so the human sees each focus pulse
    from v1.4.2.
  - Falls through to the legacy local matcher when the
    backend is unreachable, returns a non-2xx, or times out
    after 25s. The demo always works offline; agentic mode
    is the upgrade path.
  - A small "modo agente" / "modo offline" badge above the
    chat bar shows which path responded.
- `crm_desa/api/v1/yujin.php` adds **`yjNacDemo()`** behind
  `POST /api/v1/yujin/nac-demo`. Public (no API key), CORS-
  gated to the same origins as `/yujin/chat`, rate-limited
  20/min/session + 60/min/IP + 400/day/IP. The handler:
  1. Validates session_id, prompt (1..2000 chars), lang,
     history (max 10 turns), nac_tree (object).
  2. Runs the YujinSafety prompt-injection scan on the user
     turn.
  3. Compacts the tree (max 200 elements/plugin, 10 plugins,
     60 KB cap).
  4. Composes a structured-output system prompt embedding
     the tree + the seven NAC action kinds.
  5. Calls **Claude Sonnet** primary via existing
     `ClaudeClient::call()` (uses the org rotation pool +
     BYOK awareness already in production).
  6. Falls back to **DeepSeek free** via existing
     `DeepSeekClient::call()` if Claude returns non-OK.
  7. Sanitises model output through `YujinSafety::
     sanitizeOutput()`, defensively extracts JSON from any
     markdown fences the model may have slipped, validates
     each action against the seven allowed kinds, drops
     unknown kinds rather than 5xx-ing.
  8. Returns `{ message, actions[], model, fallback_used,
     tokens_in, tokens_out }`.
  - API keys never appear in the response. The `model`
    field is the only identifier the client sees.

### Notes for implementers vendoring the demo

- The frontend reads `window.NAC_DEMO_ENDPOINT` first if
  defined, otherwise defaults to `/crm/api/v1/yujin/nac-demo`
  (relative to `location.origin`). Vendors point this at
  their own backend.
- The backend pattern ports cleanly to other languages: the
  composition is "compact tree + system prompt + LLM call +
  JSON parse + action validation". The reference PHP
  implementation is ~250 lines; equivalent Python or Node
  ports would be similar.
- The system prompt is informative, not normative. Any prompt
  that produces the same output shape is compliant. See spec
  section 9.2 for pseudo-code.

## [1.4.2] - 2026-05-06

Patch release responding to Microsoft Copilot's review of
v1.4.1 (Copilot was the first reviewer to read v1.4.1; the
earlier three reviewed v1.4.0). v1.4.2 closes 9 new action
items (3.5-A through 3.5-I) without adding new role / event /
attribute vocabulary. Strict superset of v1.4.1; every
v1.0..v1.4.1 plugin remains valid.

### Spec changes (normative)

- **P5.0 Return shapes** (new). NacElement, NacSnapshot,
  NacKpiReadout, NacFeedback, NacEvent, NacResult,
  NacStateSnapshot all formalised as normative TypeScript
  interfaces. Pre-v1.4.2 these names appeared only in P5
  function signatures without bodies. AI test runners reading
  the spec cold can now rely on `describe().kpis[i].value`
  and similar.
- **6.1 Required vs optional event families per level** (new).
  NAC-3 event requirements split between universal (every
  plugin emits) and conditional (plugin emits only when its
  manifest declares the corresponding widget family). A plugin
  that ships zero accordions does not need to emit
  `nac:accordion:expanded`. The validator implements the
  conditional table.
- **7.3.1 Direction of mirroring** (new). NAC drives, ARIA
  mirrors. The reverse direction is intentionally NOT defined.
  ARIA-first codebases adopting NAC must rewrite touchpoints
  so NAC is the authoritative source for every state mapped in
  section 7.3. Validator emits error `aria_first_state` when
  reverse mirroring detected.
- **7.5 Confirm-dialog contract** (new). Promoted from v1.3
  section 15.5 narrative + API_REFERENCE to a normative section
  of chapter 7. Defines DOM shape (`data-nac-role=
  "confirm-dialog"`, `data-nac-state="pending|resolved|
  cancelled"`), lifecycle event family
  (`nac:confirm:requested`, `:resolved`, `:cancelled`), focus
  trap requirement, validator findings
  (`confirm_dialog_no_focus_trap`,
  `confirm_dialog_missing_aria`).
- **7.4 plugin-id rule tightened**. Pre-v1.4.2 said hosts
  SHOULD set `data-nac-plugin-id` per instance; v1.4.2 makes
  it MUST when two roots with the same `data-nac-plugin` slug
  are simultaneously in the DOM. Validator error
  `duplicate_plugin_no_instance_id`.
- **P5 click_by_verb / tab_by_label tie-break rules**
  formalised. First-manifest-match-wins for both. Label
  matching is case-insensitive trim across every declared
  locale (locale-aware via `Intl.Collator` permitted but
  optional). Validator emits warns `duplicate_verb` and
  `duplicate_tab_label`.

### Reference implementation (`js/nac.js`)

- **`validate()`** gains four LINTs aligned with the new
  normative rules: `duplicate_verb`, `duplicate_tab_label`,
  `duplicate_plugin_no_instance_id`, plus the v1.4.1
  `aria_nac_state_mismatch` already present.
- **Focus follow** on every write entry point (`click`,
  `fill`, `select`, `tab`, `navigate_breadcrumb`). The
  internal helper `_focusElement(el)` runs
  `scrollIntoView({block:'center'})`, focuses the element
  (transiently adding `tabindex=-1` for non-focusable roles),
  pulses `[data-nac-focus-pulse]` for 600ms, and emits
  `nac:focus:moved`. A minimal default stylesheet is injected
  once on install. Opt out per call via `el.__nac_skip_focus`
  or globally via `NAC.config.focus_on_action = false`. This
  closes a UX gap surfaced 2026-05-06: before this change,
  programmatic clicks happened invisibly off-screen and the
  page stayed static while the agent operated.

### Demo fixes (`yujin.app/nac-spec/`)

- `js/example.js` `interpret()` rewritten. Pre-v1.4.2 used
  substring match on single letters (`'c'`) and short
  syllables (`'do'`, `'re'`, `'mi'`, `'sol'`) which collide
  with extremely common words: 'toca', 'tocate', 'secreto',
  'cerrar', 'mira'. Every chat input dispatched note.c
  regardless of intent. v1.4.2 tokenises the input
  (whole-word match), strips Spanish accents via NFD +
  combining range, reorders priority so action keywords
  (secret, autopilot, wizard) beat the note fallback. Fixes
  the "patito de Homero" bug.
- `AudioContext` unlock is now global. Pre-v1.4.2,
  programmatic `el.click()` from chat dispatch did not count
  as user gesture, so `AudioContext` stayed suspended and
  piano notes were silent. v1.4.2 attaches a capture-phase
  `pointerdown / mousedown / touchstart / keydown` listener
  on `document` that resumes the context. One real
  interaction anywhere on the page unlocks audio for the
  session.
- `js/example.js` `drive()` and `drive_fill()` now route
  through `NAC.click()` / `NAC.fill()` so the new focus
  follow applies on chat-driven operations.

### Documentation

- `docs/MANUAL.md` adds two new chapters:
  - **Framework integration patterns**: React 18, Vue 3,
    Svelte 5, Angular 17 examples for atomic
    `data-nac-state` + `aria-*` updates per section 7.2,
    plus `aria_lag_ms` guidance for batched-update edge
    cases. Lifecycle event hook table per framework.
  - **Event correctness**: the five patterns (single async,
    optimistic, async chain, retries with attempt counter,
    AbortController cancellation, race-condition gate). NAC-3
    summary checklist before declaring compliance.
- `docs/API_REFERENCE.md` updated to reflect v1.4.2 runtime
  (`NAC.version === '1.4.2'`).

### Reviewer credit

Action items addressed in this release were surfaced by
Microsoft Copilot (free, web). Three more free-tier reviewers
are queued: ChatGPT, Mistral, Kimi, Qwen, Gemini retry, plus
Perplexity. Full reviews preserved verbatim in
`docs/AI_REVIEWS_OF_NAC_SPEC.md`.

## [1.4.1] - 2026-05-06

Patch release responding to the AI peer review of 2026-05-06.
DeepSeek (free, browsing on), Claude (claude.ai free,
3-of-6 documents fetched), and Grok Fast (free) reviewed the
spec + reference implementation independently from cold and
produced 11 action items consolidated in
`docs/AI_REVIEWS_OF_NAC_SPEC.md` section 3. v1.4.1 closes all
of them. The spec base remains v1.4 -- no new role, event, or
attribute vocabulary was added; v1.4.1 only tightens existing
contracts and makes implicit rules explicit.

### Spec changes (normative)

- **1.5.1 Reference deployments and demo surfaces** (new). The
  public demo at `yujin.app/nac-spec/example.php` is a piano +
  fields + tabs + accordion + dropzone showcase. The
  `patch_manager` example identifiers used throughout this
  document live behind admin auth at yujin.app/crm and are
  illustrative quotations, not assertions about the public
  demo. Cold AI reviewers (DeepSeek, Grok Fast) fabricated
  against the headline example; Claude flagged the gap
  honestly. Section 1.5.1 names both surfaces and clarifies
  which snippets target which.
- **1.5.2 Adoption cost: the implementer is an AI coding
  agent** (new). The "1 hour onboarding" claim in section 1.5
  was correct under the assumption "an AI coding agent is the
  implementer". All three reviewers read it as
  "human-developer onboarding time" and produced estimates of
  2-3 days, days-to-weeks, and 1-2 engineer-weeks. v1.4.1
  reframes the claim explicitly: NAC ships agent-readable
  instructions (`AI_INSTRUCTIONS.md`, `CLAUDE.md`,
  `AGENTS.md`, `GEMINI.md`) and is designed to be applied by
  an agent in minutes per screen. The human role is review,
  not authoring.
- **7.1 Awaitable-write contract** (new normative section).
  Writes MUST resolve only on the success/fail event, or
  reject with `NacError('timeout', ...)`. The pre-v1.4.1
  reference implementation's 200 ms phantom-success path is
  retracted as a flake-factory bug, not a permitted variant.
- **7.2 NAC vs ARIA authority rules** (new normative table).
  Defines who wins when `data-nac-state` and `aria-*`
  disagree on the same element, per consumer kind.
- **7.3 NAC state to ARIA attribute mapping** (new normative
  table). Canonical mapping for every NAC state token that
  has an ARIA equivalent.
- **7.4 Event scoping** (new normative section). All `nac:*`
  events MUST emit `composed: true` and a payload field
  `plugin_instance_id`. Per-plugin event buses are optional
  via `data-nac-plugin-bus="enabled"`. Closes the multi-mount
  identity gap that Grok Fast flagged.
- **P5.1 Active-plugin resolution algorithm** (new normative
  subsection). The `_activePlugin()` heuristic that
  `js/nac.js` always implemented (most-recently-mounted
  state=ready plugin in DOM order, with documented fallback)
  is now part of the spec contract.
- **14.3.5 Layer declaration** (new). Adds
  `NAC.system_map_layers(): { a, b, c, preferred }` so agents
  do not probe by exception.

### Documentation

- `docs/API_REFERENCE.md` (new). One-page cheat sheet of every
  `window.NAC.*` method introduced in v1.0..v1.4.1, grouped by
  version, with signature, error throws, and the spec section
  that formalises each method. DeepSeek's review missed
  `NAC.tab()` and `NAC.list_pending_confirms()` because the
  canonical TypeScript interface block in P5 is dense; the
  cheat sheet closes that gap.
- README quick-links section added pointing at API_REFERENCE,
  MANUAL, AI_INSTRUCTIONS, CLAUDE/AGENTS/GEMINI entry points.
- Section pointers added to the top of v1.1 / v1.2 / v1.3 /
  v1.4 narrative chapters, each routing readers to the
  relevant API_REFERENCE rows. The narrative still explains
  *why* each primitive exists; the cheat sheet shows *how* to
  call it.

### Reference implementation (`js/nac.js`)

- **`click()`** rewritten. Single deterministic Promise that
  races `nac:action:succeeded` (resolve `{ ok: true, ... }`)
  against `nac:action:failed` (resolve `{ ok: false, ... }`)
  against a configurable timeout (`opts.timeout` or
  `NAC.config.default_timeout_ms`, default 5000 ms) that
  rejects with `NacError('timeout', ...)`. The 200 ms
  short-circuit `resolve({ ok: true, event: null })` from
  v1.0..v1.4.0 is gone.
- **`validate()`** strengthened. Returns
  `{ ok, missing, errors, manifest, timestamp }`. The new
  `errors` array reports six new finding categories:
  `missing_in_dom`, `field_type_mismatch`,
  `field_type_undeclared`, `options_unresolved`,
  `depends_on_orphan`, `row_cell_missing`,
  `breadcrumb_item_missing`, `aria_nac_state_mismatch`. The
  legacy `missing` array is preserved for back-compat.
- **`click_by_verb(plugin, verb, opts)`** added. Convenience
  wrapper that resolves verb -> nac_id via the manifest
  (then DOM scan) before delegating to `click()`. Designed
  for voice agents that hear "apply all" rather than
  `patch_manager.apply_all`.
- **`tab_by_label(plugin, label, opts)`** added. Same shape
  as `click_by_verb` but for tabs; matches against
  `tabs[].label`, `tabs[].label_i18n`, and DOM
  `aria-label` / textContent.
- **`system_map_layers()`** added. Synchronous declaration
  of which discovery layers (A precomputed map, B per-view
  transitions, C capabilities) the host implements.
- **`_emit()`** sets `composed: true` and normalises detail
  to include `plugin` (aliased from legacy `plugin_slug`)
  plus `plugin_instance_id`. Optional per-plugin-root bus
  dispatch when `data-nac-plugin-bus="enabled"`.
- **`register()`** now accepts both `register(manifest)` (the
  canonical form documented in MANUAL.md and
  AI_INSTRUCTIONS.md) and `register(slug, manifest)` (the
  shape some integrators copied from third-party RPC
  conventions). Both forms produce identical state.

### Demo fixes (`yujin.app/nac-spec/`)

- `js/example.js` lines 32 and 59 used the two-argument
  `register('slug', obj)` form, which threw
  `NacError('invalid', 'manifest object required')` before
  v1.4.1 and broke every interactive element on the public
  demo. Both call sites switched to the canonical
  `register(obj)` form.
- `assets/favicon.svg` placed at the path the demo pages
  requested (was 404).
- `example.php` asset version bumped from `v5` to `v6` for
  cache invalidation.

### Reviewer credit

Action items addressed in this release were surfaced by:
- DeepSeek (chat.deepseek.com, free): 3.4-A, 3.4-B
  (validator), 3.3-A (cheat sheet motivated by missed
  methods).
- Claude (claude.ai, free): 3.4-A (corroborated), 3.2-B,
  3.2-D (ARIA overlap), 3.4-C, 3.2-A (versioning), 3.2-C
  (system_map layers), 3.3-C (demo mismatch).
- Grok Fast (grok.com, free): 3.2-E (event scoping), 3.2-A
  (corroborated softly).

Full reviews preserved verbatim in
`docs/AI_REVIEWS_OF_NAC_SPEC.md`. The synthesis section of
that file was the source-of-truth for v1.4.1 scope.

## [1.4.0] - 2026-05-06

Strict superset of v1.3. Every v1.0 / v1.1 / v1.2 / v1.3 plugin
remains valid; every v1.0..v1.3 operator continues to work. Adds
vocabulary for four UI primitive families that v1.3 left
under-specified: hierarchical breadcrumbs, carousels, timelines /
activity feeds, and in-place reordering within a single list.

### Added

- **Spec section 16** -- "Navigation and ordering primitives
  extension (v1.4, normative)". Strict superset of sections
  1-15 covering 4 widget families:
  - **A. Breadcrumb** -- `role=breadcrumb / breadcrumb-item`,
    states `current | navigable`, verb `navigate_to_crumb`,
    event `nac:breadcrumb:navigated { id, depth, path,
    target_depth }`. Driver: `NAC.list_breadcrumbs`,
    `NAC.navigate_breadcrumb`. Manifest: optional
    `breadcrumbs[]` array.
  - **B. Carousel** -- `role=carousel / carousel-slide /
    carousel-dot`, states `playing | paused`, verbs
    `slide_next | slide_prev | slide_to | pause_autoplay |
    play_autoplay`, events `nac:carousel:slide_changed |
    autoplay_paused | autoplay_resumed`. Driver:
    `NAC.list_carousels`, `carousel_state`, `carousel_advance`,
    `carousel_to`, `carousel_autoplay`. Manifest: optional
    `carousels[]` array. The naming gap (v1.1 already used
    `slider` for continuous numeric input) is closed.
  - **C. Timeline / activity feed** -- `role=timeline /
    timeline-item`, states `live | static` and `visible |
    hidden`, verbs `load_older | load_newer`, events
    `nac:timeline:item_clicked | scrolled_to | loaded_more |
    item_appeared`. Driver: `NAC.list_timelines`,
    `timeline_load_older`, `timeline_load_newer`,
    `timeline_state`. Manifest: optional `timelines[]` array
    declaring ordering, live status, and pagination support.
  - **D. Reorder-within-list** -- new verb `reorder` on
    existing v1.1 `draggable`, new event
    `nac:list:reordered { list_id, item_id, from_index,
    to_index }` emitted INSTEAD of `nac:drag:dropped` when
    source and target resolve to the same parent list. Driver:
    `NAC.reorder(list_id, item_id, to_index)`. Optional
    manifest hint: `supports_reorder: true` on a `NacRowDef`.
- 7 new roles, 7 new states, 9 new verbs, 10 new events, 11
  new driver functions, 3 new manifest arrays.

### NAC-3 v1.4 compliance

A plugin claiming NAC-3 v1.4 MUST satisfy NAC-3 v1.3 plus
declare appropriate roles/events/manifest entries for every
v1.4 widget it ships, AND emit `nac:list:reordered` for any
in-list drag-reorder.

### Backwards compatibility

Every v1.4 addition is additive. v1.0..v1.3 operators ignore
unknown roles/events/manifest arrays per section 16.8. v1.4
operators drive v1.0..v1.3 plugins via documented fallbacks
(e.g. `NAC.navigate_breadcrumb` clicks the `<a>` matching the
item label when no `breadcrumb` role is registered).

The semver impact of v1.4 is **MINOR**.

## [1.3.0] - 2026-05-06

Strict superset of v1.2. Every v1.0 / v1.1 / v1.2 plugin
remains valid; every v1.0 / v1.1 / v1.2 operator continues
to work. Adds vocabulary for sixteen UI primitive families
that were observable on most production web apps but had no
formal NAC role.

### Added

- **Spec section 14.7** -- "Section navigation (page-level
  landmarks)". `data-nac-role="section"` plus
  `data-nac-id="page.section.<slug>"` plus optional
  `data-nac-label`. New driver functions
  `NAC.list_sections()` and `NAC.go_to_section(id)`. New event
  `nac:section:reached`. Reference impl wires an
  IntersectionObserver per section so visibility flips emit
  `nac:state:changed` automatically.
- **Spec section 15** -- "Common UI primitives extension
  (v1.3, normative)". Strict superset of sections 1-14
  covering 16 widget families:
  - **A. Toast / banner / alert** -- `role=toast | banner |
    confirm-dialog`, events `nac:toast:fired | dismissed`,
    `nac:banner:displayed | dismissed`. Driver: `NAC.toast`,
    `list_toasts`, `dismiss_toast`, `list_banners`,
    `dismiss_banner`.
  - **B. Toggle / switch** -- new `field_type="toggle"`,
    instant-action boolean distinct from `checkbox`.
  - **C. Stepper** -- `role=stepper / step`, events
    `nac:step:advanced | back | completed | error`. Driver:
    `step_next | step_back | step_to | step_state`.
  - **D. Tree** -- `role=tree / treenode`, events
    `nac:tree:expanded | collapsed | selected`. Driver:
    `tree_expand | tree_collapse | tree_select | tree_path`.
  - **E. Calendar with events** -- `role=calendar /
    calendar-event`, events `nac:calendar:event_clicked |
    moved`, `view_changed`, `date_selected`. Driver:
    `calendar_view | calendar_go_to | calendar_select_event |
    calendar_list_events`.
  - **F. Rich text editor** -- new `field_type="richtext"` +
    formatting verbs. Events `nac:richtext:format_applied |
    link_inserted | mention_picked`. Driver:
    `richtext_format | richtext_insert_link |
    richtext_insert_mention`.
  - **G. Tag input** -- new `field_type="tag-input"`,
    free-input + suggestions. Events `nac:tags:added |
    removed`. Driver: `add_tag | remove_tag | list_tags`.
  - **H. Rating** -- new `field_type="rating"` (`min`, `max`,
    `step`, `icon` in manifest). Driven via `NAC.fill`.
  - **I. Confirmation dialog** -- `role=confirm-dialog`,
    events `nac:confirm:requested | confirmed | cancelled`.
    Driver: `NAC.confirm(prompt, opts) -> Promise<boolean>`,
    `list_pending_confirms`.
  - **J. Drawer / bottom-sheet** -- `role=drawer |
    bottom-sheet`, events `nac:drawer:opened | closed |
    peek`. Driver: `open_drawer | close_drawer | peek_drawer`.
  - **K. Pagination standalone** -- generalises v1.1's
    `pagination-control` role beyond tables.
  - **L. Chart** -- `role=chart / chart-series / chart-point /
    chart-legend`, manifest array `charts[]`. Events
    `nac:chart:point_clicked | hovered | series_toggled |
    filtered`. Driver: `chart_data | chart_toggle_series |
    chart_filter`.
  - **M. Map** -- `role=map / map-marker / map-layer`,
    manifest array `maps[]`. Events `nac:map:marker_clicked |
    zoom_changed | moved | layer_toggled`. Driver:
    `map_focus | map_select_marker | map_toggle_layer |
    list_markers`.
  - **N. Avatar + presence** -- `role=avatar /
    presence-indicator`, states `online | away | busy |
    offline`. Event `nac:presence:changed`.
  - **O. Floating action button** -- `role=fab` (specialised
    primary action, often above bottom-sheet).
  - **P. Empty state + skeleton** -- `role=empty-state /
    skeleton`, kinds `no-results | first-time |
    no-permission | error`. Events `nac:empty:displayed |
    cta_clicked`; skeleton uses `nac:state:changed` loading
    -> done.
- **33 new lifecycle events** across the 16 families.
- **35 new driver API functions** on `window.NAC`.
- **3 new manifest extensions**: `charts[]`, `maps[]`, plus
  the rating / tag-input / richtext field-level options.
- **NAC-3 v1.2 compliance level** kept as is; new
  **NAC-3 v1.3** level defined for plugins shipping any of
  the v1.3 widgets.
- **Reference impl `js/nac.js`** bumped from 1.2.1 to 1.3.0.
  ~600 LOC added covering the 16 families. Still zero deps.
  Still ASCII-pure. node --check passes.

### Demo

- **`yujin.app/nac-spec/example-v13.php`** (new, standalone)
  -- 16 cards, one per primitive family. Every interaction
  driveable through `window.NAC`. The page registers
  manifests for each family, wires a system_map provider so
  it shows up in `NAC.system_map()`, and a banner that
  declares `nac:banner:displayed` on boot. CSS in
  `css/example-v13.css`. JS in `js/example-v13.js`.

### Migration

- A v1.0 / v1.1 / v1.2 plugin is valid v1.3 without
  modification.
- A v1.0..v1.2 operator parses a v1.3 plugin without crashing
  (unknown roles -> `region`, unknown field-types -> `text`,
  unknown verbs -> opaque actions, unknown events ignored,
  unknown manifest arrays silently skipped).
- A v1.3 operator drives a v1.0..v1.2 plugin without retrofit
  -- absence of any new role / event / driver function
  downgrades to the equivalent v1.2 path.
- semver impact: **MINOR**. No breaking change.

### Demo

- **`yujin.app/nac-spec/example.php`** (cache buster v4):
  - Every top-level `<section>` (intro, demos grid, wizard,
    chat, manifest panel) now carries `data-nac-role="section"`
    + `data-nac-id="page.section.<slug>"`.
  - New "Self-test & introspect" card added before the events
    log. Five buttons:
    - **Show navmap** -- inline `NAC.system_map()` JSON.
    - **Show capabilities** -- inline `NAC.capabilities()`
      JSON.
    - **List sections** -- `NAC.list_sections()` rendered as
      `id  [visible|hidden]  label`.
    - **Run NAC self-test** -- in-browser version of the
      Python runner. Walks every registered plugin, exercises
      the first 3 actions + first 2 fields per plugin, plus
      6 static gap rules (R1 button without nac-id, R2 plugin
      root without manifest, R3 field without field-type,
      R4 section without label, R5 page section without role,
      R6 action without verb). Outputs a per-test breakdown
      plus an expandable gap report inline.
    - **AI agent: tour the page** -- discovers plugins via
      `system_map()`, walks every section via
      `go_to_section()`, exercises one action per plugin,
      narrating in the chat panel via `botSpeak`.
  - Self-test card carries minimize / maximize / restore
    chrome buttons like the other v1.2 cards.

### Documented

- **CHANGELOG** notes Self-test panel + AI agent tour as
  Demo additions.

### Demo (continued)

- **18-step wizard.** `yujin.app/nac-spec/example.php`
  (cache buster v5): the guided tour now covers v1.0
  primitives (piano + modal + form, steps 1-8), v1.1 widgets
  (tabs / accordion / combobox / slider / table, steps 9-13)
  and v1.2 widgets (remote autocomplete + chrome minimize +
  system map + section navigation, steps 14-17). Step 18 is
  the terminal. Each step is validated via the matching NAC
  event: `nac:tab:changed`, `nac:section:expanded`,
  `nac:slider:value_changed`, `nac:plugin:minimized`,
  `nac:section:reached`, etc. The wizard listens to twelve
  event types (was four).
- **Autopilot extended** to drive all 17 actionable wizard
  steps end-to-end: piano notes -> modal -> form fill ->
  switch tab -> expand accordion -> pick country ->
  raise slider -> sort table -> remote autocomplete ->
  minimize -> fetch system map -> go to chat section. Closes
  with a one-line summary in the assistant chat.

## [1.2.0] - 2026-05-06

Strict superset of v1.1. Every v1.0/v1.1 plugin remains valid;
every v1.0/v1.1 operator continues to work. Adds three
capability blocks the public spec was asked about by early
readers:

- **A** -- dropdowns whose options come from JSON or DB tables
  (including high-cardinality remote autocompletes).
- **B** -- plugin window chrome: minimize, maximize, restore,
  fullscreen.
- **C** -- first-contact discovery: an agent connecting to an
  unknown system can call `NAC.system_map()` once and obtain a
  complete navigation tree + capability inventory before
  acting.

### Added

- **Spec section 14** -- "Discoverability and dynamic data
  extensions (v1.2, normative)". Strict superset of sections
  1-13.
- **4 new verbs** in `data-nac-action`: `minimize`, `maximize`,
  `restore`, `toggle_fullscreen`.
- **3 new state values** on plugin roots: `minimized`,
  `maximized`, `normal` (the four-way set
  `minimized | maximized | normal | fullscreen` is mutually
  exclusive).
- **4 new lifecycle events** on `document`, bubbling:
  `nac:plugin:minimized`, `nac:plugin:maximized`,
  `nac:plugin:restored`, `nac:plugin:fullscreen_changed`.
- **3 new options events** on `document`, bubbling:
  `nac:options:loading`, `nac:options:loaded`,
  `nac:options:invalidated`.
- **8 new driver API functions** on `window.NAC`:
  `options(field_id)`, `search_options(field_id, query, limit?)`,
  `invalidate_options(field_id, reason?)`,
  `set_options_resolver(plugin, field_id, fn)`,
  `minimize(plugin)`, `maximize(plugin)`, `restore(plugin)`,
  `fullscreen(plugin, on?)`.
- **4 new discovery functions** on `window.NAC`:
  `system_map()`, `capabilities()`,
  `set_system_map_provider(fn)`, `set_capabilities_provider(fn)`.
- **3 new manifest extensions** on `fields[]`:
  `options_source` (`static | dynamic | remote`),
  `depends_on: [field_id]`, `search_supported: true`,
  `min_chars`.
- **1 new manifest extension** on the manifest root:
  `transitions: [{to_view, via_action, conditions?,
  side_effects?}]` -- per-view edges of the navigation graph.
- **Error namespace** `NAC.errors` with stable codes:
  `RemoteSourceRequiresSearch`, `OptionsUnavailable`,
  `SystemMapNotProvided`, `CapabilitiesNotProvided`.
- **Compliance level NAC-3 v1.2** defined. A v1.0/v1.1 plugin
  MAY claim NAC-3 v1.0/v1.1 (baseline) without v1.2 conformance.

### Demo

- **`yujin.app/nac-spec/example.php`** -- two new cards added:
  Remote autocomplete (5000-city catalog with debounced
  search, `options_source=remote`, full options-event flow)
  and System map (buttons that call `NAC.system_map()` and
  `NAC.capabilities()` and pretty-print the result). Both
  cards carry minimize / maximize / restore window-chrome
  buttons exercised through `NAC.minimize/maximize/restore`.
  Asset cache buster bumped to `v3`.
- **`yujin.app/nac-spec/example-navmap.php`** (new) -- a
  separate scenario page: an "agent panel" lands on three
  unknown plugins (inventory, customers, orders), calls
  `NAC.system_map()` once to discover the graph, then plans
  and executes a 3-step task ("create order for Acme Corp,
  $1500, high priority") via NAC.search_options + NAC.fill +
  NAC.click + NAC.wait_for. No selectors. No DOM scraping.
  All NAC events are observed live in the right-hand log.
- **`js/nac.js`** reference impl bumped from 1.0.0 / spec 1.0
  to 1.2.0 / spec 1.2. ~280 LOC added across options
  resolvers, chrome verbs, and discovery providers. Still
  zero dependencies. Still ASCII-pure.

### Documented

- **`docs/IMPACT_RPA.md`** (new) -- long-form treatment of how
  NAC changes the economics of an RPA factory. Covers the
  selector-driven status quo, the five concrete savings (no
  more selector hunting, no more redesign breakage, no more
  flake, no more screenshot scraping, no more double
  maintenance with QA), an incremental migration path from an
  existing UiPath / Automation Anywhere / Power Automate
  factory, and the comparative table against XPath, image/OCR,
  vision-LLM agents and recorders.
- **`docs/IMPACT_TESTING.md`** (new) -- parallel treatment for
  QA automation. Covers what stops being a test problem under
  NAC (selector maintenance, race-condition flake,
  localisation breakage, theme/redesign breakage,
  cross-framework portability), what NAC explicitly does NOT
  change (unit tests, visual regression, accessibility audits,
  performance), the migration path for an existing
  Playwright/Cypress/Selenium suite, and the test-pyramid
  reshape that follows.
- **`README.md`** -- "Impact on RPA and automated testing"
  section pointing at the two new docs; badge bumped to v1.2.
- **`docs/MANUAL.md`** -- "Testing with the runner" section
  cross-references `IMPACT_TESTING.md` and `IMPACT_RPA.md`.

### Migration

- A v1.0/v1.1 plugin is valid v1.2 without modification.
- A v1.0/v1.1 operator parses a v1.2 plugin without crashing
  (unknown verbs treated as opaque, unknown manifest fields
  silently skipped, unknown events ignored).
- A v1.2 operator drives a v1.0/v1.1 plugin without retrofit:
  absent `options_source` is read as `static`, absent
  `transitions[]` is read as a leaf view, absent system map +
  capabilities downgrades to per-view planning.
- semver impact: **MINOR**. No breaking change.

## [1.1.0] - 2026-05-06

Strict superset of v1.0. Every v1.0 plugin is still valid; every
v1.0 operator still works. Adds vocabulary for nine widget
families that v1.0 left under-specified.

### Added

- **Spec section 13** -- "Widget extensions (v1.1, normative)".
  Strict superset of sections 1-12 covering tabs (formalised),
  accordions, sliders, comboboxes, datepickers, sortable /
  filterable / paginated tables, drag-and-drop, file uploads,
  tooltips, popovers, and notifications.
- **15 new roles** in P2 vocabulary: `tablist`, `tabpanel`,
  `accordion-section`, `slider`, `dropzone`, `draggable`,
  `drop-target`, `tooltip-trigger`, `tooltip-content`,
  `popover-trigger`, `popover-content`, `sort-control`,
  `filter-control`, `pagination-control`, `notification`.
- **9 new field-types**: `combobox`, `multi-select`, `range`,
  `time`, `date-range`, `color`, `email`, `tel`, `url`. The
  pre-existing v1.0 `multi` remains valid; `multi-select` is the
  formalised name.
- **22 new events** across 8 widget families (tabs lifecycle,
  accordion section, slider, datepicker, drag-and-drop, dropzone
  / file upload, table operations, tooltips and popovers,
  notifications). All under the `nac:*` namespace.
- **12 new driver API functions** on `window.NAC`: `expand`,
  `collapse`, `pick_date`, `set_slider`, `sort`, `filter`,
  `go_to_page`, `drag_drop`, `upload_file`, `show_tooltip`,
  `hide_tooltip`, `show_popover`, `hide_popover`. Implementations
  MAY route some through `fill` or `click` internally; the
  contract only requires the named function and the
  corresponding event.
- **6 optional manifest extensions** for capability
  introspection: `accordion_sections`, `sliders`, `tables`,
  `drag_zones`, `dropzones`, `notifications_channel`.
- **7 new state values**: `expanded`, `collapsed`, `dragging`,
  `drop-target-over`, `uploading`, `sorting`, `filtering`.
- **Compliance level NAC-3 v1.1** defined. A v1.0 plugin MAY
  claim NAC-3 v1.0 (baseline) without v1.1 conformance.

### Documented

- **`docs/PHILOSOPHY.md`** -- long-form treatment of the two
  product principles that produced NAC ("the system disappears"
  + "the agent acts as a human, not as another system"), the
  six implications of principle 2, the full NAC vs MCP
  comparison, and what the principles rule out of NAC's scope.
- **Spec section 1.5** -- "Rationale -- why not just ARIA"
  added as part of the normative document. Lists the seven gaps
  NAC closes, the scope mismatch with the ARIA WG, and the
  coexistence pattern.
- **Spec section 1.6** -- "The two principles that produced
  NAC" added (normative). Constrains future spec extensions:
  any addition that violates either principle is out of scope.
- **Spec section 1.7** -- "NAC vs MCP -- complementary
  contracts" added (normative). Codifies the layered usage rule
  so adopters do not treat NAC and MCP as competing.
- **`README.md`** -- new top-level "The thesis in two
  principles" section + extended "NAC vs ARIA" section + new
  "NAC vs MCP" section with comparison table.
- **`docs/MANUAL.md`** -- "Mental model" reframed around the
  two principles + new "NAC vs ARIA -- when to use what" section
  with decision matrix and coexistence pattern.

### AI tooling

- `AI_INSTRUCTIONS.md` (new, canonical at repo root) -- single
  source of truth for AI coding assistants working with NAC.
  Templates for attributes, events, manifest, decision order,
  anti-patterns.
- Vendor-specific instruction files at the conventions each
  tool respects: `CLAUDE.md` (Anthropic Claude Code),
  `GEMINI.md` (Google Gemini Code Assist), `AGENTS.md` (OpenAI
  Operator / Aider / Devin / multi-agent), `.cursorrules`
  (Cursor), `.windsurfrules` (Codeium Windsurf), and
  `.github/copilot-instructions.md` (GitHub Copilot). Each
  file references `AI_INSTRUCTIONS.md` as canonical.

### Changed

- Spec header section: "Spec version" updated from v1.0 to v1.1
  (extends v1.0; sections 1-12 unchanged).
- Glossary entry for `NAC` now reads "Native Accessibility
  Contract" (formerly "Navegabilidad Automatica Compliance").
  Both expansions refer to the same contract; the English form
  is canonical for the public spec, the Spanish form is
  preserved as the original drafting name.

### Migration

- A v1.0 plugin is valid v1.1 without modification.
- A v1.0 operator parses a v1.1 plugin without crashing
  (unknown roles -> `region`, unknown field-types -> `text`,
  unknown events -> ignored).
- A v1.1 operator drives a v1.0 plugin without retrofit (v1.1
  driver functions degrade to v1.0 equivalents when v1.1
  manifest entries are absent).
- semver impact: **MINOR**. No breaking change.

## [1.0.1] - 2026-05-05

### Fixed

- `js/nac.js` `_serializeElement` label resolver: when an element has
  no `aria-label` and no associated `<label for=>`, NAC now walks into
  the element looking for `[data-nac-role=label]`, `.yj-kpi-label`,
  `.yj-tab-label`, or trims the elements own `textContent` (capped 80
  chars). Pure observability fix; P6 still requires `aria-label` on
  interactive elements -- the resolver only improves serialization for
  display-only nodes whose label is not an a11y target.
- Validated against yujin.app/crm Patch Manager mvp60 plugin. NAC SCORE
  22/22.

## [1.0.0] - 2026-05-05

### Added

- Initial public release. Spec normative document
  (`spec/NAC-v1.0.md`) defines the seven pillars:
  - **P1** stable identity (`data-nac-id`).
  - **P2** roles + semantics (`data-nac-role`,
    `data-nac-field-type`, `data-nac-action` verbs).
  - **P3** state exposed (`data-nac-state`,
    `data-nac-error`).
  - **P4** events published (`nac:action:dispatching` /
    `succeeded` / `failed`, `nac:tab:changed`,
    `nac:field:changed`).
  - **P5** programmatic API (`window.NAC.describe / list / find /
    click / fill / select / tab / wait_for / read_feedback /
    screenshot / validate`).
  - **P6** i18n + a11y (`I18n.t` for every visible string,
    `aria-label`, WCAG AA contrast, `role="tab"` +
    `aria-selected`).
  - **P7** manifest declared (`manifest_nac` enumerates fields,
    actions, tabs, kpis, rows, charts; validator
    `NAC.validate(slug)` MUST pass at runtime).
- Reference JavaScript implementation `js/nac.js` (439 LOC, zero
  dependencies, MIT licensed).
- Practical authoring + operating + testing manual
  (`docs/MANUAL.md`).
- MIT License with citation request honoring Pablo Adrian Kuschniroff + Sumi
  (the AI partner).
- First production deployment: yujin.app/crm Centro de Control
  (Patch Manager + Plan tiles, NAC-3 verified).

### Reference deployments

- yujin.app/crm Centro de Control -- NAC-3 in production since
  2026-05-05 (Patch Manager mvp60 SCORE 22/22, Plan tile NAC-3
  certified).

[Unreleased]: https://github.com/pkuschnirof/nac-spec/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/pkuschnirof/nac-spec/releases/tag/v1.0.0
