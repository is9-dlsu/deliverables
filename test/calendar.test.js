// THE CALENDAR PLAN AND DIFF, against Ethan's ruling of 2026-09-29.
//
// Each officer sees their own open deliverables on their own calendar, a ticked task leaves
// once its undo window has closed, the President's own tasks carry no guest, and test mode
// keeps every officer off the events. The Calendar service only exists in Apps Script, so this
// tests the two pure halves that decide what the service is told to do.
//
//   node test/calendar.test.js

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const box = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
  Logger: { log: () => {} } };
box.globalThis = box;
vm.createContext(box);
for (const f of ['IS9WD_Core.js', 'IS9WD_Config.js', 'IS9WD_Calendar.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), box, { filename: f });
}

let pass = 0;
let failed = 0;
function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log('  ok  ' + label); return; }
  failed++;
  console.log('  FAIL  ' + label + '\n        expected ' + JSON.stringify(expected) + '\n        actual   ' + JSON.stringify(actual));
}

const DIR = [
  { key: 'K10', committee: 'Office of the President', fullName: 'Sample President', email: 'PRESIDENT@example.test' },
  { key: 'K01', committee: 'Partnerships', fullName: 'Sample Officer', email: 'Officer@Example.test' },
  { key: 'K02', committee: 'Finance', fullName: 'Second Officer', email: '' },
];
const NOW = new Date(2026, 8, 29, 12, 0, 0).getTime();
const d = (y, m, day) => new Date(y, m - 1, day);
const item = (id, committee, title, deadline, over) => Object.assign({
  id, committee, title, deadline, remark: '', active: true, status: 'Open', statusAt: '',
}, over || {});
const plan = (items, over) => box.IS9WD_calPlan_(items, DIR, Object.assign({
  testMode: false, adminKey: 'K10', undoSeconds: 60, now: NOW,
}, over || {}));

console.log('\n1. What should be on the calendar');
{
  const out = plan([
    item('D0001', 'Partnerships', 'Send the sponsorship deck', d(2026, 10, 1), { remark: 'Before noon' }),
    item('D0002', 'Office of the President', 'Sign the venue contract', d(2026, 9, 30)),
    item('D0003', 'Finance', 'Close the budget', d(2026, 10, 2)),
  ]);
  check('one event per open deliverable', out.map((x) => x.id), ['D0001', 'D0002', 'D0003']);
  check('the title names the office', out[0].summary, 'Send the sponsorship deck (Partnerships)');
  check('the officer is the guest, address lowercased', out[0].guest, 'officer@example.test');
  check('the President\'s own task carries no guest', out[1].guest, '');
  check('an officer with no usable address carries no guest', out[2].guest, '');
  check('the remark opens the description', out[0].description.indexOf('Before noon\n\n'), 0);
  check('the event is all day on the deadline', [out[0].ymd, out[0].date.getHours()], ['2026-10-01', 0]);
  check('the signature changes with the deadline', plan([item('D0001', 'Partnerships', 'Send the sponsorship deck', d(2026, 10, 2), { remark: 'Before noon' })])[0].sig === out[0].sig, false);
  check('test mode keeps every officer off the events', plan([item('D0001', 'Partnerships', 'X', d(2026, 10, 1))], { testMode: true })[0].guest, '');
  check('the signature changes when test mode ends, so the guest is added then',
    plan([item('D0001', 'Partnerships', 'X', d(2026, 10, 1))], { testMode: true })[0].sig ===
    plan([item('D0001', 'Partnerships', 'X', d(2026, 10, 1))])[0].sig, false);
  const EM = String.fromCharCode(8212);
  check('no em dash in any title or description', out.every((x) => x.summary.indexOf(EM) < 0 && x.description.indexOf(EM) < 0), true);
}

console.log('\n2. What is left off');
{
  const out = plan([
    item('', 'Partnerships', 'No ID yet', d(2026, 10, 1)),
    item('D0010', 'Partnerships', '', d(2026, 10, 1)),
    item('D0011', 'Partnerships', 'No deadline', ''),
    item('D0012', 'Partnerships', 'Accomplished long ago', d(2026, 10, 1), { active: false, status: 'Accomplished', statusAt: new Date(NOW - 5 * 60000) }),
    item('D0013', 'Partnerships', 'Duplicate', d(2026, 10, 1)),
    item('D0013', 'Partnerships', 'Duplicate again', d(2026, 10, 1)),
  ]);
  check('no ID, no title, no deadline and a closed tick are all left off; a repeated ID once', out.map((x) => x.id), ['D0013']);
}

console.log('\n3. The undo window');
{
  const ticked = (secondsAgo) => item('D0020', 'Partnerships', 'Just ticked', d(2026, 10, 1),
    { active: false, status: 'Accomplished', statusAt: new Date(NOW - secondsAgo * 1000) });
  check('a tick thirty seconds ago keeps its event, marked waiting', plan([ticked(30)]).map((x) => [x.id, x.waiting]), [['D0020', true]]);
  check('a tick sixty one seconds ago has left', plan([ticked(61)]).length, 0);
  check('the window follows the setting', plan([ticked(61)], { undoSeconds: 120 }).length, 1);
  check('an open task is never waiting', plan([item('D0021', 'Partnerships', 'Open', d(2026, 10, 1))])[0].waiting, false);
}

console.log('\n4. What has to change');
{
  const want = plan([
    item('D0001', 'Partnerships', 'Keep', d(2026, 10, 1)),
    item('D0002', 'Partnerships', 'Moved', d(2026, 10, 3)),
    item('D0003', 'Partnerships', 'New', d(2026, 10, 4)),
  ]);
  const have = [
    { id: 'D0001', sig: want[0].sig, ref: 'e1' },
    { id: 'D0002', sig: 'old signature', ref: 'e2' },
    { id: 'D0009', sig: 'x', ref: 'e9' },
    { id: 'D0001', sig: want[0].sig, ref: 'e1 again' },
    { id: '', sig: '', ref: 'somebody else' },
  ];
  const diff = box.IS9WD_calDiff_(want, have);
  check('a missing event is created', diff.create.map((x) => x.id), ['D0003']);
  check('a changed one is corrected in place', diff.update.map((x) => [x.want.id, x.have.ref]), [['D0002', 'e2']]);
  check('an event whose task left is removed, and so is a second event for one ID', diff.remove.map((x) => x.ref), ['e9', 'e1 again']);
  check('an event that is not ours is never touched', diff.remove.some((x) => x.ref === 'somebody else'), false);
  check('an agreeing calendar changes nothing', (() => {
    const same = box.IS9WD_calDiff_(want, want.map((w) => ({ id: w.id, sig: w.sig, ref: w.id })));
    return [same.create.length, same.update.length, same.remove.length];
  })(), [0, 0, 0]);
}

console.log('\n    ' + pass + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
