/* nacify -- main scanner orchestrator. ASCII-pure. */
'use strict';

const fs = require('fs');
const path = require('path');

const htmlScanner = require('./scanners/html.js');
const inferers = require('./inferers/index.js');

const DEFAULT_EXCLUDES = [
  /node_modules/, /\.git\//, /\bdist\b/, /\bbuild\b/, /\bvendor\b/,
  /\bcoverage\b/, /\.next\b/, /\.nuxt\b/, /\.svelte-kit\b/,
];

function* walk(dir, excludes) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (excludes.some(re => re.test(full))) continue;
    if (entry.isDirectory()) {
      yield* walk(full, excludes);
    } else {
      yield full;
    }
  }
}

function fileType(p) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.jsx' || ext === '.tsx') return 'jsx';
  if (ext === '.vue') return 'vue';
  if (ext === '.svelte') return 'svelte';
  if (ext === '.php') return 'php';
  return null;
}

async function scanProject(opts) {
  const root = opts.root;
  const excludes = DEFAULT_EXCLUDES.slice();
  const files = [];
  for (const f of walk(root, excludes)) {
    const t = fileType(f);
    if (!t) continue;
    if (t === 'html'   && opts.skipHtml)   continue;
    if (t === 'jsx'    && opts.skipJsx)    continue;
    if (t === 'vue'    && opts.skipVue)    continue;
    if (t === 'svelte' && opts.skipSvelte) continue;
    if (t === 'php'    && opts.skipPhp)    continue;
    files.push({ path: f, type: t });
  }

  const fileResults = [];
  for (const f of files) {
    const src = fs.readFileSync(f.path, 'utf8');
    let result;
    if (f.type === 'html' || f.type === 'php') {
      // PHP support is minimal -- treat .php as HTML-with-php-tags (stub).
      result = htmlScanner.scan(src, { filePath: f.path, pluginPrefix: opts.pluginPrefix });
    } else {
      // JSX / Vue / Svelte: stub. Returns no candidates -- documented gap.
      result = { candidates: [], notes: ['scanner_stub_' + f.type] };
    }
    inferers.fillInferred(result.candidates, { filePath: f.path, pluginPrefix: opts.pluginPrefix });
    fileResults.push({ file: f, source: src, result: result });
  }

  // Aggregate.
  let totalDetected = 0;
  let alreadyAnnotated = 0;
  let proposed = 0;
  let manualReview = 0;
  fileResults.forEach(fr => {
    fr.result.candidates.forEach(c => {
      totalDetected++;
      if (c.alreadyAnnotated) alreadyAnnotated++;
      else if (c.canInfer)    proposed++;
      else                    manualReview++;
    });
  });

  const coveragePct = totalDetected === 0
    ? 100
    : Math.round(((alreadyAnnotated + proposed) / totalDetected) * 1000) / 10;

  return {
    root,
    files: fileResults,
    summary: {
      totalDetected,
      alreadyAnnotated,
      proposed,
      manualReview,
      coveragePct,
    },
  };
}

module.exports = { scanProject };
