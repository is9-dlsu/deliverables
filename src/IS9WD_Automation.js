/**
 * IS9WD_Automation.js - one trigger, one dispatcher, and the sweep that makes a typed row
 * tickable. Phase 5.
 *
 * ONE HOURLY TRIGGER RUNS EVERY JOB. Not five triggers, one. Apps Script gives no transaction
 * across triggers, so five of them racing on one workbook is five writers and no way to say
 * which finished last. One trigger, one lock, one pass down the schedule, and every job either
 * ran today or did not.
 *
 * THE DECISION IS PURE AND ALREADY TESTED. IS9WD_shouldRun in IS9WD_Core.js answers run,
 * missed or skip from a schedule row, the real Manila clock and the set of done keys. It reads
 * no sheet and no clock of its own, so every combination is exercised in Node. This file is
 * the runtime around it: read the schedule, ask, act, record.
 *
 * WHY nowManila AND NOT effective today. The workbook has a Today override so Ethan can see
 * what a future Sunday looks like. If a job's hour gate or its done key used that override,
 * setting it would freeze every job behind a key that never advances, with a green heartbeat
 * above it saying all is well. The override moves what the jobs SAY. It never moves when they
 * run.
 */

'use strict';

// A job that throws must not stop the ones after it. A failing Sunday brief should not also
// cost Ethan the archive, and the next hour should find the rest of the schedule intact.
var IS9WD_AUTO_TRIGGER_ = 'IS9WD_hourlyDispatch';

/**
 * THE TRIGGER HANDLER. No trailing underscore, because Apps Script calls it by name from a
 * trigger and the naming rule in CLAUDE.md exempts exactly this kind of entry point. It does
 * nothing but delegate, so there is one implementation of the dispatcher and not two.
 */
function IS9WD_hourlyDispatch() {
  var out = IS9WD_dispatch_();
  // THE RE-THROW, after every job has had its turn. The failure mail went out inside the pass,
  // at most once per job per day; this is the second channel, Google's own failure notice, the
  // backstop for the day the mail itself is what is broken (SPEC section 5). It is thrown here
  // and not inside IS9WD_dispatch_, so the menu's Run the dispatcher now reads a report rather
  // than an error dialog, and it is thrown after the heartbeat so the dashboard still shows the
  // pass happened.
  if (out && out.failed && out.failed.length) {
    throw new Error('IS9 tracker: ' + out.failed.length + ' job(s) failed: ' +
      out.failed.join(', ') + '. See the failure mail and 07 | Log.');
  }
}

/**
 * One pass down the schedule. Returns the lines the menu shows and the log records.
 *
 * It never throws. A dispatcher that throws is a dispatcher whose remaining jobs did not run,
 * and the only person who would find out is whoever reads the execution transcript.
 */
