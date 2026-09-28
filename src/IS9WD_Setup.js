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
// THE ONLY NAMES THIS PROJECT HAS EVER GIVEN A TAB. Append only, never replace: a name
// removed from this map is a tab that stops being recognised as ours, and a tab that is not
// recognised is renamed no further and keeps an old number in the bar forever while its own
// banner prints the new one.
//
// A regex over the NN | Name shape is deliberately NOT used. It would also match a name
// Ethan chose himself, say "03 | Archive backup", and rename it back to canonical on the
// next build, destroying a deliberate rename.
//
// The 2026-09-28 entries are the whole reason this map had to grow. 00 | Dashboard took the
// front of the reading order, so seven tabs shifted by one number, and before that day this
// map covered two keys out of nine. The other five would each have been left under their old
// name, with their own banner printing the new one, and nothing anywhere would have said so:
// nothing in the project compared a sheet's live name to its canonical name until the self
// test learned to.
var IS9WD_SETUP_FORMER_NAMES_ = {
  CONFIG: ['00 | Configuration'],
  FEED: ['01 | Canva Feed'],
  ITEMS: ['02 | Deliverables'],
  STATS: ['03 | Statistics'],
  TABLES: ['04 | Officer Tables'],
  ARCHIVE: ['03 | Archive', '05 | Archive'],
  LOG: ['04 | Log', '06 | Log']
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

// The directory Check column, 4.8's precedence in 4.8's order, written in plain words
// because Ethan reads it rather than debugging it. It is the one settings formula the
// layout does not carry, because the block's descriptor names a checkCol and no
// checkFormula.
//
// The directory is two blocks on two tabs now, so the five machinery columns are reached
// by name rather than by letter: `{off}` is `ROW()-<firstRow-1>`, which gives this row's
// offset inside the block and is a literal number rather than a reference, so filling the
// column down with PASTE_FORMULA leaves it alone. `{row}` is the block's first row and
// `{admin}` the directory's own admin key, so neither K10 nor a row number is typed twice.
var IS9WD_DIR_CHECK_FORMULA_ =
  '=IF($A{row}="","",' +
  'IF($C{row}="","No name yet",' +
  'IF($E{row}="","No email yet",' +
  'IF(AND($F{row}=TRUE,INDEX(IS9WD_DIR_CAROUSEL,{off})=""),' +
  '"On the carousel with no slide number: run Build or repair workbook",' +
  'IF(AND(INDEX(IS9WD_DIR_CAROUSEL,{off})<>"",' +
  'COUNTIF(IS9WD_DIR_CAROUSEL,INDEX(IS9WD_DIR_CAROUSEL,{off}))>1),' +
  '"Two rows share one slide number",' +
  'IF(AND(INDEX(IS9WD_DIR_CAROUSEL,{off})<>"",' +
  'OR(NOT(ISNUMBER(INDEX(IS9WD_DIR_CAROUSEL,{off}))),' +
  'INDEX(IS9WD_DIR_CAROUSEL,{off})<>INT(INDEX(IS9WD_DIR_CAROUSEL,{off})),' +
  'INDEX(IS9WD_DIR_CAROUSEL,{off})<1,' +
  'INDEX(IS9WD_DIR_CAROUSEL,{off})>COUNTIF(IS9WD_DIR_PUBLISHES,TRUE))),' +
  '"Slide number is out of range",' +
  'IF(AND(INDEX(IS9WD_DIR_PREFIX,{off})="",$A{row}<>"{admin}"),' +
  '"No private link yet: run Build or repair workbook",' +
  'IF($A{row}="{admin}","Your own admin link",' +
  'IF(AND(ISNUMBER(INDEX(IS9WD_DIR_ISSUED,{off})),' +
  'IS9WD_EFFECTIVE_TODAY-INDEX(IS9WD_DIR_ISSUED,{off})>IS9WD_TOKEN_WARN_DAYS),' +
  '"Link is "&INT(IS9WD_EFFECTIVE_TODAY-INDEX(IS9WD_DIR_ISSUED,{off}))&" days old",' +
  'IF(INDEX(IS9WD_DIR_REVOKED,{off})=TRUE,"Link revoked","OK"))))))))))';

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
// Build repairs a workbook; it does not migrate one. A block that moves takes every
// block below it with it, and setup writes an Ethan-owned cell only when it is blank,
// so on a workbook built against an older layout the old values stay where they were
// and the new layout reads them at the wrong rows. During build-out that is cheap to
// undo, and this is the undo: delete every tab this project owns and build again.
//
// It refuses the moment the workbook holds anything a person would miss. After go-live
// the answer is a migration, not this.
// The two view tabs are the tail of a build and the most expensive part of it, so on a
// slow run they are what Apps Script kills when the execution clock runs out, leaving
// their named ranges unset and the self test failing on exactly those. They rebuild
// here on their own, in their own execution, which is also what a layout setting change
// needs: neither reads anything Build writes except Configuration.
function IS9WD_buildViews_() {
  if (LockService.getDocumentLock().hasLock()) return IS9WD_buildViewsLocked_();
  return IS9WD_withLock_(function () {
    return IS9WD_buildViewsLocked_();
  });
}

function IS9WD_buildViewsLocked_() {
  var report = { lines: [], namesSet: 0, views: null, stats: null, tables: null, dash: null };
  var say = function (line) { report.lines.push(line); Logger.log(line); };
  var cfg = IS9WD_readConfig_(true);

  report.views = IS9WD_setupCall_('IS9WD_viewsResize_', [cfg], say,
    'the views helper tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.views) {
    report.namesSet += IS9WD_int_(report.views.namesPointed) || 0;
    say('views helpers sized: ' + report.views.directoryRows + ' officer rows, last row ' +
      report.views.lastRow);
  }
  report.stats = IS9WD_setupCall_('IS9WD_statsResize_', [cfg], say,
    'the statistics tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.stats) {
    report.namesSet += IS9WD_int_(report.stats.namesPointed) || 0;
    say('statistics sized: ' + report.stats.directoryRows + ' officer rows, ' +
      report.stats.trendWeeks + ' trend weeks, ' + report.stats.charts +
      ' charts, last row ' + report.stats.lastRow);
  }
  report.tables = IS9WD_setupCall_('IS9WD_officerTablesResize_', [cfg], say,
    'the officer tables tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.tables) {
    report.namesSet += IS9WD_int_(report.tables.namesPointed) || 0;
    say('officer tables sized: ' + report.tables.blocks + ' blocks, ' +
      report.tables.officerRows + ' rows reserved each showing ' +
      report.tables.itemRows + ' items, last row ' + report.tables.lastRow);
  }
  // The dashboard is built LAST of the computed views, because every number on it is read
  // from a named range one of the others points. Built first, it would paint a tab full of
  // #NAME? on a fresh workbook.
  report.dash = IS9WD_setupCall_('IS9WD_dashResize_', [cfg], say,
    'the dashboard was not built: IS9WD_Stats.js is not in this project yet');
  if (report.dash) {
    report.namesSet += IS9WD_int_(report.dash.namesPointed) || 0;
    say('dashboard built: ' + report.dash.cards + ' cards, ' + report.dash.rows +
      ' rows, last row ' + report.dash.lastRow);
  }
  // Re-pointed is the number that matters, not the total. Deleting a name rewrites the text
  // of every formula using it, so on a workbook whose layout has not moved this must be 0.
  say('named ranges pointed: ' + report.namesSet + ', re-pointed: ' +
    IS9WD_NAMED_REPOINTED_);
  return report;
}

function IS9WD_resetAndBuild_() {
  if (LockService.getDocumentLock().hasLock()) return IS9WD_resetAndBuildLocked_();
  return IS9WD_withLock_(function () {
    return IS9WD_resetAndBuildLocked_();
  });
}

function IS9WD_resetAndBuildLocked_() {
  var ss = IS9WD_ss_();
  var holds = IS9WD_resetBlockers_(ss);
  if (holds.length) {
    throw new Error('This workbook holds data, so it will not be reset: ' +
      holds.join('; ') + '. Reset is for build-out only.');
  }

  var deleted = [];
  var keys = IS9WD_TAB_ORDER.slice();
  for (var i = 0; i < keys.length; i++) {
    var sheet = IS9WD_sheetOrNull_(keys[i]);
    if (!sheet) continue;
    if (ss.getSheets().length === 1) ss.insertSheet();   // a file needs one sheet
    deleted.push(sheet.getName());
    ss.deleteSheet(sheet);
  }

  var names = ss.getNamedRanges();
  var dropped = 0;
  for (var n = 0; n < names.length; n++) {
    if (names[n].getName().indexOf('IS9WD_') === 0) { names[n].remove(); dropped++; }
  }

  var report = IS9WD_buildOrRepairLocked_();
  report.lines.unshift('reset: deleted ' + deleted.length + ' tabs (' +
    deleted.join(', ') + ') and dropped ' + dropped + ' named ranges');
  return report;
}

// Anything here is something a person typed or the script recorded, and none of it
// survives a delete. Tokens are deliberately absent: they live in Script Properties,
// and the build reissues only what is missing.
function IS9WD_resetBlockers_(ss) {
  var out = [];
  var count = function (rangeName, label) {
    var r = IS9WD_namedOrNull_(rangeName);
    if (!r) return;
    var vals = r.getValues();
    var filled = 0;
    for (var i = 0; i < vals.length; i++) {
      if (IS9WD_filled_(vals[i][0])) filled++;
    }
    if (filled) out.push(filled + ' ' + label);
  };
  count('IS9WD_DEL_TITLE', 'deliverables');
  count('IS9WD_ARC_ID', 'archive rows');
  count('IS9WD_SIGNOFF_WEEKS', 'sign-off rows');
  count('IS9WD_DIR_VP', 'directory names');
  return out;
}

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
    items: null, views: null, stats: null, tables: null, dash: null, backfilledIds: 0,
    backfilledStatus: 0, tokensIssued: 0, userCellsChanged: 0, changedCells: [],
    missingNames: []
  };
  var say = function (line) { report.lines.push(line); Logger.log(line); };

  IS9WD_setupWorkbookSettings_(say);

  // Tabs and the grid first, and no cell is written until both are right: the
  // before snapshot has to cover ranges that already reach their full span.
  var sheets = IS9WD_setupTabs_(report, say);
  // The store lives on `_Engine` now, and it is still the last block on its own tab so it
  // can grow downward without moving anything above it.
  report.storeLastRow = IS9WD_setupStoreSpan_(sheets.ENGINE, report, say);
  report.archiveLastRow = IS9WD_setupArchiveSpan_(sheets.ARCHIVE, report, say);
  IS9WD_setupGrids_(sheets, say);

  var before = IS9WD_setupSnapshot_();

  // Names before formulas, so nothing spends a recalculation reading #NAME?. These
  // are the Configuration, data tab and Archive names; the feed's and the two views'
  // move with their own sizes and are pointed by the modules that own those tabs.
  report.namesSet += IS9WD_setupSetNames_(
    IS9WD_configNames_().concat(IS9WD_itemNames_()).concat(IS9WD_archiveNames_()));
  report.namesDropped = IS9WD_setupDropRetired_();

  IS9WD_setupWriteSettings_(say);
  SpreadsheetApp.flush();
  IS9WD_configReset_();
  var cfg = IS9WD_readConfig_(true);

  IS9WD_setupStyleSettings_(report.storeLastRow);
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
  // `_Views` first of the three, because 03 | Statistics reads its helper band by name and
  // 04 | Officer Tables reads both. Three calls in dependency order, and none of them is
  // gated on the capacity numbers.
  report.views = IS9WD_setupCall_('IS9WD_viewsResize_', [cfg], say,
    'the views helper tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.views) {
    report.namesSet += IS9WD_int_(report.views.namesPointed) || 0;
    say('views helpers sized: ' + report.views.directoryRows + ' officer rows, ' +
      report.views.trendWeeks + ' trend weeks, ' + report.views.jobRows +
      ' job rows, last row ' + report.views.lastRow);
  }
  report.stats = IS9WD_setupCall_('IS9WD_statsResize_', [cfg], say,
    'the statistics tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.stats) {
    report.namesSet += IS9WD_int_(report.stats.namesPointed) || 0;
    say('statistics sized: ' + report.stats.directoryRows + ' officer rows, ' +
      report.stats.trendWeeks + ' trend weeks, ' + report.stats.tiles + ' KPI tiles, ' +
      report.stats.charts + ' charts, last row ' + report.stats.lastRow +
      ', last column ' + report.stats.lastCol);
  }
  report.tables = IS9WD_setupCall_('IS9WD_officerTablesResize_', [cfg], say,
    'the officer tables tab was not built: IS9WD_Stats.js is not in this project yet');
  if (report.tables) {
    report.namesSet += IS9WD_int_(report.tables.namesPointed) || 0;
    say('officer tables sized: ' + report.tables.blocks + ' blocks, ' +
      report.tables.officerRows + ' rows reserved each showing ' +
      report.tables.itemRows + ' items, last row ' + report.tables.lastRow);
  }
  // The dashboard is built LAST of the computed views, because every number on it is read
  // from a named range one of the others points. Built first, it would paint a tab full of
  // #NAME? on a fresh workbook.
  report.dash = IS9WD_setupCall_('IS9WD_dashResize_', [cfg], say,
    'the dashboard was not built: IS9WD_Stats.js is not in this project yet');
  if (report.dash) {
    report.namesSet += IS9WD_int_(report.dash.namesPointed) || 0;
    say('dashboard built: ' + report.dash.cards + ' cards, ' + report.dash.rows +
      ' rows, last row ' + report.dash.lastRow);
  }

  IS9WD_setupBackfillDirectory_(sheets.CONFIG, sheets.ENGINE, say);
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
  report.tokensIssued = IS9WD_setupEnsureTokens_(sheets.CONFIG, sheets.ENGINE, cfg, say);

  SpreadsheetApp.flush();
  IS9WD_configReset_();

  var audit = IS9WD_nameAudit_(cfg.switches.capacityOk ? cfg.feed : null,
    cfg.stats, cfg.ot, cfg.views);
  report.missingNames = audit.missing;
  // RE-POINTED IS THE NUMBER THAT MATTERS. Deleting a named range rewrites the text of every
  // formula that uses it, substituting #REF! permanently, so on a workbook whose layout has not
  // moved this must read 0. It read 196 on every build until 2026-09-28, which is what
  // destroyed the eight officer helpers on _Views and everything downstream of them.
  say('named ranges: ' + report.namesSet + ' set of ' + audit.expected +
    ' expected, ' + audit.missing.length + ' missing, ' +
    report.namesDropped.length + ' retired dropped, ' +
    IS9WD_NAMED_REPOINTED_ + ' re-pointed');

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
    // A KEY WITH NO COLOUR THROWS, WITH A SENTENCE. setTabColor(undefined) is accepted
    // silently and clears the chip, so a tab added to IS9WD_TAB_ORDER and forgotten in
    // IS9WD_TAB_COLOR would ship with no colour and nothing would say which one. This fires
    // inside the rename loop, before anything else is written, which is the cheapest place
    // for a layout fault to stop a build.
    var colour = IS9WD_TAB_COLOR[key];
    if (!colour) {
      throw new Error('IS9WD: the tab ' + key + ' has no colour in IS9WD_TAB_COLOR, so ' +
        'the workbook was not built. Every key in IS9WD_TAB_ORDER needs one.');
    }
    sheet.setTabColor(colour);
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
  var store = IS9WD_ENG.STORE;
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
  var views = IS9WD_views_();
  var dash = IS9WD_dash_();
  var plan = {
    // 00 | Configuration ends on the sign-off block now, because every growing and
    // machine owned block moved to `_Engine`.
    CONFIG: { rows: IS9WD_CFG.SIGNOFF.lastRow, cols: IS9WD_CFG.LAST_COL, trimRows: true, chrome: true },
    FEED: { rows: feed.endRow, cols: feed.helperLastCol, trimRows: false, chrome: false },
    ITEMS: { rows: IS9WD_ITEMS.lastRow, cols: IS9WD_ITEMS.lastCol, trimRows: false, chrome: false },
    STATS: { rows: stats.endRow, cols: stats.lastCol, trimRows: false, chrome: false },
    TABLES: { rows: tables.endRow, cols: tables.lastCol, trimRows: false, chrome: false },
    // `_Engine` carries the store, so its last row is the store's live last row, which
    // IS9WD_setupStoreSpan_ has already updated in place by the time this runs.
    ENGINE: { rows: IS9WD_ENG.STORE.lastRow, cols: IS9WD_ENG.LAST_COL, trimRows: true, chrome: true },
    VIEWS: { rows: views.endRow, cols: views.lastCol, trimRows: false, chrome: false },
    // The Archive now declares a last row, because the trend block's six named ranges
    // have to span a real grid. It is grown in place by IS9WD_setupArchiveSpan_.
    ARCHIVE: { rows: IS9WD_ARCHIVE.lastRow, cols: IS9WD_ARCHIVE.lastCol, trimRows: false, chrome: true },
    LOG: { rows: IS9WD_LOG.firstRow, cols: IS9WD_LOG.lastCol, trimRows: false, chrome: true },
    // The dashboard sizes and trims itself in IS9WD_dashResize_, the same way the two other
    // computed views do, so the grid pass only has to know how big it will be.
    DASHBOARD: { rows: dash.endRow, cols: dash.lastCol, trimRows: false, chrome: false }
  };
  for (var k = 0; k < IS9WD_TAB_ORDER.length; k++) {
    var key = IS9WD_TAB_ORDER[k];
    var sheet = sheets[key];
    var want = plan[key];
    // A KEY WITH NO PLAN THROWS, WITH A SENTENCE. Unguarded, `want.rows` threw a bare
    // TypeError here, and it threw AFTER every tab had already been renamed and BEFORE a
    // single log row was written, which is the worst possible moment: a half migrated
    // workbook and no record of how far it got.
    if (!want) {
      throw new Error('IS9WD: the tab ' + key + ' has no entry in the grid plan, so the ' +
        'workbook was not built. Every key in IS9WD_TAB_ORDER needs one.');
    }
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
//  THE SETTINGS TABS, THE VALUES  (section 4, every address out of the layout)
// ============================================================================

// Both settings tabs, same writer, same painter. `00 | Configuration` holds what a
// president sets and `_Engine` holds what the code needs, and neither one knows that
// about itself: a block carries its own `tab` and everything here follows it.
function IS9WD_setupWriteSettings_(say) {
  var written = 0;
  for (var t = 0; t < IS9WD_SETTINGS_TABS.length; t++) {
    var tabKey = IS9WD_SETTINGS_TABS[t].tabKey;
    var holder = IS9WD_SETTINGS_TABS[t].holder;
    var sheet = IS9WD_setupSheet_(tabKey);
    for (var b = 0; b < holder.BLOCKS.length; b++) {
      var block = holder[holder.BLOCKS[b]];
      if (block.rows) {
        IS9WD_setupWriteRowBlock_(sheet, holder, block);
      } else {
        IS9WD_setupWriteTableBlock_(sheet, block);
      }
      written++;
    }
    // The undo window rides under the status list, on its own row, with a label of its
    // own rather than a header (4.4).
    if (holder.STATUS) {
      var status = holder.STATUS;
      sheet.getRange(status.undoRow, holder.LABEL_COL).setValue(status.undoLabel);
      var undo = sheet.getRange(status.undoRow, holder.VALUE_COL);
      if (IS9WD_blank_(undo.getValue())) undo.setValue(IS9WD_DEFAULTS.UNDO_SECONDS);
    }
  }
  say('settings: ' + written + ' blocks written across ' + IS9WD_SETTINGS_TABS.length +
    ' tabs');
}

// Label, then value or formula, then the plain English hint beside it, then the guard
// note beside that. A script row is rewritten every run; an Ethan row is written only
// into a blank cell; a code row is never written at all and only keeps its format.
//
// THE HINT IS WRITTEN AS A VALUE, NOT AS A FORMAT. It is the sentence Ethan reads before
// he types, so it is content: it is rewritten on every run because it belongs to the
// script, and it sits in the hint column where nothing else ever goes.
function IS9WD_setupWriteRowBlock_(sheet, holder, block) {
  var rows = block.rows;
  var first = block.firstRow;
  var count = block.lastRow - first + 1;

  var labels = [];
  var hints = [];
  for (var r = 0; r < count; r++) { labels.push(['']); hints.push(['']); }
  var valueRange = sheet.getRange(first, holder.VALUE_COL, count, 1);
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
    hints[at][0] = row.formula ? IS9WD_CFG_CALC_HINT : IS9WD_txt_(row.hint);
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
  sheet.getRange(first, holder.LABEL_COL, count, 1).setValues(labels);
  valueRange.setValues(out);
  sheet.getRange(first, holder.HINT_COL, count, 1).setValues(hints);
  if (hasNote) sheet.getRange(first, holder.NOTE_COL, count, 1).setValues(notes);
}

// A table block writes its header from the column descriptors, one plain English hint per
// column into the hint row under the band, its defaults into blank cells column by column,
// and its Check formula down the check column.
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
  IS9WD_setupWriteHintRow_(sheet, block);
  IS9WD_setupWriteCheckColumn_(sheet, block);
}

