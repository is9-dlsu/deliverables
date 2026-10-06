// THE STATISTICS FORMULAS ANSWER ROW BY ROW.
//
// Written on 2026-10-06 after five findings on the live workbook: Avg days on 04 | Statistics
// was the President's total divided by each officer's own count, the trend's Weeks 01 to 04
// read "--", Weeks of row room left read 816 against a true figure near 44, the five
// executive cards on 05 | Officer Tables read PRESIDENT · PRESIDENT, and the dashboard's job
// flag needed checking for a false alarm. The first two had one cause: SUMIFS does not
// broadcast under ARRAYFORMULA in Sheets, so every row took the first row's answer.
//
// The formulas only run in Sheets, so this file carries a small evaluator for the subset of
// Sheets they use, with broadcasting the way Sheets does it, and with SUMIFS modelled the way
// it was measured on the live sheet: one scalar from the first element of an array criterion.
// The evaluator is checked against the old formulas first, so it is known to reproduce the
// live symptoms before it is trusted to clear the new ones.
//
//   node test/fix-stats.test.js

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const box = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
  Logger: { log: () => {} } };
box.globalThis = box;
vm.createContext(box);
for (const f of ['IS9WD_Core.js', 'IS9WD_Config.js', 'IS9WD_Stats.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), box, { filename: f });
}

let pass = 0;
let failed = 0;
function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log('  ok  ' + label); return; }
  failed++;
  console.log('  FAIL  ' + label + '\n        expected ' + JSON.stringify(expected) + '\n        actual   ' + JSON.stringify(actual));
}

// ---------------------------------------------------------------------------
//  a fake sheet that records every formula a builder writes
// ---------------------------------------------------------------------------

function recorder() {
  const writes = [];
  const sheet = {
    getRange(row, col) {
      const range = new Proxy({}, {
        get(_, method) {
          return (arg) => {
            if (method === 'setFormula') writes.push({ row, col, formula: arg });
            return range;
          };
        }
      });
      return range;
    }
  };
  return { sheet, at: (row, col) => (writes.find((w) => w.row === row && w.col === col) || {}).formula };
}

// ---------------------------------------------------------------------------
//  the evaluator
// ---------------------------------------------------------------------------

class Mat { constructor(v) { this.v = v; } get rows() { return this.v.length; } get cols() { return this.v[0].length; } }
const col = (list) => new Mat(list.map((x) => [x]));
const ERR = (code) => ({ err: code });
const isErr = (x) => x !== null && typeof x === 'object' && !(x instanceof Mat) && 'err' in x;

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ') { i++; continue; }
    if (ch === '"') {
      let s = '';
      i++;
      for (;;) {
        if (src[i] === '"' && src[i + 1] === '"') { s += '"'; i += 2; continue; }
        if (src[i] === '"') { i++; break; }
        s += src[i++];
      }
      out.push({ t: 'str', v: s });
      continue;
    }
    const num = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (num) { out.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const id = /^[A-Za-z_$][A-Za-z0-9_$.]*/.exec(src.slice(i));
    if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    const op = /^(<=|>=|<>|[-+*/&=<>(),])/.exec(src.slice(i));
    if (!op) throw new Error('cannot tokenize at ' + src.slice(i, i + 20));
    out.push({ t: 'op', v: op[0] });
    i += op[0].length;
  }
  return out;
}

