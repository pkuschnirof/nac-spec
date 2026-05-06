#!/usr/bin/env node
/* nacify CLI entry. ASCII-pure. License: MIT. */
'use strict';

const fs = require('fs');
const path = require('path');

const { scanProject } = require('../src/index.js');
const { coverageReport } = require('../src/coverage.js');

function help() {
  const txt = [
    'nacify -- NAC migrator (v0.1.0)',
    '',
    'Usage:',
    '  nacify scan <root>           Read-only scan + coverage report',
    '  nacify diff <root>           Print proposed unified diff to stdout',
    '  nacify apply <root>          Write annotations in place',
    '  nacify check <root> --min-coverage <n>   CI gate (exit 1 if below)',
    '',
    'Common flags:',
    '  --plugin-prefix <slug>       Override plugin slug inference',
    '  --include <glob>             Restrict scan (repeatable)',
    '  --exclude <glob>             Skip files (repeatable)',
    '  --no-html                    Skip .html / .htm',
    '  --no-jsx                     Skip .jsx / .tsx',
    '  --no-vue                     Skip .vue',
    '  --no-svelte                  Skip .svelte',
    '  --no-php                     Skip .php',
    '',
    'Example:',
    '  cd my-app && npx nacify scan ./src',
    '  cd my-app && npx nacify diff ./src > nacify.patch && git apply nacify.patch',
    '',
    'Spec: https://github.com/pkuschnirof/nac-spec',
  ].join('\n');
  console.log(txt);
}

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args.flags[key] = next;
        i++;
      } else {
        args.flags[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    help();
    return 0;
  }
  const cmd = argv[0];
  const rest = parseArgs(argv.slice(1));
  const root = rest._[0] || '.';
  if (!fs.existsSync(root)) {
    console.error('nacify: root does not exist: ' + root);
    return 2;
  }

  const opts = {
    root: path.resolve(root),
    pluginPrefix: rest.flags['plugin-prefix'] || null,
    skipHtml:  !!rest.flags['no-html'],
    skipJsx:   !!rest.flags['no-jsx'],
    skipVue:   !!rest.flags['no-vue'],
    skipSvelte:!!rest.flags['no-svelte'],
    skipPhp:   !!rest.flags['no-php'],
  };

  const scan = await scanProject(opts);

  if (cmd === 'scan') {
    coverageReport(scan, { mode: 'scan' });
    return 0;
  }
  if (cmd === 'diff') {
    const { renderUnifiedDiff } = require('../src/patchers/diff.js');
    process.stdout.write(renderUnifiedDiff(scan));
    return 0;
  }
  if (cmd === 'apply') {
    const { applyChanges } = require('../src/patchers/apply.js');
    const result = applyChanges(scan, { commit: !!rest.flags.commit });
    coverageReport(scan, { mode: 'apply', result: result });
    return 0;
  }
  if (cmd === 'check') {
    coverageReport(scan, { mode: 'check' });
    const min = parseInt(rest.flags['min-coverage'] || '95', 10);
    const cov = scan.summary.coveragePct;
    if (cov < min) {
      console.error('nacify: coverage ' + cov + '% below required ' + min + '%');
      return 1;
    }
    return 0;
  }
  console.error('nacify: unknown command "' + cmd + '". Try --help.');
  return 2;
}

main().then(code => process.exit(code || 0)).catch(err => {
  console.error('nacify: ' + (err && err.stack || err));
  process.exit(2);
});
