/**
 * Node test for src/IS9WD_Core.js, derived from SPEC.md and docs/BUILD-REFERENCE.md
 * alone. No npm dependencies.
 *
 *   node test/core.test.js
 *
 * These cases were written without reading the implementation, so a misreading in
 * either direction surfaces as a failure rather than as agreement. Every expected
 * string is quoted from SPEC.md section 4 or from reference 6.4, byte for byte.
 *
 * The source is loaded into a vm realm that shares the host Date, because any
 * `instanceof Date` guard in Core fails against a realm's own intrinsics.
 *
 * Fixtures build dates with `new Date(y, m-1, d)` so nothing in this file depends
 * on the host time zone, which is the same rule 7.4 pins for inbound deadlines.
 *
 * This file is not pushed to Apps Script.
 */

'use strict';

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const CORE = path.join(ROOT, 'src', 'IS9WD_Core.js');

// --- realm -----------------------------------------------------------------

// Utilities is mocked for Asia/Manila (UTC+8, no DST) per 13.4, even though the
// core is meant to reach no Apps Script global at all.
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function formatDate(dt, tz, pattern) {
  const y = dt.getFullYear(), m = dt.getMonth(), day = dt.getDate();
  return pattern
    .replace(/yyyy/g, String(y))
    .replace(/MMM/g, MONTHS_SHORT[m])
    .replace(/MM/g, pad2(m + 1))
    .replace(/dd/g, pad2(day))
    .replace(/EEE/g, DAYS_SHORT[dt.getDay()])
    .replace(/HH/g, pad2(dt.getHours()))
    .replace(/mm/g, pad2(dt.getMinutes()))
    .replace(/d/g, String(day));
}

if (!fs.existsSync(CORE)) {
  console.error('\nCannot run: ' + CORE + ' does not exist yet.\n');
  process.exit(1);
}

const sandbox = {
  console,
  Date,
  Utilities: { formatDate },
};
vm.createContext(sandbox);
try {
  vm.runInContext(fs.readFileSync(CORE, 'utf8'), sandbox,
    { filename: 'src/IS9WD_Core.js' });
} catch (e) {
  console.error('\nsrc/IS9WD_Core.js failed to load: ' + e.message + '\n');
  process.exit(1);
}

// Apps Script declares top-level functions, so they land on the realm global.
function fn(name) {
  const f = sandbox[name];
  if (typeof f !== 'function') {
    console.error('\nMISSING  ' + name + ' is not defined in src/IS9WD_Core.js\n');
    process.exit(1);
  }
  return f;
}

// --- harness ---------------------------------------------------------------

let pass = 0;

// Values built inside the vm realm carry that realm's Array and Object
// prototypes, so deepStrictEqual fails on identical data. Compare structurally
// instead: primitives stay strict, containers compare by shape and contents.
function sameShape(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(k => Object.prototype.hasOwnProperty.call(b, k) && sameShape(a[k], b[k]));
}

function check(label, actual, expected) {
  try {
    if (!sameShape(actual, expected)) assert.deepStrictEqual(actual, expected);
  } catch (e) {
    console.error('\nFAIL  ' + label);
    console.error('  expected: ' + JSON.stringify(expected));
    console.error('  actual:   ' + JSON.stringify(actual) + '\n');
    process.exit(1);
  }
  pass++;
  console.log('  ok  ' + label);
}

function checkThrows(label, f) {
  let threw = false;
  try { f(); } catch (e) { threw = true; }
  check(label, threw, true);
}

// --- fixtures --------------------------------------------------------------

function d(y, m, day) { return new Date(y, m - 1, day, 0, 0, 0, 0); }
function ymd(v) {
  if (!(v instanceof Date)) return v;
  return v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
}
function num(v) { return (v === '' || v === null || v === undefined) ? v : Number(v); }

// Sheet ranges arrive as rows. Fixtures carry both the positional and the named
// shape, so a case fails on behaviour rather than on which one Core chose.
function row(values, names) {
  const r = values.slice();
  for (let i = 0; i < names.length; i++) r[names[i]] = values[i];
  return r;
}

const STATUS_LIST = [
  row(['Open', false], ['name', 'terminal']),
  row(['Accomplished', true], ['name', 'terminal']),
];

// 13.2: the fixture term start is 2026-08-31, not the live 2026-09-07, because
// every golden string carried over from v1 is written for WEEK 04.
const TERM_COLS = ['name', 'start', 'end'];
const TERM_FIXTURE = [
  row(['Term 1', d(2026, 8, 31), d(2026, 12, 13)], TERM_COLS),
  row(['', '', ''], TERM_COLS),
  row(['', '', ''], TERM_COLS),
];
const TERM_LIVE = [
  row(['Term 1', d(2026, 9, 7), d(2026, 12, 13)], TERM_COLS),
  row(['', '', ''], TERM_COLS),
  row(['', '', ''], TERM_COLS),
];

const AY = 'A.Y. 2026 - 2027';

const DIR_COLS = ['key', 'carouselOrder', 'committee', 'name', 'position', 'email',
  'prefix', 'issued', 'revoked', 'check', 'publishes', 'hierarchy'];

function dirRow(key, order, committee, name, position, publishes, hierarchy) {
  return row([key, order, committee, name, position,
    key.toLowerCase() + '@example.invalid', '', '', false, 'OK', publishes, hierarchy],
    DIR_COLS);
}

const COMMITTEES = ['Partnerships', 'Publications', 'Marketing and Advocacy',
  'Membership', 'Team Management', 'Investment Strategy & Education',
  'Investment Research', 'Documentation', 'Finance'];

const OFFICES = [
  ['K10', 'President', 'PRESIDENT', 1],
  ['K11', 'Executive Vice President for Externals', 'EXECUTIVE VICE PRESIDENT FOR EXTERNALS', 2],
  ['K12', 'Executive Vice President for Internals', 'EXECUTIVE VICE PRESIDENT FOR INTERNALS', 3],
  ['K13', 'Executive Vice President for Investments', 'EXECUTIVE VICE PRESIDENT FOR INVESTMENTS', 4],
  ['K14', 'Executive Vice President for Operations', 'EXECUTIVE VICE PRESIDENT FOR OPERATIONS', 5],
];

const DIRECTORY = [];
COMMITTEES.forEach(function (c, i) {
  DIRECTORY.push(dirRow('K' + pad2(i + 1), i + 1, c, 'Person ' + pad2(i + 1),
    'VICE PRESIDENT', true, 6 + i));
});
OFFICES.forEach(function (o) {
  DIRECTORY.push(dirRow(o[0], '', o[1], 'Person ' + o[0].slice(1), o[2], false, o[3]));
});

function hexPair(station, text) {
  const p = [station, text];
  p.station = station; p.text = text;
  p.stationHex = station; p.numberTextHex = text;
  return p;
}
const HEX = [hexPair('#e9ebd4', '#1C2120'), hexPair('#e9ebd4', '#1C2120'),
  hexPair('#8a64a9', '#F8FBFD'), hexPair('#085040', '#F8FBFD')];
HEX.OVERDUE = HEX[0]; HEX.W1 = HEX[1]; HEX.W2 = HEX[2]; HEX.W3 = HEX[3];

