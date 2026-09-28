/**
 * Node test for the endpoint's decision layer: IS9WD_routeDecision_ and the two envelopes.
 * No npm dependencies, no Google, nothing mocked but the clock helpers.
 *
 *   node test/api.test.js
 *
 * WHY THIS FILE MATTERS MORE THAN ITS SIZE SUGGESTS. IS9WD_routeDecision_ is where SPEC's
 * one security sentence lives: "No request does anything before its token is validated." That
 * is a claim about ORDER, and order is exactly what a reviewer cannot verify by reading, so it
 * is asserted here instead: every refusal case checks not only the code returned but that the
 * plan never reached `act`, and the happy cases check the steps ran in the stated sequence.
 *
 * Until 2026-09-28 this function had no test at all, on a project whose endpoint is public and
 * anonymous and whose only gate it is.
 */

'use strict';

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const CORE = path.join(ROOT, 'src', 'IS9WD_Core.js');

const sandbox = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
  isNaN, parseInt, parseFloat };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(CORE, 'utf8'), sandbox);

const fn = (name) => {
  const f = sandbox[name];
  if (typeof f !== 'function') throw new Error('missing ' + name);
  return f;
};

let pass = 0;
let failed = 0;
// A vm realm has its own Object and Array prototypes, so deepStrictEqual refuses two
// structurally identical values that crossed the boundary. core.test.js hit this first; the
// compare is structural for that reason and strict about everything else.
function sameShape(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const aArr = Array.isArray(a) || Object.prototype.toString.call(a) === '[object Array]';
  const bArr = Array.isArray(b) || Object.prototype.toString.call(b) === '[object Array]';
  if (aArr !== bArr) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!sameShape(a[k], b[k])) return false;
  }
  return true;
}

function check(label, actual, expected) {
  try {
    if (!sameShape(actual, expected)) assert.deepStrictEqual(actual, expected);
    pass++;
    console.log('  ok  ' + label);
  } catch (e) {
    failed++;
    console.log('  FAIL  ' + label);
    console.log('        expected ' + JSON.stringify(expected));
    console.log('        actual   ' + JSON.stringify(actual));
  }
}

const route = fn('IS9WD_routeDecision_');
const envelopeOk = fn('IS9WD_envelopeOk');
const envelopeErr = fn('IS9WD_envelopeErr');

// --- fixtures --------------------------------------------------------------

// Real shapes, from the token alphabet: 32 symbols with no i, l, o or u, 26 characters.
const MEMBER_TOKEN = 'k3m8q2v7rzp4wx9hn6tdyj5c1b';
const ADMIN_TOKEN = 'z9y8x7w6v5t4s3r2q1p0nmkjhg';
const REVOKED_TOKEN = 'h2g3f4d5s6a7z8x9c0v1b2n3m4';
const RID = '0123456789abcdef0123456789abcdef';

const DIRECTORY = [
  { key: 'K01', committee: 'Partnerships', name: 'Juan Dela Cruz', position: 'VICE PRESIDENT',
    publishes: true, carouselOrder: 6, revoked: false },
  { key: 'K02', committee: 'Publications', name: 'Maria Santos', position: 'VICE PRESIDENT',
    publishes: true, carouselOrder: 7, revoked: false },
  { key: 'K03', committee: 'Marketing and Advocacy', name: 'Jose Rizal',
    position: 'VICE PRESIDENT', publishes: true, carouselOrder: 8, revoked: true },
];
const TOKENS = {
  IS9WD_TOKEN_ADMIN: ADMIN_TOKEN,
  IS9WD_TOKEN_K01: MEMBER_TOKEN,
  IS9WD_TOKEN_K03: REVOKED_TOKEN,
};

const BASE = {
  directory: DIRECTORY, tokens: TOKENS, appOn: true, inTerm: true,
  rateLimited: false, dedupeHit: false, lockAcquired: true, itemCommittee: '',
};
const ctx = (extra) => Object.assign({}, BASE, extra || {});
const req = (extra) => Object.assign({ v: 1, token: MEMBER_TOKEN, payload: {} }, extra || {});

