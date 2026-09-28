/**
 * Node test for the two archive jobs: the pure helpers that decide what is written and
 * what is cleared, then both jobs end to end against a fake sheet, against reference 10.1
 * and the trend block in 6A.9.
 *
 *   node test/archive.test.js
 *
 * WHY THE HELPERS ARE PURE. IS9WD_archiveSnapshotRows_, IS9WD_archiveRetiredRow_,
 * IS9WD_archiveIndex_, IS9WD_archiveMerge_, IS9WD_archiveFit_ and IS9WD_retireCandidates_
 * take plain values and reach no Apps Script global, so the shape of every row the trend
 * block reads is asserted here rather than discovered on 04 | Statistics on a Sunday.
 *
 * NO REAL NAME, NO REAL ADDRESS. Every fixture value is a placeholder that could not be
 * mistaken for a person, because this file is public.
 */

'use strict';

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['IS9WD_Core.js', 'IS9WD_Config.js', 'IS9WD_Log.js', 'IS9WD_Archive.js'];

const pad = (n) => (n < 10 ? '0' : '') + n;
const sandbox = {
  console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
  isNaN, parseInt, parseFloat,
  Logger: { log: () => {} },
  // What the Manila clock helpers in IS9WD_Config.js call.
  Utilities: { formatDate: (dt, tz, fmt) => {
    const y = dt.getFullYear(); const M = dt.getMonth() + 1; const D = dt.getDate();
    const H = dt.getHours(); const m = dt.getMinutes(); const sec = dt.getSeconds();
    if (fmt === 'yyyy-MM-dd') return y + '-' + pad(M) + '-' + pad(D);
    if (fmt === 'yyyy-MM-dd HH:mm') return y + '-' + pad(M) + '-' + pad(D) + ' ' + pad(H) + ':' + pad(m);
    return [y, M, D, H, m, sec].join(',');
  } },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), sandbox, { filename: f });
}

const fn = (name) => {
  const f = sandbox[name];
  if (typeof f !== 'function') throw new Error('missing ' + name);
  return f;
};

let pass = 0;
let failed = 0;
// A vm realm has its own Array and Object prototypes, so deepStrictEqual refuses two
// structurally identical values that crossed the boundary; the JSON round trip is the
// structural compare, and it is strict about everything else.
function check(label, actual, expected) {
  try {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) assert.deepStrictEqual(actual, expected);
    pass++;
    console.log('  ok  ' + label);
  } catch (e) {
    failed++;
    console.log('  FAIL  ' + label);
    console.log('        expected ' + JSON.stringify(expected));
    console.log('        actual   ' + JSON.stringify(actual));
  }
}
const has = (text, needle) => text.indexOf(needle) !== -1;
const d = (y, m, day, h, mi) => new Date(y, m - 1, day, h || 0, mi || 0);
const iso = (v) => fn('IS9WD_formatDate')(v);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LAYOUT = sandbox.IS9WD_ARCHIVE;
const COLS = fn('IS9WD_archiveCols_')(LAYOUT);
const SNAP = LAYOUT.SOURCE_SNAPSHOT;
const RET = LAYOUT.SOURCE_RETIRED;
const NOW = d(2026, 10, 3, 22, 5);

const item = (id, title, deadline, over) => Object.assign({
  id, title, deadline, remark: '', status: 'Open', statusAt: '', statusBy: '', active: true,
  published: true, committee: 'Partnerships', row: 10,
}, over || {});

const DIR = [
  { key: 'K10', committee: 'Office of the President', hierarchy: 1 },
  { key: 'K01', committee: 'Partnerships', hierarchy: 2 },
  { key: 'K02', committee: 'Finance', hierarchy: 3 },
];
const STATUSES = [{ name: 'Open', terminal: false }, { name: 'Accomplished', terminal: true }];
const TERMS = [{ name: 'Term 1', start: d(2026, 9, 7), end: d(2026, 12, 13) }];
const WEEK = { weekNumber: 4, weekStart: d(2026, 9, 28), preparedName: 'Sample Secretary', checkedName: 'Sample President' };

// A row of the archive tab, by header, everything else blank.
function arcRow(fields) {
  const row = [];
  for (let i = 0; i < LAYOUT.columns.length; i++) row.push('');
  for (const k of Object.keys(fields)) {
    if (!(k in COLS)) throw new Error('no archive column ' + k);
    row[COLS[k]] = fields[k];
  }
  return row;
}