// The 13.2 Partnerships seed, ten Open items, in deadline order.
const SEED = [
  ['D0001', 'Confirm speaker for Debt Traps Exposed', d(2026, 9, 21), 'Send final name to Publication'],
  ['D0002', 'Send Homecoming sponsorship deck', d(2026, 9, 21), ''],
  ['D0003', 'Follow up on 4 pending sponsor replies', d(2026, 9, 22), ''],
  ['D0004', 'Finalize partner LOI template', d(2026, 9, 23), 'For EVP-EXT sign-off'],
  ['D0005', 'Draft MOA for Homecoming venue partner', d(2026, 9, 24), 'Attach venue quotation'],
  ['D0006', 'Submit xDeals shortlist to Finance', d(2026, 9, 25), ''],
  ['D0007', 'Prep speaker kit for Debt Traps Exposed', d(2026, 9, 26), ''],
  ['D0008', 'Pitch Summit Diamond tier to 3 banks', d(2026, 9, 30), 'Use the updated tier deck'],
  ['D0009', 'Renew MOAs with IS8 partners', d(2026, 10, 1), ''],
  ['D0010', 'Update partner contact directory', d(2026, 10, 2), ''],
].map(function (r, i) {
  return {
    id: r[0], committee: 'Partnerships', title: r[1], deadline: r[2], remark: r[3],
    status: 'Open', active: true, rank: i + 1,
  };
});

// Deadlines ascend, so the derived rank and the supplied one cannot disagree and
// a case about slot placement stays a case about slot placement.
// Every deadline on the Monday of the fixture week, so a capacity case stays inside the
// week a slide carries and the ID alone orders it.
function seedInWeek(n, committee) {
  return seedLike(n, committee).map(function (r) {
    r.deadline = d(2026, 9, 21);
    return r;
  });
}

function seedLike(n, committee) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: 'D' + String(1000 + i).slice(-4), committee: committee,
      title: 'Item ' + pad2(i + 1), deadline: d(2026, 9, 21 + i),
      remark: '', status: 'Open', active: true, rank: i + 1,
    });
  }
  return out;
}

function officers(counts) {
  return COMMITTEES.map(function (c, i) {
    return {
      carouselOrder: i + 1, committee: c, name: 'Person ' + pad2(i + 1),
      position: 'VICE PRESIDENT', publishes: true, count: counts[i],
    };
  });
}

const WORKED = [8, 14, 7, 6, 5, 4, 8, 3, 6];

// --- 1. the week rule ------------------------------------------------------

console.log('\n1. Week start is the Monday of the week containing tomorrow (4.1)');
{
  const weekWindow = fn('IS9WD_weekWindow');
  const w = function (dt) {
    const r = weekWindow(dt);
    return [ymd(r.weekStart), ymd(r.weekEnd)];
  };

  check('Sun 2026-09-20 gives Sep 21 to Sep 27', w(d(2026, 9, 20)),
    ['2026-09-21', '2026-09-27']);
  check('Mon 2026-09-21 gives the same week', w(d(2026, 9, 21)),
    ['2026-09-21', '2026-09-27']);
  check('Tue 2026-09-22 gives the same week', w(d(2026, 9, 22)),
    ['2026-09-21', '2026-09-27']);
  check('Wed 2026-09-23 gives the same week', w(d(2026, 9, 23)),
    ['2026-09-21', '2026-09-27']);
  check('Thu 2026-09-24 gives the same week', w(d(2026, 9, 24)),
    ['2026-09-21', '2026-09-27']);
  check('Fri 2026-09-25 gives the same week', w(d(2026, 9, 25)),
    ['2026-09-21', '2026-09-27']);
  check('Sat 2026-09-26 gives the same week', w(d(2026, 9, 26)),
    ['2026-09-21', '2026-09-27']);
  check('Sun 2026-09-27 rolls over to Sep 28 to Oct 4', w(d(2026, 9, 27)),
    ['2026-09-28', '2026-10-04']);
  check('the rollover is Sunday, not Saturday', w(d(2026, 9, 26))[0], '2026-09-21');
  check('a yyyy-MM-dd string works the same', w('2026-09-20'),
    ['2026-09-21', '2026-09-27']);
  check('week end is always week start plus six days', w(d(2026, 12, 27)),
    ['2026-12-28', '2027-01-03']);
}

console.log('\n2. Active term and week number (4.3, 13.2)');
{
  const activeTerm = fn('IS9WD_activeTerm');
  const weekNumber = fn('IS9WD_weekNumber');

  const t = activeTerm(d(2026, 9, 21), TERM_FIXTURE);
  check('the fixture calendar is in term on Sep 21', t && t.name, 'Term 1');
  check('and out of term in February', activeTerm(d(2027, 2, 1), TERM_FIXTURE), null);
  check('and out of term before the start', activeTerm(d(2026, 8, 24), TERM_FIXTURE), null);
  check('a blank calendar is never in term',
    activeTerm(d(2026, 9, 21), [row(['', '', ''], TERM_COLS)]), null);

  check('fixture start 2026-08-31 makes Sep 21 Week 04',
    weekNumber(d(2026, 9, 21), TERM_FIXTURE), 4);
  check('live start 2026-09-07 makes Sep 21 Week 03',
    weekNumber(d(2026, 9, 21), TERM_LIVE), 3);
  check('live start 2026-09-07 makes Sep 28 Week 04',
    weekNumber(d(2026, 9, 28), TERM_LIVE), 4);
  check('term start week is Week 01', weekNumber(d(2026, 8, 31), TERM_FIXTURE), 1);
  check('a week outside the term calendar has no number',
    weekNumber(d(2027, 2, 1), TERM_FIXTURE), null);
  check('and neither does a week before it',
    weekNumber(d(2026, 8, 24), TERM_FIXTURE), null);
}

// --- 3. the contract strings ----------------------------------------------

console.log('\n3. Range text, including the month and year crossings (6.4 R1)');
{
  const rangeText = fn('IS9WD_rangeText');

  check('same month collapses the second month',
    rangeText(d(2026, 9, 21), d(2026, 9, 27)), 'SEP 21 TO 27');
  check('a month crossing prints both months',
    rangeText(d(2026, 9, 28), d(2026, 10, 4)), 'SEP 28 TO OCT 4');
  check('the W2 legend range crosses a month',
    rangeText(d(2026, 9, 30), d(2026, 10, 4)), 'SEP 30 TO OCT 4');
  check('a year crossing prints both months, not DEC 28 TO 3',
    rangeText(d(2026, 12, 28), d(2027, 1, 3)), 'DEC 28 TO JAN 3');
  check('no leading zero on the day of month',
    rangeText(d(2026, 10, 5), d(2026, 10, 11)), 'OCT 5 TO 11');
  check('a two day range', rangeText(d(2026, 9, 21), d(2026, 9, 22)), 'SEP 21 TO 22');
}

