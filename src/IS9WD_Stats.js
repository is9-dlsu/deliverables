/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · THE THREE COMPUTED TABS
 *  IS9WD_Stats.js, the only module that writes a formula onto a view
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 6A the dashboard, 6B the officer tables,
 *          6C _Views, 2.5 conventions, 4.6C the eight thresholds.
 *
 *  THREE TABS, THREE ENTRY POINTS, IN THIS ORDER AND NEVER ANOTHER:
 *    IS9WD_viewsResize_(cfg)          owns `_Views`, hidden, the helper band
 *    IS9WD_statsResize_(cfg)          owns `03 | Statistics`, the dashboard
 *    IS9WD_officerTablesResize_(cfg)  owns `04 | Officer Tables`, the document
 *  Each one is called through IS9WD_setupCall_ so a missing push cannot take a build
 *  down. The order is a dependency: the dashboard reads the helper band by name, and the
 *  officer tables read both.
 *
 *  EVERY CELL ON ALL THREE IS A FORMULA over 02 | Deliverables, 05 | Archive,
 *  00 | Configuration and _Engine. There is no new source of truth, nothing is typed, and
 *  this module never computes a number in JavaScript and writes it into a cell: a value
 *  written once is a value that is wrong the next morning. The only literals written here
 *  are the block furniture, the gate sentences, the tile captions, the hierarchy ordinals
 *  the officer sections join on, and the three build markers, which are addresses and
 *  guards rather than data.
 *
 *  03 | STATISTICS IS A DASHBOARD. Ethan's instruction of 2026-09-27: "i want to see KPIs
 *  and Charts, literally for viewing". So it is eight big number tiles, one table of
 *  sentences, the seven readiness gates, three tables and THREE REAL EMBEDDED CHARTS built
 *  with the Apps Script chart builder. Not one threshold is on it: they are all on
 *  `_Engine`. Not one hidden column is on it: they are all on `_Views`.
 *
 *  CHARTS ARE REBUILT, NEVER APPENDED. Every chart on the tab is removed before three are
 *  inserted, because insertChart appends and a build run twice would otherwise leave six,
 *  then nine, and nothing on screen would say so until the file was slow. A chart with no
 *  data yet is still inserted and still renders, and the caption row above it says in
 *  plain words what will fill it: an empty chart with an explanation beats a missing one.
 *
 *  NEITHER VIEW MAY EVER GATE THE CANVA RUN. Readiness stays at seven gates and reads the
 *  feed alone. A broken view fails the self test and appears in the Sunday brief, and it
 *  does nothing else.
 *
 *  ONE SOURCE, TWO VIEWS. Every count in an officer section's heading is an INDEX into a
 *  named range the dashboard's own helper band produced, never a second COUNTIFS, so the
 *  two tabs cannot disagree.
 *
 *  Rules this file keeps:
 *    · Every function ends in `_`: google.script.run exposes server globals.
 *    · Every row and column comes from a layout function, so nothing here knows what the
 *      last row happens to be this term.
 *    · Every threshold comes from a named range. There is no number in this file that a
 *      person could disagree with.
 *    · A CONDITIONAL FORMAT RULE MAY NOT REFERENCE ANOTHER SHEET, and most of the names a
 *      rule needs now live on another sheet, so every named range inside a rule goes
 *      through IS9WD_statsRuleName_ and comes out as INDIRECT("NAME"). This is the bug
 *      that stopped 04 | Officer Tables being built at all, and the wrapper is why it
 *      cannot come back.
 *    · Idempotent. Each entry point trims, wipes, repaints and rewrites the tab it owns,
 *      hands back a whole conditional format rule list rather than appending to one, and
 *      removes every chart before inserting any.
 *    · Nothing is merged, on any of the three. The Drive connector renders a merged cell
 *      as a repeated `[merged]` value and all three are inside the same read. A tile is a
 *      wide column, a big type size and overflow wrap, never a merge.
 *    · Every fallback is the visible sentinel `!ERR`, except where blank is the contract:
 *      an unscored rank, an unused trend row, `No slide` on an officer who does not
 *      publish, and an officer with no tasks.
 * =============================================================================
 */

// ============================================================================
//  FORMULA STRING HELPERS  (pure text, no sheet access, no Apps Script call)
// ============================================================================

// These mirror the four in IS9WD_Feed.js rather than importing them, and the
// duplication is deliberate: IS9WD_Feed.js can be absent from a half pushed project,
// setup guards against exactly that, and a ReferenceError raised inside this module
// would take down a build the guard was written to survive.

function IS9WD_statsQ_(s) {
  return '"' + String(s).replace(/"/g, '""') + '"';
}

// `$D25`, column locked and row free: the shape every per-row formula here uses.
function IS9WD_statsRef_(col, row) {
  return '$' + IS9WD_colLetter_(col) + row;
}

// `$D$25`, locked both ways, for a cell a whole block points at.
function IS9WD_statsCell_(col, row) {
  return '$' + IS9WD_colLetter_(col) + '$' + row;
}

// `$D$25:$D$33`, one column of a block.
function IS9WD_statsBand_(col, firstRow, lastRow) {
  var letter = IS9WD_colLetter_(col);
  return '$' + letter + '$' + firstRow + ':$' + letter + '$' + lastRow;
}

// `$A$1:$L$136`, a rectangle locked both ways.
function IS9WD_statsBox_(firstCol, firstRow, lastCol, lastRow) {
  return '$' + IS9WD_colLetter_(firstCol) + '$' + firstRow +
    ':$' + IS9WD_colLetter_(lastCol) + '$' + lastRow;
}

function IS9WD_statsSep_() {
  return IS9WD_statsQ_(IS9WD_SEP);
}

function IS9WD_statsErr_() {
  return IS9WD_statsQ_(IS9WD_STATS.ERR);
}

// A cross tab read of a feed cell, wrapped so a feed that was never sized surfaces
// the sentinel this tab counts rather than a bare #NAME? nobody can act on.
function IS9WD_statsFeed_(name) {
  return 'IFERROR(' + name + ',' + IS9WD_statsErr_() + ')';
}

// A NAMED RANGE INSIDE A CONDITIONAL FORMAT RULE, and the one rule that has to be kept
// mechanically rather than remembered. Sheets refuses a conditional format rule whose
// formula references another sheet, and it refuses it at the moment the rule is applied,
// which takes the whole build down several tabs later than the mistake. Most of the names
// a rule on these tabs needs are now on `_Engine` or `_Views`, so every one of them goes
// through here and comes out as an INDIRECT, including the ones that happen to be local:
// a wrapper applied selectively is a wrapper somebody forgets.
function IS9WD_statsRuleName_(name) {
  return 'INDIRECT(' + IS9WD_statsQ_(name) + ')';
}

// The eight blocking flags as a vertical array literal, read from Core so this tab and
// the readiness gate can never disagree about what blocks (5.3).
function IS9WD_statsBlockingArray_() {
  var out = [];
  for (var i = 0; i < IS9WD_BLOCKING_FLAGS_.length; i++) {
    out.push(IS9WD_statsQ_(IS9WD_BLOCKING_FLAGS_[i]));
  }
  return '{' + out.join(';') + '}';
}

// The one `Check` string Core does not expose as a constant, because it is the only
// flag that does not block. Reading the literal is existing practice rather than a new
// hardcode: IS9WD_Items.js already paints on the same word, and the alternative here
// would be a second definition of overdue that can drift from the flag Ethan sees on
// the data tab.
function IS9WD_statsOverdueFlag_() {
  return 'Overdue';
}

// ============================================================================
//  COLUMN STYLE, ONE ENTRY PER COLUMN OF EACH BLOCK
// ============================================================================

// `fg` tints a column that is plumbing rather than a measure; `bold` carries the eye to
// the column a reader looks for first. Nothing here decorates a good state: the tab is
// calm by default and only an exception is marked, which is what "premium" means in a
// palette with no green and no red (2.5).
function IS9WD_statsCols_() {
  return {
    // The sentence table: what, the number, and what to do about it. The sentence sits in
    // an 80 px column and overflows right across D to L, which is why no row of the block
    // puts anything in D to L.
    ATTENTION: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.OVER, fg: IS9WD_ROLE.HINT_FG }
    ],
    KV: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.OVER, fg: IS9WD_ROLE.HINT_FG },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG }
    ],
    OFFICER: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.PCT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.PCT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.ONE, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP }
    ],
    RANKED: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.PCT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.OVER, fg: IS9WD_ROLE.HINT_FG }
    ],
    TREND: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TWO, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.PCT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG }
    ],
    GATES: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.OVER, fg: IS9WD_ROLE.HINT_FG }
    ],
    JOBS: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.OVER }
    ],
    // `_Views`, the officer helper band: five columns of the identity sort then eight
    // broadcast helpers.
    VIEW_OFFICER: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.STAMP, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP }
    ],
    VIEW_RANK: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.PCT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP }
    ],
    VIEW_TREND: [
      { align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DATE_KEY, wrap: IS9WD_WRAP.CLIP }
    ],
    VIEW_MARKER: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.INT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.OVER, fg: IS9WD_ROLE.HINT_FG }
    ],
    // 04 | Officer Tables. Title first because it is the thing you read, then the two
    // cells that say whether it is late, then the detail.
    OT: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.DEADLINE, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.RIGHT, format: IS9WD_FMT.SIGNED, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG },
      { align: IS9WD_ALIGN.CENTER, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, fg: IS9WD_ROLE.HINT_FG }
    ]
  };
}

// The plain English line that rides under each section band, in the band's own hint row.
// One line, and each one says what a reader would otherwise get wrong.
function IS9WD_statsBandHelp_() {
  return {
    tile: 'The eight numbers to look at before Sunday. A plain number needs nothing from ' +
      'you. A number in bold purple is naming something to do, and the table under these ' +
      'tiles says what.',
    attention: 'The same numbers again, with the names. This is the chase list: read the ' +
      'right hand column and act on it.',
    gate: 'The seven things that have to be true before the carousel can go out. Any one ' +
      'of them reading HOLD stops it, and the right hand column says what to do.',
    officer: 'Fourteen officers in order of rank. Attention is second from the left ' +
      'because it is the column to scan. Due, Done and Rate are this week; the rest cover ' +
      'everything still on the data tab.',
    rank: 'The share of each officer\'s past-deadline tasks that were ticked on or before ' +
      'the deadline, so a busy committee is not punished for being busy. A blank means too ' +
      'few tasks to judge, not a score of zero.',
    trend: 'Read from ' + IS9WD_TAB.ARCHIVE + ', oldest week first. Published is ' +
      'reliable; ' +
      'Accomplished is recorded only for a task that has been retired.',
    health: 'Whether the machine ran, whether it can still send, and how much room is ' +
      'left in the data tab.',
    job: 'Whether each job ran and whether it failed, read from the schedule block itself.',
    marker: 'What the build actually made, so a setting changed without a rebuild is ' +
      'caught by the guard beside it rather than by a stale tab.',
    viewOfficer: 'One sorted spill and eight broadcast formulas. ' + IS9WD_TAB.STATS +
      ' and ' +
      '04 | Officer Tables both point at these rather than recomputing them.',
    viewRank: 'The ranked sort. An unscored officer is carried as -1 so a descending sort ' +
      'puts them last, and the dashboard shows the -1 as blank.',
    viewTrend: 'Each trend week\'s Monday, and that week\'s own trimester start, so a week ' +
      'inside a previous trimester numbers against its own trimester.'
  };
}

// ============================================================================
//  THE EIGHT TILES  (6A: the headline KPIs, as numbers a president can read)
// ============================================================================

