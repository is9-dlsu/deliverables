/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · PURE CORE
 *  IS9WD_Core.js, loaded by the bound Apps Script project and by node test/
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : SPEC.md section 4 is the frozen string contract.
 *          docs/BUILD-REFERENCE.md 13.1 is the function table this file fills.
 *
 *  Every decision that does not need a spreadsheet lives here, so the strings the
 *  Canva carousel carries are composed once, server side, and pinned by Node tests.
 *  Nothing in this file touches SpreadsheetApp, MailApp, PropertiesService, Session
 *  or Utilities: dates arrive as Date objects or yyyy-MM-dd strings, and the month
 *  and day names are fixed English arrays, so no output depends on the host locale
 *  or the host time zone.
 *
 *  Contract strings are byte for byte SPEC.md section 4: two spaces each side of
 *  every pipe, U+00B7 then two spaces in a remark, upper case where shown, and the
 *  singular `1 TASK`. None changes without Ethan's approval (CLAUDE.md).
 *
 *  Asia/Manila is UTC+8 with no daylight saving, so every date comparison runs on
 *  whole day numbers built from year, month and day, never on a millisecond
 *  difference, and a local date is always rebuilt with new Date(y, m - 1, d).
 *
 *  Nothing here throws except IS9WD_exportPageList and IS9WD_newToken, which are
 *  the two places a wrong answer is worse than a stopped run. A deadline that is
 *  not a real date never throws anywhere: it flags.
 * =============================================================================
 */

// ============================================================================
//  CONSTANTS  (structural only: the Configuration tab owns every setting)
// ============================================================================

// Fixed English names, because the sheet's TEXT(date, "ddd, mmm d") is English and
// the feed strings have to match it whatever locale a runtime believes it is in.
var IS9WD_MONTHS_ = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// THE LONG MONTHS EXIST FOR THE OFFICERS PAGE AND FOR NOTHING ELSE. Ethan asked on
// 2026-09-28 for dates a person reads rather than digits: September 29, 2026.
//
// They are a SEPARATE list from the short ones on purpose. IS9WD_MONTHS_ feeds the Canva
// strings, and every one of those is frozen by SPEC section 4: the week line, the legends
// and the deadline text are read off a carousel by hundreds of people and cannot move
// without Ethan's approval. Reformatting the short month to please a phone screen would
// have silently rewritten the carousel too.
var IS9WD_MONTHS_LONG_ = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
var IS9WD_DAYS_ = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Long weekdays, for the officers page only, beside the long months and for the same reason.
var IS9WD_DAYS_LONG_ = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
  'Saturday'];

// The four urgency window names are structural: the feed formulas name them and the
// Configuration hex table is matched on them (reference 4.2).
var IS9WD_WINDOW_ORDER_ = ['OVERDUE', 'W1', 'W2', 'W3'];

// The eight flags that force Ready for Canva: NO (reference 5.3), in precedence
// order. `Overdue` is a flag and is deliberately not one of them.
var IS9WD_BLOCKING_FLAGS_ = ['Missing ID', 'Missing status', 'Unknown committee',
  'Missing title', 'Missing deadline', 'Deadline not a date',
  'Title too long', 'Remark too long'];

// Field limits from reference 5.1 and 7.5. They are sheet validation rules rather
// than Configuration settings, so this is the one place in the code that holds them.
var IS9WD_MAX_TITLE_ = 40;
var IS9WD_MAX_REMARK_ = 30;
var IS9WD_MAX_SIGNOFF_NAME_ = 60;
var IS9WD_MAX_SIGNOFF_POSITION_ = 40;

// Crockford Base32 without i, l, o and u, so nothing is misread aloud or off a
// screenshot (reference 7.3). Both are globals because token.test.js asserts them.
var IS9WD_TOKEN_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
var IS9WD_TOKEN_PATTERN = /^[0-9a-hjkmnp-tv-z]{26}$/;

var IS9WD_REQUEST_ID_PATTERN_ = /^[0-9a-f]{32}$/;
var IS9WD_DATE_PATTERN_ = /^\d{4}-\d{2}-\d{2}$/;
var IS9WD_MAX_BODY_BYTES_ = 8192;

// Action names, roles and write flags from reference 7.4. Action names, job keys and
// error codes are the only strings reference 2.5 allows to live outside Configuration.
// `open` means the action answers before any token exists, which is ping alone.
var IS9WD_ACTIONS_ = {
  ping: { open: true, admin: true, member: true, write: false },
  state: { open: false, admin: true, member: true, write: false },
  setStatus: { open: false, admin: true, member: true, write: true },
  addItem: { open: false, admin: true, member: true, write: true },
  editItem: { open: false, admin: true, member: false, write: true },
  deleteItem: { open: false, admin: true, member: false, write: true },
  rotateToken: { open: false, admin: true, member: false, write: true },
  setSignoff: { open: false, admin: true, member: false, write: true }
};

// ============================================================================
//  VALUE HELPERS
// ============================================================================

function IS9WD_txt_(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function IS9WD_trim_(v) {
  return IS9WD_txt_(v).replace(/^\s+|\s+$/g, '');
}

function IS9WD_blank_(v) {
  return IS9WD_trim_(v) === '';
}

// A cell counts as filled for COUNTA purposes. A Date is filled whatever it stringifies
// to, which is what keeps a deadline-only row out of the blank-row shortcut.
function IS9WD_filled_(v) {
  if (IS9WD_isDate_(v)) return true;
  return !IS9WD_blank_(v);
}

function IS9WD_num_(v) {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var s = IS9WD_trim_(v);
  if (s === '') return null;
  var n = Number(s);
  return isNaN(n) ? null : n;
}

function IS9WD_int_(v) {
  var n = IS9WD_num_(v);
  if (n === null) return null;
  return Math.floor(n);
}

function IS9WD_posInt_(v) {
  var n = IS9WD_int_(v);
  if (n === null || n < 1) return 0;
  return n;
}

function IS9WD_bool_(v) {
  if (v === true) return true;
  if (typeof v === 'string') return /^true$/i.test(IS9WD_trim_(v));
  return false;
}

function IS9WD_two_(n) {
  var i = IS9WD_int_(n);
  if (i === null) return '';
  var s = String(Math.abs(i));
  while (s.length < 2) s = '0' + s;
  return (i < 0 ? '-' : '') + s;
}

function IS9WD_upper_(v) {
  return IS9WD_txt_(v).toUpperCase();
}

// ============================================================================
//  DATES  (whole days, no host locale, no host zone, Manila is UTC+8 with no DST)
// ============================================================================

// Duck typed rather than `instanceof Date`, because Core is loaded into a Node vm
// realm with its own intrinsics and a Date from the host would fail instanceof.
function IS9WD_isDate_(v) {
  return !!v && typeof v.getTime === 'function' && typeof v.getFullYear === 'function' &&
    !isNaN(v.getTime());
}

function IS9WD_toDate_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (IS9WD_isDate_(v)) return v;
  if (typeof v !== 'string') return null;
  var s = IS9WD_trim_(v);
  if (!IS9WD_DATE_PATTERN_.test(s)) return null;
  var y = parseInt(s.substr(0, 4), 10);
  var m = parseInt(s.substr(5, 2), 10);
  var d = parseInt(s.substr(8, 2), 10);
  var out = new Date(y, m - 1, d);
  // Rejects 2026-02-30 and 2026-13-01, which JS would roll over silently.
  if (out.getFullYear() !== y || out.getMonth() !== m - 1 || out.getDate() !== d) return null;
  return out;
}

