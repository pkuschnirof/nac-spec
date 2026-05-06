/* In-place patcher. ASCII-pure. */
'use strict';

const fs = require('fs');
const { patchedTag } = require('./diff.js');

function applyChanges(scan, opts) {
  let filesWritten = 0;
  let elementsAdded = 0;
  for (const fr of scan.files) {
    const cands = fr.result.candidates
      .filter(c => !c.alreadyAnnotated && c.canInfer && c.proposed)
      .sort((a, b) => b.offset - a.offset); // splice from end so offsets stay valid
    if (!cands.length) continue;
    let src = fr.source;
    cands.forEach(c => {
      const replaced = patchedTag(c);
      src = src.slice(0, c.offset) + replaced + src.slice(c.offset + c.length);
      elementsAdded++;
    });
    fs.writeFileSync(fr.file.path, src, 'utf8');
    filesWritten++;
  }
  return { filesWritten, elementsAdded };
}

module.exports = { applyChanges };
