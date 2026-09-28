/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · 02 | DELIVERABLES
 *  IS9WD_Items.js, the one data tab: its rules, its readers and its fixture
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 5 (the tab), 5.1 (columns), 5.2 (IDs),
 *          5.3 (Check), 5.4 (rank, part, slot, master page), 13.2 (the fixture).
 *
 *  Four things live here and nowhere else.
 *
 *  1. THE TAB. IS9WD_itemsBuild_() paints it, sizes it, validates it and writes
 *     the eight derived formula columns J to Q over all 2,000 rows. It is
 *     idempotent by construction: every write replaces a whole block rather than
 *     adding to one, so a second run leaves the same workbook.
 *
 *  2. THE DERIVED COLUMNS. Check, Active, Publish key, Rank, Part, Slot on page,
 *     Master page and Slot key are sheet formulas, not code output, because the
 *     tab has to stay hand usable when the app is down and because the feed reads
 *     them live. The column letters come from IS9WD_ITEMS.columns rather than
 *     being typed, so a column that moves takes its formulas with it.
 *
 *  3. THE READERS. IS9WD_readItems_() turns the tab into objects shaped the way
 *     IS9WD_Core.js expects them, so the feed, the emails and the endpoint all
 *     read one shape and no module parses a row twice.
 *
 *  4. THE FIXTURE. 13.2's sample data, seeded and cleared. Seeding appends and
 *     never overwrites. Clearing removes only what it recorded, skips any row
 *     whose content moved since, clears A to I rather than deleting a row, and
 *     puts the two overrides and the real term start back.
 *
 *  Rules this file is built to keep:
 *    · Every function ends in `_`: google.script.run exposes server globals.
 *    · Nothing keys on a status label. The seed asks Configuration for its
 *      default and terminal status rather than writing Open and Accomplished.
 *    · No cell address. Configuration is written through named ranges only.
 *    · The caller holds the document lock. IS9WD_withLock_ is not taken here,
 *      because a menu handler already holds it and the lock is not reentrant.
 *    · No name and no address is in this file. The fixture committees are looked
 *      up in the live directory and the sign-off names are obvious placeholders.
 *    · Nothing here runs at load time except plain object literals, for the same
 *      load order reason IS9WD_Config.js states: Core is not loaded yet.
 * =============================================================================
 */

// ============================================================================
//  COLUMN LOOKUP  (5.1's letters, derived rather than typed)
// ============================================================================

// A formula that names column D is a formula that breaks silently when Deadline
// moves. Asking for the header instead means the break is a thrown sentence.
function IS9WD_itemColIndex_(header) {
  var want = IS9WD_trim_(header);
  for (var i = 0; i < IS9WD_ITEMS.columns.length; i++) {
    if (IS9WD_ITEMS.columns[i].header === want) return IS9WD_ITEMS.firstCol + i;
  }
  throw new Error('The ' + IS9WD_TAB.ITEMS + ' column "' + want +
    '" is not in the layout. IS9WD_ITEMS.columns and IS9WD_Items.js disagree.');
}

function IS9WD_itemColLetter_(header) {
  return IS9WD_colLetter_(IS9WD_itemColIndex_(header));
}

// An absolute whole column span over the data rows, for the Rank formula's
// SUMPRODUCT. Absolute because every row of the column compares every other one.
function IS9WD_itemSpan_(header) {
  var c = IS9WD_itemColLetter_(header);
  return '$' + c + '$' + IS9WD_ITEMS.firstRow + ':$' + c + '$' + IS9WD_ITEMS.lastRow;
}

// ============================================================================
//  THE DERIVED COLUMNS  (5.1, 5.3 and 5.4, verbatim except for the letters)
// ============================================================================

var IS9WD_ITEM_FORMULA_CACHE_ = null;

// One template per derived column, in column order, each carrying {row}. A
// function rather than a constant for the load order reason in IS9WD_Config.js:
// IS9WD_colLetter_ calls Core, and Core is not loaded when this file is.
//
// The 40 and the 30 are written as literals because 5.3 writes them as literals
// and the string is quoted in the reference. They are the third copy of the two
// numbers: IS9WD_MAX_TITLE_ and IS9WD_MAX_REMARK_ in IS9WD_Core.js are the first,
// and the LEN validations in IS9WD_ITEMS.columns are the second. All three have to
// move together, which is worth a self test assertion.
function IS9WD_itemFormulas_() {
  if (IS9WD_ITEM_FORMULA_CACHE_) return IS9WD_ITEM_FORMULA_CACHE_;

  var cId = IS9WD_itemColLetter_('ID');
  var cCom = IS9WD_itemColLetter_('Committee');
  var cTitle = IS9WD_itemColLetter_('Title of Task');
  var cDue = IS9WD_itemColLetter_('Deadline');
  var cRem = IS9WD_itemColLetter_('Remark');
  var cStat = IS9WD_itemColLetter_('Status');
  var cAct = IS9WD_itemColLetter_('Active');
  var cKey = IS9WD_itemColLetter_('Publish key');
  var cRank = IS9WD_itemColLetter_('Rank');
  var cPart = IS9WD_itemColLetter_('Part');
  var cSlot = IS9WD_itemColLetter_('Slot on page');
  var cPage = IS9WD_itemColLetter_('Master page');

  var sId = IS9WD_itemSpan_('ID');
  var sCom = IS9WD_itemSpan_('Committee');
  var sTitle = IS9WD_itemSpan_('Title of Task');
  var sDue = IS9WD_itemSpan_('Deadline');
  var sAct = IS9WD_itemSpan_('Active');

  var r = '{row}';
  var used = 'COUNTA($' + cCom + r + ':$' + cStat + r + ')=0';

  var out = [
    {
      header: 'Check',
      // Precedence top to bottom, first match wins. It keys on the used cells and
      // not on the ID, or a hand typed row would take a rank and a Canva slot
      // while this cell stayed blank above it (5.3).
      formula: '=IF(' + used + ',"",' +
        'IF($' + cId + r + '="","Missing ID",' +
        'IF(COUNTIF(IS9WD_STATUS_LIST,$' + cStat + r + ')=0,"Missing status",' +
        'IF(COUNTIF(IS9WD_DIR_NAME,$' + cCom + r + ')=0,"Unknown committee",' +
        'IF($' + cTitle + r + '="","Missing title",' +
        'IF($' + cDue + r + '="","Missing deadline",' +
        'IF(OR(NOT(ISNUMBER($' + cDue + r + ')),$' + cDue + r + '<>INT($' + cDue + r + ')),"Deadline not a date",' +
        'IF(LEN($' + cTitle + r + ')>40,"Title too long",' +
        'IF(LEN($' + cRem + r + ')>30,"Remark too long",' +
        'IF(AND($' + cAct + r + '=TRUE,INT($' + cDue + r + ')<IS9WD_EFFECTIVE_TODAY),"Overdue","")' +
        // Nine, not ten: the line above already closed the tenth IF. 5.3 prints ten
        // because it prints the tenth IF's own closer with them.
        ')))))))))'
    },
    {
      header: 'Active',
      // The only thing anything keys on. IFERROR yields FALSE rather than an error
      // so a status that is not in the list reads inactive and Check says so.
      formula: '=IF(' + used + ',"",IFERROR(NOT(INDEX(IS9WD_STATUS_TERMINAL,' +
        'MATCH($' + cStat + r + ',IS9WD_STATUS_LIST,0))),FALSE))'
    },
    {
      header: 'Publish key',
      // Rank independent on purpose: this, and never Master page, is the publish
      // filter that Ready for Canva reads (5.1).
      formula: '=IF($' + cCom + r + '="","",IFERROR(IF(INDEX(IS9WD_DIR_PUBLISHES,' +
        'MATCH($' + cCom + r + ',IS9WD_DIR_NAME,0))=TRUE,TEXT(INDEX(IS9WD_DIR_CAROUSEL,' +
        'MATCH($' + cCom + r + ',IS9WD_DIR_NAME,0)),"00"),""),"!ERR"))'
    },
    {
      header: 'Rank',
      // Deadline ascending then ID ascending. The tie break is the ID and not the
      // row, because one sort of this tab would renumber every same deadline tie
      // and reorder a Canva page with no data change and no flag (5.4). The
      // leading guard is what keeps a 2,000 row SUMPRODUCT column affordable.
      formula: '=IF(OR($' + cAct + r + '<>TRUE,$' + cTitle + r + '=""),"",' +
        '1+SUMPRODUCT((' + sCom + '=$' + cCom + r + ')*(' + sAct + '=TRUE)*(' + sTitle + '<>"")*' +
        '((INT(N(' + sDue + '))<INT(N($' + cDue + r + ')))' +
        '+((INT(N(' + sDue + '))=INT(N($' + cDue + r + ')))*(' + sId + '<$' + cId + r + ')))))'
    },
    {
      header: 'Part',
      // ROUNDUP, so exactly ten items are one page. INT(n/10)+1 would be two and
      // would publish a blank continuation slide for every full committee (5.4).
      formula: '=IF($' + cRank + r + '="","",ROUNDUP($' + cRank + r + '/IS9WD_SLOTS_PER_PAGE,0))'
    },
    {
      header: 'Slot on page',
      formula: '=IF($' + cRank + r + '="","",TEXT(MOD($' + cRank + r + '-1,IS9WD_SLOTS_PER_PAGE)+1,"00"))'
    },
    {
      header: 'Master page',
      // Blank in exactly four cases: the committee does not publish, the committee
      // is unknown, the row has no rank, or the rank is past what any page holds.
      formula: '=IF(OR($' + cKey + r + '="",$' + cKey + r + '="!ERR",$' + cPart + r + '=""),"",' +
        'IF($' + cPart + r + '>IS9WD_MAX_PARTS,"",' +
        'TEXT(1+(VALUE($' + cKey + r + ')-1)*IS9WD_MAX_PARTS+$' + cPart + r + ',"00")))'
    },
    {
      header: 'Slot key',
      formula: '=IF(OR($' + cPage + r + '="",$' + cSlot + r + '=""),"",' +
        '$' + cPage + r + '&"-"&$' + cSlot + r + ')'
    }
  ];

  // The eight templates and the eight derived columns have to be the same eight,
  // in the same order, or setFormulas writes Rank into Part.
  var first = IS9WD_ITEMS.derivedFirstCol;
  for (var i = 0; i < out.length; i++) {
    var expect = IS9WD_ITEMS.columns[first - IS9WD_ITEMS.firstCol + i];
    if (!expect || expect.header !== out[i].header) {
      throw new Error('The derived column block starts at ' +
        IS9WD_colLetter_(first) + ' and expects "' + out[i].header +
        '" at offset ' + i + '. IS9WD_ITEMS.columns says "' +
        (expect ? expect.header : 'nothing') + '".');
    }
  }
  if (out.length !== IS9WD_ITEMS.derivedLastCol - first + 1) {
    throw new Error('The derived block spans ' +
      (IS9WD_ITEMS.derivedLastCol - first + 1) + ' columns and there are ' +
      out.length + ' formulas for it.');
  }

  IS9WD_ITEM_FORMULA_CACHE_ = out;
  return out;
}

