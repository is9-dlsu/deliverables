/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · IN SHEET SELF TEST
 *  IS9WD_SelfTest.js, the checks only a live workbook can answer
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 13.4 (the check list), 6.3 and 6.4 (the feed
 *          it asserts over), 4.2 to 4.9 (Configuration), 5.1 to 5.4 (the items).
 *
 *  WHAT THIS IS FOR, AND WHAT IT IS NOT
 *  The Node tests in test/ cover the pure core, which is every string and every
 *  piece of arithmetic. They cannot see a named range, a time zone, a sentinel
 *  row or a scan range, because none of those exist outside the workbook. This
 *  file is the other half: it asserts the wiring. Nothing here sends an email,
 *  writes an item, or touches an archive row.
 *
 *  THE TWO CHECKS THAT MATTER MOST, because both fail green
 *    · The Feed errors scan's extent. A scan that stops short reads green over
 *      every row it no longer covers, which is worse than no scan at all, and it
 *      is the thing a resize forgets (6.4).
 *    · The readiness prefix. Feed errors deliberately skips row 5 so readiness
 *      can read it without a circular reference, so nothing else would notice if
 *      C5 broke. Asserting the prefix is what buys that back (6.4).
 *
 *  WHY EVERY CHECK RUNS IN ITS OWN TRY
 *  A self test that dies on check three tells you nothing about checks four to
 *  thirty, and the first thing to break in a half built workbook is a read. Each
 *  check is therefore isolated and a throw becomes that check's FAIL line.
 *
 *  FOUR STATES, not two. PASS and FAIL are the spec's. WARN is for a state that
 *  is correct today and wrong at go live, which a fresh workbook is full of: no
 *  roster pasted, no tokens issued, no sign-off row for the week. SKIP is for a
 *  check this build genuinely cannot perform, and there is exactly one: the live
 *  endpoint ping needs UrlFetchApp, which 2.4 forbids outright, so the URL is
 *  checked here and the ping stays a hand check (13.3).
 *
 *  WHERE THE RESULTS GO
 *  A line per check to 04 | Log, the summary to Last self test result in
 *  00 | Configuration, and the whole list back to the caller so the menu can show
 *  it. The execution log alone would mean Ethan has to open the editor to find
 *  out whether his workbook is sound.
 * =============================================================================
 */

var IS9WD_ST = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN', SKIP: 'SKIP' };

// The error strings the feed must never show. `!ERR` is the project's own visible
// sentinel: every fallback on that tab renders it rather than swallowing the
// problem into a blank, because a blank is indistinguishable from an empty slot
// (6.4).
var IS9WD_ST_ERRORS = ['#REF!', '#N/A', '#VALUE!', '#DIV/0!', '#NAME?', '#NUM!',
  '#ERROR!', '!ERR'];

var IS9WD_ST_READY_PREFIX = 'Ready for Canva: ';


// ============================================================================
//  THE ENTRY POINT
// ============================================================================

// Returns the report as lines. The menu shows them; the Log keeps them.
function IS9WD_selfTest_() {
  var suite = { rows: [], startedAt: new Date() };
  var ctx = IS9WD_stGather_(suite);

  IS9WD_stNames_(suite, ctx);
  IS9WD_stTimeZone_(suite);
  IS9WD_stCapacity_(suite, ctx);
  IS9WD_stSchedule_(suite, ctx);
  IS9WD_stDirectory_(suite, ctx);
  IS9WD_stTokens_(suite, ctx);
  IS9WD_stTerms_(suite, ctx);
  IS9WD_stSignoff_(suite, ctx);
  IS9WD_stWindows_(suite, ctx);
  IS9WD_stItems_(suite, ctx);
  IS9WD_stFeedStructure_(suite, ctx);
  IS9WD_stFeedReadiness_(suite, ctx);
  IS9WD_stFeedPlan_(suite, ctx);
  IS9WD_stFeedFlags_(suite, ctx);
  IS9WD_stEndpoint_(suite, ctx);
  IS9WD_stQuota_(suite);

  var summary = IS9WD_stSummary_(suite);
  IS9WD_stRecord_(suite, summary);
  return IS9WD_stReport_(suite, summary);
}

// The term calendar on its own, because a blank End date pauses every job in the
// middle of a trimester and Ethan needs to be able to ask that one question
// without reading thirty lines (4.3, 9).
function IS9WD_checkTerms_() {
  var out = [];
  var cfg = IS9WD_readConfig_(true);
  var w = cfg.weeks;
  out.push('Effective today' + IS9WD_SEP + IS9WD_stDate_(w.effectiveToday) +
    (w.todayOverrideSet ? IS9WD_SEP + 'TODAY OVERRIDE IS SET' : ''));
  out.push('Week' + IS9WD_SEP + IS9WD_stDate_(w.weekStart) + ' to ' +
    IS9WD_stDate_(w.weekEnd) +
    (w.weekNumberOverrideSet ? IS9WD_SEP + 'WEEK NUMBER OVERRIDE IS SET' : ''));
  out.push('Week number' + IS9WD_SEP +
    (w.weekNumber === null ? 'blank, so out of term' : IS9WD_two_(w.weekNumber)));
  out.push('Active trimester' + IS9WD_SEP + (w.termActive === '' ? 'none' : w.termActive));
  out.push('');

  var rows = cfg.terms.rows;
  if (!rows.length) {
    out.push('The term calendar is empty. Every job is paused until a trimester ' +
      'with a start and an end is entered.');
    return out;
  }
  for (var i = 0; i < rows.length; i++) {
    var t = rows[i];
    var notes = [];
    if (t.name === '') notes.push('no name');
    if (!t.start) notes.push('no start date');
    if (t.start && !IS9WD_isMonday_(t.start)) notes.push('start is not a Monday');
    if (!t.end) notes.push('NO END DATE, which pauses every job from its start');
    if (t.start && t.end && t.end < t.start) notes.push('end is before the start');
    out.push('Row ' + t.row + IS9WD_SEP + (t.name === '' ? '(unnamed)' : t.name) +
      IS9WD_SEP + IS9WD_stDate_(t.start) + ' to ' + IS9WD_stDate_(t.end) +
      IS9WD_SEP + (notes.length ? notes.join('; ') : 'OK'));
  }
  out.push('');
  out.push('Week numbers restart at 01 each trimester, so a start that is not a ' +
    'Monday shifts every printed week label by a day.');
  return out;
}


// ============================================================================
//  ONE GATHER, so thirty checks cost a handful of reads rather than sixty
// ============================================================================

