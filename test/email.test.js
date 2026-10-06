/**
 * Node test for the four emails: the three pure body builders, the two renderers and the one
 * envelope, against the wording Ethan approves in the preflight dialog.
 *
 *   node test/email.test.js
 *
 * WHY THE BUILDERS ARE PURE. IS9WD_mondayBlocks_, IS9WD_digestBlocks_ and IS9WD_briefBlocks_
 * take a plain context object and reach no Apps Script global, which is what lets the wording
 * be asserted here instead of re-read in Gmail after every change. The envelope is tested with
 * a MailApp stub that records the one message it is handed.
 *
 * NO REAL NAME, NO REAL ADDRESS. Every fixture value is a placeholder that could not be mistaken
 * for a person, because this file is public.
 */

'use strict';

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['IS9WD_Core.js', 'IS9WD_Config.js', 'IS9WD_Emails.js'];

const sent = [];
const sandbox = {
  console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
  isNaN, parseInt, parseFloat,
  MailApp: { sendEmail: (msg) => { sent.push(msg); }, getRemainingDailyQuota: () => 1500 },
  Logger: { log: () => {} },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), sandbox, { filename: f });
}

const fn = (name) => {
  const f = sandbox[name];
  if (typeof f !== 'function') throw new Error('missing ' + name);
  return f;
};

let pass = 0;
let failed = 0;
// A vm realm has its own Array and Object prototypes, so deepStrictEqual refuses two
// structurally identical values that crossed the boundary; the JSON round trip is the
// structural compare, and it is strict about everything else.
function check(label, actual, expected) {
  try {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) assert.deepStrictEqual(actual, expected);
    pass++;
    console.log('  ok  ' + label);
  } catch (e) {
    failed++;
    console.log('  FAIL  ' + label);
    console.log('        expected ' + JSON.stringify(expected));
    console.log('        actual   ' + JSON.stringify(actual));
  }
}
const has = (text, needle) => text.indexOf(needle) !== -1;
const count = (text, needle) => text.split(needle).length - 1;
const d = (y, m, day) => new Date(y, m - 1, day);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE = 'https://pages.example.test/deliverables';
const LINK = BASE + '/#abcdefghjkmnpqrstvwxyz2345';

function cfgFixture(over) {
  const o = over || {};
  return {
    weeks: {
      weekNumber: 4, weekStart: d(2026, 9, 28), weekEnd: d(2026, 10, 4),
      effectiveToday: o.today || d(2026, 9, 27), inTerm: o.inTerm !== false,
      ayLabel: 'A.Y. 2026 - 2027', cutoffText: 'Saturday 8 PM before the week starts',
      todayOverrideSet: false, weekNumberOverrideSet: false,
    },
    switches: {
      testMode: o.testMode === true, adminEmail: o.adminEmail !== undefined ? o.adminEmail : 'ADMIN_ADDRESS',
      senderName: o.senderName !== undefined ? o.senderName : 'IS9 Tracker',
      replyTo: o.replyTo || '', mailNoReply: o.noReply === true,
      slotsPerPage: 15, maxParts: 1, quotaReserve: 100, retireDays: 14, tokenWarnDays: 120,
      automationOn: true, appBaseUrl: o.appBaseUrl !== undefined ? o.appBaseUrl : '',
    },
    signoff: o.signoffSet === false
      ? { current: { set: false }, derivedSet: false }
      : { current: { set: true, preparedName: 'Sample Secretary', preparedPosition: 'Secretary',
          checkedName: 'Sample President', checkedPosition: 'President' }, derivedSet: true },
  };
}

const entryOf = (over) => Object.assign({
  key: 'K01', committee: 'Partnerships', fullName: 'Sample Officer', position: 'Vice President',
  email: 'OFFICER_ADDRESS', publishes: true, revoked: false,
}, over || {});

const item = (id, title, deadline, over) => Object.assign({
  id, title, deadline, remark: '', status: 'Open', active: true, check: '', published: true, row: 10,
  committee: 'Partnerships',
}, over || {});

const ITEMS = [
  item('D-0001', 'Confirm speaker for Debt Traps Exposed', d(2026, 9, 25), { remark: 'Send final name to Publication' }),
  item('D-0002', 'Send Homecoming sponsorship deck', d(2026, 9, 28)),
  item('D-0004', 'Draft MOA for Homecoming venue partner', d(2026, 10, 1), { check: 'Missing deadline' }),
];

const ctxOf = (over) => fn('IS9WD_mailContext_')(cfgFixture(over));
const monday = (ctx, entry, items, link) => fn('IS9WD_mondayBlocks_')(ctx, entry, items, link === undefined ? LINK : link);
const text = (blocks, meta) => fn('IS9WD_mailText_')(blocks, meta || {});
const html = (blocks, meta) => fn('IS9WD_mailHtml_')(blocks, meta || { title: 'T' });

