# What AIs think of NAC -- v1.6 round

> Open, ongoing experiment, second wave: re-evaluate NAC against
> the current release **v1.6.0 (spec v1.6, runtime v1.6.0)**. The
> first wave (v1.4.0 / v1.4.1) is preserved verbatim in
> [`AI_REVIEWS_OF_NAC_SPEC_v1.4.md`](AI_REVIEWS_OF_NAC_SPEC_v1.4.md);
> its findings drove the v1.4.1 -> v1.4.2 -> v1.5 -> v1.6
> evolution.
>
> Same prompt structure as v1.4 (T1-T6), updated walkthrough
> scenarios that match the actual public demo, and a new T7 that
> asks reviewers to rate each post-v1.4 addition specifically.
>
> Reviews on this page are pasted verbatim. The author may
> annotate accuracy beneath each review (in a clearly-marked
> sub-section) but never edits the review itself.

## How to add a review

1. Open the AI's interface (links in section 0 below).
2. Paste the prompt in section 1 verbatim. Do not edit it. Do
   not coach the AI. Do not steer follow-up questions toward a
   result.
3. Wait for the output. If the AI cannot fetch the linked URLs,
   paste the file contents when it asks (do not paraphrase).
4. Copy the AI's full output into a new subsection of section 2.
5. At the top of the subsection, record: model name, free/paid
   tier, date, browsing on/off, prompt language used.
6. Open a PR if you are external. If you are the maintainer,
   commit directly.

The point is comparable answers, not nice ones. Unflattering
reviews are the most useful ones.

---

## 0. Reviewer roster (curated)

### Tier A -- run first (most informative):

| AI | URL | Free tier? | Notes |
|---|---|---|---|
| Claude | https://claude.ai/ | Yes (Sonnet) | The most epistemically careful reader from the v1.4 round. |
| ChatGPT | https://chatgpt.com/ | Yes (GPT-5-mini / 4o-mini) | First-time reviewer. Audience proxy for the largest user base. |
| DeepSeek | https://chat.deepseek.com/ | Yes, browsing | Caught the v1.4.0 phantom-success bug. |
| Mistral Le Chat | https://chat.mistral.ai/ | Yes | First-time reviewer. European LLM, fresh perspective. |

### Tier B -- run if time:

| AI | URL | Free tier? | Notes |
|---|---|---|---|
| Microsoft Copilot | https://copilot.microsoft.com/ | Yes, browsing | Surfaced 9 lone-voice findings in v1.4 round. |
| Gemini | https://gemini.google.com/ | Yes 2.x | Rejected v1 prompt by safety filter; sanitized prompt below should pass. |
| Grok | https://grok.com/ | Yes Fast (Reasoning paywalled in some regions) | Caught event-scoping issue. |
| Perplexity | https://www.perplexity.ai/ | Yes | Search-grounded; may catch documentation gaps. |

### Tier C -- bonus (geographical / model-family coverage):

| AI | URL | Free tier? | Notes |
|---|---|---|---|
| Kimi (Moonshot) | https://kimi.com/ | Yes | Chinese; tests zh-locale of the demo. |
| Qwen Chat | https://chat.qwen.ai/ | Yes | Alibaba; multilingual strength. |
| DuckDuckGo AI Chat | https://duckduckgo.com/?q=DuckDuckGo+AI+Chat | Yes, anonymous | No account; useful as a "cold-stranger" baseline. |
| Phind | https://www.phind.com/ | Yes, dev-focused | Code-specialised; may catch technical bugs. |
| Pi (Inflection) | https://pi.ai/ | Yes | Conversational; tests pedagogical clarity. |
| HuggingChat | https://huggingface.co/chat/ | Yes | Multi-model; pick Llama / Qwen / Mistral. |

---

## 1. Prompt (verbatim -- do not modify)

The block below is what each AI receives. It is identical for
every reviewer. Note: this is the **v1.6 prompt**; the v1.4
prompt lives in the `_v1.4.md` snapshot.