// A day number, so a difference is exact and no zone offset can move it.
function IS9WD_day_(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return null;
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

function IS9WD_addDays_(v, n) {
  var d = IS9WD_toDate_(v);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + IS9WD_int_(n));
}

function IS9WD_midnight_(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function IS9WD_hasTime_(v) {
  if (!IS9WD_isDate_(v)) return false;
  return v.getHours() !== 0 || v.getMinutes() !== 0 || v.getSeconds() !== 0 ||
    v.getMilliseconds() !== 0;
}

// Monday is 1 and Sunday is 7, matching WEEKDAY(date, 2) in the sheet.
function IS9WD_isoDow_(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return null;
  var js = d.getDay();
  return js === 0 ? 7 : js;
}

function IS9WD_isMonday_(v) {
  return IS9WD_isoDow_(v) === 1;
}

// `ddd, mmm d` as the sheet renders it: Mon, Sep 21.
function IS9WD_ddd_(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return '';
  return IS9WD_DAYS_[d.getDay()] + ', ' + IS9WD_MONTHS_[d.getMonth()] + ' ' + d.getDate();
}

function IS9WD_mmmD_(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return '';
  return IS9WD_MONTHS_[d.getMonth()] + ' ' + d.getDate();
}

// `Month d, yyyy` as a person says it aloud: September 29, 2026. The officers page uses this
// everywhere it shows a date. It never reaches the feed, an email subject or a Canva string.
function IS9WD_longDate(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return '';
  return IS9WD_MONTHS_LONG_[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

// The same date with the weekday in front, for a deadline where the day of the week is the
// part that actually changes behaviour: Monday, September 29, 2026.
function IS9WD_longDateDay(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return '';
  return IS9WD_DAYS_LONG_[d.getDay()] + ', ' + IS9WD_longDate(d);
}

function IS9WD_stamp_(v) {
  var d = IS9WD_toDate_(v);
  if (!d) return '';
  return IS9WD_formatDate(d) + ' ' + IS9WD_two_(d.getHours()) + ':' + IS9WD_two_(d.getMinutes());
}

// ============================================================================
//  WEEK AND TERM  (the week rolls over on Sunday, reference 4.1)
// ============================================================================

// Week start is the Monday of the week containing effective today plus one day, so a
// Sunday run already describes the week that starts the next morning.
function IS9WD_weekWindow(effectiveToday) {
  var today = IS9WD_midnight_(effectiveToday);
  if (!today) return null;
  var tomorrow = IS9WD_addDays_(today, 1);
  var start = IS9WD_addDays_(tomorrow, -(IS9WD_isoDow_(tomorrow) - 1));
  return { weekStart: start, weekEnd: IS9WD_addDays_(start, 6) };
}

// termCal rows are [name, start, end], the IS9WD_TERM_CAL range. A blank end date is
// not a harmless blank: it matches nothing, which is the mid-trimester trap in 4.3.
function IS9WD_activeTerm(date, termCal) {
  var target = IS9WD_day_(date);
  if (target === null) return null;
  var rows = IS9WD_termRows_(termCal);
  for (var i = 0; i < rows.length; i++) {
    var s = IS9WD_day_(rows[i].start);
    var e = IS9WD_day_(rows[i].end);
    if (s === null || e === null) continue;
    if (s <= target && e >= target) {
      return {
        name: IS9WD_txt_(rows[i].name),
        start: IS9WD_midnight_(rows[i].start),
        end: IS9WD_midnight_(rows[i].end)
      };
    }
  }
  return null;
}

function IS9WD_termRows_(termCal) {
  var out = [];
  if (!termCal || typeof termCal.length !== 'number') return out;
  for (var i = 0; i < termCal.length; i++) {
    var r = termCal[i];
    if (!r) continue;
    if (typeof r.length === 'number' && typeof r !== 'string') {
      out.push({ name: r[0], start: r[1], end: r[2] });
    } else {
      out.push({ name: r.name, start: r.start, end: r.end });
    }
  }
  return out;
}

// Null outside the term calendar, which the feed renders as WEEK -- and which holds
// readiness at NO, so a week number can never be guessed from an undefined term.
function IS9WD_weekNumber(weekStart, termCal) {
  var term = IS9WD_activeTerm(weekStart, termCal);
  if (!term) return null;
  var days = IS9WD_day_(weekStart) - IS9WD_day_(term.start);
  if (days === null || days < 0) return null;
  return Math.floor(days / 7) + 1;
}

// The Canva OVERDUE window is deadline before week start, which is v1's definition and
// is not the human one in 5.3. A deadline that is not a date lands in W1 so the slot
// still has a station color to paint; both conditions are blocking flags anyway.
function IS9WD_windowFor(deadline, weekStart, weekEnd) {
  var d = IS9WD_day_(deadline);
  var ws = IS9WD_day_(weekStart);
  var we = IS9WD_day_(weekEnd);
  if (d === null || ws === null || we === null) return 'W1';
  if (d < ws) return 'OVERDUE';
  if (d <= ws + 1) return 'W1';
  if (d <= we) return 'W2';
  return 'W3';
}

// ============================================================================
//  CONTRACT STRINGS  (SPEC.md section 4, frozen, byte for byte)
// ============================================================================

// SEP 21 TO 27 inside one month, SEP 30 TO OCT 4 across two, DEC 28 TO JAN 3 across a
// year. The month collapses only when year and month both match, which is the case a
// month-only comparison renders as DEC 28 TO 3.
function IS9WD_rangeText(start, end) {
  var s = IS9WD_toDate_(start);
  var e = IS9WD_toDate_(end);
  if (!s || !e) return '!ERR';
  var same = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  var tail = same ? String(e.getDate()) : IS9WD_mmmD_(e);
  return IS9WD_upper_(IS9WD_mmmD_(s) + ' TO ' + tail);
}

function IS9WD_weekLine(weekNo, rangeText, ayLabel) {
  return 'WEEK ' + IS9WD_weekNoText_(weekNo) + '  |  ' + IS9WD_txt_(rangeText) +
    '  |  ' + IS9WD_txt_(ayLabel);
}

// -- holds the width of the week line out of term, instead of collapsing it.
function IS9WD_weekNoText_(weekNo) {
  var n = IS9WD_int_(weekNo);
  return n === null ? '--' : IS9WD_two_(n);
}

// DUE SEP 21 TO 22, DUE SEP 23 TO 27, DUE AFTER SEP 27: W1 is the first two days of
// the week, W2 the rest of it, W3 anything after it.
function IS9WD_legendLines(weekStart, weekEnd) {
  var ws = IS9WD_toDate_(weekStart);
  var we = IS9WD_toDate_(weekEnd);
  if (!ws || !we) return ['!ERR', '!ERR', '!ERR'];
  return [
    'DUE ' + IS9WD_rangeText(ws, IS9WD_addDays_(ws, 1)),
    'DUE ' + IS9WD_rangeText(IS9WD_addDays_(ws, 2), we),
    'DUE AFTER ' + IS9WD_upper_(IS9WD_mmmD_(we))
  ];
}

// The committee pages uppercase both halves. The title page's prepared-by position
// prints as typed, and that asymmetry is v1's and is kept on purpose.
function IS9WD_vpLine(vpName, position) {
  return IS9WD_upper_(vpName) + '  |  ' + IS9WD_upper_(position);
}

// count is what the caller decided to print, and the feed passes the count that FIT, not
// the count the officer holds: an officer holding 16 items on a 15 slot slide reads
// 15 TASKS, and the 1 that did not fit is reported by the feed rather than on the slide.
// Ethan ruled on 2026-09-28 that the slide must be internally consistent, so a reader
// who counts the lines gets the number in the headline. What did not fit is not silent:
// it is in Not published, in the app, in the emails and in the Sunday brief.
function IS9WD_tagline(weekNo, rangeText, count) {
  var n = IS9WD_int_(count);
  if (n === null) n = 0;
  return 'WEEKLY DELIVERABLES  |  WEEK ' + IS9WD_weekNoText_(weekNo) + '  |  ' +
    IS9WD_txt_(rangeText) + '  |  ' + n + ' TASK' + (n === 1 ? '' : 'S');
}

function IS9WD_deadlineText(deadline, weekStart) {
  var d = IS9WD_toDate_(deadline);
  if (!d) return '';
  var ws = IS9WD_day_(weekStart);
  if (ws === null) return '!ERR';
  return (IS9WD_day_(d) < ws ? 'Overdue: ' : 'Due ') + IS9WD_ddd_(d);
}

// items is the committee's active titled items. A committee whose items all carry
// unusable deadlines reads `Next due: date missing` rather than nothing.
function IS9WD_nextDueText(items, weekStart) {
  var list = items && typeof items.length === 'number' ? items : [];
  if (list.length === 0) return 'No deliverables this week';
  var earliest = null;
  var at = null;
  for (var i = 0; i < list.length; i++) {
    var raw = list[i] ? list[i].deadline : null;
    var d = IS9WD_day_(raw);
    if (d === null) continue;
    if (earliest === null || d < earliest) {
      earliest = d;
      at = IS9WD_midnight_(raw);
    }
  }
  if (earliest === null) return 'Next due: date missing';
  var ws = IS9WD_day_(weekStart);
  if (ws === null) return '!ERR';
  return (earliest < ws ? 'Overdue: ' : 'Next due ') + IS9WD_ddd_(at);
}

// U+00B7 then two spaces. Both are contract.
function IS9WD_remarkText(remark) {
  if (IS9WD_blank_(remark)) return '';
  return '·  ' + IS9WD_txt_(remark);
}

// ============================================================================
//  STATUS  (nothing keys on a label, everything reads the derived Active flag)
// ============================================================================

// statusList is the Configuration block: [{name, terminal}] or raw [name, terminal]
// rows. Matching is case insensitive after a trim, as the sheet's MATCH and COUNTIF
// both are, so the derived flag and the Check flag agree on what a known status is.
function IS9WD_statusEntries_(statusList) {
  var out = [];
  if (!statusList || typeof statusList.length !== 'number') return out;
  for (var i = 0; i < statusList.length; i++) {
    var r = statusList[i];
    if (r === null || r === undefined) continue;
    if (typeof r === 'string') {
      out.push({ name: r, terminal: false });
    } else if (typeof r.length === 'number') {
      if (IS9WD_blank_(r[0])) continue;
      out.push({ name: r[0], terminal: IS9WD_bool_(r[1]) });
    } else {
      if (IS9WD_blank_(r.name)) continue;
      out.push({ name: r.name, terminal: IS9WD_bool_(r.terminal) });
    }
  }
  return out;
}

function IS9WD_statusEntry_(status, statusList) {
  var want = IS9WD_trim_(status).toLowerCase();
  if (want === '') return null;
  var rows = IS9WD_statusEntries_(statusList);
  for (var i = 0; i < rows.length; i++) {
    if (IS9WD_trim_(rows[i].name).toLowerCase() === want) return rows[i];
  }
  return null;
}

function IS9WD_isActive(status, statusList) {
  var found = IS9WD_statusEntry_(status, statusList);
  if (!found) return false;
  return !found.terminal;
}

// Always true for the admin, so Ethan is the only one who can reopen an older item.
// A member is inside the window only while the elapsed time is under undoSeconds, so
// undoSeconds 0 disables unticking altogether, which is a supported state (4.4).
function IS9WD_undoAllowed(statusAt, now, undoSeconds, role) {
  if (IS9WD_trim_(role).toLowerCase() === 'admin') return true;
  var seconds = IS9WD_num_(undoSeconds);
  if (seconds === null || seconds <= 0) return false;
  var at = IS9WD_parseStamp_(statusAt);
  var clock = IS9WD_isDate_(now) ? now : IS9WD_parseStamp_(now);
  if (!at || !clock) return false;
  var elapsed = (clock.getTime() - at.getTime()) / 1000;
  // A negative elapsed means the stored stamp is ahead of the server clock, which is a
  // broken state rather than a wide window, so it is refused.
  return elapsed >= 0 && elapsed < seconds;
}

// Accepts a Date, `yyyy-MM-dd HH:mm` as column G writes it, or `yyyy-MM-dd`.
function IS9WD_parseStamp_(v) {
  if (IS9WD_isDate_(v)) return v;
  var s = IS9WD_trim_(v);
  if (s === '') return null;
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10),
    m[4] ? parseInt(m[4], 10) : 0, m[5] ? parseInt(m[5], 10) : 0,
    m[6] ? parseInt(m[6], 10) : 0);
}

// ============================================================================
//  WEEKLY SIGN-OFF  (per week, never a setting: last week's names must not print)
// ============================================================================

// signoffRows are the IS9WD_SIGNOFF range, [weekStart, preparedName, preparedPosition,
// checkedName, checkedPosition, setAt]. The first matching row wins, exactly as the
// sheet's MATCH does, which is why a duplicate week is a Check failure upstream.
function IS9WD_signoffFor(weekStart, signoffRows) {
  var out = {
    preparedName: '', preparedPosition: '', checkedName: '', checkedPosition: '',
    setAt: '', set: false
  };
  var want = IS9WD_day_(weekStart);
  if (want === null) return out;
  var rows = signoffRows && typeof signoffRows.length === 'number' ? signoffRows : [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r) continue;
    var isArray = typeof r.length === 'number' && typeof r !== 'string';
    var wk = isArray ? r[0] : r.weekStart;
    if (IS9WD_day_(wk) !== want) continue;
    out.preparedName = IS9WD_txt_(isArray ? r[1] : r.preparedName);
    out.preparedPosition = IS9WD_txt_(isArray ? r[2] : r.preparedPosition);
    out.checkedName = IS9WD_txt_(isArray ? r[3] : r.checkedName);
    out.checkedPosition = IS9WD_txt_(isArray ? r[4] : r.checkedPosition);
    var stamp = isArray ? r[5] : r.setAt;
    out.setAt = IS9WD_isDate_(stamp) ? IS9WD_stamp_(stamp) : IS9WD_txt_(stamp);
    out.set = !IS9WD_blank_(out.preparedName) && !IS9WD_blank_(out.preparedPosition) &&
      !IS9WD_blank_(out.checkedName) && !IS9WD_blank_(out.checkedPosition);
    return out;
  }
  return out;
}