function IS9WD_dispatch_() {
  var lines = [];
  var failed = [];
  var say = function (line) { lines.push(line); Logger.log(line); };
  var now = IS9WD_nowManila_();
  var today = IS9WD_dateKey_(now);

  // THE OWNER GUARD, FIRST. A trigger belongs to whoever installed it and runs as them. If
  // somebody else ever installs one on a copy of this workbook, two dispatchers would write
  // the same cells from two accounts. The workbook records whose trigger it expects, and a
  // stranger's pass reports and stops rather than competing.
  var owner = IS9WD_autoOwner_();
  var me = IS9WD_autoMe_();
  if (owner !== '' && me !== '' && owner.toLowerCase() !== me.toLowerCase()) {
    say('this trigger belongs to ' + owner + ' and is running as ' + me + ', so nothing ran');
    IS9WD_logRow_({
      source: IS9WD_LOG_SOURCE_TRIGGER_, actor: me, action: 'dispatch',
      detail: 'owner mismatch, expected ' + owner, ok: false, result: 'SKIPPED'
    });
    return { lines: lines, ran: 0, skipped: 0, failed: failed };
  }

  var cfg = null;
  try {
    cfg = IS9WD_readConfig_(true);
  } catch (err) {
    IS9WD_autoFail_('DISPATCH', err, say);
    failed.push('DISPATCH');
    return { lines: lines, ran: 0, skipped: 0, failed: failed };
  }

  if (cfg.switches && cfg.switches.automationOn === false) {
    say('automation is switched off on ' + IS9WD_TAB.CONFIG + ', so no job ran');
    IS9WD_autoHeartbeat_(now, me);
    return { lines: lines, ran: 0, skipped: 0, failed: failed };
  }

  // A TODAY OVERRIDE PAUSES EVERY JOB. The override is the lever Ethan sets to look at a future
  // Sunday, and nothing forces him to clear it, so a live workbook with a stale override must
  // stop rather than mail a past week to thirteen people. It is said in the pass's own lines,
  // on the automation status report, and once a day by mail; the ID sweep is paused with it,
  // which is what Sync deliverables to the app is for.
  if (cfg.weeks && cfg.weeks.todayOverrideSet === true) {
    say('a Today override is set on ' + IS9WD_TAB.CONFIG + ', so every job is paused until ' +
      'it is cleared');
    IS9WD_autoHeartbeat_(now, me);
    try {
      var warn = IS9WD_apiImpl_('IS9WD_jobAlert_');
      if (warn) {
        warn('DISPATCHER_OVERRIDE', new Error('The Today override on ' + IS9WD_TAB.CONFIG +
          ' is set, so the hourly pass sends nothing until it is cleared.'), []);
      }
    } catch (err) {
      Logger.log('IS9WD: the override alert was not sent: ' + err);
    }
    return { lines: lines, ran: 0, skipped: 0, failed: failed };
  }

  // THE ID SWEEP, BEFORE ANY EMAIL. A row Ethan typed has no ID until something mints one,
  // and the officers page ticks by ID, so an unswept row is a task an officer can see and
  // cannot tick. It also carries the blocking "Missing ID" flag, which holds Ready for Canva
  // at NO. Running it first means the Monday email and the carousel both describe a workbook
  // whose rows can actually be acted on.
  var swept = IS9WD_autoSweepIds_(cfg, say);

  // THE SIGN-OFF CARRIES FORWARD before anything reads it, so the Sunday brief in this same
  // pass describes a week whose gate is already clear.
  cfg = IS9WD_autoCarrySignoff_(cfg, say);

  // NEW ITEMS ARE ANNOUNCED WITHIN THE HOUR, ON ANY DAY, right after the sweep has given them
  // IDs. Not a schedule row: the stamps on the rows are its memory, so it runs every pass and
  // sends only what nobody has been told about. It obeys the Monday email switch, because a
  // same day notice is the same kind of message as the Monday list.
  IS9WD_autoNotify_(cfg, say);

  var rows = cfg.schedule ? cfg.schedule.rows : [];
  var doneKeys = IS9WD_autoDoneKeys_();
  var ran = 0;
  var skipped = 0;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var verdict = IS9WD_shouldRun(row, now, doneKeys);
    if (verdict === 'skip') { skipped++; continue; }
    if (verdict === 'missed') {
      // The window closed. Saying so is the point: a silent miss is indistinguishable from a
      // job that was never scheduled, and this is the line that tells Ethan the trigger was
      // asleep when it mattered.
      say(row.jobKey + ': the window closed before this ran today');
      IS9WD_autoRecord_(row.jobKey, today, 'missed the window', false);
      skipped++;
      continue;
    }
    var out = IS9WD_autoRunJob_(row, cfg, say, failed);
    if (out) ran++;
  }

  IS9WD_autoHeartbeat_(now, me);
  IS9WD_autoPrune_(doneKeys, say);
  IS9WD_coordsWarm_();
  say('dispatch: ' + ran + ' job(s) ran, ' + skipped + ' skipped, ' + swept +
    ' row(s) given an ID' + (failed.length ? ', FAILED: ' + failed.join(', ') : ''));
  return { lines: lines, ran: ran, skipped: skipped, swept: swept, failed: failed };
}