// ---------------------------------------------------------------------------
console.log('\n1. The context');
{
  const ctx = ctxOf();
  check('week number prints as two digits', ctx.weekNo, '04');
  check('week line is SPEC section 4, byte for byte',
    ctx.weekLine, 'WEEK 04  |  SEP 28 TO OCT 4  |  A.Y. 2026 - 2027');
  check('the long week prints the year once', ctx.weekLong, 'September 28 to October 4, 2026');
  check('the year prints twice across New Year',
    fn('IS9WD_mailWeekLong_')(d(2026, 12, 28), d(2027, 1, 3)), 'December 28, 2026 to January 3, 2027');
  check('sign-off read from the current row', [ctx.signoffSet, ctx.preparedName], [true, 'Sample Secretary']);
  check('unset sign-off', ctxOf({ signoffSet: false }).signoffSet, false);
  check('entry from the reader shape', fn('IS9WD_mailEntry_')({ key: 'k02', committee: 'Finance', fullName: 'A B' }).fullName, 'A B');
  check('entry from the recipients shape', fn('IS9WD_mailEntry_')({ key: 'K02', committee: 'Finance', name: 'C D' }).fullName, 'C D');
  check('no page address, no asset base', ctx.assetBase, '');
  check('the asset base is the page address without its trailing slash',
    ctxOf({ appBaseUrl: 'https://pages.example.test/deliverables/#' }).assetBase, 'https://pages.example.test/deliverables');
  check('a note in the address cell is not an asset base', ctxOf({ appBaseUrl: 'paste the address here' }).assetBase, '');
  check('the band rides on the meta from the asset base',
    fn('IS9WD_mailMeta_')(ctxOf({ appBaseUrl: 'https://pages.example.test/deliverables' }), null, 'Daily Digest').band,
    'https://pages.example.test/deliverables/mail/band.jpg');
  check('no asset base, no band', fn('IS9WD_mailMeta_')(ctx, null, 'Daily Digest').band, '');
}

// ---------------------------------------------------------------------------
console.log('\n2. The Monday email');
{
  const ctx = ctxOf();
  const entry = entryOf();
  const blocks = monday(ctx, entry, ITEMS);
  const meta = fn('IS9WD_mailMeta_')(ctx, entry);
  const body = text(blocks, meta);
  const subject = fn('IS9WD_mailSubject_')(ctx, fn('IS9WD_mondaySubject_')(ctx, entry));

  check('subject', subject, '[IS9] Week 04 deliverables: Partnerships');
  check('subject with test mode on',
    fn('IS9WD_mailSubject_')(ctxOf({ testMode: true }), fn('IS9WD_mondaySubject_')(ctx, entry)),
    '[IS9] [TEST MODE] Week 04 deliverables: Partnerships');
  check('the salute opens the letter', has(body, 'Greetings in St. La Salle!'), true);
  check('greeting is the full name as typed, as Dear', has(body, 'Dear Sample Officer,'), true);
  check('the position follows the name, in title case', has(body, 'Dear Sample Officer,\nVice President'), true);
  check('the closing signs as the Society', has(body, 'For a financially literate Lasallian community,'), true);
  check('greeting falls back to the committee', has(text(monday(ctx, entryOf({ fullName: '' }), ITEMS)), 'Dear Partnerships,'), true);
  check('title case keeps the small words small', fn('IS9WD_titleCase_')('EXECUTIVE VICE PRESIDENT FOR EXTERNALS'), 'Executive Vice President for Externals');
  check('title case keeps a short acronym', fn('IS9WD_titleCase_')('EVP FOR IT'), 'EVP for IT');
  check('title case capitalises after a hyphen', fn('IS9WD_titleCase_')('VICE-PRESIDENT FOR EXTERNALS'), 'Vice-President for Externals');
  check('a position typed in mixed case prints as typed', fn('IS9WD_titleCase_')(' Vice President for MOA '), 'Vice President for MOA');
  check('the week line is in the body', has(body, 'WEEK 04  |  SEP 28 TO OCT 4  |  A.Y. 2026 - 2027'), true);
  check('the count sentence', has(body, 'Here are your 3 deliverables for week 04, September 28 to October 4, 2026.'), true);
  check('a single item reads singular', has(text(monday(ctx, entry, [ITEMS[1]])), 'Here is your deliverable for week 04'), true);
  check('items are numbered in the order given', [has(body, '1. Confirm speaker'), has(body, '2. Send Homecoming'), has(body, '3. Draft MOA')], [true, true, true]);
  check('an item past effective today reads overdue with its long date', has(body, 'OVERDUE, was due Friday, September 25, 2026'), true);
  check('an item ahead reads due with its long date', has(body, 'Due Monday, September 28, 2026'), true);
  check('a remark renders with the middle dot and two spaces', has(body, '·  Send final name to Publication'), true);
  check('a Check flag other than Overdue is printed in words', has(body, 'Flag: Missing deadline'), true);
  check('the cutoff sentence', has(body, 'Changes for next week reach me by Saturday 8 PM before the week starts.'), true);
  check('exactly one link in the body', count(body, BASE), 1);
  check('the link sentence', has(body, 'This link is yours alone. Anyone who has it can tick your items, so please do not forward it.'), true);
  check('the sign-off prints when set', [has(body, 'Prepared by: Sample Secretary, Secretary'), has(body, 'Checked by: Sample President, President')], [true, true]);
  check('the sign-off is absent entirely when unset',
    has(text(monday(ctxOf({ signoffSet: false }), entry, ITEMS)), 'Prepared by'), false);
  check('no test line when test mode is off', has(body, 'TEST MODE'), false);
  check('the test line names the intended recipient',
    has(text(monday(ctxOf({ testMode: true }), entry, ITEMS)),
      'TEST MODE. This message was meant for Sample Officer, Partnerships. It came to you instead because test mode is on.'), true);

  const sixteen = [];
  for (let i = 1; i <= 16; i++) sixteen.push(item('D-00' + (i < 10 ? '0' + i : i), 'Item ' + i, d(2026, 9, 28), { published: i <= 15 }));
  const over = text(monday(ctx, entry, sixteen));
  check('the item past the page carries the carousel mark, once', count(over, 'Not on the carousel this week'), 1);
  check('and the note says how many did not fit', has(over, '1 of these does not fit on your carousel page, which holds 15.'), true);
  const office = text(monday(ctx, entryOf({ publishes: false, committee: 'Office of the President' }), sixteen.map((it) => Object.assign({}, it, { published: false }))));
  check('a non publishing office never carries the mark', count(office, 'Not on the carousel this week'), 0);
  check('and gets the tracked line instead', has(office, 'Your items are tracked here and in your own list.'), true);

  const revoked = text(monday(ctx, entryOf({ revoked: true }), ITEMS));
  check('a revoked link is not printed', count(revoked, BASE), 0);
  check('and the sentence says why', has(revoked, 'Your link has been revoked'), true);
  const noLink = text(monday(ctx, entry, ITEMS, 'No address yet: paste the officers page address into 01 | Configuration.'));
  check('a missing address prints the sentence IS9WD_linkFor_ returns', has(noLink, 'No address yet: paste the officers page address'), true);
  check('an item with no deadline says so', has(text(monday(ctx, entry, [item('D-0009', 'No date', '')])), 'Due No deadline yet'), true);
  check('an empty list says so', has(text(monday(ctx, entry, [])), 'Nothing on your list.'), true);
}

