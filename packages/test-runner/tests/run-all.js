#!/usr/bin/env node
/* Test entry: runs every spec under this dir and exits non-zero
   on the first failure. Single-file design for portability:
   no jest, no mocha, no test runner dep. Use node:assert directly.
   Output mirrors the existing nac-v2-extensions.spec.js style for
   visual consistency. */
'use strict';

var assert = require('assert');
var path   = require('path');
var fs     = require('fs');

var passed = 0;
var failed = 0;

global.test = function (name, fn) {
  try {
    var r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(function () {
        console.log('  PASS ' + name); passed++;
      }, function (e) {
        console.log('  FAIL ' + name + '\n        ' + (e && e.stack || e));
        failed++;
      });
    }
    console.log('  PASS ' + name); passed++;
  } catch (e) {
    console.log('  FAIL ' + name + '\n        ' + (e && e.stack || e));
    failed++;
  }
};
global.assert = assert;

console.log('[@nac-spec/test-runner unit tests]\n');

var here = __dirname;
var specs = fs.readdirSync(here).filter(function (f) {
  return f.endsWith('.spec.js');
}).sort();

(async function () {
  for (var i = 0; i < specs.length; i++) {
    var s = specs[i];
    console.log('--- ' + s + ' ---');
    require(path.join(here, s));
  }
  /* Wait one tick so the async PASS messages settle. */
  setTimeout(function () {
    console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exit(1);
  }, 100);
})();
