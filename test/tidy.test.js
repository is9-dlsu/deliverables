// THE TITLE AND REMARK TIDY, RUN AGAINST THE REAL COLUMN LAYOUT.
//
// Written on 2026-09-29 after the first live run threw: the tidy asked IS9WD_itemColIndex_
// for a column called 'Title', and the header is 'Title of Task'. Nothing in the suite had
// loaded IS9WD_Items.js with the real layout, so the guess shipped. This loads Core, Config
// and Items, and runs the tidy over a fake sheet.
//
//   node test/tidy.test.js

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const box = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
  Logger: { log: () => {} } };
box.globalThis = box;
vm.createContext(box);
for (const f of ['IS9WD_Core.js', 'IS9WD_Config.js', 'IS9WD_Items.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), box, { filename: f });
}

let pass = 0;
let failed = 0;
function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log('  ok  ' + label); return; }
  failed++;
  console.log('  FAIL  ' + label + '\n        expected ' + JSON.stringify(expected) + '\n        actual   ' + JSON.stringify(actual));
}

// A sheet of cells keyed "row,col", with every write recorded.
function fakeSheet(cells) {
  const writes = [];
  const sheet = {
    writes,
    getRange(row, col, rows, cols) {
      const n = rows || 1;
      return {
        getValues() {
          const out = [];
          for (let r = 0; r < n; r++) out.push([cells[(row + r) + ',' + col] !== undefined ? cells[(row + r) + ',' + col] : '']);
          return out;
        },
        setValue(v) { writes.push([row, col, v]); cells[row + ',' + col] = v; },
      };
    },
  };
  return sheet;
}
function fakeRange(sheet, row, col, lastRow, lastCol) {
  return { getSheet: () => sheet, getRow: () => row, getLastRow: () => lastRow, getColumn: () => col, getLastColumn: () => lastCol };
}

const cols = box.IS9WD_itemsTextCols_();
const T = cols[0];
const E = cols[1];
check('the two text columns resolve to the real headers, C and E', cols, [3, 5]);

{
  const cells = {};
  cells['10,' + E] = 'Oversee and updated me ';
  cells['7,' + T] = 'Draft MOA\nfor venue';
  cells['8,' + T] = 'Already clean';
  cells['9,' + E] = 46296;
  const sheet = fakeSheet(cells);
  const n = box.IS9WD_itemsTidyRows_(sheet, box.IS9WD_ITEMS.firstRow, box.IS9WD_ITEMS.lastRow);
  check('the full pass cleans exactly the two dirty cells', n, 2);
  check('and writes only those two, cleaned', sheet.writes.sort(), [[10, E, 'Oversee and updated me'], [7, T, 'Draft MOA for venue']].sort());
}

{
  const cells = {};
  cells['10,' + E] = 'Oversee and updated me ';
  cells['10,4'] = ' not a text column ';
  const sheet = fakeSheet(cells);
  check('an edit outside the two text columns writes nothing', box.IS9WD_itemsTidyEdit_(fakeRange(sheet, 10, 4, 10, 4)), 0);
  check('an edit of the remark cell cleans it', box.IS9WD_itemsTidyEdit_(fakeRange(sheet, 10, E, 10, E)), 1);
  check('the deadline column is never touched', cells['10,4'], ' not a text column ');
  check('an edit above the data rows writes nothing', box.IS9WD_itemsTidyEdit_(fakeRange(sheet, 1, 1, 4, 18)), 0);
  check('a paste of five hundred rows is left to the hourly pass', box.IS9WD_itemsTidyEdit_(fakeRange(sheet, 5, 1, 504, 18)), 0);
}

console.log('\n    ' + pass + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
