---
name: Vendor port announcement
about: Announce a port of the NAC reference impl to another language
title: "[port] NAC for <language>"
labels: port, ecosystem
assignees: ''
---

## Target language / runtime

- Language: <!-- e.g. Python, Swift, Kotlin, Rust, Go, Dart, .NET -->
- Runtime / version:
- Repo URL:
- Maintainer (you):
- License:

## API parity checklist

The reference impl `js/nac.js` exposes a public surface. Your port
should match it, modulo idioms (snake_case vs camelCase, etc).
Tick the boxes that apply.

### Lifecycle

- [ ] `register(plugin_slug, manifest)` -- equivalent
- [ ] `manifest(plugin_slug)` -- equivalent
- [ ] `describe(plugin_slug)` -- equivalent
- [ ] `list()` -- equivalent
- [ ] `find(query)` -- equivalent

### Driver

- [ ] `click(nac_id)` -- equivalent (or doc the no-DOM substitute)
- [ ] `fill(nac_id, value)` -- equivalent
- [ ] `select(nac_id, value)` -- equivalent
- [ ] `tab(plugin_slug, tab_nac_id)` -- equivalent

### State + feedback

- [ ] `read_feedback()` -- equivalent
- [ ] `snapshot_state()` -- equivalent
- [ ] `validate(plugin_slug)` -- equivalent

### Events emitted

- [ ] `nac:plugin:opening` / `opened` / `closing` / `closed`
- [ ] `nac:action:dispatching` / `succeeded` / `failed`
- [ ] `nac:field:changed`
- [ ] `nac:state:changed`

## Conformance

- [ ] runs the published test cases under `tests/` against your
      impl and they pass
- [ ] `validator/` accepts manifests produced by your impl
- [ ] manual `docs/MANUAL.md` examples work step-by-step

## Naming

The convention for ports is `nac-<language>` (e.g. `nac-python`,
`nac-swift`, `nac-rust`). If your port uses a different name,
explain why.

## Distribution

How will adopters install your port?

- [ ] published on the canonical package registry
      (PyPI / Maven Central / crates.io / npm / etc)
- [ ] vendored copy in a sample app
- [ ] other (describe)

## Notes

<!-- Any language-specific quirks worth flagging. E.g. how you map
the manifest dict to a typed struct, how you implement the event
emitter without DOM, etc. -->