// ---------------------------------------------------------------------------
console.log('\n3. The digest');
{
  const ctx = ctxOf({ today: d(2026, 9, 30) });
  const entry = entryOf();
  const list = [
    item('D-0001', 'Oldest overdue', d(2026, 9, 20)),
    item('D-0002', 'Newer overdue', d(2026, 9, 29)),
    item('D-0003', 'Due today', d(2026, 9, 30)),
    item('D-0004', 'Due tomorrow', d(2026, 10, 1)),
    item('D-0005', 'Later', d(2026, 10, 3)),
    item('D-0006', 'No date', ''),
  ];
  const split = fn('IS9WD_digestSplit_')(ctx, fn('IS9WD_sortActive')(list));
  check('due tomorrow is deadline = today + 1', split.dueTomorrow.map((i) => i.id), ['D-0004']);
  check('overdue is deadline < today, oldest first', split.overdue.map((i) => i.id), ['D-0001', 'D-0002']);
  check('an item due today is in neither section, deliberately',
    [split.dueTomorrow.concat(split.overdue).some((i) => i.id === 'D-0003')], [false]);
  check('an item with no date is in neither', split.dueTomorrow.concat(split.overdue).some((i) => i.id === 'D-0006'), false);

  const both = fn('IS9WD_digestSubject_')(entry, split.dueTomorrow, split.overdue);
  check('both sections subject', both, 'Due tomorrow and overdue: Partnerships');
  check('due tomorrow only subject', fn('IS9WD_digestSubject_')(entry, split.dueTomorrow, []), 'Due tomorrow: Partnerships');
  check('overdue only subject', fn('IS9WD_digestSubject_')(entry, [], split.overdue), 'Overdue: Partnerships');

  const body = text(fn('IS9WD_digestBlocks_')(ctx, entry, split.dueTomorrow, split.overdue, LINK));
  check('both headings present', [has(body, 'DUE TOMORROW'), has(body, 'OVERDUE')], [true, true]);
  check('overdue block oldest first', body.indexOf('Oldest overdue') < body.indexOf('Newer overdue'), true);
  const one = text(fn('IS9WD_digestBlocks_')(ctx, entry, split.dueTomorrow, [], LINK));
  check('an empty section is left out rather than printed empty', has(one, '\nOVERDUE'), false);
  check('exactly one link', count(body, BASE), 1);
  check('the digest never mentions the carousel', has(body, 'carousel'), false);
  check('sign-off omits on the same rule',
    has(text(fn('IS9WD_digestBlocks_')(ctxOf({ signoffSet: false, today: d(2026, 9, 30) }), entry, split.dueTomorrow, [], LINK)), 'Prepared by'), false);
}