// A refusal must never have reached the action. That is the whole point of the ordering.
function refused(label, request, context, code, stoppedAt) {
  const plan = route(request, context);
  check(label + ': code', plan.error ? plan.error.code : null, code);
  check(label + ': stopped at ' + stoppedAt, plan.stopped, stoppedAt);
  check(label + ': never acted', plan.act, false);
  check(label + ': never held the lock', plan.needsLock, false);
}

// --- 1. shape --------------------------------------------------------------

console.log('\n1. Shape, before any token is looked at (7.5)');
{
  refused('a missing version', req({ action: 'state', v: undefined }), ctx(),
    'VALIDATION', 'shape');
  refused('a future version', req({ action: 'state', v: 2 }), ctx(), 'VALIDATION', 'shape');
  refused('an unknown action', req({ action: 'dropTable' }), ctx(), 'VALIDATION', 'shape');
  refused('a body past the limit', req({ action: 'state' }), ctx({ bodyBytes: 99999 }),
    'VALIDATION', 'shape');
  refused('a write with no request id', req({ action: 'setStatus' }), ctx(),
    'VALIDATION', 'shape');
  refused('a write with a short request id',
    req({ action: 'setStatus', requestId: 'abc' }), ctx(), 'VALIDATION', 'shape');
  refused('a read with a malformed request id',
    req({ action: 'state', requestId: 'not-hex' }), ctx(), 'VALIDATION', 'shape');

  // The version is compared numerically, so the string "1" is version 1.
  check('the string "1" is version 1',
    route(req({ action: 'state', v: '1' }), ctx()).ok, true);

  // A PROTOTYPE PROPERTY IS NOT AN ACTION. Without hasOwnProperty, "constructor" and
  // "__proto__" would both find something on the actions object and route as real actions.
  refused('constructor is not an action', req({ action: 'constructor' }), ctx(),
    'VALIDATION', 'shape');
  refused('__proto__ is not an action', req({ action: '__proto__' }), ctx(),
    'VALIDATION', 'shape');
  refused('toString is not an action', req({ action: 'toString' }), ctx(),
    'VALIDATION', 'shape');
}

// --- 2. ping ---------------------------------------------------------------

console.log('\n2. ping answers ahead of the token and ahead of the app switch');
{
  const plan = route({ v: 1, action: 'ping', payload: {} }, ctx({ appOn: false }));
  check('ping needs no token', plan.ok, true);
  check('ping acts', plan.act, true);
  check('ping is not a write', plan.write, false);
  check('ping takes no lock', plan.needsLock, false);
  check('ping answers even with the app switched off', plan.error, null);
}

// --- 3. the token ----------------------------------------------------------

console.log('\n3. The token, and nothing read before its format is right');
{
  refused('an empty token', req({ action: 'state', token: '' }), ctx(),
    'BAD_TOKEN', 'tokenFormat');
  refused('a short token', req({ action: 'state', token: 'abc' }), ctx(),
    'BAD_TOKEN', 'tokenFormat');
  // i, l, o and u are not in the alphabet, so a token carrying one cannot be ours.
  refused('a token using a letter the alphabet excludes',
    req({ action: 'state', token: 'iiiiiiiiiiiiiiiiiiiiiiiiii' }), ctx(),
    'BAD_TOKEN', 'tokenFormat');
  refused('a well formed token nobody holds',
    req({ action: 'state', token: 'a2b3c4d5e6f7g8h9j2k3m4n5p6' }), ctx(),
    'BAD_TOKEN', 'resolveToken');
  refused('a revoked link', req({ action: 'state', token: REVOKED_TOKEN }), ctx(),
    'REVOKED', 'resolveToken');

  const plan = route(req({ action: 'state' }), ctx());
  check('a member link resolves to its own committee', plan.committee, 'Partnerships');
  check('and to the member role', plan.role, 'member');
  check('and carries the directory key', plan.key, 'K01');

  const admin = route(req({ action: 'state', token: ADMIN_TOKEN }), ctx());
  check('the admin link resolves to the admin role', admin.role, 'admin');
  check('and to no committee', admin.committee, '');
}

// --- 4. the gates ----------------------------------------------------------

