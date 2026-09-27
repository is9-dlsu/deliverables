/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · BUILD OR REPAIR WORKBOOK
 *  IS9WD_Setup.js, the one action that writes the workbook
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 3 tabs, 4 Configuration, 5 Deliverables,
 *          6.3 feed layout, 9 the menu action, 13.3 acceptance.
 *
 *  IS9WD_buildOrRepair_() is the whole of section 9's first menu item. It creates
 *  what is missing, repairs what drifted, and leaves everything Ethan typed
 *  exactly where he typed it.
 *
 *  Three properties this file exists to hold, in the order they matter.
 *
 *  1. IT NEVER LOSES WORK. Every cell belongs to one of five owners
 *     (IS9WD_OWN): script owned is rewritten every run, once and ethan owned are
 *     written only into a blank cell, code owned is left alone, and append only is
 *     never written at all. The run snapshots every non script cell before it
 *     starts and again at the end, and ends with "user cells changed: 0" or throws
 *     with the addresses. Without that line, idempotent is an intention.
 *
 *  2. NOTHING ACCUMULATES. Named ranges are re-pointed by name, banding is removed
 *     before it is applied, the conditional format rule list is replaced whole, and
 *     validations are set over a full block so a rule a paste left behind is
 *     cleared rather than kept. All four live in IS9WD_Config.js and this file
 *     calls them rather than restating them.
 *
 *  3. EVERY ADDRESS COMES FROM THE LAYOUT. Setup is the one module allowed to know
 *     a cell address, and even here it reads them out of IS9WD_CFG, IS9WD_ITEMS,
 *     IS9WD_ARCHIVE, IS9WD_LOG and IS9WD_feedLayout_() rather than typing them, so
 *     moving a block is one edit in IS9WD_Config.js plus one run of this.
 *
 *  WHAT THIS FILE PAINTS, AND WHAT IT ASKS FOR. It owns 00 | Configuration whole,
 *  every block in section 4, and the two append only tabs. It owns no cell on the
 *  other four: IS9WD_Items.js builds 02 | Deliverables, IS9WD_Feed.js builds
 *  01 | Canva Feed, and IS9WD_Stats.js builds both 03 | Statistics and
 *  04 | Officer Tables, each one sizing, styling and writing its own tab, and this
 *  file calls them. A tab painted by two modules is two versions of one section of the
 *  reference that agree until the day one of them is edited.
 *
 *  Both new tabs are wholly script owned, so neither adds a range to the write
 *  ownership snapshot and `user cells changed: 0` still means what it meant.
 *
 *  Also here, because IS9WD_Menus.js names this file for both: IS9WD_applyGuards_
 *  and IS9WD_listProtections_, the warning only protections of 5.6.
 *
 *  The menu handlers IS9WD_menuBuildOrRepair, IS9WD_menuApplyGuards and
 *  IS9WD_menuListProtections live in IS9WD_Menus.js, take the document lock and
 *  call into here after IS9WD_assertUiContext_().
 * =============================================================================
 */

// ============================================================================
//  WHAT THIS MODULE OWNS THAT THE LAYOUT DOES NOT CARRY
// ============================================================================

var IS9WD_SETUP_SOURCE_ = 'Setup';
var IS9WD_SETUP_ACTION_ = 'Build or repair';

// A freshly created spreadsheet ships one blank tab. Renaming it is the difference
// between seven tabs and eight, and 13.3 counts them (section 3).
var IS9WD_SETUP_DEFAULT_TAB_ = /^sheet\s*1$/i;

// A tab name this project wrote: two digits, a space, a pipe, a space. It is how setup
// tells a tab it renumbered itself from a tab Ethan renamed by hand, which is the one
// distinction the Archive and Log renumbering turns on (section 3).
// The only names this project has ever given a tab and then renumbered. A regex
// over the NN | Name shape would also match a name Ethan chose himself, say
// "03 | Archive backup", and rename it back to canonical on the next build.
var IS9WD_SETUP_FORMER_NAMES_ = {
  ARCHIVE: ['03 | Archive'],
  LOG: ['04 | Log']
};

function IS9WD_setupWasOurName_(key, current) {
  var list = IS9WD_SETUP_FORMER_NAMES_[key] || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] === current) return true;
  }
  return false;
}

// How many changed user cells a failure message names before it stops listing.
var IS9WD_SETUP_REPORT_CELLS_ = 12;

// The directory Check column, 4.8's precedence in 4.8's order. It is the one
// section 4 formula IS9WD_CFG does not carry, because the block's descriptor names
// a checkCol and no checkFormula. {row} is the block's first row and {admin} the
// directory's own admin key, so neither K10 nor row 79 is typed twice.
var IS9WD_DIR_CHECK_FORMULA_ =
  '=IF($A{row}="","",' +
  'IF($D{row}="","No name",' +
  'IF($F{row}="","No email",' +
  'IF(AND($K{row}=TRUE,$B{row}=""),"Publishes with no carousel order",' +
  'IF(AND($B{row}<>"",COUNTIF(IS9WD_DIR_CAROUSEL,$B{row})>1),"Carousel order duplicated",' +
  'IF(AND($B{row}<>"",OR(NOT(ISNUMBER($B{row})),$B{row}<>INT($B{row}),$B{row}<1,' +
  '$B{row}>COUNTIF(IS9WD_DIR_PUBLISHES,TRUE))),"Carousel order out of range",' +
  'IF(AND($G{row}="",$A{row}<>"{admin}"),"No token",' +
  'IF($A{row}="{admin}","Admin link",' +
  'IF(AND(ISNUMBER($H{row}),IS9WD_EFFECTIVE_TODAY-$H{row}>IS9WD_TOKEN_WARN_DAYS),' +
  '"Token is "&INT(IS9WD_EFFECTIVE_TODAY-$H{row})&" days old",' +
  'IF($I{row}=TRUE,"Revoked","OK"))))))))))';

// Resolved once by IS9WD_setupTabs_ and read by everything after it. Without it,
// setting 116 named ranges is 116 developer metadata searches.
var IS9WD_SETUP_SHEETS_ = null;

function IS9WD_setupSheet_(tabKey) {
  var key = IS9WD_trim_(tabKey).toUpperCase();
  if (IS9WD_SETUP_SHEETS_ && IS9WD_SETUP_SHEETS_[key]) return IS9WD_SETUP_SHEETS_[key];
  return IS9WD_sheet_(key);
}

// ============================================================================
//  THE ENTRY POINT
// ============================================================================

// Everything runs inside the document lock: two people on two devices running this
// at once is two writers over one range, and the second one wins silently (9). The
// menu already locks before it calls, so the lock is taken only when this execution
// does not hold it, matching IS9WD_lockedRun_ in IS9WD_Menus.js.
function IS9WD_buildOrRepair_() {
  if (LockService.getDocumentLock().hasLock()) return IS9WD_buildOrRepairLocked_();
  return IS9WD_withLock_(function () {
    return IS9WD_buildOrRepairLocked_();
  });
}

