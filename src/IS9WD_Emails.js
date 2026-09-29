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
 * NEW ITEMS ARE ANNOUNCED THE SAME DAY. Ethan asked on 2026-09-29 for a system that is not
 * bound to the week: an item he adds on a Wednesday reaches its officer on Wednesday. So the
 * hourly pass, on any day, sends each affected officer one New on your list email for the
 * rows nobody has told them about, and stamps those rows in the Notified at column; the
 * Monday email stamps everything it lists, so a row is announced once and then summarised.
 * The stamp is written in test mode too, or the rehearsal would re-announce the same rows
 * to Ethan every hour; clearing a cell in that column has the row announced again.
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
// The cap is what keeps the brief under Gmail's 102 KB clip: three lists of forty ledger rows
// on top of the brief's own 35 KB would pass it, and a clipped brief loses the machine, the
// housekeeping, the workbook link and the signature. Twenty five rows a list keeps the worst
// case near 80 KB.
var IS9WD_MAIL_LOG_TAIL_ = 5;
var IS9WD_MAIL_LIST_CAP_ = 25;

var IS9WD_JOB_MONDAY_ = 'MONDAY_ASSIGNMENTS';
var IS9WD_JOB_DIGEST_ = 'DAILY_DIGEST';
var IS9WD_JOB_BRIEF_ = 'SUNDAY_BRIEF';

var IS9WD_MAIL_BRAND_ = "Investors' Society";

// THE LETTER'S OWN PALETTE. The workbook's green and purple are the identity and they are the
// only colours in the letter: the green for the masthead, the headline, the rules that matter
// and the button, the purple family for an exception, and sage for a label, a numeral and the
// signature's short rule. Around them the mail uses warm neutrals a screen does not shout: an
// ivory page on a stone desk, a warm near black for the body, a cool grey for a secondary line
// and two hairlines. Nothing here reads as a status colour by accident. It is the only place
// these hexes appear, and the self test lists them exactly.
var IS9WD_MAIL_INK_ = {
  green: '#085040',   // the identity: the header block, the headline, the button
  plum: '#5D4170',    // the running heads, a chapter numeral, one stripe of the ribbon
  purple: '#724485',  // the overdue word, every flag, a holding gate, the test slug
  dusk: '#8B74A1',    // superseded or not applicable: the carousel note
  lilac: '#CFC0E0',   // the letter's kind on the green, the last stripe of the ribbon
  sage: '#58756A',    // labels, small caps, the numerals
  ink: '#2A2D2B',     // body text, a warm near black
  slate: '#5C6360',   // secondary text, a cool stone grey
  paper: '#FBF9F3',   // ivory, the page
  page: '#F0ECE2',    // the desk the page sits on
  mist: '#E7EFEB',    // the pale green panel the sign-off sits on
  line: '#DAD4C6',    // hairline
  faint: '#EDE8DC'    // the lighter hairline inside a list
};
// The mark in the header's bordered square when the page address, and so the logo, is not
// set yet. Three letters, because the square is 38px.
var IS9WD_MAIL_MONOGRAM_ = 'IS9';
// THE LOGO IS READ FROM THE OFFICERS PAGE ADDRESS. The brand band, the Society's gradient
// with the white mark on it, is published beside the page as mail/band.jpg, and the header
// asks for it at that address, so it is a setting on 01 | Configuration and never a constant
// here. A blank address prints the text header instead, and a mail client that hides images
// prints the alt text, which is the Society's name.
var IS9WD_MAIL_BAND_ = 'mail/band.jpg';

// The page address as an asset base: trimmed, a trailing slash or hash dropped, and only an
// http address counts, because anything else in that cell is a note to Ethan and not a place.
function IS9WD_mailAssetBase_(raw) {
  var base = IS9WD_trim_(raw).replace(/[#\/]+$/, '');
  return /^https?:\/\//i.test(base) ? base : '';
}
var IS9WD_MAIL_GREET_ = 'Greetings in St. La Salle!';
var IS9WD_MAIL_CLOSE_ = 'For a financially literate Lasallian community,';

// A position as the directory shouts it, as a letter prints it: EXECUTIVE VICE PRESIDENT FOR
// EXTERNALS becomes Executive Vice President for Externals. Small words stay small unless they
// open the phrase, a short all caps token (VP, EVP, IT, IS9) stays as typed, a hyphenated word
// capitalises each part, and a position typed in mixed case already prints exactly as typed,
// because a person chose that case.
function IS9WD_titleCase_(text) {
  var raw = IS9WD_trim_(text);
  if (/[a-z]/.test(raw)) return raw;
  var small = { 'for': 1, 'of': 1, 'and': 1, 'the': 1, 'in': 1, 'on': 1, 'to': 1 };
  var words = raw.toLowerCase().split(/\s+/);
  var out = [];
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (w === '') continue;
    if (i > 0 && small[w]) { out.push(w); continue; }
    out.push(IS9WD_titleWord_(w));
  }
  return out.join(' ');
}

function IS9WD_titleWord_(word) {
  var parts = word.split('-');
  for (var k = 0; k < parts.length; k++) {
    var part = parts[k];
    if (part === '') continue;
    parts[k] = part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1);
  }
  return parts.join('-');
}
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
  var adminKey = IS9WD_trim_(IS9WD_CFG.DIRECTORY.adminKey).toUpperCase();
  var signer = cfg.directory && cfg.directory.byKey ? cfg.directory.byKey[adminKey] : null;
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
    maxParts: IS9WD_posInt_(sw.maxParts),
    assetBase: IS9WD_mailAssetBase_(sw.appBaseUrl),
    // The letter is signed by the President, from the directory, never typed here.
    signName: IS9WD_txt_(signer ? signer.fullName : ''),
    signPosition: IS9WD_titleCase_(signer ? signer.position : '')
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