// ============================================================================
//  TEXT NORMALIZATION  (on the way in, once, so no contract string needs a TRIM)
// ============================================================================

// A TRIM around a section 6 string would collapse the double spaces the contract
// requires, so the fix has to be upstream of composition. Only runs containing a line
// break or a tab collapse, which is what leaves a deliberate double space alone.
function IS9WD_normalizeText(s) {
  return IS9WD_txt_(s)
    .replace(/[ \t\r\n\f\v]*[\r\n\t][ \t\r\n\f\v]*/g, ' ')
    .replace(/^\s+|\s+$/g, '');
}

// One title or remark cell as the tidy pass sees it: the cleaned text when the cell is text
// and cleaning changes it, otherwise null, so a caller writes only what actually changed. A
// number, a date or an empty cell is never touched, and neither is a long one: cutting a title
// would change what it says, so length stays the self test's to name.
function IS9WD_tidyCell_(v) {
  if (typeof v !== 'string' || v === '') return null;
  var clean = IS9WD_normalizeText(v);
  return clean === v ? null : clean;
}

// ============================================================================
//  RANK, PAGES AND SLOTS  (the pagination design, reference 5.4 and 6.3)
// ============================================================================

// Deadline ascending then ID ascending, which is v1's three part sort reduced: every
// overdue item already sorts before every other one. The tie break is the ID and not
// the row, because one sort of the tab would renumber every same-deadline tie. A
// deadline that is not a date counts as day zero, so it sorts first and is seen.
function IS9WD_sortActive(items) {
  var list = [];
  if (items && typeof items.length === 'number') {
    for (var i = 0; i < items.length; i++) list.push(items[i]);
  }
  return list.sort(function (a, b) {
    var da = IS9WD_day_(a ? a.deadline : null);
    var db = IS9WD_day_(b ? b.deadline : null);
    if (da === null) da = 0;
    if (db === null) db = 0;
    if (da !== db) return da - db;
    var ia = IS9WD_txt_(a ? a.id : '');
    var ib = IS9WD_txt_(b ? b.id : '');
    return ia < ib ? -1 : (ia > ib ? 1 : 0);
  });
}

