// The officers' page. One screen, one action for an officer: tick an item off, or untick it
// inside the undo window. Nobody signs in, nobody sees anyone else's list, and there is
// nothing to learn. The President's link is the same page with a second segment: his own list
// first, then every officer behind a picker, with the numbers, a way to add a deliverable, and
// a way to reopen one.
//
// THE TOKEN IS IN THE URL FRAGMENT, not the query string: a fragment is never sent to a
// server, so it cannot reach an access log. IT STAYS IN THE ADDRESS. An earlier version
// stripped it on load so it would not sit in a screenshot, and every reload then came back
// as "This link is incomplete": pull to refresh, Safari restoring the tab, opening it again an
// hour later. A link people open from an email has to survive a reload, and a phone's address
// bar shows only the domain in any case. A per tab copy in sessionStorage covers the one case
// where the address arrives without it; it dies with the tab, and nothing ever goes in
// localStorage, because a shared phone is a real thing in a student org.

import { h, render } from './lib/preact.module.js';
import { useState, useEffect, useRef, useCallback } from './lib/hooks.module.js';
import htm from './lib/htm.module.js';
import { call, newRequestId, endpointReady, bootState } from './wire.js';
import { quoteForToday } from './quotes.js';

const html = htm.bind(h);

// ---------------------------------------------------------------------------
// The token
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'is9wd.token';
const TOKEN_SHAPE = /^[0-9a-hjkmnp-tv-z]{26}$/;

