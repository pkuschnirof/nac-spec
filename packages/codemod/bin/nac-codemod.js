#!/usr/bin/env node
/* ===============================================================
   nac-codemod -- skeleton
   ---------------------------------------------------------------
   Scans a codebase for interactive elements without NAC annotations
   and emits a diff (or applies in-place) with inferred:
     - data-nac-action       (from on* handlers + tag heuristics)
     - data-nac-scope        (component-level, derived from filename or function name)
     - data-i18n-key         (from existing i18n catalog refs if detected)

   Auto-coverage target: ~60% of typical brownfield React/Vue codebases.

   Status: skeleton. Phase 4 of NAC v2.0 roadmap fills this out.
   =============================================================== */
'use strict';

const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === '--help') {
  console.log('Usage: nac-codemod <command> [options]\n');
  console.log('Commands:');
  console.log('  scan <dir>       -- analyse codebase, report missing NAC annotations');
  console.log('  apply <dir>      -- apply auto-inferred annotations as a diff');
  console.log('  translate ...    -- AI-assisted catalog filling (uses Anthropic/OpenAI)');
  console.log('  validate <dir>   -- run conformance checks');
  process.exit(0);
}

console.log('[nac-codemod skeleton] command:', cmd);
console.log('[nac-codemod skeleton] full implementation coming in NAC v2.0 phase 4.');
console.log('[nac-codemod skeleton] tracking: docs/NAC_v20_ROADMAP_ACTIONABLE.md section 6.');
process.exit(0);
