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

// Seven tabs. The two views were inserted at 03 and 04 rather than appended, so the
// numbers carry the reading order a person needs: settings, the machine contract,
// entry, the two views, history, the hidden log. The Archive and the Log were
// renumbered with them, which is safe because setup resolves every tab by its
// developer metadata key first and only then by name (section 3).
//
// THE FEED'S POSITION IS STATED BY ITS REASON, NOT BY A NUMBER. Ethan ruled on
// 2026-09-28 that 00 | Dashboard takes the front of the reading order, so the feed is the
// third tab rather than the second. The constraint it was protecting is unchanged and is
// still met: a truncated Drive connector read must lose the Archive and the Log before it
// loses a contract string, so the feed has to sit ahead of 03 | Deliverables,
// 04 | Statistics, 05 | Officer Tables, 06 | Archive and 07 | Log, and it does. Two tabs
// now precede it and neither is large: the Dashboard is 24 rows and Configuration is 67.
// The feed also shrank on the same day, from 579 rows to 536, so the read has more room
// ahead of the contract strings than it had before this change, not less (10.1).
var IS9WD_TAB = {
  // The front door, added on Ethan's instruction of 2026-09-28. Read only, nothing on it
  // is typed and no cell on it is cream. It exists because the machine's own state lived
  // only on _Views, which is hidden, so nothing Ethan could see said whether the
  // dispatcher had run, whether TEST mode was on or whether a job had failed.
  DASHBOARD: '00 | Dashboard',
  CONFIG: '01 | Configuration',
  FEED: '02 | Canva Feed',
  ITEMS: '03 | Deliverables',
  STATS: '04 | Statistics',
  TABLES: '05 | Officer Tables',
  ARCHIVE: '06 | Archive',
  LOG: '07 | Log',
  // The two hidden machine tabs, added on Ethan's instruction of 2026-09-27: "you may
  // add tabs for your use but hide it". They carry the leading underscore so they sort
  // and read as not part of the numbered reading order.
  //
  // _Engine is every setting that exists for the code rather than for a president: the
  // hex pairs Canva consumes, the status vocabulary, the job schedule, the carousel
  // capacity numbers, the mail plumbing, the statistics thresholds, the diagnostics, the
  // directory's token and ordinal columns, and the weekly sign-off store.
  //
  // _Views is the helper band both computed views used to hide inside themselves. It
  // exists so 03 | Statistics is twelve visible columns and nothing else, and so a
  // developer unhiding a column on a tab Ethan reads is impossible rather than merely
  // unlikely.
  ENGINE: '_Engine',
  VIEWS: '_Views'
};

// Left to right in the tab bar. Setup also uses it to order a repaired workbook. The two
// hidden machine tabs sit after the Log, so the eight numbered tabs hold positions 1 to 8
// and the feed holds position 3, which is ahead of every tab a truncated read may lose.
var IS9WD_TAB_ORDER = ['DASHBOARD', 'CONFIG', 'FEED', 'ITEMS', 'STATS', 'TABLES',
  'ARCHIVE', 'LOG', 'ENGINE', 'VIEWS'];

// Renaming a tab in the tab bar must not make the next repair build an empty twin
// under the old name and strand 2,000 real rows on a sheet nothing reads.
var IS9WD_TAB_META_PREFIX = 'IS9WD_TAB_';

// 06 | Log, _Engine and _Views are hidden. Hiding is not a security boundary: the Canva
// reader can read every cell of every tab, hidden or not, which is why no token is ever
// in one. 01 | Canva Feed is deliberately NOT here: whether the Drive connector includes
// a hidden tab in its read is unmeasured, and the whole Sunday run depends on reading
// that tab, so hiding it would risk the one thing this build exists for.
var IS9WD_HIDDEN_TABS = ['LOG', 'ENGINE', 'VIEWS'];

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
  // A FLAG CARRIES NO FILL AT ALL. Ethan's instruction of 2026-09-27: cream means exactly
  // one thing in this workbook, "you type here", and the old flag style painted cream
  // behind bold #724485 on calculated Check cells, which is the one place a reader must
  // never type. So a flag is bold #724485 on the paper white. Nothing outside the input set
  // is ever cream again.
  //
  // There is no FLAG_BORDER, and there never can be: every flag in this workbook is a
  // conditional format rule, and a conditional format rule in Sheets cannot set a border.
  // One was declared here for months and drawn nowhere, which read as an oversight rather
  // than as the impossibility it is.
  FLAG_FG: IS9WD_CLR.PURPLE_STRONG,
  FLAG_BG: IS9WD_CLR.PAPER,
  MUTED_FG: IS9WD_CLR.LILAC,
  // A CARD on a computed view: the heading band, its text, the body behind the table and
  // the border around the whole of it. Ethan's instruction of 2026-09-27 named all four:
  // "a header band in #5d4170 with #F8FBFD text, a body on #F8FBFD, and a border around the
  // whole table in #58756a or #5d4170". The deep green band belongs to the settings tabs,
  // where a band is a section of one long document rather than the lid of a card.
  CARD_BAND_BG: IS9WD_CLR.PURPLE_DEEP,
  CARD_BAND_FG: IS9WD_CLR.PAPER,
  CARD_BODY_BG: IS9WD_CLR.PAPER,
  CARD_BORDER: IS9WD_CLR.SAGE,
  // A CARD OPENS AS BAND, THEN HEADER, THEN BODY. The band and the header were both
  // #5d4170 and they sit on adjacent rows, so a card began with one unbroken 68 px block of
  // deep purple and nothing told its heading from its column labels. The header takes the
  // sage now, which is a step down in weight and still carries #F8FBFD text.
  CARD_HEAD_BG: IS9WD_CLR.SAGE,
  // Cream is the one signal this workbook cannot afford to blur: it means a cell is
  // Ethan's to type into. Banding used it as its alternate row, which painted cream
  // across calculated rows on three blocks and made the signal meaningless. Both band
  // rows are the paper white now, so gridlines carry the row rhythm, which is what
  // they are on for.
  BAND_ROW_A: IS9WD_CLR.PAPER,
  BAND_ROW_B: IS9WD_CLR.PAPER
};

// The palette holds exactly seven colours that are not the page background, so the
// seven numbered tabs consume it exactly. The two hidden machine tabs forced the reuse
// decision the earlier note predicted, and it is taken here rather than by inventing a
// colour: both take the page background, because a tab that is not part of the reading
// order should not claim a colour from it.
// EIGHT NUMBERED TABS, SEVEN COLOURS, AND NOT ONE SHARED. Ethan ruled on 2026-09-28.
// The Log joins _Engine and _Views on the page background, on the rule already written
// here: a tab outside the reading order does not claim a colour from it, and the Log is
// hidden. That leaves exactly seven colours for the seven VISIBLE numbered tabs, so no
// two tabs in the reading order look alike.
//
// Cream moved to 01 | Configuration in the same ruling. #e9ebd4 means one thing in this
// workbook, "yours to type into", and it was sitting on the tab whose own help line says
// there is nothing to fill in here, while the tab that is almost entirely input cells
// wore #5d4170. The single meaning bearing colour was pointing at the wrong tab.
var IS9WD_TAB_COLOR = {
  DASHBOARD: IS9WD_CLR.PURPLE_DEEP,
  CONFIG: IS9WD_CLR.CREAM,
  FEED: IS9WD_CLR.GREEN_DEEP,
  ITEMS: IS9WD_CLR.PURPLE_BRIGHT,
  STATS: IS9WD_CLR.PURPLE_STRONG,
  TABLES: IS9WD_CLR.LILAC,
  ARCHIVE: IS9WD_CLR.SAGE,
  LOG: IS9WD_CLR.PAPER,
  ENGINE: IS9WD_CLR.PAPER,
  VIEWS: IS9WD_CLR.PAPER
};

var IS9WD_FONT = 'Poppins';
var IS9WD_TZ = 'Asia/Manila';

// ONE TYPE SCALE, AND EVERY ROLE CLEAR OF THE ONE BELOW IT. HEAD and BODY were both 10,
// so a table header had no type contrast against its own body and there was no visible
// hierarchy between a tab, a card and a table on it. That is half of why the computed tabs
// read as a wall: the eye had nothing to climb.
//
// TILE is the KPI number on 04 | Statistics. It is the one size on the workbook that exists
// to be read from across a desk rather than at arm's length, which is what makes a dashboard
// read as a dashboard instead of as a table of numbers. TILE_LABEL is the small word above
// it, and it is BODY rather than HINT so a tile reads as one object.
var IS9WD_SIZE = {
  BANNER: 18, BAND: 13, HEAD: 11, BODY: 10, HINT: 9, TILE: 26, TILE_LABEL: 10
};

// 26 for data and 38 for a section title, so a 12 row block reads as a block. BAND grew
// from 34 and SPACER from 12 on Ethan's instruction of 2026-09-27: taller bands, more
// air. HINT is the row that carries a block's plain English explanation under its
// heading rather than crammed beside it.
var IS9WD_ROW_H = {
  BANNER: 46, HELP: 34, BAND: 38, HINT: 26, HEAD: 30, DATA: 26, SPACER: 18,
  TILE: 46, TILE_LABEL: 22, TILE_NOTE: 22
};

var IS9WD_SEP = '  ·  ';

// The phrase IS9WD_SelfTest.js puts in its summary line when something failed, and
// the phrase 03 | Statistics tests that line for. It lives here rather than in either
// file because it is shared vocabulary: two copies of it are two strings that drift,
// and the drift would read as a healthy self test on a tab whose job is to say
// otherwise.
var IS9WD_SELFTEST_FAIL_MARKER_ = 'first failure: ';

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
  // A rate is a percentage with no decimal, because a rate over 14 officers is never
  // precise enough to earn one. `Avg days` keeps one, because the whole point of that
  // column is that a number near zero is a signal (6A).
  PCT: '0%',
  ONE: '0.0',
  SIGNED: '0;-0',
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
  // A fraction between two bounds, for the two statistics settings that are
  // percentages. It is separate from INT because 0.15 is the point of them.
  NUM: 'num',
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
  // Seven columns, not twelve. Ethan's instruction of 2026-09-27 was generous column
  // widths and more air, and the width that matters most here is C: it carries the plain
  // English hint beside every cell he types into, and a hint that clips is a hint nobody
  // reads. A to D serve the label, value, hint and check of every settings row; B to G
  // serve the seven directory columns, so B is wide enough for the longest office name
  // and D for the longest position label.
  // Six columns three times over with a 30 px separator between, 1,398 px in all, which
  // is the only view that fits a 1,440 px laptop screen with no horizontal scroll. A card
  // row is a label, a value, and four narrow columns the value overflows into, which is
  // 176 px of run-on room and the reason no dashboard row needs a merge.
  DASHBOARD: [160, 110, 44, 44, 44, 44,
    30,
    160, 110, 44, 44, 44, 44,
    30,
    160, 110, 44, 44, 44, 44],
  CONFIG: [320, 300, 420, 300, 260, 120, 320],
  FEED: [150, 240, 340, 240, 320, 260, 200, 150, 170, 140, 150, 200, 110,
    80, 80, 80, 80, 150, 150, 130, 130, 220],
  ITEMS: [90, 260, 380, 150, 300, 150, 160, 200, 160, 190, 90, 110, 80, 80,
    110, 120, 110, 160],
  // 03 | Statistics is a dashboard laid out three cards across, so its widths are three
  // twelve column sets with a narrow separator column between them. Each set is sized for
  // the WIDEST table that sits in that column of cards, and every set totals about the same
  // so the three columns of cards line up as three columns:
  //
  //   set 1, columns A to L   · the tiles and BY OFFICER   · 1,220 px
  //   set 2, columns N to Y   · WHAT NEEDS ATTENTION and TRACK RECORD, RANKED · 1,200 px
  //   set 3, columns AA to AL · READINESS GATES and TREND  · 1,190 px
  //
  // The separator columns M and Z are 30 px: wide enough to read as a gap, narrow enough
  // not to waste the width. A sentence column is narrow on purpose and overflows right
  // across the air columns inside its own card, which is the idiom the attention table
  // already used and the reason those air columns exist.
  // Column A carries the committee or office name, which SPEC section 10 puts on the left
  // edge because no column is frozen. At 10 pt bold a 39 character EVP title needs about
  // 265 px, so five of the fourteen rows of BY OFFICER were clipping in 230. The room comes
  // out of the count columns, which hold one and two digit integers and never needed 80.
  STATS: [300, 196, 68, 68, 68, 68, 78, 72, 72, 72, 72, 90,
    30,
    200, 120, 130, 90, 210, 72, 72, 72, 72, 72, 72, 72,
    30,
    200, 110, 130, 120, 90, 150, 75, 75, 75, 75, 75, 75],
  // 05 | Officer Tables is three nine column cards across. Seven columns a reader reads,
  // then the HIDDEN sort key, then one narrow column of air, both inside the card's border.
  // Title first because it is the thing you read; the band above already says whose table it
  // is. The eighth entry is the hidden key, so its width is never seen and the ninth is the
  // visible spare, which is why the two are 60 and 40 rather than 40 and 60: they swapped
  // when keyOffset was corrected and the widths had to swap with them.
  TABLES: [330, 110, 85, 110, 140, 290, 80, 60, 40,
    30,
    330, 110, 85, 110, 140, 290, 80, 60, 40,
    30,
    330, 110, 85, 110, 140, 290, 80, 60, 40],
  ARCHIVE: [90, 150, 260, 380, 150, 300, 160, 90, 150, 160, 200, 190, 220, 220],
  LOG: [160, 220, 110, 190, 240, 90, 460, 150],
  // _Engine: nine columns, because the schedule block is the widest thing on it.
  ENGINE: [320, 260, 300, 240, 240, 200, 200, 180, 220],
  // _Views: thirteen, because the officer helper band is the widest thing on it.
  VIEWS: [260, 240, 300, 110, 110, 90, 110, 140, 90, 100, 100, 100, 90]
};

// Hidden column spans, first and last, 1 based. The data tab hides the seven derived
// columns K to Q (5.1) and the feed its helpers in R to V (6.4). Both are one row per
// row of the thing they describe, so neither can move to another tab without doubling
// the row count of the connector read.
//
// 03 | Statistics has no entry any more, and that is the point: its helper band moved to
// _Views, so there is no hidden column on the tab Ethan reads. 04 | Officer Tables keeps
// exactly one, column H, and it is not a helper: it is the eighth column of one spilling
// SORT, so it cannot live on another sheet at all (6B.6).
// 04 | Officer Tables hides one column per grid cell, the sort key at each cell's right
// edge, so the spans follow the grid rather than a remembered letter.
var IS9WD_HIDE_COLS = {
  ITEMS: [{ first: 11, last: 17 }],
  FEED: [{ first: 18, last: 22 }],
  // The sort key column of each of the three cards in a row, which moved from 9, 19 and 29
  // to 8, 18 and 28 when keyOffset was corrected to the header count. Column 9, 19 and 29
  // are now the column of air inside the grid cell and outside the card border.
  TABLES: [{ first: 8, last: 8 }, { first: 18, last: 18 }, { first: 28, last: 28 }]
};

// ============================================================================
//  FROZEN PANES  (2.5: a header row on every tab, and NO frozen column anywhere)
// ============================================================================

// Ethan's instruction of 2026-09-27: do not freeze columns. It is applied
// workbook-wide as given, so `cols` is 0 on all seven tabs and the earlier
// convention of freezing the key column on a wide tab is withdrawn. The frozen
// header row is his earlier instruction and does not conflict, so it stays.
//
// The cost is named rather than quietly skipped: on 02 | Deliverables, 05 | Archive
// and 06 | Log, all three of which are wider than a laptop screen, scrolling right
// now loses the row's identity. Neither new tab pays anything, because both are
// sized to fit without horizontal scroll, and on both of them the left edge carries
// the identifier and the verdict for exactly that reason.
//
// Frozen rows: the two new tabs freeze enough to keep their own banner on screen,
// so a tab that runs to row 229 always says what it is.
// NOTHING IS FROZEN ON ANY TAB, ROWS OR COLUMNS. Ethan ruled on 2026-09-28, extending his
// 2026-09-27 ruling on columns to rows as well.
//
// The cost is named rather than quietly skipped, because it is real: on 03 | Deliverables the
// column headers and the plain English hint row scroll away at about row 30, so a reader far
// down the table sees seventeen unlabelled columns; on 06 | Archive and 07 | Log the same;
// and on the three card tabs the tab's own banner leaves the screen. What carries the weight
// instead is that every block states itself where it sits: a card carries its own band and
// its own header row beside its own data, and the data tab's five input columns are the five
// cream ones, which is a signal that does not scroll.
//
// It stays a table rather than a set of zeroes so a later administration can reverse it in
// one edit, and so the self test can assert the workbook matches whatever it says.
var IS9WD_FREEZE = {
  DASHBOARD: { rows: 0, cols: 0 },
  CONFIG: { rows: 0, cols: 0 },
  FEED: { rows: 0, cols: 0 },
  ITEMS: { rows: 0, cols: 0 },
  STATS: { rows: 0, cols: 0 },
  TABLES: { rows: 0, cols: 0 },
  ARCHIVE: { rows: 0, cols: 0 },
  LOG: { rows: 0, cols: 0 },
  ENGINE: { rows: 0, cols: 0 },
  VIEWS: { rows: 0, cols: 0 }
};

// ============================================================================
//  THE SETTINGS TABS  (reference 4, every address in one place)
// ============================================================================

// TWO TABS, ONE SHAPE, AND THE REASON THE SPLIT EXISTS.
//
// Ethan's instruction of 2026-09-27: `00 | Configuration` keeps only what a president
// actually sets, which is the term dates, the A.Y. label, the people, the on and off
// switches and the sign-off. Everything else a setting could be is machinery: the hex
// pairs Canva consumes, the status vocabulary, the job schedule, the carousel capacity
// arithmetic, the mail plumbing, the eight statistics thresholds, the diagnostics, the
// directory's token and ordinal columns, and the 52 row sign-off store. All of it moved
// to `_Engine`, which is hidden.
//
// Nothing was deleted and nothing was hardcoded. Every moved value keeps its named
// range and its owner, so every formula, every email and every reader is unchanged: they
// all read by name, which is the whole payoff of the naming rule and the second time it
// was collected on.
//
// Both tabs are described by the same two block shapes and written by the same painter:
//
//   A ROW BLOCK is one setting per row. Column A the label, column B the value, column C
//   the plain English hint, column D the check or guard. `hint` is the sentence, written
//   for somebody who has never written a formula, and it lands twice: in the cell's own
//   note and visibly in column C. A row with a `formula` is calculated and never gets a
//   hint, a cream fill or a note, because the one thing a hint must never do is invite a
//   president to type into a cell the workbook owns.
//
//   A TABLE BLOCK is one record per row. The band carries the title, the row under it
//   carries one plain English hint per column, and every cell of an Ethan owned column
//   carries that column's hint as its note.
var IS9WD_CFG = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  TITLE_COL: 1,
  LABEL_COL: 1,
  VALUE_COL: 2,
  HINT_COL: 3,
  NOTE_COL: 4,
  FIRST_COL: 1,
  LAST_COL: 7,
  BANNER: IS9WD_TAB.CONFIG.toUpperCase(),
  HELP: 'Everything on this tab is something you set. A cell with a cream background is ' +
    'yours to type into, and the sentence beside it says what to type and what happens ' +
    'if it is wrong. A cell with no cream is worked out by the sheet: read it, do not ' +
    'type in it. Nothing here needs a formula and nothing here needs code.'
};

// The hint that rides in the check column's own header position on a row block, so a
// reader knows what the fourth column is for before anything is wrong.
var IS9WD_CFG_CHECK_HINT = 'This column stays empty while everything is right. When ' +
  'something is wrong it says so in plain words.';

// The sentence a calculated cell carries instead of a hint, so the distinction between
// "yours" and "the sheet's" is stated rather than implied by a missing fill.
var IS9WD_CFG_CALC_HINT = 'Worked out by the sheet. Do not type here.';

// ---------------------------------------------------------------------------
//  THE WEEK THE WORKBOOK IS ON  (calculated, 4.1)
// ---------------------------------------------------------------------------

IS9WD_CFG.WEEKNOW = {
  key: 'WEEKNOW',
  tab: 'CONFIG',
  title: 'THE WEEK THIS WORKBOOK IS ON',
  help: 'Every label the carousel prints and every email that goes out reads these six ' +
    'lines. They are worked out from the trimester dates below, so there is nothing to ' +
    'type here. On a Sunday they describe the week that starts the next morning.',
  titleRow: 4,
  hintRow: 5,
  headerRow: 0,
  firstRow: 6,
  lastRow: 11,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 6, name: 'IS9WD_EFFECTIVE_TODAY', owner: IS9WD_OWN.SCRIPT,
      label: 'Today',
      formula: '=IF(IS9WD_TODAY_OVERRIDE<>"",INT(IS9WD_TODAY_OVERRIDE),TODAY())',
      format: IS9WD_FMT.DATE_LONG, align: IS9WD_ALIGN.RIGHT
    },
    {
      row: 7, name: 'IS9WD_WEEK_START', owner: IS9WD_OWN.SCRIPT,
      label: 'The week starts (a Monday)',
      formula: '=IS9WD_EFFECTIVE_TODAY+1-(WEEKDAY(IS9WD_EFFECTIVE_TODAY+1,2)-1)',
      format: IS9WD_FMT.DATE_LONG, align: IS9WD_ALIGN.RIGHT
    },
    {
      row: 8, name: 'IS9WD_WEEK_END', owner: IS9WD_OWN.SCRIPT,
      label: 'The week ends (a Sunday)', formula: '=IS9WD_WEEK_START+6',
      format: IS9WD_FMT.DATE_LONG, align: IS9WD_ALIGN.RIGHT
    },
    {
      row: 9, name: 'IS9WD_WEEK_NUMBER', owner: IS9WD_OWN.SCRIPT,
      label: 'Week number',
      formula: '=IF(IS9WD_WEEK_NUMBER_OVERRIDE<>"",IS9WD_WEEK_NUMBER_OVERRIDE,IF(NOT(IS9WD_IN_TERM),"",IFERROR(INT((IS9WD_WEEK_START-IS9WD_TERM_START)/7)+1,"")))',
      format: IS9WD_FMT.TWO, align: IS9WD_ALIGN.CENTER
    },
    {
      row: 10, name: 'IS9WD_TERM_ACTIVE', owner: IS9WD_OWN.SCRIPT,
      label: 'Trimester this week falls in',
      formula: '=IFERROR(INDEX(IS9WD_TERM_CAL,MATCH(1,ARRAYFORMULA((IS9WD_TERM_STARTS<=IS9WD_WEEK_START)*(IS9WD_TERM_ENDS>=IS9WD_WEEK_START)),0),1),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 11, name: 'IS9WD_IN_TERM', owner: IS9WD_OWN.SCRIPT,
      label: 'Inside a trimester right now',
      formula: '=IS9WD_TERM_ACTIVE<>""', align: IS9WD_ALIGN.CENTER,
      note: '=IF(IS9WD_IN_TERM,"","No trimester covers this week, so no email is sent and the carousel says WEEK --. Check the trimester dates below.")'
    }
  ]
};