// Rewrites J to Q. Called over the whole block by Build or repair, which is also
// what backfills a row someone inserted by hand, and over one row by a create.
function IS9WD_itemsWriteDerived_(sheet, firstRow, numRows) {
  var sh = sheet || IS9WD_sheet_('ITEMS');
  var start = IS9WD_posInt_(firstRow) || IS9WD_ITEMS.firstRow;
  var rows = IS9WD_posInt_(numRows) || (IS9WD_ITEMS.lastRow - start + 1);
  if (start < IS9WD_ITEMS.firstRow || start + rows - 1 > IS9WD_ITEMS.lastRow) {
    throw new Error('Rows ' + start + ' to ' + (start + rows - 1) +
      ' are outside the data block ' + IS9WD_ITEMS.firstRow + ' to ' + IS9WD_ITEMS.lastRow + '.');
  }
  var templates = IS9WD_itemFormulas_();
  var out = [];
  for (var r = 0; r < rows; r++) {
    var row = String(start + r);
    var line = [];
    for (var c = 0; c < templates.length; c++) {
      line.push(templates[c].formula.replace(/\{row\}/g, row));
    }
    out.push(line);
  }
  sh.getRange(start, IS9WD_ITEMS.derivedFirstCol, rows, templates.length).setFormulas(out);
  return rows * templates.length;
}

// ============================================================================
//  THE TAB  (paint, size, validate, formula, flag)
// ============================================================================

// Columns the machine writes read quieter than the five Ethan types into, which is
// most of what makes 2,000 rows look composed rather than busy.
var IS9WD_ITEM_QUIET_COLS = ['ID', 'Status at', 'Status by', 'Created at', 'Check', 'Notified at'];

// Build or repair calls this. Configuration must already carry IS9WD_DIR_NAME and
// IS9WD_STATUS_LIST, because the two dropdowns point at them; a missing name throws
// the sentence from IS9WD_named_ rather than writing a validation at a dead range.
function IS9WD_itemsBuild_(cfg) {
  var c = cfg || IS9WD_readConfig_();
  var sheet = IS9WD_sheet_('ITEMS');
  var lastCol = IS9WD_ITEMS.lastCol;
  var rows = IS9WD_ITEMS.lastRow - IS9WD_ITEMS.firstRow + 1;

  IS9WD_ensureGrid_(sheet, IS9WD_ITEMS.lastRow, lastCol);
  sheet.setTabColor(IS9WD_TAB_COLOR.ITEMS);

  // Repair restores the intended visibility before hiding the derived block, so a
  // column hidden by accident comes back and the hide never accumulates.
  sheet.showColumns(IS9WD_ITEMS.firstCol, lastCol - IS9WD_ITEMS.firstCol + 1);
  // Widths come from IS9WD_WIDTH.ITEMS, sized to the widest real value per column.
  // This tab takes no narrow spacer column: 5.1 gives column A to the ID, so the left
  // margin here is the ID column reading quiet rather than an empty column.
  IS9WD_setWidths_(sheet, 'ITEMS');

  // Row 1 takes the section band fill and row 3 the column header fill, matching
  // every other tab. Reference 5.1 names the two fills the other way round for
  // this tab alone; IS9WD_Config.js already rules for the uniform reading and
  // flags the swap, and this comment is here so the swap is visible from both files.
  IS9WD_paintBanner_(sheet, IS9WD_ITEMS.BANNER_ROW, IS9WD_ITEMS.firstCol, lastCol,
    IS9WD_ITEMS.BANNER);
  IS9WD_paintHelp_(sheet, IS9WD_ITEMS.HELP_ROW, IS9WD_ITEMS.firstCol, lastCol,
    IS9WD_itemsHelpText_(c.switches.publishMax, c.switches.slotsPerPage, c.switches.maxParts));

  var labels = [];
  var hints = [];
  for (var h = 0; h < IS9WD_ITEMS.columns.length; h++) {
    labels.push(IS9WD_ITEMS.columns[h].header);
    hints.push(IS9WD_txt_(IS9WD_ITEMS.columns[h].hint));
  }
  IS9WD_paintHeader_(sheet, IS9WD_ITEMS.headerRow, IS9WD_ITEMS.firstCol, labels);

  // Row 4, the plain English hint row, one sentence per column directly above the column
  // it describes and inside the frozen pane. Ethan's instruction of 2026-09-27 was an
  // explanation per cell he types into; on a 2,000 row table this row plus the same
  // sentence as every one of that column's notes is what that means in practice.
  var hintRange = sheet.getRange(IS9WD_ITEMS.hintRow, IS9WD_ITEMS.firstCol, 1, labels.length);
  IS9WD_style_(hintRange, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.WRAP, format: IS9WD_FMT.TEXT
  });
  hintRange.setValues([hints]);
  sheet.setRowHeight(IS9WD_ITEMS.hintRow, IS9WD_ROW_H.HINT);

  var body = sheet.getRange(IS9WD_ITEMS.firstRow, IS9WD_ITEMS.firstCol, rows, lastCol);
  IS9WD_style_(body, { size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, align: IS9WD_ALIGN.LEFT });
  IS9WD_applyColumnStyles_(sheet, IS9WD_ITEMS.firstRow, rows, IS9WD_ITEMS.firstCol,
    IS9WD_ITEMS.columns);
  for (var q = 0; q < IS9WD_ITEM_QUIET_COLS.length; q++) {
    sheet.getRange(IS9WD_ITEMS.firstRow, IS9WD_itemColIndex_(IS9WD_ITEM_QUIET_COLS[q]), rows, 1)
      .setFontSize(IS9WD_SIZE.HINT).setFontColor(IS9WD_ROLE.HINT_FG);
  }
  IS9WD_setDataHeights_(sheet, IS9WD_ITEMS.firstRow, rows);

  // THE CREAM RULE, on the tab where it earns the most. Banding is gone from this tab:
  // cream now means "this is yours to type into", and a banded row would have put cream
  // under every second cell of the nine columns the machine owns. The five input columns
  // are cream and carry their hint as a note; everything else is the page background and
  // carries the sentence that says it is worked out by the sheet. Five columns of colour
  // against twelve of paper is the whole of what makes 2,000 rows legible at a glance.
  //
  // The note goes on the header cell and on the hint cell of each column rather than on
  // each of its 2,000 cells, and that is a deliberate departure from the per-cell rule on
  // the settings tabs: 17 columns times 2,000 rows is 34,000 notes, which is a minute of
  // every build and a heavier file for a sentence that is already on screen one row above
  // the column in #58756a. The settings tabs, where a cell is a setting rather than a
  // column, do carry a note per cell.
  IS9WD_clearBanding_(body);
  body.setBackground(IS9WD_ROLE.BODY_BG);
  for (var ic = 0; ic < IS9WD_ITEMS.columns.length; ic++) {
    var col = IS9WD_ITEMS.columns[ic];
    var at = IS9WD_ITEMS.firstCol + ic;
    var range = sheet.getRange(IS9WD_ITEMS.firstRow, at, rows, 1);
    var mine = col.owner === IS9WD_OWN.ETHAN;
    range.setBackground(mine ? IS9WD_INPUT_BG : IS9WD_ROLE.BODY_BG);
    var note = mine ? IS9WD_txt_(col.hint) : IS9WD_CFG_CALC_HINT;
    sheet.getRange(IS9WD_ITEMS.headerRow, at).setNote(note);
    sheet.getRange(IS9WD_ITEMS.hintRow, at).setNote(note);
  }

  IS9WD_applyValidations_(sheet, IS9WD_ITEMS.firstRow, rows, IS9WD_ITEMS.firstCol,
    IS9WD_ITEMS.columns);
  var written = IS9WD_itemsWriteDerived_(sheet, IS9WD_ITEMS.firstRow, rows);
  var rules = IS9WD_itemRules_(sheet);
  IS9WD_setRules_(sheet, rules);

  IS9WD_hideCols_(sheet, 'ITEMS');
  IS9WD_freezeTab_(sheet, 'ITEMS');

  return { tab: IS9WD_TAB.ITEMS, rows: rows, formulas: written, rules: rules.length };
}