// ---------------------------------------------------------------------------
console.log('\n1. The column map, the text guard and the key');
{
  const headers = LAYOUT.columns.map((c) => c.header);
  check('every header has an offset and the offsets are its position',
    headers.map((h) => COLS[h]), headers.map((h, i) => i));
  check('the six columns the trend reads sit where IS9WD_ARC_COL_NAMES says',
    Object.keys(sandbox.IS9WD_ARC_COL_NAMES).map((c) => Number(c)),
    ['Week start', 'Committee', 'Deadline', 'ID', 'Status at', 'Source'].map((h) => COLS[h] + LAYOUT.firstCol));
  const text = fn('IS9WD_archiveText_');
  check('a leading equals sign is defused with one space', text('=SUM(A1)'), ' =SUM(A1)');
  check('a plus, a minus and an at sign are left as typed', [text('+1 more'), text('-draft'), text('@venue')], ['+1 more', '-draft', '@venue']);
  check('a line break inside a title becomes a space', text('two\nlines'), 'two lines');
  check('null and undefined read as blank', [text(null), text(undefined)], ['', '']);
  check('the key is the Monday plus the ID', fn('IS9WD_archiveKey_')(d(2026, 9, 28), ' D-0001 '), '2026-09-28|D-0001');
  check('a text Monday keys the same as a Date one', fn('IS9WD_archiveKey_')('2026-09-28', 'D-0001'), '2026-09-28|D-0001');
}

// ---------------------------------------------------------------------------
console.log('\n2. The index over what the archive already holds');
{
  const index = fn('IS9WD_archiveIndex_');
  const values = [
    arcRow({ 'Week start': d(2026, 9, 21), 'ID': 'D-0001', 'Source': SNAP }),
    arcRow({ 'Week start': d(2026, 9, 21), 'ID': 'D-0002', 'Source': SNAP }),
    arcRow({}),
    arcRow({ 'Week start': '', 'ID': 'D-0002', 'Source': RET, 'Deadline': d(2026, 9, 22) }),
    arcRow({ 'Week start': d(2026, 9, 28), 'ID': 'D-0001', 'Source': SNAP }),
    arcRow({ 'Week start': d(2026, 9, 28), 'ID': 'D-0001', 'Source': SNAP }),
    arcRow({ 'Week start': d(2026, 9, 28), 'ID': '', 'Source': SNAP, 'Title of Task': 'no id' }),
    arcRow({}),
    arcRow({}),
  ];
  const out = index(values, LAYOUT);
  check('used counts up to the last filled row, holes included', out.used, 7);
  check('a snapshot row is keyed on its Monday and ID, first one wins',
    out.snapshot, { '2026-09-21|D-0001': 0, '2026-09-21|D-0002': 1, '2026-09-28|D-0001': 4 });
  check('a retired row is keyed on the ID alone', out.retired, { 'D-0002': 3 });
  check('an empty archive indexes to nothing', index([], LAYOUT), { snapshot: {}, retired: {}, used: 0 });
  check('a null read indexes to nothing', index(null, LAYOUT).used, 0);
}