// One job, inside its own try. The whole point of the isolation is that job three still runs
// when job two throws.
function IS9WD_autoRunJob_(row, cfg, say, failed) {
  var key = IS9WD_trim_(row.jobKey).toUpperCase();
  var impl = IS9WD_autoImpl_(key);
  if (!impl) {
    say(key + ': not built yet, so nothing ran');
    return false;
  }
  var fn = IS9WD_apiImpl_(impl);
  if (!fn) {
    say(key + ': ' + impl + ' is not in this project yet, so nothing ran');
    return false;
  }
  try {
    var out = fn({ cfg: cfg, source: IS9WD_LOG_SOURCE_TRIGGER_ });
    var note = out && out.lines && out.lines.length ? out.lines[out.lines.length - 1] : 'done';
    say(key + ': ' + note);
    IS9WD_autoRecord_(key, IS9WD_dateKey_(IS9WD_nowManila_()), note, true);
    return true;
  } catch (err) {
    say(key + ': failed, ' + err);
    if (failed) failed.push(key);
    IS9WD_autoRecord_(key, IS9WD_dateKey_(IS9WD_nowManila_()), 'failed: ' + err, false);
    IS9WD_autoFail_(key, err, say);
    return false;
  }
}

// The carry forward, guarded the same way. It re-reads the settings after a write so the
// rest of the pass sees the row it just made.
function IS9WD_autoCarrySignoff_(cfg, say) {
  var fn = IS9WD_apiImpl_('IS9WD_signoffCarry_');
  if (!fn) return cfg;
  try {
    var from = fn(cfg);
    if (!from) return cfg;
    say('sign-off carried forward from the week of ' + IS9WD_formatDate(from.weekStart));
    return IS9WD_readConfig_(true);
  } catch (err) {
    say('sign-off carry forward failed: ' + err);
    IS9WD_autoFail_('SIGNOFF_CARRY', err, say);
    return cfg;
  }
}

// The same day notice, guarded like a job: a throw is mailed once a day and does not stop the
// schedule behind it. The batch itself catches per recipient, so a throw here is a broken
// read, not a bad address.
function IS9WD_autoNotify_(cfg, say) {
  var fn = IS9WD_apiImpl_('IS9WD_sendNewAssignments_');
  if (!fn) return 0;
  try {
    var out = fn({ cfg: cfg, source: IS9WD_LOG_SOURCE_TRIGGER_ });
    var note = out && out.lines && out.lines.length ? out.lines[out.lines.length - 1] : 'done';
    say('new assignment notices: ' + note);
    return out && out.sent ? out.sent : 0;
  } catch (err) {
    say('new assignment notices: failed, ' + err);
    IS9WD_autoFail_('NEW_ASSIGNMENTS', err, say);
    return 0;
  }
}

// The five job keys the schedule ships, mapped to the function that does the work. A key with
// no entry is a key nothing runs, reported rather than ignored.
function IS9WD_autoImpl_(jobKey) {
  var map = {
    MONDAY_ASSIGNMENTS: 'IS9WD_sendMondayAssignments_',
    DAILY_DIGEST: 'IS9WD_sendDailyDigest_',
    SUNDAY_BRIEF: 'IS9WD_sendSundayBrief_',
    ARCHIVE_WEEK: 'IS9WD_archiveWeek_',
    RETIRE_ACCOMPLISHED: 'IS9WD_retireAccomplished_'
  };
  return map[IS9WD_trim_(jobKey).toUpperCase()] || '';
}

// ============================================================================
//  THE ID SWEEP
// ============================================================================

/**
 * Give every typed row an ID. IS9WD_itemsBackfill_ already does the work, correctly and
 * idempotently; it was simply only ever called by Build or repair, which rewrites nine tabs to
 * fill in two cells.
 *
 * Returns how many rows were given an ID, and never throws: a sweep that fails must not cost
 * the emails behind it.
 */
