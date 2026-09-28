/**
 * IS9WD_Archive.js - the two jobs that write 06 | Archive. Phase 8.
 *
 * TWO WRITERS, TWO DIFFERENT JOBS, because one job cannot do both (reference 10.1). The
 * snapshot path, ARCHIVE_WEEK, records what the carousel published: one row per item on a
 * slide, keyed on the week's Monday plus the ID, so a still active item appears once per week
 * it was published, by design. The retire path, RETIRE_ACCOMPLISHED, records accomplishment
 * exactly once per ID and then clears the row on 03 | Deliverables to reclaim it. The feed
 * excludes terminal items, so a snapshot only archive could never say what got done, and
 * accomplished rows would sit on the data tab until the 2,000 filled.
 *
 * THE TREND BLOCK READS THIS TAB, and that fixes the shape of every row written here. Its
 * Published column counts snapshot rows whose Week start equals the trend week's Monday, its
 * Accomplished column counts retired rows whose Deadline falls inside that week, and On time
 * compares Status at with the end of the deadline day. So Week start is a midnight Date on
 * the Monday, Deadline is the real date and not the rendered text, Status at is the real
 * stamp, and Source is one of the two strings IS9WD_ARCHIVE declares. Nothing here is typed
 * twice: the column offsets come from the layout's headers.
 *
 * NEVER PAST THE SPAN. The six named ranges the trend reads span a declared grid, and a row
 * appended past it is a row the trend cannot see. Both jobs read the live span from the
 * named range, append only what fits inside it, and say in their last line when something
 * did not fit or when the free rows have dropped under the layout's minimum. Build or repair
 * workbook is what grows the span, because re-pointing a name from here would mean dropping
 * it, and dropping a named range rewrites every formula that uses it to #REF! for good.
 *
 * A ROW IS CLEARED, NEVER DELETED. Deleting a row on 03 | Deliverables would shrink every
 * named range that contains it and renumber every row below it, so the retire path clears
 * A to I through IS9WD_itemsClearRow_ and only after the item's archive row exists. A row
 * whose archive row did not fit stays where it is and is named in the report.
 *
 * NOTHING KEYS ON A STATUS LABEL. Terminal is the derived Active flag reading FALSE for a
 * status the Configuration list marks terminal. A status the list does not know is held
 * rather than retired, because a mistyped label is a row somebody has to look at, not a row
 * to clear.
 *
 * A WEEK SATURDAY MISSED IS RE-TAKEN THROUGH THE TODAY OVERRIDE. ARCHIVE_WEEK keys on
 * cfg.weeks.weekStart, the Monday of the week containing tomorrow, so from Sunday a plain
 * re-run archives the new week under its own key and the week that ended is never written.
 * The dispatcher marks a window used on a throw (reference 8.2), so a job the lock refused
 * on Saturday does not retry by itself, and by the time the mail or the schedule row is read
 * the week has rolled over. So every instruction this module prints for a re-run, and the
 * error the snapshot job throws, say to set the override to that Saturday first and to clear
 * it after, because every job is paused while it is set (IS9WD_dispatch_).
 */

'use strict';

var IS9WD_ARCHIVE_JOB_WEEK_ = 'ARCHIVE_WEEK';
var IS9WD_ARCHIVE_JOB_RETIRE_ = 'RETIRE_ACCOMPLISHED';

// ============================================================================
//  PURE HELPERS  (no Apps Script global, tested in test/archive.test.js)
// ============================================================================

// Header to zero based offset, from the layout rather than typed, so a column inserted in
// IS9WD_ARCHIVE moves every write with it.
function IS9WD_archiveCols_(layout) {
  var out = {};
  for (var i = 0; i < layout.columns.length; i++) out[layout.columns[i].header] = i;
  return out;
}

// A title or a remark reaching this tab came through the endpoint or a hand edit, and a
// value whose first character is = is a formula to Sheets. One leading space defuses it
// and costs nothing a reader will notice. Control characters go for the same reason the
// Log strips them: a stray line break splits a row a person is trying to read.
function IS9WD_archiveText_(value) {
  var text = IS9WD_txt_(value).replace(/[\u0000-\u001f\u007f]+/g, ' ');
  if (/^=/.test(text)) text = ' ' + text;
  return text;
}

