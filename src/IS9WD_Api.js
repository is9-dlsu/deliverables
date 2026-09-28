/**
 * IS9WD_Api.js - the public JSON endpoint. Phase 4.
 *
 * THIS IS THE ONLY PART OF THE SISTEMA A STRANGER CAN REACH. The web app is deployed
 * ANYONE_ANONYMOUS, so every request arrives unauthenticated and is hostile until its token
 * is proven. Nothing here touches the spreadsheet before that proof (7.5).
 *
 * THE TRANSPORT IS NOT A PREFERENCE, IT IS A MEASUREMENT taken on 2026-09-27: a cross origin
 * POST to an Apps Script web app works ONLY with Content-Type text/plain. An application/json
 * content type fails, and so does ANY custom header, because both provoke a CORS preflight and
 * a web app has no doOptions to answer it. So the token travels in the BODY. It may never move
 * to a header, and it may never move to the query string either, because a URL lands in server
 * logs, browser history and anything the officer pastes into a chat.
 *
 * THE BRAIN IS IN IS9WD_Core.js, NOT HERE. IS9WD_routeDecision_ decides what a request is
 * allowed to do, in order, and it is pure: no Sheet, no cache, no clock, so the Node suite
 * exercises every refusal path without Google. This file is the runtime around it. It gathers
 * a context, hands it over, and carries out whatever the plan permits. Keeping the decision
 * pure is what makes "no request does anything before its token is validated" testable rather
 * than merely intended.
 *
 * EVERY RESPONSE IS HTTP 200 and one of two envelopes. A cross origin fetch cannot read the
 * body of some error statuses, so a 403 would reach the officer as "failed to fetch" with no
 * reason. An error is carried IN the body instead.
 */

'use strict';

// The whole request, before parsing, measured in characters. The reference writes 8192 bytes
// and prescribes `contents.length`, which counts UTF-16 code units; the two differ only for a
// body that is already far past anything this app sends. Measured before JSON.parse, because
// the point of the guard is to avoid the work.
var IS9WD_API_MAX_BODY_ = 8192;

// Windows in seconds. The read and write budgets are Ethan's to change on `_Engine`; these
// are the fallbacks used when the workbook cannot be read, which is the case a public
// endpoint must survive rather than crash in.
var IS9WD_API_RATE_WINDOW_ = 60;
var IS9WD_API_BAD_WINDOW_ = 600;
var IS9WD_API_PING_LIMIT_ = 120;
var IS9WD_API_FALLBACK_READS_ = 60;
var IS9WD_API_FALLBACK_WRITES_ = 20;
var IS9WD_API_FALLBACK_BAD_ = 60;
var IS9WD_API_FALLBACK_LOCK_ = 20;

// The replay ring in Document Properties, behind the cache. A cache entry can vanish at any
// time; a retry after that must still not tick an item twice.
var IS9WD_API_REPLAY_KEEP_ = 60;

// ============================================================================
//  ENTRY POINTS  (the only three globals in this file without a trailing underscore)
// ============================================================================

function doPost(e) {
  var body = '';
  try {
    body = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : '';
  } catch (err) {
    body = '';
  }
  return IS9WD_apiOut_(IS9WD_apiHandle_(body));
}

/**
 * GET answers ping and nothing else, and it ignores every query parameter including a token.
 * A token in a URL is a token in a server log and in browser history, so one arriving here is
 * not resolved, not compared and not logged: it is simply not read.
 *
 * It exists for one reason: opening /exec?action=ping in a signed out browser is the only
 * real proof that the deployment is ANYONE_ANONYMOUS. The manifest records the intent; only
 * this confirms it.
 */
function doGet(e) {
  var action = '';
  try {
    action = (e && e.parameter) ? IS9WD_trim_(e.parameter.action) : '';
  } catch (err) {
    action = '';
  }
  if (action !== 'ping') {
    return IS9WD_apiOut_(IS9WD_envelopeErr_('ping', 'VALIDATION',
      'Only ping is available on this address.'));
  }
  return IS9WD_apiOut_(IS9WD_apiHandle_(JSON.stringify({ v: 1, action: 'ping', payload: {} })));
}

/**
 * The RPC entry point the reference requires, for a google.script.run caller inside the
 * Sheet. It delegates rather than duplicating: a second implementation is a second set of
 * refusals to keep in step, and they would drift.
 */
function IS9WD_rpc(req) {
  var text = '';
  try {
    text = JSON.stringify(req || {});
  } catch (err) {
    text = '';
  }
  return IS9WD_apiHandle_(text);
}

// ============================================================================
//  THE REQUEST
// ============================================================================