function IS9WD_buildOrRepairLocked_() {
  var report = {
    lines: [], tabsCreated: [], namesSet: 0, namesDropped: [], feedResized: false,
    storeLastRow: 0, storeGrown: false, archiveLastRow: 0, archiveGrown: false,
    items: null, stats: null, tables: null, backfilledIds: 0,
    backfilledStatus: 0, tokensIssued: 0, userCellsChanged: 0, changedCells: [],
    missingNames: []
  };
  var say = function (line) { report.lines.push(line); Logger.log(line); };

  IS9WD_setupWorkbookSettings_(say);

  // Tabs and the grid first, and no cell is written until both are right: the
  // before snapshot has to cover ranges that already reach their full span.
  var sheets = IS9WD_setupTabs_(report, say);
  report.storeLastRow = IS9WD_setupStoreSpan_(sheets.CONFIG, report, say);
  report.archiveLastRow = IS9WD_setupArchiveSpan_(sheets.ARCHIVE, report, say);
  IS9WD_setupGrids_(sheets, say);

  var before = IS9WD_setupSnapshot_();

  // Names before formulas, so nothing spends a recalculation reading #NAME?. These
  // are the Configuration, data tab and Archive names; the feed's and the two views'
  // move with their own sizes and are pointed by the modules that own those tabs.
  report.namesSet += IS9WD_setupSetNames_(
    IS9WD_configNames_().concat(IS9WD_itemNames_()).concat(IS9WD_archiveNames_()));
  report.namesDropped = IS9WD_setupDropRetired_();

  IS9WD_setupWriteConfig_(sheets.CONFIG, say);
  SpreadsheetApp.flush();
  IS9WD_configReset_();
  var cfg = IS9WD_readConfig_(true);

  IS9WD_setupStyleConfig_(sheets.CONFIG, report.storeLastRow);
  IS9WD_setupAppendTab_(sheets.ARCHIVE, 'ARCHIVE', IS9WD_ARCHIVE);
  IS9WD_setupAppendTab_(sheets.LOG, 'LOG', IS9WD_LOG);

  // The data tab belongs to IS9WD_Items.js and the feed to IS9WD_Feed.js, headers,
  // formats, formulas, rules and all. Setup calls them rather than writing either
  // one twice: two modules painting one tab is two versions of section 5 that
  // agree until the day one of them is edited.
  report.items = IS9WD_setupCall_('IS9WD_itemsBuild_', [cfg], say,
    'the data tab was not built: IS9WD_Items.js is not in this project yet');
  if (report.items) {
    say('data tab: ' + report.items.rows + ' rows, ' + report.items.formulas +
      ' derived formula cells, ' + report.items.rules + ' rules');
  }

  // The feed is sized from the three capacity numbers or not at all, so the gate is
  // here rather than in the refusal IS9WD_feedResize_ would throw: a capacity typo
  // must cost the feed and nothing else in this run (4.6, 6.3, 9).
  if (cfg.switches.capacityOk) {
    var feed = IS9WD_setupCall_('IS9WD_feedResize_', [cfg], say,
      'the feed was not sized: IS9WD_Feed.js is not in this project yet');
    if (feed) {
      report.feedResized = true;
      report.namesSet += IS9WD_int_(feed.namesPointed) || 0;
      say('feed sized: ' + feed.publishingRows + ' publishing rows, ' +
        feed.slotRows + ' slot rows, ' + feed.flagRows + ' flag rows, last row ' +
        feed.lastRow + ', errors scan to ' + feed.scanLastCell);
      say('Master pages required: ' + feed.masterPagesRequired);
    }
  } else {
    say('feed not sized: the capacity numbers disagree. ' +
      'Restore the formula in the derived publishable maximum, then run this again.');
  }

  // The two views, in this order and never the other way round: every count in an
  // officer table's band row is an INDEX into a named range on 03 | Statistics, so
  // that tab's names have to exist before this one's formulas are written.
  //
  // Neither call is gated on the capacity numbers, unlike the feed. That is the point
  // of them: a view must not stop working because the carousel arithmetic is broken,
  // and a broken view must not stop the carousel. The feed reference each of them
  // makes falls back to the `!ERR` sentinel, which both tabs count and the self test
  // fails on (6A).
  report.stats = IS9WD_setupCall_('IS9WD_statsResize_', [cfg], say,
    'the statistics tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.stats) {
    report.namesSet += IS9WD_int_(report.stats.namesPointed) || 0;
    say('statistics sized: ' + report.stats.directoryRows + ' officer rows, ' +
      report.stats.trendWeeks + ' trend weeks, ' + report.stats.jobRows +
      ' job rows, last row ' + report.stats.lastRow + ', last column ' +
      report.stats.lastCol);
  }
  report.tables = IS9WD_setupCall_('IS9WD_officerTablesResize_', [cfg], say,
    'the officer tables tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.tables) {
    report.namesSet += IS9WD_int_(report.tables.namesPointed) || 0;
    say('officer tables sized: ' + report.tables.blocks + ' blocks, ' +
      report.tables.officerRows + ' rows reserved each showing ' +
      report.tables.itemRows + ' items, last row ' + report.tables.lastRow);
  }

  IS9WD_setupBackfillDirectory_(sheets.CONFIG, say);
  // The high-water mark is raised before anything is minted from it: a stored next
  // ID of 1 beside a column already holding D0001 would hand a hand-typed row an
  // ID that another row already has, and two items under one ID is what the log and
  // the Archive dedupe cannot survive (5.2).
  var ids = IS9WD_setupCall_('IS9WD_itemsRaiseNextId_', [], say, '');
  if (ids && ids.raised) say('next ID raised from ' + ids.was + ' to ' + ids.now);
  var filled = IS9WD_setupCall_('IS9WD_itemsBackfill_', [cfg], say, '');
  if (filled) {
    report.backfilledIds = 0;
    report.backfilledStatus = 0;
    for (var n = 0; n < filled.length; n++) {
      if (filled[n].id) report.backfilledIds++;
      if (filled[n].status) report.backfilledStatus++;
      say('backfilled row ' + filled[n].row +
        (filled[n].id ? ' ID ' + filled[n].id : '') +
        (filled[n].status ? ' status ' + filled[n].status : ''));
    }
  }
  report.tokensIssued = IS9WD_setupEnsureTokens_(sheets.CONFIG, cfg, say);

  SpreadsheetApp.flush();
  IS9WD_configReset_();

  var audit = IS9WD_nameAudit_(cfg.switches.capacityOk ? cfg.feed : null,
    cfg.stats, cfg.ot);
  report.missingNames = audit.missing;
  say('named ranges: ' + report.namesSet + ' set of ' + audit.expected +
    ' expected, ' + audit.missing.length + ' missing, ' +
    report.namesDropped.length + ' retired dropped');

  // The one check that can tell idempotent from intended.
  var diff = IS9WD_setupCompare_(before, IS9WD_setupSnapshot_());
  report.userCellsChanged = diff.length;
  report.changedCells = diff;
  say('user cells changed: ' + diff.length +
    (diff.length ? ' at ' + IS9WD_setupCellList_(diff) : ''));

  IS9WD_setupAppendLog_(sheets.LOG, report.lines, diff.length === 0);

  if (diff.length) {
    throw new Error('Build or repair changed ' + diff.length +
      ' cell(s) it does not own: ' + IS9WD_setupCellList_(diff) +
      '. Every other repair in this run finished, and ' + IS9WD_TAB.LOG +
      ' holds the full list.');
  }
  return report;
}

// The tab owners land in their own files, and a build that threw a ReferenceError
// because one of them had not been pushed yet would take the whole workbook with it.
// Resolving by name is the IS9WD_impl_ pattern from IS9WD_Menus.js.
function IS9WD_setupCall_(name, args, say, missingLine) {
  var fn = null;
  try {
    fn = (typeof globalThis === 'object' && globalThis) ? globalThis[name] : null;
  } catch (err) {
    fn = null;
  }
  if (typeof fn !== 'function') {
    if (missingLine) say(missingLine);
    return null;
  }
  var out = fn.apply(null, args || []);
  return out === undefined ? null : out;
}

// ============================================================================
//  WORKBOOK LEVEL SETTINGS  (2.5)
// ============================================================================