// Three rules, replaced as a whole list so nothing stacks. Order is precedence:
// Sheets lets an earlier rule win a property a later rule also sets, and a row can
// be both blocked and superseded.
function IS9WD_itemRules_(sheet) {
  var sh = sheet || IS9WD_sheet_('ITEMS');
  var first = IS9WD_ITEMS.firstRow;
  var rows = IS9WD_ITEMS.lastRow - first + 1;
  var check = '$' + IS9WD_itemColLetter_('Check') + first;
  var active = '$' + IS9WD_itemColLetter_('Active') + first;

  var wholeRow = [sh.getRange(first, IS9WD_ITEMS.firstCol, rows, IS9WD_ITEMS.lastCol)];
  var dueAndCheck = [
    sh.getRange(first, IS9WD_itemColIndex_('Deadline'), rows, 1),
    sh.getRange(first, IS9WD_itemColIndex_('Check'), rows, 1)
  ];

  // The eight blocking flags come from Core's own list, so a ninth flag paints
  // itself the day it is added rather than the day someone remembers this file.
  var ors = [];
  for (var i = 0; i < IS9WD_BLOCKING_FLAGS_.length; i++) {
    ors.push(check + '="' + IS9WD_BLOCKING_FLAGS_[i] + '"');
  }

  return [
    // A blocking flag stops the carousel, so it shouts across the whole row. It takes
    // bold strong purple TEXT and no fill, which is a deliberate exception to the
    // workbook's usual flag treatment: on this tab #e9ebd4 already means "this cell is
    // yours to type into", and a flag that filled the row cream would say that about the
    // nine columns the machine owns. The bold purple carries the signal on its own.
    IS9WD_ruleFormula_(wholeRow, '=OR(' + ors.join(',') + ')',
      { fg: IS9WD_ROLE.FLAG_FG, bold: true }),
    // Overdue does not block, so it marks the two cells that say why and leaves the
    // banding alone.
    IS9WD_ruleFormula_(dueAndCheck, '=' + check + '="Overdue"',
      { fg: IS9WD_ROLE.ACCENT_FG, bold: true }),
    // An accomplished row is superseded, not wrong. The Active guard matters: an
    // empty cell compares equal to FALSE in Sheets, so `=K4=FALSE` alone would mute
    // every one of the 2,000 empty rows.
    IS9WD_ruleFormula_(wholeRow, '=AND(' + active + '<>"",' + active + '=FALSE)',
      { fg: IS9WD_ROLE.MUTED_FG, italic: true })
  ];
}

// ============================================================================
//  IDS  (5.2: sequential, never reused, a monotonic high-water mark)
// ============================================================================

function IS9WD_itemIdText_(n) {
  var num = IS9WD_posInt_(n);
  if (!num) throw new Error('An item ID number must be a positive whole number.');
  var s = String(num);
  while (s.length < IS9WD_ID_DIGITS) s = '0' + s;
  return IS9WD_ID_PREFIX + s;
}

// Null rather than 0 for anything that is not an ID, so a stray cell cannot raise
// the high-water mark and burn a block of IDs.
function IS9WD_itemIdNumber_(text) {
  var s = IS9WD_trim_(text).toUpperCase();
  if (s.indexOf(IS9WD_ID_PREFIX.toUpperCase()) !== 0) return null;
  var tail = s.substring(IS9WD_ID_PREFIX.length);
  if (!/^[0-9]+$/.test(tail)) return null;
  return IS9WD_posInt_(parseInt(tail, 10));
}

// Reserves a block of IDs in one property write, so seeding thirty rows costs one
// round trip and a failure part way through cannot hand the same ID out twice.
function IS9WD_reserveItemIds_(count) {
  var n = IS9WD_posInt_(count);
  if (!n) return [];
  var props = PropertiesService.getDocumentProperties();
  var next = IS9WD_posInt_(props.getProperty(IS9WD_PROP.NEXT_ID)) || 1;
  var out = [];
  for (var i = 0; i < n; i++) out.push(IS9WD_itemIdText_(next + i));
  props.setProperty(IS9WD_PROP.NEXT_ID, String(next + n));
  return out;
}

function IS9WD_nextItemId_() {
  return IS9WD_reserveItemIds_(1)[0];
}

// Build or repair may only raise the mark. Without the stored term, an item created
// and deleted before it was ever archived leaves no trace and its ID gets reissued,
// which puts two different items under one ID in the log and lets the Archive's
// dedupe drop a genuinely new row (5.2).
//
// Reference 5.2 writes the target as MAX(stored, highest in A, highest in Archive)
// plus one. Taken literally that skips an ID on every run, because `stored` is
// already the next number rather than the last one used. What is implemented is the
// invariant the same sentence states, never reissue and never lower, and the
// arithmetic discrepancy is raised as an erratum rather than coded around silently.
function IS9WD_itemsRaiseNextId_() {
  var props = PropertiesService.getDocumentProperties();
  var stored = IS9WD_posInt_(props.getProperty(IS9WD_PROP.NEXT_ID)) || 1;

  var highest = 0;
  var ids = IS9WD_sheet_('ITEMS')
    .getRange(IS9WD_ITEMS.firstRow, IS9WD_itemColIndex_('ID'),
      IS9WD_ITEMS.lastRow - IS9WD_ITEMS.firstRow + 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    var n = IS9WD_itemIdNumber_(ids[i][0]);
    if (n !== null && n > highest) highest = n;
  }

  // The Archive is the only record of an ID whose row has been cleared.
  var archive = IS9WD_sheetOrNull_('ARCHIVE');
  if (archive) {
    var last = archive.getLastRow();
    if (last >= IS9WD_ARCHIVE.firstRow) {
      var col = 0;
      for (var a = 0; a < IS9WD_ARCHIVE.columns.length; a++) {
        if (IS9WD_ARCHIVE.columns[a].header === 'ID') col = IS9WD_ARCHIVE.firstCol + a;
      }
      if (col) {
        var arch = archive.getRange(IS9WD_ARCHIVE.firstRow, col,
          last - IS9WD_ARCHIVE.firstRow + 1, 1).getValues();
        for (var b = 0; b < arch.length; b++) {
          var m = IS9WD_itemIdNumber_(arch[b][0]);
          if (m !== null && m > highest) highest = m;
        }
      }
    }
  }

  var next = Math.max(stored, highest + 1);
  if (next !== stored) props.setProperty(IS9WD_PROP.NEXT_ID, String(next));
  return { was: stored, now: next, highestSeen: highest, raised: next !== stored };
}

