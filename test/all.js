// Every Node check in one command, because five files is five commands nobody types
// correctly every time.
//
//   node test/all.js
//
// It runs them in dependency order, cheapest first, and stops at the first failure: a
// duplicate function name makes every later result meaningless, so there is no point
// reading them.

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const FILES = [
  ['dupfn.test.js', 'no function name is declared twice'],
  ['emdash.test.js', 'no em dash in anything a person reads'],
  ['leakscan.test.js', 'no address, token, endpoint or file id is committed'],
  ['core.test.js', 'the pure core, against SPEC'],
  ['schedule.test.js', 'when each job fires, against the schedule rows'],
  ['email.test.js', 'the four emails, against the approved wording'],
  ['archive.test.js', 'the two archive jobs, against reference 10.1 and the trend block'],
  ['api.test.js', 'the endpoint decision layer, against SPEC section 3'],
  ['charts.test.js', 'every statistics chart keeps its plot on the canvas'],
  ['tidy.test.js', 'the title and remark tidy, against the real column layout'],
  ['calendar.test.js', 'the calendar plan and diff, against the 2026-09-29 ruling'],
  ['fix-dashboard.test.js', 'the dashboard formulas, against the 2026-10-06 build fixes'],
  ['fix-stats.test.js', 'the statistics formulas, against the 2026-10-06 build fixes'],
  ['fix-tokens.test.js', 'the link issued dates, against the 2026-10-06 build fixes'],
];

let failed = 0;
for (const [file, what] of FILES) {
  console.log('\n=== ' + file + '  ' + what + ' ===');
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, file)],
      { encoding: 'utf8' });
    const lines = out.trim().split('\n');
    console.log('    ' + lines[lines.length - 1].trim());
  } catch (err) {
    failed++;
    console.log(err.stdout ? err.stdout.toString() : String(err));
    console.log('    ^ ' + file + ' FAILED, stopping here');
    break;
  }
}

console.log('');
console.log(failed ? 'SUITE FAILED' : 'every check passed');
process.exit(failed ? 1 : 0);
