# NAC Authoring Patterns

This guide collects the patterns the spec leaves room for an
implementer to choose from. It is informative; the normative
contracts live in `spec/NAC-v1.0.md`. Read this when you have the
spec open and want concrete worked examples for the cases the
spec covers in abstract.

Three sections:

1. ARIA worked examples (combobox, modal dialog, virtualized
   datagrid, accordion, tabs).
2. Skip enforcement -- how to use `data-nac-validate="skip"` and
   `data-nac-skip-reason` without turning them into compliance
   theatre.
3. Hint escalation -- when voice tools, screen readers and AI
   agents should interpose, and the recommended priority order
   when multiple hints apply.

---

## 1. ARIA worked examples

The normative ARIA-to-NAC mapping is in spec sec 7.3.3. Below are
the patterns for the most frequent widgets.

### 1.1. Combobox

Combobox is the canonical case for ARIA + NAC together. ARIA
describes the listbox semantics for screen readers; NAC describes
the operable IDs for voice / AI agents.

```html
<div data-nac-id="country.combobox"
     data-nac-role="field"
     data-nac-field-type="combobox"
     role="combobox"
     aria-haspopup="listbox"
     aria-expanded="false"
     aria-controls="country.list">
  <input type="text"
         data-nac-id="country.input"
         aria-autocomplete="list">
</div>
<ul id="country.list"
    data-nac-id="country.list"
    data-nac-role="region"
    role="listbox"
    hidden>
  <li data-nac-id="country.option.ar"
      role="option"
      aria-selected="false">Argentina</li>
  <li data-nac-id="country.option.br"
      role="option"
      aria-selected="false">Brazil</li>
</ul>
```

Patterns:
- The combobox container carries both the NAC `data-nac-role=
  "field"` AND the ARIA `role="combobox"`. They co-exist; they
  are read by different consumers.
- `aria-expanded` is owned by the host; the runtime mirrors it
  from `data-nac-state` per sec 7.3.1 (NAC drives, ARIA mirrors).
  When `NAC.expand` runs, BOTH change atomically.
- Each option has a stable `data-nac-id` (`country.option.ar`)
  AND a stable `role="option"`. Voice command "pick Argentina"
  resolves through the manifest's `label_i18n`.
- When the user selects, the host fires `nac:field:changed` with
  `field_id: 'country.combobox', new_value: 'ar', option_id:
  'country.option.ar'` AND mutates `aria-selected="true"` on the
  option. Both layers see the same state.

### 1.2. Modal dialog with confirmation

```html
<button data-nac-id="invoice.delete"
        data-nac-role="action"
        data-nac-action="delete"
        data-nac-a11y-hint="irreversible|requires_confirmation|data_loss"
        aria-haspopup="dialog">
  Delete invoice
</button>

<div data-nac-id="confirm.delete"
     data-nac-role="confirm-dialog"
     role="dialog"
     aria-modal="true"
     aria-labelledby="confirm.delete.title"
     hidden>
  <h2 id="confirm.delete.title">Delete invoice?</h2>
  <p>This action cannot be undone.</p>
  <button data-nac-id="confirm.delete.confirm"
          data-nac-role="confirm-button"
          data-nac-action="confirm">
    Yes, delete
  </button>
  <button data-nac-id="confirm.delete.cancel"
          data-nac-role="confirm-button"
          data-nac-action="cancel">
    Cancel
  </button>
</div>
```

Patterns:
- `aria-haspopup="dialog"` and `data-nac-a11y-hint=
  "requires_confirmation"` say the same thing to two different
  consumers. Both layers should agree.
- `aria-modal="true"` traps focus for keyboard / screen-reader
  users; NAC drivers do not need a modal-trap equivalent because
  they target by ID, not by focus order.
- The runtime's a11y-hint ARIA bridge (sec 3.1, v1.9.0) appends
  "This action cannot be undone. Confirmation will be required.
  Replaces data without preservation." to the button's
  `aria-describedby` so screen readers announce the consequence
  before the user activates.

### 1.3. Virtualized datagrid

```html
<div data-nac-id="orders.grid"
     data-nac-role="region"
     role="grid"
     aria-rowcount="50000"
     aria-colcount="6">
  <!-- Only ~30 rows are actually rendered; aria-rowcount tells
       AT the virtual size. -->
  <div role="row"
       aria-rowindex="42"
       data-nac-id="orders.row.ord-2026-04223">
    <div role="gridcell"
         data-nac-id="orders.row.ord-2026-04223.id">2026-04223</div>
    <div role="gridcell"
         data-nac-id="orders.row.ord-2026-04223.amount">$ 1,250.00</div>
  </div>
</div>
```

Patterns:
- The canonical `data-nac-id` (`orders.row.ord-2026-04223`) is
  the **stable persistent ID** required by sec 6.2.31. Voice
  command "open the April 2026 #4223 order" resolves through it
  and survives sort, filter, scroll, pagination.