// ---------------------------------------------------------------------------
console.log('\n3. The snapshot rows, which the trend counts as Published');
{
  const rows = fn('IS9WD_archiveSnapshotRows_');
  const items = [
    item('D-0005', 'Finance late', d(2026, 9, 30), { committee: 'Finance' }),
    item('D-0002', 'Second', d(2026, 9, 29)),
    item('D-0001', 'First', d(2026, 9, 29), { remark: 'Send to Publication', statusBy: 'K01' }),
    item('D-0003', 'Not on a slide', d(2026, 9, 29), { published: false }),
    item('D-0004', 'Ticked off', d(2026, 9, 29), { active: false, status: 'Accomplished', statusAt: d(2026, 9, 29, 9, 0) }),
    item('D-0006', '', d(2026, 9, 29)),
    item('D-0007', 'No id', d(2026, 9, 29), { id: '' }),
    item('D-0008', 'President item', d(2026, 10, 2), { committee: 'Office of the President' }),
    item('D-0009', 'Stray committee', d(2026, 10, 1), { committee: 'Nowhere' }),
  ];
  const out = rows(items, DIR, WEEK, NOW, LAYOUT);
  check('only active, titled, published items with an ID are archived, in hierarchy then rank order',
    out.map((r) => r[COLS['ID']]), ['D-0008', 'D-0001', 'D-0002', 'D-0005', 'D-0009']);
  check('every row is as wide as the layout', out.map((r) => r.length), out.map(() => LAYOUT.columns.length));
  const first = out[1];
  check('Week is the number and Week start is the Monday at midnight',
    [first[COLS['Week']], iso(first[COLS['Week start']]), first[COLS['Week start']].getHours()], [4, '2026-09-28', 0]);
  check('Deadline holds the real date, not the rendered text', iso(first[COLS['Deadline']]), '2026-09-29');
  check('the text columns', [first[COLS['Committee']], first[COLS['Title of Task']], first[COLS['Remarks']], first[COLS['Status']], first[COLS['Status by']]],
    ['Partnerships', 'First', 'Send to Publication', 'Open', 'K01']);
  check('Archived at is the clock handed in', first[COLS['Archived at']] === NOW, true);
  check('Source is the snapshot string from the layout, byte for byte', first[COLS['Source']], 'Published snapshot');
  check('the sign-off names ride on every row', [first[COLS['Prepared by']], first[COLS['Checked by']]], ['Sample Secretary', 'Sample President']);
  check('a blank sign-off leaves both blank rather than printing last week',
    (() => { const r = rows([items[2]], DIR, { weekNumber: 4, weekStart: d(2026, 9, 28) }, NOW, LAYOUT)[0]; return [r[COLS['Prepared by']], r[COLS['Checked by']]]; })(), ['', '']);
  check('a null week number reads blank', rows([items[2]], DIR, { weekNumber: null, weekStart: d(2026, 9, 28) }, NOW, LAYOUT)[0][COLS['Week']], '');
  check('no week start, no rows', rows(items, DIR, { weekNumber: 4, weekStart: null }, NOW, LAYOUT), []);
  check('a deadline that is not a date is archived as the text it is',
    rows([item('D-0010', 'Bad date', 'next week')], DIR, WEEK, NOW, LAYOUT)[0][COLS['Deadline']], 'next week');
  check('a stamp typed as text becomes a Date',
    iso(rows([item('D-0011', 'Stamped', d(2026, 9, 29), { statusAt: '2026-09-29 09:15' })], DIR, WEEK, NOW, LAYOUT)[0][COLS['Status at']]), '2026-09-29');
}

// ---------------------------------------------------------------------------
console.log('\n4. The retired row, which the trend counts as Accomplished');
{
  const retired = fn('IS9WD_archiveRetiredRow_');
  const it = item('D-0004', 'Ticked off', d(2026, 9, 30), {
    active: false, status: 'Accomplished', statusAt: d(2026, 9, 29, 9, 0), statusBy: 'K01', remark: 'Done early',
  });
  const r = retired(it, TERMS, NOW, LAYOUT);
  check('Week start is the Monday of the week the deadline fell in', iso(r[COLS['Week start']]), '2026-09-28');
  check('and Week is that Monday numbered against its own trimester', r[COLS['Week']], 4);
  check('Deadline and Status at are real dates, Status at with its time',
    [iso(r[COLS['Deadline']]), iso(r[COLS['Status at']]), r[COLS['Status at']].getHours()], ['2026-09-30', '2026-09-29', 9]);
  check('Source is the retired string from the layout, byte for byte', r[COLS['Source']], 'Retired');
  check('the sign-off columns are blank: retirement is not tied to a published week', [r[COLS['Prepared by']], r[COLS['Checked by']]], ['', '']);
  check('the text columns', [r[COLS['Committee']], r[COLS['Title of Task']], r[COLS['Remarks']], r[COLS['Status']], r[COLS['Status by']], r[COLS['ID']]],
    ['Partnerships', 'Ticked off', 'Done early', 'Accomplished', 'K01', 'D-0004']);
  const sunday = retired(item('D-0005', 'Sunday', d(2026, 10, 4), { active: false, status: 'Accomplished' }), TERMS, NOW, LAYOUT);
  check('a Sunday deadline belongs to the week that started the Monday before', [iso(sunday[COLS['Week start']]), sunday[COLS['Week']]], ['2026-09-28', 4]);
  const outside = retired(item('D-0006', 'Break', d(2026, 12, 21), { active: false, status: 'Accomplished' }), TERMS, NOW, LAYOUT);
  check('a deadline outside every term keeps its Monday and a blank week number', [iso(outside[COLS['Week start']]), outside[COLS['Week']]], ['2026-12-21', '']);
  const none = retired(item('D-0007', 'No date', '', { active: false, status: 'Accomplished' }), TERMS, NOW, LAYOUT);
  check('no deadline, no Monday and no week', [none[COLS['Week start']], none[COLS['Week']], none[COLS['Deadline']]], ['', '', '']);
}