function parse(src) {
  const tk = tokenize(src.replace(/^=/, ''));
  let p = 0;
  const peek = () => tk[p];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const take = (v) => { if (!isOp(v)) throw new Error('expected ' + v + ' at token ' + p + ' in ' + src); p++; };
  function binary(next, ops) {
    return function () {
      let left = next();
      while (peek() && peek().t === 'op' && ops.includes(peek().v)) {
        const op = tk[p++].v;
        left = { k: 'bin', op, a: left, b: next() };
      }
      return left;
    };
  }
  function unary() {
    if (isOp('-') || isOp('+')) { const op = tk[p++].v; return { k: 'un', op, a: unary() }; }
    return primary();
  }
  function primary() {
    const t = tk[p++];
    if (!t) throw new Error('unexpected end of ' + src);
    if (t.t === 'num') return { k: 'lit', v: t.v };
    if (t.t === 'str') return { k: 'lit', v: t.v };
    if (t.t === 'op' && t.v === '(') { const e = compare(); take(')'); return e; }
    if (t.t === 'id') {
      if (t.v === 'TRUE' || t.v === 'FALSE') return { k: 'lit', v: t.v === 'TRUE' };
      if (isOp('(')) {
        p++;
        const args = [];
        if (!isOp(')')) {
          for (;;) {
            if (isOp(',') || isOp(')')) args.push({ k: 'lit', v: null });
            else args.push(compare());
            if (isOp(',')) { p++; continue; }
            break;
          }
        }
        take(')');
        return { k: 'fn', name: t.v.toUpperCase(), args };
      }
      return { k: 'name', v: t.v };
    }
    throw new Error('unexpected ' + JSON.stringify(t) + ' in ' + src);
  }
  const mul = binary(unary, ['*', '/']);
  const add = binary(mul, ['+', '-']);
  const concat = binary(add, ['&']);
  const compare = binary(concat, ['=', '<>', '<', '>', '<=', '>=']);
  const tree = compare();
  if (p !== tk.length) throw new Error('trailing tokens in ' + src);
  return tree;
}

// Elementwise over any mix of scalars and matrices, broadcasting a 1 wide or 1 tall side
// the way Sheets does, so a column against a row is a full grid.
function map(fn, ...args) {
  let rows = 1;
  let cols = 1;
  let any = false;
  for (const a of args) {
    if (!(a instanceof Mat)) continue;
    any = true;
    if (a.rows > 1) { if (rows > 1 && rows !== a.rows) return ERR('#VALUE!'); rows = a.rows; }
    if (a.cols > 1) { if (cols > 1 && cols !== a.cols) return ERR('#VALUE!'); cols = a.cols; }
  }
  if (!any) return fn(...args);
  const out = [];
  for (let r = 0; r < rows; r++) {
    const line = [];
    for (let c = 0; c < cols; c++) {
      line.push(fn(...args.map((a) => (a instanceof Mat ? a.v[a.rows > 1 ? r : 0][a.cols > 1 ? c : 0] : a))));
    }
    out.push(line);
  }
  return new Mat(out);
}
const flat = (x) => (x instanceof Mat ? [].concat(...x.v) : [x]);
const first = (x) => (x instanceof Mat ? x.v[0][0] : x);

function num(x) {
  if (isErr(x)) return x;
  if (x === null) return 0;
  if (typeof x === 'boolean') return x ? 1 : 0;
  if (typeof x === 'number') return x;
  if (x === '') return 0;
  const n = Number(x);
  return isNaN(n) ? ERR('#VALUE!') : n;
}
const str = (x) => (x === null ? '' : typeof x === 'boolean' ? (x ? 'TRUE' : 'FALSE') : String(x));
function rank(x) { return typeof x === 'number' ? 0 : typeof x === 'string' ? 1 : 2; }
function cmp(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) a = typeof b === 'number' ? 0 : typeof b === 'boolean' ? false : '';
  if (b === null) b = typeof a === 'number' ? 0 : typeof a === 'boolean' ? false : '';
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === 'string') { a = a.toLowerCase(); b = b.toLowerCase(); }
  if (typeof a === 'boolean') { a = a ? 1 : 0; b = b ? 1 : 0; }
  return a < b ? -1 : a > b ? 1 : 0;
}

function binop(op, a, b) {
  return map((x, y) => {
    if (isErr(x)) return x;
    if (isErr(y)) return y;
    if (op === '&') return str(x) + str(y);
    if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
      const c = cmp(x, y);
      return { '=': c === 0, '<>': c !== 0, '<': c < 0, '>': c > 0, '<=': c <= 0, '>=': c >= 0 }[op];
    }
    const m = num(x);
    const n = num(y);
    if (isErr(m)) return m;
    if (isErr(n)) return n;
    if (op === '+') return m + n;
    if (op === '-') return m - n;
    if (op === '*') return m * n;
    if (n === 0) return ERR('#DIV/0!');
    return m / n;
  }, a, b);
}