```
Please give me a thorough, balanced technical review of a public
open-source specification called NAC -- Native Accessibility
Contract. License MIT. Repo: github.com/pkuschnirof/nac-spec.

This evaluation targets the current release v1.6.0 (spec v1.6,
runtime v1.6.0). For an earlier round of reviews against v1.4.0
/ v1.4.1, see docs/AI_REVIEWS_OF_NAC_SPEC_v1.4.md in the same
repo (those reviews drove the changes between v1.4 and v1.6).

NAC adds HTML attributes plus a small JavaScript runtime plus a
JSON manifest to web UIs, so that test runners, voice
assistants, and automation frameworks can identify and operate
elements without depending on CSS selectors. I would like to
assess whether the design holds up.

### Materials to read
- Specification (~2200 lines):
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/spec/NAC-v1.0.md
- Reference implementation (~2400 lines, MIT, no dependencies):
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/js/nac.js
- Authoring manual:
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/docs/MANUAL.md
- API reference cheat sheet:
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/docs/API_REFERENCE.md
- Design rationale and how NAC relates to ARIA:
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/docs/PHILOSOPHY.md
- Public demo page:
  https://yujin.app/nac-spec/example.php
- Changelog:
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/CHANGELOG.md
- Earlier reviews (for context):
  https://raw.githubusercontent.com/pkuschnirof/nac-spec/main/docs/AI_REVIEWS_OF_NAC_SPEC_v1.4.md

If you cannot fetch any URL, please ask me to paste the file or
section you need. Please do not invent content you have not
actually read.

### What changed since the v1.4 round (v1.4.1 -> v1.4.2 -> v1.5 -> v1.6)
- Sec 7.1 Awaitable-write contract (mandatory, normative). The
  previous reference impl had a 200ms phantom-success in
  NAC.click() that two reviewers caught.
- Sec 7.2 / 7.3 NAC vs ARIA authority rules and mapping table.
- Sec 7.4 Event scoping (composed:true, plugin_instance_id,
  optional per-plugin buses).
- Sec P5.0 Return shapes (TypeScript interfaces for
  NacElement, NacSnapshot, NacKpiReadout, NacFeedback,
  NacEvent, NacResult, NacStateSnapshot).
- Sec P5.1 Active-plugin resolution algorithm.
- Sec P7.1 Cross-plugin uniqueness + new NAC.validate_global()
  driver function.
- Sec P7.2 Recommended nac_id grammar.
- Sec 6.1 NAC-3 event-family scoping rule (events required
  only for widget families the plugin actually uses).
- Sec 9.1 / 9.2 NAC + LLM agentic loop pattern.
- Sec 9.3 Plugin reset primitive (NEW NAC.reset() driver +
  set_reset_provider() + nac:plugin:reset event).
- Sec 14.3.5 system_map_layers() synchronous declaration.
- Reference runtime: focus follow + visual pulse on every
  write entry point.
- Reference demo: full 10-locale i18n sweep (es en pt fr ja zh
  hi ar de it). Manifest label_i18n maps with all 10 locales
  on every action / field / tab. Live language selector.
  Replaced piano-with-audio (unreliable on mobile emulators)
  with a sumi-e gallery (3 ink-drawing icons that toggle
  expanded / minimised). Remote autocomplete demonstrates 3
  explicit views (minimised / maximised / filtered). Autopilot
  calls NAC.reset('example_demo') as its first step.
- Demo's chat is now agentic: backend with a configurable
  Claude -> DeepSeek -> Groq -> canned fallback chain.

### Tasks

T1. SUMMARY (under 120 words): in your own words, what does NAC
    propose, who is the intended audience, and what does it
    ship.

T2. ARCHITECTURAL REVIEW (200-400 words): looking at the seven
    pillars P1 to P7, the role and verb vocabulary across
    versions 1.0 through 1.6, the manifest contract, the event
    model, AND the new sections introduced since v1.4 (listed
    above), describe:
    - the strongest design decision in the v1.6 surface,
    - the weakest design decision,
    - at least one specific section you think would have
      trouble being adopted by a real production codebase.
    Cite section numbers when possible.

T3. PROGRAMMING WALKTHROUGH (200-400 words): if a developer
    were writing automated tests against the public demo at
    https://yujin.app/nac-spec/example.php using only the
    documented window.NAC.* API, write the JavaScript call
    sequence they would use to:
    a) read the labels and current values of every visible
       action button on the page,
    b) trigger the action that opens the secret modal,
    c) switch the demo's UI language to Chinese via the
       language selector (data-nac-id="chat.lang"),
    d) detect whether a confirmation dialog is currently
       blocking input,
    e) reset the demo back to its initial state using
       NAC.reset().
    For each step, note any case where the spec is ambiguous
    about which method to call or what value is returned.

T4. RELATIONSHIP TO ARIA (150-300 words): the spec positions
    NAC as a complement to ARIA rather than a replacement
    (section 1.5), now reinforced by the section 7.2 / 7.3
    authority + mapping rules added in v1.4.2. Do you find that
    argument convincing? Are there overlaps in attribute
    semantics that could confuse implementers? Would you adopt
    NAC alongside ARIA in a real project, or pick one of them?

T5. ADOPTION ANALYSIS (150-300 words): for a frontend team
    considering adopting NAC at compliance level 3, what is the
    minimum amount of work, what is the part of the rollout
    most likely to be underestimated, and what would cause a
    team to abandon the effort midway. Be specific. Include
    this sub-question:
    - What is the marginal cost of adopting the v1.6
      NAC.reset() primitive vs the v1.5 surface? What about
      registering a custom reset provider for a non-trivial
      plugin?

T6. SCORES AND CLOSING LINE (one short paragraph): score on a 1
    to 10 scale on four axes -- clarity of the specification,
    usefulness for automated test or assistant tooling, ease of
    adoption for a typical web team, and ambition versus
    feasibility. Conclude with one sentence on whether you
    would recommend NAC for a specific use case (you pick the
    use case).

T7. v1.6 PILLAR RATINGS (200-400 words): rate each of these
    v1.4..v1.6 additions on 1 to 10 with one sentence of
    justification per axis:
    a) The awaitable-write contract (sec 7.1) -- is the
       timeout-vs-event resolution the right design? Will
       plugin authors honour it?
    b) NAC vs ARIA authority rules (sec 7.2 / 7.3) -- does the
       per-consumer-kind authoritative-side rule scale, or
       will it confuse implementers?
    c) Event scoping (sec 7.4) -- does composed:true +
       plugin_instance_id close the multi-mount gap, or are
       there still edge cases (closed shadow roots, web
       components)?
    d) NAC + LLM agentic loop (sec 9.1, 9.2) -- is it a useful
       canonical pattern, or a demo curiosity?
    e) Plugin reset primitive (sec 9.3) -- is the resolution
       order (custom provider -> generic fallback) the right
       shape? What use cases would it fail at?
    f) Cross-plugin uniqueness audit (sec P7.1,
       NAC.validate_global()) -- does this scale to a 50+
       plugin codebase?
    g) Demo 10-locale i18n -- does the experience hold up in
       Chinese / Japanese / Arabic? (Test by appending
       ?lang=zh, ?lang=ja, ?lang=ar to the demo URL.)

### Style requests
- Be specific. Cite section numbers and line ranges when
  possible.
- Include both strengths and limitations. Limitations are
  especially useful for the author. Generic praise is not.
- If you do not know something, please say so rather than
  guessing.
- Reply in English so multiple AI reviews can be compared.
- Stay under 2000 words total (the v1.4 round capped at 1500;
  T7 needs the headroom).

Thank you.
```