function IS9WD_stGather_(suite) {
  var ctx = {
    cfg: null, layout: null, names: null, audit: null, sheetNames: {},
    feed: null, items: null
  };

  try {
    ctx.cfg = IS9WD_readConfig_(true);
    ctx.layout = ctx.cfg.feed;
  } catch (err) {
    IS9WD_stAdd_(suite, 'Configuration reads', IS9WD_ST.FAIL, IS9WD_stErr_(err));
    return ctx;
  }
  IS9WD_stAdd_(suite, 'Configuration reads', IS9WD_ST.PASS,
    'Every named range the reader needs resolved on the Configuration tab.');

  try {
    // One getNamedRanges for the whole run: resolving 116 names three times over
    // is three server calls for one answer.
    ctx.names = IS9WD_namedMap_();
    ctx.audit = IS9WD_nameAudit_(ctx.layout);
    for (var i = 0; i < IS9WD_TAB_ORDER.length; i++) {
      var key = IS9WD_TAB_ORDER[i];
      ctx.sheetNames[key] = IS9WD_sheet_(key).getName();
    }
  } catch (err) {
    IS9WD_stAdd_(suite, 'Tabs resolve', IS9WD_ST.FAIL, IS9WD_stErr_(err));
    return ctx;
  }

  // Nothing in this file writes except IS9WD_stRecord_. A grid that is too small
  // is read as far as it goes and reported, never extended: extending it here
  // would repair the very thing the next check is supposed to notice.
  try {
    var feedSheet = IS9WD_sheet_('FEED');
    var wantCols = Math.max(ctx.layout.helperLastCol, ctx.layout.lastCol);
    var haveRows = Math.min(feedSheet.getMaxRows(), ctx.layout.endRow);
    var haveCols = Math.min(feedSheet.getMaxColumns(), wantCols);
    ctx.feed = {
      sheet: feedSheet,
      lastRow: feedSheet.getLastRow(),
      cols: wantCols,
      shortRows: ctx.layout.endRow - haveRows,
      shortCols: wantCols - haveCols,
      // Display values, not values: an error cell has to arrive as the text
      // `#REF!` for the scan below to see it at all.
      disp: IS9WD_stPad_(
        feedSheet.getRange(1, 1, haveRows, haveCols).getDisplayValues(),
        ctx.layout.endRow, wantCols)
    };
  } catch (err) {
    IS9WD_stAdd_(suite, 'Canva Feed reads', IS9WD_ST.FAIL, IS9WD_stErr_(err));
  }

  try {
    var itemSheet = IS9WD_sheet_('ITEMS');
    var rows = IS9WD_ITEMS.lastRow - IS9WD_ITEMS.firstRow + 1;
    var itemRows = Math.min(itemSheet.getMaxRows() - IS9WD_ITEMS.firstRow + 1, rows);
    var itemCols = Math.min(itemSheet.getMaxColumns(), IS9WD_ITEMS.lastCol);
    ctx.items = {
      sheet: itemSheet,
      rows: rows,
      shortRows: rows - itemRows,
      shortCols: IS9WD_ITEMS.lastCol - itemCols,
      values: IS9WD_stPad_(
        itemSheet.getRange(IS9WD_ITEMS.firstRow, 1, itemRows, itemCols).getValues(),
        rows, IS9WD_ITEMS.lastCol),
      // Active and Publish key are read as formulas as well as values, for the
      // reason in IS9WD_stItems_.
      derived: IS9WD_stPad_(
        itemSheet.getRange(IS9WD_ITEMS.firstRow, 11, itemRows, 2).getFormulas(), rows, 2)
    };
  } catch (err) {
    IS9WD_stAdd_(suite, 'Deliverables reads', IS9WD_ST.FAIL, IS9WD_stErr_(err));
  }
  return ctx;
}

// Pads a short read out to the size the layout expects with blanks, so a grid
// that is too small produces one clear failure rather than thirty index errors.
function IS9WD_stPad_(values, rows, cols) {
  var out = values || [];
  for (var r = 0; r < rows; r++) {
    if (!out[r]) out[r] = [];
    for (var c = 0; c < cols; c++) {
      if (out[r][c] === undefined) out[r][c] = '';
    }
  }
  return out;
}


// ============================================================================
//  THE CHECKS
// ============================================================================

// Every expected name resolves, points at the tab it should, and spans exactly
// the range the layout says. Comparing the whole A1 notation rather than a row
// count is deliberate: a name that kept its height and lost a column is the
// failure that makes a COUNTIFS quietly answer about the wrong column.
function IS9WD_stNames_(suite, ctx) {
  IS9WD_stRun_(suite, 'Named ranges resolve', ctx.audit, function () {
    if (ctx.audit.missing.length) {
      return IS9WD_stFail_(ctx.audit.missing.length + ' of ' + ctx.audit.expected +
        ' named ranges are missing: ' + IS9WD_stList_(ctx.audit.missing) +
        '. Run Build or repair workbook.');
    }
    return 'All ' + ctx.audit.expected + ' named ranges resolve.';
  });

  IS9WD_stRun_(suite, 'Named range spans', ctx.names, function () {
    var want = IS9WD_allNames_(ctx.layout);
    var store = IS9WD_stStoreNames_();
    var wrong = [];
    var storeHeights = {};
    for (var i = 0; i < want.length; i++) {
      var range = ctx.names[want[i].name];
      if (!range) continue;
      var on = range.getSheet().getName();
      var expectSheet = ctx.sheetNames[want[i].tab];
      if (on !== expectSheet) {
        wrong.push(want[i].name + ' is on "' + on + '" not "' + expectSheet + '"');
        continue;
      }
      // The sign-off store is the one block that grows, by 52 rows at a time, so
      // its seven names are checked on their start, their width and a height that
      // is a whole number of blocks. Every other name must land exactly where the
      // layout puts it: a name that kept its height and lost a column is what
      // makes a COUNTIFS answer quietly about the wrong column.
      if (store[want[i].name]) {
        var spec = store[want[i].name];
        var h = range.getNumRows();
        if (range.getRow() !== IS9WD_CFG.STORE.firstRow) {
          wrong.push(want[i].name + ' starts on row ' + range.getRow() + ' not ' +
            IS9WD_CFG.STORE.firstRow);
        }
        if (range.getColumn() !== spec.col || range.getNumColumns() !== spec.cols) {
          wrong.push(want[i].name + ' spans ' + range.getNumColumns() +
            ' columns from column ' + range.getColumn() + ', not ' + spec.cols +
            ' from column ' + spec.col);
        }
        if (h < spec.rows || h % IS9WD_CFG.STORE.growBy !== 0) {
          wrong.push(want[i].name + ' spans ' + h + ' rows, which is not a whole ' +
            'number of ' + IS9WD_CFG.STORE.growBy + ' row blocks of at least ' + spec.rows);
        }
        storeHeights[h] = true;
        continue;
      }
      var a1 = range.getA1Notation();
      if (a1 !== want[i].a1) {
        wrong.push(want[i].name + ' spans ' + a1 + ' not ' + want[i].a1);
      }
    }
    var heights = [];
    for (var h2 in storeHeights) {
      if (Object.prototype.hasOwnProperty.call(storeHeights, h2)) heights.push(h2);
    }
    if (heights.length > 1) {
      wrong.push('the sign-off store names disagree on height: ' + heights.join(' and '));
    }
    if (wrong.length) {
      return IS9WD_stFail_(wrong.length + ' named ranges span the wrong cells: ' +
        IS9WD_stList_(wrong) + '. Run Build or repair workbook.');
    }
    return 'All ' + want.length + ' named ranges span what the layout says, with the ' +
      'sign-off store at ' + (heights.length ? heights[0] : '0') + ' rows.';
  });

  IS9WD_stRun_(suite, 'Retired names absent', ctx.audit, function () {
    if (ctx.audit.retiredPresent.length) {
      return IS9WD_stFail_('Retired: ' + ctx.audit.retiredPresent.join(', ') +
        ' still resolves. A formula still reading it is a formula nobody updated.');
    }
    return IS9WD_RETIRED_NAMES.join(' and ') + ' do not resolve, which is correct.';
  });
}