console.log('\n4. Rate limit, the app switch, role and the term calendar');
{
  refused('a link over its budget', req({ action: 'state' }), ctx({ rateLimited: true }),
    'RATE_LIMITED', 'rateLimit');
  refused('every action when the app is switched off', req({ action: 'state' }),
    ctx({ appOn: false }), 'APP_OFF', 'appOn');

  // A member link holds ONE action. The other five are Ethan's.
  for (const action of ['addItem', 'editItem', 'deleteItem', 'rotateToken', 'setSignoff']) {
    refused('a member calling ' + action, req({ action, requestId: RID }), ctx(),
      'NOT_ALLOWED', 'role');
  }
  check('a member may setStatus',
    route(req({ action: 'setStatus', requestId: RID }), ctx()).ok, true);
  check('an admin may addItem',
    route(req({ action: 'addItem', token: ADMIN_TOKEN, requestId: RID }), ctx()).ok, true);

  // Between trimesters the tracker still SHOWS, it just does not accept.
  refused('a write between trimesters', req({ action: 'setStatus', requestId: RID }),
    ctx({ inTerm: false }), 'OUT_OF_TERM', 'term');
  check('a read still answers between trimesters',
    route(req({ action: 'state' }), ctx({ inTerm: false })).ok, true);
}

// --- 5. ownership ----------------------------------------------------------

console.log('\n5. Ownership, and why it answers NOT_FOUND (7.5)');
{
  const plan = route(req({ action: 'setStatus', requestId: RID }),
    ctx({ itemCommittee: 'Publications' }));
  // NOT_FOUND rather than NOT_ALLOWED, deliberately: NOT_ALLOWED would confirm the id
  // exists, letting a member link map the whole id space one request at a time.
  check('another committee is NOT_FOUND, not NOT_ALLOWED',
    plan.error.code, 'NOT_FOUND');
  check('and it never acted', plan.act, false);
  check('its own item passes ownership',
    route(req({ action: 'setStatus', requestId: RID }),
      ctx({ itemCommittee: 'Partnerships' })).ok, true);
  check('the committee match ignores case',
    route(req({ action: 'setStatus', requestId: RID }),
      ctx({ itemCommittee: 'PARTNERSHIPS' })).ok, true);
  check('the admin reaches every committee',
    route(req({ action: 'setStatus', token: ADMIN_TOKEN, requestId: RID }),
      ctx({ itemCommittee: 'Publications' })).ok, true);
}

// --- 6. replay and the lock ------------------------------------------------

console.log('\n6. A replay writes nothing, and a refused lock is not an error to retry blind');
{
  const cached = { v: 1, ok: true, action: 'setStatus' };
  const plan = route(req({ action: 'setStatus', requestId: RID }),
    ctx({ dedupeHit: true, cachedEnvelope: cached }));
  check('a replay is ok', plan.ok, true);
  check('a replay is marked as one', plan.replay, true);
  check('a replay returns the caller own envelope', plan.cached, cached);
  check('a replay never acts', plan.act, false);
  check('a replay never takes the lock', plan.needsLock, false);

  refused('a write that could not take the lock',
    req({ action: 'setStatus', requestId: RID }), ctx({ lockAcquired: false }),
    'LOCKED', 'lock');
}

// --- 7. the order itself ---------------------------------------------------

console.log('\n7. The order of the steps, which is the security claim (SPEC 3)');
{
  check('a member write runs the steps in the stated order',
    route(req({ action: 'setStatus', requestId: RID }), ctx()).steps,
    ['shape', 'tokenFormat', 'rateLimit', 'resolveToken', 'appOn', 'role', 'term',
      'dedupe', 'lock', 'act', 'log']);
  check('a read stops short of the lock',
    route(req({ action: 'state' }), ctx()).steps,
    ['shape', 'tokenFormat', 'rateLimit', 'resolveToken', 'appOn', 'role', 'term',
      'dedupe', 'act', 'log']);
  check('ping touches nothing but shape', route({ v: 1, action: 'ping' }, ctx()).steps,
    ['shape', 'act', 'log']);

  // The claim in one assertion: a bad token never reaches a step that reads the workbook.
  const bad = route(req({ action: 'setStatus', token: 'nope', requestId: RID }), ctx());
  check('a malformed token never reaches resolveToken',
    bad.steps.indexOf('resolveToken'), -1);
  check('and never reaches the lock', bad.steps.indexOf('lock'), -1);
}