// Keyed on the machine key rather than ordered, so if the tile list in IS9WD_Config.js
// ever grows a tile this throws on the unknown key instead of writing eight formulas one
// position out of place, which is a failure nothing on the tab would show.
//
// `value` is the big number. `note` is the one short line under the label, and short is a
// constraint rather than a preference: a tile is 240 px wide and the line clips. Anything
// that needs a sentence belongs in the attention table, which is exactly what that table
// is for.
function IS9WD_statsTileSpec_() {
  var load = '(IS9WD_STATS_ACTIVE_WEEK+IS9WD_STATS_DONE_WEEK)';
  var overdue = IS9WD_statsQ_(IS9WD_statsOverdueFlag_());
  var spec = {};

  // The week, because every number beside it is scoped to this week and a reader who has
  // to guess which week is reading a different report from the one on screen.
  spec['T.WEEK'] = {
    value: '="WEEK "&IF(IS9WD_WEEK_NUMBER="","--",TEXT(IS9WD_WEEK_NUMBER,"00"))',
    note: '=TEXT(IS9WD_WEEK_START,"ddd, mmm d")&" to "&TEXT(IS9WD_WEEK_END,"ddd, mmm d")&' +
      'IF(IS9WD_IN_TERM,"",", outside every trimester")',
    flag: '=NOT(' + IS9WD_statsRuleName_('IS9WD_IN_TERM') + ')',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // The denominator a reader holds in their head.
  spec['T.ACTIVE'] = {
    value: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",' +
      'IS9WD_DEL_DEADLINE,">="&IS9WD_WEEK_START,IS9WD_DEL_DEADLINE,"<="&IS9WD_WEEK_END)',
    note: '=IF(' + load + '=0,"nothing entered for this week","still open of "&' +
      load + '&" entered")',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.LEFT
  };

  // Reads the derived Active flag, never a status label. A task ticked this week whose
  // deadline was last week counts against last week's load, which is right and is stated
  // in the tab's help line.
  spec['T.DONE'] = {
    value: '=COUNTIFS(IS9WD_DEL_ACTIVE,FALSE,IS9WD_DEL_TITLE,"<>",' +
      'IS9WD_DEL_DEADLINE,">="&IS9WD_WEEK_START,IS9WD_DEL_DEADLINE,"<="&IS9WD_WEEK_END)',
    note: '="ticked off by the officers"',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.LEFT
  };

  // A naked completion percentage mid-week is a vanity number: it is 0% on Monday morning
  // by construction. Against the elapsed fraction of the week it becomes ahead or behind,
  // which is actionable, and the slack setting keeps it from crying on a Tuesday.
  spec['T.PACE'] = {
    value: '=IF(' + load + '=0,"",IFERROR(IS9WD_STATS_DONE_WEEK/' + load + ',""))',
    note: '=IF(' + load + '=0,"nothing entered yet",' +
      'IF(IS9WD_STATS_ELAPSED=0,"the week starts tomorrow",' +
      'IF(IS9WD_STATS_PACE>=IS9WD_STATS_ELAPSED/7,"on pace or ahead",' +
      '"behind by "&TEXT(IS9WD_STATS_ELAPSED/7-IS9WD_STATS_PACE,"0%"))))',
    flag: '=AND(' + load + '>0,' + IS9WD_statsRuleName_('IS9WD_STATS_ELAPSED') + '>0,' +
      'IS9WD_STATS_PACE<' + IS9WD_statsRuleName_('IS9WD_STATS_ELAPSED') + '/7-' +
      IS9WD_statsRuleName_('IS9WD_STATS_PACE_SLACK') + ')',
    format: IS9WD_FMT.PCT, align: IS9WD_ALIGN.LEFT
  };

  // READY or NOT READY rather than the feed's own sentence, because a tile is read from
  // across a desk. The feed's cell stays the single source of the verdict: this reads it
  // and so does the agreement check on the last row, which is what stops this tile
  // becoming a second opinion.
  spec['T.READY'] = {
    value: '=IFERROR(IF(RIGHT(IS9WD_FEED_READY,2)="NO","NOT READY","READY"),' +
      IS9WD_statsErr_() + ')',
    note: '=IFERROR("held by: "&INDEX(IS9WD_STATS_GATE_LABEL,' +
      'MATCH("HOLD",IS9WD_STATS_GATE_STATE,0)),"all seven gates pass")',
    flag: '=' + IS9WD_statsRuleName_('IS9WD_STATS_READY') + '<>"READY"',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // Reads the Check column rather than restating the rule. Recomputing it here would be a
  // second definition of overdue that can drift from the flag Ethan sees on the data tab.
  spec['T.OVERDUE'] = {
    value: '=COUNTIF(IS9WD_DEL_CHECK,' + overdue + ')',
    note: '=IF(IS9WD_STATS_OVERDUE_NOW=0,"nothing is past its deadline",' +
      '"worst is "&MAX(IS9WD_STATS_OFF_LATE)&" days late")',
    flag: '=' + IS9WD_statsRuleName_('IS9WD_STATS_OVERDUE_NOW') + '>0',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.LEFT
  };

  // Exactly what the daily email sends out, so it says what landed in thirteen inboxes
  // this morning. Never flagged: a busy Wednesday is not a fault.
  spec['T.SOON'] = {
    value: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",' +
      'IS9WD_DEL_DEADLINE,">="&IS9WD_EFFECTIVE_TODAY,' +
      'IS9WD_DEL_DEADLINE,"<="&IS9WD_EFFECTIVE_TODAY+1)',
    note: '="the window the daily email uses"',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.LEFT
  };

  // The single most actionable number on the tab, because it is Ethan's own omission and
  // nobody else's: he enters every task, so an officer with nothing entered has nothing to
  // tick and will get no Monday email. The names are in the attention table below.
  spec['T.NOITEMS'] = {
    value: '=SUMPRODUCT(--(IS9WD_STATS_OFF_NAME<>""),--(N(IS9WD_STATS_OFF_LOAD)=0))',
    note: '=IF(IS9WD_STATS_NO_ITEMS=0,"everyone has something this week",' +
      '"they get no Monday email until you enter something")',
    flag: '=' + IS9WD_statsRuleName_('IS9WD_STATS_NO_ITEMS') + '>0',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.LEFT
  };

  return spec;
}

// ============================================================================
//  WHAT NEEDS ATTENTION  (6A: the six sentences, where the names live)
// ============================================================================

// Three of these carry a measure of their own and three point at a tile, so every one of
// the eleven measures is named exactly once on the tab. The reading is the whole point of
// the block: a count of four is not an action and four names are.
function IS9WD_statsAttentionSpec_() {
  var sep = IS9WD_statsSep_();
  var spec = {};

  spec['A.OVERDUE'] = {
    value: '=IS9WD_STATS_OVERDUE_NOW',
    reading: '=IF(IS9WD_STATS_OVERDUE_NOW=0,"Nothing is past its deadline.",' +
      '"Chase first: "&IFERROR(INDEX(IS9WD_STATS_OFF_NAME,' +
      'MATCH(MAX(IS9WD_STATS_OFF_LATE),IS9WD_STATS_OFF_LATE,0)),"")&' + sep +
      '&"worst is "&MAX(IS9WD_STATS_OFF_LATE)&" days late. The officer table below lists ' +
      'every one.")',
    flag: '=N(' + IS9WD_statsRuleName_('IS9WD_STATS_OVERDUE_NOW') + ')>0',
    format: IS9WD_FMT.INT
  };

  spec['A.NOITEMS'] = {
    value: '=IS9WD_STATS_NO_ITEMS',
    reading: '=IF(IS9WD_STATS_NO_ITEMS=0,"Every officer has something for this week.",' +
      '"Nothing entered for: "&TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF((IS9WD_STATS_OFF_NAME<>"")*' +
      '(N(IS9WD_STATS_OFF_LOAD)=0),IS9WD_STATS_OFF_NAME,"")))&' + sep +
      '&"They get no Monday email until you enter something for them.")',
    flag: '=N(' + IS9WD_statsRuleName_('IS9WD_STATS_NO_ITEMS') + ')>0',
    format: IS9WD_FMT.INT
  };

  // The only available proxy for whether a private link is being used at all. The caveat
  // is in the tab's help line: a status change by Ethan from the Sheet resets it too, so
  // silence is evidence and not proof. The action is concrete either way, because a link
  // can be reissued from the menu.
  spec['A.SILENT'] = {
    value: '=SUMPRODUCT(--(IS9WD_STATS_OFF_NAME<>""),' +
      '--(N(IS9WD_STATS_OFF_SILENT_N)>=IS9WD_STATS_SILENT_DAYS))',
    reading: '=IF(IS9WD_STATS_SILENT=0,"Every link has been used inside "&' +
      'IS9WD_STATS_SILENT_DAYS&" days.","Silent: "&TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF(' +
      '(IS9WD_STATS_OFF_NAME<>"")*(N(IS9WD_STATS_OFF_SILENT_N)>=IS9WD_STATS_SILENT_DAYS),' +
      'IS9WD_STATS_OFF_NAME,"")))&' + sep + '&"Reissue a link from Links in the menu if ' +
      'somebody has lost theirs.")',
    flag: '=N(' + IS9WD_statsRuleName_('IS9WD_STATS_SILENT') + ')>0',
    format: IS9WD_FMT.INT
  };

  // The eight names and the `"?*"` filter are the readiness criterion's, including both
  // load bearing halves: IS9WD_DEL_PUBKEY and not IS9WD_DEL_PAGE, because page is blank on
  // any row with no rank, and `"?*"` and not `"<>"`, because Publish key is a formula
  // returning "" in every unused row.
  spec['A.BLOCKING'] = {
    value: '=SUM(COUNTIFS(IS9WD_DEL_CHECK,' + IS9WD_statsBlockingArray_() +
      ',IS9WD_DEL_PUBKEY,"?*"))',
    reading: '=IF(IS9WD_STATS_BLOCKING=0,"Nothing is blocking the carousel.",' +
      'IFERROR("First is "&INDEX(IS9WD_FLAGS,1,5)&" on "&INDEX(IS9WD_FLAGS,1,6)&" ("&' +
      'INDEX(IS9WD_FLAGS,1,3)&")"&' + sep + '&"Fix the marked rows on ' +
      IS9WD_TAB.ITEMS + '.",' +
      IS9WD_statsErr_() + '))',
    flag: '=N(' + IS9WD_statsRuleName_('IS9WD_STATS_BLOCKING') + ')>0',
    format: IS9WD_FMT.INT
  };

  // Not flagged and given the accent instead, because a task that does not fit a slide is
  // not a mistake and the feed already treats the same number that way (5.4).
  spec['A.NOTPUB'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_NOTPUB'),
    reading: '=IF(N(IS9WD_STATS_PAST_CAROUSEL)=0,"Every task this week has a slide.",' +
      '"No slide for: "&TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF(N(IS9WD_STATS_OFF_NOTPUB)>0,' +
      'IS9WD_STATS_OFF_NAME&" ("&N(IS9WD_STATS_OFF_NOTPUB)&")","")))&' + sep +
      '&"This is not a fault: cut, reprioritise, or accept it.")',
    flag: '=FALSE',
    accent: true,
    format: IS9WD_FMT.INT
  };

  spec['A.READY'] = {
    value: '=IS9WD_STATS_READY',
    reading: '=IFERROR("Held by: "&INDEX(IS9WD_STATS_GATE_LABEL,' +
      'MATCH("HOLD",IS9WD_STATS_GATE_STATE,0))&' + sep +
      '&"The gates block below says what to do about it.",' +
      '"All seven gates pass, so the carousel can go out.")',
    flag: '=' + IS9WD_statsRuleName_('IS9WD_STATS_READY') + '<>"READY"',
    format: IS9WD_FMT.TEXT
  };

  return spec;
}

// ============================================================================
//  BLOCK `READINESS GATES`  (six plain reads, one pointer at this tab's own count)
// ============================================================================

function IS9WD_statsGateSpec_() {
  var spec = {};
  spec['G.TERM'] = {
    state: '=IF(IS9WD_IN_TERM,"PASS","HOLD")',
    todo: 'Reads Inside a trimester right now on ' + IS9WD_TAB.CONFIG +
      '. A blank last day ' +
      'pauses every job, so fill in the trimester dates.'
  };
  spec['G.SIGNOFF'] = {
    state: '=IF(IS9WD_SIGNOFF_SET,"PASS","HOLD")',
    todo: "Reads Signed off for this week. Set Prepared by and Checked by in the " +
      "officers' page, which writes this week's row of the store."
  };
  spec['G.CAPACITY'] = {
    state: '=IF(' + IS9WD_statsFeed_('IS9WD_FEED_CAPCHECK') + '="OK","PASS","HOLD")',
    todo: 'Reads Capacity check on the feed. Restore the formula in the derived ' +
      'publishable maximum on _Engine, then run Build or repair workbook.'
  };
  spec['G.PLAN'] = {
    state: '=IF(' + IS9WD_statsFeed_('IS9WD_FEED_PLANCHECK') + '="OK","PASS","HOLD")',
    todo: 'Reads Plan check on the feed. It names the committee or the page at fault, ' +
      'usually a slide number.'
  };
  spec['G.FLAGCAP'] = {
    state: '=IF(' + IS9WD_statsFeed_('IS9WD_FEED_FLAGCHECK') + '="OK","PASS","HOLD")',
    todo: 'Reads Flag list check on the feed. The flag block is a budget rather than a ' +
      'bound, so a longer list needs Build or repair workbook.'
  };
  spec['G.ERRORS'] = {
    state: '=IF(N(' + IS9WD_statsFeed_('IS9WD_FEED_ERRORS') + ')=0,"PASS","HOLD")',
    todo: 'Reads Feed errors. Any count above zero is a broken formula or a broken named ' +
      'range on the feed itself.'
  };
  spec['G.BLOCKING'] = {
    state: '=IF(N(IS9WD_STATS_BLOCKING)=0,"PASS","HOLD")',
    todo: 'Reads the blocking count above, so the eight flag names exist once on this ' +
      'tab. Fix the marked rows on ' + IS9WD_TAB.ITEMS + '.'
  };
  return spec;
}

// ============================================================================
//  BLOCK `OPERATIONAL HEALTH`  (on _Views: the machine reporting on itself)
// ============================================================================

function IS9WD_statsHealthSpec_() {
  var sep = IS9WD_statsSep_();
  var spec = {};

  spec['H.READY'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_READY'),
    reading: '="the cell the feed publishes, word for word"',
    flag: '=IFERROR(RIGHT(' + IS9WD_statsRuleName_('IS9WD_FEED_READY') + ',2)="NO",TRUE)',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  spec['H.PAGES'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_PAGES'),
    reading: '="slides the carousel holds this week, out of the "&' +
      IS9WD_statsFeed_('IS9WD_FEED_MASTER') + '&" the master design holds"',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  spec['H.EXPORT'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_EXPORT'),
    reading: '="export these master pages, in this order"',
    flag: '=FALSE',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // Never flagged, and given the accent instead. A formula cannot know how many pages the
  // Canva master physically holds, so a test against a number in this file would be either
  // always true or always false.
  spec['H.MASTER'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_MASTER'),
    reading: '="the Canva master must physically hold this many pages. Raising a ' +
      'capacity number needs a master rebuild before it can be used"',
    flag: '=FALSE',
    accent: true,
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  spec['H.LASTRUN'] = {
    value: '=IS9WD_DIAG_LAST_RUN',
    reading: '=IF(ISNUMBER(IS9WD_DIAG_LAST_RUN),"the trigger runs hourly, so this should ' +
      'be inside the hour",IF(IS9WD_DIAG_LAST_RUN="","the dispatcher has not run yet. ' +
      'Install automations from the menu","this cell does not hold a timestamp"))',
    flag: '=IF(ISNUMBER(' + IS9WD_statsRuleName_('IS9WD_DIAG_LAST_RUN') + '),NOW()-' +
      IS9WD_statsRuleName_('IS9WD_DIAG_LAST_RUN') + '>2/24,TRUE)',
    format: IS9WD_FMT.STAMP, align: IS9WD_ALIGN.RIGHT
  };

  spec['H.MODE'] = {
    value: '=IF(IS9WD_AUTOMATION_ON,"ON","OFF")&' + sep + '&"test mode "&' +
      'IF(IS9WD_TEST_MODE,"ON","OFF")',
    reading: '="automation off pauses every job. Test mode sends every email to the ' +
      'admin instead of to the officers"',
    flag: '=OR(NOT(' + IS9WD_statsRuleName_('IS9WD_AUTOMATION_ON') + '),' +
      IS9WD_statsRuleName_('IS9WD_TEST_MODE') + ')',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // Tests the summary line for the phrase the self test writes when something failed,
  // which lives in IS9WD_Config.js so the two files cannot drift.
  spec['H.SELFTEST'] = {
    value: '=IS9WD_DIAG_SELFTEST',
    reading: '=IF(IS9WD_DIAG_SELFTEST="","the self test has not been run on this ' +
      'workbook yet. Checks > Run self test","Checks > Run self test writes this line")',
    flag: '=OR(' + IS9WD_statsRuleName_('IS9WD_DIAG_SELFTEST') + '="",' +
      'NOT(ISERROR(FIND(' + IS9WD_statsQ_(IS9WD_SELFTEST_FAIL_MARKER_) + ',' +
      IS9WD_statsRuleName_('IS9WD_DIAG_SELFTEST') + '))))',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  spec['H.QUOTA'] = {
    value: '=IS9WD_DIAG_QUOTA',
    reading: '="the quota guard stops sending below the reserve of "&IS9WD_QUOTA_RESERVE&' +
      '", rather than half sending a batch"',
    flag: '=IF(ISNUMBER(' + IS9WD_statsRuleName_('IS9WD_DIAG_QUOTA') + '),' +
      IS9WD_statsRuleName_('IS9WD_DIAG_QUOTA') + '<' +
      IS9WD_statsRuleName_('IS9WD_QUOTA_RESERVE') + ',FALSE)',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  spec['H.OVERRIDES'] = {
    value: '=IS9WD_DIAG_OVERRIDES',
    reading: '=COUNTIF(IS9WD_DIR_REVOKED,TRUE)&" links revoked"&' + sep + '&' +
      'SUMPRODUCT(--(N(IS9WD_DIR_ISSUED)>0),' +
      '--(IS9WD_EFFECTIVE_TODAY-N(IS9WD_DIR_ISSUED)>IS9WD_TOKEN_WARN_DAYS))&' +
      '" past the warning age"&' + sep + '&"an override makes every number on the ' +
      'dashboard describe a week the calendar may not contain"',
    flag: '=OR(AND(' + IS9WD_statsRuleName_('IS9WD_DIAG_OVERRIDES') + '<>"",' +
      IS9WD_statsRuleName_('IS9WD_DIAG_OVERRIDES') + '<>"not set"),' +
      'COUNTIF(' + IS9WD_statsRuleName_('IS9WD_DIR_REVOKED') + ',TRUE)>0)',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  spec['H.ROWS'] = {
    value: '=COUNTIF(IS9WD_DEL_ID,"?*")&" of "&ROWS(IS9WD_DEL_ID)',
    reading: '="the row below carries the verdict"',
    flag: '=FALSE',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.RIGHT
  };

  spec['H.ROOM'] = {
    value: '=IFERROR(ROUND((ROWS(IS9WD_DEL_ID)-COUNTIF(IS9WD_DEL_ID,"?*"))' +
      '/MAX(1,COUNTIFS(IS9WD_DEL_CREATED_AT,">="&IS9WD_EFFECTIVE_TODAY-28)/4),0),' +
      IS9WD_statsErr_() + ')',
    reading: '="at the rate of the last four weeks. Retire accomplished tasks to reclaim ' +
      'rows, which is the RETIRE_ACCOMPLISHED job in the schedule below"',
    flag: '=IF(ISNUMBER(' + IS9WD_statsRuleName_('IS9WD_STATS_ROOM_WEEKS') + '),' +
      IS9WD_statsRuleName_('IS9WD_STATS_ROOM_WEEKS') + '<' +
      IS9WD_statsRuleName_('IS9WD_STATS_ROOM_WEEKS_WARN') + ',FALSE)',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  return spec;
}

// ============================================================================
//  THE ENTRY POINT FOR _VIEWS
// ============================================================================

/**
 * Sizes, paints and writes `_Views`, or refuses and changes nothing. It runs FIRST of the
 * three, because 03 | Statistics reads its helper band by name and 04 | Officer Tables
 * reads both.
 *
 * The caller holds the document lock (section 9). Nothing here takes it, because two
 * writers over one tab is the failure the lock exists for and a nested lock would hide it.
 */
function IS9WD_viewsResize_(cfg) {
  var conf = cfg || IS9WD_readConfig_();
  var layout = conf.views || IS9WD_views_();
  var sheet = IS9WD_sheet_('VIEWS');

  IS9WD_ensureGrid_(sheet, layout.endRow, layout.lastCol);
  IS9WD_viewsTrim_(sheet, layout);
  IS9WD_viewsWipe_(sheet, layout);
  var names = IS9WD_viewsPointNames_(sheet, layout);

  IS9WD_viewsPaintAll_(sheet, layout);
  var report = IS9WD_viewsWriteAll_(sheet, layout);
  report.namesPointed = names;
  return report;
}

function IS9WD_viewsPointNames_(sheet, layout) {
  var want = IS9WD_viewsNames_(layout);
  for (var i = 0; i < want.length; i++) {
    IS9WD_setNamed_(want[i].name, sheet.getRange(want[i].a1));
  }
  return want.length;
}

// clear() does not clear a border, which the other three wipes on this tab say in a comment
// and this one did not do at all. Now that every card draws inner dotted rules, a block that
// moves would leave the previous layout's grid behind on rows that no longer hold a table.
function IS9WD_viewsWipe_(sheet, layout) {
  var rows = Math.max(layout.endRow, sheet.getLastRow());
  var cols = Math.max(layout.lastCol, sheet.getLastColumn());
  var all = sheet.getRange(1, 1, rows, cols);
  all.clear();
  all.setBorder(false, false, false, false, false, false);
  all.clearDataValidations();
  all.clearNote();
}

function IS9WD_viewsTrim_(sheet, layout) {
  var extraRows = sheet.getMaxRows() - layout.endRow;
  if (extraRows > 0) sheet.deleteRows(layout.endRow + 1, extraRows);
  var extraCols = sheet.getMaxColumns() - layout.lastCol;
  if (extraCols > 0) sheet.deleteColumns(layout.lastCol + 1, extraCols);
}

function IS9WD_viewsPaintAll_(sheet, layout) {
  var v = layout;
  var cols = IS9WD_statsCols_();
  var help = IS9WD_statsBandHelp_();

  sheet.getRange(1, 1, v.endRow, v.lastCol).setFontFamily(IS9WD_FONT);
  IS9WD_paintBanner_(sheet, v.bannerRow, v.firstCol, v.lastCol, IS9WD_VIEWS.BANNER);
  IS9WD_paintHelp_(sheet, v.helpRow, v.firstCol, v.lastCol, IS9WD_VIEWS.HELP);

  IS9WD_statsBlock_(sheet, v, v.markerBand, 'BUILD MARKERS', help.marker,
    null, v.markerFirst, v.markerLast, cols.VIEW_MARKER);
  IS9WD_statsBlock_(sheet, v, v.officerBand, 'OFFICER IDENTITY AND HELPERS',
    help.viewOfficer, IS9WD_STATS_HEADERS.VIEW_OFFICER, v.officerFirst, v.officerLast,
    cols.VIEW_OFFICER);
  IS9WD_statsBlock_(sheet, v, v.rankBand, 'RANKED SORT', help.viewRank,
    IS9WD_STATS_HEADERS.VIEW_RANK, v.rankFirst, v.rankLast, cols.VIEW_RANK);
  IS9WD_statsBlock_(sheet, v, v.trendBand, 'TREND HELPERS', help.viewTrend,
    IS9WD_STATS_HEADERS.VIEW_TREND, v.trendFirst, v.trendLast, cols.VIEW_TREND);
  IS9WD_statsBlock_(sheet, v, v.healthBand, 'OPERATIONAL HEALTH', help.health,
    IS9WD_STATS_HEADERS.KV, v.healthFirst, v.healthLast, cols.KV);
  IS9WD_statsBlock_(sheet, v, v.jobBand, 'SCHEDULED JOBS', help.job,
    IS9WD_STATS_HEADERS.JOBS, v.jobFirst, v.jobLast, cols.JOBS);

  IS9WD_statsSpacers_(sheet, v.spacerRows, v.lastCol);
  IS9WD_statsEndBand_(sheet, v.endRow, v.lastCol);

  IS9WD_setWidths_(sheet, 'VIEWS');
  sheet.showColumns(1, v.lastCol);
  IS9WD_freezeTab_(sheet, 'VIEWS');
  sheet.setTabColor(IS9WD_TAB_COLOR.VIEWS);
}

function IS9WD_viewsWriteAll_(sheet, layout) {
  var v = layout;
  IS9WD_viewsMarkers_(sheet, v);
  IS9WD_viewsOfficers_(sheet, v);
  IS9WD_viewsRanked_(sheet, v);
  IS9WD_viewsTrend_(sheet, v);
  IS9WD_viewsHealth_(sheet, v);
  IS9WD_viewsJobs_(sheet, v);
  IS9WD_viewsEndRow_(sheet, v);
  IS9WD_setRules_(sheet, IS9WD_viewsRules_(sheet, v));

  return {
    tab: IS9WD_TAB.VIEWS,
    directoryRows: v.directoryRows,
    trendWeeks: v.trendWeeks,
    jobRows: v.jobRows,
    officerRows: v.officerRows,
    lastRow: v.endRow,
    writtenAt: IS9WD_stampText_(new Date())
  };
}

// The three build markers. Two of them are literals, and they are the only numbers this
// module writes into a cell: a layout setting raised without a rebuild would otherwise
// spill a row into a spacer and produce a #REF!, and the guard note beside the setting on
// `_Engine` compares the two and says so.
//
// Elapsed days is a formula. On Sunday the week starts tomorrow, so elapsed is 0 and
// nothing can be behind pace, which is correct: Sunday's run describes the week that
// starts the next morning.
function IS9WD_viewsMarkers_(sheet, layout) {
  var rows = [
    ['Elapsed days of this week',
      '=IF(IS9WD_EFFECTIVE_TODAY<IS9WD_WEEK_START,0,' +
      'MIN(7,IS9WD_EFFECTIVE_TODAY-IS9WD_WEEK_START+1))',
      'Day n of 7. Zero on a Sunday, because the week starts tomorrow.'],
    ['Trend weeks built', layout.trendWeeks,
      'What the trend block was actually built with. The guard on _Engine compares it ' +
      'against the setting.'],
    ['Rows reserved per officer built', layout.officerRows,
      'What 04 | Officer Tables was actually built with. The guard on _Engine compares ' +
      'it against the setting.']
  ];
  for (var i = 0; i < rows.length; i++) {
    var row = layout.markerFirst + i;
    sheet.getRange(row, 1).setValue(rows[i][0]);
    var cell = sheet.getRange(row, 2);
    cell.setNumberFormat(IS9WD_FMT.INT);
    if (typeof rows[i][1] === 'string') {
      cell.setFormula(rows[i][1]);
    } else {
      cell.setValue(rows[i][1]);
    }
    sheet.getRange(row, 3).setValue(rows[i][2]);
  }
}

// ONE SPILLING SORT plus six broadcast formulas and two columns of single cells. COUNTIFS,
// SUMIFS and SUMIF take an array criterion under ARRAYFORMULA, which is what makes a fourteen
// row block cost one formula per column. MINIFS and MAXIFS DO NOT: measured on the live sheet
// on 2026-09-28, each returned one scalar for all fourteen rows (the self test's broadcast
// check caught it the first day the sheet held an item), so those two columns are written as
// fourteen single cells each, the fallback reference 6A.13 names. Each cell reads its own
// officer through INDEX into the name column, so nothing here is a cell address.
//
// The five offices are ordinary rows here, exactly as 5.4 says they are everywhere except
// Canva. Hierarchy order rather than carousel order, because hierarchy order is the order
// every list a person reads is sorted by.
//
// The identity sort combines three columns from 00 | Configuration with two from _Engine in
// one array literal. That is legal because all five are the same height, and it is the
// reason the directory could be split across two tabs at all.
function IS9WD_viewsOfficers_(sheet, layout) {
  var v = layout;
  var rows = v.officerLast - v.officerFirst + 1;
  var name = 'IS9WD_STATS_OFF_NAME';
  var blank = 'IF(' + name + '="","",';
  var today = 'IS9WD_EFFECTIVE_TODAY';

  sheet.getRange(v.officerFirst, 1).setFormula(
    '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({IS9WD_DIR_NAME,IS9WD_DIR_VP,' +
    'IS9WD_DIR_POSITION,IS9WD_DIR_CAROUSEL,IS9WD_DIR_HIERARCHY},IS9WD_DIR_KEY<>""),' +
    '5,TRUE),' + rows + ',5),' + IS9WD_statsErr_() + ')');

  // Eight helpers, one broadcast formula each, written in the same call as the block they
  // belong to so a resize can never leave a helper describing the old size. `9999` rather
  // than blank in the silence column, so Silent can be compared numerically without a text
  // guard. The blocking count deliberately does not restate the eight flag names: `"?*"`
  // counts every non-blank Check and Overdue is subtracted, so it stays correct the day a
  // ninth flag is added.
  var helpers = [
    '=ARRAYFORMULA(' + blank + 'IS9WD_STATS_OFF_DUE+IS9WD_STATS_OFF_DONE))',
    null,
    null,
    '=ARRAYFORMULA(' + blank + 'IF(N(IS9WD_STATS_OFF_LASTTICK)=0,9999,' +
      today + '-INT(IS9WD_STATS_OFF_LASTTICK))))',
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name +
      ',IS9WD_DEL_CHECK,"?*")-COUNTIFS(IS9WD_DEL_COMMITTEE,' + name +
      ',IS9WD_DEL_CHECK,' + IS9WD_statsQ_(IS9WD_statsOverdueFlag_()) + ')))',
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name +
      ',IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>")))',
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name +
      ',IS9WD_DEL_ACTIVE,FALSE,IS9WD_DEL_TITLE,"<>")))',
    '=ARRAYFORMULA(' + blank + 'IS9WD_STATS_OFF_ACTIVE_ALL+IS9WD_STATS_OFF_DONE_ALL))'
  ];
  for (var x = 0; x < helpers.length; x++) {
    if (helpers[x] === null) continue;
    sheet.getRange(v.officerFirst, 6 + x).setFormula(helpers[x]);
  }

  // The two that do not broadcast: one cell per officer, each keyed on its own row of the
  // name column. 0 when nothing matches, exactly what the broadcast form returned, so the
  // silence helper's N()=0 test and the self test's empty answer are unchanged.
  var firstDue = [];
  var lastTick = [];
  for (var k = 1; k <= rows; k++) {
    var me = 'INDEX(' + name + ',' + k + ')';
    firstDue.push(['=IF(' + me + '="","",MINIFS(IS9WD_DEL_DEADLINE,IS9WD_DEL_COMMITTEE,' + me +
      ',IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">0"))']);
    lastTick.push(['=IF(' + me + '="","",MAXIFS(IS9WD_DEL_STATUS_AT,IS9WD_DEL_COMMITTEE,' + me +
      ',IS9WD_DEL_STATUS_AT,">0"))']);
  }
  sheet.getRange(v.officerFirst, 7, rows, 1).setFormulas(firstDue);
  sheet.getRange(v.officerFirst, 8, rows, 1).setFormulas(lastTick);
}

// The `-1` substitution is what puts an unscored officer at the bottom of a descending
// sort: an empty string sorts as text, and text sorts before numbers descending, which
// would have put every unscored officer first. The dashboard shows it as blank, never as
// -1, and a muted rule makes the unscored tail read as not applicable rather than as last
// place.
function IS9WD_viewsRanked_(sheet, layout) {
  var v = layout;
  var rows = v.rankLast - v.rankFirst + 1;
  sheet.getRange(v.rankFirst, 1).setFormula(
    '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({IS9WD_STATS_OFF_NAME,' +
    'ARRAYFORMULA(IF(IS9WD_STATS_OFF_ONTIME="",-1,IS9WD_STATS_OFF_ONTIME)),' +
    'IS9WD_STATS_OFF_JUDGED},IS9WD_STATS_OFF_NAME<>""),2,FALSE),' + rows + ',3),' +
    IS9WD_statsErr_() + ')');
}

// Each trend week's Monday, and that week's own trimester start, looked up through the term
// calendar rather than through IS9WD_TERM_START, so a week inside a previous trimester
// numbers against its own trimester instead of against the current one.
function IS9WD_viewsTrend_(sheet, layout) {
  var v = layout;
  var rows = v.trendLast - v.trendFirst + 1;
  var monday = 'IS9WD_STATS_TRENDMONDAY';
  sheet.getRange(v.trendFirst, 1).setFormula(
    '=ARRAYFORMULA(IS9WD_WEEK_START-7*SEQUENCE(' + rows + ',1,' + rows + ',-1))');
  sheet.getRange(v.trendFirst, 2).setFormula(
    '=ARRAYFORMULA(IF(' + monday + '="","",SUMIFS(IS9WD_TERM_STARTS,IS9WD_TERM_STARTS,"<="&' +
    monday + ',IS9WD_TERM_ENDS,">="&' + monday + ')))');
}

// Label, value, reading, and the flag boolean in column D. One conditional format rule
// reads the boolean, which is one rule instead of eleven scoped rules, and each row still
// owns its own threshold in its own formula.
function IS9WD_viewsHealth_(sheet, layout) {
  var v = layout;
  var spec = IS9WD_statsHealthSpec_();
  var labels = [];
  var values = [];
  var readings = [];
  var flags = [];
  var formats = [];
  var aligns = [];
  var accents = [];
  for (var i = 0; i < IS9WD_STATS_HEALTH_ROWS.length; i++) {
    var key = IS9WD_STATS_HEALTH_ROWS[i][0];
    var entry = spec[key];
    if (!entry) {
      throw new Error('The operational health block has no formula for the key ' + key +
        '. IS9WD_Stats.js and IS9WD_Config.js disagree about that block.');
    }
    labels.push([IS9WD_STATS_HEALTH_ROWS[i][1]]);
    values.push([entry.value]);
    readings.push([entry.reading]);
    flags.push([entry.flag]);
    formats.push([entry.format || IS9WD_FMT.TEXT]);
    aligns.push([entry.align || IS9WD_ALIGN.LEFT]);
    if (entry.accent) accents.push(v.healthFirst + i);
  }
  var count = labels.length;
  sheet.getRange(v.healthFirst, 1, count, 1).setValues(labels);
  var value = sheet.getRange(v.healthFirst, 2, count, 1);
  value.setNumberFormats(formats);
  value.setHorizontalAlignments(aligns);
  value.setValues(values);
  sheet.getRange(v.healthFirst, 3, count, 1).setValues(readings);
  var band = sheet.getRange(v.healthFirst, 4, count, 1);
  band.setNumberFormat(IS9WD_FMT.TEXT);
  band.setValues(flags);
  for (var a = 0; a < accents.length; a++) {
    sheet.getRange(accents[a], 2).setFontColor(IS9WD_ROLE.ACCENT_FG).setFontWeight('bold');
  }
}

// Four spills out of the schedule's own named range, so this block cannot disagree with
// it. Whether the Monday job ran and whether it failed is actionable; how many messages it
// sent is not.
function IS9WD_viewsJobs_(sheet, layout) {
  var cols = [1, 8, 6, 9];
  for (var i = 0; i < cols.length; i++) {
    sheet.getRange(layout.jobFirst, i + 1).setFormula(
      '=ARRAYFORMULA(INDEX(IS9WD_SCHEDULE,0,' + cols[i] + '))');
  }
}

function IS9WD_viewsEndRow_(sheet, layout) {
  var scan = IS9WD_statsBox_(1, 1, layout.lastCol, layout.scanLastRow);
  sheet.getRange(layout.endRow, 1).setValue(IS9WD_VIEWS.END);
  sheet.getRange(layout.endRow, 2).setValue('End of tab');
  sheet.getRange(layout.errorsCell.row, layout.errorsCell.col)
    .setNumberFormat(IS9WD_FMT.INT)
    .setFormula('=SUMPRODUCT(--ISERROR(' + scan + '))+' +
      'SUMPRODUCT(--(' + scan + '=' + IS9WD_statsQ_(IS9WD_VIEWS.ERR) + '))');
}

function IS9WD_viewsRules_(sheet, layout) {
  var v = layout;
  var flag = { fg: IS9WD_ROLE.FLAG_FG, bg: IS9WD_ROLE.FLAG_BG, bold: true };
  var muted = { fg: IS9WD_ROLE.MUTED_FG };
  var rules = [];

  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(1, 1, v.endRow, v.lastCol)],
    '=A1=' + IS9WD_statsQ_(IS9WD_VIEWS.ERR), flag));

  var hRows = v.healthLast - v.healthFirst + 1;
  rules.push(IS9WD_ruleFormula_([sheet.getRange(v.healthFirst, 2, hRows, 2)],
    '=' + IS9WD_statsRef_(4, v.healthFirst) + '=TRUE', flag));

  var jRows = v.jobLast - v.jobFirst + 1;
  var jCols = IS9WD_STATS_HEADERS.JOBS.length;
  rules.push(IS9WD_ruleFormula_([sheet.getRange(v.jobFirst, 1, jRows, jCols)],
    '=AND(' + IS9WD_statsRef_(4, v.jobFirst) + '<>"",LOWER(' +
    IS9WD_statsRef_(4, v.jobFirst) + ')<>"ok")', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(v.jobFirst, 1, jRows, jCols)],
    '=' + IS9WD_statsRef_(3, v.jobFirst) + '=FALSE', muted));

  rules.push(IS9WD_ruleFormula_([sheet.getRange(v.errorsCell.row, v.errorsCell.col)],
    '=N(' + IS9WD_statsCell_(v.errorsCell.col, v.errorsCell.row) + ')>0', flag));
  return rules;
}

// ============================================================================
//  THE ENTRY POINT FOR 03 | STATISTICS
// ============================================================================

/**
 * Sizes, paints, writes and charts 03 | Statistics, or refuses and changes nothing. It
 * owns the whole tab for the length of the call: trim, wipe, remove every chart, re-point
 * the names, paint, write, insert three charts. Nothing on the tab is ever typed into, so
 * a full wipe is the cheapest guarantee that nothing accumulates.
 *
 * It must run AFTER IS9WD_viewsResize_, because every helper it reads is a named range on
 * `_Views`.
 */
function IS9WD_statsResize_(cfg) {
  var conf = cfg || IS9WD_readConfig_();
  var layout = conf.stats || IS9WD_stats_();
  var sheet = IS9WD_sheet_('STATS');

  IS9WD_ensureGrid_(sheet, layout.endRow, layout.lastCol);
  IS9WD_statsWipe_(sheet, layout);
  var removed = IS9WD_statsRemoveCharts_(sheet);

  // Names before formulas. A formula naming a range that does not exist yet reads
  // #NAME? until it does, and every block on this tab reads another by name.
  var names = IS9WD_statsPointNames_(sheet, layout);

  IS9WD_statsPaintAll_(sheet, layout);
  var report = IS9WD_statsWriteAll_(sheet, conf, layout);
  report.namesPointed = names;
  report.chartsRemoved = removed;
  report.charts = IS9WD_statsInsertCharts_(sheet, layout);
  // TRIMMED LAST, AFTER EVERYTHING ELSE HAS RUN, and this is the order the tab's dark green
  // tail taught. Trimming first leaves a window in which any later step that grows the grid
  // inherits the format of the last built row, and in Sheets an inserted row copies the row
  // above it. Trimming last means the grid ends where the content ends whatever happened in
  // between, and the clear before it means an unrunnable delete leaves blank rows rather than
  // painted ones.
  IS9WD_statsTrim_(sheet, layout);
  report.lastRow = layout.endRow;
  report.maxRows = sheet.getMaxRows();
  report.maxCols = sheet.getMaxColumns();
  return report;
}

function IS9WD_statsPointNames_(sheet, layout) {
  var want = IS9WD_statsNames_(layout);
  for (var i = 0; i < want.length; i++) {
    IS9WD_setNamed_(want[i].name, sheet.getRange(want[i].a1));
  }
  return want.length;
}

function IS9WD_statsWipe_(sheet, layout) {
  var rows = Math.min(Math.max(layout.endRow, sheet.getLastRow()), sheet.getMaxRows());
  var cols = Math.min(Math.max(layout.lastCol, sheet.getLastColumn()),
    sheet.getMaxColumns());
  var all = sheet.getRange(1, 1, rows, cols);
  all.clear();
  // A border is not cleared by clear(), so a card drawn by a previous layout would leave its
  // outline behind on a tab whose cards have moved.
  all.setBorder(false, false, false, false, false, false);
  all.clearDataValidations();
  all.clearNote();
}

// Rows and columns past the layout are deleted rather than left blank. The tab is inside
// the Drive connector read the Sunday run depends on, and an empty row still costs a row of
// markdown in it.
function IS9WD_statsTrim_(sheet, layout) {
  IS9WD_clearPastEnd_(sheet, layout.endRow, layout.lastCol);
  var extraRows = sheet.getMaxRows() - layout.endRow;
  if (extraRows > 0) sheet.deleteRows(layout.endRow + 1, extraRows);
  var extraCols = sheet.getMaxColumns() - layout.lastCol;
  if (extraCols > 0) sheet.deleteColumns(layout.lastCol + 1, extraCols);
}

// EVERY CHART GOES BEFORE ANY IS INSERTED, and this is the idempotency rule the charts
// bring with them. `insertChart` appends: it has no by-name form and no replace form, so a
// build run twice would leave six charts stacked on the same anchors, a build run three
// times nine, and nothing on screen would say so until the file was slow. Removing them
// all is safe because this tab is script owned end to end and nothing else ever puts a
// chart on it.
function IS9WD_statsRemoveCharts_(sheet) {
  var charts = sheet.getCharts();
  for (var i = 0; i < charts.length; i++) sheet.removeChart(charts[i]);
  return charts.length;
}

function IS9WD_statsWriteAll_(sheet, cfg, layout) {
  var f = layout;
  IS9WD_statsFormats_(sheet, f);
  IS9WD_statsTiles_(sheet, f);
  IS9WD_statsAttention_(sheet, f);
  IS9WD_statsGates_(sheet, f);
  IS9WD_statsOfficers_(sheet, f);
  IS9WD_statsRanked_(sheet, f);
  IS9WD_statsTrend_(sheet, f);
  IS9WD_statsCaptions_(sheet, f);
  IS9WD_statsEndRow_(sheet, f);
  IS9WD_setRules_(sheet, IS9WD_statsRules_(sheet, f));

  return {
    tab: IS9WD_TAB.STATS,
    directoryRows: f.directoryRows,
    trendWeeks: f.trendWeeks,
    tiles: IS9WD_STATS_TILES.length,
    lastRow: f.endRow,
    lastCol: IS9WD_colLetter_(f.lastCol),
    writtenAt: IS9WD_stampText_(new Date())
  };
}

// ---------------------------------------------------------------------------
//  the eight tiles
// ---------------------------------------------------------------------------

// Three cells per tile, in three rows: the number, the label under it, and one short line
// under that. Keyed on the machine key, so a tile always lands where its key says.
function IS9WD_statsTiles_(sheet, layout) {
  var spec = IS9WD_statsTileSpec_();
  for (var i = 0; i < IS9WD_STATS_TILES.length; i++) {
    var key = IS9WD_STATS_TILES[i][0];
    var label = IS9WD_STATS_TILES[i][1];
    var entry = spec[key];
    var at = IS9WD_statsTileAt_(layout, key);
    if (!entry) {
      throw new Error('There is no formula for the tile ' + key +
        '. IS9WD_Stats.js and IS9WD_Config.js disagree about the tiles.');
    }
    if (!at) {
      throw new Error('The tile ' + key + ' is not in either tile row. ' +
        'IS9WD_STATS_TILES and IS9WD_STATS_TILE_ROW_A or _B disagree.');
    }
    var value = sheet.getRange(at.valueRow, at.col);
    value.setNumberFormat(entry.format || IS9WD_FMT.TEXT);
    value.setHorizontalAlignment(entry.align || IS9WD_ALIGN.LEFT);
    value.setFormula(entry.value);
    sheet.getRange(at.labelRow, at.col).setValue(label);
    sheet.getRange(at.noteRow, at.col).setFormula(entry.note);
  }
}

// ---------------------------------------------------------------------------
//  what needs attention
// ---------------------------------------------------------------------------

function IS9WD_statsAttention_(sheet, layout) {
  var spec = IS9WD_statsAttentionSpec_();
  var labels = [];
  var values = [];
  var readings = [];
  var formats = [];
  var accents = [];
  for (var i = 0; i < IS9WD_STATS_ATTENTION_ROWS.length; i++) {
    var key = IS9WD_STATS_ATTENTION_ROWS[i][0];
    var entry = spec[key];
    if (!entry) {
      throw new Error('The attention block has no formula for the key ' + key +
        '. IS9WD_Stats.js and IS9WD_Config.js disagree about that block.');
    }
    labels.push([IS9WD_STATS_ATTENTION_ROWS[i][1]]);
    values.push([entry.value]);
    readings.push([entry.reading]);
    formats.push([entry.format || IS9WD_FMT.TEXT]);
    if (entry.accent) accents.push(layout.attentionFirst + i);
  }
  var count = labels.length;
  var at = layout.attentionCol;
  sheet.getRange(layout.attentionFirst, at, count, 1).setValues(labels);
  var value = sheet.getRange(layout.attentionFirst, at + 1, count, 1);
  value.setNumberFormats(formats);
  value.setValues(values);
  sheet.getRange(layout.attentionFirst, at + 2, count, 1).setValues(readings);
  // A number worth the eye that is not a fault takes the accent, which is the treatment
  // the feed already gives the same number.
  for (var a = 0; a < accents.length; a++) {
    sheet.getRange(accents[a], at + 1)
      .setFontColor(IS9WD_ROLE.ACCENT_FG).setFontWeight('bold');
  }
}

// ---------------------------------------------------------------------------
//  readiness gates
// ---------------------------------------------------------------------------

function IS9WD_statsGates_(sheet, layout) {
  var spec = IS9WD_statsGateSpec_();
  var labels = [];
  var states = [];
  var todos = [];
  for (var i = 0; i < IS9WD_STATS_GATE_ROWS.length; i++) {
    var key = IS9WD_STATS_GATE_ROWS[i][0];
    var entry = spec[key];
    if (!entry) {
      throw new Error('The gates block has no state formula for the key ' + key +
        '. IS9WD_Stats.js and IS9WD_Config.js disagree about that block.');
    }
    labels.push([IS9WD_STATS_GATE_ROWS[i][1]]);
    states.push([entry.state]);
    todos.push([entry.todo]);
  }
  var rows = labels.length;
  var at = layout.gateCol;
  sheet.getRange(layout.gateFirst, at, rows, 1).setValues(labels);
  sheet.getRange(layout.gateFirst, at + 1, rows, 1).setValues(states);
  sheet.getRange(layout.gateFirst, at + 2, rows, 1).setValues(todos);
}

// ---------------------------------------------------------------------------
//  BY OFFICER, fourteen rows in hierarchy order
// ---------------------------------------------------------------------------

// Twelve visible columns and not one hidden one: every helper this block reads is a named
// range on `_Views`. Column A is a pointer at the identity sort rather than a second
// lookup, so display formatting never fights the sort.
function IS9WD_statsOfficers_(sheet, layout) {
  var f = layout;
  var name = 'IS9WD_STATS_OFF_NAME';
  var blank = 'IF(' + name + '="","",';
  var today = 'IS9WD_EFFECTIVE_TODAY';

  var visible = [
    // A, the officer, read straight off the sort on _Views.
    '=ARRAYFORMULA(IF(IS9WD_STATS_OFF_SORTNAME="","",IS9WD_STATS_OFF_SORTNAME))',
    // B, Attention. One broadcast precedence string, first match wins, OK at the bottom:
    // the officer row equivalent of the workbook's own Check idiom. AND does not
    // broadcast, so the last condition multiplies instead.
    '=ARRAYFORMULA(' + blank +
      'IF(N(IS9WD_STATS_OFF_LOAD)=0,"Nothing entered for this week",' +
      'IF(N(IS9WD_STATS_OFF_OVERDUE)>0,"Overdue: "&IS9WD_STATS_OFF_OVERDUE&' +
        'IF(N(IS9WD_STATS_OFF_LATE)>=IS9WD_STATS_LATE_DAYS,", worst by "&' +
        'IS9WD_STATS_OFF_LATE&" days",""),' +
      'IF(N(IS9WD_STATS_OFF_BLOCKING)>0,"Blocked: "&IS9WD_STATS_OFF_BLOCKING&" flagged",' +
      'IF(N(IS9WD_STATS_OFF_SILENT_N)>=IS9WD_STATS_SILENT_DAYS,' +
        'IF(N(IS9WD_STATS_OFF_LASTTICK)=0,"Never ticked","Silent "&' +
        'IS9WD_STATS_OFF_SILENT_N&" days"),' +
      'IF((IS9WD_STATS_ELAPSED>0)*(N(IS9WD_STATS_OFF_RATE)<' +
        'IS9WD_STATS_ELAPSED/7-IS9WD_STATS_PACE_SLACK),"Behind pace",' +
      'IF(N(IS9WD_STATS_OFF_NOTPUB)>0,"No slide for "&IS9WD_STATS_OFF_NOTPUB,"OK"))))))))',
    // C, Due this week.
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',' +
      'IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">="&IS9WD_WEEK_START,' +
      'IS9WD_DEL_DEADLINE,"<="&IS9WD_WEEK_END)))',
    // D, Done this week.
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',' +
      'IS9WD_DEL_ACTIVE,FALSE,IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">="&IS9WD_WEEK_START,' +
      'IS9WD_DEL_DEADLINE,"<="&IS9WD_WEEK_END)))',
    // E, Rate. IFERROR because IF evaluates both branches elementwise, so the guarded
    // division still has to survive a load of zero.
    '=ARRAYFORMULA(' + blank + 'IF(N(IS9WD_STATS_OFF_LOAD)=0,"",' +
      'IFERROR(IS9WD_STATS_OFF_DONE/IS9WD_STATS_OFF_LOAD,""))))',
    // F, Overdue. Reads the Check column, never a second definition of overdue.
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',' +
      'IS9WD_DEL_CHECK,' + IS9WD_statsQ_(IS9WD_statsOverdueFlag_()) + ')))',
    // G, Worst late. Days, not a date, and 0 rather than a negative number when the
    // earliest active deadline is still ahead.
    '=ARRAYFORMULA(' + blank + 'IF(N(IS9WD_STATS_OFF_FIRSTDUE)=0,"",' +
      'IF(' + today + '-IS9WD_STATS_OFF_FIRSTDUE>0,' + today +
      '-IS9WD_STATS_OFF_FIRSTDUE,0))))',
    // H, Silent. `never` rather than a number, because an officer who has never ticked
    // anything is a different statement from one who ticked something long ago.
    '=ARRAYFORMULA(' + blank + 'IF(N(IS9WD_STATS_OFF_LASTTICK)=0,"never",' +
      today + '-INT(IS9WD_STATS_OFF_LASTTICK))))',
    // I, On time. The fair comparator, and the one metric here that is not a plain
    // broadcast, because COUNTIFS cannot express a row-wise comparison between two
    // ranges. MMULT does it in one formula instead of fourteen SUMPRODUCTs. The INT
    // wrappers are the rule 5.3 states for every deadline comparison in this workbook,
    // because validation accepts a datetime and a paste bypasses validation.
    '=ARRAYFORMULA(' + blank +
      'IF(N(IS9WD_STATS_OFF_JUDGED)<IS9WD_STATS_MIN_JUDGED,"",IFERROR(MMULT(' +
      'TRANSPOSE(--(IS9WD_DEL_COMMITTEE=TRANSPOSE(' + name + '))),' +
      '(IS9WD_DEL_TITLE<>"")*(IS9WD_DEL_ACTIVE=FALSE)' +
      '*(INT(N(IS9WD_DEL_DEADLINE))>0)' +
      '*(INT(N(IS9WD_DEL_DEADLINE))<' + today + ')' +
      '*(N(IS9WD_DEL_STATUS_AT)>0)' +
      '*(N(IS9WD_DEL_STATUS_AT)<INT(N(IS9WD_DEL_DEADLINE))+1)' +
      ')/IS9WD_STATS_OFF_JUDGED,""))))',
    // J, Judged. The honesty column, and what makes the ranking fair: a rate is
    // suppressed entirely below the minimum rather than printed off one task.
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">0",IS9WD_DEL_DEADLINE,"<"&' + today + ')))',
    // K, Avg days from creation to the last status change. One broadcast formula on the
    // identity that a sum of differences equals a difference of sums when the filter is
    // identical, which is what lets SUMIFS stand in for an AVERAGEIFS over a computed
    // range. A behaviour signal rather than a performance measure: an average near 0 means
    // the officer ticks the moment Ethan enters the task, which is a data quality smell
    // worth seeing. This is the first column to cut if recalculation bites.
    '=ARRAYFORMULA(' + blank + 'IFERROR((' +
      'SUMIFS(IS9WD_DEL_STATUS_AT,IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,FALSE,' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_CREATED_AT,">0",IS9WD_DEL_STATUS_AT,">0")' +
      '-SUMIFS(IS9WD_DEL_CREATED_AT,IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,FALSE,' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_CREATED_AT,">0",IS9WD_DEL_STATUS_AT,">0"))' +
      '/COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,FALSE,' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_CREATED_AT,">0",IS9WD_DEL_STATUS_AT,">0"),"")))',
    // L, No slide. Read from the feed by carousel ordinal and never recomputed. All
    // fourteen officers publish since 2026-09-28, so the blank branch fires for nobody
    // today. It stays because unticking a row on 01 | Configuration is a supported edit,
    // and without it that officer's column would read an ordinal that is not there.
    '=ARRAYFORMULA(' + blank + 'IF(IS9WD_STATS_OFF_CAROUSEL="","",' +
      'IFERROR(SUMIF(IS9WD_OFFICER_ORDINAL,IS9WD_STATS_OFF_CAROUSEL,IS9WD_NOTPUB),' +
      IS9WD_statsErr_() + '))))'
  ];

  for (var v = 0; v < visible.length; v++) {
    sheet.getRange(f.officerFirst, f.officerCol + v).setFormula(visible[v]);
  }
}