// ONE TRY/CATCH AROUND EVERYTHING. doPost must never throw: a thrown Apps Script error
// returns an HTML error page, which a cross origin fetch reads as an opaque failure with no
// code and no message, and the officer sees a spinner that never stops.
function IS9WD_apiHandle_(body) {
  var action = '';
  try {
    if (body === '' || body === null || body === undefined) {
      return IS9WD_envelopeErr_('', 'VALIDATION', 'Request body is missing.');
    }
    if (String(body).length > IS9WD_API_MAX_BODY_) {
      return IS9WD_envelopeErr_('', 'VALIDATION', 'Request body is too large.');
    }
    var req = IS9WD_apiParse_(body);
    if (req === null) {
      return IS9WD_envelopeErr_('', 'VALIDATION', 'Request body is not readable.');
    }
    action = IS9WD_trim_(req.action);
    return IS9WD_apiRoute_(req, String(body).length);
  } catch (err) {
    // The real error goes to the log and to the execution transcript. The caller gets a
    // fixed sentence, because an exception message can carry a range, a formula or a row
    // count, and this endpoint answers strangers.
    IS9WD_logRow_({
      source: IS9WD_LOG_SOURCE_APP_, actor: 'Unknown link', action: action || 'unknown',
      detail: 'SERVER_ERROR ' + err + (err && err.stack ? ' | ' + err.stack : ''),
      ok: false, result: 'SERVER_ERROR'
    });
    Logger.log('IS9WD endpoint: ' + err + (err && err.stack ? '\n' + err.stack : ''));
    return IS9WD_envelopeErr_(action, 'SERVER_ERROR', 'Something went wrong on our end.');
  }
}

// Only the five fields the protocol defines are read. Everything else in the body is ignored
// rather than refused, so a later app version may send more without this one rejecting it.
// A payload that is not a plain object becomes an empty one: `payload` is always addressed by
// named field, never spread into a write.
function IS9WD_apiParse_(body) {
  var raw = null;
  try {
    raw = JSON.parse(String(body));
  } catch (err) {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Object.prototype.toString.call(raw) === '[object Array]') {
    return null;
  }
  var payload = raw.payload;
  if (!payload || typeof payload !== 'object' ||
    Object.prototype.toString.call(payload) === '[object Array]') {
    payload = {};
  }
  return {
    v: raw.v,
    action: IS9WD_trim_(raw.action),
    token: IS9WD_trim_(raw.token),
    requestId: IS9WD_trim_(raw.requestId),
    payload: payload
  };
}

function IS9WD_apiRoute_(req, bodyBytes) {
  // ping answers ahead of the token and ahead of the app switch, on purpose: its job is to
  // report the switches the app is about to be refused by. It gets its own global limit so it
  // cannot be used as a free probe of whether the endpoint is alive.
  if (req.action === 'ping') {
    if (IS9WD_apiOverLimit_('IS9WD_RL_PING', IS9WD_API_PING_LIMIT_, IS9WD_API_RATE_WINDOW_)) {
      return IS9WD_envelopeErr_('ping', 'RATE_LIMITED', 'Too many requests.');
    }
    return IS9WD_envelopeOk_('ping', IS9WD_apiPing_(req));
  }

  var ctx = IS9WD_apiContext_(req, bodyBytes);
  var plan = IS9WD_routeDecision_(req, ctx);

  if (!plan.ok) {
    IS9WD_apiLogRefusal_(plan, ctx, req);
    return IS9WD_envelopeErr_(plan.action || req.action, plan.error.code, plan.error.message);
  }
  if (plan.replay) {
    // The caller's own earlier answer, byte for byte. It writes nothing and logs nothing: a
    // replay is a network retry, not an event.
    return plan.cached ? plan.cached
      : IS9WD_envelopeErr_(plan.action, 'VALIDATION', 'That request was already handled.');
  }
  if (!plan.needsLock) return IS9WD_apiRead_(plan, req);
  return IS9WD_apiWrite_(plan, req, ctx);
}

// ============================================================================
//  THE CONTEXT  (everything IS9WD_routeDecision_ needs, and nothing it does not)
// ============================================================================

// READS BEFORE THE TOKEN IS PROVEN ARE CHEAP AND CACHED. The directory and the token map are
// needed to resolve a token at all, so they cannot be deferred past it; everything else is.
// The settings context is cached for 60 seconds so a burst of ticks does not re-read
// 01 | Configuration once per request.
function IS9WD_apiContext_(req, bodyBytes) {
  var cfg = IS9WD_readConfig_();
  var hash = IS9WD_apiTokenHash_(req.token);
  var write = IS9WD_apiIsWrite_(req.action);
  var reads = IS9WD_apiSetting_('IS9WD_RATE_READS', IS9WD_API_FALLBACK_READS_);
  var writes = IS9WD_apiSetting_('IS9WD_RATE_WRITES', IS9WD_API_FALLBACK_WRITES_);
  var badTries = IS9WD_apiSetting_('IS9WD_BAD_LINK_TRIES', IS9WD_API_FALLBACK_BAD_);
  IS9WD_coordsFlush_();

  var limited = false;
  if (hash !== '') {
    limited = IS9WD_apiOverLimit_('IS9WD_RL_' + hash + (write ? '_w' : '_r'),
      write ? writes : reads, IS9WD_API_RATE_WINDOW_);
  }

  var ctx = {
    maxBodyBytes: IS9WD_API_MAX_BODY_,
    bodyBytes: bodyBytes,
    directory: cfg.directory ? cfg.directory.rows : [],
    tokens: IS9WD_apiTokenMap_(),
    appOn: cfg.switches ? cfg.switches.appOn !== false : true,
    inTerm: cfg.weeks ? cfg.weeks.inTerm !== false : true,
    rateLimited: limited,
    dedupeHit: false,
    cachedEnvelope: null,
    itemCommittee: '',
    lockAcquired: true,
    cfg: cfg,
    hash: hash,
    badTries: badTries
  };

  if (write && req.requestId !== '') {
    var seen = IS9WD_apiReplaySeen_(hash, req.requestId);
    if (seen !== null) {
      ctx.dedupeHit = true;
      ctx.cachedEnvelope = seen;
    }
  }
  return ctx;
}