// parts is MAX(1, ROUNDUP(count / slotsPerPage)) capped at maxParts. Ten items give
// ONE part: a naive INT(n / 10) + 1 gives two and publishes a blank continuation
// slide for every committee that is exactly full, every week.
function IS9WD_publishSplit(count, slotsPerPage, maxParts) {
  var n = IS9WD_int_(count);
  if (n === null || n < 0) n = 0;
  var per = IS9WD_posInt_(slotsPerPage);
  var cap = IS9WD_posInt_(maxParts);
  // A broken capacity number publishes nothing rather than computing slot keys no
  // Canva page can hold. The workbook's Capacity check holds readiness at NO for it.
  if (per === 0 || cap === 0) return { parts: 1, published: 0, notPublished: n };
  var parts = Math.max(1, Math.ceil(n / per));
  if (parts > cap) parts = cap;
  var published = Math.min(n, per * cap);
  return { parts: parts, published: published, notPublished: Math.max(0, n - published) };
}

// The one place a physical page number is produced. Page 1 is the title page. At one page
// per officer, which is the shipping setting, order 1 owns 02 and order 14 owns 15, so the
// map is simply the order plus one and any ascending subset of pages is already in reading
// order. The formula still carries the general case: at a cap of 2 an order would own an
// adjacent pair, which is what the design was before 2026-09-28. Null when no page can
// hold it, including every part past the cap, which the data tab renders as a blank
// Master page and which is now the per row proof that continuation pages are gone.
function IS9WD_masterPage(carouselOrder, part, maxParts) {
  var i = IS9WD_int_(carouselOrder);
  var p = IS9WD_int_(part);
  var cap = IS9WD_posInt_(maxParts);
  if (i === null || i < 1 || p === null || p < 1 || cap === 0 || p > cap) return null;
  return 1 + (i - 1) * cap + p;
}

// One entry per window name, from the Configuration hex table. Accepts a map keyed on
// the window name or the raw four rows in IS9WD_WINDOW_NAMES order.
function IS9WD_hexFor_(hex, win) {
  var miss = { station: '!ERR', numberText: '!ERR' };
  if (!hex || !win) return miss;
  var row = null;
  if (typeof hex.length === 'number') {
    var at = -1;
    for (var i = 0; i < IS9WD_WINDOW_ORDER_.length; i++) {
      if (IS9WD_WINDOW_ORDER_[i] === win) at = i;
    }
    if (at < 0 || at >= hex.length) return miss;
    row = hex[at];
  } else {
    row = hex[win];
  }
  if (!row) return miss;
  var station, numberText;
  if (typeof row === 'string') {
    station = row;
    numberText = '';
  } else if (typeof row.length === 'number') {
    station = row[0];
    numberText = row[1];
  } else {
    station = row.station !== undefined ? row.station : row.stationHex;
    numberText = row.numberText !== undefined ? row.numberText : row.numberTextHex;
  }
  if (IS9WD_blank_(station) || IS9WD_blank_(numberText)) return miss;
  return { station: IS9WD_txt_(station), numberText: IS9WD_txt_(numberText) };
}

// One page object per part, each carrying exactly slotsPerPage rows so an unused frame
// is a row with Visible FALSE rather than a missing row. No page number is produced
// here: that is IS9WD_masterPage alone. Item no is the officer relative rank, so page
// 2's first slot reads 11, which is the run's cross check that the right items landed.
function IS9WD_slotRows(items, weekStart, weekEnd, hex, slotsPerPage, maxParts) {
  var sorted = IS9WD_sortActive(items);
  var per = IS9WD_posInt_(slotsPerPage);
  var split = IS9WD_publishSplit(sorted.length, slotsPerPage, maxParts);
  var pages = [];
  for (var p = 1; p <= split.parts; p++) {
    var rows = [];
    for (var s = 1; s <= per; s++) {
      var rank = (p - 1) * per + s;
      var item = rank <= split.published ? sorted[rank - 1] : null;
      rows.push(IS9WD_slotRow_(item, s, rank, weekStart, weekEnd, hex));
    }
    pages.push({ part: p, rows: rows });
  }
  return { pages: pages, notPublished: split.notPublished };
}

function IS9WD_slotRow_(item, slot, rank, weekStart, weekEnd, hex) {
  var row = {
    slot: IS9WD_two_(slot), visible: false, title: '', deadlineText: '',
    remarkVisible: false, remarkText: '', window: '', stationHex: '',
    numberTextHex: '', flag: '', itemNo: ''
  };
  if (!item) return row;
  var win = IS9WD_windowFor(item.deadline, weekStart, weekEnd);
  var paint = IS9WD_hexFor_(hex, win);
  var remark = IS9WD_txt_(item.remark);
  row.visible = true;
  row.title = IS9WD_txt_(item.title);
  row.deadlineText = IS9WD_deadlineText(item.deadline, weekStart);
  row.remarkVisible = !IS9WD_blank_(remark);
  row.remarkText = IS9WD_remarkText(remark);
  row.window = win;
  row.stationHex = paint.station;
  row.numberTextHex = paint.numberText;
  row.flag = IS9WD_txt_(item.flag !== undefined ? item.flag : item.check);
  row.itemNo = IS9WD_two_(rank);
  return row;
}

