// THE DASHBOARD SAYS WHAT ITS NUMBERS ARE.
//
// Written on 2026-10-06 after four findings on 00 | Dashboard: Last self test read FAILED on
// a clean run, because the summary line always carries "0 fail"; a row labelled for the
// carousel showed every open task; a tile caption claimed the evening email's window; and
// flagged rows, which are mostly overdue tasks, sat under a line about broken formulas. This
// loads Core and Config and reads the card specs, because the cards only render in Sheets.
//
//   node test/fix-dashboard.test.js

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const box = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
  Logger: { log: () => {} } };
box.globalThis = box;
vm.createContext(box);
for (const f of ['IS9WD_Core.js', 'IS9WD_Config.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), box, { filename: f });
}

let pass = 0;
let failed = 0;
function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log('  ok  ' + label); return; }
  failed++;
  console.log('  FAIL  ' + label + '\n        expected ' + JSON.stringify(expected) + '\n        actual   ' + JSON.stringify(actual));
}

const cards = box.IS9WD_dashCards_();
const card = (key) => cards.find((c) => c.key === key);
const row = (key, label) => (card(key).rows || []).find((r) => r.label === label);

// A Sheets ISNUMBER(FIND("lit",IS9WD_DIAG_SELFTEST)) read in JS. FIND is case sensitive,
// which indexOf is too. Returns null when the formula does not have that shape.
function findPredicate(formula) {
  const m = /ISNUMBER\(FIND\("((?:[^"]|"")*)",IS9WD_DIAG_SELFTEST\)\)/.exec(formula);
  if (!m) return null;
  const lit = m[1].replace(/""/g, '"');
  return (line) => line.indexOf(lit) >= 0;
}

// The two lines IS9WD_stSummary_ writes, built from the same separator and marker.
const SEP = box.IS9WD_SEP;
const clean = '2026-10-06 09:00' + SEP + '212 pass, 0 fail, 3 warn, 1 skip';
const broken = '2026-10-06 09:00' + SEP + '211 pass, 1 fail, 3 warn, 1 skip' + SEP +
  box.IS9WD_SELFTEST_FAIL_MARKER_ + 'The dashboard is built and carries no cream';

// 1. Last self test.
const st = row('D.MACHINE', 'Last self test');
check('Last self test row exists', !!st, true);
check('value formula no longer searches for the bare word', /SEARCH\("fail"/i.test(st.formula), false);
check('flag formula no longer searches for the bare word', /SEARCH\("fail"/i.test(st.flag), false);
const valueTest = findPredicate(st.formula);
const flagTest = findPredicate(st.flag);
check('value formula tests the shared failure marker', !!valueTest, true);
check('flag formula tests the shared failure marker', !!flagTest, true);
check('a clean run reads OK', valueTest(clean), false);
check('a clean run is not flagged', flagTest(clean), false);
check('a failing run reads FAILED', valueTest(broken), true);
check('a failing run is flagged', flagTest(broken), true);
check('the old test would have failed the clean run, so this test means something',
  clean.toLowerCase().indexOf('fail') >= 0, true);
// The rule path wraps bare names in INDIRECT and skips a formula already holding one, so a
// flag that arrives pre-wrapped would leave its other names bare and throw at apply time.
check('flag carries no INDIRECT of its own, so the rule path wraps it', st.flag.indexOf('INDIRECT(') < 0, true);

// 2. The open task count is labelled as what it is.
const total = card('D.BROKEN').rows.filter((r) => /IS9WD_FEED_TOTAL\b/.test(r.formula));
check('one dashboard row reads the feed total', total.length, 1);
check('that row is labelled Open tasks', total[0].label, 'Open tasks');
check('no dashboard label claims the carousel for the total',
  cards.some((c) => (c.rows || []).some((r) => /IS9WD_FEED_TOTAL\b/.test(r.formula) && /carousel|slide/i.test(r.label))), false);

// 3. The due soon tile caption names its own window.
const soon = box.IS9WD_STATS_TILES.find((t) => t[0] === 'T.SOON');
check('due soon caption', soon[1], 'DUE TODAY OR TOMORROW');

// 4. Flags are not called broken formulas.
const b = card('D.BROKEN');
const flagged = b.rows.findIndex((r) => /IS9WD_FEED_FLAGGED\b/.test(r.formula));
check('flagged row label', b.rows[flagged].label, 'Task rows with a flag');
check('flagged row sits after the four error scans', flagged >= 4, true);
check('the four error scans are the first four rows',
  b.rows.slice(0, 4).every((r) => /_ERRORS\b/.test(r.formula)), true);
check('the help line scopes broken to the first four', /first four/i.test(b.help), true);
check('the title names flags', /FLAGS/.test(b.title), true);
check('the card keeps seven rows, so the grid does not move', b.rows.length, 7);

// No em dash anywhere a person reads on this tab.
const texts = [];
cards.forEach((c) => { texts.push(c.title, c.help); (c.rows || []).forEach((r) => texts.push(r.label, r.formula)); });
box.IS9WD_STATS_TILES.forEach((t) => texts.push(t[1]));
// Built from its code point, so the repo's own em dash scan does not read this line as one.
const EM = String.fromCharCode(0x2014);
check('no em dash in a card or tile string', texts.some((t) => String(t).indexOf(EM) >= 0), false);

console.log('    dashboard fixes: ' + pass + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