function IS9WD_apiIsWrite_(action) {
  var spec = IS9WD_ACTIONS_[IS9WD_trim_(action)];
  return !!(spec && spec.write);
}

// A 16 character hash of the token, for a cache key. NEVER the token, because the script
// cache is not a secret store and a key is visible to anything that can read the cache.
function IS9WD_apiTokenHash_(token) {
  var text = IS9WD_trim_(token).toLowerCase();
  if (text === '') return '';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
  var out = '';
  for (var i = 0; i < 8; i++) {
    out += ('0' + (bytes[i] & 0xff).toString(16)).slice(-2);
  }
  return out;
}

function IS9WD_apiTokenMap_() {
  var held = PropertiesService.getScriptProperties().getProperties();
  var out = {};
  for (var key in held) {
    if (!Object.prototype.hasOwnProperty.call(held, key)) continue;
    if (key.indexOf(IS9WD_PROP.TOKEN_PREFIX) !== 0 && key !== IS9WD_PROP.TOKEN_ADMIN) continue;
    out[key] = held[key];
  }
  return out;
}

function IS9WD_apiSetting_(name, fallback) {
  try {
    // The three rate names do not exist as rows yet, and asking Sheets for each of them on
    // every request was three round trips for three misses. The memory remembers a miss.
    if (!IS9WD_coordOf_(name)) return fallback;
    var range = IS9WD_namedOrNull_(name);
    if (!range) return fallback;
    var n = IS9WD_posInt_(range.getValue());
    return n === null ? fallback : n;
  } catch (err) {
    return fallback;
  }
}

// A counter in the script cache, one window per key. The cache is the right store precisely
// because it forgets: a rate limit that outlived its window would need clearing by hand.
function IS9WD_apiOverLimit_(key, limit, windowSeconds) {
  try {
    var cache = CacheService.getScriptCache();
    var now = IS9WD_int_(cache.get(key)) || 0;
    if (now >= limit) return true;
    cache.put(key, String(now + 1), windowSeconds);
    return false;
  } catch (err) {
    // A cache that cannot be read must not close the endpoint. The lock and the token still
    // stand between a flood and the spreadsheet.
    return false;
  }
}

// ============================================================================
//  REPLAY  (the same requestId must never write twice)
// ============================================================================

function IS9WD_apiReplayKey_(hash, requestId) {
  return 'IS9WD_RQ_' + hash + '_' + IS9WD_trim_(requestId);
}

function IS9WD_apiReplaySeen_(hash, requestId) {
  var key = IS9WD_apiReplayKey_(hash, requestId);
  try {
    var hit = CacheService.getScriptCache().get(key);
    if (hit) return JSON.parse(hit);
  } catch (err) {
    // fall through to the durable ring
  }
  var ring = PropertiesService.getDocumentProperties().getProperty('IS9WD_REPLAY');
  if (!ring) return null;
  var list = [];
  try {
    list = JSON.parse(ring) || [];
  } catch (err) {
    return null;
  }
  for (var i = 0; i < list.length; i++) {
    if (list[i] === key) {
      // Known, but the body is gone. Refusing is right: the write already happened, and
      // repeating it is the one thing this guard exists to prevent.
      return IS9WD_envelopeErr_('', 'NO_CHANGE', 'That change was already saved.');
    }
  }
  return null;
}

function IS9WD_apiReplayRecord_(hash, requestId, envelope) {
  var key = IS9WD_apiReplayKey_(hash, requestId);
  var store = PropertiesService.getDocumentProperties();
  var list = [];
  try {
    list = JSON.parse(store.getProperty('IS9WD_REPLAY') || '[]') || [];
  } catch (err) {
    list = [];
  }
  list.push(key);
  while (list.length > IS9WD_API_REPLAY_KEEP_) list.shift();
  store.setProperty('IS9WD_REPLAY', JSON.stringify(list));
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(envelope), 600);
  } catch (err) {
    Logger.log('IS9WD: the replay envelope was not cached: ' + err);
  }
}

// ============================================================================
//  ENVELOPES
// ============================================================================

function IS9WD_envelopeOk_(action, data) {
  return IS9WD_envelopeOk(action, data, IS9WD_apiServerTime_());
}

function IS9WD_envelopeErr_(action, code, message) {
  return IS9WD_envelopeErr(action, code, message, IS9WD_apiServerTime_());
}