function IS9WD_autoSweepIds_(cfg, say) {
  try {
    var fn = IS9WD_apiImpl_('IS9WD_itemsBackfill_');
    if (!fn) return 0;
    IS9WD_apiImpl_('IS9WD_itemsRaiseNextId_') && IS9WD_itemsRaiseNextId_();
    var filled = fn(cfg) || [];
    var ids = 0;
    for (var i = 0; i < filled.length; i++) {
      if (filled[i] && filled[i].id) ids++;
    }
    if (ids > 0) {
      say(ids + ' row(s) were given an ID and can now be ticked from a phone');
      IS9WD_logRow_({
        source: IS9WD_LOG_SOURCE_TRIGGER_, actor: 'Trigger', action: 'sweepIds',
        detail: ids + ' rows given an ID', ok: true
      });
    }
    return ids;
  } catch (err) {
    if (say) say('the ID sweep failed, so new rows stay unticked for now: ' + err);
    Logger.log('IS9WD: the ID sweep failed: ' + err);
    return 0;
  }
}

/**
 * SYNC DELIVERABLES TO THE APP, from the root menu. The app holds no copy of anything: every
 * open reads 03 | Deliverables live, so there is nothing to copy across. What CAN stand
 * between a typed row and a phone is an ID, because the page ticks by ID, and a derived column
 * that has not recomputed yet. This does both, in one locked run, then reports exactly what
 * each officer's page will show the next time it is opened or refreshed, and names any row the
 * app still cannot show and why.
 */
function IS9WD_syncToApp_() {
  var lines = [];
  var say = function (l) { lines.push(l); };
  var cfg = IS9WD_readConfig_(true);
  var ids = IS9WD_autoSweepIds_(cfg, say);
  // The eight derived columns are sheet formulas; without the flush the read below could see
  // a brand new row as inactive and unranked.
  SpreadsheetApp.flush();
  IS9WD_configReset_();
  cfg = IS9WD_autoCarrySignoff_(cfg, say);
  // THE NOTICES GO NOW, not at the next hourly pass: Sync is the one click that means "push
  // this to the officers", so it does everything the hourly pass would, at once.
  var noticed = IS9WD_autoNotify_(cfg, say);
  var items = IS9WD_readItems_();
  var dir = cfg.directory.inHierarchy;
  var hidden = [];
  var total = 0;
  lines.push(ids > 0 ? ids + ' row(s) were given an ID.' : 'Every row already had an ID.');
  lines.push(noticed > 0 ? noticed + ' officer(s) were emailed about rows that were new to them' +
    (cfg.switches.testMode ? ', all to your own address because test mode is on' : '') + '.'
    : 'Nobody needed a notice: every row had already been sent to its officer.');
  lines.push('');
  lines.push('What each page shows now, as the app reads it:');
  for (var i = 0; i < dir.length; i++) {
    var e = dir[i];
    var mine = IS9WD_itemsFor_(items, e.committee);
    var shown = 0;
    var open = 0;
    for (var j = 0; j < mine.length; j++) {
      var it = mine[j];
      if (it.title === '') { hidden.push('row ' + it.row + ' (no title)'); continue; }
      if (it.id === '') { hidden.push('row ' + it.row + ' (no ID)'); continue; }
      shown++;
      if (it.active === true) open++;
    }
    total += shown;
    lines.push(e.key + '  ' + e.committee + IS9WD_SEP + shown + ' item' + (shown === 1 ? '' : 's') +
      (shown ? ', ' + open + ' open' : ''));
  }
  var known = {};
  for (var k = 0; k < dir.length; k++) known[IS9WD_trim_(dir[k].committee).toLowerCase()] = true;
  for (var r = 0; r < items.rows.length; r++) {
    var row = items.rows[r];
    if (row.title !== '' && !known[IS9WD_trim_(row.committee).toLowerCase()]) {
      hidden.push('row ' + row.row + ' (committee "' + row.committee + '" is not in the directory)');
    }
  }
  lines.push('');
  if (hidden.length) {
    lines.push('Rows no page can show: ' + hidden.join('; ') + '.');
    lines.push('');
  }
  lines.push(total + ' item' + (total === 1 ? '' : 's') + ' across ' + dir.length + ' pages. Nothing ' +
    'else needs doing: the app reads the sheet live, so each officer sees this list the moment ' +
    'they open or refresh their link.');
  IS9WD_logRow_({ source: 'Menu', actor: 'Admin', action: 'syncToApp',
    detail: ids + ' IDs given, ' + total + ' items visible', ok: true });
  return lines;
}