// ---------------------------------------------------------------------------
console.log('\n5. Merge and fit');
{
  const merge = fn('IS9WD_archiveMerge_');
  const index = fn('IS9WD_archiveIndex_')([
    arcRow({ 'Week start': d(2026, 9, 28), 'ID': 'D-0001', 'Source': SNAP }),
    arcRow({ 'Week start': d(2026, 9, 21), 'ID': 'D-0002', 'Source': SNAP }),
  ], LAYOUT);
  const rows = fn('IS9WD_archiveSnapshotRows_')([
    item('D-0001', 'Again', d(2026, 9, 29)), item('D-0002', 'New this week', d(2026, 9, 30)), item('D-0002', 'Twice', d(2026, 9, 30)),
  ], DIR, WEEK, NOW, LAYOUT);
  const out = merge(index, rows, LAYOUT);
  check('a row the archive holds for this Monday is an update at its offset', out.update.map((u) => [u.offset, u.row[COLS['Title of Task']]]), [[0, 'Again']]);
  check('a row it holds for another Monday is a new row, and a duplicate in one run is written once',
    out.append.map((r) => r[COLS['Title of Task']]), ['New this week']);

  const fit = fn('IS9WD_archiveFit_');
  check('everything fits when there is room', fit(5, 10, 100, 20), { fits: 5, left: 0, freeAfter: 85, warn: false });
  check('the last rows of the span fill and the rest is left', fit(5, 98, 100, 20), { fits: 2, left: 3, freeAfter: 0, warn: true });
  check('a full span fits nothing', fit(5, 100, 100, 20), { fits: 0, left: 5, freeAfter: 0, warn: true });
  check('the warning fires when the free rows drop under the minimum', fit(1, 80, 100, 20), { fits: 1, left: 0, freeAfter: 19, warn: true });
  check('and not at exactly the minimum', fit(0, 80, 100, 20), { fits: 0, left: 0, freeAfter: 20, warn: false });
  check('nothing to write is nothing left', fit(0, 0, 100, 20).left, 0);
}

// ---------------------------------------------------------------------------
console.log('\n6. Which rows the retire job may act on');
{
  const cand = fn('IS9WD_retireCandidates_');
  const today = d(2026, 10, 3);
  const done = (id, statusAt, over) => item(id, 'T ' + id, d(2026, 9, 20), Object.assign({ active: false, status: 'Accomplished', statusAt }, over || {}));
  const list = [
    done('D-0001', d(2026, 9, 19, 8, 0)),
    done('D-0002', d(2026, 9, 19, 23, 59)),
    done('D-0003', d(2026, 9, 20, 0, 0)),
    done('D-0004', '2026-09-01 10:00'),
    done('D-0005', ''),
    done('D-0006', d(2026, 9, 1), { status: 'Done' }),
    done('D-0007', d(2026, 9, 1), { status: 'Open' }),
    done('D-0008', d(2026, 9, 1), { id: '' }),
    item('D-0009', 'Still open', d(2026, 9, 1), { statusAt: d(2026, 9, 1) }),
    done('D-0010', d(2026, 9, 1), { status: '' }),
  ];
  const out = cand(list, STATUSES, 14, today);
  check('due means the stamp is at least retireDays old, whole days, sorted like every list',
    out.due.map((i) => i.id), ['D-0001', 'D-0002', 'D-0004']);
  check('one day short of the age is not due', out.due.some((i) => i.id === 'D-0003'), false);
  check('a finished item with no stamp is held', out.noStamp.map((i) => i.id), ['D-0005']);
  check('a status the list does not know, or knows as not terminal, is held rather than cleared',
    out.unknownStatus.map((i) => i.id), ['D-0006', 'D-0007']);
  check('a finished row with no ID is held', out.noId.map((i) => i.id), ['']);
  check('an active row and a blank status are not candidates at all',
    [out.due, out.noStamp, out.unknownStatus, out.noId].some((l) => l.some((i) => i.id === 'D-0009' || i.id === 'D-0010')), false);
  check('retireDays 0 disables the job', cand(list, STATUSES, 0, today), { due: [], noId: [], noStamp: [], unknownStatus: [] });
  check('no clock, nothing due', cand(list, STATUSES, 14, null).due, []);
  check('the status list may be the raw pairs', cand([list[0]], [['Open', false], ['Accomplished', true]], 14, today).due.map((i) => i.id), ['D-0001']);
}

