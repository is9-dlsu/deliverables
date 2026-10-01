/**
 * IS9WD_Calendar.js - every open deliverable on Google Calendar, on its deadline.
 *
 * Ethan ruled on 2026-09-29: each officer sees their own open deliverables on their own
 * Google Calendar, and a task leaves the calendar once it is accomplished and its sixty second
 * undo window has closed. So one calendar, IS9 Deliverables, lives on the President's account
 * and holds every open deliverable as an all day event on its deadline; the officer it belongs
 * to is on it as a guest, added without an invitation email, which is what puts it on their
 * own calendar. The President's own tasks carry no guest, because the calendar is his.
 *
 * THE SHEET IS THE ONLY TRUTH. Every event carries its item's ID as a tag, and a sync compares
 * the events it finds with the events the Sheet says should exist: a missing one is created, a
 * changed one (title, deadline, remark, guest) is corrected in place, and one whose item is
 * accomplished, deleted or undated is removed. Nothing is stored anywhere else, so a deleted
 * event is simply recreated and a hand edit is put back. An event without the tag is not ours
 * and is never touched.
 *
 * WHEN IT RUNS. The hourly pass and Sync deliverables to the app sync it outright. A tick or
 * an add from a page schedules one follow up run a little after the undo window, through a
 * one shot trigger, because a web request cannot wait sixty seconds: that run removes the
 * ticked task, and reschedules itself while any tick is still inside its window. One pending
 * run covers every write in the meantime.
 *
 * TEST MODE keeps officers off the events, the same way it keeps emails away from them; the
 * first sync after test mode is cleared adds them.
 */

var IS9WD_CAL_NAME_ = 'IS9 Deliverables';
var IS9WD_CAL_ID_PROP_ = 'IS9WD_CAL_ID';
var IS9WD_CAL_SWEEP_PROP_ = 'IS9WD_CAL_SWEEP_AT';
var IS9WD_CAL_SWEEP_HANDLER_ = 'IS9WD_calendarSweep';
var IS9WD_CAL_TAG_ID_ = 'is9wd_id';
var IS9WD_CAL_TAG_SIG_ = 'is9wd_sig';
// How far either side of today a sync looks for its own events. A deadline outside it widens
// the look to include it, so this only bounds how far a stale event can hide.
var IS9WD_CAL_WINDOW_DAYS_ = 400;
// HOW LONG ONE SYNC MAY SPEND CHANGING EVENTS. Turning test mode off puts an officer on every
// event at once, and on 2026-10-02 that was 149 events: at up to a second a change that is most
// of an execution's six minutes, inside an hourly pass that still has emails to send. So a sync
// stops changing after this long, says how many are left, and a follow up run a minute later
// carries on; each event records its own state as it is done, so nothing is done twice.
var IS9WD_CAL_BUDGET_MS_ = 150000;
// A pending follow up that has not run ten minutes after it was due is taken as lost.
var IS9WD_CAL_STALE_MS_ = 10 * 60 * 1000;
var IS9WD_CAL_EMAIL_ = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
var IS9WD_CAL_NOTE_ = 'Tick it off on your IS9 page. This event is kept by the IS9 ' +
  'deliverables tracker: it moves when the deadline moves, and it leaves once the task is ' +
  'accomplished.';

// ============================================================================
//  PURE  (what should exist, and what has to change; tested in Node)
// ============================================================================

/**
 * The events the Sheet says should exist, one per item: open, titled, with an ID and a real
 * deadline, plus an item ticked off so recently that its undo window is still open, marked
 * `waiting` so the follow up run knows to come back. `opts` carries testMode, adminKey,
 * undoSeconds and now (milliseconds).
 */