// The plan rows, one per physical master page, always present and some of them unused in
// a normal week. Fifteen of them on the shipping setting, one title page plus fourteen
// officers, and the count is computed from the capacity numbers rather than fixed. Row one is the title page. Used is the only thing that
// decides whether a page reaches the carousel, and Position is the slide number the
// viewer will see, renumbered with no gap whenever a page drops out.
function IS9WD_pagePlan(officers, slotsPerPage, maxParts, publishEmptyPages) {
  var cap = IS9WD_posInt_(maxParts);
  var rows = IS9WD_officerRows_(officers);
  var empties = IS9WD_bool_(publishEmptyPages);
  var used = 1;
  var plan = [{
    page: 1, used: true, position: IS9WD_two_(1), part: '', parts: '',
    firstItemNo: '', lastItemNo: '', slotsUsed: '', count: ''
  }];
  for (var i = 0; i < rows.length; i++) {
    var order = rows[i].carouselOrder;
    var split = IS9WD_publishSplit(rows[i].count, slotsPerPage, cap);
    var count = split.published;
    for (var p = 1; p <= cap; p++) {
      var isUsed = p <= split.parts && (count > 0 || empties);
      var first = (p - 1) * IS9WD_posInt_(slotsPerPage) + 1;
      var last = Math.min(count, p * IS9WD_posInt_(slotsPerPage));
      if (isUsed) used++;
      plan.push({
        page: IS9WD_masterPage(order, p, cap),
        used: isUsed,
        position: isUsed ? IS9WD_two_(used) : '',
        part: p,
        parts: split.parts,
        firstItemNo: isUsed ? IS9WD_two_(first) : '',
        lastItemNo: isUsed ? IS9WD_two_(last) : '',
        slotsUsed: isUsed ? Math.max(0, last - first + 1) : '',
        count: count
      });
    }
  }
  return plan;
}

// The publishing officers in carousel order. A blank carousel order on a publishing row
// is a directory Check failure, so it is skipped here rather than guessed at.
function IS9WD_officerRows_(officers) {
  var out = [];
  if (!officers || typeof officers.length !== 'number') return out;
  for (var i = 0; i < officers.length; i++) {
    var o = officers[i];
    if (!o) continue;
    if (o.publishes !== undefined && !IS9WD_bool_(o.publishes)) continue;
    var order = IS9WD_int_(o.carouselOrder !== undefined ? o.carouselOrder :
      (o.order !== undefined ? o.order : o.ordinal));
    if (order === null || order < 1) continue;
    var count = IS9WD_int_(o.count !== undefined ? o.count : o.activeCount);
    out.push({ carouselOrder: order, count: count === null ? 0 : count });
  }
  out.sort(function (a, b) { return a.carouselOrder - b.carouselOrder; });
  return out;
}

// Plain ascending integers, which is what the export operation's page list takes. It
// throws rather than returning on a plan that is not ascending, because a subset taken
// in ascending order is the only reason the run never reorders a page.
function IS9WD_exportPageList(plan) {
  var rows = plan && typeof plan.length === 'number' ? plan : [];
  var out = [];
  var last = null;
  for (var i = 0; i < rows.length; i++) {
    var page = IS9WD_int_(rows[i] ? rows[i].page : null);
    if (page === null) {
      throw new Error('Page plan row ' + (i + 1) + ' has no page number.');
    }
    if (last !== null && page <= last) {
      throw new Error('Page plan is not ascending at row ' + (i + 1) + ': ' + page +
        ' follows ' + last + '.');
    }
    last = page;
    if (IS9WD_bool_(rows[i].used)) out.push(page);
  }
  return out.join(',');
}

// ============================================================================
//  CHECK FLAGS  (reference 5.3, precedence top to bottom, first match wins)
// ============================================================================

// Over cap is gone with the cap: an eleventh item is a week with eleven things in it,
// not a mistake, so what replaced it is a set of counts rather than a flag.
// The committee is known when the caller says so, through committeeKnown or the !ERR
// the Publish key column carries; a blank committee is never in the directory.
function IS9WD_checkFlag(item, effectiveToday, statusList) {
  var it = item || {};
  var committee = IS9WD_txt_(it.committee);
  var title = IS9WD_txt_(it.title);
  var remark = IS9WD_txt_(it.remark);
  var status = IS9WD_txt_(it.status);
  var deadline = it.deadline;

  // Keys on the used cells and not on the ID, or a hand typed row would get a rank and
  // a Canva slot while Check stayed blank above it.
  var usedRow = IS9WD_filled_(committee) || IS9WD_filled_(title) || IS9WD_filled_(remark) ||
    IS9WD_filled_(status) || IS9WD_filled_(deadline);
  if (!usedRow) return '';

  if (IS9WD_blank_(it.id)) return 'Missing ID';
  if (!IS9WD_statusEntry_(status, statusList)) return 'Missing status';
  if (!IS9WD_committeeKnown_(it)) return 'Unknown committee';
  if (IS9WD_blank_(title)) return 'Missing title';
  if (!IS9WD_filled_(deadline)) return 'Missing deadline';
  if (!IS9WD_toDate_(deadline) || IS9WD_hasTime_(deadline)) return 'Deadline not a date';
  if (title.length > IS9WD_MAX_TITLE_) return 'Title too long';
  if (remark.length > IS9WD_MAX_REMARK_) return 'Remark too long';

  var today = IS9WD_day_(effectiveToday);
  if (IS9WD_isActive(status, statusList) && today !== null && IS9WD_day_(deadline) < today) {
    return 'Overdue';
  }
  return '';
}

function IS9WD_committeeKnown_(item) {
  if (item.committeeKnown === true) return true;
  if (item.committeeKnown === false) return false;
  if (IS9WD_txt_(item.publishKey) === '!ERR') return false;
  return !IS9WD_blank_(item.committee);
}

function IS9WD_isBlockingFlag_(flag) {
  var f = IS9WD_trim_(flag);
  for (var i = 0; i < IS9WD_BLOCKING_FLAGS_.length; i++) {
    if (IS9WD_BLOCKING_FLAGS_[i] === f) return true;
  }
  return false;
}

// ============================================================================
//  DIRECTORY, TOKENS AND VALIDATION
// ============================================================================