// ============================================================================
//  READING THE TAB  (one shape, the one IS9WD_Core.js takes)
// ============================================================================

function IS9WD_itemsSheet_() {
  return IS9WD_sheet_('ITEMS');
}

// Header to field name. One map, so the reader and every caller agree and no module
// spells slotOnPage two ways.
var IS9WD_ITEM_FIELD = {
  'ID': 'id',
  'Committee': 'committee',
  'Title of Task': 'title',
  'Deadline': 'deadline',
  'Remark': 'remark',
  'Status': 'status',
  'Status at': 'statusAt',
  'Status by': 'statusBy',
  'Created at': 'createdAt',
  'Check': 'check',
  'Active': 'active',
  'Publish key': 'publishKey',
  'Rank': 'rank',
  'Part': 'part',
  'Slot on page': 'slotOnPage',
  'Master page': 'masterPage',
  'Slot key': 'slotKey',
  'Notified at': 'notifiedAt'
};

// One item, indexed out of one block read. `published` and `blocking` are derived
// here rather than in five callers: published means a Canva page can hold it, which
// is Master page and never Publish key, and blocking means Ready for Canva is NO.
// The deadline keeps whatever the cell holds, a Date or the text a paste left, so
// Core's Deadline not a date flag has something to see.
function IS9WD_itemObject_(line, row) {
  var item = { row: row };
  for (var i = 0; i < IS9WD_ITEMS.columns.length; i++) {
    var field = IS9WD_ITEM_FIELD[IS9WD_ITEMS.columns[i].header];
    if (!field) {
      throw new Error('The ' + IS9WD_TAB.ITEMS + ' column "' + IS9WD_ITEMS.columns[i].header +
        '" has no field name in IS9WD_ITEM_FIELD.');
    }
    item[field] = line[i];
  }
  item.id = IS9WD_trim_(item.id);
  item.committee = IS9WD_txt_(item.committee);
  item.title = IS9WD_txt_(item.title);
  item.remark = IS9WD_txt_(item.remark);
  item.status = IS9WD_txt_(item.status);
  item.statusBy = IS9WD_txt_(item.statusBy);
  if (IS9WD_blank_(item.deadline) && !IS9WD_isDate_(item.deadline)) item.deadline = '';
  item.check = IS9WD_trim_(item.check);
  // Typed means a person filled one of the five cells that are theirs. A row with only the
  // app's own stamps left in it, half cleared by hand, is used but not typed, and no backfill
  // may give it an ID: that would resurrect a phantom item.
  item.typed = IS9WD_filled_(item.committee) || IS9WD_filled_(item.title) ||
    IS9WD_filled_(item.remark) || IS9WD_filled_(item.status) || IS9WD_filled_(item.deadline);
  item.active = item.active === true;
  item.publishKey = IS9WD_trim_(item.publishKey);
  item.rank = IS9WD_int_(item.rank);
  item.part = IS9WD_int_(item.part);
  item.slotOnPage = IS9WD_trim_(item.slotOnPage);
  item.masterPage = IS9WD_trim_(item.masterPage);
  item.slotKey = IS9WD_trim_(item.slotKey);
  item.published = item.masterPage !== '';
  item.blocking = IS9WD_isBlockingFlag_(item.check);
  return item;
}

// THE USED ROWS ARE REMEMBERED FOR TWENTY SECONDS. Reading all 2,000 rows by 17 columns cost
// about 1.2 seconds per request, and most requests are officers opening a list that has not
// changed since the last one. The used rows, and only those, are kept in the script cache
// with their row numbers, dates encoded. Every write the endpoint makes reads live and clears
// them, the ID sweep clears them, and every settings reset clears them, so a hand edit on the
// Sheet is the only change that can wait, and it waits at most twenty seconds.
//
// THE LIVE READ IS TWO CALLS, not one: the nine typed and stamped columns for every row, which
// is what decides whether a row is used, then A to Q for the span from the first used row to
// the last. Half the cells of the old single read on an empty sheet, and a fraction on one
// with a few dozen rows.
var IS9WD_ITEMS_KEY_ = 'IS9WD_ITEM_ROWS_v1';
var IS9WD_ITEMS_TTL_ = 600;
var IS9WD_ITEMS_LIVE_ = false;
var IS9WD_ITEMS_HIT_ = false;

// THE LAST USED ROW IS REMEMBERED TOO, for six hours, so the live read can cover the rows in
// use plus a slack of fifty instead of all two thousand. The slack is checked: if anything sits
// in it, somebody typed past the memory and the full scan runs instead. The edit hook lifts the
// memory when a person types below it; every script write drops it, so the next live read is
// a full scan that sets it again. A row can only be missed by a write that neither the hook
// nor the script saw, and the six hour expiry bounds even that.
var IS9WD_ITEMS_HINT_KEY_ = 'IS9WD_ITEM_LAST_ROW_v1';
var IS9WD_ITEMS_HINT_TTL_ = 21600;
var IS9WD_ITEMS_SLACK_ = 50;
var IS9WD_ITEMS_SCAN_ = '';

function IS9WD_itemsHint_() {
  try {
    return IS9WD_posInt_(CacheService.getScriptCache().get(IS9WD_ITEMS_HINT_KEY_));
  } catch (err) {
    return null;
  }
}

function IS9WD_itemsHintSet_(row) {
  try {
    CacheService.getScriptCache().put(IS9WD_ITEMS_HINT_KEY_, String(row), IS9WD_ITEMS_HINT_TTL_);
  } catch (err) {
    Logger.log('IS9WD: the last used row was not remembered: ' + err);
  }
}

// Lift, never lower: the hook sees one edit at a time and the rows below it are still there.
function IS9WD_itemsHintLift_(row) {
  var have = IS9WD_itemsHint_();
  var want = IS9WD_posInt_(row);
  if (want === null) return;
  if (have === null || want > have) IS9WD_itemsHintSet_(want);
}

function IS9WD_itemsLines_() {
  IS9WD_ITEMS_HIT_ = false;
  if (!IS9WD_ITEMS_LIVE_) {
    try {
      var held = CacheService.getScriptCache().get(IS9WD_ITEMS_KEY_);
      if (held) {
        var kept = IS9WD_unpackJson_(held);
        if (kept && typeof kept.length === 'number') {
          IS9WD_ITEMS_HIT_ = true;
          return kept;
        }
      }
    } catch (err) {
      // Read live below.
    }
  }
  var sheet = IS9WD_sheet_('ITEMS');
  var first = IS9WD_ITEMS.firstRow;
  var rows = IS9WD_ITEMS.lastRow - first + 1;
  var lastTyped = IS9WD_itemColIndex_('Created at') - IS9WD_ITEMS.firstCol;
  var out = [];
  var r;
  var c;

  // THE SMALL READ, when the last used row is remembered: one call over the rows in use plus
  // the slack, all seventeen columns, and the slack must be empty or the full scan runs.
  var hint = IS9WD_itemsHint_();
  if (hint !== null && hint >= first && hint + IS9WD_ITEMS_SLACK_ < IS9WD_ITEMS.lastRow) {
    var span = hint - first + 1 + IS9WD_ITEMS_SLACK_;
    var quick = sheet.getRange(first, IS9WD_ITEMS.firstCol, span, IS9WD_ITEMS.lastCol).getValues();
    var clean = true;
    for (r = span - IS9WD_ITEMS_SLACK_; r < span && clean; r++) {
      for (c = 0; c <= lastTyped; c++) {
        if (IS9WD_filled_(quick[r][c])) { clean = false; break; }
      }
    }
    if (clean) {
      for (r = 0; r < span; r++) {
        for (c = 0; c <= lastTyped; c++) {
          if (IS9WD_filled_(quick[r][c])) { out.push({ row: first + r, line: quick[r] }); break; }
        }
      }
      IS9WD_ITEMS_SCAN_ = 'small';
      if (out.length) IS9WD_itemsHintSet_(out[out.length - 1].row);
      return IS9WD_itemsRemember_(out);
    }
  }

  // THE FULL SCAN: the nine typed and stamped columns for every row, which is what decides
  // whether a row is used, then A to Q for the span from the first used row to the last.
  var head = sheet.getRange(first, IS9WD_ITEMS.firstCol, rows, lastTyped + 1).getValues();
  var used = [];
  for (r = 0; r < head.length; r++) {
    for (c = 0; c <= lastTyped; c++) {
      if (IS9WD_filled_(head[r][c])) { used.push(r); break; }
    }
  }
  if (used.length) {
    var lo = used[0];
    var hi = used[used.length - 1];
    var block = sheet.getRange(first + lo, IS9WD_ITEMS.firstCol, hi - lo + 1, IS9WD_ITEMS.lastCol)
      .getValues();
    for (var u = 0; u < used.length; u++) {
      out.push({ row: first + used[u], line: block[used[u] - lo] });
    }
  }
  IS9WD_ITEMS_SCAN_ = 'full';
  IS9WD_itemsHintSet_(out.length ? out[out.length - 1].row : first);
  return IS9WD_itemsRemember_(out);
}