console.log('\n4. The Week 04 golden strings (SPEC section 4, 13.2)');
{
  const weekLine = fn('IS9WD_weekLine');
  const legendLines = fn('IS9WD_legendLines');
  const vpLine = fn('IS9WD_vpLine');
  const tagline = fn('IS9WD_tagline');
  const deadlineText = fn('IS9WD_deadlineText');
  const remarkText = fn('IS9WD_remarkText');

  const start = d(2026, 9, 21), end = d(2026, 9, 27);

  check('week line, fixture week',
    weekLine(4, 'SEP 21 TO 27', AY),
    'WEEK 04  |  SEP 21 TO 27  |  A.Y. 2026 - 2027');
  check('week line, SPEC section 4 example',
    weekLine(4, 'SEP 28 TO OCT 4', AY),
    'WEEK 04  |  SEP 28 TO OCT 4  |  A.Y. 2026 - 2027');
  check('week number is zero padded to two digits',
    weekLine(7, 'SEP 21 TO 27', AY),
    'WEEK 07  |  SEP 21 TO 27  |  A.Y. 2026 - 2027');
  check('a null week number renders the -- placeholder, not a collapsed width',
    weekLine(null, 'SEP 21 TO 27', AY),
    'WEEK --  |  SEP 21 TO 27  |  A.Y. 2026 - 2027');

  check('the three legends, fixture week', legendLines(start, end),
    ['DUE SEP 21 TO 22', 'DUE SEP 23 TO 27', 'OVERDUE']);
  check('the three legends, SPEC section 4 example',
    legendLines(d(2026, 9, 28), d(2026, 10, 4)),
    ['DUE SEP 28 TO 29', 'DUE SEP 30 TO OCT 4', 'OVERDUE']);

  check('VP line uppercases both halves',
    vpLine('Juan Dela Cruz', 'Vice President'), 'JUAN DELA CRUZ  |  VICE PRESIDENT');
  check('an already uppercase position is unchanged',
    vpLine('JUAN DELA CRUZ', 'VICE PRESIDENT'), 'JUAN DELA CRUZ  |  VICE PRESIDENT');
  check('an office line', vpLine('Juan Dela Cruz', 'EXECUTIVE VICE PRESIDENT FOR OPERATIONS'),
    'JUAN DELA CRUZ  |  EXECUTIVE VICE PRESIDENT FOR OPERATIONS');

  check('tagline, fixture week', tagline(4, 'SEP 21 TO 27', 10),
    'WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 21 TO 27  |  10 TASKS');
  check('tagline, SPEC section 4 example', tagline(4, 'SEP 28 TO OCT 4', 10),
    'WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 28 TO OCT 4  |  10 TASKS');
  check('1 TASK is singular', tagline(4, 'SEP 21 TO 27', 1),
    'WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 21 TO 27  |  1 TASK');
  check('0 TASKS is plural (6.1 item 4)', tagline(4, 'SEP 21 TO 27', 0),
    'WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 21 TO 27  |  0 TASKS');
  check('the continuation page repeats the officer total, with no part marker',
    tagline(4, 'SEP 28 TO OCT 4', 14),
    'WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 28 TO OCT 4  |  14 TASKS');
  check('a null week number in the tagline too',
    tagline(null, 'SEP 21 TO 27', 8),
    'WEEKLY DELIVERABLES  |  WEEK --  |  SEP 21 TO 27  |  8 TASKS');
  check('the tagline never prints next due text in the count slot',
    tagline(4, 'SEP 28 TO OCT 4', 8).indexOf('Next due'), -1);

  check('a future deadline in the week', deadlineText(d(2026, 9, 21), start),
    'Due Mon, Sep 21');
  check('a deadline after the week end', deadlineText(d(2026, 10, 2), start),
    'Due Fri, Oct 2');
  check('an overdue deadline', deadlineText(d(2026, 9, 18), start),
    'Overdue: Fri, Sep 18');
  check('the SPEC section 4 pair, next week',
    [deadlineText(d(2026, 9, 28), d(2026, 9, 28)),
      deadlineText(d(2026, 9, 25), d(2026, 9, 28))],
    ['Due Mon, Sep 28', 'Overdue: Fri, Sep 25']);
  check('week start itself is not overdue', deadlineText(start, start), 'Due Mon, Sep 21');
  check('one day before week start is overdue',
    deadlineText(d(2026, 9, 20), start), 'Overdue: Sun, Sep 20');
  check('a blank deadline renders blank', deadlineText('', start), '');

  check('remark text is U+00B7 then two spaces',
    remarkText('Send final name to Publication'), '·  Send final name to Publication');
  check('an empty remark renders blank', remarkText(''), '');
  check('the remark is not uppercased', remarkText('For EVP-EXT sign-off'),
    '·  For EVP-EXT sign-off');
}

console.log('\n5. Next due text (6.4 officer row E, A2 item 6)');
{
  const nextDueText = fn('IS9WD_nextDueText');
  const start = d(2026, 9, 21);

  check('no items at all', nextDueText([], start), 'No deliverables this week');
  check('the earliest deadline, in week', nextDueText(SEED, start), 'Next due Mon, Sep 21');
  check('an overdue item wins, earliest first',
    nextDueText([{ deadline: d(2026, 9, 24) }, { deadline: d(2026, 9, 18) }], start),
    'Overdue: Fri, Sep 18');
  check('every deadline blank', nextDueText([{ deadline: '' }, { deadline: '' }], start),
    'Next due: date missing');
  check('a deadline after the week end', nextDueText([{ deadline: d(2026, 10, 2) }], start),
    'Next due Fri, Oct 2');
}

console.log('\n6. Window classification (4.2, 6.4 slot row I)');
{
  const windowFor = fn('IS9WD_windowFor');
  const start = d(2026, 9, 21), end = d(2026, 9, 27);
  const w = function (dt) { return windowFor(dt, start, end); };

  check('before week start is OVERDUE', w(d(2026, 9, 20)), 'OVERDUE');
  check('week start is W1', w(start), 'W1');
  check('week start plus one is W1', w(d(2026, 9, 22)), 'W1');
  check('week start plus two is W2', w(d(2026, 9, 23)), 'W2');
  check('week end is W2', w(end), 'W2');
  check('after week end is W3', w(d(2026, 9, 28)), 'W3');
  check('a blank deadline falls back to W1, never blank', w(''), 'W1');
  check('the seed windows in slot order', SEED.map(function (it) { return w(it.deadline); }),
    ['W1', 'W1', 'W1', 'W2', 'W2', 'W2', 'W2', 'W3', 'W3', 'W3']);
}

console.log('\n6b. Overdue on any day (Ethan, 2026-10-06)');
{
  // A carousel run on any day shows every item past its deadline as overdue. On Sunday
  // today is before the week start, so the cutoff stays the week start and a Sunday
  // run reads exactly as v1's did.
  const windowFor = fn('IS9WD_windowFor');
  const deadlineText = fn('IS9WD_deadlineText');
  const nextDueText = fn('IS9WD_nextDueText');
  const start = d(2026, 10, 5), end = d(2026, 10, 11);
  const sunday = d(2026, 10, 4), tuesday = d(2026, 10, 6);

  check('Tuesday: a Monday deadline is OVERDUE', windowFor(d(2026, 10, 5), start, end, tuesday), 'OVERDUE');
  check('Tuesday: a Monday deadline prints as overdue',
    deadlineText(d(2026, 10, 5), start, tuesday), 'Overdue: Mon, Oct 5');
  check('Tuesday: a deadline of today is not overdue, still W1',
    [windowFor(tuesday, start, end, tuesday), deadlineText(tuesday, start, tuesday)],
    ['W1', 'Due Tue, Oct 6']);
  check('Tuesday: tomorrow is W2', windowFor(d(2026, 10, 7), start, end, tuesday), 'W2');
  check('Sunday: the cutoff is still the week start',
    [windowFor(sunday, start, end, sunday), windowFor(start, start, end, sunday),
      deadlineText(sunday, start, sunday)],
    ['OVERDUE', 'W1', 'Overdue: Sun, Oct 4']);
  check('no today given: the week start alone, as before',
    [windowFor(d(2026, 10, 5), start, end), deadlineText(d(2026, 10, 5), start)],
    ['W1', 'Due Mon, Oct 5']);
  check('Tuesday: the officer row reads Overdue for a Monday deadline',
    nextDueText([{ deadline: d(2026, 10, 9) }, { deadline: d(2026, 10, 5) }], start, tuesday),
    'Overdue: Mon, Oct 5');
  check('Tuesday: the officer row reads Next due when nothing is past',
    nextDueText([{ deadline: d(2026, 10, 9) }, { deadline: tuesday }], start, tuesday),
    'Next due Tue, Oct 6');
}

