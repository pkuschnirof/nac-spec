# Impact of NAC on automated testing

NAC (Native Accessibility Contract) changes how UI tests are
authored, what they assert, and how often they break for reasons
unrelated to the system under test. This document is the QA
counterpart to `IMPACT_RPA.md`.

The two principles of NAC -- "the system disappears" and "the
agent acts as a human, not as another system" -- map cleanly
onto testing. A test that exercises the application "as a
human" via a published contract is more meaningful than a test
that asserts on selectors the human user never sees. The first
one tells you whether the user can save the form. The second
one tells you whether the CSS file changed.

---

## 1. The selector-driven status quo

A typical end-to-end suite (Playwright, Cypress, Selenium,
WebdriverIO, Puppeteer) reads roughly like this:

```js
await page.click('button[data-test="save-btn"]');
await page.waitForSelector('.toast.success');
expect(await page.textContent('#total')).toBe('$1,200');
```

The intent the human reader infers is "click save, wait for the
success toast, check the new total". The literal contract the
test is enforcing is "this exact selector tree exists, in this
exact order, with this exact label". The two are not the same.

Three problems compound:

- **Authoring cost.** Someone has to invent and maintain
  `data-test=` attributes per element. Often that someone is QA,
  not the front-end developer who owns the markup, so the
  attributes drift.
- **Flake.** Waiting on a class name (`.toast.success`) is
  waiting on a UI side-effect, not on the underlying state
  transition. Fast machines flicker through the toast; slow
  machines time out. Tests get `Sleep(2000)` glued in.
- **False breakage.** A redesign that renames the toast class
  or moves the total cell breaks every test that mentions
  either, even though the underlying behaviour is unchanged.

The QA team ends up doing exactly what the RPA team does: most
of the budget goes to repair, not to new coverage.

---

## 2. What NAC asks the test to assert instead

The same test, NAC-driven:

```js
const before = await page.evaluate(() => NAC.snapshot_state());

await page.evaluate(() => NAC.click('save'));
await page.evaluate(() => NAC.wait_for('action:succeeded', 5000));

const after = await page.evaluate(() => NAC.snapshot_state());

expect(after.totals.amount).toBe(1200);
```

What this test asserts is what the user actually experiences:

- An intent (`click save`) was issued.
- The application reported the corresponding lifecycle event
  (`action:succeeded`).
- The application's own state model exposes the new total.

There is no selector. There is no toast string. There is no
sleep. The test is not coupled to the rendering, only to the
contract.

If tomorrow the success message becomes a banner, a confetti
animation, a vibration on mobile, or a Slack notification, the
test still passes -- because the test is asking the application
"did the action succeed?" through the contract, not "did the
toast div appear?" through the DOM.

---

## 3. What stops being a test problem

### 3.1 Selector maintenance

There is no selector to maintain. `data-nac-id` is owned by the
front-end team, alongside the markup, and is part of the same
review cycle as feature work. QA stops being a downstream
consumer with a parallel contract.

### 3.2 Flake from race conditions

`NAC.wait_for(eventName, timeoutMs)` waits on the actual event
the application emits. It is event-driven, not poll-driven. The
historic flake category "spinner disappeared but DOM not settled
yet" stops existing because the spec's events are emitted at the
real boundaries of the action, not at the visual boundaries.

### 3.3 Localisation breakage

The test does not read `"Save"` from the button. It calls
`NAC.click('save')`. Switching the locale -- or A/B testing the
button copy -- does not break the test. The id is the contract;
the label is the rendering.

### 3.4 Theme and redesign breakage

Same argument as RPA. A redesign that keeps the intent keeps
the contract. Tests pass. A redesign that changes the intent
(removing the Save button entirely, splitting it into Save and
Save-and-close) is supposed to cause the test to fail, and it
does -- correctly.

### 3.5 Cross-framework portability

A NAC-driven test is the same against React, Vue, Svelte,
Angular, Lit, vanilla. The test layer does not need framework
adapters because the NAC contract is framework-agnostic.

---

## 4. What NAC does not change

NAC is a UI-level contract. It does not replace:

- **Unit tests** of pure functions, reducers, validators.
  Those are still what they were. NAC only touches the boundary
  where a human (or human-shaped agent) drives the UI.
- **Visual regression**. Pixel-diff tools (Percy, Chromatic,
  BackstopJS) still answer "did the rendering change?". NAC
  answers "did the behaviour change?". The two are
  complementary; neither subsumes the other.
- **Accessibility audits**. `axe-core` still validates ARIA,
  contrast and screen-reader trees. NAC adds a parallel
  semantic tree for autonomous operators. Both are needed; they
  do not overlap.
- **Performance and network testing.** NAC says nothing about
  request timing or bundle sizes.
- **Backend / API tests.** NAC stops at the UI boundary. The
  agent acts as a human; humans do not call the backend
  directly.

A useful mental model: NAC is to functional UI testing what HTTP
status codes are to API testing. It is the application's own
declaration of "the request succeeded / the action completed /
the state transitioned", and the test reads that declaration
instead of inferring it from the HTML body.

---

## 5. Practical migration for a test suite

You do not throw your existing suite away. NAC is purely
additive.

### Stage 1 -- new coverage uses NAC

