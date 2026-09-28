// The officers' page. One screen, one action: tick an item off, or untick it inside the
// undo window. Nobody signs in, nobody sees anyone else's list, and there is nothing to learn.
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
import { call, newRequestId, endpointReady } from './wire.js';

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
function Mark() {
  return html`
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="is9mark" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#085040" />
          <stop offset="1" stop-color="#724485" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#is9mark)" />
      <g fill="#F8FBFD">
        <rect x="33" y="41" width="9" height="25" />
        <rect x="46" y="47" width="9" height="19" />
        <rect x="59" y="34" width="9" height="32" />
      </g>
    </svg>`;
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
function Item({ item, busy, undoLeft, onToggle, showCommittee }) {
  const done = item.active === false;
  const overdue = item.overdue === true && !done;
  // `fresh` marks the item ticked on this screen inside its undo window: the only one whose
  // circle should move. Without it every earlier tick would pop again on each load.
  const cls = ['item', done ? 'done' : '', overdue ? 'overdue' : '', busy ? 'busy' : '',
    done && undoLeft > 0 ? 'fresh' : ''].filter(Boolean).join(' ');
  return html`
    <li class=${cls}>
      <button
        type="button"
        class="row"
        aria-pressed=${done}
        disabled=${busy}
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
      ${busy ? html`<span class="saving">Saving...</span>` : null}
      ${!busy && done && undoLeft > 0 ? html`
        <button
          type="button"
          class="undo"
          aria-label=${'Undo, ' + undoLeft + ' seconds left'}
          onClick=${() => onToggle(item)}>
          Undo (${undoLeft}s)
        </button>` : null}
      ${!busy && done && undoLeft === 0 ? html`
        <span class="locked">Ticked off. Ask the President to reopen it.</span>` : null}
    </li>`;
}

// ---------------------------------------------------------------------------
// The sign-off, admin only
// ---------------------------------------------------------------------------

// A person as the picker shows them: the name as typed, then the position; a row with no
// name yet shows its office instead, so the picker never has a blank line.
function personLabel(p) {
  const who = p.name || p.committee || p.key;
  return p.position ? who + ', ' + p.position : who;
}

// The key of the person whose name is on the stored row, so the picker opens on what is
// set rather than on blanks. The store keeps names, not keys, because a name is what prints.
function keyForName(people, name) {
  if (!name) return '';
  const hit = (people || []).filter((p) => p.name === name)[0];
  return hit ? hit.key : '';
}

// SPEC section 3: prepared by and checked by change every week, so they are set here, from a
// picker over the fourteen, and Ready for Canva reads NO until this week's pair is set.
function SignoffCard({ state, prepared, checked, busy, note, onPrepared, onChecked, onSave }) {
  const so = state.signoff || {};
  const people = state.people || [];
  const ready = prepared !== '' && checked !== '' && !busy;
  return html`
    <section class="signoff" id="signoff" aria-labelledby="signoff-title">
      <h2 class="signoff-title" id="signoff-title">Sign-off for this week</h2>
      <p class=${'signoff-state' + (so.set ? '' : ' hold')}>
        ${so.set
          ? 'Set: prepared by ' + so.preparedName + ', checked by ' + so.checkedName + '.'
          : 'Not set. Ready for Canva reads NO until it is.'}
      </p>
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
      <button type="button" class="save" disabled=${!ready} onClick=${onSave}>
        ${busy ? 'Saving...' : (so.set ? 'Update sign-off' : 'Set sign-off')}
      </button>
      ${note ? html`<p class="signoff-note" role="status" aria-live="polite">${note}</p>` : null}
    </section>`;
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

function App() {
  const [token] = useState(readToken);
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [tick, setTick] = useState(0);
  const tickedAt = useRef({});
  const [prepared, setPrepared] = useState('');
  const [checked, setChecked] = useState('');
  const [signBusy, setSignBusy] = useState(false);
  const [signNote, setSignNote] = useState('');

  // The picker opens on whatever is stored for the week, and follows the server's answer
  // after a save rather than what was clicked, so a rejected save never looks accepted.
  useEffect(() => {
    if (!state || !state.signoff) return;
    setPrepared(keyForName(state.people, state.signoff.preparedName));
    setChecked(keyForName(state.people, state.signoff.checkedName));
  }, [state]);

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
      setState(env.data);
      setSignNote('Saved. The carousel feed reads it now.');
      return;
    }
    setSignNote(env.error && env.error.message ? env.error.message : 'It was not saved.');
  }

  const load = useCallback(async () => {
    setError(null);
    const env = await call('state', token, {});
    if (env.ok) {
      setState(env.data);
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

  // One timer for the whole screen rather than one per item, so a list of fifteen does not
  // schedule fifteen intervals. It only runs while something is actually counting down.
  useEffect(() => {
    if (!state) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

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

  async function toggle(item) {
    if (busyId) return;                      // one write at a time, so a double tap is one tick
    const statuses = state.statuses || [];
    const open = statuses.filter((s) => !s.terminal)[0];
    const done = statuses.filter((s) => s.terminal)[0];
    if (!open || !done) return;
    const target = item.active === false ? open.name : done.name;

    setBusyId(item.id);
    setError(null);
    const env = await call('setStatus', token, { id: item.id, status: target },
      { requestId: newRequestId() });
    setBusyId('');

    if (env.ok) {
      if (target === done.name) tickedAt.current[item.id] = Date.now();
      else delete tickedAt.current[item.id];
      setState(env.data);                    // the server's own recomputed list, never a guess
      return;
    }
    if (env.error.code === 'NO_CHANGE') {
      load();                                // somebody else already did it; re-read the truth
      return;
    }
    setError(env.error);
  }

  if (error && !state) {
    return html`<${Shell}>
      <${Notice}
        kind="stop"
        title=${headline(error)}
        detail=${error.message}
        onRetry=${error.code === 'OFFLINE' ? load : null} />
    <//>`;
  }
  if (!state) return html`<${Shell}><${Spinner} /><//>`;

  const items = state.items || [];
  const left = items.filter((i) => i.active !== false).length;
  const done = items.length - left;
  // The office name as typed, not the uppercase headline: the serif reads as a title in title
  // case and as a shout in capitals. The headline stays what the carousel prints.
  // The admin link carries no office, and an empty heading is read aloud as exactly that.
  const who = state.role === 'admin' ? 'All officers'
    : (state.committee ? (state.committee.name || state.committee.headline) : '');

  const head = html`
    <header class="head">
      <p class="brand"><${Mark} /><span>Investors' Society</span></p>
      ${who ? html`<h1 class="who">${who}</h1>` : null}
      <p class="week">
        Week ${weekNo(state.week)}
        ${weekSpan(state.week) ? ' · ' + weekSpan(state.week) : ''}
      </p>
      ${items.length > 0 ? html`
        <div class="progress" aria-hidden="true">
          <span style=${'width:' + Math.round((done / items.length) * 100) + '%'}></span>
        </div>` : null}
    </header>`;

  return html`
    <${Shell} head=${head}>
      <div class="body">
        ${error ? html`<${Notice} kind="warn" title=${headline(error)} detail=${error.message} />` : null}

        ${state.role === 'admin' && state.signoff && !state.signoff.set ? html`
          <button type="button" class="pointer" onClick=${() => {
            const el = document.getElementById('signoff');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>Sign-off not set for this week. Ready for Canva reads NO until it is. Set it below.</button>` : null}

        ${items.length === 0 ? html`
          <div class="empty">
            <p class="empty-title">Nothing on your list this week.</p>
            <p class="empty-detail">The President adds items by Saturday evening.</p>
          </div>
        ` : html`
          <p class="count" role="status" aria-live="polite">${left === 0 ? 'All done for this week'
            : left + (left === 1 ? ' task left' : ' tasks left')}</p>
          <ul class="list">
            ${items.map((item) => html`
              <${Item}
                key=${item.id}
                item=${item}
                busy=${busyId === item.id}
                undoLeft=${undoLeftFor(item)}
                showCommittee=${state.role === 'admin'}
                onToggle=${toggle} />`)}
          </ul>
        `}

        ${state.role === 'admin' && state.people ? html`
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
        <p>Ticking is yours for ${undoSeconds} seconds. After that, ask the President to reopen it.</p>
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
    default: return 'Something went wrong';
  }
}

render(html`<${App} />`, document.getElementById('app'));