// Recalculation on the hour, because Claude reads cached values through the Drive
// connector and a date formula that has not recalculated reads last week.
function IS9WD_setupWorkbookSettings_(say) {
  var ss = IS9WD_ss_();
  if (ss.getSpreadsheetTimeZone() !== IS9WD_TZ) {
    ss.setSpreadsheetTimeZone(IS9WD_TZ);
    say('time zone set to ' + IS9WD_TZ);
  }
  // TEXT(date,"ddd, mmm d") has to return English day and month names, which is
  // what the locale decides and what every Canva date string depends on.
  var locale = IS9WD_trim_(ss.getSpreadsheetLocale());
  if (locale.indexOf('en_') !== 0) {
    ss.setSpreadsheetLocale('en_PH');
    say('locale set to en_PH from ' + (locale || 'blank'));
  }
  ss.setRecalculationInterval(SpreadsheetApp.RecalculationInterval.HOUR);
}

// ============================================================================
//  TABS  (section 3: metadata first, exact name second, the blank default renamed)
// ============================================================================

function IS9WD_setupTabs_(report, say) {
  var ss = IS9WD_ss_();
  var out = {};
  for (var i = 0; i < IS9WD_TAB_ORDER.length; i++) {
    var key = IS9WD_TAB_ORDER[i];
    var name = IS9WD_TAB[key];
    var sheet = IS9WD_sheetOrNull_(key);
    if (!sheet) {
      var spare = IS9WD_setupBlankDefaultTab_();
      if (spare) {
        spare.setName(name);
        sheet = spare;
        say('renamed the blank default tab to ' + name);
      } else {
        sheet = ss.insertSheet(name, i);
        say('created ' + name);
      }
      report.tabsCreated.push(name);
    } else if (sheet.getName() !== name) {
      // Found by its metadata under another name, and there are two of those.
      //
      // A sheet still carrying the project's own numbering, `NN | Something`, is a
      // sheet this project named and then renumbered: that is what happened to the
      // Archive and the Log when the two views took 03 and 04. It is renamed to the
      // canonical name, because leaving it would put `03 | Archive` in the tab bar
      // beside `03 | Statistics` and leave its own banner reading `05 | ARCHIVE`.
      // The rename is by metadata key and never by the old name, so a second build
      // cannot leave a twin.
      //
      // Any other name is one Ethan chose, and renaming it back would undo a
      // deliberate rename. That one is left exactly as it is.
      if (IS9WD_setupWasOurName_(key, sheet.getName()) &&
        !IS9WD_setupNameTaken_(sheet, name)) {
        say('tab ' + key + ' renamed from "' + sheet.getName() + '" to "' + name +
          '", found by its metadata');
        sheet.setName(name);
      } else {
        say('tab ' + key + ' resolved by metadata as "' + sheet.getName() +
          '", and left under that name');
      }
    }
    IS9WD_stampTab_(sheet, key);
    sheet.setTabColor(IS9WD_TAB_COLOR[key]);
    if (sheet.getIndex() !== i + 1) {
      // A hidden sheet cannot be activated, and the log tab is hidden from the second
      // run onward, so it is shown here and hidden again by the loop below.
      if (sheet.isSheetHidden()) sheet.showSheet();
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(i + 1);
    }
    out[key] = sheet;
  }
  for (var h = 0; h < IS9WD_HIDDEN_TABS.length; h++) {
    var hidden = out[IS9WD_HIDDEN_TABS[h]];
    if (hidden && !hidden.isSheetHidden()) hidden.hideSheet();
  }
  ss.setActiveSheet(out[IS9WD_TAB_ORDER[0]]);
  IS9WD_SETUP_SHEETS_ = out;
  say('tabs: ' + IS9WD_TAB_ORDER.length + ' in order, ' +
    report.tabsCreated.length + ' created');
  return out;
}

// Only a tab that is blank, unstamped and still carries the default name. Any other
// empty tab is one Ethan made, and taking it would be taking his scratch space.
function IS9WD_setupBlankDefaultTab_() {
  var all = IS9WD_ss_().getSheets();
  for (var i = 0; i < all.length; i++) {
    var sheet = all[i];
    if (!IS9WD_SETUP_DEFAULT_TAB_.test(sheet.getName())) continue;
    if (sheet.getLastRow() !== 0 || sheet.getLastColumn() !== 0) continue;
    if (IS9WD_setupIsStamped_(sheet)) continue;
    return sheet;
  }
  return null;
}

// Another sheet already sitting on the name we want. Renaming into it would throw, so
// the rename is skipped and the resolution by metadata carries the run.
function IS9WD_setupNameTaken_(sheet, name) {
  var other = IS9WD_ss_().getSheetByName(name);
  return !!other && other.getSheetId() !== sheet.getSheetId();
}

function IS9WD_setupIsStamped_(sheet) {
  var found = sheet.createDeveloperMetadataFinder().find();
  for (var i = 0; i < found.length; i++) {
    if (IS9WD_txt_(found[i].getKey()).indexOf(IS9WD_TAB_META_PREFIX) === 0) return true;
  }
  return false;
}

// ============================================================================
//  THE SIGN-OFF STORE'S LIVE SPAN  (4.5: the one block that grows)
// ============================================================================

// The store is the last block precisely so it can grow downward without moving
// anything above it. Growing means widening the block, never inserting rows, so no
// address below it shifts. IS9WD_CFG.STORE.lastRow is updated in place for the rest
// of this execution, which is what carries the new span into every named range, the
// guard list and the styling without any of them knowing why.
function IS9WD_setupStoreSpan_(sheet, report, say) {
  var store = IS9WD_CFG.STORE;
  var declared = store.lastRow;
  var current = declared;
  var existing = IS9WD_namedOrNull_('IS9WD_SIGNOFF_WEEKS');
  if (existing && existing.getSheet().getName() === sheet.getName()) {
    current = Math.max(current, existing.getRow() + existing.getNumRows() - 1);
  }
  var span = current - store.firstRow + 1;
  var used = 0;
  if (sheet.getMaxRows() >= store.firstRow) {
    var rows = Math.min(span, sheet.getMaxRows() - store.firstRow + 1);
    var weeks = sheet.getRange(store.firstRow, 1, rows, 1).getValues();
    for (var i = 0; i < weeks.length; i++) {
      if (IS9WD_filled_(weeks[i][0])) used++;
    }
  }
  var live = current;
  if (span - used < store.minFreeRows) {
    live = current + store.growBy;
    report.storeGrown = true;
    say('sign-off store grown to row ' + live + ': ' + (span - used) +
      ' free rows of ' + span + ' left');
  }
  store.lastRow = live;
  say('sign-off store: rows ' + store.firstRow + ' to ' + live + ', ' + used + ' used');
  return live;
}

// ============================================================================
//  05 | ARCHIVE'S LIVE SPAN  (10.1: bounded so the trend block can read it)
// ============================================================================

// The same shape as the sign-off store's, and for the same reason. The Archive used to
// be open ended, which is fine for appending and impossible for a formula: a named
// range has to span a real grid. So the span is declared, and it is widened downward
// when it runs short, never inserted into, so no appended row moves and no ID changes.
//
// Widening is all setup may do. Migrating an append only row is a capability it does
// not have, which is why the span only ever grows.
//
// What this does NOT cover, and 10.1 says so: a row appended between two builds that
// lands past the current span falls outside the six named ranges and vanishes from the
// trend until the next `Build or repair workbook`. The append path in IS9WD_Archive.js
// owes the same growth check inside the lock it already holds.
function IS9WD_setupArchiveSpan_(sheet, report, say) {
  var arc = IS9WD_ARCHIVE;
  var current = arc.lastRow;
  var existing = IS9WD_namedOrNull_('IS9WD_ARC_WEEKSTART');
  if (existing && existing.getSheet().getName() === sheet.getName()) {
    current = Math.max(current, existing.getRow() + existing.getNumRows() - 1);
  }
  var used = Math.max(sheet.getLastRow() - arc.firstRow + 1, 0);
  var live = current;
  if (current - arc.firstRow + 1 - used < arc.minFreeRows) {
    live = current + arc.growBy;
    report.archiveGrown = true;
    say('archive span grown to row ' + live + ': ' + used + ' rows used of ' +
      (current - arc.firstRow + 1));
  }
  arc.lastRow = live;
  say('archive: rows ' + arc.firstRow + ' to ' + live + ', ' + used + ' used');
  return live;
}