// ---------------------------------------------------------------------------
//  TRACK RECORD, RANKED
// ---------------------------------------------------------------------------

// Five pointers at the sort on `_Views`. Deliberately a separate block from the officer
// table, because that table stays in hierarchy order and a rank number buried in hierarchy
// order is not a ranking anyone can read.
function IS9WD_statsRanked_(sheet, layout) {
  var f = layout;
  var key = 'IS9WD_STATS_RANK_KEY';
  var score = 'IS9WD_STATS_RANK_SCORE';
  var judged = 'IS9WD_STATS_RANK_JUDGED';

  var body = [
    '=ARRAYFORMULA(IF(' + key + '="","",IF(' + score + '<0,"",' +
      'COUNTIFS(' + score + ',">"&' + score + ')+1)))',
    '=ARRAYFORMULA(IF(' + key + '="","",' + key + '))',
    '=ARRAYFORMULA(IF(' + key + '="","",IF(' + score + '<0,"",' + score + ')))',
    '=ARRAYFORMULA(IF(' + key + '="","",' + judged + '))',
    '=ARRAYFORMULA(IF(' + key + '="","",IF(' + score + '<0,"Fewer than "&' +
      'IS9WD_STATS_MIN_JUDGED&" of this officer\'s tasks have passed their deadline","")))'
  ];
  for (var i = 0; i < body.length; i++) {
    sheet.getRange(f.rankFirst, f.rankCol + i).setFormula(body[i]);
  }
}