function IS9WD_calPlan_(items, directory, opts) {
  var o = opts || {};
  var undoMs = (IS9WD_posInt_(o.undoSeconds) || 60) * 1000;
  var now = typeof o.now === 'number' ? o.now : new Date().getTime();
  var admin = IS9WD_trim_(o.adminKey).toUpperCase();
  var out = [];
  var seen = {};
  var list = items || [];
  for (var i = 0; i < list.length; i++) {
    var it = list[i] || {};
    var id = IS9WD_trim_(it.id);
    if (id === '' || seen[id]) continue;
    var title = IS9WD_normalizeText(it.title);
    if (title === '') continue;
    var day = IS9WD_toDate_(it.deadline);
    if (!day) continue;
    var waiting = false;
    if (it.active !== true) {
      var at = IS9WD_toDate_raw_(it.statusAt);
      if (at === null || now - at >= undoMs || now < at - 60000) continue;
      waiting = true;
    }
    var entry = IS9WD_dirByCommittee_(it.committee, directory || []);
    var committee = entry ? IS9WD_trim_(entry.committee) : IS9WD_trim_(it.committee);
    var email = entry ? IS9WD_trim_(entry.email).toLowerCase() : '';
    var guest = '';
    if (o.testMode !== true && entry && IS9WD_trim_(entry.key).toUpperCase() !== admin &&
        IS9WD_CAL_EMAIL_.test(email)) {
      guest = email;
    }
    var remark = IS9WD_normalizeText(it.remark);
    var summary = title + (committee !== '' ? ' (' + committee + ')' : '');
    var description = (remark !== '' ? remark + '\n\n' : '') + IS9WD_CAL_NOTE_;
    var ymd = IS9WD_formatDate(day);
    seen[id] = true;
    out.push({
      id: id, summary: summary, date: day, ymd: ymd, guest: guest,
      description: description, waiting: waiting,
      sig: [summary, ymd, guest, description].join('|')
    });
  }
  return out;
}

// A status stamp as milliseconds, keeping the time of day, which IS9WD_toDate_ drops.
function IS9WD_toDate_raw_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
  if (typeof v === 'string' && IS9WD_trim_(v) !== '') {
    var t = new Date(v).getTime();
    return isNaN(t) ? null : t;
  }
  return null;
}

/**
 * What has to change. `existing` is [{ id, sig, ref }] for every event carrying our tag; an
 * event with no ID is somebody else's and is left alone. A second event for one ID is
 * removed, so a double create heals itself on the next run.
 */
function IS9WD_calDiff_(desired, existing) {
  var want = {};
  var i;
  for (i = 0; i < desired.length; i++) want[desired[i].id] = desired[i];
  var have = {};
  var remove = [];
  for (i = 0; i < existing.length; i++) {
    var e = existing[i];
    if (!e || IS9WD_trim_(e.id) === '') continue;
    if (!want[e.id] || have[e.id]) { remove.push(e); continue; }
    have[e.id] = e;
  }
  var create = [];
  var update = [];
  for (i = 0; i < desired.length; i++) {
    var d = desired[i];
    var h = have[d.id];
    if (!h) create.push(d);
    else if (h.sig !== d.sig) update.push({ want: d, have: h });
  }
  return { create: create, update: update, remove: remove };
}

// ============================================================================
//  THE CALENDAR ITSELF
// ============================================================================

// The IS9 Deliverables calendar on the account that runs the script, found by the id kept in
// Script Properties, then by name, and created only when `create` is set.
function IS9WD_calCalendar_(create) {
  var store = PropertiesService.getScriptProperties();
  var id = store.getProperty(IS9WD_CAL_ID_PROP_);
  var cal = id ? CalendarApp.getCalendarById(id) : null;
  if (cal) return cal;
  var owned = CalendarApp.getOwnedCalendarsByName(IS9WD_CAL_NAME_);
  cal = owned && owned.length ? owned[0] : null;
  if (!cal && create) {
    cal = CalendarApp.createCalendar(IS9WD_CAL_NAME_, {
      summary: 'Every open Investors\' Society deliverable, on its deadline. Kept by the IS9 ' +
        'deliverables tracker; an event leaves once its task is accomplished. Edit the ' +
        'Sheet, not these events: a hand edit is put back at the next sync.',
      timeZone: 'Asia/Manila'
    });
  }
  if (cal) store.setProperty(IS9WD_CAL_ID_PROP_, cal.getId());
  return cal;
}

/**
 * One sync: read the Sheet, read our events, make them agree. Returns the counts and how many
 * ticked tasks are still inside their undo window. `cfg` may be passed in by a caller that has
 * just read it; it is read fresh otherwise.
 */