function readToken() {
  const raw = (window.location.hash || '').replace(/^#/, '').trim();
  const fromHash = TOKEN_SHAPE.test(raw) ? raw : '';
  if (fromHash) {
    try { sessionStorage.setItem(TOKEN_KEY, fromHash); } catch (err) { /* private mode */ }
    return fromHash;
  }
  // The address arrived without its code: a restored tab, a stripped link. This tab may still
  // know it.
  let kept = '';
  try { kept = sessionStorage.getItem(TOKEN_KEY) || ''; } catch (err) { kept = ''; }
  if (TOKEN_SHAPE.test(kept)) {
    try { window.location.hash = kept; } catch (err) { /* the token still works */ }
    return kept;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

// THE MARK, INLINE. The same vector as app/icon.svg, drawn straight into the header rather
// than fetched: one fewer request on university wifi, and it can never be a broken image.
// The gradient id is unique because a page may hold more than one svg and ids are global.
// The Society's own logo, the circular mark on its gradient, published beside the page as
// mail/logo.png and shared with the emails' header. Decorative here: the name is beside it.
function Mark() {
  return html`<img src="./mail/logo.png" alt="" width="32" height="32" decoding="async" />`;
}

// THE YEAR PRINTS ONCE. The server sends two full long dates, and a week almost always sits
// inside one year, so "September 28, 2026 to October 4, 2026" says 2026 twice in a line that
// is already at the edge of a 375 px screen. Across a new year it keeps both, because then
// the year is the interesting part.
function weekSpan(week) {
  const a = (week && week.startLong) || '';
  const b = (week && week.endLong) || '';
  if (!a || !b) return '';
  const yearA = a.slice(a.lastIndexOf(',') + 1).trim();
  const yearB = b.slice(b.lastIndexOf(',') + 1).trim();
  if (yearA && yearA === yearB) return a.slice(0, a.lastIndexOf(',')) + ' to ' + b;
  return a + ' to ' + b;
}

// "Week 4", not "Week 04": the zero is the carousel's, where WEEK 04 is a contract string,
// and it reads as machine text under a title on a page for a person.
function weekNo(week) {
  const raw = week && week.number !== undefined ? String(week.number) : '';
  const n = parseInt(raw, 10);
  return isNaN(n) ? raw : String(n);
}

// THE TICK IS DRAWN, NOT TYPED. A U+2713 glyph is a different shape and weight in every
// system font, and on some Android builds it falls back to an emoji font and arrives green.
function Check() {
  return html`
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="check">
      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor"
        stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}

function Spinner() {
  return html`<div class="wait" role="status" aria-live="polite">Loading your list...</div>`;
}

function Notice({ kind, title, detail, onRetry }) {
  return html`
    <div class="notice ${kind || ''}" role="alert">
      <p class="notice-title">${title}</p>
      ${detail ? html`<p class="notice-detail">${detail}</p>` : null}
      ${onRetry ? html`<button type="button" class="retry" onClick=${onRetry}>Try again</button>` : null}
    </div>`;
}

// A whole item. The row is the tap target, not a small checkbox: a 44 px minimum is the
// difference between ticking your task and ticking the one under it on a phone.
// THE FIRST OPEN ON A NEW PHONE, before there is any list: the shape of one rather than a
// spinner, so the page already looks like itself and the rows fill in where the eye is. A phone
// that has opened the page before shows its last list instead and never sees this.
function Skeleton() {
  return html`
    <div class="skeleton" role="status" aria-live="polite">
      <span class="sr-only">Loading your list</span>
      ${[0, 1, 2, 3, 4].map((i) => html`
        <div key=${i} class="sk-row" aria-hidden="true">
          <span class="sk-box"></span>
          <span class="sk-lines"><span class="sk-line"></span><span class="sk-line short"></span></span>
        </div>`)}
    </div>`;
}

// THE QUOTE OF THE DAY, the same line for every page on the same Manila day, from quotes.js.
// It turns over at Manila midnight, at the next open or refresh.
function Quote() {
  const q = quoteForToday();
  if (!q) return null;
  return html`
    <figure class="quote">
      <blockquote>${q.text}</blockquote>
      <figcaption>${q.who}</figcaption>
    </figure>`;
}

function Item({ item, busy, undoLeft, onToggle, showCommittee, admin }) {
  const done = item.active === false;
  const overdue = item.overdue === true && !done;
  // `fresh` marks the item ticked on this screen inside its undo window: the only one whose
  // circle should move. Without it every earlier tick would pop again on each load.
  const cls = ['item', done ? 'done' : '', overdue ? 'overdue' : '', busy ? 'busy' : '',
    item.pending ? 'pending' : '',
    done && undoLeft > 0 ? 'fresh' : ''].filter(Boolean).join(' ');
  return html`
    <li class=${cls}>
      <button
        type="button"
        class="row"
        aria-pressed=${done}
        disabled=${item.pending === true}
        onClick=${() => onToggle(item)}>
        <span class="box" aria-hidden="true">${done ? html`<${Check} />` : null}</span>
        <span class="text">
          <span class="title">${item.title}</span>
          ${item.remark ? html`<span class="remark">${item.remark}</span>` : null}
          <span class="meta">
            ${showCommittee && item.committee ? html`<span class="office">${item.committee}</span>` : null}
            <span class="due">${item.deadlineLong || item.deadlineText || ''}</span>
            ${overdue ? html`<span class="tag">Overdue</span>` : null}
            ${item.flag ? html`<span class="tag flag">${item.flag}</span>` : null}
          </span>
        </span>
      </button>
      ${busy || item.pending ? html`<span class="saving">Saving...</span>` : null}
      ${done && undoLeft > 0 ? html`
        <button
          type="button"
          class="undo"
          aria-label=${'Undo, ' + undoLeft + ' seconds left'}
          onClick=${() => onToggle(item)}>
          Undo (${undoLeft}s)
        </button>` : null}
      ${!busy && done && undoLeft === 0 ? (admin
        ? html`<button type="button" class="undo" onClick=${() => onToggle(item)}>Reopen</button>`
        : html`<span class="locked">Ticked off. Ask the President to reopen it.</span>`) : null}
    </li>`;
}

// A LIST WITH ITS DONE ROWS FOLDED. What is still open is what the page is for; what is
// done stays one tap away, except a row ticked on this screen inside its undo window, which
// stays in place so the undo is where the thumb already is. The order is the server's:
// deadline first, then ID.
function ItemList({ items, busyFor, undoLeftFor, onToggle, showCommittee, admin, foldKey, folds, setFolds }) {
  const open = items.filter((i) => i.active !== false);
  const done = items.filter((i) => i.active === false);
  const pinned = done.filter((i) => undoLeftFor(i) > 0);
  const folded = done.filter((i) => undoLeftFor(i) === 0);
  const shown = folds[foldKey] === true;
  const rows = open.concat(pinned).concat(shown ? folded : []);
  return html`
    <ul class="list">
      ${rows.map((item, index) => html`
        <${Item}
          key=${item.id || 'row' + index}
          item=${item}
          busy=${busyFor(item)}
          undoLeft=${undoLeftFor(item)}
          showCommittee=${showCommittee}
          admin=${admin}
          onToggle=${onToggle} />`)}
    </ul>
    ${folded.length ? html`
      <button type="button" class="fold" aria-expanded=${shown}
        onClick=${() => setFolds(Object.assign({}, folds, { [foldKey]: !shown }))}>
        ${shown ? 'Hide' : 'Show'} ${folded.length} done
      </button>` : null}`;
}

// ---------------------------------------------------------------------------
// The President's desk: the numbers, the picker, the form
// ---------------------------------------------------------------------------

// Counts a person reads at a glance. Overdue is the server's word (Manila, effective today);
// due this week compares the machine dates the server also sends.
function tally(items, week) {
  const start = week && week.start ? week.start : '';
  const end = week && week.end ? week.end : '';
  let open = 0; let done = 0; let overdue = 0; let thisWeek = 0;
  for (const it of items) {
    if (it.active === false) { done++; continue; }
    open++;
    if (it.overdue) overdue++;
    if (start && end && it.deadline && it.deadline >= start && it.deadline <= end) thisWeek++;
  }
  return { open, done, overdue, thisWeek, total: open + done };
}

function Tiles({ t }) {
  const tile = (n, label, hot) => html`
    <div class=${'tile' + (hot && n > 0 ? ' hot' : '')}>
      <span class="tile-n">${n}</span>
      <span class="tile-l">${label}</span>
    </div>`;
  return html`
    <div class="tiles" role="group" aria-label="Counts">
      ${tile(t.open, 'Open', false)}
      ${tile(t.thisWeek, 'Due this week', false)}
      ${tile(t.overdue, 'Overdue', true)}
      ${tile(t.done, 'Done', false)}
    </div>`;
}

// A person as the picker shows them: the name as typed, then the position; a row with no
// name yet shows its office instead, so the picker never has a blank line.
function personLabel(p) {
  const who = p.name || p.committee || p.key;
  return p.position ? who + ', ' + p.position : who;
}

// Offices compared the way the server compares them: trimmed, case blind.
function sameOffice(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

// The key of the person whose name is on the stored row, so the picker opens on what is
// set rather than on blanks. The store keeps names, not keys, because a name is what prints.
function keyForName(people, name) {
  if (!name) return '';
  const hit = (people || []).filter((p) => p.name === name)[0];
  return hit ? hit.key : '';
}

// Every officer on one screen, with three numbers each, and a tap opens that officer.
function Overview({ people, items, week, onPick }) {
  return html`
    <ul class="overview">
      ${people.map((p) => {
        const t = tally(items.filter((i) => sameOffice(i.committee, p.committee)), week);
        return html`
          <li key=${p.key}>
            <button type="button" class="ov-row" onClick=${() => onPick(p.key)}>
              <span class="ov-who">
                <span class="ov-office">${p.committee}</span>
                ${p.name ? html`<span class="ov-name">${p.name}</span>` : null}
              </span>
              <span class="ov-nums">
                <span class="ov-n"><b>${t.open}</b> open</span>
                <span class=${'ov-n' + (t.overdue ? ' hot' : '')}><b>${t.overdue}</b> overdue</span>
                <span class="ov-n"><b>${t.done}</b> done</span>
              </span>
            </button>
          </li>`;
      })}
    </ul>`;
}

// ADD A DELIVERABLE, from the page. The same row the President would type on the tab: the
// office, the title, the deadline, a remark. The server mints the ID and the defaults, and
// emails the officer before it answers.
// `fixed` is an officer's own form: the office is theirs, so there is nothing to choose, and
// nobody is emailed about a row they typed themselves.
function AddForm({ people, committee, busy, note, onSave, fixed }) {
  const [office, setOffice] = useState(committee || '');
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [remark, setRemark] = useState('');
  useEffect(() => { setOffice(committee || ''); }, [committee]);
  const ready = office !== '' && title.trim() !== '' && deadline !== '';
  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    const kept = { title, deadline, remark };
    setTitle(''); setRemark(''); setDeadline('');
    Promise.resolve(onSave({ committee: office, title: title.trim(), deadline, remark: remark.trim() }))
      .then((ok) => {
        if (ok === false) { setTitle(kept.title); setDeadline(kept.deadline); setRemark(kept.remark); }
      });
  };
  return html`
    <form class="add" onSubmit=${submit}>
      <h3 class="add-title">${fixed ? 'Add your own' : 'Add a deliverable'}</h3>
      ${fixed ? null : html`
        <label class="field">
          <span>For</span>
          <select value=${office} onChange=${(e) => setOffice(e.target.value)}>
            <option value="">Choose a committee or office</option>
            ${people.map((p) => html`<option key=${p.key} value=${p.committee}>${p.committee}</option>`)}
          </select>
        </label>`}
      <label class="field">
        <span>Task</span>
        <input type="text" maxlength="40" value=${title}
          placeholder="Up to 40 characters" onInput=${(e) => setTitle(e.target.value)} />
      </label>
      <div class="field-row">
        <label class="field">
          <span>Deadline</span>
          <input type="date" value=${deadline} onInput=${(e) => setDeadline(e.target.value)} />
        </label>
        <label class="field">
          <span>Remark</span>
          <input type="text" maxlength="30" value=${remark}
            placeholder="Optional, up to 30" onInput=${(e) => setRemark(e.target.value)} />
        </label>
      </div>
      <button type="submit" class="save" disabled=${!ready}>${fixed ? 'Add to my list' : 'Add and notify'}</button>
      ${note ? html`<p class="signoff-note" role="status" aria-live="polite">${note}</p>` : null}
    </form>`;
}

// THE SIGN-OFF, collapsed to one line once it is set. It is the pair printed on the
// carousel's title page; the hourly pass carries last week's pair forward, so this is for the
// week it should differ. It shows its form only when nothing has ever been set.
function SignoffCard({ state, prepared, checked, busy, note, onPrepared, onChecked, onSave }) {
  const so = state.signoff || {};
  const people = state.people || [];
  const [editing, setEditing] = useState(false);
  const ready = prepared !== '' && checked !== '' && !busy;
  const form = html`
    <label class="field">
      <span>Prepared by</span>
      <select value=${prepared} disabled=${busy} onChange=${(e) => onPrepared(e.target.value)}>
        <option value="">Choose a person</option>
        ${people.map((p) => html`<option key=${p.key} value=${p.key}>${personLabel(p)}</option>`)}
      </select>
    </label>
    <label class="field">
      <span>Checked by</span>
      <select value=${checked} disabled=${busy} onChange=${(e) => onChecked(e.target.value)}>
        <option value="">Choose a person</option>
        ${people.map((p) => html`<option key=${p.key} value=${p.key}>${personLabel(p)}</option>`)}
      </select>
    </label>
    <button type="button" class="save" disabled=${!ready} onClick=${() => { onSave(); setEditing(false); }}>
      ${busy ? 'Saving...' : (so.set ? 'Update sign-off' : 'Set sign-off')}
    </button>`;
  return html`
    <section class="signoff" id="signoff" aria-labelledby="signoff-title">
      <h2 class="signoff-title" id="signoff-title">Carousel sign-off</h2>
      ${so.set ? html`
        <p class="signoff-state">
          Prepared by ${so.preparedName}, checked by ${so.checkedName}. It carries forward each week.
          ${' '}<button type="button" class="link-btn" onClick=${() => setEditing(!editing)}>${editing ? 'Keep it' : 'Change'}</button>
        </p>
        ${editing ? form : null}`
        : html`
        <p class="signoff-state hold">Not set. Ready for Canva reads NO until it is set once; after that it carries forward.</p>
        ${form}`}
      ${note ? html`<p class="signoff-note" role="status" aria-live="polite">${note}</p>` : null}
    </section>`;
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Speed: the last list on this phone, and every tap on screen before the server answers
// ---------------------------------------------------------------------------

// THE LAST LIST THIS PHONE SAW, shown the instant the page opens while the fresh one loads, so
// a second open never waits on Apps Script. Kept per link, for twelve hours, and never trusted
// for a write: every tick still goes to the server, which checks it against the Sheet.
const CACHE_PREFIX = 'is9wd.state.';
const CACHE_HOURS = 12;

function readCached(token) {
  if (!token) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + token);
    if (!raw) return null;
    const kept = JSON.parse(raw);
    if (!kept || !kept.state || Date.now() - kept.at > CACHE_HOURS * 3600 * 1000) return null;
    return kept.state;
  } catch (e) {
    return null;
  }
}

function writeCached(token, state) {
  if (!token || !state) return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + token, JSON.stringify({ at: Date.now(), state }));
  } catch (e) {
    // A full or blocked storage only costs the instant first paint.
  }
}

// The server's list with every tap still on its way laid on top, and every add still saving
// placed by its deadline, so an earlier answer arriving never flips back a later tap.
function overlay(data, pending, temps) {
  if (!data || !data.items) return data;
  const ids = Object.keys(pending);
  let items = data.items.filter((i) => String(i.id).indexOf('tmp:') !== 0);
  if (ids.length) {
    items = items.map((it) => (pending[it.id]
      ? Object.assign({}, it, { active: pending[it.id].active, overdue: pending[it.id].active ? it.overdue : false })
      : it));
  }
  if (temps.length) {
    items = items.concat(temps).sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')));
  }
  return Object.assign({}, data, { items });
}

// "Monday, October 5, 2026" for a row that is still saving, the same words the server sends.
function longDay(ymd) {
  const p = String(ymd || '').split('-').map(Number);
  if (p.length !== 3 || p.some((x) => !isFinite(x))) return '';
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function App() {
  const [token] = useState(readToken);
  const [state, setState] = useState(() => readCached(token));
  const [error, setError] = useState(null);
  // WRITES LAND ON SCREEN AT ONCE. A tap flips its row immediately and the save runs behind
  // it, one at a time and in order; `pending` holds the taps still on their way and `temps` the
  // adds, and every answer is shown with both laid on top. A failed save re-reads the Sheet and
  // says why, so the screen never keeps a change the Sheet refused.
  const pending = useRef({});
  const temps = useRef([]);
  const seq = useRef(0);
  const queue = useRef(Promise.resolve());
  const lastLoad = useRef(0);
  const lastTap = useRef({});
  const [fresh, setFresh] = useState(false);
  const [tick, setTick] = useState(0);
  const tickedAt = useRef({});
  const [prepared, setPrepared] = useState('');
  const [checked, setChecked] = useState('');
  const [signBusy, setSignBusy] = useState(false);
  const [signNote, setSignNote] = useState('');
  const [picked, setPicked] = useState('');
  const [folds, setFolds] = useState({});
  const [addBusy, setAddBusy] = useState(false);
  const [addNote, setAddNote] = useState('');

  // Every answer from the server goes through here: kept for the next open, shown with the
  // taps still saving laid on top.
  function accept(data) {
    writeCached(token, data);
    setState(overlay(data, pending.current, temps.current));
    setFresh(true);
  }

  const load = useCallback(async () => {
    setError(null);
    // The first read of the page was already sent by index.html; a bounce or a lost connection
    // there is sent again the normal way.
    let env = await bootState(token);
    const code = env && !env.ok && env.error ? env.error.code : '';
    if (!env || code === 'DOWNGRADED' || code === 'OFFLINE') env = await call('state', token, {});
    lastLoad.current = Date.now();
    if (env.ok) {
      accept(env.data);
    } else {
      setError(env.error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError({ code: 'NO_TOKEN', message: 'This link is missing its code.' });
      return;
    }
    if (!endpointReady()) {
      setError({ code: 'NOT_SET_UP', message: 'This page is not connected yet.' });
      return;
    }
    load();
  }, [token, load]);

  // BACK TO THE TAB, BACK TO THE SHEET. A page left open reads the Sheet again when it is
  // looked at after half a minute away, so a row Ethan typed meanwhile is there without a
  // manual refresh. Never while a tap is still saving.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== 'visible' || !token || !endpointReady()) return;
      if (Date.now() - lastLoad.current < 30000) return;
      if (Object.keys(pending.current).length || temps.current.length) return;
      load();
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [token, load]);

  // One timer for the whole screen rather than one per item, so a list of fifteen does not
  // schedule fifteen intervals. It only runs while something is actually counting down.
  useEffect(() => {
    if (!state) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  // The picker opens on whatever is stored for the week, and follows the server's answer
  // after a save rather than what was clicked, so a rejected save never looks accepted. It
  // follows the STORED pair only: keyed on the two stored names rather than on the whole
  // state, because every tick refreshes the state, and a refresh that wiped a half made
  // choice is how the first save from this page silently did nothing.
  const storedPrepared = state && state.signoff ? state.signoff.preparedName : '';
  const storedChecked = state && state.signoff ? state.signoff.checkedName : '';
  useEffect(() => {
    if (!state || !state.signoff) return;
    setPrepared(keyForName(state.people, storedPrepared));
    setChecked(keyForName(state.people, storedChecked));
  }, [storedPrepared, storedChecked]);

  const undoSeconds = state && state.undoSeconds ? state.undoSeconds : 60;

  // `tick` is read for its side effect: it changes once a second, which is what re-renders
  // the countdown. Without the read this function would be recomputed only when the list
  // changed and the numbers would sit still.
  function undoLeftFor(item) {
    void tick;
    if (item.active !== false) return 0;
    const at = tickedAt.current[item.id];
    if (!at) return 0;                       // ticked before this page was opened
    const gone = Math.floor((Date.now() - at) / 1000);
    const left = undoSeconds - gone;
    return left > 0 ? left : 0;
  }

  function toggle(item) {
    if (!item.id || item.pending) return;
    const now = Date.now();
    if (now - (lastTap.current[item.id] || 0) < 400) return;   // a double tap is one tap
    lastTap.current[item.id] = now;
    const statuses = (state && state.statuses) || [];
    const open = statuses.filter((s) => !s.terminal)[0];
    const done = statuses.filter((s) => s.terminal)[0];
    if (!open || !done) return;
    const makeDone = item.active !== false;
    const target = makeDone ? done.name : open.name;
    const n = ++seq.current;
    const before = tickedAt.current[item.id];
    pending.current[item.id] = { active: !makeDone, n };
    if (makeDone) tickedAt.current[item.id] = now;
    else delete tickedAt.current[item.id];
    setError(null);
    setState((s) => overlay(s, pending.current, temps.current));

    queue.current = queue.current.then(async () => {
      const env = await call('setStatus', token, { id: item.id, status: target },
        { requestId: newRequestId() });
      const mine = pending.current[item.id] && pending.current[item.id].n === n;
      if (mine) delete pending.current[item.id];
      if (env.ok) {
        accept(env.data);                    // the server's own recomputed list, never a guess
        return;
      }
      if (env.error && env.error.code === 'NO_CHANGE') {
        await load();                        // somebody else already did it; re-read the truth
        return;
      }
      if (mine) {
        if (before) tickedAt.current[item.id] = before;
        else delete tickedAt.current[item.id];
      }
      await load();
      setError(env.error);
    }).catch(() => {});
  }

  async function saveSignoff() {
    if (signBusy || !state || !state.people) return;
    const a = state.people.filter((p) => p.key === prepared)[0];
    const b = state.people.filter((p) => p.key === checked)[0];
    if (!a || !b) return;
    setSignBusy(true);
    setSignNote('');
    setError(null);
    const env = await call('setSignoff', token, {
      weekStart: state.week.start,
      preparedName: a.name || a.committee,
      preparedPosition: a.position,
      checkedName: b.name || b.committee,
      checkedPosition: b.position,
    }, { requestId: newRequestId() });
    setSignBusy(false);
    if (env.ok) {
      accept(env.data);
      setSignNote('Saved. The carousel feed reads it now.');
      return;
    }
    setSignNote(env.error && env.error.message ? env.error.message : 'It was not saved.');
  }

  // An add shows in the list at once, marked as saving, and the form is free for the next one.
  // Resolves false when the Sheet refused it, so the form can put the words back.
  function addItem(payload) {
    const tempId = 'tmp:' + (++seq.current);
    const office = payload.committee && payload.committee !== 'mine' ? payload.committee
      : ((state && state.committee && state.committee.name) || '');
    temps.current = temps.current.concat([{
      id: tempId, committee: office, title: payload.title, remark: payload.remark || '',
      deadline: payload.deadline, deadlineLong: longDay(payload.deadline), deadlineText: '',
      status: '', active: true, overdue: false, flag: '', pending: true,
    }]);
    setAddNote('Saving...');
    setError(null);
    setState((s) => overlay(s, pending.current, temps.current));

    return new Promise((resolve) => {
      queue.current = queue.current.then(async () => {
        const env = await call('addItem', token, payload, { requestId: newRequestId() });
        temps.current = temps.current.filter((t) => t.id !== tempId);
        if (env.ok) {
          const last = env.data && env.data.lastAdd ? env.data.lastAdd : null;
          if (env.data && env.data.partial) await load(); else accept(env.data);
          setAddNote(last && last.self ? 'Added to your list, and to the Sheet.'
            : last && last.notified > 0
              ? (last.testMode ? 'Added. Test mode sent the notice to you.' : 'Added and emailed.')
              : 'Added. ' + (last && last.line ? last.line : 'The officer sees it at their next open.'));
          resolve(true);
          return;
        }
        setState((s) => overlay(s, pending.current, temps.current));
        setAddNote(env.error && env.error.message ? env.error.message : 'It was not added.');
        resolve(false);
      }).catch(() => resolve(false));
    });
  }

  if (error && !state) {
    return html`<${Shell}>
      <${Notice}
        kind="stop"
        title=${headline(error)}
        detail=${error.message}
        onRetry=${error.code === 'OFFLINE' || error.code === 'DOWNGRADED' ? load : null} />
    <//>`;
  }
  if (!state) {
    return html`<${Shell}>
      <div class="body">
        <${Quote} />
        <${Skeleton} />
      </div>
    <//>`;
  }

  const admin = state.role === 'admin';
  const items = state.items || [];
  const mineOffice = admin && state.mine ? state.mine.committee : '';
  const myItems = admin ? items.filter((i) => sameOffice(i.committee, mineOffice)) : items;
  const people = admin ? (state.people || []).filter((p) => p.key !== (state.mine || {}).key) : [];
  const everyone = admin ? people.concat(state.mine && state.mine.committee ? [state.mine] : []) : [];
  const pickedPerson = people.filter((p) => p.key === picked)[0] || null;
  const pickedItems = pickedPerson ? items.filter((i) => sameOffice(i.committee, pickedPerson.committee)) : [];
  const all = tally(items, state.week);
  const mineTally = tally(myItems, state.week);
  const left = admin ? all.open : items.filter((i) => i.active !== false).length;
  const done = items.length - left;
  // The office name as typed, not the uppercase headline: the serif reads as a title in title
  // case and as a shout in capitals. The headline stays what the carousel prints.
  const who = admin ? ((state.mine && state.mine.committee) || 'All officers')
    : (state.committee ? (state.committee.name || state.committee.headline) : '');

  const head = html`
    <header class="head">
      <p class="brand"><${Mark} /><span>Investors' Society</span></p>
      ${who ? html`<h1 class="who">${who}</h1>` : null}
      <p class="week">
        Week ${weekNo(state.week)}
        ${weekSpan(state.week) ? ' · ' + weekSpan(state.week) : ''}
        ${admin ? ' · ' + all.open + ' open across ' + (state.people || []).length + ' officers' : ''}
        ${fresh ? null : html`<span class="syncing"> · Updating</span>`}
      </p>
      ${items.length > 0 ? html`
        <div class="progress" aria-hidden="true">
          <span style=${'width:' + Math.round((done / items.length) * 100) + '%'}></span>
        </div>` : null}
    </header>`;

  const busyFor = (item) => !!item.id && Object.prototype.hasOwnProperty.call(pending.current, item.id);
  const listProps = { busyFor, undoLeftFor, onToggle: toggle, admin, folds, setFolds };

  return html`
    <${Shell} head=${head}>
      <div class="body">
        ${error ? html`<${Notice} kind="warn" title=${headline(error)} detail=${error.message} />` : null}

        <${Quote} />

        ${admin && state.signoff && !state.signoff.set ? html`
          <button type="button" class="pointer" onClick=${() => {
            const el = document.getElementById('signoff');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>The carousel sign-off has never been set. Ready for Canva reads NO until it is. Set it below, once.</button>` : null}

        ${admin ? html`
          <section class="segment" aria-labelledby="mine-title">
            <h2 class="segment-title" id="mine-title">Your deliverables</h2>
            ${myItems.length === 0 ? html`
              <p class="segment-empty">Nothing on your own list.</p>` : html`
              <p class="count" role="status" aria-live="polite">${mineTally.open === 0 ? 'All done'
                : mineTally.open + (mineTally.open === 1 ? ' task left' : ' tasks left')}</p>
              <${ItemList} items=${myItems} foldKey="mine" ...${listProps} />`}
          </section>

          <section class="segment" aria-labelledby="officers-title">
            <h2 class="segment-title" id="officers-title">Officers</h2>
            <label class="field">
              <span>Committee or office</span>
              <select value=${picked} onChange=${(e) => setPicked(e.target.value)}>
                <option value="">Everyone at a glance</option>
                ${people.map((p) => html`<option key=${p.key} value=${p.key}>${p.committee}${p.name ? ', ' + p.name : ''}</option>`)}
              </select>
            </label>
            ${pickedPerson ? html`
              <p class="picked-who">${pickedPerson.name || pickedPerson.committee}${pickedPerson.position ? ', ' + pickedPerson.position : ''}</p>
              <${Tiles} t=${tally(pickedItems, state.week)} />
              ${pickedItems.length === 0 ? html`<p class="segment-empty">Nothing on this list yet.</p>`
                : html`<${ItemList} items=${pickedItems} foldKey=${'k:' + picked} ...${listProps} />`}
              <${AddForm} people=${everyone} committee=${pickedPerson.committee} busy=${addBusy} note=${addNote} onSave=${addItem} />`
              : html`
              <${Tiles} t=${tally(items.filter((i) => !sameOffice(i.committee, mineOffice)), state.week)} />
              <${Overview} people=${people} items=${items} week=${state.week} onPick=${setPicked} />
              <${AddForm} people=${everyone} committee="" busy=${addBusy} note=${addNote} onSave=${addItem} />`}
          </section>
        ` : html`
          ${items.length === 0 ? html`
            <div class="empty">
              <p class="empty-title">Nothing on your list this week.</p>
              <p class="empty-detail">The President adds items, and you can add your own below.</p>
            </div>` : html`
            <p class="count" role="status" aria-live="polite">${left === 0 ? 'All done for this week'
              : left + (left === 1 ? ' task left' : ' tasks left')}</p>
            <${ItemList} items=${items} foldKey="mine" showCommittee=${false} ...${listProps} />`}
          <${AddForm} people=${[]} committee=${(state.committee && state.committee.name) || 'mine'} fixed=${true}
            busy=${addBusy} note=${addNote} onSave=${addItem} />
        `}

        ${admin && state.people ? html`
          <${SignoffCard}
            state=${state}
            prepared=${prepared}
            checked=${checked}
            busy=${signBusy}
            note=${signNote}
            onPrepared=${setPrepared}
            onChecked=${setChecked}
            onSave=${saveSignoff} />` : null}
      </div>

      <footer class="foot">
        <p>${admin ? 'You can reopen any item, and add one for anyone; they are emailed as you add it. Officers see changes at their next open.'
          : 'Ticking is yours for ' + undoSeconds + ' seconds. After that, ask the President to reopen it. What you add goes straight into the Sheet.'}</p>
      </footer>
    <//>`;
}

// ONE SHAPE FOR EVERY STATE. The brand row sits on the backdrop above one frosted sheet,
// whether the sheet holds the list, the loading line or an error, so the page never changes
// shape between one state and the next. A screen that has the list passes its own header.
function Shell({ head, children }) {
  return html`
    <main class="wrap">
      ${head || html`
        <header class="head">
          <p class="brand"><${Mark} /><span>Investors' Society</span></p>
        </header>`}
      <div class="sheet">${children}</div>
    </main>`;
}

// A code is for the log, not for a student. Every one of these is a sentence that says what
// happened and what to do about it.
function headline(error) {
  switch (error.code) {
    case 'NO_TOKEN': return 'This link is incomplete';
    case 'NOT_SET_UP': return 'Not connected yet';
    case 'OFFLINE': return 'No connection';
    case 'BAD_TOKEN': return 'This link is not recognised';
    case 'REVOKED': return 'This link has been replaced';
    case 'APP_OFF': return 'The tracker is closed right now';
    case 'OUT_OF_TERM': return 'We are between trimesters';
    case 'RATE_LIMITED': return 'Too many taps at once';
    case 'LOCKED': return 'Somebody else is saving';
    case 'UNDO_EXPIRED': return 'Past the undo window';
    case 'NOT_FOUND': return 'That task is not on your list';
    case 'DOWNGRADED': return 'The sheet was too slow to answer';
    case 'VALIDATION': return 'That could not be saved';
    default: return 'Something went wrong';
  }
}

render(html`<${App} />`, document.getElementById('app'));