// The directory as 4.8 orders it, either objects or the raw IS9WD_DIRECTORY rows
// A to L: key, carousel order, committee or office, full name, position label, email,
// token prefix, token issued, revoked, check, publishes, hierarchy order.
function IS9WD_dirRows_(directory) {
  var out = [];
  if (!directory || typeof directory.length !== 'number') return out;
  for (var i = 0; i < directory.length; i++) {
    var r = directory[i];
    if (!r) continue;
    if (typeof r.length === 'number' && typeof r !== 'string') {
      if (IS9WD_blank_(r[0])) continue;
      out.push({
        key: IS9WD_trim_(r[0]), carouselOrder: r[1], committee: IS9WD_txt_(r[2]),
        name: IS9WD_txt_(r[3]), position: IS9WD_txt_(r[4]), email: IS9WD_txt_(r[5]),
        revoked: IS9WD_bool_(r[8]), publishes: IS9WD_bool_(r[10]), hierarchy: r[11]
      });
    } else {
      if (IS9WD_blank_(r.key)) continue;
      out.push({
        key: IS9WD_trim_(r.key), carouselOrder: r.carouselOrder,
        committee: IS9WD_txt_(r.committee !== undefined ? r.committee : r.name),
        name: IS9WD_txt_(r.fullName !== undefined ? r.fullName : r.vp),
        position: IS9WD_txt_(r.position !== undefined ? r.position : r.positionLabel),
        email: IS9WD_txt_(r.email), revoked: IS9WD_bool_(r.revoked),
        publishes: IS9WD_bool_(r.publishes), hierarchy: r.hierarchy
      });
    }
  }
  return out;
}

function IS9WD_dirByKey_(key, directory) {
  var want = IS9WD_trim_(key).toUpperCase();
  if (want === '') return null;
  var rows = IS9WD_dirRows_(directory);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key.toUpperCase() === want) return rows[i];
  }
  return null;
}

function IS9WD_dirByCommittee_(committee, directory) {
  var want = IS9WD_trim_(committee).toLowerCase();
  if (want === '') return null;
  var rows = IS9WD_dirRows_(directory);
  for (var i = 0; i < rows.length; i++) {
    if (IS9WD_trim_(rows[i].committee).toLowerCase() === want) return rows[i];
  }
  return null;
}

function IS9WD_isRevoked_(key, directory) {
  var row = IS9WD_dirByKey_(key, directory);
  return !!row && row.revoked === true;
}

// Rejects on format before comparing anything, and skips any stored value that fails
// the same pattern, because a whitespace token trims to "" and would otherwise match a
// missing stored value and authenticate against a world reachable endpoint (7.3).
// tokens is the Script Properties map, IS9WD_TOKEN_<key> plus IS9WD_TOKEN_ADMIN.
// The admin token resolves to no committee on purpose: it reaches all 14 entries, and
// binding it to the President's row would invite a committee check that quietly passes.
function IS9WD_tokenLookup(token, directory, tokens) {
  var t = IS9WD_trim_(token).toLowerCase();
  if (!IS9WD_TOKEN_PATTERN.test(t)) return null;
  var store = tokens || {};
  if (IS9WD_tokenMatches_(t, IS9WD_storedToken_(store, 'ADMIN'))) {
    return {
      role: 'admin', key: 'ADMIN', carouselOrder: '', publishes: false,
      committee: '', name: 'Admin'
    };
  }
  var rows = IS9WD_dirRows_(directory);
  for (var i = 0; i < rows.length; i++) {
    if (!IS9WD_tokenMatches_(t, IS9WD_storedToken_(store, rows[i].key))) continue;
    var order = IS9WD_int_(rows[i].carouselOrder);
    return {
      role: 'member',
      key: rows[i].key,
      carouselOrder: rows[i].publishes && order !== null ? order : '',
      publishes: rows[i].publishes === true,
      committee: rows[i].committee,
      name: rows[i].name
    };
  }
  return null;
}

function IS9WD_storedToken_(store, key) {
  var names = ['IS9WD_TOKEN_' + key, 'IS9WD_TOKEN_' + IS9WD_trim_(key).toUpperCase(),
    key, IS9WD_trim_(key).toUpperCase(), IS9WD_trim_(key).toLowerCase()];
  for (var i = 0; i < names.length; i++) {
    if (Object.prototype.hasOwnProperty.call(store, names[i])) return store[names[i]];
  }
  return null;
}

function IS9WD_tokenMatches_(token, stored) {
  var s = IS9WD_trim_(stored).toLowerCase();
  if (!IS9WD_TOKEN_PATTERN.test(s)) return false;
  return s === token;
}

// hex is 64 hex characters, two UUIDs stripped of hyphens and concatenated by the
// caller, because Core calls no Utilities. 256 mod 32 is 0, so mapping whole bytes is
// unbiased; mapping hex characters directly would reach only 16 of the 32 symbols.
function IS9WD_newToken(hex) {
  var s = IS9WD_trim_(hex).toLowerCase();
  if (!/^[0-9a-f]+$/.test(s) || s.length < 52) {
    throw new Error('IS9WD_newToken needs at least 52 hex characters.');
  }
  var out = '';
  for (var i = 0; i < 26; i++) {
    out += IS9WD_TOKEN_ALPHABET.charAt(parseInt(s.substr(i * 2, 2), 16) % 32);
  }
  return out;
}

// Repeats every sheet rule, because a data validation does not apply to a code write
// and a multi-cell paste walks straight past the one that does (7.5).
function IS9WD_validateItem(payload, directory, statusList) {
  var p = payload || {};
  if (IS9WD_blank_(p.committee)) {
    return IS9WD_invalid_('committee', 'Committee is required.');
  }
  if (!IS9WD_dirByCommittee_(p.committee, directory)) {
    return IS9WD_invalid_('committee', 'Committee is not in the directory.');
  }
  var title = IS9WD_normalizeText(p.title);
  if (title === '') return IS9WD_invalid_('title', 'Title is required.');
  if (title.length > IS9WD_MAX_TITLE_) {
    return IS9WD_invalid_('title', 'Title must be ' + IS9WD_MAX_TITLE_ +
      ' characters or fewer.');
  }
  if (IS9WD_blank_(p.deadline) && !IS9WD_isDate_(p.deadline)) {
    return IS9WD_invalid_('deadline', 'Deadline is required.');
  }
  if (!IS9WD_toDate_(p.deadline) || IS9WD_hasTime_(p.deadline)) {
    return IS9WD_invalid_('deadline', 'Deadline must be a date.');
  }
  var remark = IS9WD_normalizeText(p.remark);
  if (remark.length > IS9WD_MAX_REMARK_) {
    return IS9WD_invalid_('remark', 'Remark must be ' + IS9WD_MAX_REMARK_ +
      ' characters or fewer.');
  }
  if (p.status !== undefined && !IS9WD_blank_(p.status) &&
    !IS9WD_statusEntry_(p.status, statusList)) {
    return IS9WD_invalid_('status', 'Status is not in the status list.');
  }
  return { ok: true };
}

// The sign-off store's own rules (4.5, 7.5). A week other than the current one is
// allowed: correcting last week's published carousel is a real case.
function IS9WD_validateSignoff_(payload) {
  var p = payload || {};
  if (!IS9WD_DATE_PATTERN_.test(IS9WD_trim_(p.weekStart)) && !IS9WD_isDate_(p.weekStart)) {
    return IS9WD_invalid_('weekStart', 'Week start must be a date.');
  }
  var week = IS9WD_toDate_(p.weekStart);
  if (!week) return IS9WD_invalid_('weekStart', 'Week start must be a date.');
  if (!IS9WD_isMonday_(week)) {
    return IS9WD_invalid_('weekStart', 'Week start must be a Monday.');
  }
  var fields = [
    ['preparedName', 'Prepared by name', IS9WD_MAX_SIGNOFF_NAME_],
    ['preparedPosition', 'Prepared by position', IS9WD_MAX_SIGNOFF_POSITION_],
    ['checkedName', 'Checked by name', IS9WD_MAX_SIGNOFF_NAME_],
    ['checkedPosition', 'Checked by position', IS9WD_MAX_SIGNOFF_POSITION_]
  ];
  for (var i = 0; i < fields.length; i++) {
    var value = IS9WD_normalizeText(p[fields[i][0]]);
    if (value === '') {
      return IS9WD_invalid_(fields[i][0], fields[i][1] + ' is required.');
    }
    if (value.length > fields[i][2]) {
      return IS9WD_invalid_(fields[i][0], fields[i][1] + ' must be ' + fields[i][2] +
        ' characters or fewer.');
    }
  }
  return { ok: true };
}

