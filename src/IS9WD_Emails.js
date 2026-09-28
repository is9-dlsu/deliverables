/**
 * IS9WD_Emails.js - the four emails and the one envelope they share. Phase 5, part two.
 *
 * ONE ARRAY OF BLOCKS, TWO RENDERINGS. Every email is composed as a plain array of blocks
 * (a paragraph, a heading, a list of items, a link) by a PURE function that reaches no Apps
 * Script global. IS9WD_mailText_ renders that array as the plain text body and IS9WD_mailHtml_
 * renders the same array as the HTML body, so the two can never disagree, and test/email.test.js
 * reads the wording in Node exactly as Gmail will show it. The wording Ethan approves in the
 * preflight dialog becomes an assertion rather than a thing to re-read after every change.
 *
 * NOTHING HERE SENDS UNTIL A SWITCH SAYS SO. Each send function checks its own switch on
 * 01 | Configuration first and returns without sending when it is off. A menu send obeys the
 * same switch and says so, rather than appearing to work. With test mode on, every message goes
 * to the admin address instead, carries [TEST MODE] in the subject and names the intended
 * recipient in its first line. Nothing else changes in test mode: the loop still composes one
 * message per intended recipient, so a test Monday costs the same 14 of the daily quota as a
 * live one, which is what makes the test weekend a real rehearsal of the arithmetic.
 *
 * DONE KEYS ARE NOT WRITTEN IN TEST MODE. A rehearsal must be repeatable, and a test send on a
 * Monday morning must not leave per recipient keys behind that would block the live send after
 * test mode is turned off the same day. Live sends write one key per recipient immediately
 * after the send, so a batch cut short by the six minute limit resumes from where it stopped
 * on the next hourly pass rather than re-mailing everyone ahead of the failure. The dispatcher
 * still writes its own job level key for a trigger pass in test mode, so turning test mode OFF
 * clears that day's job level keys for the three mail jobs (IS9WD_mailClearTodayKeys_): a live
 * pass inside the catch-up window then sends exactly once, and after the window has closed the
 * Emails menu is the way to send.
 *
 * A FAILED SEND IS NEVER SILENT. The loop goes on past one bad address, which is right, but the
 * officer it missed has no list and the job will not run again today, so the once a day failure
 * mail goes out naming every key that was missed, and the last report line, which the schedule
 * row records, names them too.
 *
 * ONE EMAIL PER PERSON PER TYPE, never one per item (SPEC section 5). The recipient lists come
 * from IS9WD_recipientsFor in IS9WD_Core.js, which is already tested, so a quiet day produces
 * an empty list and zero messages rather than fourteen empty ones.
 *
 * NO URL IS BUILT HERE. The officers page address is a Configuration setting and every link
 * comes from IS9WD_linkFor_, which reads it. When the address or a token is missing, the plain
 * sentence IS9WD_linkFor_ returns is printed as is rather than suppressing the email, because
 * a Monday list with no link is still a Monday list.
 */

'use strict';

// The subject prefix is a constant rather than a setting because a new setting is a new
// _Engine row, and every new row shifts the sign-off store and the token records with no
// migration (Phase 5 brief, settingsPlan). The test tag follows it, so every rehearsal message
// is unmistakable in an inbox that will also hold the real ones later.
var IS9WD_MAIL_PREFIX_ = '[IS9] ';
var IS9WD_MAIL_TEST_TAG_ = '[TEST MODE] ';

// The reserve the quota guard keeps when the setting is blank, and the much smaller reserve
// for the one recipient brief: a rule of 'left < recipients + 100' would refuse the Sunday brief
// on exactly the unhealthy day whose brief is most needed, and one message cannot threaten a
// quota of hundreds.
var IS9WD_MAIL_BATCH_RESERVE_ = 100;
var IS9WD_MAIL_BRIEF_RESERVE_ = 5;

// How many log rows the failure mail carries, and where a long list in the brief is cut.
var IS9WD_MAIL_LOG_TAIL_ = 5;
var IS9WD_MAIL_LIST_CAP_ = 40;

var IS9WD_JOB_MONDAY_ = 'MONDAY_ASSIGNMENTS';
var IS9WD_JOB_DIGEST_ = 'DAILY_DIGEST';
var IS9WD_JOB_BRIEF_ = 'SUNDAY_BRIEF';

var IS9WD_MAIL_BRAND_ = "Investors' Society";
var IS9WD_MAIL_FOOT_ = 'Sent by the IS9 Weekly Deliverables Tracker. Reply to this message ' +
  'if something on your list is wrong.';

// ============================================================================
//  CONTEXT  (the one impure step: read the workbook once, hand a plain object down)
// ============================================================================

/**
 * Everything a body builder needs, as plain values. Built once per job from the config the
 * dispatcher already read, so a Monday run reads the week, the sign-off and the switches one
 * time and not fourteen.
 */
function IS9WD_mailContext_(cfg) {
  var w = cfg.weeks || {};
  var sw = cfg.switches || {};
  var so = cfg.signoff || {};
  var cur = so.current || {};
  var set = cur.set === true || so.derivedSet === true;
  var range = IS9WD_rangeText(w.weekStart, w.weekEnd);
  return {
    testMode: sw.testMode === true,
    adminEmail: IS9WD_trim_(sw.adminEmail),
    senderName: IS9WD_trim_(sw.senderName),
    replyTo: IS9WD_trim_(sw.replyTo),
    noReply: sw.mailNoReply === true,
    inTerm: w.inTerm !== false,
    weekNumber: w.weekNumber,
    weekNo: IS9WD_weekNoText_(w.weekNumber),
    weekStart: w.weekStart,
    weekEnd: w.weekEnd,
    effectiveToday: w.effectiveToday,
    ayLabel: IS9WD_txt_(w.ayLabel),
    cutoffText: IS9WD_txt_(w.cutoffText),
    weekLine: IS9WD_weekLine(w.weekNumber, range, w.ayLabel),
    weekLong: IS9WD_mailWeekLong_(w.weekStart, w.weekEnd),
    signoffSet: set,
    preparedName: IS9WD_txt_(cur.set === true ? cur.preparedName : so.preparedName),
    preparedPosition: IS9WD_txt_(cur.set === true ? cur.preparedPosition : so.preparedPosition),
    checkedName: IS9WD_txt_(cur.set === true ? cur.checkedName : so.checkedName),
    checkedPosition: IS9WD_txt_(cur.set === true ? cur.checkedPosition : so.checkedPosition),
    slotsPerPage: IS9WD_posInt_(sw.slotsPerPage),
    maxParts: IS9WD_posInt_(sw.maxParts)
  };
}

// "September 28 to October 4, 2026": the year once when the week sits inside one year, which
// is every week but the one across New Year, and twice when the year is the interesting part.
function IS9WD_mailWeekLong_(start, end) {
  var a = IS9WD_longDate(start);
  var b = IS9WD_longDate(end);
  if (a === '' || b === '') return '';
  var ya = a.slice(a.lastIndexOf(',') + 1);
  var yb = b.slice(b.lastIndexOf(',') + 1);
  return (ya === yb ? a.slice(0, a.lastIndexOf(',')) : a) + ' to ' + b;
}

// A directory row as the builders want it, from either shape the workbook hands out: the
// reader's entry (fullName) or IS9WD_recipientsFor's normalised row (name).
function IS9WD_mailEntry_(row) {
  var r = row || {};
  return {
    key: IS9WD_trim_(r.key).toUpperCase(),
    committee: IS9WD_txt_(r.committee),
    fullName: IS9WD_txt_(r.fullName !== undefined ? r.fullName : r.name),
    position: IS9WD_txt_(r.position),
    email: IS9WD_trim_(r.email),
    publishes: r.publishes === true,
    revoked: r.revoked === true
  };
}

// ============================================================================
//  THE THREE BODIES  (pure: a context, an entry, the items, the link)
// ============================================================================

// 'Hi ' plus the full name exactly as typed, falling back to the committee or office. No
// first name splitting: a two word given name is common here, and getting somebody's name
// wrong in the first line of the first email is the worst place to guess.
function IS9WD_mailGreeting_(entry) {
  var who = IS9WD_txt_(entry.fullName) !== '' ? entry.fullName : entry.committee;
  return 'Hi ' + who + ',';
}

// The first line of every body while test mode is on: who it was meant for, so the fourteen
// copies in Ethan's inbox can be told apart.
function IS9WD_mailTestLine_(entry) {
  return {
    k: 'test',
    text: 'TEST MODE. This message was meant for ' + entry.fullName +
      (entry.committee !== '' ? ', ' + entry.committee : '') +
      '. It came to you instead because test mode is on.'
  };
}