function IS9WD_itemsRemember_(out) {
  if (!IS9WD_ITEMS_LIVE_) {
    try {
      var text = JSON.stringify(IS9WD_packDates_(out));
      if (text.length <= 90000) {
        CacheService.getScriptCache().put(IS9WD_ITEMS_KEY_, text, IS9WD_ITEMS_TTL_);
      }
    } catch (err) {
      Logger.log('IS9WD: the item rows were not remembered: ' + err);
    }
  }
  return out;
}

// keepHint is the edit hook's case: a person typed, the rows are stale, but the last used row
// only ever went up and the hook lifts it separately. A script write drops both, so the next
// live read is a full scan that sets the row again.
function IS9WD_itemsCacheReset_(keepHint) {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove(IS9WD_ITEMS_KEY_);
    if (keepHint !== true) cache.remove(IS9WD_ITEMS_HINT_KEY_);
  } catch (err) {
    Logger.log('IS9WD: the item rows were not cleared: ' + err);
  }
}

// Every used row as an object, plus the two row counts the Sunday brief prints.
// `usedRows` counts a row with anything at all in A to I, so a half cleared row is
// visible rather than silently invisible; `idRows` counts non blank IDs and is what
// the Diagnostics `Rows used of 2000` cell reports.
function IS9WD_readItems_(opt) {
  var o = opt || {};
  var first = IS9WD_ITEMS.firstRow;
  var rows = IS9WD_ITEMS.lastRow - first + 1;
  var entries = IS9WD_itemsLines_();

  var out = [];
  var byId = {};
  var byCommittee = {};
  var usedRows = 0;
  var idRows = 0;
  var lastUsedRow = 0;

  for (var r = 0; r < entries.length; r++) {
    var line = entries[r].line;
    usedRows++;
    lastUsedRow = entries[r].row;
    var item = IS9WD_itemObject_(line, entries[r].row);
    if (item.id !== '') idRows++;
    if (o.activeOnly === true && !item.active) continue;
    if (o.committee && IS9WD_trim_(o.committee).toLowerCase() !== item.committee.toLowerCase()) continue;
    out.push(item);
    if (item.id !== '') byId[item.id] = item;
    var key = item.committee.toLowerCase();
    if (!byCommittee[key]) byCommittee[key] = [];
    byCommittee[key].push(item);
  }

  return {
    rows: out, byId: byId, byCommittee: byCommittee,
    firstRow: first, lastRow: IS9WD_ITEMS.lastRow,
    usedRows: usedRows, idRows: idRows, lastUsedRow: lastUsedRow,
    capacity: rows, freeRows: rows - usedRows,
    nextFreeRow: lastUsedRow ? lastUsedRow + 1 : first
  };
}

function IS9WD_itemById_(items, id) {
  var want = IS9WD_trim_(id);
  if (want === '') return null;
  if (items && items.byId) return items.byId[want] || null;
  var list = IS9WD_itemList_(items);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === want) return list[i];
  }
  return null;
}

function IS9WD_itemList_(items) {
  if (!items) return [];
  if (items.rows && typeof items.rows.length === 'number') return items.rows;
  if (typeof items.length === 'number') return items;
  return [];
}

function IS9WD_itemsFor_(items, committee) {
  var want = IS9WD_trim_(committee).toLowerCase();
  var list = IS9WD_itemList_(items);
  var out = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].committee.toLowerCase() === want) out.push(list[i]);
  }
  return out;
}

// Active and titled, in the order every page and every email prints them. An
// untitled active row has no rank, so it can never take a slot (5.4).
function IS9WD_activeItemsFor_(items, committee) {
  var mine = IS9WD_itemsFor_(items, committee);
  var out = [];
  for (var i = 0; i < mine.length; i++) {
    if (mine[i].active === true && mine[i].title !== '') out.push(mine[i]);
  }
  return IS9WD_sortActive(out);
}

// Per committee counts, which is what the officer table, the brief and the app card
// all want: how many are active, how many a page can hold, how many it cannot.
function IS9WD_itemCounts_(items, cfg) {
  var c = cfg || IS9WD_readConfig_();
  var out = {};
  var dir = c.directory.rows;
  for (var i = 0; i < dir.length; i++) {
    var entry = dir[i];
    var mine = IS9WD_activeItemsFor_(items, entry.committee);
    var split = IS9WD_publishSplit(mine.length, c.switches.slotsPerPage, c.switches.maxParts);
    var flagged = 0;
    var all = IS9WD_itemsFor_(items, entry.committee);
    for (var j = 0; j < all.length; j++) {
      if (all[j].check !== '') flagged++;
    }
    out[entry.key] = {
      key: entry.key, committee: entry.committee, publishes: entry.publishes,
      active: mine.length, rows: all.length, flagged: flagged,
      parts: entry.publishes ? split.parts : 0,
      published: entry.publishes ? split.published : 0,
      notPublished: entry.publishes ? split.notPublished : 0
    };
  }
  return out;
}

/**
 * THE OFFICER HAS BEEN TOLD about these rows: one stamp per row in R, then the memory is
 * forgotten so the next read sees it. One row that fails to stamp does not cost the rest,
 * and a row told twice is the smaller wrong. Returns how many were stamped.
 */
function IS9WD_itemsStampNotified_(rowNumbers) {
  var list = rowNumbers && typeof rowNumbers.length === 'number' ? rowNumbers : [];
  if (!list.length) return 0;
  var sheet = IS9WD_sheet_('ITEMS');
  var col = IS9WD_itemColIndex_('Notified at');
  var now = IS9WD_nowManila_();
  var done = 0;
  for (var i = 0; i < list.length; i++) {
    var row = IS9WD_posInt_(list[i]);
    if (row === null || row < IS9WD_ITEMS.firstRow || row > IS9WD_ITEMS.lastRow) continue;
    try {
      sheet.getRange(row, col).setValue(now);
      done++;
    } catch (err) {
      Logger.log('IS9WD: row ' + row + ' was not stamped as notified: ' + err);
    }
  }
  if (done) IS9WD_itemsCacheReset_();
  return done;
}

// Every Notified at stamp on the rows in use, cleared in one call. Turning test mode off
// calls it, because the rehearsal's stamps say the officers were told when only Ethan was.
function IS9WD_itemsClearNotified_() {
  var items = IS9WD_readItems_();
  if (!items.lastUsedRow) return 0;
  var sheet = IS9WD_sheet_('ITEMS');
  var col = IS9WD_itemColIndex_('Notified at');
  var rows = items.lastUsedRow - IS9WD_ITEMS.firstRow + 1;
  sheet.getRange(IS9WD_ITEMS.firstRow, col, rows, 1).clearContent();
  IS9WD_itemsCacheReset_();
  return rows;
}