// ---------------------------------------------------------------------------
//  WHAT YOU SET ABOUT THE WEEK  (4.1: the label and the two overrides)
// ---------------------------------------------------------------------------

IS9WD_CFG.WEEKSET = {
  key: 'WEEKSET',
  tab: 'CONFIG',
  title: 'WHAT YOU SET ABOUT THE WEEK',
  help: 'Four cells. The first two are printed as they are typed. The last two are ' +
    'escape hatches: leave them empty unless you mean to overrule the sheet, because ' +
    'anything left in them quietly changes every date and every week number above.',
  titleRow: 13,
  hintRow: 14,
  headerRow: 0,
  firstRow: 15,
  lastRow: 18,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 15, name: 'IS9WD_AY_LABEL', owner: IS9WD_OWN.ETHAN,
      label: 'Academic year, printed on the carousel', value: 'A.Y. 2026 - 2027',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Type the academic year exactly as you want it printed on the slides, for ' +
        'example A.Y. 2026 - 2027. Whatever is here is copied onto the first slide word ' +
        'for word, so a typo here is a typo on Instagram.'
    },
    {
      row: 16, name: 'IS9WD_CUTOFF_TEXT', owner: IS9WD_OWN.ETHAN,
      label: 'Deadline for entering next week, printed in emails',
      value: 'Saturday 8 PM before the week starts',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Type the cut-off you want the emails to quote, in your own words. This is ' +
        'a sentence in an email and nothing else: it does not stop anybody entering ' +
        'anything, and changing it changes no date.'
    },
    {
      row: 17, name: 'IS9WD_TODAY_OVERRIDE', owner: IS9WD_OWN.ETHAN,
      label: 'Pretend today is a different date', value: '',
      format: IS9WD_FMT.DATE_KEY, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.DATE, help: 'A date, or leave it empty to use the real today.' },
      hint: 'Leave this empty almost always. Type a date only when you want to see what ' +
        'the sheet would say on that day, for example to rehearse a Sunday. Anything ' +
        'left here makes every date above, every email and the carousel describe the ' +
        'wrong week, and it stops the automatic jobs running. Clear it when you are done.',
      note: '=IF(AND(B17<>"",NOT(ISNUMBER(B17))),"That is not a date. Clear the cell or pick a date.",IF(B17<>"","This is switched on, so the whole sheet is pretending. Clear the cell to go back to the real today.",""))'
    },
    {
      row: 18, name: 'IS9WD_WEEK_NUMBER_OVERRIDE', owner: IS9WD_OWN.ETHAN,
      label: 'Force a week number', value: '',
      format: IS9WD_FMT.TWO, align: IS9WD_ALIGN.CENTER,
      validate: { kind: IS9WD_V.INT, min: 1, max: 30, help: 'A whole number from 1 to 30, or leave it empty.' },
      hint: 'Leave this empty almost always. Type a whole number from 1 to 30 only when ' +
        'IS9 counts the week differently from the calendar, for example after a ' +
        'suspended week. Anything here wins over the number above and is printed on ' +
        'every slide, so clear it when the numbering catches up.',
      note: '=IF(IS9WD_WEEK_NUMBER_OVERRIDE<>"","This is switched on, so the week number above is ignored. Clear the cell to go back to counting.","")'
    }
  ]
};

// ---------------------------------------------------------------------------
//  TRIMESTER DATES  (4.3)
// ---------------------------------------------------------------------------

IS9WD_CFG.TERMS = {
  key: 'TERMS',
  tab: 'CONFIG',
  title: 'TRIMESTER DATES',
  help: 'Three rows, one per trimester. Week numbers start again at 01 in each one. ' +
    'Fill the trimester you are in; leave the others empty until DLSU publishes them.',
  titleRow: 20,
  hintRow: 21,
  headerRow: 22,
  firstRow: 23,
  lastRow: 25,
  firstCol: 1,
  lastCol: 4,
  checkCol: 4,
  checkFormula: '=IF($B{row}="","",IF(WEEKDAY($B{row},2)<>1,"The start is not a Monday. Pick the Monday that trimester begins.",IF($C{row}<$B{row},"The end is before the start. Check both dates.","OK")))',
  columns: [
    {
      header: 'Trimester', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'A name for the trimester, for example Term 1. Any wording is fine: nothing ' +
        'reads it except you.'
    },
    {
      header: 'First day (a Monday)', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.RIGHT,
      format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.DATE, help: 'A Monday. The last column says so when it is not.' },
      hint: 'Pick the Monday the trimester starts. It must be a Monday, and the last ' +
        'column tells you when it is not. Every week number is counted from this date, ' +
        'so a date one day out shifts every week label on the carousel.'
    },
    {
      header: 'Last day', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.RIGHT,
      format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.DATE, help: 'The last day of the trimester. Leaving it empty pauses every job.' },
      hint: 'Pick the last day of the trimester. This one must never be left empty on ' +
        'the trimester you are in: an empty cell here stops every email, blanks the week ' +
        'number and makes the carousel read WEEK --. If the official date is not out ' +
        'yet, put a generous later date and correct it when it is.'
    },
    {
      header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.WRAP, hint: IS9WD_CFG_CHECK_HINT
    }
  ]
};

// ---------------------------------------------------------------------------
//  THE PEOPLE  (4.8, the seven columns a president fills)
// ---------------------------------------------------------------------------

// Fourteen rows, and all fourteen reach the carousel: the nine committees, the President
// and the four EVPs. Every officer has items, a link, emails and one slide. The carousel
// order, the hierarchy order and the two token columns are all machinery and live on `_Engine`,
// keyed on the same Key in the same row order, which is what keeps this tab to the seven
// columns a person fills and reads.
IS9WD_CFG.DIRECTORY = {
  key: 'DIRECTORY',
  tab: 'CONFIG',
  title: 'THE PEOPLE',
  help: 'One row per officer, fourteen in all. Paste the names into Full name and the ' +
    'DLSU addresses into Email. Do not add, remove or reorder rows: the private links ' +
    'are tied to the Key in the first column.',
  titleRow: 27,
  hintRow: 28,
  headerRow: 29,
  firstRow: 30,
  lastRow: 43,
  firstCol: 1,
  lastCol: 7,
  checkCol: 7,
  adminKey: 'K10',
  columns: [
    {
      header: 'Key', owner: IS9WD_OWN.ONCE, align: IS9WD_ALIGN.CENTER,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'Never change this. It is the name of that person\'s private link, and ' +
        'editing it breaks the link they already have.'
    },
    {
      header: 'Committee or office', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'The committee or office, spelled exactly as you want it printed in capitals ' +
        'on the slide. Change it only if the spelling is wrong: every deliverable you ' +
        'have already entered points at this wording, and changing it orphans them.'
    },
    {
      header: 'Full name', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'Type the person\'s name as you want it printed on the slide and used in ' +
        'their emails. Leave it empty and the last column says No name, and that row ' +
        'gets no email.'
    },
    {
      header: 'Position label', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'The title printed under the name on the slide, in capitals, for example ' +
        'VICE PRESIDENT. It is printed exactly as typed.'
    },
    {
      header: 'Email', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'That person\'s DLSU address, one address only, no names and no brackets ' +
        'around it. Everything addressed to them goes here. Leave it empty and the last ' +
        'column says No email and nothing is sent to them.'
    },
    {
      header: 'On the carousel', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER,
      wrap: IS9WD_WRAP.WRAP, validate: { kind: IS9WD_V.CHECKBOX },
      hint: 'Tick this for a row that gets its own slide on the carousel. It is ticked for ' +
        'all fourteen: you lead on slide 2, the four EVPs follow, then the nine ' +
        'committees. Unticking a row takes that officer off the carousel, and ticking a ' +
        'fifteenth row needs a new Canva master, so ask before you change it.'
    },
    {
      header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.WRAP, hint: IS9WD_CFG_CHECK_HINT
    }
  ]
};

// ---------------------------------------------------------------------------
//  SWITCHES  (4.6, the seven a president turns on and off)
// ---------------------------------------------------------------------------

IS9WD_CFG.SWITCHES = {
  key: 'SWITCHES',
  tab: 'CONFIG',
  title: 'SWITCHES',
  help: 'Seven tick boxes. A tick means on. Test mode is the important one: while it is ' +
    'ticked, nothing reaches the officers and every email comes to you instead.',
  titleRow: 45,
  hintRow: 46,
  headerRow: 0,
  firstRow: 47,
  lastRow: 53,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 47, name: 'IS9WD_AUTOMATION_ON', label: 'Run the automatic jobs',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to let the sheet work on its own: it checks every hour and sends what ' +
        'is due. Clear it to pause everything at once, which is the switch to use if ' +
        'something looks wrong. Nothing catches up later except inside the same day.'
    },
    {
      row: 48, name: 'IS9WD_TEST_MODE', label: 'Test mode: send every email to me instead',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to keep every email coming to your own address so you can read it ' +
        'first. It ships ticked on purpose. Clear it only when you are happy with the ' +
        'wording, because the next job then writes to all fourteen people for real.'
    },
    {
      row: 49, name: 'IS9WD_MAIL_MONDAY', label: 'Monday email: this week\'s list',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to send each officer their list on Monday morning. Somebody with ' +
        'nothing entered gets nothing, which is why an empty week is worth checking on ' +
        'the dashboard before Monday.'
    },
    {
      row: 50, name: 'IS9WD_MAIL_DAILY', label: 'Daily email: due tomorrow or late',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to nudge an officer on any day something of theirs is due tomorrow or ' +
        'already late. One email per person per day, never one per task.'
    },
    {
      row: 51, name: 'IS9WD_MAIL_SUNDAY', label: 'Sunday email: your own summary',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to get your Sunday summary before the carousel goes out: what is ' +
        'ready, what is late, what was finished. It goes to you only.'
    },
    {
      row: 52, name: 'IS9WD_MAIL_ALERT', label: 'Email me when something breaks',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to be told when an automatic job fails, at most once a day per job. ' +
        'Leave it ticked: the alternative is a job that has been failing quietly for a ' +
        'fortnight.'
    },
    {
      row: 53, name: 'IS9WD_APP_ON', label: 'Officers\' phone links work',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to let the fourteen private links open and tick things off. Clear it ' +
        'to close the links for everybody, for example while you rearrange a week. ' +
        'Nothing is lost while it is off.'
    }
  ]
};

// ---------------------------------------------------------------------------
//  ADDRESSES AND LINKS  (4.6: the three a president pastes in)
// ---------------------------------------------------------------------------

IS9WD_CFG.ADDRESSES = {
  key: 'ADDRESSES',
  tab: 'CONFIG',
  title: 'ADDRESSES AND LINKS',
  help: 'Three cells you paste in once. They are empty on purpose: this project\'s code ' +
    'is public, so no address and no link is ever written into it.',
  titleRow: 55,
  hintRow: 56,
  headerRow: 0,
  firstRow: 57,
  lastRow: 59,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 57, name: 'IS9WD_ADMIN_EMAIL', label: 'Your own email address',
      owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Paste your DLSU address. Your Sunday summary, every alert and everything ' +
        'test mode holds back comes here. Leave it empty and none of those can be sent.',
      note: '=IF(IS9WD_ADMIN_EMAIL="","Paste your own address here, or nothing can be emailed to you.","")'
    },
    {
      row: 58, name: 'IS9WD_APP_BASE_URL', label: 'Web address of the officers\' page',
      owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Paste the address of the page officers open on their phones, once it has ' +
        'been published. Every email builds its private link from this, so if it is ' +
        'wrong here it is wrong in fourteen inboxes. Paste it complete, starting https.'
    },
    {
      row: 59, name: 'IS9WD_ENDPOINT_URL', label: 'Web address the page talks to',
      owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Paste the address ending in /exec that the Apps Script deployment gives ' +
        'you. This is the door between the officers\' page and this sheet: if it is ' +
        'empty or wrong, ticking a box on a phone does nothing.'
    }
  ]
};

// ---------------------------------------------------------------------------
//  THIS WEEK'S SIGN-OFF  (4.5B, all five calculated)
// ---------------------------------------------------------------------------

IS9WD_CFG.SIGNOFF = {
  key: 'SIGNOFF',
  tab: 'CONFIG',
  title: 'THIS WEEK\'S SIGN-OFF',
  help: 'The two names printed at the bottom of the first slide. They change every week, ' +
    'so you set them each week in the officers\' page and they appear here. Nothing here ' +
    'is typed on this tab.',
  titleRow: 61,
  hintRow: 62,
  headerRow: 0,
  firstRow: 63,
  lastRow: 67,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 63, name: 'IS9WD_PREPARED_NAME', owner: IS9WD_OWN.SCRIPT,
      label: 'Prepared by, name',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_PREPARED_NAME,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      note: '=IF(NOT(IS9WD_SIGNOFF_SET),"Nobody has signed off on this week yet, so the carousel is held back. Set Prepared by and Checked by in the officers\' page.","")'
    },
    {
      row: 64, name: 'IS9WD_PREPARED_POSITION', owner: IS9WD_OWN.SCRIPT,
      label: 'Prepared by, position',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_PREPARED_POSITION,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 65, name: 'IS9WD_CHECKED_NAME', owner: IS9WD_OWN.SCRIPT,
      label: 'Checked by, name',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_CHECKED_NAME,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 66, name: 'IS9WD_CHECKED_POSITION', owner: IS9WD_OWN.SCRIPT,
      label: 'Checked by, position',
      formula: '=IFERROR(INDEX(IS9WD_SIGNOFF_CHECKED_POSITION,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")',
      format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
    },
    {
      row: 67, name: 'IS9WD_SIGNOFF_SET', owner: IS9WD_OWN.SCRIPT,
      label: 'Signed off for this week',
      formula: '=AND(IS9WD_PREPARED_NAME<>"",IS9WD_PREPARED_POSITION<>"",IS9WD_CHECKED_NAME<>"",IS9WD_CHECKED_POSITION<>"")',
      align: IS9WD_ALIGN.CENTER
    }
  ]
};

// Painting order, top to bottom. Seven blocks on the tab a president reads, against ten
// before the split, and the tab ends on row 67 rather than row 168.
IS9WD_CFG.BLOCKS = ['WEEKNOW', 'WEEKSET', 'TERMS', 'DIRECTORY', 'SWITCHES',
  'ADDRESSES', 'SIGNOFF'];

// ============================================================================
//  _ENGINE  (every setting that exists for the code rather than for a president)
// ============================================================================

// Hidden, and hiding it is not a security boundary: the Canva reader account reads every
// cell of every tab, hidden or not, which is exactly why no token is ever in one. It is
// hidden because it is not Ethan's to read, and it is a tab rather than a constant in
// code because a setting in code is a setting that needs a push to change.
//
// Every block here keeps the shape, the owner and the named range it had on
// `00 | Configuration`, so nothing that reads a setting changed at all.
var IS9WD_ENG = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  TITLE_COL: 1,
  LABEL_COL: 1,
  VALUE_COL: 2,
  HINT_COL: 3,
  NOTE_COL: 4,
  FIRST_COL: 1,
  LAST_COL: 9,
  BANNER: '_ENGINE',
  HELP: 'Machinery. Every setting on this tab exists for the code rather than for the ' +
    'president, which is why it is hidden and why ' + IS9WD_TAB.CONFIG + ' is short. ' +
    'Nothing ' +
    'here is secret: the Canva reader account can read every cell of every tab, which is ' +
    'why no token is ever written into one. Changing a value here changes behaviour, so ' +
    'change one only on purpose and run Build or repair workbook afterwards.'
};

// ---------------------------------------------------------------------------
//  WEEK PLUMBING
// ---------------------------------------------------------------------------

IS9WD_ENG.WEEKCALC = {
  key: 'WEEKCALC',
  tab: 'ENGINE',
  title: 'WEEK PLUMBING',
  help: 'The one derived week cell nothing prints: the week number formula divides by it.',
  titleRow: 4,
  hintRow: 5,
  headerRow: 0,
  firstRow: 6,
  lastRow: 6,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 6, name: 'IS9WD_TERM_START', owner: IS9WD_OWN.SCRIPT,
      label: 'Active trimester start',
      formula: '=IFERROR(INDEX(IS9WD_TERM_CAL,MATCH(1,ARRAYFORMULA((IS9WD_TERM_STARTS<=IS9WD_WEEK_START)*(IS9WD_TERM_ENDS>=IS9WD_WEEK_START)),0),2),"")',
      format: IS9WD_FMT.DATE_KEY, align: IS9WD_ALIGN.RIGHT
    }
  ]
};

// ---------------------------------------------------------------------------
//  4.2 URGENCY WINDOWS
// ---------------------------------------------------------------------------

// The only settings that reach Canva as machine input rather than as text, so column E
// validates every hex and the self test fails on any row that is not OK. A hex cell is
// never painted with the colour it holds: two of them hold #1C2120, which appears
// nowhere in the workbook (2.5).
IS9WD_ENG.WINDOWS = {
  key: 'WINDOWS',
  tab: 'ENGINE',
  title: 'URGENCY WINDOWS',
  help: 'The four deadline windows, and the two hex values each one paints on the carousel.',
  titleRow: 8,
  hintRow: 9,
  headerRow: 10,
  firstRow: 11,
  lastRow: 14,
  firstCol: 1,
  lastCol: 5,
  checkCol: 5,
  checkFormula: '=IF(AND(REGEXMATCH($C{row},"^#[0-9A-Fa-f]{6}$"),REGEXMATCH($D{row},"^#[0-9A-Fa-f]{6}$")),"OK","Hex is not #RRGGBB")',
  columns: [
    { header: 'Window', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Dates', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    {
      header: 'Station hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'A colour written as a hash and six characters, for example #e9ebd4. Canva ' +
        'refuses anything else in the middle of a run.'
    },
    {
      header: 'Number text hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'The colour of the number printed on that station, same format.'
    },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ---------------------------------------------------------------------------
//  4.4 STATUS LIST, and the undo window under it
// ---------------------------------------------------------------------------

IS9WD_ENG.STATUS = {
  key: 'STATUS',
  tab: 'ENGINE',
  title: 'STATUS LIST',
  help: 'Exactly one row is terminal. Nothing in the code keys on a label, so renaming a ' +
    'status costs one edit here and one Build or repair workbook.',
  titleRow: 16,
  hintRow: 17,
  headerRow: 18,
  firstRow: 19,
  lastRow: 20,
  firstCol: 1,
  lastCol: 4,
  blankRow: 21,
  undoRow: 22,
  undoLabel: 'Undo window (seconds)',
  undoName: 'IS9WD_UNDO_SECONDS',
  undoValidate: { kind: IS9WD_V.INT, min: 0, max: 3600, help: 'Seconds a link holder may untick. 0 disables unticking.' },
  undoHint: 'How long an officer has to undo a tick, in seconds. 0 means they cannot ' +
    'undo at all and only you can reopen an item.',
  columns: [
    {
      header: 'Status', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      hint: 'The words shown on a deliverable. Renaming one renames it everywhere, but ' +
        'every item already holding the old word is flagged until it is changed too.'
    },
    {
      header: 'Terminal', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER,
      wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.CHECKBOX },
      hint: 'Tick the one status that means finished. Exactly one row is ticked.'
    },
    { header: 'Chip hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Chip text hex', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ---------------------------------------------------------------------------
//  4.7 SCHEDULE
// ---------------------------------------------------------------------------

IS9WD_ENG.SCHEDULE = {
  key: 'SCHEDULE',
  tab: 'ENGINE',
  title: 'SCHEDULE',
  help: 'One row per job, in Manila hours. Catch-up hours is how late a missed run may ' +
    'still fire. Runs and Day are dropdowns, because a typo would turn a weekly job into ' +
    'one that never runs and nothing would say so.',
  titleRow: 24,
  hintRow: 25,
  headerRow: 26,
  firstRow: 27,
  lastRow: 31,
  firstCol: 1,
  lastCol: 9,
  checkCol: 7,
  checkFormula: '=IF($A{row}="","",IF(AND(LOWER($B{row})="weekly",LOWER($C{row})="any"),"Row does not parse",IF(OR(NOT(ISNUMBER($D{row})),$D{row}<>INT($D{row}),$D{row}<0,$D{row}>23),"Row does not parse","OK")))',
  columns: [
    { header: 'Job key', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Runs', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.VALUE_LIST, values: IS9WD_RUNS_LIST }, hint: 'Daily or Weekly, from the dropdown.' },
    { header: 'Day', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.VALUE_LIST, values: IS9WD_DAY_LIST }, hint: 'A weekday from the dropdown, or Any for a daily job.' },
    { header: 'Hour', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.INT, min: 0, max: 23 }, hint: 'A whole hour from 0 to 23, Manila time.' },
    { header: 'Catch-up hours', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.WRAP, validate: { kind: IS9WD_V.INT, min: 0, max: 23 }, hint: 'How many hours late a missed run may still fire.' },
    { header: 'On', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.CENTER, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.CHECKBOX }, hint: 'Tick to let this job run.' },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Last run', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Last status', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// ---------------------------------------------------------------------------
//  4.6A CAROUSEL CAPACITY
// ---------------------------------------------------------------------------

// Three capacity numbers, not one: the frames on a master page, the pages a committee may
// own, and the product. A continuation page needs those to be different numbers, and the
// derived one is a formula because a multi-cell paste is exactly what replaces a formula
// with a stale literal (4.6).
IS9WD_ENG.CAPACITY = {
  key: 'CAPACITY',
  tab: 'ENGINE',
  title: 'CAROUSEL CAPACITY',
  help: 'The arithmetic behind the slides. Raising either of the first two needs the Canva ' +
    'master rebuilt by hand before it can be used.',
  titleRow: 33,
  hintRow: 34,
  headerRow: 0,
  firstRow: 35,
  lastRow: 38,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 35, name: 'IS9WD_SLOTS_PER_PAGE', label: 'Slots per Canva page',
      owner: IS9WD_OWN.ETHAN, value: 15, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 50, help: 'The item frames the master page physically carries.' },
      hint: 'How many task frames one slide physically holds, and therefore the most ' +
        'tasks one officer can show, because each officer has exactly one slide. ' +
        'Changing it without rebuilding the Canva master publishes text into frames ' +
        'that are not there.'
    },
    {
      row: 36, name: 'IS9WD_MAX_PARTS', label: 'Maximum Canva pages per officer',
      owner: IS9WD_OWN.ETHAN, value: 1, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 4, help: 'Raising this needs a master rebuild before it can be used.' },
      hint: 'How many slides one officer may take. One means every officer has exactly ' +
        'one slide, so the carousel is always 1 title slide plus 14, and tasks past the ' +
        'slot count are reported as not published rather than carried onto a second slide.'
    },
    {
      row: 37, name: 'IS9WD_PUBLISH_MAX', label: 'Publishable items per officer (derived)',
      owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS',
      format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      note: '=IF(NOT(ISNUMBER(IS9WD_PUBLISH_MAX)),"Publishable maximum is not a number",IF(IS9WD_PUBLISH_MAX<>IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS,"Capacity numbers disagree: "&IS9WD_SLOTS_PER_PAGE&" times "&IS9WD_MAX_PARTS&" is "&IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS,"OK"))'
    },
    {
      row: 38, name: 'IS9WD_PUBLISH_EMPTY_PAGES',
      label: 'Publish a page for an officer with no items',
      owner: IS9WD_OWN.ETHAN, value: true, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to give a committee with nothing entered a slide that says so. Clear ' +
        'it to drop that slide from the carousel.'
    }
  ]
};