// One sentence per column, in the row under the band, so a hint sits directly above the
// cells it describes. A column with no hint gets a blank rather than a repeat of its
// header: a hint that says nothing is worse than no hint at all.
function IS9WD_setupWriteHintRow_(sheet, block) {
  if (!block.hintRow || !block.columns) return;
  var line = [];
  for (var i = 0; i < block.columns.length; i++) {
    line.push(IS9WD_txt_(block.columns[i].hint));
  }
  sheet.getRange(block.hintRow, block.firstCol, 1, line.length).setValues([line]);
}

// Positional against the block's rows, which is how IS9WD_DEFAULTS is written: row one of
// the defaults is the block's first row. The directory is the keyed case, and it is keyed
// twice now: the seven columns on 00 | Configuration take Key, Committee, Position and
// Publishes, and the six on `_Engine` take Key, Carousel order and Hierarchy order.
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
  } else if (block.key === 'DIRECTORY' && block.tab === 'CONFIG') {
    var d = IS9WD_DEFAULTS.DIRECTORY;
    put(block.firstCol, column(d, 0));       // Key
    put(block.firstCol + 1, column(d, 2));   // Committee or office
    put(block.firstCol + 3, column(d, 3));   // Position label
    put(block.firstCol + 5, column(d, 4));   // On the carousel
  } else if (block.key === 'DIRECTORY' && block.tab === 'ENGINE') {
    var e = IS9WD_DEFAULTS.DIRECTORY;
    put(block.firstCol, column(e, 0));       // Key, mirrored for legibility
    put(block.firstCol + 1, column(e, 1));   // Carousel order
    put(block.firstCol + 2, column(e, 5));   // Hierarchy order
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
// PASTE_FORMULA, which translates the relative rows and leaves the absolute ranges alone.
// Rewriting the string per row would have to know which digits are a row and which are
// part of a pattern such as {6} in a hex test.
//
// Every check formula is a template now, so no row number is typed in this project twice:
// `{row}` is the block's first row, `{off}` is this row's offset inside the block written
// as ROW() minus a literal, and `{first}` and `{last}` are the block's live span, which is
// what keeps the store's duplicate-week test covering a grown store (4.5).
function IS9WD_setupWriteCheckColumn_(sheet, block) {
  var formula = block.checkFormula;
  if (block.key === 'DIRECTORY' && block.tab === 'CONFIG') {
    formula = IS9WD_DIR_CHECK_FORMULA_.replace(/\{admin\}/g, IS9WD_trim_(block.adminKey));
  }
  if (!formula || !block.checkCol) return;
  var last = block.lastRow;
  if (block.key === 'STORE') last = IS9WD_ENG.STORE.lastRow;
  formula = formula
    .replace(/\{off\}/g, 'ROW()-' + (block.firstRow - 1))
    .replace(/\{first\}/g, String(block.firstRow))
    .replace(/\{last\}/g, String(last))
    .replace(/\{row\}/g, String(block.firstRow));
  var count = last - block.firstRow + 1;
  var head = sheet.getRange(block.firstRow, block.checkCol);
  head.setFormula(formula);
  if (count > 1) {
    head.copyTo(sheet.getRange(block.firstRow + 1, block.checkCol, count - 1, 1),
      SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
  }
}

// ============================================================================
//  THE SETTINGS TABS, THE LOOK  (2.5 palette, and the cream rule)
// ============================================================================

// THE CREAM RULE IS THE WHOLE OF THIS SECTION. Ethan's instruction of 2026-09-27: every
// cell he is expected to type into carries the cream fill and a plain English explanation,
// per cell, and a cell he must never type into must not be cream and must read as
// calculated. So:
//
//   · An Ethan owned or append owned value cell gets #e9ebd4 and its hint as a note.
//   · A script owned or code owned cell gets the page background and the note that says
//     it is worked out by the sheet.
//   · NOTHING IS BANDED on a block that holds an input column, because banding would put
//     cream under half the calculated cells and destroy the one rule a first time reader
//     can learn in a second. Existing bandings are removed rather than left.
function IS9WD_setupStyleSettings_(storeLastRow) {
  for (var t = 0; t < IS9WD_SETTINGS_TABS.length; t++) {
    var tabKey = IS9WD_SETTINGS_TABS[t].tabKey;
    var holder = IS9WD_SETTINGS_TABS[t].holder;
    var sheet = IS9WD_setupSheet_(tabKey);
    IS9WD_paintBanner_(sheet, holder.BANNER_ROW, holder.FIRST_COL, holder.LAST_COL,
      holder.BANNER);
    IS9WD_paintHelp_(sheet, holder.HELP_ROW, holder.FIRST_COL, holder.LAST_COL,
      holder.HELP);

    for (var b = 0; b < holder.BLOCKS.length; b++) {
      var block = holder[holder.BLOCKS[b]];
      IS9WD_paintBand_(sheet, block.titleRow, holder.FIRST_COL, holder.LAST_COL,
        block.title, '');
      // The block's own plain English line is the note on its title, on every block, so
      // clicking a heading explains the block. Where it is ALSO visible depends on the
      // shape, and the difference is not cosmetic:
      //
      //   · a ROW block has one setting per row, so column C is free on the hint row and
      //     the block's line goes there, under the heading;
      //   · a TABLE block needs that same row for one hint per column, and a column's own
      //     hint has to sit over the column it describes. Writing the block line into
      //     column A there would silently replace the first column's hint, which is
      //     exactly the bug this comment exists because of.
      sheet.getRange(block.titleRow, holder.FIRST_COL).setNote(IS9WD_txt_(block.help));
      if (block.rows && block.hintRow) {
        IS9WD_paintHint_(sheet, block.hintRow, holder.FIRST_COL, holder.LAST_COL,
          block.help);
      }
      if (block.rows) {
        IS9WD_setupStyleRowBlock_(sheet, holder, block);
      } else {
        IS9WD_setupStyleTableBlock_(sheet, block);
      }
    }
    if (holder.STATUS) IS9WD_setupStyleUndoRow_(sheet, holder);
    IS9WD_setupStyleSpacers_(sheet, holder);
    IS9WD_setRules_(sheet, IS9WD_setupSettingsRules_(sheet, tabKey, holder, storeLastRow));
  }
}

// A label reads as text, a value Ethan owns reads as cream, a calculated value reads as
// the accent and carries no fill, the hint reads as a hint and the guard note shouts only
// when it has something to say.
function IS9WD_setupStyleRowBlock_(sheet, holder, block) {
  var count = block.lastRow - block.firstRow + 1;
  var labels = sheet.getRange(block.firstRow, holder.LABEL_COL, count, 1);
  IS9WD_style_(labels, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.CLIP
  });
  labels.setBackground(null);
  var values = sheet.getRange(block.firstRow, holder.VALUE_COL, count, 1);
  IS9WD_clearBanding_(values);
  values.setBackground(null);
  var hints = sheet.getRange(block.firstRow, holder.HINT_COL, count, 1);
  IS9WD_style_(hints, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.WRAP, format: IS9WD_FMT.TEXT
  });
  hints.setBackground(null);
  var notes = sheet.getRange(block.firstRow, holder.NOTE_COL, count, 1);
  IS9WD_style_(notes, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.WRAP, format: IS9WD_FMT.TEXT
  });
  notes.setBackground(null);

  for (var i = 0; i < block.rows.length; i++) {
    var row = block.rows[i];
    var derived = !!row.formula;
    var cell = sheet.getRange(row.row, holder.VALUE_COL);
    IS9WD_style_(cell, {
      size: IS9WD_SIZE.BODY,
      fg: derived ? IS9WD_ROLE.ACCENT_FG : IS9WD_ROLE.BODY_FG,
      bold: derived,
      align: row.align || IS9WD_ALIGN.LEFT,
      format: row.format,
      wrap: IS9WD_WRAP.CLIP
    });
    if (derived || row.owner === IS9WD_OWN.CODE) {
      IS9WD_paintCalculated_(cell);
    } else {
      IS9WD_paintInput_(cell, row.hint);
    }
  }
  // The hint beside each cell is a sentence, wrapped, and a forced 26 px row clips it
  // to its first line, which is the half of requirement 3 nobody would notice was
  // missing. Auto fit lets the tallest hint in each row decide.
  sheet.autoResizeRows(block.firstRow, count);
  IS9WD_applyRowValidations_(sheet, block.rows, holder.VALUE_COL);
  // AUTO FIT WINS, WITH A FLOOR. The line below used to be setRowHeights over the whole
  // block, which undid the auto fit on the line above it and clipped every plain English
  // sentence beside every cell Ethan types into to its first line. That is the half of his
  // 2026-09-27 instruction nobody would have noticed was missing, because a clipped
  // sentence looks like a short sentence.
  //
  // A floor rather than a fixed height: auto fit on a one word hint gives a 21 px row, and a
  // block of rows that each pick their own small height loses the rhythm that makes a block
  // read as a block. So a row is at least IS9WD_ROW_H.DATA and taller when its hint needs it.
  IS9WD_setupFloorRowHeights_(sheet, block.firstRow, count, IS9WD_ROW_H.DATA);
}

