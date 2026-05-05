# NAC -- Navegabilidad Automatica Compliance

> A design norm that lets AI agents, voice assistants, RPA bots and
> automated test runners navigate, fill, operate and verify any user
> interface as if they were human users -- without reading the source
> code, without fragile selectors, without manual test scripts.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NAC v1.0](https://img.shields.io/badge/NAC-v1.0-violet.svg)](spec/NAC-v1.0.md)
[![Status: Stable](https://img.shields.io/badge/status-stable-success.svg)](#)

**Authors:** Pablo Kuschnirof, Sumi.
**License:** MIT.
**Spec version:** v1.0 (2026-05-05).

---

## Why NAC

Modern UIs are built for human eyes first. As a result, automated
tests rely on fragile CSS selectors, AI assistants cannot operate UIs
on the user's behalf, RPA bots need costly per-app training, and E2E
test coverage rarely exceeds 50% because writing specs manually does
not scale with feature velocity.

NAC reverses the polarity: a UI that complies with NAC v1.0
publishes its own contract -- semantic IDs, roles, states, events,
and a programmatic API -- so any external operator can introspect,
operate and verify it without privileged access.

Compliant systems are testable end-to-end at near-100% coverage with
auto-generated specs plus AI-guided exploration. Non-compliant
systems are not.

## What NAC unlocks

- **AI-driven testing**: a Claude/GPT-Vision runner consumes the
  manifest, opens every screen, fills every field, dispatches every
  action, validates every event, and reports pass/fail -- without a
  human writing test scripts.
- **AI-driven user assistance**: a voice or chat assistant can pilot
  the UI on behalf of the user ("open patch manager, apply all
  pending"), reading state and reacting to errors.
- **RPA without training**: tools like Browser-use, Playwright AI,
  Cypress AI, Anthropic Computer Use, etc. read `data-nac-*`
  attributes and operate without app-specific scripting.
- **Vendor-portable QA**: external QA vendors test the system using
  only the manifest. No source-code access required.
- **Future-proof**: the same UI that a human uses today is what an
  agent will use tomorrow. No bespoke API to expose; the UI itself
  is the API.

## How it works

A compliant UI annotates its DOM with seven kinds of attributes:

```html
<div data-nac-plugin="patch_manager" data-nac-plugin-state="ready">
  <button data-nac-id="apply_all"
          data-nac-role="action"
          data-nac-action="apply"
          data-nac-state="idle"
          aria-label="Apply all pending patches">
    Apply all
  </button>
</div>
```

And exposes a programmatic API on the same page:

```js
await NAC.click('apply_all');
const snap = NAC.describe();
const errs = NAC.read_feedback();
```

That's it. Any external operator that knows the spec can drive the
UI -- no source code reading, no selector engineering.

## Compliance levels

| Level   | Pillars satisfied | Allowed in        |
|---------|-------------------|-------------------|
| NAC-0   | none              | -- (forbidden)    |
| NAC-1   | P1 + P2 + P3      | dev / sandbox     |
| NAC-2   | P1..P5            | sandbox / pre-prod|
| NAC-3   | P1..P7            | production        |

The seven pillars are defined in [spec/NAC-v1.0.md](spec/NAC-v1.0.md).

## Repository layout

```
nac-spec/
+-- spec/        normative document (v1.0)
+-- js/          reference JS implementation (zero deps)
+-- validator/   manifest <-> runtime DOM validator
+-- runner/      headless test runner (Python + Playwright)
+-- examples/    minimal example plugin + voice adapter
+-- docs/        guides + badge SVGs + registry template
+-- tests/       unit tests for the reference impl
+-- LICENSE
+-- AUTHORS
+-- README.md    you are here
```

## Quick start

### 1. Make a plugin compliant

Annotate the DOM:

```html
<form data-nac-plugin="contact_form" data-nac-plugin-state="ready">
  <input data-nac-id="email"
         data-nac-role="field"
         data-nac-field-type="text"
         data-nac-state="pristine"
         aria-label="Email address">

  <button data-nac-id="submit"
          data-nac-role="action"
          data-nac-action="submit">Send</button>
</form>
```

Register the manifest:

```js
NAC.register({
  plugin_slug: 'contact_form',
  version: '1.0.0',
  i18n_namespace: 'contact_form',
  fields:  [{ nac_id: 'email',  type: 'text',  required: true,
              label_i18n: 'contact_form.email' }],
  actions: [{ nac_id: 'submit', verb: 'submit',
              label_i18n: 'contact_form.submit' }],
});
```

Emit events:

```js
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  document.dispatchEvent(new CustomEvent('nac:action:dispatching',
    { detail: { plugin: 'contact_form', nac_id: 'submit' } }));
  try {
    await api.send(emailValue);
    document.dispatchEvent(new CustomEvent('nac:action:succeeded',
      { detail: { plugin: 'contact_form', nac_id: 'submit' } }));
  } catch (err) {
    document.dispatchEvent(new CustomEvent('nac:action:failed',
      { detail: { plugin: 'contact_form', nac_id: 'submit',
                  error: String(err) } }));
  }
});
```

That's NAC-3.

### 2. Operate it from outside

```js
await NAC.fill('email', 'me@example.com');
await NAC.click('submit');
const errs = NAC.read_feedback();
```

### 3. Auto-test it

```bash
cd runner/
python nac_runner.py --target http://localhost:3000 --plugin contact_form
# -> generates and runs smoke / field / action / tab / KPI tests
```

## Citation

```
NAC v1.0 -- Navegabilidad Automatica Compliance.
Pablo Kuschnirof and Sumi. 2026. MIT License.
```

## Status

NAC v1.0 is **stable**. The first production deployment ships with
the Yujin CRM (yujin.app) Control Center plugins, May 2026.

## Contributing

This is an open standard. Forks, suggestions, language ports
(Python, Swift, Kotlin, Rust, Go) are welcome via pull request. The
spec is intentionally minimal; new attribute types or roles MUST go
through a spec PR with at least one production reference deployment.

## Related work

NAC is conceptually adjacent to ARIA (accessibility), but solves a
different problem: ARIA targets assistive tech for humans, NAC
targets autonomous operators (machines and AI). The two are
complementary and a compliant UI satisfies both.
