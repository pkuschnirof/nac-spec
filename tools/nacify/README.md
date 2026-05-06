# nacify -- NAC migrator

A Node.js CLI you drop at the root of any web project. It scans
your HTML, JSX/TSX, Vue, Svelte, and PHP templates, detects
interactive elements that lack NAC annotations, and either
prints a diff or applies the annotations in place.

The goal: take a brownfield app from "no NAC" to "NAC-3 L3"
in one PR.

## What it detects

- **Buttons**: `<button>`, `<input type="button|submit|reset">`,
  `<a role="button">`, `[role="button"]`.
- **Form fields**: `<input>` (every type), `<textarea>`,
  `<select>`, `[role="combobox|listbox|slider"]`.
- **Tabs and accordions**: elements with `role="tab"`,
  `role="tabpanel"`, common library classnames (`.tab`,
  `.accordion-header`, etc).
- **Plugin roots / modals**: `<dialog>`, `[role="dialog"]`,
  elements with classnames like `.modal`, `.plugin-root`,
  `.window`.
- **Action triggers without role**: any element bound to an
  `onClick=` / `@click=` / `v-on:click=` / `wire:click=`
  handler (framework-aware).

For each detected element, nacify proposes:

- `data-nac-id` -- derived from existing `id`, `name`, `aria-label`,
  visible text, or framework-emitted test ids
  (`data-test=`/`data-cy=`/`data-qa=`). Namespaced by the
  containing plugin/view inferred from the file path.
- `data-nac-role` -- `action` for buttons, `field` for inputs,
  `tablist` / `tab` / `tabpanel` for tabs, etc.
- `data-nac-field-type` -- mapped from `type=` for inputs.
- `data-nac-state` -- `idle` | `empty` | `disabled` based on
  current attributes.
- `data-nac-action` -- inferred from button text using a
  heuristic table (Save -> save, Submit -> submit,
  Cancel -> cancel, Delete -> delete, etc).

For framework components (a custom button component used in
many places), nacify proposes editing the component definition
itself rather than every callsite, so the annotation lands once.

## Coverage scoring

After scanning, nacify reports:

```
nacify scan ./

Detected interactive elements:    412
Already NAC-annotated:             67  (16%)
Proposed annotations:             345
Cannot infer (manual review):       8

NAC-3 L3 coverage projected:    99.8%
```

## Modes

```bash
# 1. Dry-run -- read-only scan + report
npx nacify scan ./

# 2. Diff -- show the proposed patch (pipe to diff viewer)
npx nacify diff ./ > nacify.patch

# 3. Apply -- write the changes in place
npx nacify apply ./ --commit

# 4. Continuous -- watch + apply on save
npx nacify watch ./

# 5. CI gate -- fail if coverage < threshold
npx nacify check ./ --min-coverage 95
```

`--commit` opens an interactive prompt before staging the diff
to git (with co-author trailer); `--no-commit` writes the files
without staging.

## File-type support matrix

| Extension | Parser | Notes |
|---|---|---|
| `.html`, `.htm` | parse5 | Full coverage. |
| `.jsx`, `.tsx` | @babel/parser | Walks JSX, edits attribute lists. |
| `.vue` | @vue/compiler-sfc | Template + setup script. |
| `.svelte` | svelte/compiler | Template only. |
| `.php` | regex + DOM-aware tokeniser | Heredoc-safe (avoids breaking `<<<HTML`). ASCII-pure output (per CLAUDE.md rule 3). |
| `.blade.php` | regex (laravel-aware) | Skips Blade directives. |
| `.erb` | regex (rails-aware) | Skips ERB tags. |
| `.twig` | regex (symfony-aware) | Skips Twig tags. |

## Manifest synthesis

After applying annotations, nacify scans the codebase for the
result and writes a starter `manifest_nac.js` per inferred
plugin in `nacify/manifests/{plugin}.js`. The starter is editable
-- nacify does not overwrite a hand-edited manifest unless you
pass `--regen-manifest`.

## Reporting NAC-3 L3 gaps

Three rules cannot be filled in by static analysis. nacify emits
a `nacify_gaps.md` listing them so you can address them in
follow-up commits:

- **Lifecycle events**: nacify cannot know where your fetch
  boundaries are. It marks every NAC-annotated action with a
  TODO comment indicating where to emit
  `nac:action:succeeded` / `failed`.
- **Manifest validate**: nacify generates the manifest skeleton
  but cannot verify your application calls
  `NAC.validate(slug)` at boot. Listed as a gap.
- **i18n keys**: NAC requires every visible string flow through
  `I18n.t()`. nacify flags any `data-nac-id` whose label looks
  hardcoded.

## Architecture

```
tools/nacify/
+-- bin/nacify.js          CLI entry
+-- src/
|   +-- scanners/          per file-type detectors
|   +-- inferers/          id / role / action / field-type heuristics
|   +-- patchers/          per file-type writers
|   +-- coverage.js        scoring + projection
|   +-- manifest_synth.js  starter manifest writer
|   +-- gap_report.js      nacify_gaps.md generator
+-- test/                  fixtures + snapshot tests
+-- package.json
```

The scanner -> inferer -> patcher pipeline is deliberately
boring: each step takes a list of "candidate" objects and adds
attributes. There is no AST rewriter that touches non-NAC
attributes; the diff is minimal and easy to review.

## Status

Reference implementation in this repo is **scaffolding** --
the directory structure, the CLI entry, the heuristic tables
and the per-file-type contracts. Implementing each scanner /
patcher is straightforward but volume-heavy; community PRs
welcome.

The first complete pair (HTML scanner + HTML patcher) is
provided as the reference end-to-end run.

## Limitations

- nacify cannot annotate dynamically-rendered DOM that is not
  visible in any source file (e.g., a custom-element pulled
  from a CDN at runtime). For those, see `runner/` -- the
  test runner detects them at runtime via `NAC.list()` and
  flags missing manifests.
- The heuristic id-derivation will sometimes pick a generic
  word ("save"). Run `nacify diff` and rename collisions
  manually before applying. Future work: id-collision
  resolver that namespaces by file path.
- We will never auto-emit `nac:action:succeeded` -- that
  belongs at the end of a real fetch / state transition,
  which only the developer knows.
