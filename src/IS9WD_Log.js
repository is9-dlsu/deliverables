/**
 * IS9WD_Log.js - the one appender for 07 | Log, and the once-a-day alert.
 *
 * Written for Phase 4, because the endpoint needs both and neither existed. Setup carried a
 * private copy of the appender so a build could record itself before this file landed; that
 * copy stays, deliberately, because it must keep working on a workbook where this file has
 * not been pushed yet. This one is what everything else uses.
 *
 * WHAT A LOG ROW IS FOR. Section 6 of SPEC accepts that anyone holding an officer's link can
 * tick that officer's items. The mitigation is not prevention, it is the record: every change
 * is logged with a timestamp, so a disputed tick can be traced and any link can be reissued.
 * That makes this file part of the security design rather than a convenience.
 *
 * WHAT IS NEVER LOGGED. No token, ever, not even a prefix. Under ANYONE_ANONYMOUS the calling
 * user's identity is unavailable by design, so Actor is the committee or office the link
 * belongs to, never a person. A reader of 07 | Log learns what changed and which link did it,
 * and cannot learn who was holding the link.
 */

'use strict';

var IS9WD_LOG_SOURCE_APP_ = 'App';
var IS9WD_LOG_SOURCE_TRIGGER_ = 'Trigger';

// Long enough to hold a whole sentence, short enough that one row cannot push the tab past
// the Drive read that 02 | Canva Feed shares with it.
var IS9WD_LOG_DETAIL_MAX_ = 200;

// FORMULA INJECTION, INBOUND AND OUTBOUND. An id, a title or an error message reaching this
// tab is attacker controlled: the endpoint is public and anything can be posted to it. A cell
// whose first character is =, +, - or @ is a formula to Sheets, so a logged value could read
// another tab, or call IMPORTRANGE against a URL the attacker controls, the moment Ethan
// opens the Log. One leading space defuses it and costs nothing a reader will notice.
//
// This is the outbound half. The inbound half refuses the value outright, in IS9WD_Api.js,
// because a title that starts with an equals sign is a mistake worth telling somebody about.
function IS9WD_logText_(value) {
  var text = IS9WD_txt_(value).replace(/[\u0000-\u001f\u007f]+/g, ' ');
  text = IS9WD_trim_(text);
  if (text.length > IS9WD_LOG_DETAIL_MAX_) {
    text = text.substring(0, IS9WD_LOG_DETAIL_MAX_ - 3) + '...';
  }
  if (/^[=+\-@]/.test(text)) text = ' ' + text;
  return text;
}

/**
 * One row. Every field is optional except action and result, because a refusal before the
 * token resolves knows nothing else.
 *
 * `row` is { source, actor, action, committee, id, detail, ok }.
 *
 * IT NEVER THROWS. A log write that fails must not turn a successful tick into a server
 * error: the officer's change is already in the sheet, and a refused response would have them
 * tick it again. The failure goes to the execution log instead, where the daily failure mail
 * will find it.
 */
// THE NEXT LOG ROW IS REMEMBERED. getLastRow after a write in the same execution waits for
// the workbook to recalculate, and the log row is written after almost every write, so that
// one read was a large part of what a tick cost. The row to write next is kept in the script
// cache and advanced after every append; the trim, the self test's own appends and every
// settings reset forget it, and an empty memory asks the sheet once. Every writer of the log
// holds the document lock, so two executions cannot advance it against each other.
var IS9WD_LOG_NEXT_KEY_ = 'IS9WD_LOG_NEXT_ROW_v1';

function IS9WD_logNextRow_(sheet) {
  try {
    var held = IS9WD_posInt_(CacheService.getScriptCache().get(IS9WD_LOG_NEXT_KEY_));
    if (held !== null && held >= IS9WD_LOG.firstRow) return held;
  } catch (err) {
    // Ask the sheet.
  }
  return Math.max(sheet.getLastRow() + 1, IS9WD_LOG.firstRow);
}

function IS9WD_logRemember_(next) {
  try {
    CacheService.getScriptCache().put(IS9WD_LOG_NEXT_KEY_, String(next), 21600);
  } catch (err) {
    Logger.log('IS9WD: the next log row was not remembered: ' + err);
  }
}