function IS9WD_invalid_(field, message) {
  return { ok: false, field: field, message: message };
}

// yyyy-MM-dd both ways, constructed as new Date(y, m - 1, d) in the script zone.
// Never new Date(iso), which parses as UTC midnight and lands at 08:00 in an
// Asia/Manila spreadsheet, breaking both the display and every week start comparison.
function IS9WD_parseDate(str) {
  if (typeof str === 'string' && !IS9WD_DATE_PATTERN_.test(IS9WD_trim_(str))) return null;
  var d = IS9WD_toDate_(str);
  return d ? IS9WD_midnight_(d) : null;
}

function IS9WD_formatDate(date) {
  var d = IS9WD_toDate_(date);
  if (!d) return '';
  return d.getFullYear() + '-' + IS9WD_two_(d.getMonth() + 1) + '-' + IS9WD_two_(d.getDate());
}

// ============================================================================
//  JOBS AND RECIPIENTS  (reference 8.2 and 8.5)
// ============================================================================

// All 14 entries are in scope, including the five with no Canva page. Reads each item's
// own active flag, because this function is given no status list: the caller derives it
// with IS9WD_isActive. The Sunday brief is addressed from Configuration, not from the
// directory, so its recipient list here is empty on purpose.
function IS9WD_recipientsFor(jobKey, directory, items, effectiveToday) {
  var job = IS9WD_trim_(jobKey).toUpperCase();
  if (job !== 'MONDAY_ASSIGNMENTS' && job !== 'DAILY_DIGEST') return [];
  var rows = IS9WD_dirRows_(directory);
  var list = items && typeof items.length === 'number' ? items : [];
  var today = IS9WD_day_(effectiveToday);
  var wanted = {};
  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    if (!it || it.active !== true || IS9WD_blank_(it.title)) continue;
    if (job === 'DAILY_DIGEST') {
      var d = IS9WD_day_(it.deadline);
      if (d === null || today === null) continue;
      if (d !== today + 1 && d >= today) continue;
    }
    wanted[IS9WD_trim_(it.committee).toLowerCase()] = true;
  }
  var out = [];
  for (var r = 0; r < rows.length; r++) {
    if (wanted[IS9WD_trim_(rows[r].committee).toLowerCase()] === true) out.push(rows[r]);
  }
  // Hierarchy order, because every list a person reads is in hierarchy order (4.8).
  out.sort(function (a, b) {
    var ha = IS9WD_int_(a.hierarchy);
    var hb = IS9WD_int_(b.hierarchy);
    if (ha === null) ha = 99;
    if (hb === null) hb = 99;
    if (ha !== hb) return ha - hb;
    return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0);
  });
  return out;
}

// IS9WD_DONE_<JOBKEY>_<yyyy-MM-dd>, plus the directory key for a per recipient key, so
// one bad address cannot re-mail everyone ahead of it on the next hourly pass. Keyed on
// the directory key and not a page, because five entries have no page.
function IS9WD_doneKey(jobKey, dateStr, key) {
  var date = IS9WD_isDate_(dateStr) ? IS9WD_formatDate(dateStr) : IS9WD_trim_(dateStr);
  var out = 'IS9WD_DONE_' + IS9WD_trim_(jobKey).toUpperCase() + '_' + date;
  if (!IS9WD_blank_(key)) out += '_' + IS9WD_trim_(key);
  return out;
}

// nowManila carries the real Manila clock, never effective today: keying a weekday or
// an hour gate on the override would freeze every job behind a done key that never
// advances, with a green heartbeat above it. The caller converts the clock.
function IS9WD_shouldRun(jobRow, nowManila, doneKeys) {
  var row = IS9WD_scheduleRow_(jobRow);
  var now = IS9WD_isDate_(nowManila) ? nowManila : IS9WD_parseStamp_(nowManila);
  if (!row || !now) return 'skip';
  if (row.on !== true) return 'skip';
  if (IS9WD_trim_(row.check) !== '' && IS9WD_trim_(row.check).toUpperCase() !== 'OK') {
    return 'skip';
  }
  if (IS9WD_doneKeySet_(doneKeys, IS9WD_doneKey(row.jobKey, IS9WD_formatDate(now), ''))) {
    return 'skip';
  }
  var weekly = IS9WD_trim_(row.runs).toLowerCase() === 'weekly';
  var day = IS9WD_trim_(row.day);
  if (weekly) {
    if (day === '' || day.toLowerCase() === 'any') return 'skip';
    if (!IS9WD_dayMatches_(day, now)) return 'skip';
  }
  var hour = IS9WD_int_(row.hour);
  if (hour === null || hour < 0 || hour > 23) return 'skip';
  var catchUp = IS9WD_int_(row.catchUp);
  if (catchUp === null || catchUp < 0) catchUp = 0;
  if (now.getHours() < hour) return 'skip';
  // The window closes rather than firing a Monday email on Thursday.
  if (now.getHours() > hour + catchUp) return 'missed';
  return 'run';
}

function IS9WD_scheduleRow_(jobRow) {
  if (!jobRow) return null;
  if (typeof jobRow.length === 'number' && typeof jobRow !== 'string') {
    if (IS9WD_blank_(jobRow[0])) return null;
    return {
      jobKey: IS9WD_trim_(jobRow[0]), runs: jobRow[1], day: jobRow[2], hour: jobRow[3],
      catchUp: jobRow[4], on: IS9WD_bool_(jobRow[5]), check: jobRow[6]
    };
  }
  if (IS9WD_blank_(jobRow.jobKey)) return null;
  return {
    jobKey: IS9WD_trim_(jobRow.jobKey), runs: jobRow.runs, day: jobRow.day,
    hour: jobRow.hour, catchUp: jobRow.catchUp !== undefined ? jobRow.catchUp :
      jobRow.catchUpHours, on: IS9WD_bool_(jobRow.on), check: jobRow.check
  };
}

function IS9WD_dayMatches_(day, now) {
  var full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var want = IS9WD_trim_(day).toLowerCase();
  var at = now.getDay();
  return want === full[at].toLowerCase() || want === IS9WD_DAYS_[at].toLowerCase();
}

function IS9WD_doneKeySet_(doneKeys, key) {
  if (!doneKeys) return false;
  if (typeof doneKeys.length === 'number' && typeof doneKeys !== 'string') {
    for (var i = 0; i < doneKeys.length; i++) {
      if (IS9WD_trim_(doneKeys[i]) === key) return true;
    }
    return false;
  }
  if (!Object.prototype.hasOwnProperty.call(doneKeys, key)) return false;
  var v = doneKeys[key];
  return v !== null && v !== undefined && v !== false && v !== '';
}