// ---------------------------------------------------------------------------
//  TREND, and its honest limits
// ---------------------------------------------------------------------------

// What the Archive can and cannot support, because the block is designed around it. The
// snapshot path archives the feed's VISIBLE rows and the feed excludes terminal items, so a
// snapshot row's status is always active: snapshot rows structurally cannot say what was
// accomplished. Only the retire path records an accomplishment, once per ID, with a real
// deadline and a real status time. So weekly load is reliable, weekly accomplishment covers
// retired tasks only, and overdue at week end cannot be reconstructed at all and is not
// offered.
//
// Rows are oldest first, so the chart under the block reads left to right in time.
function IS9WD_statsTrend_(sheet, layout) {
  var f = layout;
  var rows = f.trendLast - f.trendFirst + 1;
  var monday = 'IS9WD_STATS_TRENDMONDAY';
  var blank = 'IF(' + monday + '="","",';
  var snapshot = IS9WD_statsQ_(IS9WD_ARCHIVE.SOURCE_SNAPSHOT);
  var retired = IS9WD_statsQ_(IS9WD_ARCHIVE.SOURCE_RETIRED);

  var body = [
    '=ARRAYFORMULA(' + blank + 'IF(N(IS9WD_STATS_TRENDTERM)=0,"--",' +
      'TEXT(INT((' + monday + '-IS9WD_STATS_TRENDTERM)/7)+1,"00"))))',
    '=ARRAYFORMULA(' + blank + monday + '))',
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_ARC_WEEKSTART,' + monday + ',' +
      'IS9WD_ARC_SOURCE,' + snapshot + ')))',
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_ARC_SOURCE,' + retired + ',' +
      'IS9WD_ARC_DEADLINE,">="&' + monday + ',IS9WD_ARC_DEADLINE,"<="&' + monday + '+6)))',
    '',
    '=ARRAYFORMULA(' + blank + 'IF(N(IS9WD_STATS_TRENDPUBLISHED)=0,"Not archived",' +
      'IF(N(IS9WD_STATS_TRENDDONE)=0,"Snapshot only","Archived"))))'
  ];
  for (var i = 0; i < body.length; i++) {
    if (body[i] === '') continue;
    sheet.getRange(f.trendFirst, f.trendCol + i).setFormula(body[i]);
  }

  // Column E is the one per-row block on this tab. SUMPRODUCT compares two ranges row by
  // row, which no broadcast criterion can express, and the comparison is against the end
  // of the deadline day for the reason 5.3 gives.
  var onTime = [];
  for (var r = 0; r < rows; r++) {
    var row = f.trendFirst + r;
    var start = IS9WD_statsRef_(f.trendCol + 1, row);
    var done = IS9WD_statsRef_(f.trendCol + 3, row);
    onTime.push(['=IF(' + start + '="","",IFERROR(SUMPRODUCT(' +
      '(IS9WD_ARC_SOURCE=' + retired + ')' +
      '*(INT(N(IS9WD_ARC_DEADLINE))>=' + start + ')' +
      '*(INT(N(IS9WD_ARC_DEADLINE))<=' + start + '+6)' +
      '*(N(IS9WD_ARC_STATUS_AT)>0)' +
      '*(N(IS9WD_ARC_STATUS_AT)<INT(N(IS9WD_ARC_DEADLINE))+1))/' + done + ',""))']);
  }
  sheet.getRange(f.trendFirst, f.trendCol + 4, rows, 1).setValues(onTime);
}