// Exactly one link per email, and the sentence that explains the risk to the one person who
// holds it (SPEC section 6). A revoked link is not printed at all: the sentence says why.
function IS9WD_mailLinkBlock_(entry, link) {
  if (entry.revoked) {
    return [{
      k: 'note',
      text: 'Your link has been revoked, so it no longer opens your list. Tell me and I will ' +
        'send you a new one.'
    }];
  }
  var url = IS9WD_txt_(link);
  var isUrl = /^https?:\/\//i.test(url);
  return [{
    k: 'link',
    url: isUrl ? url : '',
    text: isUrl ? 'Open your list' : url,
    note: 'This link is yours alone. Anyone who has it can tick your items, so please do ' +
      'not forward it. If it ever gets out, tell me and I will send you a new one.'
  }];
}

// Prepared by and checked by, or nothing at all: an empty sign-off block would print a
// heading with nothing under it, and the brief already says the sign-off is missing.
function IS9WD_mailSignoff_(ctx) {
  if (!ctx.signoffSet) return [];
  var rows = [];
  if (ctx.preparedName !== '') {
    rows.push(['Prepared by', ctx.preparedName +
      (ctx.preparedPosition !== '' ? ', ' + ctx.preparedPosition : '')]);
  }
  if (ctx.checkedName !== '') {
    rows.push(['Checked by', ctx.checkedName +
      (ctx.checkedPosition !== '' ? ', ' + ctx.checkedPosition : '')]);
  }
  return rows.length ? [{ k: 'kv', rows: rows, small: true }] : [];
}

// An item as one row of the list every email prints. Overdue carries SPEC's human meaning,
// the deadline has passed and the item is still active, computed from effective today and
// not from the reader's clock. `Overdue` as a Check flag is shown through that mark and not
// twice; every other flag is printed in words because it names something Ethan has to fix.
function IS9WD_mailItemRow_(ctx, entry, item, n) {
  var day = IS9WD_day_(item.deadline);
  var today = IS9WD_day_(ctx.effectiveToday);
  var due = IS9WD_longDateDay(item.deadline);
  var flag = IS9WD_trim_(item.check);
  return {
    n: n,
    id: IS9WD_txt_(item.id),
    title: IS9WD_txt_(item.title),
    due: due === '' ? 'No deadline yet' : due,
    overdue: item.active === true && day !== null && today !== null && day < today,
    remark: IS9WD_txt_(item.remark),
    flag: flag === 'Overdue' ? '' : flag,
    carousel: entry.publishes === true && item.published !== true
  };
}

function IS9WD_mailItemRows_(ctx, entry, items) {
  var out = [];
  for (var i = 0; i < items.length; i++) out.push(IS9WD_mailItemRow_(ctx, entry, items[i], i + 1));
  return out;
}

function IS9WD_mailMeta_(ctx, entry) {
  return {
    eyebrow: IS9WD_MAIL_BRAND_,
    title: entry.committee !== '' ? entry.committee : entry.fullName,
    sub: ctx.weekLine,
    foot: IS9WD_MAIL_FOOT_
  };
}

function IS9WD_mondaySubject_(ctx, entry) {
  return 'Week ' + ctx.weekNo + ' deliverables: ' + entry.committee;
}

/**
 * EMAIL ONE, the Monday list. `active` is the officer's active titled items in the order every
 * page prints them (deadline, then ID), which IS9WD_activeItemsFor_ already produces.
 */
function IS9WD_mondayBlocks_(ctx, entry, active, link) {
  var b = [];
  if (ctx.testMode) b.push(IS9WD_mailTestLine_(entry));
  b.push({ k: 'p', text: IS9WD_mailGreeting_(entry) });
  var n = active.length;
  b.push({
    k: 'p',
    text: 'Here ' + (n === 1 ? 'is your deliverable' : 'are your ' + n + ' deliverables') +
      ' for week ' + ctx.weekNo + (ctx.weekLong !== '' ? ', ' + ctx.weekLong : '') + '.'
  });
  var rows = IS9WD_mailItemRows_(ctx, entry, active);
  b.push({ k: 'items', rows: rows });
  var notOnPage = 0;
  for (var i = 0; i < rows.length; i++) if (rows[i].carousel) notOnPage++;
  if (!entry.publishes) {
    b.push({
      k: 'note',
      text: 'Your items are tracked here and in your own list. They do not appear on the ' +
        'weekly carousel.'
    });
  } else if (notOnPage > 0) {
    b.push({
      k: 'note',
      text: notOnPage + ' of these ' + (notOnPage === 1 ? 'does' : 'do') + ' not fit on your ' +
        'carousel page, which holds ' + (ctx.slotsPerPage || 0) + '. ' +
        (notOnPage === 1 ? 'It is' : 'They are') + ' marked above and still count.'
    });
  }
  if (ctx.cutoffText !== '') {
    b.push({ k: 'p', text: 'Changes for next week reach me by ' + ctx.cutoffText + '.' });
  }
  b.push.apply(b, IS9WD_mailLinkBlock_(entry, link));
  b.push.apply(b, IS9WD_mailSignoff_(ctx));
  return b;
}

function IS9WD_digestSubject_(entry, dueTomorrow, overdue) {
  var both = dueTomorrow.length > 0 && overdue.length > 0;
  var head = both ? 'Due tomorrow and overdue' : (dueTomorrow.length ? 'Due tomorrow' : 'Overdue');
  return head + ': ' + entry.committee;
}

/**
 * EMAIL TWO, the evening digest. Two sections, and a section with nothing in it is left out
 * rather than printed empty. Overdue runs oldest first, which is the order IS9WD_sortActive
 * already gives. An item due TODAY appears in neither section by design: on an 18:00 send the
 * day is nearly over, and test/core.test.js pins the predicate.
 */
function IS9WD_digestBlocks_(ctx, entry, dueTomorrow, overdue, link) {
  var b = [];
  if (ctx.testMode) b.push(IS9WD_mailTestLine_(entry));
  b.push({ k: 'p', text: IS9WD_mailGreeting_(entry) });
  if (dueTomorrow.length) {
    b.push({ k: 'h', text: 'Due tomorrow' });
    b.push({ k: 'items', rows: IS9WD_mailItemRows_(ctx, entry, dueTomorrow) });
  }
  if (overdue.length) {
    b.push({ k: 'h', text: 'Overdue' });
    b.push({ k: 'items', rows: IS9WD_mailItemRows_(ctx, entry, overdue) });
  }
  b.push.apply(b, IS9WD_mailLinkBlock_(entry, link));
  b.push.apply(b, IS9WD_mailSignoff_(ctx));
  return b;
}

// Who the digest goes to, and what each gets. The predicate mirrors IS9WD_recipientsFor's so
// the two can never name different people: due tomorrow is deadline = today + 1, overdue is
// deadline < today, and an item with no usable deadline is in neither.
function IS9WD_digestSplit_(ctx, active) {
  var today = IS9WD_day_(ctx.effectiveToday);
  var out = { dueTomorrow: [], overdue: [] };
  if (today === null) return out;
  for (var i = 0; i < active.length; i++) {
    var d = IS9WD_day_(active[i].deadline);
    if (d === null) continue;
    if (d === today + 1) out.dueTomorrow.push(active[i]);
    else if (d < today) out.overdue.push(active[i]);
  }
  return out;
}

// ============================================================================
//  THE SUNDAY BRIEF  (a context the caller assembles, then a pure body)
// ============================================================================

function IS9WD_briefSubject_(bc) {
  var v = IS9WD_txt_(bc.verdict).toUpperCase();
  var ready = v === 'YES' || /\bYES$/.test(v) ? 'ready for Canva'
    : (v === '' ? 'readiness unknown' : 'not ready for Canva');
  return 'Week ' + bc.weekNo + ' brief: ' + ready;
}

/**
 * EMAIL THREE. Sent every Sunday whether or not the workbook is ready, because the brief is
 * the one place Ethan learns WHY it is not. Order: the verdict and its gates, the week, the
 * carousel numbers, what is overdue now, what got done last week, what needs attention, one
 * line per officer, the machine, and the housekeeping. Every number is read from the workbook
 * and none is recomputed here, so the brief cannot disagree with the tabs it summarises.
 */