/**
 * The same sweep on demand, for the menu, because waiting an hour to tick a row you typed
 * thirty seconds ago is not a workflow anybody accepts.
 */
function IS9WD_sweepIds_() {
  var cfg = IS9WD_readConfig_(true);
  var lines = [];
  var ids = IS9WD_autoSweepIds_(cfg, function (l) { lines.push(l); });
  if (ids === 0) {
    lines.push('Every row already has an ID. Nothing needed doing.');
  }
  return lines;
}

// ============================================================================
//  THE TRIGGER
// ============================================================================

function IS9WD_installAutomations_() {
  var out = [];
  var removed = IS9WD_removeAutomations_();
  for (var r = 0; r < removed.length; r++) out.push(removed[r]);
  ScriptApp.newTrigger(IS9WD_AUTO_TRIGGER_).timeBased().everyHours(1).create();
  var me = IS9WD_autoMe_();
  IS9WD_autoSetOwner_(me);
  out.push('One hourly trigger installed, owned by ' + (me === '' ? 'this account' : me) + '.');
  out.push('It runs every job on the schedule, so there is one trigger and not five: Apps ' +
    'Script gives no transaction across triggers, and five of them on one workbook is five ' +
    'writers with no way to say which finished last.');
  out.push('Nothing sends while an email switch is off, and nothing reaches an officer ' +
    'while test mode is on.');
  IS9WD_logRow_({
    source: 'Menu', actor: me || 'Admin', action: 'installAutomations',
    detail: 'one hourly trigger, owner ' + me, ok: true
  });
  return out;
}

function IS9WD_removeAutomations_() {
  var out = [];
  var all = ScriptApp.getProjectTriggers();
  var gone = 0;
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() !== IS9WD_AUTO_TRIGGER_) continue;
    ScriptApp.deleteTrigger(all[i]);
    gone++;
  }
  out.push(gone === 0 ? 'No automation trigger was installed.'
    : gone + ' automation trigger(s) removed. No job will run until one is installed again.');
  if (gone > 0) {
    IS9WD_logRow_({
      source: 'Menu', actor: IS9WD_autoMe_() || 'Admin', action: 'removeAutomations',
      detail: gone + ' trigger(s) removed', ok: true
    });
  }
  return out;
}

/**
 * What is actually installed, versus what the schedule says should happen. The two disagreeing
 * is the failure nobody notices: a schedule full of ON rows and no trigger to read them looks
 * exactly like a working system until a Monday goes quiet.
 */
function IS9WD_automationStatus_() {
  var out = [];
  var mine = 0;
  var others = [];
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === IS9WD_AUTO_TRIGGER_) mine++;
    else others.push(all[i].getHandlerFunction());
  }
  out.push(mine === 0
    ? 'NO TRIGGER IS INSTALLED, so nothing runs by itself. Automation > Install automations.'
    : mine + ' hourly trigger(s) installed.');
  if (mine > 1) {
    out.push('MORE THAN ONE is a fault: each would run the whole schedule. Install ' +
      'automations again, which removes them all first.');
  }
  if (others.length) out.push('Other triggers in this project: ' + others.join(', '));

  var owner = IS9WD_autoOwner_();
  var me = IS9WD_autoMe_();
  out.push('Owner on record: ' + (owner === '' ? 'none yet' : owner) +
    (me === '' ? '' : IS9WD_SEP + 'you are ' + me));
  if (owner !== '' && me !== '' && owner.toLowerCase() !== me.toLowerCase()) {
    out.push('These differ, so a pass running as you would stop without doing anything.');
  }

  try {
    var cfg = IS9WD_readConfig_(true);
    out.push('Automation switch: ' + (cfg.switches.automationOn === false ? 'OFF' : 'on') +
      IS9WD_SEP + 'test mode: ' + (cfg.switches.testMode ? 'ON' : 'off'));
    out.push('Same day notices: every hourly pass, any day, with the Monday email switch ' +
      (cfg.switches.mailMonday ? 'on' : 'OFF') + '.');
    out.push('');
    out.push('The schedule, and what each job would do right now:');
    var now = IS9WD_nowManila_();
    var keys = IS9WD_autoDoneKeys_();
    var rows = cfg.schedule ? cfg.schedule.rows : [];
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      var verdict = IS9WD_shouldRun(row, now, keys);
      var built = IS9WD_apiImpl_(IS9WD_autoImpl_(row.jobKey)) ? '' : IS9WD_SEP + 'not built yet';
      out.push('  ' + row.jobKey + IS9WD_SEP + (row.on ? 'on' : 'off') + IS9WD_SEP +
        IS9WD_trim_(row.runs) + ' ' + IS9WD_trim_(row.day) + ' at ' + row.hour + ':00' +
        IS9WD_SEP + verdict + built);
    }
  } catch (err) {
    out.push('The schedule could not be read: ' + err);
  }
  return out;
}

