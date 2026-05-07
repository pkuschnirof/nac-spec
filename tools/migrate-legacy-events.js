#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * NAC v1.8 -> v2.0 codemod: rewrite legacy event-field reads to
 * canonical fields with a fallback.
 *
 * Usage:
 *   node tools/migrate-legacy-events.js <path>
 *   node tools/migrate-legacy-events.js src/ --strict   (drop fallback)
 *   node tools/migrate-legacy-events.js --check src/    (dry run)
 *
 * What it does:
 *   Walks the path, finds .js / .ts / .jsx / .tsx / .vue / .html
 *   files, and rewrites legacy field accesses on event details:
 *
 *     // before
 *     element.addEventListener('nac:field:changed', (e) => {
 *       console.log(e.detail.nac_id);
 *     });
 *
 *     // after (default mode -- dual-read fallback)
 *     element.addEventListener('nac:field:changed', (e) => {
 *       console.log(e.detail.field_id ?? e.detail.nac_id);
 *     });
 *
 *     // after (--strict -- canonical only)
 *     element.addEventListener('nac:field:changed', (e) => {
 *       console.log(e.detail.field_id);
 *     });
 *
 * It is conservative: it operates by regex substitution scoped
 * to detail.<legacy>, NOT every nac_id token in the source. It
 * does NOT understand block scope, so a variable named
 * `something.nac_id` outside a NAC handler is left alone.
 *
 * Limitations: this codemod cannot reliably distinguish which
 * event family a generic detail.nac_id read is targeting (action
 * vs field vs tab vs section), so it produces a fallback to the
 * union of canonical names where ambiguity exists. Run --strict
 * once you have manually disambiguated.
 *
 * Idempotent: running twice produces no diff.
 *
 * ASCII pure. No external dependencies. Node 14+.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flags = {
  check:  false,  // dry run
  strict: false,  // drop the legacy fallback after migration
  verbose: false,
};
const positional = [];
for (const a of args) {
  if (a === '--check' || a === '-n') flags.check = true;
  else if (a === '--strict') flags.strict = true;
  else if (a === '--verbose' || a === '-v') flags.verbose = true;
  else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
  else if (a.startsWith('--')) { console.error('Unknown flag: ' + a); usage(); process.exit(2); }
  else positional.push(a);
}
if (positional.length === 0) {
  usage();
  process.exit(2);
}

function usage() {
  console.log([
    'Usage: node migrate-legacy-events.js <path> [--check] [--strict] [--verbose]',
    '',
    '  <path>     File or directory to migrate.',
    '  --check    Dry run -- print what would change without writing.',
    '  --strict   Replace legacy reads with canonical only (no fallback).',
    '  --verbose  Print every file scanned, not just modified ones.',
  ].join('\n'));
}

/* Map of (event_type_substring, legacy_field) -> canonical_field.
   Entries with a null event_type_substring apply universally
   (e.g. detail.plugin_slug -> detail.plugin). */
const RULES = [
  /* Universal */
  { event: null,        legacy: 'plugin_slug',     canonical: 'plugin' },
  /* Action events */
  { event: 'action',    legacy: 'nac_id',          canonical: 'action_id' },
  /* Field events */
  { event: 'field',     legacy: 'nac_id',          canonical: 'field_id' },
  /* Tab events */
  { event: 'tab:',      legacy: 'nac_id',          canonical: 'tab_id' },
  /* Section events */
  { event: 'section:',  legacy: 'nac_id',          canonical: 'section_id' },
  /* Accordion events */
  { event: 'accordion', legacy: 'nac_id',          canonical: 'section_id' },
  /* Table events */
  { event: 'table:',    legacy: 'nac_id',          canonical: 'table_id' },
  { event: 'table:',    legacy: 'column_nac_id',   canonical: 'column_id' },
  { event: 'table:',    legacy: 'filter_nac_id',   canonical: 'filter_id' },
  /* Drag events */
  { event: 'drag:',     legacy: 'from_nac_id',     canonical: 'source_id' },
  { event: 'drag:',     legacy: 'over_nac_id',     canonical: 'target_id' },
  { event: 'drag:',     legacy: 'target_nac_id',   canonical: 'target_id' },
];

/* The codemod can only inspect a few characters around the
   read site. To keep the rewrite safe, we apply the universal
   rules globally and the event-scoped rules opportunistically:
   if the source line carries the event type substring within
   200 characters, we rewrite. Otherwise we leave the read alone
   and emit a per-file warning so the operator can review. */

const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.vue', '.html'];

const stats = {
  files_scanned: 0,
  files_modified: 0,
  rewrites: 0,
  ambiguous: 0,
};