function IS9WD_logForget_() {
  try {
    CacheService.getScriptCache().remove(IS9WD_LOG_NEXT_KEY_);
  } catch (err) {
    Logger.log('IS9WD: the next log row was not forgotten: ' + err);
  }
}

function IS9WD_logRow_(row) {
  try {
    var r = row || {};
    var sheet = IS9WD_sheetOrNull_('LOG');
    if (!sheet) return false;
    var at = IS9WD_stampText_(IS9WD_nowManila_());
    var values = [[
      at,
      IS9WD_logText_(r.actor),
      IS9WD_logText_(r.source || IS9WD_LOG_SOURCE_APP_),
      IS9WD_logText_(r.action),
      IS9WD_logText_(r.committee),
      IS9WD_logText_(r.id),
      IS9WD_logText_(r.detail),
      r.ok === false ? IS9WD_logText_(r.result || 'FAIL') : IS9WD_logText_(r.result || 'OK')
    ]];
    var first = IS9WD_logNextRow_(sheet);
    // ONE CALL PER ROW. The per row font and column styling was nine more round trips on
    // every tick, on a hidden tab nobody reads in a hurry; the tab's own font is set sheet
    // wide by the build, and a failure still gets its purple. The grid is checked every
    // twenty five rows, which is well inside the room the build leaves.
    if (first % 25 === 0) IS9WD_ensureGrid_(sheet, first + 25, IS9WD_LOG.lastCol);
    sheet.getRange(first, IS9WD_LOG.firstCol, 1, IS9WD_LOG.lastCol).setValues(values);
    if (r.ok === false) {
      sheet.getRange(first, IS9WD_LOG.lastCol).setFontColor(IS9WD_ROLE.FLAG_FG)
        .setFontWeight('bold');
    }
    IS9WD_logRemember_(first + 1);
    return true;
  } catch (err) {
    Logger.log('IS9WD: the log row was not written: ' + err);
    return false;
  }
}

/**
 * Trim the Log to its newest rows. Called by the heartbeat rather than by every write,
 * because deleting rows is expensive and a tick must stay cheap.
 */
function IS9WD_logTrim_(keep) {
  var sheet = IS9WD_sheetOrNull_('LOG');
  if (!sheet) return 0;
  var want = IS9WD_posInt_(keep) || IS9WD_LOG.TRIM_ROWS;
  var last = sheet.getLastRow();
  var used = last - IS9WD_LOG.firstRow + 1;
  if (used <= want) return 0;
  var drop = used - want;
  sheet.deleteRows(IS9WD_LOG.firstRow, drop);
  IS9WD_logForget_();
  return drop;
}

/**
 * AT MOST ONE ALERT PER JOB PER DAY, which is SPEC section 5's rule for the failure mail.
 * The key is the job plus the Manila date, held in Document Properties, so a job failing
 * every hour mails once and the error still re-throws for Google's own notice to fire.
 *
 * Returns true when this call is the one that sends.
 */
function IS9WD_alertOnce_(jobKey, subject, body) {
  var key = IS9WD_PROP.ALERT_PREFIX + IS9WD_trim_(jobKey).toUpperCase() + '_' +
    IS9WD_dateKey_(IS9WD_todayManila_());
  var store = PropertiesService.getDocumentProperties();
  if (IS9WD_filled_(store.getProperty(key))) return false;
  try {
    var to = IS9WD_trim_(IS9WD_namedOrNull_('IS9WD_ADMIN_EMAIL') ?
      IS9WD_named_('IS9WD_ADMIN_EMAIL').getValue() : '');
    // No address, no key: a failure while the address is blank must not use up the day's one
    // alert, or filling the address in that afternoon would produce nothing.
    if (to === '') return false;
    // The key goes in BEFORE the send, not after: if the send itself is what is broken, the
    // next hourly pass must not try again and again.
    store.setProperty(key, IS9WD_stampText_(IS9WD_nowManila_()));
    MailApp.sendEmail(to, IS9WD_txt_(subject), IS9WD_txt_(body));
    return true;
  } catch (err) {
    Logger.log('IS9WD: the alert mail was not sent: ' + err);
    return false;
  }
}
