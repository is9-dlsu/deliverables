// THE SCAN CLAUDE.md PROMISES. The repo is public, because a free GitHub organization
// cannot publish Pages from a private one, so SPEC section 3 says no name, no address, no
// token and no URL that matters ever reaches it. That rule was written down and enforced
// by nothing: on 2026-09-28 `.git/hooks/` held only Git's own samples, and a person's name
// had been sitting in `tools/preview-week.js` since commit 5dff177.
//
//   node test/leakscan.test.js            scan the whole working tree
//   node test/leakscan.test.js a.js b.js  scan named files, which is what the hook does
//
// WHAT IT CANNOT DO, said plainly rather than left to be discovered: it cannot recognise a
// person's name. "Maria Santos" is indistinguishable from any other two words. The roster
// stays in the Sheet and out of the repo because that is the rule, not because a regular
// expression is watching. What it does catch is every leak with a shape:
//
//   · an email address, which is how a roster actually escapes
//   · an Apps Script deployment id or a /macros/s/ URL, which is the live endpoint
//   · a Google Drive file id, which is the workbook itself
//   · a token, 26 characters of the project's own alphabet
//
// An accepted match goes in `test/leakscan-allow.txt`, one per line, exact text. The
// allowlist is deliberately dumb: a wildcard allowlist is an allowlist nobody reads.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ALLOW_FILE = path.join(__dirname, 'leakscan-allow.txt');

const SCAN_DIRS = ['src', 'app', 'test', 'tools', 'docs', 'canva'];
const SCAN_FILES = ['SPEC.md', 'CLAUDE.md', 'README.md', '.clasp.json', 'package.json'];
// SCAN EVERYTHING, SKIP ONLY WHAT CANNOT BE READ. This was an allowlist of extensions until
// 2026-09-28, and on that day a file named app/endpoint.live.js.bak carried the live /exec
// address into a commit. The scan read it as extension ".bak", which was not on the list, and
// waved it through. The ignore rule missed it for the same shape of reason: it named one exact
// filename.
//
// An allowlist of extensions is the wrong default for a leak scan. The cost of scanning a file
// that turns out to be uninteresting is nothing; the cost of skipping one is the thing this
// file exists to prevent. So the list below is the only thing NOT read, and it holds formats
// whose bytes are not text.
const SKIP_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.zip', '.gz', '.mp4', '.mov', '.xlsx'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', '.claude'];

// Each rule is a shape plus why it matters, and the why is printed with the hit, because a
// scan that only says FAIL teaches nobody what not to do next time.
const RULES = [
  {
    name: 'email address',
    why: 'the roster lives in the Sheet, never in the repo (SPEC 3)',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  {
    name: 'Apps Script deployment',
    why: 'the /exec endpoint is a Configuration setting, never a committed constant',
    re: /(?:script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}|\bAKfyc[A-Za-z0-9_-]{20,})/g,
  },
  {
    name: 'Google file id',
    why: "the workbook id identifies Ethan's own Drive file",
    re: /\b[A-Za-z0-9_-]{25}[A-Za-z0-9_-]{15,}\b/g,
    // A 40 plus character run of id characters. Narrowed below, because a minified
    // vendor bundle and a base64 blob both look like this and neither is a leak.
    onlyIn: ['.js', '.json', '.md'],
    guard: (hit) => /[0-9]/.test(hit) && /[A-Z]/.test(hit) && /[a-z]/.test(hit),
  },
  {
    name: 'token',
    why: 'tokens live in Script Properties and never in a file or a cell (SPEC 3)',
    // THE PROJECT'S OWN ALPHABET, exactly: IS9WD_TOKEN_ALPHABET in src/IS9WD_Core.js is
    // '0123456789abcdefghjkmnpqrstvwxyz', 32 symbols with i, l, o and u left out so
    // nobody misreads one aloud. This pattern excluded 0 and 1 until 2026-09-28, so a
    // real token holding either walked straight past the scan. Caught when the endpoint
    // test fixtures were committed and only one of four was flagged.
    re: /\b[0-9a-hjkmnp-tv-z]{26}\b/g,
  },
];

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
    } else if (SKIP_EXT.indexOf(path.extname(entry.name).toLowerCase()) < 0) {
      out.push(full);
    }
  }
  return out;
}

// ONLY WHAT GIT TRACKS. A pre-commit scan that reads the working tree flags files git
// ignores: `.clasp.json` holds the script id and the workbook id and is gitignored for
// exactly that reason, and a scan that fails on it every time is a scan someone turns off.
// The directory walk stays as the fallback for a tree that is not a git checkout.
function tracked() {
  try {
    const cp = require('child_process');
    // Tracked files PLUS untracked ones that are not ignored, so a new file is scanned before
    // its first commit rather than after. An ignored file stays out: .clasp.json is ignored.
    const out = cp.execSync('git ls-files -z', { cwd: ROOT, encoding: 'utf8' }) +
      cp.execSync('git ls-files -z --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' });
    const list = out.split('\u0000').filter((f) => f !== '');
    if (list.length) return list.map((f) => path.join(ROOT, f));
  } catch (err) {
    // not a checkout, or git is absent
  }
  return null;
}

function targets() {
  const fromGit = tracked();
  if (fromGit) return fromGit;
  const out = [];
  for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), out);
  for (const file of SCAN_FILES) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) out.push(full);
  }
  return out;
}

function allowed() {
  if (!fs.existsSync(ALLOW_FILE)) return {};
  const out = {};
  for (const raw of fs.readFileSync(ALLOW_FILE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.charAt(0) === '#') continue;
    out[line] = true;
  }
  return out;
}

const allow = allowed();
const files = process.argv.length > 2 ? process.argv.slice(2) : targets();
const hits = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (SKIP_EXT.indexOf(ext) >= 0) continue;
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    continue;
  }
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel === 'test/leakscan.test.js' || rel === 'test/leakscan-allow.txt') continue;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const rule of RULES) {
      if (rule.onlyIn && rule.onlyIn.indexOf(ext) < 0) continue;
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(lines[i])) !== null) {
        const hit = m[0];
        if (allow[hit]) continue;
        if (rule.guard && !rule.guard(hit)) continue;
        hits.push({ where: rel + ':' + (i + 1), rule: rule, hit: hit });
      }
    }
  }
}

for (const h of hits) {
  console.log('FAIL  ' + h.rule.name + '  ' + h.where);
  console.log('        ' + h.hit);
  console.log('        ' + h.rule.why);
}

console.log('');
console.log('leak scan: ' + files.length + ' files, ' + hits.length + ' hits');
if (hits.length) {
  console.log('');
  console.log('If a hit is genuinely safe, add its exact text to test/leakscan-allow.txt');
  console.log('with a comment saying why. Never widen a rule to silence one hit.');
  console.log('A NAME IS THE ONE THING THIS CANNOT SEE. Check that yourself.');
  process.exit(1);
}