// { name: {col, cols, rows} } for the seven names over the sign-off store, built
// from the same column map setup writes them from.
function IS9WD_stStoreNames_() {
  var rows = IS9WD_CFG.STORE.lastRow - IS9WD_CFG.STORE.firstRow + 1;
  var out = { IS9WD_SIGNOFF: { col: 1, cols: 6, rows: rows } };
  for (var c in IS9WD_STORE_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STORE_COL_NAMES, c)) continue;
    out[IS9WD_STORE_COL_NAMES[c]] = { col: Number(c), cols: 1, rows: rows };
  }
  return out;
}

// A mismatch puts every formatDate, every trigger hour and every Status at stamp
// twelve hours away from the spreadsheet's own dates, silently (2.4).
function IS9WD_stTimeZone_(suite) {
  IS9WD_stRun_(suite, 'Time zones match', true, function () {
    var script = Session.getScriptTimeZone();
    var sheet = IS9WD_ss_().getSpreadsheetTimeZone();
    if (script !== sheet) {
      return IS9WD_stFail_('The script is on ' + script + ' and the spreadsheet is ' +
        'on ' + sheet + '. Both must read ' + IS9WD_TZ + '.');
    }
    if (script !== IS9WD_TZ) {
      return IS9WD_stFail_('Both are on ' + script + ', which is not ' + IS9WD_TZ + '.');
    }
    return 'Script and spreadsheet are both on ' + IS9WD_TZ + '.';
  });
}

// Every slot key in the workbook is arithmetic over these three numbers, so they
// disagreeing is a failure rather than a warning (4.6).
function IS9WD_stCapacity_(suite, ctx) {
  IS9WD_stRun_(suite, 'Capacity numbers agree', ctx.cfg, function () {
    var s = ctx.cfg.switches;
    var sum = s.slotsPerPage + ' slots a page times ' + s.maxParts + ' pages is ' +
      s.publishMax;
    if (!s.capacityOk) {
      return IS9WD_stFail_('The three capacity numbers disagree: ' + sum +
        ' does not hold. Nothing may resize the feed until it does.');
    }
    var cell = IS9WD_stBlockA_(ctx, 'A.CAPACITY');
    if (cell !== 'OK') {
      return IS9WD_stFail_('Capacity check on the feed reads "' + cell +
        '" rather than OK, although the numbers themselves agree: ' + sum + '.');
    }
    return sum + ', and Capacity check reads OK.';
  });
}

// A typo in Runs or Day turns a weekly job into one that never runs, and nothing
// else says so (4.7).
function IS9WD_stSchedule_(suite, ctx) {
  IS9WD_stRun_(suite, 'Schedule rows parse', ctx.cfg, function () {
    var rows = ctx.cfg.schedule.rows;
    if (!rows.length) return IS9WD_stFail_('The schedule has no rows at all.');
    var bad = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var why = [];
      if (IS9WD_ST_IN_(IS9WD_RUNS_LIST, r.runs) === false) why.push('Runs is "' + r.runs + '"');
      if (IS9WD_ST_IN_(IS9WD_DAY_LIST, r.day) === false) why.push('Day is "' + r.day + '"');
      if (r.hour === null || r.hour < 0 || r.hour > 23) why.push('Hour is "' + r.hour + '"');
      if (r.catchUp === null || r.catchUp < 0 || r.catchUp > 23) {
        why.push('Catch-up is "' + r.catchUp + '"');
      }
      if (IS9WD_trim_(r.runs).toLowerCase() === 'weekly' &&
        IS9WD_trim_(r.day).toLowerCase() === 'any') {
        why.push('Weekly with Day "Any" never fires');
      }
      if (IS9WD_trim_(r.check) !== '' && IS9WD_trim_(r.check).toUpperCase() !== 'OK') {
        why.push('Check reads "' + r.check + '"');
      }
      if (why.length) bad.push('row ' + r.row + ' ' + r.jobKey + ': ' + why.join(', '));
    }
    if (bad.length) return IS9WD_stFail_(IS9WD_stList_(bad));
    var on = 0;
    for (var j = 0; j < rows.length; j++) if (rows[j].on) on++;
    return 'All ' + rows.length + ' schedule rows parse, ' + on + ' are on.';
  });
}