function IS9WD_briefBlocks_(bc) {
  var b = [];
  var i;
  if (bc.testMode) b.push({ k: 'test', text: 'TEST MODE. This is your own Sunday brief.' });

  // 1. The verdict and the seven gates, with each gate's own sentence as the reason.
  b.push({ k: 'h', text: 'Ready for Canva' });
  var holding = [];
  for (i = 0; i < bc.gates.length; i++) if (bc.gates[i].holding) holding.push(bc.gates[i]);
  b.push({ k: 'p', text: 'Verdict: ' + (bc.verdict === '' ? 'not readable' : bc.verdict) +
    (holding.length ? '. ' + holding.length + ' of ' + bc.gates.length + ' gates holding.'
      : (bc.gates.length ? '. Every gate is clear.' : '.')),
    flag: holding.length > 0 || bc.verdict === '' });
  var gateRows = [];
  for (i = 0; i < bc.gates.length; i++) {
    var g = bc.gates[i];
    gateRows.push([g.label, (g.holding ? 'HOLD' : 'OK') +
      (g.note !== '' && g.note.toUpperCase() !== 'OK' ? ', ' + g.note : ''), g.holding]);
  }
  if (gateRows.length) b.push({ k: 'kv', rows: gateRows });
  if (bc.gateAgree !== '' && bc.gateAgree.toUpperCase() !== 'OK' && bc.gateAgree !== 'TRUE') {
    b.push({ k: 'note', text: 'The statistics tab reads the gates differently from the feed: ' +
      bc.gateAgree + '. Run the self test.', flag: true });
  }

  // 2. The week the brief describes, which on a Sunday is the one starting tomorrow.
  b.push({ k: 'h', text: 'The week' });
  var weekRows = [
    ['Week', bc.weekNo + (bc.weekLong !== '' ? ', ' + bc.weekLong : '') +
      (bc.ayLabel !== '' ? ', ' + bc.ayLabel : '')],
    ['Feed as of', bc.effectiveTodayLong === '' ? 'no effective date' : bc.effectiveTodayLong]
  ];
  if (bc.todayOverride !== '') weekRows.push(['Today override', bc.todayOverride + '. Clear it before the week goes live.', true]);
  if (bc.weekNumberOverride !== '') weekRows.push(['Week number override', bc.weekNumberOverride, true]);
  weekRows.push(bc.signoffSet
    ? ['Sign-off', 'Prepared by ' + bc.preparedName + (bc.preparedPosition !== '' ? ', ' + bc.preparedPosition : '') +
      (bc.checkedName !== '' ? '. Checked by ' + bc.checkedName + (bc.checkedPosition !== '' ? ', ' + bc.checkedPosition : '') : '')]
    : ['Sign-off', 'Sign-off not set for this week. Set it in the app before the carousel is read.', true]);
  b.push({ k: 'kv', rows: weekRows });

  // 3. The carousel, straight from the feed's own summary cells.
  b.push({ k: 'h', text: 'The carousel' });
  b.push({ k: 'kv', rows: [
    ['Active items this week', bc.feed.total],
    ['Carousel pages', bc.feed.pages],
    ['Master pages required', bc.feed.master],
    ['Export page list', bc.feed.exportList],
    ['Items not published', bc.feed.notPub, IS9WD_int_(bc.feed.notPub) !== null && IS9WD_int_(bc.feed.notPub) > 0],
    ['Feed errors', bc.feed.errors, IS9WD_int_(bc.feed.errors) !== null && IS9WD_int_(bc.feed.errors) > 0],
    ['Flagged rows', bc.feed.flagged]
  ] });
  if (bc.overMax.length) {
    var over = [];
    for (i = 0; i < bc.overMax.length; i++) {
      over.push(bc.overMax[i].committee + ': ' + bc.overMax[i].published + ' published, ' +
        bc.overMax[i].active + ' active');
    }
    b.push({ k: 'note', text: 'Over the page limit: ' + over.join('; ') + '.', flag: true });
  }

  // 4. Overdue now. SPEC section 5 promises it, and Overdue is the one Check flag that does
  // not block, so without this block it would reach Ethan only buried in the flags list.
  b.push({ k: 'h', text: 'Overdue now' });
  if (!bc.overdue.length) {
    b.push({ k: 'p', text: 'Nothing is overdue.' });
  } else {
    b.push({ k: 'table', head: ['ID', 'Committee or office', 'Deliverable', 'Was due'],
      rows: IS9WD_briefItemTable_(bc.overdue) });
  }

  // 5. What got done last week: terminal status, stamped inside the seven days before this
  // week's start. The archive is not the source because it does not exist yet.
  b.push({ k: 'h', text: 'Accomplished last week' });
  b.push({ k: 'p', text: bc.doneLastWeek.length === 0 ? 'No item was ticked off last week.'
    : bc.doneLastWeek.length + ' item' + (bc.doneLastWeek.length === 1 ? '' : 's') + ' ticked off.' });
  if (bc.doneLastWeek.length) {
    b.push({ k: 'table', head: ['ID', 'Committee or office', 'Deliverable', 'Ticked'],
      rows: IS9WD_briefItemTable_(bc.doneLastWeek) });
  }

  // 6. What needs attention: every flagged row, blocking ones first.
  b.push({ k: 'h', text: 'Needs attention' });
  if (!bc.flags.length) {
    b.push({ k: 'p', text: 'No row carries a flag.' });
  } else {
    var flagRows = [];
    for (i = 0; i < bc.flags.length && i < IS9WD_MAIL_LIST_CAP_; i++) {
      var f = bc.flags[i];
      flagRows.push([f.id === '' ? 'row ' + f.row : f.id, f.committee, f.title === '' ? '(no title)' : f.title,
        f.flag + (f.blocking ? ' (blocks Canva)' : '')]);
    }
    b.push({ k: 'table', head: ['ID', 'Committee or office', 'Deliverable', 'Flag'], rows: flagRows });
    if (bc.flags.length > IS9WD_MAIL_LIST_CAP_) {
      b.push({ k: 'note', text: 'and ' + (bc.flags.length - IS9WD_MAIL_LIST_CAP_) + ' more on the data tab.' });
    }
  }

  // 7. One line per officer, in hierarchy order.
  b.push({ k: 'h', text: 'By officer' });
  var offRows = [];
  for (i = 0; i < bc.officers.length; i++) {
    var o = bc.officers[i];
    var notes = [];
    if (o.overdue > 0) notes.push(o.overdue + ' overdue');
    if (o.flagged > 0) notes.push(o.flagged + ' flagged');
    if (o.notPublished > 0) notes.push(o.notPublished + ' past the page');
    if (o.email === '') notes.push('no email');
    if (o.revoked) notes.push('link revoked');
    offRows.push([o.committee, String(o.active), notes.length ? notes.join(', ') : '']);
  }
  b.push({ k: 'table', head: ['Committee or office', 'Active', 'Notes'], rows: offRows });

  // 8. The machine reporting on itself, promoted out of the hidden tabs.
  b.push({ k: 'h', text: 'The machine' });
  var m = bc.machine;
  b.push({ k: 'kv', rows: [
    ['Automation', (m.automationOn ? 'on' : 'OFF') + ', ' +
      (m.triggers === null ? 'trigger count unknown' : m.triggers === 1 ? 'one hourly trigger'
        : m.triggers === 0 ? 'NO TRIGGER INSTALLED' : m.triggers + ' triggers, which is a fault'),
      !m.automationOn || m.triggers !== 1],
    ['Last run', m.lastRun === '' ? 'never' : m.lastRun, m.lastRun === ''],
    ['Test mode', m.testMode ? 'ON, so every email goes to you' : 'off, so emails go to the officers'],
    ['Mail left today', m.quotaLeft === null ? 'not measured' : m.quotaLeft + ', reserve ' + m.quotaReserve],
    ['Last self test', m.lastSelfTest === '' ? 'never run' : m.lastSelfTest, m.lastSelfTest === ''],
    ['Views', bc.statsErrors === '' ? 'not readable' : (IS9WD_int_(bc.statsErrors) === 0 ? 'no broken cell'
      : bc.statsErrors + ' broken cells on the statistics tab'), IS9WD_int_(bc.statsErrors) !== 0]
  ] });

  // 9. Housekeeping: row room, rows the app cannot see, what the retire job will act on,
  // and the links.
  b.push({ k: 'h', text: 'Housekeeping' });
  var h = bc.house;
  var houseRows = [
    ['Rows used', h.usedRows + ' of ' + h.capacity],
    ['Rows without an ID', String(h.noId), h.noId > 0]
  ];
  if (h.noId > 0) {
    houseRows[1][1] += ', so the app cannot show them. Automation > Give new rows an ID now.';
  }
  houseRows.push(['Waiting to be retired', h.retireWaiting + ' accomplished item' +
    (h.retireWaiting === 1 ? '' : 's') + ' older than ' + h.retireDays + ' days']);
  if (h.noEmail.length) houseRows.push(['No email on file', h.noEmail.join(', '), true]);
  if (h.revoked.length) houseRows.push(['Revoked links', h.revoked.join(', '), true]);
  if (h.oldTokens.length) houseRows.push(['Links older than ' + h.tokenWarnDays + ' days', h.oldTokens.join(', '), true]);
  b.push({ k: 'kv', rows: houseRows });

  if (bc.workbookUrl !== '') {
    b.push({ k: 'link', url: bc.workbookUrl, text: 'Open the workbook', note: '' });
  }
  return b;
}

function IS9WD_briefItemTable_(list) {
  var rows = [];
  for (var i = 0; i < list.length && i < IS9WD_MAIL_LIST_CAP_; i++) {
    var it = list[i];
    rows.push([it.id === '' ? 'row ' + it.row : it.id, it.committee,
      it.title === '' ? '(no title)' : it.title, it.when]);
  }
  if (list.length > IS9WD_MAIL_LIST_CAP_) {
    rows.push(['', '', 'and ' + (list.length - IS9WD_MAIL_LIST_CAP_) + ' more', '']);
  }
  return rows;
}

/**
 * The only impure half of the brief. Reads every feed and statistics cell it needs by NAME
 * through IS9WD_namedOrNull_, never by address, and tolerates a missing name by printing that
 * it could not be read rather than throwing: the brief is the message that has to arrive on
 * the Sunday the workbook is broken.
 */