// ---------------------------------------------------------------------------
//  the three chart captions
// ---------------------------------------------------------------------------

// A CHART WITH NO DATA YET IS STILL A CHART, and this is the row that makes that honest.
// Each caption is a formula that says, in plain words, either what the chart is showing or
// what will fill it. That is the whole answer to "never as a broken object": the chart is
// always inserted and always renders, and the sentence above it carries the explanation an
// empty plot cannot.
function IS9WD_statsCaptions_(sheet, layout) {
  var due = 'SUM(IS9WD_STATS_OFF_DUE)';
  var done = 'SUM(IS9WD_STATS_OFF_DONE)';
  var officers = 'COUNTIF(IS9WD_STATS_OFF_NAME,"?*")';
  var recorded = 'IS9WD_STATS_TRENDRECORDED';
  var captions = [
    '=IF(' + due + '+' + done + '=0,' +
      '"Nothing is entered for this week yet, so the chart below is empty. It fills the ' +
      'moment you enter deliverables on ' + IS9WD_TAB.ITEMS + '.",' +
      '"' + 'Showing "&' + due + '&" still to do and "&' + done + '&" done across "&' +
      officers + '&" officers.")',
    '=IF(COUNT(IS9WD_STATS_OFF_ONTIME)=0,' +
      '"No officer has enough tasks past a deadline to be scored yet, so the chart below ' +
      'is empty. It fills as tasks pass their deadlines and are ticked off.",' +
      '"Showing "&COUNT(IS9WD_STATS_OFF_ONTIME)&" of "&' + officers +
      '&" officers. A blank bar means too few tasks to judge, not a score of zero.")',
    '=IF(COUNTIF(' + recorded + ',"Not archived")=ROWS(' + recorded + '),' +
      '"No week has been archived yet, so the chart below is empty. Switch ARCHIVE_WEEK ' +
      'on, or run Archive this week from the IS9 Deliverables menu.",' +
      '"Showing "&(ROWS(' + recorded + ')-COUNTIF(' + recorded + ',"Not archived"))&" of "&' +
      'ROWS(' + recorded + ')&" weeks. Accomplished counts only tasks that have been ' +
      'retired, so it reads low until retirement runs.")'
  ];
  for (var i = 0; i < layout.charts.length && i < captions.length; i++) {
    sheet.getRange(layout.charts[i].captionRow, layout.charts[i].firstCol)
      .setFormula(captions[i]);
  }
}

// ---------------------------------------------------------------------------
//  the end row
// ---------------------------------------------------------------------------

// The end marker, this tab's own error count, and the one check that can tell a stale copy
// of the gate list from a correct one.
//
// The agreement reads the FEED's verdict rather than the tile beside it, which is the whole
// point: the tile is a rendering of that verdict, so comparing the gates against the tile
// would compare a copy with a copy. Both numbers fail the SELF TEST and appear in the
// Sunday brief, and they do nothing else.
function IS9WD_statsEndRow_(sheet, layout) {
  var f = layout;
  var scan = IS9WD_statsBox_(1, 1, f.lastCol, f.scanLastRow);
  sheet.getRange(f.endRow, 1).setValue(IS9WD_STATS.END);
  sheet.getRange(f.endRow, 2).setValue('End of tab');
  sheet.getRange(f.errorsCell.row, f.errorsCell.col)
    .setNumberFormat(IS9WD_FMT.INT)
    .setFormula('=SUMPRODUCT(--ISERROR(' + scan + '))+' +
      'SUMPRODUCT(--(' + scan + '=' + IS9WD_statsErr_() + '))');
  sheet.getRange(f.agreeCell.row, f.agreeCell.col).setFormula(
    '=IF((COUNTIF(IS9WD_STATS_GATE_STATE,"HOLD")>0)=' +
    '(RIGHT(IFERROR(IS9WD_FEED_READY,""),2)="NO"),' +
    '"OK","Gates disagree with Ready for Canva")');
}

// ============================================================================
//  THE THREE CHARTS
// ============================================================================

// Built with the Apps Script chart builder and anchored on the tab, over a reserved band of
// blank rows. A chart is an overlay rather than a range, so the rows underneath it are
// deliberately empty: anything written there would be hidden by the chart and invisible to
// a reader while still being counted by the error scan.
//
// Every option here is either a palette colour or Poppins, because a chart is part of the
// workbook rather than a guest in it. The series colours are #085040 and #8a64a9, the
// gridlines #e9ebd4, the text #58756a and the background #F8FBFD. No green, no red, and
// nothing outside the palette (2.5).
// NO TITLE INSIDE THE CHART. The card's own band row above it already prints the same
// words in #5d4170 at BAND size, so setting a chart title drew the heading twice and cost
// 28 px of plot area to do it. chartArea is deliberately absent here as well: the three
// charts need three different left margins, because one has fourteen slanted names under
// it, one has fourteen names beside it and one has none, and a single shared chartArea
// gave the slanted names 56 px to live in.
function IS9WD_statsChartOptions_(builder, width) {
  return builder
    .setOption('title', '')
    .setOption('backgroundColor', IS9WD_ROLE.BODY_BG)
    .setOption('fontName', IS9WD_FONT)
    .setOption('fontSize', 10)
    .setOption('colors', [IS9WD_CLR.GREEN_DEEP, IS9WD_CLR.PURPLE_BRIGHT])
    .setOption('legend', {
      position: 'top', alignment: 'start',
      textStyle: { color: IS9WD_ROLE.HINT_FG, fontName: IS9WD_FONT, fontSize: 10 }
    })
    .setOption('width', width)
    .setOption('height', IS9WD_STATS_CHART_HEIGHT);
}

// A chart's width is its own card's width in pixels, so the three line up inside their own
// borders instead of each sitting a different distance from its right edge.
function IS9WD_statsChartWidth_(chart) {
  var widths = IS9WD_WIDTH[IS9WD_TAB_KEY_STATS_];
  if (!widths || !chart) return IS9WD_STATS_CHART_WIDTH;
  var total = 0;
  for (var c = chart.firstCol; c <= chart.lastCol; c++) {
    var w = IS9WD_posInt_(widths[c - 1]);
    if (!w) return IS9WD_STATS_CHART_WIDTH;
    total += w;
  }
  var out = total - IS9WD_STATS_CHART_INSET * 2;
  return out > 200 ? out : IS9WD_STATS_CHART_WIDTH;
}

var IS9WD_TAB_KEY_STATS_ = 'STATS';

// `kind` in IS9WD_STATS_CHARTS was a declaration nothing read: the painter named its own
// chart type three times, so editing `kind` changed nothing and the field implied a
// contract it did not have. Reading it here closes that, and an unknown kind throws on the
// undefined enum rather than building a chart of some other shape.
function IS9WD_statsChartType_(index) {
  var kind = IS9WD_trim_(IS9WD_STATS_CHARTS[index] && IS9WD_STATS_CHARTS[index].kind);
  var type = kind === '' ? null : Charts.ChartType[kind];
  if (!type) {
    throw new Error('IS9WD: chart ' + index + ' declares the chart type "' + kind +
      '", which the chart builder does not have.');
  }
  return type;
}

// GOOGLE'S OWN AXIS DEFAULTS ARE OFF PALETTE, and they are #CCCCCC gridlines on a
// #333333 baseline, which is black on a workbook whose palette holds no black. Both axes
// of every chart take these, not just the value axis: setting one axis and leaving the
// other is how the leak survived. `minorGridlines: { count: 0 }` is here because a minor
// gridline is a second, fainter grid nobody asked for and it renders in Google's grey too.
//
// The gridline colour is cream, and that is the one place in the workbook where #e9ebd4
// appears on something that is not a cell Ethan types into. A chart gridline is chrome
// drawn inside an overlay rather than a cell fill, so the cream rule is not engaged, and
// cream is the only palette member faint enough to sit behind data. Recorded here rather
// than assumed: if Ethan rules that the cream rule covers anything rendered at all, this
// becomes IS9WD_CLR.PURPLE_SOFT and the charts get slightly heavier grid.
function IS9WD_statsAxisStyle_() {
  return {
    textStyle: { color: IS9WD_ROLE.HINT_FG, fontName: IS9WD_FONT, fontSize: 10 },
    titleTextStyle: { color: IS9WD_ROLE.HINT_FG, fontName: IS9WD_FONT, fontSize: 10 },
    gridlines: { color: IS9WD_CLR.CREAM },
    minorGridlines: { count: 0 },
    baselineColor: IS9WD_ROLE.HINT_FG
  };
}

// A count axis holds whole tasks. Left alone, Google fits five gridlines to the data range,
// so a week whose highest Due is 3 gets an axis labelled 0, 0.5, 1, 1.5, 2, 2.5, 3 beside
// cells formatted as integers. Half a task is not a thing this workbook can hold.
function IS9WD_statsCountAxis_(axis) {
  return {
    textStyle: axis.textStyle, gridlines: { color: IS9WD_CLR.CREAM, count: -1 },
    minorGridlines: { count: 0 }, baselineColor: axis.baselineColor,
    format: '0', viewWindow: { min: 0 }
  };
}

// Inserts exactly three, in the order IS9WD_STATS_CHARTS declares them, each one anchored
// at the first row of its own reserved band. Every range includes its own header row and
// setNumHeaders(1) reads the series names out of it, so a legend says `Due` and `Done`
// rather than `Series 1` and `Series 2`.
function IS9WD_statsInsertCharts_(sheet, layout) {
  var f = layout;
  var axis = IS9WD_statsAxisStyle_();
  var built = 0;

  // A MISSING CHART BAND THROWS. The old fallbacks put the chart at f.endRow in column A,
  // which is the tab's own footer: the end marker, the error count and the gate agreement
  // cell the Sunday brief reads, all three hidden under an overlay and still counted by
  // the error scan. A layout that declares no band for a chart the painter builds is a
  // layout fault, and it should say so rather than quietly cover the footer.
  var band = function (index) {
    if (!f.charts || !f.charts[index]) {
      throw new Error('IS9WD: the layout declares no chart band ' + index +
        ', so ' + IS9WD_TAB.STATS + ' cannot be built. Run Checks > Rebuild the views.');
    }
    return f.charts[index];
  };

  // 1. Due against done per committee, this week. A column chart, because the comparison is
  // between two bars for one officer and a reader has to see the pair.
  var officerRows = f.officerLast - f.officerHeader + 1;
  var one = sheet.newChart()
    .setChartType(IS9WD_statsChartType_(0))
    .addRange(sheet.getRange(f.officerHeader, f.officerCol, officerRows, 1))
    .addRange(sheet.getRange(f.officerHeader, f.officerCol + 2, officerRows, 1))
    .addRange(sheet.getRange(f.officerHeader, f.officerCol + 3, officerRows, 1))
    .setNumHeaders(1)
    .setPosition(band(0).firstRow, band(0).firstCol, IS9WD_STATS_CHART_INSET, 8);
  IS9WD_statsChartOptions_(one, IS9WD_statsChartWidth_(band(0)));
  // Fourteen names slanted at 40 degrees need room under the plot, not beside it.
  one.setOption('chartArea', { left: 56, top: 28, width: '88%', height: '50%' });
  one.setOption('hAxis', {
    textStyle: axis.textStyle, slantedText: true, slantedTextAngle: 40
  });
  one.setOption('vAxis', IS9WD_statsCountAxis_(axis));
  // The single most visible part of what Ethan called premium: bars with weight rather
  // than hairlines with gaps.
  one.setOption('bar', { groupWidth: '72%' });
  sheet.insertChart(one.build());
  built++;

  // 2. The fairness adjusted track record. A bar chart, because fourteen officer names read
  // straight along the vertical axis and do not need slanting.
  var rankRows = f.rankLast - f.rankHeader + 1;
  var two = sheet.newChart()
    .setChartType(IS9WD_statsChartType_(1))
    .addRange(sheet.getRange(f.rankHeader, f.rankCol + 1, rankRows, 1))
    .addRange(sheet.getRange(f.rankHeader, f.rankCol + 2, rankRows, 1))
    .setNumHeaders(1)
    .setPosition(band(1).firstRow, band(1).firstCol, IS9WD_STATS_CHART_INSET, 8);
  IS9WD_statsChartOptions_(two, IS9WD_statsChartWidth_(band(1)));
  two.setOption('colors', [IS9WD_CLR.PURPLE_DEEP]);
  two.setOption('legend', { position: 'none' });
  // Fourteen names read straight down the left, so the plot starts well in, and with no
  // legend there is nothing above it to leave room for.
  two.setOption('chartArea', { left: 240, top: 8, width: '62%', height: '84%' });
  // On a bar chart the axes swap, so the value axis is the horizontal one and the
  // percentage format belongs there.
  two.setOption('hAxis', {
    textStyle: axis.textStyle, format: '#%',
    viewWindow: { min: 0, max: 1 },
    gridlines: { color: IS9WD_CLR.CREAM, count: -1 }, minorGridlines: { count: 0 },
    baselineColor: axis.baselineColor
  });
  // The data arrives as a descending sort, and which end of the axis row one lands on is
  // an undocumented Google default. A chart whose band says RANKED must put rank one at
  // the top, so the direction is stated rather than inherited.
  two.setOption('vAxis', {
    textStyle: axis.textStyle, direction: -1,
    gridlines: { color: IS9WD_CLR.CREAM }, minorGridlines: { count: 0 },
    baselineColor: axis.baselineColor
  });
  two.setOption('bar', { groupWidth: '72%' });
  sheet.insertChart(two.build());
  built++;

  // 3. Week by week. A line chart, because the point is the shape over time.
  var trendRows = f.trendLast - f.trendHeader + 1;
  var three = sheet.newChart()
    .setChartType(IS9WD_statsChartType_(2))
    .addRange(sheet.getRange(f.trendHeader, f.trendCol + 1, trendRows, 1))
    .addRange(sheet.getRange(f.trendHeader, f.trendCol + 2, trendRows, 1))
    .addRange(sheet.getRange(f.trendHeader, f.trendCol + 3, trendRows, 1))
    .setNumHeaders(1)
    .setPosition(band(2).firstRow, band(2).firstCol, IS9WD_STATS_CHART_INSET, 8);
  IS9WD_statsChartOptions_(three, IS9WD_statsChartWidth_(band(2)));
  three.setOption('chartArea', { left: 56, top: 28, width: '88%', height: '62%' });
  three.setOption('curveType', 'none');
  // #085040 and #8a64a9 differ mostly in hue, so the two lines carry a shape as well as a
  // colour and stay separable in greyscale and to a colour blind reader.
  three.setOption('lineWidth', 3);
  three.setOption('pointSize', 6);
  three.setOption('series', {
    0: { pointShape: 'circle' },
    1: { pointShape: 'square' }
  });
  three.setOption('hAxis', {
    textStyle: axis.textStyle, format: 'MMM d',
    gridlines: { color: IS9WD_CLR.CREAM }, minorGridlines: { count: 0 },
    baselineColor: axis.baselineColor
  });
  three.setOption('vAxis', IS9WD_statsCountAxis_(axis));
  sheet.insertChart(three.build());
  built++;

  return built;
}

// ============================================================================
//  PAINTERS FOR 03 | STATISTICS
// ============================================================================

// Every block's number format, set before one value is written. It looks like styling and
// is not: a week number written as `04` into a General cell becomes the number 4, and a
// date written into a General cell becomes a serial nobody can read.
function IS9WD_statsFormats_(sheet, layout) {
  var f = layout;
  var cols = IS9WD_statsCols_();
  var tables = [
    [f.attentionFirst, f.attentionLast, cols.ATTENTION, f.attentionCol],
    [f.gateFirst, f.gateLast, cols.GATES, f.gateCol],
    [f.officerFirst, f.officerLast, cols.OFFICER, f.officerCol],
    [f.rankFirst, f.rankLast, cols.RANKED, f.rankCol],
    [f.trendFirst, f.trendLast, cols.TREND, f.trendCol]
  ];
  for (var t = 0; t < tables.length; t++) {
    var first = tables[t][0];
    var rows = tables[t][1] - first + 1;
    var spec = tables[t][2];
    var at = tables[t][3];
    if (rows < 1) continue;
    for (var i = 0; i < spec.length; i++) {
      sheet.getRange(first, at + i, rows, 1)
        .setNumberFormat(spec[i].format || IS9WD_FMT.TEXT);
    }
  }
  // The tile label and note rows, and every caption row, are text: a caption that starts
  // with a number must not be read as one. Each one is scoped to its own card.
  for (var g = 0; g < f.tileGroups.length; g++) {
    sheet.getRange(f.tileGroups[g].labelRow, f.tileCol, 1, f.cellCols)
      .setNumberFormat(IS9WD_FMT.TEXT);
    sheet.getRange(f.tileGroups[g].noteRow, f.tileCol, 1, f.cellCols)
      .setNumberFormat(IS9WD_FMT.TEXT);
  }
  for (var c = 0; c < f.charts.length; c++) {
    sheet.getRange(f.charts[c].captionRow, f.charts[c].firstCol, 1, f.cellCols)
      .setNumberFormat(IS9WD_FMT.TEXT);
  }
  sheet.getRange(f.endRow, 1, 1, f.lastCol).setNumberFormat(IS9WD_FMT.TEXT);
  sheet.getRange(f.errorsCell.row, f.errorsCell.col).setNumberFormat(IS9WD_FMT.INT);
}

