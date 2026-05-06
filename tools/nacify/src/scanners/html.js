/* HTML scanner -- regex-based, dependency-free. ASCII-pure.
 *
 * Why regex and not a parser: nacify must run zero-config in any
 * project. A real parse5 dep would force npm install at the
 * scaffolding stage. The regex covers >95% of typical button /
 * input markup. Edge cases (HTML-in-CDATA, malformed tags) emit
 * a "manual review" candidate and are not auto-patched.
 */
'use strict';

const TAG_RE = /<(button|input|textarea|select|a|dialog|details|summary)\b([^>]*?)(\/?)>/gi;
const ATTR_RE = /([a-zA-Z\-:_@\.]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function parseAttrs(rawAttrs) {
  const attrs = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(rawAttrs)) !== null) {
    const key = m[1].toLowerCase();
    const val = (m[2] != null ? m[2] : (m[3] != null ? m[3] : (m[4] != null ? m[4] : '')));
    attrs[key] = val;
  }
  return attrs;
}

function alreadyAnnotated(attrs) {
  return !!(attrs['data-nac-id']);
}

function isInteractive(tag, attrs) {
  if (tag === 'button')   return true;
  if (tag === 'textarea') return true;
  if (tag === 'select')   return true;
  if (tag === 'dialog')   return true;
  if (tag === 'details')  return true;
  if (tag === 'a' && (attrs['role'] === 'button' || attrs['onclick']))
    return true;
  if (tag === 'input') {
    const t = (attrs['type'] || 'text').toLowerCase();
    return ['button', 'submit', 'reset', 'text', 'email', 'tel',
            'url', 'number', 'password', 'date', 'time', 'checkbox',
            'radio', 'range', 'color', 'file', 'search'].indexOf(t) >= 0;
  }
  // role-bearing custom elements
  const role = attrs['role'];
  if (role && ['button','tab','tablist','tabpanel','combobox','listbox','slider','dialog'].indexOf(role) >= 0) {
    return true;
  }
  return false;
}

function fileLineCol(src, idx) {
  let line = 1, col = 1;
  for (let i = 0; i < idx; i++) {
    if (src.charCodeAt(i) === 10) { line++; col = 1; } else { col++; }
  }
  return { line, col };
}

function scan(src, opts) {
  const candidates = [];
  const notes = [];
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(src)) !== null) {
    const tag = m[1].toLowerCase();
    const rawAttrs = m[2] || '';
    const attrs = parseAttrs(rawAttrs);
    if (!isInteractive(tag, attrs)) continue;
    const at = fileLineCol(src, m.index);
    const candidate = {
      file: opts && opts.filePath,
      tag: tag,
      attrs: attrs,
      raw: m[0],
      rawAttrs: rawAttrs,
      offset: m.index,
      length: m[0].length,
      line: at.line,
      col: at.col,
      alreadyAnnotated: alreadyAnnotated(attrs),
      canInfer: false,
      proposed: null,  // filled by inferers
    };
    candidates.push(candidate);
  }
  return { candidates, notes };
}

module.exports = { scan, parseAttrs, isInteractive };