function IS9WD_briefContext_(cfg, items) {
  var ctx = IS9WD_mailContext_(cfg);
  var w = cfg.weeks || {};
  var sw = cfg.switches || {};
  var today = IS9WD_day_(ctx.effectiveToday);
  var ws = IS9WD_day_(ctx.weekStart);
  var list = IS9WD_itemList_(items);
  var i;

  var read = function (name) {
    try {
      var r = IS9WD_namedOrNull_(name);
      return r ? IS9WD_txt_(r.getDisplayValue()) : '';
    } catch (err) {
      return '';
    }
  };

  // The gates, in the order and with the labels 04 | Statistics prints. The third column is
  // each gate's own sentence, named when the workbook has been rebuilt since it was declared
  // and read beside the label column until then.
  var gates = [];
  try {
    var labels = IS9WD_namedOrNull_('IS9WD_STATS_GATE_LABEL');
    var states = IS9WD_namedOrNull_('IS9WD_STATS_GATE_STATE');
    var notes = IS9WD_namedOrNull_('IS9WD_STATS_GATE_NOTE') ||
      (labels ? labels.offset(0, 2) : null);
    if (labels && states) {
      var lv = labels.getDisplayValues();
      var sv = states.getDisplayValues();
      var nv = notes ? notes.getDisplayValues() : [];
      for (i = 0; i < lv.length; i++) {
        var label = IS9WD_txt_(lv[i][0]);
        if (label === '') continue;
        gates.push({
          label: label,
          holding: IS9WD_txt_(sv[i] ? sv[i][0] : '').toUpperCase() === 'HOLD',
          note: IS9WD_txt_(nv[i] ? nv[i][0] : '')
        });
      }
    }
  } catch (err) {
    gates = [];
  }

  // Items, sorted the way every list prints, then split the four ways the brief reads them.
  var overdue = [];
  var doneLastWeek = [];
  var flags = [];
  var noId = 0;
  var retireWaiting = 0;
  var retireDays = IS9WD_posInt_(sw.retireDays) || 0;
  var sorted = IS9WD_sortActive(list);
  for (i = 0; i < sorted.length; i++) {
    var it = sorted[i];
    var d = IS9WD_day_(it.deadline);
    var when = IS9WD_day_(it.statusAt);
    var terminal = it.active !== true && IS9WD_txt_(it.status) !== '';
    if (it.id === '' && it.typed === true) noId++;
    if (it.active === true && d !== null && today !== null && d < today) {
      overdue.push({ id: it.id, row: it.row, committee: it.committee, title: it.title,
        when: IS9WD_longDateDay(it.deadline) });
    }
    if (terminal && when !== null && ws !== null && when >= ws - 7 && when <= ws - 1) {
      doneLastWeek.push({ id: it.id, row: it.row, committee: it.committee, title: it.title,
        when: IS9WD_longDate(it.statusAt) });
    }
    if (terminal && when !== null && today !== null && retireDays > 0 && when <= today - retireDays) {
      retireWaiting++;
    }
    if (IS9WD_trim_(it.check) !== '') {
      flags.push({ id: it.id, row: it.row, committee: it.committee, title: it.title,
        flag: IS9WD_trim_(it.check), blocking: it.blocking === true });
    }
  }
  flags.sort(function (a, b) { return (b.blocking ? 1 : 0) - (a.blocking ? 1 : 0); });

  // One line per officer, and the over the page list, both from the counts helper the officer
  // tables already use.
  var counts = IS9WD_itemCounts_(items, cfg);
  var officers = [];
  var overMax = [];
  var noEmail = [];
  var revoked = [];
  var oldTokens = [];
  var warnDays = IS9WD_posInt_(sw.tokenWarnDays) || 0;
  var dir = cfg.directory ? cfg.directory.inHierarchy : [];
  for (i = 0; i < dir.length; i++) {
    var e = dir[i];
    var c = counts[e.key] || { active: 0, flagged: 0, notPublished: 0, published: 0 };
    var od = 0;
    for (var j = 0; j < overdue.length; j++) {
      if (IS9WD_trim_(overdue[j].committee).toLowerCase() === IS9WD_trim_(e.committee).toLowerCase()) od++;
    }
    officers.push({ key: e.key, committee: e.committee, active: c.active, overdue: od,
      flagged: c.flagged, notPublished: c.notPublished, email: e.email, revoked: e.revoked === true });
    if (c.notPublished > 0) overMax.push({ committee: e.committee, published: c.published, active: c.active });
    if (e.email === '') noEmail.push(e.key);
    if (e.revoked === true) revoked.push(e.key);
    var issued = IS9WD_day_(e.tokenIssued);
    if (warnDays > 0 && issued !== null && today !== null && today - issued > warnDays) oldTokens.push(e.key);
  }

  // The machine. Each read is guarded on its own so one missing service costs one cell.
  var triggers = null;
  try {
    var all = ScriptApp.getProjectTriggers();
    triggers = 0;
    for (i = 0; i < all.length; i++) {
      if (all[i].getHandlerFunction() === IS9WD_AUTO_TRIGGER_) triggers++;
    }
  } catch (err) {
    triggers = null;
  }
  var quotaLeft = null;
  try { quotaLeft = MailApp.getRemainingDailyQuota(); } catch (err) { quotaLeft = null; }
  var workbookUrl = '';
  try { workbookUrl = IS9WD_txt_(SpreadsheetApp.getActiveSpreadsheet().getUrl()); } catch (err) { workbookUrl = ''; }

  return {
    testMode: ctx.testMode,
    weekNo: ctx.weekNo,
    weekLong: ctx.weekLong,
    weekLine: ctx.weekLine,
    ayLabel: ctx.ayLabel,
    effectiveTodayLong: IS9WD_longDateDay(ctx.effectiveToday),
    todayOverride: w.todayOverrideSet ? IS9WD_longDateDay(w.todayOverride) : '',
    weekNumberOverride: w.weekNumberOverrideSet ? IS9WD_txt_(w.weekNumberOverride) : '',
    signoffSet: ctx.signoffSet,
    preparedName: ctx.preparedName, preparedPosition: ctx.preparedPosition,
    checkedName: ctx.checkedName, checkedPosition: ctx.checkedPosition,
    verdict: read('IS9WD_FEED_READY'),
    gates: gates,
    gateAgree: read('IS9WD_STATS_GATE_AGREE'),
    statsErrors: read('IS9WD_STATS_ERRORS'),
    feed: {
      total: read('IS9WD_FEED_TOTAL'), flagged: read('IS9WD_FEED_FLAGGED'),
      errors: read('IS9WD_FEED_ERRORS'), pages: read('IS9WD_FEED_PAGES'),
      exportList: read('IS9WD_FEED_EXPORT'), master: read('IS9WD_FEED_MASTER'),
      notPub: read('IS9WD_FEED_NOTPUB')
    },
    overdue: overdue,
    doneLastWeek: doneLastWeek,
    flags: flags,
    officers: officers,
    overMax: overMax,
    machine: {
      automationOn: sw.automationOn !== false,
      triggers: triggers,
      lastRun: IS9WD_isDate_(sw.heartbeat) ? IS9WD_stampText_(sw.heartbeat) : IS9WD_txt_(sw.heartbeat),
      testMode: ctx.testMode,
      quotaLeft: quotaLeft,
      quotaReserve: IS9WD_int_(sw.quotaReserve) === null ? IS9WD_MAIL_BATCH_RESERVE_ : IS9WD_int_(sw.quotaReserve),
      lastSelfTest: read('IS9WD_DIAG_SELFTEST')
    },
    house: {
      usedRows: items && items.usedRows !== undefined ? items.usedRows : list.length,
      capacity: items && items.capacity !== undefined ? items.capacity : '',
      noId: noId,
      retireWaiting: retireWaiting,
      retireDays: retireDays,
      noEmail: noEmail,
      revoked: revoked,
      oldTokens: oldTokens,
      tokenWarnDays: warnDays
    },
    workbookUrl: workbookUrl
  };
}

// ============================================================================
//  RENDERING  (one block array, plain text and HTML)
// ============================================================================

/**
 * The plain text body. It is the fallback every client can show and the form the tests read.
 */