function IS9WD_calSync_(cfg, say) {
  var c = cfg || IS9WD_readConfig_(true);
  if (typeof IS9WD_itemsCacheReset_ === 'function') IS9WD_itemsCacheReset_();
  var items = IS9WD_readItems_();
  var now = new Date().getTime();
  var undo = IS9WD_posInt_(c.statuses ? c.statuses.undoSeconds : null) || 60;
  var desired = IS9WD_calPlan_(items.rows, c.directory ? c.directory.rows : [], {
    testMode: !!(c.switches && c.switches.testMode),
    adminKey: IS9WD_CFG.DIRECTORY.adminKey,
    undoSeconds: undo,
    now: now
  });
  var cal = IS9WD_calCalendar_(true);
  var day = 24 * 60 * 60 * 1000;
  var from = now - IS9WD_CAL_WINDOW_DAYS_ * day;
  var to = now + IS9WD_CAL_WINDOW_DAYS_ * day;
  for (var d = 0; d < desired.length; d++) {
    var t = desired[d].date.getTime();
    if (t - day < from) from = t - day;
    if (t + 2 * day > to) to = t + 2 * day;
  }
  var events = cal.getEvents(new Date(from), new Date(to));
  var existing = [];
  for (var e = 0; e < events.length; e++) {
    var tag = IS9WD_trim_(events[e].getTag(IS9WD_CAL_TAG_ID_));
    if (tag === '') continue;
    existing.push({ id: tag, sig: IS9WD_txt_(events[e].getTag(IS9WD_CAL_TAG_SIG_)), ref: events[e] });
  }
  var plan = IS9WD_calDiff_(desired, existing);
  var i;
  // REMOVALS FIRST, THEN NEW EVENTS, THEN CORRECTIONS, because an accomplished task still on
  // the calendar is the one thing an officer would notice. Each change is tried on its own, so
  // one event Calendar refuses never stops the rest, and nothing more is started once the
  // budget is spent.
  var started = new Date().getTime();
  var spent = function () { return new Date().getTime() - started > IS9WD_CAL_BUDGET_MS_; };
  var removed = 0;
  var created = 0;
  var updated = 0;
  var left = 0;
  var failed = 0;
  var firstError = '';
  var attempt = function (fn) {
    if (spent()) { left++; return false; }
    try {
      fn();
      return true;
    } catch (err) {
      failed++;
      if (firstError === '') firstError = IS9WD_txt_(err && err.message ? err.message : err);
      return false;
    }
  };
  for (i = 0; i < plan.remove.length; i++) {
    if (attempt((function (gone) { return function () { gone.ref.deleteEvent(); }; })(plan.remove[i]))) removed++;
  }
  for (i = 0; i < plan.create.length; i++) {
    if (attempt((function (w) {
      return function () {
        var options = { description: w.description, sendInvites: false };
        if (w.guest !== '') options.guests = w.guest;
        var made = cal.createAllDayEvent(w.summary, w.date, options);
        made.setTag(IS9WD_CAL_TAG_ID_, w.id);
        made.setTag(IS9WD_CAL_TAG_SIG_, w.sig);
      };
    })(plan.create[i]))) created++;
  }
  for (i = 0; i < plan.update.length; i++) {
    if (attempt((function (u) { return function () { IS9WD_calCorrect_(u.have.ref, u.want); }; })(plan.update[i]))) updated++;
  }

  var waiting = 0;
  for (i = 0; i < desired.length; i++) if (desired[i].waiting) waiting++;
  var result = {
    events: desired.length, created: created, updated: updated, removed: removed,
    waiting: waiting, undoSeconds: undo, left: left, failed: failed, more: left > 0,
    testMode: !!(c.switches && c.switches.testMode)
  };
  if (created + updated + removed + left + failed > 0) {
    var detail = created + ' added, ' + updated + ' corrected, ' + removed + ' removed, ' +
      result.events + ' open' + (left > 0 ? ', ' + left + ' still to do in the next run' : '') +
      (failed > 0 ? ', ' + failed + ' refused by Calendar: ' + firstError : '');
    if (say) say('Calendar: ' + detail);
    IS9WD_logRow_({
      source: IS9WD_LOG_SOURCE_TRIGGER_, actor: 'Trigger', action: 'calendarSync',
      detail: detail, ok: failed === 0
    });
  }
  return result;
}

