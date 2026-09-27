/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · LAYOUT, PALETTE AND CONFIGURATION READER
 *  IS9WD_Config.js, the foundation every other module builds on
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 2.5 conventions, 3 tabs, 4 Configuration,
 *          5 Deliverables, 6 Canva Feed, 10 Archive and Log.
 *
 *  Three things live here and nowhere else.
 *
 *  1. WHERE EVERYTHING SITS. Every block title row, header row, first and last
 *     value row and column in sections 4, 5, 6 and 10. Setup writes the workbook
 *     from these constants, so moving a block is one edit here plus one
 *     Build or repair workbook, never a hunt through five modules.
 *
 *  2. HOW EVERYTHING LOOKS. The palette, the font, the type scale, the row
 *     heights, the column widths, the number formats and the painters that apply
 *     them. Nothing outside this file names a hex, a font or a point size.
 *
 *  3. WHAT THE SETTINGS SAY. IS9WD_readConfig_() returns one typed object, read
 *     only through named ranges. A missing name throws a sentence Ethan can act
 *     on rather than a null that travels three modules before it fails.
 *
 *  Rules this file is built to keep, all from 2.5:
 *    · Every function ends in `_`: google.script.run exposes server globals.
 *    · Code never reads a settings cell by address. Addresses live in the layout
 *      constants, which only setup writes with; readers resolve named ranges.
 *    · Idempotent. Nothing here appends: bandings are removed before they are
 *      applied, validations are set over a full block, rules replace a whole
 *      list, and a named range is re-pointed on its own name.
 *    · Nothing here runs at load time except plain object literals. Apps Script
 *      evaluates one file after another, this file sorts before IS9WD_Core.js, and
 *      a constant computed at load would call a Core helper that does not exist
 *      yet and take the whole project down with one TypeError. Anything derived is
 *      a memoised function: IS9WD_feed_() is the one that would have been tempting.
 *    · Pure logic belongs to IS9WD_Core.js. This file calls it and never
 *      restates it: IS9WD_txt_, IS9WD_int_, IS9WD_bool_, IS9WD_midnight_,
 *      IS9WD_signoffFor and the rest are Core's and stay Core's.
 *    · No name, no address, no token and no URL is written into this file. The
 *      repo is public, so the roster and the two URLs ship blank and Ethan
 *      pastes them into the Sheet (2.6, 4.6, 4.8).
 * =============================================================================
 */

// ============================================================================
//  TABS  (reference 3: resolved by developer metadata first, then by name)
// ============================================================================

var IS9WD_TAB = {
  CONFIG: '00 | Configuration',
  FEED: '01 | Canva Feed',
  ITEMS: '02 | Deliverables',
  ARCHIVE: '03 | Archive',
  LOG: '04 | Log'
};

// Left to right in the tab bar. Setup also uses it to order a repaired workbook.
var IS9WD_TAB_ORDER = ['CONFIG', 'FEED', 'ITEMS', 'ARCHIVE', 'LOG'];

// Renaming a tab in the tab bar must not make the next repair build an empty twin
// under the old name and strand 2,000 real rows on a sheet nothing reads.
var IS9WD_TAB_META_PREFIX = 'IS9WD_TAB_';

// 04 | Log is hidden. Hiding it is not a security boundary: the Canva reader can
// read every cell of every tab, hidden or not, which is why no token is ever in one.
var IS9WD_HIDDEN_TABS = ['LOG'];

// ============================================================================
//  PALETTE, FONT AND TYPE  (2.5: the IS9 palette and nothing outside it)
// ============================================================================

// #1C2120 is deliberately absent. It survives only as a Canva feed value, the
// number text hex the carousel prints, which is data and ships as a default in
// IS9WD_DEFAULTS.WINDOWS below. Nothing in the workbook is ever painted with it,
// which is why the hex columns are never filled with the colour they name.
var IS9WD_CLR = {
  GREEN_DEEP: '#085040',
  SAGE: '#58756a',
  PURPLE_DEEP: '#5d4170',
  PURPLE_STRONG: '#724485',
  PURPLE_BRIGHT: '#8a64a9',
  LILAC: '#8b74a1',
  CREAM: '#e9ebd4',
  PAPER: '#F8FBFD'
};

var IS9WD_PALETTE = [
  IS9WD_CLR.GREEN_DEEP, IS9WD_CLR.SAGE, IS9WD_CLR.PURPLE_DEEP,
  IS9WD_CLR.PURPLE_STRONG, IS9WD_CLR.PURPLE_BRIGHT, IS9WD_CLR.LILAC,
  IS9WD_CLR.CREAM, IS9WD_CLR.PAPER
];

// Roles, so a module asks for the meaning rather than the colour.
var IS9WD_ROLE = {
  BAND_BG: IS9WD_CLR.GREEN_DEEP,
  BAND_FG: IS9WD_CLR.PAPER,
  BAND_HELP_FG: IS9WD_CLR.CREAM,
  HEAD_BG: IS9WD_CLR.PURPLE_DEEP,
  HEAD_FG: IS9WD_CLR.PAPER,
  BODY_BG: IS9WD_CLR.PAPER,
  BODY_FG: IS9WD_CLR.GREEN_DEEP,
  HINT_FG: IS9WD_CLR.SAGE,
  ACCENT_FG: IS9WD_CLR.PURPLE_BRIGHT,
  FLAG_FG: IS9WD_CLR.PURPLE_STRONG,
  FLAG_BG: IS9WD_CLR.CREAM,
  MUTED_FG: IS9WD_CLR.LILAC,
  BAND_ROW_A: IS9WD_CLR.PAPER,
  BAND_ROW_B: IS9WD_CLR.CREAM
};

var IS9WD_TAB_COLOR = {
  CONFIG: IS9WD_CLR.PURPLE_DEEP,
  FEED: IS9WD_CLR.GREEN_DEEP,
  ITEMS: IS9WD_CLR.PURPLE_BRIGHT,
  ARCHIVE: IS9WD_CLR.SAGE,
  LOG: IS9WD_CLR.LILAC
};

var IS9WD_FONT = 'Poppins';
var IS9WD_TZ = 'Asia/Manila';

var IS9WD_SIZE = { BANNER: 14, BAND: 11, HEAD: 10, BODY: 10, HINT: 9 };

// 26 for data and 34 for a section title, so a 12 row block reads as a block.
var IS9WD_ROW_H = { BANNER: 40, HELP: 24, BAND: 34, HEAD: 30, DATA: 26, SPACER: 12 };

var IS9WD_SEP = '  ·  ';

// Two spaces around a pipe are Canva contract, so nothing here uses a pipe as
// decoration. The middle dot is the separator everywhere a label needs one.

// ============================================================================
//  NUMBER FORMATS AND ALIGNMENT
// ============================================================================

// A date key is ISO because it is compared and typed; a date a person reads
// carries its weekday. A deadline keeps `ddd, mmm d` because that is the width
// the Canva date line is built around (5.1).
var IS9WD_FMT = {
  DATE_KEY: 'yyyy-mm-dd',
  DATE_LONG: 'ddd, mmm d, yyyy',
  DEADLINE: 'ddd, mmm d',
  STAMP: 'yyyy-mm-dd hh:mm',
  INT: '0',
  TWO: '00',
  TEXT: '@'
};

var IS9WD_ALIGN = { LEFT: 'left', CENTER: 'center', RIGHT: 'right' };
var IS9WD_WRAP = { CLIP: 'clip', WRAP: 'wrap', OVER: 'overflow' };

// ============================================================================
//  WRITE OWNERSHIP  (reference 9: the map that makes "idempotent" testable)
// ============================================================================

var IS9WD_OWN = {
  SCRIPT: 'script',   // rewritten on every run: formulas, headers, formats
  ONCE: 'once',       // written when blank and never rewritten: keys, orders
  ETHAN: 'ethan',     // written when blank, never overwritten: roster, settings
  CODE: 'code',       // written only by code at run time, never by setup
  APPEND: 'append'    // never written except by appending
};

// ============================================================================
//  VALIDATION VOCABULARY  (built by IS9WD_validation_, applied over a block)
// ============================================================================

var IS9WD_V = {
  NONE: '',
  DATE: 'date',
  INT: 'int',
  CHECKBOX: 'checkbox',
  NAMED_LIST: 'namedList',
  VALUE_LIST: 'valueList',
  FORMULA: 'formula'
};

var IS9WD_RUNS_LIST = ['Daily', 'Weekly'];

var IS9WD_DAY_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
  'Saturday', 'Sunday', 'Any'];

// ============================================================================
//  COLUMN WIDTHS  (sized to content: nothing is left at the default 100)
// ============================================================================

// One width per sheet column, from column A. On Configuration a column carries a
// different thing in each block, so each width serves that column's widest real
// value and the rest clip: A is both the label column and the directory Key, so
// it is sized for the labels.
var IS9WD_WIDTH = {
  CONFIG: [300, 210, 300, 240, 240, 260, 170, 150, 160, 210, 110, 120],
  FEED: [150, 240, 340, 240, 320, 260, 200, 150, 170, 140, 150, 200, 110,
    80, 80, 80, 80, 150, 150, 130, 130, 220],
  ITEMS: [90, 260, 380, 150, 300, 150, 160, 200, 160, 190, 90, 110, 80, 80,
    110, 120, 110],
  ARCHIVE: [90, 150, 260, 380, 150, 300, 160, 90, 150, 160, 200, 190, 220, 220],
  LOG: [160, 220, 110, 190, 240, 90, 460, 150]
};

// Hidden column spans, first and last, 1 based. The feed helpers sit in R to V so
// they are clear of the 13 column slot table (6.4); the data tab hides the seven
// derived columns K to Q (5.1).
var IS9WD_HIDE_COLS = {
  ITEMS: [{ first: 11, last: 17 }],
  FEED: [{ first: 18, last: 22 }]
};

// ============================================================================
//  FROZEN PANES  (2.5: a header row on every tab, the key column where wide)
// ============================================================================

var IS9WD_FREEZE = {
  CONFIG: { rows: 2, cols: 1 },
  FEED: { rows: 1, cols: 1 },
  ITEMS: { rows: 3, cols: 1 },
  ARCHIVE: { rows: 3, cols: 1 },
  LOG: { rows: 3, cols: 1 }
};

// ============================================================================
//  00 | CONFIGURATION  (reference 4, every address in one place)
// ============================================================================

// Column A holds the block title on a title row and the label on a value row.
// Column B holds the value, column C the note or the guard. A table block uses
// its own columns instead, listed with the block.
var IS9WD_CFG = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  TITLE_COL: 1,
  LABEL_COL: 1,
  VALUE_COL: 2,
  NOTE_COL: 3,
  FIRST_COL: 1,
  LAST_COL: 12,
  BANNER: '00 | CONFIGURATION',
  HELP: 'Every setting the workbook reads. Code reads these cells through named ranges, never by address, so a block can move and nothing breaks.',
  SPACER_ROWS: [15, 22, 28, 33, 35, 68, 76, 93, 106]
};

// ---------------------------------------------------------------------------
//  4.1 WEEK SETTINGS
// ---------------------------------------------------------------------------