// ============================================================================
//  RECORDING
// ============================================================================

// The heartbeat is the only proof the trigger is alive. A workbook with a stale heartbeat and
// a full schedule looks identical to one that is working, right up until a Monday goes quiet,
// which is why 00 | Dashboard reads this cell and says how long ago in hours.
function IS9WD_autoHeartbeat_(now, me) {
  try {
    var stamp = IS9WD_stampText_(now);
    var beat = IS9WD_namedOrNull_('IS9WD_HEARTBEAT');
    if (beat) beat.setValue(stamp);
    var last = IS9WD_namedOrNull_('IS9WD_DIAG_LAST_RUN');
    if (last) last.setValue(now);
    var who = IS9WD_namedOrNull_('IS9WD_LAST_OWNER');
    if (who) who.setValue(me || '');
  } catch (err) {
    Logger.log('IS9WD: the heartbeat was not written: ' + err);
  }
}

// The done key goes in BEFORE the next job starts, so an execution killed by the six minute
// limit cannot make the next hourly pass repeat a job that already sent.
function IS9WD_autoRecord_(jobKey, dateStr, note, ok) {
  try {
    PropertiesService.getDocumentProperties()
      .setProperty(IS9WD_doneKey(jobKey, dateStr, ''), IS9WD_txt_(note).substring(0, 120));
  } catch (err) {
    Logger.log('IS9WD: the done key was not written for ' + jobKey + ': ' + err);
  }
  IS9WD_autoWriteStatus_(jobKey, note, ok);
  IS9WD_logRow_({
    source: IS9WD_LOG_SOURCE_TRIGGER_, actor: 'Trigger', action: IS9WD_trim_(jobKey),
    detail: note, ok: ok !== false
  });
}

// Last run and Last status, on the schedule row itself, so the answer to "did Monday go out"
// is on the same line as the job rather than somewhere else.
function IS9WD_autoWriteStatus_(jobKey, note, ok) {
  try {
    var block = IS9WD_ENG.SCHEDULE;
    var sheet = IS9WD_sheet_('ENGINE');
    var count = block.lastRow - block.firstRow + 1;
    var keys = sheet.getRange(block.firstRow, block.firstCol, count, 1).getValues();
    for (var r = 0; r < count; r++) {
      if (IS9WD_trim_(keys[r][0]).toUpperCase() !== IS9WD_trim_(jobKey).toUpperCase()) continue;
      sheet.getRange(block.firstRow + r, block.firstCol + 7).setValue(IS9WD_nowManila_());
      sheet.getRange(block.firstRow + r, block.firstCol + 8)
        .setValue((ok === false ? 'FAILED: ' : '') + IS9WD_txt_(note).substring(0, 120));
      return true;
    }
  } catch (err) {
    Logger.log('IS9WD: the schedule status was not written for ' + jobKey + ': ' + err);
  }
  return false;
}