// THREE CARDS ACROSS, ONE EMPTY COLUMN BETWEEN THEM, ONE EMPTY ROW BETWEEN THE ROWS OF
// THREE. Every card gets its background and its border first, from the layout's own card
// list, so the band, the header row and the body paint over a card that is already outlined.
// Then every separator column and every separator row is cleared of fill and border, which
// is what makes the cards read as cards rather than as one wide sheet of paint.
function IS9WD_statsPaintAll_(sheet, layout) {
  var f = layout;
  var cols = IS9WD_statsCols_();
  var help = IS9WD_statsBandHelp_();

  sheet.getRange(1, 1, f.endRow, f.lastCol).setFontFamily(IS9WD_FONT);
  // THE TAB'S OWN CHROME RUNS THE TAB'S OWN WIDTH. It ran to the first card's last column,
  // which is 12 on a tab that is over 3,000 px wide, so the frozen header was a green bar
  // that stopped after a third of the width and the end band left 26 columns unpainted. A
  // reader scrolled to the second or third column of cards saw no banner at all.
  var headLast = f.lastCol;
  IS9WD_paintBanner_(sheet, f.bannerRow, f.firstCol, headLast, IS9WD_STATS.BANNER);
  IS9WD_paintHelp_(sheet, f.helpRow, f.firstCol, headLast, IS9WD_STATS.HELP);

  for (var k = 0; k < f.cards.length; k++) {
    var card = f.cards[k];
    IS9WD_paintCard_(sheet, card.firstRow, card.lastRow, card.firstCol, card.lastCol);
  }

  // The tiles: one band, one hint row, then two groups of three rows, all inside card one.
  IS9WD_paintCardBand_(sheet, f.tileBand, f.tileCol, f.tileCol + f.cellCols - 1,
    'THIS WEEK AT A GLANCE');
  IS9WD_paintHint_(sheet, f.tileHint, f.tileCol, f.tileCol + f.cellCols - 1, help.tile);
  IS9WD_statsPaintTiles_(sheet, f);

  IS9WD_statsBlock_(sheet, f, f.attentionBand, 'WHAT NEEDS ATTENTION', help.attention,
    IS9WD_STATS_HEADERS.ATTENTION, f.attentionFirst, f.attentionLast, cols.ATTENTION,
    f.attentionCol);
  IS9WD_statsBlock_(sheet, f, f.gateBand, 'READINESS GATES', help.gate,
    IS9WD_STATS_HEADERS.GATES, f.gateFirst, f.gateLast, cols.GATES, f.gateCol);
  IS9WD_statsBlock_(sheet, f, f.officerBand, 'BY OFFICER', help.officer,
    IS9WD_STATS_HEADERS.OFFICER, f.officerFirst, f.officerLast, cols.OFFICER, f.officerCol);
  IS9WD_statsBlock_(sheet, f, f.rankBand, 'TRACK RECORD, RANKED', help.rank,
    IS9WD_STATS_HEADERS.RANKED, f.rankFirst, f.rankLast, cols.RANKED, f.rankCol);
  IS9WD_statsBlock_(sheet, f, f.trendBand,
    'TREND, LAST ' + f.trendWeeks + ' WEEKS', help.trend,
    IS9WD_STATS_HEADERS.TREND, f.trendFirst, f.trendLast, cols.TREND, f.trendCol);

  IS9WD_statsPaintCharts_(sheet, f);
  IS9WD_statsEndBand_(sheet, f.endRow, headLast);
  // THE GAP PASS RUNS LAST, AFTER THE END BAND. It used to run before it, which was fine
  // only while the chrome stopped at the first card. Now that the banner, the help row and
  // the end band run the tab's own width, they cross the two separator columns, and SPEC
  // section 3 says without qualification that a separator carries no fill and no border:
  // that is the only thing making three cards read as three cards. So the gaps are cleared
  // after everything that could paint over them, not before.
  IS9WD_statsGaps_(sheet, f);
  IS9WD_statsChrome_(sheet, f);
}

// Every separator: the one empty column between two cards, top to bottom, and the one empty
// row between two stacked rows of cards, left to right. A gap that carries a fill or a
// border is not a gap, so both lose both.
// A SEPARATOR IS CLEARED BETWEEN THE CARDS, NOT ACROSS THE TAB'S OWN CHROME. The banner,
// the help line and the end band are the tab speaking, not a card, and they run its whole
// width, so punching the two separator columns out of them cut the green bar into three
// pieces with two white notches in it. That is what Ethan saw on 2026-09-28 and it was
// mine: the gap pass ran from row 1.
//
// The rule it was serving still holds and is unchanged: between the first card row and the
// row above the end band, a separator carries no value, no fill and no border, because that
// is the only thing that makes three cards read as three cards.
function IS9WD_statsGaps_(sheet, layout) {
  var f = layout;
  var firstGapRow = f.helpRow + 1;
  var lastGapRow = f.endRow - 1;
  for (var c = 0; c < f.gapCols.length; c++) {
    IS9WD_clearGap_(sheet, firstGapRow, lastGapRow, f.gapCols[c], f.gapCols[c]);
  }
  for (var r = 0; r < f.spacerRows.length; r++) {
    IS9WD_clearGap_(sheet, f.spacerRows[r], f.spacerRows[r], 1, f.lastCol);
    sheet.setRowHeight(f.spacerRows[r], IS9WD_ROW_H.SPACER);
  }
}

// A tile is three cells in one column, and the look is entirely type and space: the number
// at 22 point in the deep green, the label at 9 point in sage above a hairline of white
// space, the line under it at 9 point in sage. No fill, no border, no merge. The width
// comes from the column and the overflow runs into the tile's own span, which is why the
// tile columns are declared with a span at all.
function IS9WD_statsPaintTiles_(sheet, layout) {
  var f = layout;
  var width = f.cellCols;
  for (var g = 0; g < f.tileGroups.length; g++) {
    var group = f.tileGroups[g];
    var value = sheet.getRange(group.valueRow, f.tileCol, 1, width);
    IS9WD_style_(value, {
      size: IS9WD_SIZE.TILE, fg: IS9WD_ROLE.BODY_FG, bold: true,
      bg: IS9WD_ROLE.BODY_BG, align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER
    });
    sheet.setRowHeight(group.valueRow, IS9WD_ROW_H.TILE);

    var label = sheet.getRange(group.labelRow, f.tileCol, 1, width);
    IS9WD_style_(label, {
      size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bold: true,
      bg: IS9WD_ROLE.BODY_BG, align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER,
      format: IS9WD_FMT.TEXT
    });
    sheet.setRowHeight(group.labelRow, IS9WD_ROW_H.TILE_LABEL);

    // Overflow rather than clip, and it is the difference between a readable tile and a
    // truncated one: a tile's note sits in the tile's FIRST column, which is 80 px on
    // tiles two, three and four, and overflow is what lets it use the whole 240 to 350 px
    // of the tile. It stops at the next tile's own note cell, which is always filled, so
    // one tile's line can never run into the next tile's.
    var note = sheet.getRange(group.noteRow, f.tileCol, 1, width);
    IS9WD_style_(note, {
      size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
      align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
    });
    sheet.setRowHeight(group.noteRow, IS9WD_ROW_H.TILE_NOTE);
  }
}

// A chart band: the band, the hint row under it, the caption row under that, and then the
// reserved rows the chart is drawn over. Those rows are given a data row's height and
// nothing else: they carry no value, no fill and no banding, because a chart sits on top
// of them.
function IS9WD_statsPaintCharts_(sheet, layout) {
  var f = layout;
  for (var i = 0; i < f.charts.length; i++) {
    var chart = f.charts[i];
    var spec = IS9WD_STATS_CHARTS[chart.index];
    IS9WD_paintCardBand_(sheet, chart.bandRow, chart.firstCol, chart.lastCol, spec.title);
    IS9WD_paintHint_(sheet, chart.hintRow, chart.firstCol, chart.lastCol, spec.help);
    var caption = sheet.getRange(chart.captionRow, chart.firstCol, 1, f.cellCols);
    IS9WD_style_(caption, {
      size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
      align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
    });
    sheet.setRowHeight(chart.captionRow, IS9WD_ROW_H.HINT);
    var band = sheet.getRange(chart.firstRow, chart.firstCol,
      chart.lastRow - chart.firstRow + 1, f.cellCols);
    IS9WD_clearBanding_(band);
    band.setBackground(IS9WD_ROLE.CARD_BODY_BG);
    IS9WD_setDataHeights_(sheet, chart.firstRow, chart.lastRow - chart.firstRow + 1);
  }
}

// One band, one hint row under it, one header row, one body. The band is 38 px, the hint
// 26, the header 30 and a data row 26, which is what makes a block read as a block. A block
// with no header row passes null, which is the marker block on `_Views`.
function IS9WD_statsBlock_(sheet, layout, bandRow, title, help, headers, firstRow,
  lastRow, cols, firstCol) {
  var at = IS9WD_posInt_(firstCol) || 1;
  // The band, the hint row and the header row run the whole width of the card, so a narrow
  // table still reads as a card rather than as a table floating inside one. _Views has no
  // grid and therefore no cellCols, so the width falls back to the table's own columns.
  var width = IS9WD_posInt_(layout.cellCols) ||
    (headers ? headers.length : (cols ? cols.length : 1));
  var cardLast = at + width - 1;
  IS9WD_paintCardBand_(sheet, bandRow, at, cardLast, title);
  IS9WD_paintHint_(sheet, bandRow + 1, at, cardLast, help);
  if (headers) {
    IS9WD_paintHeader_(sheet, bandRow + 2, at, headers, cardLast,
      IS9WD_ROLE.CARD_HEAD_BG);
  }
  var rows = lastRow - firstRow + 1;
  if (rows < 1) return;
  var body = sheet.getRange(firstRow, at, rows, width);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.CARD_BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
  IS9WD_applyColumnStyles_(sheet, firstRow, rows, at, cols);
  IS9WD_statsTints_(sheet, firstRow, rows, cols, at);
  IS9WD_setDataHeights_(sheet, firstRow, rows);
  IS9WD_clearBanding_(body);
  IS9WD_statsInnerRules_(sheet, bandRow, firstRow, rows, at, cols, headers);
}

// A TABLE READS AS A TABLE BECAUSE ITS RULES ARE DRAWN, NOT BECAUSE GRIDLINES SHOW THROUGH.
// Ethan asked for gridlines on 2026-09-28 and the workbook already had them switched on, so
// this looked done and was not: Sheets draws a gridline only on an UNFILLED cell, and every
// cell of every card is filled #F8FBFD by the card painter. So the gridline he switched on
// is invisible on precisely the tabs he was looking at, and a nine column table inside a
// card reads as a wall of text.
//
// Dotted #58756a inside the table, both directions, and one solid rule under the header so
// the header parts from the body. Dotted rather than solid because a solid inner grid on a
// fourteen row card competes with the card's own border for the eye, and the card's border
// is the thing that has to win.
//
// Restricted to the LABELLED columns rather than the whole card width: a card is usually
// wider than its table, and ruling the empty run to the right of a table would draw a grid
// over nothing and make the table look like it had lost its data.
function IS9WD_statsInnerRules_(sheet, bandRow, firstRow, rows, firstCol, cols, headers) {
  var labelled = cols ? cols.length : (headers ? headers.length : 0);
  if (labelled < 1 || rows < 1) return;
  sheet.getRange(firstRow, firstCol, rows, labelled).setBorder(
    null, null, null, null, true, true,
    IS9WD_ROLE.CARD_BORDER, SpreadsheetApp.BorderStyle.DOTTED);
  if (headers) {
    sheet.getRange(bandRow + 2, firstCol, 1, labelled).setBorder(
      null, null, true, null, null, null,
      IS9WD_ROLE.CARD_BORDER, SpreadsheetApp.BorderStyle.SOLID);
  }
}

// Font colour and weight per column, which IS9WD_applyColumnStyles_ deliberately does
// not touch.
function IS9WD_statsTints_(sheet, firstRow, rows, cols, firstCol) {
  if (rows < 1) return;
  var at = IS9WD_posInt_(firstCol) || 1;
  for (var i = 0; i < cols.length; i++) {
    if (!cols[i].fg && !cols[i].bold) continue;
    var range = sheet.getRange(firstRow, at + i, rows, 1);
    if (cols[i].fg) range.setFontColor(cols[i].fg);
    if (cols[i].bold) range.setFontWeight('bold');
  }
}

// A blank row between blocks, with no fill of its own, so a block reads as a block rather
// than as part of the next one. It is 18 px now rather than 12: more air was Ethan's
// instruction of 2026-09-27.
function IS9WD_statsSpacers_(sheet, rows, lastCol) {
  for (var i = 0; i < rows.length; i++) {
    sheet.getRange(rows[i], 1, 1, lastCol).setBackground(null);
    sheet.setRowHeight(rows[i], IS9WD_ROW_H.SPACER);
  }
}

// The end row, which is a tab's own footer: the marker, the error count and whatever else
// that tab records there, in the band's help colour on the band fill so it reads as the end
// of the document rather than as one more row of data.
function IS9WD_statsEndBand_(sheet, endRow, lastCol) {
  IS9WD_style_(sheet.getRange(endRow, 1, 1, lastCol), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.BAND_HELP_FG, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
  });
  IS9WD_style_(sheet.getRange(endRow, 1), {
    size: IS9WD_SIZE.BAND, fg: IS9WD_ROLE.BAND_FG, bold: true,
    bg: IS9WD_ROLE.BAND_BG, align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER,
    format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(endRow, IS9WD_ROW_H.DATA);
}

function IS9WD_statsChrome_(sheet, layout) {
  IS9WD_setWidths_(sheet, 'STATS');
  // Shown and never hidden: the helper band moved to `_Views`, so there is no hidden
  // column on this tab at all. Showing them anyway is what undoes a column a past layout
  // hid, which would otherwise stay hidden forever.
  sheet.showColumns(1, layout.lastCol);
  IS9WD_hideCols_(sheet, 'STATS');
  IS9WD_freezeTab_(sheet, 'STATS');
  sheet.setTabColor(IS9WD_TAB_COLOR.STATS);
}

// Returns the list rather than applying it, so the caller replaces the whole list in one
// call and nothing is ever appended. Colours are roles: a blocking state is always bold
// #724485 and a superseded row is always #8b74a1, here and on every other tab.
//
// EVERY NAMED RANGE IN EVERY RULE GOES THROUGH INDIRECT. A conditional format rule may not
// reference another sheet, and most of the thresholds these rules read are on `_Engine` or
// `_Views` now. Applying the wrapper to all of them, including the local ones, is what
// makes the rule mechanical instead of remembered.
function IS9WD_statsRules_(sheet, layout) {
  var f = layout;
  var flag = { fg: IS9WD_ROLE.FLAG_FG, bg: IS9WD_ROLE.FLAG_BG, bold: true };
  // A FLAGGED TILE TAKES BOLD STRONG PURPLE TEXT AND NO FILL, which is this tab's one
  // departure from the workbook's usual flag treatment. A cream filled tile on a dashboard
  // reads as a box rather than as a number, and the whole point of a tile is the number.
  var tileFlag = { fg: IS9WD_ROLE.FLAG_FG, bold: true };
  var muted = { fg: IS9WD_ROLE.MUTED_FG };
  var accent = { fg: IS9WD_ROLE.ACCENT_FG, bold: true };
  var rules = [];
  var spec = IS9WD_statsTileSpec_();
  var attention = IS9WD_statsAttentionSpec_();

  // First, so it wins on any cell it touches: the visible sentinel this tab uses instead
  // of swallowing an error into a blank.
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(1, 1, f.endRow, f.lastCol)],
    '=A1=' + IS9WD_statsErr_(), flag));

  // The eight tiles, one rule each, each one scoped to that tile's own three cells so a
  // flag on one tile cannot decorate the tile beside it.
  for (var t = 0; t < IS9WD_STATS_TILES.length; t++) {
    var key = IS9WD_STATS_TILES[t][0];
    var at = IS9WD_statsTileAt_(f, key);
    var entry = spec[key];
    if (!at || !entry || entry.flag === '=FALSE') continue;
    rules.push(IS9WD_ruleFormula_([
      sheet.getRange(at.valueRow, at.col, 1, at.span),
      sheet.getRange(at.labelRow, at.col, 1, at.span),
      sheet.getRange(at.noteRow, at.col, 1, at.span)
    ], entry.flag, tileFlag));
  }

  // The attention table, one rule per row, because there is no hidden flag column on this
  // tab any more and a per-row rule is the honest replacement for one.
  //
  // EVERY COLUMN BELOW IS ITS BLOCK'S OWN FIRST COLUMN PLUS AN OFFSET. A block sits in one
  // cell of the three across grid, so a literal column number here would decorate whichever
  // card happens to be sitting at that column.
  var aCol = f.attentionCol;
  for (var a = 0; a < IS9WD_STATS_ATTENTION_ROWS.length; a++) {
    var aKey = IS9WD_STATS_ATTENTION_ROWS[a][0];
    var aEntry = attention[aKey];
    if (!aEntry || aEntry.flag === '=FALSE') continue;
    rules.push(IS9WD_ruleFormula_(
      [sheet.getRange(f.attentionFirst + a, aCol + 1, 1, 2)], aEntry.flag, flag));
  }

  // The gates.
  var gRows = f.gateLast - f.gateFirst + 1;
  var g0 = f.gateCol;
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.gateFirst, g0, gRows, IS9WD_STATS_HEADERS.GATES.length)],
    '=' + IS9WD_statsRef_(g0 + 1, f.gateFirst) + '="HOLD"', flag));

  // BY OFFICER. Attention is the column Ethan scans, so it is the one that shouts.
  var oRows = f.officerLast - f.officerFirst + 1;
  var o = f.officerFirst;
  var oc = function (offset) { return f.officerCol + offset - 1; };
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(2), oRows, 1)],
    '=AND(' + IS9WD_statsRef_(oc(2), o) + '<>"",' +
    IS9WD_statsRef_(oc(2), o) + '<>"OK")', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(6), oRows, 1)],
    '=N(' + IS9WD_statsRef_(oc(6), o) + ')>0', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(7), oRows, 1)],
    '=N(' + IS9WD_statsRef_(oc(7), o) + ')>=' +
    IS9WD_statsRuleName_('IS9WD_STATS_LATE_DAYS'), flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(8), oRows, 1)],
    '=OR(' + IS9WD_statsRef_(oc(8), o) + '="never",N(' +
    IS9WD_statsRef_(oc(8), o) + ')>=' +
    IS9WD_statsRuleName_('IS9WD_STATS_SILENT_DAYS') + ')', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(5), oRows, 1)],
    '=AND(' + IS9WD_statsRef_(oc(3), o) + '+' + IS9WD_statsRef_(oc(4), o) + '>0,' +
    IS9WD_statsRuleName_('IS9WD_STATS_ELAPSED') + '>0,' +
    IS9WD_statsRef_(oc(5), o) + '<' +
    IS9WD_statsRuleName_('IS9WD_STATS_ELAPSED') + '/7-' +
    IS9WD_statsRuleName_('IS9WD_STATS_PACE_SLACK') + ')', flag));
  // A committee that finished its whole week is the one good state this tab decorates, and
  // it takes the accent rather than a flag colour, because it is not a fault.
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(5), oRows, 1)],
    '=AND(' + IS9WD_statsRef_(oc(3), o) + '+' + IS9WD_statsRef_(oc(4), o) + '>0,' +
    IS9WD_statsRef_(oc(5), o) + '=1)', accent));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(9), oRows, 1)],
    '=AND(' + IS9WD_statsRef_(oc(9), o) + '<>"",' + IS9WD_statsRef_(oc(9), o) + '<' +
    IS9WD_statsRuleName_('IS9WD_STATS_ONTIME_TARGET') + ')', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, oc(12), oRows, 1)],
    '=N(' + IS9WD_statsRef_(oc(12), o) + ')>0', accent));

  // The ranked block's unscored tail reads as not applicable rather than as last place.
  var rRows = f.rankLast - f.rankFirst + 1;
  var r0 = f.rankCol;
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.rankFirst, r0, rRows, IS9WD_STATS_HEADERS.RANKED.length)],
    '=' + IS9WD_statsRef_(r0 + 4, f.rankFirst) + '<>""', muted));

  // The trend block. A week nothing ever archived is muted, because it is missing rather
  // than empty; a week with a snapshot and no retirement takes the accent.
  var tRows = f.trendLast - f.trendFirst + 1;
  var t0 = f.trendCol;
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.trendFirst, t0, tRows, IS9WD_STATS_HEADERS.TREND.length)],
    '=' + IS9WD_statsRef_(t0 + 5, f.trendFirst) + '="Not archived"', muted));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(f.trendFirst, t0 + 5, tRows, 1)],
    '=' + IS9WD_statsRef_(t0 + 5, f.trendFirst) + '="Snapshot only"', accent));

  // The two footer cells. Either one is a self test failure and nothing else.
  rules.push(IS9WD_ruleFormula_([sheet.getRange(f.errorsCell.row, f.errorsCell.col)],
    '=N(' + IS9WD_statsCell_(f.errorsCell.col, f.errorsCell.row) + ')>0', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(f.agreeCell.row, f.agreeCell.col)],
    '=AND(' + IS9WD_statsCell_(f.agreeCell.col, f.agreeCell.row) + '<>"",' +
    IS9WD_statsCell_(f.agreeCell.col, f.agreeCell.row) + '<>"OK")', flag));

  return rules;
}