// The snapshot dedupe key. The Monday and not the week number, because a week number
// repeats every trimester and the Monday cannot.
function IS9WD_archiveKey_(weekStart, id) {
  return IS9WD_formatDate(weekStart) + '|' + IS9WD_trim_(id);
}

// One pass over the archive's values: where each snapshot key and each retired ID already
// sits, and how many rows are used. Used counts up to the last filled row, so a blank left
// in the middle is never filled: this tab is append only and a hole is somebody's business.
function IS9WD_archiveIndex_(values, layout) {
  var c = IS9WD_archiveCols_(layout);
  var out = { snapshot: {}, retired: {}, used: 0 };
  var rows = values && typeof values.length === 'number' ? values : [];
  for (var r = 0; r < rows.length; r++) {
    var line = rows[r] || [];
    var filled = false;
    for (var i = 0; i < line.length; i++) {
      if (IS9WD_filled_(line[i])) { filled = true; break; }
    }
    if (!filled) continue;
    out.used = r + 1;
    var source = IS9WD_trim_(line[c['Source']]);
    var id = IS9WD_trim_(line[c['ID']]);
    if (id === '') continue;
    if (source === layout.SOURCE_SNAPSHOT) {
      var start = IS9WD_midnight_(line[c['Week start']]);
      if (start) {
        var key = IS9WD_archiveKey_(start, id);
        // The first row wins, the way MATCH would: a duplicate below it is what a re-run
        // written before this dedupe existed would have left, and it is not made worse.
        if (!Object.prototype.hasOwnProperty.call(out.snapshot, key)) out.snapshot[key] = r;
      }
    } else if (source === layout.SOURCE_RETIRED) {
      if (!Object.prototype.hasOwnProperty.call(out.retired, id)) out.retired[id] = r;
    }
  }
  return out;
}

// One snapshot row per item on a slide, in the order a person reads the carousel: the
// directory's hierarchy, then each officer's rank. `week` carries weekNumber, weekStart,
// preparedName and checkedName; the two names are this week's sign-off as it stood at
// archive time, which is what makes the sign-off auditable after the names have moved on.
function IS9WD_archiveSnapshotRows_(items, directory, week, now, layout) {
  var c = IS9WD_archiveCols_(layout);
  var width = layout.columns.length;
  var list = items && typeof items.length === 'number' ? items : [];
  var dir = directory && typeof directory.length === 'number' ? directory : [];
  var weekStart = IS9WD_midnight_(week ? week.weekStart : null);
  var weekNo = IS9WD_int_(week ? week.weekNumber : null);
  var out = [];
  if (!weekStart) return out;

  var published = [];
  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    if (!it || it.active !== true || it.published !== true) continue;
    if (IS9WD_trim_(it.title) === '' || IS9WD_trim_(it.id) === '') continue;
    published.push(it);
  }

  // Directory order first, then anything published under a committee the directory does
  // not list, which cannot happen on a healthy workbook and is archived rather than lost.
  var ordered = [];
  var taken = {};
  for (var d = 0; d < dir.length; d++) {
    var want = IS9WD_trim_(dir[d] ? dir[d].committee : '').toLowerCase();
    if (want === '') continue;
    var mine = [];
    for (var p = 0; p < published.length; p++) {
      if (taken[p]) continue;
      if (IS9WD_trim_(published[p].committee).toLowerCase() === want) {
        mine.push(published[p]);
        taken[p] = true;
      }
    }
    ordered = ordered.concat(IS9WD_sortActive(mine));
  }
  var rest = [];
  for (var q = 0; q < published.length; q++) if (!taken[q]) rest.push(published[q]);
  ordered = ordered.concat(IS9WD_sortActive(rest));

  for (var k = 0; k < ordered.length; k++) {
    var item = ordered[k];
    var row = [];
    for (var w = 0; w < width; w++) row.push('');
    row[c['Week']] = weekNo === null ? '' : weekNo;
    row[c['Week start']] = weekStart;
    row[c['Committee']] = IS9WD_archiveText_(item.committee);
    row[c['Title of Task']] = IS9WD_archiveText_(item.title);
    row[c['Deadline']] = IS9WD_archiveDeadline_(item.deadline);
    row[c['Remarks']] = IS9WD_archiveText_(item.remark);
    row[c['Archived at']] = now;
    row[c['ID']] = IS9WD_trim_(item.id);
    row[c['Status']] = IS9WD_archiveText_(item.status);
    row[c['Status at']] = IS9WD_archiveStamp_(item.statusAt);
    row[c['Status by']] = IS9WD_archiveText_(item.statusBy);
    row[c['Source']] = layout.SOURCE_SNAPSHOT;
    row[c['Prepared by']] = IS9WD_archiveText_(week.preparedName);
    row[c['Checked by']] = IS9WD_archiveText_(week.checkedName);
    out.push(row);
  }
  return out;
}