function IS9WD_apiServerTime_() {
  return Utilities.formatDate(IS9WD_nowManila_(), IS9WD_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// The response type is free and makes the body readable in a browser tab during the smoke
// test. It is the REQUEST content type that has to be text/plain, not the response.
function IS9WD_apiOut_(envelope) {
  return ContentService.createTextOutput(JSON.stringify(envelope))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
//  ACTIONS
// ============================================================================

// Bumped by hand whenever the endpoint's behaviour changes, so a ping can say which version
// is actually deployed: a /exec address serves the version it was deployed with, not the code
// last pushed, and the two have been confused once already.
var IS9WD_API_VERSION_ = 8;

/**
 * Ping answers strangers, so it carries no data. With payload.probe set it also carries where
 * the milliseconds went inside this execution: the settings read, the items read, and whether
 * the name coordinates came from memory. Numbers about the machine, never about the work.
 */
function IS9WD_apiPing_(req) {
  var appOn = true;
  var out = { appOn: true, transport: 'fetch', version: IS9WD_API_VERSION_ };
  var probe = !!(req && req.payload && req.payload.probe);
  var t0 = new Date().getTime();
  try {
    var cfg = IS9WD_readConfig_();
    appOn = cfg.switches ? cfg.switches.appOn !== false : true;
  } catch (err) {
    appOn = false;
  }
  out.appOn = appOn;
  if (probe) {
    var t1 = new Date().getTime();
    var itemsMs = null;
    try {
      IS9WD_readItems_();
      itemsMs = new Date().getTime() - t1;
    } catch (err) {
      itemsMs = -1;
    }
    out.probe = {
      settingsMs: t1 - t0,
      settings: IS9WD_SNAP_HIT_ === true ? 'memory' : 'live',
      itemsMs: itemsMs,
      items: IS9WD_ITEMS_HIT_ === true ? 'memory' : 'live ' + (IS9WD_ITEMS_SCAN_ || 'scan'),
      coords: IS9WD_COORDS_HIT_ === true ? 'memory' : 'resolved live',
      names: IS9WD_COORDS_ ? Object.keys(IS9WD_COORDS_).length : 0
    };
  }
  return out;
}

function IS9WD_apiRead_(plan, req) {
  if (plan.action === 'state') {
    return IS9WD_envelopeOk_('state', IS9WD_apiState_(plan));
  }
  return IS9WD_envelopeErr_(plan.action, 'VALIDATION', 'Unknown action.');
}

// EVERY WRITE RETURNS THE WHOLE RECOMPUTED STATE of the caller's committee, so the app never
// has to guess what the slot numbers became. It costs one extra read and removes a class of
// bug where the screen and the sheet disagree after a tick.
function IS9WD_apiWrite_(plan, req, ctx) {
  var lock = LockService.getDocumentLock();
  var waited = IS9WD_apiSetting_('IS9WD_LOCK_WAIT_SECONDS', IS9WD_API_FALLBACK_LOCK_);
  if (!lock.tryLock(waited * 1000)) {
    var refused = IS9WD_routeDecision_(req, IS9WD_apiWith_(ctx, { lockAcquired: false }));
    IS9WD_apiLogRefusal_(refused, ctx, req);
    return IS9WD_envelopeErr_(plan.action, 'LOCKED', 'Someone else is saving right now.');
  }
  try {
    // A WRITE READS LIVE, before and after: the row it is about to change must be the row on
    // the sheet, and the state it returns must show the change. The remembered rows are
    // cleared going in and coming out, so the next request starts fresh.
    IS9WD_ITEMS_LIVE_ = true;
    IS9WD_itemsCacheReset_();
    var out = IS9WD_apiPerform_(plan, req, ctx);
    if (out.ok && req.requestId !== '') {
      IS9WD_apiReplayRecord_(ctx.hash, req.requestId, out);
    }
    return out;
  } finally {
    IS9WD_itemsCacheReset_();
    lock.releaseLock();
  }
}

function IS9WD_apiWith_(ctx, extra) {
  var out = {};
  for (var k in ctx) {
    if (Object.prototype.hasOwnProperty.call(ctx, k)) out[k] = ctx[k];
  }
  for (var x in extra) {
    if (Object.prototype.hasOwnProperty.call(extra, x)) out[x] = extra[x];
  }
  return out;
}

function IS9WD_apiPerform_(plan, req, ctx) {
  if (plan.action === 'setStatus') return IS9WD_apiSetStatus_(plan, req, ctx);
  if (plan.action === 'setSignoff') return IS9WD_apiSetSignoff_(plan, req);
  return IS9WD_envelopeErr_(plan.action, 'VALIDATION',
    'That action is not built yet. Ask the President.');
}

/**
 * THE ONE ACTION AN OFFICER HAS. Tick or untick, and the whole of SPEC's officer contract is
 * in the ordering here: the item must exist, it must be theirs, the status must be one the
 * Configuration list defines, and an untick past the undo window is refused for a member and
 * allowed for the admin.
 *
 * Ownership answers NOT_FOUND rather than NOT_ALLOWED, so a member link cannot walk the id
 * space and learn which ids exist on other committees.
 */
function IS9WD_apiSetStatus_(plan, req, ctx) {
  var id = IS9WD_trim_(req.payload.id);
  var wanted = IS9WD_trim_(req.payload.status);
  var items = IS9WD_readItems_();
  var item = IS9WD_itemById_(items, id);
  if (!item || item.title === '') {
    return IS9WD_apiRefuse_(plan, ctx, 'NOT_FOUND', 'No item with that id.', id);
  }

  var owned = IS9WD_routeDecision_(req, IS9WD_apiWith_(ctx, { itemCommittee: item.committee }));
  if (!owned.ok) {
    IS9WD_apiLogRefusal_(owned, ctx, req);
    return IS9WD_envelopeErr_(plan.action, owned.error.code, owned.error.message);
  }

  var cfg = ctx.cfg;
  var entry = IS9WD_statusEntry_(wanted, cfg.statuses ? cfg.statuses.rows : []);
  if (!entry) {
    return IS9WD_apiRefuse_(plan, ctx, 'VALIDATION', 'That is not a status this sheet uses.', id);
  }
  if (IS9WD_trim_(item.status).toLowerCase() === IS9WD_trim_(entry.name).toLowerCase()) {
    return IS9WD_envelopeErr_(plan.action, 'NO_CHANGE', entry.terminal
      ? 'Already ticked off on ' + IS9WD_ddd_(item.statusAt) + '.'
      : 'Already open.');
  }

  // Re-opening: reversible for the officer for a window, then Ethan's alone (3).
  if (!entry.terminal && plan.role === 'member') {
    var seconds = IS9WD_apiUndoSeconds_(cfg);
    if (!IS9WD_undoAllowed(item.statusAt, IS9WD_nowManila_(), seconds, plan.role)) {
      return IS9WD_apiRefuse_(plan, ctx, 'UNDO_EXPIRED',
        'That one is past the ' + seconds + ' second window. Ask the President to reopen it.', id);
    }
  }

  var sheet = IS9WD_sheet_('ITEMS');
  var now = IS9WD_nowManila_();
  sheet.getRange(item.row, IS9WD_itemColIndex_('Status')).setValue(entry.name);
  sheet.getRange(item.row, IS9WD_itemColIndex_('Status at')).setValue(now);
  sheet.getRange(item.row, IS9WD_itemColIndex_('Status by')).setValue(plan.name || plan.key);
  SpreadsheetApp.flush();

  IS9WD_logRow_({
    source: IS9WD_LOG_SOURCE_APP_, actor: IS9WD_apiActor_(plan), action: 'setStatus',
    committee: item.committee, id: item.id,
    detail: IS9WD_trim_(item.status) + ' to ' + entry.name, ok: true
  });

  return IS9WD_envelopeOk_('setStatus', IS9WD_apiState_(plan));
}

/**
 * The weekly sign-off, admin only. It is a row per week rather than a setting, because
 * Prepared by and Checked by change every week and printing last week's names silently is
 * the failure this design refuses (3).
 */
function IS9WD_apiSetSignoff_(plan, req) {
  var bad = IS9WD_validateSignoff_(req.payload);
  if (bad) return IS9WD_envelopeErr_('setSignoff', 'VALIDATION', bad);
  var impl = IS9WD_apiImpl_('IS9WD_signoffWrite_');
  if (!impl) {
    return IS9WD_envelopeErr_('setSignoff', 'SERVER_ERROR',
      'The sign-off store is not built yet.');
  }
  impl(req.payload);
  IS9WD_logRow_({
    source: IS9WD_LOG_SOURCE_APP_, actor: IS9WD_apiActor_(plan), action: 'setSignoff',
    detail: IS9WD_trim_(req.payload.preparedName) + ' and ' +
      IS9WD_trim_(req.payload.checkedName), ok: true
  });
  return IS9WD_envelopeOk_('setSignoff', IS9WD_apiState_(plan));
}

/**
 * THE SIGN-OFF STORE WRITER. One row per week on _Engine: the week's Monday, prepared by name
 * and position, checked by name and position, and when it was set. A week that already has a
 * row is overwritten in place, because correcting a sign-off is the ordinary case; a new week
 * takes the first free row. The store is append only and last on its tab, and Build or repair
 * grows it when fewer than four rows are free, so a full store is a workbook nobody has
 * repaired in a year, and it says so rather than writing past its own end.
 */
function IS9WD_signoffWrite_(payload) {
  var p = payload || {};
  var store = IS9WD_named_('IS9WD_SIGNOFF');
  var values = store.getValues();
  var want = IS9WD_day_(IS9WD_toDate_(p.weekStart));
  var at = -1;
  var free = -1;
  for (var i = 0; i < values.length; i++) {
    if (IS9WD_day_(values[i][0]) === want) { at = i; break; }
    if (free < 0 && IS9WD_blank_(values[i][0])) free = i;
  }
  if (at < 0) at = free;
  if (at < 0) {
    throw new Error('The weekly sign-off store is full. Run IS9 Deliverables > Build or ' +
      'repair workbook to extend it, then set the sign-off again.');
  }
  store.offset(at, 0, 1, 6).setValues([[
    IS9WD_toDate_(p.weekStart),
    IS9WD_normalizeText(p.preparedName), IS9WD_normalizeText(p.preparedPosition),
    IS9WD_normalizeText(p.checkedName), IS9WD_normalizeText(p.checkedPosition),
    IS9WD_nowManila_()
  ]]);
  SpreadsheetApp.flush();
  IS9WD_configReset_();
  return store.getRow() + at;
}

// ============================================================================
//  STATE  (what the app draws)
// ============================================================================

// A MEMBER RESPONSE CARRIES NO OTHER COMMITTEE'S ANYTHING: no name, no count, no token, not
// even a key. So a leaked payload discloses that one committee's week and nothing else, which
// is the accepted risk in SPEC section 6 kept to its stated size.
function IS9WD_apiState_(plan) {
  // Not forced: the context read the settings a moment ago in this same execution, and the
  // one write that changes them, the sign-off, resets the cache itself.
  var cfg = IS9WD_readConfig_();
  var mine = plan.role === 'admin' ? null : IS9WD_trim_(plan.committee);
  var items = IS9WD_readItems_(mine ? { committee: mine } : {});
  // The status list is the app's whole vocabulary: it never hardcodes Open or Accomplished,
  // it draws whatever this list holds, which is what makes renaming a status one edit on
  // 01 | Configuration rather than a code change (3).
  var rows = cfg.statuses ? cfg.statuses.rows : [];
  var statuses = [];
  for (var s = 0; s < rows.length; s++) {
    statuses.push({
      name: rows[s].name,
      terminal: rows[s].terminal === true,
      hex: rows[s].chipHex || '',
      textHex: rows[s].chipTextHex || ''
    });
  }
  var state = {
    role: plan.role,
    appOn: cfg.switches ? cfg.switches.appOn !== false : true,
    statuses: statuses,
    undoSeconds: IS9WD_apiUndoSeconds_(cfg),
    week: {
      number: IS9WD_two_(cfg.weeks ? cfg.weeks.weekNumber : null),
      start: IS9WD_dateKey_(cfg.weeks ? cfg.weeks.weekStart : null),
      end: IS9WD_dateKey_(cfg.weeks ? cfg.weeks.weekEnd : null),
      // What the page prints. The machine keys above stay for anything that sorts or compares.
      startLong: IS9WD_longDate(cfg.weeks ? cfg.weeks.weekStart : null),
      endLong: IS9WD_longDate(cfg.weeks ? cfg.weeks.weekEnd : null),
      inTerm: cfg.weeks ? cfg.weeks.inTerm !== false : true,
      ayLabel: IS9WD_txt_(cfg.weeks ? cfg.weeks.ayLabel : ''),
      cutoffText: IS9WD_txt_(cfg.weeks ? cfg.weeks.cutoffText : '')
    },
    committee: {
      key: plan.key,
      name: plan.committee,
      headline: IS9WD_upper_(plan.committee),
      vpLine: IS9WD_vpLine(plan.name, IS9WD_apiPosition_(cfg, plan.key))
    },
    items: IS9WD_apiItems_(items)
  };
  // THE ADMIN VIEW ALONE carries the fourteen people and this week's sign-off, because the
  // sign-off is set from a picker over them and nobody else may set it. A member response
  // still names nobody but its own officer.
  if (plan.role === 'admin') {
    var people = [];
    var order = cfg.directory ? cfg.directory.inHierarchy : [];
    for (var p = 0; p < order.length; p++) {
      people.push({
        key: order[p].key,
        name: order[p].fullName,
        position: order[p].position,
        committee: order[p].committee
      });
    }
    var so = cfg.signoff && cfg.signoff.current ? cfg.signoff.current : {};
    state.people = people;
    state.signoff = {
      weekStart: IS9WD_dateKey_(cfg.weeks ? cfg.weeks.weekStart : null),
      set: so.set === true,
      preparedName: IS9WD_txt_(so.preparedName),
      preparedPosition: IS9WD_txt_(so.preparedPosition),
      checkedName: IS9WD_txt_(so.checkedName),
      checkedPosition: IS9WD_txt_(so.checkedPosition),
      setAt: IS9WD_txt_(so.setAt)
    };
  }
  return state;
}

// One reader, so the refusal message and the number the app counts down from can never
// disagree. It lives with the status list because it governs a status change.
function IS9WD_apiUndoSeconds_(cfg) {
  var n = IS9WD_posInt_(cfg && cfg.statuses ? cfg.statuses.undoSeconds : null);
  return n === null ? 60 : n;
}

function IS9WD_apiItems_(items) {
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.title === '') continue;
    out.push({
      id: it.id,
      // A member's items all carry their own office; the admin list needs it to tell rows apart.
      committee: it.committee,
      title: it.title,
      remark: it.remark,
      deadline: IS9WD_dateKey_(it.deadline),
      // TWO DEADLINE STRINGS, DELIBERATELY. deadlineText is the Canva wording, frozen by SPEC
      // section 4, and the page used to show it. Ethan asked on 2026-09-28 for dates a person
      // reads, so the page shows deadlineLong instead and the carousel keeps its contract.
      // Both are sent: the short one stays because an admin view may want to see exactly what
      // the slide will print.
      deadlineText: IS9WD_deadlineText(it.deadline, IS9WD_todayManila_()),
      deadlineLong: IS9WD_longDateDay(it.deadline),
      status: it.status,
      active: it.active === true,
      // OVERDUE IS COMPUTED HERE, not in the page. The app has the officer's phone clock,
      // which may be wrong, in another timezone, or deliberately changed; this is Asia/Manila
      // from the workbook's own effective date. SPEC's human meaning of overdue is used, the
      // deadline has passed and the item is still active, which is the one a person reads.
      overdue: it.active === true && IS9WD_isDate_(it.deadline) &&
        IS9WD_midnight_(it.deadline) < IS9WD_midnight_(IS9WD_todayManila_()),
      statusAt: IS9WD_isDate_(it.statusAt) ? IS9WD_stampText_(it.statusAt) : '',
      flag: it.check
    });
  }
  return out;
}

function IS9WD_apiPosition_(cfg, key) {
  var row = IS9WD_dirByKey_(key, cfg.directory ? cfg.directory.rows : []);
  return row ? row.position : '';
}

// ============================================================================
//  LOGGING AND REFUSALS
// ============================================================================

// Actor is the office the link belongs to, never a person: under ANYONE_ANONYMOUS the calling
// user is unknowable by design, and inventing a name in the record would be worse than
// admitting the record cannot hold one.
function IS9WD_apiActor_(plan) {
  if (plan.role === 'admin') return 'Admin';
  return IS9WD_trim_(plan.committee) || 'Unknown link';
}

// A READ IS NOT LOGGED. The read budget alone allows 60 a minute per link, so logging state
// would write up to 840 rows a minute across fourteen links, against a tab nothing trims
// until the heartbeat runs. Writes and refusals are what a dispute is settled from.
function IS9WD_apiLogRefusal_(plan, ctx, req) {
  var code = plan.error ? plan.error.code : 'VALIDATION';
  if (code === 'BAD_TOKEN' || code === 'RATE_LIMITED') {
    // A stranger probing tokens produces one aggregated row per window, not one per attempt,
    // so a flood cannot bury a real event under thousands of identical lines.
    if (!IS9WD_apiOverLimit_('IS9WD_RL_BAD_LOGGED', 1, IS9WD_API_BAD_WINDOW_)) {
      IS9WD_logRow_({
        source: IS9WD_LOG_SOURCE_APP_, actor: 'Unknown link', action: 'badLink',
        detail: 'a link nobody holds was tried', ok: false, result: code
      });
    }
    return;
  }
  IS9WD_logRow_({
    source: IS9WD_LOG_SOURCE_APP_, actor: IS9WD_apiActor_(plan),
    action: plan.action || IS9WD_trim_(req.action),
    committee: plan.committee, id: IS9WD_trim_(req.payload ? req.payload.id : ''),
    detail: plan.error ? plan.error.message : '', ok: false, result: code
  });
}

function IS9WD_apiRefuse_(plan, ctx, code, message, id) {
  IS9WD_logRow_({
    source: IS9WD_LOG_SOURCE_APP_, actor: IS9WD_apiActor_(plan), action: plan.action,
    committee: plan.committee, id: id, detail: message, ok: false, result: code
  });
  return IS9WD_envelopeErr_(plan.action, code, message);
}

// Resolved by name at call time, the same way setup calls a module that may not be pushed
// yet, so a missing Phase 5 file is a clear sentence rather than a ReferenceError.
function IS9WD_apiImpl_(name) {
  var fn = null;
  try {
    fn = (typeof globalThis === 'object' && globalThis) ? globalThis[name] : null;
  } catch (err) {
    fn = null;
  }
  return typeof fn === 'function' ? fn : null;
}

// ============================================================================
//  THE LINKS  (7.3: one per officer, issued from the menu, never mailed by the script)
// ============================================================================
//
// A LINK IS A TOKEN IN A URL FRAGMENT. Everything after the # is never sent to a server, so
// the address reaches the page without the token ever appearing in an access log, and the page
// strips it from the address bar on load.
//
// THESE FUNCTIONS PRINT TOKENS INTO A DIALOG, which is the one place a whole token is ever
// shown, because Ethan has to be able to send somebody their link. They must never write one
// anywhere else: not to a cell, because the Canva reader account can read every cell of every
// tab, and not to 07 | Log, because the log is a record that outlives the token. What goes on
// the record is the first six characters and the date, which is enough to say WHICH link acted
// and useless for acting as it.

// The base the links are built on. It is a Configuration cell rather than a constant because a
// GitHub Pages URL does not redirect after a repository transfer, so the day the tenth
// administration renames the repo, this one cell moves and every email follows it (7).
function IS9WD_appBase_() {
  var base = '';
  try {
    var range = IS9WD_namedOrNull_('IS9WD_APP_BASE_URL');
    base = range ? IS9WD_trim_(range.getValue()) : '';
  } catch (err) {
    base = '';
  }
  return base.replace(/[#\/]+$/, '');
}

/**
 * One officer's link, or a sentence saying why there is not one. Never throws: this is called
 * from a menu and from the emails, and a missing token must read as a missing token rather
 * than as a stack trace.
 *
 * K10 is the President's row and carries no member token by design (4.8). He holds the ADMIN
 * link instead, which is the same page with the admin role behind it.
 */
function IS9WD_linkFor_(key) {
  var want = IS9WD_trim_(key).toUpperCase();
  var base = IS9WD_appBase_();
  if (base === '') {
    return 'No address yet: paste the officers page address into ' + IS9WD_TAB.CONFIG + '.';
  }
  var admin = IS9WD_trim_(IS9WD_CFG.DIRECTORY.adminKey).toUpperCase();
  var store = PropertiesService.getScriptProperties();
  var token = IS9WD_trim_(want === admin || want === 'ADMIN'
    ? store.getProperty(IS9WD_PROP.TOKEN_ADMIN)
    : store.getProperty(IS9WD_tokenKey_(want)));
  if (token === '') {
    return 'No link yet for ' + want + ': run Build or repair workbook.';
  }
  return base + '/#' + token;
}

/**
 * Every link, one line each, for the dialog Ethan copies from. Fourteen rows: the President
 * gets the admin link and the other thirteen get their own.
 */
function IS9WD_linksReport_() {
  var cfg = IS9WD_readConfig_(true);
  var rows = cfg.directory ? cfg.directory.rows : [];
  var admin = IS9WD_trim_(IS9WD_CFG.DIRECTORY.adminKey).toUpperCase();
  var out = [];
  var base = IS9WD_appBase_();
  if (base === '') {
    out.push('THE OFFICERS PAGE ADDRESS IS NOT SET, so there are no links to show yet.');
    out.push('Paste it into ' + IS9WD_TAB.CONFIG + ', the row "Web address of the ' +
      'officers\' page", then run this again.');
    return out;
  }
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var isAdmin = IS9WD_trim_(row.key).toUpperCase() === admin;
    var who = IS9WD_trim_(row.fullName) === ''
      ? row.committee
      : row.fullName + IS9WD_SEP + row.committee;
    var note = '';
    if (row.revoked === true) note = IS9WD_SEP + 'REVOKED, rotate it before sending';
    if (IS9WD_trim_(row.email) === '') note += IS9WD_SEP + 'no address on file';
    out.push(row.key + IS9WD_SEP + who + (isAdmin ? IS9WD_SEP + 'ADMIN LINK' : '') + note);
    out.push('   ' + IS9WD_linkFor_(row.key));
    out.push('');
  }
  out.push('Send each person only their own line. A link is the whole of their access: ' +
    'anyone holding it can tick that officer\'s items, which is the accepted risk in ' +
    'SPEC section 6, and the answer to a leak is Rotate a link rather than anything else.');
  return out;
}

/**
 * Mint a fresh token for one row. The old one stops working the instant this returns, so the
 * person is locked out until they are sent the new link. That is the point: it is the remedy
 * for a leaked link, not routine maintenance.
 */
function IS9WD_rotateToken_(key) {
  var want = IS9WD_trim_(key).toUpperCase();
  var admin = IS9WD_trim_(IS9WD_CFG.DIRECTORY.adminKey).toUpperCase();
  var store = PropertiesService.getScriptProperties();
  var propKey = (want === admin || want === 'ADMIN')
    ? IS9WD_PROP.TOKEN_ADMIN : IS9WD_tokenKey_(want);
  var old = IS9WD_trim_(store.getProperty(propKey));
  var token = IS9WD_setupNewToken_();
  store.setProperty(propKey, token);
  IS9WD_linkStamp_(want, token, false);
  IS9WD_logRow_({
    source: 'Menu', actor: 'Admin', action: 'rotateToken', committee: want,
    detail: 'old link ended ' + (old === '' ? 'nothing' : old.substring(0, 6)) +
      ', new link starts ' + token.substring(0, 6),
    ok: true
  });
  return [want + ' has a new link. The old one stopped working just now.',
    '', IS9WD_linkFor_(want), '',
    'Send it to them before they next need it, or they are locked out.'];
}

function IS9WD_rotateAllTokens_() {
  var cfg = IS9WD_readConfig_(true);
  var rows = cfg.directory ? cfg.directory.rows : [];
  var out = ['Every link was replaced. All fourteen people need their new one.', ''];
  for (var i = 0; i < rows.length; i++) {
    IS9WD_rotateToken_(rows[i].key);
    out.push(rows[i].key + IS9WD_SEP + IS9WD_linkFor_(rows[i].key));
  }
  return out;
}

/**
 * Revoke without minting. The link keeps its shape and stops being accepted, which is what you
 * want when somebody has left and nobody should hold that office's link at all. Rotate instead
 * when the person is staying and only the link is compromised.
 */
function IS9WD_revokeToken_(key) {
  var want = IS9WD_trim_(key).toUpperCase();
  IS9WD_linkStamp_(want, '', true);
  IS9WD_logRow_({
    source: 'Menu', actor: 'Admin', action: 'revokeToken', committee: want,
    detail: 'the link was revoked and now answers REVOKED', ok: true
  });
  return [want + ' is revoked. That link now answers "This link has been replaced."',
    '', 'Rotate it when somebody should hold it again.'];
}

// The two identification columns and the revoked flag on `_Engine`, by row position. The
// TOKEN ITSELF NEVER TOUCHES A CELL: only its first six characters and the date it was issued,
// which is enough to tell two links apart in a dispute and useless for using one.
function IS9WD_linkStamp_(key, token, revoked) {
  var e = IS9WD_ENG.DIRECTORY;
  var sheet = IS9WD_sheet_('ENGINE');
  var count = e.lastRow - e.firstRow + 1;
  var cfgSheet = IS9WD_sheet_('CONFIG');
  var d = IS9WD_CFG.DIRECTORY;
  var keys = cfgSheet.getRange(d.firstRow, 1, count, 1).getValues();
  for (var r = 0; r < count; r++) {
    if (IS9WD_trim_(keys[r][0]).toUpperCase() !== IS9WD_trim_(key).toUpperCase()) continue;
    if (IS9WD_trim_(token) !== '') {
      sheet.getRange(e.firstRow + r, 4).setValue(token.substring(0, 6));
      sheet.getRange(e.firstRow + r, 5).setValue(IS9WD_todayManila_());
    }
    sheet.getRange(e.firstRow + r, 6).setValue(revoked === true);
    return true;
  }
  return false;
}