// ============================================================================
//  THE ENTRY POINT FOR 04 | OFFICER TABLES
// ============================================================================

/**
 * Sizes, paints and writes 04 | Officer Tables: fourteen numbered sections, one per
 * directory entry, in order of rank. It owns the whole tab for the length of the call.
 *
 * IT READS BOTH OTHER VIEWS BY NAME, so it runs last: every count in a section heading is
 * an INDEX into a named range on `_Views`, and the reserved row count it compares against
 * is a marker `_Views` writes. That is what stops the three tabs disagreeing.
 */
function IS9WD_officerTablesResize_(cfg) {
  var conf = cfg || IS9WD_readConfig_();
  var layout = conf.ot || IS9WD_officerTables_();
  var sheet = IS9WD_sheet_('TABLES');

  IS9WD_ensureGrid_(sheet, layout.endRow, layout.lastCol);
  IS9WD_otWipe_(sheet, layout);
  var names = IS9WD_otPointNames_(sheet, layout);
  IS9WD_otPaintAll_(sheet, layout);
  var report = IS9WD_otWriteAll_(sheet, layout);
  report.namesPointed = names;
  // Trimmed last, for the reason 03 | Statistics is trimmed last: a trim before the paint
  // leaves a window in which anything that grows the grid inherits the last built row's
  // format, and in Sheets an inserted row copies the row above it.
  IS9WD_otTrim_(sheet, layout);
  report.maxRows = sheet.getMaxRows();
  report.maxCols = sheet.getMaxColumns();
  return report;
}

function IS9WD_otPointNames_(sheet, layout) {
  var want = IS9WD_otNames_(layout);
  for (var i = 0; i < want.length; i++) {
    IS9WD_setNamed_(want[i].name, sheet.getRange(want[i].a1));
  }
  return want.length;
}

function IS9WD_otWipe_(sheet, layout) {
  var rows = Math.min(Math.max(layout.endRow, sheet.getLastRow()), sheet.getMaxRows());
  var cols = Math.min(Math.max(layout.lastCol, sheet.getLastColumn()),
    sheet.getMaxColumns());
  var all = sheet.getRange(1, 1, rows, cols);
  all.clear();
  all.setBorder(false, false, false, false, false, false);
  all.clearDataValidations();
  all.clearNote();
}

function IS9WD_otTrim_(sheet, layout) {
  IS9WD_clearPastEnd_(sheet, layout.endRow, layout.lastCol);
  var extraRows = sheet.getMaxRows() - layout.endRow;
  if (extraRows > 0) sheet.deleteRows(layout.endRow + 1, extraRows);
  var extraCols = sheet.getMaxColumns() - layout.lastCol;
  if (extraCols > 0) sheet.deleteColumns(layout.lastCol + 1, extraCols);
}

function IS9WD_otWriteAll_(sheet, layout) {
  var o = layout;
  IS9WD_otSummaryRow_(sheet, o);
  for (var i = 0; i < o.blocks.length; i++) {
    IS9WD_otBlockValues_(sheet, o, o.blocks[i]);
  }
  IS9WD_otEndRow_(sheet, o);
  IS9WD_setRules_(sheet, IS9WD_otRules_(sheet, o));
  return {
    tab: IS9WD_TAB.TABLES,
    blocks: o.blocks.length,
    officerRows: o.officerRows,
    itemRows: o.itemRows,
    lastRow: o.endRow,
    writtenAt: IS9WD_stampText_(new Date())
  };
}

// Row 3, and the reason it is frozen with the banner: it says from the top what the
// fourteen sections below cannot be trusted to show, so nobody has to scroll to the bottom
// of the tab to find out that something was left out.
function IS9WD_otSummaryRow_(sheet, layout) {
  var shown = '(IS9WD_OT_ROWS_BUILT-1)';
  sheet.getRange(layout.summaryRow, layout.firstCol).setFormula(
    '=IF(SUMPRODUCT(--(N(IS9WD_STATS_OFF_TOTAL)>' + shown + '))=0,' +
    '"Every officer\'s full list fits below.",' +
    '"Not shown below: "&TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF(' +
    'N(IS9WD_STATS_OFF_TOTAL)>' + shown + ',IS9WD_STATS_OFF_NAME&" ("&' +
    '(N(IS9WD_STATS_OFF_TOTAL)-' + shown + ')&")","")))&' +
    '". Raise Rows reserved per officer on _Engine, then run Build or repair workbook.")');
}

// One section: the numbered heading, the hierarchy ordinal it joins on, one spilling item
// formula and one overflow notice.
function IS9WD_otBlockValues_(sheet, layout, block) {
  var ord = IS9WD_statsRef_(block.keyCol, block.bandRow);
  var shown = '(IS9WD_OT_ROWS_BUILT-1)';
  var sep = IS9WD_statsSep_();

  // The ordinal is a literal, written once by setup, and it is what lets fourteen
  // structurally identical sections share one formula shape. It is the feed's own device
  // for the same job.
  sheet.getRange(block.bandRow, block.keyCol)
    .setNumberFormat(IS9WD_FMT.INT)
    .setValue(block.ordinal);

  // The heading. It opens with the section number, which is what makes the tab read as a
  // document with fourteen numbered sections rather than as fourteen stripes: a reader
  // always knows where they are and how far there is to go. Every count in it is an INDEX
  // into a named range on `_Views` rather than a second COUNTIFS, so the tabs cannot
  // disagree, and the counts are the all-tasks window, which the tab's help line says.
  sheet.getRange(block.bandRow, block.firstCol).setFormula(
    '=IF(' + ord + '="",' + IS9WD_statsErr_() + ',' +
    'TEXT(' + ord + ',"00")&" of "&TEXT(ROWS(IS9WD_STATS_OFF_NAME),"00")&' + sep + '&' +
    'UPPER(INDEX(IS9WD_STATS_OFF_NAME,' + ord + '))&' + sep + '&' +
    'UPPER(INDEX(IS9WD_STATS_OFF_POSITION,' + ord + '))&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_VP,' + ord + ')&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_ACTIVE_ALL,' + ord + ')&" to do"&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_DONE_ALL,' + ord + ')&" done"&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_OVERDUE,' + ord + ')&" overdue"&' +
    'IF(N(INDEX(IS9WD_STATS_OFF_NOTPUB,' + ord + '))>0,' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_NOTPUB,' + ord + ')&" with no slide","")&' +
    'IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))=0,' + sep +
    '&"nothing entered yet","")&' +
    'IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))>' + shown + ',' + sep + '&' +
    '(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))-' + shown + ')&' +
    '" not shown below",""))');

  // The item spill, one formula per section. Four things in it are load bearing, and all
  // four are the reason it is one formula rather than ninety-six lookups.
  //
  // The sort key is ONE column rather than three sort arguments: `0` or `1` for active or
  // done, then the deadline serial zero padded to six digits, then the ID. The whole
  // ordering rule is legible in one expression, and a blank deadline gives `000000` and
  // sorts first, which matches the feed's deliberate choice to put a task nobody can date
  // at the top rather than buried.
  //
  // Both computed columns are wrapped in ARRAYFORMULA, because IF and & do not broadcast
  // over a range inside an array literal: without the wrapper each column collapses to a
  // scalar, the `{}` literal fails on a size mismatch, and the section goes permanently
  // and silently blank.
  //
  // The key is the last column and hidden, so the display columns stay in reading order
  // with no CHOOSECOLS, which keeps this to classic functions like every other formula in
  // the workbook. It is the one hidden column left on a tab a person reads, and it cannot
  // move to `_Views` with the others: it is the eighth column of this very SORT.
  //
  // And the IF on the total means one cell returns either a sentence or an array, so an
  // officer with nothing does not need a second cell and does not read as twenty blank
  // banded rows.
  sheet.getRange(block.itemFirst, block.firstCol).setFormula(
    '=IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))=0,' +
    '"Nothing entered for this officer yet.",' +
    'IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({IS9WD_DEL_TITLE,IS9WD_DEL_DEADLINE,' +
    'ARRAYFORMULA(IF(N(IS9WD_DEL_DEADLINE)>0,INT(N(IS9WD_DEL_DEADLINE))-' +
    'IS9WD_EFFECTIVE_TODAY,"")),IS9WD_DEL_STATUS,IS9WD_DEL_CHECK,IS9WD_DEL_REMARK,' +
    'IS9WD_DEL_ID,ARRAYFORMULA(IF(IS9WD_DEL_TITLE="","",' +
    'IF(IS9WD_DEL_ACTIVE=TRUE,"0","1")&TEXT(INT(N(IS9WD_DEL_DEADLINE)),"000000")&' +
    'IS9WD_DEL_ID))},(IS9WD_DEL_COMMITTEE=INDEX(IS9WD_STATS_OFF_NAME,' + ord + '))' +
    '*(IS9WD_DEL_TITLE<>"")),8,TRUE),' + layout.itemRows + ',8),""))');

  // The notice row. ARRAY_CONSTRAIN alone would have dropped the rest without a word,
  // which is the one thing this tab is not allowed to do.
  sheet.getRange(block.noticeRow, block.firstCol).setFormula(
    '=IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))<=' + shown + ',"",' +
    '"+ "&(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))-' + shown + ')&' +
    '" more not shown here. Raise Rows reserved per officer on _Engine, ' +
    'then run Build or repair workbook.")');
}

function IS9WD_otEndRow_(sheet, layout) {
  var scan = IS9WD_statsBox_(1, 1, layout.lastCol, layout.scanLastRow);
  sheet.getRange(layout.endRow, 1).setValue(IS9WD_OT.END);
  sheet.getRange(layout.endRow, 2).setValue('End of tab');
  sheet.getRange(layout.errorsCell.row, layout.errorsCell.col)
    .setNumberFormat(IS9WD_FMT.INT)
    .setFormula('=SUMPRODUCT(--ISERROR(' + scan + '))+' +
      'SUMPRODUCT(--(' + scan + '=' + IS9WD_statsQ_(IS9WD_OT.ERR) + '))');
}

// ============================================================================
//  PAINTERS FOR 04 | OFFICER TABLES
// ============================================================================

// Fourteen cards, three across and five deep with the last row holding two, each one
// outlined and backed before anything is painted into it, and every separator column and
// separator row cleared of both afterwards.
function IS9WD_otPaintAll_(sheet, layout) {
  var o = layout;
  var cols = IS9WD_statsCols_().OT;

  sheet.getRange(1, 1, o.endRow, o.lastCol).setFontFamily(IS9WD_FONT);
  // The tab's own width, for the reason 04 | Statistics gives: chrome that stops at the
  // first card leaves a reader scrolled right with no banner and an unpainted end row. The
  // separator columns are cleared again after the end band, so the bar reads as three
  // segments rather than as one unbroken 29 column rule.
  IS9WD_paintBanner_(sheet, o.bannerRow, o.firstCol, o.lastCol, IS9WD_OT.BANNER);
  IS9WD_paintHelp_(sheet, o.helpRow, o.firstCol, o.lastCol, IS9WD_OT.HELP);

  // The summary row is a rule rather than a caption, so it takes body type and sits
  // directly under the help line inside the frozen pane.
  IS9WD_style_(sheet.getRange(o.summaryRow, 1, 1, o.visibleLastCol), {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(o.summaryRow, IS9WD_ROW_H.HINT);

  for (var k = 0; k < o.cards.length; k++) {
    var card = o.cards[k];
    IS9WD_paintCard_(sheet, card.firstRow, card.lastRow, card.firstCol, card.lastCol);
  }

  for (var i = 0; i < o.blocks.length; i++) {
    IS9WD_otPaintBlock_(sheet, o, o.blocks[i], cols);
  }

  // The hidden sort key column of each card, over that card's own rows only, so a separator
  // row carries no fill anywhere across its width. Read from the card's declared keyCol: it
  // used to be lastCol + 1, which was right only while the key was the grid cell's final
  // column, and after the card grew to fill its cell that arithmetic pointed one column past
  // the tab's last, which threw on the third card of every row.
  for (var b = 0; b < o.cards.length; b++) {
    var side = o.cards[b];
    IS9WD_style_(sheet.getRange(side.firstRow, side.keyCol,
      side.lastRow - side.firstRow + 1, 1), {
      size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.CARD_BODY_BG,
      align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
    });
  }

  IS9WD_statsEndBand_(sheet, o.endRow, o.lastCol);
  // Last, for the reason 04 | Statistics gives: the full width chrome crosses the separator
  // columns, and a separator that carries a fill stops the cards reading as cards.
  IS9WD_otGaps_(sheet, o);

  IS9WD_setWidths_(sheet, 'TABLES');
  sheet.showColumns(1, o.lastCol);
  IS9WD_hideCols_(sheet, 'TABLES');
  IS9WD_freezeTab_(sheet, 'TABLES');
  sheet.setTabColor(IS9WD_TAB_COLOR.TABLES);
}

// Between the cards only, for the reason IS9WD_statsGaps_ gives above. The summary row
// counts as chrome here: it is the tab speaking, so it keeps its fill across the full width.
function IS9WD_otGaps_(sheet, layout) {
  var o = layout;
  var firstGapRow = o.summaryRow + 1;
  var lastGapRow = o.endRow - 1;
  for (var c = 0; c < o.gapCols.length; c++) {
    IS9WD_clearGap_(sheet, firstGapRow, lastGapRow, o.gapCols[c], o.gapCols[c]);
  }
  for (var r = 0; r < o.spacerRows.length; r++) {
    IS9WD_clearGap_(sheet, o.spacerRows[r], o.spacerRows[r], 1, o.lastCol);
    sheet.setRowHeight(o.spacerRows[r], IS9WD_ROW_H.SPACER);
  }
}

// One officer's section. The heading is one cell of text running across a filled span,
// which is how the bar look is achieved without the connector printing `[merged]` repeats.
// Banding covers the task rows only, so the notice row and the spacer stay plain and the
// section reads as a table under a heading rather than as a stripe that never ends.
function IS9WD_otPaintBlock_(sheet, layout, block, cols) {
  var at = block.firstCol;
  var width = block.lastCol - at + 1;
  IS9WD_paintCardBand_(sheet, block.bandRow, at, block.lastCol, '');
  IS9WD_paintHeader_(sheet, block.headerRow, at, IS9WD_OT_HEADERS, block.lastCol,
    IS9WD_ROLE.CARD_HEAD_BG);

  var rows = layout.itemRows;
  var body = sheet.getRange(block.itemFirst, at, rows, width);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.CARD_BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
  IS9WD_applyColumnStyles_(sheet, block.itemFirst, rows, at, cols);
  IS9WD_statsTints_(sheet, block.itemFirst, rows, cols, at);
  IS9WD_setDataHeights_(sheet, block.itemFirst, rows);
  IS9WD_clearBanding_(body);

  var notice = sheet.getRange(block.noticeRow, at, 1, width);
  IS9WD_style_(notice, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.CARD_BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(block.noticeRow, IS9WD_ROW_H.DATA);
}

// Five rules per section plus the sentinel rule. Per section rather than one multi-range
// rule per treatment, because a multi-range rule's relative anchor across fourteen ranges
// is undocumented, and getting it wrong would mute the wrong rows on a tab whose muting is
// the acceptance check for not keying on a status label.
//
// Not one of these reads a named range, which is why this tab was the one that exposed the
// cross-sheet rule bug: everything it needs is a cell on the same sheet.
function IS9WD_otRules_(sheet, layout) {
  var flag = { fg: IS9WD_ROLE.FLAG_FG, bg: IS9WD_ROLE.FLAG_BG, bold: true };
  var muted = { fg: IS9WD_ROLE.MUTED_FG };
  var accent = { fg: IS9WD_ROLE.ACCENT_FG, bold: true };
  var overdue = IS9WD_statsQ_(IS9WD_statsOverdueFlag_());
  var rules = [];

  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(1, 1, layout.endRow, layout.lastCol)],
    '=A1=' + IS9WD_statsQ_(IS9WD_OT.ERR), flag));

  for (var i = 0; i < layout.blocks.length; i++) {
    var b = layout.blocks[i];
    var rows = layout.itemRows;
    var at = b.firstCol;
    var width = b.lastCol - at + 1;
    var whole = [sheet.getRange(b.itemFirst, at, rows, width)];
    var flagCol = [sheet.getRange(b.itemFirst, at + 4, rows, 1)];
    var flagRef = IS9WD_statsRef_(at + 4, b.itemFirst);
    var daysRef = IS9WD_statsRef_(at + 2, b.itemFirst);
    var keyRef = IS9WD_statsRef_(b.keyCol, b.itemFirst);

    // A blocking flag first, then Overdue, so a row that is both reads as blocked.
    rules.push(IS9WD_ruleFormula_(flagCol,
      '=AND(' + flagRef + '<>"",' + flagRef + '<>' + overdue + ')', flag));
    rules.push(IS9WD_ruleFormula_(flagCol, '=' + flagRef + '=' + overdue, flag));
    // Scoped to Days left so it cannot collide with the flag rule beside it.
    rules.push(IS9WD_ruleFormula_([sheet.getRange(b.itemFirst, at + 2, rows, 1)],
      '=AND(' + daysRef + '<>"",N(' + daysRef + ')<0)', accent));
    // A finished row reads muted across all seven columns, and the rule reads the FIRST
    // CHARACTER OF THE SORT KEY, which derives from the Active flag. Nothing here keys on
    // the word Accomplished: the Status column carries the label as display and never as a
    // key, so renaming the status in the status list changes nothing.
    rules.push(IS9WD_ruleFormula_(whole, '=LEFT(' + keyRef + ',1)="1"', muted));
    rules.push(IS9WD_ruleFormula_([sheet.getRange(b.noticeRow, at, 1, width)],
      '=' + IS9WD_statsCell_(at, b.noticeRow) + '<>""', flag));
  }
  return rules;
}