// ---------------------------------------------------------------------------
//  4.6B MAIL AND APP PLUMBING
// ---------------------------------------------------------------------------

IS9WD_ENG.PLUMBING = {
  key: 'PLUMBING',
  tab: 'ENGINE',
  title: 'MAIL AND APP PLUMBING',
  help: 'Defaults that work as they ship. The two code written rows at the bottom are ' +
    'the dispatcher\'s own record of itself.',
  titleRow: 40,
  hintRow: 41,
  headerRow: 0,
  firstRow: 42,
  lastRow: 52,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 42, name: 'IS9WD_MAIL_NOREPLY', label: 'Send as no reply (Workspace only)',
      owner: IS9WD_OWN.ETHAN, value: false, validate: { kind: IS9WD_V.CHECKBOX },
      align: IS9WD_ALIGN.CENTER,
      hint: 'Tick to send from a no reply address. It works only on a Workspace account.'
    },
    {
      row: 43, name: 'IS9WD_QUOTA_RESERVE', label: 'Email quota reserve',
      owner: IS9WD_OWN.ETHAN, value: 100, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 0, max: 1500 },
      hint: 'How many of the day\'s allowed emails to keep back. Sending stops before ' +
        'the reserve rather than half sending a batch.'
    },
    {
      row: 44, name: 'IS9WD_RETIRE_DAYS', label: 'Retire accomplished after days',
      owner: IS9WD_OWN.ETHAN, value: 14, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 0, max: 365 },
      hint: 'How long a finished task stays on the data tab before it is moved to the ' +
        'archive to reclaim the row.'
    },
    {
      row: 45, name: 'IS9WD_TOKEN_WARN_DAYS', label: 'Token age warning days',
      owner: IS9WD_OWN.ETHAN, value: 120, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 0, max: 3650 },
      hint: 'How old a private link may get before the people tab flags it.'
    },
    {
      row: 46, name: 'IS9WD_AUTOMATION_OWNER', label: 'Automation owner email',
      owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Usually the same address as yours. It is the account the hourly job runs as.'
    },
    {
      row: 47, name: 'IS9WD_REPLY_TO', label: 'Reply-to email',
      owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Where a reply to one of these emails should land. Usually your own address.'
    },
    {
      row: 48, name: 'IS9WD_SENDER_NAME', label: 'Sender display name',
      owner: IS9WD_OWN.ETHAN, value: 'IS9 Deliverables Tracker', format: IS9WD_FMT.TEXT,
      align: IS9WD_ALIGN.LEFT,
      hint: 'The name an officer sees in the From line.'
    },
    {
      row: 49, name: 'IS9WD_TRANSPORT', label: 'Transport (fetch or gsrun)',
      owner: IS9WD_OWN.ETHAN, value: 'fetch', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      validate: { kind: IS9WD_V.VALUE_LIST, values: ['fetch', 'gsrun'], help: 'The live shape. Shape A is decided, so this reads fetch.' },
      hint: 'Leave it on fetch. It records which of the two possible app shapes is live.'
    },
    {
      row: 50, name: 'IS9WD_READER_EMAIL', label: 'Canva reader email (Drive connector fallback)',
      owner: IS9WD_OWN.ETHAN, value: '', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT,
      hint: 'Fill this only if the DLSU account cannot read this sheet through the ' +
        'connector. Empty is the good outcome: it means no share was needed.'
    },
    { row: 51, name: 'IS9WD_HEARTBEAT', label: 'Last heartbeat', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.STAMP, align: IS9WD_ALIGN.RIGHT },
    { row: 52, name: 'IS9WD_LAST_OWNER', label: 'Last dispatcher owner', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT }
  ]
};

// ---------------------------------------------------------------------------
//  4.6C STATISTICS THRESHOLDS  (the eight, off the dashboard entirely)
// ---------------------------------------------------------------------------

// Ethan's instruction of 2026-09-27: 03 | Statistics is for viewing, not for setting. So
// every threshold it reads lives here, hidden, and the dashboard shows numbers and charts
// and nothing that looks like a form. The two that decide a layout carry a guard note,
// because a layout setting changed without a rebuild would otherwise show a stale tab
// with nothing saying so.
IS9WD_ENG.THRESHOLDS = {
  key: 'THRESHOLDS',
  tab: 'ENGINE',
  title: 'STATISTICS THRESHOLDS',
  help: 'What the dashboard treats as worth marking. Two of them decide a layout rather ' +
    'than a threshold, and each of those carries a guard in the fourth column.',
  titleRow: 54,
  hintRow: 55,
  headerRow: 0,
  firstRow: 56,
  lastRow: 63,
  firstCol: 1,
  lastCol: 4,
  rows: [
    {
      row: 56, name: 'IS9WD_STATS_TREND_WEEKS', label: 'Trend weeks',
      owner: IS9WD_OWN.ETHAN, value: 8, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 2, max: 26, help: 'A whole number from 2 to 26. Changing it needs Build or repair workbook.' },
      hint: 'How many past weeks the trend table and the trend chart show.',
      note: '=IF(IS9WD_STATS_TREND_WEEKS<>IS9WD_STATS_TREND_BUILT,"Run Build or repair workbook: the trend weeks do not match the tab","OK")'
    },
    {
      row: 57, name: 'IS9WD_STATS_MIN_JUDGED',
      label: 'Fewest items past their deadline before a rate is scored',
      owner: IS9WD_OWN.ETHAN, value: 3, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 50, help: 'Below this, On time stays blank rather than printing 100% off one item.' },
      hint: 'Below this many judged items an officer gets no score at all, rather than ' +
        '100% off one task.'
    },
    {
      row: 58, name: 'IS9WD_STATS_SILENT_DAYS',
      label: 'Days without a tick before an officer reads as silent',
      owner: IS9WD_OWN.ETHAN, value: 7, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 60 },
      hint: 'How many quiet days before the dashboard says an officer has gone silent.'
    },
    {
      row: 59, name: 'IS9WD_STATS_LATE_DAYS',
      label: 'Days late before the worst-late number flags',
      owner: IS9WD_OWN.ETHAN, value: 3, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 60 },
      hint: 'How many days late is bad enough to mark.'
    },
    {
      row: 60, name: 'IS9WD_STATS_PACE_SLACK', label: 'Slack allowed against the week\'s pace',
      owner: IS9WD_OWN.ETHAN, value: 0.15, format: IS9WD_FMT.PCT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.NUM, min: 0, max: 1, help: 'A percentage from 0 to 100. It keeps the pace column from crying on a Tuesday.' },
      hint: 'How far behind the week\'s own pace is still acceptable. Type it as a ' +
        'percentage, not as a whole number.'
    },
    {
      row: 61, name: 'IS9WD_STATS_ONTIME_TARGET', label: 'On-time target',
      owner: IS9WD_OWN.ETHAN, value: 0.8, format: IS9WD_FMT.PCT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.NUM, min: 0, max: 1, help: 'A percentage from 0 to 100. An officer below it is flagged.' },
      hint: 'The share of on-time work you expect. An officer below it is marked.'
    },
    {
      row: 62, name: 'IS9WD_STATS_ROOM_WEEKS_WARN',
      label: 'Weeks of row room left before it flags',
      owner: IS9WD_OWN.ETHAN, value: 4, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 1, max: 52 },
      hint: 'How few weeks of space on the data tab is worth a warning.'
    },
    {
      row: 63, name: 'IS9WD_STATS_OFFICER_ROWS',
      label: 'Rows reserved per officer on ' + IS9WD_TAB.TABLES,
      owner: IS9WD_OWN.ETHAN, value: 11, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT,
      validate: { kind: IS9WD_V.INT, min: 3, max: 40, help: 'One row is the overflow notice, so 11 shows 10 items. Raise it if a card says tasks are hidden.' },
      hint: 'How many rows each officer\'s table reserves. One of them is the notice row, ' +
        'so this number minus one is the tasks a card shows before it says the rest are ' +
        'hidden. 11 is the shipping value. This cell is yours, so a build never changes it: ' +
        'if it still reads 21 from an earlier build, type 11 over it and run Build or repair ' +
        'workbook.',
      note: '=IF(IS9WD_STATS_OFFICER_ROWS<>IS9WD_OT_ROWS_BUILT,"Run Build or repair workbook: the reserved rows do not match the tab","OK")'
    }
  ]
};

// ---------------------------------------------------------------------------
//  4.9 DIAGNOSTICS
// ---------------------------------------------------------------------------

// Read only. The first six are pointers at cells that already exist, so a fix lands in
// one place; the last five are code written and carry named ranges of their own.
IS9WD_ENG.DIAGNOSTICS = {
  key: 'DIAGNOSTICS',
  tab: 'ENGINE',
  title: 'DIAGNOSTICS',
  help: 'Read only. Six pointers at cells that already exist, then five lines code writes ' +
    'after each run. ' + IS9WD_TAB.STATS + ' reads these rather than recomputing them.',
  titleRow: 65,
  hintRow: 66,
  headerRow: 0,
  firstRow: 67,
  lastRow: 77,
  firstCol: 1,
  lastCol: 4,
  rows: [
    { row: 67, name: '', label: 'Total active deliverables', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_TOTAL', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 68, name: '', label: 'Rows with a flag', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_FLAGGED', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 69, name: '', label: 'Ready for Canva', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_READY', format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 70, name: '', label: 'Feed errors', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_ERRORS', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 71, name: '', label: 'Carousel pages this week', owner: IS9WD_OWN.SCRIPT, formula: '=IS9WD_FEED_PAGES', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 72, name: '', label: 'Rows used of 2000', owner: IS9WD_OWN.SCRIPT, formula: '=COUNTIF(IS9WD_DEL_ID,"?*")', format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 73, name: 'IS9WD_DIAG_LAST_RUN', label: 'Last dispatcher run', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.STAMP, align: IS9WD_ALIGN.RIGHT },
    { row: 74, name: 'IS9WD_DIAG_QUOTA', label: 'Last remaining mail quota', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
    { row: 75, name: 'IS9WD_DIAG_SELFTEST', label: 'Last self test result', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 76, name: 'IS9WD_DIAG_DEPLOYMENT', label: 'Live deployment access last checked', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT },
    { row: 77, name: 'IS9WD_DIAG_OVERRIDES', label: 'Today override and week number override', owner: IS9WD_OWN.CODE, format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT }
  ]
};

// ---------------------------------------------------------------------------
//  4.8B DIRECTORY MACHINERY  (the five columns a president never sets)
// ---------------------------------------------------------------------------

// Fourteen rows, same order and same Key as `THE PEOPLE` on 00 | Configuration, joined by
// row position. Key, Carousel order and Hierarchy order are written once and never
// rewritten: the master design's pages are physical, so renumbering an ordinal would send
// two committees to one page (4.8). Token prefix and Token issued are code written and
// exist for identification only: the token itself is never in a cell.
IS9WD_ENG.DIRECTORY = {
  key: 'DIRECTORY',
  tab: 'ENGINE',
  title: 'DIRECTORY MACHINERY',
  help: 'One row per officer, in the same order as THE PEOPLE on ' + IS9WD_TAB.CONFIG +
    ' and ' +
    'joined to it by row. Never insert, delete or sort a row here.',
  titleRow: 79,
  hintRow: 80,
  headerRow: 81,
  firstRow: 82,
  lastRow: 95,
  firstCol: 1,
  lastCol: 6,
  columns: [
    { header: 'Key', owner: IS9WD_OWN.ONCE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Carousel order', owner: IS9WD_OWN.ONCE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.WRAP },
    { header: 'Hierarchy order', owner: IS9WD_OWN.ONCE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.WRAP },
    { header: 'Token prefix', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Token issued', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP },
    { header: 'Revoked', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.CENTER, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.CHECKBOX } }
  ]
};

// ---------------------------------------------------------------------------
//  4.5A WEEKLY SIGN-OFF STORE  (last block on the tab, so it can grow downward)
// ---------------------------------------------------------------------------

// Append or replace by week, never cleared: this is what lets the Archive record who
// signed off on which week after the names have moved on.
//
// IT IS THE LAST BLOCK ON `_Engine` FOR THE REASON IT WAS THE LAST BLOCK ON
// `00 | Configuration`: setup may widen an append only block and may never migrate its
// rows, so nothing may ever sit below it. The move itself was free, because the store
// holds zero filled rows today, and it had to land before Gate A for the same reason.
IS9WD_ENG.STORE = {
  key: 'STORE',
  tab: 'ENGINE',
  title: 'WEEKLY SIGN-OFF STORE',
  help: 'One row per week, keyed on that week Monday. Written by the officers\' page each ' +
    'week, or typed here when the page is down.',
  titleRow: 97,
  hintRow: 98,
  headerRow: 99,
  firstRow: 100,
  lastRow: 151,
  firstCol: 1,
  lastCol: 7,
  checkCol: 7,
  checkFormula: '=IF($A{row}="","",IF(WEEKDAY($A{row},2)<>1,"Week start is not a Monday",IF(COUNTIF($A${first}:$A${last},$A{row})>1,"Duplicate week","OK")))',
  growBy: 52,
  minFreeRows: 4,
  columns: [
    { header: 'Week start', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP, validate: { kind: IS9WD_V.DATE, help: 'The Monday the week starts.' }, hint: 'The Monday that week starts.' },
    { header: 'Prepared by name', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Prepared by position', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Checked by name', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Checked by position', owner: IS9WD_OWN.APPEND, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    { header: 'Set at', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
    { header: 'Check', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP }
  ]
};

// Painting order, top to bottom. The store is last because it grows downward.
IS9WD_ENG.BLOCKS = ['WEEKCALC', 'WINDOWS', 'STATUS', 'SCHEDULE', 'CAPACITY',
  'PLUMBING', 'THRESHOLDS', 'DIAGNOSTICS', 'DIRECTORY', 'STORE'];

// One short blank row before each block's title, computed from the block list rather
// than typed, so a block that moves takes its own spacer with it. A plain loop over
// object literals: nothing here calls into IS9WD_Core.js, which is not loaded yet.
function IS9WD_spacerRowsFor_(holder, blocks) {
  var out = [];
  for (var i = 0; i < blocks.length; i++) {
    var block = holder[blocks[i]];
    if (!block) continue;
    var before = block.titleRow - 1;
    if (before > holder.HELP_ROW) out.push(before);
  }
  return out;
}

IS9WD_CFG.SPACER_ROWS = IS9WD_spacerRowsFor_(IS9WD_CFG, IS9WD_CFG.BLOCKS);
IS9WD_ENG.SPACER_ROWS = IS9WD_spacerRowsFor_(IS9WD_ENG, IS9WD_ENG.BLOCKS);

// The two settings tabs, in the order setup writes them. Both carry the same two block
// shapes, so one writer and one painter cover both.
var IS9WD_SETTINGS_TABS = [
  { tabKey: 'CONFIG', holder: IS9WD_CFG },
  { tabKey: 'ENGINE', holder: IS9WD_ENG }
];

function IS9WD_settingsHolder_(tabKey) {
  var key = IS9WD_trim_(tabKey).toUpperCase();
  for (var i = 0; i < IS9WD_SETTINGS_TABS.length; i++) {
    if (IS9WD_SETTINGS_TABS[i].tabKey === key) return IS9WD_SETTINGS_TABS[i].holder;
  }
  return null;
}

// Every row block on either settings tab, flattened, so the name list, the guard list and
// the self test all walk one list instead of four.
function IS9WD_settingsRowBlocks_() {
  var out = [];
  for (var t = 0; t < IS9WD_SETTINGS_TABS.length; t++) {
    var holder = IS9WD_SETTINGS_TABS[t].holder;
    for (var b = 0; b < holder.BLOCKS.length; b++) {
      var block = holder[holder.BLOCKS[b]];
      if (block && block.rows) out.push(block);
    }
  }
  return out;
}

function IS9WD_settingsTableBlocks_() {
  var out = [];
  for (var t = 0; t < IS9WD_SETTINGS_TABS.length; t++) {
    var holder = IS9WD_SETTINGS_TABS[t].holder;
    for (var b = 0; b < holder.BLOCKS.length; b++) {
      var block = holder[holder.BLOCKS[b]];
      if (block && block.columns) out.push(block);
    }
  }
  return out;
}

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
    ['ARCHIVE_WEEK', 'Weekly', 'Saturday', 22, 2, true],
    ['RETIRE_ACCOMPLISHED', 'Weekly', 'Saturday', 23, 2, true]
  ],

  // Key, Carousel order, Committee or office, Position label, Publishes,
  // Hierarchy order. Full name and Email stay blank: they are 14 students' names
  // and DLSU addresses and they live only in the Sheet (4.8).
  // The nine committee spellings are exactly what their Canva headline prints.
  DIRECTORY: [
    ['K01', 6, 'Partnerships', 'VICE PRESIDENT', true, 6],
    ['K02', 7, 'Publications', 'VICE PRESIDENT', true, 7],
    ['K03', 8, 'Marketing and Advocacy', 'VICE PRESIDENT', true, 8],
    ['K04', 9, 'Membership', 'VICE PRESIDENT', true, 9],
    ['K05', 10, 'Team Management', 'VICE PRESIDENT', true, 10],
    ['K06', 11, 'Investment Strategy & Education', 'VICE PRESIDENT', true, 11],
    ['K07', 12, 'Investment Research', 'VICE PRESIDENT', true, 12],
    ['K08', 13, 'Documentation', 'VICE PRESIDENT', true, 13],
    ['K09', 14, 'Finance', 'VICE PRESIDENT', true, 14],
    ['K10', 1, 'President', 'PRESIDENT', true, 1],
    ['K11', 2, 'Executive Vice President for Externals', 'EXECUTIVE VICE PRESIDENT FOR EXTERNALS', true, 2],
    ['K12', 3, 'Executive Vice President for Internals', 'EXECUTIVE VICE PRESIDENT FOR INTERNALS', true, 3],
    ['K13', 4, 'Executive Vice President for Investments', 'EXECUTIVE VICE PRESIDENT FOR INVESTMENTS', true, 4],
    ['K14', 5, 'Executive Vice President for Operations', 'EXECUTIVE VICE PRESIDENT FOR OPERATIONS', true, 5]
  ]
};

// Fourteen rows, all fourteen publishing, counted rather than asserted, because the
// feed's whole size follows from this number (6.3). Carousel order and hierarchy order
// now hold the same fourteen values, and they stay two columns on purpose: one is the
// physical page arithmetic and one is the order every list a person reads is sorted by,
// and a later administration may want them to differ.
var IS9WD_DIR_ROWS = IS9WD_DEFAULTS.DIRECTORY.length;

// ============================================================================
//  02 | DELIVERABLES  (reference 5)
// ============================================================================

var IS9WD_ITEMS = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  headerRow: 3,
  // Row 4 is the plain English hint row, added on Ethan's instruction of 2026-09-27:
  // every cell he types into carries an explanation, and on a 2,000 row table the honest
  // place for it is one sentence per column immediately above the column, inside the
  // frozen pane, plus the same sentence as the note on each of that column's cells. A
  // note per cell would be 10,000 notes and a minute of every build.
  hintRow: 4,
  firstRow: 5,
  lastRow: 2004,
  firstCol: 1,
  // R is the one column after the derived block: a stamp the script writes when an officer
  // has been told about the row. Added at the end so nothing on the tab moved (2026-09-29).
  lastCol: 18,
  BANNER: IS9WD_TAB.ITEMS.toUpperCase(),
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
      validate: { kind: IS9WD_V.NAMED_LIST, source: 'IS9WD_DIR_NAME', help: 'Pick a committee or office from the directory.' },
      hint: 'Pick whose task this is from the dropdown. Typing anything not on the list ' +
        'flags the row and keeps it off the carousel.'
    },
    {
      header: 'Title of Task', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.FORMULA, formula: '=LEN($C{row})<=40', help: 'Max 40 characters. Start with a verb.' },
      hint: 'What has to be done, in 40 characters or fewer, starting with a verb. This ' +
        'is printed on the slide exactly as typed, so anything longer is refused.'
    },
    {
      header: 'Deadline', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.RIGHT,
      format: IS9WD_FMT.DEADLINE, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.DATE, help: 'A date, no time. A time goes in the remark.' },
      hint: 'The day it is due. A date only, never a time: put a time in the remark. ' +
        'Leave it empty and the row is flagged and never reaches a slide.'
    },
    {
      header: 'Remark', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.FORMULA, formula: '=LEN($E{row})<=30', help: 'Instructions only (where it goes, who signs off). Never progress or status.' },
      hint: 'One short instruction, 30 characters or fewer: where it goes, who signs it ' +
        'off. Never progress and never a status, because this is printed under the task.'
    },
    {
      header: 'Status', owner: IS9WD_OWN.ETHAN, align: IS9WD_ALIGN.LEFT,
      format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP,
      validate: { kind: IS9WD_V.NAMED_LIST, source: 'IS9WD_STATUS_LIST', help: 'Pick a status from the status list.' },
      hint: 'Leave this on Open. The officer changes it from their phone, and you change ' +
        'it here only to reopen something that was ticked by mistake.'
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
    { header: 'Slot key', owner: IS9WD_OWN.SCRIPT, align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
    // WHEN THE OFFICER WAS TOLD. Blank means nobody has been emailed about this row yet, so
    // the hourly pass sends a New on your list notice and stamps it; the Monday email stamps
    // everything it lists. Ethan can clear a cell to have a row announced again, and a row
    // that is cleared by a retire or a delete loses its stamp with the rest.
    {
      header: 'Notified at', owner: IS9WD_OWN.CODE, align: IS9WD_ALIGN.RIGHT,
      format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP,
      hint: 'Filled by the script when the officer has been emailed about this row. Clear it ' +
        'to have the row announced again.'
    }
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
  var slides = parts === 1 ? 'on their one slide' : 'across ' + parts + ' slides';
  return 'One row per deliverable. Enter as many as the week really holds: nothing is refused. ' +
    'An officer\'s first ' + max + ' active items reach the carousel, ' + per + ' to a slide ' +
    slides + '; the rest are tracked, emailed and reported, and the Sunday brief names them. ' +
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
//
// The budget is one slot count per officer plus slack, and it is deliberately NOT
// multiplied by the page count. A flag is one flagged item, and how many slides that
// officer takes has nothing to do with it. Multiplying by parts is what made this
// budget halve the day continuation pages were dropped, which would have held the
// carousel at 181 flagged rows on a workbook whose flag count had not moved.
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
    flagRows: dir * per + IS9WD_FEED_FLAG_SLACK,
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

// Looks a setting's shipping default up by its range name, across every row block on
// both settings tabs, so a value is written once where it lives and read from there. It
// walks both tabs because the capacity numbers and the statistics thresholds moved to
// `_Engine` and the switches stayed, and no caller should have to know which.
function IS9WD_switchDefault_(name) {
  var blocks = IS9WD_settingsRowBlocks_();
  for (var b = 0; b < blocks.length; b++) {
    var rows = blocks[b].rows;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].name === name && rows[i].value !== undefined) return rows[i].value;
    }
  }
  return null;
}

