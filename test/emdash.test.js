// Reference 13.4: every pushed source file, every string literal, scanned for U+2014.
// CLAUDE.md forbids the em dash in anything a person reads, and a workbook string that
// carries one reaches an officer's email, a cell note and a Canva slide before anyone
// notices. U+2013 and U+2212 warn rather than fail: both are legitimate in a date range
// or a negative number, and neither has ever been typed here by accident.
//
//   node test/emdash.test.js
//
// No npm dependencies, matching every other test in this project.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Built from code points on purpose: a file that scans for these characters must not
// contain them, or it fails itself and everyone learns to ignore the scan.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const MINUS = String.fromCharCode(0x2212);

// Everything that ships or that a person reads. `docs/` is included because the build
// reference is the file a later president reads before touching anything.
const SCAN_DIRS = ['src', 'app', 'test', 'tools', 'docs', 'canva'];
const SCAN_FILES = ['SPEC.md', 'CLAUDE.md', 'README.md'];
const SCAN_EXT = ['.js', '.json', '.md', '.html', '.css', '.ts', '.tsx'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', '.claude'];

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.indexOf(entry.name) >= 0) continue;
      walk(full, out);
    } else if (SCAN_EXT.indexOf(path.extname(entry.name)) >= 0) {
      out.push(full);
    }
  }
  return out;
}

function targets() {
  const out = [];
  for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), out);
  for (const file of SCAN_FILES) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) out.push(full);
  }
  return out;
}

const files = process.argv.length > 2 ? process.argv.slice(2) : targets();
const fails = [];
const warns = [];

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    continue;
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const where = path.relative(ROOT, file) + ':' + (i + 1);
    if (line.indexOf(EM_DASH) >= 0) fails.push(where + '  ' + line.trim());
    else if (line.indexOf(EN_DASH) >= 0 || line.indexOf(MINUS) >= 0) {
      warns.push(where + '  ' + line.trim());
    }
  }
}

for (const w of warns) console.log('WARN  en dash or minus sign  ' + w);
for (const f of fails) console.log('FAIL  em dash  ' + f);

console.log('');
console.log('em dash scan: ' + files.length + ' files, ' + fails.length +
  ' failures, ' + warns.length + ' warnings');
if (fails.length) process.exit(1);