// ============================================================================
//  00 | DASHBOARD  (the front door, built 2026-09-28)
// ============================================================================

// Built here rather than in a file of its own, because this module already owns the two
// other card grid tabs and every painter the dashboard needs: the grid geometry, the card,
// the band, the hint row, the gap, the end band and the row heights. A third copy of those
// in a fourth file is three chances for the three tabs to stop looking alike.
//
// The whole tab is formulas over named ranges that already exist. Nothing is recomputed,
// so this tab cannot disagree with the tab it summarises, and the seven readiness gates in
// particular are mirrored from 04 | Statistics rather than evaluated a third time.
function IS9WD_dashResize_(cfg) {
  var layout = IS9WD_dash_();
  var sheet = IS9WD_sheet_('DASHBOARD');

  IS9WD_ensureGrid_(sheet, layout.endRow, layout.lastCol);
  IS9WD_dashWipe_(sheet, layout);
  var names = IS9WD_dashPointNames_(sheet, layout);
  IS9WD_dashPaintAll_(sheet, layout);
  var written = IS9WD_dashWriteAll_(sheet, layout, cfg);
  // Trimmed last, for the reason 04 | Statistics learned the hard way: trimming first
  // leaves a window in which a later step that grows the grid inherits the format of the
  // last built row, because an inserted row copies the row above it.
  IS9WD_dashTrim_(sheet, layout);
  return {
    namesPointed: names, cards: layout.cards.length, rows: written,
    lastRow: layout.endRow, maxRows: sheet.getMaxRows(),
    maxCols: sheet.getMaxColumns()
  };
}

function IS9WD_dashPointNames_(sheet, layout) {
  var want = IS9WD_dashNames_(layout);
  for (var i = 0; i < want.length; i++) {
    IS9WD_setNamed_(want[i].name, sheet.getRange(want[i].a1));
  }
  return want.length;
}

function IS9WD_dashWipe_(sheet, layout) {
  var rows = Math.min(Math.max(layout.endRow, sheet.getLastRow()), sheet.getMaxRows());
  var cols = Math.min(Math.max(layout.lastCol, sheet.getLastColumn()),
    sheet.getMaxColumns());
  var all = sheet.getRange(1, 1, rows, cols);
  all.clear();
  // clear() does not clear a border, so a card drawn by an earlier layout would leave its
  // outline behind on a tab whose cards have moved.
  all.setBorder(false, false, false, false, false, false);
  all.clearNote();
}

function IS9WD_dashTrim_(sheet, layout) {
  IS9WD_clearPastEnd_(sheet, layout.endRow, layout.lastCol);
  var extraRows = sheet.getMaxRows() - layout.endRow;
  if (extraRows > 0) sheet.deleteRows(layout.endRow + 1, extraRows);
  var extraCols = sheet.getMaxColumns() - layout.lastCol;
  if (extraCols > 0) sheet.deleteColumns(layout.lastCol + 1, extraCols);
}

// THE CARD IS PAINTED OVER ITS WHOLE GRID CELL, not over the rows it happens to fill. A
// card with five rows sitting beside one with eight would otherwise leave a hole in the
// row of three, and three cards that do not line up at the bottom is the single thing that
// makes a grid look unfinished.
function IS9WD_dashPaintAll_(sheet, layout) {
  IS9WD_paintBanner_(sheet, layout.bannerRow, 1, layout.lastCol, IS9WD_DASH_BANNER);
  IS9WD_paintHelp_(sheet, layout.helpRow, 1, layout.lastCol, IS9WD_DASH_HELP);
  sheet.setRowHeight(3, IS9WD_ROW_H.SPACER);
  sheet.getRange(3, 1, 1, layout.lastCol).setBackground(null);

  for (var c = 0; c < layout.cards.length; c++) {
    var card = layout.cards[c];
    IS9WD_paintCard_(sheet, card.bandRow, card.blockLastRow, card.firstCol, card.lastCol);
    IS9WD_paintCardBand_(sheet, card.bandRow, card.firstCol, card.lastCol,
      card.spec.title);
    IS9WD_paintHint_(sheet, card.hintRow, card.firstCol, card.lastCol, card.spec.help);
    IS9WD_dashPaintBody_(sheet, card);
  }

  IS9WD_statsEndBand_(sheet, layout.endRow, layout.lastCol);

  // A gap carries nothing: no value, no fill, no border. That is the only thing that makes
  // three cards read as three cards rather than as one banded table. LAST, after the end
  // band, for the reason the two other card tabs learned: the end band runs the tab's own
  // width and therefore crosses both separator columns.
  for (var g = 0; g < layout.gapCols.length; g++) {
    // Between the cards only, never across the banner, the help line or the end band: the
    // tab's chrome runs its full width and a separator punched through it reads as a broken
    // bar. The width comes from IS9WD_WIDTH.DASHBOARD like every other column on the tab.
    IS9WD_clearGap_(sheet, layout.helpRow + 1, layout.endRow - 1,
      layout.gapCols[g], layout.gapCols[g]);
  }
  for (var r = 0; r < layout.gapRows.length; r++) {
    IS9WD_clearGap_(sheet, layout.gapRows[r], layout.gapRows[r], 1, layout.lastCol);
    sheet.setRowHeight(layout.gapRows[r], IS9WD_ROW_H.SPACER);
  }
  IS9WD_dashChrome_(sheet, layout);
}

// The label column, the value column, and the four the value overflows into. The value is
// LEFT aligned rather than right, because most of them are sentences and a right aligned
// sentence that overflows runs the wrong way, off the left edge of its own card.
//
// A TABLE READS AS A TABLE BECAUSE ITS RULES ARE DRAWN. Sheets shows a gridline only on an
// unfilled cell, and every cell of a card is filled #F8FBFD, so a card with no drawn rules
// is a wall of text no matter what the gridline setting says. Dotted #58756a inside the
// card, horizontals between the rows and one vertical after the label column, is what
// Ethan asked for when he asked for gridlines.
function IS9WD_dashPaintBody_(sheet, card) {
  var rows = card.lastRow - card.firstRow + 1;
  var width = card.lastCol - card.firstCol + 1;
  if (rows < 1) return;

  var body = sheet.getRange(card.firstRow, card.firstCol, rows, width);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.CARD_BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  IS9WD_clearBanding_(body);

  var labels = sheet.getRange(card.firstRow, card.firstCol, rows, 1);
  IS9WD_style_(labels, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.CARD_BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
  });

  var values = sheet.getRange(card.firstRow, card.firstCol + IS9WD_DASH_VALUE_COL - 1,
    rows, width - 1);
  values.setFontWeight('bold');

  body.setBorder(null, null, null, null, false, true, IS9WD_ROLE.CARD_BORDER,
    SpreadsheetApp.BorderStyle.DOTTED);
  labels.setBorder(null, null, null, true, false, true, IS9WD_ROLE.CARD_BORDER,
    SpreadsheetApp.BorderStyle.DOTTED);
  IS9WD_setDataHeights_(sheet, card.firstRow, rows);
}

function IS9WD_dashChrome_(sheet, layout) {
  IS9WD_setWidths_(sheet, 'DASHBOARD');
  sheet.showColumns(1, layout.lastCol);
  sheet.showRows(1, layout.endRow);
  IS9WD_freezeTab_(sheet, 'DASHBOARD');
  sheet.setTabColor(IS9WD_TAB_COLOR.DASHBOARD);
  sheet.getRange(1, 1, layout.endRow, layout.lastCol).setFontFamily(IS9WD_FONT);
}

// The values, the number formats and the one conditional rule the tab has.
function IS9WD_dashWriteAll_(sheet, layout, cfg) {
  var written = 0;
  var rules = [];
  for (var c = 0; c < layout.cards.length; c++) {
    var card = layout.cards[c];
    var rows = card.spec.jobs ? IS9WD_dashJobRows_(cfg) : card.spec.rows;
    var labels = [];
    var values = [];
    for (var r = 0; r < rows.length; r++) {
      labels.push([rows[r].label]);
      values.push([rows[r].formula]);
      var kind = IS9WD_dashKindStyle_(rows[r].kind);
      var cell = sheet.getRange(card.firstRow + r, card.firstCol + 1);
      cell.setNumberFormat(kind.format);
      cell.setHorizontalAlignment(kind.align);
      if (rows[r].flag) {
        rules.push(IS9WD_dashFlagRule_(sheet, card.firstRow + r, card.firstCol + 1,
          card.lastCol, rows[r].flag));
      }
      written++;
    }
    if (!rows.length) continue;
    sheet.getRange(card.firstRow, card.firstCol, rows.length, 1).setValues(labels);
    sheet.getRange(card.firstRow, card.firstCol + 1, rows.length, 1)
      .setFormulas(values);
  }
  // The first rule on the tab catches a broken lookup, before every other rule, so it wins
  // on any cell it touches. !ERR is the literal this workbook renders rather than letting
  // an error value leak into a sentence.
  rules.unshift(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=A1="!ERR"')
    .setFontColor(IS9WD_ROLE.FLAG_FG).setBold(true)
    .setRanges([sheet.getRange(1, 1, layout.endRow, layout.lastCol)])
    .build());
  sheet.setConditionalFormatRules(rules);
  return written;
}

// Bold #724485 on the paper white, never on cream, which is the workbook's one blocking
// treatment. A calm value gets no treatment at all.
//
// EVERY NAMED RANGE IN THE FORMULA IS WRAPPED IN INDIRECT, and this is not cosmetic: a
// conditional format rule may not reference another sheet, and Sheets refuses it at the
// moment the rule list is applied, not when it evaluates. Every name a dashboard flag reads
// lives on another tab, because this tab carries exactly one name of its own, so an unwrapped
// list would throw inside IS9WD_dashWriteAll_ on the FIRST rule. IS9WD_setupCall_ does not
// catch, so the throw would propagate out of the whole build, past the directory backfill,
// the token issue, the name audit and the log append: a fully renamed workbook with a half
// painted dashboard and no log row saying the run happened, and every later run dying on the
// same line.
//
// This project has hit this exact class twice before: once on 04 | Officer Tables, which is
// why IS9WD_statsRuleName_ exists, and once here. Wrapping at the RULE PATH rather than in the
// twenty flag strings is deliberate: the card VALUE formulas legitimately cross sheets and
// must not be wrapped, and one rewriter cannot be forgotten on a flag added later.
function IS9WD_dashFlagRule_(sheet, row, firstCol, lastCol, formula) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(IS9WD_dashRuleSafe_(formula))
    .setFontColor(IS9WD_ROLE.FLAG_FG).setBold(true)
    .setRanges([sheet.getRange(row, firstCol, 1, lastCol - firstCol + 1)])
    .build();
}

// Every IS9WD_ token in a rule formula becomes INDIRECT("token"). Applied to the rule path
// only, never to a value formula. A token already inside an INDIRECT is left alone so the
// rewriter is safe to apply twice.
function IS9WD_dashRuleSafe_(formula) {
  var text = String(formula === null || formula === undefined ? '' : formula);
  if (text.indexOf('INDIRECT(') >= 0) return text;
  return text.replace(/\bIS9WD_[A-Z0-9_]+\b/g, function (name) {
    return IS9WD_statsRuleName_(name);
  });
}

// The five job rows, read by INDEX over the schedule block because the schedule has no per
// column named range. Built at write time rather than declared, so a schedule that grows a
// row grows this card with it.
function IS9WD_dashJobRows_(cfg) {
  var out = [];
  var conf = cfg || null;
  var rows = conf && conf.schedule && conf.schedule.rows ? conf.schedule.rows : [];
  for (var i = 0; i < IS9WD_DASH_JOB_ROWS; i++) {
    var label = rows[i] ? IS9WD_dashJobLabel_(rows[i].jobKey) : 'Job ' + (i + 1);
    var n = i + 1;
    out.push({
      label: label,
      formula: '=IFERROR(IF(INDEX(IS9WD_SCHEDULE,' + n + ',6)=TRUE,"on","off")&"' +
        IS9WD_SEP + '"&IF(INDEX(IS9WD_SCHEDULE,' + n + ',8)="","never run",' +
        'TEXT(INDEX(IS9WD_SCHEDULE,' + n + ',8),"MMM d HH:mm"))&' +
        'IF(INDEX(IS9WD_SCHEDULE,' + n + ',9)="","","' + IS9WD_SEP + '"&' +
        'INDEX(IS9WD_SCHEDULE,' + n + ',9)),"!ERR")',
      kind: 'text',
      flag: '=IFERROR(ISNUMBER(SEARCH("fail",INDEX(IS9WD_SCHEDULE,' + n + ',9))),FALSE)'
    });
  }
  return out;
}

// A job key is a machine word. The dashboard is the one tab a person reads first, so it
// gets a sentence fragment instead.
function IS9WD_dashJobLabel_(jobKey) {
  var key = IS9WD_trim_(jobKey).toUpperCase();
  // THE KEYS ARE THE KEYS THE SCHEDULE ACTUALLY HOLDS. The first version of this map used
  // shortened names that matched none of them, so all five rows fell through to the raw
  // machine key and the card read MONDAY_ASSIGNMENTS instead of a sentence.
  var map = {
    MONDAY_ASSIGNMENTS: 'Monday assignment emails',
    DAILY_DIGEST: 'Daily digest emails',
    SUNDAY_BRIEF: 'Your Sunday brief',
    ARCHIVE_WEEK: 'Archive the week',
    RETIRE_ACCOMPLISHED: 'Retire finished tasks'
  };
  return map[key] || (IS9WD_trim_(jobKey) === '' ? 'Unnamed job' : IS9WD_trim_(jobKey));
}

// ONE REGISTRY, so no tab picks a number format or an alignment by hand. A count is an
// integer and right aligned; a date is the workbook's date key and right aligned; a rate is
// a whole percent and right aligned; text is left aligned. That is the house rule, and it
// is here rather than in six call sites because six call sites is six chances to disagree.
var IS9WD_KIND_FMT_ = {
  count: { format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT },
  rate: { format: IS9WD_FMT.PCT, align: IS9WD_ALIGN.RIGHT },
  date: { format: IS9WD_FMT.DATE_KEY, align: IS9WD_ALIGN.RIGHT },
  text: { format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT }
};

function IS9WD_dashKindStyle_(kind) {
  var want = IS9WD_trim_(kind).toLowerCase();
  return IS9WD_KIND_FMT_[want] || IS9WD_KIND_FMT_.text;
}