var IS9WD_FEED_CACHE_ = null;

// The shipping layout: fourteen publishing rows, fifteen slots, one part.
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
    // No HELP: the feed has no help row by design. Row 1 is its identity line, which the
    // Drive connector reads to tell which tab it is looking at, and row 2 is already a
    // block. A HELP string was set here for months and painted nowhere.
    layout.BANNER = IS9WD_TAB.FEED;
    IS9WD_FEED_CACHE_ = layout;
  }
  return IS9WD_FEED_CACHE_;
}

// ============================================================================
//  03 | STATISTICS  (reference 6A: a dashboard, not a settings page)
// ============================================================================

// Ethan's instruction of 2026-09-27, verbatim: "for the statistics, i don't it to be a
// configuration, i want to see KPIs and Charts, literally for viewing". So the tab is
// four things and nothing else:
//
//   1. EIGHT KPI TILES. A big number, a small label under it and one short line under
//      that. Two rows of four. The first tile of each row sits across the two wide
//      columns, because the week line and the readiness verdict are the two longest
//      strings; the other three are the same size as each other.
//   2. ONE TABLE OF SENTENCES, `WHAT NEEDS ATTENTION`, where the long readings live:
//      who to chase, who has nothing entered, which gate holds the carousel.
//   3. THREE REAL EMBEDDED CHARTS, built with the Apps Script chart builder and anchored
//      on the tab: due against accomplished per committee, the fairness adjusted track
//      record, and the weekly trend. Each one sits in its own reserved band with a
//      caption above it, and the caption says what will fill the chart when it is empty.
//   4. THREE TABLES that were already worth reading: by officer, ranked, and the trend.
//
// What left the tab: every threshold, which is now on `_Engine`; the whole hidden helper
// band, which is now on `_Views`; and `OPERATIONAL HEALTH` and `SCHEDULED JOBS`, which
// are the machine reporting on itself and are on `_Views` too. `READINESS GATES` stayed,
// because seven words saying what is holding the carousel is the most actionable thing on
// the tab, and because one cell compares it against the feed's own verdict and fails the
// self test when the two disagree.
//
// Three rules from elsewhere still apply, unchanged and load bearing. A1 carries the
// tab's own name, because the Drive connector strips tab names. The last row carries the
// literal end marker, so a truncated read is self evident rather than merely short. And
// NOTHING on the tab is merged: a tile is a wide column, a big type size and overflow
// wrap, never a merge, because the connector renders a merged cell as repeated
// `[merged]` values.

var IS9WD_STATS = {
  BANNER: IS9WD_TAB.STATS.toUpperCase(),
  HELP: 'A dashboard. There is nothing to fill in here and nothing here can hold the ' +
    'carousel: every number is worked out from ' + IS9WD_TAB.ITEMS + ', ' +
    IS9WD_TAB.ARCHIVE + ' and ' + IS9WD_TAB.CONFIG +
    '. A plain number needs nothing from you; a number that is marked ' +
    'names something to do. Due, Done and Rate cover this week only, while Overdue, ' +
    'Worst late, Silent, On time, Judged and Avg days cover everything still on the data ' +
    'tab. A task ticked this week counts against the week its deadline fell in. Silence ' +
    'is evidence and not proof, because changing a status from the Sheet resets it too.',
  END: 'IS9WD STATS END',
  // The visible sentinel, byte for byte the feed's, for the same reason: a blank caused
  // by a broken named range is indistinguishable from a legitimately empty cell, and
  // four places on this tab have blank as their contract.
  ERR: '!ERR'
};

// The eight tiles, in reading order, four to a row. { key, label, note } where the label
// is the small caption under the number and the note is the one short line under that.
// The key is the machine key, so IS9WD_Stats.js throws on an unknown one rather than
// writing eight formulas one tile out of place.
//
// The four columns are RELATIVE TO THE TILE CARD, not to the sheet, because the card is
// one cell of the three across grid and its first column moves with the grid. Four tiles
// across a twelve column card is three columns each, and the first is the widest in pixels
// because it carries the week line and the readiness verdict, which are the two longest
// strings. Overflow wrap lets each one use its own three columns and no more.
var IS9WD_STATS_TILE_COLS = [
  { col: 1, span: 3 }, { col: 4, span: 3 }, { col: 7, span: 3 }, { col: 10, span: 3 }
];

var IS9WD_STATS_TILE_ROW_A = ['T.WEEK', 'T.ACTIVE', 'T.DONE', 'T.PACE'];
var IS9WD_STATS_TILE_ROW_B = ['T.READY', 'T.OVERDUE', 'T.SOON', 'T.NOITEMS'];

var IS9WD_STATS_TILES = [
  ['T.WEEK', 'THIS WEEK'],
  ['T.ACTIVE', 'STILL TO DO'],
  ['T.DONE', 'DONE'],
  ['T.PACE', 'AGAINST PACE'],
  ['T.READY', 'CANVA'],
  ['T.OVERDUE', 'LATE NOW'],
  ['T.SOON', 'DUE IN 2 DAYS'],
  ['T.NOITEMS', 'OFFICERS WITH NOTHING']
];

// The six sentence rows. Three of them carry a named value of their own; the other three
// point at a tile, so every one of the eleven measures is named exactly once on the tab.
var IS9WD_STATS_ATTENTION_ROWS = [
  ['A.OVERDUE', 'Late right now'],
  ['A.NOITEMS', 'Officers with nothing entered for this week'],
  ['A.SILENT', '="Officers silent for "&IS9WD_STATS_SILENT_DAYS&" days or more"'],
  ['A.BLOCKING', 'Flags blocking the carousel'],
  ['A.NOTPUB', 'Tasks with no slide'],
  ['A.READY', 'Ready for Canva']
];

// Seven gates, the same seven the readiness formula reads, six of them a plain read of a
// cell that already exists. The seventh reads this tab's own blocking count, so the eight
// flag names exist once here and nowhere else on the tab (6A).
var IS9WD_STATS_GATE_ROWS = [
  ['G.TERM', 'In term'],
  ['G.SIGNOFF', 'Sign-off set for this week'],
  ['G.CAPACITY', 'Capacity check'],
  ['G.PLAN', 'Plan check'],
  ['G.FLAGCAP', 'Flag list check'],
  ['G.ERRORS', 'Feed errors'],
  ['G.BLOCKING', 'Blocking flags on publishing rows']
];

// `OPERATIONAL HEALTH`, which moved to _Views with the rest of the machinery. It is the
// machine reporting on itself: useful when something is wrong, noise on a dashboard.
var IS9WD_STATS_HEALTH_ROWS = [
  ['H.READY', 'Ready for Canva'],
  ['H.PAGES', 'Carousel pages this week'],
  ['H.EXPORT', 'Export page list'],
  ['H.MASTER', 'Master pages required'],
  ['H.LASTRUN', 'Automation last run'],
  ['H.MODE', 'Automation and test mode'],
  ['H.SELFTEST', 'Last self test'],
  ['H.QUOTA', 'Mail quota at the last run'],
  ['H.OVERRIDES', 'Overrides, and the links'],
  ['H.ROWS', '="Rows used of "&ROWS(IS9WD_DEL_ID)'],
  ['H.ROOM', 'Weeks of row room left']
];

var IS9WD_STATS_HEADERS = {
  ATTENTION: ['What', 'Number', 'What to do about it'],
  OFFICER: ['Committee or office', 'Attention', 'Due', 'Done', 'Rate', 'Overdue',
    'Worst late', 'Silent', 'On time', 'Judged', 'Avg days', 'No slide'],
  RANKED: ['Rank', 'Officer', 'On time', 'Judged', 'Note'],
  TREND: ['Week', 'Week start', 'Published', 'Accomplished', 'On time', 'Recorded'],
  GATES: ['Gate', 'State', 'What it reads, and what to do'],
  KV: ['Measure', 'Value', 'Reading'],
  // Last run before On, against the reading order elsewhere, because a timestamp needs
  // 210 px and the value has to sit where it fits.
  JOBS: ['Job key', 'Last run', 'On', 'Last status'],
  // _Views' own two helper tables.
  VIEW_OFFICER: ['Officer', 'Person', 'Position', 'Carousel', 'Hierarchy', 'Load',
    'First due', 'Last tick', 'Silent n', 'Blocking', 'Active all', 'Done all', 'Total'],
  VIEW_RANK: ['Officer', 'Score', 'Judged'],
  VIEW_TREND: ['Monday', 'Term start']
};

// The twelve visible officer columns, in column order.
var IS9WD_STATS_OFF_COL_NAMES = ['IS9WD_STATS_OFF_NAME', 'IS9WD_STATS_OFF_ATTENTION',
  'IS9WD_STATS_OFF_DUE', 'IS9WD_STATS_OFF_DONE', 'IS9WD_STATS_OFF_RATE',
  'IS9WD_STATS_OFF_OVERDUE', 'IS9WD_STATS_OFF_LATE', 'IS9WD_STATS_OFF_SILENT',
  'IS9WD_STATS_OFF_ONTIME', 'IS9WD_STATS_OFF_JUDGED', 'IS9WD_STATS_OFF_AVGDAYS',
  'IS9WD_STATS_OFF_NOTPUB'];

// The officer helper band, by column, now on `_Views`. Column A is the identity sort's
// own first column and carries a name of its own, because the visible column on
// 03 | Statistics is a pointer at it rather than a second lookup. 04 | Officer Tables
// reads the last three rather than recomputing them, which is what stops the two views
// disagreeing about a count.
var IS9WD_STATS_OFF_HELPER_NAMES = {
  1: 'IS9WD_STATS_OFF_SORTNAME', 2: 'IS9WD_STATS_OFF_VP',
  3: 'IS9WD_STATS_OFF_POSITION', 4: 'IS9WD_STATS_OFF_CAROUSEL',
  5: 'IS9WD_STATS_OFF_HIER', 6: 'IS9WD_STATS_OFF_LOAD',
  7: 'IS9WD_STATS_OFF_FIRSTDUE', 8: 'IS9WD_STATS_OFF_LASTTICK',
  9: 'IS9WD_STATS_OFF_SILENT_N', 10: 'IS9WD_STATS_OFF_BLOCKING',
  11: 'IS9WD_STATS_OFF_ACTIVE_ALL', 12: 'IS9WD_STATS_OFF_DONE_ALL',
  13: 'IS9WD_STATS_OFF_TOTAL'
};

// The ranked block's three sort helpers, on `_Views`.
var IS9WD_STATS_RANK_HELPER_NAMES = {
  1: 'IS9WD_STATS_RANK_KEY', 2: 'IS9WD_STATS_RANK_SCORE', 3: 'IS9WD_STATS_RANK_JUDGED'
};

// The trend block's two helpers, on `_Views`. Deliberately not IS9WD_STATS_TREND_WEEK,
// which is one character from the setting IS9WD_STATS_TREND_WEEKS and would be read
// wrong by eye in a formula.
var IS9WD_STATS_TREND_HELPER_NAMES = {
  1: 'IS9WD_STATS_TRENDMONDAY', 2: 'IS9WD_STATS_TRENDTERM'
};

// One name per tile and per named attention row, so 04 | Officer Tables, the gates block
// and the Sunday brief read a number instead of recomputing it.
var IS9WD_STATS_VALUE_NAMES = {
  'T.WEEK': 'IS9WD_STATS_WEEK',
  'T.ACTIVE': 'IS9WD_STATS_ACTIVE_WEEK',
  'T.DONE': 'IS9WD_STATS_DONE_WEEK',
  'T.PACE': 'IS9WD_STATS_PACE',
  'T.READY': 'IS9WD_STATS_READY',
  'T.OVERDUE': 'IS9WD_STATS_OVERDUE_NOW',
  'T.SOON': 'IS9WD_STATS_DUE_SOON',
  'T.NOITEMS': 'IS9WD_STATS_NO_ITEMS',
  'A.SILENT': 'IS9WD_STATS_SILENT',
  'A.BLOCKING': 'IS9WD_STATS_BLOCKING',
  'A.NOTPUB': 'IS9WD_STATS_PAST_CAROUSEL',
  'H.ROOM': 'IS9WD_STATS_ROOM_WEEKS'
};

// The six visible trend columns.
var IS9WD_STATS_TREND_COL_NAMES = {
  1: 'IS9WD_STATS_TRENDNO', 2: 'IS9WD_STATS_TRENDSTART',
  3: 'IS9WD_STATS_TRENDPUBLISHED', 4: 'IS9WD_STATS_TRENDDONE',
  5: 'IS9WD_STATS_TRENDONTIME', 6: 'IS9WD_STATS_TRENDRECORDED'
};

// THE THREE CHARTS, declared here so the layout, the painter and the self test agree
// about how many there are and where each one sits.
//
// `rows` is the band of blank rows the chart is drawn over. A chart is an overlay: it
// does not consume cells, so the rows underneath it must be empty or the chart hides
// content. At 26 px a row, 14 rows is 364 px of grid for a 330 px chart.
//
// `kind` is the builder's chart type. `caption` is the row above the chart, and it is a
// formula rather than a literal precisely so an empty chart says what will fill it.
var IS9WD_STATS_CHART_ROWS = 14;
var IS9WD_STATS_CHART_HEIGHT = 330;
// A chart is drawn over its own card, so its width is ITS OWN card's width in pixels,
// summed from IS9WD_WIDTH.STATS across that card's columns, less an inset each side so the
// card border stays visible. The three cards are not equal widths, so one shared number
// left every chart a different distance from its own right border and the three did not
// line up. This constant survives only as the fallback for a width table too short to
// measure, and IS9WD_statsChartWidth_ is what the painter calls.
var IS9WD_STATS_CHART_WIDTH = 1160;
var IS9WD_STATS_CHART_INSET = 12;

var IS9WD_STATS_CHARTS = [
  {
    key: 'C.OFFICER', kind: 'COLUMN',
    title: 'DUE AGAINST DONE, BY OFFICER',
    help: 'This week only, fourteen officers in hierarchy order. A tall Due bar beside a ' +
      'short Done bar is the officer to chase.'
  },
  {
    key: 'C.RANK', kind: 'BAR',
    title: 'TRACK RECORD, FAIRNESS ADJUSTED',
    help: 'The share of each officer\'s past-deadline tasks that were ticked on or before ' +
      'the deadline, so a busy committee is not punished for being busy. An officer with ' +
      'too few judged tasks is not scored at all.'
  },
  {
    key: 'C.TREND', kind: 'LINE',
    title: 'WEEK BY WEEK',
    help: 'Read from ' + IS9WD_TAB.ARCHIVE + ', oldest week on the left. Published is ' +
      'reliable; ' +
      'Accomplished is recorded only for a task that has been retired.'
  }
];

// Every row number on the tab, computed from the directory's own row count and the trend
// weeks setting, so no module hardcodes the last row. Build or repair rewrites every
// block, every chart and the error scan together or none of them.
// ---------------------------------------------------------------------------
//  THE THREE ACROSS GRID  (2.5, and it governs both computed views)
// ---------------------------------------------------------------------------

// Ethan's instruction of 2026-09-27, verbatim: "use the columns (width of the sheet),
// extend until Column AA and beyond. For both tabs i want three tables beside each other
// with one column separating them, have borders and backgrounds as well. So stack those
// tables as well with one row separating it from above".
//
// So: three cards across, EXACTLY ONE empty column between neighbours, EXACTLY ONE empty
// row between stacked rows of three, and every card carrying its own heading band, its own
// body background and a border around the whole of it. The separator column and the
// separator row carry no fill and no border at all, because that is the only thing making
// three cards read as three cards rather than as one wide table with headings in it.
//
// A grid cell is a fixed number of columns, the same for all three, so a card in the second
// row lines up under the card above it and the column widths are set once per cell and
// repeated. That is also why the grid runs past column AA rather than being packed to the
// widest table: a twelve column card three times over is 38 columns, and a nine column card
// three times over is 29.
var IS9WD_GRID = { ACROSS: 3, GAP: 1 };

// ============================================================================
//  00 | DASHBOARD  (the front door, added 2026-09-28)
// ============================================================================

// WHAT THIS TAB IS FOR, in one sentence: it answers "what do I do right now".
//
// It is read only, nothing on it is typed, and NO CELL ON IT IS CREAM, which is the rule
// that keeps the cream signal meaning one thing. It names no officer and holds no table of
// fourteen rows, because that is what 05 | Officer Tables is for, and it carries no chart,
// because a chart is 330 px and this tab's whole claim is one screen with no scrolling.
//
// Every value on it is READ FROM A NAMED RANGE THAT ALREADY EXISTS. Not one number is
// recomputed here. That is deliberate: a dashboard that recomputes is a dashboard that can
// disagree with the tab it summarises, and the seven readiness gates in particular are
// mirrored from 04 | Statistics rather than evaluated again, so the workbook keeps exactly
// two independent readings of them and not three.
//
// Its largest single gain is promoting the machine's own state out of _Views, which is
// hidden. Before this tab existed, nothing Ethan could see said whether the hourly trigger
// had run, whether TEST mode was on, how much mail quota was left, whether a link was
// revoked, or whether the last self test passed.
var IS9WD_DASH_CELL_COLS = 6;