// Clears A to I and never deletes the row, because deleting one shrinks every named
// range that contains it and silently drops the bottom rows out of every COUNTIFS,
// MINIFS and MATCH the feed depends on (5.1). J to Q stay: they are formulas.
function IS9WD_itemsClearRow_(sheet, row) {
  // R is a stamp, not a formula, so it goes with the row: a new item typed into this row
  // later would otherwise read as already announced and never be sent.
  try {
    (sheet || IS9WD_sheet_('ITEMS')).getRange(row, IS9WD_itemColIndex_('Notified at')).clearContent();
  } catch (err) {
    Logger.log('IS9WD: the Notified at stamp was not cleared on row ' + row + ': ' + err);
  }
  var sh = sheet || IS9WD_sheet_('ITEMS');
  var cols = IS9WD_itemColIndex_('Created at') - IS9WD_ITEMS.firstCol + 1;
  sh.getRange(row, IS9WD_ITEMS.firstCol, 1, cols).clearContent();
}

// ============================================================================
//  BACKFILL  (reference 9: a hand typed row nobody could act on through the app)
// ============================================================================

// A row with content and no ID is a row the app can never reach, and a row with
// content and no status has no Active flag, so it appears nowhere. Build or repair
// gives both a value and the caller logs each one.
function IS9WD_itemsBackfill_(cfg) {
  var c = cfg || IS9WD_readConfig_();
  var fallback = IS9WD_trim_(c.statuses.defaultStatus);
  var sheet = IS9WD_sheet_('ITEMS');
  var first = IS9WD_ITEMS.firstRow;
  var rows = IS9WD_ITEMS.lastRow - first + 1;
  var colId = IS9WD_itemColIndex_('ID');
  var colStatus = IS9WD_itemColIndex_('Status');
  var fromCol = IS9WD_itemColIndex_('Committee');
  var values = sheet.getRange(first, IS9WD_ITEMS.firstCol, rows,
    IS9WD_itemColIndex_('Created at') - IS9WD_ITEMS.firstCol + 1).getValues();

  var need = [];
  for (var r = 0; r < values.length; r++) {
    var line = values[r];
    var used = false;
    for (var c2 = fromCol - IS9WD_ITEMS.firstCol; c2 <= colStatus - IS9WD_ITEMS.firstCol; c2++) {
      if (IS9WD_filled_(line[c2])) { used = true; break; }
    }
    if (!used) continue;
    var blankId = IS9WD_blank_(line[colId - IS9WD_ITEMS.firstCol]);
    var blankStatus = IS9WD_blank_(line[colStatus - IS9WD_ITEMS.firstCol]);
    if (blankId || blankStatus) need.push({ row: first + r, id: blankId, status: blankStatus });
  }
  if (!need.length) return [];

  // A blank status with no status list to fall back on is left alone rather than
  // given a label this project is not allowed to invent (2.5, status is a setting).
  var wantIds = 0;
  for (var n = 0; n < need.length; n++) if (need[n].id) wantIds++;
  var ids = IS9WD_reserveItemIds_(wantIds);
  var taken = 0;
  var done = [];
  for (var k = 0; k < need.length; k++) {
    var change = { row: need[k].row, id: '', status: '' };
    if (need[k].id) {
      change.id = ids[taken++];
      sheet.getRange(change.row, colId).setValue(change.id);
    }
    if (need[k].status && fallback !== '') {
      change.status = fallback;
      sheet.getRange(change.row, colStatus).setValue(fallback);
    }
    done.push(change);
  }
  // The rows changed under the remembered copy.
  if (done.length) IS9WD_itemsCacheReset_();
  return done;
}

// ============================================================================
//  THE FIXTURE  (reference 13.2, and nothing personal in any row of it)
// ============================================================================

// Statuses are carried as a terminal flag rather than a label, because nothing in
// this project keys on a label and renaming Accomplished must cost one Configuration
// edit and no code change. The seeder resolves the flag against the live status list.
//
// The committee strings are the nine committee and five office spellings from the
// directory defaults. The seed refuses rather than writing a row against a name the
// live directory does not hold, because an Unknown committee row would add a flag
// the fixture does not expect and every count in 13.3 would then be wrong.
var IS9WD_SEED = {
  TODAY_OVERRIDE: '2026-09-20',
  // A test value, not the live one. Every golden string in 13.3 is written for
  // WEEK 04 and SEP 21 TO 27, which needs a term starting 2026-08-31. Live, Term 1
  // starts 2026-09-07 and the same week is Week 03. Clear puts the real one back.
  TERM_START: '2026-08-31',
  SIGNOFF_WEEK: '2026-09-21',
  SIGNOFF: {
    preparedName: 'Sample Prepared By',
    preparedPosition: 'PRESIDENT',
    checkedName: 'Sample Checked By',
    checkedPosition: 'EXECUTIVE VICE PRESIDENT FOR OPERATIONS'
  },

  // { committee, title, deadline, remark, terminal, statusAt }
  // Exactly two of these flag: the overdue Publications row and the Documentation
  // row with no deadline. Both unpublished rows carry in week deadlines on purpose,
  // because an undated row would pick up Missing deadline and three checks in 13.3
  // count flags.
  BASE: [
    ['Partnerships', 'Confirm speaker for Debt Traps Exposed', '2026-09-21', 'Send final name to Publication', false, ''],
    ['Partnerships', 'Send Homecoming sponsorship deck', '2026-09-21', '', false, ''],
    ['Partnerships', 'Follow up on 4 pending sponsor replies', '2026-09-22', '', false, ''],
    ['Partnerships', 'Finalize partner LOI template', '2026-09-23', 'For EVP-EXT sign-off', false, ''],
    ['Partnerships', 'Draft MOA for Homecoming venue partner', '2026-09-24', 'Attach venue quotation', false, ''],
    ['Partnerships', 'Submit xDeals shortlist to Finance', '2026-09-25', '', false, ''],
    ['Partnerships', 'Prep speaker kit for Debt Traps Exposed', '2026-09-26', '', false, ''],
    ['Partnerships', 'Pitch Summit Diamond tier to 3 banks', '2026-09-30', 'Use the updated tier deck', false, ''],
    ['Partnerships', 'Renew MOAs with IS8 partners', '2026-10-01', '', false, ''],
    ['Partnerships', 'Update partner contact directory', '2026-10-02', '', false, ''],
    ['Publications', 'Post Week 03 deliverables carousel', '2026-09-18', '', false, ''],
    ['Publications', 'Release xDeals recap graphics', '2026-09-19', '', true, '2026-09-19 17:00'],
    ['Marketing and Advocacy', 'Draft ARW teaser captions', '2026-09-22', '', false, ''],
    ['Marketing and Advocacy', 'Schedule Financial Literacy posts', '2026-09-24', '', false, ''],
    ['Documentation', 'File Week 03 minutes and attendance', '', '', false, ''],
    ['President', 'Review EBEXECOM agenda for Week 04', '2026-09-23', '', false, ''],
    ['Executive Vice President for Operations', 'Consolidate operations week reports', '2026-09-25', '', false, '']
  ],

  // Thirteen more active Publications rows, taking that committee to 14 active
  // titled items: 2 parts, master pages 04 and 05 both used, an 11 slide carousel,
  // part 2 carrying 4 visible slots and 6 invisible, and both taglines at 14 TASKS.
  // Sep 21 appears twice on purpose, so the rank tie break by ID is exercised by the
  // fixture rather than only by the Node tests. It adds no flag.
  OVERFLOW: [
    ['Publications', 'Design Debt Traps Exposed pubmat', '2026-09-21', 'Use the IS9 palette', false, ''],
    ['Publications', 'Write Debt Traps Exposed captions', '2026-09-21', '', false, ''],
    ['Publications', 'Edit Homecoming teaser reel', '2026-09-22', '', false, ''],
    ['Publications', 'Layout Week 04 deliverables slides', '2026-09-23', '', false, ''],
    ['Publications', 'Draft Summit sponsor thank you post', '2026-09-24', '', false, ''],
    ['Publications', 'Shoot officer feature photos', '2026-09-25', 'Coordinate with Membership', false, ''],
    ['Publications', 'Finalize xDeals infographic series', '2026-09-26', '', false, ''],
    ['Publications', 'Update brand kit for A.Y. 2026', '2026-09-27', '', false, ''],
    ['Publications', 'Prepare Homecoming album cover', '2026-09-28', '', false, ''],
    ['Publications', 'Caption the Investment Primer set', '2026-09-29', '', false, ''],
    ['Publications', 'Render Summit countdown assets', '2026-09-30', '', false, ''],
    ['Publications', 'Archive Week 03 published files', '2026-10-01', '', false, ''],
    ['Publications', 'Draft Q2 publications style guide', '2026-10-02', '', false, '']
  ],

  BATCH_BASE: 'base',
  BATCH_OVERFLOW: 'overflow',
  // 5.1 says Status by holds the directory Full name, Admin, or Sheet when a formula
  // cannot tell. A seed is none of the three actors, so it takes the Sheet fallback.
  STATUS_BY: 'Sheet'
};

