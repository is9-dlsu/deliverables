// EVERY FUNCTION NAME IN THE PROJECT MUST BE DECLARED ONCE.
//
// Apps Script puts every file in one global scope, so two `function IS9WD_x_()` declarations
// in the project are not an error: the last one loaded silently wins and every caller of the
// first one now calls the second. Nothing warns, nothing throws at load, and the failure
// shows up wherever the wrong body happens to break.
//
// Written on 2026-09-28 after exactly that. A new inner border painter was named
// IS9WD_statsRules_, which was already the name of the conditional format list builder.
// The card painter's call resolved to the wrong body, the whole views build threw on the
// third line of it, and the report came back with 40 named ranges missing and two tabs
// untrimmed. The real cause was one word, and this test finds it in under a second.
//
//   node test/dupfn.test.js
//
// No npm dependencies, matching every other test here.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// Only a top level declaration, which is what shares the global scope. An inner function
// expression assigned to a var is scoped to its own body and cannot collide.
const DECL = /^function\s+([A-Za-z_$][\w$]*)\s*\(/;

const seen = {};
let files = 0;
let declared = 0;

for (const name of fs.readdirSync(SRC)) {
  if (path.extname(name) !== '.js') continue;
  files++;
  const lines = fs.readFileSync(path.join(SRC, name), 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = DECL.exec(lines[i]);
    if (!m) continue;
    declared++;
    if (!seen[m[1]]) seen[m[1]] = [];
    seen[m[1]].push(name + ':' + (i + 1));
  }
}

const dupes = Object.keys(seen).filter((k) => seen[k].length > 1).sort();
for (const name of dupes) {
  console.log('FAIL  declared ' + seen[name].length + ' times  ' + name);
  for (const where of seen[name]) console.log('        ' + where);
  console.log('        Apps Script keeps one global scope, so the last one loaded wins ' +
    'and every caller of the other one now calls this body.');
}

console.log('');
console.log('duplicate function scan: ' + files + ' files, ' + declared +
  ' top level declarations, ' + dupes.length + ' names declared more than once');
if (dupes.length) process.exit(1);