For every new test from now on: drive through `window.NAC` and
assert on `NAC.snapshot_state()`. Do not write new selectors.
Do not introduce new `data-test=` attributes; the
`data-nac-id` already there is sufficient.

### Stage 2 -- replace the flakiest specs

Identify the ten flakiest tests in your CI history. They are
almost always the ones that wait on visual cues. Rewrite them
on `NAC.wait_for` and observe the flake rate over a release
cycle. Most teams see flake drop to near zero on the rewritten
specs.

### Stage 3 -- delete the parallel selector layer

Once the NAC-driven path is the default, the
`data-test=`/`data-cy=`/`data-qa=` attributes scattered across
the markup become dead weight. Remove them in a sweep. The
markup gets shorter; the contract gets centralised.

### Stage 4 -- merge with accessibility CI

Add `axe-core` next to `NAC.validate(slug)` in the same CI
gate. The application is now testing two contracts at once --
"is this operable by a screen reader?" and "is this operable by
an autonomous operator?" -- with the same authoring effort.
Both fail loud, neither fails subtly.

---

## 6. Test pyramids, with and without NAC

Traditional pyramid:

```
         /\
        /  \      End-to-end (slow, flaky, expensive)
       /----\
      /      \    Integration
     /--------\
    /          \  Unit
```

The widely-quoted reason the pyramid is shaped this way is that
end-to-end tests are slow and flaky. Most of the flake comes
from selector coupling and visual-cue waits. Both go away with
NAC.

The NAC-shaped pyramid:

```
         /\
        /  \      End-to-end NAC-driven (deterministic, cheap-ish)
       /----\     -- the bottom of this layer rises
      /      \    Integration
     /--------\
    /          \  Unit
```

End-to-end stays slower and costlier per second of CI than unit,
because it still runs a real browser. But it stops being the
"never trust this" tier. Teams report being able to push
end-to-end coverage up the pyramid because the cost of an
end-to-end test is no longer dominated by repair cycles.

---

## 7. NAC for record-and-playback tools

Vendor record-and-playback testers (Tricentis Tosca, Telerik
Test Studio, Functionize, Mabl, Testim) all face the same
fundamental problem: the recorded selector is brittle. Many of
them have invested in "self-healing" features -- when the
selector breaks, a heuristic re-locates the element by label,
position, or vision.

Self-healing is a partial fix; it costs runtime, costs vendor
licence, and silently changes what the test asserts. NAC
removes the need for it. The recorder records `data-nac-id`
plus the verb. The replay reads `data-nac-id` plus the verb.
There is no selector to heal.

Vendors who plug into NAC get a deterministic recorder for
free, and can de-emphasise the self-healing line item. Vendors
who do not are competing on a feature that NAC makes
unnecessary.

---

## 8. Hard cases NAC does NOT make easy

Honesty matters. NAC does not solve:

- **Implicit user expectations.** "The total should look right"
  is still ambiguous. NAC tells you the total is `1200`. It
  does not tell you whether `1200` is the right answer. That
  belongs in the unit-test layer or in BDD scenarios that
  encode the expected value.
- **Cross-document workflows that span systems.** If your test
  drives a CRM, then logs into an external billing app, then
  comes back, NAC helps you within each app but does not
  unify their state models. The test still has to know the
  semantic boundary between systems.
- **Animation correctness.** NAC says "the action completed";
  it does not say "and the bounce-out animation played for
  450 ms". Visual-regression tools still own that.
- **Race conditions BETWEEN actions.** NAC events are reliable
  per-action, but a suite that spams ten clicks in 50 ms still
  has to think about idempotency and queueing. The contract
  does not paper over real concurrency bugs in the application.

---

## 9. CI integration

Concrete recipe, language-agnostic:

1. In your test runner, add a hook that calls
   `await page.evaluate(() => NAC.validate(window.location.pathname))`
   before any assertion. This fails fast if the page does not
   meet its own declared contract -- a missing manifest entry,
   a `data-nac-action` with no handler, etc.
2. Add `axe-core` next to it, so the same gate covers ARIA.
3. In nightly runs, dump `NAC.describe()` per page into an
   artifact. Diff this artifact across releases. Any change
   without an associated PR title that includes "intent" or
   "contract" is a regression candidate.

This adds three minutes to a build and removes most of the
"why did this test fail today" investigations.

---

## 10. The one-line argument to give your front-end team

> "If every interactive element ships with five `data-nac-*`
> attributes and every action emits four `nac:action:*` events,
> the test suite stops being a per-release tax. The same
> attributes also make the page work for screen readers, voice,
> RPA, and the AI agents we already use to QA the build."

The five attributes are: `data-nac-id`, `data-nac-role`,
`data-nac-state`, `data-nac-action`, `data-nac-field-type`. The
four events are: `nac:action:dispatching`, `:succeeded`,
`:failed`, plus one of the lifecycle pair (`nac:plugin:opened`
or `nac:field:changed` depending on the element). That is the
entire ask.

---

## See also

- `docs/PHILOSOPHY.md` -- the two principles behind NAC.
- `docs/IMPACT_RPA.md` -- the parallel argument for RPA
  factories.
- `docs/MANUAL.md` -- how to author a NAC-compliant view.
- `spec/NAC-v1.0.md` -- the normative document, including v1.1
  widget extensions (tabs, accordion, combobox, slider, table,
  drag-drop, file upload, tooltip, popover, notifications).