// ---- the record -----------------------------------------------------------

// Short keys, because a Document Property value is capped at 9 KB and the record
// holds one entry per seeded row. Thirty rows at the fields 13.2 names is about 5 KB,
// which fits; a fixture twice this size would not, and the seeder says so.
function IS9WD_seedRecord_() {
  var raw = PropertiesService.getDocumentProperties().getProperty(IS9WD_PROP.SEED_RECORD);
  if (IS9WD_blank_(raw)) return null;
  try {
    var rec = JSON.parse(raw);
    if (!rec || !rec.r || typeof rec.r.length !== 'number') return null;
    return rec;
  } catch (e) {
    // A record nobody can parse is a record that cannot be cleared safely, so it is
    // reported rather than guessed at or thrown away with the rows it names.
    throw new Error('The sample data record is unreadable, so Clear sample data ' +
      'cannot tell which rows it wrote. Clear those rows by hand, then use ' +
      'IS9 Deliverables > Sample data > Clear sample data again.');
  }
}

var IS9WD_SEED_RECORD_BUDGET = 8500;

// Checked before a single row is written, not after. A record that will not fit is a
// seed Clear sample data could never undo, and thirty orphan rows on the data tab is
// a worse outcome than refusing to seed at all.
function IS9WD_seedRecordFits_(rec) {
  var json = JSON.stringify(rec);
  if (json.length > IS9WD_SEED_RECORD_BUDGET) {
    throw new Error('The sample data record would be ' + json.length +
      ' characters and a Document Property holds about 9,000. Nothing was seeded. ' +
      'Seed fewer rows, or shorten the fixture.');
  }
  return json.length;
}

function IS9WD_writeSeedRecord_(rec) {
  var props = PropertiesService.getDocumentProperties();
  if (!rec) {
    props.deleteProperty(IS9WD_PROP.SEED_RECORD);
    return 0;
  }
  var size = IS9WD_seedRecordFits_(rec);
  props.setProperty(IS9WD_PROP.SEED_RECORD, JSON.stringify(rec));
  return size;
}

// ---- the fixture calendar -------------------------------------------------

// Set through named ranges, never by address, and every prior value is captured
// once, on the first seed, so a second seed cannot record the fixture as the thing
// to restore.
function IS9WD_seedCalendar_(rec) {
  var today = IS9WD_named_('IS9WD_TODAY_OVERRIDE');
  var weekNo = IS9WD_named_('IS9WD_WEEK_NUMBER_OVERRIDE');
  var starts = IS9WD_named_('IS9WD_TERM_STARTS');

  if (!rec.b) {
    rec.b = {
      t: IS9WD_formatDate(today.getValue()),
      w: IS9WD_blank_(weekNo.getValue()) ? '' : String(IS9WD_int_(weekNo.getValue())),
      s: IS9WD_formatDate(starts.getCell(1, 1).getValue())
    };
  }

  today.setValue(IS9WD_parseDate(IS9WD_SEED.TODAY_OVERRIDE));
  // A week number override would sit on top of the fixture's computed Week 04, so it
  // is cleared here and put back by Clear sample data.
  weekNo.clearContent();
  starts.getCell(1, 1).setValue(IS9WD_parseDate(IS9WD_SEED.TERM_START));
  IS9WD_configReset_();
  return rec.b;
}

function IS9WD_restoreCalendar_(rec) {
  var back = rec && rec.b ? rec.b : null;
  var today = IS9WD_named_('IS9WD_TODAY_OVERRIDE');
  var weekNo = IS9WD_named_('IS9WD_WEEK_NUMBER_OVERRIDE');
  var starts = IS9WD_named_('IS9WD_TERM_STARTS');

  // A leftover Today override is the one thing that silently freezes the whole
  // workbook on a past week, so it is cleared even when there is no record to
  // restore from (4.9, reference 9).
  var priorToday = back ? IS9WD_parseDate(back.t) : null;
  if (priorToday) today.setValue(priorToday); else today.clearContent();

  var priorWeek = back ? IS9WD_int_(back.w) : null;
  if (priorWeek !== null) weekNo.setValue(priorWeek); else weekNo.clearContent();

  var priorStart = back ? IS9WD_parseDate(back.s) : null;
  if (priorStart) starts.getCell(1, 1).setValue(priorStart);

  IS9WD_configReset_();
  return {
    todayOverride: priorToday ? IS9WD_formatDate(priorToday) : '',
    weekNumberOverride: priorWeek === null ? '' : priorWeek,
    termStart: priorStart ? IS9WD_formatDate(priorStart) : 'left as it was'
  };
}

// ---- the sign-off row -----------------------------------------------------

// Ready for Canva reads NO until the week's sign-off is set, so every feed check in
// 13.3 needs a row for the fixture week. An existing row for that week is Ethan's
// and is left alone, and then Clear has nothing of its own to remove.
function IS9WD_seedSignoff_(rec) {
  var store = IS9WD_named_('IS9WD_SIGNOFF');
  var values = store.getValues();
  var want = IS9WD_day_(IS9WD_SEED.SIGNOFF_WEEK);
  var free = -1;
  for (var i = 0; i < values.length; i++) {
    if (IS9WD_day_(values[i][0]) === want) return { row: store.getRow() + i, written: false };
    if (free < 0 && IS9WD_blank_(values[i][0])) free = i;
  }
  if (free < 0) {
    throw new Error('The weekly sign-off store is full, so the fixture week has ' +
      'nowhere to go. Run IS9 Deliverables > Build or repair workbook to extend it.');
  }
  var s = IS9WD_SEED.SIGNOFF;
  store.offset(free, 0, 1, 6).setValues([[
    IS9WD_parseDate(IS9WD_SEED.SIGNOFF_WEEK), s.preparedName, s.preparedPosition,
    s.checkedName, s.checkedPosition, IS9WD_nowManila_()
  ]]);
  rec.g = { row: store.getRow() + free, w: IS9WD_SEED.SIGNOFF_WEEK };
  IS9WD_configReset_();
  return { row: store.getRow() + free, written: true };
}

function IS9WD_clearSeedSignoff_(rec) {
  if (!rec || !rec.g) return { cleared: false, reason: 'the seed did not write one' };
  var store = IS9WD_named_('IS9WD_SIGNOFF');
  var offset = rec.g.row - store.getRow();
  if (offset < 0 || offset >= store.getNumRows()) {
    return { cleared: false, reason: 'the store has moved since it was seeded' };
  }
  var row = store.offset(offset, 0, 1, 6);
  var v = row.getValues()[0];
  var s = IS9WD_SEED.SIGNOFF;
  var same = IS9WD_day_(v[0]) === IS9WD_day_(rec.g.w) &&
    IS9WD_txt_(v[1]) === s.preparedName && IS9WD_txt_(v[2]) === s.preparedPosition &&
    IS9WD_txt_(v[3]) === s.checkedName && IS9WD_txt_(v[4]) === s.checkedPosition;
  if (!same) return { cleared: false, reason: 'somebody set real names on that week' };
  row.clearContent();
  IS9WD_configReset_();
  return { cleared: true, row: rec.g.row };
}

// ---- seed -----------------------------------------------------------------

