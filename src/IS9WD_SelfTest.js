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
 *  THE FOUR CHECKS THAT MATTER MOST, because all four fail green
 *    · The Feed errors scan's extent. A scan that stops short reads green over
 *      every row it no longer covers, which is worse than no scan at all, and it
 *      is the thing a resize forgets (6.4).
 *    · The readiness prefix. Feed errors deliberately skips row 5 so readiness
 *      can read it without a circular reference, so nothing else would notice if
 *      C5 broke. Asserting the prefix is what buys that back (6.4).
 *    · The gate agreement on 03 | Statistics. The gates block is a second reading of
 *      the seven gates behind Ready for Canva, and a stale copy of it would read
 *      reassuringly forever. One cell compares the two and this is what watches it (6A).
 *    · The overflow notice on 04 | Officer Tables. Fixed blocks would otherwise drop an
 *      officer's extra items without a word, and a shorter table looks like a quieter
 *      week rather than like a truncation (6B).
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
 *  A line per check to the hidden log tab, the summary to Last self test result in
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
  IS9WD_stTabOrder_(suite, ctx);
  IS9WD_stSettingsTabs_(suite, ctx);
  IS9WD_stStatsStructure_(suite, ctx);
  IS9WD_stStatsCharts_(suite, ctx);
  IS9WD_stStatsOfficers_(suite, ctx);
  IS9WD_stStatsTrend_(suite, ctx);
  IS9WD_stOfficerTables_(suite, ctx);
  IS9WD_stGrid_(suite, ctx);
  IS9WD_stCream_(suite, ctx);
  IS9WD_stEndpoint_(suite, ctx);
  IS9WD_stQuota_(suite);
  IS9WD_stMail_(suite, ctx);

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
    cfg: null, layout: null, statsLayout: null, otLayout: null, viewsLayout: null,
    names: null, audit: null, sheetNames: {}, settings: {},
    feed: null, items: null, stats: null, tables: null, views: null
  };

  try {
    ctx.cfg = IS9WD_readConfig_(true);
    ctx.layout = ctx.cfg.feed;
    ctx.statsLayout = ctx.cfg.stats;
    // The helper tab is sized from the same two settings, and it is read here so half the
    // assertions below have something to compare a dashboard cell against.
    var trendBuilt = IS9WD_namedOrNull_('IS9WD_STATS_TREND_BUILT');
    ctx.viewsLayout = IS9WD_viewsLayout_(ctx.cfg.directory.rows.length,
      trendBuilt ? IS9WD_int_(trendBuilt.getValue()) : 0,
      ctx.cfg.schedule.raw.length, ctx.cfg.switches.statsOfficerRows);
    // Every row map below must describe the tab as it was BUILT, not as the setting
    // currently reads, or a setting changed without a rebuild fails the whole suite
    // instead of the one check that exists to catch exactly that.
    var built = IS9WD_namedOrNull_('IS9WD_OT_ROWS_BUILT');
    ctx.otLayout = built
      ? IS9WD_otLayout_(ctx.cfg.directory.rows.length, IS9WD_int_(built.getValue()))
      : ctx.cfg.ot;
  } catch (err) {
    IS9WD_stAdd_(suite, 'Configuration reads', IS9WD_ST.FAIL, IS9WD_stErr_(err));
    return ctx;
  }
  IS9WD_stAdd_(suite, 'Configuration reads', IS9WD_ST.PASS,
    'Every named range the reader needs resolved on the Configuration tab.');

  try {
    // One getNamedRanges for the whole run: resolving 188 names three times over
    // is three server calls for one answer.
    ctx.names = IS9WD_namedMap_();
    ctx.audit = IS9WD_nameAudit_(ctx.layout, ctx.statsLayout, ctx.otLayout, ctx.viewsLayout);
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

  // The two views, read the same way and for the same reason: display values, because
  // an error cell has to arrive as the text `#REF!` for a scan to see it at all, and
  // the hidden band is read too, because half the assertions are about it.
  ctx.stats = IS9WD_stView_(suite, 'Statistics reads', 'STATS', ctx.statsLayout,
    ctx.statsLayout ? ctx.statsLayout.lastCol : 0);
  ctx.tables = IS9WD_stView_(suite, 'Officer Tables reads', 'TABLES', ctx.otLayout,
    ctx.otLayout ? ctx.otLayout.lastCol : 0);
  ctx.views = IS9WD_stView_(suite, 'Views helper tab reads', 'VIEWS', ctx.viewsLayout,
    ctx.viewsLayout ? ctx.viewsLayout.lastCol : 0);

  // Both settings tabs, read whole: the cream-and-note assertions need the fills and the
  // notes of every cell on them, which is three reads per tab and cannot come out of the
  // configuration reader.
  ctx.settings = {};
  for (var t = 0; t < IS9WD_SETTINGS_TABS.length; t++) {
    var tabKey = IS9WD_SETTINGS_TABS[t].tabKey;
    var holder = IS9WD_SETTINGS_TABS[t].holder;
    try {
      var sheet = IS9WD_sheet_(tabKey);
      var lastRow = Math.min(sheet.getMaxRows(),
        holder.STORE ? holder.STORE.lastRow : holder.SIGNOFF.lastRow);
      var lastCol = Math.min(sheet.getMaxColumns(), holder.LAST_COL);
      var range = sheet.getRange(1, 1, lastRow, lastCol);
      ctx.settings[tabKey] = {
        sheet: sheet, holder: holder, rows: lastRow, cols: lastCol,
        backgrounds: range.getBackgrounds(),
        notes: range.getNotes(),
        disp: range.getDisplayValues(),
        // The formulas as well, so a cell that holds a formula and shows nothing is read as
        // a sheet that has not recalculated rather than as a missing formula.
        formulas: range.getFormulas()
      };
    } catch (err) {
      IS9WD_stAdd_(suite, IS9WD_TAB[tabKey] + ' reads', IS9WD_ST.FAIL, IS9WD_stErr_(err));
      ctx.settings[tabKey] = null;
    }
  }
  return ctx;
}

// One read per view, padded out to the size the layout expects so a grid that is too
// small produces one clear failure rather than thirty index errors.
function IS9WD_stView_(suite, label, tabKey, layout, wantCols) {
  if (!layout) return null;
  try {
    var sheet = IS9WD_sheet_(tabKey);
    var haveRows = Math.min(sheet.getMaxRows(), layout.endRow);
    var haveCols = Math.min(sheet.getMaxColumns(), wantCols);
    // The fills come back as well as the values, because three of the checks below are
    // about paint: cream may not appear on a tab nobody types into, a separator column and
    // a separator row must carry no fill at all, and nothing may be painted past the last
    // built row. Borders cannot be read at all through Apps Script, so the border around
    // each card is asserted by the Node harness and not here.
    return {
      sheet: sheet,
      lastRow: sheet.getLastRow(),
      name: sheet.getName(),
      cols: wantCols,
      maxRows: sheet.getMaxRows(),
      maxCols: sheet.getMaxColumns(),
      frozenRows: sheet.getFrozenRows(),
      frozenCols: sheet.getFrozenColumns(),
      shortRows: layout.endRow - haveRows,
      shortCols: wantCols - haveCols,
      disp: IS9WD_stPad_(
        sheet.getRange(1, 1, haveRows, haveCols).getDisplayValues(),
        layout.endRow, wantCols),
      backgrounds: IS9WD_stPad_(
        sheet.getRange(1, 1, haveRows, haveCols).getBackgrounds(),
        layout.endRow, wantCols)
    };
  } catch (err) {
    IS9WD_stAdd_(suite, label, IS9WD_ST.FAIL, IS9WD_stErr_(err));
    return null;
  }
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
    var want = IS9WD_allNames_(ctx.layout, ctx.statsLayout, ctx.otLayout);
    var growing = IS9WD_stGrowingNames_();
    var wrong = [];
    var heightsBy = {};
    for (var i = 0; i < want.length; i++) {
      var range = ctx.names[want[i].name];
      if (!range) continue;
      var on = range.getSheet().getName();
      var expectSheet = ctx.sheetNames[want[i].tab];
      if (on !== expectSheet) {
        wrong.push(want[i].name + ' is on "' + on + '" not "' + expectSheet + '"');
        continue;
      }
      // Two blocks grow: the sign-off store by 52 rows at a time and 05 | Archive by
      // 1,000, so their names are checked on their start, their width and a height
      // that is a whole number of blocks. Every other name must land exactly where
      // the layout puts it: a name that kept its height and lost a column is what
      // makes a COUNTIFS answer quietly about the wrong column.
      if (growing[want[i].name]) {
        var spec = growing[want[i].name];
        var h = range.getNumRows();
        if (range.getRow() !== spec.firstRow) {
          wrong.push(want[i].name + ' starts on row ' + range.getRow() + ' not ' +
            spec.firstRow);
        }
        if (range.getColumn() !== spec.col || range.getNumColumns() !== spec.cols) {
          wrong.push(want[i].name + ' spans ' + range.getNumColumns() +
            ' columns from column ' + range.getColumn() + ', not ' + spec.cols +
            ' from column ' + spec.col);
        }
        if (h < spec.rows || h % spec.growBy !== 0) {
          wrong.push(want[i].name + ' spans ' + h + ' rows, which is not a whole ' +
            'number of ' + spec.growBy + ' row blocks of at least ' + spec.rows);
        }
        if (!heightsBy[spec.block]) heightsBy[spec.block] = {};
        heightsBy[spec.block][h] = true;
        continue;
      }
      var a1 = range.getA1Notation();
      if (a1 !== want[i].a1) {
        wrong.push(want[i].name + ' spans ' + a1 + ' not ' + want[i].a1);
      }
    }
    var said = [];
    for (var block in heightsBy) {
      if (!Object.prototype.hasOwnProperty.call(heightsBy, block)) continue;
      var list = [];
      for (var h2 in heightsBy[block]) {
        if (Object.prototype.hasOwnProperty.call(heightsBy[block], h2)) list.push(h2);
      }
      if (list.length > 1) {
        wrong.push('the ' + block + ' names disagree on height: ' + list.join(' and '));
      }
      said.push(block + ' at ' + list.join('/') + ' rows');
    }
    if (wrong.length) {
      return IS9WD_stFail_(wrong.length + ' named ranges span the wrong cells: ' +
        IS9WD_stList_(wrong) + '. Run Build or repair workbook.');
    }
    return 'All ' + want.length + ' named ranges span what the layout says, with ' +
      said.join(' and ') + '.';
  });

  // ONE DEFINITION PER NAME, and this is the assertion the directory's Check column bought.
  // `Spreadsheet.setNamedRange` does not move a name that already exists: it adds a second
  // definition, the older one is what a formula resolves, and a reader that builds a map
  // keyed on the name sees the newer one. So a name whose block moved between layouts points
  // at an empty band forever while every check that asks where it points reads clean. The
  // build drops each name before it creates it; this says so.
  IS9WD_stRun_(suite, 'No named range is defined twice', true, function () {
    var dupes = IS9WD_namedDuplicates_();
    if (dupes.length) {
      return IS9WD_stFail_(dupes.length + ' name(s) carry more than one definition: ' +
        IS9WD_stList_(dupes) + '. The older definition is the one every formula resolves, ' +
        'so these point wherever an earlier layout put them. Run Build or repair workbook.');
    }
    return 'Every named range on the workbook carries exactly one definition, so no ' +
      'formula can be reading an earlier layout.';
  });

  IS9WD_stRun_(suite, 'Retired names absent', ctx.audit, function () {
    if (ctx.audit.retiredPresent.length) {
      return IS9WD_stFail_('Retired: ' + ctx.audit.retiredPresent.join(', ') +
        ' still resolves. A formula still reading it is a formula nobody updated.');
    }
    return IS9WD_RETIRED_NAMES.join(' and ') + ' do not resolve, which is correct.';
  });
}