// ============================================================================
//  THE GRID  (rows, columns, widths, frozen panes, nothing hidden by accident)
// ============================================================================

// Every tab gets its grid, its shown rows and Poppins here, because the snapshot
// that follows has to read ranges that already reach their full span. Widths, hidden
// columns and frozen panes are set here only for the three tabs this file paints:
// IS9WD_Items.js and IS9WD_Feed.js set their own, and doing it twice is two answers
// to one question.
function IS9WD_setupGrids_(sheets, say) {
  var feed = IS9WD_feed_();
  // The two views take the shipping layout here rather than the live one, exactly as
  // the feed does: this runs before Configuration has been read, and IS9WD_Stats.js
  // re-sizes and re-points both tabs from the live settings later in the run.
  var stats = IS9WD_stats_();
  var tables = IS9WD_officerTables_();
  var plan = {
    CONFIG: { rows: IS9WD_CFG.STORE.lastRow, cols: IS9WD_CFG.LAST_COL, trimRows: true, chrome: true },
    FEED: { rows: feed.endRow, cols: feed.helperLastCol, trimRows: false, chrome: false },
    ITEMS: { rows: IS9WD_ITEMS.lastRow, cols: IS9WD_ITEMS.lastCol, trimRows: false, chrome: false },
    STATS: { rows: stats.endRow, cols: stats.helperLastCol, trimRows: false, chrome: false },
    TABLES: { rows: tables.endRow, cols: tables.lastCol, trimRows: false, chrome: false },
    // The Archive now declares a last row, because the trend block's six named ranges
    // have to span a real grid. It is grown in place by IS9WD_setupArchiveSpan_.
    ARCHIVE: { rows: IS9WD_ARCHIVE.lastRow, cols: IS9WD_ARCHIVE.lastCol, trimRows: false, chrome: true },
    LOG: { rows: IS9WD_LOG.firstRow, cols: IS9WD_LOG.lastCol, trimRows: false, chrome: true }
  };
  for (var k = 0; k < IS9WD_TAB_ORDER.length; k++) {
    var key = IS9WD_TAB_ORDER[k];
    var sheet = sheets[key];
    var want = plan[key];
    IS9WD_ensureGrid_(sheet, want.rows, want.cols);
    IS9WD_setupTrim_(sheet, want, say);
    // A row hidden by hand is a block the connector cannot read, and a hidden row on
    // the feed is a contract string the Sunday run never sees.
    sheet.showRows(1, sheet.getMaxRows());
    if (want.chrome) {
      sheet.showColumns(1, sheet.getMaxColumns());
      IS9WD_setWidths_(sheet, key);
      IS9WD_hideCols_(sheet, key);
      IS9WD_freezeTab_(sheet, key);
    }
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
      .setFontFamily(IS9WD_FONT);
  }
}

// Trailing empties only, and only when nothing is out there: the feed's end sentinel
// is meant to be the last row of the tab, and a wide empty grid reads as ragged
// markdown through the connector.
function IS9WD_setupTrim_(sheet, want, say) {
  if (want.trimRows && sheet.getMaxRows() > want.rows && sheet.getLastRow() <= want.rows) {
    sheet.deleteRows(want.rows + 1, sheet.getMaxRows() - want.rows);
    say('trimmed ' + sheet.getName() + ' to row ' + want.rows);
  }
  if (sheet.getMaxColumns() > want.cols && sheet.getLastColumn() <= want.cols) {
    sheet.deleteColumns(want.cols + 1, sheet.getMaxColumns() - want.cols);
  }
}

// ============================================================================
//  NAMED RANGES  (re-pointed by name, which is the whole of idempotency here)
// ============================================================================

function IS9WD_setupSetNames_(names) {
  for (var i = 0; i < names.length; i++) {
    var sheet = IS9WD_setupSheet_(names[i].tab);
    IS9WD_setNamed_(names[i].name, sheet.getRange(names[i].a1));
  }
  return names.length;
}

// A retired name that still resolves is a formula nobody updated, so it is removed
// rather than left to answer quietly (4.8).
function IS9WD_setupDropRetired_() {
  var dropped = [];
  for (var i = 0; i < IS9WD_RETIRED_NAMES.length; i++) {
    if (IS9WD_namedOrNull_(IS9WD_RETIRED_NAMES[i])) {
      IS9WD_dropNamed_(IS9WD_RETIRED_NAMES[i]);
      dropped.push(IS9WD_RETIRED_NAMES[i]);
    }
  }
  return dropped;
}

// ============================================================================
//  00 | CONFIGURATION, THE VALUES  (section 4, every address out of IS9WD_CFG)
// ============================================================================

// The banner and the help line are written by the painters in the styling pass, so
// nothing here touches row 1 or row 2.
function IS9WD_setupWriteConfig_(sheet, say) {
  var c = IS9WD_CFG;
  for (var b = 0; b < c.BLOCKS.length; b++) {
    var block = c[c.BLOCKS[b]];
    if (block.rows) {
      IS9WD_setupWriteRowBlock_(sheet, block);
    } else {
      IS9WD_setupWriteTableBlock_(sheet, block);
    }
  }
  // The undo window rides under the status list, on its own row, with a label of
  // its own rather than a header (4.4).
  var status = c.STATUS;
  sheet.getRange(status.undoRow, c.LABEL_COL).setValue(status.undoLabel);
  var undo = sheet.getRange(status.undoRow, c.VALUE_COL);
  if (IS9WD_blank_(undo.getValue())) undo.setValue(IS9WD_DEFAULTS.UNDO_SECONDS);
  say('configuration: ' + c.BLOCKS.length + ' blocks written');
}

// Label, then value or formula, then the note beside it. A script row is rewritten
// every run; an Ethan row is written only into a blank cell; a code row is never
// written at all and only keeps its format.
function IS9WD_setupWriteRowBlock_(sheet, block) {
  var c = IS9WD_CFG;
  var rows = block.rows;
  var first = block.firstRow;
  var count = block.lastRow - first + 1;

  var labels = [];
  for (var r = 0; r < count; r++) labels.push(['']);
  var valueRange = sheet.getRange(first, c.VALUE_COL, count, 1);
  var values = valueRange.getValues();
  // A formula Ethan typed into a settings cell is his, so it is read back as a
  // formula and written back as one rather than flattened to this morning's value.
  var formulas = valueRange.getFormulas();
  var out = [];
  for (var i = 0; i < count; i++) {
    out.push([IS9WD_blank_(formulas[i][0]) ? values[i][0] : formulas[i][0]]);
  }
  var notes = [];
  for (var n = 0; n < count; n++) notes.push(['']);
  var hasNote = false;

  for (var j = 0; j < rows.length; j++) {
    var row = rows[j];
    var at = row.row - first;
    labels[at][0] = row.label;
    if (row.formula) {
      out[at][0] = row.formula;
    } else if (row.owner === IS9WD_OWN.ETHAN &&
      row.value !== undefined && row.value !== '' && IS9WD_blank_(out[at][0])) {
      out[at][0] = row.value;
    }
    if (row.note) {
      notes[at][0] = row.note;
      hasNote = true;
    }
  }
  sheet.getRange(first, c.LABEL_COL, count, 1).setValues(labels);
  valueRange.setValues(out);
  if (hasNote) sheet.getRange(first, c.NOTE_COL, count, 1).setValues(notes);
}