function IS9WD_setupStyleTableBlock_(sheet, block) {
  var count = block.lastRow - block.firstRow + 1;
  var labels = [];
  for (var i = 0; i < block.columns.length; i++) labels.push(block.columns[i].header);
  IS9WD_paintHeader_(sheet, block.headerRow, block.firstCol, labels);

  // The hint row is per column here, so it is styled per column rather than as one
  // overflowing sentence: a hint above a 120 px checkbox column has to wrap.
  if (block.hintRow) {
    var hintRange = sheet.getRange(block.hintRow, block.firstCol, 1, block.columns.length);
    IS9WD_style_(hintRange, {
      size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, align: IS9WD_ALIGN.LEFT,
      bg: IS9WD_ROLE.BODY_BG, wrap: IS9WD_WRAP.WRAP, format: IS9WD_FMT.TEXT
    });
    sheet.setRowHeight(block.hintRow, IS9WD_ROW_H.HINT);
  }

  var body = sheet.getRange(block.firstRow, block.firstCol, count, block.columns.length);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.CLIP
  });
  // Banding removed and never reapplied: cream now means "type here", and a banded row
  // would put cream under a calculated cell.
  IS9WD_clearBanding_(body);
  body.setBackground(IS9WD_ROLE.BODY_BG);
  IS9WD_applyColumnStyles_(sheet, block.firstRow, count, block.firstCol, block.columns);
  IS9WD_applyValidations_(sheet, block.firstRow, count, block.firstCol, block.columns);

  for (var c = 0; c < block.columns.length; c++) {
    var col = block.columns[c];
    var range = sheet.getRange(block.firstRow, block.firstCol + c, count, 1);
    var mine = col.owner === IS9WD_OWN.ETHAN || col.owner === IS9WD_OWN.APPEND;
    if (mine) {
      IS9WD_paintInput_(range, col.hint);
    } else {
      IS9WD_paintCalculated_(range);
      if (col.owner === IS9WD_OWN.SCRIPT || col.owner === IS9WD_OWN.CODE ||
        col.owner === IS9WD_OWN.ONCE) {
        range.setFontColor(IS9WD_ROLE.HINT_FG);
      }
    }
  }
  sheet.setRowHeights(block.firstRow, count, IS9WD_ROW_H.DATA);
}