// The value column of a card row, and the four it overflows into.
var IS9WD_DASH_LABEL_COL = 1;
var IS9WD_DASH_VALUE_COL = 2;

var IS9WD_DASH_BANNER = 'IS9 WEEKLY DELIVERABLES  ·  WHAT TO DO RIGHT NOW';
var IS9WD_DASH_HELP = 'Read only. Nothing here is typed and nothing here is merged. ' +
  'Every number is read from another tab, so this page can never disagree with one.';

// Six cards, three across, two rows of three. `rows` is [label, formula, kind], and kind
// drives the number format and the alignment through IS9WD_KIND_FMT_, so no card sets a
// format by hand.
//
// `flag` is optional and is the one thing on the tab that gets a treatment: bold #724485
// when it is TRUE, which is the workbook's blocking colour, on the paper background and
// never on cream. Everything calm is left undecorated, which is the palette restraint rule.
function IS9WD_dashCards_() {
  var q = function (name) { return 'IFERROR(' + name + ',"!ERR")'; };
  return [
    {
      key: 'D.WEEK', title: 'THIS WEEK',
      help: 'The week every other tab describes. Sunday rolls it over.',
      rows: [
        { label: 'Week number', formula: '=' + q('IS9WD_WEEK_NUMBER'), kind: 'count' },
        { label: 'Monday', formula: '=' + q('IS9WD_WEEK_START'), kind: 'date' },
        { label: 'Sunday', formula: '=' + q('IS9WD_WEEK_END'), kind: 'date' },
        { label: 'Academic year', formula: '=' + q('IS9WD_AY_LABEL'), kind: 'text' },
        { label: 'Trimester', formula: '=IF(IS9WD_TERM_ACTIVE="","none active, so every ' +
            'job is paused",IS9WD_TERM_ACTIVE)', kind: 'text',
          flag: '=IS9WD_TERM_ACTIVE=""' },
        { label: 'Tasks entered', formula: '=COUNTIF(IS9WD_DEL_ID,"?*")&" of "&' +
            'ROWS(IS9WD_DEL_ID)', kind: 'text' },
        { label: 'Still to do', formula: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,' +
            'IS9WD_DEL_TITLE,"<>")', kind: 'count' }
      ]
    },
    {
      key: 'D.READY', title: 'READY FOR CANVA',
      help: 'Row one is the feed\'s own verdict. The rest is why.',
      rows: [
        { label: 'Verdict', formula: '=' + q('IS9WD_FEED_READY'), kind: 'text',
          flag: '=IFERROR(RIGHT(IS9WD_FEED_READY,2)="NO",TRUE)' },
        { label: 'Slides this week', formula: '=' + q('IS9WD_FEED_PAGES'), kind: 'count' },
        { label: 'Master pages needed', formula: '=' + q('IS9WD_FEED_MASTER'),
          kind: 'count' },
        { label: 'Tasks with no slide', formula: '=' + q('IS9WD_FEED_NOTPUB'),
          kind: 'count' },
        { label: 'Gates holding', formula: '=IFERROR(COUNTIF(IS9WD_STATS_GATE_STATE,' +
            '"HOLD"),"!ERR")&" of "&IFERROR(ROWS(IS9WD_STATS_GATE_STATE),"?")',
          kind: 'text',
          flag: '=IFERROR(COUNTIF(IS9WD_STATS_GATE_STATE,"HOLD")>0,TRUE)' },
        { label: 'First gate holding', formula: '=IFERROR(IF(COUNTIF(' +
            'IS9WD_STATS_GATE_STATE,"HOLD")=0,"none, the carousel is clear",' +
            'INDEX(IS9WD_STATS_GATE_LABEL,MATCH("HOLD",IS9WD_STATS_GATE_STATE,0))),' +
            '"!ERR")', kind: 'text',
          flag: '=IFERROR(COUNTIF(IS9WD_STATS_GATE_STATE,"HOLD")>0,TRUE)' },
        { label: 'Export these pages', formula: '=' + q('IS9WD_FEED_EXPORT'),
          kind: 'text' }
      ]
    },
    {
      key: 'D.YOU', title: 'ONLY YOU CAN DO THESE',
      help: 'Things no automation can do for you. A zero means nothing waiting.',
      rows: [
        { label: 'Set this week\'s sign-off', formula: '=IF(IS9WD_SIGNOFF_SET,' +
            '"done for this week","not set, so Ready for Canva reads NO")', kind: 'text',
          flag: '=NOT(IS9WD_SIGNOFF_SET)' },
        { label: 'Blocking flags to fix', formula: '=' + q('IS9WD_STATS_BLOCKING'),
          kind: 'count', flag: '=IFERROR(N(IS9WD_STATS_BLOCKING)>0,FALSE)' },
        { label: 'Overdue and still open', formula: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,' +
            'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,"<"&IS9WD_EFFECTIVE_TODAY)',
          kind: 'count',
          flag: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",' +
            'IS9WD_DEL_DEADLINE,"<"&IS9WD_EFFECTIVE_TODAY)>0' },
        // IS9WD_DIR_VP, not IS9WD_DIR_NAME. The directory's column names read oddly: NAME
        // is the committee or office, which setup fills in itself, and VP is the person's
        // name, which is Ethan's to type. Counting NAME could never report anything.
        { label: 'Officers with no name', formula: '=ROWS(IS9WD_DIR_VP)-' +
            'COUNTIF(IS9WD_DIR_VP,"?*")', kind: 'count',
          flag: '=ROWS(IS9WD_DIR_VP)-COUNTIF(IS9WD_DIR_VP,"?*")>0' },
        { label: 'Officers with no address', formula: '=ROWS(IS9WD_DIR_EMAIL)-' +
            'COUNTIF(IS9WD_DIR_EMAIL,"?*")', kind: 'count',
          flag: '=ROWS(IS9WD_DIR_EMAIL)-COUNTIF(IS9WD_DIR_EMAIL,"?*")>0' },
        { label: 'Officers with no link', formula: '=ROWS(IS9WD_DIR_PREFIX)-' +
            'COUNTIF(IS9WD_DIR_PREFIX,"?*")-1', kind: 'count' },
        { label: 'Links revoked', formula: '=COUNTIF(IS9WD_DIR_REVOKED,TRUE)',
          kind: 'count', flag: '=COUNTIF(IS9WD_DIR_REVOKED,TRUE)>0' }
      ]
    },
    {
      key: 'D.MACHINE', title: 'IS THE MACHINE RUNNING',
      help: 'State you could not see before, because it was on a hidden tab.',
      rows: [
        { label: 'Hourly job last ran', formula: '=IF(ISNUMBER(IS9WD_DIAG_LAST_RUN),' +
            'ROUND((NOW()-IS9WD_DIAG_LAST_RUN)*24,1)&" hours ago",' +
            '"never on this workbook")', kind: 'text',
          flag: '=IF(ISNUMBER(IS9WD_DIAG_LAST_RUN),(NOW()-IS9WD_DIAG_LAST_RUN)*24>3,' +
            'TRUE)' },
        { label: 'Automation', formula: '=IF(IS9WD_AUTOMATION_ON,"on","off, so no job ' +
            'runs")', kind: 'text', flag: '=NOT(IS9WD_AUTOMATION_ON)' },
        { label: 'Test mode', formula: '=IF(IS9WD_TEST_MODE,"ON, so every email goes to ' +
            'you","off, so email goes to the officers")', kind: 'text' },
        { label: 'Mail left today', formula: '=IF(IS9WD_DIAG_QUOTA="","not measured yet",' +
            'IS9WD_DIAG_QUOTA&", reserve "&IS9WD_QUOTA_RESERVE)', kind: 'text' },
        // The verdict first, then the stamp. IS9WD_DIAG_SELFTEST leads with a timestamp and
        // puts the pass and fail counts after it, so in 316 px of run-on room the half that
        // matters was the half that got cut. The column cannot widen: all three card sets
        // share one width table, so widening it costs the tab its no-scroll claim.
        { label: 'Last self test', formula: '=IF(IS9WD_DIAG_SELFTEST="","not run on this ' +
            'workbook yet",IF(ISNUMBER(SEARCH("fail",IS9WD_DIAG_SELFTEST)),"FAILED  ","OK  ")' +
            '&IS9WD_DIAG_SELFTEST)', kind: 'text',
          flag: '=IFERROR(ISNUMBER(SEARCH("fail",IS9WD_DIAG_SELFTEST)),FALSE)' },
        { label: 'Overrides set', formula: '=IF(IS9WD_DIAG_OVERRIDES="","none",' +
            'IS9WD_DIAG_OVERRIDES)', kind: 'text' },
        { label: 'Officers\u0027 page address', formula: '=IF(IS9WD_APP_BASE_URL="",' +
            '"not set yet, so no email can link to it","set")', kind: 'text',
          flag: '=IS9WD_APP_BASE_URL=""' },
        { label: 'Endpoint address', formula: '=IF(IS9WD_ENDPOINT_URL="","not set yet, ' +
            'so the page cannot reach the sheet","set")', kind: 'text',
          flag: '=IS9WD_ENDPOINT_URL=""' }
      ]
    },
    {
      key: 'D.BROKEN', title: 'BROKEN CELLS AND ROOM',
      help: 'Above zero is a broken formula, never something you typed.',
      rows: [
        { label: 'On the feed', formula: '=' + q('IS9WD_FEED_ERRORS'), kind: 'count',
          flag: '=IFERROR(N(IS9WD_FEED_ERRORS)>0,TRUE)' },
        { label: 'On Statistics', formula: '=' + q('IS9WD_STATS_ERRORS'), kind: 'count',
          flag: '=IFERROR(N(IS9WD_STATS_ERRORS)>0,TRUE)' },
        { label: 'On Officer Tables', formula: '=' + q('IS9WD_OT_ERRORS'), kind: 'count',
          flag: '=IFERROR(N(IS9WD_OT_ERRORS)>0,TRUE)' },
        { label: 'On the helper tab', formula: '=' + q('IS9WD_VIEWS_ERRORS'),
          kind: 'count', flag: '=IFERROR(N(IS9WD_VIEWS_ERRORS)>0,TRUE)' },
        { label: 'Flagged task rows', formula: '=' + q('IS9WD_FEED_FLAGGED'),
          kind: 'count' },
        { label: 'Weeks of row room', formula: '=' + q('IS9WD_STATS_ROOM_WEEKS'),
          kind: 'text' },
        { label: 'Tasks on the carousel', formula: '=' + q('IS9WD_FEED_TOTAL'),
          kind: 'count' }
      ]
    },
    {
      key: 'D.JOBS', title: 'THE SCHEDULED JOBS',
      help: 'One row per job. The status is what the job itself wrote.',
      rows: null,
      jobs: true
    }
  ];
}

// Five job rows, which is what the schedule block holds. Read by INDEX over the whole
// block rather than per column, because the schedule has no per column named range.
var IS9WD_DASH_JOB_ROWS = 5;

function IS9WD_dashLayout_() {
  var grid = IS9WD_gridGeometry_(IS9WD_DASH_CELL_COLS);
  var cards = IS9WD_dashCards_();
  var out = {
    firstCol: 1, lastCol: grid.lastCol,
    cellCols: grid.cellCols, cells: grid.cells, gapCols: grid.gapCols,
    bannerRow: 1, helpRow: 2,
    cards: [], gapRows: [], rowsOfThree: []
  };
  // Every card in one row of the grid shares one row rhythm, because row height is a sheet
  // wide property: three cards of different lengths in one grid row would otherwise each
  // claim a different height for the same sheet row. So the tallest card in a row sets the
  // row count and the shorter ones simply end early.
  var at = 4;
  for (var r = 0; r * IS9WD_GRID.ACROSS < cards.length; r++) {
    var slice = cards.slice(r * IS9WD_GRID.ACROSS, (r + 1) * IS9WD_GRID.ACROSS);
    var tallest = 0;
    for (var t = 0; t < slice.length; t++) {
      var count = slice[t].jobs ? IS9WD_DASH_JOB_ROWS : slice[t].rows.length;
      if (count > tallest) tallest = count;
    }
    var band = at;
    var hint = at + 1;
    var first = at + 2;
    var last = first + tallest - 1;
    out.rowsOfThree.push({
      index: r, bandRow: band, hintRow: hint, firstRow: first, lastRow: last,
      rows: tallest
    });
    for (var c = 0; c < slice.length; c++) {
      var cell = grid.cells[c];
      var mine = slice[c].jobs ? IS9WD_DASH_JOB_ROWS : slice[c].rows.length;
      out.cards.push({
        index: r * IS9WD_GRID.ACROSS + c, key: slice[c].key, spec: slice[c],
        gridRow: r, bandRow: band, hintRow: hint,
        firstRow: first, lastRow: first + mine - 1, blockLastRow: last,
        firstCol: cell.firstCol, lastCol: cell.lastCol
      });
    }
    at = last + 1;
    if (r * IS9WD_GRID.ACROSS + IS9WD_GRID.ACROSS < cards.length) {
      out.gapRows.push(at);
      at++;
    }
  }
  out.endRow = at;
  return out;
}

var IS9WD_DASH_CACHE_ = null;

function IS9WD_dash_() {
  if (!IS9WD_DASH_CACHE_) IS9WD_DASH_CACHE_ = IS9WD_dashLayout_();
  return IS9WD_DASH_CACHE_;
}

// One name per tab, the end marker, so the self test can prove the tab was built to its
// declared length. No card value gets a name: nothing reads this tab, by design.
function IS9WD_dashNames_(layout) {
  var d = layout || IS9WD_dash_();
  return [
    { name: 'IS9WD_DASH_END', tab: 'DASHBOARD', a1: IS9WD_a1_(d.endRow, 1, 1, 1) }
  ];
}


function IS9WD_gridGeometry_(cellCols) {
  var width = IS9WD_posInt_(cellCols) || 1;
  var cells = [];
  var gaps = [];
  for (var i = 0; i < IS9WD_GRID.ACROSS; i++) {
    var first = 1 + i * (width + IS9WD_GRID.GAP);
    cells.push({ index: i, firstCol: first, lastCol: first + width - 1 });
    if (i < IS9WD_GRID.ACROSS - 1) gaps.push(first + width);
  }
  return {
    cellCols: width, cells: cells, gapCols: gaps,
    lastCol: cells[cells.length - 1].lastCol
  };
}

// Twelve, because BY OFFICER is twelve columns wide and it is the widest thing on the tab.
// Every other card on 03 | Statistics is narrower and carries air inside its own border
// rather than a card of its own width, so the three columns of cards stay aligned.
var IS9WD_STATS_CELL_COLS = 12;

function IS9WD_statsLayout_(directoryRows, trendWeeks) {
  var dir = IS9WD_posInt_(directoryRows) || IS9WD_DIR_ROWS;
  var trend = IS9WD_posInt_(trendWeeks) ||
    IS9WD_posInt_(IS9WD_switchDefault_('IS9WD_STATS_TREND_WEEKS')) || 8;
  var grid = IS9WD_gridGeometry_(IS9WD_STATS_CELL_COLS);
  var out = {
    directoryRows: dir, trendWeeks: trend,
    tileRows: 2, tilesPerRow: IS9WD_STATS_TILE_COLS.length,
    attentionRows: IS9WD_STATS_ATTENTION_ROWS.length,
    gateRows: IS9WD_STATS_GATE_ROWS.length,
    firstCol: 1, lastCol: grid.lastCol,
    cellCols: grid.cellCols, cells: grid.cells, gapCols: grid.gapCols,
    bannerRow: 1, helpRow: 2,
    chartRows: IS9WD_STATS_CHART_ROWS,
    chartHeight: IS9WD_STATS_CHART_HEIGHT,
    BANNER: IS9WD_STATS.BANNER, HELP: IS9WD_STATS.HELP
  };

  out.cards = [];
  out.charts = [];
  out.gridRows = [];
  // `spacerRows` is the name the painter already uses for a row that carries no fill, and a
  // grid separator row is exactly that, so the separator rows are that list.
  out.spacerRows = [];

  var top = out.helpRow + 2;
  out.spacerRows.push(out.helpRow + 1);

  // The height of a card: a band, a hint row under the band, an optional header row, then
  // its own rows. A tile card is a band, a hint row, three rows, a blank row and three more.
  // A chart card is a band, a hint row, a caption row and the reserved band the chart is
  // drawn over. The row of three takes the tallest of them, so all three cards end on the
  // same sheet row and the separator row under them is straight.
  var heightOf = function (spec) {
    if (spec.chart !== undefined) return 3 + out.chartRows;
    if (spec.tiles) return 2 + out.tileRows * 3 + (out.tileRows - 1);
    return (spec.header ? 3 : 2) + spec.rows;
  };

  var rowOfThree = function (specs) {
    var height = 0;
    var i;
    for (i = 0; i < specs.length; i++) height = Math.max(height, heightOf(specs[i]));
    var firstRow = top;
    var lastRow = top + height - 1;
    for (i = 0; i < specs.length; i++) {
      var spec = specs[i];
      var cell = out.cells[i];
      var band = firstRow;
      var hint = firstRow + 1;
      var key;
      if (spec.chart !== undefined) {
        key = IS9WD_STATS_CHARTS[spec.chart].key;
        out.charts.push({
          index: spec.chart, key: key,
          bandRow: band, hintRow: hint, captionRow: hint + 1,
          firstRow: hint + 2, lastRow: hint + 1 + out.chartRows,
          firstCol: cell.firstCol, lastCol: cell.lastCol
        });
      } else if (spec.tiles) {
        key = 'tiles';
        out.tileBand = band;
        out.tileHint = hint;
        out.tileCol = cell.firstCol;
        out.tileGroups = [];
        var at = hint + 1;
        for (var g = 0; g < out.tileRows; g++) {
          // The blank row between the two rows of tiles belongs to the tile card, not
          // to the grid: the grid separator list is used to wipe fill, border and note
          // across the whole width, which would strip the card it sits inside.
          if (g > 0) at++;
          out.tileGroups.push({ valueRow: at, labelRow: at + 1, noteRow: at + 2 });
          at += 3;
        }
      } else {
        key = spec.prefix;
        out[spec.prefix + 'Band'] = band;
        out[spec.prefix + 'Hint'] = hint;
        var bodyFirst = hint + 1;
        if (spec.header) { out[spec.prefix + 'Header'] = hint + 1; bodyFirst = hint + 2; }
        out[spec.prefix + 'First'] = bodyFirst;
        out[spec.prefix + 'Last'] = bodyFirst + spec.rows - 1;
        out[spec.prefix + 'Col'] = cell.firstCol;
        out[spec.prefix + 'Width'] = spec.cols;
      }
      out.cards.push({
        key: key, firstRow: firstRow, lastRow: lastRow,
        firstCol: cell.firstCol, lastCol: cell.lastCol
      });
    }
    out.gridRows.push({ firstRow: firstRow, lastRow: lastRow, cards: specs.length });
    top = lastRow + 1;
    out.spacerRows.push(top);
    top++;
  };

  // Row one: the eight tiles, then the chase list and the gates beside them. The tiles stay
  // at the top left, which is where a reader starts, and they stay readable because four
  // tiles across a twelve column card is three columns each.
  rowOfThree([
    { tiles: true },
    { prefix: 'attention', rows: out.attentionRows, header: true,
      cols: IS9WD_STATS_HEADERS.ATTENTION.length },
    { prefix: 'gate', rows: out.gateRows, header: true,
      cols: IS9WD_STATS_HEADERS.GATES.length }
  ]);

  // Row two: the three tables worth reading, widest first so BY OFFICER owns the twelve
  // column cell it needs and the other two sit beside it rather than under it.
  rowOfThree([
    { prefix: 'officer', rows: dir, header: true,
      cols: IS9WD_STATS_HEADERS.OFFICER.length },
    { prefix: 'rank', rows: dir, header: true,
      cols: IS9WD_STATS_HEADERS.RANKED.length },
    { prefix: 'trend', rows: trend, header: true,
      cols: IS9WD_STATS_HEADERS.TREND.length }
  ]);

  // Row three: the three charts, one to a cell, each drawn over its own reserved band. A
  // chart is an overlay, so its card is the widest thing it can be without crossing the
  // separator column, which is the whole grid cell.
  rowOfThree([{ chart: 0 }, { chart: 1 }, { chart: 2 }]);

  out.endRow = top;

  // The scan stops one row short of the end row for the reason the feed's stops two
  // short of its own: the count lives on that row and a scan over itself is circular.
  out.scanLastRow = out.endRow - 1;
  out.errorsCell = { row: out.endRow, col: 3 };
  out.agreeCell = { row: out.endRow, col: 5 };
  return out;
}

// The tile a key belongs to: which group, which of the four positions, and therefore
// which column and how wide. Keyed rather than ordered, so a list that grew a tile throws
// on the unknown key rather than painting eight tiles one position out of place.
function IS9WD_statsTileAt_(layout, key) {
  var groups = [IS9WD_STATS_TILE_ROW_A, IS9WD_STATS_TILE_ROW_B];
  for (var g = 0; g < groups.length && g < layout.tileGroups.length; g++) {
    for (var i = 0; i < groups[g].length; i++) {
      if (groups[g][i] !== key) continue;
      var spec = IS9WD_STATS_TILE_COLS[i];
      // The declared column is relative to the tile card, so the card's own first column
      // is added here and nowhere else. A tile follows the grid without the tile list
      // knowing the grid exists.
      var base = IS9WD_posInt_(layout.tileCol) || 1;
      return {
        group: g, position: i, col: base + spec.col - 1, span: spec.span,
        valueRow: layout.tileGroups[g].valueRow,
        labelRow: layout.tileGroups[g].labelRow,
        noteRow: layout.tileGroups[g].noteRow
      };
    }
  }
  return null;
}