IS9WD_CFG.WEEK = {
  key: 'WEEK',
  title: 'WEEK SETTINGS',
  help: 'The week every printed label reads, and the two overrides that can quietly move it.',
  titleRow: 3,
  headerRow: 0,
  firstRow: 4,
  lastRow: 14,
  firstCol: 1,
  lastCol: 3,
  rows: [
    {
      row: 4, name: 'IS9WD_TODAY_OVERRIDE', owner: IS9WD_OWN.ETHAN,
      label: 'Today override (blank uses today)', value: '',
      format: IS9WD_FMT.DATE_KEY, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.DATE, help: 'Enter a date, or leave it blank to use today.' },
      note: '=IF(AND(B4<>"",NOT(ISNUMBER(B4))),"Override is not a date","")'
    },
    {
      row: 5, name: 'IS9WD_EFFECTIVE_TODAY', owner: IS9WD_OWN.SCRIPT,
      label: 'Effective today',
      formula: '=IF(IS9WD_TODAY_OVERRIDE<>"",INT(IS9WD_TODAY_OVERRIDE),TODAY())',
      format: IS9WD_FMT.DATE_LONG, align: IS9WD_ALIGN.RIGHT
    },
    {
      row: 6, name: 'IS9WD_WEEK_START', owner: IS9WD_OWN.SCRIPT,
      label: 'Week start (Monday)',
      formula: '=IS9WD_EFFECTIVE_TODAY+1-(WEEKDAY(IS9WD_EFFECTIVE_TODAY+1,2)-1)',
      format: IS9WD_FMT.DATE_LONG, align: IS9WD_ALIGN.RIGHT
    },
    {
      row: 7, name: 'IS9WD_WEEK_END', owner: IS9WD_OWN.SCRIPT,
      label: 'Week end (Sunday)', formula: '=IS9WD_WEEK_START+6',
      format: IS9WD_FMT.DATE_LONG, align: IS9WD_ALIGN.RIGHT
    },
    {
      row: 8, name: 'IS9WD_TERM_ACTIVE', owner: IS9WD_OWN.SCRIPT,
      label: 'Active trimester',
      formula: '=IFERROR(INDEX(IS9WD_TERM_CAL,MATCH(1,ARRAYFORMULA((IS9WD_TERM_STARTS<=IS9WD_WEEK_START)*(IS9WD_TERM_ENDS>=IS9WD_WEEK_START)),0),1),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 9, name: 'IS9WD_TERM_START', owner: IS9WD_OWN.SCRIPT,
      label: 'Active trimester start',
      formula: '=IFERROR(INDEX(IS9WD_TERM_CAL,MATCH(1,ARRAYFORMULA((IS9WD_TERM_STARTS<=IS9WD_WEEK_START)*(IS9WD_TERM_ENDS>=IS9WD_WEEK_START)),0),2),"")',
      format: IS9WD_FMT.DATE_KEY, align: IS9WD_ALIGN.RIGHT
    },
    {
      row: 10, name: 'IS9WD_WEEK_NUMBER', owner: IS9WD_OWN.SCRIPT,
      label: 'Week number',
      formula: '=IF(IS9WD_WEEK_NUMBER_OVERRIDE<>"",IS9WD_WEEK_NUMBER_OVERRIDE,IF(NOT(IS9WD_IN_TERM),"",IFERROR(INT((IS9WD_WEEK_START-IS9WD_TERM_START)/7)+1,"")))',
      format: IS9WD_FMT.TWO, align: IS9WD_ALIGN.CENTER
    },
    {
      row: 11, name: 'IS9WD_IN_TERM', owner: IS9WD_OWN.SCRIPT,
      label: 'In term', formula: '=IS9WD_TERM_ACTIVE<>""', align: IS9WD_ALIGN.CENTER
    },
    {
      row: 12, name: 'IS9WD_AY_LABEL', owner: IS9WD_OWN.ETHAN,
      label: 'A.Y. label', value: 'A.Y. 2026 - 2027',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 13, name: 'IS9WD_CUTOFF_TEXT', owner: IS9WD_OWN.ETHAN,
      label: 'Entry cutoff (display text)',
      value: 'Saturday 8 PM before the week starts',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 14, name: 'IS9WD_WEEK_NUMBER_OVERRIDE', owner: IS9WD_OWN.ETHAN,
      label: 'Week number override (blank uses the calculation)', value: '',
      format: IS9WD_FMT.TWO, align: IS9WD_ALIGN.CENTER,
      validate: { kind: IS9WD_V.INT, min: 1, max: 30, help: 'A whole number from 1 to 30, or blank.' },
      note: '=IF(IS9WD_WEEK_NUMBER_OVERRIDE<>"","Week number override is set: the calculation is ignored","")'
    }
  ]
};

// ---------------------------------------------------------------------------
//  4.2 URGENCY WINDOWS
// ---------------------------------------------------------------------------