---

## 2. Reviews

> One subsection per AI. Pasted verbatim. Do not edit, summarize,
> or correct typos. If a reviewer refused or fell back to bluffing,
> capture that too -- it is data about the AI's capabilities.

### 2.1 Claude (claude.ai free) -- pending

```
Model: ___________________ (likely Sonnet family)
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.2 ChatGPT (free tier) -- pending

```
Model: ___________________ (likely GPT-5-mini or 4o-mini)
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.3 DeepSeek -- pending

```
Model: ___________________ (chat.deepseek.com)
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.4 Mistral Le Chat -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.5 Microsoft Copilot -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.6 Gemini -- pending (retry of v1.4 reject)

```
Model: ___________________ (Gemini 2.x or later)
Date:  ___________________
Browsing: on / off
Prompt language: en
Outcome: accepted / refused (if refused, capture the message)

(paste full output here, or the refusal text)
```

### 2.7 Grok -- pending

```
Model: ___________________ (Fast or Reasoning if available)
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.8 Perplexity -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off (Perplexity is search-grounded by default)
Prompt language: en

(paste full output here)
```

### 2.9 Kimi (Moonshot) -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.10 Qwen Chat -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.11 DuckDuckGo AI Chat -- pending

```
Model: ___________________ (rotating selection)
Date:  ___________________
Browsing: off (DDG AI Chat does not browse by default)
Prompt language: en