// A table block writes its header from the column descriptors, its defaults into
// blank cells column by column, and its Check formula down the check column.
function IS9WD_setupWriteTableBlock_(sheet, block) {
  var count = block.lastRow - block.firstRow + 1;
  var defaults = IS9WD_setupBlockDefaults_(block);

  for (var col in defaults) {
    if (!Object.prototype.hasOwnProperty.call(defaults, col)) continue;
    var index = Number(col);
    var descriptor = block.columns[index - block.firstCol];
    var owner = descriptor ? descriptor.owner : IS9WD_OWN.ETHAN;
    var range = sheet.getRange(block.firstRow, index, count, 1);
    var values = range.getValues();
    var formulas = range.getFormulas();
    var wanted = defaults[col];
    var out = [];
    var touched = false;
    for (var r = 0; r < count; r++) {
      var current = IS9WD_blank_(formulas[r][0]) ? values[r][0] : formulas[r][0];
      var want = r < wanted.length ? wanted[r] : null;
      var write = current;
      if (want !== null && want !== '' &&
        (owner === IS9WD_OWN.SCRIPT || IS9WD_blank_(current))) {
        write = want;
      }
      if (write !== current) touched = true;
      out.push([write]);
    }
    if (touched) range.setValues(out);
  }
  IS9WD_setupWriteCheckColumn_(sheet, block);
}

// Positional against the block's rows, which is how IS9WD_DEFAULTS is written: row
// one of the defaults is the block's first row. The keyed shape carries the
// directory, whose defaults skip Full name and Email and land in A, B, C, E, K, L.
function IS9WD_setupBlockDefaults_(block) {
  var out = {};
  var put = function (col, list) { out[col] = list; };
  var column = function (rows, index) {
    var list = [];
    for (var i = 0; i < rows.length; i++) list.push(rows[i][index]);
    return list;
  };
  if (block.key === 'WINDOWS') {
    var w = IS9WD_DEFAULTS.WINDOWS;
    for (var wc = 0; wc < 4; wc++) put(block.firstCol + wc, column(w, wc));
  } else if (block.key === 'TERMS') {
    var t = IS9WD_DEFAULTS.TERMS;
    put(block.firstCol, column(t, 0));
    put(block.firstCol + 1, IS9WD_setupDates_(column(t, 1)));
    put(block.firstCol + 2, IS9WD_setupDates_(column(t, 2)));
  } else if (block.key === 'STATUS') {
    var s = IS9WD_DEFAULTS.STATUSES;
    for (var sc = 0; sc < 4; sc++) put(block.firstCol + sc, column(s, sc));
  } else if (block.key === 'SCHEDULE') {
    var j = IS9WD_DEFAULTS.SCHEDULE;
    for (var jc = 0; jc < 6; jc++) put(block.firstCol + jc, column(j, jc));
  } else if (block.key === 'DIRECTORY') {
    var d = IS9WD_DEFAULTS.DIRECTORY;
    put(block.firstCol, column(d, 0));       // Key
    put(block.firstCol + 1, column(d, 1));   // Carousel order
    put(block.firstCol + 2, column(d, 2));   // Committee or office
    put(block.firstCol + 4, column(d, 3));   // Position label
    put(block.firstCol + 10, column(d, 4));  // Publishes
    put(block.firstCol + 11, column(d, 5));  // Hierarchy order
  }
  return out;
}

// Real dates, never the ISO text, so nothing depends on how the locale parses a
// string typed into a date formatted cell.
function IS9WD_setupDates_(list) {
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var d = IS9WD_toDate_(list[i]);
    out.push(d ? d : '');
  }
  return out;
}

// The formula goes into the block's first check cell and is filled down with
// PASTE_FORMULA, which translates the relative rows and leaves the absolute ranges
// alone. Rewriting the string per row would have to know which digits are a row and
// which are part of a pattern such as {6} in a hex test.
function IS9WD_setupWriteCheckColumn_(sheet, block) {
  var formula = block.checkFormula;
  if (block.key === 'DIRECTORY') {
    formula = IS9WD_DIR_CHECK_FORMULA_
      .replace(/\{row\}/g, String(block.firstRow))
      .replace(/\{admin\}/g, IS9WD_trim_(block.adminKey));
  }
  if (!formula || !block.checkCol) return;
  if (block.key === 'STORE') {
    // The duplicate week test spans the whole block, so a grown store needs the end
    // of that absolute range moved with it, or the test covers only the first 52
    // weeks and a duplicate typed into week 53 reads OK (4.5). Only the range end is
    // rewritten, and the declared number is never typed here.
    formula = formula.replace(/(\$[A-Z]+\$\d+:\$[A-Z]+\$)\d+/g,
      '$1' + IS9WD_CFG.STORE.lastRow);
  }
  var count = block.lastRow - block.firstRow + 1;
  var head = sheet.getRange(block.firstRow, block.checkCol);
  head.setFormula(formula);
  if (count > 1) {
    head.copyTo(sheet.getRange(block.firstRow + 1, block.checkCol, count - 1, 1),
      SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
  }
}

// ============================================================================
//  00 | CONFIGURATION, THE LOOK  (2.5 palette, Ethan's four instructions)
// ============================================================================

function IS9WD_setupStyleConfig_(sheet, storeLastRow) {
  var c = IS9WD_CFG;
  IS9WD_paintBanner_(sheet, c.BANNER_ROW, c.FIRST_COL, c.LAST_COL, c.BANNER);
  IS9WD_paintHelp_(sheet, c.HELP_ROW, c.FIRST_COL, c.LAST_COL, c.HELP);

  for (var b = 0; b < c.BLOCKS.length; b++) {
    var block = c[c.BLOCKS[b]];
    IS9WD_paintBand_(sheet, block.titleRow, c.FIRST_COL, c.LAST_COL,
      block.title, block.help);
    if (block.rows) {
      IS9WD_setupStyleRowBlock_(sheet, block);
    } else {
      IS9WD_setupStyleTableBlock_(sheet, block);
    }
  }
  IS9WD_setupStyleUndoRow_(sheet);
  IS9WD_setupStyleSpacers_(sheet);
  IS9WD_setRules_(sheet, IS9WD_setupConfigRules_(sheet, storeLastRow));
}

// A label reads as text, a derived value reads as a value, and a note reads as a
// hint. The accent is what carries the eye to the cells nobody types into.
function IS9WD_setupStyleRowBlock_(sheet, block) {
  var c = IS9WD_CFG;
  var count = block.lastRow - block.firstRow + 1;
  var labels = sheet.getRange(block.firstRow, c.LABEL_COL, count, 1);
  IS9WD_style_(labels, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.CLIP
  });
  labels.setBackground(null);
  var values = sheet.getRange(block.firstRow, c.VALUE_COL, count, 1);
  values.setBackground(null);
  var notes = sheet.getRange(block.firstRow, c.NOTE_COL, count, 1);
  IS9WD_style_(notes, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  notes.setBackground(null);

  for (var i = 0; i < block.rows.length; i++) {
    var row = block.rows[i];
    var derived = !!row.formula;
    IS9WD_style_(sheet.getRange(row.row, c.VALUE_COL), {
      size: IS9WD_SIZE.BODY,
      fg: derived ? IS9WD_ROLE.ACCENT_FG : IS9WD_ROLE.BODY_FG,
      bold: derived,
      align: row.align || IS9WD_ALIGN.LEFT,
      format: row.format,
      wrap: IS9WD_WRAP.CLIP
    });
  }
  IS9WD_applyRowValidations_(sheet, block.rows, c.VALUE_COL);
  IS9WD_setDataHeights_(sheet, block.firstRow, count);
}

function IS9WD_setupStyleTableBlock_(sheet, block) {
  var count = block.lastRow - block.firstRow + 1;
  var labels = [];
  for (var i = 0; i < block.columns.length; i++) labels.push(block.columns[i].header);
  IS9WD_paintHeader_(sheet, block.headerRow, block.firstCol, labels);

  var body = sheet.getRange(block.firstRow, block.firstCol, count, block.columns.length);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.CLIP
  });
  // Cleared, not filled: an explicit background beats banding, so a fill a paste
  // left behind would survive every future run and show as a dead stripe.
  body.setBackground(null);
  IS9WD_applyColumnStyles_(sheet, block.firstRow, count, block.firstCol, block.columns);
  IS9WD_applyValidations_(sheet, block.firstRow, count, block.firstCol, block.columns);
  IS9WD_banding_(body);
  IS9WD_setDataHeights_(sheet, block.firstRow, count);
}