// A COUNTIF style criterion against one cell.
function matches(cell, crit) {
  if (typeof crit === 'boolean') return cell === crit;
  if (typeof crit === 'number') return typeof cell === 'number' && cell === crit;
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(str(crit));
  const op = m[1] || '';
  const operand = m[2];
  const blank = cell === null || cell === '';
  if (op === '<>' && operand === '') return !blank;
  if (op === '=' && operand === '') return blank;
  const n = operand !== '' && !isNaN(Number(operand)) ? Number(operand) : null;
  if (op === '' || op === '=') {
    if (n !== null && typeof cell === 'number') return cell === n;
    if (typeof cell !== 'string') return false;
    const re = new RegExp('^' + operand.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\?/g, '.').replace(/\*/g, '.*') + '$', 'i');
    return re.test(cell);
  }
  if (op === '<>') return !matches(cell, operand);
  if (n === null || typeof cell !== 'number') return false;
  return { '<': cell < n, '>': cell > n, '<=': cell <= n, '>=': cell >= n }[op];
}
function countIfs(pairs) {
  const len = flat(pairs[0][0]).length;
  let total = 0;
  for (let i = 0; i < len; i++) if (pairs.every(([range, crit]) => matches(flat(range)[i], crit))) total++;
  return total;
}

const FN = {
  ARRAYFORMULA: (x) => x,
  IF: (c, a, b) => map((x, y, z) => {
    if (isErr(x)) return x;
    if (typeof x === 'string' && x !== '') return ERR('#VALUE!');
    return num(x) ? y : (z === undefined ? false : z);
  }, c, a, b === undefined ? false : b),
  IFERROR: (x, alt) => map((v, a) => (isErr(v) ? (a === null ? '' : a) : v), x, alt === undefined ? null : alt),
  ISNUMBER: (x) => map((v) => typeof v === 'number', x),
  N: (x) => map((v) => (isErr(v) ? v : typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0), x),
  INT: (x) => map((v) => { const n = num(v); return isErr(n) ? n : Math.floor(n); }, x),
  ROUND: (x, d) => map((v, k) => { const n = num(v); if (isErr(n)) return n; const f = Math.pow(10, num(k)); return Math.round(n * f) / f; }, x, d),
  ROWS: (m) => (m instanceof Mat ? m.rows : 1),
  MAX: (...a) => { const ns = [].concat(...a.map(flat)).filter((v) => typeof v === 'number'); return ns.length ? Math.max(...ns) : 0; },
  MIN: (...a) => { const ns = [].concat(...a.map(flat)).filter((v) => typeof v === 'number'); return ns.length ? Math.min(...ns) : 0; },
  TRANSPOSE: (m) => (m instanceof Mat ? new Mat(m.v[0].map((_, c) => m.v.map((row) => row[c]))) : m),
  MMULT: (a, b) => {
    if (!(a instanceof Mat) || !(b instanceof Mat) || a.cols !== b.rows) return ERR('#VALUE!');
    for (const v of flat(a).concat(flat(b))) if (typeof v !== 'number') return ERR('#VALUE!');
    return new Mat(a.v.map((row) => b.v[0].map((_, c) => row.reduce((s, x, k) => s + x * b.v[k][c], 0))));
  },
  // These three broadcast over an array criterion, as measured on the live sheet.
  COUNTIF: (range, crit) => map((c) => countIfs([[range, c]]), crit),
  COUNTIFS: (...a) => map((...crits) => countIfs(crits.map((c, i) => [a[2 * i], c])), ...a.filter((_, i) => i % 2 === 1)),
  SUMIF: (range, crit, sum) => map((c) => {
    const keys = flat(range);
    const vals = flat(sum === undefined ? range : sum);
    let total = 0;
    for (let i = 0; i < keys.length; i++) {
      if (!matches(keys[i], c)) continue;
      if (isErr(vals[i])) return vals[i];
      if (typeof vals[i] === 'number') total += vals[i];
    }
    return total;
  }, crit),
  // And this one does not: one scalar, from the first element of each criterion. That is
  // what Avg days and the trend lookup did on 2026-10-06.
  SUMIFS: (sum, ...a) => {
    const pairs = [];
    for (let i = 0; i < a.length; i += 2) pairs.push([a[i], first(a[i + 1])]);
    const vals = flat(sum);
    let total = 0;
    for (let i = 0; i < vals.length; i++) {
      if (pairs.every(([range, crit]) => matches(flat(range)[i], crit)) && typeof vals[i] === 'number') total += vals[i];
    }
    return total;
  },
  INDEX: (m, r, c) => {
    if (!(m instanceof Mat)) return m;
    const row = num(first(r));
    const cc = c === undefined || c === null ? 1 : num(first(c));
    if (isErr(row)) return row;
    if (row < 1 || row > m.rows || cc < 1 || cc > m.cols) return ERR('#REF!');
    return m.v[row - 1][cc - 1];
  },
  UPPER: (x) => map((v) => (isErr(v) ? v : str(v).toUpperCase()), x),
  LOWER: (x) => map((v) => (isErr(v) ? v : str(v).toLowerCase()), x),
  TRIM: (x) => map((v) => (isErr(v) ? v : str(v).trim().replace(/ +/g, ' ')), x),
  TEXT: (x, f) => map((v, fmt) => {
    const n = num(v);
    if (isErr(n)) return n;
    if (!/^0+$/.test(fmt)) throw new Error('TEXT format ' + fmt + ' is not modelled');
    return String(Math.round(n)).padStart(fmt.length, '0');
  }, x, f),
  SEARCH: (needle, hay) => map((n, h) => {
    if (isErr(h)) return h;
    const at = str(h).toLowerCase().indexOf(str(n).toLowerCase());
    return at < 0 ? ERR('#VALUE!') : at + 1;
  }, needle, hay),
  SEQUENCE: (rows, cols, start, step) => {
    const out = [];
    let v = start === undefined ? 1 : start;
    for (let r = 0; r < rows; r++) {
      const line = [];
      for (let c = 0; c < (cols || 1); c++) { line.push(v); v += step === undefined ? 1 : step; }
      out.push(line);
    }
    return new Mat(out);
  }
};