function IS9WD_setupStyleUndoRow_(sheet, holder) {
  var status = holder.STATUS;
  IS9WD_style_(sheet.getRange(status.undoRow, holder.LABEL_COL), {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT
  });
  var value = sheet.getRange(status.undoRow, holder.VALUE_COL);
  IS9WD_style_(value, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.RIGHT,
    format: IS9WD_FMT.INT
  });
  sheet.getRange(status.undoRow, holder.LABEL_COL).setBackground(null);
  IS9WD_paintInput_(value, status.undoHint);
  var hint = sheet.getRange(status.undoRow, holder.HINT_COL);
  IS9WD_style_(hint, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, align: IS9WD_ALIGN.LEFT,
    wrap: IS9WD_WRAP.WRAP, format: IS9WD_FMT.TEXT
  });
  hint.setValue(IS9WD_txt_(status.undoHint));
  hint.setBackground(null);
  IS9WD_applyRowValidations_(sheet,
    [{ row: status.undoRow, validate: status.undoValidate }], holder.VALUE_COL);
  sheet.setRowHeight(status.undoRow, IS9WD_ROW_H.DATA);
}

// One blank row between blocks, taller than it was, so a twelve row block reads as a block
// rather than as part of the next one. More air was Ethan's instruction.
function IS9WD_setupStyleSpacers_(sheet, holder) {
  var rows = holder.SPACER_ROWS;
  for (var i = 0; i < rows.length; i++) {
    var range = sheet.getRange(rows[i], holder.FIRST_COL, 1, holder.LAST_COL);
    range.setBackground(null);
    range.setDataValidation(null);
    range.clearNote();
    sheet.setRowHeight(rows[i], IS9WD_ROW_H.SPACER);
  }
}

