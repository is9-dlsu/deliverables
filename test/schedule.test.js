/**
 * Node test for the schedule decision: IS9WD_shouldRun, the done keys and the schedule row
 * reader. Until this file existed the function every job's firing depends on had no test.
 *
 *   node test/schedule.test.js
 *
 * The clock handed in is the REAL Manila clock, never effective today, and every case below
 * constructs it explicitly. Monday 2026-09-28 is the reference week.
 */

'use strict';

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
  isNaN, parseInt, parseFloat };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'IS9WD_Core.js'), 'utf8'), sandbox);

const fn = (name) => {
  const f = sandbox[name];
  if (typeof f !== 'function') throw new Error('missing ' + name);
  return f;
};

let pass = 0;
let failed = 0;
function check(label, actual, expected) {
  try {
    assert.deepStrictEqual(actual, expected);
    pass++;
    console.log('  ok  ' + label);
  } catch (e) {
    failed++;
    console.log('  FAIL  ' + label);
    console.log('        expected ' + JSON.stringify(expected));
    console.log('        actual   ' + JSON.stringify(actual));
  }
}

const shouldRun = fn('IS9WD_shouldRun');
const doneKey = fn('IS9WD_doneKey');
const doneKeySet = fn('IS9WD_doneKeySet_');
const scheduleRow = fn('IS9WD_scheduleRow_');

const at = (day, hour, minute) => new Date(2026, 8, day, hour, minute || 0);
const row = (over) => Object.assign({
  jobKey: 'MONDAY_ASSIGNMENTS', runs: 'Weekly', day: 'Monday', hour: 7, catchUp: 4, on: true, check: 'OK',
}, over || {});
const MON = 28;
const TUE = 29;

console.log('\n1. The five skip gates, each on its own');
check('On not TRUE skips', shouldRun(row({ on: false }), at(MON, 7, 5), {}), 'skip');
check('a Check that is not OK skips', shouldRun(row({ check: 'Row does not parse' }), at(MON, 7, 5), {}), 'skip');
check('a blank Check is accepted', shouldRun(row({ check: '' }), at(MON, 7, 5), {}), 'run');
check('the job level done key already set skips',
  shouldRun(row(), at(MON, 7, 5), { 'IS9WD_DONE_MONDAY_ASSIGNMENTS_2026-09-28': '2026-09-28 07:02' }), 'skip');
check('weekly with a weekday mismatch skips', shouldRun(row(), at(TUE, 7, 5), {}), 'skip');
check('the Manila hour below Hour skips', shouldRun(row(), at(MON, 6, 59), {}), 'skip');

console.log('\n2. The window');
check('at the hour runs', shouldRun(row(), at(MON, 7, 0), {}), 'run');
check('inside the catch-up runs', shouldRun(row(), at(MON, 9, 30), {}), 'run');
check('exactly at hour plus catch-up still runs', shouldRun(row(), at(MON, 11, 59), {}), 'run');
check('one hour past it is missed', shouldRun(row(), at(MON, 12, 0), {}), 'missed');
check('a null catch-up is zero: the hour itself runs', shouldRun(row({ catchUp: null }), at(MON, 7, 30), {}), 'run');
check('a null catch-up is zero: the next hour is missed', shouldRun(row({ catchUp: null }), at(MON, 8, 0), {}), 'missed');
check('a negative catch-up is zero', shouldRun(row({ catchUp: -3 }), at(MON, 8, 0), {}), 'missed');
check('a missed window with the done key set skips, not missed',
  shouldRun(row(), at(MON, 15, 0), { 'IS9WD_DONE_MONDAY_ASSIGNMENTS_2026-09-28': 'missed' }), 'skip');