// ============================================================================
//  _VIEWS  (the helper band both computed views used to hide inside themselves)
// ============================================================================

// Hidden, script owned end to end, never typed into. It exists so 03 | Statistics is
// twelve visible columns and nothing else: Ethan's instruction of 2026-09-27 was that
// hidden helper columns move to a hidden tab where they are not in his way.
//
// It also carries `OPERATIONAL HEALTH` and `SCHEDULED JOBS`, which are the machine
// reporting on itself. Both keep every named range they had, so the self test and the
// Sunday brief read them exactly as before.
var IS9WD_VIEWS = {
  BANNER: '_VIEWS',
  HELP: 'Working out for ' + IS9WD_TAB.STATS + ' and ' + IS9WD_TAB.TABLES +
    ', and the machine ' +
    'reporting on itself. Every cell here is a formula and nothing here is typed. It is ' +
    'hidden because it is plumbing, not because it is secret.',
  END: 'IS9WD VIEWS END',
  ERR: '!ERR'
};

function IS9WD_viewsLayout_(directoryRows, trendWeeks, jobRows, officerRows) {
  var dir = IS9WD_posInt_(directoryRows) || IS9WD_DIR_ROWS;
  var trend = IS9WD_posInt_(trendWeeks) ||
    IS9WD_posInt_(IS9WD_switchDefault_('IS9WD_STATS_TREND_WEEKS')) || 8;
  var jobs = IS9WD_posInt_(jobRows) ||
    (IS9WD_ENG.SCHEDULE.lastRow - IS9WD_ENG.SCHEDULE.firstRow + 1);
  var reserved = IS9WD_posInt_(officerRows) ||
    IS9WD_posInt_(IS9WD_switchDefault_('IS9WD_STATS_OFFICER_ROWS')) || 11;
  var out = {
    directoryRows: dir, trendWeeks: trend, jobRows: jobs, officerRows: reserved,
    healthRows: IS9WD_STATS_HEALTH_ROWS.length,
    firstCol: 1, lastCol: 13,
    bannerRow: 1, helpRow: 2,
    BANNER: IS9WD_VIEWS.BANNER, HELP: IS9WD_VIEWS.HELP
  };
  out.spacerRows = [];
  var r = out.helpRow;
  var spacer = function () { r++; out.spacerRows.push(r); };
  var block = function (prefix, rows, header) {
    spacer();
    r++; out[prefix + 'Band'] = r;
    r++; out[prefix + 'Hint'] = r;
    if (header) { r++; out[prefix + 'Header'] = r; }
    out[prefix + 'First'] = r + 1;
    r += rows;
    out[prefix + 'Last'] = r;
  };

  // The three build markers, each one a number code writes so a setting changed without a
  // rebuild is caught by the guard note beside it rather than by a stale tab.
  block('marker', 3, false);
  out.elapsedCell = { row: out.markerFirst, col: 2 };
  out.trendBuiltCell = { row: out.markerFirst + 1, col: 2 };
  out.rowsBuiltCell = { row: out.markerFirst + 2, col: 2 };

  block('officer', dir, true);
  block('rank', dir, true);
  block('trend', trend, true);
  block('health', out.healthRows, true);
  block('job', jobs, true);

  r++; out.endRow = r;
  out.scanLastRow = out.endRow - 1;
  out.errorsCell = { row: out.endRow, col: 3 };
  return out;
}

// ============================================================================
//  04 | OFFICER TABLES  (reference 6B, fourteen tables in hierarchy order)
// ============================================================================

var IS9WD_OT = {
  BANNER: IS9WD_TAB.TABLES.toUpperCase(),
  HELP: 'One numbered section per officer, in order of rank, each with every task still ' +
    'on ' + IS9WD_TAB.ITEMS + ': unfinished first, then finished, each group by ' +
    'deadline and ' +
    'then by ID, which is the order Canva publishes. There is nothing to fill in here. ' +
    'Every count in a heading is read from ' + IS9WD_TAB.STATS + ' rather than worked ' +
    'out again, ' +
    'so the two tabs cannot disagree, and those counts cover all tasks rather than this ' +
    'week only.',
  END: 'IS9WD OFFICER TABLES END',
  ERR: '!ERR'
};

var IS9WD_OT_HEADERS = ['Title of Task', 'Deadline', 'Days left', 'Status', 'Flag',
  'Remark', 'ID'];

// Fourteen structurally identical cards, each of a numbered heading, a column header,
// R-1 task rows and one overflow notice, laid three across in the grid: five stacked rows of
// three with the last holding two, in rank order across then down, so the President is the
// first card, the four EVPs follow, then the nine committees. Fixed cards plus an explicit
// notice is what keeps this idempotent: sizing each one to its officer's current count would
// mean setup rewriting the tab whenever a count changed, and every card after it moving when
// one officer gained a task.
//
// Nine columns to a cell: seven the reader reads, one narrow column of air inside the card's
// own border, and the hidden sort key column at the cell's right edge, outside the border.
// The key column cannot move to `_Views` with the other helpers, because it is the eighth
// column of this card's own SORT.
var IS9WD_OT_CELL_COLS = 9;

function IS9WD_otLayout_(directoryRows, officerRows) {
  var dir = IS9WD_posInt_(directoryRows) || IS9WD_DIR_ROWS;
  var reserved = IS9WD_posInt_(officerRows) ||
    IS9WD_posInt_(IS9WD_switchDefault_('IS9WD_STATS_OFFICER_ROWS')) || 11;
  if (reserved < 3) reserved = 3;
  var grid = IS9WD_gridGeometry_(IS9WD_OT_CELL_COLS);
  var out = {
    directoryRows: dir,
    officerRows: reserved,
    itemRows: reserved - 1,
    // A card is a band, a header, its task rows and one notice row.
    stride: reserved + 2,
    firstCol: 1, lastCol: grid.lastCol,
    cellCols: grid.cellCols, cells: grid.cells, gapCols: grid.gapCols,
    // Relative to the card: seven visible columns, then one of air, then the key.
    // OFF BY ONE, AND IT COST THREE FAULTS AT ONCE. The spilling SORT is eight columns
    // wide from the card's first column, so its eighth column, the machine sort key, lands
    // at firstCol + 7. keyOffset was IS9WD_OT_CELL_COLS - 1, which is 8, so the hidden
    // column was firstCol + 8 and stayed empty while 280 cells of sort key sat VISIBLE
    // inside every card, the card border ran one column wide of its own content, and every
    // conditional rule that reads the key read a column the spill never writes to.
    // It is the header count, because the key is the column after the last one a reader
    // reads.
    visibleCols: IS9WD_OT_HEADERS.length, keyOffset: IS9WD_OT_HEADERS.length,
    bannerRow: 1, helpRow: 2, summaryRow: 3,
    BANNER: IS9WD_OT.BANNER, HELP: IS9WD_OT.HELP
  };
  // The tab's own header span, which is the first card's visible width: the banner, the help
  // line and the summary row read across it rather than across all 29 columns.
  out.visibleLastCol = out.visibleCols;

  out.spacerRows = [4];
  out.blocks = [];
  out.cards = [];
  out.gridRows = [];
  var rows = Math.ceil(dir / IS9WD_GRID.ACROSS);
  var top = 5;
  for (var g = 0; g < rows; g++) {
    var firstRow = top;
    var lastRow = top + out.stride - 1;
    for (var c = 0; c < IS9WD_GRID.ACROSS; c++) {
      var index = g * IS9WD_GRID.ACROSS + c;
      if (index >= dir) break;
      var cell = out.cells[c];
      var itemFirst = firstRow + 2;
      var itemLast = itemFirst + out.itemRows - 1;
      // THE CARD FILLS ITS WHOLE GRID CELL. It used to stop one column before the key,
      // which was right while the key was the cell's last column. Correcting keyOffset moved
      // the key inward, so stopping before it left the cell's final column claimed by
      // nothing: not the card, not the key, and not a separator, which SPEC requires to be
      // the only unclaimed column. The key column is hidden, so a border around the whole
      // cell reads as a border around the seven columns a person can see.
      var cardLast = cell.lastCol;
      out.blocks.push({
        ordinal: index + 1, gridRow: g, gridCell: c,
        firstCol: cell.firstCol, lastCol: cardLast,
        keyCol: cell.firstCol + out.keyOffset,
        bandRow: firstRow, headerRow: firstRow + 1,
        itemFirst: itemFirst, itemLast: itemLast, noticeRow: itemLast + 1
      });
      out.cards.push({
        key: 'officer' + (index + 1), firstRow: firstRow, lastRow: lastRow,
        firstCol: cell.firstCol, lastCol: cardLast,
        // The hidden sort key sits INSIDE the card now, so the painter needs it by name
        // rather than by arithmetic off the card's last column.
        keyCol: cell.firstCol + out.keyOffset
      });
    }
    out.gridRows.push({ firstRow: firstRow, lastRow: lastRow,
      cards: Math.min(IS9WD_GRID.ACROSS, dir - g * IS9WD_GRID.ACROSS) });
    top = lastRow + 1;
    out.spacerRows.push(top);
    top++;
  }
  out.endRow = top;
  out.errorsCell = { row: out.endRow, col: 3 };
  out.scanLastRow = out.endRow - 1;
  return out;
}

// The shipping layouts. Functions rather than top level constants for the reason
// IS9WD_feed_() is one: this file sorts before IS9WD_Core.js, so a constant computed
// at load would call a Core helper that does not exist yet and take the whole project
// down with one TypeError.
var IS9WD_STATS_CACHE_ = null;
var IS9WD_OT_CACHE_ = null;
var IS9WD_VIEWS_CACHE_ = null;

function IS9WD_stats_() {
  if (!IS9WD_STATS_CACHE_) IS9WD_STATS_CACHE_ = IS9WD_statsLayout_(IS9WD_DIR_ROWS, 0);
  return IS9WD_STATS_CACHE_;
}

function IS9WD_officerTables_() {
  if (!IS9WD_OT_CACHE_) IS9WD_OT_CACHE_ = IS9WD_otLayout_(IS9WD_DIR_ROWS, 0);
  return IS9WD_OT_CACHE_;
}

function IS9WD_views_() {
  if (!IS9WD_VIEWS_CACHE_) {
    IS9WD_VIEWS_CACHE_ = IS9WD_viewsLayout_(IS9WD_DIR_ROWS, 0, 0, 0);
  }
  return IS9WD_VIEWS_CACHE_;
}

// ============================================================================
//  05 | ARCHIVE and 06 | LOG  (reference 10, both append only)
// ============================================================================

// The Archive gained a bounded span and six named ranges, because the trend block on
// 03 | Statistics reads it and a formula cannot read a tab that has no declared end.
// The span is grown in place by setup exactly the way the sign-off store's is: widened
// downward, never inserted into, so no appended row moves. 1,000 rows costs nothing new
// in the Drive connector read, because a Sheets tab ships with that many anyway.
//
// The one thing this owes a reader: whoever writes the append path has to extend the
// span too, inside the lock it already holds, or a row appended between builds lands
// outside the six ranges and vanishes from the trend until the next build (10.1).
var IS9WD_ARCHIVE = {
  BANNER_ROW: 1,
  HELP_ROW: 2,
  headerRow: 3,
  firstRow: 4,
  lastRow: 1003,
  growBy: 1000,
  minFreeRows: 100,
  firstCol: 1,
  lastCol: 14,
  BANNER: IS9WD_TAB.ARCHIVE.toUpperCase(),
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
  BANNER: IS9WD_TAB.LOG.toUpperCase(),
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
// directory's Check column and the store's Check column carry no name, because nothing
// reads either one from code.
//
// The directory is now two blocks on two tabs, joined by row position: the seven columns
// a president fills on `00 | Configuration`, and the five the code owns on `_Engine`.
// Every one of the eleven names is the name it always was, so no formula, no email and no
// reader changed. That is the whole point of reading by name.
var IS9WD_DIR_COL_NAMES = {
  1: 'IS9WD_DIR_KEY', 2: 'IS9WD_DIR_NAME', 3: 'IS9WD_DIR_VP',
  4: 'IS9WD_DIR_POSITION', 5: 'IS9WD_DIR_EMAIL', 6: 'IS9WD_DIR_PUBLISHES'
};

// Column 1 is the Key mirror, which carries no name of its own: `IS9WD_DIR_KEY` is the
// one on 00 | Configuration, and the self test asserts the two columns hold the same
// fourteen keys in the same order, which is what makes the join by row position safe.
var IS9WD_DIR_ENG_COL_NAMES = {
  2: 'IS9WD_DIR_CAROUSEL', 3: 'IS9WD_DIR_HIERARCHY', 4: 'IS9WD_DIR_PREFIX',
  5: 'IS9WD_DIR_ISSUED', 6: 'IS9WD_DIR_REVOKED'
};

var IS9WD_STORE_COL_NAMES = {
  1: 'IS9WD_SIGNOFF_WEEKS', 2: 'IS9WD_SIGNOFF_PREPARED_NAME',
  3: 'IS9WD_SIGNOFF_PREPARED_POSITION', 4: 'IS9WD_SIGNOFF_CHECKED_NAME',
  5: 'IS9WD_SIGNOFF_CHECKED_POSITION', 6: 'IS9WD_SIGNOFF_SET_AT'
};

// A to R on the data tab, in column order.
var IS9WD_DEL_COL_NAMES = ['IS9WD_DEL_ID', 'IS9WD_DEL_COMMITTEE', 'IS9WD_DEL_TITLE',
  'IS9WD_DEL_DEADLINE', 'IS9WD_DEL_REMARK', 'IS9WD_DEL_STATUS', 'IS9WD_DEL_STATUS_AT',
  'IS9WD_DEL_STATUS_BY', 'IS9WD_DEL_CREATED_AT', 'IS9WD_DEL_CHECK', 'IS9WD_DEL_ACTIVE',
  'IS9WD_DEL_PUBKEY', 'IS9WD_DEL_RANK', 'IS9WD_DEL_PART', 'IS9WD_DEL_SLOTONPAGE',
  'IS9WD_DEL_PAGE', 'IS9WD_DEL_SLOTKEY', 'IS9WD_DEL_NOTIFIED_AT'];

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

// { name, tab (a key of IS9WD_TAB), a1 }. One walk over both settings tabs, so a block
// that moves from one to the other carries its names with it and this function does not
// need to know which tab it landed on.
function IS9WD_configNames_() {
  var out = [];
  var push = function (name, tab, row, col, rows, cols) {
    out.push({ name: name, tab: tab, a1: IS9WD_a1_(row, col, rows, cols) });
  };

  // Every named value cell in every row block on either tab.
  var rowBlocks = IS9WD_settingsRowBlocks_();
  for (var b = 0; b < rowBlocks.length; b++) {
    var block = rowBlocks[b];
    var holder = IS9WD_settingsHolder_(block.tab);
    for (var i = 0; i < block.rows.length; i++) {
      if (!block.rows[i].name) continue;
      push(block.rows[i].name, block.tab, block.rows[i].row, holder.VALUE_COL, 1, 1);
    }
  }

  var w = IS9WD_ENG.WINDOWS;
  var wRows = w.lastRow - w.firstRow + 1;
  push('IS9WD_WINDOW_NAMES', w.tab, w.firstRow, 1, wRows, 1);
  push('IS9WD_HEX', w.tab, w.firstRow, 3, wRows, 2);

  var t = IS9WD_CFG.TERMS;
  var tRows = t.lastRow - t.firstRow + 1;
  push('IS9WD_TERM_CAL', t.tab, t.firstRow, 1, tRows, 3);
  push('IS9WD_TERM_STARTS', t.tab, t.firstRow, 2, tRows, 1);
  push('IS9WD_TERM_ENDS', t.tab, t.firstRow, 3, tRows, 1);

  var s = IS9WD_ENG.STATUS;
  var sRows = s.lastRow - s.firstRow + 1;
  push('IS9WD_STATUS_LIST', s.tab, s.firstRow, 1, sRows, 1);
  push('IS9WD_STATUS_TERMINAL', s.tab, s.firstRow, 2, sRows, 1);
  push('IS9WD_STATUS_HEX', s.tab, s.firstRow, 3, sRows, 2);
  push(s.undoName, s.tab, s.undoRow, IS9WD_ENG.VALUE_COL, 1, 1);

  var j = IS9WD_ENG.SCHEDULE;
  push('IS9WD_SCHEDULE', j.tab, j.firstRow, 1, j.lastRow - j.firstRow + 1, j.lastCol);

  var d = IS9WD_CFG.DIRECTORY;
  var dRows = d.lastRow - d.firstRow + 1;
  push('IS9WD_DIRECTORY', d.tab, d.firstRow, 1, dRows, d.lastCol);
  for (var dc in IS9WD_DIR_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_DIR_COL_NAMES, dc)) continue;
    push(IS9WD_DIR_COL_NAMES[dc], d.tab, d.firstRow, Number(dc), dRows, 1);
  }

  var de = IS9WD_ENG.DIRECTORY;
  var deRows = de.lastRow - de.firstRow + 1;
  push('IS9WD_DIR_ENGINE', de.tab, de.firstRow, 1, deRows, de.lastCol);
  for (var ec in IS9WD_DIR_ENG_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_DIR_ENG_COL_NAMES, ec)) continue;
    push(IS9WD_DIR_ENG_COL_NAMES[ec], de.tab, de.firstRow, Number(ec), deRows, 1);
  }

  var st = IS9WD_ENG.STORE;
  var stRows = st.lastRow - st.firstRow + 1;
  // IS9WD_SIGNOFF is the six data columns, not the Check column beside them, which
  // is what Core's IS9WD_signoffFor reads row by row.
  push('IS9WD_SIGNOFF', st.tab, st.firstRow, 1, stRows, 6);
  for (var sc in IS9WD_STORE_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STORE_COL_NAMES, sc)) continue;
    push(IS9WD_STORE_COL_NAMES[sc], st.tab, st.firstRow, Number(sc), stRows, 1);
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

// Six columns of 05 | Archive, which the trend block reads and nothing else does.
// The other eight carry no name, because no formula asks about them.
var IS9WD_ARC_COL_NAMES = {
  2: 'IS9WD_ARC_WEEKSTART', 3: 'IS9WD_ARC_COMMITTEE', 5: 'IS9WD_ARC_DEADLINE',
  8: 'IS9WD_ARC_ID', 10: 'IS9WD_ARC_STATUS_AT', 12: 'IS9WD_ARC_SOURCE'
};

function IS9WD_archiveNames_() {
  var rows = IS9WD_ARCHIVE.lastRow - IS9WD_ARCHIVE.firstRow + 1;
  var out = [];
  for (var c in IS9WD_ARC_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_ARC_COL_NAMES, c)) continue;
    out.push({
      name: IS9WD_ARC_COL_NAMES[c], tab: 'ARCHIVE',
      a1: IS9WD_a1_(IS9WD_ARCHIVE.firstRow, Number(c), rows, 1)
    });
  }
  return out;
}

// Every name on 03 | Statistics, built from the layout rather than typed, so a tab
// resized by a changed setting carries its names with it. The eight tiles and the six
// sentence rows are keyed, so a name always lands on the cell its key names.
function IS9WD_statsNames_(layout) {
  var s = layout || IS9WD_stats_();
  var out = [];
  var dir = s.officerLast - s.officerFirst + 1;
  var trend = s.trendLast - s.trendFirst + 1;
  var add = function (name, row, col, rows, cols) {
    out.push({ name: name, tab: 'STATS', a1: IS9WD_a1_(row, col, rows, cols) });
  };

  add('IS9WD_STATS_ERRORS', s.errorsCell.row, s.errorsCell.col, 1, 1);
  add('IS9WD_STATS_GATE_AGREE', s.agreeCell.row, s.agreeCell.col, 1, 1);
  add('IS9WD_STATS_END', s.endRow, 1, 1, 1);

  // The eight tiles. The named cell is the big number itself, so every reader of a KPI
  // reads the cell a person is looking at rather than a copy of it.
  for (var t = 0; t < IS9WD_STATS_TILES.length; t++) {
    var key = IS9WD_STATS_TILES[t][0];
    var name = IS9WD_STATS_VALUE_NAMES[key];
    var at = IS9WD_statsTileAt_(s, key);
    if (name && at) add(name, at.valueRow, at.col, 1, 1);
  }

  // The three sentence rows that carry a measure of their own. The other three point at a
  // tile, which is why they carry no name: a measure is named exactly once on the tab.
  //
  // EVERY COLUMN NUMBER FROM HERE DOWN IS THE BLOCK'S OWN FIRST COLUMN PLUS AN OFFSET, never
  // a literal column, because each block sits in one cell of the three across grid and the
  // cell decides where column one of that block is.
  for (var a = 0; a < IS9WD_STATS_ATTENTION_ROWS.length; a++) {
    var aName = IS9WD_STATS_VALUE_NAMES[IS9WD_STATS_ATTENTION_ROWS[a][0]];
    if (aName) add(aName, s.attentionFirst + a, s.attentionCol + 1, 1, 1);
  }

  add('IS9WD_STATS_OFFICER', s.officerFirst, s.officerCol, dir,
    IS9WD_STATS_HEADERS.OFFICER.length);
  for (var c = 0; c < IS9WD_STATS_OFF_COL_NAMES.length; c++) {
    add(IS9WD_STATS_OFF_COL_NAMES[c], s.officerFirst, s.officerCol + c, dir, 1);
  }

  add('IS9WD_STATS_RANKED', s.rankFirst, s.rankCol, s.rankLast - s.rankFirst + 1,
    IS9WD_STATS_HEADERS.RANKED.length);

  for (var tc in IS9WD_STATS_TREND_COL_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STATS_TREND_COL_NAMES, tc)) continue;
    add(IS9WD_STATS_TREND_COL_NAMES[tc], s.trendFirst,
      s.trendCol + Number(tc) - 1, trend, 1);
  }

  add('IS9WD_STATS_GATE_LABEL', s.gateFirst, s.gateCol, s.gateLast - s.gateFirst + 1, 1);
  add('IS9WD_STATS_GATE_STATE', s.gateFirst, s.gateCol + 1, s.gateLast - s.gateFirst + 1, 1);
  // The gate's own sentence, which the Sunday brief prints as the reason beside each HOLD.
  add('IS9WD_STATS_GATE_NOTE', s.gateFirst, s.gateCol + 2, s.gateLast - s.gateFirst + 1, 1);
  return out;
}