function IS9WD_mailText_(blocks, meta) {
  var out = [];
  var m = meta || {};
  if (IS9WD_txt_(m.title) !== '') out.push(IS9WD_upper_(m.title));
  if (IS9WD_txt_(m.sub) !== '') out.push(m.sub);
  if (out.length) out.push('');
  for (var i = 0; i < blocks.length; i++) {
    var b = IS9WD_mailBlock_(blocks[i]);
    var j;
    switch (b.k) {
      case 'test':
        out.push(b.text, '');
        break;
      case 'h':
        out.push('', IS9WD_upper_(b.text));
        break;
      case 'p':
        out.push(b.text, '');
        break;
      case 'note':
        out.push(b.text, '');
        break;
      case 'items':
        for (j = 0; j < b.rows.length; j++) {
          var r = b.rows[j];
          out.push(r.n + '. ' + r.title);
          out.push('   ' + (r.overdue ? 'OVERDUE, was due ' : 'Due ') + r.due);
          if (r.remark !== '') out.push('   ' + IS9WD_remarkText(r.remark));
          if (r.flag !== '') out.push('   Flag: ' + r.flag);
          if (r.carousel) out.push('   Not on the carousel this week');
        }
        if (!b.rows.length) out.push('Nothing on your list.');
        out.push('');
        break;
      case 'kv':
        for (j = 0; j < b.rows.length; j++) {
          out.push(IS9WD_txt_(b.rows[j][0]) + ': ' + IS9WD_txt_(b.rows[j][1]));
        }
        out.push('');
        break;
      case 'table':
        out.push(IS9WD_mailJoin_(b.head));
        for (j = 0; j < b.rows.length; j++) out.push(IS9WD_mailJoin_(b.rows[j]));
        out.push('');
        break;
      case 'link':
        out.push(b.url !== '' ? b.text + ': ' + b.url : b.text);
        if (b.note !== '') out.push(b.note);
        out.push('');
        break;
      default:
        break;
    }
  }
  if (IS9WD_txt_(m.foot) !== '') out.push('', m.foot);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n';
}

function IS9WD_mailJoin_(cells) {
  var out = [];
  for (var i = 0; i < cells.length; i++) out.push(IS9WD_txt_(cells[i]));
  return out.join('  |  ');
}

// A block with every field present, so the renderers never test for undefined.
function IS9WD_mailBlock_(block) {
  var b = typeof block === 'string' ? { k: 'p', text: block } : (block || {});
  return {
    k: b.k || 'p',
    text: IS9WD_txt_(b.text),
    rows: b.rows || [],
    head: b.head || [],
    url: IS9WD_txt_(b.url),
    note: IS9WD_txt_(b.note),
    flag: b.flag === true,
    small: b.small === true
  };
}

/**
 * The HTML body. Tables for structure and inline styles on every element, because that is
 * the only markup Gmail on a phone renders the same way twice. No image, no web font, no
 * script: a system stack, the workbook's palette, no green and no red, and a flag is bold
 * strong purple on paper with no fill, exactly as on every tab. Every value is escaped.
 */
