#!/usr/bin/env python3
"""
NAC test runner -- catalog-driven smoke + coverage suite.

For every plugin / view / field / action / transition that the
target page declares via window.NAC, this runner generates and
executes the appropriate assertion. No test specs needed.

Reads from the page through window.NAC only -- never touches
the DOM directly. The whole point is to stay agnostic of the
particular markup an application chose to render.

License: MIT. ASCII-pure.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("ERROR: playwright not installed. Run: pip install -r requirements.txt && playwright install chromium", file=sys.stderr)
    sys.exit(2)


# ---------- result model ----------------------------------------

@dataclass
class TestResult:
    plugin: str
    kind: str            # action | field | tab | accordion | chrome | transition | validate
    target_id: str
    ok: bool
    detail: str = ""
    elapsed_ms: int = 0
    events_seen: List[str] = field(default_factory=list)


@dataclass
class RunReport:
    target: str
    started_at: str
    ended_at: str = ""
    plugins_discovered: List[str] = field(default_factory=list)
    transitions_count: int = 0
    results: List[TestResult] = field(default_factory=list)
    fatal_error: Optional[str] = None

    @property
    def total(self) -> int: return len(self.results)
    @property
    def passed(self) -> int: return sum(1 for r in self.results if r.ok)
    @property
    def failed(self) -> int: return sum(1 for r in self.results if not r.ok)


# ---------- sample value generator ------------------------------

SAMPLE_VALUES = {
    "text":      "NAC test",
    "textarea":  "NAC test message body.",
    "email":     "nac@test.local",
    "tel":       "+5491155555555",
    "url":       "https://example.com/",
    "number":    "42",
    "password":  "Test1234!",
    "date":      "2026-12-31",
    "time":      "12:34",
}


# ---------- driver helpers (run inside the page) ----------------

INSTRUMENT_JS = r"""
(() => {
  if (window.__nacRunnerInstalled) return;
  window.__nacRunnerInstalled = true;
  window.__nacEvents = [];
  const names = [
    'nac:installed',
    'nac:plugin:opening', 'nac:plugin:opened', 'nac:plugin:closing', 'nac:plugin:closed',
    'nac:plugin:minimized', 'nac:plugin:maximized', 'nac:plugin:restored',
    'nac:plugin:fullscreen_changed',
    'nac:action:dispatching', 'nac:action:succeeded', 'nac:action:failed',
    'nac:tab:switching', 'nac:tab:changed',
    'nac:section:expanded', 'nac:section:collapsed',
    'nac:field:changed', 'nac:state:changed',
    'nac:options:loading', 'nac:options:loaded', 'nac:options:invalidated', 'nac:options:error',
    'nac:slider:value_changed',
    'nac:drag:started', 'nac:drag:dropped', 'nac:drag:cancelled',
    'nac:file:upload_progress', 'nac:file:upload_completed',
  ];
  names.forEach(n => {
    document.addEventListener(n, ev => {
      window.__nacEvents.push({ name: n, t: Date.now(), detail: ev.detail || {} });
    });
  });
})();
"""


WAIT_FOR_EVENT_JS = r"""
async ({ name, sinceIdx, timeoutMs }) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ev = (window.__nacEvents || []).slice(sinceIdx).find(e => e.name === name);
    if (ev) return ev;
    await new Promise(r => setTimeout(r, 30));
  }
  return null;
}
"""


# ---------- runner ----------------------------------------------

class NacRunner:
    def __init__(self, target: str, plugins_filter: List[str], timeout_ms: int,
                 cookie: Optional[Dict[str, str]] = None,
                 header: Optional[Dict[str, str]] = None,
                 use_system_map: bool = True,
                 shape_only: bool = False):
        self.target = target
        self.plugins_filter = set(plugins_filter or [])
        self.timeout_ms = timeout_ms
        self.cookie = cookie
        self.header = header
        self.use_system_map = use_system_map
        self.shape_only = shape_only
        self.report = RunReport(
            target=target,
            started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

    async def run(self) -> RunReport:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch()
            ctx_args: Dict[str, Any] = {}
            if self.header:
                ctx_args["extra_http_headers"] = self.header
            ctx = await browser.new_context(**ctx_args)
            if self.cookie:
                # parse "name=value; domain=..." -- basic single cookie set on target host
                from urllib.parse import urlparse
                host = urlparse(self.target).hostname or ""
                cookies = []
                for nv in self.cookie:
                    if "=" not in nv: continue
                    n, v = nv.split("=", 1)
                    cookies.append({"name": n.strip(), "value": v.strip(),
                                    "domain": host, "path": "/"})
                if cookies:
                    await ctx.add_cookies(cookies)
            page = await ctx.new_page()
            try:
                await self._do_run(page)
            except Exception as e:
                self.report.fatal_error = f"{type(e).__name__}: {e}"
            finally:
                await browser.close()
        self.report.ended_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return self.report

    async def _do_run(self, page) -> None:
        await page.goto(self.target, wait_until="networkidle", timeout=15000)
        await page.evaluate(INSTRUMENT_JS)

        # Make sure window.NAC is there.
        ready = await page.evaluate("typeof window.NAC === 'object' && window.NAC.__nac_v1_installed === true")
        if not ready:
            self.report.fatal_error = "window.NAC not installed on the target page"
            return

        # Discover plugins.
        plugins = []
        if self.use_system_map:
            try:
                m = await page.evaluate("async () => { try { return await NAC.system_map(); } catch (e) { return null; } }")
                if m and isinstance(m, dict):
                    plugins = [v["id"] for v in (m.get("views") or []) if v.get("id")]
                    self.report.transitions_count = len(m.get("transitions") or [])
            except Exception:
                pass
        if not plugins:
            plugins = await page.evaluate("() => NAC.list ? NAC.list() : []") or []

        if self.plugins_filter:
            plugins = [p for p in plugins if p in self.plugins_filter]

        self.report.plugins_discovered = plugins
        if self.shape_only:
            for p in plugins:
                ok = await page.evaluate("(slug) => { try { return NAC.validate(slug).ok; } catch(e) { return false; } }", p)
                self.report.results.append(TestResult(
                    plugin=p, kind="validate", target_id=p, ok=bool(ok),
                    detail="shape-only validate"))
            return

        for p in plugins:
            await self._test_plugin(page, p)

    async def _events_index(self, page) -> int:
        return await page.evaluate("() => (window.__nacEvents || []).length")

    async def _wait_for_event(self, page, name: str, since_idx: int, timeout_ms: int):
        return await page.evaluate(WAIT_FOR_EVENT_JS, {
            "name": name, "sinceIdx": since_idx, "timeoutMs": timeout_ms,
        })

    async def _test_plugin(self, page, slug: str) -> None:
        manifest = await page.evaluate("(slug) => NAC.manifest ? NAC.manifest(slug) : null", slug)
        if not manifest:
            self.report.results.append(TestResult(
                plugin=slug, kind="validate", target_id=slug, ok=False,
                detail="no manifest"))
            return

        # validate()
        idx0 = await self._events_index(page)
        try:
            v = await page.evaluate("(slug) => NAC.validate(slug)", slug)
            ok = bool(v and v.get("ok"))
            self.report.results.append(TestResult(
                plugin=slug, kind="validate", target_id=slug, ok=ok,
                detail=("ok" if ok else f"missing={v.get('missing') if v else 'unknown'}")))
        except Exception as e:
            self.report.results.append(TestResult(
                plugin=slug, kind="validate", target_id=slug, ok=False,
                detail=str(e)))

        # actions
        for a in (manifest.get("actions") or []):
            await self._test_action(page, slug, a)

        # fields
        for f in (manifest.get("fields") or []):
            await self._test_field(page, slug, f)

        # tabs
        for t in (manifest.get("tabs") or []):
            await self._test_tab(page, slug, t)

        # accordion sections
        for s in (manifest.get("accordion_sections") or []):
            await self._test_accordion(page, slug, s)

        # chrome verbs (deduce from actions)
        chrome_verbs = {"minimize", "maximize", "restore"}
        actions_with_chrome = [a for a in (manifest.get("actions") or [])
                               if (a.get("verb") in chrome_verbs)]
        # Already covered by _test_action above; specific chrome events tested there.

        # transitions
        for t in (manifest.get("transitions") or []):
            await self._test_transition(page, slug, t)

    async def _test_action(self, page, slug: str, action: Dict[str, Any]) -> None:
        aid = action.get("id")
        if not aid: return
        verb = (action.get("verb") or "click").lower()
        idx = await self._events_index(page)
        t0 = time.time()

        try:
            if verb == "minimize":
                await page.evaluate("(p) => NAC.minimize(p)", slug)
                want = "nac:plugin:minimized"
            elif verb == "maximize":
                await page.evaluate("(p) => NAC.maximize(p)", slug)
                want = "nac:plugin:maximized"
            elif verb == "restore":
                await page.evaluate("(p) => NAC.restore(p)", slug)
                want = "nac:plugin:restored"
            else:
                await page.evaluate("(id) => NAC.click(id)", aid)
                want = "nac:action:succeeded"
            ev = await self._wait_for_event(page, want, idx, self.timeout_ms)
            elapsed = int((time.time() - t0) * 1000)
            ok = ev is not None
            self.report.results.append(TestResult(
                plugin=slug, kind=("chrome" if verb in {"minimize","maximize","restore"} else "action"),
                target_id=aid, ok=ok,
                detail=("got " + want) if ok else ("waited for " + want),
                elapsed_ms=elapsed,
                events_seen=[want] if ok else []))
        except Exception as e:
            self.report.results.append(TestResult(
                plugin=slug, kind="action", target_id=aid, ok=False,
                detail=f"{type(e).__name__}: {e}"))

    async def _test_field(self, page, slug: str, fld: Dict[str, Any]) -> None:
        fid = fld.get("id")
        ftype = (fld.get("field_type") or "text").lower()
        if not fid: return

        if ftype in ("select", "combobox", "multi-select"):
            src = (fld.get("options_source") or "static").lower()
            try:
                if src == "remote":
                    opts = await page.evaluate(
                        "async (id) => { try { return await NAC.search_options(id, 'a', 5); } catch(e) { return []; } }", fid)
                else:
                    opts = await page.evaluate(
                        "async (id) => { try { return await NAC.options(id); } catch(e) { return []; } }", fid)
                if not opts:
                    self.report.results.append(TestResult(
                        plugin=slug, kind="field", target_id=fid, ok=False,
                        detail="no options resolved"))
                    return
                pick = opts[0].get("value") or opts[0].get("label")
                idx = await self._events_index(page)
                await page.evaluate("(args) => NAC.fill(args.id, args.v)", {"id": fid, "v": pick})
                ev = await self._wait_for_event(page, "nac:field:changed", idx, self.timeout_ms)
                self.report.results.append(TestResult(
                    plugin=slug, kind="field", target_id=fid, ok=ev is not None,
                    detail=f"picked '{pick}' from {src} source ({len(opts)} opts)"))
            except Exception as e:
                self.report.results.append(TestResult(
                    plugin=slug, kind="field", target_id=fid, ok=False,
                    detail=f"{type(e).__name__}: {e}"))
            return

        if ftype in ("slider", "range"):
            try:
                idx = await self._events_index(page)
                await page.evaluate("(args) => (NAC.set_slider ? NAC.set_slider(args.id, args.v) : NAC.fill(args.id, args.v))",
                                    {"id": fid, "v": 50})
                ev = (await self._wait_for_event(page, "nac:slider:value_changed", idx, 1500)
                      or await self._wait_for_event(page, "nac:field:changed", idx, 1500))
                self.report.results.append(TestResult(
                    plugin=slug, kind="field", target_id=fid, ok=ev is not None,
                    detail="slider set 50"))
            except Exception as e:
                self.report.results.append(TestResult(
                    plugin=slug, kind="field", target_id=fid, ok=False,
                    detail=str(e)))
            return

        # text-like
        sample = SAMPLE_VALUES.get(ftype, "NAC test")
        try:
            idx = await self._events_index(page)
            await page.evaluate("(args) => NAC.fill(args.id, args.v)", {"id": fid, "v": sample})
            ev = await self._wait_for_event(page, "nac:field:changed", idx, self.timeout_ms)
            self.report.results.append(TestResult(
                plugin=slug, kind="field", target_id=fid, ok=ev is not None,
                detail=f"fill '{sample}'"))
        except Exception as e:
            self.report.results.append(TestResult(
                plugin=slug, kind="field", target_id=fid, ok=False,
                detail=f"{type(e).__name__}: {e}"))

    async def _test_tab(self, page, slug: str, tab: Dict[str, Any]) -> None:
        tid = tab.get("id") or tab.get("slug")
        if not tid: return
        try:
            idx = await self._events_index(page)
            await page.evaluate("(args) => NAC.tab(args.p, args.t)", {"p": slug, "t": tid})
            ev = await self._wait_for_event(page, "nac:tab:changed", idx, self.timeout_ms)
            self.report.results.append(TestResult(
                plugin=slug, kind="tab", target_id=tid, ok=ev is not None))
        except Exception as e:
            self.report.results.append(TestResult(
                plugin=slug, kind="tab", target_id=tid, ok=False, detail=str(e)))

    async def _test_accordion(self, page, slug: str, sec: Dict[str, Any]) -> None:
        sid = sec.get("id")
        if not sid: return
        try:
            idx = await self._events_index(page)
            await page.evaluate("(id) => NAC.expand && NAC.expand(id)", sid)
            ev = await self._wait_for_event(page, "nac:section:expanded", idx, self.timeout_ms)
            self.report.results.append(TestResult(
                plugin=slug, kind="accordion", target_id=sid + ":expand", ok=ev is not None))

            idx = await self._events_index(page)
            await page.evaluate("(id) => NAC.collapse && NAC.collapse(id)", sid)
            ev = await self._wait_for_event(page, "nac:section:collapsed", idx, self.timeout_ms)
            self.report.results.append(TestResult(
                plugin=slug, kind="accordion", target_id=sid + ":collapse", ok=ev is not None))
        except Exception as e:
            self.report.results.append(TestResult(
                plugin=slug, kind="accordion", target_id=sid, ok=False, detail=str(e)))

    async def _test_transition(self, page, slug: str, t: Dict[str, Any]) -> None:
        to_view = t.get("to_view")
        via = t.get("via_action")
        if not to_view or not via: return
        target_id = f"{slug} -> {to_view} via {via}"
        try:
            # Try clicking an action whose verb matches the transition.
            existed_before = await page.evaluate(
                "(slug) => !!(NAC.manifest(slug))", to_view)
            self.report.results.append(TestResult(
                plugin=slug, kind="transition", target_id=target_id,
                ok=existed_before,
                detail=("target manifest registered" if existed_before
                        else "target view not registered yet")))
        except Exception as e:
            self.report.results.append(TestResult(
                plugin=slug, kind="transition", target_id=target_id, ok=False,
                detail=str(e)))


# ---------- HTML report -----------------------------------------

HTML_REPORT_TMPL = """<!doctype html>
<html><head><meta charset="utf-8"><title>NAC runner -- {target}</title>
<style>
body{{font:13px/1.4 system-ui,sans-serif;margin:24px;color:#333;background:#fafafa}}
h1{{font-size:18px}}
.summary{{padding:12px 16px;border-radius:8px;margin-bottom:16px;font-weight:500}}
.ok{{background:#e8f5e9;color:#2e7d32}}
.fail{{background:#fff3e0;color:#e65100}}
table{{border-collapse:collapse;width:100%;font-size:12px}}
th,td{{padding:6px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}}
tr.failrow{{background:#fff5f5}}
code{{font:11px/1.4 ui-monospace,monospace;background:#f4f4f4;padding:1px 4px;border-radius:3px}}
.kind{{display:inline-block;padding:1px 6px;border-radius:3px;background:#eee;font-size:10px;text-transform:uppercase}}
</style></head><body>
<h1>NAC runner report</h1>
<p>target: <code>{target}</code><br>started: {started_at} -- ended: {ended_at}</p>
<div class="summary {summary_class}">
  {passed}/{total} passed -- {failed} failed -- {plugin_count} plugin(s) -- {trans_count} transition(s) declared
  {fatal_html}
</div>
<table>
<thead><tr><th>Plugin</th><th>Kind</th><th>Target</th><th>Result</th><th>Detail</th><th>Elapsed</th></tr></thead>
<tbody>
{rows}
</tbody></table>
</body></html>
"""


def render_html(report: RunReport) -> str:
    rows = []
    for r in report.results:
        cls = "" if r.ok else "failrow"
        symbol = "ok" if r.ok else "FAIL"
        rows.append(
            f'<tr class="{cls}"><td><code>{r.plugin}</code></td>'
            f'<td><span class="kind">{r.kind}</span></td>'
            f'<td><code>{r.target_id}</code></td>'
            f'<td>{symbol}</td><td>{r.detail}</td><td>{r.elapsed_ms} ms</td></tr>'
        )
    fatal_html = ""
    if report.fatal_error:
        fatal_html = f'<br><strong>FATAL:</strong> <code>{report.fatal_error}</code>'
    return HTML_REPORT_TMPL.format(
        target=report.target,
        started_at=report.started_at,
        ended_at=report.ended_at,
        summary_class=("ok" if report.failed == 0 and not report.fatal_error else "fail"),
        passed=report.passed,
        total=report.total,
        failed=report.failed,
        plugin_count=len(report.plugins_discovered),
        trans_count=report.transitions_count,
        fatal_html=fatal_html,
        rows="\n".join(rows),
    )


# ---------- CLI --------------------------------------------------

def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser(description="NAC test runner")
    ap.add_argument("--target", required=True)
    ap.add_argument("--plugin", action="append", default=[])
    ap.add_argument("--auth-cookie", action="append", default=[])
    ap.add_argument("--auth-header", action="append", default=[])
    ap.add_argument("--out", default="./out")
    ap.add_argument("--timeout-ms", type=int, default=5000)
    ap.add_argument("--no-system-map", action="store_true")
    ap.add_argument("--exit-non-zero-on-fail", action="store_true")
    ap.add_argument("--shape-only", action="store_true")
    args = ap.parse_args(argv)

    headers = {}
    for h in args.auth_header:
        if ":" in h:
            n, v = h.split(":", 1)
            headers[n.strip()] = v.strip()

    runner = NacRunner(
        target=args.target,
        plugins_filter=args.plugin,
        timeout_ms=args.timeout_ms,
        cookie=args.auth_cookie if args.auth_cookie else None,
        header=headers if headers else None,
        use_system_map=not args.no_system_map,
        shape_only=args.shape_only,
    )
    report = asyncio.run(runner.run())

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "report.json"), "w", encoding="ascii") as f:
        json.dump({
            "target": report.target,
            "started_at": report.started_at,
            "ended_at": report.ended_at,
            "plugins_discovered": report.plugins_discovered,
            "transitions_count": report.transitions_count,
            "fatal_error": report.fatal_error,
            "summary": {
                "total": report.total,
                "passed": report.passed,
                "failed": report.failed,
            },
            "results": [asdict(r) for r in report.results],
        }, f, indent=2)
    with open(os.path.join(args.out, "report.html"), "w", encoding="ascii") as f:
        f.write(render_html(report))

    print(f"\n{report.passed}/{report.total} passed -- {report.failed} failed -- "
          f"{len(report.plugins_discovered)} plugin(s) discovered.")
    if report.fatal_error:
        print(f"FATAL: {report.fatal_error}", file=sys.stderr)
        return 2
    if args.exit_non_zero_on_fail and report.failed > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