- `aria-rowindex="42"` is the visible position; it changes with
  sort/filter/scroll. Voice command "click row 42" resolves
  through `aria-rowindex` and is fragile by design (positional).
- Both work, but the semantic command (NAC) is what an audit
  pipeline records and what an AI agent should prefer.

### 1.4. Accordion

```html
<section data-nac-id="acc.s1"
         data-nac-role="accordion-section"
         data-nac-state="collapsed"
         role="region"
         aria-labelledby="acc.s1.heading">
  <h3 id="acc.s1.heading">
    <button data-nac-id="acc.s1.toggle"
            data-nac-role="action"
            data-nac-action="toggle"
            aria-expanded="false"
            aria-controls="acc.s1.body">
      Section 1
    </button>
  </h3>
  <div id="acc.s1.body" hidden>
    Body content...
  </div>
</section>
```

Patterns:
- The toggle button has `aria-expanded` (read by screen readers)
  and the section has `data-nac-state` (read by NAC drivers).
  Both flip together when `NAC.expand` runs.
- The toggle's role is `action` (NAC) and it is the focusable
  element; the section is `region` (ARIA) for landmark
  navigation.

### 1.5. Tabs

```html
<div role="tablist"
     data-nac-id="tabs.demo"
     data-nac-role="region">
  <button data-nac-id="tabs.demo.t1"
          data-nac-role="tab"
          role="tab"
          aria-selected="true"
          aria-controls="panel.t1"
          tabindex="0">Overview</button>
  <button data-nac-id="tabs.demo.t2"
          data-nac-role="tab"
          role="tab"
          aria-selected="false"
          aria-controls="panel.t2"
          tabindex="-1">Details</button>
</div>
<div id="panel.t1" role="tabpanel">...</div>
<div id="panel.t2" role="tabpanel" hidden>...</div>
```

Patterns:
- `aria-selected` / `tabindex` follow the W3C ARIA Authoring
  Practices roving-tabindex pattern for keyboard navigation.
- `data-nac-role="tab"` makes `NAC.click('tabs.demo.t2')`
  resolve via `nac:tab:changed` (sec 6.2.5).

---

## 2. Skip enforcement (data-nac-validate + data-nac-skip-reason)

The pattern: a skip region is OK; a skip region without a
machine-readable reason is not. v1.9.0 makes that normative
(sec 3.1).

### 2.1. Right way

```html
<section data-nac-validate="skip"
         data-nac-skip-reason="third_party_datepicker;remediate-by=2027-01-01;tracker=PROJ-1234">
  <vendor-datepicker></vendor-datepicker>
</section>
```

Why this works:
- The reason has a recognised category (`third_party_datepicker`).
- It commits to a remediation date (2027-01-01).
- It links to a tracker (PROJ-1234) so audits can verify the team
  is actually working toward removing the skip.
- The validator stays green (no `skip_without_reason` finding).
- When 2027-01-01 passes without removal, the validator emits
  `skip_remediation_overdue` (warn) and the team's CI dashboard
  flags it.

### 2.2. Wrong way (anti-patterns)

```html
<!-- ANTI-PATTERN: skip without reason -->
<section data-nac-validate="skip">
  ...
</section>
```

Validator emits `skip_without_reason` (error at NAC-3, build
fails). Correct: add the `data-nac-skip-reason`.

```html
<!-- ANTI-PATTERN: vague reason -->
<section data-nac-validate="skip" data-nac-skip-reason="legacy">
  ...
</section>
```

Technically passes today (string is not empty) but defeats the
intent. Audit tooling SHOULD warn on reasons that lack a category
from the recognised set OR lack a `remediate-by`. Authors are
expected to commit to a date.

```html
<!-- ANTI-PATTERN: skip wrapping the whole page -->
<body>
  <main data-nac-validate="skip" data-nac-skip-reason="wip_remediation">
    ...everything...
  </main>
</body>
```

The validator passes the `skip_without_reason` check but emits
`skip_subtree_contains_interactives` for hundreds of operable
descendants. Audit tooling MUST treat this as a blocker rather
than green. The framework convention is: a skip region wraps a
SINGLE third-party widget, not a screen.

### 2.3. Audit-friendly format

CI dashboards SHOULD report:
- Total count of skip regions per page.
- Count of skip regions with `remediate-by` past.
- Count of skip regions per category.
- Trend (week over week): new skip regions + removed skip
  regions. A team that adds skips faster than it removes is
  drifting toward "everything skipped".

Recommended grep recipe:

```bash
# Count skip regions
grep -rh 'data-nac-validate="skip"' src/ | wc -l

# List skip regions with overdue dates (date in the past)
grep -rh 'remediate-by=' src/ \
  | grep -oP 'remediate-by=\d{4}-\d{2}-\d{2}' \
  | sort -u
```

---

## 3. Hint escalation semantics