// Appends after the last used row and never overwrites one, so a workbook holding
// real items keeps every one of them. It refuses a batch it has already seeded,
// because a second copy of the fixture makes every count in 13.3 wrong.
function IS9WD_seedSample_(overflow) {
  var cfg = IS9WD_readConfig_(true);
  var batch = overflow === true ? IS9WD_SEED.BATCH_OVERFLOW : IS9WD_SEED.BATCH_BASE;
  var fixture = overflow === true ? IS9WD_SEED.OVERFLOW : IS9WD_SEED.BASE;

  var rec = IS9WD_seedRecord_() || { v: 2, at: '', k: [], r: [] };
  for (var i = 0; i < rec.k.length; i++) {
    if (rec.k[i] === batch) {
      return {
        seeded: 0, batch: batch, refused: true,
        message: 'The ' + batch + ' sample data is already seeded. Clear sample data first.'
      };
    }
  }
  if (batch === IS9WD_SEED.BATCH_OVERFLOW && rec.k.length === 0) {
    return {
      seeded: 0, batch: batch, refused: true,
      message: 'Seed the sample data first: the overflow test adds to it rather than standing alone.'
    };
  }

  // Every fixture committee has to exist, or the rows carry Unknown committee and
  // the flag count that three checks in 13.3 assert is wrong from the first run.
  var missing = [];
  for (var f = 0; f < fixture.length; f++) {
    var name = fixture[f][0];
    if (!cfg.directory.byCommittee[name.toLowerCase()] && missing.indexOf(name) < 0) {
      missing.push(name);
    }
  }
  if (missing.length) {
    throw new Error('The people directory has no row for ' + missing.join(', ') +
      ', so the sample data cannot be seeded against it. Restore those spellings on ' +
      IS9WD_TAB.CONFIG + ', or seed nothing.');
  }

  var open = IS9WD_trim_(cfg.statuses.defaultStatus);
  var done = IS9WD_trim_(cfg.statuses.terminalStatus);
  if (open === '' || done === '') {
    throw new Error('The status list needs one non terminal and one terminal status ' +
      'before the sample data can be seeded. Check 00 | Configuration.');
  }

  var sheet = IS9WD_sheet_('ITEMS');
  var read = IS9WD_readItems_();
  var start = read.nextFreeRow;
  if (start + fixture.length - 1 > IS9WD_ITEMS.lastRow) {
    throw new Error('There are ' + (IS9WD_ITEMS.lastRow - start + 1) + ' free rows and ' +
      'the fixture needs ' + fixture.length + '. Retire accomplished items first.');
  }

  var ids = IS9WD_reserveItemIds_(fixture.length);
  var now = IS9WD_nowManila_();
  var block = [];
  for (var n = 0; n < fixture.length; n++) {
    var row = fixture[n];
    var terminal = row[4] === true;
    var status = terminal ? done : open;
    var deadline = IS9WD_blank_(row[2]) ? '' : IS9WD_parseDate(row[2]);
    var statusAt = IS9WD_blank_(row[5]) ? '' : IS9WD_parseStamp_(row[5]);
    block.push([ids[n], row[0], row[1], deadline, row[3], status,
      statusAt, terminal ? IS9WD_SEED.STATUS_BY : '', now]);
    rec.r.push({
      i: ids[n], w: start + n, c: row[0], t: row[1],
      d: IS9WD_blank_(row[2]) ? '' : row[2], m: row[3], s: status
    });
  }
  // Two small objects are still to be added to the record, so the budget is checked
  // with room for them and before anything reaches the sheet.
  IS9WD_seedRecordFits_(rec);

  sheet.getRange(start, IS9WD_ITEMS.firstCol, block.length, block[0].length).setValues(block);

  IS9WD_seedCalendar_(rec);
  var signoff = IS9WD_seedSignoff_(rec);
  rec.k.push(batch);
  rec.at = IS9WD_stampText_(now);
  IS9WD_writeSeedRecord_(rec);

  // The derived columns read the week cells the fixture just moved, so the flush is
  // what makes a check straight after a seed read the fixture week rather than today.
  SpreadsheetApp.flush();

  return {
    seeded: block.length, batch: batch, refused: false, firstRow: start,
    lastRow: start + block.length - 1, ids: ids, signoff: signoff,
    todayOverride: IS9WD_SEED.TODAY_OVERRIDE, termStart: IS9WD_SEED.TERM_START,
    message: 'Seeded ' + block.length + ' sample rows into ' + IS9WD_TAB.ITEMS +
      ', rows ' + start + ' to ' + (start + block.length - 1) + '.'
  };
}

// ---- clear ----------------------------------------------------------------

// Removes only rows whose ID is in the record and whose content still matches what
// was seeded. An edited sample row is a row somebody decided to keep, so it survives
// and is reported. Rows are cleared, never deleted (5.1).
function IS9WD_clearSample_() {
  var rec = IS9WD_seedRecord_();
  if (!rec) {
    // Still clears the overrides: a leftover Today override with no record is the
    // exact state a half finished fixture run leaves behind.
    var only = IS9WD_restoreCalendar_(null);
    SpreadsheetApp.flush();
    return {
      cleared: [], skipped: [], signoff: { cleared: false, reason: 'no record' },
      restored: only, message: 'There was no sample data record. Both overrides are cleared.'
    };
  }

  var sheet = IS9WD_sheet_('ITEMS');
  var lastTyped = IS9WD_itemColIndex_('Created at');
  var idx = {
    id: IS9WD_itemColIndex_('ID') - IS9WD_ITEMS.firstCol,
    committee: IS9WD_itemColIndex_('Committee') - IS9WD_ITEMS.firstCol,
    title: IS9WD_itemColIndex_('Title of Task') - IS9WD_ITEMS.firstCol,
    deadline: IS9WD_itemColIndex_('Deadline') - IS9WD_ITEMS.firstCol,
    remark: IS9WD_itemColIndex_('Remark') - IS9WD_ITEMS.firstCol,
    status: IS9WD_itemColIndex_('Status') - IS9WD_ITEMS.firstCol
  };
  var block = sheet.getRange(IS9WD_ITEMS.firstRow, IS9WD_ITEMS.firstCol,
    IS9WD_ITEMS.lastRow - IS9WD_ITEMS.firstRow + 1,
    lastTyped - IS9WD_ITEMS.firstCol + 1).getValues();

  var cleared = [];
  var skipped = [];
  for (var i = 0; i < rec.r.length; i++) {
    var want = rec.r[i];
    var offset = want.w - IS9WD_ITEMS.firstRow;
    if (offset < 0 || offset >= block.length) {
      skipped.push({ id: want.i, row: want.w, reason: 'that row is outside the data block now' });
      continue;
    }
    var line = block[offset];
    if (IS9WD_trim_(line[idx.id]) !== want.i) {
      skipped.push({ id: want.i, row: want.w, reason: 'a different ID sits on that row now' });
      continue;
    }
    var same = IS9WD_txt_(line[idx.committee]) === IS9WD_txt_(want.c) &&
      IS9WD_txt_(line[idx.title]) === IS9WD_txt_(want.t) &&
      IS9WD_txt_(line[idx.remark]) === IS9WD_txt_(want.m) &&
      IS9WD_txt_(line[idx.status]) === IS9WD_txt_(want.s) &&
      IS9WD_formatDate(line[idx.deadline]) === IS9WD_txt_(want.d);
    if (!same) {
      skipped.push({ id: want.i, row: want.w, reason: 'it was edited after it was seeded' });
      continue;
    }
    IS9WD_itemsClearRow_(sheet, want.w);
    cleared.push({ id: want.i, row: want.w });
  }

  var signoff = IS9WD_clearSeedSignoff_(rec);
  var restored = IS9WD_restoreCalendar_(rec);
  // The record goes only when nothing of it is left, or the next Clear would have no
  // way of knowing which edited row it was told to keep.
  if (skipped.length) {
    var keep = { v: rec.v, at: rec.at, k: rec.k, r: [], b: rec.b };
    for (var s = 0; s < skipped.length; s++) {
      for (var t = 0; t < rec.r.length; t++) {
        if (rec.r[t].i === skipped[s].id) keep.r.push(rec.r[t]);
      }
    }
    if (!signoff.cleared && rec.g) keep.g = rec.g;
    // The calendar is back, so nothing is left to restore on a later run.
    delete keep.b;
    IS9WD_writeSeedRecord_(keep);
  } else {
    IS9WD_writeSeedRecord_(null);
  }
  IS9WD_configReset_();
  SpreadsheetApp.flush();

  return {
    cleared: cleared, skipped: skipped, signoff: signoff, restored: restored,
    message: 'Cleared ' + cleared.length + ' sample rows and kept ' + skipped.length +
      '. Today override and week number override are back to what they were.'
  };
}
