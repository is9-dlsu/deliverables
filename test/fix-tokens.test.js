// THE LINK ISSUE DATE BACKFILL, against the bug it fixes.
//
// Every officer's link worked and every `Token issued` cell on `_Engine` was blank, so the
// old links warning could never fire. The build now dates a live token beside a blank cell
// from the Log, newest issue entry first, and from today when the Log cannot say. The
// Script Properties and the sheet only exist in Apps Script, so this tests the pure half
// that reads the Log.
//
//   node test/fix-tokens.test.js

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const box = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
  Logger: { log: () => {} } };
box.globalThis = box;
vm.createContext(box);
for (const f of ['IS9WD_Core.js', 'IS9WD_Config.js', 'IS9WD_Setup.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), box, { filename: f });
}

let pass = 0;
let failed = 0;
function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log('  ok  ' + label); return; }
  failed++;
  console.log('  FAIL  ' + label + '\n        expected ' + JSON.stringify(expected) + '\n        actual   ' + JSON.stringify(actual));
}

// One Log row, At to Detail, the seven columns the backfill reads.
const setupLine = (at, detail) => [at, 'Setup', 'Setup', 'Build or repair', '', '', detail];
const rotateLine = (at, key, oldP, newP) => [at, 'Admin', 'Menu', 'rotateToken', key, '',
  'old link ended ' + oldP + ', new link starts ' + newP];
const tick = (at) => [at, 'K03', 'App', 'tick', 'Partnerships', 'D0001', 'token issued for K03'];
const ymd = (d) => (d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-') : null);
const days = (map) => {
  const out = {};
  Object.keys(map).sort().forEach((k) => { out[k] = ymd(map[k]); });
  return out;
};
const read = (rows, undated) => days(box.IS9WD_setupIssuedFromLog_(rows, undated, 'K10'));

console.log('\n1. A setup mint line dates the token it minted');
{
  const rows = [
    setupLine(new Date(2026, 8, 27, 15, 21), 'token issued for K01'),
    setupLine(new Date(2026, 8, 27, 15, 21), 'token issued for K03'),
    setupLine(new Date(2026, 8, 27, 15, 21), 'admin token issued'),
  ];
  check('each key takes the day its line was written',
    read(rows, [{ key: 'K01', prefix: 'aaaaaa' }, { key: 'K03', prefix: 'bbbbbb' }]),
    { K01: '2026-9-27', K03: '2026-9-27' });
  check('the admin line dates the President\'s row',
    read(rows, [{ key: 'K10', prefix: 'cccccc' }]), { K10: '2026-9-27' });
  check('a key the Log never mentions is absent, so the caller uses today',
    read(rows, [{ key: 'K07', prefix: 'dddddd' }]), {});
}

console.log('\n2. The newest issue entry decides');
{
  const rows = [
    setupLine(new Date(2026, 8, 27, 15, 21), 'token issued for K03'),
    rotateLine(new Date(2026, 9, 2, 9, 0), 'K03', 'bbbbbb', 'eeeeee'),
  ];
  check('a rotation to the live prefix beats the older mint',
    read(rows, [{ key: 'K03', prefix: 'eeeeee' }]), { K03: '2026-10-2' });
  check('a rotation to some other prefix gives no date rather than the older wrong one',
    read(rows, [{ key: 'K03', prefix: 'ffffff' }]), {});
  const admin = [
    setupLine(new Date(2026, 8, 27, 15, 21), 'admin token issued'),
    rotateLine(new Date(2026, 9, 3, 9, 0), 'ADMIN', 'cccccc', 'gggggg'),
  ];
  check('a rotation asked for as ADMIN dates the President\'s row',
    read(admin, [{ key: 'K10', prefix: 'gggggg' }]), { K10: '2026-10-3' });
}

console.log('\n3. Only an issue entry counts');
{
  const rows = [
    setupLine(new Date(2026, 8, 27, 15, 21), 'token issued for K03'),
    tick(new Date(2026, 9, 5, 8, 0)),
    setupLine(new Date(2026, 9, 5, 9, 0), 'directory: 14 of 14 rows keyed'),
  ];
  check('an app row whose detail happens to read like a mint line is ignored',
    read(rows, [{ key: 'K03', prefix: 'bbbbbb' }]), { K03: '2026-9-27' });
}

console.log('\n4. The At column, as a date or as the stamp text');
{
  const rows = [
    setupLine('2026-09-28 10:15', 'token issued for K05'),
    setupLine('not a stamp', 'token issued for K06'),
  ];
  check('stamp text is read to its day',
    read(rows, [{ key: 'K05', prefix: 'hhhhhh' }]), { K05: '2026-9-28' });
  check('an unreadable At gives no date',
    read(rows, [{ key: 'K06', prefix: 'iiiiii' }]), {});
  const day = box.IS9WD_setupLogDay_(new Date(2026, 8, 27, 23, 59));
  check('a real date is cut to midnight', [day.getHours(), day.getMinutes(), day.getDate()], [0, 0, 27]);
}

console.log('\n5. Nothing to read');
{
  check('an empty Log answers nothing', read([], [{ key: 'K01', prefix: 'aaaaaa' }]), {});
  check('no undated rows answers nothing', read([setupLine(new Date(), 'token issued for K01')], []), {});
}

console.log('\n' + pass + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