// One retired row. Week and Week start are the week the deadline fell in, which is the
// week the trend buckets the accomplishment under, so a sort on Week start puts a week's
// load and its accomplishments together. A deadline that is not a date leaves both blank.
// Prepared by and Checked by stay blank: retirement is not tied to a published week.
function IS9WD_archiveRetiredRow_(item, terms, now, layout) {
  var c = IS9WD_archiveCols_(layout);
  var width = layout.columns.length;
  var row = [];
  for (var w = 0; w < width; w++) row.push('');
  var deadline = IS9WD_midnight_(item.deadline);
  var monday = deadline ? IS9WD_addDays_(deadline, 1 - IS9WD_isoDow_(deadline)) : null;
  var weekNo = monday ? IS9WD_weekNumber(monday, terms) : null;
  row[c['Week']] = weekNo === null ? '' : weekNo;
  row[c['Week start']] = monday || '';
  row[c['Committee']] = IS9WD_archiveText_(item.committee);
  row[c['Title of Task']] = IS9WD_archiveText_(item.title);
  row[c['Deadline']] = IS9WD_archiveDeadline_(item.deadline);
  row[c['Remarks']] = IS9WD_archiveText_(item.remark);
  row[c['Archived at']] = now;
  row[c['ID']] = IS9WD_trim_(item.id);
  row[c['Status']] = IS9WD_archiveText_(item.status);
  row[c['Status at']] = IS9WD_archiveStamp_(item.statusAt);
  row[c['Status by']] = IS9WD_archiveText_(item.statusBy);
  row[c['Source']] = layout.SOURCE_RETIRED;
  return row;
}

// The real date when there is one, otherwise the text a paste left, so the archive shows
// what the data tab showed rather than a blank that looks like nothing was due.
function IS9WD_archiveDeadline_(deadline) {
  var d = IS9WD_midnight_(deadline);
  if (d) return d;
  return IS9WD_archiveText_(deadline);
}

// A Date with its time, from the Date the endpoint wrote or the text a hand edit typed.
function IS9WD_archiveStamp_(statusAt) {
  var d = IS9WD_parseStamp_(statusAt);
  return d ? d : '';
}

// Split snapshot rows into the ones the archive already holds for this week, which are
// rewritten in place so a re-run updates rather than duplicates, and the ones to append.
function IS9WD_archiveMerge_(index, rows, layout) {
  var c = IS9WD_archiveCols_(layout);
  var out = { append: [], update: [] };
  var seen = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var key = IS9WD_archiveKey_(row[c['Week start']], row[c['ID']]);
    // The same ID twice in one run cannot happen on a healthy workbook. It is written
    // once rather than twice, because twice is what the dedupe exists to prevent.
    if (seen[key]) continue;
    seen[key] = true;
    if (Object.prototype.hasOwnProperty.call(index.snapshot, key)) {
      out.update.push({ offset: index.snapshot[key], row: row });
    } else {
      out.append.push(row);
    }
  }
  return out;
}

// How many of `count` rows fit inside a span with `used` rows taken, and whether the free
// rows left afterwards are under the minimum the layout wants kept.
function IS9WD_archiveFit_(count, used, spanRows, minFreeRows) {
  var want = Math.max(0, IS9WD_int_(count) || 0);
  var have = Math.max(0, (IS9WD_int_(spanRows) || 0) - (IS9WD_int_(used) || 0));
  var fits = Math.min(want, have);
  var freeAfter = have - fits;
  var min = Math.max(0, IS9WD_int_(minFreeRows) || 0);
  return { fits: fits, left: want - fits, freeAfter: freeAfter, warn: freeAfter < min };
}