// Four assertions over one table (4.8, 13.4). The carousel and hierarchy ordinals
// are checked hardest, because a duplicate carousel order sends two committees to
// one physical master page and the second paste overwrites the first.
function IS9WD_stDirectory_(suite, ctx) {
  IS9WD_stRun_(suite, 'Directory rows complete', ctx.cfg, function () {
    var rows = ctx.cfg.directory.rows;
    if (rows.length !== IS9WD_DIR_ROWS) {
      return IS9WD_stFail_('The directory holds ' + rows.length + ' keyed rows, not ' +
        IS9WD_DIR_ROWS + '.');
    }
    var noName = [];
    var noMail = [];
    var badKey = [];
    for (var i = 0; i < rows.length; i++) {
      // The keys are written once and never rewritten, and every token property
      // and every log line is keyed on them, so a renumbered key orphans both.
      var want = 'K' + IS9WD_two_(i + 1);
      if (rows[i].key !== want) badKey.push('row ' + rows[i].row + ' is ' + rows[i].key + ' not ' + want);
      if (rows[i].fullName === '') noName.push(rows[i].key);
      if (rows[i].email === '') noMail.push(rows[i].key);
    }
    if (badKey.length) return IS9WD_stFail_(IS9WD_stList_(badKey));
    if (noName.length || noMail.length) {
      var detail = [];
      if (noName.length) detail.push('no Full name: ' + noName.join(', '));
      if (noMail.length) detail.push('no Email: ' + noMail.join(', '));
      // Expected until the roster is pasted at Gate A, and a hard failure after
      // it, so it names the gate rather than pretending to be a bug.
      return IS9WD_stFail_(detail.join(IS9WD_SEP) +
        '. Paste the 14 names and the 14 addresses into the directory (Gate A).');
    }
    return 'All ' + rows.length + ' directory rows carry a key, a name and an address.';
  });

  IS9WD_stRun_(suite, 'Publish set and carousel orders', ctx.cfg, function () {
    var rows = ctx.cfg.directory.rows;
    var publishing = [];
    for (var i = 0; i < rows.length; i++) if (rows[i].publishes) publishing.push(rows[i]);
    var expect = IS9WD_defaultPublishingRows_();
    var problems = [];
    if (publishing.length !== expect) {
      problems.push(publishing.length + ' rows have Publishes TRUE, not ' + expect +
        '. The carousel arithmetic in 6.1 holds at ' + expect + ' and not above it');
    }
    var seen = {};
    for (var j = 0; j < publishing.length; j++) {
      var n = publishing[j].carouselOrder;
      if (n === null) {
        problems.push(publishing[j].key + ' publishes with no carousel order');
        continue;
      }
      if (n < 1 || n > publishing.length) {
        problems.push(publishing[j].key + ' has carousel order ' + n + ', outside 1 to ' +
          publishing.length);
      }
      if (seen[n]) problems.push('carousel order ' + n + ' is on two rows');
      seen[n] = true;
    }
    for (var k = 1; k <= publishing.length; k++) {
      if (!seen[k]) problems.push('no row holds carousel order ' + k);
    }
    var nonPub = [];
    for (var m = 0; m < rows.length; m++) {
      if (!rows[m].publishes && rows[m].carouselOrder !== null) nonPub.push(rows[m].key);
    }
    if (nonPub.length) {
      problems.push('these do not publish yet hold a carousel order: ' + nonPub.join(', '));
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return publishing.length + ' committees publish and hold the orders 1 to ' +
      publishing.length + ' with no duplicate and no gap.';
  });

  IS9WD_stRun_(suite, 'Hierarchy orders', ctx.cfg, function () {
    var rows = ctx.cfg.directory.rows;
    var seen = {};
    var problems = [];
    for (var i = 0; i < rows.length; i++) {
      var n = rows[i].hierarchy;
      if (n === null) { problems.push(rows[i].key + ' has no hierarchy order'); continue; }
      if (n < 1 || n > rows.length) {
        problems.push(rows[i].key + ' has hierarchy order ' + n + ', outside 1 to ' + rows.length);
      }
      if (seen[n]) problems.push('hierarchy order ' + n + ' is on two rows');
      seen[n] = true;
    }
    for (var k = 1; k <= rows.length; k++) {
      if (!seen[k]) problems.push('no row holds hierarchy order ' + k);
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return 'The hierarchy column holds 1 to ' + rows.length + ' with no repeat.';
  });
}

// Tokens live in Script Properties and never in a cell, because the Canva reader
// account can read every cell of every tab (2.5). K10 is Ethan's own row and
// carries no member token: the admin link is a separate property (4.8).
function IS9WD_stTokens_(suite, ctx) {
  IS9WD_stRun_(suite, 'Tokens issued', ctx.cfg, function () {
    var keys;
    try {
      keys = PropertiesService.getScriptProperties().getKeys();
    } catch (err) {
      return { state: IS9WD_ST.WARN, detail: 'Script Properties could not be read: ' +
        IS9WD_stErr_(err) };
    }
    var have = {};
    for (var i = 0; i < keys.length; i++) have[keys[i]] = true;
    var rows = ctx.cfg.directory.rows;
    var withToken = [];
    var without = [];
    var admin = ctx.cfg.switches.adminEmail;
    var adminRow = IS9WD_CFG.DIRECTORY.adminKey;
    for (var j = 0; j < rows.length; j++) {
      if (have[IS9WD_tokenKey_(rows[j].key)]) withToken.push(rows[j].key);
      else without.push(rows[j].key);
    }
    var problems = [];
    if (IS9WD_ST_HAS_(withToken, adminRow)) {
      problems.push(adminRow + ' holds a member token. It must not: it is the ' +
        'admin row and the admin link is a separate property');
    }
    var expect = rows.length - 1;
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    if (!withToken.length) {
      return { state: IS9WD_ST.WARN, detail: 'No links have been issued yet. ' +
        expect + ' member tokens plus the admin token are due before go live ' +
        '(Phase 6). Admin address is ' + (admin === '' ? 'not set either' : 'set') + '.' };
    }
    if (withToken.length !== expect) {
      return IS9WD_stFail_(withToken.length + ' member tokens exist, not ' + expect +
        '. Missing: ' + IS9WD_stList_(IS9WD_ST_REMOVE_(without, adminRow)) + '.');
    }
    if (!have[IS9WD_PROP.TOKEN_ADMIN]) {
      return IS9WD_stFail_('All ' + expect + ' member tokens exist but the admin ' +
        'token does not.');
    }
    return expect + ' member tokens plus the admin token, and ' + adminRow +
      ' carries no member token, which is correct.';
  });
}

function IS9WD_stTerms_(suite, ctx) {
  IS9WD_stRun_(suite, 'Term calendar', ctx.cfg, function () {
    var rows = ctx.cfg.terms.rows;
    if (!rows.length) {
      return IS9WD_stFail_('The term calendar is empty, so In term is FALSE and ' +
        'every job is paused.');
    }
    var problems = [];
    for (var i = 0; i < rows.length; i++) {
      var t = rows[i];
      if (!t.start) problems.push('row ' + t.row + ' has no start date');
      else if (!IS9WD_isMonday_(t.start)) problems.push('row ' + t.row + ' starts on a day that is not a Monday');
      if (!t.end) problems.push('row ' + t.row + ' has no end date, which pauses every job');
      if (t.start && t.end && t.end < t.start) problems.push('row ' + t.row + ' ends before it starts');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    if (!ctx.cfg.weeks.inTerm) {
      return { state: IS9WD_ST.WARN, detail: 'The calendar is sane but the week of ' +
        IS9WD_stDate_(ctx.cfg.weeks.weekStart) + ' falls in no trimester, so the ' +
        'week number is blank and Ready for Canva reads NO.' };
    }
    return rows.length + ' filled trimester rows, each with a Monday start and an ' +
      'end. Active: ' + ctx.cfg.weeks.termActive + ', week ' +
      IS9WD_two_(ctx.cfg.weeks.weekNumber) + '.';
  });
}

// Prepared by and Checked by change every week, so the store is what stops last
// week's names printing on this week's carousel (4.5).
function IS9WD_stSignoff_(suite, ctx) {
  IS9WD_stRun_(suite, 'Sign-off store', ctx.cfg, function () {
    var so = ctx.cfg.signoff;
    var problems = [];
    var seen = {};
    for (var i = 0; i < so.rows.length; i++) {
      var r = so.rows[i];
      if (!r.weekStart) { problems.push('row ' + r.row + ' has no week start'); continue; }
      if (!IS9WD_isMonday_(r.weekStart)) {
        problems.push('row ' + r.row + ' is keyed on ' + IS9WD_stDate_(r.weekStart) +
          ', which is not a Monday');
      }
      var key = IS9WD_dateKey_(r.weekStart);
      if (seen[key]) problems.push('two rows are keyed on ' + key);
      seen[key] = true;
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    if (so.freeRows < so.minFreeRows) {
      return { state: IS9WD_ST.WARN, detail: so.usedRows + ' rows used with only ' +
        so.freeRows + ' free. Build or repair workbook extends the store by ' +
        so.growBy + ' rows.' };
    }
    if (!so.derivedSet) {
      // Normal on any day before Ethan sets the week's sign-off, and readiness
      // already reads NO, so this is a warning rather than a defect (4.5).
      return { state: IS9WD_ST.WARN, detail: 'No sign-off row for the week of ' +
        IS9WD_stDate_(ctx.cfg.weeks.weekStart) + ' yet, so Ready for Canva reads ' +
        'NO. Set Prepared by and Checked by in the app before Sunday. ' +
        so.usedRows + ' weeks are on record.' };
    }
    return 'This week is signed off, ' + so.usedRows + ' weeks on record, no ' +
      'duplicate and no non-Monday key.';
  });
}

// The only Configuration values that reach Canva as machine input rather than as
// text, which is why a malformed hex is a failure here (4.2).
function IS9WD_stWindows_(suite, ctx) {
  IS9WD_stRun_(suite, 'Urgency hex values', ctx.cfg, function () {
    var rows = ctx.cfg.windows.rows;
    var pattern = /^#[0-9A-Fa-f]{6}$/;
    var problems = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.window === '') { problems.push('window ' + (i + 1) + ' has no name'); continue; }
      if (!pattern.test(r.station)) problems.push(r.window + ' station hex is "' + r.station + '"');
      if (!pattern.test(r.numberText)) problems.push(r.window + ' number text hex is "' + r.numberText + '"');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return rows.length + ' windows, ' + (rows.length * 2) +
      ' hex values, all of the form #RRGGBB.';
  });
}

// Four assertions over 2,000 rows (5.1, 13.4). Rank, Part, Slot on page and
// Master page are blank by contract on an inactive, untitled or unpublishable
// row, so they are checked for consistency rather than for presence.
function IS9WD_stItems_(suite, ctx) {
  IS9WD_stRun_(suite, 'Deliverables grid', ctx.items, function () {
    var problems = [];
    if (ctx.items.shortRows > 0) {
      problems.push('the tab is ' + ctx.items.shortRows + ' rows short of row ' +
        IS9WD_ITEMS.lastRow + ', so the named ranges cannot span 2,000 rows');
    }
    if (ctx.items.shortCols > 0) {
      problems.push('the tab is ' + ctx.items.shortCols + ' columns short of column ' +
        IS9WD_colLetter_(IS9WD_ITEMS.lastCol) + ', the last derived column');
    }
    if (problems.length) return IS9WD_stFail_(problems.join(IS9WD_SEP) +
      '. Run Build or repair workbook.');
    return 'The grid covers rows ' + IS9WD_ITEMS.firstRow + ' to ' + IS9WD_ITEMS.lastRow +
      ' and columns A to ' + IS9WD_colLetter_(IS9WD_ITEMS.lastCol) + '.';
  });

  IS9WD_stRun_(suite, 'Derived item columns', ctx.items, function () {
    var v = ctx.items.values;
    var f = ctx.items.derived;
    var noActive = [];
    var noPubFormula = [];
    var used = 0;
    for (var i = 0; i < v.length; i++) {
      var row = IS9WD_ITEMS.firstRow + i;
      var content = false;
      for (var c = 1; c <= 5; c++) if (IS9WD_filled_(v[i][c])) content = true;
      if (!content) continue;
      used++;
      // Active is a value check: its formula returns "" only when B to F are all
      // empty, so on a used row it must be TRUE or FALSE.
      if (IS9WD_blank_(v[i][10])) noActive.push('row ' + row);
      // Publish key is a formula check, because its value is legitimately blank
      // on the five entries that do not publish (5.1). What must never be blank
      // is the formula itself, which is what a paste over J to Q destroys.
      if (IS9WD_trim_(f[i][1]) === '') noPubFormula.push('row ' + row);
    }
    if (noActive.length || noPubFormula.length) {
      var detail = [];
      if (noActive.length) detail.push('blank Active on ' + IS9WD_stList_(noActive));
      if (noPubFormula.length) detail.push('no Publish key formula on ' + IS9WD_stList_(noPubFormula));
      return IS9WD_stFail_(detail.join(IS9WD_SEP) + '. Run Build or repair workbook.');
    }
    return used + ' rows in use of ' + v.length + ', every one with a derived ' +
      'Active value and a Publish key formula.';
  });

  IS9WD_stRun_(suite, 'Slot keys unique and consistent', ctx.items, function () {
    var v = ctx.items.values;
    var seen = {};
    var dup = [];
    var mismatch = [];
    var count = 0;
    for (var i = 0; i < v.length; i++) {
      var row = IS9WD_ITEMS.firstRow + i;
      var slotKey = IS9WD_trim_(v[i][16]);
      if (slotKey === '') continue;
      count++;
      var want = IS9WD_trim_(v[i][15]) + '-' + IS9WD_trim_(v[i][14]);
      if (slotKey !== want) {
        mismatch.push('row ' + row + ' has "' + slotKey + '" but Master page and ' +
          'Slot on page join to "' + want + '"');
      }
      if (seen[slotKey]) dup.push(slotKey + ' on rows ' + seen[slotKey] + ' and ' + row);
      else seen[slotKey] = row;
    }
    if (dup.length || mismatch.length) {
      return IS9WD_stFail_(IS9WD_stList_(dup.concat(mismatch)));
    }
    return count + ' slot keys, all unique and all equal to Master page plus Slot ' +
      'on page.';
  });

  // A line break or an outer space in a title reaches Canva as text and reaches
  // the app as a broken line (7.5).
  IS9WD_stRun_(suite, 'Titles and remarks clean', ctx.items, function () {
    var v = ctx.items.values;
    var problems = [];
    for (var i = 0; i < v.length; i++) {
      var row = IS9WD_ITEMS.firstRow + i;
      var title = IS9WD_txt_(v[i][2]);
      var remark = IS9WD_txt_(v[i][4]);
      if (title !== '' && title !== IS9WD_normalizeText(title)) {
        problems.push('row ' + row + ' title carries a line break or an outer space');
      }
      if (remark !== '' && remark !== IS9WD_normalizeText(remark)) {
        problems.push('row ' + row + ' remark carries a line break or an outer space');
      }
      if (title.length > IS9WD_MAX_TITLE_) {
        problems.push('row ' + row + ' title is ' + title.length + ' characters');
      }
      if (remark.length > IS9WD_MAX_REMARK_) {
        problems.push('row ' + row + ' remark is ' + remark.length + ' characters');
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return 'No title or remark carries a line break, an outer space or an ' +
      'over-length value.';
  });
}

// The sentinels, the machine keys and the scan extent: the three things that make
// a truncated connector read self evident rather than merely short (6.3).
function IS9WD_stFeedStructure_(suite, ctx) {
  IS9WD_stRun_(suite, 'Feed sentinels', ctx.feed, function () {
    var rows = ctx.layout.sentinelRows;
    if (rows.length !== IS9WD_FEED_SENTINELS.length) {
      return IS9WD_stFail_('The layout names ' + rows.length + ' sentinel rows and ' +
        'the contract lists ' + IS9WD_FEED_SENTINELS.length + '.');
    }
    var problems = [];
    for (var i = 0; i < rows.length; i++) {
      var got = IS9WD_txt_(ctx.feed.disp[rows[i] - 1][1]);
      if (got !== IS9WD_FEED_SENTINELS[i]) {
        problems.push('B' + rows[i] + ' reads "' + got + '" not "' +
          IS9WD_FEED_SENTINELS[i] + '"');
      }
    }
    var identity = IS9WD_txt_(ctx.feed.disp[0][0]);
    if (identity !== IS9WD_TAB.FEED) {
      problems.push('A1 reads "' + identity + '" not "' + IS9WD_TAB.FEED +
        '". The Drive connector strips tab names, so the tab identifies itself ' +
        'from this cell');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return 'All ' + rows.length + ' sentinels present and spelled exactly, and A1 ' +
      'names the tab.';
  });

  IS9WD_stRun_(suite, 'Feed machine keys', ctx.feed, function () {
    var seen = {};
    var dup = [];
    var count = 0;
    for (var r = 0; r < ctx.layout.endRow; r++) {
      var key = IS9WD_trim_(ctx.feed.disp[r][0]);
      if (key === '' || key === IS9WD_FEED_KEY_HEADER || key === IS9WD_FEED_KEY_SENTINEL) continue;
      // Row 1 is the identity row: column A names the tab rather than keying a
      // block, and the start sentinel shares the row with it (6.3).
      if (r === 0) continue;
      count++;
      if (seen[key]) dup.push(key + ' on rows ' + seen[key] + ' and ' + (r + 1));
      else seen[key] = r + 1;
    }
    if (dup.length) {
      return IS9WD_stFail_(dup.length + ' repeated machine keys: ' + IS9WD_stList_(dup) +
        '. Only ' + IS9WD_FEED_KEY_HEADER + ' and ' + IS9WD_FEED_KEY_SENTINEL +
        ' repeat by design.');
    }
    return count + ' machine keys, none repeated.';
  });

  IS9WD_stRun_(suite, 'Feed carries no error text', ctx.feed, function () {
    var hits = [];
    for (var r = 0; r < ctx.layout.endRow; r++) {
      for (var c = 0; c < ctx.feed.cols; c++) {
        var text = IS9WD_trim_(ctx.feed.disp[r][c]);
        if (text === '') continue;
        if (IS9WD_ST_HAS_(IS9WD_ST_ERRORS, text)) {
          hits.push(IS9WD_a1_(r + 1, c + 1, 1, 1) + ' = ' + text);
        }
      }
    }
    if (hits.length) {
      return IS9WD_stFail_(hits.length + ' cells carry an error or the !ERR ' +
        'sentinel: ' + IS9WD_stList_(hits));
    }
    return 'No #REF!, #N/A or !ERR anywhere in ' +
      IS9WD_a1_(1, 1, ctx.layout.endRow, ctx.feed.cols) + '.';
  });

  // The check that catches a resize somebody forgot to widen. A stale scan is
  // worse than no scan: it reads green over the rows it no longer covers (6.4).
  IS9WD_stRun_(suite, 'Feed errors scan extent', ctx.feed, function () {
    var formula = IS9WD_named_('IS9WD_FEED_ERRORS').getFormula();
    var extent = IS9WD_stExtent_(formula);
    if (!extent) {
      return IS9WD_stFail_('The Feed errors cell holds no range this check can ' +
        'read. Formula: ' + formula);
    }
    var needRow = Math.max(ctx.layout.flagLast, ctx.layout.planLast);
    var problems = [];
    if (extent.row < needRow) {
      problems.push('it stops at row ' + extent.row + ' and must reach row ' + needRow +
        ' (Block D ends at ' + ctx.layout.flagLast + ', the plan at ' +
        ctx.layout.planLast + ')');
    }
    if (extent.col < IS9WD_FEED_HEADERS.PLAN.length) {
      problems.push('it stops at column ' + IS9WD_colLetter_(extent.col) +
        ' and must reach column ' + IS9WD_colLetter_(IS9WD_FEED_HEADERS.PLAN.length) +
        ', the plan block\'s last column');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    if (extent.col < ctx.layout.helperLastCol) {
      // 6.4 says in prose that the scan reaches column V, the helper band, and
      // then prints a formula that stops at M. The prose is the stronger claim,
      // because the helpers carry the IFERROR fallbacks the scan exists to catch.
      // Flagged rather than failed, pending a one line ruling.
      return { state: IS9WD_ST.WARN, detail: 'The scan reaches ' +
        IS9WD_colLetter_(extent.col) + ' and row ' + extent.row + ', which covers ' +
        'every visible block. It does not reach the hidden helper band at ' +
        IS9WD_colLetter_(ctx.layout.helperFirstCol) + ' to ' +
        IS9WD_colLetter_(ctx.layout.helperLastCol) + ', which 6.4 asks for in prose ' +
        'and leaves out of its own formula.' };
    }
    return 'The scan reaches ' + IS9WD_colLetter_(extent.col) + extent.row +
      ', at or past the plan block and Block D.';
  });

  IS9WD_stRun_(suite, 'Feed grid', ctx.feed, function () {
    var problems = [];
    if (ctx.feed.shortRows > 0) {
      problems.push('the tab is ' + ctx.feed.shortRows + ' rows short of row ' +
        ctx.layout.endRow + ', where the end sentinel belongs');
    }
    if (ctx.feed.shortCols > 0) {
      problems.push('the tab is ' + ctx.feed.shortCols + ' columns short of column ' +
        IS9WD_colLetter_(ctx.feed.cols) + ', where the helper band belongs');
    }
    if (ctx.feed.lastRow > ctx.layout.endRow) {
      problems.push('there is content down to row ' + ctx.feed.lastRow +
        ', below the end sentinel on row ' + ctx.layout.endRow +
        ', which puts it outside every check');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems) +
      '. Run Build or repair workbook.');
    return 'The grid reaches row ' + ctx.layout.endRow + ' and column ' +
      IS9WD_colLetter_(ctx.feed.cols) + ', and the last used row is ' + ctx.feed.lastRow + '.';
  });
}

// Readiness is the one cell the error scan cannot see, by design (6.4).
function IS9WD_stFeedReadiness_(suite, ctx) {
  IS9WD_stRun_(suite, 'Readiness prefix', ctx.feed, function () {
    var text = IS9WD_txt_(IS9WD_stBlockA_(ctx, 'A.READY'));
    if (text.indexOf(IS9WD_ST_READY_PREFIX) !== 0) {
      return IS9WD_stFail_('Ready for Canva reads "' + text + '", which does not ' +
        'begin "' + IS9WD_ST_READY_PREFIX + '". Feed errors skips that row, so ' +
        'this assertion is the only thing watching it.');
    }
    var answer = text.substring(IS9WD_ST_READY_PREFIX.length);
    if (answer !== 'YES' && answer !== 'NO') {
      return IS9WD_stFail_('The prefix is right but the answer reads "' + answer +
        '" rather than YES or NO.');
    }
    return text;
  });

  IS9WD_stRun_(suite, 'Feed errors cell', ctx.feed, function () {
    var n = IS9WD_int_(IS9WD_stBlockA_(ctx, 'A.ERRORS'));
    if (n === null) {
      return IS9WD_stFail_('Feed errors reads "' + IS9WD_stBlockA_(ctx, 'A.ERRORS') +
        '" rather than a number.');
    }
    if (n > 0) return IS9WD_stFail_('Feed errors counts ' + n + '.');
    return 'Feed errors counts 0.';
  });
}

// The plan is 19 rows whether the week uses them or not, and the export list is
// what the Canva run actually takes, so the two are checked against each other
// rather than each on its own (6.4).
function IS9WD_stFeedPlan_(suite, ctx) {
  IS9WD_stRun_(suite, 'Plan check', ctx.feed, function () {
    var cell = IS9WD_stBlockA_(ctx, 'A.PLAN');
    if (cell !== 'OK') return IS9WD_stFail_('Plan check reads "' + cell + '".');
    return 'Plan check reads OK.';
  });

  IS9WD_stRun_(suite, 'Plan block size and parts', ctx.feed, function () {
    var pageRange = IS9WD_named_('IS9WD_PLAN_PAGE');
    var want = 1 + ctx.cfg.directory.publishingRows * ctx.cfg.switches.maxParts;
    var problems = [];
    if (pageRange.getNumRows() !== want) {
      problems.push('the plan holds ' + pageRange.getNumRows() + ' rows and needs ' +
        want + ', which is 1 title page plus ' + ctx.cfg.directory.publishingRows +
        ' committees times ' + ctx.cfg.switches.maxParts + ' pages');
    }
    var master = IS9WD_int_(IS9WD_stBlockA_(ctx, 'A.MASTER'));
    if (master !== null && master > pageRange.getNumRows()) {
      problems.push('Master pages required is ' + master + ', past the plan block');
    }
    var parts = IS9WD_named_('IS9WD_PLAN_PART').getValues();
    for (var i = 0; i < parts.length; i++) {
      var p = IS9WD_int_(parts[i][0]);
      if (p !== null && p > ctx.cfg.switches.maxParts) {
        problems.push('plan row ' + (i + 1) + ' has part ' + p + ', past the maximum of ' +
          ctx.cfg.switches.maxParts);
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return want + ' plan rows, master pages required ' + master +
      ', and no part past ' + ctx.cfg.switches.maxParts + '.';
  });

  IS9WD_stRun_(suite, 'Export page list', ctx.feed, function () {
    var pages = IS9WD_int_(IS9WD_stBlockA_(ctx, 'A.PAGES'));
    var used = 0;
    var flags = IS9WD_named_('IS9WD_PLAN_USED').getValues();
    for (var i = 0; i < flags.length; i++) if (IS9WD_bool_(flags[i][0])) used++;
    var raw = IS9WD_txt_(IS9WD_stBlockA_(ctx, 'A.EXPORT'));
    var parts = raw === '' ? [] : raw.split(',');
    var list = [];
    var problems = [];
    for (var j = 0; j < parts.length; j++) {
      var n = IS9WD_int_(IS9WD_trim_(parts[j]));
      if (n === null) { problems.push('"' + IS9WD_trim_(parts[j]) + '" is not a whole number'); continue; }
      if (list.length && n <= list[list.length - 1]) {
        problems.push(n + ' does not come after ' + list[list.length - 1] +
          ', so the list is not strictly ascending');
      }
      list.push(n);
    }
    if (pages === null) problems.push('Carousel pages reads "' + IS9WD_stBlockA_(ctx, 'A.PAGES') + '"');
    else {
      if (used !== pages) problems.push(used + ' plan rows are Used and Carousel pages reads ' + pages);
      if (list.length !== pages) problems.push('the export list holds ' + list.length +
        ' pages and Carousel pages reads ' + pages);
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return pages + ' pages, ' + used + ' Used rows, and the list is strictly ' +
      'ascending: ' + raw;
  });
}

// Block D is a budget rather than a bound, because nothing caps the items Ethan
// enters, so truncation has to be detected rather than prevented (6.3).
function IS9WD_stFeedFlags_(suite, ctx) {
  IS9WD_stRun_(suite, 'Flag list check', ctx.feed, function () {
    var cell = IS9WD_stBlockA_(ctx, 'A.FLAGCAP');
    if (cell !== 'OK') return IS9WD_stFail_('Flag list check reads "' + cell + '".');
    return 'Flag list check reads OK.';
  });

  IS9WD_stRun_(suite, 'Block D rows', ctx.feed, function () {
    var flagged = IS9WD_int_(IS9WD_stBlockA_(ctx, 'A.FLAGGED'));
    var range = IS9WD_named_('IS9WD_FLAGS');
    var rows = range.getNumRows();
    var filled = 0;
    for (var r = ctx.layout.flagFirst; r <= ctx.layout.flagLast; r++) {
      if (IS9WD_trim_(ctx.feed.disp[r - 1][0]) !== '') filled++;
    }
    var budget = ctx.cfg.directory.rows.length * ctx.cfg.switches.publishMax;
    var problems = [];
    if (flagged === null) problems.push('Rows with a flag reads "' + IS9WD_stBlockA_(ctx, 'A.FLAGGED') + '"');
    else if (filled !== flagged) {
      problems.push(filled + ' Block D rows are filled and Rows with a flag reads ' +
        flagged);
    }
    if (rows < budget) {
      problems.push('Block D spans ' + rows + ' rows and the budget is ' + budget +
        ', which is ' + ctx.cfg.directory.rows.length + ' entries times ' +
        ctx.cfg.switches.publishMax);
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return filled + ' flagged rows listed in a block of ' + rows + ', budget ' +
      budget + '.';
  });
}

// The one check this build cannot perform. 2.4 forbids UrlFetchApp outright, and
// widening a scope means re-authorizing from the editor and repointing the
// deployment, which an anonymous caller can never answer a prompt for.
function IS9WD_stEndpoint_(suite, ctx) {
  IS9WD_stRun_(suite, 'Endpoint URL', ctx.cfg, function () {
    var url = ctx.cfg.switches.endpointUrl;
    if (url === '') {
      return { state: IS9WD_ST.WARN, detail: 'The endpoint URL is blank. Deploy the ' +
        'web app and paste its /exec URL into Configuration (Phase 4).' };
    }
    if (url.indexOf('https://') !== 0) {
      return IS9WD_stFail_('The endpoint URL does not start with https.');
    }
    if (url.substring(url.length - 5) !== '/exec') {
      return IS9WD_stFail_('The endpoint URL does not end in /exec, so it points at ' +
        'a test deployment rather than the live one.');
    }
    return { state: IS9WD_ST.SKIP, detail: 'The URL is set and well formed. The live ' +
      'ping cannot run from here: UrlFetchApp is forbidden by the manifest (2.4), ' +
      'so answer ping from a signed out browser by hand (13.3).' };
  });
}

function IS9WD_stQuota_(suite) {
  IS9WD_stRun_(suite, 'Remaining mail quota', true, function () {
    var left = MailApp.getRemainingDailyQuota();
    var reserve = null;
    try {
      reserve = IS9WD_int_(IS9WD_named_('IS9WD_QUOTA_RESERVE').getValue());
    } catch (err) {
      reserve = null;
    }
    if (reserve !== null && left <= reserve) {
      return { state: IS9WD_ST.WARN, detail: left + ' messages left today, at or ' +
        'under the reserve of ' + reserve + '. The quota guard stops sending ' +
        'rather than half sending a batch.' };
    }
    return left + ' messages left today' +
      (reserve === null ? '.' : ', reserve ' + reserve + '.');
  });
}


// ============================================================================
//  RESULTS  (04 | Log, the diagnostics cell, and the lines the menu shows)
// ============================================================================

function IS9WD_stSummary_(suite) {
  var count = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0 };
  var firstFail = '';
  for (var i = 0; i < suite.rows.length; i++) {
    var r = suite.rows[i];
    if (count[r.state] === undefined) count[r.state] = 0;
    count[r.state]++;
    if (r.state === IS9WD_ST.FAIL && firstFail === '') firstFail = r.name;
  }
  var line = count.PASS + ' pass, ' + count.FAIL + ' fail, ' + count.WARN +
    ' warn, ' + count.SKIP + ' skip';
  return {
    counts: count,
    ok: count.FAIL === 0,
    firstFail: firstFail,
    line: IS9WD_stampText_(suite.startedAt) + IS9WD_SEP + line +
      (firstFail === '' ? '' : IS9WD_SEP + 'first failure: ' + firstFail)
  };
}

// The Log is append only and the diagnostics cell is code owned, so both writes
// take the document lock. The lock is held for the write alone: a self test that
// held it for the whole run would block the app for as long as it reads.
function IS9WD_stRecord_(suite, summary) {
  try {
    IS9WD_lockedRun_(function () {
      IS9WD_stAppendLog_(suite, summary);
      IS9WD_named_('IS9WD_DIAG_SELFTEST').setValue(summary.line);
      IS9WD_configReset_();
    });
  } catch (err) {
    // The report still returns, because a failed write is the least interesting
    // thing that just happened.
    IS9WD_stAdd_(suite, 'Results recorded', IS9WD_ST.FAIL, IS9WD_stErr_(err));
  }
}

// Appends one row per check. It writes the Log directly rather than through a
// shared logger because IS9WD_Archive.js, which owns the log helper, ships in a
// later phase. Swap this for that helper when it lands: it is one call.
function IS9WD_stAppendLog_(suite, summary) {
  var sheet = IS9WD_sheet_('LOG');
  var stamp = IS9WD_stampText_(suite.startedAt);
  var source = IS9WD_stSource_();
  var rows = [];
  for (var i = 0; i < suite.rows.length; i++) {
    var r = suite.rows[i];
    rows.push([stamp, 'Self test', source, 'Self test' + IS9WD_SEP + r.name, '', '',
      r.detail, r.state]);
  }
  rows.push([stamp, 'Self test', source, 'Self test' + IS9WD_SEP + 'summary', '', '',
    summary.line, summary.ok ? IS9WD_ST.PASS : IS9WD_ST.FAIL]);

  var first = Math.max(sheet.getLastRow() + 1, IS9WD_LOG.firstRow);
  IS9WD_ensureGrid_(sheet, first + rows.length - 1, IS9WD_LOG.lastCol);
  var block = sheet.getRange(first, 1, rows.length, IS9WD_LOG.lastCol);
  block.setValues(rows);

  // Appended rows land below whatever setup formatted, so they are styled here.
  // The background is left alone on purpose: setting one would paint over the
  // banding that Build or repair points at this range.
  IS9WD_style_(block, { size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG });
  IS9WD_applyColumnStyles_(sheet, first, rows.length, 1, IS9WD_LOG.columns);
  IS9WD_setDataHeights_(sheet, first, rows.length);

  // The Result column, so a failure is findable by eye in a 5,000 row log. Bold
  // in the strong accent is the blocking-flag treatment from 2.5.
  var resultCol = IS9WD_LOG.lastCol;
  for (var j = 0; j < rows.length; j++) {
    var state = rows[j][resultCol - 1];
    var cell = sheet.getRange(first + j, resultCol);
    if (state === IS9WD_ST.FAIL) {
      cell.setFontColor(IS9WD_ROLE.FLAG_FG).setFontWeight('bold');
    } else if (state === IS9WD_ST.WARN) {
      cell.setFontColor(IS9WD_ROLE.ACCENT_FG).setFontWeight('bold');
    } else if (state === IS9WD_ST.SKIP) {
      cell.setFontColor(IS9WD_ROLE.MUTED_FG);
    }
  }
}

function IS9WD_stSource_() {
  try {
    SpreadsheetApp.getUi();
    return 'Menu';
  } catch (err) {
    return 'Setup';
  }
}

function IS9WD_stReport_(suite, summary) {
  var out = [summary.line, ''];
  var order = [IS9WD_ST.FAIL, IS9WD_ST.WARN, IS9WD_ST.SKIP, IS9WD_ST.PASS];
  for (var o = 0; o < order.length; o++) {
    for (var i = 0; i < suite.rows.length; i++) {
      var r = suite.rows[i];
      if (r.state !== order[o]) continue;
      out.push(r.state + '  ' + r.name + (r.detail === '' ? '' : IS9WD_SEP + r.detail));
    }
  }
  out.push('');
  out.push(summary.ok
    ? 'Nothing is failing. Warnings are states that are correct today and wrong at ' +
      'go live, so read them before the first live weekend.'
    : 'Fix the failures above before the Sunday run. Every line is in 04 | Log.');
  return out;
}


// ============================================================================
//  SMALL HELPERS  (nothing here reads a cell address)
// ============================================================================

// A check that needs data it did not get reports SKIP rather than throwing over
// the gather's own failure line.
function IS9WD_stRun_(suite, name, need, fn) {
  if (!need) {
    IS9WD_stAdd_(suite, name, IS9WD_ST.SKIP,
      'Not run: the read this check needs did not succeed.');
    return;
  }
  var out;
  try {
    out = fn();
  } catch (err) {
    IS9WD_stAdd_(suite, name, IS9WD_ST.FAIL, 'It threw: ' + IS9WD_stErr_(err));
    return;
  }
  if (out === null || out === undefined) {
    IS9WD_stAdd_(suite, name, IS9WD_ST.PASS, '');
    return;
  }
  if (typeof out === 'string') {
    IS9WD_stAdd_(suite, name, IS9WD_ST.PASS, out);
    return;
  }
  IS9WD_stAdd_(suite, name, out.state || IS9WD_ST.PASS, out.detail || '');
}

function IS9WD_stAdd_(suite, name, state, detail) {
  suite.rows.push({ name: name, state: state, detail: IS9WD_txt_(detail) });
}

function IS9WD_stFail_(detail) {
  return { state: IS9WD_ST.FAIL, detail: detail };
}

function IS9WD_stErr_(err) {
  var msg = err && err.message ? IS9WD_txt_(err.message) : IS9WD_txt_(err);
  return msg === '' ? 'it said nothing, so check the execution log' : msg;
}

// A Block A value by its machine key, so this file names no feed address.
function IS9WD_stBlockA_(ctx, key) {
  for (var i = 0; i < IS9WD_FEED_BLOCK_A.length; i++) {
    if (IS9WD_FEED_BLOCK_A[i][0] !== key) continue;
    var row = ctx.layout.blockAFirst + i;
    return IS9WD_trim_(ctx.feed.disp[row - 1][2]);
  }
  return '';
}

// A long list of problems is truncated rather than sent to a dialog nobody can
// scroll, and it says how many it dropped.
function IS9WD_stList_(items) {
  var max = 8;
  if (items.length <= max) return items.join('; ');
  return items.slice(0, max).join('; ') + '; and ' + (items.length - max) + ' more';
}

function IS9WD_stDate_(d) {
  return IS9WD_isDate_(d) ? IS9WD_dateKey_(d) : 'blank';
}

function IS9WD_ST_IN_(list, value) {
  var want = IS9WD_trim_(value).toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if (IS9WD_trim_(list[i]).toLowerCase() === want) return true;
  }
  return false;
}

function IS9WD_ST_HAS_(list, value) {
  for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
  return false;
}

function IS9WD_ST_REMOVE_(list, value) {
  var out = [];
  for (var i = 0; i < list.length; i++) if (list[i] !== value) out.push(list[i]);
  return out;
}

// The furthest row and column any range in a formula reaches. Parsing the formula
// is the only way to assert the scan's extent: the range is written into the cell
// rather than stored anywhere a reader could ask.
function IS9WD_stExtent_(formula) {
  var text = IS9WD_txt_(formula);
  var pattern = /\$?([A-Za-z]{1,3})\$?(\d+)\s*:\s*\$?([A-Za-z]{1,3})\$?(\d+)/g;
  var best = null;
  var hit;
  while ((hit = pattern.exec(text)) !== null) {
    var row = Math.max(Number(hit[2]), Number(hit[4]));
    var col = Math.max(IS9WD_stColNum_(hit[1]), IS9WD_stColNum_(hit[3]));
    if (!best) best = { row: row, col: col };
    else {
      best.row = Math.max(best.row, row);
      best.col = Math.max(best.col, col);
    }
  }
  return best;
}

function IS9WD_stColNum_(letters) {
  var s = IS9WD_trim_(letters).toUpperCase();
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n;
}