// ---------------------------------------------------------------------------
console.log('\n7. The re-take sentence, true on any day of the week');
{
  const retake = fn('IS9WD_archiveRetake_');
  const line = retake(d(2026, 9, 28), '');
  check('it names the override by its own label on the configuration tab, to the Saturday of that week',
    [has(line, 'Pretend today is a different date'), has(line, sandbox.IS9WD_TAB.CONFIG), has(line, 'Saturday 2026-10-03')], [true, true, true]);
  check('it ends by clearing the override, because every job is paused while it is set',
    has(line, 'then clear the override, because every job is paused while it is set.'), true);
  const stepped = retake('2026-09-28', 'refresh the admin page and set the sign-off there');
  check('a step between the override and the run lands after the override and before the run',
    stepped.indexOf('Saturday 2026-10-03') < stepped.indexOf('refresh the admin page')
      && stepped.indexOf('refresh the admin page') < stepped.indexOf('Archive this week'), true);
  check('no Monday, no sentence', [retake(null, ''), retake('', 'x')], ['', '']);
  check('the week label reads the same in a report, a Log row and an error',
    fn('IS9WD_archiveWeekLabel_')({ weekNumber: 4, weekStart: d(2026, 9, 28) }), 'Week 04 (Monday 2026-09-28)');
}