(paste full output here)
```

### 2.12 Phind -- pending

```
Model: ___________________
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.13 Pi (Inflection) -- pending

```
Model: ___________________ (Inflection-2.5 or later)
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

### 2.14 HuggingChat -- pending

```
Model: ___________________ (specify which one was selected)
Date:  ___________________
Browsing: on / off
Prompt language: en

(paste full output here)
```

> Add new subsections for any other free-tier AI worth
> reviewing. Please keep numbering sequential and the format
> consistent with the entries above.

---

## 3. Synthesis (running, updated as reviews arrive)

> Currently N=0. Filling as reviews land. Each finding will be
> tagged with the reviewers that raised it so partial
> corroboration is visible. Comparison with the v1.4 round
> baselines will be added once we have at least 4 v1.6 reviews
> (Tier A complete).

### 3.1 Patterns across reviewers

(populated when first reviews arrive)

### 3.2 Spec changes prompted by this round

(populated when first reviews arrive)

### 3.3 Documentation changes prompted by this round

(populated when first reviews arrive)

### 3.4 Implementation changes prompted by this round

(populated when first reviews arrive)

### 3.5 Score deltas v1.4 -> v1.6 (cross-AI comparison)

| Axis              | v1.4 round avg | v1.6 round avg | Delta |
|-------------------|----------------|----------------|-------|
| Clarity           | 7.25 (n=4)     | (pending)      |       |
| Usefulness        | 8.75 (n=4)     | (pending)      |       |
| Ease of adoption  | 5.50 (n=4)     | (pending)      |       |
| Ambition vs feasibility | 7.75 (n=4) | (pending)    |       |

(v1.4 baselines: Claude 6/7/5/6, DeepSeek 7/9/5/8, Grok 8/9/6/8,
Copilot 8/10/6/9 against v1.4.1.)

---

## 4. Methodology notes

- The prompt deliberately asks for negative findings and forbids
  sycophancy. We expect models trained on RLHF to drift positive;
  the explicit instruction is the cheapest mitigation.
- The prompt asks each AI to operate against the live demo. AIs
  without tool use will simulate; AIs with browsing or
  computer-use will actually run window.NAC.* calls. That
  asymmetry is data -- capture it in the per-review notes.
- The English-only output rule sacrifices a small amount of
  nuance for cross-AI comparability. Reviews in other languages
  may be added in a separate appendix.
- Free tier matters: it is the tier that 99% of new evaluators
  will use. Paid-tier reviews from the same model belong in a
  separate experiment.
- Re-running the experiment at later spec bumps is encouraged.
  Old rounds stay in their own snapshot files
  (`AI_REVIEWS_OF_NAC_SPEC_v<X.Y>.md`) as historical record.