// A Check column that does not read OK is the workbook telling Ethan something, so it is
// the one place on a settings tab that shouts: bold strong purple on cream.
function IS9WD_setupSettingsRules_(sheet, tabKey, holder, storeLastRow) {
  var rules = [];
  for (var b = 0; b < holder.BLOCKS.length; b++) {
    var block = holder[holder.BLOCKS[b]];
    if (!block.columns || !block.checkCol) continue;
    var last = block.growBy ? (storeLastRow || block.lastRow) : block.lastRow;
    var range = sheet.getRange(block.firstRow, block.checkCol,
      last - block.firstRow + 1, 1);
    var cell = '$' + IS9WD_colLetter_(block.checkCol) + block.firstRow;
    rules.push(IS9WD_ruleFormula_([range],
      '=AND(' + cell + '<>"",' + cell + '<>"OK")',
      { bg: IS9WD_ROLE.FLAG_BG, fg: IS9WD_ROLE.FLAG_FG, bold: true }));
    rules.push(IS9WD_ruleFormula_([range], '=' + cell + '="OK"',
      { fg: IS9WD_ROLE.HINT_FG }));
  }
  // Every guard note on this tab: each one is blank or reads OK while the thing it guards
  // is right, and shouts when it is not.
  var notes = IS9WD_setupGuardNoteRows_(tabKey);
  for (var n = 0; n < notes.length; n++) {
    var noteCell = sheet.getRange(notes[n], holder.NOTE_COL);
    var a1 = '$' + IS9WD_colLetter_(holder.NOTE_COL) + notes[n];
    rules.push(IS9WD_ruleFormula_([noteCell],
      '=AND(' + a1 + '<>"",' + a1 + '<>"OK")',
      { fg: IS9WD_ROLE.FLAG_FG, bold: true }));
  }
  return rules;
}