// Every name over a block that grows, built from the same column maps setup writes
// them from: the seven over the sign-off store and the six over 05 | Archive. A
// growing block's declared last row is stale the moment it grows, so an exact A1
// comparison would fail on a healthy workbook.
function IS9WD_stGrowingNames_() {
  var out = {};
  var store = IS9WD_ENG.STORE;
  var storeRows = store.lastRow - store.firstRow + 1;
  var put = function (name, col, cols, firstRow, rows, growBy, block) {
    out[name] = {
      col: col, cols: cols, firstRow: firstRow, rows: rows,
      growBy: growBy, block: block
    };
  };
  put('IS9WD_SIGNOFF', 1, 6, store.firstRow, storeRows, store.growBy, 'the sign-off store');
  for (var c in IS9WD_STORE_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STORE_COL_NAMES, c)) continue;
    put(IS9WD_STORE_COL_NAMES[c], Number(c), 1, store.firstRow, storeRows,
      store.growBy, 'the sign-off store');
  }
  var arc = IS9WD_ARCHIVE;
  var arcRows = arc.lastRow - arc.firstRow + 1;
  for (var a in IS9WD_ARC_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_ARC_COL_NAMES, a)) continue;
    put(IS9WD_ARC_COL_NAMES[a], Number(a), 1, arc.firstRow, arcRows, arc.growBy,
      'the archive');
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
        '. Every ticked row needs a slide in the Canva master, so the count and the ' +
        'master have to agree. Checks > Switch the carousel to all fourteen sets it');
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
    var drift = IS9WD_stPublishDrift_(rows);
    if (drift.length) problems.push(IS9WD_stList_(drift));
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return publishing.length + ' officers publish and hold the slide numbers 1 to ' +
      publishing.length + ' with no duplicate and no gap.';
  });

  // A ticked row and a slide number are physical claims on a Canva page somebody drew by
// hand, so the set is compared to the shipping defaults row by row rather than only
// counted. A count alone passes on a workbook where an office was ticked and a committee
// unticked, which is the same total and a different fourteen people.
function IS9WD_stPublishDrift_(rows) {
  var want = {};
  for (var d = 0; d < IS9WD_DEFAULTS.DIRECTORY.length; d++) {
    var def = IS9WD_DEFAULTS.DIRECTORY[d];
    want[IS9WD_trim_(def[0]).toUpperCase()] = {
      publishes: def[4] === true,
      order: IS9WD_int_(def[1])
    };
  }
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var expect = want[IS9WD_trim_(row.key).toUpperCase()];
    if (!expect) continue;
    if (row.publishes !== expect.publishes) {
      out.push(row.key + ' is ' + (row.publishes ? 'ticked' : 'not ticked') +
        ' on the carousel and the shipping set says ' +
        (expect.publishes ? 'ticked' : 'not ticked'));
    }
    if (row.carouselOrder !== expect.order) {
      out.push(row.key + ' holds slide number ' +
        (row.carouselOrder === null ? 'blank' : row.carouselOrder) +
        ' and the shipping set says ' + (expect.order === null ? 'blank' : expect.order));
    }
  }
  return out;
}