// Every name on _Views: the three build markers, the officer helper band, the ranked sort
// helpers, the two trend helpers and the one health value the self test reads.
function IS9WD_viewsNames_(layout) {
  var v = layout || IS9WD_views_();
  var out = [];
  var dir = v.officerLast - v.officerFirst + 1;
  var trend = v.trendLast - v.trendFirst + 1;
  var add = function (name, row, col, rows, cols) {
    out.push({ name: name, tab: 'VIEWS', a1: IS9WD_a1_(row, col, rows, cols) });
  };

  add('IS9WD_STATS_ELAPSED', v.elapsedCell.row, v.elapsedCell.col, 1, 1);
  add('IS9WD_STATS_TREND_BUILT', v.trendBuiltCell.row, v.trendBuiltCell.col, 1, 1);
  add('IS9WD_OT_ROWS_BUILT', v.rowsBuiltCell.row, v.rowsBuiltCell.col, 1, 1);
  add('IS9WD_VIEWS_ERRORS', v.errorsCell.row, v.errorsCell.col, 1, 1);
  add('IS9WD_VIEWS_END', v.endRow, 1, 1, 1);

  for (var h in IS9WD_STATS_OFF_HELPER_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STATS_OFF_HELPER_NAMES, h)) continue;
    add(IS9WD_STATS_OFF_HELPER_NAMES[h], v.officerFirst, Number(h), dir, 1);
  }
  for (var rk in IS9WD_STATS_RANK_HELPER_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STATS_RANK_HELPER_NAMES, rk)) continue;
    add(IS9WD_STATS_RANK_HELPER_NAMES[rk], v.rankFirst, Number(rk), dir, 1);
  }
  for (var tr in IS9WD_STATS_TREND_HELPER_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(IS9WD_STATS_TREND_HELPER_NAMES, tr)) continue;
    add(IS9WD_STATS_TREND_HELPER_NAMES[tr], v.trendFirst, Number(tr), trend, 1);
  }
  for (var hr = 0; hr < IS9WD_STATS_HEALTH_ROWS.length; hr++) {
    var hName = IS9WD_STATS_VALUE_NAMES[IS9WD_STATS_HEALTH_ROWS[hr][0]];
    if (hName) add(hName, v.healthFirst + hr, 2, 1, 1);
  }
  return out;
}

function IS9WD_otNames_(layout) {
  var o = layout || IS9WD_officerTables_();
  return [
    { name: 'IS9WD_OT_SUMMARY', tab: 'TABLES', a1: IS9WD_a1_(o.summaryRow, 1, 1, 1) },
    { name: 'IS9WD_OT_ERRORS', tab: 'TABLES', a1: IS9WD_a1_(o.errorsCell.row, o.errorsCell.col, 1, 1) },
    { name: 'IS9WD_OT_END', tab: 'TABLES', a1: IS9WD_a1_(o.endRow, 1, 1, 1) }
  ];
}