// Which items the retire job may act on. Due means: the derived Active flag is FALSE, the
// status is one the Configuration list marks terminal, and the Status at stamp is at least
// retireDays old on `today`. Everything else with a terminal look is held and counted, so
// the report can say why a row that looks finished is still on the data tab.
function IS9WD_retireCandidates_(items, statusRows, retireDays, today) {
  var out = { due: [], noId: [], noStamp: [], unknownStatus: [] };
  var list = items && typeof items.length === 'number' ? items : [];
  var days = IS9WD_posInt_(retireDays);
  var todayDay = IS9WD_day_(today);
  if (days === 0 || todayDay === null) return out;
  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    if (!it || it.active === true) continue;
    if (IS9WD_trim_(it.status) === '') continue;
    var entry = IS9WD_statusEntry_(it.status, statusRows);
    if (!entry || entry.terminal !== true) { out.unknownStatus.push(it); continue; }
    if (IS9WD_trim_(it.id) === '') { out.noId.push(it); continue; }
    var stamp = IS9WD_day_(IS9WD_parseStamp_(it.statusAt));
    if (stamp === null) { out.noStamp.push(it); continue; }
    if (stamp <= todayDay - days) out.due.push(it);
  }
  out.due = IS9WD_sortActive(out.due);
  return out;
}

function IS9WD_archivePlural_(n, one, many) {
  return n + ' ' + (n === 1 ? one : many);
}

// The one way a week is named in a report, a Log row and a thrown error, so the reader can
// match the three.
function IS9WD_archiveWeekLabel_(weeks) {
  var w = weeks || {};
  var weekNo = IS9WD_int_(w.weekNumber);
  return 'Week ' + (weekNo === null ? '--' : IS9WD_two_(weekNo)) + ' (Monday ' +
    IS9WD_formatDate(IS9WD_midnight_(w.weekStart)) + ')';
}

// The label on the override's own row of 01 | Configuration, read from the layout rather
// than typed, so the sentence that names the cell follows a rename. The typeof guard is for
// a Node sandbox that loads this file without IS9WD_Config.js; in Apps Script it is there.
function IS9WD_archiveOverrideLabel_() {
  var block = typeof IS9WD_CFG !== 'undefined' && IS9WD_CFG.WEEKSET ? IS9WD_CFG.WEEKSET : null;
  var rows = block && block.rows ? block.rows : [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i].name === 'IS9WD_TODAY_OVERRIDE' && !IS9WD_blank_(rows[i].label)) {
      return IS9WD_trim_(rows[i].label);
    }
  }
  return 'Today override';
}

// How a week is re-taken once Saturday has passed. Every instruction this job prints, and
// the error it throws, is read on the schedule row, in the Log or in the Sunday brief, on
// Sunday or later, when cfg.weeks.weekStart has rolled to the coming Monday: a plain "run it
// again" then archives the NEW week under its own key and the week that ended is never
// written. The Today override is the one lever that moves the Monday back, and every job
// pauses while it is set, so the sentence ends by saying to clear it. The step is what has
// to happen between the override and the run, if anything: the admin page sets the sign-off
// for the week the sheet is on, so a sign-off set after the override lands on the right week.
function IS9WD_archiveRetake_(weekStart, step) {
  var monday = IS9WD_midnight_(weekStart);
  if (!monday) return '';
  var saturday = IS9WD_formatDate(IS9WD_addDays_(monday, 5));
  return 'From Sunday the week has rolled over, so first set ' + IS9WD_archiveOverrideLabel_() +
    ' on ' + IS9WD_TAB.CONFIG + ' to Saturday ' + saturday + ', ' +
    (IS9WD_blank_(step) ? '' : 'then ' + IS9WD_trim_(step) + ', ') +
    'then run IS9 Deliverables > Archive this week, then clear the override, because every ' +
    'job is paused while it is set.';
}

// ============================================================================
//  THE SPAN AND THE WRITES  (the impure edge, kept small)
// ============================================================================