// --- 8. the envelopes ------------------------------------------------------

console.log('\n8. The two envelopes, and the fields they may never carry');
{
  const ok = envelopeOk('state', { role: 'member' }, '2026-09-28T19:04:11+08:00');
  check('an ok envelope', ok, {
    v: 1, ok: true, action: 'state', serverTime: '2026-09-28T19:04:11+08:00',
    data: { role: 'member' },
  });
  check('an ok envelope carries no error key',
    Object.prototype.hasOwnProperty.call(ok, 'error'), false);

  const err = envelopeErr('setStatus', 'NOT_FOUND', 'No item with that id.',
    '2026-09-28T19:04:11+08:00');
  check('an error envelope', err, {
    v: 1, ok: false, action: 'setStatus', serverTime: '2026-09-28T19:04:11+08:00',
    error: { code: 'NOT_FOUND', message: 'No item with that id.' },
  });
  check('an error envelope carries no data key',
    Object.prototype.hasOwnProperty.call(err, 'data'), false);
}

// ---------------------------------------------------------------------------
console.log('\n9. The sign-off endpoint, end to end with the edges stubbed (3)');
{
  // A second realm holding the endpoint itself. Everything it touches outside the decision
  // is a stub that records what it was handed.
  const box = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
    isNaN, parseInt, parseFloat, Logger: { log: () => {} } };
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(CORE, 'utf8'), box);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'IS9WD_Config.js'), 'utf8'), box);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'IS9WD_Api.js'), 'utf8'), box);
  const written = [];
  const logged = [];
  box.IS9WD_signoffWrite_ = (p) => { written.push(p); return 60; };
  box.IS9WD_readItems_ = () => ({ rows: [], byId: {} });
  box.IS9WD_logRow_ = (r) => { logged.push(r); return true; };
  box.IS9WD_apiState_ = () => ({ role: 'admin', items: [] });
  box.IS9WD_apiActor_ = () => 'Admin link';
  box.Utilities = { formatDate: () => '2026-09-28T00:00:00+08:00' };
  box.IS9WD_LOG_SOURCE_APP_ = 'App';
  const plan = { role: 'admin', action: 'setSignoff', key: 'ADMIN', committee: '' };
  const good = { weekStart: '2026-09-28', preparedName: 'Sample President', preparedPosition: 'President',
    checkedName: 'Sample Officer', checkedPosition: 'Vice President' };

  const okEnv = box.IS9WD_apiSetSignoff_(plan, { payload: good });
  check('a valid sign-off is accepted', [okEnv.ok, written.length, logged.length], [true, 1, 1]);
  check('the writer got the payload as sent', written[0] && written[0].checkedName, 'Sample Officer');

  const bad = box.IS9WD_apiSetSignoff_(plan, { payload: Object.assign({}, good, { checkedName: '' }) });
  check('a blank name is refused with its own sentence',
    [bad.ok, bad.error.code, bad.error.message], [false, 'VALIDATION', 'Checked by name is required.']);
  const tue = box.IS9WD_apiSetSignoff_(plan, { payload: Object.assign({}, good, { weekStart: '2026-09-29' }) });
  check('a week start that is not a Monday is refused', [tue.ok, tue.error.message], [false, 'Week start must be a Monday.']);
  check('nothing was written for the refused ones', written.length, 1);
}