// Job record keys older than this are deleted on every pass, over the map the pass already
// read. Document Properties has a hard size limit, and live sends write one key per recipient
// per job per day, so the store only grows unless something prunes it.
var IS9WD_AUTO_KEEP_DAYS_ = 90;

function IS9WD_autoPrune_(props, say) {
  try {
    var cutoff = IS9WD_dateKey_(IS9WD_addDays_(IS9WD_todayManila_(), -IS9WD_AUTO_KEEP_DAYS_));
    var store = PropertiesService.getDocumentProperties();
    var gone = 0;
    for (var key in props) {
      if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
      if (key.indexOf(IS9WD_PROP.DONE_PREFIX) !== 0 && key.indexOf(IS9WD_PROP.ALERT_PREFIX) !== 0) continue;
      var m = key.match(/\d{4}-\d{2}-\d{2}/);
      if (!m || m[0] >= cutoff) continue;
      store.deleteProperty(key);
      gone++;
    }
    if (gone > 0 && say) say(gone + ' job record key(s) older than ' + IS9WD_AUTO_KEEP_DAYS_ + ' days pruned');
    return gone;
  } catch (err) {
    Logger.log('IS9WD: the job record keys were not pruned: ' + err);
    return 0;
  }
}

function IS9WD_autoDoneKeys_() {
  try {
    return PropertiesService.getDocumentProperties().getProperties();
  } catch (err) {
    return {};
  }
}

// ============================================================================
//  FAILURE
// ============================================================================

// AT MOST ONE MAIL PER JOB PER DAY, AND THE ERROR IS RE-THROWN. The mail is for Ethan, who
// reads it; the re-throw is for Google, whose own failure notice is the backstop when the mail
// itself is what is broken. Doing only one of the two leaves a silent failure mode.
function IS9WD_autoFail_(jobKey, err, say) {
  var subject = '[IS9] Tracker job failed: ' + IS9WD_trim_(jobKey).toUpperCase();
  var body = [
    'Job: ' + jobKey,
    'When: ' + IS9WD_stampText_(IS9WD_nowManila_()) + ' Manila',
    '',
    'What went wrong:',
    IS9WD_txt_(err),
    '',
    IS9WD_txt_(err && err.stack ? err.stack : 'no stack available')
  ].join('\n');
  var sent = false;
  try {
    // EMAIL FOUR lives in IS9WD_Emails.js: it honours the alert switch and appends the last
    // log rows. The bare once a day sender stays as the fallback for a project without it.
    var four = IS9WD_apiImpl_('IS9WD_jobAlert_');
    var fn = four ? null : IS9WD_apiImpl_('IS9WD_alertOnce_');
    if (four) sent = four(jobKey, err, []);
    else if (fn) sent = fn(jobKey, subject, body);
  } catch (inner) {
    Logger.log('IS9WD: the failure mail itself failed: ' + inner);
  }
  if (say) {
    say(jobKey + ': ' + (sent ? 'you were emailed about this'
      : 'no mail was sent, either it was already sent today or mail is off'));
  }
  Logger.log('IS9WD job failed: ' + jobKey + ' ' + err +
    (err && err.stack ? '\n' + err.stack : ''));
}

// ============================================================================
//  OWNERSHIP
// ============================================================================

function IS9WD_autoMe_() {
  try {
    return IS9WD_trim_(Session.getEffectiveUser().getEmail());
  } catch (err) {
    return '';
  }
}

function IS9WD_autoOwner_() {
  try {
    var range = IS9WD_namedOrNull_('IS9WD_AUTOMATION_OWNER');
    return range ? IS9WD_trim_(range.getValue()) : '';
  } catch (err) {
    return '';
  }
}

function IS9WD_autoSetOwner_(who) {
  try {
    var range = IS9WD_namedOrNull_('IS9WD_AUTOMATION_OWNER');
    if (range) range.setValue(IS9WD_trim_(who));
  } catch (err) {
    Logger.log('IS9WD: the automation owner was not recorded: ' + err);
  }
}