// The live span, from the named range the trend reads and not from the layout alone: the
// layout's last row is what a fresh build declares, and Build or repair widens the range
// downward from there in growBy steps, so the range is the truth and the layout the floor.
function IS9WD_archiveSpan_() {
  var arc = IS9WD_ARCHIVE;
  var last = arc.lastRow;
  var live = IS9WD_namedOrNull_('IS9WD_ARC_WEEKSTART');
  if (live) last = Math.max(last, live.getRow() + live.getNumRows() - 1);
  return {
    firstRow: arc.firstRow, lastRow: last, rows: last - arc.firstRow + 1,
    firstCol: arc.firstCol, lastCol: arc.lastCol, width: arc.lastCol - arc.firstCol + 1,
    minFreeRows: arc.minFreeRows, growBy: arc.growBy
  };
}

// Every used row inside the span, one read. Rows past the span are not read, because a row
// there is a row the trend cannot see and a row this module never wrote.
function IS9WD_archiveRead_(sheet, span) {
  var last = Math.min(sheet.getLastRow(), span.lastRow);
  var rows = last - span.firstRow + 1;
  if (rows < 1) return [];
  return sheet.getRange(span.firstRow, span.firstCol, rows, span.width).getValues();
}

// Append `rows` after the used rows, inside the span. The caller has already cut the list
// to what fits, so this never writes past the span's last row.
function IS9WD_archiveAppend_(sheet, span, used, rows) {
  if (!rows.length) return 0;
  var first = span.firstRow + used;
  if (first + rows.length - 1 > span.lastRow) {
    throw new Error('The archive append would run past row ' + span.lastRow + '.');
  }
  IS9WD_ensureGrid_(sheet, first + rows.length - 1, span.lastCol);
  sheet.getRange(first, span.firstCol, rows.length, span.width).setValues(rows);
  return rows.length;
}

// Rewrite rows the archive already holds. One write per row: a re-run touches a handful of
// rows and they are rarely contiguous, so batching them buys nothing.
function IS9WD_archiveUpdate_(sheet, span, updates) {
  for (var i = 0; i < updates.length; i++) {
    sheet.getRange(span.firstRow + updates[i].offset, span.firstCol, 1, span.width)
      .setValues([updates[i].row]);
  }
  return updates.length;
}

// The lock, taken once per execution. The menu already holds it when it calls here, the
// dispatcher does not, and the endpoint takes the same lock for every write, so a tick that
// lands while a row is being cleared waits rather than racing it.
function IS9WD_archiveLocked_(fn) {
  if (LockService.getDocumentLock().hasLock()) return fn();
  return IS9WD_withLock_(fn);
}

// Live rows, never the remembered copy: both jobs decide what to write from what is on the
// sheet right now, the way the endpoint's writes do (IS9WD_apiWrite_).
function IS9WD_archiveItemsLive_() {
  SpreadsheetApp.flush();
  IS9WD_itemsCacheReset_();
  // Declared by IS9WD_Items.js. The typeof guard is for a Node sandbox that loads this
  // file without it; in Apps Script every file shares one scope and the flag is there.
  if (typeof IS9WD_ITEMS_LIVE_ !== 'undefined') IS9WD_ITEMS_LIVE_ = true;
  return IS9WD_readItems_();
}

function IS9WD_archiveActor_(source) {
  return IS9WD_txt_(source) === IS9WD_LOG_SOURCE_TRIGGER_ ? 'Trigger' : 'Admin';
}

// After any write: the remembered rows and the settings snapshot are both suspect.
function IS9WD_archiveAfterWrite_() {
  SpreadsheetApp.flush();
  IS9WD_itemsCacheReset_();
  IS9WD_configReset_();
}

// The room line every report ends with when the span is running short, so the person who
// reads the dispatcher's status cell learns it a week before a row fails to fit.
function IS9WD_archiveRoomLine_(fit, span) {
  if (!fit.warn) return '';
  return 'The archive has ' + fit.freeAfter + ' free rows inside its span, under the ' +
    span.minFreeRows + ' it wants. Run IS9 Deliverables > Build or repair workbook to ' +
    'grow it by ' + span.growBy + ' rows.';
}

// ============================================================================
//  ARCHIVE THIS WEEK  (Saturday 22:00, and the menu)
// ============================================================================

/**
 * Record the week that is ending: one row per item on a slide, in carousel reading order,
 * with this week's sign-off names as they stand. Saturday, because the week rolls over on
 * Sunday and a Saturday run still sees the week that is ending (reference 8.3).
 *
 * Idempotent. A row the archive already holds for this Monday and this ID is rewritten in
 * place, so a second run after a late edit updates the record rather than doubling it. A row
 * for an item that has since left the carousel is left as it was: this tab is append only.
 *
 * Returns { lines, added, updated, left, total }. The last line is the sentence the
 * dispatcher records on the schedule row.
 */