console.log('\n6c. A slide carries this week and the overdue ones only (Ethan, 2026-10-06)');
{
  const slotRows = fn('IS9WD_slotRows');
  const nextDueText = fn('IS9WD_nextDueText');
  const legendLines = fn('IS9WD_legendLines');
  const start = d(2026, 10, 5), end = d(2026, 10, 11), tuesday = d(2026, 10, 6);
  const item = function (id, due) {
    return { id: id, committee: 'Finance', title: 'Task ' + id, deadline: due,
      remark: '', status: 'Open', active: true };
  };
  const mix = [item('D0001', d(2026, 10, 2)), item('D0002', d(2026, 10, 7)),
    item('D0003', end), item('D0004', d(2026, 10, 12)), item('D0005', d(2026, 10, 20)),
    item('D0006', null)];
  const out = slotRows(mix, start, end, HEX, 10, 1, tuesday);
  const shown = out.pages[0].rows.filter(function (r) { return r.visible === true; });
  check('overdue, this week and a blank deadline reach the slide, later ones do not',
    shown.map(function (r) { return r.title; }),
    ['Task D0006', 'Task D0001', 'Task D0002', 'Task D0003']);
  check('a task due later is not counted as not published', num(out.notPublished), 0);
  check('the overdue one carries the OVERDUE window and its hex',
    [shown[1].window, shown[1].stationHex], ['OVERDUE', '#e9ebd4']);
  check('a task due on the Sunday itself is in', shown[3].deadlineText, 'Due Sun, Oct 11');
  check('eleven due this week publish ten and report one',
    num(slotRows(seedInWeek(11, 'Finance'), start, end, HEX, 10, 1, tuesday).notPublished), 1);
  check('the officer row ignores a task due after the week',
    nextDueText([item('D0004', d(2026, 10, 12)), item('D0002', d(2026, 10, 9))],
      start, tuesday, end), 'Next due Fri, Oct 9');
  check('an officer with only later tasks has none this week',
    nextDueText([item('D0004', d(2026, 10, 12))], start, tuesday, end),
    'No deliverables this week');
  check('without a week end the officer row reads every task, as before',
    nextDueText([item('D0004', d(2026, 10, 12))], start, tuesday), 'Next due Mon, Oct 12');
  check('the third legend names the overdue colour', legendLines(start, end)[2], 'OVERDUE');
}

// --- 7. status, sorting, text ---------------------------------------------

console.log('\n7. The derived Active flag, sorting and normalization (1.3, 5.4, 7.5)');
{
  const isActive = fn('IS9WD_isActive');
  const sortActive = fn('IS9WD_sortActive');
  const normalizeText = fn('IS9WD_normalizeText');

  check('Open is active', isActive('Open', STATUS_LIST), true);
  check('Accomplished is not', isActive('Accomplished', STATUS_LIST), false);
  check('an unknown status is not active', isActive('Blocked', STATUS_LIST), false);
  check('a blank status is not active', isActive('', STATUS_LIST), false);

  const unsorted = [
    { id: 'D0009', deadline: d(2026, 9, 22) },
    { id: 'D0003', deadline: d(2026, 9, 22) },
    { id: 'D0007', deadline: d(2026, 9, 21) },
    { id: 'D0002', deadline: d(2026, 9, 23) },
  ];
  check('deadline ascending, then ID ascending',
    sortActive(unsorted).map(function (it) { return it.id; }),
    ['D0007', 'D0003', 'D0009', 'D0002']);

  check('outer spaces trimmed', normalizeText('  Confirm speaker  '), 'Confirm speaker');
  check('a line break collapses to one space', normalizeText('Confirm\nspeaker'),
    'Confirm speaker');
  check('a tab collapses to one space', normalizeText('Confirm\tspeaker'),
    'Confirm speaker');
  check('all three at once', normalizeText('  Confirm\nthe\tspeaker  '),
    'Confirm the speaker');
  const tidyCell = fn('IS9WD_tidyCell_');
  check('tidy: a trailing space is removed', tidyCell('Send final name '), 'Send final name');
  check('tidy: an Alt+Enter line break becomes one space', tidyCell('Send final\nname'), 'Send final name');
  check('tidy: clean text is left alone', tidyCell('Send final name'), null);
  check('tidy: an empty cell, a number and a date are never touched', [tidyCell(''), tidyCell(5), tidyCell(new Date(2026, 8, 29))], [null, null, null]);
  check('internal double spaces survive, or every contract pipe breaks',
    normalizeText('A  |  B'), 'A  |  B');
}

// --- 8. Check flags --------------------------------------------------------

console.log('\n8. Check flags, precedence top to bottom (5.3)');
{
  const checkFlag = fn('IS9WD_checkFlag');
  const today = d(2026, 9, 20);

  function item(o) {
    const base = {
      id: 'D0001', committee: 'Partnerships', title: 'Confirm speaker',
      deadline: d(2026, 9, 21), remark: '', status: 'Open',
    };
    Object.keys(o).forEach(function (k) { base[k] = o[k]; });
    return base;
  }

  check('an empty row is not flagged',
    checkFlag({ id: '', committee: '', title: '', deadline: '', remark: '', status: '' },
      today, STATUS_LIST), '');
  check('a good row is not flagged', checkFlag(item({}), today, STATUS_LIST), '');
  check('Missing ID', checkFlag(item({ id: '' }), today, STATUS_LIST), 'Missing ID');
  check('Missing status', checkFlag(item({ status: 'Blocked' }), today, STATUS_LIST),
    'Missing status');
  check('a blank status is Missing status too',
    checkFlag(item({ status: '' }), today, STATUS_LIST), 'Missing status');
  check('Missing title', checkFlag(item({ title: '' }), today, STATUS_LIST),
    'Missing title');
  check('Missing deadline', checkFlag(item({ deadline: '' }), today, STATUS_LIST),
    'Missing deadline');
  check('Deadline not a date, a text deadline',
    checkFlag(item({ deadline: 'Sept 21' }), today, STATUS_LIST), 'Deadline not a date');
  check('Deadline not a date, a datetime',
    checkFlag(item({ deadline: new Date(2026, 8, 21, 17, 0, 0, 0) }), today, STATUS_LIST),
    'Deadline not a date');
  check('a title of exactly 40 characters is fine',
    checkFlag(item({ title: 'x'.repeat(40) }), today, STATUS_LIST), '');
  check('Title too long at 41', checkFlag(item({ title: 'x'.repeat(41) }), today, STATUS_LIST),
    'Title too long');
  check('a remark of exactly 30 characters is fine',
    checkFlag(item({ remark: 'Send final name to Publication' }), today, STATUS_LIST), '');
  check('Remark too long at 31', checkFlag(item({ remark: 'x'.repeat(31) }), today, STATUS_LIST),
    'Remark too long');
  check('Overdue compares against effective today, not week start',
    checkFlag(item({ deadline: d(2026, 9, 18) }), today, STATUS_LIST), 'Overdue');
  check('effective today itself is not overdue',
    checkFlag(item({ deadline: today }), today, STATUS_LIST), '');
  check('an inactive row with a past deadline is not overdue',
    checkFlag(item({ deadline: d(2026, 9, 18), status: 'Accomplished' }), today, STATUS_LIST),
    '');
  check('Missing title outranks Overdue',
    checkFlag(item({ title: '', deadline: d(2026, 9, 18) }), today, STATUS_LIST),
    'Missing title');
  check('Missing ID outranks Missing title',
    checkFlag(item({ id: '', title: '' }), today, STATUS_LIST), 'Missing ID');
  check('Missing deadline outranks Title too long',
    checkFlag(item({ deadline: '', title: 'x'.repeat(41) }), today, STATUS_LIST),
    'Missing deadline');
  check('a Wednesday read still flags a Monday deadline overdue (6.5)',
    checkFlag(item({ deadline: d(2026, 9, 21) }), d(2026, 9, 23), STATUS_LIST), 'Overdue');
}