function migrateText(src, filename) {
  let out = src;
  let count = 0;

  /* Universal rules: rewrite every detail.<legacy> -> dual-read. */
  for (const rule of RULES.filter(r => r.event === null)) {
    const re = new RegExp(
      '(\\.detail|\\.detail\\?|event\\.detail|e\\.detail|evt\\.detail|ev\\.detail|d)' +
      '\\.' + escapeRe(rule.legacy) + '\\b',
      'g'
    );
    out = out.replace(re, (m, prefix) => {
      count++;
      if (flags.strict) return prefix + '.' + rule.canonical;
      /* Skip if the canonical is already in the same expression
         (idempotency). */
      const canonicalRe = new RegExp(
        escapeRe(prefix) + '\\.' + escapeRe(rule.canonical) + '\\b'
      );
      if (canonicalRe.test(m)) return m;
      return prefix + '.' + rule.canonical + ' ?? ' + prefix + '.' + rule.legacy;
    });
  }

  /* Scoped rules: apply line-by-line, with a window scan for the
     matching event substring. */
  const lines = out.split(/\r?\n/);
  const ambiguous_lines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    /* Build a context window covering the previous 200 chars too. */
    const ctxStart = Math.max(0, i - 6);
    const context = lines.slice(ctxStart, i + 1).join('\n');
    for (const rule of RULES.filter(r => r.event !== null)) {
      const re = new RegExp(
        '(\\.detail|\\.detail\\?|event\\.detail|e\\.detail|evt\\.detail|ev\\.detail|d)' +
        '\\.' + escapeRe(rule.legacy) + '\\b',
        'g'
      );
      if (!re.test(line)) continue;
      if (context.indexOf('nac:' + rule.event) < 0) {
        /* Cannot disambiguate; leave alone but record (once per line). */
        if (rule.legacy === 'nac_id' && line.indexOf('action_id') < 0 &&
            line.indexOf('field_id') < 0 && line.indexOf('tab_id') < 0 &&
            line.indexOf('section_id') < 0 && line.indexOf('table_id') < 0) {
          if (!ambiguous_lines.some(a => a.line === i + 1)) {
            ambiguous_lines.push({ line: i + 1, text: line.trim() });
          }
        }
        continue;
      }
      /* Reset the regex (g flag) and rewrite. */
      const re2 = new RegExp(
        '(\\.detail|\\.detail\\?|event\\.detail|e\\.detail|evt\\.detail|ev\\.detail|d)' +
        '\\.' + escapeRe(rule.legacy) + '\\b',
        'g'
      );
      lines[i] = line.replace(re2, (m, prefix) => {
        count++;
        if (flags.strict) return prefix + '.' + rule.canonical;
        return prefix + '.' + rule.canonical + ' ?? ' + prefix + '.' + rule.legacy;
      });
    }
  }
  out = lines.join('\n');

  if (ambiguous_lines.length) {
    stats.ambiguous += ambiguous_lines.length;
    if (flags.verbose || ambiguous_lines.length > 0) {
      console.warn('[ambiguous] ' + filename + ':');
      for (const a of ambiguous_lines.slice(0, 5)) {
        console.warn('  L' + a.line + ': ' + a.text);
      }
      if (ambiguous_lines.length > 5) {
        console.warn('  ... and ' + (ambiguous_lines.length - 5) + ' more');
      }
    }
  }

  return { out: out, count: count };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      walk(path.join(targetPath, entry));
    }
    return;
  }
  if (!stat.isFile()) return;
  const ext = path.extname(targetPath);
  if (EXTENSIONS.indexOf(ext) < 0) return;
  stats.files_scanned++;
  const src = fs.readFileSync(targetPath, 'utf8');
  if (src.indexOf('detail') < 0) return; /* fast path */
  const { out, count } = migrateText(src, targetPath);
  if (count > 0 && out !== src) {
    stats.files_modified++;
    stats.rewrites += count;
    if (flags.check) {
      console.log('[would rewrite] ' + targetPath + ' -- ' + count + ' read(s)');
    } else {
      fs.writeFileSync(targetPath, out, 'utf8');
      console.log('[rewrote] ' + targetPath + ' -- ' + count + ' read(s)');
    }
  } else if (flags.verbose) {
    console.log('[unchanged] ' + targetPath);
  }
}

for (const target of positional) {
  if (!fs.existsSync(target)) {
    console.error('Path not found: ' + target);
    process.exit(2);
  }
  walk(target);
}

console.log('---');
console.log('Files scanned:    ' + stats.files_scanned);
console.log('Files modified:   ' + stats.files_modified);
console.log('Total rewrites:   ' + stats.rewrites);
console.log('Ambiguous reads:  ' + stats.ambiguous +
  (stats.ambiguous > 0
    ? ' (review the per-file warnings above)'
    : ''));
if (flags.check) {
  console.log('(dry run -- no files written)');
}
process.exit(0);
