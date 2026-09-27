// Prints what the Canva feed would say for one week, straight from the core.
// Nothing here touches Google: it is the fastest way to see a contract string
// change before it reaches a carousel.
//
//   node tools/preview-week.js              the week after today
//   node tools/preview-week.js 2026-12-27   the week after that date

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src', 'IS9WD_Core.js');
const ctx = {
  Date: Date, Math: Math, JSON: JSON, String: String, Number: Number,
  Array: Array, Object: Object, RegExp: RegExp, Error: Error,
  isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, console: console,
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SRC, 'utf8'), ctx);

const TERM = [{ name: 'Term 1', start: '2026-09-07', end: '2026-12-13' }];
const AY = 'A.Y. 2026 - 2027';
const HEX = {
  OVERDUE: { station: '#e9ebd4', numberText: '#1C2120' },
  W1: { station: '#e9ebd4', numberText: '#1C2120' },
  W2: { station: '#8a64a9', numberText: '#F8FBFD' },
  W3: { station: '#085040', numberText: '#F8FBFD' },
};

const today = process.argv[2] ? new Date(process.argv[2] + 'T00:00:00') : new Date();
const week = ctx.IS9WD_weekWindow(today);
const weekNo = ctx.IS9WD_weekNumber(week.weekStart, TERM);
const range = ctx.IS9WD_rangeText(week.weekStart, week.weekEnd);

const d = (s) => new Date(s + 'T00:00:00');
const items = [
  { id: 'D-0001', title: 'Confirm speaker for Debt Traps Exposed', deadline: d('2026-09-28'), remark: 'Send final name to Publication', status: 'Open' },
  { id: 'D-0002', title: 'Send Homecoming sponsorship deck', deadline: d('2026-09-28'), remark: '', status: 'Open' },
  { id: 'D-0003', title: 'Follow up on 4 pending sponsor replies', deadline: d('2026-09-29'), remark: '', status: 'Open' },
  { id: 'D-0004', title: 'Finalize partner LOI template', deadline: d('2026-09-30'), remark: 'For EVP-EXT sign-off', status: 'Open' },
  { id: 'D-0005', title: 'Draft MOA for Homecoming venue partner', deadline: d('2026-10-01'), remark: 'Attach venue quotation', status: 'Open' },
  { id: 'D-0006', title: 'Submit xDeals shortlist to Finance', deadline: d('2026-10-02'), remark: '', status: 'Open' },
  { id: 'D-0007', title: 'Prep speaker kit for Debt Traps Exposed', deadline: d('2026-10-03'), remark: '', status: 'Open' },
  { id: 'D-0008', title: 'Pitch Summit Diamond tier to 3 banks', deadline: d('2026-10-07'), remark: 'Use the updated tier deck', status: 'Open' },
  { id: 'D-0009', title: 'Renew MOAs with IS8 partners', deadline: d('2026-09-25'), remark: '', status: 'Open' },
  { id: 'D-0010', title: 'Update partner contact directory', deadline: d('2026-10-08'), remark: '', status: 'Open' },
];

console.log('');
console.log('TITLE PAGE');
console.log('  ' + ctx.IS9WD_weekLine(weekNo, range, AY));
ctx.IS9WD_legendLines(week.weekStart, week.weekEnd).forEach((l) => console.log('  ' + l));
console.log('');

console.log('PAGE 2, PARTNERSHIPS');
console.log('  PARTNERSHIPS');
console.log('  ' + ctx.IS9WD_vpLine('Juan Dela Cruz', 'VICE PRESIDENT'));
console.log('  ' + ctx.IS9WD_tagline(weekNo, range, items.length));
console.log('  next due: ' + ctx.IS9WD_nextDueText(items, week.weekStart));
console.log('');

const split = ctx.IS9WD_slotRows(items, week.weekStart, week.weekEnd, HEX, 10, 2);
split.pages.forEach((page) => {
  console.log('  part ' + page.part);
  page.rows.forEach((r, i) => {
    const slot = ('0' + (i + 1)).slice(-2);
    if (!r.visible) { console.log('    ' + slot + '  (blank)'); return; }
    const remark = r.remarkVisible ? '   ' + r.remarkText : '';
    console.log('    ' + slot + '  ' + r.window.padEnd(7) + r.stationHex + '  ' + r.deadlineText.padEnd(20) + r.title + remark);
  });
});
if (split.notPublished) console.log('\n  not published this week: ' + split.notPublished);
console.log('');