// ONE EVENT BROUGHT LEVEL, touching only what differs. Each setter is a call to Calendar, and
// the common correction is the guest alone, when test mode is cleared, so the title, the day
// and the description are compared first and written only when they changed.
function IS9WD_calCorrect_(ev, want) {
  if (ev.getTitle() !== want.summary) ev.setTitle(want.summary);
  var day = ev.isAllDayEvent() ? ev.getAllDayStartDate() : null;
  if (!day || IS9WD_formatDate(day) !== want.ymd) ev.setAllDayDate(want.date);
  if (IS9WD_txt_(ev.getDescription()) !== want.description) ev.setDescription(want.description);
  var guests = ev.getGuestList();
  var hasGuest = false;
  for (var g = 0; g < guests.length; g++) {
    var address = IS9WD_trim_(guests[g].getEmail()).toLowerCase();
    if (address === want.guest) { hasGuest = true; continue; }
    ev.removeGuest(address);
  }
  if (want.guest !== '' && !hasGuest) ev.addGuest(want.guest);
  ev.setTag(IS9WD_CAL_TAG_SIG_, want.sig);
}

// ============================================================================
//  THE FOLLOW UP AFTER A TICK
// ============================================================================

/**
 * Schedules one follow up sync `delayMs` from now, unless one is already pending. Called by the
 * endpoint after a tick or an add, under the write lock, so two writes cannot both schedule.
 * A pending run that is ten minutes overdue is taken as lost and replaced.
 */
function IS9WD_calSoon_(delayMs) {
  var store = PropertiesService.getScriptProperties();
  var now = new Date().getTime();
  var pending = Number(store.getProperty(IS9WD_CAL_SWEEP_PROP_)) || 0;
  if (pending > now - IS9WD_CAL_STALE_MS_) return false;
  ScriptApp.newTrigger(IS9WD_CAL_SWEEP_HANDLER_).timeBased().after(Math.max(delayMs, 1000)).create();
  store.setProperty(IS9WD_CAL_SWEEP_PROP_, String(now + delayMs));
  return true;
}

/**
 * THE FOLLOW UP ITSELF, called by its one shot trigger. Apps Script calls a trigger handler by
 * name, which is why this one has no trailing underscore. It removes every follow up trigger,
 * its own included, syncs, and schedules one more while a tick is still inside its window.
 * It obeys the automation switch, and a failure is logged rather than thrown: the hourly pass
 * repeats the sync within the hour.
 */
function IS9WD_calendarSweep() {
  var store = PropertiesService.getScriptProperties();
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === IS9WD_CAL_SWEEP_HANDLER_) ScriptApp.deleteTrigger(all[i]);
  }
  store.deleteProperty(IS9WD_CAL_SWEEP_PROP_);
  try {
    var cfg = IS9WD_readConfig_(true);
    if (cfg.switches && cfg.switches.automationOn === false) return;
    var out = IS9WD_lockedRun_(function () { return IS9WD_calSync_(cfg, null); });
    // Unfinished work carries on in a minute; a tick still inside its window is looked at again
    // once the window has closed.
    if (out && out.more) IS9WD_calSoon_(60000);
    else if (out && out.waiting > 0) IS9WD_calSoon_(out.undoSeconds * 1000 + 5000);
  } catch (err) {
    Logger.log('IS9WD: the calendar follow up failed: ' + err);
    IS9WD_logRow_({
      source: IS9WD_LOG_SOURCE_TRIGGER_, actor: 'Trigger', action: 'calendarSync',
      detail: 'follow up failed: ' + IS9WD_txt_(err && err.message ? err.message : err), ok: false
    });
  }
}

/**
 * CONNECT GOOGLE CALENDAR, from the Automation menu. The first run asks for the Calendar
 * permission; after that it creates the calendar if it is missing and syncs it at once.
 */
function IS9WD_calendarConnect_() {
  var cfg = IS9WD_readConfig_(true);
  var out = IS9WD_calSync_(cfg, null);
  if (out.more) IS9WD_calSoon_(60000);
  var cal = IS9WD_calCalendar_(false);
  var lines = [
    'The ' + IS9WD_CAL_NAME_ + ' calendar is on ' + (cal ? 'your account' : 'no account yet') + '.',
    out.events + ' open deliverable(s) with a deadline: ' + out.created + ' added, ' +
      out.updated + ' corrected, ' + out.removed + ' removed' +
      (out.more ? ', and ' + out.left + ' more follow in a minute or two by themselves.' : '.'),
    out.testMode
      ? 'Test mode is on, so no officer is on the events yet. They are added at the first sync after test mode is cleared.'
      : 'Each officer is on their own events as a guest, without an invitation email, so they appear on the officer\'s own calendar.',
    'From now on the hourly pass and Sync deliverables to the app keep it level, and a tick from a page leaves the calendar about a minute after its undo window closes.'
  ];
  return lines;
}
