/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · 03 | STATISTICS and 04 | OFFICER TABLES
 *  IS9WD_Stats.js, the only module that writes a formula onto either view
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 6A the statistics tab, 6B the officer tables,
 *          2.5 conventions, 4.6 the eight settings, 5.1 the columns both read.
 *
 *  BOTH TABS ARE VIEWS, AND THAT IS THE WHOLE DESIGN. Every cell is a formula over
 *  02 | Deliverables, 05 | Archive and 00 | Configuration. There is no new source of
 *  truth, nothing is typed, and this module never computes a number in JavaScript and
 *  writes it into a cell: a value written once is a value that is wrong the next
 *  morning. The only literals written here are the block furniture, the gate
 *  sentences, the hierarchy ordinals the officer blocks join on, and the two row
 *  counts setup actually built, which are addresses and guards rather than data.
 *
 *  NEITHER TAB MAY EVER GATE THE CANVA RUN. Readiness stays at seven gates and reads
 *  the feed alone. A broken view fails the self test and appears in the Sunday brief,
 *  and it does nothing else. The reverse would make the carousel hostage to a
 *  statistics formula, which is the one failure mode a view must not introduce.
 *
 *  ONE SOURCE, TWO VIEWS. Every count in an officer table's band row is an INDEX into
 *  a named range on 03 | Statistics rather than a second COUNTIFS, so the two tabs
 *  cannot disagree. That is the rule 4.9 already follows for the feed.
 *
 *  TWO ENTRY POINTS, ONE PER TAB, both called through IS9WD_setupCall_ so a missing
 *  push cannot take the build down:
 *    IS9WD_statsResize_(cfg)          owns 03 | Statistics for the length of the call
 *    IS9WD_officerTablesResize_(cfg)  owns 04 | Officer Tables for the length of it
 *  Statistics is built first, because the officer tables read its named ranges.
 *
 *  Rules this file keeps:
 *    · Every function ends in `_`: google.script.run exposes server globals.
 *    · Every row and column comes from IS9WD_statsLayout_ or IS9WD_otLayout_, so
 *      nothing here knows that the last rows happen to be 95 and 229 this term.
 *    · Every threshold comes from a named range. There is no number in this file that
 *      a person could disagree with.
 *    · Idempotent. Each entry point trims, wipes and repaints the tab it owns, and
 *      hands back a whole conditional format rule list rather than appending to one.
 *      Neither tab is ever typed into, so neither writer can lose an item, a token,
 *      an archive row or a log row.
 *    · Nothing is merged, on either tab. The Drive connector renders a merged cell as
 *      a repeated `[merged]` value and both tabs are inside the same read.
 *    · Every fallback is the visible sentinel `!ERR`, except in the four places where
 *      blank is the contract: an unscored rank, an unused trend row, `Not on carousel`
 *      on an officer who does not publish, and an officer with no items.
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

// `$A$1:$Y$94`, a rectangle locked both ways.
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
    // Label, value, reading. The reading sits in a 65 px column and overflows right
    // across D to L, which is why no row of either block puts content in D to L.
    KV: [
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.CLIP, bold: true },
      { align: IS9WD_ALIGN.LEFT, format: IS9WD_FMT.TEXT, wrap: IS9WD_WRAP.OVER, fg: IS9WD_ROLE.HINT_FG }
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

// The help line that rides at the end of each section band, in the band's own help
// colour. One line, and each one says what a reader would otherwise get wrong.
function IS9WD_statsBandHelp_() {
  return {
    week: 'Read these before Sunday. A plain number needs nothing; a decorated one names an action.',
    officer: 'Fourteen rows in hierarchy order. Attention is second from the left because it is the column to scan.',
    rank: 'The share of an officer\'s past-deadline items that were ticked on or before the deadline, so a busy committee is not punished for being busy.',
    trend: 'Read from 05 | Archive. Load is reliable; accomplishment is recorded only for an item that has been retired.',
    gate: 'The seven gates behind Ready for Canva. Six are a plain read of a cell that already exists, so this is not a second copy of the rule.',
    health: 'Whether the machine ran, whether it can still send, and how much room is left in the data tab.',
    job: 'Whether each job ran and whether it failed, read from the schedule block itself.'
  };
}

// ============================================================================
//  BLOCK `THIS WEEK`  (eleven numbers, each with its own threshold)
// ============================================================================

