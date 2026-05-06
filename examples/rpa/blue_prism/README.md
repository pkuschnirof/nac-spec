# Blue Prism sample -- drive a NAC page from a Web Object

Reproduces the standard scenario (search customer "Acme Corp",
fill an order, submit) against the live demo at
https://yujin.app/nac-spec/example-navmap.php using a Blue
Prism Web Object only.

## Files

- `nac_helpers.js` -- copy of
  `examples/rpa/shared/nac_helpers.js`. Blue Prism injects this
  into the page once at load time.
- `NAC_Web_Object.xml` (placeholder; produced from the design
  below in Object Studio) -- the Web Object with NAC-aware
  Stages.
- `nac_drive.bprelease` (placeholder) -- exported release
  containing the Web Object plus a sample Process that runs the
  scenario.

## Required Blue Prism components

- Browser Automation (built-in v6.10+ or Hub equivalent).
- Chrome Extension (for Web Object instrumentation).

## Object Studio -- Web Object design

Create a single Web Object named `NAC Page Driver`. Add five
Stages:

```
Stage 1  Browser: Launch          URL = "https://yujin.app/nac-spec/example-navmap.php"
                                   Browser = Chrome

Stage 2  Inject JS Fragment       Source = nac_helpers.js (full file)
                                   (this is "Inject JavaScript" in the
                                    Web Spy Stage Editor; paste the
                                    file contents into Source.)

Stage 3  Action: NAC Click         Inputs:  nacId  (Text)
                                              timeoutMs (Number, default 5000)
                                   Output:  resultJson (Text)
                                   Code (Get JS Result):
                                     return await window.__nacRpa.clickAndWait(nacId, timeoutMs);

Stage 4  Action: NAC Fill          Inputs:  nacId  (Text)
                                              value  (Text)
                                   Output:  resultJson (Text)
                                   Code:
                                     return await window.__nacRpa.fill(nacId, value);

Stage 5  Action: NAC Search        Inputs:  nacId  (Text)
                                              query  (Text)
                                              limit  (Number, default 5)
                                   Output:  resultJson (Text)
                                   Code:
                                     return await window.__nacRpa.searchOptions(nacId, query, limit);
```

Each Action Stage uses Blue Prism's "Get JS Result" Stage to
return the JSON envelope produced by the helper.

## Process Studio -- the scenario Process

Create a Process named `NAC Demo Order` with this flow:

```
1. Action  NAC Click   navmap.fetch        (warms up the system map)
2. Action  NAC Search  customers.search    Query="Acme Corp"  -> resultJson
   Calculation         JSON parse + first .options.value      -> custName
3. Action  NAC Fill    orders.amount       Value=1500
4. Action  NAC Fill    orders.priority     Value="high"
5. Action  NAC Click   orders.submit       (waits for action:succeeded)
6. Calculation         "Order created via NAC for " & [custName] -> logLine
7. Log                 [logLine]
```

That is the entire bot. Six Stages.

## Why this beats Application Modeller spying

Blue Prism's Application Modeller historically requires you to
spy each element with the Chrome extension, capturing
attributes (class names, IDs, page positions). Each captured
element is one Spy entry; sufficient drift in any of those
attributes breaks the spy.

With NAC, Application Modeller is unnecessary -- there is one
Web Object with three reusable Actions (Click, Fill, Search),
parameterised by `data-nac-id`. New flows are
process-side-only changes; nothing in Object Studio needs to
move.

## Error handling

The helper's JSON envelope (`{ ok, result, event, error }`) is
parsed in a Calculation Stage after each Action. Branch on
`ok==False` with a Decision Stage and route to your Work Queue
exception path.

## Production checklist

- [ ] NAC reference impl loaded on the target page.
- [ ] Bot user authenticated via your normal SSO flow.
- [ ] Credentials taken from Blue Prism Credentials Manager,
      not hard-coded.
- [ ] Audit log + Work Queue + scheduler configured as usual.

## License

MIT.