// ---------------------------------------------------------------------------
console.log('\n4. The Sunday brief');
{
  const bc = () => ({
    testMode: false, weekNo: '04', weekLong: 'September 28 to October 4, 2026',
    weekLine: 'WEEK 04  |  SEP 28 TO OCT 4  |  A.Y. 2026 - 2027', ayLabel: 'A.Y. 2026 - 2027',
    effectiveTodayLong: 'Sunday, September 27, 2026', todayOverride: '', weekNumberOverride: '',
    signoffSet: true, preparedName: 'Sample Secretary', preparedPosition: 'Secretary',
    checkedName: 'Sample President', checkedPosition: 'President',
    verdict: 'YES', gates: [
      { label: 'In term', holding: false, note: 'OK' },
      { label: 'Sign-off set for this week', holding: false, note: 'OK' },
      { label: 'Capacity check', holding: false, note: 'OK' },
      { label: 'Plan check', holding: false, note: 'OK' },
      { label: 'Flag list check', holding: false, note: 'OK' },
      { label: 'Feed errors', holding: false, note: 'OK' },
      { label: 'Blocking flags on publishing rows', holding: false, note: 'OK' },
    ],
    gateAgree: 'OK', statsErrors: '0',
    feed: { total: '12', flagged: '1', errors: '0', pages: '15', exportList: '1-15', master: '15', notPub: '0' },
    overdue: [], doneLastWeek: [], flags: [], officers: [
      { key: 'K10', committee: 'Office of the President', active: 2, overdue: 0, flagged: 0, notPublished: 0, email: 'X', revoked: false },
      { key: 'K01', committee: 'Partnerships', active: 3, overdue: 1, flagged: 1, notPublished: 0, email: '', revoked: true },
    ],
    overMax: [],
    machine: { automationOn: true, triggers: 1, lastRun: '2026-09-27 09:00', testMode: false, quotaLeft: 1480, quotaReserve: 100, lastSelfTest: 'PASS 66 of 66' },
    house: { usedRows: 40, capacity: 2000, noId: 0, retireWaiting: 2, retireDays: 14, noEmail: ['K01'], revoked: ['K01'], oldTokens: [], tokenWarnDays: 120 },
    workbookUrl: '',
  });
  const brief = (b) => text(fn('IS9WD_briefBlocks_')(b), { title: 'Sunday brief' });

  check('subject when ready', fn('IS9WD_briefSubject_')(bc()), 'Week 04 brief: ready for Canva');
  check('subject when not ready', fn('IS9WD_briefSubject_')(Object.assign(bc(), { verdict: 'NO' })), 'Week 04 brief: not ready for Canva');
  check('subject when the verdict cannot be read', fn('IS9WD_briefSubject_')(Object.assign(bc(), { verdict: '' })), 'Week 04 brief: readiness unknown');

  const clear = brief(bc());
  check('every gate clear', has(clear, 'Every gate is clear.'), true);
  check('the sign-off prints', has(clear, 'Prepared by Sample Secretary, Secretary. Checked by Sample President, President'), true);
  check('no override line when none is set', [has(clear, 'Today override'), has(clear, 'Week number override')], [false, false]);
  check('items not published prints even at 0', has(clear, 'Items not published: 0'), true);
  check('carousel pages, master pages and the export list print every week',
    [has(clear, 'Carousel pages: 15'), has(clear, 'Master pages required: 15'), has(clear, 'Export page list: 1-15')], [true, true, true]);
  check('nothing overdue says so', has(clear, 'Nothing is overdue.'), true);
  check('no flags says so', has(clear, 'No row carries a flag.'), true);
  check('by officer notes name the exceptions', has(clear, 'Partnerships  |  3  |  1 overdue, 1 flagged, no email, link revoked'), true);
  check('the machine line reads one trigger', has(clear, 'Automation: on, one hourly trigger'), true);
  check('housekeeping names the retire count', has(clear, 'Waiting to be retired: 2 accomplished items older than 14 days'), true);

  const holdBc = bc();
  holdBc.verdict = 'NO';
  holdBc.gates[1] = { label: 'Sign-off set for this week', holding: true, note: 'Set it in the app' };
  holdBc.gates[6] = { label: 'Blocking flags on publishing rows', holding: true, note: '2 rows' };
  holdBc.signoffSet = false;
  holdBc.todayOverride = 'Friday, October 2, 2026';
  holdBc.weekNumberOverride = '7';
  holdBc.overMax = [{ committee: 'Publications', published: 15, active: 18 }];
  holdBc.overdue = [{ id: 'D-0001', row: 10, committee: 'Partnerships', title: 'Late one', when: 'Friday, September 25, 2026' }];
  holdBc.flags = [
    { id: 'D-0007', row: 12, committee: 'Finance', title: 'Bad row', flag: 'Missing deadline', blocking: true },
    { id: 'D-0001', row: 10, committee: 'Partnerships', title: 'Late one', flag: 'Overdue', blocking: false },
  ];
  holdBc.machine.triggers = 0;
  const hold = brief(holdBc);
  check('names how many gates hold', has(hold, '2 of 7 gates holding.'), true);
  check('a holding gate carries its own sentence', has(hold, 'Sign-off set for this week: HOLD, Set it in the app'), true);
  check('a clear gate reads OK without a sentence', has(hold, 'In term: OK\n'), true);
  check('unset sign-off sentence', has(hold, 'Sign-off not set for this week'), true);
  check('overrides print when set', [has(hold, 'Today override: Friday, October 2, 2026'), has(hold, 'Week number override: 7')], [true, true]);
  check('an officer over the page prints both numbers',
    has(hold, 'Publications: 15 published, 18 due this week or overdue'), true);
  check('the overdue block lists the item', has(hold, 'D-0001  |  Partnerships  |  Late one  |  Friday, September 25, 2026'), true);
  check('a blocking flag says it blocks Canva', has(hold, 'Missing deadline (blocks Canva)'), true);
  check('no trigger is called out', has(hold, 'NO TRIGGER INSTALLED'), true);
}