// Keyed on the machine key rather than ordered, so if the list in IS9WD_Config.js ever
// grows a row this throws on the unknown key instead of writing eleven formulas one row
// out of place, which is a failure nothing on the tab would show.
//
// Every row also writes a boolean into the hidden band, and ONE conditional format rule
// reads it. One rule instead of eleven scoped rules, and each row still owns its own
// threshold in its own helper cell.
function IS9WD_statsWeekSpec_(layout) {
  var sep = IS9WD_statsSep_();
  var load = '(IS9WD_STATS_ACTIVE_WEEK+IS9WD_STATS_DONE_WEEK)';
  var overdue = IS9WD_statsQ_(IS9WD_statsOverdueFlag_());
  var spec = {};

  // Earns its place because every number below is scoped to this week, and a reader who
  // has to guess which week is reading a different report from the one on screen.
  // Flagged out of term, where every number below is arithmetic over a week the
  // calendar does not contain.
  spec['W.WEEK'] = {
    value: '="WEEK "&IF(IS9WD_WEEK_NUMBER="","--",TEXT(IS9WD_WEEK_NUMBER,"00"))',
    reading: '=TEXT(IS9WD_WEEK_START,"ddd, mmm d")&" to "&TEXT(IS9WD_WEEK_END,"ddd, mmm d")&' +
      sep + '&IF(IS9WD_STATS_ELAPSED=0,"the week has not started yet","day "&IS9WD_STATS_ELAPSED&" of 7")',
    flag: '=NOT(IS9WD_IN_TERM)',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // The denominator a reader holds in their head, and its reading is the reconciliation
  // against the feed: the feed counts every active item whatever its deadline, so the
  // two numbers differ by design and the tab says so rather than leaving it to be
  // discovered.
  spec['W.ACTIVE'] = {
    value: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",' +
      'IS9WD_DEL_DEADLINE,">="&IS9WD_WEEK_START,IS9WD_DEL_DEADLINE,"<="&IS9WD_WEEK_END)',
    reading: '=' + IS9WD_statsFeed_('IS9WD_FEED_TOTAL') +
      '&" active in total, counting deadlines outside this week"',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // Reads the derived Active flag, never a status label. An item ticked this week whose
  // deadline was last week counts against last week's load, which is right and is
  // stated in the tab's help line.
  spec['W.DONE'] = {
    value: '=COUNTIFS(IS9WD_DEL_ACTIVE,FALSE,IS9WD_DEL_TITLE,"<>",' +
      'IS9WD_DEL_DEADLINE,">="&IS9WD_WEEK_START,IS9WD_DEL_DEADLINE,"<="&IS9WD_WEEK_END)',
    reading: '="of "&' + load + '&" entered for this week"',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // A naked completion percentage mid-week is a vanity number: it is 0% on Monday
  // morning by construction. Against the elapsed fraction of the week it becomes ahead
  // or behind, which is actionable, and the slack setting keeps it from crying on a
  // Tuesday. This is the one KPI that was rescued rather than killed.
  spec['W.PACE'] = {
    value: '=IF(' + load + '=0,"",IFERROR(IS9WD_STATS_DONE_WEEK/' + load + ',""))',
    reading: '=IF(' + load + '=0,"Nothing entered for this week",' +
      'IF(IS9WD_STATS_ELAPSED=0,"the week has not started",' +
      'IF(IS9WD_STATS_PACE>=IS9WD_STATS_ELAPSED/7,"on pace or ahead",' +
      '"behind pace by "&TEXT(IS9WD_STATS_ELAPSED/7-IS9WD_STATS_PACE,"0%"))))',
    flag: '=AND(' + load + '>0,IS9WD_STATS_ELAPSED>0,' +
      'IS9WD_STATS_PACE<IS9WD_STATS_ELAPSED/7-IS9WD_STATS_PACE_SLACK)',
    format: IS9WD_FMT.PCT, align: IS9WD_ALIGN.RIGHT
  };

  // Reads the Check column rather than restating the rule. Recomputing it here would be
  // a second definition of overdue that can drift from the flag Ethan sees on the data
  // tab. The reading names who to chase first, because a count of four is not an action.
  spec['W.OVERDUE'] = {
    value: '=COUNTIF(IS9WD_DEL_CHECK,' + overdue + ')',
    reading: '=IF(IS9WD_STATS_OVERDUE_NOW=0,"Nothing is past its deadline",' +
      '"worst is "&MAX(IS9WD_STATS_OFF_LATE)&" days late"&' + sep +
      '&IFERROR(INDEX(IS9WD_STATS_OFF_NAME,MATCH(MAX(IS9WD_STATS_OFF_LATE),IS9WD_STATS_OFF_LATE,0)),""))',
    flag: '=IS9WD_STATS_OVERDUE_NOW>0',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // Exactly what the daily digest emails out, so it says what landed in thirteen
  // inboxes this morning. Never flagged: a busy Wednesday is not a fault.
  spec['W.SOON'] = {
    value: '=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",' +
      'IS9WD_DEL_DEADLINE,">="&IS9WD_EFFECTIVE_TODAY,IS9WD_DEL_DEADLINE,"<="&IS9WD_EFFECTIVE_TODAY+1)',
    reading: '="the same window the daily digest email uses"',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // The single most actionable number on the tab, because it is Ethan's own omission
  // and nobody else's: he enters every item, so an officer with nothing entered has
  // nothing to tick and will get no Monday email. It names them rather than counting
  // them, because a count of four is not an action and four names are.
  spec['W.NOITEMS'] = {
    value: '=SUMPRODUCT(--(IS9WD_STATS_OFF_NAME<>""),--(N(IS9WD_STATS_OFF_LOAD)=0))',
    reading: '=IF(IS9WD_STATS_NO_ITEMS=0,"Every officer has something for this week",' +
      'TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF((IS9WD_STATS_OFF_NAME<>"")*' +
      '(N(IS9WD_STATS_OFF_LOAD)=0),IS9WD_STATS_OFF_NAME,""))))',
    flag: '=IS9WD_STATS_NO_ITEMS>0',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // The only available proxy for whether a private link is being used at all. The
  // caveat is in the tab's help line: a status change by Ethan from the Sheet resets it
  // too, so silence is evidence and not proof. The action is concrete either way,
  // because a link can be reissued from the menu.
  spec['W.SILENT'] = {
    value: '=SUMPRODUCT(--(IS9WD_STATS_OFF_NAME<>""),' +
      '--(N(IS9WD_STATS_OFF_SILENT_N)>=IS9WD_STATS_SILENT_DAYS))',
    reading: '=IF(IS9WD_STATS_SILENT=0,"every link has been used inside "&' +
      'IS9WD_STATS_SILENT_DAYS&" days",TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF(' +
      '(IS9WD_STATS_OFF_NAME<>"")*(N(IS9WD_STATS_OFF_SILENT_N)>=IS9WD_STATS_SILENT_DAYS),' +
      'IS9WD_STATS_OFF_NAME,""))))',
    flag: '=IS9WD_STATS_SILENT>0',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // The eight names and the `"?*"` filter are the readiness criterion's, including both
  // load bearing halves: IS9WD_DEL_PUBKEY and not IS9WD_DEL_PAGE, because page is blank
  // on any row with no rank, and `"?*"` and not `"<>"`, because Publish key is a formula
  // returning "" in every unused row. The reading reads the feed's own flag list rather
  // than re-deriving the first offender.
  spec['W.BLOCKING'] = {
    value: '=SUM(COUNTIFS(IS9WD_DEL_CHECK,' + IS9WD_statsBlockingArray_() +
      ',IS9WD_DEL_PUBKEY,"?*"))',
    reading: '=IF(IS9WD_STATS_BLOCKING=0,"nothing is blocking the carousel",' +
      'IFERROR("first is "&INDEX(IS9WD_FLAGS,1,5)&" on "&INDEX(IS9WD_FLAGS,1,6)&' +
      '" ("&INDEX(IS9WD_FLAGS,1,3)&")",' + IS9WD_statsErr_() + '))',
    flag: '=IS9WD_STATS_BLOCKING>0',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // A plain reference, no recomputation. Not flagged and given the accent instead,
  // because an item that does not fit a slide is not a mistake and the feed already
  // treats the same number that way (5.4). It earns its place as the one carousel
  // number a president acts on before Sunday: cut, reprioritise, or accept.
  spec['W.NOTPUB'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_NOTPUB'),
    reading: '=IF(N(IS9WD_STATS_PAST_CAROUSEL)=0,"every active item has a slide",' +
      'TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF(N(IS9WD_STATS_OFF_NOTPUB)>0,' +
      'IS9WD_STATS_OFF_NAME&" ("&N(IS9WD_STATS_OFF_NOTPUB)&")",""))))',
    flag: '=FALSE',
    accent: true,
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // The feed publishes the verdict but not the reason, and the Sunday brief names the
  // gate too late to fix it. The reading points at the gates block, which is a plain
  // read of each gate's own cell, so this is not a second copy of the seven gate logic.
  spec['W.READY'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_READY'),
    reading: '=IFERROR("held by: "&INDEX(IS9WD_STATS_GATE_LABEL,' +
      'MATCH("HOLD",IS9WD_STATS_GATE_STATE,0)),"all seven gates pass")',
    flag: '=RIGHT(IS9WD_STATS_READY,2)="NO"',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  return spec;
}

// ============================================================================
//  BLOCK `OPERATIONAL HEALTH`  (the same shape, the machine rather than the week)
// ============================================================================

function IS9WD_statsHealthSpec_(layout) {
  var sep = IS9WD_statsSep_();
  var spec = {};

  spec['H.READY'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_READY'),
    reading: '="the same cell the feed publishes, and the gates above name the one that holds it"',
    flag: '=RIGHT(IS9WD_STATS_READY,2)="NO"',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  spec['H.PAGES'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_PAGES'),
    reading: '="slides the carousel holds this week, out of the 20 Instagram allows"',
    flag: '=FALSE',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  spec['H.EXPORT'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_EXPORT'),
    reading: '="export these master pages, in this order"',
    flag: '=FALSE',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // Never flagged, and given the accent instead. A formula cannot know how many pages
  // the Canva master physically holds, so a test against a number in this file would be
  // either always true or always false. What it can do is print the number the master
  // must reach and say what raising a capacity number costs.
  spec['H.MASTER'] = {
    value: '=' + IS9WD_statsFeed_('IS9WD_FEED_MASTER'),
    reading: '="the Canva master must physically hold this many pages. Raising a ' +
      'capacity number needs a master rebuild before it can be used"',
    flag: '=FALSE',
    accent: true,
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // The trigger is hourly, so a gap of more than two hours is a gap. A cell that holds
  // no timestamp at all flags too, because a dispatcher that has never run is the same
  // problem earlier.
  spec['H.LASTRUN'] = {
    value: '=IS9WD_DIAG_LAST_RUN',
    reading: '=IF(ISNUMBER(IS9WD_DIAG_LAST_RUN),"the trigger runs hourly, so this ' +
      'should be inside the hour",IF(IS9WD_DIAG_LAST_RUN="","the dispatcher has not ' +
      'run yet. Install automations from the menu","this cell does not hold a timestamp"))',
    flag: '=IF(ISNUMBER(IS9WD_DIAG_LAST_RUN),NOW()-IS9WD_DIAG_LAST_RUN>2/24,TRUE)',
    format: IS9WD_FMT.STAMP, align: IS9WD_ALIGN.RIGHT
  };

  // Both states are correct during the build and wrong at go live, which is exactly
  // what a flag is for here.
  spec['H.MODE'] = {
    value: '=IF(IS9WD_AUTOMATION_ON,"ON","OFF")&' + sep + '&"test mode "&' +
      'IF(IS9WD_TEST_MODE,"ON","OFF")',
    reading: '="automation off pauses every job. Test mode sends every email to the ' +
      'admin instead of to the officers"',
    flag: '=OR(NOT(IS9WD_AUTOMATION_ON),IS9WD_TEST_MODE)',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  // Tests the summary line for the phrase the self test writes when something failed,
  // which lives in IS9WD_Config.js so the two files cannot drift.
  spec['H.SELFTEST'] = {
    value: '=IS9WD_DIAG_SELFTEST',
    reading: '=IF(IS9WD_DIAG_SELFTEST="","the self test has not been run on this ' +
      'workbook yet. Checks > Run self test","Checks > Run self test writes this line")',
    flag: '=OR(IS9WD_DIAG_SELFTEST="",NOT(ISERROR(FIND(' +
      IS9WD_statsQ_(IS9WD_SELFTEST_FAIL_MARKER_) + ',IS9WD_DIAG_SELFTEST))))',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  spec['H.QUOTA'] = {
    value: '=IS9WD_DIAG_QUOTA',
    reading: '="the quota guard stops sending below the reserve of "&IS9WD_QUOTA_RESERVE&' +
      '", rather than half sending a batch"',
    flag: '=IF(ISNUMBER(IS9WD_DIAG_QUOTA),IS9WD_DIAG_QUOTA<IS9WD_QUOTA_RESERVE,FALSE)',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  // Both overrides are silent by nature: each one makes the workbook confidently report
  // a week that is not the real one. The links line rides in the same reading, because
  // a revoked or ageing link is the other thing that fails quietly.
  spec['H.OVERRIDES'] = {
    value: '=IS9WD_DIAG_OVERRIDES',
    reading: '=COUNTIF(IS9WD_DIR_REVOKED,TRUE)&" links revoked"&' + sep + '&' +
      'SUMPRODUCT(--(N(IS9WD_DIR_ISSUED)>0),' +
      '--(IS9WD_EFFECTIVE_TODAY-N(IS9WD_DIR_ISSUED)>IS9WD_TOKEN_WARN_DAYS))&' +
      '" past the warning age"&' + sep + '&"an override makes every number above ' +
      'describe a week the calendar may not contain"',
    // The flag covers the links too. They ride in this row's reading, and a reading
    // that needs action while the row renders in plain hint grey is a row nobody acts
    // on: the numbers are already computed, only the boolean was too narrow.
    flag: '=OR(AND(IS9WD_DIAG_OVERRIDES<>"",IS9WD_DIAG_OVERRIDES<>"not set"),' +
      'COUNTIF(IS9WD_DIR_REVOKED,TRUE)>0,' +
      'SUMPRODUCT(--(N(IS9WD_DIR_ISSUED)>0),' +
      '--(IS9WD_EFFECTIVE_TODAY-N(IS9WD_DIR_ISSUED)>IS9WD_TOKEN_WARN_DAYS))>0)',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.LEFT
  };

  spec['H.ROWS'] = {
    value: '=COUNTIF(IS9WD_DEL_ID,"?*")&" of "&ROWS(IS9WD_DEL_ID)',
    reading: '="the row below carries the verdict"',
    flag: '=FALSE',
    format: IS9WD_FMT.TEXT, align: IS9WD_ALIGN.RIGHT
  };

  // The row that matters most in this block. The planning figure fills 2,000 rows in
  // about seven weeks at 280 items a week, and this turns that from a paragraph in a
  // document into a number on a screen with weeks on it.
  spec['H.ROOM'] = {
    value: '=IFERROR(ROUND((ROWS(IS9WD_DEL_ID)-COUNTIF(IS9WD_DEL_ID,"?*"))' +
      '/MAX(1,COUNTIFS(IS9WD_DEL_CREATED_AT,">="&IS9WD_EFFECTIVE_TODAY-28)/4),0),' +
      IS9WD_statsErr_() + ')',
    reading: '="at the rate of the last four weeks. Retire accomplished items to ' +
      'reclaim rows, which is the ' + 'RETIRE_ACCOMPLISHED job in the schedule below"',
    flag: '=IF(ISNUMBER(IS9WD_STATS_ROOM_WEEKS),' +
      'IS9WD_STATS_ROOM_WEEKS<IS9WD_STATS_ROOM_WEEKS_WARN,FALSE)',
    format: IS9WD_FMT.INT, align: IS9WD_ALIGN.RIGHT
  };

  return spec;
}

// ============================================================================
//  BLOCK `READINESS GATES`  (six plain reads, one pointer at this tab's own count)
// ============================================================================

// Keyed like the two blocks above. The `todo` sentence names what the gate reads and
// what to do about it in one line, because two sentences side by side in a 65 px and a
// 100 px column both clip and neither can be read.
function IS9WD_statsGateSpec_() {
  var spec = {};
  spec['G.TERM'] = {
    state: '=IF(IS9WD_IN_TERM,"PASS","HOLD")',
    todo: 'Reads In term in 00 | Configuration. A blank trimester end pauses every job, so fill the term calendar.'
  };
  spec['G.SIGNOFF'] = {
    state: '=IF(IS9WD_SIGNOFF_SET,"PASS","HOLD")',
    todo: "Reads Sign-off set for this week. Set Prepared by and Checked by in the app, which writes this week's row of the store."
  };
  spec['G.CAPACITY'] = {
    state: '=IF(' + IS9WD_statsFeed_('IS9WD_FEED_CAPCHECK') + '="OK","PASS","HOLD")',
    todo: 'Reads Capacity check on the feed. Restore the formula in the derived publishable maximum, then run Build or repair workbook.'
  };
  spec['G.PLAN'] = {
    state: '=IF(' + IS9WD_statsFeed_('IS9WD_FEED_PLANCHECK') + '="OK","PASS","HOLD")',
    todo: 'Reads Plan check on the feed. It names the committee or the page at fault, usually a carousel order.'
  };
  spec['G.FLAGCAP'] = {
    state: '=IF(' + IS9WD_statsFeed_('IS9WD_FEED_FLAGCHECK') + '="OK","PASS","HOLD")',
    todo: 'Reads Flag list check on the feed. The flag block is a budget rather than a bound, so a longer list needs Build or repair workbook.'
  };
  spec['G.ERRORS'] = {
    state: '=IF(N(' + IS9WD_statsFeed_('IS9WD_FEED_ERRORS') + ')=0,"PASS","HOLD")',
    todo: 'Reads Feed errors. Any count above zero is a broken formula or a broken named range on the feed itself.'
  };
  spec['G.BLOCKING'] = {
    state: '=IF(N(IS9WD_STATS_BLOCKING)=0,"PASS","HOLD")',
    todo: 'Reads the blocking count in THIS WEEK, so the eight flag names exist once on this tab. Fix the flagged rows on 02 | Deliverables.'
  };
  return spec;
}

// ============================================================================
//  THE ENTRY POINT FOR 03 | STATISTICS
// ============================================================================

/**
 * Sizes, paints and writes 03 | Statistics, or refuses and changes nothing. It owns
 * the whole tab for the length of the call: trim, wipe, re-point the names, paint,
 * write. Nothing on the tab is ever typed into, so a full wipe is the cheapest
 * guarantee that nothing accumulates.
 *
 * The caller holds the document lock (section 9). Nothing here takes it, because two
 * writers over one tab is the failure the lock exists for and a nested lock would
 * hide it.
 */
function IS9WD_statsResize_(cfg) {
  var conf = cfg || IS9WD_readConfig_();
  var layout = conf.stats || IS9WD_stats_();
  var sheet = IS9WD_sheet_('STATS');

  IS9WD_ensureGrid_(sheet, layout.endRow, layout.helperLastCol);
  IS9WD_statsTrim_(sheet, layout);
  IS9WD_statsWipe_(sheet, layout);

  // Names before formulas. A formula naming a range that does not exist yet reads
  // #NAME? until it does, and every block on this tab reads the officer block by name.
  var names = IS9WD_statsPointNames_(sheet, layout);

  IS9WD_statsPaintAll_(sheet, layout);
  var report = IS9WD_statsWriteAll_(sheet, conf, layout);
  report.namesPointed = names;
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
  var rows = Math.max(layout.endRow, sheet.getLastRow());
  var cols = Math.max(layout.helperLastCol, sheet.getLastColumn());
  var all = sheet.getRange(1, 1, rows, cols);
  all.clear();
  all.clearDataValidations();
  all.clearNote();
}

// Rows and columns past the layout are deleted rather than left blank. Both new tabs
// are inside the Drive connector read the Sunday run depends on, and an empty row still
// costs a row of markdown in it.
function IS9WD_statsTrim_(sheet, layout) {
  var extraRows = sheet.getMaxRows() - layout.endRow;
  if (extraRows > 0) sheet.deleteRows(layout.endRow + 1, extraRows);
  var extraCols = sheet.getMaxColumns() - layout.helperLastCol;
  if (extraCols > 0) sheet.deleteColumns(layout.helperLastCol + 1, extraCols);
}

function IS9WD_statsWriteAll_(sheet, cfg, layout) {
  var f = layout;
  IS9WD_statsFormats_(sheet, f);
  IS9WD_statsTabHelpers_(sheet, f);
  IS9WD_statsKvValues_(sheet, f, f.weekFirst, IS9WD_STATS_WEEK_ROWS,
    IS9WD_statsWeekSpec_(f), 'THIS WEEK');
  IS9WD_statsOfficers_(sheet, f);
  IS9WD_statsRanked_(sheet, f);
  IS9WD_statsTrend_(sheet, f);
  IS9WD_statsGates_(sheet, f);
  IS9WD_statsKvValues_(sheet, f, f.healthFirst, IS9WD_STATS_HEALTH_ROWS,
    IS9WD_statsHealthSpec_(f), 'OPERATIONAL HEALTH');
  IS9WD_statsJobs_(sheet, f);
  IS9WD_statsEndRow_(sheet, f);
  IS9WD_setRules_(sheet, IS9WD_statsRules_(sheet, f));

  return {
    tab: IS9WD_TAB.STATS,
    directoryRows: f.directoryRows,
    trendWeeks: f.trendWeeks,
    jobRows: f.jobRows,
    lastRow: f.endRow,
    lastCol: IS9WD_colLetter_(f.helperLastCol),
    writtenAt: IS9WD_stampText_(new Date())
  };
}

// ---------------------------------------------------------------------------
//  the tab's own two hidden cells
// ---------------------------------------------------------------------------

// Elapsed days of the week, and the trend row count setup actually built.
//
// On Sunday the week starts tomorrow, so elapsed is 0 and nothing can be behind pace,
// which is correct: Sunday's run describes the week that starts the next morning.
//
// The built count is a literal, and it is the only number on this tab written by code.
// It exists because the trend weeks setting decides a layout: raised without a rebuild
// it would spill a trend row into the spacer and produce a #REF!, and the guard note
// beside the setting in 00 | Configuration compares the two and says so.
function IS9WD_statsTabHelpers_(sheet, layout) {
  sheet.getRange(layout.elapsedCell.row, layout.elapsedCell.col)
    .setNumberFormat(IS9WD_FMT.INT)
    .setFormula('=IF(IS9WD_EFFECTIVE_TODAY<IS9WD_WEEK_START,0,' +
      'MIN(7,IS9WD_EFFECTIVE_TODAY-IS9WD_WEEK_START+1))');
  sheet.getRange(layout.trendBuiltCell.row, layout.trendBuiltCell.col)
    .setNumberFormat(IS9WD_FMT.INT)
    .setValue(layout.trendWeeks);
}

// ---------------------------------------------------------------------------
//  the two label and value blocks
// ---------------------------------------------------------------------------

// The label in A, the value in B, the reading in C and the flag boolean in the hidden
// band. Keyed on the machine key, so a list that grew a row throws here rather than
// writing eleven formulas one row out of place.
function IS9WD_statsKvValues_(sheet, layout, firstRow, rows, spec, label) {
  var labels = [];
  var values = [];
  var readings = [];
  var flags = [];
  var formats = [];
  var aligns = [];
  var accents = [];

  for (var i = 0; i < rows.length; i++) {
    var key = rows[i][0];
    var entry = spec[key];
    if (!entry) {
      throw new Error('Block ' + label + ' has no formula for the key ' + key +
        '. IS9WD_Stats.js and IS9WD_Config.js disagree about that block.');
    }
    labels.push([rows[i][1]]);
    values.push([entry.value]);
    readings.push([entry.reading]);
    flags.push([entry.flag]);
    formats.push([entry.format || IS9WD_FMT.TEXT]);
    aligns.push([entry.align || IS9WD_ALIGN.LEFT]);
    if (entry.accent) accents.push(firstRow + i);
  }

  sheet.getRange(firstRow, 1, rows.length, 1).setValues(labels);
  var value = sheet.getRange(firstRow, 2, rows.length, 1);
  value.setNumberFormats(formats);
  value.setHorizontalAlignments(aligns);
  value.setValues(values);
  sheet.getRange(firstRow, 3, rows.length, 1).setValues(readings);
  var band = sheet.getRange(firstRow, layout.helperFirstCol, rows.length, 1);
  band.setNumberFormat(IS9WD_FMT.TEXT);
  band.setValues(flags);

  // A number worth the eye that is not a fault takes the accent, which is the
  // treatment the feed already gives the same number.
  for (var a = 0; a < accents.length; a++) {
    sheet.getRange(accents[a], 2).setFontColor(IS9WD_ROLE.ACCENT_FG).setFontWeight('bold');
  }
}

// ---------------------------------------------------------------------------
//  BY OFFICER, fourteen rows in hierarchy order
// ---------------------------------------------------------------------------

// Identity comes from ONE spilling sort into the hidden band and the visible column is
// a pointer at it, so display formatting never fights the sort. Then one broadcast
// formula per metric column: COUNTIFS, SUMIFS, MINIFS, MAXIFS and SUMIF all take an
// array criterion under ARRAYFORMULA, which is what makes a fourteen row block cost one
// formula per column instead of fourteen lookups per column.
//
// The five offices are ordinary rows here, exactly as 5.4 says they are everywhere
// except Canva. Hierarchy order rather than carousel order, because hierarchy order is
// the order every list a person reads is sorted by.
function IS9WD_statsOfficers_(sheet, layout) {
  var f = layout;
  var rows = f.officerLast - f.officerFirst + 1;
  var h = f.helperFirstCol;
  var name = 'IS9WD_STATS_OFF_NAME';
  var blank = 'IF(' + name + '="","",';
  var today = 'IS9WD_EFFECTIVE_TODAY';

  // The identity sort. Five columns into M to Q, constrained to the directory's own row
  // count so a fifteenth directory row cannot silently spill into the spacer below.
  sheet.getRange(f.officerFirst, h).setFormula(
    '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({IS9WD_DIR_NAME,IS9WD_DIR_VP,' +
    'IS9WD_DIR_POSITION,IS9WD_DIR_CAROUSEL,IS9WD_DIR_HIERARCHY},IS9WD_DIR_KEY<>""),' +
    '5,TRUE),' + rows + ',5),' + IS9WD_statsErr_() + ')');

  var spill = IS9WD_statsBand_(h, f.officerFirst, f.officerLast);
  var visible = [
    // A, the officer. A pointer at the sort rather than a second lookup.
    '=ARRAYFORMULA(IF(' + spill + '="","",' + spill + '))',
    // B, Attention. One broadcast precedence string, first match wins, OK at the
    // bottom: the officer row equivalent of the workbook's own Check idiom. AND does
    // not broadcast, so the last condition multiplies instead.
    '=ARRAYFORMULA(' + blank +
      'IF(N(IS9WD_STATS_OFF_LOAD)=0,"Nothing entered for this week",' +
      'IF(N(IS9WD_STATS_OFF_OVERDUE)>0,"Overdue: "&IS9WD_STATS_OFF_OVERDUE&' +
        'IF(N(IS9WD_STATS_OFF_LATE)>=IS9WD_STATS_LATE_DAYS,", worst by "&' +
        'IS9WD_STATS_OFF_LATE&" days",""),' +
      'IF(N(IS9WD_STATS_OFF_BLOCKING)>0,"Blocked: "&IS9WD_STATS_OFF_BLOCKING&" flagged",' +
      'IF(N(IS9WD_STATS_OFF_SILENT_N)>=IS9WD_STATS_SILENT_DAYS,' +
        'IF(N(IS9WD_STATS_OFF_LASTTICK)=0,"Never ticked","Silent "&' +
        'IS9WD_STATS_OFF_SILENT_N&" days"),' +
      'IF(N(IS9WD_STATS_OFF_NOTPUB)>0,"Past the carousel by "&IS9WD_STATS_OFF_NOTPUB,' +
      'IF((IS9WD_STATS_ELAPSED>0)*(N(IS9WD_STATS_OFF_RATE)<' +
        'IS9WD_STATS_ELAPSED/7-IS9WD_STATS_PACE_SLACK),"Behind pace","OK"))))))))',
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
    // suppressed entirely below the minimum rather than printed off one item.
    '=ARRAYFORMULA(' + blank + 'COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">0",IS9WD_DEL_DEADLINE,"<"&' + today + ')))',
    // K, Avg days from creation to the last status change. One broadcast formula on the
    // identity that a sum of differences equals a difference of sums when the filter is
    // identical, which is what lets SUMIFS stand in for an AVERAGEIFS over a computed
    // range. A behaviour signal rather than a performance measure: an average near 0
    // means the officer ticks the moment Ethan enters the item, which is a data quality
    // smell worth seeing. This is the first column to cut if recalculation bites.
    '=ARRAYFORMULA(' + blank + 'IFERROR((' +
      'SUMIFS(IS9WD_DEL_STATUS_AT,IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,FALSE,' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_CREATED_AT,">0",IS9WD_DEL_STATUS_AT,">0")' +
      '-SUMIFS(IS9WD_DEL_CREATED_AT,IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,FALSE,' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_CREATED_AT,">0",IS9WD_DEL_STATUS_AT,">0"))' +
      '/COUNTIFS(IS9WD_DEL_COMMITTEE,' + name + ',IS9WD_DEL_ACTIVE,FALSE,' +
      'IS9WD_DEL_TITLE,"<>",IS9WD_DEL_CREATED_AT,">0",IS9WD_DEL_STATUS_AT,">0"),"")))',
    // L, Not on carousel. Read from the feed by carousel ordinal, never recomputed, and
    // blank by contract on an officer who does not publish.
    '=ARRAYFORMULA(' + blank + 'IF(IS9WD_STATS_OFF_CAROUSEL="","",' +
      'IFERROR(SUMIF(IS9WD_OFFICER_ORDINAL,IS9WD_STATS_OFF_CAROUSEL,IS9WD_NOTPUB),' +
      IS9WD_statsErr_() + '))))'
  ];

  for (var v = 0; v < visible.length; v++) {
    sheet.getRange(f.officerFirst, v + 1).setFormula(visible[v]);
  }

  // The hidden band, R to Y, one broadcast formula each, written in the same call as
  // the block it belongs to so a resize can never leave a helper describing the old
  // size. `9999` rather than blank in the silence column, so Silent can be compared
  // numerically without a text guard. The blocking count deliberately does not restate
  // the eight names: `"?*"` counts every non-blank Check and Overdue is subtracted, so
  // it stays correct the day a ninth flag is added.
  var helpers = [
    '=ARRAYFORMULA(' + blank + 'IS9WD_STATS_OFF_DUE+IS9WD_STATS_OFF_DONE))',
    '=ARRAYFORMULA(' + blank + 'MINIFS(IS9WD_DEL_DEADLINE,IS9WD_DEL_COMMITTEE,' + name +
      ',IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">0")))',
    '=ARRAYFORMULA(' + blank + 'MAXIFS(IS9WD_DEL_STATUS_AT,IS9WD_DEL_COMMITTEE,' + name +
      ',IS9WD_DEL_STATUS_AT,">0")))',
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
  var helperFirst = h + 5;
  for (var x = 0; x < helpers.length; x++) {
    sheet.getRange(f.officerFirst, helperFirst + x).setFormula(helpers[x]);
  }
}

// ---------------------------------------------------------------------------
//  TRACK RECORD, RANKED
// ---------------------------------------------------------------------------

// Deliberately a separate block from the officer table, because the officer table stays
// in hierarchy order and a rank number buried in hierarchy order is not a ranking
// anyone can read.
//
// The `-1` substitution is what puts an unscored officer at the bottom of a descending
// sort: an empty string sorts as text, and text sorts before numbers descending, which
// would have put every unscored officer first. It is displayed as blank, never as -1,
// and the muted rule makes the unscored block read as not applicable rather than as
// last place.
function IS9WD_statsRanked_(sheet, layout) {
  var f = layout;
  var rows = f.rankLast - f.rankFirst + 1;
  var h = f.helperFirstCol;
  var key = IS9WD_statsBand_(h, f.rankFirst, f.rankLast);
  var score = IS9WD_statsBand_(h + 1, f.rankFirst, f.rankLast);
  var judged = IS9WD_statsBand_(h + 2, f.rankFirst, f.rankLast);

  sheet.getRange(f.rankFirst, h).setFormula(
    '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({IS9WD_STATS_OFF_NAME,' +
    'ARRAYFORMULA(IF(IS9WD_STATS_OFF_ONTIME="",-1,IS9WD_STATS_OFF_ONTIME)),' +
    'IS9WD_STATS_OFF_JUDGED},IS9WD_STATS_OFF_NAME<>""),2,FALSE),' + rows + ',3),' +
    IS9WD_statsErr_() + ')');

  var body = [
    '=ARRAYFORMULA(IF(' + key + '="","",IF(' + score + '<0,"",' +
      'COUNTIFS(' + score + ',">"&' + score + ')+1)))',
    '=ARRAYFORMULA(IF(' + key + '="","",' + key + '))',
    '=ARRAYFORMULA(IF(' + key + '="","",IF(' + score + '<0,"",' + score + ')))',
    '=ARRAYFORMULA(IF(' + key + '="","",' + judged + '))',
    '=ARRAYFORMULA(IF(' + key + '="","",IF(' + score + '<0,"Fewer than "&' +
      'IS9WD_STATS_MIN_JUDGED&" of this officer\'s items have passed their deadline","")))'
  ];
  for (var i = 0; i < body.length; i++) {
    sheet.getRange(f.rankFirst, i + 1).setFormula(body[i]);
  }
}

// ---------------------------------------------------------------------------
//  TREND, and its honest limits
// ---------------------------------------------------------------------------

// What the Archive can and cannot support, because the block is designed around it.
// The snapshot path archives the feed's VISIBLE rows and the feed excludes terminal
// items, so a snapshot row's status is always active: snapshot rows structurally cannot
// say what was accomplished. Only the retire path records an accomplishment, once per
// ID, with a real deadline and a real status time. So weekly load is reliable, weekly
// accomplishment covers retired items only, and overdue at week end cannot be
// reconstructed at all and is not offered.
//
// Rows are oldest first, so the sparkline reads left to right in time.
function IS9WD_statsTrend_(sheet, layout) {
  var f = layout;
  var rows = f.trendLast - f.trendFirst + 1;
  var h = f.helperFirstCol;
  var monday = 'IS9WD_STATS_TRENDMONDAY';
  var blank = 'IF(' + monday + '="","",';
  var snapshot = IS9WD_statsQ_(IS9WD_ARCHIVE.SOURCE_SNAPSHOT);
  var retired = IS9WD_statsQ_(IS9WD_ARCHIVE.SOURCE_RETIRED);

  // The two hidden helpers. The week number lookup goes through the term calendar
  // rather than through IS9WD_TERM_START, so a week inside a previous trimester numbers
  // against its own trimester instead of against the current one.
  sheet.getRange(f.trendFirst, h + 1).setFormula(
    '=ARRAYFORMULA(IS9WD_WEEK_START-7*SEQUENCE(' + rows + ',1,' + rows + ',-1))');
  sheet.getRange(f.trendFirst, h + 2).setFormula(
    '=ARRAYFORMULA(' + blank + 'SUMIFS(IS9WD_TERM_STARTS,IS9WD_TERM_STARTS,"<="&' +
    monday + ',IS9WD_TERM_ENDS,">="&' + monday + ')))');

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
    sheet.getRange(f.trendFirst, i + 1).setFormula(body[i]);
  }

  // Column E is the one per-row block on this tab. SUMPRODUCT compares two ranges row
  // by row, which no broadcast criterion can express, and the comparison is against the
  // end of the deadline day for the reason 5.3 gives.
  var onTime = [];
  for (var r = 0; r < rows; r++) {
    var row = f.trendFirst + r;
    var start = IS9WD_statsRef_(2, row);
    var done = IS9WD_statsRef_(4, row);
    onTime.push(['=IF(' + start + '="","",IFERROR(SUMPRODUCT(' +
      '(IS9WD_ARC_SOURCE=' + retired + ')' +
      '*(INT(N(IS9WD_ARC_DEADLINE))>=' + start + ')' +
      '*(INT(N(IS9WD_ARC_DEADLINE))<=' + start + '+6)' +
      '*(N(IS9WD_ARC_STATUS_AT)>0)' +
      '*(N(IS9WD_ARC_STATUS_AT)<INT(N(IS9WD_ARC_DEADLINE))+1))/' + done + ',""))']);
  }
  sheet.getRange(f.trendFirst, 5, rows, 1).setValues(onTime);

  // The sparkline row. An empty block becomes an instruction rather than a wall of
  // zeros, and the sparkline cell renders as one labelled blank cell in a connector
  // read, which the tab's help line says.
  var recorded = IS9WD_statsBand_(6, f.trendFirst, f.trendLast);
  var published = IS9WD_statsBand_(3, f.trendFirst, f.trendLast);
  sheet.getRange(layout.sparkRow, 1).setFormula(
    '="Load over the last "&IS9WD_STATS_TREND_WEEKS&" weeks"');
  sheet.getRange(layout.sparkRow, 3).setFormula(
    '=IF(COUNTIF(' + recorded + ',"Not archived")=ROWS(' + recorded + '),"",' +
    'SPARKLINE(' + published + ',{"charttype","column";"color",' +
    IS9WD_statsQ_(IS9WD_ROLE.HEAD_BG) + ';"empty","zero"}))');
  sheet.getRange(layout.sparkRow, 4).setFormula(
    '=IF(COUNTIF(' + recorded + ',"Not archived")=0,"",' +
    'COUNTIF(' + recorded + ',"Not archived")&" of "&ROWS(' + recorded + ')&' +
    '" weeks were never archived. Switch ARCHIVE_WEEK on in 00 | Configuration, or ' +
    'run Archive this week from the menu.")');
}

// ---------------------------------------------------------------------------
//  READINESS GATES
// ---------------------------------------------------------------------------

function IS9WD_statsGates_(sheet, layout) {
  var f = layout;
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
  sheet.getRange(f.gateFirst, 1, rows, 1).setValues(labels);
  sheet.getRange(f.gateFirst, 2, rows, 1).setValues(states);
  sheet.getRange(f.gateFirst, 3, rows, 1).setValues(todos);
}

// ---------------------------------------------------------------------------
//  SCHEDULED JOBS
// ---------------------------------------------------------------------------

// What replaces v1's idea of counting emails sent: whether the Monday job ran and
// whether it failed is actionable, and how many messages it sent is not. Four spills
// out of the schedule's own named range, so this block cannot disagree with it.
function IS9WD_statsJobs_(sheet, layout) {
  var f = layout;
  var cols = [1, 8, 6, 9];
  for (var i = 0; i < cols.length; i++) {
    sheet.getRange(f.jobFirst, i + 1).setFormula(
      '=ARRAYFORMULA(INDEX(IS9WD_SCHEDULE,0,' + cols[i] + '))');
  }
}

// ---------------------------------------------------------------------------
//  the end row
// ---------------------------------------------------------------------------

// The end marker, this tab's own error count, and the one check that can tell a stale
// copy of the gate list from a correct one.
//
// Both numbers fail the SELF TEST and appear in the Sunday brief, and they do nothing
// else. A view that breaks must not stop publication.
function IS9WD_statsEndRow_(sheet, layout) {
  var f = layout;
  var scan = IS9WD_statsBox_(1, 1, f.helperLastCol, f.scanLastRow);
  sheet.getRange(f.endRow, 1).setValue(IS9WD_STATS.END);
  sheet.getRange(f.endRow, 2).setValue('End of tab');
  sheet.getRange(f.errorsCell.row, f.errorsCell.col)
    .setNumberFormat(IS9WD_FMT.INT)
    .setFormula('=SUMPRODUCT(--ISERROR(' + scan + '))+' +
      'SUMPRODUCT(--(' + scan + '=' + IS9WD_statsErr_() + '))');
  sheet.getRange(f.agreeCell.row, f.agreeCell.col).setFormula(
    '=IF((COUNTIF(IS9WD_STATS_GATE_STATE,"HOLD")>0)=(RIGHT(IS9WD_STATS_READY,2)="NO"),' +
    '"OK","Gates disagree with Ready for Canva")');
}

// ============================================================================
//  PAINTERS FOR 03 | STATISTICS
// ============================================================================

// Every block's number format, set before one value is written. It looks like styling
// and is not: a week number written as `04` into a General cell becomes the number 4,
// and a date written into a General cell becomes a serial nobody can read.
function IS9WD_statsFormats_(sheet, layout) {
  var f = layout;
  var cols = IS9WD_statsCols_();
  var tables = [
    [f.weekFirst, f.weekLast, cols.KV],
    [f.officerFirst, f.officerLast, cols.OFFICER],
    [f.rankFirst, f.rankLast, cols.RANKED],
    [f.trendFirst, f.trendLast, cols.TREND],
    [f.gateFirst, f.gateLast, cols.GATES],
    [f.healthFirst, f.healthLast, cols.KV],
    [f.jobFirst, f.jobLast, cols.JOBS]
  ];
  for (var t = 0; t < tables.length; t++) {
    var first = tables[t][0];
    var rows = tables[t][1] - first + 1;
    var spec = tables[t][2];
    if (rows < 1) continue;
    for (var i = 0; i < spec.length; i++) {
      sheet.getRange(first, 1 + i, rows, 1)
        .setNumberFormat(spec[i].format || IS9WD_FMT.TEXT);
    }
  }
  // The hidden band, which mixes text, a date, a timestamp and nine counts. A column
  // here carries different things in different blocks, so the format is the one that
  // makes the column readable when a developer unhides it: a number format changes how
  // a cell displays and never what it holds, so no formula reading the band is affected.
  var band = [IS9WD_FMT.TEXT, IS9WD_FMT.INT, IS9WD_FMT.TEXT, IS9WD_FMT.INT,
    IS9WD_FMT.INT, IS9WD_FMT.INT, IS9WD_FMT.DATE_KEY, IS9WD_FMT.STAMP,
    IS9WD_FMT.INT, IS9WD_FMT.INT, IS9WD_FMT.INT, IS9WD_FMT.INT, IS9WD_FMT.INT];
  for (var b = 0; b < band.length; b++) {
    sheet.getRange(1, f.helperFirstCol + b, f.endRow, 1).setNumberFormat(band[b]);
  }
  sheet.getRange(f.sparkRow, 1, 1, f.lastCol).setNumberFormat(IS9WD_FMT.TEXT);
  sheet.getRange(f.endRow, 1, 1, f.lastCol).setNumberFormat(IS9WD_FMT.TEXT);
  sheet.getRange(f.errorsCell.row, f.errorsCell.col).setNumberFormat(IS9WD_FMT.INT);
}

function IS9WD_statsPaintAll_(sheet, layout) {
  var f = layout;
  var cols = IS9WD_statsCols_();
  var help = IS9WD_statsBandHelp_();

  sheet.getRange(1, 1, f.endRow, f.helperLastCol).setFontFamily(IS9WD_FONT);
  IS9WD_paintBanner_(sheet, f.bannerRow, f.firstCol, f.lastCol, IS9WD_STATS.BANNER);
  IS9WD_paintHelp_(sheet, f.helpRow, f.firstCol, f.lastCol, IS9WD_STATS.HELP);

  IS9WD_statsBlock_(sheet, f, f.weekBand, 'THIS WEEK', help.week,
    IS9WD_STATS_HEADERS.KV, f.weekFirst, f.weekLast, cols.KV);
  IS9WD_statsBlock_(sheet, f, f.officerBand, 'BY OFFICER', help.officer,
    IS9WD_STATS_HEADERS.OFFICER, f.officerFirst, f.officerLast, cols.OFFICER);
  IS9WD_statsBlock_(sheet, f, f.rankBand, 'TRACK RECORD, RANKED', help.rank,
    IS9WD_STATS_HEADERS.RANKED, f.rankFirst, f.rankLast, cols.RANKED);
  IS9WD_statsBlock_(sheet, f, f.trendBand,
    'TREND, LAST ' + f.trendWeeks + ' WEEKS', help.trend,
    IS9WD_STATS_HEADERS.TREND, f.trendFirst, f.trendLast, cols.TREND);
  IS9WD_statsBlock_(sheet, f, f.gateBand, 'READINESS GATES', help.gate,
    IS9WD_STATS_HEADERS.GATES, f.gateFirst, f.gateLast, cols.GATES);
  IS9WD_statsBlock_(sheet, f, f.healthBand, 'OPERATIONAL HEALTH', help.health,
    IS9WD_STATS_HEADERS.KV, f.healthFirst, f.healthLast, cols.KV);
  IS9WD_statsBlock_(sheet, f, f.jobBand, 'SCHEDULED JOBS', help.job,
    IS9WD_STATS_HEADERS.JOBS, f.jobFirst, f.jobLast, cols.JOBS);

  // The sparkline row reads as a caption rather than as data, so it takes the band's
  // height and the hint colour instead of the banding.
  IS9WD_style_(sheet.getRange(f.sparkRow, 1, 1, f.lastCol), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(f.sparkRow, IS9WD_ROW_H.BAND);

  // The end row, which is the tab's own footer: the marker, the error count and the
  // gate agreement, all in the band's help colour on the band fill so it reads as the
  // end of the document rather than as one more row of data.
  IS9WD_style_(sheet.getRange(f.endRow, 1, 1, f.lastCol), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.BAND_HELP_FG, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
  });
  IS9WD_style_(sheet.getRange(f.endRow, 1), {
    size: IS9WD_SIZE.BAND, fg: IS9WD_ROLE.BAND_FG, bold: true,
    bg: IS9WD_ROLE.BAND_BG, align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER,
    format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(f.endRow, IS9WD_ROW_H.DATA);

  IS9WD_statsSpacers_(sheet, f.spacerRows, f.helperLastCol);
  IS9WD_statsPaintHelperBand_(sheet, f);
  IS9WD_statsChrome_(sheet, f);
}

// One band, one header row, one banded body. The band is 34 px, the header 30 and a
// data row 26, which is what makes a block read as a block.
function IS9WD_statsBlock_(sheet, layout, bandRow, title, help, headers, firstRow,
  lastRow, cols) {
  IS9WD_paintBand_(sheet, bandRow, layout.firstCol, layout.lastCol, title, help);
  IS9WD_paintHeader_(sheet, bandRow + 1, layout.firstCol, headers);
  var rows = lastRow - firstRow + 1;
  if (rows < 1) return;
  var body = sheet.getRange(firstRow, 1, rows, headers.length);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
  IS9WD_applyColumnStyles_(sheet, firstRow, rows, 1, cols);
  IS9WD_statsTints_(sheet, firstRow, rows, cols);
  IS9WD_setDataHeights_(sheet, firstRow, rows);
  IS9WD_banding_(body);
}

// Font colour and weight per column, which IS9WD_applyColumnStyles_ deliberately does
// not touch.
function IS9WD_statsTints_(sheet, firstRow, rows, cols) {
  if (rows < 1) return;
  for (var i = 0; i < cols.length; i++) {
    if (!cols[i].fg && !cols[i].bold) continue;
    var range = sheet.getRange(firstRow, i + 1, rows, 1);
    if (cols[i].fg) range.setFontColor(cols[i].fg);
    if (cols[i].bold) range.setFontWeight('bold');
  }
}

// A 12 px blank row between blocks, with no fill of its own, so a block reads as a
// block rather than as part of the next one.
function IS9WD_statsSpacers_(sheet, rows, lastCol) {
  for (var i = 0; i < rows.length; i++) {
    sheet.getRange(rows[i], 1, 1, lastCol).setBackground(null);
    sheet.setRowHeight(rows[i], IS9WD_ROW_H.SPACER);
  }
}

// The whole hidden band in one call, so a helper cell can never be left in body type
// where it would read as content if the column were unhidden.
function IS9WD_statsPaintHelperBand_(sheet, layout) {
  var width = layout.helperLastCol - layout.helperFirstCol + 1;
  IS9WD_style_(sheet.getRange(1, layout.helperFirstCol, layout.endRow, width), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
}

function IS9WD_statsChrome_(sheet, layout) {
  IS9WD_setWidths_(sheet, 'STATS');
  // Shown before hidden, or a column a past layout hid stays hidden forever.
  sheet.showColumns(1, layout.helperLastCol);
  IS9WD_hideCols_(sheet, 'STATS');
  IS9WD_freezeTab_(sheet, 'STATS');
  sheet.setTabColor(IS9WD_TAB_COLOR.STATS);
}

// Returns the list rather than applying it, so the caller replaces the whole list in
// one call and nothing is ever appended. Colours are roles: a blocking state is always
// bold #724485 on #e9ebd4 and a superseded row is always #8b74a1, here and on every
// other tab.
function IS9WD_statsRules_(sheet, layout) {
  var f = layout;
  var flag = { fg: IS9WD_ROLE.FLAG_FG, bg: IS9WD_ROLE.FLAG_BG, bold: true };
  var muted = { fg: IS9WD_ROLE.MUTED_FG };
  var accent = { fg: IS9WD_ROLE.ACCENT_FG, bold: true };
  var rules = [];
  var h = f.helperFirstCol;

  // First, so it wins on any cell it touches: the visible sentinel this tab uses
  // instead of swallowing an error into a blank.
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(1, 1, f.endRow, f.helperLastCol)],
    '=A1=' + IS9WD_statsErr_(), flag));

  // The two label and value blocks, one rule each rather than eleven scoped rules.
  var kv = [[f.weekFirst, f.weekLast], [f.healthFirst, f.healthLast]];
  for (var k = 0; k < kv.length; k++) {
    var first = kv[k][0];
    var rows = kv[k][1] - first + 1;
    rules.push(IS9WD_ruleFormula_(
      [sheet.getRange(first, 2, rows, 2)],
      '=' + IS9WD_statsRef_(h, first) + '=TRUE', flag));
  }

  // BY OFFICER. Attention is the column Ethan scans, so it is the one that shouts.
  var oRows = f.officerLast - f.officerFirst + 1;
  var o = f.officerFirst;
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 2, oRows, 1)],
    '=AND(' + IS9WD_statsRef_(2, o) + '<>"",' + IS9WD_statsRef_(2, o) + '<>"OK")', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 6, oRows, 1)],
    '=N(' + IS9WD_statsRef_(6, o) + ')>0', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 7, oRows, 1)],
    '=N(' + IS9WD_statsRef_(7, o) + ')>=IS9WD_STATS_LATE_DAYS', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 8, oRows, 1)],
    '=OR(' + IS9WD_statsRef_(8, o) + '="never",N(' + IS9WD_statsRef_(8, o) +
    ')>=IS9WD_STATS_SILENT_DAYS)', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 5, oRows, 1)],
    '=AND(' + IS9WD_statsRef_(3, o) + '+' + IS9WD_statsRef_(4, o) + '>0,' +
    'IS9WD_STATS_ELAPSED>0,' + IS9WD_statsRef_(5, o) +
    '<IS9WD_STATS_ELAPSED/7-IS9WD_STATS_PACE_SLACK)', flag));
  // A committee that finished its whole week is the one good state this tab decorates,
  // and it takes the accent rather than a flag colour, because it is not a fault.
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 5, oRows, 1)],
    '=AND(' + IS9WD_statsRef_(3, o) + '+' + IS9WD_statsRef_(4, o) + '>0,' +
    IS9WD_statsRef_(5, o) + '=1)', accent));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 9, oRows, 1)],
    '=AND(' + IS9WD_statsRef_(9, o) + '<>"",' + IS9WD_statsRef_(9, o) +
    '<IS9WD_STATS_ONTIME_TARGET)', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(o, 12, oRows, 1)],
    '=N(' + IS9WD_statsRef_(12, o) + ')>0', accent));

  // The ranked block's unscored tail reads as not applicable rather than as last place.
  var rRows = f.rankLast - f.rankFirst + 1;
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.rankFirst, 1, rRows, IS9WD_STATS_HEADERS.RANKED.length)],
    '=' + IS9WD_statsRef_(5, f.rankFirst) + '<>""', muted));

  // The trend block. A week nothing ever archived is muted, because it is missing
  // rather than empty; a week with a snapshot and no retirement takes the accent.
  var tRows = f.trendLast - f.trendFirst + 1;
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.trendFirst, 1, tRows, IS9WD_STATS_HEADERS.TREND.length)],
    '=' + IS9WD_statsRef_(6, f.trendFirst) + '="Not archived"', muted));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(f.trendFirst, 6, tRows, 1)],
    '=' + IS9WD_statsRef_(6, f.trendFirst) + '="Snapshot only"', accent));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(f.sparkRow, 4)],
    '=' + IS9WD_statsCell_(4, f.sparkRow) + '<>""', flag));

  // The gates.
  var gRows = f.gateLast - f.gateFirst + 1;
  rules.push(IS9WD_ruleFormula_(
    [sheet.getRange(f.gateFirst, 1, gRows, IS9WD_STATS_HEADERS.GATES.length)],
    '=' + IS9WD_statsRef_(2, f.gateFirst) + '="HOLD"', flag));

  // The jobs. A failed run shouts; a job that is switched off is superseded and not
  // broken, which is the distinction the two treatments carry everywhere else.
  var jRows = f.jobLast - f.jobFirst + 1;
  var jCols = IS9WD_STATS_HEADERS.JOBS.length;
  rules.push(IS9WD_ruleFormula_([sheet.getRange(f.jobFirst, 1, jRows, jCols)],
    '=AND(' + IS9WD_statsRef_(4, f.jobFirst) + '<>"",LOWER(' +
    IS9WD_statsRef_(4, f.jobFirst) + ')<>"ok")', flag));
  rules.push(IS9WD_ruleFormula_([sheet.getRange(f.jobFirst, 1, jRows, jCols)],
    '=' + IS9WD_statsRef_(3, f.jobFirst) + '=FALSE', muted));

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
 * Sizes, paints and writes 04 | Officer Tables: fourteen structurally identical blocks,
 * one per directory entry, in hierarchy order. It owns the whole tab for the length of
 * the call, exactly as IS9WD_statsResize_ owns its own.
 *
 * It must run after IS9WD_statsResize_, because every count in a band row is an INDEX
 * into a named range on 03 | Statistics. That is what stops the two views disagreeing,
 * and it is why this is the second of the two calls rather than the first.
 */