// --- 9. the publish split --------------------------------------------------

console.log('\n9. Publish split, the off-by-one cases (5.4, 13.1)');
{
  const publishSplit = fn('IS9WD_publishSplit');
  const s = function (n) {
    const r = publishSplit(n, 10, 2);
    return [num(r.parts), num(r.published), num(r.notPublished)];
  };

  check('0 items still gets one page', s(0), [1, 0, 0]);
  check('1 item', s(1), [1, 1, 0]);
  check('exactly 10 is one page, not two', s(10), [1, 10, 0]);
  check('11 is two pages with one slot on part 2', s(11), [2, 11, 0]);
  check('20 is two pages exactly full', s(20), [2, 20, 0]);
  check('23 publishes 20 and leaves 3 behind', s(23), [2, 20, 3]);
  check('parts never exceed the maximum', num(publishSplit(45, 10, 2).parts), 2);
  check('a single part configuration caps at the page size',
    (function () { const r = publishSplit(23, 10, 1); return [num(r.parts), num(r.published), num(r.notPublished)]; })(),
    [1, 10, 13]);
}

console.log('\n10. The master page mapping, every pair from (1,1) to (9,2) (6.3)');
{
  const masterPage = fn('IS9WD_masterPage');
  const got = [];
  for (let i = 1; i <= 9; i++) {
    for (let p = 1; p <= 2; p++) got.push(num(masterPage(i, p, 2)));
  }
  const want = [];
  for (let n = 2; n <= 19; n++) want.push(n);
  check('the literal list 2 to 19', got, want);
  check('carousel order 1 owns 02 and 03',
    [num(masterPage(1, 1, 2)), num(masterPage(1, 2, 2))], [2, 3]);
  check('carousel order 9 owns 18 and 19',
    [num(masterPage(9, 1, 2)), num(masterPage(9, 2, 2))], [18, 19]);
}

// --- 11. the page plan -----------------------------------------------------

