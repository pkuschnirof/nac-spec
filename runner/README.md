# NAC test runner

A reference test runner that drives any NAC-compliant page and
reports pass/fail per element + per transition. Think `pytest`
for the NAC vocabulary.

The runner is **catalog-driven**, not script-driven: it does
not need test specs. It connects to the page, calls
`NAC.system_map()` and `NAC.list()`, then for every plugin /
view / field / action / transition it discovers, it generates
and runs the appropriate assertion.

## What it tests, automatically

For every plugin returned by `NAC.list()`:

| Source | Test generated |
|---|---|
| Every `actions[]` entry | click via `NAC.click(id)`; assert `nac:action:succeeded` fires within 5 s, or `nac:action:failed` matches `expected_failure: true`. |
| Every `fields[]` entry of type `text` / `email` / `tel` / `url` | `NAC.fill(id, sample)`; assert `nac:field:changed` fires; assert state moves out of `empty`. |
| Every `fields[]` entry of type `select` / `combobox` | enumerate via `NAC.options(id)` (static / dynamic) or call `NAC.search_options(id, q)` (remote); fill the first option; assert `nac:field:changed` fires. |
| Every `fields[]` entry of type `slider` / `range` | `NAC.set_slider(id, midpoint)`; assert `nac:slider:value_changed`. |
| Every `tabs[]` entry | `NAC.tab(plugin, tab)`; assert `nac:tab:changed`. |
| Every accordion-section | `NAC.expand(id)` then `NAC.collapse(id)`; assert lifecycle events. |
| Every chrome verb (`minimize`, `maximize`, `restore`) declared on the plugin | call the matching driver function; assert `nac:plugin:*` event. |
| Every `transitions[]` edge | follow the edge via the declared `via_action`; assert the target view loads. |
| `NAC.validate(slug)` per plugin | assert `ok: true`. |

## Outputs

Each run produces:

- `report.json` -- machine-readable per-test result with
  manifests, transitions traversed, events captured, error
  details on failures.
- `report.html` -- human-readable report with screenshots of
  failures and an inline copy of `system_map()`.

## Usage

```bash
cd runner/
pip install -r requirements.txt
playwright install chromium

python nac_runner.py --target https://yujin.app/nac-spec/example.php
python nac_runner.py --target https://yujin.app/nac-spec/example-navmap.php --plugin orders --plugin customers
python nac_runner.py --target http://localhost:8080/your-app/ --auth-cookie sid=abc
```

CLI flags:

- `--target` (required) -- the page to drive.
- `--plugin <slug>` -- restrict tests to one plugin
  (repeatable); without this, every plugin is tested.
- `--auth-cookie name=value` -- set a session cookie before
  loading.
- `--auth-header X-Foo:bar` -- set a header before loading.
- `--out <dir>` -- output directory (default `./out/`).
- `--timeout-ms <n>` -- per-action timeout (default 5000).
- `--no-system-map` -- skip system-map discovery (use
  `NAC.list()` only).
- `--exit-non-zero-on-fail` -- CI gate mode: returns 1 if any
  test failed.
- `--vision` -- attach Claude Vision (env `ANTHROPIC_API_KEY`)
  to propose extra cases per screenshot.
- `--shape-only` -- syntax check the manifests, no driving
  (fast smoke).

## Why catalog-driven beats spec-driven

A catalog-driven runner cannot miss a new field: the moment a
plugin author adds a `data-nac-id`, the runner picks it up on
the next run. There is no parallel test suite to keep in sync.

This is the same principle as F45 list-view in the Yujin CRM:
the renderer reads the schema; new columns appear automatically.

## Sample output

```
$ python nac_runner.py --target https://yujin.app/nac-spec/example.php

[discovery] system_map() ok -- 4 views, 6 transitions
[plugin example_demo] 8 actions, 0 fields, 0 tabs
  click piano.c     ok (action:succeeded in 12 ms)
  click piano.d     ok (action:succeeded in 14 ms)
  ...
[plugin cities] 1 field (combobox/remote)
  search_options "ber" -> 8 results
  fill cities.search="Berlin" ok (field:changed in 23 ms)
[plugin navmap] 5 actions
  click navmap.fetch ok (action:succeeded in 41 ms)
  click navmap.minimize ok (plugin:minimized in 8 ms)
  ...

24 tests, 24 passed, 0 failed in 4.7 s
```

## Limitations

The runner is intentionally minimal:

- It does not try to generate semantically meaningful test
  values. `text` fields get `"NAC test"`, `email` gets
  `nac@test.local`, `number` gets `42`. For business logic
  validation, layer pytest specs on top of this output.
- It does not assert on backend side-effects. It reads what
  NAC tells it. If `nac:action:succeeded` fired and the
  manifest does not declare a `confirms_with` clause, the test
  passes. Use the runner as a smoke / coverage tool, not a
  business-rules tool.

See `tests/` for layered integration suites that exercise
domain assertions on top.