// THE CHECK COLUMN OF THE PEOPLE, read as a person reads it. Every other directory check
  // here reads the values; this one reads what the sheet actually prints in the column Ethan
  // looks at, because the fault of 2026-09-27 was a column that printed "On the carousel
  // with no slide number" on every publishing row while every value behind it was right.
  // Missing names and addresses are expected before Gate A and are not a failure; a
  // machinery message is.
  IS9WD_stRun_(suite, 'The People check column reads clean', ctx.settings.CONFIG,
    function () {
      var d = IS9WD_CFG.DIRECTORY;
      var read = ctx.settings.CONFIG;
      var expected = ['No name yet', 'No email yet', 'Your own admin link',
        'No private link yet: run Build or repair workbook', 'OK'];
      var problems = [];
      var clean = 0;
      for (var r = d.firstRow; r <= d.lastRow; r++) {
        if (r > read.rows || d.checkCol > read.cols) break;
        var key = IS9WD_trim_(read.disp[r - 1][0]);
        if (key === '') continue;
        var text = IS9WD_trim_(read.disp[r - 1][d.checkCol - 1]);
        if (text === '') {
          var held = IS9WD_trim_(read.formulas[r - 1][d.checkCol - 1]);
          if (held === '') {
            problems.push(key + ' on row ' + r + ' has no Check formula at all');
          }
          continue;
        }
        if (IS9WD_ST_HAS_(expected, text)) { clean++; continue; }
        problems.push(key + ' on row ' + r + ' reads "' + text + '"');
      }
      if (problems.length) {
        return IS9WD_stFail_(IS9WD_stList_(problems) +
          '. A slide number or a link message here on a freshly built workbook means a ' +
          'named range the column reads points at the wrong place, not that anything in ' +
          IS9WD_TAB.ENGINE + ' is wrong. Run Build or repair workbook.');
      }
      return clean + ' of the 14 rows read clean, and not one reports a missing slide ' +
        'number, a duplicate slide number or a missing link.';
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

// The plan holds one row per physical master page whether the week uses them or not, 15 of
// them on the shipping setting, and the export list is what the Canva run actually takes,
// so the two are checked against each other rather than each on its own (6.4).
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
        ' officers times ' + ctx.cfg.switches.maxParts + ' pages');
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

// ============================================================================
//  THE TWO VIEWS  (13.4: the assertions 6A and 6B add)
// ============================================================================

// Seven tabs in one order, and no frozen column anywhere. The freeze assertion is
// Ethan's instruction of 2026-09-27 made testable: a column freeze restored by hand, or
// left behind by an older build, is otherwise invisible until somebody scrolls.
function IS9WD_stTabOrder_(suite, ctx) {
  IS9WD_stRun_(suite, 'Tab order', ctx.cfg, function () {
    var problems = [];
    var order = [];
    for (var i = 0; i < IS9WD_TAB_ORDER.length; i++) {
      var key = IS9WD_TAB_ORDER[i];
      var sheet = IS9WD_sheet_(key);
      order.push(sheet.getName());
      if (sheet.getIndex() !== i + 1) {
        problems.push(key + ' is at position ' + sheet.getIndex() + ' not ' + (i + 1));
      }
    }
    // EVERY TAB'S LIVE NAME MUST EQUAL ITS CANONICAL NAME, and until 2026-09-28 nothing
    // anywhere in this project compared the two. A tab left under an old number by a
    // rename that did not fire read perfectly clean forever, while its own banner printed
    // the new one, which is exactly the failure the renumber to eight tabs could produce.
    for (var nm = 0; nm < IS9WD_TAB_ORDER.length; nm++) {
      var nmKey = IS9WD_TAB_ORDER[nm];
      var live = IS9WD_sheet_(nmKey).getName();
      if (live !== IS9WD_TAB[nmKey]) {
        problems.push(nmKey + ' is named "' + live + '" and should be "' +
          IS9WD_TAB[nmKey] + '". Add the old name to IS9WD_SETUP_FORMER_NAMES_ and run ' +
          'Build or repair workbook, or rename the tab by hand');
      }
    }

    // THE ONE POSITION THAT IS A CONSTRAINT RATHER THAN A READING ORDER, and it is
    // asserted by its reason rather than by a number. A truncated connector read must lose
    // the Archive and the Log before it loses a contract string, so the feed has to sit
    // ahead of every tab the read is allowed to lose. Hardcoding "second" failed on a
    // correct workbook the moment the Dashboard took the front of the order (10.1).
    var mayLose = ['ITEMS', 'STATS', 'TABLES', 'ARCHIVE', 'LOG'];
    var feedAt = IS9WD_sheet_('FEED').getIndex();
    for (var ml = 0; ml < mayLose.length; ml++) {
      var theirs = IS9WD_sheet_(mayLose[ml]).getIndex();
      if (theirs < feedAt) {
        problems.push(IS9WD_TAB[mayLose[ml]] + ' sits ahead of ' + IS9WD_TAB.FEED +
          ' in the connector read, so a truncated read could lose a contract string ' +
          'before it loses that tab');
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    // A tab of Ethan's own is reported rather than failed: setup moves the seven it
    // owns to positions 1 to 7 and pushes anything else below them, and taking his
    // scratch space would be worse than mentioning it.
    var extra = IS9WD_ss_().getSheets().length - IS9WD_TAB_ORDER.length;
    return IS9WD_TAB_ORDER.length + ' tabs in order: ' + order.join(', ') +
      (extra > 0 ? IS9WD_SEP + extra + ' other tab(s) sit below them' : '') + '.';
  });

  // THE DASHBOARD IS READ ONLY AND NO CELL ON IT IS CREAM. That is the whole of its
  // contract with the cream rule, and it is the one thing about this tab that a later
  // change could break without anyone noticing, because a cream cell on a tab nobody types
  // into destroys the only visual rule a first time reader can learn in one second.
  IS9WD_stRun_(suite, 'The dashboard is built and carries no cream', ctx.cfg, function () {
    var layout = IS9WD_dash_();
    var sheet = IS9WD_sheet_('DASHBOARD');
    var problems = [];
    if (sheet.getMaxRows() !== layout.endRow) {
      problems.push('it holds ' + sheet.getMaxRows() + ' rows and the layout declares ' +
        layout.endRow);
    }
    if (sheet.getMaxColumns() !== layout.lastCol) {
      problems.push('it holds ' + sheet.getMaxColumns() + ' columns and the layout ' +
        'declares ' + layout.lastCol);
    }
    var cream = 0;
    var creamAt = '';
    var fills = sheet.getRange(1, 1, layout.endRow, layout.lastCol).getBackgrounds();
    for (var r = 0; r < fills.length; r++) {
      for (var c = 0; c < fills[r].length; c++) {
        if (IS9WD_trim_(fills[r][c]).toLowerCase() !== IS9WD_CLR.CREAM.toLowerCase()) {
          continue;
        }
        cream++;
        if (creamAt === '') creamAt = IS9WD_a1_(r + 1, c + 1, 1, 1);
      }
    }
    if (cream) {
      problems.push(cream + ' cells are cream, the first at ' + creamAt +
        ', on a tab nobody types into');
    }
    // A card must fill its own grid cell, or three cards in one row of the grid do not
    // line up at the bottom, which is the single thing that makes a grid look unfinished.
    for (var k = 0; k < layout.cards.length; k++) {
      var card = layout.cards[k];
      var row = layout.rowsOfThree[card.gridRow];
      if (card.blockLastRow !== row.lastRow) {
        problems.push(card.key + ' ends at row ' + card.blockLastRow + ' and its row of ' +
          'three ends at ' + row.lastRow);
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return layout.cards.length + ' cards in ' + layout.rowsOfThree.length +
      ' rows of three, reaching ' + IS9WD_a1_(layout.endRow, layout.lastCol, 1, 1) +
      ', and not one cream cell on it.';
  });

  IS9WD_stRun_(suite, 'Nothing is frozen on any tab', ctx.cfg, function () {
    var problems = [];
    for (var i = 0; i < IS9WD_TAB_ORDER.length; i++) {
      var key = IS9WD_TAB_ORDER[i];
      var sheet = IS9WD_sheet_(key);
      var want = IS9WD_FREEZE[key] || { rows: 0, cols: 0 };
      if (sheet.getFrozenColumns() !== 0) {
        problems.push(key + ' freezes ' + sheet.getFrozenColumns() + ' column(s)');
      }
      if (want.cols !== 0) {
        problems.push('the layout asks ' + key + ' to freeze a column, which is no ' +
          'longer allowed');
      }
      if (sheet.getFrozenRows() !== want.rows) {
        problems.push(key + ' freezes ' + sheet.getFrozenRows() + ' row(s) not ' + want.rows);
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return 'Nothing is frozen anywhere, rows or columns, on any of the ' +
      IS9WD_TAB_ORDER.length + ' tabs.';
  });
}

// ============================================================================
//  THE SETTINGS TABS  (4: the cream rule, the hints, and what is hidden)
// ============================================================================

// THE CREAM RULE IS AN ACCEPTANCE CHECK, not a style preference. Ethan's instruction of
// 2026-09-27 was that every cell he is expected to type into carries the cream fill and a
// plain English explanation, per cell, and that a cell he must never type into is not
// cream and reads as calculated. A fill and a note are exactly the two things a person
// cannot verify by reading the code, so they are asserted here over the live tabs:
//
//   · every Ethan owned or append owned cell is #e9ebd4 and carries a note
//   · every calculated cell is NOT #e9ebd4 and carries the calculated note
//   · every input row carries visible hint text in the hint column
//   · every table block carries one hint per column in the row under its band
//
// A workbook that passes every other check and fails this one is a workbook that is
// correct and unreadable, which is the failure this whole revision was about.
function IS9WD_stSettingsTabs_(suite, ctx) {
  for (var t = 0; t < IS9WD_SETTINGS_TABS.length; t++) {
    IS9WD_stSettingsTab_(suite, ctx, IS9WD_SETTINGS_TABS[t].tabKey);
  }

  IS9WD_stRun_(suite, 'Hidden tabs are hidden and the feed is not', ctx.cfg, function () {
    var problems = [];
    for (var i = 0; i < IS9WD_TAB_ORDER.length; i++) {
      var key = IS9WD_TAB_ORDER[i];
      var sheet = IS9WD_sheet_(key);
      var shouldHide = IS9WD_ST_HAS_(IS9WD_HIDDEN_TABS, key);
      if (shouldHide && !sheet.isSheetHidden()) {
        problems.push(IS9WD_TAB[key] + ' is visible and should be hidden');
      }
      if (!shouldHide && sheet.isSheetHidden()) {
        problems.push(IS9WD_TAB[key] + ' is hidden and should be visible');
      }
    }
    // The one that matters most, and the reason it is its own sentence: whether the Drive
    // connector includes a hidden tab in its read is unmeasured, and the Sunday Canva run
    // depends on reading this tab. Hiding it would risk the one thing the build exists for.
    if (IS9WD_sheet_('FEED').isSheetHidden()) {
      problems.push(IS9WD_TAB.FEED + ' is hidden, and it must never be: the weekly Canva ' +
        'run reads it through the Drive connector');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return IS9WD_HIDDEN_TABS.length + ' tabs hidden (' + IS9WD_HIDDEN_TABS.join(', ') +
      ') and the other ' + (IS9WD_TAB_ORDER.length - IS9WD_HIDDEN_TABS.length) +
      ' visible, including ' + IS9WD_TAB.FEED + '.';
  });

  // The join between the two halves of the directory is by row position, so the two Key
  // columns have to hold the same fourteen keys in the same order or an officer's slide
  // number belongs to somebody else.
  IS9WD_stRun_(suite, 'The two directory halves line up', ctx.cfg, function () {
    var mismatch = ctx.cfg.directory.keyMismatch || [];
    if (mismatch.length) {
      return IS9WD_stFail_(mismatch.length + ' rows disagree: ' + IS9WD_stList_(mismatch) +
        '. The two halves are joined by row, so never insert, delete or sort a row on ' +
        'either one.');
    }
    var engine = ctx.cfg.directory.engineRaw || [];
    if (engine.length !== ctx.cfg.directory.rows.length) {
      return IS9WD_stFail_('The machinery half holds ' + engine.length +
        ' rows and the people half ' + ctx.cfg.directory.rows.length + '.');
    }
    return 'All ' + engine.length + ' rows carry the same key on ' + IS9WD_TAB.CONFIG +
      ' and on ' + IS9WD_TAB.ENGINE + '.';
  });
}

// One settings tab, four assertions in one check, because a reader wants one line per tab
// rather than four.
function IS9WD_stSettingsTab_(suite, ctx, tabKey) {
  var label = IS9WD_TAB[tabKey] + ': cream, notes and hints';
  IS9WD_stRun_(suite, label, ctx.settings[tabKey], function () {
    var page = ctx.settings[tabKey];
    var holder = page.holder;
    var cream = IS9WD_INPUT_BG.toLowerCase();
    var problems = [];
    var inputs = 0;
    var calculated = 0;

    var at = function (row, col) {
      if (row < 1 || row > page.rows || col < 1 || col > page.cols) return null;
      return { row: row, col: col };
    };
    var fill = function (cell) {
      return IS9WD_trim_(page.backgrounds[cell.row - 1][cell.col - 1]).toLowerCase();
    };
    var note = function (cell) {
      return IS9WD_trim_(page.notes[cell.row - 1][cell.col - 1]);
    };
    var shown = function (cell) {
      return IS9WD_trim_(page.disp[cell.row - 1][cell.col - 1]);
    };
    var name = function (cell) {
      return IS9WD_a1_(cell.row, cell.col, 1, 1);
    };

    for (var b = 0; b < holder.BLOCKS.length; b++) {
      var block = holder[holder.BLOCKS[b]];

      // Every block carries its own plain English line as the note on its heading, and a
      // row block carries it visibly in the hint row under the heading as well. A table
      // block does not: that row holds one hint per column, over the column it describes,
      // which is worth more than a repeat of the block line.
      var title = at(block.titleRow, holder.FIRST_COL);
      if (title && note(title) === '') {
        problems.push('the heading of ' + block.title + ' carries no explanation as a note');
      }
      if (block.rows && block.hintRow) {
        var hint = at(block.hintRow, holder.FIRST_COL);
        if (hint && shown(hint) === '') {
          problems.push('the block ' + block.title + ' has no explanation in row ' +
            block.hintRow);
        }
      }

      if (block.rows) {
        for (var r = 0; r < block.rows.length; r++) {
          var row = block.rows[r];
          var value = at(row.row, holder.VALUE_COL);
          if (!value) continue;
          var isInput = !row.formula && row.owner !== IS9WD_OWN.CODE &&
            row.owner !== IS9WD_OWN.SCRIPT;
          if (isInput) {
            inputs++;
            if (fill(value) !== cream) {
              problems.push(name(value) + ' is typed into and is not cream');
            }
            if (note(value) === '') {
              problems.push(name(value) + ' is typed into and carries no note');
            }
            var beside = at(row.row, holder.HINT_COL);
            if (beside && shown(beside) === '') {
              problems.push(name(value) + ' has no hint beside it in column ' +
                IS9WD_colLetter_(holder.HINT_COL));
            }
          } else {
            calculated++;
            if (fill(value) === cream) {
              problems.push(name(value) + ' is calculated and is cream, which says the ' +
                'opposite of what it is');
            }
            if (note(value) !== IS9WD_CFG_CALC_HINT) {
              problems.push(name(value) + ' is calculated and does not carry the ' +
                'calculated note');
            }
          }
        }
        continue;
      }

      // A table block: one hint per column in the hint row, and cream plus a note on
      // every cell of every column a person fills.
      for (var c = 0; c < block.columns.length; c++) {
        var col = block.columns[c];
        var colIndex = block.firstCol + c;
        var head = at(block.hintRow, colIndex);
        var mine = col.owner === IS9WD_OWN.ETHAN || col.owner === IS9WD_OWN.APPEND;
        if (col.hint && head && shown(head) !== IS9WD_txt_(col.hint)) {
          problems.push('the column ' + col.header + ' of ' + block.title +
            ' has "' + shown(head).substring(0, 40) + '" above it rather than its own hint');
        }
        var firstCell = at(block.firstRow, colIndex);
        var lastCell = at(block.lastRow, colIndex);
        if (!firstCell || !lastCell) continue;
        if (mine) {
          inputs += block.lastRow - block.firstRow + 1;
          if (fill(firstCell) !== cream || fill(lastCell) !== cream) {
            problems.push('the column ' + col.header + ' of ' + block.title +
              ' is typed into and is not cream from ' + name(firstCell) + ' to ' +
              name(lastCell));
          }
          if (col.hint && note(firstCell) === '') {
            problems.push('the column ' + col.header + ' of ' + block.title +
              ' is typed into and its cells carry no note');
          }
        } else {
          calculated += block.lastRow - block.firstRow + 1;
          if (fill(firstCell) === cream) {
            problems.push('the column ' + col.header + ' of ' + block.title +
              ' is not typed into and is cream');
          }
        }
      }
    }

    if (problems.length) {
      return IS9WD_stFail_(problems.length + ' cells break the cream rule: ' +
        IS9WD_stList_(problems) + '. Run Build or repair workbook.');
    }
    return inputs + ' cells are cream and carry a note, ' + calculated +
      ' are calculated and carry none, and every block explains itself.';
  });
}

// ============================================================================
//  THE THREE CHARTS  (6A: inserted, anchored, and never doubled)
// ============================================================================

// THE ONE FAILURE THAT COMPOUNDS SILENTLY. `insertChart` appends and has no replace form,
// so a build run twice leaves six charts stacked on three anchors and a build run five
// times leaves fifteen. Nothing on screen says so: the charts sit exactly on top of each
// other and the tab looks right until the file is slow. So the count is asserted, not
// trusted, and it is asserted against the declared list rather than against a number.
function IS9WD_stStatsCharts_(suite, ctx) {
  IS9WD_stRun_(suite, 'Charts are built and not doubled', ctx.stats, function () {
    var s = ctx.statsLayout;
    var charts = ctx.stats.sheet.getCharts();
    var want = IS9WD_STATS_CHARTS.length;
    if (charts.length !== want) {
      return IS9WD_stFail_('The tab holds ' + charts.length + ' charts and the layout ' +
        'declares ' + want + '. More than ' + want + ' means a build appended instead of ' +
        'replacing, which doubles on every run. Run Build or repair workbook.');
    }
    // THE THREE CHARTS NOW SIT SIDE BY SIDE IN ONE ROW OF THE GRID, so a chart is identified
    // by its anchor row AND its anchor column. Keying on the row alone would read three
    // charts in three cards as three charts stacked on one anchor, which is the very fault
    // this check exists to catch.
    var problems = [];
    var anchors = {};
    for (var i = 0; i < charts.length; i++) {
      var info = charts[i].getContainerInfo();
      var row = info.getAnchorRow();
      var col = info.getAnchorColumn();
      var at = row + ',' + col;
      if (anchors[at]) {
        problems.push('two charts are anchored on row ' + row + ' column ' +
          IS9WD_colLetter_(col));
      }
      anchors[at] = true;
      var inside = false;
      for (var c = 0; c < s.charts.length; c++) {
        if (row >= s.charts[c].firstRow && row <= s.charts[c].lastRow &&
          col >= s.charts[c].firstCol && col <= s.charts[c].lastCol) inside = true;
      }
      if (!inside) {
        problems.push('a chart is anchored at ' + IS9WD_colLetter_(col) + row +
          ', which is not inside any reserved chart band');
      }
    }
    // Every caption has to say something, because a caption is the whole of what an empty
    // chart can tell a reader. It sits in its own card's first column.
    for (var k = 0; k < s.charts.length; k++) {
      var spot = s.charts[k];
      var caption = IS9WD_trim_(ctx.stats.disp[spot.captionRow - 1][spot.firstCol - 1]);
      if (caption === '') {
        problems.push('the caption above the chart in card ' + (k + 1) +
          ' is blank, so an empty chart would say nothing');
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return want + ' charts, one per reserved band, each with a caption that says what it ' +
      'shows or what will fill it.';
  });

  // The helper tab is the other half of the dashboard, and a broken helper reads as a
  // blank dashboard rather than as an error, so it gets its own line.
  IS9WD_stRun_(suite, 'The views helper tab is sound', ctx.views, function () {
    var v = ctx.viewsLayout;
    var problems = [];
    if (ctx.views.shortRows > 0) {
      problems.push('the tab is ' + ctx.views.shortRows + ' rows short of row ' + v.endRow);
    }
    if (ctx.views.shortCols > 0) {
      problems.push('the tab is ' + ctx.views.shortCols + ' columns short of column ' +
        IS9WD_colLetter_(v.lastCol));
    }
    var banner = IS9WD_txt_(ctx.views.disp[0][0]);
    if (banner !== IS9WD_VIEWS.BANNER) {
      problems.push('A1 reads "' + banner + '" not "' + IS9WD_VIEWS.BANNER + '"');
    }
    var end = IS9WD_txt_(ctx.views.disp[v.endRow - 1][0]);
    if (end !== IS9WD_VIEWS.END) {
      problems.push('the last row reads "' + end + '" not "' + IS9WD_VIEWS.END + '"');
    }
    var counted = IS9WD_int_(IS9WD_named_('IS9WD_VIEWS_ERRORS').getValue());
    if (counted !== 0) problems.push('the tab own error count reads ' + counted);
    for (var r = 0; r < v.endRow; r++) {
      for (var c = 0; c < v.lastCol; c++) {
        var text = IS9WD_trim_(ctx.views.disp[r][c]);
        if (text !== '' && IS9WD_ST_HAS_(IS9WD_ST_ERRORS, text)) {
          problems.push(IS9WD_a1_(r + 1, c + 1, 1, 1) + ' = ' + text);
        }
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems) +
      '. Run Checks > Rebuild the views.');
    return 'The helper band, the ranked sort, the trend helpers, operational health and ' +
      'the scheduled jobs all read clean to row ' + v.endRow + '.';
  });
}

// The statistics tab's own furniture: the grid, the end marker, the error count, the
// gate agreement and the two layout settings that need a rebuild to take effect.
function IS9WD_stStatsStructure_(suite, ctx) {
  IS9WD_stRun_(suite, 'Statistics grid and markers', ctx.stats, function () {
    var s = ctx.statsLayout;
    var problems = [];
    if (ctx.stats.shortRows > 0) {
      problems.push('the tab is ' + ctx.stats.shortRows + ' rows short of row ' +
        s.endRow + ', where the end marker belongs');
    }
    if (ctx.stats.shortCols > 0) {
      problems.push('the tab is ' + ctx.stats.shortCols + ' columns short of column ' +
        IS9WD_colLetter_(s.lastCol));
    }
    // The helper band moved to `_Views`, so a hidden column here is a leftover from an
    // older layout and it hides a KPI tile or a chart caption.
    if (ctx.stats.sheet.isColumnHiddenByUser(s.lastCol)) {
      problems.push('column ' + IS9WD_colLetter_(s.lastCol) + ' is hidden, and no column ' +
        'on this tab may be: the helper band lives on ' + IS9WD_TAB.VIEWS + ' now');
    }
    if (ctx.stats.lastRow > s.endRow) {
      problems.push('there is content down to row ' + ctx.stats.lastRow +
        ', below the end marker, which puts it outside every check');
    }
    var banner = IS9WD_txt_(ctx.stats.disp[0][0]);
    if (banner !== IS9WD_STATS.BANNER) {
      problems.push('A1 reads "' + banner + '" not "' + IS9WD_STATS.BANNER +
        '". The Drive connector strips tab names, so the tab identifies itself from ' +
        'this cell');
    }
    var end = IS9WD_txt_(ctx.stats.disp[s.endRow - 1][0]);
    if (end !== IS9WD_STATS.END) {
      problems.push('the last row reads "' + end + '" not "' + IS9WD_STATS.END +
        '", so a truncated read of this tab would not be self evident');
    }
    problems = problems.concat(IS9WD_stMerged_(ctx.stats.sheet, IS9WD_TAB.STATS));
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems) +
      '. Run Build or repair workbook.');
    return 'The grid reaches ' + IS9WD_colLetter_(s.lastCol) + s.endRow +
      ', A1 names the tab, the last row carries the end marker, and nothing is merged.';
  });

  IS9WD_stRun_(suite, 'Statistics carries no error text', ctx.stats, function () {
    var s = ctx.statsLayout;
    var hits = [];
    for (var r = 0; r < s.endRow; r++) {
      for (var c = 0; c < ctx.stats.cols; c++) {
        var text = IS9WD_trim_(ctx.stats.disp[r][c]);
        if (text === '') continue;
        if (IS9WD_ST_HAS_(IS9WD_ST_ERRORS, text)) {
          hits.push(IS9WD_a1_(r + 1, c + 1, 1, 1) + ' = ' + text);
        }
      }
    }
    var counted = IS9WD_int_(IS9WD_named_('IS9WD_STATS_ERRORS').getValue());
    if (hits.length) {
      return IS9WD_stFail_(hits.length + ' cells carry an error or the !ERR sentinel: ' +
        IS9WD_stList_(hits) + '. The tab counts ' + counted + '.');
    }
    if (counted !== 0) {
      return IS9WD_stFail_('No cell reads as an error and the tab\'s own count reads ' +
        counted + ', so the count and the scan disagree.');
    }
    return 'No error text anywhere, and the tab\'s own error count reads 0.';
  });

  // The one assertion that can tell a stale copy of the seven gate list from a correct
  // one. Without it the gates block could drift from readiness and read reassuringly.
  IS9WD_stRun_(suite, 'Readiness gates agree with the feed', ctx.stats, function () {
    var agree = IS9WD_trim_(IS9WD_named_('IS9WD_STATS_GATE_AGREE').getValue());
    var states = IS9WD_named_('IS9WD_STATS_GATE_STATE').getValues();
    var holds = [];
    var labels = IS9WD_named_('IS9WD_STATS_GATE_LABEL').getValues();
    for (var i = 0; i < states.length; i++) {
      var state = IS9WD_trim_(states[i][0]);
      if (state !== 'PASS' && state !== 'HOLD') {
        return IS9WD_stFail_('gate "' + IS9WD_txt_(labels[i][0]) + '" reads "' + state +
          '" rather than PASS or HOLD.');
      }
      if (state === 'HOLD') holds.push(IS9WD_txt_(labels[i][0]));
    }
    if (states.length !== IS9WD_STATS_GATE_ROWS.length) {
      return IS9WD_stFail_('the gates block holds ' + states.length +
        ' rows and the layout names ' + IS9WD_STATS_GATE_ROWS.length + '.');
    }
    if (agree !== 'OK') {
      return IS9WD_stFail_('The gate agreement cell reads "' + agree +
        '". The gates say ' + (holds.length ? holds.join(', ') + ' hold' : 'nothing holds') +
        ', and Ready for Canva disagrees. One of the two is a stale copy of the rule.');
    }
    return holds.length === 0
      ? 'All ' + states.length + ' gates pass and Ready for Canva agrees.'
      : holds.length + ' of ' + states.length + ' gates hold (' + holds.join(', ') +
        ') and Ready for Canva agrees.';
  });

  // A layout setting changed without a rebuild fails here rather than showing a stale
  // tab. The two guard notes in 00 | Configuration say the same thing on screen.
  IS9WD_stRun_(suite, 'View layout settings match the build', ctx.stats, function () {
    var problems = [];
    var trendBuilt = IS9WD_int_(IS9WD_named_('IS9WD_STATS_TREND_BUILT').getValue());
    var rowsBuilt = IS9WD_int_(IS9WD_named_('IS9WD_OT_ROWS_BUILT').getValue());
    var trendWant = ctx.cfg.switches.statsTrendWeeks;
    var rowsWant = ctx.cfg.switches.statsOfficerRows;
    if (trendBuilt !== trendWant) {
      problems.push('Statistics: trend weeks reads ' + trendWant + ' and the tab was ' +
        'built with ' + trendBuilt);
    }
    if (rowsBuilt !== rowsWant) {
      problems.push('Rows reserved per officer reads ' + rowsWant + ' and the tab was ' +
        'built with ' + rowsBuilt);
    }
    var trendRows = IS9WD_named_('IS9WD_STATS_TRENDSTART').getNumRows();
    if (trendRows !== trendWant) {
      problems.push('the trend block spans ' + trendRows + ' rows and the setting ' +
        'reads ' + trendWant);
    }
    if (problems.length) {
      return IS9WD_stFail_(IS9WD_stList_(problems) +
        '. Run Build or repair workbook so the tabs match the settings.');
    }
    return 'Both layout settings match what was built: ' + trendWant +
      ' trend weeks and ' + rowsWant + ' rows reserved per officer.';
  });
}

// The officer block, which every other block and the whole officer tables tab read.
function IS9WD_stStatsOfficers_(suite, ctx) {
  // MINIFS and MAXIFS are the only two spreadsheet functions this workbook asks to
  // broadcast under ARRAYFORMULA whose array-criterion behaviour is not documented.
  // If either returns a scalar instead, all 14 rows quietly take the first officer's
  // answer, every officer reads the same earliest deadline, and nothing else notices.
  // So the check recomputes both from the items and compares, which needs no new range.
  IS9WD_stRun_(suite, 'Earliest deadline and last tick broadcast per officer', ctx.stats,
    function () {
      var names = IS9WD_named_('IS9WD_STATS_OFF_NAME').getValues();
      var firstDue = IS9WD_named_('IS9WD_STATS_OFF_FIRSTDUE').getValues();
      var committee = IS9WD_named_('IS9WD_DEL_COMMITTEE').getValues();
      var deadline = IS9WD_named_('IS9WD_DEL_DEADLINE').getValues();
      var title = IS9WD_named_('IS9WD_DEL_TITLE').getValues();
      var active = IS9WD_named_('IS9WD_DEL_ACTIVE').getValues();
      var problems = [];
      var compared = 0;
      for (var i = 0; i < names.length; i++) {
        var who = IS9WD_txt_(names[i][0]);
        if (!who) continue;
        var want = 0;
        for (var r = 0; r < committee.length; r++) {
          if (IS9WD_txt_(committee[r][0]) !== who) continue;
          if (!IS9WD_filled_(title[r][0]) || active[r][0] !== true) continue;
          var day = IS9WD_isDate_(deadline[r][0]) ? IS9WD_midnight_(deadline[r][0]).getTime() : 0;
          if (!day) continue;
          if (!want || day < want) want = day;
        }
        // MINIFS over no matching rows returns 0, which a date-formatted cell renders
        // as 1899-12-30. That is the empty answer, not a wrong one.
        var cell = firstDue[i][0];
        var got = IS9WD_isDate_(cell) ? IS9WD_midnight_(cell).getTime() : 0;
        if (got && new Date(got).getFullYear() < 1900) got = 0;
        if (want !== got) {
          problems.push(who + ' reads ' + (got ? IS9WD_dateKey_(new Date(got)) : 'blank') +
            ' and the items say ' + (want ? IS9WD_dateKey_(new Date(want)) : 'blank'));
        }
        compared++;
      }
      if (problems.length) {
        return IS9WD_stFail_(IS9WD_stList_(problems) +
          '. MINIFS or MAXIFS is not broadcasting under ARRAYFORMULA on this sheet, so ' +
          'the helper band needs the per row fallback named in reference 6A.');
      }
      return 'Earliest deadline agrees with the items for all ' + compared + ' officers.';
    });

  IS9WD_stRun_(suite, 'Officer rows match the directory', ctx.stats, function () {
    var names = IS9WD_named_('IS9WD_STATS_OFF_NAME').getValues();
    var rows = ctx.cfg.directory.inHierarchy;
    var problems = [];
    if (names.length !== rows.length) {
      problems.push('the block holds ' + names.length + ' rows and the directory ' +
        rows.length);
    }
    var seen = {};
    for (var i = 0; i < names.length && i < rows.length; i++) {
      var got = IS9WD_txt_(names[i][0]);
      var want = IS9WD_txt_(rows[i].committee);
      if (got !== want) {
        problems.push('row ' + (i + 1) + ' reads "' + got + '" and hierarchy order ' +
          (i + 1) + ' is "' + want + '"');
      }
      if (seen[got]) problems.push('"' + got + '" appears twice');
      seen[got] = true;
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return 'All ' + names.length + ' officers, once each, in hierarchy order, the ' +
      'President first and ' + IS9WD_txt_(names[names.length - 1][0]) + ' last.';
  });

  // The cross check that the two windows are not quietly confused: the all-items
  // columns the officer tables read must reconcile with each other and with the feed.
  IS9WD_stRun_(suite, 'Officer totals reconcile', ctx.stats, function () {
    var active = IS9WD_named_('IS9WD_STATS_OFF_ACTIVE_ALL').getValues();
    var done = IS9WD_named_('IS9WD_STATS_OFF_DONE_ALL').getValues();
    var total = IS9WD_named_('IS9WD_STATS_OFF_TOTAL').getValues();
    var names = IS9WD_named_('IS9WD_STATS_OFF_NAME').getValues();
    var problems = [];
    var sum = 0;
    for (var i = 0; i < total.length; i++) {
      var a = IS9WD_int_(active[i][0]) || 0;
      var d = IS9WD_int_(done[i][0]) || 0;
      var t = IS9WD_int_(total[i][0]);
      if (t === null || t !== a + d) {
        problems.push(IS9WD_txt_(names[i][0]) + ' totals ' + total[i][0] + ' against ' +
          a + ' active plus ' + d + ' done');
      }
      sum += a;
    }
    // Skipped rather than failed when the feed could not be read: that is the feed's
    // own failure line to report, and a view must never be blamed for it.
    var feedTotal = ctx.feed ? IS9WD_int_(IS9WD_stBlockA_(ctx, 'A.TOTAL')) : null;
    if (feedTotal !== null && sum !== feedTotal) {
      problems.push('the fourteen active counts sum to ' + sum +
        ' and the feed\'s Total active deliverables reads ' + feedTotal +
        ', which means an item sits under a committee no directory row names');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return 'Every officer\'s total equals active plus done, and the fourteen active ' +
      'counts sum to the feed\'s ' + sum + '.';
  });

  // The honesty rule behind the ranking: a rate is suppressed entirely below the
  // minimum rather than printed as 0% or 100% off one item.
  IS9WD_stRun_(suite, 'On time is suppressed below the minimum', ctx.stats, function () {
    var onTime = IS9WD_named_('IS9WD_STATS_OFF_ONTIME').getValues();
    var judged = IS9WD_named_('IS9WD_STATS_OFF_JUDGED').getValues();
    var names = IS9WD_named_('IS9WD_STATS_OFF_NAME').getValues();
    var min = ctx.cfg.switches.statsMinJudged;
    var problems = [];
    var scored = 0;
    for (var i = 0; i < onTime.length; i++) {
      var j = IS9WD_int_(judged[i][0]);
      var v = onTime[i][0];
      var name = IS9WD_txt_(names[i][0]);
      if (j === null || j < 0) { problems.push(name + ' has Judged "' + judged[i][0] + '"'); continue; }
      if (min !== null && j < min) {
        if (IS9WD_filled_(v)) {
          problems.push(name + ' scores ' + v + ' off only ' + j + ' judged items');
        }
        continue;
      }
      var n = IS9WD_num_(v);
      if (n === null || n < 0 || n > 1) {
        problems.push(name + ' has ' + j + ' judged items and reads "' + v + '"');
        continue;
      }
      scored++;
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return scored + ' of ' + onTime.length + ' officers have at least ' + min +
      ' items past their deadline and carry a rate; the rest are blank by design.';
  });

  // A publishing officer must agree with the feed about the one number both tabs print, or
  // two tabs are telling Ethan different things about the same week. All fourteen publish
  // since 2026-09-28, so the blank branch below guards a row somebody unticks rather than
  // five standing rows, and it stays for exactly that reason.
  IS9WD_stRun_(suite, 'Not on carousel agrees with the feed', ctx.stats, function () {
    var carousel = IS9WD_named_('IS9WD_STATS_OFF_CAROUSEL').getValues();
    var notPub = IS9WD_named_('IS9WD_STATS_OFF_NOTPUB').getValues();
    var names = IS9WD_named_('IS9WD_STATS_OFF_NAME').getValues();
    var ordinals = IS9WD_named_('IS9WD_OFFICER_ORDINAL').getValues();
    var feedNotPub = IS9WD_named_('IS9WD_NOTPUB').getValues();
    var byOrdinal = {};
    for (var f = 0; f < ordinals.length; f++) {
      byOrdinal[IS9WD_int_(ordinals[f][0])] = IS9WD_int_(feedNotPub[f][0]);
    }
    var problems = [];
    var checked = 0;
    for (var i = 0; i < carousel.length; i++) {
      var ord = IS9WD_int_(carousel[i][0]);
      var name = IS9WD_txt_(names[i][0]);
      if (ord === null) {
        if (IS9WD_filled_(notPub[i][0])) {
          problems.push(name + ' does not publish yet carries "' + notPub[i][0] +
            '" in Not on carousel, which must be blank by contract');
        }
        continue;
      }
      checked++;
      var mine = IS9WD_int_(notPub[i][0]);
      var theirs = byOrdinal[ord];
      if (theirs === undefined) {
        problems.push(name + ' holds carousel order ' + ord + ' and the feed has no ' +
          'officer row for it');
      } else if (mine !== theirs) {
        problems.push(name + ' reads ' + mine + ' past the carousel and the feed reads ' +
          theirs);
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return 'All ' + checked + ' publishing officers agree with the feed' +
      (checked === carousel.length ? ', and every officer publishes.'
        : ', and the rest are blank because they have no slide.');
  });
}

// The trend block, and the two states that are warnings rather than defects.
function IS9WD_stStatsTrend_(suite, ctx) {
  IS9WD_stRun_(suite, 'Trend weeks are consecutive Mondays', ctx.stats, function () {
    var starts = IS9WD_named_('IS9WD_STATS_TRENDSTART').getValues();
    var want = ctx.cfg.switches.statsTrendWeeks;
    var problems = [];
    if (want !== null && starts.length !== want) {
      problems.push('the block holds ' + starts.length + ' rows and the setting reads ' +
        want);
    }
    var previous = null;
    for (var i = 0; i < starts.length; i++) {
      var d = IS9WD_midnight_(starts[i][0]);
      if (!d) { problems.push('row ' + (i + 1) + ' holds no date'); continue; }
      if (!IS9WD_isMonday_(d)) {
        problems.push('row ' + (i + 1) + ' is ' + IS9WD_dateKey_(d) + ', not a Monday');
      }
      if (previous) {
        var gap = Math.round((d.getTime() - previous.getTime()) / 86400000);
        if (gap !== 7) {
          problems.push('row ' + (i + 1) + ' is ' + gap + ' days after the row above');
        }
      }
      previous = d;
    }
    // Oldest first, so the newest row is the week before this one and the sparkline
    // reads left to right in time.
    var weekStart = ctx.cfg.weeks.weekStart;
    if (previous && weekStart) {
      var expect = IS9WD_addDays_(weekStart, -7);
      if (IS9WD_dateKey_(previous) !== IS9WD_dateKey_(expect)) {
        problems.push('the newest trend row is ' + IS9WD_dateKey_(previous) +
          ' and the week before this one is ' + IS9WD_dateKey_(expect));
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return starts.length + ' consecutive Mondays, oldest first, ending at ' +
      IS9WD_dateKey_(previous) + '.';
  });

  IS9WD_stRun_(suite, 'Trend has something to read', ctx.stats, function () {
    var recorded = IS9WD_named_('IS9WD_STATS_TRENDRECORDED').getValues();
    var missing = 0;
    for (var i = 0; i < recorded.length; i++) {
      if (IS9WD_trim_(recorded[i][0]) === 'Not archived') missing++;
    }
    if (missing === recorded.length) {
      // Expected until an archive job is switched on, and the block says so on screen
      // rather than printing a wall of zeros, so this is a warning and not a defect.
      return { state: IS9WD_ST.WARN, detail: 'No week in the trend block was ever ' +
        'archived, so the whole block reads Not archived. It fills once the archive ' +
        'job runs, which is not built yet, or once Archive this week is run from the menu.' };
    }
    if (missing) {
      return { state: IS9WD_ST.WARN, detail: missing + ' of ' + recorded.length +
        ' trend weeks were never archived.' };
    }
    return 'All ' + recorded.length + ' trend weeks carry archive rows.';
  });

  IS9WD_stRun_(suite, 'Row room left', ctx.stats, function () {
    var weeks = IS9WD_int_(IS9WD_named_('IS9WD_STATS_ROOM_WEEKS').getValue());
    var warn = ctx.cfg.switches.statsRoomWeeksWarn;
    if (weeks === null) {
      return { state: IS9WD_ST.WARN, detail: 'Weeks of row room left does not read as ' +
        'a number yet, which is what an empty data tab looks like.' };
    }
    if (warn !== null && weeks < warn) {
      return { state: IS9WD_ST.WARN, detail: weeks + ' weeks of room left at the rate ' +
        'of the last four weeks, under the warning level of ' + warn +
        '. Retire accomplished items to reclaim rows.' };
    }
    return weeks + ' weeks of room left at the rate of the last four weeks.';
  });
}

// 04 | Officer Tables, including the one assertion the whole tab turns on: that
// nothing was silently left out.
function IS9WD_stOfficerTables_(suite, ctx) {
  IS9WD_stRun_(suite, 'Officer tables grid and markers', ctx.tables, function () {
    var o = ctx.otLayout;
    var problems = [];
    if (ctx.tables.shortRows > 0) {
      problems.push('the tab is ' + ctx.tables.shortRows + ' rows short of row ' +
        o.endRow + ', where the end marker belongs');
    }
    if (ctx.tables.shortCols > 0) {
      problems.push('the tab is ' + ctx.tables.shortCols + ' columns short of column ' +
        IS9WD_colLetter_(o.lastCol));
    }
    if (ctx.tables.lastRow > o.endRow) {
      problems.push('there is content down to row ' + ctx.tables.lastRow +
        ', below the end marker');
    }
    var banner = IS9WD_txt_(ctx.tables.disp[0][0]);
    if (banner !== IS9WD_OT.BANNER) {
      problems.push('A1 reads "' + banner + '" not "' + IS9WD_OT.BANNER + '"');
    }
    var end = IS9WD_txt_(ctx.tables.disp[o.endRow - 1][0]);
    if (end !== IS9WD_OT.END) {
      problems.push('the last row reads "' + end + '" not "' + IS9WD_OT.END + '"');
    }
    var counted = IS9WD_int_(IS9WD_named_('IS9WD_OT_ERRORS').getValue());
    if (counted !== 0) problems.push('the tab\'s own error count reads ' + counted);
    for (var r = 0; r < o.endRow; r++) {
      for (var c = 0; c < o.lastCol; c++) {
        var text = IS9WD_trim_(ctx.tables.disp[r][c]);
        if (text !== '' && IS9WD_ST_HAS_(IS9WD_ST_ERRORS, text)) {
          problems.push(IS9WD_a1_(r + 1, c + 1, 1, 1) + ' = ' + text);
        }
      }
    }
    problems = problems.concat(IS9WD_stMerged_(ctx.tables.sheet, IS9WD_TAB.TABLES));
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems) +
      '. Run Build or repair workbook.');
    return o.blocks.length + ' blocks in ' + o.endRow + ' rows, A1 names the tab, the ' +
      'last row carries the end marker, nothing is merged and no cell reads as an error.';
  });

  IS9WD_stRun_(suite, 'Officer table blocks', ctx.tables, function () {
    var o = ctx.otLayout;
    var names = IS9WD_named_('IS9WD_STATS_OFF_NAME').getValues();
    var problems = [];
    var seen = {};
    for (var i = 0; i < o.blocks.length; i++) {
      var block = o.blocks[i];
      var ord = IS9WD_int_(ctx.tables.disp[block.bandRow - 1][block.keyCol - 1]);
      if (ord === null) {
        problems.push('the band on row ' + block.bandRow + ' in column ' +
          IS9WD_colLetter_(block.firstCol) + ' carries no hierarchy ordinal');
        continue;
      }
      if (seen[ord]) problems.push('ordinal ' + ord + ' is on two bands');
      seen[ord] = true;
      if (ord < 1 || ord > names.length) {
        problems.push('the band on row ' + block.bandRow + ' carries ordinal ' + ord +
          ', outside 1 to ' + names.length);
        continue;
      }
      var want = IS9WD_upper_(IS9WD_txt_(names[ord - 1][0]));
      var band = IS9WD_txt_(ctx.tables.disp[block.bandRow - 1][block.firstCol - 1]);
      // The band opens with its ordinal, "01 of 14", and names the officer after it, so
      // the name is contained rather than leading. Requiring position 0 failed all
      // fourteen cards on a workbook that was in fact correct.
      if (want !== '' && band.indexOf(want) < 0) {
        problems.push('the band on row ' + block.bandRow + ' reads "' +
          band.substring(0, 40) + '" and ordinal ' + ord + ' is "' + want + '"');
      }
    }
    for (var k = 1; k <= o.blocks.length; k++) {
      if (!seen[k]) problems.push('no band carries ordinal ' + k);
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return o.blocks.length + ' bands, ordinals 1 to ' + o.blocks.length +
      ' with no duplicate and no gap, each naming its own officer.';
  });

  // THE ANTI-SILENT-TRUNCATION ASSERTION. Fixed blocks plus ARRAY_CONSTRAIN would
  // otherwise drop an officer's extra items without a word, which is the one failure
  // this tab is not allowed to have.
  IS9WD_stRun_(suite, 'Nothing is hidden without a notice', ctx.tables, function () {
    var o = ctx.otLayout;
    var totals = IS9WD_named_('IS9WD_STATS_OFF_TOTAL').getValues();
    var names = IS9WD_named_('IS9WD_STATS_OFF_NAME').getValues();
    var problems = [];
    var hidden = 0;
    for (var i = 0; i < o.blocks.length; i++) {
      var block = o.blocks[i];
      var ord = IS9WD_int_(ctx.tables.disp[block.bandRow - 1][block.keyCol - 1]);
      if (ord === null || ord < 1 || ord > totals.length) continue;
      var total = IS9WD_int_(totals[ord - 1][0]);
      if (total === null) continue;
      // THE CARD'S OWN FIRST COLUMN, not column A. The three cards in one grid row share one
    // notice row, so reading column A checked card one three times and never checked cards
    // two and three at all.
    var notice = IS9WD_trim_(ctx.tables.disp[block.noticeRow - 1][block.firstCol - 1]);
      var over = total - o.itemRows;
      var name = IS9WD_txt_(names[ord - 1][0]);
      if (over > 0) {
        hidden++;
        if (notice === '') {
          problems.push(name + ' has ' + total + ' items and ' + o.itemRows +
            ' rows to show them in, and the notice row is blank');
        } else if (notice.indexOf('+ ' + over + ' more') !== 0) {
          problems.push(name + ' hides ' + over + ' items and the notice reads "' +
            notice.substring(0, 40) + '"');
        }
      } else if (notice !== '') {
        problems.push(name + ' fits in ' + o.itemRows + ' rows and the notice row ' +
          'reads "' + notice.substring(0, 40) + '"');
      }
    }
    var summary = IS9WD_txt_(IS9WD_named_('IS9WD_OT_SUMMARY').getValue());
    if (hidden > 0 && summary.indexOf('Not shown below') !== 0) {
      problems.push(hidden + ' officers have items hidden and the summary row reads "' +
        summary.substring(0, 40) + '"');
    }
    if (hidden === 0 && summary.indexOf('Every officer') !== 0) {
      problems.push('nothing is hidden and the summary row reads "' +
        summary.substring(0, 40) + '"');
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return hidden === 0
      ? 'Every officer\'s full list fits, and the summary row says so.'
      : hidden + ' officers have more items than the ' + o.itemRows + ' rows reserved, ' +
        'and each one carries a notice and is named in the summary row.';
  });

  // The sort key is what orders every block and what the muted rule reads, so a
  // malformed key is a block in the wrong order and an accomplished row that does not
  // read as one.
  // WHAT THE DEAD keyCols ARRAY WAS FOR, done as a check instead of as an unread field. The
  // hidden sort key column of each card is computed from keyOffset, while IS9WD_HIDE_COLS
  // names the columns to hide as literals. Those two drifted apart once already, on the day
  // keyOffset was corrected from 8 to 7, and the symptom was 280 machine sort keys sitting
  // visible inside the cards with an empty hidden column beside them.
  IS9WD_stRun_(suite, 'The hidden key column is the one that is hidden', ctx.tables,
    function () {
      var o = IS9WD_officerTables_();
      var hide = IS9WD_HIDE_COLS.TABLES || [];
      var want = [];
      for (var c = 0; c < o.cells.length; c++) want.push(o.cells[c].firstCol + o.keyOffset);
      var got = [];
      for (var h = 0; h < hide.length; h++) {
        for (var col = hide[h].first; col <= hide[h].last; col++) got.push(col);
      }
      var problems = [];
      if (got.length !== want.length) {
        problems.push('the layout computes ' + want.length + ' key columns and ' +
          got.length + ' are listed as hidden');
      }
      for (var i = 0; i < want.length; i++) {
        if (IS9WD_stIndexOf_(got, want[i]) < 0) {
          problems.push('column ' + IS9WD_colLetter_(want[i]) + ' holds a sort key and is ' +
            'not hidden');
        }
      }
      if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
      return 'All ' + want.length + ' sort key columns are hidden, and nothing else is.';
    });

  IS9WD_stRun_(suite, 'Officer table sort keys', ctx.tables, function () {
    var o = ctx.otLayout;
    var problems = [];
    var count = 0;
    for (var i = 0; i < o.blocks.length; i++) {
      var block = o.blocks[i];
      for (var r = block.itemFirst; r <= block.itemLast; r++) {
        var key = IS9WD_trim_(ctx.tables.disp[r - 1][block.keyCol - 1]);
        if (key === '') continue;
        count++;
        var lead = key.substring(0, 1);
        if (lead !== '0' && lead !== '1') {
          problems.push('row ' + r + ' has a key beginning "' + lead +
            '" rather than 0 for active or 1 for done');
        }
        if (IS9WD_int_(key.substring(1, 7)) === null) {
          problems.push('row ' + r + ' has a key whose deadline part is "' +
            key.substring(1, 7) + '"');
        }
      }
    }
    if (problems.length) return IS9WD_stFail_(IS9WD_stList_(problems));
    return count + ' item rows, every key carrying the derived Active flag and a ' +
      'six digit deadline. Nothing here keys on a status label.';
  });
}

// Nothing on either view may be merged: the Drive connector renders a merged cell as a
// repeated `[merged]` value, and both tabs are inside the same read.
function IS9WD_stMerged_(sheet, label) {
  var merged = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
    .getMergedRanges();
  if (!merged.length) return [];
  var where = [];
  for (var i = 0; i < merged.length && i < 4; i++) where.push(merged[i].getA1Notation());
  return [merged.length + ' merged range(s) on ' + label + ' at ' + where.join(', ') +
    ', which the Drive connector renders as repeated [merged] values'];
}

// ============================================================================
//  THE GRID, THE TRIM AND THE CREAM RULE  (2.5, and the three faults of 2026-09-27)
// ============================================================================

// Ethan's three across grid, asserted from the layout and from what a sheet can actually be
// asked: three cards to a row, exactly one empty column between neighbours, exactly one empty
// row between stacked rows of three, the grid running past column AA, and nothing painted
// past the last built row.
//
// THE BORDER AROUND EACH CARD IS NOT ASSERTED HERE, and the reason is a limit of Apps Script
// rather than a choice: there is no API that reads a cell's border. The Node harness reads
// the border off its own fake and asserts it there, which is the only place it can be
// asserted at all.
function IS9WD_stGrid_(suite, ctx) {
  var views = [
    { key: 'STATS', label: IS9WD_TAB.STATS, layout: ctx.statsLayout, read: ctx.stats,
      wantCards: 9, wantRows: 3 },
    { key: 'TABLES', label: IS9WD_TAB.TABLES, layout: ctx.otLayout, read: ctx.tables,
      wantCards: null, wantRows: null }
  ];

  for (var v = 0; v < views.length; v++) {
    var view = views[v];
    IS9WD_stRun_(suite, view.label + ': three across grid', view.read, function () {
      var L = view.layout;
      var read = view.read;
      var problems = [];

      if (!L.cells || L.cells.length !== IS9WD_GRID.ACROSS) {
        return IS9WD_stFail_('the layout declares ' +
          (L.cells ? L.cells.length : 0) + ' cards across, not ' + IS9WD_GRID.ACROSS);
      }
      // Three cells, each the same width, each exactly one column after the one before it.
      for (var i = 0; i < L.cells.length; i++) {
        var cell = L.cells[i];
        if (cell.lastCol - cell.firstCol + 1 !== L.cellCols) {
          problems.push('card column ' + (i + 1) + ' spans ' +
            (cell.lastCol - cell.firstCol + 1) + ' columns, not ' + L.cellCols);
        }
        if (i > 0 && cell.firstCol !== L.cells[i - 1].lastCol + 1 + IS9WD_GRID.GAP) {
          problems.push('card column ' + (i + 1) + ' starts at ' +
            IS9WD_colLetter_(cell.firstCol) + ', which is not exactly ' + IS9WD_GRID.GAP +
            ' column after ' + IS9WD_colLetter_(L.cells[i - 1].lastCol));
        }
      }
      if (L.gapCols.length !== IS9WD_GRID.ACROSS - 1) {
        problems.push(L.gapCols.length + ' separator columns, not ' +
          (IS9WD_GRID.ACROSS - 1));
      }
      if (L.lastCol < 27) {
        problems.push('the grid stops at column ' + IS9WD_colLetter_(L.lastCol) +
          ', short of AA, so it is not using the width of the sheet');
      }

      // Every row of cards is a full row of three except the last, which may be short.
      for (var g = 0; g < L.gridRows.length; g++) {
        var row = L.gridRows[g];
        var full = g < L.gridRows.length - 1;
        if (full && row.cards !== IS9WD_GRID.ACROSS) {
          problems.push('row of cards ' + (g + 1) + ' holds ' + row.cards + ', not ' +
            IS9WD_GRID.ACROSS);
        }
        if (row.cards < 1 || row.cards > IS9WD_GRID.ACROSS) {
          problems.push('row of cards ' + (g + 1) + ' holds ' + row.cards);
        }
        // Exactly one empty row between this row of cards and the next.
        if (g > 0) {
          var gapRow = row.firstRow - 1;
          if (gapRow !== L.gridRows[g - 1].lastRow + 1) {
            problems.push('there are ' + (row.firstRow - L.gridRows[g - 1].lastRow - 1) +
              ' rows between rows of cards ' + g + ' and ' + (g + 1) + ', not 1');
          }
          if (IS9WD_stIndexOf_(L.spacerRows, gapRow) < 0) {
            problems.push('row ' + gapRow + ' separates two rows of cards and is not in ' +
              'the layout\'s own separator list');
          }
        }
      }

      // A SEPARATOR CARRIES NO FILL BETWEEN THE CARDS, which is the one thing about the
      // paint a sheet can be asked. It is asserted between the first card row and the row
      // above the end band, and deliberately NOT across the tab's own chrome: the banner,
      // the help line and the end band are the tab speaking rather than a card, they run
      // the tab's full width, and punching the separators out of them cut the green bar
      // into three pieces with two white notches in it. Asserting row 1 is what made this
      // check fail on a workbook whose header was finally correct.
      var cols = Math.min(read.cols, L.lastCol);
      var firstCardRow = L.gridRows && L.gridRows.length ? L.gridRows[0].firstRow : 1;
      var lastCardRow = L.endRow - 1;
      for (var gc = 0; gc < L.gapCols.length; gc++) {
        var at = L.gapCols[gc];
        if (at > cols) continue;
        for (var r = firstCardRow; r <= lastCardRow; r++) {
          if (IS9WD_stPainted_(read.backgrounds[r - 1][at - 1])) {
            problems.push('the separator column ' + IS9WD_colLetter_(at) + ' is painted ' +
              read.backgrounds[r - 1][at - 1] + ' on row ' + r);
            break;
          }
        }
      }
      for (var gr = 0; gr < L.spacerRows.length; gr++) {
        var rowAt = L.spacerRows[gr];
        if (rowAt > L.endRow) continue;
        for (var c = 1; c <= cols; c++) {
          if (IS9WD_stPainted_(read.backgrounds[rowAt - 1][c - 1])) {
            problems.push('the separator row ' + rowAt + ' is painted ' +
              read.backgrounds[rowAt - 1][c - 1] + ' in column ' + IS9WD_colLetter_(c));
            break;
          }
        }
      }

      // NOTHING PAST THE LAST BUILT ROW OR COLUMN, and the grid ends exactly there. A tab
      // trimmed to its own end row cannot carry paint below it, which is the whole fix.
      if (read.maxRows !== L.endRow) {
        problems.push('the tab holds ' + read.maxRows + ' rows and its last built row is ' +
          L.endRow + ', so ' + (read.maxRows - L.endRow) + ' rows sit past the end marker');
      }
      if (read.maxCols !== L.lastCol) {
        problems.push('the tab holds ' + read.maxCols + ' columns and its last built one ' +
          'is ' + IS9WD_colLetter_(L.lastCol));
      }

      if (problems.length) {
        return IS9WD_stFail_(IS9WD_stList_(problems) + '. Run Build or repair workbook.');
      }
      return L.cards.length + ' cards, ' + IS9WD_GRID.ACROSS + ' across in ' +
        L.gridRows.length + ' stacked rows, one empty column between neighbours and one ' +
        'empty row between rows, the grid reaching ' + IS9WD_colLetter_(L.lastCol) +
        L.endRow + ' and nothing past it.';
    });
  }
}

// CREAM MEANS ONE THING: YOU TYPE HERE. Ethan's instruction of 2026-09-27, and the reason
// the blocking-flag style lost its fill. A tab nobody types into must carry no cream fill at
// all, so a flag style that reaches for cream again fails here rather than in his face.
//
// The two settings tabs are covered by their own check, which asserts cream on every input
// cell AND on nothing else. This one covers the tabs where cream is never right.
function IS9WD_stCream_(suite, ctx) {
  IS9WD_stRun_(suite, 'Cream is only on cells you type into', ctx.stats, function () {
    var reads = [
      [IS9WD_TAB.STATS, ctx.stats], [IS9WD_TAB.TABLES, ctx.tables],
      [IS9WD_TAB.VIEWS, ctx.views]
    ];
    var problems = [];
    var scanned = 0;
    for (var i = 0; i < reads.length; i++) {
      var label = reads[i][0];
      var read = reads[i][1];
      if (!read || !read.backgrounds) continue;
      for (var r = 0; r < read.backgrounds.length; r++) {
        for (var c = 0; c < read.backgrounds[r].length; c++) {
          scanned++;
          if (IS9WD_stSameHex_(read.backgrounds[r][c], IS9WD_INPUT_BG)) {
            problems.push(label + ' ' + IS9WD_a1_(r + 1, c + 1, 1, 1) + ' is cream');
            if (problems.length > 8) break;
          }
        }
        if (problems.length > 8) break;
      }
    }
    // The feed is read only too, and its own read carries no fills, so the one cell that
    // could go wrong there is asserted through the rule list instead.
    if (problems.length) {
      return IS9WD_stFail_(IS9WD_stList_(problems) +
        '. Cream is reserved for a cell you type into, so a calculated cell must never ' +
        'carry it. A flag is bold ' + IS9WD_ROLE.FLAG_FG + ' text on ' +
        IS9WD_ROLE.FLAG_BG + ' and no fill of its own.');
    }
    return scanned + ' cells across the three computed tabs, not one of them cream. A flag ' +
      'reads as bold ' + IS9WD_ROLE.FLAG_FG + ' text with no fill.';
  });
}

// A hex compared without case or the shorthand a sheet sometimes hands back.
function IS9WD_stSameHex_(a, b) {
  return IS9WD_trim_(a).toLowerCase() === IS9WD_trim_(b).toLowerCase();
}

// A cell a sheet reports as unpainted. Sheets answers `#ffffff` for a cell with no fill of
// its own, and `null` or blank on some reads, so all three count as clean.
function IS9WD_stPainted_(hex) {
  var want = IS9WD_trim_(hex).toLowerCase();
  return want !== '' && want !== '#ffffff' && want !== '#fff';
}

function IS9WD_stIndexOf_(list, value) {
  for (var i = 0; i < (list || []).length; i++) {
    if (list[i] === value) return i;
  }
  return -1;
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
//  RESULTS  (the log tab, the diagnostics cell, and the lines the menu shows)
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
    // The failure phrase comes from IS9WD_Config.js, because 03 | Statistics tests this
    // line for it: two copies of it are two strings that drift, and the drift would read
    // as a healthy self test on the tab whose job is to say otherwise.
    line: IS9WD_stampText_(suite.startedAt) + IS9WD_SEP + line +
      (firstFail === '' ? '' : IS9WD_SEP + IS9WD_SELFTEST_FAIL_MARKER_ + firstFail)
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
    : 'Fix the failures above before the Sunday run. Every line is in ' +
      IS9WD_TAB.LOG + '.');
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

// ============================================================================
//  PHASE 5: THE TRIGGER, THE MAIL PLUMBING AND THE ROWS THE APP CANNOT SEE
// ============================================================================

// Seven assertions that tell an INSTALLED system from a PUSHED one. A workbook with a full
// schedule and no trigger looks exactly like a working system until a Monday goes quiet, and
// a typed row with no ID is a task an officer can see on the tab and cannot tick on a phone.
function IS9WD_stMail_(suite, ctx) {
  var have = ctx.cfg !== null;

  IS9WD_stRun_(suite, 'Hourly trigger installed', true, function () {
    var n = 0;
    var all = ScriptApp.getProjectTriggers();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getHandlerFunction() === IS9WD_AUTO_TRIGGER_) n++;
    }
    if (n > 1) {
      return IS9WD_stFail_(n + ' hourly triggers, and each would run the whole schedule. ' +
        'Automation > Install automations again, which removes them all first.');
    }
    if (n === 0) {
      return { state: IS9WD_ST.WARN, detail: 'No hourly trigger, so nothing runs by itself. ' +
        'Automation > Install automations, after the wording is approved.' };
    }
    return 'One hourly trigger.';
  });

  IS9WD_stRun_(suite, 'Mail plumbing', have, function () {
    var sw = ctx.cfg.switches;
    var bad = [];
    if (sw.adminEmail === '') bad.push('your own address is blank, so nothing can reach you');
    if (sw.senderName === '') bad.push('the sender display name is blank');
    if (sw.mailNoReply === true && sw.replyTo !== '') {
      bad.push('no reply and reply-to are both set, and no reply wins');
    }
    if (bad.length) return { state: IS9WD_ST.WARN, detail: bad.join('; ') + '.' };
    return 'Admin address and sender name set' +
      (sw.mailNoReply ? ', sent as no reply.' : (sw.replyTo !== '' ? ', reply-to set.' : '.'));
  });

  IS9WD_stRun_(suite, 'Email functions present', true, function () {
    var names = ['IS9WD_mailPreflight_', 'IS9WD_sendMondayAssignments_',
      'IS9WD_sendDailyDigest_', 'IS9WD_sendSundayBrief_', 'IS9WD_jobAlert_'];
    var missing = [];
    for (var i = 0; i < names.length; i++) if (!IS9WD_apiImpl_(names[i])) missing.push(names[i]);
    if (missing.length) return IS9WD_stFail_('Not in this project: ' + missing.join(', '));
    return 'All five resolve.';
  });

  IS9WD_stRun_(suite, 'Every schedule job has a function', have, function () {
    var rows = ctx.cfg.schedule.rows;
    var notBuilt = [];
    for (var i = 0; i < rows.length; i++) {
      var impl = IS9WD_autoImpl_(rows[i].jobKey);
      if (impl === '' || !IS9WD_apiImpl_(impl)) notBuilt.push(rows[i].jobKey);
    }
    if (notBuilt.length) {
      return { state: IS9WD_ST.WARN, detail: 'Not built yet: ' + notBuilt.join(', ') +
        '. The dispatcher reports each one and moves on.' };
    }
    return rows.length + ' jobs, every one built.';
  });

  IS9WD_stRun_(suite, 'Job record store size', true, function () {
    var props = PropertiesService.getDocumentProperties().getProperties();
    var n = 0;
    var oldest = '';
    for (var key in props) {
      if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
      if (key.indexOf(IS9WD_PROP.DONE_PREFIX) !== 0 && key.indexOf(IS9WD_PROP.ALERT_PREFIX) !== 0) continue;
      n++;
      var m = key.match(/\d{4}-\d{2}-\d{2}/);
      if (m && (oldest === '' || m[0] < oldest)) oldest = m[0];
    }
    if (n > 2000) {
      return { state: IS9WD_ST.WARN, detail: n + ' job record keys, oldest ' + oldest +
        '. Document Properties has a hard size limit, and the hourly pass prunes keys older ' +
        'than ' + IS9WD_AUTO_KEEP_DAYS_ + ' days, so either the pass is not running or the ' +
        'store holds something else.' };
    }
    return n + ' job record key' + (n === 1 ? '' : 's') + (oldest === '' ? '.' : ', oldest ' + oldest + '.');
  });

  IS9WD_stRun_(suite, 'Dispatcher has run recently', true, function () {
    var cell = IS9WD_namedOrNull_('IS9WD_DIAG_LAST_RUN');
    var at = cell ? cell.getValue() : '';
    if (!IS9WD_isDate_(at)) {
      return { state: IS9WD_ST.WARN, detail: 'The dispatcher has never run. Until it does, ' +
        'the two diagnostics cells read not measured yet.' };
    }
    var hours = (new Date().getTime() - at.getTime()) / 3600000;
    if (hours > 3) {
      return { state: IS9WD_ST.WARN, detail: 'Last run ' + Math.round(hours) + ' hours ago. ' +
        'An hourly trigger should have run since; check Automation > Show automation status.' };
    }
    return 'Last run ' + (hours < 1 ? 'under an hour' : Math.round(hours) + ' hours') + ' ago.';
  });

  IS9WD_stRun_(suite, 'No row is missing an ID', have, function () {
    var items = IS9WD_readItems_();
    var missing = [];
    var stale = [];
    for (var i = 0; i < items.rows.length; i++) {
      var it = items.rows[i];
      if (it.id !== '') continue;
      if (it.typed === true) missing.push(it.row);
      else stale.push(it.row);
    }
    if (missing.length) {
      return IS9WD_stFail_(missing.length + ' row' + (missing.length === 1 ? '' : 's') +
        ' with content and no ID, invisible to the app: row ' + missing.slice(0, 5).join(', ') +
        (missing.length > 5 ? ' and more' : '') + '. Automation > Give new rows an ID now.');
    }
    if (stale.length) {
      return { state: IS9WD_ST.WARN, detail: stale.length + ' half cleared row' +
        (stale.length === 1 ? '' : 's') + ', only the app stamps in G to I remain: row ' +
        stale.slice(0, 5).join(', ') + (stale.length > 5 ? ' and more' : '') +
        '. Clear the whole row; the ID sweep will not touch it.' };
    }
    return 'Every used row has an ID.';
  });
}