function IS9WD_archiveWeek_(opt) {
  var o = opt || {};
  var cfg = o.cfg || IS9WD_readConfig_(true);
  var source = IS9WD_txt_(o.source) || 'Menu';
  try {
    return IS9WD_archiveLocked_(function () {
      return IS9WD_archiveWeekLocked_(cfg, source);
    });
  } catch (err) {
    throw IS9WD_archiveFailed_(err, cfg);
  }
}

// A throw out of the locked run, most often the lock held for 30 s by a Build or a burst of
// ticks, reaches Ethan as the schedule row's status, a Log row, the failure mail and the menu
// dialog, and all four print the error and nothing else. The dispatcher marks the window used
// on a throw (reference 8.2), so the job does not retry by itself, and by the time the mail is
// read the week has usually rolled over. So the error carries the recovery. The message is
// extended in place rather than wrapped, so the stack the mail prints stays the real one.
function IS9WD_archiveFailed_(err, cfg) {
  var w = cfg && cfg.weeks ? cfg.weeks : {};
  var line = IS9WD_archiveRetake_(w.weekStart, '');
  if (line === '') return err;
  var tail = ' ' + IS9WD_archiveWeekLabel_(w) + ' is not recorded until this succeeds. ' +
    'Before Sunday, run IS9 Deliverables > Archive this week. ' + line;
  if (err && typeof err === 'object' && typeof err.message === 'string') {
    if (err.message.indexOf(tail) === -1) err.message += tail;
    return err;
  }
  return new Error(IS9WD_txt_(err) + tail);
}

function IS9WD_archiveWeekLocked_(cfg, source) {
  var out = { lines: [], added: 0, updated: 0, left: 0, total: 0, weekStart: '' };
  var say = function (line) { out.lines.push(line); };
  var w = cfg.weeks || {};
  var weekStart = IS9WD_midnight_(w.weekStart);
  var actor = IS9WD_archiveActor_(source);
  var log = function (detail, ok) {
    IS9WD_logRow_({ source: source, actor: actor, action: IS9WD_ARCHIVE_JOB_WEEK_,
      detail: detail, ok: ok !== false });
  };

  if (!weekStart) {
    say('The week start could not be read from ' + IS9WD_TAB.CONFIG + ', so nothing was archived.');
    log('no week start', false);
    return out;
  }
  out.weekStart = IS9WD_formatDate(weekStart);
  var weekNo = IS9WD_int_(w.weekNumber);
  var label = IS9WD_archiveWeekLabel_(w);
  if (w.inTerm === false) {
    say(label + ' is outside the term calendar, so nothing was archived.');
    log(label + ': outside the term calendar', true);
    return out;
  }

  // This week's sign-off as it stands, the same reading the emails print: the week's own
  // row when it is set, otherwise the derived cells, which are blank until it is.
  var so = cfg.signoff || {};
  var cur = so.current || {};
  var week = {
    weekNumber: weekNo, weekStart: weekStart,
    preparedName: cur.set === true ? cur.preparedName : so.preparedName,
    checkedName: cur.set === true ? cur.checkedName : so.checkedName
  };

  var items = IS9WD_archiveItemsLive_();
  var dir = cfg.directory ? cfg.directory.inHierarchy : [];
  var now = IS9WD_nowManila_();
  var rows = IS9WD_archiveSnapshotRows_(items.rows, dir, week, now, IS9WD_ARCHIVE);
  out.total = rows.length;

  var sheet = IS9WD_sheet_('ARCHIVE');
  var span = IS9WD_archiveSpan_();
  var index = IS9WD_archiveIndex_(IS9WD_archiveRead_(sheet, span), IS9WD_ARCHIVE);
  var merge = IS9WD_archiveMerge_(index, rows, IS9WD_ARCHIVE);
  var fit = IS9WD_archiveFit_(merge.append.length, index.used, span.rows, span.minFreeRows);

  out.updated = IS9WD_archiveUpdate_(sheet, span, merge.update);
  out.added = IS9WD_archiveAppend_(sheet, span, index.used, merge.append.slice(0, fit.fits));
  out.left = fit.left;
  if (out.added || out.updated) IS9WD_archiveAfterWrite_();

  if (!rows.length) {
    say('Nothing is on the carousel for ' + label + ', so there is nothing to archive.');
  } else {
    say(label + ': ' + IS9WD_archivePlural_(rows.length, 'item', 'items') +
      ' on the carousel.');
    if (IS9WD_blank_(week.preparedName) || IS9WD_blank_(week.checkedName)) {
      // The admin page sets the sign-off for the week the sheet is on, so from Sunday the
      // override has to come before the page, or the names land on the new week.
      say('The sign-off for this week is not set, so Prepared by and Checked by are blank ' +
        'on these rows. Before Sunday, set it from the admin page and run IS9 Deliverables ' +
        '> Archive this week again to fill them in. ' +
        IS9WD_archiveRetake_(weekStart, 'refresh the admin page and set the sign-off there'));
    }
  }
  var room = IS9WD_archiveRoomLine_(fit, span);
  if (room !== '') say(room);
  var summary = label + ': ' + out.added + ' archive ' + (out.added === 1 ? 'row' : 'rows') +
    ' added, ' + out.updated + ' updated';
  if (out.left > 0) {
    summary += ', ' + out.left + ' did not fit inside the archive span. Run IS9 ' +
      'Deliverables > Build or repair workbook to grow it, then Archive this week again ' +
      'before Sunday. ' + IS9WD_archiveRetake_(weekStart, '');
  } else {
    summary += '.';
  }
  say(summary);
  log(out.added + ' added, ' + out.updated + ' updated, ' + out.left + ' left, ' +
    out.total + ' on the carousel, week start ' + out.weekStart, out.left === 0);
  return out;
}