function evaluate(formula, names) {
  function ev(node) {
    if (node.k === 'lit') return node.v;
    if (node.k === 'name') {
      if (!Object.prototype.hasOwnProperty.call(names, node.v)) throw new Error('no fixture for the name ' + node.v);
      return names[node.v];
    }
    if (node.k === 'un') return node.op === '-' ? map((v) => { const n = num(v); return isErr(n) ? n : -n; }, ev(node.a)) : ev(node.a);
    if (node.k === 'bin') return binop(node.op, ev(node.a), ev(node.b));
    const fn = FN[node.name];
    if (!fn) throw new Error('the evaluator does not model ' + node.name);
    return fn(...node.args.map(ev));
  }
  return ev(parse(formula));
}
const column = (x) => (x instanceof Mat ? x.v.map((row) => row[0]) : [x]);
const round2 = (list) => list.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v));

// Serial dates the way Sheets counts them.
const day = (iso) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) -
  Date.UTC(1899, 11, 30)) / 86400000);

// ---------------------------------------------------------------------------
//  1. Avg days, column K of the by officer table
// ---------------------------------------------------------------------------

const statsLayout = box.IS9WD_stats_();
const officers = recorder();
box.IS9WD_statsOfficers_(officers.sheet, statsLayout);
const avgDays = officers.at(statsLayout.officerFirst, statsLayout.officerCol + 10);
check('Avg days is the column that reads Created at', /IS9WD_DEL_CREATED_AT/.test(avgDays || ''), true);
check('Avg days no longer uses SUMIFS', /SUMIFS\(/.test(avgDays || ''), false);

// Six officer rows, the last two the unused tail. Placeholder offices, no person's name.
const t0 = day('2026-09-21');
const avgNames = {
  IS9WD_STATS_OFF_NAME: col(['President', 'EVP for Internals', 'EVP for Externals', 'Finance', '', '']),
  IS9WD_DEL_COMMITTEE: col(['President', 'EVP for Internals', 'EVP for Internals', 'President', 'Finance',
    'EVP for Externals', 'President', null, null]),
  IS9WD_DEL_TITLE: col(['Task A', 'Task B', 'Task C', 'Task D', 'Task E', '', 'Task G', '', '']),
  IS9WD_DEL_ACTIVE: col([false, false, true, false, true, false, false, '', '']),
  // D was typed by hand, so it has no Created at; G carries a hand typed word for Status at.
  IS9WD_DEL_CREATED_AT: col([t0 + 0.10, t0 + 1, t0 + 1, null, null, t0, t0, null, null]),
  IS9WD_DEL_STATUS_AT: col([t0 + 1.45, t0 + 3.08, t0 + 2, t0 + 4, null, t0 + 1, 'yesterday', null, null])
};

// The old formula, as it shipped, to prove the evaluator reproduces what the live sheet showed.
const name = 'IS9WD_STATS_OFF_NAME';
const filt = 'IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,FALSE,IS9WD_DEL_TITLE,"<>",' +
  'IS9WD_DEL_CREATED_AT,">0",IS9WD_DEL_STATUS_AT,">0"';
const oldAvg = '=ARRAYFORMULA(IF(' + name + '="","",IFERROR((SUMIFS(IS9WD_DEL_STATUS_AT,' + filt + ')' +
  '-SUMIFS(IS9WD_DEL_CREATED_AT,' + filt + '))/COUNTIFS(' + filt + '),"")))';
check('model: the old Avg days gave the EVP the President\'s 1.35',
  round2(column(evaluate(oldAvg, avgNames))), [1.35, 1.35, '', '', '', '']);
check('Avg days answers each officer from their own rows',
  round2(column(evaluate(avgDays, avgNames))), [1.35, 2.08, '', '', '', '']);

// ---------------------------------------------------------------------------
//  2. The trend's trimester start, and the Week column it feeds
// ---------------------------------------------------------------------------

const viewsLayout = box.IS9WD_views_();
const views = recorder();
box.IS9WD_viewsTrend_(views.sheet, viewsLayout);
const mondayF = views.at(viewsLayout.trendFirst, 1);
const termF = views.at(viewsLayout.trendFirst, 2);
check('the trend term start no longer uses SUMIFS', /SUMIFS\(/.test(termF || ''), false);

const stats = recorder();
box.IS9WD_statsTrend_(stats.sheet, statsLayout);
const weekF = stats.at(statsLayout.trendFirst, statsLayout.trendCol);
check('the Week column reads the trend term start', /IS9WD_STATS_TRENDTERM/.test(weekF || ''), true);

const terms = {
  IS9WD_TERM_STARTS: col([day('2026-09-07'), day('2027-01-04'), 'TBA']),
  IS9WD_TERM_ENDS: col([day('2026-12-13'), day('2027-04-18'), null])
};
function trend(weekStart, termFormula) {
  const mondays = evaluate(mondayF, { IS9WD_WEEK_START: day(weekStart) });
  const starts = evaluate(termFormula, Object.assign({ IS9WD_STATS_TRENDMONDAY: mondays }, terms));
  const weeks = evaluate(weekF, { IS9WD_STATS_TRENDMONDAY: mondays, IS9WD_STATS_TRENDTERM: starts });
  return { starts: column(starts), weeks: column(weeks) };
}
const oldTerm = '=ARRAYFORMULA(IF(IS9WD_STATS_TRENDMONDAY="","",SUMIFS(IS9WD_TERM_STARTS,' +
  'IS9WD_TERM_STARTS,"<="&IS9WD_STATS_TRENDMONDAY,IS9WD_TERM_ENDS,">="&IS9WD_STATS_TRENDMONDAY)))';
check('model: the old lookup read "--" for Weeks 01 to 04',
  trend('2026-10-05', oldTerm).weeks, ['--', '--', '--', '--', '--', '--', '--', '--']);
check('the week of 2026-10-05: four weeks before Term 1, then Weeks 01 to 04',
  trend('2026-10-05', termF).weeks, ['--', '--', '--', '--', '01', '02', '03', '04']);
const s1 = day('2026-09-07');
const s2 = day('2027-01-04');
check('across the break each Monday numbers against its own trimester',
  trend('2027-01-18', termF).starts, [s1, s1, s1, 0, 0, 0, s2, s2]);
check('and the Week column says so',
  trend('2027-01-18', termF).weeks, ['12', '13', '14', '--', '--', '--', '01', '02']);

// ---------------------------------------------------------------------------
//  3. Weeks of row room left
// ---------------------------------------------------------------------------

const room = box.IS9WD_statsHealthSpec_()['H.ROOM'];
check('the room rate no longer reads Created at', /IS9WD_DEL_CREATED_AT/.test(room.value), false);
function roomWith(ids, archive, today, starts) {
  const del = [];
  for (let i = 0; i < 2000; i++) del.push(i < ids ? 'D' + String(i + 1).padStart(4, '0') : null);
  const src = [];
  const at = [];
  for (let i = 0; i < 1000; i++) { src.push(archive[i] ? archive[i][0] : null); at.push(archive[i] ? archive[i][1] : null); }
  return evaluate(room.value, {
    IS9WD_DEL_ID: col(del), IS9WD_ARC_SOURCE: col(src), IS9WD_ARC_STATUS_AT: col(at),
    IS9WD_TERM_STARTS: col(starts), IS9WD_EFFECTIVE_TODAY: day(today)
  });
}
const termCol = [day('2026-09-07'), null, null];
// 172 typed rows, none of them stamped Created at, 29 days into Term 1: 1,828 free rows at
// 41.5 a week. The old formula saw no Created at and floored the rate at 1 a week.
const oldRoom = '=IFERROR(ROUND((ROWS(IS9WD_DEL_ID)-COUNTIF(IS9WD_DEL_ID,"?*"))' +
  '/MAX(1,COUNTIFS(IS9WD_DEL_CREATED_AT,">="&IS9WD_EFFECTIVE_TODAY-28)/4),0),"!ERR")';
const typed = [];
for (let i = 0; i < 2000; i++) typed.push(i < 172 ? 'D' + String(i + 1).padStart(4, '0') : null);
check('model: the old rate never saw a typed row and read every free row as a week',
  evaluate(oldRoom, { IS9WD_DEL_ID: col(typed), IS9WD_DEL_CREATED_AT: col(Array(2000).fill(null)),
    IS9WD_EFFECTIVE_TODAY: day('2026-10-06') }), 1828);
check('172 typed rows four weeks in leave about 44 weeks',
  roomWith(172, [], '2026-10-06', termCol), 44);
const archive = [];
for (let i = 0; i < 40; i++) archive.push([box.IS9WD_ARCHIVE.SOURCE_RETIRED, day('2026-09-20') + 0.5]);
for (let i = 0; i < 10; i++) archive.push([box.IS9WD_ARCHIVE.SOURCE_RETIRED, day('2026-05-01')]);
for (let i = 0; i < 30; i++) archive.push([box.IS9WD_ARCHIVE.SOURCE_SNAPSHOT, day('2026-09-26')]);
check('a row retired this year counts as used; last year\'s and a snapshot do not',
  roomWith(172, archive, '2026-10-06', termCol), 36);
check('before the term starts, the elapsed floor of one week holds',
  roomWith(172, [], '2026-09-01', termCol), 11);
check('an empty data tab floors the rate at one row a week',
  roomWith(0, [], '2026-10-06', termCol), 2000);

// ---------------------------------------------------------------------------
//  4. The card heading on 05 | Officer Tables
// ---------------------------------------------------------------------------

const ot = box.IS9WD_officerTables_();
const block = ot.blocks[0];
const cards = recorder();
box.IS9WD_otBlockValues_(cards.sheet, ot, block);
const bandF = cards.at(block.bandRow, block.firstCol);
const SEP = box.IS9WD_SEP;
function band(office, position) {
  const names = {
    IS9WD_STATS_OFF_NAME: col([office].concat(Array(13).fill('Office'))),
    IS9WD_STATS_OFF_POSITION: col([position].concat(Array(13).fill('Vice President'))),
    IS9WD_STATS_OFF_VP: col(['Officer One'].concat(Array(13).fill('Officer'))),
    IS9WD_STATS_OFF_ACTIVE_ALL: col([3].concat(Array(13).fill(0))),
    IS9WD_STATS_OFF_DONE_ALL: col([2].concat(Array(13).fill(0))),
    IS9WD_STATS_OFF_OVERDUE: col([1].concat(Array(13).fill(0))),
    IS9WD_STATS_OFF_NOTPUB: col([0].concat(Array(13).fill(0))),
    IS9WD_STATS_OFF_TOTAL: col([5].concat(Array(13).fill(0))),
    IS9WD_OT_ROWS_BUILT: 16
  };
  names[box.IS9WD_statsRef_(block.keyCol, block.bandRow)] = 1;
  return evaluate(bandF, names);
}
const tail = SEP + 'Officer One' + SEP + '3 to do' + SEP + '2 done' + SEP + '1 overdue';
check('an executive office is printed once', band('President', 'President'),
  '01 of 14' + SEP + 'PRESIDENT' + tail);
check('a capital or a stray space does not bring the repeat back', band('President', ' president '),
  '01 of 14' + SEP + 'PRESIDENT' + tail);
check('a committee keeps its office and its position', band('Finance', 'Vice President'),
  '01 of 14' + SEP + 'FINANCE' + SEP + 'VICE PRESIDENT' + tail);

// ---------------------------------------------------------------------------
//  5. The job flag on 00 | Dashboard cannot fire on a clean run
// ---------------------------------------------------------------------------

// The lines are the shapes IS9WD_autoWriteStatus_ records: the last line of each job's
// report, with FAILED: in front only when the job threw or missed its window.
const jobs = box.IS9WD_dashJobRows_(null);
function flagFor(status) {
  const schedule = [];
  for (let r = 0; r < 5; r++) schedule.push([null, null, null, null, null, true, null, day('2026-10-05'), r === 0 ? status : null]);
  return evaluate(jobs[0].flag, { IS9WD_SCHEDULE: new Mat(schedule) });
}
check('a clean mail batch is not flagged', flagFor('Monday assignments: 12 sent.'), false);
check('a clean batch in test mode is not flagged',
  flagFor('Daily digest: 4 sent, 2 skipped, all to your own address because test mode is on.'), false);
check('a clean retire is not flagged', flagFor('3 items retired to 06 | Archive, 3 archive rows added.'), false);
check('a clean brief is not flagged', flagFor('Sunday brief: sent to your own address.'), false);
check('a job that never ran is not flagged', flagFor(null), false);
check('a missed window is flagged', flagFor('FAILED: missed the window'), true);
check('a throw is flagged', flagFor('FAILED: failed: Exception: Lock timeout'), true);
check('a batch with a failed send is flagged', flagFor('Daily digest: 3 sent, 1 skipped, FAILED for x: bounced.'), true);

// ---------------------------------------------------------------------------
//  6. No SUMIFS anywhere in the statistics formulas
// ---------------------------------------------------------------------------

// SUMIFS hands every row of a broadcast the first row's answer. A single cell would be safe,
// but nothing here uses one, and a ban is easier to keep than a rule about where.
const code = fs.readFileSync(path.join(ROOT, 'src', 'IS9WD_Stats.js'), 'utf8')
  .split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
check('no formula in IS9WD_Stats.js calls SUMIFS', /SUMIFS\(/.test(code), false);

console.log('    statistics formulas: ' + pass + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