function IS9WD_officerTablesResize_(cfg) {
  var conf = cfg || IS9WD_readConfig_();
  var layout = conf.ot || IS9WD_officerTables_();
  var sheet = IS9WD_sheet_('TABLES');

  IS9WD_ensureGrid_(sheet, layout.endRow, layout.lastCol);
  IS9WD_otTrim_(sheet, layout);
  IS9WD_otWipe_(sheet, layout);
  var names = IS9WD_otPointNames_(sheet, layout);
  IS9WD_otPaintAll_(sheet, layout);
  var report = IS9WD_otWriteAll_(sheet, layout);
  report.namesPointed = names;
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
  var rows = Math.max(layout.endRow, sheet.getLastRow());
  var cols = Math.max(layout.lastCol, sheet.getLastColumn());
  var all = sheet.getRange(1, 1, rows, cols);
  all.clear();
  all.clearDataValidations();
  all.clearNote();
}

function IS9WD_otTrim_(sheet, layout) {
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
// fourteen blocks below cannot be trusted to show, so nobody has to scroll to the
// bottom of the tab to find out that something was left out.
function IS9WD_otSummaryRow_(sheet, layout) {
  var shown = '(IS9WD_OT_ROWS_BUILT-1)';
  sheet.getRange(layout.summaryRow, 1).setFormula(
    '=IF(SUMPRODUCT(--(N(IS9WD_STATS_OFF_TOTAL)>' + shown + '))=0,' +
    '"Every officer\'s full list fits below.",' +
    '"Not shown below: "&TEXTJOIN(", ",TRUE,ARRAYFORMULA(IF(' +
    'N(IS9WD_STATS_OFF_TOTAL)>' + shown + ',IS9WD_STATS_OFF_NAME&" ("&' +
    '(N(IS9WD_STATS_OFF_TOTAL)-' + shown + ')&")","")))&' +
    '". Raise Rows reserved per officer in 00 | Configuration, then run Build or ' +
    'repair workbook.")');
  // The reserved row count setup actually built, so the guard note beside the setting
  // in 00 | Configuration has something to compare against. The only literal on the
  // tab besides the fourteen ordinals.
  sheet.getRange(layout.rowsBuiltCell.row, layout.rowsBuiltCell.col)
    .setNumberFormat(IS9WD_FMT.INT)
    .setValue(layout.officerRows);
}

// One block: the band line, the hierarchy ordinal it joins on, one spilling item
// formula and one overflow notice.
function IS9WD_otBlockValues_(sheet, layout, block) {
  var ord = IS9WD_statsRef_(layout.keyCol, block.bandRow);
  var shown = '(IS9WD_OT_ROWS_BUILT-1)';
  var sep = IS9WD_statsSep_();

  // The ordinal is a literal, written once by setup, and it is what lets fourteen
  // structurally identical blocks share one formula shape. It is the feed's own device
  // for the same job.
  sheet.getRange(block.bandRow, layout.keyCol)
    .setNumberFormat(IS9WD_FMT.INT)
    .setValue(block.ordinal);

  // The band line. Every count in it is an INDEX into 03 | Statistics rather than a
  // second COUNTIFS, so the two views cannot disagree, and the counts are the
  // all-items window, which the tab's help line says.
  sheet.getRange(block.bandRow, 1).setFormula(
    '=IF(' + ord + '="",' + IS9WD_statsErr_() + ',' +
    'UPPER(INDEX(IS9WD_STATS_OFF_NAME,' + ord + '))&' + sep + '&' +
    'UPPER(INDEX(IS9WD_STATS_OFF_POSITION,' + ord + '))&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_VP,' + ord + ')&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_ACTIVE_ALL,' + ord + ')&" active"&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_DONE_ALL,' + ord + ')&" done"&' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_OVERDUE,' + ord + ')&" overdue"&' +
    'IF(N(INDEX(IS9WD_STATS_OFF_NOTPUB,' + ord + '))>0,' + sep + '&' +
    'INDEX(IS9WD_STATS_OFF_NOTPUB,' + ord + ')&" past the carousel","")&' +
    'IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))=0,' + sep +
    '&"no deliverables entered","")&' +
    'IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))>' + shown + ',' + sep + '&' +
    '(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))-' + shown + ')&' +
    '" not shown below",""))');

  // The item spill, one formula per block. Four things in it are load bearing, and all
  // four are the reason it is one formula rather than ninety-six lookups.
  //
  // The sort key is ONE column rather than three sort arguments: `0` or `1` for active
  // or done, then the deadline serial zero padded to six digits, then the ID. The whole
  // ordering rule is legible in one expression, and a blank deadline gives `000000` and
  // sorts first, which matches the feed's deliberate choice to put an item nobody can
  // date at the top rather than buried.
  //
  // Both computed columns are wrapped in ARRAYFORMULA, because IF and & do not
  // broadcast over a range inside an array literal: without the wrapper each column
  // collapses to a scalar, the `{}` literal fails on a size mismatch, and the block
  // goes permanently and silently blank.
  //
  // The key is the last column and hidden, so the display columns stay in reading
  // order with no CHOOSECOLS, which keeps this to classic functions like every other
  // formula in the workbook.
  //
  // And the IF on the total means one cell returns either a sentence or an array, so an
  // officer with nothing does not need a second cell and does not read as twelve blank
  // banded rows.
  sheet.getRange(block.itemFirst, 1).setFormula(
    '=IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))=0,' +
    '"No deliverables entered for this officer.",' +
    'IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({IS9WD_DEL_TITLE,IS9WD_DEL_DEADLINE,' +
    'ARRAYFORMULA(IF(N(IS9WD_DEL_DEADLINE)>0,INT(N(IS9WD_DEL_DEADLINE))-' +
    'IS9WD_EFFECTIVE_TODAY,"")),IS9WD_DEL_STATUS,IS9WD_DEL_CHECK,IS9WD_DEL_REMARK,' +
    'IS9WD_DEL_ID,ARRAYFORMULA(IF(IS9WD_DEL_TITLE="","",' +
    'IF(IS9WD_DEL_ACTIVE=TRUE,"0","1")&TEXT(INT(N(IS9WD_DEL_DEADLINE)),"000000")&' +
    'IS9WD_DEL_ID))},(IS9WD_DEL_COMMITTEE=INDEX(IS9WD_STATS_OFF_NAME,' + ord + '))' +
    '*(IS9WD_DEL_TITLE<>"")),8,TRUE),' + layout.itemRows + ',8),""))');

  // The notice row. ARRAY_CONSTRAIN alone would have dropped the rest without a word,
  // which is the one thing this tab is not allowed to do.
  sheet.getRange(block.noticeRow, 1).setFormula(
    '=IF(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))<=' + shown + ',"",' +
    '"+ "&(N(INDEX(IS9WD_STATS_OFF_TOTAL,' + ord + '))-' + shown + ')&' +
    '" more not shown here. Raise Rows reserved per officer in 00 | Configuration, ' +
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

function IS9WD_otPaintAll_(sheet, layout) {
  var o = layout;
  var cols = IS9WD_statsCols_().OT;

  sheet.getRange(1, 1, o.endRow, o.lastCol).setFontFamily(IS9WD_FONT);
  IS9WD_paintBanner_(sheet, o.bannerRow, o.firstCol, o.visibleLastCol, IS9WD_OT.BANNER);
  IS9WD_paintHelp_(sheet, o.helpRow, o.firstCol, o.visibleLastCol, IS9WD_OT.HELP);

  // The summary row is a rule rather than a caption, so it takes the hint colour and a
  // data row's height and sits directly under the help line inside the frozen pane.
  IS9WD_style_(sheet.getRange(o.summaryRow, 1, 1, o.visibleLastCol), {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(o.summaryRow, IS9WD_ROW_H.DATA);

  for (var i = 0; i < o.blocks.length; i++) {
    IS9WD_otPaintBlock_(sheet, o, o.blocks[i], cols);
  }

  IS9WD_statsSpacers_(sheet, o.spacerRows, o.lastCol);

  IS9WD_style_(sheet.getRange(o.endRow, 1, 1, o.visibleLastCol), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.BAND_HELP_FG, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
  });
  IS9WD_style_(sheet.getRange(o.endRow, 1), {
    size: IS9WD_SIZE.BAND, fg: IS9WD_ROLE.BAND_FG, bold: true, bg: IS9WD_ROLE.BAND_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(o.endRow, IS9WD_ROW_H.DATA);

  // The hidden sort key column, top to bottom.
  IS9WD_style_(sheet.getRange(1, o.keyCol, o.endRow, 1), {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP, format: IS9WD_FMT.TEXT
  });

  IS9WD_setWidths_(sheet, 'TABLES');
  sheet.showColumns(1, o.lastCol);
  IS9WD_hideCols_(sheet, 'TABLES');
  IS9WD_freezeTab_(sheet, 'TABLES');
  sheet.setTabColor(IS9WD_TAB_COLOR.TABLES);
}

// One officer's table. The band is one cell of text running across a filled span, which
// is how the bar look is achieved without the connector printing `[merged]` repeats.
// Banding covers the item rows only, so the notice row and the spacer stay plain and
// the block reads as a table with a heading rather than as a stripe that never ends.
function IS9WD_otPaintBlock_(sheet, layout, block, cols) {
  IS9WD_paintBand_(sheet, block.bandRow, layout.firstCol, layout.visibleLastCol, '', '');
  IS9WD_paintHeader_(sheet, block.headerRow, layout.firstCol, IS9WD_OT_HEADERS);

  var rows = layout.itemRows;
  var body = sheet.getRange(block.itemFirst, 1, rows, layout.visibleLastCol);
  IS9WD_style_(body, {
    size: IS9WD_SIZE.BODY, fg: IS9WD_ROLE.BODY_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.CLIP
  });
  IS9WD_applyColumnStyles_(sheet, block.itemFirst, rows, 1, cols);
  IS9WD_statsTints_(sheet, block.itemFirst, rows, cols);
  IS9WD_setDataHeights_(sheet, block.itemFirst, rows);
  IS9WD_banding_(body);

  var notice = sheet.getRange(block.noticeRow, 1, 1, layout.visibleLastCol);
  IS9WD_style_(notice, {
    size: IS9WD_SIZE.HINT, fg: IS9WD_ROLE.HINT_FG, bg: IS9WD_ROLE.BODY_BG,
    align: IS9WD_ALIGN.LEFT, wrap: IS9WD_WRAP.OVER, format: IS9WD_FMT.TEXT
  });
  sheet.setRowHeight(block.noticeRow, IS9WD_ROW_H.DATA);
}

// Five rules per block plus the sentinel rule. Per block rather than one multi-range
// rule per treatment, because a multi-range rule's relative anchor across fourteen
// ranges is undocumented, and getting it wrong would mute the wrong rows on a tab whose
// muting is the acceptance check for not keying on a status label.
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
    var whole = [sheet.getRange(b.itemFirst, 1, rows, layout.visibleLastCol)];
    var flagCol = [sheet.getRange(b.itemFirst, 5, rows, 1)];
    var flagRef = IS9WD_statsRef_(5, b.itemFirst);
    var daysRef = IS9WD_statsRef_(3, b.itemFirst);
    var keyRef = IS9WD_statsRef_(layout.keyCol, b.itemFirst);

    // A blocking flag first, then Overdue, so a row that is both reads as blocked.
    rules.push(IS9WD_ruleFormula_(flagCol,
      '=AND(' + flagRef + '<>"",' + flagRef + '<>' + overdue + ')', flag));
    rules.push(IS9WD_ruleFormula_(flagCol, '=' + flagRef + '=' + overdue, flag));
    // Scoped to Days left so it cannot collide with the flag rule beside it.
    rules.push(IS9WD_ruleFormula_([sheet.getRange(b.itemFirst, 3, rows, 1)],
      '=AND(' + daysRef + '<>"",N(' + daysRef + ')<0)', accent));
    // An accomplished row reads muted across all seven columns, and the rule reads the
    // FIRST CHARACTER OF THE SORT KEY, which derives from the Active flag. Nothing here
    // keys on the word Accomplished: the Status column carries the label as display and
    // never as a key, so renaming the status in Configuration changes nothing.
    rules.push(IS9WD_ruleFormula_(whole, '=LEFT(' + keyRef + ',1)="1"', muted));
    rules.push(IS9WD_ruleFormula_([sheet.getRange(b.noticeRow, 1, 1, layout.visibleLastCol)],
      '=' + IS9WD_statsCell_(1, b.noticeRow) + '<>""', flag));
  }
  return rules;
}