// ---------------------------------------------------------------------------
console.log('\n10. Adding a deliverable from the page, end to end with the edges stubbed');
{
  const box = { console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
    isNaN, parseInt, parseFloat, Logger: { log: () => {} } };
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(CORE, 'utf8'), box);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'IS9WD_Config.js'), 'utf8'), box);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'IS9WD_Api.js'), 'utf8'), box);
  const written = [];
  const logged = [];
  const notices = [];
  const DIR = [{ key: 'K01', committee: 'Partnerships', fullName: 'Sample Officer', position: 'Vice President', email: 'X', publishes: true, hierarchy: 2 }];
  box.IS9WD_readConfig_ = () => ({
    directory: { rows: DIR, byKey: { K01: DIR[0] }, inHierarchy: DIR },
    statuses: { rows: [{ name: 'Open', terminal: false }, { name: 'Accomplished', terminal: true }], defaultStatus: 'Open' },
  });
  box.IS9WD_readItems_ = () => ({ rows: [], byId: {}, nextFreeRow: 12, usedRows: 0, capacity: 2000 });
  box.IS9WD_nextItemId_ = () => 'D-0042';
  box.IS9WD_itemColIndex_ = (header) => (header === 'ID' ? 1 : 1);
  box.IS9WD_itemObject_ = (line, row) => ({ row, id: line[0], committee: line[1], title: line[2], deadline: line[3],
    remark: line[4], status: line[5], statusAt: line[6], statusBy: line[7], createdAt: line[8], check: '', active: true });
  box.IS9WD_sheet_ = () => ({ getRange: (r, c, h, w) => ({ setValues: (v) => { written.push({ r, c, h, w, v: v[0] }); }, clearContent: () => {} }) });
  box.SpreadsheetApp = { flush: () => {} };
  box.IS9WD_itemsCacheReset_ = () => {};
  box.IS9WD_nowManila_ = () => new Date(2026, 8, 29, 10, 0, 0);
  box.IS9WD_logRow_ = (r) => { logged.push(r); return true; };
  box.IS9WD_apiActor_ = () => 'Admin link';
  box.IS9WD_apiState_ = () => ({ role: 'admin', items: [] });
  box.IS9WD_sendNewAssignments_ = (o) => { notices.push(o); return { sent: 1, lines: ['New assignment notices: 1 sent.'] }; };
  box.IS9WD_LOG_SOURCE_APP_ = 'App';
  box.Utilities = { formatDate: () => '2026-09-29T10:00:00+08:00' };
  const plan = { role: 'admin', action: 'addItem', key: 'ADMIN', committee: '' };

  const ok = box.IS9WD_apiAddItem_(plan, { payload: { committee: 'Partnerships', title: 'Call the venue', deadline: '2026-10-02', remark: 'Before noon' } });
  check('a valid deliverable is accepted', [ok.ok, written.length, logged.length], [true, 1, 1]);
  check('it is written on the next free row from column A, nine cells', [written[0].r, written[0].c, written[0].w], [12, 1, 9]);
  check('the row holds the id, the office as the directory spells it, the title, a real date, the remark, the default status and a created stamp',
    [written[0].v[0], written[0].v[1], written[0].v[2], written[0].v[3] instanceof Date, written[0].v[4], written[0].v[5], written[0].v[6], written[0].v[7], written[0].v[8] instanceof Date],
    ['D-0042', 'Partnerships', 'Call the venue', true, 'Before noon', 'Open', '', '', true]);
  check('the officer is emailed at once, that office only', [notices.length, notices[0].only, notices[0].source], [1, 'Partnerships', 'App']);
  check('the answer says so', [ok.data.lastAdd.id, ok.data.lastAdd.notified], ['D-0042', 1]);
  check('the notice and the state were built from the copy in hand, the new row included, with no second read',
    [notices[0].items && notices[0].items.rows.length, notices[0].items && notices[0].items.rows[0].id, notices[0].items && notices[0].items.rows[0].active], [1, 'D-0042', true]);

  const bad = box.IS9WD_apiAddItem_(plan, { payload: { committee: 'Nobody', title: 'x', deadline: '2026-10-02' } });
  check('an unknown office is refused with its own sentence', [bad.ok, bad.error.message], [false, 'Committee is not in the directory.']);
  const noDate = box.IS9WD_apiAddItem_(plan, { payload: { committee: 'Partnerships', title: 'x', deadline: '' } });
  check('a missing deadline is refused', [noDate.ok, noDate.error.message], [false, 'Deadline is required.']);
  check('nothing was written for the refused ones', written.length, 1);

  box.IS9WD_readItems_ = () => ({ rows: [], nextFreeRow: 2005, usedRows: 2000, capacity: 2000 });
  const full = box.IS9WD_apiAddItem_(plan, { payload: { committee: 'Partnerships', title: 'x', deadline: '2026-10-02' } });
  check('a full tab is refused in words', [full.ok, full.error.code], [false, 'SERVER_ERROR']);
}


console.log('\n' + pass + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