function IS9WD_setupGuardNoteRows_(tabKey) {
  var want = IS9WD_trim_(tabKey).toUpperCase();
  var out = [];
  var blocks = IS9WD_settingsRowBlocks_();
  for (var b = 0; b < blocks.length; b++) {
    if (blocks[b].tab !== want) continue;
    var rows = blocks[b].rows;
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
  // BANDING IS REMOVED HERE, NOT APPLIED. Both band colours are #F8FBFD since cream came
  // out of the row rhythm, so the banding painted the page background over a thousand rows
  // and took the gridlines with it: a filled cell shows no gridline. The rhythm on these two
  // tabs is the gridline, which is what Ethan asked for, so the fill has to go. Clearing
  // rather than merely not applying, because a banding an older layout left behind survives
  // Range.clear().
  IS9WD_clearBanding_(body);
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
// master design's pages are physical, so renumbering an ordinal would send two officers
// to one page (4.8). The write-if-blank pass in the table writer already does it; this
// reports what it found, so a blank or duplicated ordinal is visible in the build log
// rather than only in the Check column, which is where a half migrated workbook hides.
function IS9WD_setupBackfillDirectory_(sheet, engineSheet, say) {
  var d = IS9WD_CFG.DIRECTORY;
  var e = IS9WD_ENG.DIRECTORY;
  var count = d.lastRow - d.firstRow + 1;
  var keys = sheet.getRange(d.firstRow, 1, count, 1).getValues();
  var keyed = 0;
  for (var i = 0; i < keys.length; i++) {
    if (!IS9WD_blank_(keys[i][0])) keyed++;
  }
  say('directory: ' + keyed + ' of ' + count + ' rows keyed');

  var pub = sheet.getRange(d.firstRow, 6, count, 1).getValues();
  var ord = engineSheet.getRange(e.firstRow, 2, count, 1).getValues();
  var publishing = 0;
  var missing = [];
  var seen = {};
  var shared = {};
  for (var r = 0; r < count; r++) {
    if (!IS9WD_bool_(pub[r][0])) continue;
    publishing++;
    var num = IS9WD_int_(ord[r][0]);
    var key = IS9WD_trim_(keys[r][0]).toUpperCase();
    if (num === null) { missing.push(key); continue; }
    if (seen[num]) { shared[num] = true; } else { seen[num] = key; }
  }
  var dupes = [];
  for (var s in shared) {
    if (Object.prototype.hasOwnProperty.call(shared, s)) dupes.push(s);
  }
  say('carousel: ' + publishing + ' of ' + count + ' rows publish, ' +
    (missing.length ? missing.length + ' with no slide number (' + missing.join(', ') +
      ')' : 'every one numbered') +
    (dupes.length ? ', and slide ' + dupes.join(' and ') + ' is claimed twice' : ''));
}

// ============================================================================
//  TOKENS  (7.3: one per directory row except K10, never overwritten)
// ============================================================================

// A token never touches a cell. The directory keeps the first six characters and the
// issue date for identification, because the Drive connector pulls every tab into a
// chat every Sunday and a token in any cell would go with it.
// The two identification columns are on `_Engine` now, which is why this takes both
// sheets: the Key it reads is the one on 00 | Configuration, because that is the column
// the private links are named after, and the prefix and the date it writes are the code's
// own and sit with the rest of the machinery.
function IS9WD_setupEnsureTokens_(sheet, engineSheet, cfg, say) {
  var d = IS9WD_CFG.DIRECTORY;
  var e = IS9WD_ENG.DIRECTORY;
  var count = d.lastRow - d.firstRow + 1;
  var store = PropertiesService.getScriptProperties();
  var held = store.getProperties();
  var admin = IS9WD_trim_(d.adminKey).toUpperCase();
  var prefixes = engineSheet.getRange(e.firstRow, 4, count, 1).getValues();
  var issued = engineSheet.getRange(e.firstRow, 5, count, 1).getValues();
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
  if (prefixTouched) engineSheet.getRange(e.firstRow, 4, count, 1).setValues(prefixes);
  if (issuedTouched) engineSheet.getRange(e.firstRow, 5, count, 1).setValues(issued);
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
  var out = [];
  var push = function (tab, a1) { out.push({ tab: tab, a1: a1 }); };

  // Both settings tabs, walked from the descriptors rather than from a list of block
  // names, so a block that moved from one tab to the other is still covered and a new
  // block is covered the day it is declared.
  var rowBlocks = IS9WD_settingsRowBlocks_();
  for (var b = 0; b < rowBlocks.length; b++) {
    var block = rowBlocks[b];
    var holder = IS9WD_settingsHolder_(block.tab);
    var runs = IS9WD_setupRuns_(block.rows.length, (function (rows) {
      return function (i) { return rows[i].owner !== IS9WD_OWN.SCRIPT; };
    })(block.rows));
    for (var i = 0; i < runs.length; i++) {
      var firstRow = block.rows[runs[i].first].row;
      var rows = block.rows[runs[i].last].row - firstRow + 1;
      push(block.tab, IS9WD_a1_(firstRow, holder.VALUE_COL, rows, 1));
    }
  }
  for (var h = 0; h < IS9WD_SETTINGS_TABS.length; h++) {
    var hold = IS9WD_SETTINGS_TABS[h].holder;
    if (hold.STATUS) {
      push(IS9WD_SETTINGS_TABS[h].tabKey,
        IS9WD_a1_(hold.STATUS.undoRow, hold.VALUE_COL, 1, 1));
    }
  }

  var tables = IS9WD_settingsTableBlocks_();
  for (var t = 0; t < tables.length; t++) {
    out = out.concat(IS9WD_setupColumnRanges_(tables[t].tab, tables[t],
      tables[t].firstRow, tables[t].lastRow));
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
function IS9WD_setupAppendLog_(sheet, lines, ok, action) {
  if (!lines.length) return;
  var actor = IS9WD_setupActor_();
  var at = IS9WD_stampText_(IS9WD_nowManila_());
  var what = IS9WD_trim_(action) === '' ? IS9WD_SETUP_ACTION_ : IS9WD_trim_(action);
  var rows = [];
  for (var i = 0; i < lines.length; i++) {
    rows.push([at, actor, IS9WD_SETUP_SOURCE_, what, '', '',
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

// Auto fit decides the height and this raises anything shorter than the floor, so a wrapped
// sentence gets the room it needs and a one word hint does not shrink out of the block's
// rhythm. Read once and written once per block: getRowHeight in a loop is a round trip a row.
function IS9WD_setupFloorRowHeights_(sheet, firstRow, count, floor) {
  for (var i = 0; i < count; i++) {
    var row = firstRow + i;
    if (sheet.getRowHeight(row) < floor) sheet.setRowHeight(row, floor);
  }
}

function IS9WD_setupActor_() {
  var email = IS9WD_trim_(Session.getEffectiveUser().getEmail());
  return email === '' ? IS9WD_SETUP_SOURCE_ : email;
}

// ============================================================================
//  THE CAROUSEL SWITCH  (build-out only, 4.8 as ruled on 2026-09-28)
// ============================================================================

// Ethan ruled on 2026-09-28 that all fourteen officers get a slide, one slide each,
// fifteen slots to a slide, and that the carousel runs in hierarchy order so he leads on
// slide 2. Three settings and two columns have to move together, and the ORDER MATTERS in
// a way no instruction list survives:
//
//   · Tick the fourteen checkboxes while the page cap is still 2 and the master page count
//     passes through 20, 22, 24, 26 and 28, so the Plan check blocks the build the whole
//     way and the workbook looks broken when it is only half configured.
//   · Carousel order is owner ONCE, so no build renumbers a filled cell. The nine
//     committees hold 1 to 9 and the five offices would be seeded 1 to 5 underneath them.
//     That is nine duplicated slide numbers, which is worse than an error because two
//     officers would quietly export to one page.
//
// So this exists instead of seven hand steps in a fixed order. It moves everything inside
// one locked execution, records every before and after value in the log, and then builds.
// It refuses if the roster's keys no longer match the defaults, because renumbering a
// roster somebody has reordered would hand an officer another officer's slide.
//
// It is build-out only. Once the Canva master exists, renumbering a slide sends two
// officers to one page, so a second run demands a second confirmation naming the date of
// the first.
var IS9WD_CAROUSEL_ACTION_ = 'Switch the carousel';

function IS9WD_carouselSwitchAll_() {
  if (LockService.getDocumentLock().hasLock()) return IS9WD_carouselSwitchLocked_();
  return IS9WD_withLock_(function () { return IS9WD_carouselSwitchLocked_(); });
}

function IS9WD_carouselSwitchLocked_() {
  var lines = [];
  var say = function (line) { lines.push(line); Logger.log(line); };

  var cfgSheet = IS9WD_setupSheet_('CONFIG');
  var engSheet = IS9WD_setupSheet_('ENGINE');
  var d = IS9WD_CFG.DIRECTORY;
  var e = IS9WD_ENG.DIRECTORY;
  var count = d.lastRow - d.firstRow + 1;
  var want = IS9WD_DEFAULTS.DIRECTORY;
  if (want.length !== count) {
    throw new Error('The directory defaults hold ' + want.length + ' rows and the tab ' +
      'holds ' + count + '. Run Build or repair workbook first.');
  }

  // The roster has to be the roster this renumbering was computed for. A reordered or
  // retyped Key column means the ordinals in the defaults belong to different people.
  var keys = cfgSheet.getRange(d.firstRow, 1, count, 1).getValues();
  var wrong = [];
  for (var k = 0; k < count; k++) {
    var mine = IS9WD_trim_(keys[k][0]).toUpperCase();
    if (mine !== IS9WD_trim_(want[k][0]).toUpperCase()) {
      wrong.push('row ' + (d.firstRow + k) + ' reads ' + (mine === '' ? 'blank' : mine) +
        ' and should read ' + want[k][0]);
    }
  }
  if (wrong.length) {
    throw new Error('The roster keys do not match the defaults, so nothing was changed: ' +
      wrong.join('; ') + '.');
  }

  // Two settings first, so the page count never passes through a blocked value.
  var changedSettings = IS9WD_carouselSettings_(say);

  // On the carousel, and the slide numbers, written together.
  var pubRange = cfgSheet.getRange(d.firstRow, 6, count, 1);
  var ordRange = engSheet.getRange(e.firstRow, 2, count, 1);
  var pubNow = pubRange.getValues();
  var ordNow = ordRange.getValues();
  var pubOut = [];
  var ordOut = [];
  var pubTouched = false;
  var ordTouched = false;
  for (var r = 0; r < count; r++) {
    var wantPub = want[r][4] === true;
    var wantOrd = IS9WD_int_(want[r][1]);
    var hadPub = IS9WD_bool_(pubNow[r][0]);
    var hadOrd = IS9WD_int_(ordNow[r][0]);
    pubOut.push([wantPub]);
    ordOut.push([wantOrd === null ? '' : wantOrd]);
    if (hadPub !== wantPub) {
      pubTouched = true;
      say(want[r][0] + ' on the carousel: ' + (hadPub ? 'yes' : 'no') + ' becomes ' +
        (wantPub ? 'yes' : 'no'));
    }
    if (hadOrd !== wantOrd) {
      ordTouched = true;
      say(want[r][0] + ' slide number: ' + (hadOrd === null ? 'blank' : hadOrd) +
        ' becomes ' + (wantOrd === null ? 'blank' : wantOrd) + ', so ' + want[r][2] +
        ' is on Canva page ' + IS9WD_two_(IS9WD_masterPage(wantOrd, 1, 1)));
    }
  }
  if (pubTouched) pubRange.setValues(pubOut);
  if (ordTouched) ordRange.setValues(ordOut);
  if (!pubTouched && !ordTouched && !changedSettings) {
    say('nothing to change: the carousel already holds all fourteen in this order');
  }

  // Every block on the feed below the officer table moves when the publish count and the
  // page cap change, so the build is part of the switch rather than a thing to remember.
  SpreadsheetApp.flush();
  IS9WD_configReset_();
  var report = IS9WD_buildOrRepairLocked_();
  report.lines = lines.concat(report.lines);
  report.carouselSwitched = true;

  var store = PropertiesService.getDocumentProperties();
  store.setProperty(IS9WD_PROP.CAROUSEL_SWITCHED,
    IS9WD_dateKey_(IS9WD_todayManila_()));
  IS9WD_setupAppendLog_(IS9WD_setupSheet_('LOG'), lines, true,
    IS9WD_CAROUSEL_ACTION_);
  return report;
}

// The two capacity settings, read from the block descriptors rather than typed here, so
// the shipping numbers live in exactly one place (section 10).
function IS9WD_carouselSettings_(say) {
  var touched = false;
  var names = ['IS9WD_SLOTS_PER_PAGE', 'IS9WD_MAX_PARTS'];
  for (var i = 0; i < names.length; i++) {
    var wantValue = IS9WD_settingDefault_(names[i]);
    if (wantValue === null) continue;
    var range = IS9WD_namedOrNull_(names[i]);
    if (!range) {
      throw new Error('The named range ' + names[i] + ' is missing, so nothing was ' +
        'changed. Run Build or repair workbook first.');
    }
    var had = range.getValue();
    if (IS9WD_int_(had) === IS9WD_int_(wantValue)) continue;
    range.setValue(wantValue);
    touched = true;
    say(names[i] + ': ' + (IS9WD_blank_(had) ? 'blank' : had) + ' becomes ' + wantValue);
  }
  return touched;
}

// The shipping value of any settings row, found by its named range rather than by its
// address, so a block that moves takes its default with it.
function IS9WD_settingDefault_(name) {
  var want = IS9WD_trim_(name);
  for (var t = 0; t < IS9WD_SETTINGS_TABS.length; t++) {
    var holder = IS9WD_SETTINGS_TABS[t].holder;
    for (var b = 0; b < holder.BLOCKS.length; b++) {
      var block = holder[holder.BLOCKS[b]];
      if (!block.rows) continue;
      for (var r = 0; r < block.rows.length; r++) {
        if (IS9WD_trim_(block.rows[r].name) !== want) continue;
        var v = block.rows[r].value;
        return v === undefined ? null : v;
      }
    }
  }
  return null;
}

// The date the switch last ran, or an empty string. The menu reads it so a second run
// has to be confirmed against the first, because renumbering a slide once the Canva
// master exists sends two officers to one page.
function IS9WD_carouselSwitchedOn_() {
  return IS9WD_trim_(
    PropertiesService.getDocumentProperties().getProperty(IS9WD_PROP.CAROUSEL_SWITCHED));
}
