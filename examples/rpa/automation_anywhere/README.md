# Automation Anywhere sample -- drive a NAC page from A360

Reproduces the standard scenario (search customer "Acme Corp",
fill an order, submit) against the live demo at
https://yujin.app/nac-spec/example-navmap.php using AA A360
actions only.

## Files

- `nac_helpers.js` -- copy of
  `examples/rpa/shared/nac_helpers.js`. AA samples bundle the
  helper.
- `nac_drive.atmx` (placeholder; produced from the sequence
  below in Bot Editor) -- the bot file.

## Required AA packages

- Browser package (built-in).
- Variables / String / List manipulation (built-in).

## Action chain (Bot Editor)

```
1. Browser: Open                 URL = "https://yujin.app/nac-spec/example-navmap.php"
                                  Browser = Chrome
2. Browser: Run JavaScript Code  Source = file: nac_helpers.js
                                  (just paste the file contents)
3. Browser: Run JavaScript Code  Code = "return await window.__nacRpa.await(8000);"
                                  Output -> $rawReady$
4. Browser: Run JavaScript Code  Code = "return await window.__nacRpa.searchOptions(
                                    'customers.search', 'Acme Corp', 5);"
                                  Output -> $rawOpts$
   String: To dictionary         JSON parse $rawOpts$ -> $optsDict$
   List: From dictionary         $optsDict$.options -> $optsList$
   String: Get value             $optsList$[0].value -> $custName$
5. Browser: Run JavaScript Code  Code = "return await window.__nacRpa.fill('orders.amount', 1500);"
6. Browser: Run JavaScript Code  Code = "return await window.__nacRpa.fill('orders.priority', 'high');"
7. Browser: Run JavaScript Code  Code = "return await window.__nacRpa.clickAndWait('orders.submit', 5000);"
                                  Output -> $rawResult$
8. Log to file                   "Order created via NAC for " $custName$
```

## Why these eight steps replace ~30

A historical AA bot for the same flow records each click and
each text field as a separate step using the Browser
recorder, ending up with around 30 actions and a fragile object
cloning configuration. With NAC, three `Run JavaScript Code`
actions cover the whole driving surface; the rest is data
shuffling.

## Error handling

Same JSON envelope as the UiPath sample
(`{ ok, result, event, error }`). Branch on `ok==false` with an
If/Else action and route to your standard exception queue.

## Production checklist

- [ ] NAC reference impl loaded on the target page (the demo
      loads it; for your apps, see `tools/nacify`).
- [ ] Bot user authenticated through your SSO before the bot
      runs.
- [ ] Credentials Vault entries used as inputs to the NAC
      `fill` calls -- never hard-code secrets in the bot.
- [ ] Control Room queues, schedules, and audit configured as
      usual.

## License

MIT.