function IS9WD_mailHtml_(blocks, meta) {
  var m = meta || {};
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + IS9WD_mailEsc_(m.title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + IS9WD_CLR.PAPER + ';">' +
    IS9WD_mailHtmlBody_(blocks, meta) +
    '</body></html>';
}

// The container alone, so the preflight dialog can show the email inside the dialog rather
// than a whole document inside a document.
function IS9WD_mailHtmlBody_(blocks, meta) {
  var m = meta || {};
  var P = IS9WD_CLR;
  var F = IS9WD_mailFontStack_();
  var body = [];
  for (var i = 0; i < blocks.length; i++) body.push(IS9WD_mailBlockHtml_(IS9WD_mailBlock_(blocks[i]), P, F));
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
    'style="background:' + P.PAPER + ';">' +
    '<tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
    'style="max-width:560px;background:' + P.PAPER + ';border:1px solid ' + P.SAGE +
    ';border-radius:18px;">' +
    // The one surface: the deep green band with the strong purple rule under it, which is the
    // mark's own two ends and the same panel the officers page opens with.
    '<tr><td style="background:' + P.GREEN_DEEP + ';padding:22px 24px 20px;' +
    'border-bottom:4px solid ' + P.PURPLE_STRONG + ';border-radius:17px 17px 0 0;">' +
    '<div style="font:700 11px/1.4 ' + F + ';letter-spacing:0.14em;text-transform:uppercase;' +
    'color:' + P.PAPER + ';opacity:0.8;">' + IS9WD_mailEsc_(m.eyebrow) + '</div>' +
    '<div style="font:700 26px/1.15 ' + F + ';letter-spacing:-0.01em;color:' + P.PAPER +
    ';margin-top:8px;">' + IS9WD_mailEsc_(m.title) + '</div>' +
    (IS9WD_txt_(m.sub) !== '' ? '<div style="font:400 12px/1.5 ' + F + ';color:' + P.PAPER +
      ';opacity:0.85;margin-top:6px;letter-spacing:0.04em;">' + IS9WD_mailEsc_(m.sub) + '</div>' : '') +
    '</td></tr>' +
    '<tr><td style="padding:6px 24px 26px;">' + body.join('') + '</td></tr>' +
    (IS9WD_txt_(m.foot) !== '' ? '<tr><td style="padding:14px 24px 18px;border-top:1px solid ' +
      P.SAGE + ';font:400 12px/1.5 ' + F + ';color:' + P.SAGE + ';">' + IS9WD_mailEsc_(m.foot) +
      '</td></tr>' : '') +
    '</table></td></tr></table>';
}

function IS9WD_mailFontStack_() {
  return "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
}

function IS9WD_mailBlockHtml_(b, P, F) {
  var j;
  var p = function (text, extra) {
    return '<p style="margin:16px 0 0;font:400 15px/1.55 ' + F + ';color:' + P.GREEN_DEEP + ';' +
      (extra || '') + '">' + text + '</p>';
  };
  switch (b.k) {
    case 'test':
      return '<p style="margin:16px 0 0;padding:10px 14px;border-left:3px solid ' + P.PURPLE_STRONG +
        ';font:700 13px/1.5 ' + F + ';color:' + P.PURPLE_STRONG + ';">' + IS9WD_mailEsc_(b.text) + '</p>';
    case 'h':
      return '<h2 style="margin:28px 0 4px;font:700 11px/1.4 ' + F + ';letter-spacing:0.12em;' +
        'text-transform:uppercase;color:' + P.SAGE + ';">' + IS9WD_mailEsc_(b.text) + '</h2>';
    case 'p':
      return p(IS9WD_mailEsc_(b.text), b.flag ? 'color:' + P.PURPLE_STRONG + ';font-weight:700;' : '');
    case 'note':
      return '<p style="margin:14px 0 0;font:' + (b.flag ? '700' : '400') + ' 13px/1.5 ' + F +
        ';color:' + (b.flag ? P.PURPLE_STRONG : P.SAGE) + ';">' + IS9WD_mailEsc_(b.text) + '</p>';
    case 'items': {
      if (!b.rows.length) return p('Nothing on your list.');
      var rows = [];
      for (j = 0; j < b.rows.length; j++) {
        var r = b.rows[j];
        var meta = '<div style="margin-top:4px;font:400 13px/1.5 ' + F + ';color:' + P.SAGE + ';">' +
          (r.overdue ? '<span style="color:' + P.PURPLE_STRONG + ';font-weight:700;">Overdue</span>' +
            '<span style="color:' + P.SAGE + ';">, was due ' + IS9WD_mailEsc_(r.due) + '</span>'
            : 'Due ' + IS9WD_mailEsc_(r.due)) + '</div>';
        var remark = r.remark !== '' ? '<div style="margin-top:3px;font:400 13px/1.5 ' + F +
          ';color:' + P.SAGE + ';">' + IS9WD_mailEsc_(IS9WD_remarkText(r.remark)) + '</div>' : '';
        var flag = r.flag !== '' ? '<div style="margin-top:3px;font:700 12px/1.5 ' + F + ';color:' +
          P.PURPLE_STRONG + ';">' + IS9WD_mailEsc_(r.flag) + '</div>' : '';
        var carousel = r.carousel ? '<div style="margin-top:3px;font:400 12px/1.5 ' + F + ';color:' +
          P.LILAC + ';">Not on the carousel this week</div>' : '';
        rows.push('<tr>' +
          '<td valign="top" width="28" style="padding:13px 0 12px;border-top:1px dotted ' + P.SAGE +
          ';font:600 13px/1.6 ' + F + ';color:' + P.SAGE + ';">' + r.n + '</td>' +
          '<td valign="top" style="padding:12px 0;border-top:1px dotted ' + P.SAGE + ';">' +
          '<div style="font:600 15px/1.45 ' + F + ';color:' + P.GREEN_DEEP + ';">' +
          IS9WD_mailEsc_(r.title) + '</div>' + meta + remark + flag + carousel + '</td></tr>');
      }
      return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
        'style="margin-top:14px;">' + rows.join('') + '</table>';
    }
    case 'kv': {
      var kv = [];
      var size = b.small ? '13px' : '14px';
      for (j = 0; j < b.rows.length; j++) {
        var row = b.rows[j];
        var hot = row[2] === true;
        kv.push('<tr>' +
          '<td valign="top" style="padding:8px 14px 8px 0;border-top:1px dotted ' + P.SAGE +
          ';font:400 13px/1.5 ' + F + ';color:' + P.SAGE + ';white-space:nowrap;">' +
          IS9WD_mailEsc_(row[0]) + '</td>' +
          '<td valign="top" style="padding:8px 0;border-top:1px dotted ' + P.SAGE + ';font:' +
          (hot ? '700' : '400') + ' ' + size + '/1.5 ' + F + ';color:' +
          (hot ? P.PURPLE_STRONG : P.GREEN_DEEP) + ';">' + IS9WD_mailEsc_(row[1]) + '</td></tr>');
      }
      return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
        'style="margin-top:' + (b.small ? '22px' : '10px') + ';">' + kv.join('') + '</table>';
    }
    case 'table': {
      var cells = [];
      var head = [];
      for (j = 0; j < b.head.length; j++) {
        head.push('<td style="padding:6px 8px 6px 0;border-bottom:1px solid ' + P.SAGE +
          ';font:700 11px/1.4 ' + F + ';letter-spacing:0.08em;text-transform:uppercase;color:' +
          P.SAGE + ';">' + IS9WD_mailEsc_(b.head[j]) + '</td>');
      }
      cells.push('<tr>' + head.join('') + '</tr>');
      for (j = 0; j < b.rows.length; j++) {
        var line = [];
        for (var c = 0; c < b.rows[j].length; c++) {
          line.push('<td valign="top" style="padding:7px 8px 7px 0;border-bottom:1px dotted ' +
            P.SAGE + ';font:400 13px/1.45 ' + F + ';color:' + P.GREEN_DEEP + ';">' +
            IS9WD_mailEsc_(b.rows[j][c]) + '</td>');
        }
        cells.push('<tr>' + line.join('') + '</tr>');
      }
      return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
        'style="margin-top:10px;">' + cells.join('') + '</table>';
    }
    case 'link': {
      var out = '';
      if (b.url !== '') {
        out += '<p style="margin:22px 0 0;"><a href="' + IS9WD_mailEsc_(b.url) + '" style="display:inline-block;' +
          'padding:12px 20px;background:' + P.GREEN_DEEP + ';color:' + P.PAPER + ';border-radius:10px;' +
          'font:700 14px/1.2 ' + F + ';text-decoration:none;">' + IS9WD_mailEsc_(b.text) + '</a></p>' +
          '<p style="margin:8px 0 0;font:400 12px/1.5 ' + F + ';color:' + P.SAGE + ';word-break:break-all;">' +
          IS9WD_mailEsc_(b.url) + '</p>';
      } else {
        out += p(IS9WD_mailEsc_(b.text));
      }
      if (b.note !== '') {
        out += '<p style="margin:10px 0 0;font:400 13px/1.5 ' + F + ';color:' + P.SAGE + ';">' +
          IS9WD_mailEsc_(b.note) + '</p>';
      }
      return out;
    }
    default:
      return '';
  }
}

// Every value in an email is escaped, including ones that came from the Sheet: a title is
// Ethan's text, and text in HTML is markup until it is escaped.
function IS9WD_mailEsc_(s) {
  return IS9WD_txt_(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================================================
//  THE ENVELOPE  (one MailApp call, one quota guard, one set of done keys)
// ============================================================================

function IS9WD_mailSubject_(ctx, text) {
  return IS9WD_MAIL_PREFIX_ + (ctx.testMode ? IS9WD_MAIL_TEST_TAG_ : '') + IS9WD_txt_(text);
}

/**
 * The one MailApp call. In test mode the address is replaced by the admin's; the body already
 * carries the intended recipient in its first line. Reply-to and no-reply are never both set:
 * no-reply wins when it is on, because a workbook holding both is describing an intention it
 * will not honour, and the self test says so.
 */
function IS9WD_mailSend_(to, subject, blocks, meta, ctx) {
  var address = ctx.testMode ? ctx.adminEmail : IS9WD_trim_(to);
  if (address === '') throw new Error('No address to send to.');
  var msg = {
    to: address,
    subject: IS9WD_mailSubject_(ctx, subject),
    body: IS9WD_mailText_(blocks, meta),
    htmlBody: IS9WD_mailHtml_(blocks, meta)
  };
  if (ctx.senderName !== '') msg.name = ctx.senderName;
  if (ctx.noReply) msg.noReply = true;
  else if (ctx.replyTo !== '') msg.replyTo = ctx.replyTo;
  MailApp.sendEmail(msg);
  return true;
}

/**
 * The quota guard, once per job and before the loop, so a batch is refused whole rather than
 * half sent. It writes the remaining quota to the diagnostics cell every time it runs, which is
 * what stops 04 | Statistics reading 'not measured yet'. On refusal it logs one row, alerts once
 * for the day, and returns false. Never throws.
 */
function IS9WD_mailQuotaOk_(jobKey, count, cfg, say, source) {
  var left = null;
  try {
    left = MailApp.getRemainingDailyQuota();
  } catch (err) {
    if (say) say('The mail quota could not be read: ' + err);
    return false;
  }
  try {
    var cell = IS9WD_namedOrNull_('IS9WD_DIAG_QUOTA');
    if (cell) cell.setValue(left);
  } catch (err) {
    Logger.log('IS9WD: the quota diagnostic was not written: ' + err);
  }
  var reserve = jobKey === IS9WD_JOB_BRIEF_ ? IS9WD_MAIL_BRIEF_RESERVE_
    : (IS9WD_int_(cfg && cfg.switches ? cfg.switches.quotaReserve : null));
  if (reserve === null) reserve = IS9WD_MAIL_BATCH_RESERVE_;
  if (left >= count + reserve) return true;
  var detail = left + ' left, reserve ' + reserve + ', ' + count + ' recipient' +
    (count === 1 ? '' : 's') + '. Nothing was sent.';
  if (say) say('Mail quota reserve hit: ' + detail);
  IS9WD_logRow_({
    source: IS9WD_txt_(source) || 'Trigger', actor: 'Mail', action: 'Mail quota reserve hit',
    detail: detail, ok: false, result: 'SKIPPED'
  });
  try {
    IS9WD_jobAlert_(jobKey, new Error('Mail quota reserve hit: ' + detail), []);
  } catch (err) {
    Logger.log('IS9WD: the quota alert was not sent: ' + err);
  }
  return false;
}

/**
 * Per recipient done keys for one job on the real Manila date. One getProperties per job,
 * one setProperty per send. In test mode nothing is read and nothing is written, for the
 * reason in the file header.
 */
function IS9WD_mailDoneKeys_(jobKey, testMode) {
  var date = IS9WD_dateKey_(IS9WD_todayManila_());
  var held = {};
  var store = null;
  if (!testMode) {
    try {
      store = PropertiesService.getDocumentProperties();
      held = store.getProperties() || {};
    } catch (err) {
      held = {};
    }
  }
  return {
    has: function (dirKey) {
      if (testMode) return false;
      return IS9WD_doneKeySet_(held, IS9WD_doneKey(jobKey, date, dirKey));
    },
    set: function (dirKey) {
      if (testMode || !store) return;
      try {
        store.setProperty(IS9WD_doneKey(jobKey, date, dirKey), IS9WD_stampText_(IS9WD_nowManila_()));
      } catch (err) {
        Logger.log('IS9WD: the done key was not written for ' + dirKey + ': ' + err);
      }
    }
  };
}

/**
 * TURNING TEST MODE OFF CLEARS TODAY'S JOB KEYS for the three mail jobs. A trigger pass in test
 * mode wrote the job level key like any pass, and left alone it would tell the next live pass
 * that Monday already went out. Per recipient keys were never written in test mode, so the live
 * pass inside the catch-up window sends exactly once. The archive jobs are not rehearsed and
 * their keys are left alone. Returns the job keys it cleared; never throws.
 */
function IS9WD_mailClearTodayKeys_() {
  var cleared = [];
  try {
    var store = PropertiesService.getDocumentProperties();
    var date = IS9WD_dateKey_(IS9WD_todayManila_());
    var jobs = [IS9WD_JOB_MONDAY_, IS9WD_JOB_DIGEST_, IS9WD_JOB_BRIEF_];
    for (var i = 0; i < jobs.length; i++) {
      var key = IS9WD_doneKey(jobs[i], date, '');
      if (IS9WD_filled_(store.getProperty(key))) {
        store.deleteProperty(key);
        cleared.push(jobs[i]);
      }
    }
  } catch (err) {
    Logger.log('IS9WD: the job keys were not cleared: ' + err);
  }
  if (cleared.length) {
    IS9WD_logRow_({ source: 'Menu', actor: 'Admin', action: 'testModeOff',
      detail: "cleared today's job keys: " + cleared.join(', '), ok: true });
  }
  return cleared;
}

// The switches every batch job checks before touching anything. Returns the reason the job
// must stop, or '' when it may run.
function IS9WD_mailStopReason_(cfg, ctx, switchOn, label) {
  if (switchOn !== true) {
    return 'The ' + label + ' is switched off on ' + IS9WD_TAB.CONFIG + '. Nothing was sent.';
  }
  if (ctx.testMode && ctx.adminEmail === '') {
    return 'Test mode is on and your own address on ' + IS9WD_TAB.CONFIG +
      ' is blank, so there is nowhere to send to. Nothing was sent.';
  }
  return '';
}

// ============================================================================
//  THE THREE JOBS  (the dispatcher calls them with {cfg, source}; the menu with nothing)
// ============================================================================

/**
 * EMAIL ONE. One message per officer who holds an active item, in hierarchy order.
 */
function IS9WD_sendMondayAssignments_(opt) {
  return IS9WD_mailBatch_(opt, {
    jobKey: IS9WD_JOB_MONDAY_,
    label: 'Monday email',
    on: function (cfg) { return cfg.switches.mailMonday; },
    compose: function (ctx, entry, active, link) {
      return {
        subject: IS9WD_mondaySubject_(ctx, entry),
        blocks: IS9WD_mondayBlocks_(ctx, entry, active, link)
      };
    }
  });
}

/**
 * EMAIL TWO. One message per officer with something due tomorrow or overdue, and none at
 * all on a quiet day.
 */
function IS9WD_sendDailyDigest_(opt) {
  return IS9WD_mailBatch_(opt, {
    jobKey: IS9WD_JOB_DIGEST_,
    label: 'Daily email',
    on: function (cfg) { return cfg.switches.mailDaily; },
    compose: function (ctx, entry, active, link) {
      var split = IS9WD_digestSplit_(ctx, active);
      if (!split.dueTomorrow.length && !split.overdue.length) return null;
      return {
        subject: IS9WD_digestSubject_(entry, split.dueTomorrow, split.overdue),
        blocks: IS9WD_digestBlocks_(ctx, entry, split.dueTomorrow, split.overdue, link)
      };
    }
  });
}

// The skeleton the two officer emails share: switch, term, recipients, quota, then one guarded
// send per person with the done key written straight after it. A throw inside one send is
// caught, logged and named in the result, and the loop goes on to the next person.
function IS9WD_mailBatch_(opt, job) {
  var o = opt || {};
  var cfg = o.cfg || IS9WD_readConfig_(true);
  var source = IS9WD_txt_(o.source) || 'Menu';
  var out = { lines: [], sent: 0, skipped: [] };
  var ctx = IS9WD_mailContext_(cfg);

  var stop = IS9WD_mailStopReason_(cfg, ctx, job.on(cfg), job.label);
  if (stop !== '') { out.lines.push(stop); return out; }
  if (!ctx.inTerm) {
    out.lines.push('Outside the term calendar, so nothing was sent.');
    return out;
  }

  var items = IS9WD_readItems_();
  var recipients = IS9WD_recipientsFor(job.jobKey, cfg.directory.rows, items.rows, ctx.effectiveToday);
  if (!recipients.length) {
    out.lines.push(job.jobKey === IS9WD_JOB_DIGEST_
      ? 'Nothing is due tomorrow or overdue, so nothing was sent.'
      : 'Nobody has an active item, so nothing was sent.');
    return out;
  }
  // The done keys come BEFORE the quota guard, so a batch resuming after the six minute limit
  // is measured against the people still waiting and not against the whole list.
  var keys = IS9WD_mailDoneKeys_(job.jobKey, ctx.testMode);
  var pending = [];
  for (var p = 0; p < recipients.length; p++) {
    var who = IS9WD_mailEntry_(recipients[p]);
    if (keys.has(who.key)) out.skipped.push(who.key + ' (already sent today)');
    else pending.push(who);
  }
  if (!pending.length) {
    out.lines.push(job.label + ': everyone already had theirs today. Nothing was sent.');
    return out;
  }
  if (!IS9WD_mailQuotaOk_(job.jobKey, pending.length, cfg, function (l) { out.lines.push(l); }, source)) {
    return out;
  }

  var failures = [];
  for (var i = 0; i < pending.length; i++) {
    var entry = pending[i];
    if (entry.email === '' && !ctx.testMode) {
      out.skipped.push(entry.key + ' (no email on file)');
      IS9WD_logRow_({ source: source, actor: 'Mail', action: job.jobKey, committee: entry.committee,
        detail: 'no email on file', ok: false, result: 'SKIPPED' });
      continue;
    }
    try {
      var active = IS9WD_activeItemsFor_(items, entry.committee);
      var link = IS9WD_linkFor_(entry.key);
      var mail = job.compose(ctx, entry, active, link);
      if (!mail) { out.skipped.push(entry.key + ' (nothing to say)'); continue; }
      IS9WD_mailSend_(entry.email, mail.subject, mail.blocks, IS9WD_mailMeta_(ctx, entry), ctx);
      keys.set(entry.key);
      out.sent++;
      IS9WD_logRow_({ source: source, actor: 'Mail', action: job.jobKey, committee: entry.committee,
        detail: 'sent' + (ctx.testMode ? ' to the admin address (test mode)' : ''), ok: true });
    } catch (err) {
      var why = IS9WD_txt_(err && err.message ? err.message : err);
      failures.push(entry.key + ': ' + why);
      out.skipped.push(entry.key + ' (failed: ' + why + ')');
      IS9WD_logRow_({ source: source, actor: 'Mail', action: job.jobKey, committee: entry.committee,
        detail: 'failed: ' + why, ok: false });
    }
  }

  // Email four, once, naming everyone who was missed. It honours the alert switch and the once
  // a day key inside IS9WD_alertOnce_, so a bad address does not mail Ethan every hour.
  if (failures.length) {
    try {
      IS9WD_jobAlert_(job.jobKey, new Error(failures.length + ' send(s) failed in the ' +
        job.label + '. Send it again from the Emails menu for the people named below; ' +
        'whoever already received theirs is skipped.'), failures);
    } catch (err) {
      Logger.log('IS9WD: the send failure alert was not sent: ' + err);
    }
  }

  if (out.skipped.length) out.lines.push('Skipped: ' + out.skipped.join('; '));
  // The LAST line is what the dispatcher records on the schedule row, so it names the misses.
  out.lines.push(job.label + ': ' + out.sent + ' sent' +
    (out.skipped.length ? ', ' + out.skipped.length + ' skipped' : '') +
    (failures.length ? ', FAILED for ' + failures.join('; ') : '') +
    (ctx.testMode ? ', all to your own address because test mode is on' : '') + '.');
  return out;
}

/**
 * EMAIL THREE. One recipient, the admin address on 01 | Configuration, never the directory.
 * Sent whether or not the workbook is ready: readiness is what it reports.
 */
function IS9WD_sendSundayBrief_(opt) {
  var o = opt || {};
  var cfg = o.cfg || IS9WD_readConfig_(true);
  var source = IS9WD_txt_(o.source) || 'Menu';
  var out = { lines: [], sent: 0, skipped: [] };
  var ctx = IS9WD_mailContext_(cfg);

  if (cfg.switches.mailSunday !== true) {
    out.lines.push('The Sunday email is switched off on ' + IS9WD_TAB.CONFIG + '. Nothing was sent.');
    return out;
  }
  if (ctx.adminEmail === '') {
    out.lines.push('Your own address on ' + IS9WD_TAB.CONFIG + ' is blank, so the brief has ' +
      'nowhere to go. Nothing was sent.');
    return out;
  }
  if (!IS9WD_mailQuotaOk_(IS9WD_JOB_BRIEF_, 1, cfg, function (l) { out.lines.push(l); }, source)) {
    return out;
  }

  var adminKey = IS9WD_trim_(IS9WD_CFG.DIRECTORY.adminKey).toUpperCase() || 'ADMIN';
  var keys = IS9WD_mailDoneKeys_(IS9WD_JOB_BRIEF_, ctx.testMode);
  if (keys.has(adminKey)) {
    out.lines.push('The brief already went out today.');
    return out;
  }
  try {
    var items = IS9WD_readItems_();
    var bc = IS9WD_briefContext_(cfg, items);
    var meta = { eyebrow: IS9WD_MAIL_BRAND_, title: 'Sunday brief', sub: bc.weekLine, foot: IS9WD_MAIL_FOOT_ };
    IS9WD_mailSend_(ctx.adminEmail, IS9WD_briefSubject_(bc), IS9WD_briefBlocks_(bc), meta, ctx);
    keys.set(adminKey);
    out.sent = 1;
    IS9WD_logRow_({ source: source, actor: 'Mail', action: IS9WD_JOB_BRIEF_, detail: 'sent', ok: true });
    out.lines.push('Sunday brief: sent to your own address.');
  } catch (err) {
    IS9WD_logRow_({ source: source, actor: 'Mail', action: IS9WD_JOB_BRIEF_,
      detail: 'failed: ' + IS9WD_txt_(err && err.message ? err.message : err), ok: false });
    throw err;
  }
  return out;
}

// ============================================================================
//  EMAIL FOUR  (the failure mail, plain text, at most once per job per day)
// ============================================================================

/**
 * Composes the failure mail and hands it to IS9WD_alertOnce_, which holds the once per job per
 * day key and the send. Plain text on purpose: a stack trace reads worse in HTML, and plain
 * text is the channel most likely to survive whatever just broke. Honours the alert switch.
 * Returns true only when this call is the one that sent.
 */
function IS9WD_jobAlert_(jobKey, err, extraLines) {
  var on = true;
  try {
    var sw = IS9WD_namedOrNull_('IS9WD_MAIL_ALERT');
    on = sw ? IS9WD_bool_(sw.getValue()) : true;
  } catch (e) {
    on = true;
  }
  if (!on) return false;
  var key = IS9WD_trim_(jobKey).toUpperCase();
  var subject = IS9WD_MAIL_PREFIX_ + 'Tracker job failed: ' + key;
  var lines = [
    'Job: ' + key,
    'When: ' + IS9WD_stampText_(IS9WD_nowManila_()) + ' Manila',
    '',
    'What went wrong:',
    IS9WD_txt_(err && err.message ? err.message : err),
    '',
    IS9WD_txt_(err && err.stack ? err.stack : 'no stack available')
  ];
  var extra = extraLines && typeof extraLines.length === 'number' ? extraLines : [];
  if (extra.length) lines.push('', extra.join('\n'));
  var tail = IS9WD_lastLogLines_(IS9WD_MAIL_LOG_TAIL_);
  if (tail.length) lines.push('', 'The last ' + tail.length + ' log rows:', tail.join('\n'));
  lines.push('', 'This is sent at most once per job per day. The job will not run again today by ' +
    'itself: a failed run marks its window as used, so a broken job cannot repeat every hour. ' +
    'To run it by hand, use its own item on the IS9 Deliverables menu: the three emails are ' +
    'under Emails, Archive this week and Retire accomplished items are on the root menu.');
  return IS9WD_alertOnce_(key, subject, lines.join('\n'));
}

// The newest n rows of the log, one line each, or nothing when the tab is missing.
function IS9WD_lastLogLines_(n) {
  try {
    var sheet = IS9WD_sheetOrNull_('LOG');
    if (!sheet) return [];
    var last = sheet.getLastRow();
    var want = IS9WD_posInt_(n) || IS9WD_MAIL_LOG_TAIL_;
    var first = Math.max(IS9WD_LOG.firstRow, last - want + 1);
    if (last < first) return [];
    var values = sheet.getRange(first, IS9WD_LOG.firstCol, last - first + 1, IS9WD_LOG.lastCol)
      .getDisplayValues();
    var out = [];
    for (var i = 0; i < values.length; i++) {
      var cells = [];
      for (var c = 0; c < values[i].length; c++) {
        if (IS9WD_txt_(values[i][c]) !== '') cells.push(IS9WD_txt_(values[i][c]));
      }
      if (cells.length) out.push(cells.join(IS9WD_SEP));
    }
    return out;
  } catch (err) {
    return [];
  }
}

// ============================================================================
//  PREFLIGHT  (sends nothing; renders everything)
// ============================================================================

/**
 * Everything Ethan needs to approve the wording with zero emails in existence: the plumbing,
 * the fourteen recipients and their links, and the FULL rendering of a Monday email, a digest
 * and the whole Sunday brief. Returns lines for the log plus the previews the menu renders as
 * the emails will actually look.
 */
function IS9WD_mailPreflight_() {
  var out = { lines: [], previews: [], warnings: [] };
  var cfg = IS9WD_readConfig_(true);
  var ctx = IS9WD_mailContext_(cfg);
  var items = IS9WD_readItems_();
  var sw = cfg.switches;
  var i;

  var left = null;
  try { left = MailApp.getRemainingDailyQuota(); } catch (err) { left = null; }
  var reserve = IS9WD_int_(sw.quotaReserve) === null ? IS9WD_MAIL_BATCH_RESERVE_ : IS9WD_int_(sw.quotaReserve);

  out.lines.push('Test mode: ' + (ctx.testMode ? 'ON, every email goes to ' + (ctx.adminEmail || 'a BLANK admin address')
    : 'OFF, emails go to the officers'));
  out.lines.push('Switches: Monday ' + (sw.mailMonday ? 'on' : 'off') + ', daily ' + (sw.mailDaily ? 'on' : 'off') +
    ', Sunday ' + (sw.mailSunday ? 'on' : 'off') + ', failure alerts ' + (sw.mailAlert ? 'on' : 'off'));
  out.lines.push('Sender: ' + (ctx.senderName || '(no display name)') +
    (ctx.noReply ? ', no reply' : (ctx.replyTo !== '' ? ', reply to ' + ctx.replyTo : ', replies to the sending account')));
  out.lines.push('Mail left today: ' + (left === null ? 'not readable' : left + ', reserve ' + reserve));
  out.lines.push('Week ' + ctx.weekNo + (ctx.weekLong !== '' ? ', ' + ctx.weekLong : '') +
    (ctx.inTerm ? '' : ', OUTSIDE THE TERM so the officer emails will not send'));
  out.lines.push('Sign-off for this week: ' + (ctx.signoffSet ? 'set' : 'NOT SET, so the emails carry no sign-off'));
  var noId = 0;
  for (i = 0; i < items.rows.length; i++) {
    if (items.rows[i].id === '' && items.rows[i].typed === true) noId++;
  }
  out.lines.push('Rows without an ID: ' + noId + (noId ? ', run Automation > Give new rows an ID now' : ''));
  if (ctx.testMode && ctx.adminEmail === '') out.warnings.push('Your own address is blank. Nothing can send.');
  if (!ctx.signoffSet) out.warnings.push('The sign-off is not set for this week.');
  if (noId > 0) out.warnings.push(noId + ' row(s) have no ID and cannot be ticked from a phone.');

  // The directory, in hierarchy order, with the link each person would receive. The whole
  // token is printed here because this dialog is the one place it may be, and Ethan already
  // has Show the links for the same reason.
  out.lines.push('');
  out.lines.push('Recipients, in hierarchy order:');
  var dir = cfg.directory.inHierarchy;
  var mondayList = IS9WD_recipientsFor(IS9WD_JOB_MONDAY_, cfg.directory.rows, items.rows, ctx.effectiveToday);
  var digestList = IS9WD_recipientsFor(IS9WD_JOB_DIGEST_, cfg.directory.rows, items.rows, ctx.effectiveToday);
  var mondayKeys = {};
  var digestKeys = {};
  for (i = 0; i < mondayList.length; i++) mondayKeys[mondayList[i].key] = true;
  for (i = 0; i < digestList.length; i++) digestKeys[digestList[i].key] = true;
  for (i = 0; i < dir.length; i++) {
    var e = dir[i];
    var link = IS9WD_linkFor_(e.key);
    out.lines.push(e.key + '  ' + e.committee + IS9WD_SEP + (e.fullName || '(no name yet)') + IS9WD_SEP +
      (e.email || 'no address on file') + (e.revoked ? IS9WD_SEP + 'REVOKED' : '') +
      (mondayKeys[e.key] ? IS9WD_SEP + 'gets Monday' : '') + (digestKeys[e.key] ? IS9WD_SEP + 'gets today\'s digest' : ''));
    out.lines.push('      ' + link);
  }

  // The renderings. The first Monday recipient, the first digest recipient, the brief.
  if (mondayList.length) {
    var me = IS9WD_mailEntry_(mondayList[0]);
    var active = IS9WD_activeItemsFor_(items, me.committee);
    out.previews.push({
      title: 'Monday email, as ' + (me.fullName || me.committee) + ' would receive it',
      to: ctx.testMode ? ctx.adminEmail : me.email,
      subject: IS9WD_mailSubject_(ctx, IS9WD_mondaySubject_(ctx, me)),
      blocks: IS9WD_mondayBlocks_(ctx, me, active, IS9WD_linkFor_(me.key)),
      meta: IS9WD_mailMeta_(ctx, me),
      count: mondayList.length
    });
  } else {
    out.lines.push('', 'No Monday email would go out right now: nobody has an active item.');
  }
  if (digestList.length) {
    var de = IS9WD_mailEntry_(digestList[0]);
    var split = IS9WD_digestSplit_(ctx, IS9WD_activeItemsFor_(items, de.committee));
    out.previews.push({
      title: 'Daily digest, as ' + (de.fullName || de.committee) + ' would receive it today',
      to: ctx.testMode ? ctx.adminEmail : de.email,
      subject: IS9WD_mailSubject_(ctx, IS9WD_digestSubject_(de, split.dueTomorrow, split.overdue)),
      blocks: IS9WD_digestBlocks_(ctx, de, split.dueTomorrow, split.overdue, IS9WD_linkFor_(de.key)),
      meta: IS9WD_mailMeta_(ctx, de),
      count: digestList.length
    });
  } else {
    out.lines.push('', 'No digest would go out today: nothing is due tomorrow and nothing is overdue.');
  }
  var bc = IS9WD_briefContext_(cfg, items);
  out.previews.push({
    title: 'Sunday brief, as you would receive it',
    to: ctx.adminEmail || '(blank admin address)',
    subject: IS9WD_mailSubject_(ctx, IS9WD_briefSubject_(bc)),
    blocks: IS9WD_briefBlocks_(bc),
    meta: { eyebrow: IS9WD_MAIL_BRAND_, title: 'Sunday brief', sub: bc.weekLine, foot: IS9WD_MAIL_FOOT_ },
    count: 1
  });
  out.lines.push('', 'Nothing was sent. ' + out.previews.length + ' rendering(s) follow.');
  return out;
}