function IS9WD_setupStyleUndoRow_(sheet) {
  var c = IS9WD_CFG;
  var status = c.STATUS;
  IS9WD_style_(sheet.getRange(status.undoRow, c.LABEL_COL), {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT
  });
  IS9WD_style_(sheet.getRange(status.undoRow, c.VALUE_COL), {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.RIGHT,
    format: IS9WD_FMT.INT
  });
  sheet.getRange(status.undoRow, c.LABEL_COL, 1, 2).setBackground(null);
  IS9WD_applyRowValidations_(sheet,
    [{ row: status.undoRow, validate: status.undoValidate }], c.VALUE_COL);
  sheet.setRowHeight(status.undoRow, IS9WD_ROW_H.DATA);
}

// One short blank row between blocks, so a twelve row block reads as a block rather
// than as part of the next one.
function IS9WD_setupStyleSpacers_(sheet) {
  var rows = IS9WD_CFG.SPACER_ROWS;
  for (var i = 0; i < rows.length; i++) {
    var range = sheet.getRange(rows[i], IS9WD_CFG.FIRST_COL, 1, IS9WD_CFG.LAST_COL);
    range.setBackground(null);
    range.setDataValidation(null);
    sheet.setRowHeight(rows[i], IS9WD_ROW_H.SPACER);
  }
}

// A Check column that does not read OK is the workbook telling Ethan something, so
// it is the one place in Configuration that shouts: bold strong purple on cream.
function IS9WD_setupConfigRules_(sheet, storeLastRow) {
  var c = IS9WD_CFG;
  var rules = [];
  var checks = [
    { block: c.WINDOWS, col: c.WINDOWS.checkCol },
    { block: c.TERMS, col: c.TERMS.checkCol },
    { block: c.SCHEDULE, col: c.SCHEDULE.checkCol },
    { block: c.DIRECTORY, col: c.DIRECTORY.checkCol },
    { block: c.STORE, col: c.STORE.checkCol, lastRow: storeLastRow }
  ];
  for (var i = 0; i < checks.length; i++) {
    var block = checks[i].block;
    var last = checks[i].lastRow || block.lastRow;
    var range = sheet.getRange(block.firstRow, checks[i].col,
      last - block.firstRow + 1, 1);
    var cell = '$' + IS9WD_colLetter_(checks[i].col) + block.firstRow;
    rules.push(IS9WD_ruleFormula_([range],
      '=AND(' + cell + '<>"",' + cell + '<>"OK")',
      { bg: IS9WD_ROLE.FLAG_BG, fg: IS9WD_ROLE.FLAG_FG, bold: true }));
    rules.push(IS9WD_ruleFormula_([range], '=' + cell + '="OK"',
      { fg: IS9WD_ROLE.HINT_FG }));
  }
  // The four guard notes: each one is blank while the thing it guards is right.
  var notes = IS9WD_setupGuardNoteRows_();
  for (var n = 0; n < notes.length; n++) {
    var noteCell = sheet.getRange(notes[n], c.NOTE_COL);
    var a1 = '$' + IS9WD_colLetter_(c.NOTE_COL) + notes[n];
    rules.push(IS9WD_ruleFormula_([noteCell],
      '=AND(' + a1 + '<>"",' + a1 + '<>"OK")',
      { fg: IS9WD_ROLE.FLAG_FG, bold: true }));
  }
  return rules;
}

function IS9WD_setupGuardNoteRows_() {
  var c = IS9WD_CFG;
  var out = [];
  var blocks = ['WEEK', 'SIGNOFF', 'SWITCHES', 'DIAGNOSTICS'];
  for (var b = 0; b < blocks.length; b++) {
    var rows = c[blocks[b]].rows;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].note) out.push(rows[i].row);
    }
  }
  return out;
}

// ============================================================================
//  03 | ARCHIVE and 04 | LOG  (section 10, both append only)
// ============================================================================

// The data block runs to the bottom of the grid rather than to a row count, because
// both tabs grow by appending and a pre-formatted row is what keeps an appended row
// looking like the rest.
function IS9WD_setupAppendTab_(sheet, tabKey, layout) {
  var width = layout.lastCol - layout.firstCol + 1;
  IS9WD_paintBanner_(sheet, layout.BANNER_ROW, layout.firstCol, layout.lastCol,
    layout.BANNER);
  IS9WD_paintHelp_(sheet, layout.HELP_ROW, layout.firstCol, layout.lastCol, layout.HELP);

  var labels = [];
  for (var i = 0; i < layout.columns.length; i++) labels.push(layout.columns[i].header);
  IS9WD_paintHeader_(sheet, layout.headerRow, layout.firstCol, labels);

  var count = Math.max(sheet.getMaxRows() - layout.firstRow + 1, 1);
  var body = sheet.getRange(layout.firstRow, layout.firstCol, count, width);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.CLIP
  });
  body.setBackground(null);
  body.setDataValidation(null);
  IS9WD_applyColumnStyles_(sheet, layout.firstRow, count, layout.firstCol,
    layout.columns);
  IS9WD_banding_(body);
  IS9WD_setDataHeights_(sheet, layout.firstRow, count);

  // A retired row records an accomplishment rather than a published week, so it
  // reads muted against the snapshot rows beside it (10.1).
  var sourceCol = IS9WD_setupHeaderCol_(layout, 'Source');
  if (tabKey === 'ARCHIVE' && sourceCol) {
    IS9WD_setRules_(sheet, [IS9WD_ruleFormula_([body],
      '=$' + IS9WD_colLetter_(sourceCol) + layout.firstRow +
      '="' + layout.SOURCE_RETIRED + '"',
      { fg: IS9WD_ROLE.MUTED_FG })]);
  } else {
    IS9WD_setRules_(sheet, []);
  }
}

function IS9WD_setupHeaderCol_(layout, header) {
  for (var i = 0; i < layout.columns.length; i++) {
    if (layout.columns[i].header === header) return layout.firstCol + i;
  }
  return 0;
}

// ============================================================================
//  BACKFILLS  (written once, into a blank cell, never over anything)
// ============================================================================

// Key, Carousel order and Hierarchy order are written once and never rewritten: the
// master design's pages are physical, so renumbering an ordinal would send two
// committees to one page (4.8). The write-if-blank pass in the table writer already
// does it; this reports what it found, so a blank ordinal is visible rather than
// merely flagged by the Check column.
function IS9WD_setupBackfillDirectory_(sheet, say) {
  var d = IS9WD_CFG.DIRECTORY;
  var count = d.lastRow - d.firstRow + 1;
  var keys = sheet.getRange(d.firstRow, 1, count, 1).getValues();
  var blanks = 0;
  for (var i = 0; i < keys.length; i++) {
    if (IS9WD_blank_(keys[i][0])) blanks++;
  }
  say('directory: ' + (count - blanks) + ' of ' + count + ' rows keyed');
}