// ---------------------------------------------------------------------------
console.log('\n5. The renderers');
{
  const blocks = [
    { k: 'p', text: 'A <b>title</b> & "quotes"' },
    { k: 'items', rows: [{ n: 1, id: 'D-1', title: '<script>', due: 'Monday, September 28, 2026', overdue: true, remark: 'x', flag: '', carousel: true }] },
    { k: 'kv', rows: [['Label', 'Value', true]] },
    { k: 'table', head: ['A', 'B'], rows: [['1', '2']] },
    { k: 'link', url: 'https://x.example.test/#tok', text: 'Open your list', note: 'n' },
    { k: 'h', text: 'Heading' },
    'A bare string is a paragraph',
  ];
  const t = text(blocks, { title: 'Partnerships', sub: 'SUB', foot: 'FOOT' });
  const h = html(blocks, { eyebrow: 'E', title: 'Partnerships', sub: 'SUB', foot: 'FOOT' });
  check('text opens with the uppercased title and the sub', t.indexOf('PARTNERSHIPS\nSUB\n'), 0);
  check('text ends with the foot and one newline', t.slice(-5), 'FOOT\n');
  check('text never has three newlines in a row', /\n{3}/.test(t), false);
  check('a bare string renders as a paragraph', has(t, 'A bare string is a paragraph'), true);
  check('html escapes a title', has(h, '&lt;script&gt;') && !has(h, '<script>'), true);
  check('html escapes an ampersand and quotes', has(h, 'A &lt;b&gt;title&lt;/b&gt; &amp; &quot;quotes&quot;'), true);
  check('html shows the overdue word in bold purple small caps', /color:#724485;">OVERDUE</.test(h), true);
  check('html without a band prints the text mark on the green', has(h, '>IS9</td>') && !has(h, '<img'), true);
  const hb = html(blocks, { eyebrow: 'E', title: 'Partnerships', sub: 'SUB', foot: 'FOOT', band: 'https://x.example.test/mail/band.jpg' });
  check('html with a band prints it once, with the title as its alt text',
    [count(hb, '<img src="https://x.example.test/mail/band.jpg"'), has(hb, 'alt="Partnerships"'), has(hb, '>IS9</td>')], [1, true, false]);
  check('the ribbon opens the body and the foot', count(h, 'background:#CFC0E0;font-size:1px'), 2);
  check('the band alt text is set in ivory, centred, so a client that hides images still shows the name',
    /<img [^>]*color:#FBF9F3;[^>]*text-align:center;[^>]*>/.test(hb), true);
  check('a running head holds its line by attribute as well as by style', has(h, '<td nowrap style='), true);
  const ht = html([
    { k: 'table', head: ['ID', 'Committee or office', 'Deliverable', 'Was due'], rows: [['D-1', 'R & D', 'x', 'Mon']] },
    { k: 'table', head: ['Committee or office', 'Active', 'Notes'], rows: [['R & D', '2', "a & b's"]] },
    { k: 'kv', rows: [['Prepared by', 'X'], ['Checked by', 'Y']], small: true },
  ], { title: 'T' });
  check('a brief table escapes each cell once', [count(ht, 'R &amp; D'), has(ht, '&amp;amp;'), has(ht, 'a &amp; b&#39;s')], [2, false, true]);
  check('the sign-off panel pads its first and last rows and keeps its corners',
    [has(ht, 'padding:14px 16px 4px'), has(ht, 'padding:4px 16px 14px'), has(ht, 'border-collapse:separate')], [true, true, true]);
  const many = [];
  for (let i = 0; i < 30; i++) many.push({ id: 'D-' + i, row: i + 2, committee: 'C', title: 'T' + i, when: 'Mon' });
  const capped = fn('IS9WD_briefItemTable_')(many);
  check('a brief list is cut at twenty five rows with a count of the rest', [capped.length, capped[25][2]], [26, 'and 5 more']);
  check('html paints no cream and no red or green that is not the palette',
    [has(h, '#e9ebd4'), /#(ff0000|00ff00|d32f2f|2e7d32)/i.test(h)], [false, false]);
  check('html uses only the letter palette', (h.match(/#[0-9a-fA-F]{6}\b/g) || []).every((x) =>
    ['#085040', '#5D4170', '#724485', '#8B74A1', '#CFC0E0', '#58756A', '#2A2D2B', '#5C6360', '#FBF9F3', '#F0ECE2', '#E7EFEB', '#DAD4C6', '#EDE8DC'].indexOf(x) !== -1), true);
  check('html carries the raw address twice, as the button and as the line under it', count(h, 'href="https://x.example.test/#tok"'), 2);
  check('the body alone has no html element', has(fn('IS9WD_mailHtmlBody_')(blocks, {}), '<html'), false);
  const EM = String.fromCharCode(8212);
  check('no em dash anywhere in either rendering', [has(t, EM), has(h, EM)], [false, false]);
}

// ---------------------------------------------------------------------------
console.log('\n6. The envelope');
{
  const send = fn('IS9WD_mailSend_');
  const blocks = [{ k: 'p', text: 'Body' }];
  sent.length = 0;
  send('OFFICER_ADDRESS', 'Subject', blocks, { title: 'T' }, ctxOf());
  check('live: goes to the officer', sent[0].to, 'OFFICER_ADDRESS');
  check('live: subject carries the prefix only', sent[0].subject, '[IS9] Subject');
  check('live: sender name from the setting', sent[0].name, 'IS9 Tracker');
  check('live: no reply-to and no no-reply when neither is set', ['replyTo' in sent[0], 'noReply' in sent[0]], [false, false]);
  check('live: both bodies present', [typeof sent[0].body, has(sent[0].htmlBody, '<!DOCTYPE html>')], ['string', true]);

  sent.length = 0;
  send('OFFICER_ADDRESS', 'Subject', blocks, { title: 'T' }, ctxOf({ testMode: true }));
  check('test mode: redirected to the admin address', sent[0].to, 'ADMIN_ADDRESS');
  check('test mode: subject carries the tag', sent[0].subject, '[IS9] [TEST MODE] Subject');

  sent.length = 0;
  send('X', 'S', blocks, {}, ctxOf({ noReply: true, replyTo: 'REPLY_ADDRESS' }));
  check('no reply wins over reply-to, never both', [sent[0].noReply, 'replyTo' in sent[0]], [true, false]);
  sent.length = 0;
  send('X', 'S', blocks, {}, ctxOf({ replyTo: 'REPLY_ADDRESS' }));
  check('reply-to alone is passed through', [sent[0].replyTo, 'noReply' in sent[0]], ['REPLY_ADDRESS', false]);
  sent.length = 0;
  send('X', 'S', blocks, {}, ctxOf({ senderName: '' }));
  check('a blank sender name is not passed', 'name' in sent[0], false);
  check('a blank address throws rather than sending', (() => { try { send('', 'S', blocks, {}, ctxOf()); return 'sent'; } catch (e) { return 'threw'; } })(), 'threw');
  check('test mode with a blank admin address throws rather than sending',
    (() => { try { send('X', 'S', blocks, {}, ctxOf({ testMode: true, adminEmail: '' })); return 'sent'; } catch (e) { return 'threw'; } })(), 'threw');

  const stop = fn('IS9WD_mailStopReason_');
  check('a switch that is off stops the job', has(stop({}, ctxOf(), false, 'Monday email'), 'switched off'), true);
  check('test mode with no admin address stops the job', has(stop({}, ctxOf({ testMode: true, adminEmail: '' }), true, 'x'), 'blank'), true);
  check('otherwise the job runs', stop({}, ctxOf(), true, 'x'), '');
}

// ---------------------------------------------------------------------------
console.log('\n7. The batch skeleton, end to end with the edges stubbed');
{
  // The impure edges. Utilities is what the Manila clock helpers in IS9WD_Config.js use.
  const pad = (n) => (n < 10 ? '0' : '') + n;
  sandbox.Utilities = { formatDate: (dt, tz, fmt) => {
    const y = dt.getFullYear(); const M = dt.getMonth() + 1; const D = dt.getDate();
    const H = dt.getHours(); const m = dt.getMinutes(); const sec = dt.getSeconds();
    if (fmt === 'yyyy-MM-dd') return y + '-' + pad(M) + '-' + pad(D);
    if (fmt === 'yyyy-MM-dd HH:mm') return y + '-' + pad(M) + '-' + pad(D) + ' ' + pad(H) + ':' + pad(m);
    return [y, M, D, H, m, sec].join(',');
  } };
  const props = {};
  sandbox.PropertiesService = { getDocumentProperties: () => ({
    getProperties: () => Object.assign({}, props),
    setProperty: (k, v) => { props[k] = v; },
    getProperty: (k) => (k in props ? props[k] : null),
    deleteProperty: (k) => { delete props[k]; },
  }) };
  const logged = [];
  const alerts = [];
  const stamped = [];
  sandbox.IS9WD_itemsStampNotified_ = (rows) => { rows.forEach((r) => stamped.push(r)); return rows.length; };
  const DIR = [
    { key: 'K10', committee: 'Office of the President', fullName: 'Sample President', position: 'President', email: 'PRESIDENT_ADDRESS', publishes: true, hierarchy: 1, revoked: false },
    { key: 'K01', committee: 'Partnerships', fullName: 'Sample Officer', position: 'Vice President', email: 'OFFICER_ADDRESS', publishes: true, hierarchy: 2, revoked: false },
    { key: 'K02', committee: 'Finance', fullName: 'Second Officer', position: 'Vice President', email: 'BAD_ADDRESS', publishes: true, hierarchy: 3, revoked: false },
    { key: 'K03', committee: 'Events', fullName: 'Third Officer', position: 'Vice President', email: '', publishes: true, hierarchy: 4, revoked: false },
  ];
  const ROWS = [
    item('D-0001', 'Partnerships item', d(2026, 9, 29), { committee: 'Partnerships' }),
    item('D-0002', 'Finance item', d(2026, 9, 25), { committee: 'Finance' }),
    item('D-0003', 'Events item', d(2026, 9, 30), { committee: 'Events' }),
  ];
  sandbox.IS9WD_readItems_ = () => ({ rows: ROWS, usedRows: ROWS.length, capacity: 2000, byId: {} });
  sandbox.IS9WD_activeItemsFor_ = (items, committee) => items.rows.filter((i) => i.committee === committee && i.active);
  sandbox.IS9WD_itemCounts_ = () => ({});
  sandbox.IS9WD_itemList_ = (items) => (items && items.rows ? items.rows : []);
  sandbox.IS9WD_linkFor_ = () => LINK;
  sandbox.IS9WD_logRow_ = (row) => { logged.push(row); return true; };
  sandbox.IS9WD_jobAlert_ = (job, err, extra) => { alerts.push({ job, message: err.message, extra }); return true; };
  const cfgOn = (over, sw) => {
    const c = cfgFixture(over);
    c.directory = { rows: DIR, inHierarchy: DIR, byKey: {} };
    Object.assign(c.switches, sw);
    return c;
  };
  const sendMonday = fn('IS9WD_sendMondayAssignments_');
  const sendDigest = fn('IS9WD_sendDailyDigest_');
  const sendBrief = fn('IS9WD_sendSundayBrief_');
  const reset = () => {
    sent.length = 0; logged.length = 0; alerts.length = 0;
    for (const k of Object.keys(props)) delete props[k];
    sandbox.MailApp.sendEmail = (msg) => { sent.push(msg); };
  };
  const last = (out) => out.lines[out.lines.length - 1];

  reset();
  let out = sendMonday({ cfg: cfgOn({}, { mailMonday: false }), source: 'Menu' });
  check('a switch that is off sends nothing and says so', [sent.length, has(out.lines[0], 'switched off')], [0, true]);

  reset();
  out = sendMonday({ cfg: cfgOn({ inTerm: false }, { mailMonday: true }), source: 'Menu' });
  check('outside the term nothing is sent', [sent.length, has(out.lines[0], 'Outside the term')], [0, true]);

  reset();
  out = sendMonday({ cfg: cfgOn({ testMode: true }, { mailMonday: true }), source: 'Menu' });
  check('test mode: one message per intended recipient, every one to the admin address',
    [sent.length, sent.every((m) => m.to === 'ADMIN_ADDRESS')], [3, true]);
  check('test mode: the blank address is still rehearsed', out.skipped.length, 0);
  check('test mode: every subject carries the tag', sent.every((m) => m.subject.indexOf('[IS9] [TEST MODE] ') === 0), true);
  check('test mode: each body names its intended recipient once',
    sent.map((m) => count(m.body, 'TEST MODE. This message was meant for')), [1, 1, 1]);
  check('test mode: no done key is written', Object.keys(props).length, 0);
  check('test mode: the last line says where it all went', has(last(out), 'test mode'), true);
  check('test mode: the President, with no item, gets nothing', sent.some((m) => has(m.body, 'meant for Sample President')), false);

  reset();
  sandbox.MailApp.sendEmail = (msg) => {
    if (msg.to === 'BAD_ADDRESS') throw new Error('Invalid email: BAD_ADDRESS');
    sent.push(msg);
  };
  out = sendMonday({ cfg: cfgOn({}, { mailMonday: true }), source: 'Trigger' });
  check('live: the good address is sent, the bad one fails, the blank one is skipped',
    [sent.map((m) => m.to), out.sent, out.skipped.length], [['OFFICER_ADDRESS'], 1, 2]);
  check('live: the failure mail goes out once and names the key',
    [alerts.length, alerts[0].job, alerts[0].extra[0].indexOf('K02: ') === 0], [1, 'MONDAY_ASSIGNMENTS', true]);
  check('live: the last line names the failure for the schedule row', has(last(out), 'FAILED for K02'), true);
  check('live: the done key is written only for the send that succeeded',
    Object.keys(props).filter((k) => k.indexOf('IS9WD_DONE_MONDAY_ASSIGNMENTS_') === 0).map((k) => k.slice(-3)), ['K01']);
  check('live: the blank address is logged as skipped', logged.some((r) => r.result === 'SKIPPED' && r.committee === 'Events'), true);
  // Four stamps on the fixture row: three from the test mode send above, which stamps too by
  // design, and one from the live send that reached the good address.
  check('the Monday sends stamped every row they listed, in test mode too', [stamped.length, stamped.every((r) => r === 10)], [4, true]);
  check('live: the failure is logged as a failure', logged.some((r) => r.ok === false && r.committee === 'Finance'), true);

  sandbox.MailApp.sendEmail = (msg) => { sent.push(msg); };
  sent.length = 0; alerts.length = 0;
  out = sendMonday({ cfg: cfgOn({}, { mailMonday: true }), source: 'Trigger' });
  check('a second live pass the same day sends only to whoever was missed', sent.map((m) => m.to), ['BAD_ADDRESS']);
  check('and the one already sent is reported as such', out.skipped.some((s) => s === 'K01 (already sent today)'), true);
  sent.length = 0;
  out = sendMonday({ cfg: cfgOn({}, { mailMonday: true }), source: 'Trigger' });
  check('a third pass sends nothing: two already sent, the blank address reported again', [sent.length, out.sent, has(last(out), '0 sent, 3 skipped')], [0, 0, true]);

  reset();
  out = sendDigest({ cfg: cfgOn({ today: d(2026, 9, 20) }, { mailDaily: true }), source: 'Menu' });
  check('digest on a quiet day sends nothing', [sent.length, has(out.lines[0], 'Nothing is due tomorrow')], [0, true]);

  reset();
  out = sendDigest({ cfg: cfgOn({ today: d(2026, 9, 28) }, { mailDaily: true }), source: 'Menu' });
  check('digest goes to exactly the people with something due tomorrow or overdue',
    sent.map((m) => m.to).sort(), ['BAD_ADDRESS', 'OFFICER_ADDRESS']);
  check('digest subjects name the section', sent.map((m) => m.subject).sort(),
    ['[IS9] Due tomorrow: Partnerships', '[IS9] Overdue: Finance']);

  reset();
  out = sendBrief({ cfg: cfgOn({}, { mailSunday: true }), source: 'Trigger' });
  check('the brief goes to the admin address', [sent.length, sent[0] && sent[0].to], [1, 'ADMIN_ADDRESS']);
  check('the brief subject when nothing in the workbook can be read', sent[0] && sent[0].subject, '[IS9] Week 04 brief: readiness unknown');
  check('the brief writes its done key under the admin key',
    Object.keys(props).some((k) => k.indexOf('IS9WD_DONE_SUNDAY_BRIEF_') === 0), true);
  sent.length = 0;
  out = sendBrief({ cfg: cfgOn({}, { mailSunday: true }), source: 'Trigger' });
  check('the brief does not go twice in a day', [sent.length, has(out.lines[0], 'already went out')], [0, true]);

  reset();
  out = sendBrief({ cfg: cfgOn({ adminEmail: '' }, { mailSunday: true }) });
  check('the brief with a blank admin address sends nothing and says so', [sent.length, has(out.lines[0], 'blank')], [0, true]);

  reset();
  out = sendBrief({ cfg: cfgOn({}, { mailSunday: false }) });
  check('the brief obeys its switch', [sent.length, has(out.lines[0], 'switched off')], [0, true]);

  reset();
  props['IS9WD_DONE_MONDAY_ASSIGNMENTS_' + sandbox.Utilities.formatDate(new Date(), '', 'yyyy-MM-dd')] = 'x';
  props['IS9WD_DONE_ARCHIVE_WEEK_' + sandbox.Utilities.formatDate(new Date(), '', 'yyyy-MM-dd')] = 'x';
  const cleared = fn('IS9WD_mailClearTodayKeys_')();
  check('turning test mode off clears the mail job keys for today and leaves the archive alone',
    [cleared, Object.keys(props)], [['MONDAY_ASSIGNMENTS'], ['IS9WD_DONE_ARCHIVE_WEEK_' + sandbox.Utilities.formatDate(new Date(), '', 'yyyy-MM-dd')]]);
}

// ---------------------------------------------------------------------------
console.log('\n8. The same day notice');
{
  const fresh = fn('IS9WD_freshItems_');
  const rows2 = [
    item('D-0101', 'Told already', d(2026, 10, 1), { committee: 'Partnerships', row: 20, notifiedAt: d(2026, 9, 28) }),
    item('D-0102', 'New one', d(2026, 10, 2), { committee: 'Partnerships', row: 21 }),
    item('D-0103', 'New two', d(2026, 9, 30), { committee: 'Partnerships', row: 22 }),
    item('', 'No ID yet', d(2026, 10, 3), { committee: 'Partnerships', row: 23 }),
    item('D-0104', 'Done one', d(2026, 9, 29), { committee: 'Partnerships', row: 24, active: false }),
    item('D-0105', 'Finance told', d(2026, 10, 1), { committee: 'Finance', row: 30, notifiedAt: d(2026, 9, 28) }),
    item('D-0106', 'Events new', d(2026, 10, 1), { committee: 'Events', row: 40 }),
  ];
  const mine = rows2.filter((i) => i.committee === 'Partnerships' && i.active);
  check('fresh means active, titled, with an ID and never announced', fresh(mine).map((i) => i.id), ['D-0102', 'D-0103']);
  check('subject singular and plural', [fn('IS9WD_noticeSubject_')(entryOf(), [rows2[1]]), fn('IS9WD_noticeSubject_')(entryOf(), fresh(mine))],
    ['New on your list: Partnerships', '2 new on your list: Partnerships']);
  const ctx = ctxOf();
  const body = text(fn('IS9WD_noticeBlocks_')(ctx, entryOf(), fresh(mine), LINK));
  check('the notice says how many were added', has(body, '2 deliverables were added to your list.'), true);
  check('one item reads singular', has(text(fn('IS9WD_noticeBlocks_')(ctx, entryOf(), [rows2[1]], LINK)), 'One deliverable was added to your list.'), true);
  check('the notice lists only the fresh rows', [has(body, 'New one'), has(body, 'New two'), has(body, 'Told already'), has(body, 'No ID yet')], [true, true, false, false]);
  check('the notice carries one link and no sign-off', [count(body, BASE), has(body, 'Prepared by')], [1, false]);

  // The batch, with the edges from section 7 still stubbed.
  const stampedHere = [];
  sandbox.IS9WD_itemsStampNotified_ = (rows) => { rows.forEach((r) => stampedHere.push(r)); return rows.length; };
  sandbox.IS9WD_readItems_ = () => ({ rows: rows2, usedRows: rows2.length, capacity: 2000, byId: {} });
  sandbox.MailApp.sendEmail = (msg) => { sent.push(msg); };
  sent.length = 0;
  const DIR2 = [
    { key: 'K01', committee: 'Partnerships', fullName: 'Sample Officer', position: 'Vice President', email: 'OFFICER_ADDRESS', publishes: true, hierarchy: 2, revoked: false },
    { key: 'K02', committee: 'Finance', fullName: 'Second Officer', position: 'Vice President', email: 'SECOND_ADDRESS', publishes: true, hierarchy: 3, revoked: false },
    { key: 'K03', committee: 'Events', fullName: 'Third Officer', position: 'Vice President', email: '', publishes: true, hierarchy: 4, revoked: false },
  ];
  const cfg2 = cfgFixture({}); cfg2.directory = { rows: DIR2, inHierarchy: DIR2, byKey: {} }; cfg2.switches.mailMonday = true;
  let out = fn('IS9WD_sendNewAssignments_')({ cfg: cfg2, source: 'Trigger' });
  check('live: only the officer with unannounced rows is sent, the blank address is skipped',
    [sent.map((m) => m.to), out.sent, out.skipped.length], [['OFFICER_ADDRESS'], 1, 1]);
  check('live: the subject counts the fresh rows', sent[0].subject, '[IS9] 2 new on your list: Partnerships');
  check('live: exactly the fresh rows were stamped', stampedHere.slice().sort(), [21, 22]);
  check('live: no done key is written for a notice', Object.keys(sandbox.PropertiesService.getDocumentProperties().getProperties()).filter((k) => k.indexOf('NEW_ASSIGNMENTS') !== -1).length, 0);


  sent.length = 0; stampedHere.length = 0;
  out = fn('IS9WD_sendNewAssignments_')({ cfg: cfg2, source: 'App', only: 'Finance' });
  check('narrowed to one office with nothing fresh, nothing is sent', [sent.length, has(out.lines[0], 'Nothing new to announce')], [0, true]);
  out = fn('IS9WD_sendNewAssignments_')({ cfg: cfg2, source: 'App', only: 'partnerships' });
  check('narrowed to one office, case blind, only that officer is sent', [sent.map((m) => m.to), stampedHere.slice().sort()], [['OFFICER_ADDRESS'], [21, 22]]);

  rows2[1].notifiedAt = d(2026, 9, 29); rows2[2].notifiedAt = d(2026, 9, 29); rows2[6].notifiedAt = d(2026, 9, 29);
  sent.length = 0;
  out = fn('IS9WD_sendNewAssignments_')({ cfg: cfg2, source: 'Trigger' });
  check('once stamped, nothing is announced again', [sent.length, has(out.lines[0], 'Nothing new to announce')], [0, true]);

  const off = cfgFixture({}); off.directory = cfg2.directory; off.switches.mailMonday = false;
  out = fn('IS9WD_sendNewAssignments_')({ cfg: off, source: 'Menu' });
  check('the notice obeys the Monday email switch', has(out.lines[0], 'switched off'), true);
}


console.log('\n' + pass + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