// ---------------------------------------------------------------------------
console.log('\n8. Both jobs end to end, against a fake sheet');
{
  // The fake sheet: a grid, the five range methods the module uses, and nothing else.
  function fakeSheet(maxRows, cols) {
    const grid = [];
    for (let r = 0; r < maxRows; r++) grid.push(new Array(cols).fill(''));
    const filled = (v) => v !== '' && v !== null && v !== undefined;
    return {
      grid,
      getMaxRows: () => grid.length,
      getMaxColumns: () => cols,
      insertRowsAfter: (after, n) => { for (let i = 0; i < n; i++) grid.splice(after + i, 0, new Array(cols).fill('')); },
      insertColumnsAfter: () => { throw new Error('the fake has enough columns'); },
      getLastRow: () => { let last = 0; grid.forEach((row, i) => { if (row.some(filled)) last = i + 1; }); return last; },
      getRange: (r, c, nr, nc) => ({
        getRow: () => r, getNumRows: () => nr || 1,
        getValues: () => grid.slice(r - 1, r - 1 + (nr || 1)).map((row) => row.slice(c - 1, c - 1 + (nc || 1))),
        setValues: (vals) => {
          if (vals.length !== (nr || 1)) throw new Error('setValues height ' + vals.length + ' vs ' + nr);
          vals.forEach((v, i) => {
            if (v.length !== (nc || 1)) throw new Error('setValues width ' + v.length + ' vs ' + nc);
            if (r - 1 + i >= grid.length) throw new Error('write past the grid at row ' + (r + i));
            v.forEach((x, j) => { grid[r - 1 + i][c - 1 + j] = x; });
          });
        },
        clearContent: () => { for (let i = 0; i < (nr || 1); i++) for (let j = 0; j < (nc || 1); j++) grid[r - 1 + i][c - 1 + j] = ''; },
      }),
    };
  }
  const WIDTH = LAYOUT.columns.length;
  const FIRST = LAYOUT.firstRow;
  const arcRows = (sheet) => sheet.grid.slice(FIRST - 1).filter((row) => row.some((v) => v !== ''));

  // The impure edges, all stubbed in the sandbox: the sheet, the span, the item reader,
  // the row clearer, the log, the two resets, the lock and the clock.
  const state = { archive: null, items: [], cleared: [], logged: [], resets: 0, configResets: 0, flushes: 0 };
  sandbox.SpreadsheetApp = { flush: () => { state.flushes++; } };
  sandbox.LockService = { getDocumentLock: () => ({ hasLock: () => true, tryLock: () => true, releaseLock: () => {} }) };
  sandbox.IS9WD_sheet_ = (key) => { if (key === 'ARCHIVE') return state.archive; if (key === 'ITEMS') return { name: 'items' }; throw new Error('no tab ' + key); };
  sandbox.IS9WD_namedOrNull_ = () => null;
  sandbox.IS9WD_readItems_ = () => ({ rows: state.items, usedRows: state.items.length });
  sandbox.IS9WD_itemsClearRow_ = (sheet, row) => { state.cleared.push(row); };
  sandbox.IS9WD_itemsCacheReset_ = () => { state.resets++; };
  sandbox.IS9WD_configReset_ = () => { state.configResets++; };
  sandbox.IS9WD_logRow_ = (row) => { state.logged.push(row); return true; };
  sandbox.IS9WD_nowManila_ = () => NOW;
  sandbox.IS9WD_todayManila_ = () => d(2026, 10, 3);

  const savedLast = LAYOUT.lastRow;
  const savedMin = LAYOUT.minFreeRows;
  const spanOf = (rows, minFree) => { LAYOUT.lastRow = FIRST + rows - 1; LAYOUT.minFreeRows = minFree; };
  const reset = (rows, minFree) => {
    spanOf(rows, minFree);
    state.archive = fakeSheet(FIRST + rows - 1, WIDTH);
    state.items = []; state.cleared = []; state.logged = []; state.resets = 0; state.configResets = 0; state.flushes = 0;
  };
  const cfgOf = (over) => Object.assign({
    weeks: { weekNumber: 4, weekStart: d(2026, 9, 28), inTerm: true },
    signoff: { current: { set: true, preparedName: 'Sample Secretary', checkedName: 'Sample President' }, preparedName: '', checkedName: '' },
    directory: { inHierarchy: DIR, rows: DIR },
    switches: { retireDays: 14 },
    statuses: { rows: STATUSES },
    terms: { rows: TERMS },
  }, over || {});
  const last = (out) => out.lines[out.lines.length - 1];
  const archiveWeek = fn('IS9WD_archiveWeek_');
  const retire = fn('IS9WD_retireAccomplished_');

  // --- the snapshot job -------------------------------------------------------
  reset(50, 5);
  state.items = [
    item('D-0002', 'Second', d(2026, 9, 29), { row: 6 }),
    item('D-0001', 'First', d(2026, 9, 29), { row: 5 }),
    item('D-0003', 'Finance', d(2026, 10, 1), { committee: 'Finance', row: 7 }),
    item('D-0004', 'Done already', d(2026, 9, 29), { active: false, status: 'Accomplished', row: 8 }),
  ];
  let out = archiveWeek({ cfg: cfgOf(), source: 'Trigger' });
  check('the snapshot appends one row per item on a slide', [out.added, out.updated, out.left, out.total], [3, 0, 0, 3]);
  check('the rows land at the top of the span in reading order',
    arcRows(state.archive).map((r) => [r[COLS['ID']], iso(r[COLS['Week start']]), r[COLS['Source']]]),
    [['D-0001', '2026-09-28', SNAP], ['D-0002', '2026-09-28', SNAP], ['D-0003', '2026-09-28', SNAP]]);
  check('the last line is the sentence the schedule row records', last(out), 'Week 04 (Monday 2026-09-28): 3 archive rows added, 0 updated.');
  check('one log row, from the trigger, with the counts',
    [state.logged.length, state.logged[0].source, state.logged[0].actor, state.logged[0].action, state.logged[0].ok, has(state.logged[0].detail, '3 added')],
    [1, 'Trigger', 'Trigger', 'ARCHIVE_WEEK', true, true]);
  check('the caches are reset after the write', [state.resets >= 1, state.configResets], [true, 1]);
  check('nothing on the data tab is cleared by the snapshot', state.cleared, []);

  state.logged = []; state.configResets = 0;
  state.items[1] = item('D-0001', 'First, retitled', d(2026, 9, 29), { row: 5 });
  out = archiveWeek({ cfg: cfgOf() });
  check('a second run the same week updates in place and adds nothing', [out.added, out.updated, arcRows(state.archive).length], [0, 3, 3]);
  check('and the retitled item reads its new title in the archive', arcRows(state.archive)[0][COLS['Title of Task']], 'First, retitled');
  check('the menu run logs as Admin from the Menu', [state.logged[0].source, state.logged[0].actor], ['Menu', 'Admin']);

  state.items.push(item('D-0005', 'Late addition', d(2026, 10, 2), { row: 9 }));
  out = archiveWeek({ cfg: cfgOf() });
  check('a third run appends only what is new', [out.added, out.updated, arcRows(state.archive).length], [1, 3, 4]);

  state.logged = [];
  out = archiveWeek({ cfg: cfgOf({ weeks: { weekNumber: 5, weekStart: d(2026, 10, 5), inTerm: true } }) });
  check('the next week archives every item again, under its own Monday', [out.added, out.updated, arcRows(state.archive).length], [4, 0, 8]);
  check('an item published two weeks running appears once per week, by design',
    arcRows(state.archive).filter((r) => r[COLS['ID']] === 'D-0001').map((r) => iso(r[COLS['Week start']])), ['2026-09-28', '2026-10-05']);

  state.configResets = 0; state.logged = [];
  out = archiveWeek({ cfg: cfgOf({ weeks: { weekNumber: 4, weekStart: d(2026, 9, 28), inTerm: false } }) });
  check('outside the term nothing is written and the line says so', [out.added, out.updated, state.configResets, has(last(out), 'outside the term calendar')], [0, 0, 0, true]);
  out = archiveWeek({ cfg: cfgOf({ weeks: { weekNumber: null, weekStart: null, inTerm: true } }) });
  check('no week start, nothing written, logged as a failure', [out.added, has(last(out), 'could not be read'), state.logged[1].ok], [0, true, false]);

  reset(50, 5);
  state.items = [item('D-0001', 'Only one', d(2026, 9, 29), { row: 5 })];
  out = archiveWeek({ cfg: cfgOf({ signoff: { current: { set: false }, preparedName: '', checkedName: '' } }) });
  check('a missing sign-off is archived with blank names and named in the report',
    [arcRows(state.archive)[0][COLS['Prepared by']], out.lines.some((l) => has(l, 'sign-off for this week is not set'))], ['', true]);
  // Read on Sunday or later, when the week has rolled over, the instruction must still be
  // true: the override to that Saturday, then the admin page, then the run, then the clear.
  const unset = out.lines.filter((l) => has(l, 'sign-off for this week is not set'))[0] || '';
  check('and the instruction covers the week having rolled over',
    [has(unset, 'Before Sunday, set it from the admin page'), has(unset, 'Saturday 2026-10-03'), has(unset, 'clear the override')], [true, true, true]);
  check('with the override before the admin page, so the names land on the right week',
    unset.indexOf('Saturday 2026-10-03') < unset.indexOf('refresh the admin page'), true);

  reset(50, 5);
  out = archiveWeek({ cfg: cfgOf() });
  check('an empty carousel writes nothing and says so', [out.added, arcRows(state.archive).length, has(out.lines[0], 'nothing to archive')], [0, 0, true]);

  // The span: never past it, and the room warning.
  reset(6, 2);
  state.items = [];
  for (let i = 1; i <= 8; i++) state.items.push(item('D-00' + pad(i), 'Item ' + i, d(2026, 9, 29), { row: 4 + i }));
  state.logged = [];
  out = archiveWeek({ cfg: cfgOf() });
  check('only what fits inside the span is written', [out.added, out.left, arcRows(state.archive).length], [6, 2, 6]);
  check('nothing is written past the span', state.archive.grid.length, FIRST + 6 - 1);
  check('the last line names the shortfall and the fix', has(last(out), '2 did not fit inside the archive span') && has(last(out), 'Build or repair workbook'), true);
  check('and, read after Sunday, how to re-take the week', has(last(out), 'Saturday 2026-10-03') && has(last(out), 'clear the override'), true);
  check('a shortfall is logged as a failure', state.logged[0].ok, false);
  out = archiveWeek({ cfg: cfgOf() });
  check('a re-run after nothing changed still has nowhere to put the two', [out.added, out.updated, out.left], [0, 6, 2]);

  reset(10, 3);
  state.items = [];
  for (let i = 1; i <= 8; i++) state.items.push(item('D-00' + pad(i), 'Item ' + i, d(2026, 9, 29), { row: 4 + i }));
  out = archiveWeek({ cfg: cfgOf() });
  check('under the minimum free rows the report carries the room line', out.lines.some((l) => has(l, '2 free rows inside its span, under the 3')), true);

  // --- the retire job ---------------------------------------------------------
  reset(50, 5);
  const done = (id, row, statusAt, over) => item(id, 'T ' + id, d(2026, 9, 16), Object.assign({ active: false, status: 'Accomplished', statusAt, row }, over || {}));
  state.items = [
    done('D-0001', 5, d(2026, 9, 10, 14, 0)),
    done('D-0002', 6, d(2026, 9, 25, 14, 0)),
    item('D-0003', 'Open', d(2026, 9, 29), { row: 7 }),
    done('D-0004', 8, ''),
    done('D-0005', 9, d(2026, 9, 1), { status: 'Done' }),
    done('D-0006', 10, d(2026, 9, 12, 9, 0)),
    done('D-0007', 11, d(2026, 9, 11, 9, 0)),
  ];
  // D-0006 was already recorded by a run cut short between its append and its clear.
  state.archive.getRange(FIRST, 1, 1, WIDTH).setValues([arcRow({ 'ID': 'D-0006', 'Source': RET, 'Deadline': d(2026, 9, 16), 'Status at': d(2026, 9, 12, 9, 0) })]);
  out = retire({ cfg: cfgOf(), source: 'Trigger' });
  check('the due rows are retired and the recorded one needs no second row', [out.retired, out.archived, out.left, out.held], [3, 2, 0, 2]);
  check('the rows cleared on the data tab are exactly the retired ones', state.cleared.slice().sort(), [10, 11, 5]);
  check('the archive holds one Retired row per ID', arcRows(state.archive).map((r) => [r[COLS['ID']], r[COLS['Source']]]), [['D-0006', RET], ['D-0001', RET], ['D-0007', RET]]);
  const r1 = arcRows(state.archive)[1];
  check('a retired row carries the real deadline and stamp for the trend', [iso(r1[COLS['Deadline']]), iso(r1[COLS['Status at']]), r1[COLS['Status at']].getHours(), iso(r1[COLS['Week start']]), r1[COLS['Week']]], ['2026-09-16', '2026-09-10', 14, '2026-09-14', 2]);
  check('the held rows are named with their reason',
    [out.lines.some((l) => has(l, 'no Status at stamp') && has(l, 'D-0004 (row 8)')), out.lines.some((l) => has(l, 'does not mark terminal') && has(l, 'D-0005 (row 9)'))], [true, true]);
  check('the last line is the sentence the schedule row records', last(out), '3 items retired to 06 | Archive, 2 archive rows added, 2 held.');
  check('one log row with the counts', [state.logged.length, state.logged[0].action, has(state.logged[0].detail, '3 retired, 2 archive rows added'), state.logged[0].ok], [1, 'RETIRE_ACCOMPLISHED', true, true]);
  check('the caches are reset after the write', [state.resets >= 1, state.configResets], [true, 1]);

  state.cleared = []; state.logged = []; state.configResets = 0;
  state.items = state.items.filter((i) => [5, 10, 11].indexOf(i.row) < 0);
  out = retire({ cfg: cfgOf() });
  check('a second run finds nothing due, clears nothing, writes nothing', [out.retired, out.archived, state.cleared, state.configResets, arcRows(state.archive).length], [0, 0, [], 0, 3]);
  check('and says so', has(out.lines[0], 'No accomplished item is older than 14 days'), true);

  reset(50, 5);
  state.items = [done('D-0001', 5, d(2026, 9, 10))];
  out = retire({ cfg: cfgOf({ switches: { retireDays: 0 } }) });
  check('retire days 0 retires nothing and names the setting', [out.retired, state.cleared, has(out.lines[0], 'is 0 on _Engine')], [0, [], true]);

  // The span: a row whose archive row did not fit stays on the data tab.
  reset(2, 1);
  state.items = [done('D-0001', 5, d(2026, 9, 10)), done('D-0002', 6, d(2026, 9, 11)), done('D-0003', 7, d(2026, 9, 12))];
  state.archive.getRange(FIRST, 1, 1, WIDTH).setValues([arcRow({ 'ID': 'D-0002', 'Source': RET })]);
  state.logged = [];
  out = retire({ cfg: cfgOf() });
  check('one row fits, the recorded one is cleared too, the third waits', [out.retired, out.archived, out.left], [2, 1, 1]);
  check('the row with no archive row is not cleared', state.cleared.slice().sort(), [5, 6]);
  check('nothing is written past the span', state.archive.grid.length, FIRST + 2 - 1);
  check('the last line names what waits and the fix', has(last(out), '1 waiting for room') && has(last(out), 'Build or repair workbook'), true);
  check('a shortfall is logged as a failure', state.logged[0].ok, false);

  // --- the lock held by someone else -----------------------------------------
  // The dispatcher marks the window used on a throw and the failure mail prints the error
  // alone, so the snapshot job's throw has to carry the recovery itself.
  reset(50, 5);
  state.items = [item('D-0001', 'Only one', d(2026, 9, 29), { row: 5 })];
  const busy = { hasLock: () => false, tryLock: () => false, releaseLock: () => {} };
  sandbox.LockService = { getDocumentLock: () => busy };
  let thrown = null;
  try { archiveWeek({ cfg: cfgOf(), source: 'Trigger' }); } catch (e) { thrown = e; }
  check('the lock timeout is rethrown with its own words first',
    thrown !== null && thrown.message.indexOf('Someone else is saving right now') === 0, true);
  check('and names the week, the override to its Saturday and the clear',
    [has(thrown.message, 'Week 04 (Monday 2026-09-28) is not recorded'), has(thrown.message, 'Saturday 2026-10-03'), has(thrown.message, 'clear the override')], [true, true, true]);
  check('nothing was written and nothing was logged', [arcRows(state.archive).length, state.logged.length], [0, 0]);
  thrown = null;
  try { retire({ cfg: cfgOf() }); } catch (e) { thrown = e; }
  check('the retire job throws the lock error as it is: it is not tied to a week and is safe until next Saturday',
    thrown !== null ? thrown.message : null, 'Someone else is saving right now. Try again in a moment.');
  sandbox.LockService = { getDocumentLock: () => ({ hasLock: () => true, tryLock: () => true, releaseLock: () => {} }) };

  LAYOUT.lastRow = savedLast;
  LAYOUT.minFreeRows = savedMin;
}

console.log('\n' + pass + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
