/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · 01 | CANVA FEED
 *  IS9WD_Feed.js, the only module that writes a formula onto the feed tab
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 6.3 the physical layout, 6.4 every formula,
 *          6.5 the weekly run. SPEC.md section 4 is the string contract, and
 *          this file is where it is spelled: two spaces each side of every pipe,
 *          U+00B7 then two spaces before a remark, uppercase where the contract
 *          says uppercase, and `1 TASK` singular.
 *
 *  THE FEED IS FORMULAS AND NOTHING ELSE. This module never computes a string in
 *  JavaScript and writes it into a cell. A value written once is a value that is
 *  wrong the next morning, and the Sunday run reads this tab live through the
 *  Drive connector. The only literals written here are the machine keys, the page
 *  and slot numbers and the carousel ordinals, which are addresses rather than
 *  data and are what every formula on the tab joins on.
 *
 *  TWO ENTRY POINTS, ONE COPY OF EVERY FORMULA.
 *    IS9WD_feedWriteAll_(sheet, cfg, layout)  the seam IS9WD_Setup.js calls. Setup
 *      sizes and paints the tab, then hands it here for the values. This paints
 *      nothing and wipes nothing.
 *    IS9WD_feedResize_(cfg)  the sizing entry point, for rebuilding the feed alone
 *      after a capacity number changes. It owns the tab for the length of the call:
 *      trim, wipe, re-point the names, paint, then IS9WD_feedWriteAll_ for the
 *      values. Both paths end in the same writer, so they cannot disagree.
 *
 *  Rules this file keeps:
 *    · Every function ends in `_`: google.script.run exposes server globals.
 *    · Every row and column comes from IS9WD_feedLayout_, so nothing here knows
 *      that the last row happens to be 579 this term.
 *    · Idempotent. Every write replaces a whole range rather than appending to it,
 *      banding is removed before it is applied, and the conditional format list is
 *      handed back as a whole list for the caller to replace. Nothing on this tab
 *      is ever typed into, so nothing here can wipe an Ethan-entered item, a
 *      token, an archive row or a log row.
 *    · Together or not at all. Both entry points validate the three capacity
 *      numbers before touching one cell, and each block writer writes its own
 *      hidden helper band in the same call, so a block can never be resized while
 *      the helpers it reads still describe the old size.
 * =============================================================================
 */

// ============================================================================
//  THE CONTRACT'S OWN PUNCTUATION  (SPEC.md section 4, not ours to restyle)
// ============================================================================

// Two spaces, a pipe, two spaces. Declared once so no formula in this file can
// quietly ship one space and pass every test that does not compare bytes.
var IS9WD_FEED_PIPE_ = '  |  ';

// U+00B7 then two spaces, the remark prefix. Escaped rather than pasted, because
// a middle dot is one editor away from becoming a bullet or a hyphen.
var IS9WD_FEED_DOT_ = '·  ';

// The visible sentinel every fallback on this tab uses. Blanks are reserved for
// the four places blank is the contract (6.4), so a broken lookup never reads as
// a legitimately empty slot.
var IS9WD_FEED_ERR_ = '!ERR';

// The plain English sentence in E1 and in A1's note. Written for somebody who has never
// written a formula: what the tab is for, that it fills itself, and who reads it.
var IS9WD_FEED_PLAIN_ = 'What this tab is for: it is the words and the colours the ' +
  'carousel prints. It fills itself from the deliverables you enter and from ' +
  IS9WD_TAB.CONFIG + ', so there is nothing to type here and nothing to tidy up. Every ' +
  'Sunday Claude reads this one tab and updates the Canva design from it, which is why ' +
  'the wording here is exact and why this tab is never hidden.';

// One line per block, riding on the sentinel band beside the sentinel itself.
// Index for index with IS9WD_FEED_SENTINELS. Row 1 has no room for one: A1 to D1
// are the tab identity, the start sentinel, the feed-as-of line and the stamp.
var IS9WD_FEED_BLOCK_HELP_ = [
  '',
  'Read this block first every Sunday, and stop on any NO or any check that is not OK.',
  'Page 1 of the carousel: the week line, the three legends and this week\'s sign-off.',
  'One row per publishing committee, in carousel order, with the page it starts on.',
  'One row per physical master page. Only the Used rows are exported, in Position order.',
  'The headline, the VP line and the tagline for every master page, used or not.',
  'Ten slot rows per master page. Visible FALSE means hide the frame, never delete it.',
  'Every flagged row in the workbook, page then slot. Report these before touching Canva.',
  'A read that does not reach this row is a truncated read, and the weekly run stops.'
];

// ============================================================================
//  COLUMN STYLE, ONE ENTRY PER COLUMN OF EACH TABLE
// ============================================================================