// ============================================================================
//  TOKENS  (7.3: one per directory row except K10, never overwritten)
// ============================================================================

// A token never touches a cell. The directory keeps the first six characters and the
// issue date for identification, because the Drive connector pulls every tab into a
// chat every Sunday and a token in any cell would go with it.
function IS9WD_setupEnsureTokens_(sheet, cfg, say) {
  var d = IS9WD_CFG.DIRECTORY;
  var count = d.lastRow - d.firstRow + 1;
  var store = PropertiesService.getScriptProperties();
  var held = store.getProperties();
  var admin = IS9WD_trim_(d.adminKey).toUpperCase();
  var prefixes = sheet.getRange(d.firstRow, 7, count, 1).getValues();
  var issued = sheet.getRange(d.firstRow, 8, count, 1).getValues();
  var keys = sheet.getRange(d.firstRow, 1, count, 1).getValues();
  var today = IS9WD_todayManila_();
  var minted = 0;
  var prefixTouched = false;
  var issuedTouched = false;

  for (var r = 0; r < count; r++) {
    var key = IS9WD_trim_(keys[r][0]).toUpperCase();
    if (key === '' || key === admin) continue;
    var propKey = IS9WD_tokenKey_(key);
    var token = IS9WD_trim_(held[propKey]);
    if (token === '') {
      token = IS9WD_setupNewToken_();
      store.setProperty(propKey, token);
      minted++;
      issued[r][0] = today;
      issuedTouched = true;
      say('token issued for ' + key);
    }
    var prefix = token.substring(0, 6);
    if (IS9WD_trim_(prefixes[r][0]) !== prefix) {
      prefixes[r][0] = prefix;
      prefixTouched = true;
    }
  }
  // Fourteen tokens for fourteen people: K10 holds the admin token instead of a row
  // token, so Show the links can name a link for Ethan on a fresh build.
  if (IS9WD_blank_(held[IS9WD_PROP.TOKEN_ADMIN])) {
    store.setProperty(IS9WD_PROP.TOKEN_ADMIN, IS9WD_setupNewToken_());
    minted++;
    say('admin token issued');
  }
  if (prefixTouched) sheet.getRange(d.firstRow, 7, count, 1).setValues(prefixes);
  if (issuedTouched) sheet.getRange(d.firstRow, 8, count, 1).setValues(issued);
  return minted;
}

// Two UUIDs stripped of hyphens is 64 hex characters, which is what Core asks for:
// it maps whole bytes, because mapping hex characters reaches 16 of the 32 symbols.
function IS9WD_setupNewToken_() {
  var hex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase();
  return IS9WD_newToken(hex);
}

// ============================================================================
//  APPLY SHEET GUARDS  (5.6: warning only, a guard rail for the owner)
// ============================================================================

// Warning only, so Ethan gets a prompt before overwriting a formula by accident and
// nobody is ever locked out of his own workbook. Every protection this creates is
// described with IS9WD_GUARD_PREFIX and re-applying removes only those: removing
// every protection it found would delete one Ethan added by hand, and appending
// without removing would stack a duplicate on every run.
function IS9WD_applyGuards_() {
  if (LockService.getDocumentLock().hasLock()) return IS9WD_applyGuardsLocked_();
  return IS9WD_withLock_(function () { return IS9WD_applyGuardsLocked_(); });
}

function IS9WD_applyGuardsLocked_() {
  var report = { lines: [], removed: 0, created: 0, domainRefused: 0, kept: 0 };
  var say = function (line) { report.lines.push(line); Logger.log(line); };
  var wanted = IS9WD_guardRanges_();

  for (var t = 0; t < IS9WD_TAB_ORDER.length; t++) {
    var sheet = IS9WD_setupSheet_(IS9WD_TAB_ORDER[t]);
    var mine = IS9WD_setupOwnProtections_(sheet);
    for (var i = 0; i < mine.own.length; i++) {
      mine.own[i].remove();
      report.removed++;
    }
    report.kept += mine.others;
  }

  for (var w = 0; w < wanted.length; w++) {
    var spec = wanted[w];
    var target = IS9WD_setupSheet_(spec.tab);
    var guard = spec.whole ? target.protect() : target.getRange(spec.a1).protect();
    guard.setDescription(spec.description);
    // Domain edit off before warning only, in that order: a protection created on a
    // Workspace file can default to letting the whole domain edit, and that is a
    // setting on an editor list, which a warning only protection no longer has. The
    // refusal is counted rather than swallowed, and warning only is set either way,
    // so nothing here can ever leave a range that blocks Ethan out of his own file.
    try {
      guard.setDomainEdit(false);
    } catch (err) {
      report.domainRefused++;
    }
    guard.setWarningOnly(true);
    report.created++;
  }
  say('protections: ' + report.created + ' applied, ' + report.removed +
    ' replaced, ' + report.kept + ' left alone because they are not ours');
  if (report.domainRefused) {
    say('domain edit was not settable on ' + report.domainRefused +
      ' of them, which is what a warning only protection does: it carries no ' +
      'editor list, so nothing was granted to anyone.');
  }
  say('Publishes is deliberately unguarded: it is the cell Ethan edits to change ' +
    'the publish set.');
  IS9WD_setupAppendLog_(IS9WD_setupSheet_('LOG'), report.lines, true);
  return report;
}

// Ours by description, theirs by anything else, both types on the sheet.
function IS9WD_setupOwnProtections_(sheet) {
  var own = [];
  var others = 0;
  var types = [SpreadsheetApp.ProtectionType.RANGE, SpreadsheetApp.ProtectionType.SHEET];
  for (var t = 0; t < types.length; t++) {
    var all = sheet.getProtections(types[t]);
    for (var i = 0; i < all.length; i++) {
      if (IS9WD_txt_(all[i].getDescription()).indexOf(IS9WD_GUARD_PREFIX) === 0) {
        own.push(all[i]);
      } else {
        others++;
      }
    }
  }
  return { own: own, others: others };
}

// Every protection on every tab, ours and Ethan's, with what it covers and whether
// it warns or blocks. Read only: it is the check for 13.3's twice-run test.
function IS9WD_listProtections_() {
  var lines = [];
  var mine = 0;
  var theirs = 0;
  for (var t = 0; t < IS9WD_TAB_ORDER.length; t++) {
    var sheet = IS9WD_setupSheet_(IS9WD_TAB_ORDER[t]);
    var types = [SpreadsheetApp.ProtectionType.SHEET, SpreadsheetApp.ProtectionType.RANGE];
    for (var k = 0; k < types.length; k++) {
      var all = sheet.getProtections(types[k]);
      for (var i = 0; i < all.length; i++) {
        var p = all[i];
        var ours = IS9WD_txt_(p.getDescription()).indexOf(IS9WD_GUARD_PREFIX) === 0;
        if (ours) mine++; else theirs++;
        var where = types[k] === SpreadsheetApp.ProtectionType.SHEET
          ? 'whole tab'
          : p.getRange().getA1Notation();
        lines.push(sheet.getName() + IS9WD_SEP + where + IS9WD_SEP +
          (p.isWarningOnly() ? 'warning only' : 'blocks edits') + IS9WD_SEP +
          (ours ? 'ours' : 'added by hand') + IS9WD_SEP +
          (IS9WD_txt_(p.getDescription()) || 'no description'));
      }
    }
  }
  lines.unshift(mine + ' from Apply sheet guards, ' + theirs + ' added by hand.');
  return { lines: lines, ours: mine, theirs: theirs };
}

// ============================================================================
//  THE WRITE-OWNERSHIP CHECK  (9: the line that makes idempotent a property)
// ============================================================================