// ============================================================================
//  RETIRE ACCOMPLISHED ITEMS  (Saturday 23:00, and the menu)
// ============================================================================

/**
 * Move finished items off the data tab: for every row whose derived Active flag is FALSE,
 * whose status the Configuration list marks terminal, and whose Status at is at least
 * IS9WD_RETIRE_DAYS old, append one Retired row to 06 | Archive, then clear A to I on the
 * data tab. The append comes first and the clear only follows it, so a row whose archive
 * row did not fit is left exactly where it was.
 *
 * The age is measured against the real Manila clock and never against effective today: a
 * Today override moves what the jobs say, and a row cleared early because of a test date
 * is the one effect of the override nobody would want.
 *
 * Returns { lines, retired, archived, left, held }. The last line is the sentence the
 * dispatcher records on the schedule row.
 */
function IS9WD_retireAccomplished_(opt) {
  var o = opt || {};
  var cfg = o.cfg || IS9WD_readConfig_(true);
  var source = IS9WD_txt_(o.source) || 'Menu';
  return IS9WD_archiveLocked_(function () {
    return IS9WD_retireLocked_(cfg, source);
  });
}

function IS9WD_retireLocked_(cfg, source) {
  var out = { lines: [], retired: 0, archived: 0, left: 0, held: 0, retireDays: 0 };
  var say = function (line) { out.lines.push(line); };
  var actor = IS9WD_archiveActor_(source);
  var log = function (detail, ok) {
    IS9WD_logRow_({ source: source, actor: actor, action: IS9WD_ARCHIVE_JOB_RETIRE_,
      detail: detail, ok: ok !== false });
  };
  var sw = cfg.switches || {};
  var days = IS9WD_posInt_(sw.retireDays);
  out.retireDays = days;
  if (days === 0) {
    say('Retire accomplished after days is 0 on ' + IS9WD_TAB.ENGINE + ', so nothing is retired.');
    log('retire days is 0', true);
    return out;
  }

  var items = IS9WD_archiveItemsLive_();
  var statusRows = cfg.statuses ? cfg.statuses.rows : [];
  var today = IS9WD_todayManila_();
  var found = IS9WD_retireCandidates_(items.rows, statusRows, days, today);
  out.held = found.noId.length + found.noStamp.length + found.unknownStatus.length;

  var sheet = IS9WD_sheet_('ARCHIVE');
  var span = IS9WD_archiveSpan_();
  var index = IS9WD_archiveIndex_(IS9WD_archiveRead_(sheet, span), IS9WD_ARCHIVE);
  var terms = cfg.terms ? cfg.terms.rows : [];
  var now = IS9WD_nowManila_();

  // An item whose Retired row already exists, from a run cut short between the append and
  // the clear, needs no second row: the record is there and only the clear is owed.
  var toAppend = [];
  var owed = [];
  var recorded = [];
  for (var i = 0; i < found.due.length; i++) {
    var it = found.due[i];
    if (Object.prototype.hasOwnProperty.call(index.retired, it.id)) recorded.push(it);
    else { owed.push(it); toAppend.push(IS9WD_archiveRetiredRow_(it, terms, now, IS9WD_ARCHIVE)); }
  }
  var fit = IS9WD_archiveFit_(toAppend.length, index.used, span.rows, span.minFreeRows);
  out.archived = IS9WD_archiveAppend_(sheet, span, index.used, toAppend.slice(0, fit.fits));
  out.left = fit.left;

  // Clear only what the archive now holds: the rows just written and the ones it already
  // had. Cleared through IS9WD_itemsClearRow_ and never by deleting a row (5.1).
  var clearing = recorded.concat(owed.slice(0, fit.fits));
  var itemsSheet = IS9WD_sheet_('ITEMS');
  for (var k = 0; k < clearing.length; k++) {
    IS9WD_itemsClearRow_(itemsSheet, clearing[k].row);
    out.retired++;
  }
  if (out.archived || out.retired) IS9WD_archiveAfterWrite_();

  if (!found.due.length) {
    say('No accomplished item is older than ' + days + ' days, so nothing was retired.');
  } else {
    say(IS9WD_archivePlural_(found.due.length, 'accomplished item', 'accomplished items') +
      ' older than ' + days + ' days.');
  }
  if (found.noStamp.length) {
    say(IS9WD_archivePlural_(found.noStamp.length, 'finished item has', 'finished items have') +
      ' no Status at stamp, so their age is unknown and they stay on the data tab: ' +
      IS9WD_archiveIdList_(found.noStamp) + '.');
  }
  if (found.unknownStatus.length) {
    say(IS9WD_archivePlural_(found.unknownStatus.length, 'inactive row carries', 'inactive rows carry') +
      ' a status the list on ' + IS9WD_TAB.ENGINE + ' does not mark terminal, so ' +
      (found.unknownStatus.length === 1 ? 'it stays' : 'they stay') + ' on the data tab: ' +
      IS9WD_archiveIdList_(found.unknownStatus) + '.');
  }
  if (found.noId.length) {
    say(IS9WD_archivePlural_(found.noId.length, 'finished row has', 'finished rows have') +
      ' no ID, so nothing can record ' + (found.noId.length === 1 ? 'it' : 'them') +
      '. Run the dispatcher or Build or repair workbook to give ' +
      (found.noId.length === 1 ? 'it' : 'them') + ' one.');
  }
  var room = IS9WD_archiveRoomLine_(fit, span);
  if (room !== '') say(room);
  var summary = IS9WD_archivePlural_(out.retired, 'item', 'items') + ' retired to ' +
    IS9WD_TAB.ARCHIVE + ', ' + out.archived + ' archive ' +
    (out.archived === 1 ? 'row' : 'rows') + ' added';
  if (out.held) summary += ', ' + out.held + ' held';
  if (out.left > 0) {
    summary += ', ' + out.left + ' waiting for room: run IS9 Deliverables > Build or ' +
      'repair workbook to grow the archive, then Retire accomplished items again.';
  } else {
    summary += '.';
  }
  say(summary);
  log(out.retired + ' retired, ' + out.archived + ' archive rows added, ' + out.left +
    ' left, ' + out.held + ' held, after ' + days + ' days', out.left === 0);
  return out;
}

// IDs with their rows, capped so a report line stays a line.
function IS9WD_archiveIdList_(list) {
  var cap = 12;
  var parts = [];
  for (var i = 0; i < list.length && i < cap; i++) {
    var id = IS9WD_trim_(list[i].id);
    parts.push((id === '' ? 'no ID' : id) + ' (row ' + list[i].row + ')');
  }
  if (list.length > cap) parts.push('and ' + (list.length - cap) + ' more');
  return parts.join(', ');
}