// The only Configuration values that reach Canva as machine input rather than as
// text, so column E validates every hex and the self test fails on any row that is
// not OK. A hex cell is never painted with the colour it holds: two of them hold
// #1C2120, which appears nowhere in the workbook (2.5).
IS9WD_CFG.WINDOWS = {
  key: 'WINDOWS',
  title: 'URGENCY WINDOWS',
  help: 'The four deadline windows, and the two hex values each one paints on the carousel.',
  titleRow: 16,
  headerRow: 17,
  firstRow: 18,
  lastRow: 21,
  firstCol: 1,
  lastCol: 5,
  checkCol: 5,
  checkFormula: '=IF(AND(REGEXMATCH($C18,"^#[0-9A-Fa-f]{6}$"),REGEXMATCH($D18,"^#[0-9A-Fa-f]{6}$")),"OK","Hex is not #RRGGBB")',
  columns: [
    { header: 'Window', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Dates', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Station hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Number text hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ---------------------------------------------------------------------------
//  4.3 TERM CALENDAR
// ---------------------------------------------------------------------------

IS9WD_CFG.TERMS = {
  key: 'TERMS',
  title: 'TERM CALENDAR',
  help: 'Week numbers restart at 01 each trimester. A blank End pauses every job, so Term 1 needs a date even a provisional one.',
  titleRow: 23,
  headerRow: 24,
  firstRow: 25,
  lastRow: 27,
  firstCol: 1,
  lastCol: 4,
  checkCol: 4,
  checkFormula: '=IF($B25="","",IF(WEEKDAY($B25,2)<>1,"Start is not a Monday",IF($C25<$B25,"End is before start","OK")))',
  columns: [
    { header: 'Trimester', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    {
      header: 'Start (a Monday)', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.RIGHT,
      format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.DATE, help: 'A Monday. Column D says so when it is not.' }
    },
    {
      header: 'End', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.RIGHT,
      format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.DATE, help: 'The last day of the trimester. A blank here pauses every job.' }
    },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ---------------------------------------------------------------------------
//  4.4 STATUS LIST, and the undo window under it
// ---------------------------------------------------------------------------

IS9WD_CFG.STATUS = {
  key: 'STATUS',
  title: 'STATUS LIST',
  help: 'Exactly one row is terminal. Nothing in the code keys on a label, so renaming a status costs one edit here.',
  titleRow: 29,
  headerRow: 30,
  firstRow: 31,
  lastRow: 32,
  firstCol: 1,
  lastCol: 4,
  blankRow: 33,
  undoRow: 34,
  undoLabel: 'Undo window (seconds)',
  undoName: 'IS9WD_UNDO_SECONDS',
  undoValidate: { kind: IS9WD_V.INT, min: 0, max: 3600, help: 'Seconds a link holder may untick. 0 disables unticking.' },
  columns: [
    { header: 'Status', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Terminal', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.CHECKBOX } },
    { header: 'Chip hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Chip text hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ---------------------------------------------------------------------------
//  4.5B WEEKLY SIGN-OFF, the derived cells
// ---------------------------------------------------------------------------

// All five are formulas over the store at row 107, so nobody types into them and
// last week's names can never print on this week's carousel.
IS9WD_CFG.SIGNOFF = {
  key: 'SIGNOFF',
  title: 'WEEKLY SIGN-OFF (THIS WEEK)',
  help: 'Looked up from the store below by this week start. Blank here means Ready for Canva reads NO.',
  titleRow: 36,
  headerRow: 0,
  firstRow: 37,
  lastRow: 41,
  firstCol: 1,
  lastCol: 3,
  rows: [
    {
      row: 37, name: 'IS9WD_PREPARED_NAME', owner: IS9WD_OWN.SCRIPT,
      label: 'Prepared by name (this week)',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_PREPARED_NAME,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      note: '=IF(NOT(IS9WD_SIGNOFF_SET),"Sign-off not set for this week","")'
    },
    {
      row: 38, name: 'IS9WD_PREPARED_POSITION', owner: IS9WD_OWN.SCRIPT,
      label: 'Prepared by position (this week)',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_PREPARED_POSITION,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 39, name: 'IS9WD_CHECKED_NAME', owner: IS9WD_OWN.SCRIPT,
      label: 'Checked by name (this week)',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_CHECKED_NAME,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 40, name: 'IS9WD_CHECKED_POSITION', owner: IS9WD_OWN.SCRIPT,
      label: 'Checked by position (this week)',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_CHECKED_POSITION,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 41, name: 'IS9WD_SIGNOFF_SET', owner: IS9WD_OWN.SCRIPT,
      label: 'Sign-off set for this week',
      formula: '=AND(IS9WD_PREPARED_NAME<>"",IS9WD_PREPARED_POSITION<>"",IS9WD_CHECKED_NAME<>"",IS9WD_CHECKED_POSITION<>"")',
      align: IS9WD_ALIGN.CENTER
    }
  ]
};

// ---------------------------------------------------------------------------
//  4.6 SWITCHES
// ---------------------------------------------------------------------------

// Three capacity numbers, not one: the frames on a master page, the pages a
// committee may own, and the product. A continuation page needs those to be
// different numbers, and B53 is a formula because a multi-cell paste is exactly
// what replaces a formula with a stale literal (4.6).
IS9WD_CFG.SWITCHES = {
  key: 'SWITCHES',
  title: 'SWITCHES',
  help: 'Every toggle, number, address and URL the jobs read. Test mode ships ON, and the two URLs ship blank.',
  titleRow: 42,
  headerRow: 0,
  firstRow: 43,
  lastRow: 67,
  firstCol: 1,
  lastCol: 3,
  rows: [
    { row: 43, name: 'IS9WD_AUTOMATION_ON', label: 'Automation on', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 44, name: 'IS9WD_TEST_MODE', label: 'Test mode (every email goes to the admin)', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 45, name: 'IS9WD_MAIL_MONDAY', label: 'Monday assignment email on', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 46, name: 'IS9WD_MAIL_DAILY', label: 'Daily digest email on', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 47, name: 'IS9WD_MAIL_SUNDAY', label: 'Sunday brief email on', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 48, name: 'IS9WD_MAIL_ALERT', label: 'Error alert email on', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 49, name: 'IS9WD_MAIL_NOREPLY', label: 'Send as no reply (Workspace only)', owner: IS9WD_OWN.ETHAN, value: false, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 50, name: 'IS9WD_APP_ON', label: 'App on', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    {
      row: 51, name: 'IS9WD_SLOTS_PER_PAGE', label: 'Slots per Canva page', owner: IS9WD_OWN.ETHAN,
      value: 10, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 50, help: 'The item frames the master page physically carries.' }
    },
    {
      row: 52, name: 'IS9WD_MAX_PARTS', label: 'Maximum Canva pages per committee', owner: IS9WD_OWN.ETHAN,
      value: 2, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 4, help: 'Raising this needs a master rebuild before it can be used.' }
    },
    {
      row: 53, name: 'IS9WD_PUBLISH_MAX', label: 'Publishable items per committee (derived)',
      owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS',
      format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      note: '=IF(NOT(ISNUMBER(IS9WD_PUBLISH_MAX)),"Publishable maximum is not a number",IF(IS9WD_PUBLISH_MAX<>IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS,"Capacity numbers disagree: "&IS9WD_SLOTS_PER_PAGE&" times "&IS9WD_MAX_PARTS&" is "&IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS,"OK"))'
    },
    { row: 54, name: 'IS9WD_PUBLISH_EMPTY_PAGES', label: 'Publish a page for a committee with no items', owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX }, align: IS9WD_ALIGN.CENTER },
    { row: 55, name: 'IS9WD_QUOTA_RESERVE', label: 'Email quota reserve', owner: IS9WD_OWN.ETHAN, value: 100, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT, validate: { kind: IS9WD_V.INT, min: 0, max: 1500 } },
    { row: 56, name: 'IS9WD_RETIRE_DAYS', label: 'Retire accomplished after days', owner: IS9WD_OWN.ETHAN, value: 14, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT, validate: { kind: IS9WD_V.INT, min: 0, max: 365 } },
    { row: 57, name: 'IS9WD_TOKEN_WARN_DAYS', label: 'Token age warning days', owner: IS9WD_OWN.ETHAN, value: 120, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT, validate: { kind: IS9WD_V.INT, min: 0, max: 3650 } },
    { row: 58, name: 'IS9WD_ADMIN_EMAIL', label: 'Admin email', owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 59, name: 'IS9WD_AUTOMATION_OWNER', label: 'Automation owner email', owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 60, name: 'IS9WD_REPLY_TO', label: 'Reply-to email', owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 61, name: 'IS9WD_SENDER_NAME', label: 'Sender display name', owner: IS9WD_OWN.ETHAN, value: 'IS9 Deliverables Tracker', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 62, name: 'IS9WD_APP_BASE_URL', label: 'App base URL', owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 63, name: 'IS9WD_ENDPOINT_URL', label: 'Endpoint URL (/exec)', owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    {
      row: 64, name: 'IS9WD_TRANSPORT', label: 'Transport (fetch or gsrun)', owner: IS9WD_OWN.ETHAN,
      value: 'fetch', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      validate: { kind: IS9WD_V.VALUE_LIST, values: ['fetch', 'gsrun'], help: 'The live shape. Shape A is decided, so this reads fetch.' }
    },
    { row: 65, name: 'IS9WD_READER_EMAIL', label: 'Canva reader email (Drive connector fallback)', owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 66, name: 'IS9WD_HEARTBEAT', label: 'Last heartbeat', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.STAMP, align: IS9WD_ALIGN.RIGHT },
    { row: 67, name: 'IS9WD_LAST_OWNER', label: 'Last dispatcher owner', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT }
  ]
};

// ---------------------------------------------------------------------------
//  4.7 SCHEDULE
// ---------------------------------------------------------------------------

// Runs and Day are dropdowns with reject input, because a typo would turn a weekly
// job into one that never runs and nothing would say so.
IS9WD_CFG.SCHEDULE = {
  key: 'SCHEDULE',
  title: 'SCHEDULE',
  help: 'One row per job, in Manila hours. Catch-up hours is how late a missed run may still fire.',
  titleRow: 69,
  headerRow: 70,
  firstRow: 71,
  lastRow: 75,
  firstCol: 1,
  lastCol: 9,
  checkCol: 7,
  checkFormula: '=IF($A71="","",IF(AND(LOWER($B71)="weekly",LOWER($C71)="any"),"Row does not parse",IF(OR(NOT(ISNUMBER($D71)),$D71<>INT($D71),$D71<0,$D71>23),"Row does not parse","OK")))',
  columns: [
    { header: 'Job key', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Runs', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.VALUE_LIST, values: IS9WD_RUNS_LIST } },
    { header: 'Day', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.VALUE_LIST, values: IS9WD_DAY_LIST } },
    { header: 'Hour', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.INT, min: 0, max: 23 } },
    { header: 'Catch-up hours', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.WRAP, validate: { kind: IS9WD_V.INT, min: 0, max: 23 } },
    { header: 'On', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.CHECKBOX } },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Last run', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Last status', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ---------------------------------------------------------------------------
//  4.8 PEOPLE DIRECTORY
// ---------------------------------------------------------------------------

// Fourteen rows: nine publishing committees, then the President and the four EVPs,
// who have items, links and emails and no Canva page. Key, Carousel order and
// Hierarchy order are written once and never rewritten, because the master design's
// pages are physical: renumbering an ordinal would send two committees to one page.
IS9WD_CFG.DIRECTORY = {
  key: 'DIRECTORY',
  title: 'PEOPLE DIRECTORY',
  help: 'Paste the 14 names into Full name and the 14 addresses into Email. Publishes is the only cell that decides what reaches Canva.',
  titleRow: 77,
  headerRow: 78,
  firstRow: 79,
  lastRow: 92,
  firstCol: 1,
  lastCol: 12,
  checkCol: 10,
  adminKey: 'K10',
  columns: [
    { header: 'Key', owner: IS9WD_OWN.ONCE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Carousel order', owner: IS9WD_OWN.ONCE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.WRAP },
    { header: 'Committee or office', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Full name', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Position label', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Email', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Token prefix', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Token issued', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP },
    { header: 'Revoked', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.CENTER, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.CHECKBOX } },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Publishes', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.CHECKBOX } },
    { header: 'Hierarchy order', owner: IS9WD_OWN.ONCE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.WRAP }
  ]
};

// ---------------------------------------------------------------------------
//  4.9 DIAGNOSTICS
// ---------------------------------------------------------------------------

// Read only. The first five are pointers at feed cells so a fix lands in one place.
// The last five are code written and carry named ranges of their own, added here
// because 4.9 lists none and a code write by cell address is the one thing 2.5
// forbids. Nothing else reads them.
IS9WD_CFG.DIAGNOSTICS = {
  key: 'DIAGNOSTICS',
  title: 'DIAGNOSTICS',
  help: 'Read only. Five pointers at the feed, then five lines code writes after each run.',
  titleRow: 94,
  headerRow: 0,
  firstRow: 95,
  lastRow: 105,
  firstCol: 1,
  lastCol: 3,
  rows: [
    { row: 95, name: '', label: 'Total active deliverables', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_TOTAL', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 96, name: '', label: 'Rows with a flag', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_FLAGGED', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 97, name: '', label: 'Ready for Canva', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_READY', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 98, name: '', label: 'Feed errors', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_ERRORS', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 99, name: '', label: 'Carousel pages this week', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_PAGES', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 100, name: '', label: 'Rows used of 2000', owner: IS9WD_OWN.SCRIPT, formula: '=COUNTIF(IS9WD_DEL_ID,"?*")', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 101, name: 'IS9WD_DIAG_LAST_RUN', label: 'Last dispatcher run', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.STAMP, align: IS9WD_ALIGN.RIGHT },
    { row: 102, name: 'IS9WD_DIAG_QUOTA', label: 'Last remaining mail quota', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 103, name: 'IS9WD_DIAG_SELFTEST', label: 'Last self test result', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 104, name: 'IS9WD_DIAG_DEPLOYMENT', label: 'Live deployment access last checked', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 105, name: 'IS9WD_DIAG_OVERRIDES', label: 'Today override and week number override', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT }
  ]
};

// ---------------------------------------------------------------------------
//  4.5A WEEKLY SIGN-OFF STORE  (last block, so it can grow downward)
// ---------------------------------------------------------------------------

// Append or replace by week, never cleared: this is what lets the Archive record
// who signed off on which week after the names have moved on.
IS9WD_CFG.STORE = {
  key: 'STORE',
  title: 'WEEKLY SIGN-OFF STORE',
  help: 'One row per week, keyed on that week Monday. Set from the app each week, or typed here when the app is down.',
  titleRow: 107,
  headerRow: 108,
  firstRow: 109,
  lastRow: 160,
  firstCol: 1,
  lastCol: 7,
  checkCol: 7,
  checkFormula: '=IF($A109="","",IF(WEEKDAY($A109,2)<>1,"Week start is not a Monday",IF(COUNTIF($A$109:$A$160,$A109)>1,"Duplicate week","OK")))',
  growBy: 52,
  minFreeRows: 4,
  columns: [
    { header: 'Week start', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.DATE, help: 'The Monday the week starts.' } },
    { header: 'Prepared by name', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Prepared by position', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Checked by name', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Checked by position', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Set at', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// Painting order, top to bottom. The store is last because it grows downward.
IS9WD_CFG.BLOCKS = ['WEEK', 'WINDOWS', 'TERMS', 'STATUS', 'SIGNOFF', 'SWITCHES',
  'SCHEDULE', 'DIRECTORY', 'DIAGNOSTICS', 'STORE'];

// ============================================================================
//  DEFAULTS  (what setup writes into a blank workbook, and only when blank)
// ============================================================================

// Nothing personal is here and nothing personal ever will be: the roster and the
// two URLs are blank on purpose, because this file is committed to a public repo
// (2.6). Ethan pastes them into the Sheet at Gate A.
var IS9WD_DEFAULTS = {

  // Rows 18 to 21, columns A to D. The two #1C2120 values are Canva data, the
  // number text hex the carousel prints. They are never used to paint a cell.
  WINDOWS: [
    ['OVERDUE', 'deadline before week start', '#e9ebd4', '#1C2120'],
    ['W1', 'Monday to Tuesday of the week', '#e9ebd4', '#1C2120'],
    ['W2', 'Wednesday to Sunday of the week', '#8a64a9', '#F8FBFD'],
    ['W3', 'after week end', '#085040', '#F8FBFD']
  ],

  // Term 1 starts Monday 2026-09-07, which is what makes the week of 2026-09-28
  // Week 04. The end date is the published one; a blank end would make In term
  // FALSE in the middle of Term 1 and pause every job (4.3).
  TERMS: [
    ['Term 1', '2026-09-07', '2026-12-13'],
    ['', '', ''],
    ['', '', '']
  ],

  // Status, Terminal, Chip hex, Chip text hex. The two chip pairs are palette
  // choices rather than spec values: 4.4 names the columns and not their defaults.
  STATUSES: [
    ['Open', false, '#e9ebd4', '#085040'],
    ['Accomplished', true, '#085040', '#F8FBFD']
  ],

  UNDO_SECONDS: 60,

  SCHEDULE: [
    ['MONDAY_ASSIGNMENTS', 'Weekly', 'Monday', 7, 6, true],
    ['DAILY_DIGEST', 'Daily', 'Any', 18, 4, true],
    ['SUNDAY_BRIEF', 'Weekly', 'Sunday', 19, 4, true],
    ['ARCHIVE_WEEK', 'Weekly', 'Saturday', 22, 2, false],
    ['RETIRE_ACCOMPLISHED', 'Weekly', 'Saturday', 23, 2, false]
  ],

  // Key, Carousel order, Committee or office, Position label, Publishes,
  // Hierarchy order. Full name and Email stay blank: they are 14 students' names
  // and DLSU addresses and they live only in the Sheet (4.8).
  // The nine committee spellings are exactly what their Canva headline prints.
  DIRECTORY: [
    ['K01', 1, 'Partnerships', 'VICE PRESIDENT', true, 6],
    ['K02', 2, 'Publications', 'VICE PRESIDENT', true, 7],
    ['K03', 3, 'Marketing and Advocacy', 'VICE PRESIDENT', true, 8],
    ['K04', 4, 'Membership', 'VICE PRESIDENT', true, 9],
    ['K05', 5, 'Team Management', 'VICE PRESIDENT', true, 10],
    ['K06', 6, 'Investment Strategy & Education', 'VICE PRESIDENT', true, 11],
    ['K07', 7, 'Investment Research', 'VICE PRESIDENT', true, 12],
    ['K08', 8, 'Documentation', 'VICE PRESIDENT', true, 13],
    ['K09', 9, 'Finance', 'VICE PRESIDENT', true, 14],
    ['K10', '', 'President', 'PRESIDENT', false, 1],
    ['K11', '', 'Executive Vice President for Externals', 'EXECUTIVE VICE PRESIDENT FOR EXTERNALS', false, 2],
    ['K12', '', 'Executive Vice President for Internals', 'EXECUTIVE VICE PRESIDENT FOR INTERNALS', false, 3],
    ['K13', '', 'Executive Vice President for Investments', 'EXECUTIVE VICE PRESIDENT FOR INVESTMENTS', false, 4],
    ['K14', '', 'Executive Vice President for Operations', 'EXECUTIVE VICE PRESIDENT FOR OPERATIONS', false, 5]
  ]
};

// Nine publishing rows out of fourteen, counted rather than asserted, because the
// feed's whole size follows from this number (6.3).
var IS9WD_DIR_ROWS = IS9WD_DEFAULTS.DIRECTORY.length;

// ============================================================================
//  02 | DELIVERABLES  (reference 5)
// ============================================================================

var IS9WD_ITEMS = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  headerRow: 3,
  firstRow: 4,
  lastRow: 2003,
  firstCol: 1,
  lastCol: 17,
  BANNER: '02 | DELIVERABLES',
  // The banner takes the section band fill and the header row takes the column
  // header fill, on every tab, which is 2.5's palette rule and Ethan's instruction.
  // Reference 5.1 names the two fills the other way round for this tab alone. The
  // uniform reading wins here and the swap is flagged for a one line ruling.
  // Columns J to Q are the derived block: script owned, rewritten on every repair,
  // and warning protected. Deleting a row would shrink every named range that
  // contains it, so deleteItem clears A to I instead (5.1).
  derivedFirstCol: 10,
  derivedLastCol: 17,
  columns: [
    { header: 'ID', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    {
      header: 'Committee', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.NAMED_LIST, source: 'IS9WD_DIR_NAME', help: 'Pick a committee or office from the directory.' }
    },
    {
      header: 'Title of Task', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.FORMULA, formula: '=LEN($C{row})<=40', help: 'Max 40 characters. Start with a verb.' }
    },
    {
      header: 'Deadline', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.RIGHT,
      format: IS9WD_FMT.DEADLINE, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.DATE, help: 'A date, no time. A time goes in the remark.' }
    },
    {
      header: 'Remark', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.FORMULA, formula: '=LEN($E{row})<=30', help: 'Instructions only (where it goes, who signs off). Never progress or status.' }
    },
    {
      header: 'Status', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.NAMED_LIST, source: 'IS9WD_STATUS_LIST', help: 'Pick a status from the Configuration list.' }
    },
    { header: 'Status at', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Status by', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Created at', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Active', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, wrap: IS9WD_WRAP.CLIP },
    { header: 'Publish key', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Rank', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Part', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Slot on page', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.WRAP },
    { header: 'Master page', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.WRAP },
    { header: 'Slot key', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// Row 2 on the data tab, built from the capacity numbers rather than typed, so the
// sentence stays true the day one of the three changes (4.6, 5.4).
function IS9WD_itemsHelpText_(publishMax, slotsPerPage, maxParts) {
  var max = IS9WD_int_(publishMax);
  var per = IS9WD_int_(slotsPerPage);
  var parts = IS9WD_int_(maxParts);
  if (max === null || per === null || parts === null) {
    return 'One row per deliverable. Enter as many as the week really holds: nothing is refused. Tick an item off rather than deleting it. Anything active with a past deadline shows as overdue.';
  }
  return 'One row per deliverable. Enter as many as the week really holds: nothing is refused. ' +
    'A committee\'s first ' + max + ' active items reach the carousel, ' + per + ' to a page across ' +
    parts + ' pages; the rest are tracked, emailed and reported, and the Sunday brief names them. ' +
    'Tick an item off rather than deleting it. Anything active with a past deadline shows as overdue.';
}

// ============================================================================
//  01 | CANVA FEED  (reference 6.3, sized from the three capacity numbers)
// ============================================================================

var IS9WD_FEED_SENTINEL = {
  START: 'IS9WD FEED START v2',
  READINESS: 'IS9WD BLOCK: READINESS',
  TITLE: 'IS9WD BLOCK: TITLE',
  COMMITTEES: 'IS9WD BLOCK: COMMITTEES',
  PLAN: 'IS9WD BLOCK: PLAN',
  PAGES: 'IS9WD BLOCK: PAGES',
  SLOTS: 'IS9WD BLOCK: SLOTS',
  FLAGS: 'IS9WD BLOCK: FLAGS',
  END: 'IS9WD FEED END'
};

// A connector read that does not carry every one of these nine is a truncated read
// and the weekly run stops (6.5). The self test asserts the spelling.
var IS9WD_FEED_SENTINELS = [
  IS9WD_FEED_SENTINEL.START, IS9WD_FEED_SENTINEL.READINESS, IS9WD_FEED_SENTINEL.TITLE,
  IS9WD_FEED_SENTINEL.COMMITTEES, IS9WD_FEED_SENTINEL.PLAN, IS9WD_FEED_SENTINEL.PAGES,
  IS9WD_FEED_SENTINEL.SLOTS, IS9WD_FEED_SENTINEL.FLAGS, IS9WD_FEED_SENTINEL.END
];

var IS9WD_FEED_KEY_HEADER = 'HEADER';
var IS9WD_FEED_KEY_SENTINEL = 'SENTINEL';

// Key, label. Block A is eleven fixed rows and every one of them is read by the
// Sunday run or the brief before Canva is touched.
var IS9WD_FEED_BLOCK_A = [
  ['A.TOTAL', 'Total active deliverables'],
  ['A.FLAGGED', 'Rows with a flag'],
  ['A.READY', 'Ready for Canva'],
  ['A.ERRORS', 'Feed errors'],
  ['A.PAGES', 'Carousel pages'],
  ['A.EXPORT', 'Export page list'],
  ['A.MASTER', 'Master pages required'],
  ['A.NOTPUB', 'Items not published'],
  ['A.CAPACITY', 'Capacity check'],
  ['A.PLAN', 'Plan check'],
  ['A.FLAGCAP', 'Flag list check']
];

var IS9WD_FEED_BLOCK_B = [
  ['B.WEEKLINE', 'Week line'],
  ['B.LEGEND1', 'Legend 1'],
  ['B.LEGEND2', 'Legend 2'],
  ['B.LEGEND3', 'Legend 3'],
  ['B.PREPNAME', 'Prepared by name'],
  ['B.PREPPOS', 'Prepared by position'],
  ['B.CHKNAME', 'Checked by name'],
  ['B.CHKPOS', 'Checked by position']
];

var IS9WD_FEED_HEADERS = {
  OFFICERS: ['Key', 'Page', 'Committee', 'Count', 'Next due text', 'Station hex',
    'Number text hex', 'Pages', 'Not published'],
  PLAN: ['Key', 'Page', 'Used', 'Position', 'Committee', 'VP line', 'Part', 'Parts',
    'First item no', 'Last item no', 'Slots used', 'Count'],
  PAGES: ['Key', 'Page', 'Headline', 'VP line', 'Tagline'],
  SLOTS: ['Key', 'Page', 'Slot', 'Visible', 'Title', 'Deadline text', 'Remark visible',
    'Remark text', 'Window', 'Station hex', 'Number text hex', 'Flag', 'Item no'],
  FLAGS: ['Key', 'Page', 'Committee', 'Slot', 'Flag', 'ID', 'Title']
};

// Helpers live in R to V, clear of the widest visible block, which is the 13 column
// slot table. The Feed errors scan must reach V, because the helpers carry the
// IFERROR fallbacks the scan exists to catch (6.4).
var IS9WD_FEED_HELPER = { firstCol: 18, lastCol: 22 };

// Block D is a budget rather than a bound: nothing caps the items Ethan enters, so
// Flag list check compares the flag count against this block's row count and holds
// readiness at NO when it is short (6.3).
var IS9WD_FEED_FLAG_SLACK = 40;

// Every row number on the tab, computed from the three capacity numbers and the
// count of publishing rows, so no module hardcodes 579. Build or repair rewrites
// the officer table, the page headers, the plan, the slot table, Block D, the
// helper bands and the Feed errors scan together or none of them.
function IS9WD_feedLayout_(publishingRows, slotsPerPage, maxParts, directoryRows) {
  var pub = IS9WD_posInt_(publishingRows);
  var per = IS9WD_posInt_(slotsPerPage);
  var parts = IS9WD_posInt_(maxParts);
  var dir = IS9WD_posInt_(directoryRows) || IS9WD_DIR_ROWS;
  var pages = pub * parts;
  var out = {
    publishingRows: pub,
    slotsPerPage: per,
    maxParts: parts,
    publishMax: per * parts,
    masterPagesRequired: 1 + pages,
    officerRows: pub,
    pageRows: pages,
    planRows: 1 + pages,
    slotRows: pages * per,
    flagRows: dir * per * parts + IS9WD_FEED_FLAG_SLACK,
    firstCol: 1,
    lastCol: 13,
    helperFirstCol: IS9WD_FEED_HELPER.firstCol,
    helperLastCol: IS9WD_FEED_HELPER.lastCol,
    identityRow: 1,
    blockARows: IS9WD_FEED_BLOCK_A.length,
    blockBRows: IS9WD_FEED_BLOCK_B.length
  };
  out.readinessSentinelRow = 2;
  out.blockAFirst = 3;
  out.blockALast = out.blockAFirst + out.blockARows - 1;
  out.titleSentinelRow = out.blockALast + 1;
  out.blockBFirst = out.titleSentinelRow + 1;
  out.blockBLast = out.blockBFirst + out.blockBRows - 1;
  out.committeeSentinelRow = out.blockBLast + 1;
  out.officerHeaderRow = out.committeeSentinelRow + 1;
  out.officerFirst = out.officerHeaderRow + 1;
  out.officerLast = out.officerFirst + out.officerRows - 1;
  out.planSentinelRow = out.officerLast + 1;
  out.planHeaderRow = out.planSentinelRow + 1;
  out.planFirst = out.planHeaderRow + 1;
  out.planLast = out.planFirst + out.planRows - 1;
  out.pagesSentinelRow = out.planLast + 1;
  out.pageHeaderRow = out.pagesSentinelRow + 1;
  out.pageFirst = out.pageHeaderRow + 1;
  out.pageLast = out.pageFirst + out.pageRows - 1;
  out.slotsSentinelRow = out.pageLast + 1;
  out.slotHeaderRow = out.slotsSentinelRow + 1;
  out.slotFirst = out.slotHeaderRow + 1;
  out.slotLast = out.slotFirst + out.slotRows - 1;
  out.flagsSentinelRow = out.slotLast + 1;
  out.flagHeaderRow = out.flagsSentinelRow + 1;
  out.flagFirst = out.flagHeaderRow + 1;
  out.flagLast = out.flagFirst + out.flagRows - 1;
  out.endRow = out.flagLast + 1;
  // The scan skips rows 5 and 6: row 6 to stay out of its own scan, row 5 because
  // readiness now reads this cell and a scan over it would be circular (6.4).
  out.scanFirstBlockLastRow = 4;
  out.scanSecondBlockFirstRow = 7;
  out.scanLastRow = out.endRow;
  out.scanLastCol = out.helperLastCol;
  out.sentinelRows = [out.identityRow, out.readinessSentinelRow, out.titleSentinelRow,
    out.committeeSentinelRow, out.planSentinelRow, out.pagesSentinelRow,
    out.slotsSentinelRow, out.flagsSentinelRow, out.endRow];
  return out;
}

// Counted from the directory defaults rather than typed, so the shipping layout and
// the live one can never disagree about how many committees publish.
function IS9WD_defaultPublishingRows_() {
  var n = 0;
  for (var i = 0; i < IS9WD_DEFAULTS.DIRECTORY.length; i++) {
    if (IS9WD_DEFAULTS.DIRECTORY[i][4] === true) n++;
  }
  return n;
}

// Looks a switch default up by its range name in the block above, so the two
// capacity numbers are written once, in the switches block, and read from there.
function IS9WD_switchDefault_(name) {
  var rows = IS9WD_CFG.SWITCHES.rows;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].name === name) return rows[i].value;
  }
  return null;
}

var IS9WD_FEED_HELP = 'Live formulas only. Nothing here is typed, and nothing here is merged.';

var IS9WD_FEED_CACHE_ = null;

// The shipping layout: nine publishing rows, ten slots, two parts, last row 579.
// It is a function rather than a top level constant on purpose. Apps Script
// evaluates each file in turn, and this file sorts before IS9WD_Core.js, so a
// constant computed at load time would call a Core helper that does not exist yet
// and every function in the project would fail at load with one TypeError.
function IS9WD_feed_() {
  if (!IS9WD_FEED_CACHE_) {
    var layout = IS9WD_feedLayout_(
      IS9WD_defaultPublishingRows_(),
      IS9WD_switchDefault_('IS9WD_SLOTS_PER_PAGE'),
      IS9WD_switchDefault_('IS9WD_MAX_PARTS'),
      IS9WD_DIR_ROWS
    );
    layout.BANNER = IS9WD_TAB.FEED;
    layout.HELP = IS9WD_FEED_HELP;
    IS9WD_FEED_CACHE_ = layout;
  }
  return IS9WD_FEED_CACHE_;
}

// ============================================================================
//  03 | ARCHIVE and 04 | LOG  (reference 10, both append only)
// ============================================================================

var IS9WD_ARCHIVE = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  headerRow: 3,
  firstRow: 4,
  firstCol: 1,
  lastCol: 14,
  BANNER: '03 | ARCHIVE',
  HELP: 'Append only. Deadline holds the real date, not the rendered text, so a week can be reconstructed years later.',
  SOURCE_SNAPSHOT: 'Published snapshot',
  SOURCE_RETIRED: 'Retired',
  columns: [
    { header: 'Week', align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TWO, wrap: IS9WD_WRAP.CLIP },
    { header: 'Week start', align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP },
    { header: 'Committee', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Title of Task', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Deadline', align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP },
    { header: 'Remarks', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Archived at', align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'ID', align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Status', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Status at', align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Status by', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Source', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Prepared by', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Checked by', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

var IS9WD_LOG = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  headerRow: 3,
  firstRow: 4,
  firstCol: 1,
  lastCol: 8,
  BANNER: '04 | LOG',
  HELP: 'Append only, newest at the bottom, trimmed to the newest 5,000 rows by the heartbeat.',
  TRIM_ROWS: 5000,
  SOURCES: ['App', 'Menu', 'Trigger', 'Setup'],
  columns: [
    { header: 'At', align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Actor', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Source', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Action', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Committee', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'ID', align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Detail', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Result', align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ============================================================================
//  NAMED RANGES  (every name, with the target it is re-pointed to)
// ============================================================================

// A1 notation is built from the layout constants, never typed, so a block that
// moves or a feed that is resized carries its names with it. Setup re-points each
// one on its own name, which is what keeps a second run from creating a twin.

function IS9WD_colLetter_(col) {
  var n = IS9WD_posInt_(col);
  var out = '';
  while (n > 0) {
    var rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = (n - 1 - rem) / 26;
  }
  return out;
}

function IS9WD_a1_(row, col, numRows, numCols) {
  var rows = IS9WD_posInt_(numRows) || 1;
  var cols = IS9WD_posInt_(numCols) || 1;
  var start = IS9WD_colLetter_(col) + row;
  if (rows === 1 && cols === 1) return start;
  return start + ':' + IS9WD_colLetter_(col + cols - 1) + (row + rows - 1);
}

// Column to name maps, in the reference's own order. A gap is deliberate: the
// directory's Check column (J) and the store's Check column (G) carry no name,
// because nothing reads either one from code.
var IS9WD_DIR_COL_NAMES = {
  1: 'IS9WD_DIR_KEY', 2: 'IS9WD_DIR_CAROUSEL', 3: 'IS9WD_DIR_NAME',
  4: 'IS9WD_DIR_VP', 5: 'IS9WD_DIR_POSITION', 6: 'IS9WD_DIR_EMAIL',
  7: 'IS9WD_DIR_PREFIX', 8: 'IS9WD_DIR_ISSUED', 9: 'IS9WD_DIR_REVOKED',
  11: 'IS9WD_DIR_PUBLISHES', 12: 'IS9WD_DIR_HIERARCHY'
};

var IS9WD_STORE_COL_NAMES = {
  1: 'IS9WD_SIGNOFF_WEEKS', 2: 'IS9WD_SIGNOFF_PREPARED_NAME',
  3: 'IS9WD_SIGNOFF_PREPARED_POSITION', 4: 'IS9WD_SIGNOFF_CHECKED_NAME',
  5: 'IS9WD_SIGNOFF_CHECKED_POSITION', 6: 'IS9WD_SIGNOFF_SET_AT'
};

// A to Q on the data tab, in column order.
var IS9WD_DEL_COL_NAMES = ['IS9WD_DEL_ID', 'IS9WD_DEL_COMMITTEE', 'IS9WD_DEL_TITLE',
  'IS9WD_DEL_DEADLINE', 'IS9WD_DEL_REMARK', 'IS9WD_DEL_STATUS', 'IS9WD_DEL_STATUS_AT',
  'IS9WD_DEL_STATUS_BY', 'IS9WD_DEL_CREATED_AT', 'IS9WD_DEL_CHECK', 'IS9WD_DEL_ACTIVE',
  'IS9WD_DEL_PUBKEY', 'IS9WD_DEL_RANK', 'IS9WD_DEL_PART', 'IS9WD_DEL_SLOTONPAGE',
  'IS9WD_DEL_PAGE', 'IS9WD_DEL_SLOTKEY'];

// Block A keys to the names the feed and the brief read them by. A.TOTAL carries no
// name, because 4.9 points at that cell by address; everything else is named.
var IS9WD_FEED_A_NAMES = {
  'A.TOTAL': 'IS9WD_FEED_TOTAL',
  'A.FLAGGED': 'IS9WD_FEED_FLAGGED', 'A.READY': 'IS9WD_FEED_READY',
  'A.ERRORS': 'IS9WD_FEED_ERRORS', 'A.PAGES': 'IS9WD_FEED_PAGES',
  'A.EXPORT': 'IS9WD_FEED_EXPORT', 'A.MASTER': 'IS9WD_FEED_MASTER',
  'A.NOTPUB': 'IS9WD_FEED_NOTPUB', 'A.CAPACITY': 'IS9WD_FEED_CAPCHECK',
  'A.PLAN': 'IS9WD_FEED_PLANCHECK', 'A.FLAGCAP': 'IS9WD_FEED_FLAGCHECK'
};

// IS9WD_DIR_PAGE is retired with the Page column it named. A formula still reading
// it is a formula that was not updated, so the self test asserts it does not
// resolve at all (4.8).
var IS9WD_RETIRED_NAMES = ['IS9WD_DIR_PAGE', 'IS9WD_MAX_OPEN'];

// { name, tab (a key of IS9WD_TAB), a1 }
function IS9WD_configNames_() {
  var out = [];
  var blocks = ['WEEK', 'SIGNOFF', 'SWITCHES', 'DIAGNOSTICS'];
  for (var b = 0; b < blocks.length; b++) {
    var rows = IS9WD_CFG[blocks[b]].rows;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].name) {
        out.push({ name: rows[i].name, tab: 'CONFIG', a1: IS9WD_a1_(rows[i].row, IS9WD_CFG.VALUE_COL, 1, 1) });
      }
    }
  }
  var w = IS9WD_CFG.WINDOWS;
  var wRows = w.lastRow - w.firstRow + 1;
  out.push({ name: 'IS9WD_WINDOW_NAMES', tab: 'CONFIG', a1: IS9WD_a1_(w.firstRow, 1, wRows, 1) });
  out.push({ name: 'IS9WD_HEX', tab: 'CONFIG', a1: IS9WD_a1_(w.firstRow, 3, wRows, 2) });

  var t = IS9WD_CFG.TERMS;
  var tRows = t.lastRow - t.firstRow + 1;
  out.push({ name: 'IS9WD_TERM_CAL', tab: 'CONFIG', a1: IS9WD_a1_(t.firstRow, 1, tRows, 3) });
  out.push({ name: 'IS9WD_TERM_STARTS', tab: 'CONFIG', a1: IS9WD_a1_(t.firstRow, 2, tRows, 1) });
  out.push({ name: 'IS9WD_TERM_ENDS', tab: 'CONFIG', a1: IS9WD_a1_(t.firstRow, 3, tRows, 1) });

  var s = IS9WD_CFG.STATUS;
  var sRows = s.lastRow - s.firstRow + 1;
  out.push({ name: 'IS9WD_STATUS_LIST', tab: 'CONFIG', a1: IS9WD_a1_(s.firstRow, 1, sRows, 1) });
  out.push({ name: 'IS9WD_STATUS_TERMINAL', tab: 'CONFIG', a1: IS9WD_a1_(s.firstRow, 2, sRows, 1) });
  out.push({ name: 'IS9WD_STATUS_HEX', tab: 'CONFIG', a1: IS9WD_a1_(s.firstRow, 3, sRows, 2) });
  out.push({ name: s.undoName, tab: 'CONFIG', a1: IS9WD_a1_(s.undoRow, IS9WD_CFG.VALUE_COL, 1, 1) });

  var j = IS9WD_CFG.SCHEDULE;
  out.push({
    name: 'IS9WD_SCHEDULE', tab: 'CONFIG',
    a1: IS9WD_a1_(j.firstRow, 1, j.lastRow - j.firstRow + 1, j.lastCol)
  });

  var d = IS9WD_CFG.DIRECTORY;
  var dRows = d.lastRow - d.firstRow + 1;
  out.push({ name: 'IS9WD_DIRECTORY', tab: 'CONFIG', a1: IS9WD_a1_(d.firstRow, 1, dRows, d.lastCol) });
  for (var dc in IS9WD_DIR_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_DIR_COL_NAMES, dc)) continue;
    out.push({
      name: IS9WD_DIR_COL_NAMES[dc], tab: 'CONFIG',
      a1: IS9WD_a1_(d.firstRow, Number(dc), dRows, 1)
    });
  }

  var st = IS9WD_CFG.STORE;
  var stRows = st.lastRow - st.firstRow + 1;
  // IS9WD_SIGNOFF is the six data columns, not the Check column beside them, which
  // is what Core's IS9WD_signoffFor reads row by row.
  out.push({ name: 'IS9WD_SIGNOFF', tab: 'CONFIG', a1: IS9WD_a1_(st.firstRow, 1, stRows, 6) });
  for (var sc in IS9WD_STORE_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STORE_COL_NAMES, sc)) continue;
    out.push({
      name: IS9WD_STORE_COL_NAMES[sc], tab: 'CONFIG',
      a1: IS9WD_a1_(st.firstRow, Number(sc), stRows, 1)
    });
  }
  return out;
}

function IS9WD_itemNames_() {
  var out = [];
  var rows = IS9WD_ITEMS.lastRow - IS9WD_ITEMS.firstRow + 1;
  for (var i = 0; i < IS9WD_DEL_COL_NAMES.length; i++) {
    out.push({
      name: IS9WD_DEL_COL_NAMES[i], tab: 'ITEMS',
      a1: IS9WD_a1_(IS9WD_ITEMS.firstRow, i + 1, rows, 1)
    });
  }
  return out;
}

function IS9WD_feedNames_(layout) {
  var f = layout || IS9WD_feed_();
  var out = [];
  var h = f.helperFirstCol;
  var officers = f.officerLast - f.officerFirst + 1;
  var plan = f.planLast - f.planFirst + 1;
  var flags = f.flagLast - f.flagFirst + 1;

  out.push({ name: 'IS9WD_RANGE_WEEK', tab: 'FEED', a1: IS9WD_a1_(1, h, 1, 1) });
  out.push({ name: 'IS9WD_RANGE_W1', tab: 'FEED', a1: IS9WD_a1_(2, h, 1, 1) });
  out.push({ name: 'IS9WD_RANGE_W2', tab: 'FEED', a1: IS9WD_a1_(3, h, 1, 1) });

  for (var i = 0; i < IS9WD_FEED_BLOCK_A.length; i++) {
    var key = IS9WD_FEED_BLOCK_A[i][0];
    if (!IS9WD_FEED_A_NAMES[key]) continue;
    out.push({
      name: IS9WD_FEED_A_NAMES[key], tab: 'FEED',
      a1: IS9WD_a1_(f.blockAFirst + i, 3, 1, 1)
    });
  }

  out.push({ name: 'IS9WD_OFFICER_NAME', tab: 'FEED', a1: IS9WD_a1_(f.officerFirst, h, officers, 1) });
  out.push({ name: 'IS9WD_COUNT_UNCAPPED', tab: 'FEED', a1: IS9WD_a1_(f.officerFirst, h + 2, officers, 1) });
  out.push({ name: 'IS9WD_OFFICER_ORDINAL', tab: 'FEED', a1: IS9WD_a1_(f.officerFirst, h + 3, officers, 1) });
  out.push({ name: 'IS9WD_NOTPUB', tab: 'FEED', a1: IS9WD_a1_(f.officerFirst, 9, officers, 1) });

  out.push({ name: 'IS9WD_PLAN_ORDINAL', tab: 'FEED', a1: IS9WD_a1_(f.planFirst, h, plan, 1) });
  out.push({ name: 'IS9WD_PLAN_PAGE', tab: 'FEED', a1: IS9WD_a1_(f.planFirst, 2, plan, 1) });
  out.push({ name: 'IS9WD_PLAN_USED', tab: 'FEED', a1: IS9WD_a1_(f.planFirst, 3, plan, 1) });
  out.push({ name: 'IS9WD_PLAN_POSITION', tab: 'FEED', a1: IS9WD_a1_(f.planFirst, 4, plan, 1) });
  out.push({ name: 'IS9WD_PLAN_PART', tab: 'FEED', a1: IS9WD_a1_(f.planFirst, 7, plan, 1) });
  out.push({ name: 'IS9WD_PLAN_COUNT', tab: 'FEED', a1: IS9WD_a1_(f.planFirst, 12, plan, 1) });

  out.push({ name: 'IS9WD_FLAGS', tab: 'FEED', a1: IS9WD_a1_(f.flagFirst, 1, flags, 7) });
  return out;
}

function IS9WD_allNames_(layout) {
  return IS9WD_configNames_()
    .concat(IS9WD_itemNames_())
    .concat(IS9WD_feedNames_(layout));
}

// ============================================================================
//  PROPERTY KEYS  (2.5, 5.2, 7.3: a token never touches a cell)
// ============================================================================

var IS9WD_PROP = {
  // Script Properties. One per directory row that holds a token, plus the admin.
  // K10 is Ethan's own row and carries no member token (4.8).
  TOKEN_PREFIX: 'IS9WD_TOKEN_',
  TOKEN_ADMIN: 'IS9WD_TOKEN_ADMIN',
  // Document Properties.
  NEXT_ID: 'IS9WD_NEXT_ID',
  SEED_RECORD: 'IS9WD_SEED_RECORD',
  DONE_PREFIX: 'IS9WD_DONE_',
  ALERT_PREFIX: 'IS9WD_ALERT_'
};

function IS9WD_tokenKey_(dirKey) {
  return IS9WD_PROP.TOKEN_PREFIX + IS9WD_trim_(dirKey).toUpperCase();
}

var IS9WD_ID_PREFIX = 'D';
var IS9WD_ID_DIGITS = 4;

// ============================================================================
//  SHARED HELPERS  (anything a second module would otherwise copy)
// ============================================================================

var IS9WD_SS_CACHE_ = null;

function IS9WD_ss_() {
  if (!IS9WD_SS_CACHE_) IS9WD_SS_CACHE_ = SpreadsheetApp.getActive();
  return IS9WD_SS_CACHE_;
}

// ---- tabs -----------------------------------------------------------------

// Developer metadata first, then the exact name. Renaming 02 | Deliverables in the
// tab bar would otherwise make the next repair build an empty twin under the old
// name and leave 2,000 real rows on a sheet nothing reads (section 3).
function IS9WD_sheetOrNull_(tabKey) {
  var key = IS9WD_trim_(tabKey).toUpperCase();
  var name = IS9WD_TAB[key];
  if (!name) throw new Error('Unknown tab key "' + tabKey + '".');
  var ss = IS9WD_ss_();
  var metaKey = IS9WD_TAB_META_PREFIX + key;
  var found = [];
  try {
    var hits = ss.createDeveloperMetadataFinder().withKey(metaKey).find();
    for (var i = 0; i < hits.length; i++) {
      var loc = hits[i].getLocation();
      if (loc.getLocationType() !== SpreadsheetApp.DeveloperMetadataLocationType.SHEET) continue;
      var sheet = loc.getSheet();
      if (sheet) found.push(sheet);
    }
  } catch (e) {
    // An older container or a restricted context: fall through to the name.
    found = [];
  }
  if (found.length > 1) {
    var names = [];
    for (var j = 0; j < found.length; j++) names.push(found[j].getName());
    throw new Error('Two sheets carry ' + metaKey + ': "' + names.join('" and "') +
      '". Delete the metadata on the copy, or delete the copy, then run Build or repair workbook.');
  }
  if (found.length === 1) return found[0];
  var byName = ss.getSheetByName(name);
  if (byName) {
    IS9WD_stampTab_(byName, key);
    return byName;
  }
  return null;
}

function IS9WD_sheet_(tabKey) {
  var sheet = IS9WD_sheetOrNull_(tabKey);
  if (!sheet) {
    throw new Error('The tab "' + IS9WD_TAB[IS9WD_trim_(tabKey).toUpperCase()] +
      '" is missing. Run IS9 Deliverables > Build or repair workbook.');
  }
  return sheet;
}

// Stamping is idempotent: one metadata entry per key per sheet, updated in place.
function IS9WD_stampTab_(sheet, tabKey) {
  var key = IS9WD_trim_(tabKey).toUpperCase();
  var metaKey = IS9WD_TAB_META_PREFIX + key;
  try {
    var mine = sheet.createDeveloperMetadataFinder().withKey(metaKey).find();
    if (mine && mine.length) {
      mine[0].setValue(IS9WD_TAB[key]);
      for (var i = 1; i < mine.length; i++) mine[i].remove();
      return;
    }
    sheet.addDeveloperMetadata(metaKey, IS9WD_TAB[key]);
  } catch (e) {
    // A read only context cannot stamp. Resolution by name still works.
  }
}

// ---- named ranges ---------------------------------------------------------

function IS9WD_namedOrNull_(name) {
  return IS9WD_ss_().getRangeByName(IS9WD_trim_(name));
}

function IS9WD_named_(name) {
  var range = IS9WD_namedOrNull_(name);
  if (!range) {
    throw new Error('The named range ' + IS9WD_trim_(name) +
      ' is missing. Run IS9 Deliverables > Build or repair workbook.');
  }
  return range;
}

// Re-points on the same name rather than creating a second one, which is the whole
// of idempotency for named ranges (2.5).
function IS9WD_setNamed_(name, range) {
  IS9WD_ss_().setNamedRange(IS9WD_trim_(name), range);
}

function IS9WD_dropNamed_(name) {
  var ss = IS9WD_ss_();
  var all = ss.getNamedRanges();
  var want = IS9WD_trim_(name);
  for (var i = 0; i < all.length; i++) {
    if (all[i].getName() === want) all[i].remove();
  }
}

// ---- lock and clock ------------------------------------------------------

// Every write path takes the document lock and releases it in a finally. A double
// click on Archive this week is otherwise two concurrent writers over one range,
// and the second one wins silently (reference 9).
function IS9WD_withLock_(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Someone else is saving right now. Try again in a moment.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// The real Manila clock, never effective today: keying an hour gate on the override
// would freeze every job behind a done key that never advances (8.2).
function IS9WD_nowManila_() {
  var parts = Utilities.formatDate(new Date(), IS9WD_TZ, 'yyyy,M,d,H,m,s').split(',');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]),
    Number(parts[3]), Number(parts[4]), Number(parts[5]));
}

function IS9WD_todayManila_() {
  var now = IS9WD_nowManila_();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function IS9WD_stampText_(date) {
  return Utilities.formatDate(IS9WD_isDate_(date) ? date : new Date(), IS9WD_TZ, 'yyyy-MM-dd HH:mm');
}

function IS9WD_dateKey_(date) {
  return Utilities.formatDate(IS9WD_isDate_(date) ? date : new Date(), IS9WD_TZ, 'yyyy-MM-dd');
}

// ---- style ---------------------------------------------------------------

function IS9WD_wrapStrategy_(wrap) {
  if (wrap === IS9WD_WRAP.WRAP) return SpreadsheetApp.WrapStrategy.WRAP;
  if (wrap === IS9WD_WRAP.OVER) return SpreadsheetApp.WrapStrategy.OVERFLOW;
  return SpreadsheetApp.WrapStrategy.CLIP;
}

// One place sets a font, a size and a colour, so no other module names any of the
// three. Body text is #085040 on #F8FBFD; #1C2120 is never a colour here.
function IS9WD_style_(range, o) {
  var opt = o || {};
  range.setFontFamily(IS9WD_FONT)
    .setFontSize(opt.size || IS9WD_SIZE.BODY)
    .setFontColor(opt.fg || IS9WD_ROLE.BODY_FG)
    .setFontWeight(opt.bold ? 'bold' : 'normal')
    .setFontStyle(opt.italic ? 'italic' : 'normal')
    .setHorizontalAlignment(opt.align || IS9WD_ALIGN.LEFT)
    .setVerticalAlignment('middle')
    .setWrapStrategy(IS9WD_wrapStrategy_(opt.wrap));
  if (opt.bg) range.setBackground(opt.bg);
  if (opt.format) range.setNumberFormat(opt.format);
  return range;
}

function IS9WD_textStyle_(size, fg, bold) {
  return SpreadsheetApp.newTextStyle()
    .setFontFamily(IS9WD_FONT).setFontSize(size).setForegroundColor(fg)
    .setBold(!!bold).build();
}

// A section title is a full width band with the one line of help riding at the end
// of the same cell, lighter and smaller. It rides there rather than in a row of its
// own because section 4 fixes every Configuration row, and a help row would push a
// block off its addresses.
function IS9WD_paintBand_(sheet, row, firstCol, lastCol, title, help) {
  var band = sheet.getRange(row, firstCol, 1, lastCol - firstCol + 1);
  band.setBackground(IS9WD_ROLE.BAND_BG);
  IS9WD_style_(band, {
    size: IS9WD_SIZE.BAND, fg: IS9WD_ROLE.BAND_FG, bold: true,
    align: IS9WD_ALIGN.LEFT, bg: IS9WD_ROLE.BAND_BG, wrap: IS9WD_WRAP.OVER
  });
  var cell = sheet.getRange(row, firstCol);
  var text = IS9WD_txt_(title);
  if (!IS9WD_blank_(help)) {
    var full = text + IS9WD_SEP + IS9WD_txt_(help);
    cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText(full)
      .setTextStyle(0, text.length, IS9WD_textStyle_(IS9WD_SIZE.BAND, IS9WD_ROLE.BAND_FG, true))
      .setTextStyle(text.length, full.length, IS9WD_textStyle_(IS9WD_SIZE.HINT, IS9WD_ROLE.BAND_HELP_FG, false))
      .build());
  } else {
    cell.setValue(text);
  }
  sheet.setRowHeight(row, IS9WD_ROW_H.BAND);
  return band;
}

function IS9WD_paintHeader_(sheet, row, firstCol, labels) {
  var range = sheet.getRange(row, firstCol, 1, labels.length);
  range.setValues([labels]);
  IS9WD_style_(range, {
    size: IS9WD_SIZE.HEAD, fg: IS9WD_ROLE.HEAD_FG, bold: true,
    align: IS9WD_ALIGN.CENTER, bg: IS9WD_ROLE.HEAD_BG, wrap: IS9WD_WRAP.WRAP,
    format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(row, IS9WD_ROW_H.HEAD);
  return range;
}

function IS9WD_paintBanner_(sheet, row, firstCol, lastCol, text) {
  var range = sheet.getRange(row, firstCol, 1, lastCol - firstCol + 1);
  IS9WD_style_(range, {
    size: IS9WD_SIZE.BANNER, fg: IS9WD_ROLE.BAND_FG, bold: true,
    align: IS9WD_ALIGN.LEFT, bg: IS9WD_ROLE.BAND_BG, wrap: IS9WD_WRAP.OVER,
    format: IS9WD_FMT.TEXT
  });
  sheet.getRange(row, firstCol).setValue(IS9WD_txt_(text));
  sheet.setRowHeight(row, IS9WD_ROW_H.BANNER);
  return range;
}

// One line under a banner saying what the tab is for, in the secondary colour.
function IS9WD_paintHelp_(sheet, row, firstCol, lastCol, text) {
  var range = sheet.getRange(row, firstCol, 1, lastCol - firstCol + 1);
  IS9WD_style_(range, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, align: IS9WD_ALIGN.LEFT,
    bg: IS9WD_ROLE.BODY_BG, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.getRange(row, firstCol).setValue(IS9WD_txt_(text));
  sheet.setRowHeight(row, IS9WD_ROW_H.HELP);
  return range;
}

// Number format, alignment and wrap per column across a block, three calls per
// column rather than one array per cell, so a 2,000 row block stays affordable.
function IS9WD_applyColumnStyles_(sheet, firstRow, numRows, firstCol, columns) {
  if (numRows < 1) return;
  for (var i = 0; i < columns.length; i++) {
    var col = columns[i];
    var range = sheet.getRange(firstRow, firstCol + i, numRows, 1);
    if (col.format) range.setNumberFormat(col.format);
    range.setHorizontalAlignment(col.align || IS9WD_ALIGN.LEFT);
    range.setWrapStrategy(IS9WD_wrapStrategy_(col.wrap));
  }
}

// Banding is removed by range before it is applied, because applying twice stacks
// two bandings and neither shows up on screen until the file is slow (2.5).
function IS9WD_banding_(range) {
  var existing = range.getBandings();
  for (var i = 0; i < existing.length; i++) existing[i].remove();
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  var bandings = range.getBandings();
  for (var j = 0; j < bandings.length; j++) {
    bandings[j].setFirstRowColor(IS9WD_ROLE.BAND_ROW_A)
      .setSecondRowColor(IS9WD_ROLE.BAND_ROW_B);
  }
  return range;
}

// The whole rule list is replaced, never appended to, for the same reason.
function IS9WD_setRules_(sheet, rules) {
  sheet.setConditionalFormatRules(rules || []);
}

function IS9WD_ruleFormula_(ranges, formula, o) {
  var opt = o || {};
  var builder = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formula)
    .setRanges(ranges);
  if (opt.bg) builder.setBackground(opt.bg);
  if (opt.fg) builder.setFontColor(opt.fg);
  if (opt.bold) builder.setBold(true);
  if (opt.italic) builder.setItalic(true);
  return builder.build();
}

// ---- validation ----------------------------------------------------------

// A whole number range is a custom formula rather than the number-between
// criterion, because number-between accepts 10.5 and every one of these numbers is
// arithmetic over slot keys or hours (4.6, 4.7).
function IS9WD_validation_(spec, a1, row) {
  if (!spec || !spec.kind) return null;
  var b = SpreadsheetApp.newDataValidation().setAllowInvalid(false);
  if (spec.help) b.setHelpText(spec.help);
  if (spec.kind === IS9WD_V.DATE) return b.requireDate().build();
  if (spec.kind === IS9WD_V.CHECKBOX) return b.requireCheckbox().build();
  if (spec.kind === IS9WD_V.VALUE_LIST) return b.requireValueInList(spec.values, true).build();
  if (spec.kind === IS9WD_V.NAMED_LIST) {
    return b.requireValueInRange(IS9WD_named_(spec.source), true).build();
  }
  if (spec.kind === IS9WD_V.INT) {
    var min = IS9WD_num_(spec.min);
    var max = IS9WD_num_(spec.max);
    var f = '=AND(ISNUMBER(' + a1 + '),' + a1 + '=INT(' + a1 + ')';
    if (min !== null) f += ',' + a1 + '>=' + min;
    if (max !== null) f += ',' + a1 + '<=' + max;
    return b.requireFormulaSatisfied(f + ')').build();
  }
  if (spec.kind === IS9WD_V.FORMULA) {
    // {row} is the cell's own row, so one declared rule covers 2,000 rows.
    return b.requireFormulaSatisfied(
      IS9WD_txt_(spec.formula).replace(/\{row\}/g, String(row))).build();
  }
  return null;
}

// Set over the full block, one column at a time, so a rule a paste left behind is
// cleared rather than kept: a column with no spec gets nulls.
function IS9WD_applyValidations_(sheet, firstRow, numRows, firstCol, columns) {
  if (numRows < 1) return;
  for (var i = 0; i < columns.length; i++) {
    var col = firstCol + i;
    var range = sheet.getRange(firstRow, col, numRows, 1);
    var spec = columns[i].validate;
    var out = [];
    for (var r = 0; r < numRows; r++) {
      var row = firstRow + r;
      out.push([spec ? IS9WD_validation_(spec, IS9WD_a1_(row, col, 1, 1), row) : null]);
    }
    range.setDataValidations(out);
  }
}

function IS9WD_applyRowValidations_(sheet, rows, valueCol) {
  for (var i = 0; i < rows.length; i++) {
    var cell = sheet.getRange(rows[i].row, valueCol);
    cell.setDataValidation(rows[i].validate
      ? IS9WD_validation_(rows[i].validate, IS9WD_a1_(rows[i].row, valueCol, 1, 1), rows[i].row)
      : null);
  }
}

// ---- grid ----------------------------------------------------------------

function IS9WD_setWidths_(sheet, tabKey) {
  var widths = IS9WD_WIDTH[IS9WD_trim_(tabKey).toUpperCase()];
  if (!widths) return;
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
}

function IS9WD_hideCols_(sheet, tabKey) {
  var spans = IS9WD_HIDE_COLS[IS9WD_trim_(tabKey).toUpperCase()];
  if (!spans) return;
  for (var i = 0; i < spans.length; i++) {
    sheet.hideColumns(spans[i].first, spans[i].last - spans[i].first + 1);
  }
}

function IS9WD_freezeTab_(sheet, tabKey) {
  var f = IS9WD_FREEZE[IS9WD_trim_(tabKey).toUpperCase()];
  if (!f) return;
  sheet.setFrozenRows(f.rows);
  sheet.setFrozenColumns(f.cols);
}

function IS9WD_ensureGrid_(sheet, rows, cols) {
  var maxRows = sheet.getMaxRows();
  if (rows > maxRows) sheet.insertRowsAfter(maxRows, rows - maxRows);
  var maxCols = sheet.getMaxColumns();
  if (cols > maxCols) sheet.insertColumnsAfter(maxCols, cols - maxCols);
}

function IS9WD_setDataHeights_(sheet, firstRow, numRows) {
  if (numRows < 1) return;
  sheet.setRowHeights(firstRow, numRows, IS9WD_ROW_H.DATA);
}

// Gridlines stay on everywhere, by Ethan's decision: they are the cheapest
// alignment cue in a wide sheet, and fills here are used for bands and banding
// only, never to fake a grid (2.5). Nothing in this project calls
// setHiddenGridlines(true), and this note is the reason why.
function IS9WD_isPaletteHex_(hex) {
  var want = IS9WD_trim_(hex).toLowerCase();
  for (var i = 0; i < IS9WD_PALETTE.length; i++) {
    if (IS9WD_PALETTE[i].toLowerCase() === want) return true;
  }
  return false;
}

// ============================================================================
//  THE READER  (one typed object, read only through named ranges)
// ============================================================================

// Every value below is located by resolving a named range and then indexed out of a
// single read of the Configuration block. The address always comes from the name, so
// no reader knows a cell address, and one snapshot is one round trip rather than
// sixty. The endpoint is rate limited and reads this on every request (7.6).

var IS9WD_CONFIG_CACHE_ = null;

// Call after any write to Configuration, or the next reader in the same execution
// answers from before the write.
function IS9WD_configReset_() {
  IS9WD_CONFIG_CACHE_ = null;
}

// One bulk fetch of every named range, so resolving sixty names costs one call.
function IS9WD_namedMap_() {
  var all = IS9WD_ss_().getNamedRanges();
  var map = {};
  for (var i = 0; i < all.length; i++) {
    map[all[i].getName()] = all[i].getRange();
  }
  return map;
}

function IS9WD_cfgSnapshot_() {
  var sheet = IS9WD_sheet_('CONFIG');
  var rows = Math.max(sheet.getLastRow(), IS9WD_CFG.STORE.lastRow);
  var cols = Math.max(sheet.getLastColumn(), IS9WD_CFG.LAST_COL);
  return {
    sheet: sheet,
    name: sheet.getName(),
    rows: rows,
    cols: cols,
    values: sheet.getRange(1, 1, rows, cols).getValues(),
    names: IS9WD_namedMap_()
  };
}

// { row, col, rows, cols, values }. A name that resolves off the snapshot, which is
// what a moved block looks like, is read directly rather than guessed at.
function IS9WD_read_(snap, name) {
  var range = snap.names[name];
  if (!range) {
    throw new Error('The named range ' + name +
      ' is missing. Run IS9 Deliverables > Build or repair workbook.');
  }
  var on = range.getSheet().getName();
  if (on !== snap.name) {
    throw new Error('The named range ' + name + ' points at "' + on + '" instead of "' +
      snap.name + '". Run IS9 Deliverables > Build or repair workbook.');
  }
  var box = {
    row: range.getRow(), col: range.getColumn(),
    rows: range.getNumRows(), cols: range.getNumColumns()
  };
  if (box.row + box.rows - 1 > snap.rows || box.col + box.cols - 1 > snap.cols) {
    box.values = range.getValues();
    return box;
  }
  var out = [];
  for (var r = 0; r < box.rows; r++) {
    var line = [];
    for (var c = 0; c < box.cols; c++) {
      line.push(snap.values[box.row - 1 + r][box.col - 1 + c]);
    }
    out.push(line);
  }
  box.values = out;
  return box;
}

function IS9WD_readCell_(snap, name) {
  return IS9WD_read_(snap, name).values[0][0];
}

// ---- sections -------------------------------------------------------------

function IS9WD_readWeeks_(snap) {
  var override = IS9WD_readCell_(snap, 'IS9WD_TODAY_OVERRIDE');
  var weekOverride = IS9WD_readCell_(snap, 'IS9WD_WEEK_NUMBER_OVERRIDE');
  return {
    todayOverride: IS9WD_midnight_(override),
    todayOverrideSet: IS9WD_filled_(override),
    effectiveToday: IS9WD_midnight_(IS9WD_readCell_(snap, 'IS9WD_EFFECTIVE_TODAY')),
    weekStart: IS9WD_midnight_(IS9WD_readCell_(snap, 'IS9WD_WEEK_START')),
    weekEnd: IS9WD_midnight_(IS9WD_readCell_(snap, 'IS9WD_WEEK_END')),
    termActive: IS9WD_txt_(IS9WD_readCell_(snap, 'IS9WD_TERM_ACTIVE')),
    termStart: IS9WD_midnight_(IS9WD_readCell_(snap, 'IS9WD_TERM_START')),
    weekNumber: IS9WD_int_(IS9WD_readCell_(snap, 'IS9WD_WEEK_NUMBER')),
    weekNumberOverride: IS9WD_int_(weekOverride),
    weekNumberOverrideSet: IS9WD_filled_(weekOverride),
    inTerm: IS9WD_bool_(IS9WD_readCell_(snap, 'IS9WD_IN_TERM')),
    ayLabel: IS9WD_txt_(IS9WD_readCell_(snap, 'IS9WD_AY_LABEL')),
    cutoffText: IS9WD_txt_(IS9WD_readCell_(snap, 'IS9WD_CUTOFF_TEXT'))
  };
}

function IS9WD_readWindows_(snap) {
  var names = IS9WD_read_(snap, 'IS9WD_WINDOW_NAMES');
  var hex = IS9WD_read_(snap, 'IS9WD_HEX');
  var out = { names: [], rows: [], byWindow: {}, raw: hex.values };
  for (var i = 0; i < names.values.length; i++) {
    var win = IS9WD_trim_(names.values[i][0]);
    var row = hex.values[i] || ['', ''];
    var pair = { station: IS9WD_trim_(row[0]), numberText: IS9WD_trim_(row[1]) };
    out.names.push(win);
    out.rows.push({ window: win, station: pair.station, numberText: pair.numberText });
    if (win !== '') out.byWindow[win] = pair;
  }
  return out;
}

function IS9WD_readTerms_(snap) {
  var cal = IS9WD_read_(snap, 'IS9WD_TERM_CAL');
  var rows = [];
  for (var i = 0; i < cal.values.length; i++) {
    var r = cal.values[i];
    if (IS9WD_blank_(r[0]) && !IS9WD_isDate_(r[1])) continue;
    rows.push({
      name: IS9WD_txt_(r[0]),
      start: IS9WD_midnight_(r[1]),
      end: IS9WD_midnight_(r[2]),
      row: cal.row + i
    });
  }
  return { rows: rows, raw: cal.values, firstRow: cal.row };
}

// The derived Active flag is the only thing anything keys on, so the reader hands
// back both the raw pairs Core reads and the two labels the app needs for a chip.
function IS9WD_readStatuses_(snap) {
  var list = IS9WD_read_(snap, 'IS9WD_STATUS_LIST');
  var term = IS9WD_read_(snap, 'IS9WD_STATUS_TERMINAL');
  var hex = IS9WD_read_(snap, 'IS9WD_STATUS_HEX');
  var rows = [];
  var raw = [];
  for (var i = 0; i < list.values.length; i++) {
    var name = IS9WD_trim_(list.values[i][0]);
    if (name === '') continue;
    var terminal = IS9WD_bool_(term.values[i] ? term.values[i][0] : false);
    var paint = hex.values[i] || ['', ''];
    rows.push({
      name: name, terminal: terminal,
      chipHex: IS9WD_trim_(paint[0]), chipTextHex: IS9WD_trim_(paint[1]),
      row: list.row + i
    });
    raw.push([name, terminal]);
  }
  var open = '';
  var done = '';
  for (var j = 0; j < rows.length; j++) {
    if (!rows[j].terminal && open === '') open = rows[j].name;
    if (rows[j].terminal && done === '') done = rows[j].name;
  }
  return {
    rows: rows, raw: raw, names: rows.map(function (r) { return r.name; }),
    defaultStatus: open, terminalStatus: done,
    undoSeconds: IS9WD_int_(IS9WD_readCell_(snap, 'IS9WD_UNDO_SECONDS'))
  };
}

function IS9WD_readSwitches_(snap) {
  var b = function (n) { return IS9WD_bool_(IS9WD_readCell_(snap, n)); };
  var i = function (n) { return IS9WD_int_(IS9WD_readCell_(snap, n)); };
  var s = function (n) { return IS9WD_trim_(IS9WD_readCell_(snap, n)); };
  var out = {
    automationOn: b('IS9WD_AUTOMATION_ON'),
    testMode: b('IS9WD_TEST_MODE'),
    mailMonday: b('IS9WD_MAIL_MONDAY'),
    mailDaily: b('IS9WD_MAIL_DAILY'),
    mailSunday: b('IS9WD_MAIL_SUNDAY'),
    mailAlert: b('IS9WD_MAIL_ALERT'),
    mailNoReply: b('IS9WD_MAIL_NOREPLY'),
    appOn: b('IS9WD_APP_ON'),
    slotsPerPage: i('IS9WD_SLOTS_PER_PAGE'),
    maxParts: i('IS9WD_MAX_PARTS'),
    publishMax: i('IS9WD_PUBLISH_MAX'),
    publishEmptyPages: b('IS9WD_PUBLISH_EMPTY_PAGES'),
    quotaReserve: i('IS9WD_QUOTA_RESERVE'),
    retireDays: i('IS9WD_RETIRE_DAYS'),
    tokenWarnDays: i('IS9WD_TOKEN_WARN_DAYS'),
    adminEmail: s('IS9WD_ADMIN_EMAIL'),
    automationOwner: s('IS9WD_AUTOMATION_OWNER'),
    replyTo: s('IS9WD_REPLY_TO'),
    senderName: s('IS9WD_SENDER_NAME'),
    appBaseUrl: s('IS9WD_APP_BASE_URL'),
    endpointUrl: s('IS9WD_ENDPOINT_URL'),
    transport: s('IS9WD_TRANSPORT'),
    readerEmail: s('IS9WD_READER_EMAIL'),
    heartbeat: IS9WD_readCell_(snap, 'IS9WD_HEARTBEAT'),
    lastOwner: s('IS9WD_LAST_OWNER')
  };
  // The three capacity numbers can disagree, and every slot key in the workbook is
  // arithmetic over them, so the reader states it rather than leaving it to a cell.
  out.capacityOk = out.publishMax !== null && out.slotsPerPage !== null &&
    out.maxParts !== null && out.publishMax === out.slotsPerPage * out.maxParts;
  return out;
}

function IS9WD_readSchedule_(snap) {
  var block = IS9WD_read_(snap, 'IS9WD_SCHEDULE');
  var rows = [];
  for (var i = 0; i < block.values.length; i++) {
    var r = block.values[i];
    if (IS9WD_blank_(r[0])) continue;
    rows.push({
      jobKey: IS9WD_trim_(r[0]),
      runs: IS9WD_trim_(r[1]),
      day: IS9WD_trim_(r[2]),
      hour: IS9WD_int_(r[3]),
      catchUp: IS9WD_int_(r[4]),
      on: IS9WD_bool_(r[5]),
      check: IS9WD_trim_(r[6]),
      lastRun: r[7],
      lastStatus: IS9WD_txt_(r[8]),
      row: block.row + i
    });
  }
  return { rows: rows, raw: block.values, firstRow: block.row, lastCol: block.col + block.cols - 1 };
}

// Fourteen rows in key order. Hierarchy order is the order every list a person reads
// is sorted by; carousel order is the master page arithmetic and nothing else (4.8).
function IS9WD_readDirectory_(snap) {
  var block = IS9WD_read_(snap, 'IS9WD_DIRECTORY');
  var rows = [];
  var byKey = {};
  var byCommittee = {};
  for (var i = 0; i < block.values.length; i++) {
    var r = block.values[i];
    if (IS9WD_blank_(r[0])) continue;
    var entry = {
      key: IS9WD_trim_(r[0]).toUpperCase(),
      carouselOrder: IS9WD_int_(r[1]),
      committee: IS9WD_txt_(r[2]),
      fullName: IS9WD_txt_(r[3]),
      position: IS9WD_txt_(r[4]),
      email: IS9WD_trim_(r[5]),
      tokenPrefix: IS9WD_trim_(r[6]),
      tokenIssued: IS9WD_midnight_(r[7]),
      revoked: IS9WD_bool_(r[8]),
      check: IS9WD_trim_(r[9]),
      publishes: IS9WD_bool_(r[10]),
      hierarchy: IS9WD_int_(r[11]),
      row: block.row + i
    };
    rows.push(entry);
    byKey[entry.key] = entry;
    if (entry.committee !== '') byCommittee[entry.committee.toLowerCase()] = entry;
  }
  var publishing = rows.filter(function (e) {
    return e.publishes === true && e.carouselOrder !== null;
  }).sort(function (a, b) { return a.carouselOrder - b.carouselOrder; });
  var inHierarchy = rows.slice().sort(function (a, b) {
    var x = a.hierarchy === null ? 99 : a.hierarchy;
    var y = b.hierarchy === null ? 99 : b.hierarchy;
    return x - y;
  });
  return {
    rows: rows, raw: block.values, firstRow: block.row, lastRow: block.row + block.rows - 1,
    byKey: byKey, byCommittee: byCommittee,
    publishing: publishing, publishingRows: publishing.length,
    inHierarchy: inHierarchy
  };
}

// The store is append or replace by week and never cleared, which is what lets the
// Archive say who signed off on a week after the names have moved on (4.5).
function IS9WD_readSignoff_(snap, weekStart) {
  var block = IS9WD_read_(snap, 'IS9WD_SIGNOFF');
  var rows = [];
  var used = 0;
  for (var i = 0; i < block.values.length; i++) {
    var r = block.values[i];
    if (!IS9WD_filled_(r[0])) continue;
    used++;
    rows.push({
      weekStart: IS9WD_midnight_(r[0]),
      preparedName: IS9WD_txt_(r[1]),
      preparedPosition: IS9WD_txt_(r[2]),
      checkedName: IS9WD_txt_(r[3]),
      checkedPosition: IS9WD_txt_(r[4]),
      setAt: r[5],
      row: block.row + i
    });
  }
  return {
    rows: rows,
    raw: block.values,
    firstRow: block.row,
    lastRow: block.row + block.rows - 1,
    usedRows: used,
    freeRows: block.rows - used,
    growBy: IS9WD_CFG.STORE.growBy,
    minFreeRows: IS9WD_CFG.STORE.minFreeRows,
    current: IS9WD_signoffFor(weekStart, block.values),
    derivedSet: IS9WD_bool_(IS9WD_readCell_(snap, 'IS9WD_SIGNOFF_SET')),
    preparedName: IS9WD_txt_(IS9WD_readCell_(snap, 'IS9WD_PREPARED_NAME')),
    preparedPosition: IS9WD_txt_(IS9WD_readCell_(snap, 'IS9WD_PREPARED_POSITION')),
    checkedName: IS9WD_txt_(IS9WD_readCell_(snap, 'IS9WD_CHECKED_NAME')),
    checkedPosition: IS9WD_txt_(IS9WD_readCell_(snap, 'IS9WD_CHECKED_POSITION'))
  };
}

// ---- the one entry point --------------------------------------------------

function IS9WD_readConfig_(force) {
  if (!force && IS9WD_CONFIG_CACHE_) return IS9WD_CONFIG_CACHE_;
  var snap = IS9WD_cfgSnapshot_();
  var weeks = IS9WD_readWeeks_(snap);
  var cfg = {
    weeks: weeks,
    windows: IS9WD_readWindows_(snap),
    terms: IS9WD_readTerms_(snap),
    statuses: IS9WD_readStatuses_(snap),
    switches: IS9WD_readSwitches_(snap),
    schedule: IS9WD_readSchedule_(snap),
    directory: IS9WD_readDirectory_(snap),
    signoff: IS9WD_readSignoff_(snap, weeks.weekStart),
    readAt: new Date()
  };
  // The feed's size follows from the publish set and the two capacity numbers, so
  // every module that touches a feed row asks the config for the layout rather
  // than assuming the shipping one.
  cfg.feed = IS9WD_feedLayout_(cfg.directory.publishingRows, cfg.switches.slotsPerPage,
    cfg.switches.maxParts, cfg.directory.rows.length);
  IS9WD_CONFIG_CACHE_ = cfg;
  return cfg;
}

// Which expected names do not resolve, and which retired ones still do. The self
// test reads both lists; a retired name that resolves is a formula nobody updated.
function IS9WD_nameAudit_(layout) {
  var map = IS9WD_namedMap_();
  var want = IS9WD_allNames_(layout);
  var missing = [];
  for (var i = 0; i < want.length; i++) {
    if (!map[want[i].name]) missing.push(want[i].name);
  }
  var retired = [];
  for (var j = 0; j < IS9WD_RETIRED_NAMES.length; j++) {
    if (map[IS9WD_RETIRED_NAMES[j]]) retired.push(IS9WD_RETIRED_NAMES[j]);
  }
  return { missing: missing, retiredPresent: retired, expected: want.length };
}

// ============================================================================
//  WARNING PROTECTIONS  (reference 5.6, built from the layout, not typed)
// ============================================================================

// Every protection carries this prefix in its description, and Apply sheet guards
// removes only its own before re-creating them: removing every protection it finds
// would delete one Ethan added by hand, and appending would stack duplicates on
// every run.
var IS9WD_GUARD_PREFIX = 'IS9WD guard: ';

// { tab, a1, whole, description }. whole means the sheet rather than a range.
// Publishes (K79:K92) is deliberately absent: it is the one cell Ethan is meant to
// edit to change the publish set, and a warning prompt there would be a prompt on
// the intended action (4.8).
function IS9WD_guardRanges_() {
  var c = IS9WD_CFG;
  var out = [];
  var add = function (tab, a1) {
    out.push({
      tab: tab, a1: a1, whole: !a1,
      description: IS9WD_GUARD_PREFIX + IS9WD_TAB[tab] + ' ' + (a1 || 'whole tab')
    });
  };

  // The derived week cells, the two override notes and every Check column.
  add('CONFIG', IS9WD_a1_(c.WEEK.firstRow + 1, c.VALUE_COL, 7, 1));
  add('CONFIG', IS9WD_a1_(c.WEEK.lastRow, c.NOTE_COL, 1, 1));
  add('CONFIG', IS9WD_a1_(c.WINDOWS.firstRow, c.WINDOWS.checkCol,
    c.WINDOWS.lastRow - c.WINDOWS.firstRow + 1, 1));
  add('CONFIG', IS9WD_a1_(c.TERMS.firstRow, c.TERMS.checkCol,
    c.TERMS.lastRow - c.TERMS.firstRow + 1, 1));
  add('CONFIG', IS9WD_a1_(c.SIGNOFF.firstRow, c.VALUE_COL,
    c.SIGNOFF.lastRow - c.SIGNOFF.firstRow + 1, 1));
  add('CONFIG', IS9WD_a1_(c.SIGNOFF.firstRow, c.NOTE_COL, 1, 1));

  // The derived publishable maximum and its guard, which is the pair a paste breaks.
  var pubMax = 0;
  for (var i = 0; i < c.SWITCHES.rows.length; i++) {
    if (c.SWITCHES.rows[i].name === 'IS9WD_PUBLISH_MAX') pubMax = c.SWITCHES.rows[i].row;
  }
  if (pubMax) add('CONFIG', IS9WD_a1_(pubMax, c.VALUE_COL, 1, 2));

  var d = c.DIRECTORY;
  var dRows = d.lastRow - d.firstRow + 1;
  add('CONFIG', IS9WD_a1_(d.firstRow, 1, dRows, 2));            // keys and carousel order
  add('CONFIG', IS9WD_a1_(d.firstRow, 7, dRows, 3));            // token prefix to revoked
  add('CONFIG', IS9WD_a1_(d.firstRow, d.checkCol, dRows, 1));   // check
  add('CONFIG', IS9WD_a1_(d.firstRow, 12, dRows, 1));           // hierarchy order

  add('CONFIG', IS9WD_a1_(c.DIAGNOSTICS.firstRow, 1,
    c.DIAGNOSTICS.lastRow - c.DIAGNOSTICS.firstRow + 1, 3));

  // The store grows in 52 row steps, and Apply sheet guards is always its own
  // execution, so the declared last row goes stale the first time it grows.
  var storeLast = c.STORE.lastRow;
  var storeRange = IS9WD_namedOrNull_('IS9WD_SIGNOFF_WEEKS');
  if (storeRange) {
    storeLast = Math.max(storeLast, storeRange.getRow() + storeRange.getNumRows() - 1);
  }
  add('CONFIG', IS9WD_a1_(c.STORE.firstRow, 6,
    storeLast - c.STORE.firstRow + 1, 2));                      // Set at and Check

  // The derived block on the data tab, and the three tabs nobody types into.
  add('ITEMS', IS9WD_a1_(IS9WD_ITEMS.firstRow, IS9WD_ITEMS.derivedFirstCol,
    IS9WD_ITEMS.lastRow - IS9WD_ITEMS.firstRow + 1,
    IS9WD_ITEMS.derivedLastCol - IS9WD_ITEMS.derivedFirstCol + 1));
  add('FEED', '');
  add('ARCHIVE', '');
  add('LOG', '');
  return out;
}