// ============================================================================
//  REQUEST ROUTE  (reference 7.5, ordered, pure, because a wrong order here is a
//  security or a double write bug and neither is reachable by hand)
// ============================================================================

// Returns the plan the glue in IS9WD_Api.js executes:
//   {ok, action, steps, stopped, error, role, key, committee, name,
//    write, needsLock, replay, cached, act}
// ctx carries what the runtime already knows and nothing it would have to guess:
//   {bodyBytes, maxBodyBytes, appOn, inTerm, rateLimited, directory, tokens,
//    itemCommittee, dedupeHit, cachedEnvelope, lockAcquired}
// Steps 1 to 3 read no directory and no sheet, so a bad token flood cannot spend the
// owner's quota before the throttle is consulted. Dedupe sits after the token because
// the cache key is the caller's own: keyed on the requestId alone it would hand one
// caller another caller's envelope, which for rotateToken is a fresh token.
function IS9WD_routeDecision_(req, ctx) {
  var r = req || {};
  var c = ctx || {};
  var plan = {
    ok: true, action: '', steps: [], stopped: '', error: null,
    role: '', key: '', committee: '', name: '',
    write: false, needsLock: false, replay: false, cached: null, act: false
  };
  function step(name) { plan.steps.push(name); return name; }
  function stop(name, code, message) {
    plan.ok = false;
    plan.stopped = name;
    plan.error = { code: code, message: message };
    plan.act = false;
    plan.needsLock = false;
    return plan;
  }

  // 1. Size and shape.
  step('shape');
  var limit = IS9WD_posInt_(c.maxBodyBytes) || IS9WD_MAX_BODY_BYTES_;
  var bytes = IS9WD_num_(c.bodyBytes);
  if (bytes !== null && bytes > limit) {
    return stop('shape', 'VALIDATION', 'Request body is too large.');
  }
  if (IS9WD_num_(r.v) !== 1) {
    return stop('shape', 'VALIDATION', 'Unsupported request version.');
  }
  var action = IS9WD_trim_(r.action);
  if (!Object.prototype.hasOwnProperty.call(IS9WD_ACTIONS_, action)) {
    return stop('shape', 'VALIDATION', 'Unknown action.');
  }
  var spec = IS9WD_ACTIONS_[action];
  plan.action = action;
  plan.write = spec.write === true;
  var requestId = IS9WD_trim_(r.requestId);
  if (spec.write && !IS9WD_REQUEST_ID_PATTERN_.test(requestId)) {
    return stop('shape', 'VALIDATION', 'Request id must be 32 hex characters.');
  }
  if (!spec.write && requestId !== '' && !IS9WD_REQUEST_ID_PATTERN_.test(requestId)) {
    return stop('shape', 'VALIDATION', 'Request id must be 32 hex characters.');
  }

  // ping answers before any token exists, because its whole job is to report the
  // switches the app is about to be refused by.
  if (spec.open) {
    step('act');
    plan.act = true;
    step('log');
    return plan;
  }

  // 2. Token format, before anything reads the directory.
  step('tokenFormat');
  if (!IS9WD_TOKEN_PATTERN.test(IS9WD_trim_(r.token).toLowerCase())) {
    return stop('tokenFormat', 'BAD_TOKEN', 'Token is missing or malformed.');
  }

  // 3. Rate limit, from cache.
  step('rateLimit');
  if (c.rateLimited === true) {
    return stop('rateLimit', 'RATE_LIMITED', 'Too many requests.');
  }

  // 4. Resolve the token.
  step('resolveToken');
  var who = IS9WD_tokenLookup(r.token, c.directory, c.tokens);
  if (!who) {
    return stop('resolveToken', 'BAD_TOKEN', 'Token is not recognized.');
  }
  if (IS9WD_isRevoked_(who.key, c.directory)) {
    return stop('resolveToken', 'REVOKED', 'This link has been replaced.');
  }
  plan.role = who.role;
  plan.key = who.key;
  plan.committee = who.committee;
  plan.name = who.name;

  // 5. The app switch.
  step('appOn');
  if (c.appOn === false) {
    return stop('appOn', 'APP_OFF', 'The tracker is closed right now.');
  }

  // 6. Role.
  step('role');
  if (spec[who.role] !== true) {
    return stop('role', 'NOT_ALLOWED', 'That action needs the admin link.');
  }

  // 7. Term. Reads still answer between trimesters; only a write is refused.
  step('term');
  if (spec.write && c.inTerm === false) {
    return stop('term', 'OUT_OF_TERM', 'The term calendar says we are between trimesters.');
  }

  // 8. Dedupe. A replay returns the caller's own cached envelope and writes nothing.
  step('dedupe');
  if (c.dedupeHit === true) {
    plan.replay = true;
    plan.cached = c.cachedEnvelope !== undefined ? c.cachedEnvelope : null;
    step('log');
    return plan;
  }

  // Ownership, when the runtime has already read the row. NOT_FOUND rather than
  // NOT_ALLOWED, so a member link cannot walk the ID space and learn which ids exist.
  if (IS9WD_txt_(c.itemCommittee) !== '' && who.role === 'member' &&
    IS9WD_trim_(c.itemCommittee).toLowerCase() !== IS9WD_trim_(who.committee).toLowerCase()) {
    step('own');
    return stop('own', 'NOT_FOUND', 'No item with that id.');
  }

  // 9. The document lock, every write, released in a finally by the caller.
  if (spec.write) {
    step('lock');
    plan.needsLock = true;
    if (c.lockAcquired === false) {
      return stop('lock', 'LOCKED', 'Someone else is saving right now.');
    }
  }

  // 10 and 11.
  step('act');
  plan.act = true;
  step('log');
  return plan;
}

// ============================================================================
//  ENVELOPES  (every response from every entry point is one of these two, always
//  HTTP 200, because a cross-origin fetch cannot read a body on some error statuses)
// ============================================================================

function IS9WD_envelopeOk(action, data, serverTime) {
  return {
    v: 1,
    ok: true,
    action: IS9WD_txt_(action),
    serverTime: IS9WD_serverTime_(serverTime),
    data: data === undefined || data === null ? {} : data
  };
}

function IS9WD_envelopeErr(action, code, message, serverTime) {
  return {
    v: 1,
    ok: false,
    action: IS9WD_txt_(action),
    serverTime: IS9WD_serverTime_(serverTime),
    error: { code: IS9WD_txt_(code), message: IS9WD_txt_(message) }
  };
}

// A string passes through. A Date is rendered at UTC+8 with no daylight saving, which
// is Asia/Manila all year, so no host zone reaches the wire.
function IS9WD_serverTime_(v) {
  if (typeof v === 'string') return v;
  if (!IS9WD_isDate_(v)) return '';
  var m = new Date(v.getTime() + 8 * 3600000);
  return m.getUTCFullYear() + '-' + IS9WD_two_(m.getUTCMonth() + 1) + '-' +
    IS9WD_two_(m.getUTCDate()) + 'T' + IS9WD_two_(m.getUTCHours()) + ':' +
    IS9WD_two_(m.getUTCMinutes()) + ':' + IS9WD_two_(m.getUTCSeconds()) + '+08:00';
}