// Index for index with IS9WD_FEED_HEADERS. Contract strings are text formatted and
// clipped: a wrapped tagline would grow its row and stop a 26 pixel table reading
// as a table. Counts are the only real numbers on the tab. `fg` tints a column that
// is machine plumbing (the keys, the two hex values, the item number) or one a human
// looks for first (a count, a slide position).
var IS9WD_FEED_COLS = {
  OFFICERS: [
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.ACCENT_FG, bold: true },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP }
  ],
  PLAN: [
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.ACCENT_FG, bold: true },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP }
  ],
  PAGES: [
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ],
  SLOTS: [
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG }
  ],
  FLAGS: [
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// Block A and Block B are label and value lists rather than tables: key in A,
// label in B, value in C (6.3). Their value column mixes counts and contract
// strings, so the format and the alignment are per row, in the specs below.
var IS9WD_FEED_KV_COLS_ = [
  { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
  { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
  { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true }
];

// ============================================================================
//  FORMULA STRING HELPERS  (pure text, no sheet access, no Apps Script call)
// ============================================================================

function IS9WD_feedQ_(s) {
  return '"' + String(s).replace(/"/g, '""') + '"';
}

// `$D25`, the shape every per-row formula in 6.4 uses: column locked, row free.
function IS9WD_feedRef_(col, row) {
  return '$' + IS9WD_colLetter_(col) + row;
}

// `$D$25:$D$33`, one column of a block, locked both ways.
function IS9WD_feedBand_(col, firstRow, lastRow) {
  var letter = IS9WD_colLetter_(col);
  return '$' + letter + '$' + firstRow + ':$' + letter + '$' + lastRow;
}

// `$A$1:$V$4`, a rectangle locked both ways.
function IS9WD_feedBox_(firstCol, firstRow, lastCol, lastRow) {
  return '$' + IS9WD_colLetter_(firstCol) + '$' + firstRow +
    ':$' + IS9WD_colLetter_(lastCol) + '$' + lastRow;
}

// SPEC section 4: `SEP 21 TO 27` inside one month, `SEP 30 TO OCT 4` across two.
// The comparison is on `yyyy-mm` and not on `mmm`, because a month-name test passes
// across a year boundary and renders `DEC 28 TO 3` (13.3).
function IS9WD_feedRangeTextFormula_(startExpr, endExpr) {
  return '=UPPER(TEXT(' + startExpr + ',"mmm")&" "&TEXT(' + startExpr + ',"d")&" TO "&' +
    'IF(TEXT(' + startExpr + ',"yyyy-mm")=TEXT(' + endExpr + ',"yyyy-mm"),' +
    'TEXT(' + endExpr + ',"d"),' +
    'TEXT(' + endExpr + ',"mmm")&" "&TEXT(' + endExpr + ',"d")))';
}

// `WEEK 04` or `WEEK --`. The placeholder holds the width out of term, where
// TEXT("","00") would collapse the line to `WEEK   |  ...` (A2 item 3).
var IS9WD_FEED_WEEKNO_EXPR_ =
  'IF(IS9WD_WEEK_NUMBER="","--",TEXT(IS9WD_WEEK_NUMBER,"00"))';

// The officer row's window, which differs from a slot's: an empty committee takes
// W3 and a committee whose deadlines are all blank takes W1 (6.4).
function IS9WD_feedOfficerWindowExpr_(countRef, dueRef) {
  return 'IF(' + countRef + '=0,"W3",IF(' + dueRef + '=0,"W1",' +
    'IF(INT(' + dueRef + ')<IS9WD_WEEK_START,"OVERDUE",' +
    'IF(INT(' + dueRef + ')<=IS9WD_WEEK_START+1,"W1",' +
    'IF(INT(' + dueRef + ')<=IS9WD_WEEK_END,"W2","W3")))))';
}

// Column 1 is the station hex, column 2 the number text hex, both from the
// Configuration table and never from a constant: one of them is #1C2120, which is
// Canva data and is painted nowhere in this workbook (2.5).
function IS9WD_feedHexFormula_(windowExpr, hexCol) {
  return '=IFERROR(INDEX(IS9WD_HEX,MATCH(' + windowExpr + ',IS9WD_WINDOW_NAMES,0),' +
    hexCol + '),' + IS9WD_feedQ_(IS9WD_FEED_ERR_) + ')';
}

// A slot row reads its own Window cell rather than recomputing the window, so the
// blank guard an unused slot needs sits here and not in the officer shape above.
function IS9WD_feedSlotHexFormula_(windowRef, hexCol) {
  return '=IF(' + windowRef + '="","",IFERROR(INDEX(IS9WD_HEX,' +
    'MATCH(' + windowRef + ',IS9WD_WINDOW_NAMES,0),' + hexCol + '),' +
    IS9WD_feedQ_(IS9WD_FEED_ERR_) + '))';
}

// `$B77&"-"&$C77`, byte identical to v1's slot key: two digits, a hyphen, two
// digits. Only the two cells it reads moved, because the machine key took column A.
function IS9WD_feedSlotKeyExpr_(pageRef, slotRef) {
  return pageRef + '&"-"&' + slotRef;
}

// A lookup off the data tab by slot key. Blank is the contract for an unused slot's
// title, deadline text and remark, so these are the tab's only blank fallbacks.
function IS9WD_feedSlotLookup_(name, keyExpr) {
  return '=IFERROR(INDEX(' + name + ',MATCH(' + keyExpr + ',IS9WD_DEL_SLOTKEY,0)),"")';
}

// The eight blocking flags as a vertical array literal, read from Core so the gate
// and the Check column can never disagree about what blocks (5.3).
function IS9WD_feedBlockingArray_() {
  var out = [];
  for (var i = 0; i < IS9WD_BLOCKING_FLAGS_.length; i++) {
    out.push(IS9WD_feedQ_(IS9WD_BLOCKING_FLAGS_[i]));
  }
  return '{' + out.join(';') + '}';
}

// Capacity check is the same condition as Configuration's own guard cell beside the
// derived publishable maximum, so it is taken from that cell's formula rather than
// retyped. Two copies of one condition are two strings that drift, and 13.3 compares
// the two cells word for word.
function IS9WD_feedCapacityFormula_() {
  var rows = IS9WD_ENG.CAPACITY.rows;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].name === 'IS9WD_PUBLISH_MAX' && rows[i].note) return rows[i].note;
  }
  throw new Error('The capacity guard formula is missing from IS9WD_ENG.CAPACITY. ' +
    'The feed cannot be built without it.');
}

// ============================================================================
//  BLOCK A AND BLOCK B, keyed on the machine key rather than on a row offset
// ============================================================================

// Keyed rather than ordered on purpose: if Block A's list in IS9WD_Config.js ever
// grows a row, this throws on the unknown key instead of writing eleven formulas
// one row out of place, which is a failure nothing on the tab would show.
function IS9WD_feedBlockASpec_(layout) {
  var f = layout;
  var scanOne = IS9WD_feedBox_(f.firstCol, f.identityRow, f.scanLastCol, f.scanFirstBlockLastRow);
  var scanTwo = IS9WD_feedBox_(f.firstCol, f.scanSecondBlockFirstRow, f.scanLastCol, f.scanLastRow);
  var err = IS9WD_feedQ_(IS9WD_FEED_ERR_);
  var officerCheck = IS9WD_feedBand_(f.helperFirstCol + 4, f.officerFirst, f.officerLast);
  var planCheck = IS9WD_feedBand_(f.helperFirstCol + 1, f.planFirst, f.planLast);
  var checkStack = '{' + officerCheck + ';' + planCheck + '}';

  var spec = {};

  spec['A.TOTAL'] = {
    formula: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>")',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // SUMPRODUCT and not COUNTIF: Check is a formula in all 2,000 rows returning "",
  // which is not an empty cell, so COUNTIF(range,"<>") would read 2000 forever.
  spec['A.FLAGGED'] = {
    formula: '=SUMPRODUCT(--(IS9WD_DEL_CHECK<>""))',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // Seven gates (6.4). The filter is IS9WD_DEL_PUBKEY and not IS9WD_DEL_PAGE, because
  // page is blank on any row with no rank: keying on page would have stopped catching
  // Missing title on a publishing committee, quietly, with YES printed above it. And
  // "?*" rather than "<>", because Publish key is also a formula returning "" in every
  // unused row. "?*" does match the !ERR an unknown committee leaves, which must block.
  spec['A.READY'] = {
    formula: '="Ready for Canva: "&IF(OR(' +
      'NOT(IS9WD_IN_TERM),' +
      'NOT(IS9WD_SIGNOFF_SET),' +
      'IS9WD_FEED_CAPCHECK<>"OK",' +
      'IS9WD_FEED_PLANCHECK<>"OK",' +
      'IS9WD_FEED_FLAGCHECK<>"OK",' +
      'IS9WD_FEED_ERRORS>0,' +
      'SUM(COUNTIFS(IS9WD_DEL_CHECK,' + IS9WD_feedBlockingArray_() +
      ',IS9WD_DEL_PUBKEY,"?*"))>0),"NO","YES")',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // Two rows are outside the scan, not one. Its own row, to stay out of its own
  // count, and the readiness row above it, because readiness now reads this cell and
  // a scan covering readiness would be circular and take the whole tab to #REF!.
  // What is given up is error detection on readiness itself, and the self test
  // covers that instead by asserting C5 begins with `Ready for Canva: ` (E10).
  spec['A.ERRORS'] = {
    formula: '=SUMPRODUCT(--ISERROR(' + scanOne + '))+SUMPRODUCT(--(' + scanOne + '=' + err + '))' +
      '+SUMPRODUCT(--ISERROR(' + scanTwo + '))+SUMPRODUCT(--(' + scanTwo + '=' + err + '))',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  spec['A.PAGES'] = {
    formula: '=COUNTIF(IS9WD_PLAN_USED,TRUE)',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // Plain ascending integers, because a leading zero in a page number is a page
  // number the export tool may reject.
  spec['A.EXPORT'] = {
    formula: '=TEXTJOIN(",",TRUE,ARRAYFORMULA(IF(IS9WD_PLAN_USED=TRUE,VALUE(IS9WD_PLAN_PAGE),"")))',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  spec['A.MASTER'] = {
    formula: '=1+COUNTIF(IS9WD_DIR_PUBLISHES,TRUE)*IS9WD_MAX_PARTS',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // A number and not a flag: an item that does not fit a slide is not a mistake (5.4).
  spec['A.NOTPUB'] = {
    formula: '=SUM(IS9WD_NOTPUB)',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  spec['A.CAPACITY'] = {
    formula: IS9WD_feedCapacityFormula_(),
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // The master-pages condition comes first, because a master design that has fallen
  // behind the plan is the one fault that cannot be seen anywhere else in the
  // workbook and it has to be caught here rather than in Canva (6.1 item 8).
  spec['A.PLAN'] = {
    formula: '=IF(IS9WD_FEED_MASTER>ROWS(IS9WD_PLAN_PAGE),' +
      '"Master pages required exceeds the plan block",' +
      'IFERROR(INDEX(FILTER(' + checkStack + ',' + checkStack + '<>"OK"),1,1),"OK"))',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // Block D is a budget rather than a bound: nothing caps the items Ethan enters, so
  // a flag list longer than the block is possible and the array formula would be
  // truncated with nothing to say so (E9).
  spec['A.FLAGCAP'] = {
    formula: '=IF(IS9WD_FEED_FLAGGED>ROWS(IS9WD_FLAGS),' +
      '"Flag list truncated by "&(IS9WD_FEED_FLAGGED-ROWS(IS9WD_FLAGS))&" rows","OK")',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  return spec;
}

// All eight are contract strings. The four sign-off cells resolve this week's row in
// the store, so they are unchanged from v1 while the values behind them change every
// week, and they print blank until the week's row exists, by which time readiness
// already reads NO (4.5).
function IS9WD_feedBlockBSpec_() {
  var spec = {};

  spec['B.WEEKLINE'] = {
    formula: '="WEEK "&' + IS9WD_FEED_WEEKNO_EXPR_ + '&' + IS9WD_feedQ_(IS9WD_FEED_PIPE_) +
      '&IS9WD_RANGE_WEEK&' + IS9WD_feedQ_(IS9WD_FEED_PIPE_) + '&IS9WD_AY_LABEL'
  };
  spec['B.LEGEND1'] = { formula: '="DUE "&IS9WD_RANGE_W1' };
  spec['B.LEGEND2'] = { formula: '="DUE "&IS9WD_RANGE_W2' };
  spec['B.LEGEND3'] = {
    formula: '="DUE AFTER "&UPPER(TEXT(IS9WD_WEEK_END,"mmm")&" "&TEXT(IS9WD_WEEK_END,"d"))'
  };

  // Name uppercased, position as typed. The asymmetry is v1's and is kept on purpose:
  // the committee pages uppercase both, the title page does not (6.4).
  spec['B.PREPNAME'] = { formula: '=UPPER(IS9WD_PREPARED_NAME)' };
  spec['B.PREPPOS'] = { formula: '=IS9WD_PREPARED_POSITION' };
  spec['B.CHKNAME'] = { formula: '=UPPER(IS9WD_CHECKED_NAME)' };
  spec['B.CHKPOS'] = { formula: '=IS9WD_CHECKED_POSITION' };

  return spec;
}

// ============================================================================
//  THE ENTRY POINT  (IS9WD_Setup.js calls this one function)
// ============================================================================

/**
 * Writes every formula, every machine key and every literal page, slot and carousel
 * ordinal on 01 | Canva Feed, or refuses and writes nothing. This is the seam
 * IS9WD_Setup.js calls after it has sized and painted the tab, so it paints nothing
 * and wipes nothing: it overwrites its own cells and no others.
 *
 * It does set the number format per column, which looks like styling and is not.
 * IS9WD_Setup.js sets none on this tab, and a page written as `02` into a General
 * cell becomes the number 2, after which every key built from it reads `C.P2.HEAD`
 * and every join against the plan compares a number with two digit text.
 *
 * Returns the report Setup logs, including `masterPagesRequired`, the one number
 * that can silently exceed what the Canva master actually holds.
 */
function IS9WD_feedWriteAll_(sheet, cfg, layout) {
  var conf = cfg || {};
  var f = layout || conf.feed || IS9WD_feed_();
  IS9WD_feedGuard_(conf, f);

  IS9WD_feedFormats_(sheet, f);
  IS9WD_feedIdentityRow_(sheet, f);
  IS9WD_feedWeekHelpers_(sheet, f);
  IS9WD_feedBlockAValues_(sheet, f);
  IS9WD_feedBlockBValues_(sheet, f);
  IS9WD_feedOfficers_(sheet, f);
  IS9WD_feedPlan_(sheet, f);
  IS9WD_feedPageHeaders_(sheet, f);
  IS9WD_feedSlots_(sheet, f);
  IS9WD_feedBlockD_(sheet, f);

  return {
    tab: IS9WD_TAB.FEED,
    masterPagesRequired: f.masterPagesRequired,
    publishingRows: f.publishingRows,
    slotsPerPage: f.slotsPerPage,
    maxParts: f.maxParts,
    publishMax: f.publishMax,
    officerRows: f.officerRows,
    planRows: f.planRows,
    pageRows: f.pageRows,
    slotRows: f.slotRows,
    flagRows: f.flagRows,
    scanLastCell: IS9WD_colLetter_(f.scanLastCol) + f.scanLastRow,
    lastRow: f.endRow,
    writtenAt: IS9WD_stampText_(new Date())
  };
}

/**
 * The sizing entry point: re-sizes the plan block, the page header table, the slot
 * table, Block D, the helper bands and the Feed errors scan together, or refuses and
 * changes nothing. They cannot disagree, because every one of them is arithmetic off
 * one layout object and none of them is computed twice.
 *
 * Use it when the feed alone has to be rebuilt, for instance after a capacity number
 * changed. It owns the whole tab for the length of the call: it trims the grid, wipes
 * it, re-points the feed's named ranges, repaints it and then writes it. A full
 * `Build or repair workbook` does not need it, because IS9WD_Setup.js sizes and
 * paints the tab itself and calls IS9WD_feedWriteAll_ for the values.
 *
 * The caller holds the document lock (section 9). Nothing here takes it, because
 * two writers over one tab is the failure the lock exists for and a nested lock
 * would hide it.
 */
function IS9WD_feedResize_(cfg) {
  var conf = cfg || IS9WD_readConfig_();
  var layout = conf.feed || IS9WD_feed_();
  IS9WD_feedGuard_(conf, layout);

  var sheet = IS9WD_sheet_('FEED');
  IS9WD_ensureGrid_(sheet, layout.endRow, layout.helperLastCol);
  IS9WD_feedTrim_(sheet, layout);
  IS9WD_feedWipe_(sheet, layout);

  // Names before formulas. A formula naming a range that does not exist yet reads
  // #NAME? until it does, and the helper bands move with the resize, so pointing
  // them first means the first recalculation after this run is already correct.
  var names = IS9WD_feedPointNames_(layout);

  IS9WD_feedPaintAll_(sheet, layout);
  var report = IS9WD_feedWriteAll_(sheet, conf, layout);
  report.namesPointed = names;
  report.repainted = true;
  return report;
}

// Nothing is written unless all of this holds. Resizing from numbers that disagree
// builds a feed nothing can publish from: ranks past the publishable maximum produce
// slot keys that match no page and no block, and not one cell says so (section 9).
function IS9WD_feedGuard_(conf, layout) {
  // A caller with no switches block is a caller that did not read Configuration, and
  // that refuses here rather than failing on a missing property three writes in.
  var s = conf.switches || {};
  if (s.capacityOk !== true) {
    throw new Error('The feed was not resized, because the capacity numbers disagree. ' +
      'Slots per Canva page times Maximum Canva pages per committee must equal ' +
      'Publishable items per committee in 00 | Configuration. Fix them, then run ' +
      'IS9 Deliverables > Build or repair workbook.');
  }
  if (layout.slotsPerPage < 1 || layout.maxParts < 1) {
    throw new Error('The feed was not resized, because Slots per Canva page and ' +
      'Maximum Canva pages per committee must both be at least 1.');
  }
  if (layout.publishingRows < 1) {
    throw new Error('The feed was not resized, because no directory row has Publishes ' +
      'ticked together with a carousel order. Set at least one in 00 | Configuration, ' +
      'then run IS9 Deliverables > Build or repair workbook.');
  }
}

// Re-pointed on their own names, which is the whole of idempotency for a named range.
function IS9WD_feedPointNames_(layout) {
  var sheet = IS9WD_sheet_('FEED');
  var want = IS9WD_feedNames_(layout);
  for (var i = 0; i < want.length; i++) {
    IS9WD_setNamed_(want[i].name, sheet.getRange(want[i].a1));
  }
  return want.length;
}

// The tab is script owned end to end and is never typed into, so a full wipe is the
// cheapest guarantee that nothing accumulates: a stale row from a wider layout, a
// note, a validation a paste left behind, a background nothing repaints.
function IS9WD_feedWipe_(sheet, layout) {
  var rows = Math.max(layout.endRow, sheet.getLastRow());
  var cols = Math.max(layout.helperLastCol, sheet.getLastColumn());
  var all = sheet.getRange(1, 1, rows, cols);
  all.clear();
  all.clearDataValidations();
  all.clearNote();
}

// Rows and columns past the layout are deleted rather than left blank. Four hundred
// empty rows cost the Drive connector read that the whole truncation risk turns on
// (M1), and no named range reaches past the end row.
function IS9WD_feedTrim_(sheet, layout) {
  var extraRows = sheet.getMaxRows() - layout.endRow;
  if (extraRows > 0) sheet.deleteRows(layout.endRow + 1, extraRows);
  var extraCols = sheet.getMaxColumns() - layout.helperLastCol;
  if (extraCols > 0) sheet.deleteColumns(layout.helperLastCol + 1, extraCols);
}

// ============================================================================
//  ROW 1: the tab's identity, the start sentinel, the as-of line and the stamp
// ============================================================================

// A1 carries the tab name as text because the Drive connector strips tab names, so
// the tab has to say what it is from cell content alone (6.5).
function IS9WD_feedIdentityRow_(sheet, layout) {
  var row = layout.identityRow;

  // Feed as of, which names the Today override when one is set. That override is the
  // one condition that can freeze this whole tab on a past week, so it is legible in
  // the same read that carries the strings (6.5).
  sheet.getRange(row, 3).setFormula(
    '="Feed as of "&TEXT(IS9WD_EFFECTIVE_TODAY,"ddd, mmm d")&' +
    'IF(IS9WD_TODAY_OVERRIDE<>"",' + IS9WD_feedQ_(IS9WD_FEED_PIPE_ + 'TODAY OVERRIDE SET') + ',"")');

  // The feed stamp. The sheet is live while the run is reading it: a tick changes a
  // Count, which changes Parts, which flips a Used flag and renumbers the export
  // list. So the stamp carries the week start, effective today and a digest of the
  // officer table's Count column, and the run aborts when a later read differs (6.5).
  // Described rather than given in 6.4, so the shape is ours: a join and not a sum,
  // because a join says which committee moved.
  var counts = IS9WD_feedBand_(4, layout.officerFirst, layout.officerLast);
  sheet.getRange(row, 4).setFormula(
    '="Week start "&TEXT(IS9WD_WEEK_START,"yyyy-mm-dd")&' +
    IS9WD_feedQ_(IS9WD_FEED_PIPE_) + '&"As of "&TEXT(IS9WD_EFFECTIVE_TODAY,"yyyy-mm-dd")&' +
    IS9WD_feedQ_(IS9WD_FEED_PIPE_) + '&"Counts "&IFERROR(TEXTJOIN("-",FALSE,' +
    'ARRAYFORMULA(TEXT(' + counts + ',"00"))),' + IS9WD_feedQ_(IS9WD_FEED_ERR_) + ')');

  // THE PLAIN ENGLISH EXPLANATION, Ethan's instruction of 2026-09-27: this tab has no
  // cells he fills, so it gets a short explanation at the top saying what it is for, that
  // it fills itself, and that it is what Claude reads every Sunday.
  //
  // It rides in E1 rather than in a row of its own, and that is not a cosmetic choice:
  // section 6.3 fixes every row number on this tab and the nine sentinels are how a
  // truncated connector read is detected, so there is no free row to take. E1 is inside
  // the banner's own filled span, it is read by the connector like any other cell, and it
  // moves nothing. The same sentence is the note on A1, which is what a person gets by
  // clicking the tab's own name.
  sheet.getRange(row, 5).setValue(IS9WD_FEED_PLAIN_);
  sheet.getRange(row, 1).setNote(IS9WD_FEED_PLAIN_);

  // The banner is painted across the row at 14 point bold. These three cells are this
  // module's own and are plumbing or a caption, so they are pulled back to hint size in
  // the band's help colour: a stamp set in the banner's type would swamp the tab's name
  // and overflow the row. It is the one paint this writer does, and it is deliberate.
  IS9WD_style_(sheet.getRange(row, 3, 1, 2), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.BAND_HELP_FG, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
  });
  IS9WD_style_(sheet.getRange(row, 5), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.BAND_HELP_FG, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
}

// ============================================================================
//  THE THREE WEEK RANGE HELPERS  (R1 to R3, hidden, named)
// ============================================================================

// The week line, both of the first two legends and all eighteen taglines read these
// three cells, so the range text is computed once on the tab. Building all three from
// one shape is the point: a legend that renders `SEP 30 TO 4` across a month boundary
// is a contract break that only appears in one week of the term.
function IS9WD_feedWeekHelpers_(sheet, layout) {
  var col = layout.helperFirstCol;
  var range = sheet.getRange(1, col, 3, 1);
  range.setNumberFormat(IS9WD_FMT.TEXT);
  range.setValues([
    [IS9WD_feedRangeTextFormula_('IS9WD_WEEK_START', 'IS9WD_WEEK_END')],
    [IS9WD_feedRangeTextFormula_('IS9WD_WEEK_START', 'IS9WD_WEEK_START+1')],
    [IS9WD_feedRangeTextFormula_('IS9WD_WEEK_START+2', 'IS9WD_WEEK_END')]
  ]);
}

// ============================================================================
//  THE NINE SENTINEL BANDS
// ============================================================================

// Eight of the nine, because the start sentinel shares row 1 with the tab identity.
// A sentinel row is also this tab's section title band: section 6.3 fixes every row
// number, so there is no free row for a band or for a blank spacer, and the sentinel
// rows do both jobs.
function IS9WD_feedSentinels_(sheet, layout) {
  for (var i = 1; i < IS9WD_FEED_SENTINELS.length; i++) {
    IS9WD_feedSentinel_(sheet, layout, layout.sentinelRows[i],
      IS9WD_FEED_SENTINELS[i], IS9WD_FEED_BLOCK_HELP_[i]);
  }
}

// Column B carries the sentinel byte for byte, because the weekly run tests for it
// and a truncated read is detected by its absence (6.5). It therefore cannot share a
// cell with the block's help line, which is why this does not use IS9WD_paintBand_:
// the help rides in column C instead, in the band's help colour rather than the
// workbook's hint colour, which would be unreadable on a #085040 band.
function IS9WD_feedSentinel_(sheet, layout, row, text, help) {
  var band = sheet.getRange(row, layout.firstCol, 1, layout.lastCol - layout.firstCol + 1);
  IS9WD_style_(band, {
    size: IS9WD_SIZE.BAND, fg: IS9WD_ROLE.BAND_FG, bold: true,
    align: IS9WD_ALIGN.LEFT, bg: IS9WD_ROLE.BAND_BG, wrap: IS9WD_WRAP.OVER,
    format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(row, IS9WD_ROW_H.BAND);
  sheet.getRange(row, 1, 1, 3).setValues([[IS9WD_FEED_KEY_SENTINEL, text, IS9WD_txt_(help)]]);
  IS9WD_style_(sheet.getRange(row, 1), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.BAND_HELP_FG, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
  });
  IS9WD_style_(sheet.getRange(row, 3), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.BAND_HELP_FG, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
}

// ============================================================================
//  BLOCK A, the readiness summary the Sunday run reads first
// ============================================================================

function IS9WD_feedBlockAValues_(sheet, layout) {
  IS9WD_feedKeyValues_(sheet, layout.blockAFirst,
    IS9WD_FEED_BLOCK_A, IS9WD_feedBlockASpec_(layout), 'Block A');
}

function IS9WD_feedBlockBValues_(sheet, layout) {
  IS9WD_feedKeyValues_(sheet, layout.blockBFirst,
    IS9WD_FEED_BLOCK_B, IS9WD_feedBlockBSpec_(), 'Block B');
}

// The value column only. The key in A and the label in B are the tab's furniture and
// belong to whoever paints it. Keyed on the machine key rather than ordered, so if
// Block A's list in IS9WD_Config.js grows a row this throws on the unknown key
// instead of writing eleven formulas one row out of place, which is a failure
// nothing on the tab would show.
function IS9WD_feedKeyValues_(sheet, firstRow, rows, spec, label) {
  var values = [];
  var formats = [];
  var aligns = [];
  for (var i = 0; i < rows.length; i++) {
    var key = rows[i][0];
    var entry = spec[key];
    if (!entry) {
      throw new Error(label + ' has no formula for the key ' + key +
        '. IS9WD_Feed.js and IS9WD_Config.js disagree about that block.');
    }
    values.push([entry.formula]);
    formats.push([entry.format || IS9WD_FMT.TEXT]);
    aligns.push([entry.align || IS9WD_ALIGN.LEFT]);
  }
  var value = sheet.getRange(firstRow, 3, rows.length, 1);
  value.setNumberFormats(formats);
  value.setHorizontalAlignments(aligns);
  value.setValues(values);
}

// The furniture: key in A, label in B, and the three column block styled and banded.
// Both blocks are three columns wide against the tab's thirteen, so the rest of each
// row stays paper: a ten column band of empty cells reads as a broken table.
function IS9WD_feedPaintKeyValue_(sheet, firstRow, rows) {
  var furniture = [];
  for (var i = 0; i < rows.length; i++) furniture.push([rows[i][0], rows[i][1]]);
  var block = sheet.getRange(firstRow, 1, rows.length, 3);
  IS9WD_style_(block, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
  IS9WD_applyColumnStyles_(sheet, firstRow, rows.length, 1, IS9WD_FEED_KV_COLS_);
  IS9WD_feedColumnTints_(sheet, firstRow, rows.length, 1, IS9WD_FEED_KV_COLS_);
  sheet.getRange(firstRow, 1, rows.length, 2).setValues(furniture);
  IS9WD_setDataHeights_(sheet, firstRow, rows.length);
  IS9WD_banding_(block);
}

// ============================================================================
//  THE OFFICER TABLE, nine rows in carousel order
// ============================================================================

// Every count on a row keys on the committee name and never on a page number,
// because a committee owns two pages and a count per page would be a count of half a
// committee (6.4). The carousel ordinal in the helper band is the join for every
// lookup here and on every plan row.
function IS9WD_feedOfficers_(sheet, layout) {
  var f = layout;
  var h = f.helperFirstCol;
  var err = IS9WD_feedQ_(IS9WD_FEED_ERR_);
  var body = [];
  var helper = [];

  for (var i = 0; i < f.officerRows; i++) {
    var row = f.officerFirst + i;
    var ordinal = IS9WD_feedRef_(h + 3, row);
    var name = IS9WD_feedRef_(h, row);
    var due = IS9WD_feedRef_(h + 1, row);
    var uncapped = IS9WD_feedRef_(h + 2, row);
    var count = IS9WD_feedRef_(4, row);
    var pages = IS9WD_feedRef_(8, row);
    var win = IS9WD_feedOfficerWindowExpr_(count, due);

    body.push([
      '="B.C"&TEXT(' + ordinal + ',"00")',
      '=TEXT(1+(' + ordinal + '-1)*IS9WD_MAX_PARTS+1,"00")',
      '=IF(' + name + '=' + err + ',' + err + ',UPPER(' + name + '))',
      '=MIN(IS9WD_PUBLISH_MAX,' + uncapped + ')',
      '=IF(' + count + '=0,"No deliverables this week",' +
        'IF(' + due + '=0,"Next due: date missing",' +
        'IF(INT(' + due + ')<IS9WD_WEEK_START,"Overdue: "&TEXT(' + due + ',"ddd, mmm d"),' +
        '"Next due "&TEXT(' + due + ',"ddd, mmm d"))))',
      IS9WD_feedHexFormula_(win, 1),
      IS9WD_feedHexFormula_(win, 2),
      // MAX(1,...) gives an empty committee one page rather than none, and ROUNDUP
      // gives a committee with exactly ten items one page rather than two (5.4).
      '=MAX(1,ROUNDUP(' + count + '/IS9WD_SLOTS_PER_PAGE,0))',
      '=MAX(0,' + uncapped + '-' + count + ')'
    ]);

    helper.push([
      '=IFERROR(INDEX(IS9WD_DIR_NAME,MATCH(' + ordinal + ',IS9WD_DIR_CAROUSEL,0)),' + err + ')',
      '=IFERROR(MINIFS(IS9WD_DEL_DEADLINE,IS9WD_DEL_COMMITTEE,' + name + ',' +
        'IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">0"),0)',
      '=COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>")',
      i + 1,
      '=IF(' + name + '=' + err + ',"No committee for carousel order "&' + ordinal + ',' +
        'IF(' + pages + '>IS9WD_MAX_PARTS,"Pages needed exceeds the maximum parts","OK"))'
    ]);
  }

  sheet.getRange(f.officerFirst, 1, f.officerRows, IS9WD_FEED_HEADERS.OFFICERS.length)
    .setValues(body);
  IS9WD_feedHelperBand_(sheet, f.officerFirst, f.officerRows, h, 5, helper,
    [IS9WD_FMT.TEXT, IS9WD_FMT.DATE_KEY, IS9WD_FMT.INT, IS9WD_FMT.INT, IS9WD_FMT.TEXT]);
}

// ============================================================================
//  THE PAGE PLAN, one row per physical master page, always present
// ============================================================================

// Station hex, number text hex and the tagline deliberately do not live here. The
// title page carries one station indicator per committee rather than per page, and
// two cells holding one contract string are two formulas that can disagree, which
// the weekly run would then have to choose between (6.4).
function IS9WD_feedPlan_(sheet, layout) {
  var f = layout;
  var h = f.helperFirstCol;
  var err = IS9WD_feedQ_(IS9WD_FEED_ERR_);
  var officerCommittee = IS9WD_feedBand_(3, f.officerFirst, f.officerLast);
  var officerCount = IS9WD_feedBand_(4, f.officerFirst, f.officerLast);
  var officerPages = IS9WD_feedBand_(8, f.officerFirst, f.officerLast);
  var body = [];
  var helper = [];

  for (var i = 0; i < f.planRows; i++) {
    var row = f.planFirst + i;
    var page = IS9WD_feedRef_(2, row);
    var ordinal = IS9WD_feedRef_(h, row);
    var used = IS9WD_feedRef_(3, row);
    var part = IS9WD_feedRef_(7, row);
    var parts = IS9WD_feedRef_(8, row);
    var committee = IS9WD_feedRef_(5, row);
    var count = IS9WD_feedRef_(12, row);
    var first = IS9WD_feedRef_(9, row);
    var last = IS9WD_feedRef_(10, row);
    var usedToHere = '$' + IS9WD_colLetter_(3) + '$' + f.planFirst + ':' +
      IS9WD_feedRef_(3, row);
    var blankIfTitle = 'IF(' + ordinal + '="","",';
    var blankIfUnused = 'IF(OR(NOT(' + used + '),' + ordinal + '=""),"",';

    body.push([
      '="PLAN.P"&' + page,
      // The page number is a literal, written by setup: the master design's pages are
      // physical and this is the arithmetic that must never move.
      IS9WD_two_(i + 1),
      '=IF(' + ordinal + '="",TRUE,AND(' + part + '<=' + parts + ',' +
        'OR(' + count + '>0,IS9WD_PUBLISH_EMPTY_PAGES)))',
      // A running count over the Used flags at and above this row, which is the slide
      // number the viewer will actually see.
      '=IF(NOT(' + used + '),"",TEXT(COUNTIF(' + usedToHere + ',TRUE),"00"))',
      '=' + blankIfTitle + 'IFERROR(INDEX(' + officerCommittee + ',' +
        'MATCH(' + ordinal + ',IS9WD_OFFICER_ORDINAL,0)),' + err + '))',
      '=' + blankIfTitle + 'IFERROR(UPPER(INDEX(IS9WD_DIR_VP,' +
        'MATCH(' + ordinal + ',IS9WD_DIR_CAROUSEL,0)))&' + IS9WD_feedQ_(IS9WD_FEED_PIPE_) +
        '&UPPER(INDEX(IS9WD_DIR_POSITION,MATCH(' + ordinal + ',IS9WD_DIR_CAROUSEL,0))),' + err + '))',
      '=' + blankIfTitle + 'VALUE(' + page + ')-1-(' + ordinal + '-1)*IS9WD_MAX_PARTS)',
      '=' + blankIfTitle + 'IFERROR(INDEX(' + officerPages + ',' +
        'MATCH(' + ordinal + ',IS9WD_OFFICER_ORDINAL,0)),' + err + '))',
      '=' + blankIfUnused + 'TEXT((' + part + '-1)*IS9WD_SLOTS_PER_PAGE+1,"00"))',
      '=' + blankIfUnused + 'TEXT(MIN(' + count + ',' + part + '*IS9WD_SLOTS_PER_PAGE),"00"))',
      '=' + blankIfUnused + 'MAX(0,VALUE(' + last + ')-VALUE(' + first + ')+1))',
      '=' + blankIfTitle + 'IFERROR(INDEX(' + officerCount + ',' +
        'MATCH(' + ordinal + ',IS9WD_OFFICER_ORDINAL,0)),' + err + '))'
    ]);

    helper.push([
      '=IF(VALUE(' + page + ')=1,"",ROUNDUP((VALUE(' + page + ')-1)/IS9WD_MAX_PARTS,0))',
      '=IF(' + ordinal + '="","OK",IF(' + committee + '=' + err + ',"No committee for this page",' +
        'IF(' + part + '>IS9WD_MAX_PARTS,"Part is past the maximum parts","OK")))'
    ]);
  }

  sheet.getRange(f.planFirst, 1, f.planRows, IS9WD_FEED_HEADERS.PLAN.length).setValues(body);
  IS9WD_feedHelperBand_(sheet, f.planFirst, f.planRows, h, 2, helper,
    [IS9WD_FMT.INT, IS9WD_FMT.TEXT]);
}

// ============================================================================
//  THE PAGE HEADER TABLE, one row per master page whether it is used or not
// ============================================================================

// The headline and the VP line are identical on both of a committee's pages, by
// Ethan's decision of 2026-09-27: the continuation page is the same committee, so it
// says so, and it carries no part marker anywhere.
function IS9WD_feedPageHeaders_(sheet, layout) {
  var f = layout;
  var h = f.helperFirstCol;
  var err = IS9WD_feedQ_(IS9WD_FEED_ERR_);
  var planCommittee = IS9WD_feedBand_(5, f.planFirst, f.planLast);
  var planVp = IS9WD_feedBand_(6, f.planFirst, f.planLast);
  var body = [];
  var helper = [];

  for (var i = 0; i < f.pageRows; i++) {
    var row = f.pageFirst + i;
    var page = IS9WD_feedRef_(2, row);
    var count = IS9WD_feedRef_(h, row);

    body.push([
      '="C.P"&' + page + '&".HEAD"',
      IS9WD_two_(i + 2),
      '=IFERROR(INDEX(' + planCommittee + ',MATCH(' + page + ',IS9WD_PLAN_PAGE,0)),' + err + ')',
      '=IFERROR(INDEX(' + planVp + ',MATCH(' + page + ',IS9WD_PLAN_PAGE,0)),' + err + ')',
      // The count is looked up from the plan by page, never taken from the cell
      // beside it: v1 read the officer table's D column, which held Next due text,
      // and the shipped string would have read `...  |  Next due Mon, Sep 28 TASKS`
      // (E11). It is the same number on both of a committee's pages (6.1 item 3).
      '="WEEKLY DELIVERABLES' + IS9WD_FEED_PIPE_ + 'WEEK "&' + IS9WD_FEED_WEEKNO_EXPR_ +
        '&' + IS9WD_feedQ_(IS9WD_FEED_PIPE_) + '&IS9WD_RANGE_WEEK&' +
        IS9WD_feedQ_(IS9WD_FEED_PIPE_) + '&' + count + '&" TASK"&IF(' + count + '=1,"","S")'
    ]);

    helper.push([
      '=IFERROR(INDEX(IS9WD_PLAN_COUNT,MATCH(' + page + ',IS9WD_PLAN_PAGE,0)),' + err + ')'
    ]);
  }

  sheet.getRange(f.pageFirst, 1, f.pageRows, IS9WD_FEED_HEADERS.PAGES.length).setValues(body);
  IS9WD_feedHelperBand_(sheet, f.pageFirst, f.pageRows, h, 1, helper, [IS9WD_FMT.INT]);
}

// ============================================================================
//  THE SLOT TABLE, ten rows per master page
// ============================================================================

// Every row is the identical formula keyed on its own Page and Slot cells, which is
// why the data tab computes a slot key at all. A titled active row with no usable
// deadline renders a blank Deadline text and Window W1, and sorts into slot 01 rather
// than last, so an item nobody can date is the first thing seen (6.4).
function IS9WD_feedSlots_(sheet, layout) {
  var f = layout;
  var h = f.helperFirstCol;
  var err = IS9WD_feedQ_(IS9WD_FEED_ERR_);
  var body = [];
  var helper = [];

  for (var i = 0; i < f.slotRows; i++) {
    var row = f.slotFirst + i;
    var pageIndex = Math.floor(i / f.slotsPerPage);
    var slotIndex = i - pageIndex * f.slotsPerPage;
    var page = IS9WD_feedRef_(2, row);
    var slot = IS9WD_feedRef_(3, row);
    var visible = IS9WD_feedRef_(4, row);
    var deadline = IS9WD_feedRef_(h, row);
    var remark = IS9WD_feedRef_(h + 1, row);
    var win = IS9WD_feedRef_(9, row);
    var key = IS9WD_feedSlotKeyExpr_(page, slot);

    body.push([
      '="C.P"&' + page + '&".S"&' + slot,
      IS9WD_two_(pageIndex + 2),
      IS9WD_two_(slotIndex + 1),
      '=NOT(ISNA(MATCH(' + key + ',IS9WD_DEL_SLOTKEY,0)))',
      IS9WD_feedSlotLookup_('IS9WD_DEL_TITLE', key),
      '=IF(' + deadline + '="","",IF(INT(' + deadline + ')<IS9WD_WEEK_START,' +
        '"Overdue: "&TEXT(' + deadline + ',"ddd, mmm d"),' +
        '"Due "&TEXT(' + deadline + ',"ddd, mmm d")))',
      '=AND(' + visible + ',' + remark + '<>"")',
      '=IF(' + remark + '="","",' + IS9WD_feedQ_(IS9WD_FEED_DOT_) + '&' + remark + ')',
      // W1 rather than blank when the deadline is unusable, because the contract
      // defines no blank window and the slot still needs a station colour to paint.
      '=IF(NOT(' + visible + '),"",IF(' + deadline + '="","W1",' +
        'IF(INT(' + deadline + ')<IS9WD_WEEK_START,"OVERDUE",' +
        'IF(INT(' + deadline + ')<=IS9WD_WEEK_START+1,"W1",' +
        'IF(INT(' + deadline + ')<=IS9WD_WEEK_END,"W2","W3")))))',
      IS9WD_feedSlotHexFormula_(win, 1),
      IS9WD_feedSlotHexFormula_(win, 2),
      IS9WD_feedSlotLookup_('IS9WD_DEL_CHECK', key),
      // The officer-relative item number. The run does not use it yet: overwriting a
      // master frame's printed number is a change to a printed page and waits on
      // Ethan (A2 item 12). It is also the cross check that a continuation page got
      // the right items, because page 2's first slot should read 11.
      '=IF(NOT(' + visible + '),"",IFERROR(TEXT(INDEX(IS9WD_DEL_RANK,' +
        'MATCH(' + key + ',IS9WD_DEL_SLOTKEY,0)),"00"),' + err + '))'
    ]);

    helper.push([
      IS9WD_feedSlotLookup_('IS9WD_DEL_DEADLINE', key),
      IS9WD_feedSlotLookup_('IS9WD_DEL_REMARK', key)
    ]);
  }

  sheet.getRange(f.slotFirst, 1, f.slotRows, IS9WD_FEED_HEADERS.SLOTS.length).setValues(body);
  IS9WD_feedHelperBand_(sheet, f.slotFirst, f.slotRows, h, 2, helper,
    [IS9WD_FMT.DATE_KEY, IS9WD_FMT.TEXT]);
}

// ============================================================================
//  BLOCK D, every flagged row in the workbook, from one array formula
// ============================================================================

// Three details carry this block. The computed key column is wrapped in ARRAYFORMULA
// because IF and & do not broadcast over a range inside an array literal, and without
// it the {} literal fails on a size mismatch and Block D goes permanently and silently
// blank, which is the worst possible failure for the one block whose job is to say
// there are flags. The wrapper is IFNA and not IFERROR, so the #N/A an empty FILTER
// returns is absorbed while a real #REF! still shows and Feed errors counts it. And
// Page is blank on any flagged row with no slot, so the appended ID and Title columns
// are what identify a Missing title row.
function IS9WD_feedBlockD_(sheet, layout) {
  var f = layout;
  var cols = IS9WD_FEED_HEADERS.FLAGS.length;

  // The spill area has to be empty or the array formula refuses to expand.
  sheet.getRange(f.flagFirst, 1, f.flagRows, cols).clearContent();

  sheet.getRange(f.flagFirst, 1).setFormula(
    '=IFNA(SORT(FILTER({ARRAYFORMULA(IF(IS9WD_DEL_ID="","","D."&IS9WD_DEL_ID)),' +
    'IS9WD_DEL_PAGE,IS9WD_DEL_COMMITTEE,IS9WD_DEL_SLOTONPAGE,' +
    'IS9WD_DEL_CHECK,IS9WD_DEL_ID,IS9WD_DEL_TITLE},' +
    'IS9WD_DEL_CHECK<>""),2,TRUE,4,TRUE),"")');
}

// ============================================================================
//  PAINTERS AND CHROME
// ============================================================================

// Every table's number format, set before one value is written, which is load bearing
// rather than tidy: a page written as "02" into a General cell becomes the number 2,
// every machine key built from it reads C.P2.HEAD, and every MATCH against the plan
// then compares a number with two digit text and finds nothing. It also gives the
// tab the real formats the design asks for: counts as integers, dates as dates, every
// contract string as text so nothing is re-interpreted on the way to Canva.
function IS9WD_feedFormats_(sheet, layout) {
  var f = layout;
  var tables = [
    [f.officerFirst, f.officerRows, IS9WD_FEED_COLS.OFFICERS],
    [f.planFirst, f.planRows, IS9WD_FEED_COLS.PLAN],
    [f.pageFirst, f.pageRows, IS9WD_FEED_COLS.PAGES],
    [f.slotFirst, f.slotRows, IS9WD_FEED_COLS.SLOTS],
    [f.flagFirst, f.flagRows, IS9WD_FEED_COLS.FLAGS]
  ];
  for (var t = 0; t < tables.length; t++) {
    var first = tables[t][0];
    var rows = tables[t][1];
    var cols = tables[t][2];
    if (rows < 1) continue;
    for (var i = 0; i < cols.length; i++) {
      sheet.getRange(first, 1 + i, rows, 1)
        .setNumberFormat(cols[i].format || IS9WD_FMT.TEXT);
    }
  }
  sheet.getRange(f.identityRow, 1, 1, 4).setNumberFormat(IS9WD_FMT.TEXT);
}

// A table's header row and body style. Used by the standalone resize; in a full
// Build or repair, IS9WD_Setup.js paints this tab and this is not called.
function IS9WD_feedTable_(sheet, headerRow, firstRow, numRows, headers, cols) {
  IS9WD_paintHeader_(sheet, headerRow, 1, IS9WD_feedHeaderLabels_(headers));
  if (numRows < 1) return;
  var body = sheet.getRange(firstRow, 1, numRows, headers.length);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
  IS9WD_applyColumnStyles_(sheet, firstRow, numRows, 1, cols);
  IS9WD_feedColumnTints_(sheet, firstRow, numRows, 1, cols);
  IS9WD_setDataHeights_(sheet, firstRow, numRows);
  IS9WD_banding_(body);
}

// Column A of a header row holds the machine key HEADER, not the word `Key`. Section
// 6.3 says both, once in its five header listings and once in its key vocabulary, and
// the vocabulary wins: the self test asserts that HEADER and SENTINEL are the only two
// keys that repeat on the tab, and IS9WD_FEED_KEY_HEADER exists in IS9WD_Config.js for
// nothing else. Every other label keeps the column 6.3 gives it.
function IS9WD_feedHeaderLabels_(headers) {
  var out = headers.slice();
  out[0] = IS9WD_FEED_KEY_HEADER;
  return out;
}

// Font colour and weight per column, which IS9WD_applyColumnStyles_ deliberately does
// not touch: it is the three cheap calls per column that a 2,000 row block needs.
function IS9WD_feedColumnTints_(sheet, firstRow, numRows, firstCol, cols) {
  if (numRows < 1) return;
  for (var i = 0; i < cols.length; i++) {
    var col = cols[i];
    if (!col.fg && !col.bold) continue;
    var range = sheet.getRange(firstRow, firstCol + i, numRows, 1);
    if (col.fg) range.setFontColor(col.fg);
    if (col.bold) range.setFontWeight('bold');
  }
}

// The hidden band belongs to its block and is written in the same call, so a block
// can never be resized while the helpers it reads still describe the old size. It is
// hidden rather than absent because the Feed errors scan has to reach it: the
// fallbacks the scan exists to catch live here (6.4).
function IS9WD_feedHelperBand_(sheet, firstRow, numRows, firstCol, numCols, values, formats) {
  if (numRows < 1) return;
  var band = sheet.getRange(firstRow, firstCol, numRows, numCols);
  for (var c = 0; c < numCols; c++) {
    sheet.getRange(firstRow, firstCol + c, numRows, 1)
      .setNumberFormat(formats[c] || IS9WD_FMT.TEXT);
  }
  band.setValues(values);
}

// Everything on the tab that is furniture rather than data: the banner, the eight
// sentinel bands, both key and label columns, the five header rows, the table styles
// and bandings, the helper band, and the tab's own chrome. Only the standalone resize
// calls it. In a full Build or repair, IS9WD_Setup.js does all of this and then hands
// this module the tab, which is why not one painter here writes a formula.
function IS9WD_feedPaintAll_(sheet, layout) {
  var f = layout;
  // Setup sets the font before the feed is resized, so anything this module
  // adds below the old last row would come back in the default face.
  sheet.getRange(1, 1, f.endRow, f.helperLastCol).setFontFamily(IS9WD_FONT);
  // DELIBERATELY TITLE CASE, AND THE ONLY BANNER THAT IS. The other seven are uppercase and
  // this one looks inconsistent beside them, which is a real cost and it is the lesser one.
  // A1 is not a heading here, it is DATA: the Drive connector strips tab names out of the
  // Sunday read, so this cell is the only thing that tells Claude which tab it is looking at,
  // and the self test asserts it equals IS9WD_TAB.FEED exactly. Uppercasing it for the sake
  // of the tab bar broke that identification, which the self test caught on the first run.
  // If it is ever changed, the matching assertion and the Canva run procedure change with it.
  IS9WD_paintBanner_(sheet, f.identityRow, f.firstCol, f.lastCol, IS9WD_TAB.FEED);
  sheet.getRange(f.identityRow, 2).setValue(IS9WD_FEED_SENTINEL.START);
  IS9WD_feedSentinels_(sheet, f);
  IS9WD_feedPaintKeyValue_(sheet, f.blockAFirst, IS9WD_FEED_BLOCK_A);
  IS9WD_feedPaintKeyValue_(sheet, f.blockBFirst, IS9WD_FEED_BLOCK_B);
  IS9WD_feedTable_(sheet, f.officerHeaderRow, f.officerFirst, f.officerRows,
    IS9WD_FEED_HEADERS.OFFICERS, IS9WD_FEED_COLS.OFFICERS);
  IS9WD_feedTable_(sheet, f.planHeaderRow, f.planFirst, f.planRows,
    IS9WD_FEED_HEADERS.PLAN, IS9WD_FEED_COLS.PLAN);
  IS9WD_feedTable_(sheet, f.pageHeaderRow, f.pageFirst, f.pageRows,
    IS9WD_FEED_HEADERS.PAGES, IS9WD_FEED_COLS.PAGES);
  IS9WD_feedTable_(sheet, f.slotHeaderRow, f.slotFirst, f.slotRows,
    IS9WD_FEED_HEADERS.SLOTS, IS9WD_FEED_COLS.SLOTS);
  IS9WD_feedTable_(sheet, f.flagHeaderRow, f.flagFirst, f.flagRows,
    IS9WD_FEED_HEADERS.FLAGS, IS9WD_FEED_COLS.FLAGS);
  IS9WD_feedPaintHelpers_(sheet, f);
  IS9WD_feedChrome_(sheet, f);
}

// The whole hidden band in one call, top to bottom, so a helper cell can never be
// left in body type where it would be read as content if the column were unhidden.
function IS9WD_feedPaintHelpers_(sheet, layout) {
  var width = layout.helperLastCol - layout.helperFirstCol + 1;
  IS9WD_style_(sheet.getRange(1, layout.helperFirstCol, layout.endRow, width), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
}

function IS9WD_feedChrome_(sheet, layout) {
  IS9WD_setWidths_(sheet, 'FEED');
  // Shown before hidden, or a column a past layout hid stays hidden forever.
  sheet.showColumns(1, layout.helperLastCol);
  IS9WD_hideCols_(sheet, 'FEED');
  IS9WD_freezeTab_(sheet, 'FEED');
  sheet.setTabColor(IS9WD_TAB_COLOR.FEED);
  IS9WD_setRules_(sheet, IS9WD_feedRules_(sheet, layout));
}

// Returns the list rather than applying it, matching IS9WD_setupFeedRules_, so the
// caller that owns the tab replaces the whole list in one call and nothing is ever
// appended. Colours are roles: a blocking state is always bold #724485 on #e9ebd4 and
// a superseded row is always #8b74a1, here and on every other tab.
function IS9WD_feedRules_(sheet, layout) {
  var f = layout;
  var flag = { fg: IS9WD_ROLE.FLAG_FG, bg: IS9WD_ROLE.FLAG_BG, bold: true };
  var muted = { fg: IS9WD_ROLE.MUTED_FG };
  var accent = { fg: IS9WD_ROLE.ACCENT_FG, bold: true };
  var readyCell = 'C' + (f.blockAFirst + 2);
  var errorCell = 'C' + (f.blockAFirst + 3);
  var notPubCell = 'C' + (f.blockAFirst + 7);
  var checkFirst = f.blockAFirst + 8;
  var rules = [];

  // First, so it wins on any cell it touches: the visible sentinel this tab uses
  // instead of swallowing an error into a blank.
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(1, 1, f.endRow, f.helperLastCol)],
    '=A1=' + IS9WD_feedQ_(IS9WD_FEED_ERR_), flag));

  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(readyCell)], '=RIGHT($' + readyCell + ',2)="NO"', flag));

  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(errorCell)], '=N($' + errorCell + ')>0', flag));

  // The three check cells, each of which holds readiness at NO on anything but OK.
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(checkFirst, 3, 3, 1)],
    '=AND($C' + checkFirst + '<>"",$C' + checkFirst + '<>"OK")', flag));

  // Items not published is a count and not a fault, so it takes the accent rather
  // than the blocking colours (5.4).
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(notPubCell)], '=N($' + notPubCell + ')>0', accent));
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.officerFirst, 9, f.officerRows, 1)],
    '=N($I' + f.officerFirst + ')>0', accent));

  // An unused plan row and an invisible slot are the tab's superseded rows.
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.planFirst, 1, f.planRows, IS9WD_FEED_HEADERS.PLAN.length)],
    '=$C' + f.planFirst + '=FALSE', muted));
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.slotFirst, 1, f.slotRows, IS9WD_FEED_HEADERS.SLOTS.length)],
    '=$D' + f.slotFirst + '=FALSE', muted));

  // A flag copied onto a slot row, and the same flag in Block D.
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.slotFirst, 12, f.slotRows, 1)],
    '=$L' + f.slotFirst + '<>""', flag));
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.flagFirst, 5, f.flagRows, 1)],
    '=$E' + f.flagFirst + '<>""', flag));

  return rules;
}