console.log('\n3. The day');
check('weekly with Day Any skips', shouldRun(row({ day: 'Any' }), at(MON, 7, 5), {}), 'skip');
check('weekly with a blank Day skips', shouldRun(row({ day: '' }), at(MON, 7, 5), {}), 'skip');
check('the full weekday name, any case', shouldRun(row({ day: 'MONDAY' }), at(MON, 7, 5), {}), 'run');
check('the three letter abbreviation, any case', shouldRun(row({ day: 'mon' }), at(MON, 7, 5), {}), 'run');
check('daily ignores Day', shouldRun(row({ runs: 'Daily', day: '', hour: 18, jobKey: 'DAILY_DIGEST' }), at(TUE, 18, 10), {}), 'run');
check('daily below its hour skips', shouldRun(row({ runs: 'Daily', day: '', hour: 18, jobKey: 'DAILY_DIGEST' }), at(TUE, 17, 59), {}), 'skip');

console.log('\n4. Bad input');
check('a clock that will not parse skips', shouldRun(row(), 'not a date', {}), 'skip');
check('a null row skips', shouldRun(null, at(MON, 7, 5), {}), 'skip');
check('a blank job key skips', shouldRun(row({ jobKey: '' }), at(MON, 7, 5), {}), 'skip');
check('an hour outside 0 to 23 skips', shouldRun(row({ hour: 24 }), at(MON, 7, 5), {}), 'skip');
check('a null hour skips', shouldRun(row({ hour: null }), at(MON, 7, 5), {}), 'skip');
check('the raw array form is read the same way',
  shouldRun(['MONDAY_ASSIGNMENTS', 'Weekly', 'Monday', 7, 4, true, 'OK'], at(MON, 7, 5), {}), 'run');

console.log('\n5. Done keys');
check('the job level key from a Date', doneKey('MONDAY_ASSIGNMENTS', at(MON, 7), ''), 'IS9WD_DONE_MONDAY_ASSIGNMENTS_2026-09-28');
check('the job level key from a formatted string', doneKey('monday_assignments', '2026-09-28', ''), 'IS9WD_DONE_MONDAY_ASSIGNMENTS_2026-09-28');
check('the per recipient key appends the directory key, case preserved', doneKey('DAILY_DIGEST', '2026-09-29', 'K01'), 'IS9WD_DONE_DAILY_DIGEST_2026-09-29_K01');
check('no trailing underscore on the job level form', /_$/.test(doneKey('SUNDAY_BRIEF', '2026-10-04', '')), false);
check('array form: present', doneKeySet(['a', 'b'], 'b'), true);
check('array form: absent', doneKeySet(['a', 'b'], 'c'), false);
check('map form: a timestamp is set', doneKeySet({ k: '2026-09-28 07:02' }, 'k'), true);
check('map form: the literal missed is set', doneKeySet({ k: 'missed' }, 'k'), true);
check('map form: null, undefined, false and blank all read as not set',
  [doneKeySet({ k: null }, 'k'), doneKeySet({ k: undefined }, 'k'), doneKeySet({ k: false }, 'k'), doneKeySet({ k: '' }, 'k')],
  [false, false, false, false]);
check('map form: a missing key is not set', doneKeySet({}, 'k'), false);
check('no store at all is not set', doneKeySet(null, 'k'), false);

console.log('\n6. The schedule row reader');
check('a blank job key gives null', scheduleRow(['', 'Weekly', 'Monday', 7, 4, true, 'OK']), null);
// Compared as JSON: a vm realm has its own Object prototype, so deepStrictEqual refuses two
// structurally identical objects that crossed the boundary.
check('the array form reads columns A to G and coerces only On',
  JSON.stringify(scheduleRow(['X', 'Weekly', 'Monday', '7', '4', 'TRUE', 'OK'])),
  JSON.stringify({ jobKey: 'X', runs: 'Weekly', day: 'Monday', hour: '7', catchUp: '4', on: true, check: 'OK' }));
check('the object form accepts catchUpHours as an alias',
  scheduleRow({ jobKey: 'X', runs: 'Daily', day: '', hour: 18, catchUpHours: 2, on: 'true', check: '' }).catchUp, 2);

console.log('\n' + pass + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