console.log('\n11. The page plan and the export list (6.4, 13.1)');
{
  const pagePlan = fn('IS9WD_pagePlan');
  const exportPageList = fn('IS9WD_exportPageList');

  const joined = function (plan) {
    const r = exportPageList(plan);
    return Array.isArray(r) ? r.join(',') : String(r);
  };
  const used = function (plan) {
    return plan.filter(function (p) { return p.used === true; });
  };
  const byPage = function (plan, page) {
    return plan.filter(function (p) { return num(p.page) === page; })[0];
  };

  const worked = pagePlan(officers(WORKED), 10, 2, true);

  check('the plan is always 19 rows, one per physical master page', worked.length, 19);
  check('the title page is row one and is always used',
    [num(worked[0].page), worked[0].used], [1, true]);
  check('the worked week uses 11 pages', used(worked).length, 11);
  check('the export list matches 6.4 byte for byte', joined(worked),
    '1,2,4,5,6,8,10,12,14,16,18');
  check('positions run 01 to 11 with no gap',
    used(worked).map(function (p) { return num(p.position); }),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  check('an unused page carries no position', byPage(worked, 3).position, '');
  check('Partnerships part 2 is unused at 8 items', byPage(worked, 3).used, false);

  const pub1 = byPage(worked, 4), pub2 = byPage(worked, 5);
  check('Publications page 04 is part 1 of 2',
    [pub1.used, num(pub1.part), num(pub1.parts)], [true, 1, 2]);
  check('Publications page 05 is part 2 of 2',
    [pub2.used, num(pub2.part), num(pub2.parts)], [true, 2, 2]);
  check('page 04 carries items 01 to 10 in 10 slots',
    [num(pub1.firstItemNo), num(pub1.lastItemNo), num(pub1.slotsUsed)], [1, 10, 10]);
  check('page 05 carries items 11 to 14 in 4 slots',
    [num(pub2.firstItemNo), num(pub2.lastItemNo), num(pub2.slotsUsed)], [11, 14, 4]);
  check('both Publications pages report the officer total',
    [num(pub1.count), num(pub2.count)], [14, 14]);
  check('positions 03 and 04 are the two Publications pages',
    [num(pub1.position), num(pub2.position)], [3, 4]);

  const exactlyTen = pagePlan(officers([8, 10, 7, 6, 5, 4, 8, 3, 6]), 10, 2, true);
  check('exactly ten items is one page, not two', byPage(exactlyTen, 5).used, false);
  check('and the carousel returns to 10 pages', used(exactlyTen).length, 10);
  check('and the export list loses the 5', joined(exactlyTen),
    '1,2,4,6,8,10,12,14,16,18');

  const past = pagePlan(officers([8, 23, 7, 6, 5, 4, 8, 3, 6]), 10, 2, true);
  check('23 items still uses both pages',
    [byPage(past, 4).used, byPage(past, 5).used], [true, true]);
  check('and both are exactly full',
    [num(byPage(past, 4).slotsUsed), num(byPage(past, 5).slotsUsed)], [10, 10]);
  check('and the last published item number is 20',
    num(byPage(past, 5).lastItemNo), 20);
  check('and the printed count is capped at the publishable maximum',
    num(byPage(past, 4).count), 20);

  const worst = pagePlan(officers([11, 11, 11, 11, 11, 11, 11, 11, 11]), 10, 2, true);
  check('nine committees all overflowing uses all 19 pages', used(worst).length, 19);
  check('positions run 01 to 19',
    used(worst).map(function (p) { return num(p.position); }),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  check('and the export list is 19 ascending integers', joined(worst),
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19');
  check('each continuation page carries one slot',
    num(byPage(worst, 3).slotsUsed), 1);
  check('and its first item number is 11', num(byPage(worst, 3).firstItemNo), 11);

  const emptyOn = pagePlan(officers([0, 0, 0, 0, 0, 0, 0, 0, 0]), 10, 2, true);
  check('with the empty pages switch on, every first page is still used',
    used(emptyOn).length, 10);
  check('an empty committee gets one part, never zero',
    num(byPage(emptyOn, 2).parts), 1);

  const emptyOff = pagePlan(officers([0, 0, 0, 0, 0, 0, 0, 0, 0]), 10, 2, false);
  check('with the switch off and nobody holding an item, only the title page is used',
    used(emptyOff).length, 1);
  check('and the export list is just the title page', joined(emptyOff), '1');

  const financeEmpty = pagePlan(officers([8, 14, 7, 6, 5, 4, 8, 3, 0]), 10, 2, false);
  check('Finance empty with the switch off drops page 18',
    byPage(financeEmpty, 18).used, false);
  check('and every other position renumbers with no gap',
    used(financeEmpty).map(function (p) { return num(p.position); }),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  check('and the export list loses 18', joined(financeEmpty),
    '1,2,4,5,6,8,10,12,14,16');

  const scrambled = pagePlan(officers(WORKED), 10, 2, true).slice();
  const tmp = scrambled[1]; scrambled[1] = scrambled[3]; scrambled[3] = tmp;
  checkThrows('a non-ascending plan throws rather than returning a list',
    function () { exportPageList(scrambled); });
}

// --- 12. slot rows ---------------------------------------------------------

console.log('\n12. Slot rows, ten per page whatever the count (6.3, 6.4)');
{
  const slotRows = fn('IS9WD_slotRows');
  const start = d(2026, 9, 21), end = d(2026, 9, 27);

  const one = slotRows(SEED, start, end, HEX, 10, 2);
  check('ten items give one page', one.pages.length, 1);
  check('and it is part 1', num(one.pages[0].part), 1);
  check('rows are exactly slotsPerPage long', one.pages[0].rows.length, 10);
  check('nothing is left unpublished', num(one.notPublished), 0);
  check('the seven due by Sunday are visible and the three due later are not (2026-10-06)',
    one.pages[0].rows.map(function (r) { return r.visible; }),
    [true, true, true, true, true, true, true, false, false, false]);
  check('the windows are 01 to 03 W1 and 04 to 07 W2',
    one.pages[0].rows.slice(0, 7).map(function (r) { return r.window; }),
    ['W1', 'W1', 'W1', 'W2', 'W2', 'W2', 'W2']);
  check('the station hexes follow the windows',
    one.pages[0].rows.slice(0, 7).map(function (r) { return r.stationHex; }),
    ['#e9ebd4', '#e9ebd4', '#e9ebd4', '#8a64a9', '#8a64a9', '#8a64a9', '#8a64a9']);
  check('and so do the number text hexes',
    one.pages[0].rows.slice(0, 7).map(function (r) { return r.numberTextHex; }),
    ['#1C2120', '#1C2120', '#1C2120', '#F8FBFD', '#F8FBFD', '#F8FBFD', '#F8FBFD']);
  check('slot 01 carries the seed title and its deadline text',
    [one.pages[0].rows[0].title, one.pages[0].rows[0].deadlineText],
    ['Confirm speaker for Debt Traps Exposed', 'Due Mon, Sep 21']);
  check('slot 01 carries the worked remark string',
    one.pages[0].rows[0].remarkText, '·  Send final name to Publication');
  check('remark visible is true only where there is a remark',
    one.pages[0].rows.map(function (r) { return r.remarkVisible; }),
    [true, false, false, true, true, false, false, false, false, false]);
  check('slot 07 is the latest deadline on the slide', one.pages[0].rows[6].deadlineText,
    'Due Sat, Sep 26');

  const overdueFirst = slotRows(
    [{ id: 'D0011', committee: 'Publications', title: 'Late one',
      deadline: d(2026, 9, 18), remark: '', status: 'Open', active: true }],
    start, end, HEX, 10, 2);
  check('an overdue item sorts into slot 01 with the OVERDUE window',
    [overdueFirst.pages[0].rows[0].deadlineText, overdueFirst.pages[0].rows[0].window],
    ['Overdue: Fri, Sep 18', 'OVERDUE']);
  check('the nine unused slots are not visible',
    overdueFirst.pages[0].rows.slice(1).map(function (r) { return r.visible; }),
    [false, false, false, false, false, false, false, false, false]);
  check('an unused slot has a blank title and deadline text',
    [overdueFirst.pages[0].rows[1].title, overdueFirst.pages[0].rows[1].deadlineText],
    ['', '']);

  const fourteen = slotRows(seedInWeek(14, 'Publications'), start, end, HEX, 10, 2);
  check('fourteen items give two pages', fourteen.pages.length, 2);
  check('page 2 is still ten rows long', fourteen.pages[1].rows.length, 10);
  check('with four visible and six not',
    fourteen.pages[1].rows.map(function (r) { return r.visible; }),
    [true, true, true, true, false, false, false, false, false, false]);
  check('and nothing unpublished at fourteen', num(fourteen.notPublished), 0);
  check('page 2 slot 01 carries item number 11',
    num(fourteen.pages[1].rows[0].itemNo), 11);

  const twentyThree = slotRows(seedInWeek(23, 'Publications'), start, end, HEX, 10, 2);
  check('23 items publish 20 across two pages', twentyThree.pages.length, 2);
  check('and report 3 not published', num(twentyThree.notPublished), 3);
  check('with every slot on both pages visible',
    twentyThree.pages[1].rows.filter(function (r) { return r.visible === true; }).length, 10);

  const none = slotRows([], start, end, HEX, 10, 2);
  check('an empty committee still gets one page of ten blank rows',
    [none.pages.length, none.pages[0].rows.length], [1, 10]);
  check('and none of them is visible',
    none.pages[0].rows.filter(function (r) { return r.visible === true; }).length, 0);
}

// --- 13. sign-off ----------------------------------------------------------

console.log('\n13. The weekly sign-off lookup (4.5)');
{
  const signoffFor = fn('IS9WD_signoffFor');
  const SO_COLS = ['weekStart', 'preparedName', 'preparedPosition',
    'checkedName', 'checkedPosition', 'setAt'];
  const setAt = new Date(2026, 8, 20, 19, 30, 0, 0);
  const thisWeek = row([d(2026, 9, 21), 'Juan Dela Cruz', 'Vice President',
    'Maria Santos', 'President', setAt], SO_COLS);
  const nextWeek = row([d(2026, 9, 28), 'Later Name', 'Later Position',
    'Later Checker', 'Later Checker Position', setAt], SO_COLS);

  const empty = signoffFor(d(2026, 9, 21), []);
  check('an empty store is not set', empty.set, false);
  check('and all four strings are blank',
    [empty.preparedName, empty.preparedPosition, empty.checkedName, empty.checkedPosition],
    ['', '', '', '']);

  const later = signoffFor(d(2026, 9, 21), [nextWeek]);
  check('a row for next week only does not satisfy this week', later.set, false);
  check('and it leaks none of next week s names', later.preparedName, '');

  const hit = signoffFor(d(2026, 9, 21), [nextWeek, thisWeek]);
  check('the matching week is found wherever it sits', hit.set, true);
  check('and carries both names and both positions',
    [hit.preparedName, hit.preparedPosition, hit.checkedName, hit.checkedPosition],
    ['Juan Dela Cruz', 'Vice President', 'Maria Santos', 'President']);
  check('and the Set at stamp', hit.setAt, '2026-09-20 19:30');

  const dup = row([d(2026, 9, 21), 'Second Row', 'Second Position',
    'Second Checker', 'Second Checker Position', setAt], SO_COLS);
  check('a duplicated week resolves to the first row, as MATCH does',
    signoffFor(d(2026, 9, 21), [thisWeek, dup]).preparedName, 'Juan Dela Cruz');
}

// --- 14. tokens and the undo window ---------------------------------------

console.log('\n14. Token lookup (7.3, 13.3)');
{
  const tokenLookup = fn('IS9WD_tokenLookup');
  const K01 = 'abcdefghjkmnpqrstvwxyz0123';
  const K14 = '0123456789abcdefghjkmnpqrs';
  const ADMIN = 'zyxwvtsrqpnmkjhgfedcba9876';
  const TOKENS = {
    IS9WD_TOKEN_K01: K01,
    IS9WD_TOKEN_K14: K14,
    IS9WD_TOKEN_ADMIN: ADMIN,
  };

  const m = tokenLookup(K01, DIRECTORY, TOKENS);
  check('a committee token resolves to the member role', m && m.role, 'member');
  check('and to its own directory key', m && m.key, 'K01');
  check('and carries the carousel order and the publish flag',
    [m && num(m.carouselOrder), m && m.publishes], [1, true]);
  check('and the committee name', m && m.committee, 'Partnerships');
  check('and the officer name', m && m.name, 'Person 01');

  const evp = tokenLookup(K14, DIRECTORY, TOKENS);
  check('an office token behaves like a committee token', evp && evp.role, 'member');
  check('but has no carousel order and does not publish',
    [evp && evp.carouselOrder, evp && evp.publishes], ['', false]);

  const a = tokenLookup(ADMIN, DIRECTORY, TOKENS);
  check('the admin token resolves to the admin role', a && a.role, 'admin');

  check('a made up token is null',
    tokenLookup('zzzzzzzzzzzzzzzzzzzzzzzzzz', DIRECTORY, TOKENS), null);
  check('an empty token is null', tokenLookup('', DIRECTORY, TOKENS), null);
  check('a whitespace token is null, never a match on a missing stored value',
    tokenLookup('   ', DIRECTORY, TOKENS), null);
  check('25 characters is null',
    tokenLookup(K01.slice(0, 25), DIRECTORY, TOKENS), null);
  check('27 characters is null', tokenLookup(K01 + '0', DIRECTORY, TOKENS), null);
  check('a token containing i is null',
    tokenLookup('i' + K01.slice(1), DIRECTORY, TOKENS), null);
  check('a token containing l is null',
    tokenLookup('l' + K01.slice(1), DIRECTORY, TOKENS), null);
  check('a token containing o is null',
    tokenLookup('o' + K01.slice(1), DIRECTORY, TOKENS), null);
  check('a token containing u is null',
    tokenLookup('u' + K01.slice(1), DIRECTORY, TOKENS), null);
  check('resolution is case insensitive after trim',
    (function () { const r = tokenLookup('  ' + K01.toUpperCase() + '  ', DIRECTORY, TOKENS); return r && r.key; })(),
    'K01');
}

console.log('\n15. Token generation (7.3)');
{
  const newToken = fn('IS9WD_newToken');
  const ALPHA = '0123456789abcdefghjkmnpqrstvwxyz';
  const hex = '0123456789abcdef0123456789abcdef' + 'fedcba9876543210fedcba9876543210';

  check('the alphabet has no i, l, o or u', ALPHA.length, 32);

  const t = newToken(hex);
  check('the token is 26 characters', String(t).length, 26);
  check('and holds only alphabet symbols',
    /^[0-9a-hjkmnp-tv-z]{26}$/.test(String(t)), true);

  let want = '';
  for (let i = 0; i < 26; i++) {
    want += ALPHA[parseInt(hex.substr(i * 2, 2), 16) % 32];
  }
  check('the mapping is the first 26 bytes modulo 32', t, want);
}

console.log('\n16. The undo window, enforced on the server (7.5)');
{
  const undoAllowed = fn('IS9WD_undoAllowed');
  const statusAt = new Date(2026, 8, 20, 19, 0, 0, 0);
  const at = function (secs) { return new Date(statusAt.getTime() + secs * 1000); };

  check('a member one second inside the window may untick',
    undoAllowed(statusAt, at(59), 60, 'member'), true);
  check('a member one second outside it may not',
    undoAllowed(statusAt, at(61), 60, 'member'), false);
  check('the boundary itself is outside',
    undoAllowed(statusAt, at(60), 60, 'member'), false);
  check('with the window at 0 no member link can untick anything',
    undoAllowed(statusAt, at(0), 0, 'member'), false);
  check('the admin ignores the window', undoAllowed(statusAt, at(864000), 60, 'admin'), true);
  check('the admin ignores a window of 0 too',
    undoAllowed(statusAt, at(864000), 0, 'admin'), true);
  check('a blank Status at refuses a member rather than allowing one',
    undoAllowed('', at(0), 60, 'member'), false);
}

// --- 17. dates on the wire -------------------------------------------------

console.log('\n17. Inbound and outbound dates (7.4)');
{
  const parseDate = fn('IS9WD_parseDate');
  const formatDate2 = fn('IS9WD_formatDate');

  const p = parseDate('2026-09-21');
  check('a parsed date is local midnight, never UTC midnight',
    [p.getFullYear(), p.getMonth(), p.getDate(), p.getHours(), p.getMinutes()],
    [2026, 8, 21, 0, 0]);
  check('the round trip is identical', formatDate2(parseDate('2026-09-21')), '2026-09-21');
  check('a year boundary round trips', formatDate2(parseDate('2027-01-03')), '2027-01-03');
  check('a single digit month and day are zero padded',
    formatDate2(d(2026, 1, 5)), '2026-01-05');
  check('an unpadded string is refused', parseDate('2026-9-1'), null);
  check('a text date is refused', parseDate('Sept 21'), null);
  check('a datetime string is refused', parseDate('2026-09-21 17:00'), null);
  check('an empty string is refused', parseDate(''), null);
}

// --- 18. server side validation -------------------------------------------

console.log('\n18. Validation repeats every sheet rule (7.5)');
{
  const validateItem = fn('IS9WD_validateItem');
  const good = {
    committee: 'Partnerships', title: 'Confirm speaker',
    deadline: '2026-09-21', remark: 'Send final name to Publication',
    status: 'Open',
  };
  function withField(k, v) {
    const o = {};
    Object.keys(good).forEach(function (key) { o[key] = good[key]; });
    o[k] = v;
    return o;
  }
  const f = function (payload) {
    const r = validateItem(payload, DIRECTORY, STATUS_LIST);
    return r.ok === true ? true : r.field;
  };

  check('a good payload passes', f(good), true);
  check('a 40 character title passes', f(withField('title', 'x'.repeat(40))), true);
  check('a 41 character title names the title field', f(withField('title', 'x'.repeat(41))),
    'title');
  check('an empty title names the title field', f(withField('title', '')), 'title');
  check('a 30 character remark passes', f(withField('remark', 'x'.repeat(30))), true);
  check('a 31 character remark names the remark field', f(withField('remark', 'x'.repeat(31))),
    'remark');
  check('a text deadline names the deadline field', f(withField('deadline', 'Sept 21')),
    'deadline');
  check('a deadline with a time component names the deadline field',
    f(withField('deadline', '2026-09-21 17:00')), 'deadline');
  check('a committee outside the directory names the committee field',
    f(withField('committee', 'Publication')), 'committee');
  check('a status outside the list names the status field',
    f(withField('status', 'Blocked')), 'status');
}

// --- 19. done keys and recipients -----------------------------------------

console.log('\n19. Done keys (8.2, 8.5)');
{
  const doneKey = fn('IS9WD_doneKey');
  check('a per recipient key is keyed on the directory key, not a page',
    doneKey('MONDAY_ASSIGNMENTS', '2026-09-21', 'K01'),
    'IS9WD_DONE_MONDAY_ASSIGNMENTS_2026-09-21_K01');
  check('a job level key has no recipient suffix',
    doneKey('SUNDAY_BRIEF', '2026-09-27'),
    'IS9WD_DONE_SUNDAY_BRIEF_2026-09-27');
  check('an office key works the same',
    doneKey('DAILY_DIGEST', '2026-09-22', 'K14'),
    'IS9WD_DONE_DAILY_DIGEST_2026-09-22_K14');
}

console.log('\n20. Recipient selection, all 14 in scope (8.5a, 8.5b)');
{
  const recipientsFor = fn('IS9WD_recipientsFor');
  const today = d(2026, 9, 20);

  function it(id, committee, deadline, status) {
    return {
      id: id, committee: committee, title: 'Item ' + id, deadline: deadline,
      remark: '', status: status || 'Open', active: (status || 'Open') !== 'Accomplished',
    };
  }

  const ITEMS = [
    it('D0001', 'Partnerships', d(2026, 9, 25)),
    it('D0002', 'Publications', d(2026, 9, 18)),
    it('D0003', 'Marketing and Advocacy', d(2026, 9, 21)),
    it('D0004', 'Documentation', d(2026, 9, 22), 'Accomplished'),
    it('D0005', 'President', d(2026, 9, 30)),
  ];

  const keys = function (jobKey) {
    return recipientsFor(jobKey, DIRECTORY, ITEMS, today)
      .map(function (r) { return r && r.key !== undefined ? r.key : r[0]; })
      .sort();
  };

  check('Monday mails every entry with an active item, including the President',
    keys('MONDAY_ASSIGNMENTS'), ['K01', 'K02', 'K03', 'K10']);
  check('the daily digest mails only overdue or due tomorrow',
    keys('DAILY_DIGEST'), ['K02', 'K03']);
  check('an officer with nothing due gets no digest',
    keys('DAILY_DIGEST').indexOf('K01'), -1);
  check('an officer with a future item gets no digest',
    keys('DAILY_DIGEST').indexOf('K10'), -1);
  check('an entry whose only item is accomplished gets nothing at all',
    keys('MONDAY_ASSIGNMENTS').indexOf('K08'), -1);
  check('an empty committee gets nothing',
    keys('MONDAY_ASSIGNMENTS').indexOf('K09'), -1);
  check('with no items nobody is mailed',
    recipientsFor('MONDAY_ASSIGNMENTS', DIRECTORY, [], today).length, 0);
  check('and the digest sends zero on a quiet day',
    recipientsFor('DAILY_DIGEST', DIRECTORY, [], today).length, 0);
}

// --- 21. the dash scan ----------------------------------------------------

console.log('\n21. No em dash and no en dash in any source file (10, 13.3)');
{
  // Built from code points, so this file can scan itself without matching itself.
  const EM = String.fromCharCode(0x2014), EN = String.fromCharCode(0x2013);
  const exts = ['.js', '.gs', '.json', '.html', '.ts', '.tsx', '.css'];
  const skipDirs = ['node_modules', '.git', 'dist', 'build'];
  const hits = [];
  let scanned = 0;

  function scan(full, label) {
    if (exts.indexOf(path.extname(full)) === -1) return;
    const text = fs.readFileSync(full, 'utf8');
    scanned++;
    if (text.indexOf(EM) !== -1) hits.push(label + ': em dash');
    if (text.indexOf(EN) !== -1) hits.push(label + ': en dash');
  }

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    entries.forEach(function (ent) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (skipDirs.indexOf(ent.name) === -1) walk(full);
        return;
      }
      scan(full, path.relative(ROOT, full).split(path.sep).join('/'));
    });
  }

  ['src', 'test', 'app', 'tools'].forEach(function (dir) { walk(path.join(ROOT, dir)); });
  try {
    fs.readdirSync(ROOT, { withFileTypes: true }).forEach(function (ent) {
      if (!ent.isDirectory()) scan(path.join(ROOT, ent.name), ent.name);
    });
  } catch (e) { /* nothing at the root is not a failure */ }

  // A scan that silently read nothing is a scan that reads green.
  check('the scan reached the core and this file at least', scanned >= 2, true);
  check('no source file carries an em dash or an en dash', hits, []);
}

// --- 22. the shipping configuration ---------------------------------------

// EVERY TEST ABOVE PASSES ITS OWN CAPACITY NUMBERS, which is the right way to test a
// formula and the wrong way to believe the workbook is configured. On 2026-09-28 the
// shipping numbers moved from nine publishers, ten slots and two pages to fourteen
// publishers, fifteen slots and one page, and not one assertion above changed or failed.
// So this section reads the real defaults out of IS9WD_Config.js and checks the shape the
// carousel actually ships with. It is the only section that would notice if somebody
// edited the roster or the capacity settings by hand.
console.log('\n22. The shipping configuration, read from IS9WD_Config.js (4.6, 4.8)');
{
  const CFG_FILE = path.join(ROOT, 'src', 'IS9WD_Config.js');
  if (!fs.existsSync(CFG_FILE)) {
    check('IS9WD_Config.js is present', false, true);
  } else {
    vm.runInContext(fs.readFileSync(CFG_FILE, 'utf8'), sandbox);
    const DIR = sandbox.IS9WD_DEFAULTS.DIRECTORY;
    const shipped = function (name) {
      for (const holder of [sandbox.IS9WD_CFG, sandbox.IS9WD_ENG]) {
        for (const key of Object.keys(holder)) {
          const block = holder[key];
          if (!block || !block.rows) continue;
          for (const row of block.rows) {
            if (row.name === name && row.value !== undefined) return row.value;
          }
        }
      }
      return null;
    };
    const SLOTS = num(shipped('IS9WD_SLOTS_PER_PAGE'));
    const PARTS = num(shipped('IS9WD_MAX_PARTS'));
    const publishing = DIR.filter(function (r) { return r[4] === true; });

    check('the roster holds fourteen officers', DIR.length, 14);
    check('all fourteen publish', publishing.length, 14);
    check('ten slots to a slide (Ethan, 2026-10-06)', SLOTS, 10);
    check('one slide an officer', PARTS, 1);

    // The ceiling a reader of 02 | Deliverables is promised.
    check('so the publishable maximum is ten', SLOTS * PARTS, 10);

    const orders = DIR.map(function (r) { return num(r[1]); }).sort(function (a, b) {
      return a - b;
    });
    const oneToFourteen = [];
    for (let i = 1; i <= 14; i++) oneToFourteen.push(i);
    check('the slide numbers are 1 to 14 with no gap and no duplicate',
      orders, oneToFourteen);

    // Hierarchy order and carousel order agree today, and the test says so out loud
    // rather than assuming it: they are two columns and a later administration may
    // want them to differ.
    check('and they agree with the hierarchy order, so the President leads',
      DIR.map(function (r) { return num(r[1]) - num(r[5]); }),
      DIR.map(function () { return 0; }));
    const president = DIR.filter(function (r) { return r[3] === 'PRESIDENT'; })[0];
    check('the President is slide number one', num(president[1]), 1);

    const masterPage = fn('IS9WD_masterPage');
    const pages = DIR.map(function (r) { return num(masterPage(r[1], 1, PARTS)); })
      .sort(function (a, b) { return a - b; });
    const twoToFifteen = [];
    for (let n = 2; n <= 15; n++) twoToFifteen.push(n);
    check('the fourteen officers own Canva pages 2 to 15', pages, twoToFifteen);
    check('page 1 is nobody, because it is the title page',
      pages.indexOf(1) < 0, true);
    check('and there is no second part for anyone, at any order',
      DIR.map(function (r) { return masterPage(r[1], 2, PARTS); }),
      DIR.map(function () { return null; }));

    const publishSplit = fn('IS9WD_publishSplit');
    const split = function (n) {
      const r = publishSplit(n, SLOTS, PARTS);
      return [num(r.parts), num(r.published), num(r.notPublished)];
    };
    check('ten items fit exactly', split(10), [1, 10, 0]);
    check('eleven shows ten and reports one', split(11), [1, 10, 1]);
    check('a quiet officer still gets a slide', split(0), [1, 0, 0]);

    // Ethan's ruling of 2026-09-28: the tagline prints the count that fit, so a reader
    // who counts the lines on the slide gets the number in the headline.
    const tagline = fn('IS9WD_tagline');
    check('the tagline prints the count that fit, not the count held',
      tagline(4, 'SEP 28 TO OCT 4', split(11)[1]),
      'WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 28 TO OCT 4  |  10 TASKS');

    const pagePlan = fn('IS9WD_pagePlan');
    const all14 = DIR.map(function (r) {
      return {
        carouselOrder: num(r[1]), committee: r[2], name: 'Person ' + pad2(num(r[1])),
        position: r[3], publishes: true, count: 3,
      };
    });
    const plan = pagePlan(all14, SLOTS, PARTS, true);
    check('the plan is fifteen rows, one per physical page', plan.length, 15);
    check('every page is used in an ordinary week',
      plan.filter(function (p) { return p.used; }).length, 15);
    check('and the export list is 1 to 15 ascending',
      plan.filter(function (p) { return p.used; })
        .map(function (p) { return num(p.page); }).join(','),
      '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15');
  }
}

// --- result ----------------------------------------------------------------

console.log('\n' + pass + ' passed, 0 failed\n');
process.exit(0);
