/* Unified-diff renderer. ASCII-pure. */
'use strict';

const path = require('path');

function buildAttrInjection(rawAttrs, proposed) {
  let extras = '';
  for (const k of ['data-nac-id', 'data-nac-role', 'data-nac-field-type', 'data-nac-state', 'data-nac-action']) {
    if (proposed[k] != null) {
      extras += ' ' + k + '="' + String(proposed[k]).replace(/"/g, '&quot;') + '"';
    }
  }
  return extras;
}

function patchedTag(c) {
  // Insert attributes immediately before closing > or />
  const tag = c.raw;
  const extras = buildAttrInjection(c.rawAttrs, c.proposed);
  if (!extras) return tag;
  const closeIdx = tag.lastIndexOf('/>');
  if (closeIdx > 0) {
    return tag.slice(0, closeIdx) + extras + ' />';
  }
  const lt = tag.lastIndexOf('>');
  return tag.slice(0, lt) + extras + '>';
}

function renderUnifiedDiff(scan) {
  let out = '';
  for (const fr of scan.files) {
    const cands = fr.result.candidates.filter(c => !c.alreadyAnnotated && c.canInfer && c.proposed);
    if (!cands.length) continue;
    const rel = relPath(scan.root, fr.file.path);
    out += '--- a/' + rel + '\n';
    out += '+++ b/' + rel + '\n';
    cands.forEach(c => {
      const before = c.raw;
      const after = patchedTag(c);
      out += '@@ line ' + c.line + ' @@\n';
      out += '-' + before + '\n';
      out += '+' + after + '\n';
    });
  }
  return out || '(no changes proposed)\n';
}

function relPath(root, abs) {
  if (!abs) return '?';
  if (abs.indexOf(root) === 0) return abs.slice(root.length).replace(/^[\\/]+/, '');
  return abs;
}

module.exports = { renderUnifiedDiff, patchedTag, buildAttrInjection };