// Every range on this list is Ethan owned, code written or append only, which is to
// say every cell setup may fill when it is blank and may never change once it is
// not. Script owned ranges are deliberately absent: they are rewritten every run.
function IS9WD_setupUserRanges_() {
  var c = IS9WD_CFG;
  var out = [];
  var push = function (tab, a1) { out.push({ tab: tab, a1: a1 }); };

  var rowBlocks = ['WEEK', 'SIGNOFF', 'SWITCHES', 'DIAGNOSTICS'];
  for (var b = 0; b < rowBlocks.length; b++) {
    var block = c[rowBlocks[b]];
    var runs = IS9WD_setupRuns_(block.rows.length, function (i) {
      return block.rows[i].owner !== IS9WD_OWN.SCRIPT;
    });
    for (var i = 0; i < runs.length; i++) {
      var firstRow = block.rows[runs[i].first].row;
      var rows = block.rows[runs[i].last].row - firstRow + 1;
      push('CONFIG', IS9WD_a1_(firstRow, c.VALUE_COL, rows, 1));
    }
  }
  push('CONFIG', IS9WD_a1_(c.STATUS.undoRow, c.VALUE_COL, 1, 1));

  var tables = ['WINDOWS', 'TERMS', 'STATUS', 'SCHEDULE', 'DIRECTORY', 'STORE'];
  for (var t = 0; t < tables.length; t++) {
    out = out.concat(IS9WD_setupColumnRanges_('CONFIG', c[tables[t]],
      c[tables[t]].firstRow, c[tables[t]].lastRow));
  }
  out = out.concat(IS9WD_setupColumnRanges_('ITEMS', IS9WD_ITEMS,
    IS9WD_ITEMS.firstRow, IS9WD_ITEMS.lastRow));

  var appendTabs = [['ARCHIVE', IS9WD_ARCHIVE], ['LOG', IS9WD_LOG]];
  for (var a = 0; a < appendTabs.length; a++) {
    var layout = appendTabs[a][1];
    var sheet = IS9WD_setupSheet_(appendTabs[a][0]);
    var last = Math.max(sheet.getLastRow(), layout.firstRow);
    push(appendTabs[a][0], IS9WD_a1_(layout.firstRow, layout.firstCol,
      last - layout.firstRow + 1, layout.lastCol - layout.firstCol + 1));
  }
  return out;
}

// Contiguous runs of non script columns, so a fourteen row block is one read rather
// than twelve.
function IS9WD_setupColumnRanges_(tab, block, firstRow, lastRow) {
  var out = [];
  var runs = IS9WD_setupRuns_(block.columns.length, function (i) {
    return block.columns[i].owner !== IS9WD_OWN.SCRIPT;
  });
  for (var i = 0; i < runs.length; i++) {
    out.push({
      tab: tab,
      a1: IS9WD_a1_(firstRow, block.firstCol + runs[i].first,
        lastRow - firstRow + 1, runs[i].last - runs[i].first + 1)
    });
  }
  return out;
}

function IS9WD_setupRuns_(length, keep) {
  var out = [];
  var start = -1;
  for (var i = 0; i < length; i++) {
    if (keep(i)) {
      if (start < 0) start = i;
      if (i === length - 1) out.push({ first: start, last: i });
    } else if (start >= 0) {
      out.push({ first: start, last: i - 1 });
      start = -1;
    }
  }
  return out;
}

// Display values, because that is what Ethan sees, and stored values beside them,
// because a number format is script owned: repairing the format on a date he pasted
// changes how it reads without changing what it is, and a failure there would be a
// false alarm on the one check that is supposed to mean something.
function IS9WD_setupSnapshot_() {
  var ranges = IS9WD_setupUserRanges_();
  var out = [];
  for (var i = 0; i < ranges.length; i++) {
    var sheet = IS9WD_setupSheet_(ranges[i].tab);
    var range = sheet.getRange(ranges[i].a1);
    out.push({
      tab: ranges[i].tab,
      name: sheet.getName(),
      row: range.getRow(),
      col: range.getColumn(),
      shown: range.getDisplayValues(),
      stored: IS9WD_setupStoredText_(range.getValues())
    });
  }
  return out;
}

// One stable text per cell, with a date rendered to the minute so a Date object and
// the same Date object compare equal across two reads.
function IS9WD_setupStoredText_(values) {
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var line = [];
    for (var c = 0; c < values[r].length; c++) {
      var v = values[r][c];
      line.push(IS9WD_isDate_(v) ? IS9WD_stampText_(v) : IS9WD_txt_(v));
    }
    out.push(line);
  }
  return out;
}

// A blank cell that setup filled is the write-if-blank rule working. A cell that
// held something and holds something else now is the failure this check exists for.
function IS9WD_setupCompare_(before, after) {
  var changed = [];
  for (var b = 0; b < before.length; b++) {
    var was = before[b];
    var now = after[b];
    if (!now || now.row !== was.row || now.col !== was.col) continue;
    for (var r = 0; r < was.shown.length; r++) {
      for (var c = 0; c < was.shown[r].length; c++) {
        var shownWas = IS9WD_trim_(was.shown[r][c]);
        if (shownWas === '') continue;
        var shownNow = now.shown[r] ? IS9WD_trim_(now.shown[r][c]) : '';
        if (shownNow === shownWas) continue;
        var storedWas = IS9WD_trim_(was.stored[r][c]);
        var storedNow = now.stored[r] ? IS9WD_trim_(now.stored[r][c]) : '';
        if (storedNow === storedWas) continue;
        changed.push(was.name + '!' + IS9WD_colLetter_(was.col + c) + (was.row + r));
      }
    }
  }
  return changed;
}

function IS9WD_setupCellList_(cells) {
  if (cells.length <= IS9WD_SETUP_REPORT_CELLS_) return cells.join(', ');
  return cells.slice(0, IS9WD_SETUP_REPORT_CELLS_).join(', ') +
    ' and ' + (cells.length - IS9WD_SETUP_REPORT_CELLS_) + ' more';
}

// ============================================================================
//  THE RUN LOG
// ============================================================================

// One appended block per run. IS9WD_Archive.js owns the general logger; this writer
// exists so a build can record itself before that module lands, and it appends in
// one call rather than a row at a time.
function IS9WD_setupAppendLog_(sheet, lines, ok) {
  if (!lines.length) return;
  var actor = IS9WD_setupActor_();
  var at = IS9WD_stampText_(IS9WD_nowManila_());
  var rows = [];
  for (var i = 0; i < lines.length; i++) {
    rows.push([at, actor, IS9WD_SETUP_SOURCE_, IS9WD_SETUP_ACTION_, '', '',
      lines[i], ok ? 'OK' : 'FAIL']);
  }
  var first = Math.max(sheet.getLastRow() + 1, IS9WD_LOG.firstRow);
  IS9WD_ensureGrid_(sheet, first + rows.length - 1, IS9WD_LOG.lastCol);
  var block = sheet.getRange(first, IS9WD_LOG.firstCol, rows.length, IS9WD_LOG.lastCol);
  block.setValues(rows);

  // An appended row can land below whatever the last run formatted, so it is styled
  // on the way in. The background is left alone on purpose: setting one would paint
  // over the banding this file points at the same range.
  IS9WD_style_(block, { size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG });
  IS9WD_applyColumnStyles_(sheet, first, rows.length, IS9WD_LOG.firstCol,
    IS9WD_LOG.columns);
  IS9WD_setDataHeights_(sheet, first, rows.length);
  if (!ok) {
    sheet.getRange(first, IS9WD_LOG.lastCol, rows.length, 1)
      .setFontColor(IS9WD_ROLE.FLAG_FG).setFontWeight('bold');
  }
}

function IS9WD_setupActor_() {
  var email = IS9WD_trim_(Session.getEffectiveUser().getEmail());
  return email === '' ? IS9WD_SETUP_SOURCE_ : email;
}