// THE SALUTE, as the Society's letters open: the Lasallian greeting, then Dear and the full
// name exactly as typed, falling back to the committee or office, with the position under it.
// No first name splitting: a two word given name is common here, and getting somebody's name
// wrong in the first line of the first email is the worst place to guess.
function IS9WD_mailGreeting_(entry) {
  var who = IS9WD_txt_(entry.fullName) !== '' ? entry.fullName : entry.committee;
  return 'Dear ' + who + ',';
}

function IS9WD_mailSalute_(entry) {
  return {
    k: 'salute',
    greet: IS9WD_MAIL_GREET_,
    text: IS9WD_mailGreeting_(entry),
    position: IS9WD_titleCase_(entry.position)
  };
}

// THE CLOSING, as the Society's letters end: the line, then the President's name, position
// and the Society. Omitted when the directory has no President to sign.
function IS9WD_mailClosing_(ctx) {
  return {
    k: 'closing',
    text: IS9WD_MAIL_CLOSE_,
    name: IS9WD_txt_(ctx.signName),
    position: IS9WD_txt_(ctx.signPosition),
    org: IS9WD_MAIL_BRAND_
  };
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

function IS9WD_mailMeta_(ctx, entry, kind) {
  var base = IS9WD_txt_(ctx.assetBase);
  return {
    title: IS9WD_MAIL_BRAND_,
    eyebrow: IS9WD_txt_(kind) || 'Weekly Deliverables',
    sub: ctx.weekLine,
    band: base !== '' ? base + '/' + IS9WD_MAIL_BAND_ : '',
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
  b.push(IS9WD_mailSalute_(entry));
  var n = active.length;
  b.push({
    k: 'p',
    text: 'Here ' + (n === 1 ? 'is your deliverable' : 'are your ' + n + ' deliverables') +
      ' for week ' + ctx.weekNo + (ctx.weekLong !== '' ? ', ' + ctx.weekLong : '') + '.'
  });
  b.push({ k: 'h', text: 'Week ' + ctx.weekNo + ' deliverables' });
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
  b.push(IS9WD_mailClosing_(ctx));
  return b;
}

// Active, titled, with an ID, and never announced: the rows a New on your list email is for.
// An unannounced row with no ID is left for the next pass, because the page ticks by ID and
// an officer told about a row they cannot tick would be told something untrue.
function IS9WD_freshItems_(active) {
  var out = [];
  for (var i = 0; i < active.length; i++) {
    var it = active[i];
    if (it.active !== true || IS9WD_txt_(it.title) === '' || IS9WD_txt_(it.id) === '') continue;
    if (IS9WD_filled_(it.notifiedAt)) continue;
    out.push(it);
  }
  return out;
}

function IS9WD_itemRowNumbers_(list) {
  var rows = [];
  for (var i = 0; i < list.length; i++) {
    if (IS9WD_posInt_(list[i].row) !== null) rows.push(list[i].row);
  }
  return rows;
}

function IS9WD_noticeSubject_(entry, fresh) {
  var n = fresh.length;
  return (n === 1 ? 'New on your list: ' : n + ' new on your list: ') + entry.committee;
}

/**
 * EMAIL ONE AND A HALF, the same day notice: only the rows the officer has not been told
 * about, then the link. No sign-off, because the sign-off belongs to the week's list.
 */
function IS9WD_noticeBlocks_(ctx, entry, fresh, link) {
  var b = [];
  if (ctx.testMode) b.push(IS9WD_mailTestLine_(entry));
  b.push(IS9WD_mailSalute_(entry));
  b.push({ k: 'p', text: (fresh.length === 1 ? 'One deliverable was' : fresh.length + ' deliverables were') +
    ' added to your list.' });
  b.push({ k: 'h', text: 'New on your list' });
  b.push({ k: 'items', rows: IS9WD_mailItemRows_(ctx, entry, fresh) });
  b.push({ k: 'note', text: 'Your whole list for the week is on your page, and the Monday email carries all of it.' });
  b.push.apply(b, IS9WD_mailLinkBlock_(entry, link));
  b.push(IS9WD_mailClosing_(ctx));
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
  b.push(IS9WD_mailSalute_(entry));
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
  b.push(IS9WD_mailClosing_(ctx));
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
      // The ledger's right column is 96 px wide on a phone, so the date is the short form the
      // feed uses, Fri, Sep 25, and not the long one a letter's body prints.
      overdue.push({ id: it.id, row: it.row, committee: it.committee, title: it.title,
        when: IS9WD_ddd_(it.deadline) });
    }
    if (terminal && when !== null && ws !== null && when >= ws - 7 && when <= ws - 1) {
      doneLastWeek.push({ id: it.id, row: it.row, committee: it.committee, title: it.title,
        when: IS9WD_ddd_(it.statusAt) });
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
  if (IS9WD_txt_(m.eyebrow) !== '') out.push(IS9WD_upper_(m.eyebrow));
  if (IS9WD_txt_(m.sub) !== '') out.push(m.sub);
  if (out.length) out.push('');
  for (var i = 0; i < blocks.length; i++) {
    var b = IS9WD_mailBlock_(blocks[i]);
    var j;
    switch (b.k) {
      case 'test':
        out.push(b.text, '');
        break;
      case 'salute':
        out.push(b.greet, '', b.text);
        if (b.position !== '') out.push(b.position);
        out.push('');
        break;
      case 'closing':
        out.push('', b.text);
        if (b.name !== '') out.push('', b.name);
        if (b.position !== '') out.push(b.position);
        if (b.name !== '') out.push(b.org);
        out.push('');
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
    small: b.small === true,
    greet: IS9WD_txt_(b.greet),
    position: IS9WD_txt_(b.position),
    name: IS9WD_txt_(b.name),
    org: IS9WD_txt_(b.org)
  };
}

/**
 * The HTML body. Tables for structure and inline styles on every element, because that is
 * the only markup Gmail on a phone renders the same way twice. No image, no web font, no
 * script, no style block: a serif stack for the letter and a sans for the small caps, the
 * letter's own palette above, and every value escaped.
 *
 * The page is an editorial masthead rather than a banner: a double green hairline opens it,
 * a bordered monogram and the Society letterspaced under it name the sender, an italic
 * dateline names the week, and one large serif line in the green says what the letter is
 * for. Nothing is boxed and nothing is filled. Items are a list with an oversized numeral in
 * a narrow gutter and a hairline between rows, a section is a small caps running head with a
 * rule running out from it (or, in a letter long enough to need wayfinding, a numbered
 * chapter), a ledger is label and value divided by faint hairlines, and a flag or the overdue
 * word is bold purple on the paper. Only an exception is decorated.
 */
function IS9WD_mailHtml_(blocks, meta) {
  var m = meta || {};
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="x-apple-disable-message-reformatting">' +
    // The letter is a light page and says so, so Apple Mail and Outlook keep the ivory rather
    // than inverting it in dark mode. Gmail ignores the hint and recolours on its own.
    '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">' +
    '<title>' + IS9WD_mailEsc_(m.title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + IS9WD_MAIL_INK_.page +
    ';-webkit-text-size-adjust:100%;">' +
    IS9WD_mailHtmlBody_(blocks, meta) +
    '</body></html>';
}

// The container alone, so the preflight dialog can show the email inside the dialog rather
// than a whole document inside a document. The first test block rides above the masthead as
// a printer's slug; a second one, which no builder emits, stays where the builder put it. A
// letter with three or more sections gets numbered chapters instead of running heads, because
// the Sunday brief is nine sections long and a 12px running head is not enough to navigate it.
function IS9WD_mailHtmlBody_(blocks, meta) {
  var m = meta || {};
  var P = IS9WD_MAIL_INK_;
  var F = IS9WD_mailFontStack_();
  var slug = '';
  var body = [];
  var sections = 0;
  var i;
  for (i = 0; i < blocks.length; i++) if (IS9WD_mailBlock_(blocks[i]).k === 'h') sections++;
  var chapter = 0;
  for (i = 0; i < blocks.length; i++) {
    var b = IS9WD_mailBlock_(blocks[i]);
    if (b.k === 'test' && slug === '') {
      slug = IS9WD_mailBlockHtml_(b, P, F);
    } else if (b.k === 'h' && sections >= IS9WD_MAIL_CHAPTERS_FROM_) {
      chapter++;
      body.push(IS9WD_mailBlockHtml_(b, P, F, chapter));
    } else {
      body.push(IS9WD_mailBlockHtml_(b, P, F));
    }
  }
  var headline = IS9WD_mailHeadline_(m.eyebrow);
  // The mso wrapper pins the page to 600px in Outlook desktop, which ignores max-width and
  // would otherwise fill the reading pane.
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
    'style="background:' + P.page + ';">' +
    '<tr><td align="center" style="padding:24px 10px 32px;">' +
    '<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
    'style="max-width:600px;background:' + P.paper + ';">' +
    (slug !== '' ? '<tr><td style="padding:16px 24px 0;">' + slug + '</td></tr>' : '') +
    IS9WD_mailMasthead_(m, P, F, IS9WD_mailFigures_(blocks)) +
    '<tr><td style="padding:8px 24px 0;">' +
    (headline !== '' ? '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
      '<tr><td style="padding:26px 0 22px;font-family:' + F.serif + ';font-size:32px;line-height:1.15;font-weight:400;' +
      'letter-spacing:-0.01em;color:' + P.green + ';">' + IS9WD_mailEsc_(headline) + '</td></tr></table>' : '') +
    body.join('') +
    '</td></tr>' +
    IS9WD_mailColophon_(m, P, F) +
    '</table>' +
    '<!--[if mso]></td></tr></table><![endif]-->' +
    '</td></tr></table>';
}

// How many sections a letter needs before its heads become numbered chapters. The officer
// letters carry one or two, the brief carries nine.
var IS9WD_MAIL_CHAPTERS_FROM_ = 3;

// Two stacks: the serif the Society's letters are set in, which Georgia carries on every
// phone and desktop mail client, and a sans for the small caps labels.
function IS9WD_mailFontStack_() {
  return {
    serif: "Georgia,'Times New Roman',Times,serif",
    sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  };
}

// Small caps that survive Outlook, which ignores text-transform: uppercased in JS, then escaped.
function IS9WD_mailCaps_(text) {
  return IS9WD_mailEsc_(IS9WD_txt_(text).toUpperCase());
}

// The style of a small caps run: the sans, letterspaced, 12px at the smallest, because iOS
// Mail does not scale type up and Gmail on Android distorts letterspacing when it does.
function IS9WD_mailCapsStyle_(F, color, size, spacing, weight) {
  return 'font-family:' + F.sans + ';font-size:' + (size || 12) + 'px;line-height:1.5;letter-spacing:' +
    (spacing || '0.1em') + ';font-weight:' + (weight || 400) + ';color:' + color + ';';
}

// The style of a serif run.
function IS9WD_mailSerifStyle_(F, color, size, extra) {
  return 'font-family:' + F.serif + ';font-size:' + size + 'px;line-height:1.5;color:' + color + ';' + (extra || '');
}

// The large serif line each letter opens with, chosen by the letter's kind. The four kinds are
// the four eyebrows the builders set. A kind the map does not know prints as its own headline,
// deliberately: a new kind gets a plain headline rather than a wrong one, and the eyebrow is
// already the letter's name.
function IS9WD_mailHeadline_(eyebrow) {
  var k = IS9WD_txt_(eyebrow).toLowerCase();
  if (k === 'weekly deliverables') return 'Your week, at a glance';
  if (k === 'daily digest') return 'What is due next';
  if (k === 'new assignment') return 'New on your list';
  if (k === 'sunday brief') return 'The Sunday brief';
  return IS9WD_txt_(eyebrow);
}

// A full width rule: one hairline, or the double hairline the masthead opens and the foot
// closes with. A non breaking space at 1px sits inside the cell, because Outlook draws an
// empty cell one text line tall whatever its height says.
function IS9WD_mailRule_(P, double) {
  var style = double
    ? 'border-top:1px solid ' + P.green + ';border-bottom:1px solid ' + P.green + ';height:3px;font-size:1px;line-height:3px;'
    : 'border-top:1px solid ' + P.line + ';height:1px;font-size:1px;line-height:1px;';
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
    '<tr><td style="' + style + '">&nbsp;</td></tr></table>';
}

// A short rule, 36px, purple, the one the signature stands on.
function IS9WD_mailShortRule_(P) {
  return '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>' +
    '<td width="36" style="width:36px;border-top:2px solid ' + P.purple + ';height:2px;font-size:1px;line-height:2px;">&nbsp;</td>' +
    '</tr></table>';
}

// The dateline breaks only at its pipes: each segment is held on one line, so a date never
// splits in the middle at 390px. A subtitle with no pipe is one segment.
function IS9WD_mailDateline_(sub) {
  var parts = IS9WD_txt_(sub).split('|');
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var s = IS9WD_trim_(parts[i]);
    if (s !== '') out.push('<span style="white-space:nowrap;">' + IS9WD_mailEsc_(s) + '</span>');
  }
  return out.join(' &nbsp;|&nbsp; ');
}

// One reading under the dateline of an officer letter: how many items it lists and how many
// of them are overdue, counted from the items blocks themselves and never estimated. The
// brief has no items block, so it gets no reading.
function IS9WD_mailFigures_(blocks) {
  var items = 0;
  var overdue = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = IS9WD_mailBlock_(blocks[i]);
    if (b.k !== 'items') continue;
    items += b.rows.length;
    for (var j = 0; j < b.rows.length; j++) if (b.rows[j] && b.rows[j].overdue === true) overdue++;
  }
  if (items === 0) return '';
  return items + (items === 1 ? ' item' : ' items') + (overdue > 0 ? '  ·  ' + overdue + ' overdue' : '');
}

// THE RIBBON: four stripes of the identity, sage to lilac, the width of the page. It closes
// the header and opens the foot, so the page carries its colours at both ends.
function IS9WD_mailRibbon_(P) {
  var stripes = [P.sage, P.plum, P.purple, P.lilac];
  var cells = [];
  for (var i = 0; i < stripes.length; i++) {
    cells.push('<td width="25%" style="width:25%;height:5px;background:' + stripes[i] +
      ';font-size:1px;line-height:5px;">&nbsp;</td>');
  }
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
    '<tr>' + cells.join('') + '</tr></table>';
}

// THE HEADER, as rows of the page table because the band bleeds to both edges: the brand
// band (the Society's gradient with the white mark, an image read from the page address, or
// the text mark in a bordered square on the green when there is no address yet), then the
// green block with the letter's kind in lilac small caps, the italic dateline in ivory and
// the figures, then the ribbon.
function IS9WD_mailMasthead_(m, P, F, figures) {
  var kind = IS9WD_txt_(m.eyebrow);
  var sub = IS9WD_txt_(m.sub);
  var band = IS9WD_txt_(m.band);
  var top = band !== ''
    ? '<tr><td style="padding:0;background:' + P.green + ';">' +
      // The alt text is styled like the text mark, because a client that hides images prints
      // it in its own default black otherwise, which on the green is no name at all.
      '<img src="' + IS9WD_mailEsc_(band) + '" width="600" alt="' + IS9WD_mailEsc_(m.title) + '" ' +
      'style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;' +
      'color:' + P.paper + ';font-family:' + F.sans + ';font-size:13px;line-height:1.5;letter-spacing:0.2em;text-align:center;">' +
      '</td></tr>'
    : '<tr><td align="center" style="padding:30px 24px 0;background:' + P.green + ';">' +
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>' +
      '<td align="center" width="38" height="38" style="width:38px;height:38px;border:1px solid ' + P.lilac +
      ';font-family:' + F.serif + ';font-size:13px;line-height:38px;letter-spacing:0.12em;color:' + P.paper +
      ';">' + IS9WD_mailEsc_(IS9WD_MAIL_MONOGRAM_) + '</td></tr></table>' +
      '<div style="padding:14px 0 0;' + IS9WD_mailCapsStyle_(F, P.paper, 13, '0.34em', 700) + '">' +
      IS9WD_mailCaps_(m.title) + '</div>' +
      '</td></tr>';
  return top +
    '<tr><td align="center" style="padding:' + (band !== '' ? '4px' : '10px') + ' 24px 22px;background:' + P.green + ';">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' +
    (kind !== '' ? '<tr><td align="center" style="' + IS9WD_mailCapsStyle_(F, P.lilac, 12, '0.3em', 700) + '">' +
      IS9WD_mailCaps_(kind) + '</td></tr>' : '') +
    (sub !== '' ? '<tr><td align="center" style="padding:10px 0 0;' + IS9WD_mailSerifStyle_(F, P.paper, 13, 'font-style:italic;') + '">' +
      IS9WD_mailDateline_(sub) + '</td></tr>' : '') +
    (figures !== '' ? '<tr><td align="center" style="padding:8px 0 0;' + IS9WD_mailCapsStyle_(F, P.lilac, 12, '0.14em') + '">' +
      IS9WD_mailCaps_(figures) + '</td></tr>' : '') +
    '</table></td></tr>' +
    '<tr><td style="padding:0;">' + IS9WD_mailRibbon_(P) + '</td></tr>';
}

// The foot, as rows of the page table: the ribbon again, then the sentence in small type on
// the desk colour. The signature above it already carries the one short rule a letter gets.
function IS9WD_mailColophon_(m, P, F) {
  var foot = IS9WD_txt_(m.foot);
  return '<tr><td style="padding:22px 0 0;">' + IS9WD_mailRibbon_(P) + '</td></tr>' +
    (foot !== '' ? '<tr><td align="center" style="padding:16px 32px 20px;background:' + P.mist + ';font-family:' + F.sans +
      ';font-size:12px;line-height:1.7;color:' + P.slate + ';">' + IS9WD_mailEsc_(foot) + '</td></tr>' : '');
}

// One block. The optional chapter is set only by the body, for a section head in a letter long
// enough to number its sections.
function IS9WD_mailBlockHtml_(b, P, F, chapter) {
  var j;
  var p = function (text, extra) {
    return '<p style="margin:0 0 16px;' + IS9WD_mailSerifStyle_(F, P.ink, 15, 'line-height:1.7;') + (extra || '') + '">' + text + '</p>';
  };
  var caps = function (text, color, weight) {
    return '<span style="' + IS9WD_mailCapsStyle_(F, color || P.sage, 12, '0.1em', weight) + '">' + IS9WD_mailCaps_(text) + '</span>';
  };
  var table = function (rows, extra) {
    return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ' +
      'style="border-collapse:collapse;' + (extra || 'margin:0 0 22px;') + '">' + rows.join('') + '</table>';
  };
  var hair = function (last) {
    return 'border-bottom:1px solid ' + (last ? P.line : P.faint) + ';';
  };
  switch (b.k) {
    case 'test':
      // The printer's slug: the two words that matter in bold, the rest in the same purple.
      return '<p style="margin:0 0 14px;' + IS9WD_mailCapsStyle_(F, P.purple, 12, '0.02em') + 'letter-spacing:0;">' +
        IS9WD_mailEsc_(b.text).replace(/^TEST MODE\./, '<b>TEST MODE.</b>') + '</p>';
    case 'salute':
      return '<p style="margin:0 0 14px;' + IS9WD_mailSerifStyle_(F, P.slate, 14, 'font-style:italic;') + '">' +
        IS9WD_mailEsc_(b.greet) + '</p>' +
        '<p style="margin:0 0 3px;' + IS9WD_mailSerifStyle_(F, P.ink, 17, 'line-height:1.4;') + '">' +
        IS9WD_mailEsc_(b.text).replace(/^Dear (.*),$/, 'Dear <b>$1</b>,') + '</p>' +
        (b.position !== '' ? '<p style="margin:0 0 20px;">' + caps(b.position) + '</p>' : '<p style="margin:0 0 16px;"></p>');
    case 'closing':
      // The signature block, left aligned where the letter began: a short sage rule, the line
      // in italic, the name in the serif, position and Society in small caps.
      return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 0;">' +
        '<tr><td style="padding:0 0 14px;">' + IS9WD_mailShortRule_(P) + '</td></tr>' +
        '<tr><td style="' + IS9WD_mailSerifStyle_(F, P.slate, 14, 'line-height:1.6;font-style:italic;') + '">' +
        IS9WD_mailEsc_(b.text) + '</td></tr>' +
        (b.name !== '' ? '<tr><td style="padding:14px 0 0;' + IS9WD_mailSerifStyle_(F, P.ink, 17, 'line-height:1.4;') + '">' +
          IS9WD_mailEsc_(b.name) + '</td></tr>' +
          '<tr><td style="padding:4px 0 0;">' +
          caps((b.position !== '' ? b.position + '  ·  ' : '') + b.org) + '</td></tr>' : '') +
        '</table>';
    case 'h':
      if (chapter) {
        // A numbered chapter: a hairline, the numeral in the gutter the items use, the title in
        // the serif and the green.
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 16px;">' +
          '<tr><td colspan="2" style="border-top:1px solid ' + P.line + ';height:1px;font-size:1px;line-height:1px;">&nbsp;</td></tr>' +
          '<tr><td valign="baseline" width="52" style="width:52px;padding:16px 8px 0 0;' +
          IS9WD_mailSerifStyle_(F, P.plum, 20, 'line-height:1.2;letter-spacing:0.04em;') + '">' +
          IS9WD_mailEsc_(IS9WD_mailPad2_(chapter)) + '</td>' +
          '<td valign="baseline" style="padding:16px 0 0;' + IS9WD_mailSerifStyle_(F, P.green, 21, 'line-height:1.2;') + '">' +
          IS9WD_mailEsc_(b.text) + '</td></tr></table>';
      }
      // A running head: the label in small caps in plum, a hairline running out from it.
      return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 14px;">' +
        '<tr><td nowrap style="padding:0 12px 0 0;white-space:nowrap;' + IS9WD_mailCapsStyle_(F, P.plum, 12, '0.2em', 700) + '">' +
        IS9WD_mailCaps_(b.text) + '</td>' +
        '<td width="100%" style="border-top:1px solid ' + P.line + ';height:1px;font-size:1px;line-height:1px;">&nbsp;</td>' +
        '</tr></table>';
    case 'p':
      return p(IS9WD_mailEsc_(b.text), b.flag ? 'color:' + P.purple + ';font-weight:700;' : '');
    case 'note':
      return '<p style="margin:0 0 16px;' + IS9WD_mailSerifStyle_(F, b.flag ? P.purple : P.slate, 14,
        'line-height:1.6;font-style:italic;' + (b.flag ? 'font-weight:700;' : '')) + '">' + IS9WD_mailEsc_(b.text) + '</p>';
    case 'items': {
      if (!b.rows.length) return p('Nothing on your list.');
      var rows = [];
      for (j = 0; j < b.rows.length; j++) {
        var r = b.rows[j];
        var edge = hair(j === b.rows.length - 1);
        // The due line is the one line an officer is looking for, so the date is set in the
        // serif at body size and never letterspaced. An overdue item takes two lines: the word
        // alone in bold purple, then the date it missed, so nothing wraps in the middle of a date.
        var due = r.overdue
          ? '<div style="padding:6px 0 0;">' + caps('Overdue', P.purple, 700) + '</div>' +
            '<div style="padding:2px 0 0;' + IS9WD_mailSerifStyle_(F, P.slate, 14) + '">Was due ' + IS9WD_mailEsc_(r.due) + '</div>'
          : '<div style="padding:5px 0 0;">' + caps('Due') + '<span style="' + IS9WD_mailSerifStyle_(F, P.slate, 14) + '">&nbsp;&nbsp;' +
            IS9WD_mailEsc_(r.due) + '</span></div>';
        var inner = '<div style="' + IS9WD_mailSerifStyle_(F, P.ink, 16, 'line-height:1.4;') + '">' + IS9WD_mailEsc_(r.title) + '</div>' +
          due +
          (r.remark !== '' ? '<div style="padding:5px 0 0;' + IS9WD_mailSerifStyle_(F, P.slate, 14, 'font-style:italic;') + '">' +
            IS9WD_mailEsc_(r.remark) + '</div>' : '') +
          (r.flag !== '' ? '<div style="padding:6px 0 0;">' + caps(r.flag, P.purple, 700) + '</div>' : '') +
          (r.carousel ? '<div style="padding:5px 0 0;' + IS9WD_mailSerifStyle_(F, P.dusk, 13, 'font-style:italic;') + '">' +
            'Not on the carousel this week</div>' : '');
        rows.push('<tr>' +
          '<td valign="top" width="52" style="width:52px;padding:14px 8px 14px 0;' + edge +
          IS9WD_mailSerifStyle_(F, P.sage, 30, 'line-height:1;') + '">' + IS9WD_mailEsc_(IS9WD_mailPad2_(r.n)) + '</td>' +
          '<td valign="top" style="padding:14px 0 14px;' + edge + '">' + inner + '</td>' +
          '</tr>');
      }
      return table(rows);
    }
    case 'kv': {
      // A ledger: the label column takes two fifths so a long label wraps to two lines at
      // most at 390px. A hot row is purple on both sides, because the left column is the one
      // the eye scans.
      var kv = [];
      for (j = 0; j < b.rows.length; j++) {
        var row = b.rows[j];
        var hot = row[2] === true;
        var edgeKv = b.small ? '' : 'border-bottom:1px solid ' + P.faint + ';';
        var pad = b.small
          ? (j === 0 ? '14px' : '4px') + ' 16px ' + (j === b.rows.length - 1 ? '14px' : '4px')
          : '9px 0';
        kv.push('<tr>' +
          '<td valign="top" width="40%" style="width:40%;padding:' + pad + ';padding-right:14px;' + edgeKv + '">' +
          caps(row[0], hot ? P.purple : P.sage, hot ? 700 : 400) + '</td>' +
          '<td valign="top" style="padding:' + pad + ';' + edgeKv +
          IS9WD_mailSerifStyle_(F, hot ? P.purple : P.ink, b.small ? 13 : 14, 'line-height:1.55;' + (hot ? 'font-weight:700;' : '')) + '">' +
          IS9WD_mailEsc_(row[1]) + '</td></tr>');
      }
      // The small ledger, which is the sign-off, sits on a pale green panel.
      return table(kv, b.small ? 'margin:22px 0 0;background:' + P.mist + ';border-radius:6px;border-collapse:separate;' : 'margin:0 0 24px;');
    }
    case 'table': {
      // A list read as a ledger, whatever its width, so four columns never squeeze into 390px:
      // the last column stands on the right in its own 96px, the deliverable is the line, and
      // any column before it (an ID, a committee) is a small caps line above it. A three
      // column list leads with its first column and prints the rest as an italic line under it.
      var n = b.head.length;
      var mainAt = n >= 4 ? n - 2 : 0;
      var rightAt = n >= 4 ? n - 1 : (n >= 2 ? 1 : -1);
      var cells = [];
      var right = function (inner, style) {
        return '<td valign="top" align="right" width="96" style="width:96px;padding:0 0 0 12px;text-align:right;' + style + '">' + inner + '</td>';
      };
      cells.push('<tr>' +
        '<td valign="bottom" style="padding:0 0 7px;border-bottom:1px solid ' + P.sage + ';">' + (n ? caps(b.head[mainAt]) : '') + '</td>' +
        (rightAt >= 0 ? right(caps(b.head[rightAt]), 'padding-bottom:7px;border-bottom:1px solid ' + P.sage + ';') : '') + '</tr>');
      for (j = 0; j < b.rows.length; j++) {
        var line = b.rows[j];
        var edgeT = hair(j === b.rows.length - 1);
        var extra = [];
        for (var c = 0; c < line.length; c++) {
          if (c === mainAt || c === rightAt) continue;
          if (IS9WD_txt_(line[c]) !== '') extra.push(IS9WD_txt_(line[c]));
        }
        // Escaped once, at the print: caps() escapes the line above, the line below is escaped here.
        var above = extra.length && mainAt > 0
          ? '<div style="padding:0 0 3px;">' + caps(extra.join('  ·  ')) + '</div>' : '';
        var below = extra.length && mainAt === 0
          ? '<div style="padding:3px 0 0;' + IS9WD_mailSerifStyle_(F, P.slate, 13, 'font-style:italic;') + '">' +
            IS9WD_mailEsc_(extra.join(', ')) + '</div>' : '';
        cells.push('<tr>' +
          '<td valign="top" style="padding:10px 0;' + edgeT + '">' + above +
          '<div style="' + IS9WD_mailSerifStyle_(F, P.ink, 14, 'line-height:1.45;') + '">' + IS9WD_mailEsc_(line[mainAt]) + '</div>' + below + '</td>' +
          (rightAt >= 0 ? right(IS9WD_mailEsc_(line[rightAt]), 'padding-top:10px;padding-bottom:10px;' + edgeT +
            IS9WD_mailSerifStyle_(F, P.ink, 13)) : '') +
          '</tr>');
      }
      return table(cells);
    }
    case 'link': {
      var out = '';
      if (b.url !== '') {
        // The button is a green card the width of the page, small caps in ivory, so the whole
        // row is the tap target: the cell carries padding for Outlook, which ignores it on an
        // anchor, and the anchor is a block with padding of its own for every other client.
        out += '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 0;"><tr>' +
          '<td align="center" style="background:' + P.green + ';border-radius:6px;padding:6px 12px;">' +
          '<a href="' + IS9WD_mailEsc_(b.url) + '" style="display:block;padding:10px 8px;' +
          IS9WD_mailCapsStyle_(F, P.paper, 13, '0.18em', 700) + 'line-height:1.3;text-decoration:none;">' +
          IS9WD_mailCaps_(b.text) + '</a></td></tr></table>' +
          // The raw address under it, in an anchor of its own colour, because Gmail autolinks a
          // bare address in its own blue and underlines it.
          '<p style="margin:10px 0 0;font-family:' + F.sans + ';font-size:12px;line-height:1.5;word-break:break-all;">' +
          '<a href="' + IS9WD_mailEsc_(b.url) + '" style="color:' + P.slate + ';text-decoration:none;">' +
          IS9WD_mailEsc_(b.url) + '</a></p>';
      } else {
        out += p(IS9WD_mailEsc_(b.text));
      }
      if (b.note !== '') {
        out += '<p style="margin:12px 0 16px;' + IS9WD_mailSerifStyle_(F, P.slate, 13, 'line-height:1.6;font-style:italic;') + '">' +
          IS9WD_mailEsc_(b.note) + '</p>';
      }
      return out;
    }
    default:
      return '';
  }
}

// A numeral padded to two digits, as the gutter prints it.
function IS9WD_mailPad2_(n) {
  var s = String(n);
  return s.length === 1 ? '0' + s : s;
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
  // The rehearsal announced every row to Ethan and stamped it. Live, the officers have never
  // been told, so the stamps go too and the next pass announces each row once for real.
  var unstamped = 0;
  try {
    var wipe = IS9WD_apiImpl_('IS9WD_itemsClearNotified_');
    if (wipe) unstamped = wipe();
  } catch (err) {
    Logger.log('IS9WD: the rehearsal stamps were not cleared: ' + err);
  }
  if (cleared.length || unstamped) {
    IS9WD_logRow_({ source: 'Menu', actor: 'Admin', action: 'testModeOff',
      detail: "cleared today's job keys: " + (cleared.join(', ') || 'none') + '; ' +
        unstamped + ' notified stamp(s) cleared', ok: true });
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
    kind: 'Weekly Deliverables',
    on: function (cfg) { return cfg.switches.mailMonday; },
    compose: function (ctx, entry, active, link) {
      return {
        subject: IS9WD_mondaySubject_(ctx, entry),
        blocks: IS9WD_mondayBlocks_(ctx, entry, active, link),
        rows: IS9WD_itemRowNumbers_(active)
      };
    }
  });
}

/**
 * THE SAME DAY NOTICE. Run by the hourly pass on every day and by the menu. One message per
 * officer who has rows nobody has told them about, listing only those rows, and every row
 * listed is stamped the moment the message has gone. No done keys: the stamps are the memory,
 * so a second batch of rows the same afternoon is announced the same afternoon.
 */
function IS9WD_sendNewAssignments_(opt) {
  return IS9WD_mailBatch_(opt, {
    jobKey: 'NEW_ASSIGNMENTS',
    label: 'same day notice, which follows the Monday email switch,',
    kind: 'New Assignment',
    on: function (cfg) { return cfg.switches.mailMonday; },
    noDoneKeys: true,
    recipients: function (cfg, items, ctx) {
      var rows = IS9WD_dirRows_(cfg.directory.rows);
      var out = [];
      for (var i = 0; i < rows.length; i++) {
        if (IS9WD_freshItems_(IS9WD_activeItemsFor_(items, rows[i].committee)).length) out.push(rows[i]);
      }
      out.sort(function (a, b) {
        var ha = IS9WD_int_(a.hierarchy); var hb = IS9WD_int_(b.hierarchy);
        if (ha === null) ha = 99;
        if (hb === null) hb = 99;
        return ha - hb;
      });
      return out;
    },
    quiet: 'Nothing new to announce: every row has been sent to its officer.',
    compose: function (ctx, entry, active, link) {
      var fresh = IS9WD_freshItems_(active);
      if (!fresh.length) return null;
      return {
        subject: IS9WD_noticeSubject_(entry, fresh),
        blocks: IS9WD_noticeBlocks_(ctx, entry, fresh, link),
        rows: IS9WD_itemRowNumbers_(fresh)
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
    kind: 'Daily Digest',
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

  // opt.items is a copy already in hand, from an execution that just wrote a row and must
  // not read the sheet again before it has recalculated.
  var items = o.items || IS9WD_readItems_();
  var recipients = job.recipients ? job.recipients(cfg, items, ctx)
    : IS9WD_recipientsFor(job.jobKey, cfg.directory.rows, items.rows, ctx.effectiveToday);
  // opt.only narrows a batch to one office: the page adding a deliverable emails that officer
  // and nobody else, in the same execution.
  if (IS9WD_txt_(o.only) !== '') {
    var want = IS9WD_trim_(o.only).toLowerCase();
    var narrowed = [];
    for (var q = 0; q < recipients.length; q++) {
      if (IS9WD_trim_(recipients[q].committee).toLowerCase() === want) narrowed.push(recipients[q]);
    }
    recipients = narrowed;
  }
  if (!recipients.length) {
    out.lines.push(job.quiet || (job.jobKey === IS9WD_JOB_DIGEST_
      ? 'Nothing is due tomorrow or overdue, so nothing was sent.'
      : 'Nobody has an active item, so nothing was sent.'));
    return out;
  }

  // The done keys come BEFORE the quota guard, so a batch resuming after the six minute limit
  // is measured against the people still waiting and not against the whole list. A job whose
  // memory is the stamp on each row carries no done keys at all.
  var keys = job.noDoneKeys
    ? { has: function () { return false; }, set: function () {} }
    : IS9WD_mailDoneKeys_(job.jobKey, ctx.testMode);
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
      IS9WD_mailSend_(entry.email, mail.subject, mail.blocks, IS9WD_mailMeta_(ctx, entry, job.kind), ctx);
      keys.set(entry.key);
      // The rows the message listed are stamped the moment it has gone, in test mode too.
      if (mail.rows && mail.rows.length) {
        try {
          IS9WD_itemsStampNotified_(mail.rows);
        } catch (err) {
          Logger.log('IS9WD: the notified stamps were not written for ' + entry.key + ': ' + err);
        }
      }
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
    var meta = IS9WD_mailMeta_(ctx, null, 'Sunday Brief');
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
      meta: IS9WD_mailMeta_(ctx, me, 'Weekly Deliverables'),
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
      meta: IS9WD_mailMeta_(ctx, de, 'Daily Digest'),
      count: digestList.length
    });
  } else {
    out.lines.push('', 'No digest would go out today: nothing is due tomorrow and nothing is overdue.');
  }
  var freshFor = null;
  for (i = 0; i < dir.length && !freshFor; i++) {
    var fr = IS9WD_freshItems_(IS9WD_activeItemsFor_(items, dir[i].committee));
    if (fr.length) freshFor = { entry: IS9WD_mailEntry_(dir[i]), fresh: fr };
  }
  if (freshFor) {
    out.previews.push({
      title: 'Same day notice, as ' + (freshFor.entry.fullName || freshFor.entry.committee) +
        ' would receive it for the rows nobody has told them about',
      to: ctx.testMode ? ctx.adminEmail : freshFor.entry.email,
      subject: IS9WD_mailSubject_(ctx, IS9WD_noticeSubject_(freshFor.entry, freshFor.fresh)),
      blocks: IS9WD_noticeBlocks_(ctx, freshFor.entry, freshFor.fresh, IS9WD_linkFor_(freshFor.entry.key)),
      meta: IS9WD_mailMeta_(ctx, freshFor.entry, 'New Assignment'),
      count: 1
    });
  } else {
    out.lines.push('', 'No same day notice would go out right now: every row has been announced.');
  }
  var bc = IS9WD_briefContext_(cfg, items);
  out.previews.push({
    title: 'Sunday brief, as you would receive it',
    to: ctx.adminEmail || '(blank admin address)',
    subject: IS9WD_mailSubject_(ctx, IS9WD_briefSubject_(bc)),
    blocks: IS9WD_briefBlocks_(bc),
    meta: IS9WD_mailMeta_(ctx, null, 'Sunday Brief'),
    count: 1
  });
  out.lines.push('', 'Nothing was sent. ' + out.previews.length + ' rendering(s) follow.');
  return out;
}
