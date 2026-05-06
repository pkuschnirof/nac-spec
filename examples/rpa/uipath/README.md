# UiPath sample -- drive a NAC page from UiPath Studio

Reproduces the standard scenario (search customer "Acme Corp",
fill an order, submit) against the live demo at
https://yujin.app/nac-spec/example-navmap.php using UiPath
Studio activities only.

## Files

- `nac_drive.xaml` -- the workflow. Six activities chained.
- `nac_helpers.js` -- copy of `examples/rpa/shared/nac_helpers.js`
  (UiPath samples are self-contained; do not symlink across
  vendors).

## Required UiPath packages

- `UiPath.UIAutomation.Activities` >= 23.4
- `UiPath.System.Activities` >= 23.4

No external NuGet dependency. The whole flow uses
`Use Browser` + `Inject JS Script` + `Invoke JavaScript` only.

## Activity chain

```
1. Use Browser    URL = "https://yujin.app/nac-spec/example-navmap.php"
                  Browser = Chrome
2. Inject JS      Source = nac_helpers.js
3. Invoke JS      Code = "return await window.__nacRpa.await(8000);"
                  Output: rawReady (String)  -- expect {"status":"ready"}
4. Invoke JS      Code = "return await window.__nacRpa.searchOptions(
                          'customers.search', 'Acme Corp', 5);"
                  Output: rawOpts (String)
                  Then: Deserialize JSON -> first option's "value" -> custName
5. Invoke JS      Code = "return await window.__nacRpa.fill('orders.amount', 1500);"
6. Invoke JS      Code = "return await window.__nacRpa.fill('orders.priority', 'high');"
7. Invoke JS      Code = "return await window.__nacRpa.clickAndWait('orders.submit', 5000);"
                  Output: rawResult (String) -- expect {"ok":true,"event":{...}}
8. Log Message    "Order created via NAC for " + custName
```

## What the bot is doing

It is operating the application AS A HUMAN WOULD: searching
through the same combobox the user types in, filling the same
inputs, clicking the same submit button. There is no XPath. No
class selector. No image reference.

If the application redesigns its CSS tomorrow, the bot does not
break -- the `data-nac-id` on each element is the contract, and
the contract did not change.

## Error handling

Each `Invoke JavaScript` returns a JSON envelope:

```json
{ "ok": true,  "result": {...}, "event": {...} }
{ "ok": false, "error": "OptionsUnavailable: search failed" }
```

Wire a Throw activity off the `ok=false` branch. The
`error` field carries the stable NAC error code
(`RemoteSourceRequiresSearch`, `OptionsUnavailable`, etc) so
your retry policy can switch on it.

## Why this beats per-selector recording

Compare with the historical UiPath approach:
- Open the page, click "Indicate on screen", record a selector
  for each element. Result: ~12 selectors, each a brittle
  XPath.
- Bot breaks on next CSS rebuild. RPA team re-indicates.
- Quarterly repair tax.

With NAC:
- Two `Invoke JavaScript` activities drive the entire flow.
- The selectors do not exist. The contract is the
  `data-nac-id`, owned by the front-end team.
- No quarterly repair tax.

## Translating the .xaml manually

If you prefer to author the .xaml in Studio: drop a `Use
Browser` activity, configure the URL, then drop a sequence
inside it with the seven activities listed above. The file
`nac_drive.xaml` is the result.

The file is XML. UiPath will round-trip it cleanly.

## Production checklist

- [ ] NAC reference impl loaded on the target page (or inject
      it via `Inject JS Script` from CDN).
- [ ] Manifests registered for every plugin you intend to
      drive. Use `tools/nacify` to migrate brownfield apps.
- [ ] Bot account authenticated via your normal SSO flow
      before the workflow starts.
- [ ] Configure UiPath Orchestrator queues / SLAs as you
      always would; NAC does not change the orchestration
      tier.

## License

MIT.
