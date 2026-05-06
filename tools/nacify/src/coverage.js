/* nacify coverage reporter. ASCII-pure. */
'use strict';

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }

function coverageReport(scan, opts) {
  const s = scan.summary;
  console.log('');
  console.log('nacify ' + (opts.mode === 'apply' ? 'apply' : opts.mode || 'scan')
    + ' -- ' + scan.root);
  console.log('');
  console.log('  files scanned:                ' + scan.files.length);
  console.log('  detected interactive elements:' + pad('', 1) + s.totalDetected);
  console.log('  already NAC-annotated:        ' + s.alreadyAnnotated +
              '  (' + (s.totalDetected ? Math.round(s.alreadyAnnotated * 100 / s.totalDetected) : 0) + '%)');
  console.log('  proposed annotations:         ' + s.proposed);
  console.log('  cannot infer (manual review): ' + s.manualReview);
  console.log('');
  console.log('  NAC-3 L3 coverage projected:  ' + s.coveragePct + '%');
  if (s.manualReview > 0) {
    console.log('');
    console.log('  manual-review candidates (no id, name, aria-label, or test attr):');
    let shown = 0;
    for (const fr of scan.files) {
      for (const c of fr.result.candidates) {
        if (!c.canInfer && !c.alreadyAnnotated) {
          if (shown++ >= 10) { console.log('    ... (' + (s.manualReview - shown + 1) + ' more)'); break; }
          console.log('    ' + relPath(scan.root, c.file) + ':' + c.line + ' <' + c.tag + '> ' +
            (c.gap || ''));
        }
      }
      if (shown >= 11) break;
    }
  }
  if (opts.mode === 'apply' && opts.result) {
    console.log('');
    console.log('  applied:');
    console.log('    files written:  ' + opts.result.filesWritten);
    console.log('    elements added: ' + opts.result.elementsAdded);
  }
}

function relPath(root, abs) {
  if (!abs) return '?';
  if (abs.indexOf(root) === 0) return abs.slice(root.length).replace(/^[\\/]+/, '');
  return abs;
}

module.exports = { coverageReport };