`data-nac-a11y-hint` is **advisory**. The runtime parses it,
surfaces it on `describe()`/`find()`, and bridges it into ARIA
via `aria-describedby`. The runtime does NOT enforce
interposition. Voice tools, screen readers and AI agents are the
ones that decide whether to interpose.

This section describes the conventions that the spec recommends
those consumers follow.

### 3.1. Priority order when multiple hints apply

When a single element carries multiple hints, the consumer
SHOULD interpose using the strongest one as primary and mention
the others as context. Recommended ordering (highest first):

1. `irreversible`
2. `data_loss`
3. `dangerous`
4. `external_side_effect`
5. `costly`
6. `requires_confirmation`
7. `long_running`

So a button with `irreversible|requires_confirmation|data_loss`
opens an interposition that leads with "This action cannot be
undone" rather than "Confirmation will be required".

### 3.2. Interposition by consumer type

#### Voice control software (Talon, Voice Access, Dragon)

Voice software sees the `data-nac-a11y-hint` array via
`NAC.find().a11y_hint`. Recommended UX:

1. On voice command targeting the element, BEFORE invoking
   `NAC.click`:
   - Read the bridged `aria-describedby` text aloud.
   - Pause for confirmation: "Say 'confirm' to delete the
     invoice. Say 'cancel' to skip."
2. On `irreversible` or `data_loss`, require explicit confirm
   verb -- never act on first utterance.
3. On `long_running`, announce "this may take a while" but
   proceed without confirmation (low risk).
4. On `requires_confirmation` only (no other hints), call the
   action and let the host's modal flow handle the confirm UI.

#### Screen readers

Screen readers consume the bridged `aria-describedby` text
without any NAC awareness. The runtime's bridge does the work
for them. No special UX needed in the screen reader; the user
hears the consequence as part of the element description.

The screen reader's normal interposition (focus pause + read
description + wait for activation) is sufficient.

#### AI agents (Claude, GPT, voice-orchestrators)

AI agents have higher autonomy and lower observability than
voice / SR. They MUST behave more conservatively.

1. BEFORE every `NAC.click`/`NAC.fill` on an element with
   `irreversible`, `data_loss`, `dangerous`, or
   `requires_confirmation`: surface a confirmation card to the
   user with the resolved hint text, the target ID, the
   ProvenanceBlock the agent will set, and a yes/no prompt.
2. Do not invoke until the user confirms in the same session.
3. Log the confirmation with the action so audit trails can
   later verify the user actually authorised the irreversible
   action.
4. On `costly` or `external_side_effect`: surface but proceed
   if the user previously authorised "agent may incur cost"
   for this session.
5. On `long_running`: proceed without confirmation but show a
   progress indicator.

#### RPA bots

RPA bots are typically non-interactive (no user available to
confirm). They MUST refuse to invoke any action carrying
`irreversible`, `data_loss`, or `dangerous` unless their
configuration explicitly allows the specific
`(action, hint)` pair.

The configuration should be auditable, per-target, with an
explicit human approval recorded outside the runtime.

### 3.3. Localisation

The runtime ships English defaults and accepts a localizer:

```javascript
NAC.set_a11y_hint_localizer(function (tag, locale) {
  return {
    es: {
      irreversible:           'Esta accion no se puede deshacer.',
      requires_confirmation:  'Se requerira confirmacion.',
      dangerous:              'Accion peligrosa.',
      long_running:           'Puede tomar un rato.',
      costly:                 'Tiene un costo.',
      external_side_effect:   'Afecta sistemas externos.',
      data_loss:              'Reemplaza datos sin preservacion.',
    },
    pt: {
      irreversible:           'Essa acao nao pode ser desfeita.',
      // ...
    },
    // ...
  }[locale] && [...]
});
```

Hosts that already maintain an i18n catalog SHOULD wire their
catalog into the localizer so hint text matches the rest of the
UI's tone and formality.

### 3.4. Custom hints

The recognised vocabulary is `irreversible | requires_confirmation
| dangerous | long_running | costly | external_side_effect |
data_loss`. Hosts MAY add custom hints (e.g., `compliance_review`,
`signs_legal_doc`). The runtime parses them into the array
unchanged; the bridge falls back to the raw tag text when the
localizer has no entry.

Plugin authors who introduce a custom hint SHOULD document it
in their plugin manifest's `label_i18n.a11y_hint.<tag>` entry
so consumers can localise.

---

## See also

- `spec/NAC-v1.0.md` sec 3.1 (data-nac-validate, data-nac-a11y-hint,
  data-nac-braille-label).
- `spec/NAC-v1.0.md` sec 6.2.30 (nac:command:rejected reasons).
- `spec/NAC-v1.0.md` sec 7.3 (NAC vs ARIA authority + bridge).
- `docs/MANUAL.md` -- end-to-end authoring guide.
- `docs/MIGRATION_v1_to_v2.md` -- v1.x to v2.0 migration path.
- `docs/ROADMAP.md` -- what is coming after v2.0.