// FIVE LAYOUTS NOW, not four. The dashboard's own name has to be in here or the self
// test's "every named range resolves" pass would never look at it, and a name nothing
// audits is a name that can rot.
function IS9WD_allNames_(layout, statsLayout, otLayout, viewsLayout, dashLayout) {
  return IS9WD_configNames_()
    .concat(IS9WD_itemNames_())
    .concat(IS9WD_feedNames_(layout))
    .concat(IS9WD_statsNames_(statsLayout))
    .concat(IS9WD_viewsNames_(viewsLayout))
    .concat(IS9WD_otNames_(otLayout))
    .concat(IS9WD_dashNames_(dashLayout))
    .concat(IS9WD_archiveNames_());
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
  // The date Switch the carousel last ran. It exists so a second run has to be
  // confirmed against the first: renumbering a slide once the Canva master is built
  // sends two officers to one page (4.8).
  CAROUSEL_SWITCHED: 'IS9WD_CAROUSEL_SWITCHED',
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
// THE RESOLVED TAB NAME IS REMEMBERED. The metadata finder below is four round trips per
// tab and a request touches three tabs, so it ran a dozen times before one value was read.
// The name it resolves to is kept for six hours in the script cache and for the execution in
// memory; a lookup by that name is one round trip. A tab renamed by hand misses the name and
// falls through to the finder, which is exactly what the finder exists for.
var IS9WD_TABS_KEY_ = 'IS9WD_TAB_NAMES_v1';
var IS9WD_TABS_TTL_ = 21600;
var IS9WD_TABS_ = null;
var IS9WD_SHEETS_ = {};

function IS9WD_tabNames_() {
  if (IS9WD_TABS_) return IS9WD_TABS_;
  var map = null;
  try {
    var held = CacheService.getScriptCache().get(IS9WD_TABS_KEY_);
    if (held) map = JSON.parse(held);
  } catch (err) {
    map = null;
  }
  IS9WD_TABS_ = map && typeof map === 'object' ? map : {};
  return IS9WD_TABS_;
}

function IS9WD_tabNamesRemember_(key, name) {
  var map = IS9WD_tabNames_();
  if (map[key] === name) return;
  map[key] = name;
  try {
    CacheService.getScriptCache().put(IS9WD_TABS_KEY_, JSON.stringify(map), IS9WD_TABS_TTL_);
  } catch (err) {
    Logger.log('IS9WD: the tab names were not remembered: ' + err);
  }
}

function IS9WD_tabNamesReset_() {
  IS9WD_TABS_ = null;
  IS9WD_SHEETS_ = {};
  try {
    CacheService.getScriptCache().remove(IS9WD_TABS_KEY_);
  } catch (err) {
    Logger.log('IS9WD: the tab names were not cleared: ' + err);
  }
}

function IS9WD_sheetOrNull_(tabKey) {
  var key = IS9WD_trim_(tabKey).toUpperCase();
  if (Object.prototype.hasOwnProperty.call(IS9WD_SHEETS_, key)) return IS9WD_SHEETS_[key];
  var remembered = IS9WD_tabNames_()[key];
  if (remembered) {
    var quick = IS9WD_ss_().getSheetByName(remembered);
    if (quick) {
      IS9WD_SHEETS_[key] = quick;
      return quick;
    }
  }
  var sheet = IS9WD_sheetResolve_(key);
  IS9WD_SHEETS_[key] = sheet;
  if (sheet) IS9WD_tabNamesRemember_(key, sheet.getName());
  return sheet;
}

// Developer metadata first, then the exact name: the slow, authoritative resolution.
function IS9WD_sheetResolve_(tabKey) {
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
// One fetch of every named range per execution, so dropping before setting costs one call
// rather than one per name. It is an index of name to the live NamedRange objects, because
// removing a stale definition needs the object and not the range.
var IS9WD_NAMED_INDEX_ = null;
var IS9WD_NAMED_MADE_ = {};

// How many names this execution actually deleted and re-created, as opposed to left alone.
// It is reported in the build log because it is the number that matters: re-pointing a name
// rewrites every formula that uses it, and on a workbook whose layout has not moved it should
// be zero. A build that suddenly re-points 196 names is the build that destroyed the views.
var IS9WD_NAMED_REPOINTED_ = 0;

function IS9WD_namedIndex_() {
  if (IS9WD_NAMED_INDEX_) return IS9WD_NAMED_INDEX_;
  var all = IS9WD_ss_().getNamedRanges();
  var index = {};
  for (var i = 0; i < all.length; i++) {
    var key = all[i].getName();
    if (!index[key]) index[key] = [];
    index[key].push(all[i]);
  }
  IS9WD_NAMED_INDEX_ = index;
  return index;
}

function IS9WD_namedIndexReset_() {
  IS9WD_NAMED_INDEX_ = null;
  IS9WD_NAMED_MADE_ = {};
  IS9WD_NAMED_REPOINTED_ = 0;
}

// ============================================================================
//  NAME COORDINATES  (resolved by name, remembered between executions)
// ============================================================================
//
// EVERY REQUEST TO THE ENDPOINT IS A FRESH EXECUTION, and resolving a name is a round trip to
// Sheets: getRangeByName, then its sheet, row, column and two sizes. The settings reader
// touches about sixty names, so every open of the officers page paid several hundred round
// trips before it read one item, and a bare ping measured four to nine seconds on
// 2026-09-28. What is remembered here is the RESOLUTION and only the resolution: name to sheet
// name, row, column, rows, columns, in the script cache. The values are never remembered; the
// snapshot reads them fresh on every request. Nothing reads by address: a name still names
// its block, the address is just not asked for twice.
//
// It is cleared by the one thing that can move a name, IS9WD_setNamed_ re-pointing it, and it
// expires on its own after six hours; the hourly dispatcher refreshes it so the expiry never
// lands on an officer while the trigger is alive. A name that is not remembered is resolved
// live and added, so a name created after the memory was made works at once, and a name
// that does not exist is remembered as absent so it is not asked for again.
var IS9WD_COORDS_KEY_ = 'IS9WD_NAME_COORDS_v1';
var IS9WD_COORDS_TTL_ = 21600;
var IS9WD_COORDS_ = null;
var IS9WD_COORDS_DIRTY_ = false;
var IS9WD_COORDS_HIT_ = false;

function IS9WD_coords_() {
  if (IS9WD_COORDS_) return IS9WD_COORDS_;
  var held = null;
  try {
    held = CacheService.getScriptCache().get(IS9WD_COORDS_KEY_);
  } catch (err) {
    held = null;
  }
  var map = null;
  if (held) {
    try { map = JSON.parse(held); } catch (err) { map = null; }
  }
  IS9WD_COORDS_ = map && typeof map === 'object' ? map : {};
  IS9WD_COORDS_HIT_ = !!(map && typeof map === 'object');
  IS9WD_COORDS_DIRTY_ = false;
  return IS9WD_COORDS_;
}

// One name's coordinates, {s, r, c, h, w}, from memory or resolved live and remembered. Null
// when the name does not exist, and that answer is remembered too.
function IS9WD_coordOf_(name) {
  var key = IS9WD_trim_(name);
  var map = IS9WD_coords_();
  if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
  var range = IS9WD_ss_().getRangeByName(key);
  map[key] = range ? {
    s: range.getSheet().getName(), r: range.getRow(), c: range.getColumn(),
    h: range.getNumRows(), w: range.getNumColumns()
  } : null;
  IS9WD_COORDS_DIRTY_ = true;
  return map[key];
}

// Written back once per execution, by the settings reader and the endpoint, when something
// new was resolved. One put, not one per name.
function IS9WD_coordsFlush_() {
  if (!IS9WD_COORDS_ || !IS9WD_COORDS_DIRTY_) return;
  try {
    CacheService.getScriptCache().put(IS9WD_COORDS_KEY_, JSON.stringify(IS9WD_COORDS_),
      IS9WD_COORDS_TTL_);
    IS9WD_COORDS_DIRTY_ = false;
  } catch (err) {
    Logger.log('IS9WD: the name coordinates were not remembered: ' + err);
  }
}

function IS9WD_coordsReset_() {
  IS9WD_COORDS_ = null;
  IS9WD_COORDS_DIRTY_ = false;
  try {
    CacheService.getScriptCache().remove(IS9WD_COORDS_KEY_);
  } catch (err) {
    Logger.log('IS9WD: the name coordinates were not cleared: ' + err);
  }
}

// The hourly refresh: resolve whatever the settings reader needs if the memory is empty, then
// write it back with a fresh six hours, so the expiry never lands on an officer.
function IS9WD_coordsWarm_() {
  try {
    var map = IS9WD_coords_();
    var any = false;
    for (var k in map) { if (Object.prototype.hasOwnProperty.call(map, k)) { any = true; break; } }
    if (!any) IS9WD_readConfig_(true);
    IS9WD_COORDS_DIRTY_ = true;
    IS9WD_coordsFlush_();
  } catch (err) {
    Logger.log('IS9WD: the name coordinates were not refreshed: ' + err);
  }
}

// EVERY DEFINITION OF THE NAME GOES BEFORE THE NEW ONE IS MADE, and this is the whole of
// idempotency for names. `Spreadsheet.setNamedRange` does not move a name that already
// exists: it adds a SECOND definition carrying the same name, and the older definition is
// the one a formula resolves, while a reader that builds a map keyed on the name sees the
// newer one. So on a workbook built by more than one layout, a name whose block has moved
// keeps pointing where the earlier layout put it, which under the current layout is a band
// that is empty, and every formula reading it through INDEX reads "" forever, while the
// self test that checks where the names point reads clean. That is what made the
// directory's Check column say "On the carousel with no slide number" on all nine
// publishing rows while `_Engine` held 1 to 9 perfectly well. Dropping first also stops a
// build accumulating one more definition per name on every run.
// `setNamedRange` hands nothing back, so a definition this execution made is not in the
// index. Setting the same name twice in one execution is therefore the one case that has to
// pay for a re-read, and it is rare: nothing in a build sets a name twice, and the re-read
// only happens when something does.
// DELETING A NAMED RANGE DESTROYS THE FORMULAS THAT USE IT, and that is the second half of
// this function's story. Sheets does not merely unlink a deleted name: it rewrites the text of
// every formula referencing it, substituting #REF! for the name, permanently. Re-creating the
// name one line later does not undo that, because the formula no longer mentions it.
//
// Which is how the drop-first rule above, added to fix a real bug, caused a worse one. The
// build writes `_Views` first, and its eight officer helpers name ranges that live on
// 04 | Statistics. 04 | Statistics is built next and re-points its own names, dropping each one
// first. Every `_Views` helper written minutes earlier had its text destroyed at that moment,
// and with it the twelve cells on 04 | Statistics and the six on 05 | Officer Tables that read
// them. A second build repeated the damage rather than healing it. Ethan saw it as six self
// test failures on a workbook that was otherwise correct, twice, including once on a workbook
// built from zero tabs.
//
// SO A NAME THAT ALREADY POINTS EXACTLY WHERE IT SHOULD IS LEFT ALONE. Nothing is dropped, no
// formula is touched, and the name keeps the single definition it already had. Everything the
// drop-first rule was for survives: a name carrying two definitions is still collapsed to one,
// and a name whose block has moved is still re-pointed, because in both cases what is there
// does not match what is wanted.
function IS9WD_setNamed_(name, range) {
  var want = IS9WD_trim_(name);
  if (IS9WD_NAMED_MADE_[want]) IS9WD_NAMED_INDEX_ = null;
  if (IS9WD_namedIsExactly_(want, range)) {
    IS9WD_NAMED_MADE_[want] = true;
    return;
  }
  IS9WD_dropNamed_(want);
  IS9WD_ss_().setNamedRange(want, range);
  IS9WD_NAMED_MADE_[want] = true;
  IS9WD_NAMED_REPOINTED_++;
  // A name moved, so every remembered coordinate is suspect until the next resolution.
  IS9WD_coordsReset_();
}

// True only when the workbook holds EXACTLY ONE definition of this name and it covers exactly
// this range on exactly this sheet. Anything else, including two definitions of a name that
// both happen to be right, returns false so the caller drops and re-creates.
//
// Compared by sheet name and by the four numbers rather than by A1 text, because getA1Notation
// is relative and two ranges that differ only in absolute markers would compare unequal.
function IS9WD_namedIsExactly_(name, range) {
  var list = IS9WD_namedIndex_()[IS9WD_trim_(name)] || [];
  if (list.length !== 1) return false;
  var live = null;
  try {
    live = list[0].getRange();
  } catch (err) {
    return false;               // a definition whose sheet is gone is not a match
  }
  if (!live) return false;
  return live.getSheet().getSheetId() === range.getSheet().getSheetId() &&
    live.getRow() === range.getRow() &&
    live.getColumn() === range.getColumn() &&
    live.getNumRows() === range.getNumRows() &&
    live.getNumColumns() === range.getNumColumns();
}

function IS9WD_dropNamed_(name) {
  var want = IS9WD_trim_(name);
  var index = IS9WD_namedIndex_();
  var list = index[want] || [];
  for (var i = 0; i < list.length; i++) list[i].remove();
  index[want] = [];
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
function IS9WD_paintBand_(sheet, row, firstCol, lastCol, title, help, theme) {
  var t = theme || {};
  var bg = t.bg || IS9WD_ROLE.BAND_BG;
  var fg = t.fg || IS9WD_ROLE.BAND_FG;
  var helpFg = t.helpFg || IS9WD_ROLE.BAND_HELP_FG;
  var band = sheet.getRange(row, firstCol, 1, lastCol - firstCol + 1);
  band.setBackground(bg);
  IS9WD_style_(band, {
    size: IS9WD_SIZE.BAND, fg: fg, bold: true,
    align: IS9WD_ALIGN.LEFT, bg: bg, wrap: IS9WD_WRAP.OVER
  });
  var cell = sheet.getRange(row, firstCol);
  var text = IS9WD_txt_(title);
  if (!IS9WD_blank_(help)) {
    var full = text + IS9WD_SEP + IS9WD_txt_(help);
    cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText(full)
      .setTextStyle(0, text.length, IS9WD_textStyle_(IS9WD_SIZE.BAND, fg, true))
      .setTextStyle(text.length, full.length, IS9WD_textStyle_(IS9WD_SIZE.HINT, helpFg, false))
      .build());
  } else {
    cell.setValue(text);
  }
  sheet.setRowHeight(row, IS9WD_ROW_H.BAND);
  return band;
}

// The band at the top of a card, in the card's own colours rather than the settings tabs'
// deep green.
function IS9WD_paintCardBand_(sheet, row, firstCol, lastCol, title) {
  return IS9WD_paintBand_(sheet, row, firstCol, lastCol, title, '', {
    bg: IS9WD_ROLE.CARD_BAND_BG, fg: IS9WD_ROLE.CARD_BAND_FG
  });
}

// A CARD: the body background behind the whole of it and one border around the whole of it,
// and nothing outside it touched. It is called before the band, the header and the body are
// painted, so those paint over it.
function IS9WD_paintCard_(sheet, firstRow, lastRow, firstCol, lastCol) {
  var rows = lastRow - firstRow + 1;
  var cols = lastCol - firstCol + 1;
  if (rows < 1 || cols < 1) return null;
  var card = sheet.getRange(firstRow, firstCol, rows, cols);
  card.setBackground(IS9WD_ROLE.CARD_BODY_BG);
  card.setBorder(true, true, true, true, false, false, IS9WD_ROLE.CARD_BORDER,
    SpreadsheetApp.BorderStyle.SOLID);
  return card;
}

// A GAP CARRIES NOTHING. The one empty column between two cards and the one empty row
// between two stacked rows of cards get no value, no fill, no border and no note, because
// that is the only thing that makes three cards read as three cards.
function IS9WD_clearGap_(sheet, firstRow, lastRow, firstCol, lastCol) {
  var rows = lastRow - firstRow + 1;
  var cols = lastCol - firstCol + 1;
  if (rows < 1 || cols < 1) return null;
  var gap = sheet.getRange(firstRow, firstCol, rows, cols);
  gap.setBackground(null);
  gap.setBorder(false, false, false, false, false, false);
  gap.clearNote();
  gap.setDataValidation(null);
  return gap;
}

// EVERYTHING PAST A TAB'S LAST BUILT ROW OR COLUMN LOSES ITS FORMAT BEFORE THE GRID IS
// TRIMMED. Trimming alone is not enough on a workbook that has been built before: a
// `deleteRows` that cannot run, or a grid a later step grows again, leaves the paint of the
// end band running down the tab, which is what painted 03 | Statistics dark green a thousand
// rows below its content. Clearing first means the worst case is a blank tail rather than a
// painted one.
function IS9WD_clearPastEnd_(sheet, lastRow, lastCol) {
  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();
  if (maxRows > lastRow) {
    var below = sheet.getRange(lastRow + 1, 1, maxRows - lastRow, maxCols);
    below.clear();
    below.setBorder(false, false, false, false, false, false);
    below.clearDataValidations();
    below.clearNote();
  }
  if (maxCols > lastCol) {
    var right = sheet.getRange(1, lastCol + 1, Math.min(maxRows, lastRow),
      maxCols - lastCol);
    right.clear();
    right.setBorder(false, false, false, false, false, false);
    right.clearDataValidations();
    right.clearNote();
  }
}

// `lastCol` is optional and is the card's own last column. Without it a header stops at its
// last label, so a card wider than its table showed a header that ended short of the card's
// own border with bare paper beside it, which is the notch every card on both view tabs had.
// The labels still go only in the first cells; the fill runs the whole width.
//
// `bg` is optional and defaults to HEAD_BG, the deep purple every header has always had.
// A CARD passes CARD_HEAD_BG, the sage, because on a card the band and the header are adjacent
// rows and both were #5d4170, so a card opened with one unbroken 68 px block of deep purple
// with nothing telling its heading from its column labels. Band, then header, then body, each
// a step down. It is an argument rather than a blanket change because the feed, the data tab
// and the settings tabs put a header under a GREEN band, where the purple is already the step
// down and the sage would be a third colour solving nothing.
function IS9WD_paintHeader_(sheet, row, firstCol, labels, lastCol, bg) {
  var width = IS9WD_posInt_(lastCol) ? lastCol - firstCol + 1 : labels.length;
  if (width < labels.length) width = labels.length;
  var range = sheet.getRange(row, firstCol, 1, width);
  IS9WD_style_(range, {
    size: IS9WD_SIZE.HEAD, fg: IS9WD_ROLE.HEAD_FG, bold: true,
    align: IS9WD_ALIGN.CENTER, bg: bg || IS9WD_ROLE.HEAD_BG, wrap: IS9WD_WRAP.WRAP,
    format: IS9WD_FMT.TEXT
  });
  sheet.getRange(row, firstCol, 1, labels.length).setValues([labels]);
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

// The plain English line that rides under a section band rather than at the end of it.
// Ethan's instruction of 2026-09-27: hint text under a heading, not crammed beside it. It
// is the same treatment as the tab help line and a little taller, so a block always says
// what it is for before a reader meets a number.
function IS9WD_paintHint_(sheet, row, firstCol, lastCol, text) {
  var range = sheet.getRange(row, firstCol, 1, lastCol - firstCol + 1);
  IS9WD_style_(range, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, align: IS9WD_ALIGN.LEFT,
    bg: IS9WD_ROLE.BODY_BG, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.getRange(row, firstCol).setValue(IS9WD_txt_(text));
  sheet.setRowHeight(row, IS9WD_ROW_H.HINT);
  return range;
}

// THE CREAM RULE, and it is a rule rather than a decoration. Ethan's instruction of
// 2026-09-27: "for the things i need to encode, put a cream background on it". So the fill
// #e9ebd4 means exactly one thing in this workbook, everywhere it appears on a settings or
// entry tab: this cell is yours to type into. A cell the workbook calculates must never
// carry it, which is why banding was withdrawn from every block that holds an input
// column: a banded row would put cream under half the calculated cells and destroy the
// only visual rule a first time reader can learn in one second.
var IS9WD_INPUT_BG = IS9WD_CLR.CREAM;

// The hint lands twice on every input cell: visibly beside it, and as the cell's own note,
// which is what a person gets when they click the cell and hover. Notes are set over a
// whole column in one call, because a 2,000 row column cannot afford one call per cell.
function IS9WD_paintInput_(range, hint) {
  range.setBackground(IS9WD_INPUT_BG);
  if (IS9WD_blank_(hint)) {
    range.clearNote();
    return range;
  }
  var text = IS9WD_txt_(hint);
  var rows = range.getNumRows();
  var cols = range.getNumColumns();
  var notes = [];
  for (var r = 0; r < rows; r++) {
    var line = [];
    for (var c = 0; c < cols; c++) line.push(text);
    notes.push(line);
  }
  range.setNotes(notes);
  return range;
}

// A calculated cell reads as calculated: no cream, the accent colour, and the sentence
// that says so as its note. The note matters more than it looks: without it, the only
// thing telling a reader not to type here is the absence of a fill.
function IS9WD_paintCalculated_(range) {
  range.setBackground(IS9WD_ROLE.BODY_BG);
  var rows = range.getNumRows();
  var cols = range.getNumColumns();
  var notes = [];
  for (var r = 0; r < rows; r++) {
    var line = [];
    for (var c = 0; c < cols; c++) line.push(IS9WD_CFG_CALC_HINT);
    notes.push(line);
  }
  range.setNotes(notes);
  return range;
}

// Banding removed and not reapplied, which is the other half of the cream rule. Every
// existing banding on the range goes, because applying twice stacks two bandings and
// neither shows up on screen until the file is slow (2.5).
function IS9WD_clearBanding_(range) {
  var existing = range.getBandings();
  for (var i = 0; i < existing.length; i++) existing[i].remove();
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
  // A fraction, for the two statistics percentages. Not the number-between
  // criterion, because number-between on a percent formatted cell accepts 15 and
  // stores 1500%, which is exactly the typo this guards.
  if (spec.kind === IS9WD_V.NUM) {
    var lo = IS9WD_num_(spec.min);
    var hi = IS9WD_num_(spec.max);
    var g = '=AND(ISNUMBER(' + a1 + ')';
    if (lo !== null) g += ',' + a1 + '>=' + lo;
    if (hi !== null) g += ',' + a1 + '<=' + hi;
    return b.requireFormulaSatisfied(g + ')').build();
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
  IS9WD_namedIndexReset_();
  // A settings write or a build: the remembered snapshot and the remembered item rows are
  // both suspect. The name coordinates are not; only a re-pointed name clears those.
  IS9WD_snapReset_();
  if (typeof IS9WD_itemsCacheReset_ === 'function') IS9WD_itemsCacheReset_();
}

// One bulk fetch of every named range, so resolving sixty names costs one call.
//
// THE FIRST DEFINITION WINS HERE, because that is the one a formula resolves. Keying the
// map on the name and letting the last write win is how a stale definition hid for a whole
// layout change: the reader and the self test saw the new range while every formula on the
// sheet read the old one.
function IS9WD_namedMap_() {
  var all = IS9WD_ss_().getNamedRanges();
  var map = {};
  for (var i = 0; i < all.length; i++) {
    var key = all[i].getName();
    if (!Object.prototype.hasOwnProperty.call(map, key)) map[key] = all[i].getRange();
  }
  return map;
}

// Every name carrying more than one definition, which is a stale range still winning over
// the one this build set. It must be empty on a built workbook (13.3).
function IS9WD_namedDuplicates_() {
  var all = IS9WD_ss_().getNamedRanges();
  var counts = {};
  for (var i = 0; i < all.length; i++) {
    var key = all[i].getName();
    counts[key] = (counts[key] || 0) + 1;
  }
  var out = [];
  for (var name in counts) {
    if (!Object.prototype.hasOwnProperty.call(counts, name)) continue;
    if (counts[name] > 1) out.push(name + ' x' + counts[name]);
  }
  return out;
}

// TWO SHEETS IN ONE SNAPSHOT. Settings live on `00 | Configuration` and `_Engine`, so one
// snapshot covers both: two bulk reads for every setting in the workbook rather than
// sixty. A named range that points at neither is still an error, and it is the same error
// it always was, because it still means a block moved somewhere nothing expects.
// THE SNAPSHOT IS REMEMBERED FOR THIRTY SECONDS. Two full tab reads cost about two seconds
// from a web execution, and the settings change on the order of once a week. So the values
// of the two settings tabs are kept in the script cache for thirty seconds, dates encoded so
// they come back as dates, and every write the script makes to the settings clears them
// through IS9WD_configReset_. A hand edit on the Sheet is seen by the app within half a
// minute; every menu path and the dispatcher pass force=true and always read live.
//
// THE LIVE READ IS TWO CALLS PER TAB, the sheet and the values. Its height is the larger of
// the layout's declared last row and the last row any remembered name reaches on that tab,
// which is how a grown sign-off store stays inside the snapshot without asking the sheet how
// tall it is; on a cold memory it asks.
var IS9WD_SNAP_KEY_ = 'IS9WD_SETTINGS_SNAP_v1';
var IS9WD_SNAP_TTL_ = 300;
var IS9WD_SNAP_HIT_ = false;

function IS9WD_cfgSnapshot_(force) {
  IS9WD_SNAP_HIT_ = false;
  if (!force) {
    var held = IS9WD_snapFromCache_();
    if (held) {
      IS9WD_SNAP_HIT_ = true;
      return held;
    }
  }
  var sheets = {};
  var order = [];
  var coords = IS9WD_coords_();
  for (var i = 0; i < IS9WD_SETTINGS_TABS.length; i++) {
    var tabKey = IS9WD_SETTINGS_TABS[i].tabKey;
    var holder = IS9WD_SETTINGS_TABS[i].holder;
    var sheet = IS9WD_sheet_(tabKey);
    var name = IS9WD_TAB[tabKey];
    var last = holder.STORE ? holder.STORE.lastRow : 0;
    var rows = Math.max(last, holder.HELP_ROW);
    var cols = holder.LAST_COL;
    var reach = 0;
    for (var k in coords) {
      if (!Object.prototype.hasOwnProperty.call(coords, k) || !coords[k]) continue;
      if (coords[k].s !== name) continue;
      reach++;
      if (coords[k].r + coords[k].h - 1 > rows) rows = coords[k].r + coords[k].h - 1;
      if (coords[k].c + coords[k].w - 1 > cols) cols = coords[k].c + coords[k].w - 1;
    }
    if (reach === 0) {
      rows = Math.max(rows, sheet.getLastRow());
      cols = Math.max(cols, sheet.getLastColumn());
    }
    sheets[name] = {
      tabKey: tabKey, name: name, rows: rows, cols: cols,
      values: sheet.getRange(1, 1, rows, cols).getValues()
    };
    order.push(name);
  }
  var snap = {
    sheets: sheets,
    order: order,
    // The Configuration tab stays the snapshot's own identity, because that is the tab
    // every error message names and the tab a reader would go and look at.
    name: order[0]
  };
  IS9WD_snapToCache_(snap);
  return snap;
}

function IS9WD_snapFromCache_() {
  try {
    var held = CacheService.getScriptCache().get(IS9WD_SNAP_KEY_);
    if (!held) return null;
    var snap = IS9WD_unpackJson_(held);
    return snap && snap.sheets && snap.order ? snap : null;
  } catch (err) {
    return null;
  }
}

function IS9WD_snapToCache_(snap) {
  try {
    var text = JSON.stringify(IS9WD_packDates_(snap));
    if (text.length > 90000) return;
    CacheService.getScriptCache().put(IS9WD_SNAP_KEY_, text, IS9WD_SNAP_TTL_);
  } catch (err) {
    Logger.log('IS9WD: the settings snapshot was not remembered: ' + err);
  }
}

/**
 * THE EDIT HOOK. A simple trigger: Sheets calls it for every edit a person makes in the
 * workbook, with no installation and no authorization, and it may use the cache. It does one
 * thing: it forgets whatever memory the edit made stale, so a row typed on the deliverables tab
 * is on a phone at the next open and a switch flipped on Configuration is read at the next
 * request, and the memories can therefore last minutes rather than seconds. On the deliverables
 * tab it also lifts the remembered last used row, so a row typed far down is not missed by
 * the small read. Script writes do not fire this; they clear the memories themselves.
 *
 * No trailing underscore: Apps Script calls it by this exact name, like onOpen.
 */
function onEdit(e) {
  try {
    var range = e && e.range ? e.range : null;
    if (!range) return;
    var name = range.getSheet().getName();
    if (name === IS9WD_TAB.ITEMS) {
      if (typeof IS9WD_itemsCacheReset_ === 'function') IS9WD_itemsCacheReset_(true);
      if (typeof IS9WD_itemsHintLift_ === 'function') IS9WD_itemsHintLift_(range.getLastRow());
    } else if (name === IS9WD_TAB.CONFIG || name === IS9WD_TAB.ENGINE) {
      IS9WD_snapReset_();
    }
  } catch (err) {
    // A simple trigger that throws shows the person an error bar for a memory they never
    // knew existed. The memory expires on its own.
  }
}

function IS9WD_snapReset_() {
  try {
    CacheService.getScriptCache().remove(IS9WD_SNAP_KEY_);
  } catch (err) {
    Logger.log('IS9WD: the settings snapshot was not cleared: ' + err);
  }
}

// JSON.stringify turns a Date into a string before any replacer sees it, so dates are
// packed by hand into {"$d": ms} and unpacked by a reviver. Cell values are strings, numbers,
// booleans and dates, and nothing else needs care.
function IS9WD_packDates_(value) {
  if (value instanceof Date) return { $d: value.getTime() };
  if (value === null || typeof value !== 'object') return value;
  if (typeof value.length === 'number' && typeof value !== 'string') {
    var list = [];
    for (var i = 0; i < value.length; i++) list.push(IS9WD_packDates_(value[i]));
    return list;
  }
  var out = {};
  for (var k in value) {
    if (Object.prototype.hasOwnProperty.call(value, k)) out[k] = IS9WD_packDates_(value[k]);
  }
  return out;
}

function IS9WD_unpackJson_(text) {
  return JSON.parse(text, function (key, v) {
    return v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, '$d')
      ? new Date(v.$d) : v;
  });
}

// { row, col, rows, cols, values }. A name that resolves off the snapshot, which is
// what a moved block looks like, is read directly rather than guessed at.
function IS9WD_read_(snap, name) {
  var at = IS9WD_coordOf_(name);
  if (!at) {
    throw new Error('The named range ' + name +
      ' is missing. Run IS9 Deliverables > Build or repair workbook.');
  }
  var page = snap.sheets[at.s];
  if (!page) {
    throw new Error('The named range ' + name + ' points at "' + at.s +
      '" instead of one of the settings tabs (' + snap.order.join(', ') +
      '). Run IS9 Deliverables > Build or repair workbook.');
  }
  var box = { row: at.r, col: at.c, rows: at.h, cols: at.w, tab: page.tabKey };
  if (box.row + box.rows - 1 > page.rows || box.col + box.cols - 1 > page.cols) {
    // Off the snapshot, which is what a moved block looks like: read it live, and forget the
    // memory so the next execution resolves everything again.
    var live = IS9WD_ss_().getRangeByName(IS9WD_trim_(name));
    if (!live) {
      throw new Error('The named range ' + name +
        ' is missing. Run IS9 Deliverables > Build or repair workbook.');
    }
    box.values = live.getValues();
    IS9WD_coordsReset_();
    return box;
  }
  var out = [];
  for (var r = 0; r < box.rows; r++) {
    var line = [];
    for (var c = 0; c < box.cols; c++) {
      line.push(page.values[box.row - 1 + r][box.col - 1 + c]);
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
    lastOwner: s('IS9WD_LAST_OWNER'),
    // The eight statistics settings. The two that decide a layout are read as
    // integers, because setup sizes two tabs from them.
    statsTrendWeeks: i('IS9WD_STATS_TREND_WEEKS'),
    statsMinJudged: i('IS9WD_STATS_MIN_JUDGED'),
    statsSilentDays: i('IS9WD_STATS_SILENT_DAYS'),
    statsLateDays: i('IS9WD_STATS_LATE_DAYS'),
    statsPaceSlack: IS9WD_num_(IS9WD_readCell_(snap, 'IS9WD_STATS_PACE_SLACK')),
    statsOnTimeTarget: IS9WD_num_(IS9WD_readCell_(snap, 'IS9WD_STATS_ONTIME_TARGET')),
    statsRoomWeeksWarn: i('IS9WD_STATS_ROOM_WEEKS_WARN'),
    statsOfficerRows: i('IS9WD_STATS_OFFICER_ROWS')
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
// TWO BLOCKS, ONE ENTRY PER OFFICER, JOINED BY ROW POSITION. The seven columns a
// president fills are on `00 | Configuration` and the five the code owns are on `_Engine`,
// in the same order with the same Key. The join is by index rather than by a lookup on the
// Key, because a lookup would make a mistyped Key on one tab read as a different officer
// on the other; by index it reads as a mismatch, which `keyMismatch` reports and the self
// test fails on.
function IS9WD_readDirectory_(snap) {
  var block = IS9WD_read_(snap, 'IS9WD_DIRECTORY');
  var engine = IS9WD_read_(snap, 'IS9WD_DIR_ENGINE');
  var rows = [];
  var byKey = {};
  var byCommittee = {};
  var keyMismatch = [];
  for (var i = 0; i < block.values.length; i++) {
    var r = block.values[i];
    if (IS9WD_blank_(r[0])) continue;
    var e = engine.values[i] || ['', '', '', '', '', ''];
    var mine = IS9WD_trim_(r[0]).toUpperCase();
    var theirs = IS9WD_trim_(e[0]).toUpperCase();
    if (theirs !== '' && theirs !== mine) {
      keyMismatch.push('row ' + (block.row + i) + ' reads ' + mine + ' on ' +
        IS9WD_TAB.CONFIG + ' and ' + theirs + ' on ' + IS9WD_TAB.ENGINE);
    }
    var entry = {
      key: mine,
      carouselOrder: IS9WD_int_(e[1]),
      committee: IS9WD_txt_(r[1]),
      fullName: IS9WD_txt_(r[2]),
      position: IS9WD_txt_(r[3]),
      email: IS9WD_trim_(r[4]),
      tokenPrefix: IS9WD_trim_(e[3]),
      tokenIssued: IS9WD_midnight_(e[4]),
      revoked: IS9WD_bool_(e[5]),
      check: IS9WD_trim_(r[6]),
      publishes: IS9WD_bool_(r[5]),
      hierarchy: IS9WD_int_(e[2]),
      row: block.row + i,
      engineRow: engine.row + i
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
    engineRaw: engine.values, engineFirstRow: engine.row,
    keyMismatch: keyMismatch,
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
    growBy: IS9WD_ENG.STORE.growBy,
    minFreeRows: IS9WD_ENG.STORE.minFreeRows,
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
  var snap = IS9WD_cfgSnapshot_(force === true);
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
  // The two views size themselves the same way: from the directory's own row count and
  // from settings, never from a number in code. The job block spills the whole schedule
  // named range, so its height is that range's height and not the filled row count.
  cfg.stats = IS9WD_statsLayout_(cfg.directory.rows.length, cfg.switches.statsTrendWeeks);
  cfg.ot = IS9WD_otLayout_(cfg.directory.rows.length, cfg.switches.statsOfficerRows);
  cfg.views = IS9WD_viewsLayout_(cfg.directory.rows.length, cfg.switches.statsTrendWeeks,
    cfg.schedule.raw.length, cfg.switches.statsOfficerRows);
  IS9WD_CONFIG_CACHE_ = cfg;
  IS9WD_coordsFlush_();
  return cfg;
}

// Which expected names do not resolve, and which retired ones still do. The self
// test reads both lists; a retired name that resolves is a formula nobody updated.
function IS9WD_nameAudit_(layout, statsLayout, otLayout, viewsLayout) {
  var map = IS9WD_namedMap_();
  var want = IS9WD_allNames_(layout, statsLayout, otLayout, viewsLayout);
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
//
// `On the carousel` is deliberately absent: it is the one cell Ethan is meant to edit to
// change the publish set, and a warning prompt there would be a prompt on the intended
// action (4.8). Every other cream cell is absent for the same reason: cream means "yours
// to type into", and a guard on a cream cell would contradict the fill.
//
// Every calculated cell is guarded, built from the block descriptors rather than typed, so
// a block that moves takes its guard with it.
function IS9WD_guardRanges_() {
  var out = [];
  var add = function (tab, a1) {
    out.push({
      tab: tab, a1: a1, whole: !a1,
      description: IS9WD_GUARD_PREFIX + IS9WD_TAB[tab] + ' ' + (a1 || 'whole tab')
    });
  };

  // Every calculated value cell and every guard note on both settings tabs, walked from
  // the descriptors: a row with a formula is the workbook's, and so is the note beside it.
  var rowBlocks = IS9WD_settingsRowBlocks_();
  for (var b = 0; b < rowBlocks.length; b++) {
    var block = rowBlocks[b];
    var holder = IS9WD_settingsHolder_(block.tab);
    for (var i = 0; i < block.rows.length; i++) {
      var row = block.rows[i];
      if (row.formula) add(block.tab, IS9WD_a1_(row.row, holder.VALUE_COL, 1, 1));
      if (row.note) add(block.tab, IS9WD_a1_(row.row, holder.NOTE_COL, 1, 1));
    }
  }

  // Every Check column on both tabs, which is the workbook talking rather than a person.
  var tables = IS9WD_settingsTableBlocks_();
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    if (!table.checkCol) continue;
    var last = table.lastRow;
    if (table.growBy) {
      // The store grows in 52 row steps and Apply sheet guards is always its own
      // execution, so the declared last row goes stale the first time it grows.
      var grown = IS9WD_namedOrNull_('IS9WD_SIGNOFF_WEEKS');
      if (grown) last = Math.max(last, grown.getRow() + grown.getNumRows() - 1);
    }
    add(table.tab, IS9WD_a1_(table.firstRow, table.checkCol, last - table.firstRow + 1, 1));
  }

  // The directory's Key column on both tabs, and the three write-once ordinals on
  // `_Engine`: a renumbered ordinal sends two committees to one Canva page.
  var d = IS9WD_CFG.DIRECTORY;
  var dRows = d.lastRow - d.firstRow + 1;
  add('CONFIG', IS9WD_a1_(d.firstRow, 1, dRows, 1));
  var de = IS9WD_ENG.DIRECTORY;
  var deRows = de.lastRow - de.firstRow + 1;
  add('ENGINE', IS9WD_a1_(de.firstRow, 1, deRows, de.lastCol));

  // The store's two code written columns.
  var st = IS9WD_ENG.STORE;
  var storeLast = st.lastRow;
  var storeRange = IS9WD_namedOrNull_('IS9WD_SIGNOFF_WEEKS');
  if (storeRange) {
    storeLast = Math.max(storeLast, storeRange.getRow() + storeRange.getNumRows() - 1);
  }
  add('ENGINE', IS9WD_a1_(st.firstRow, 6, storeLast - st.firstRow + 1, 1));

  // The derived block on the data tab, and the tabs nobody types into at all.
  add('ITEMS', IS9WD_a1_(IS9WD_ITEMS.firstRow, IS9WD_ITEMS.derivedFirstCol,
    IS9WD_ITEMS.lastRow - IS9WD_ITEMS.firstRow + 1,
    IS9WD_ITEMS.derivedLastCol - IS9WD_ITEMS.derivedFirstCol + 1));
  // The dashboard is read only end to end, so it takes the same whole tab warning guard as
  // every other tab nobody types into. It was missing, which made it the one computed tab a
  // stray keystroke could edit without a prompt.
  add('DASHBOARD', '');
  add('FEED', '');
  add('STATS', '');
  add('TABLES', '');
  add('VIEWS', '');
  add('ARCHIVE', '');
  add('LOG', '');
  return out;
}
