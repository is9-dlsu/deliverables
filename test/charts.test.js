// EVERY chartArea VALUE ON THE STATISTICS CHARTS IS A PERCENTAGE STRING.
//
// A sheet chart stores its plot area as fractions of the chart and reads a bare number the
// same way, so { left: 56 } put the plot fifty six chart widths to the right and every chart
// on 04 | Statistics rendered as an empty frame. Found on 2026-09-29 from the workbook's own
// export. This scan reads the source, because the chart builder only exists in Apps Script.
//
//   node test/charts.test.js

'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'IS9WD_Stats.js'), 'utf8');
const found = [];
const re = /setOption\(\s*'chartArea'\s*,\s*\{([^}]*)\}/g;
let m;
while ((m = re.exec(src)) !== null) found.push(m[1]);

let failed = 0;
const fail = (msg) => { failed++; console.log('  FAIL  ' + msg); };
if (found.length !== 3) fail('expected three chartArea options, one per chart, found ' + found.length);
found.forEach((body, i) => {
  for (const key of ['left', 'top', 'width', 'height']) {
    const v = new RegExp('(^|[^A-Za-z])' + key + '[ ]*:[ ]*([^,}]+)').exec(body);
    if (!v) { fail('chart ' + (i + 1) + ' chartArea has no ' + key); continue; }
    const value = v[2].trim();
    if (!/^'\d+(\.\d+)?%'$/.test(value)) fail('chart ' + (i + 1) + ' chartArea ' + key + ' is ' + value + ', not a percentage string');
  }
});
console.log('    chart area scan: ' + found.length + ' charts, ' + failed + ' failures');
process.exit(failed ? 1 : 0);
