// The officers' page. One screen, one action: tick an item off, or untick it inside the
// undo window. Nobody signs in, nobody sees anyone else's list, and there is nothing to learn.
//
// THE TOKEN IS IN THE URL FRAGMENT, not the query string: a fragment is never sent to a
// server, so it cannot reach an access log, and it is stripped from the address bar on load so
// it does not sit in a screenshot. It is kept in memory only, never in localStorage, because a
// shared phone is a real thing in a student org.

import { h, render } from './lib/preact.module.js';
import { useState, useEffect, useRef, useCallback } from './lib/hooks.module.js';
import htm from './lib/htm.module.js';
import { call, newRequestId, endpointReady } from './wire.js';

const html = htm.bind(h);

// ---------------------------------------------------------------------------
// The token
// ---------------------------------------------------------------------------

function readToken() {
  const raw = (window.location.hash || '').replace(/^#/, '').trim();
  const fromHash = /^[0-9a-hjkmnp-tv-z]{26}$/.test(raw) ? raw : '';
  if (fromHash) {
    // Out of the address bar immediately. replaceState leaves no history entry, so Back does
    // not put it back.
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (err) {
      window.location.hash = '';
    }
  }
  return fromHash;
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

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
function Item({ item, busy, undoLeft, onToggle }) {
  const done = item.active === false;
  const overdue = item.overdue === true && !done;
  const cls = ['item', done ? 'done' : '', overdue ? 'overdue' : '', busy ? 'busy' : ''].
    filter(Boolean).join(' ');
  return html`
    <li class=${cls}>
      <button
        type="button"
        class="row"
        aria-pressed=${done}
        disabled=${busy}
        onClick=${() => onToggle(item)}>
        <span class="box" aria-hidden="true">${done ? '✓' : ''}</span>
        <span class="text">
          <span class="title">${item.title}</span>
          ${item.remark ? html`<span class="remark">${item.remark}</span>` : null}
          <span class="meta">
            <span class="due">${item.deadlineText || ''}</span>
            ${overdue ? html`<span class="tag">Overdue</span>` : null}
            ${item.flag ? html`<span class="tag flag">${item.flag}</span>` : null}
          </span>
        </span>
      </button>
      ${done && undoLeft > 0 ? html`
        <button type="button" class="undo" disabled=${busy} onClick=${() => onToggle(item)}>
          Undo (${undoLeft}s)
        </button>` : null}
      ${done && undoLeft === 0 ? html`
        <span class="locked">Ticked off. Ask Ethan to reopen it.</span>` : null}
    </li>`;
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

  return html`
    <${Shell}>
      <header class="head">
        <p class="who">${state.committee ? state.committee.headline : ''}</p>
        <p class="week">
          Week ${state.week.number}
          ${state.week.start ? ' · ' + state.week.start + ' to ' + state.week.end : ''}
        </p>
      </header>

      ${error ? html`<${Notice} kind="warn" title=${headline(error)} detail=${error.message} />` : null}

      ${items.length === 0 ? html`
        <div class="empty">
          <p class="empty-title">Nothing on your list this week.</p>
          <p class="empty-detail">Ethan adds items by Saturday evening.</p>
        </div>
      ` : html`
        <p class="count">${left === 0 ? 'All done for this week.'
          : left + (left === 1 ? ' task left' : ' tasks left')}</p>
        <ul class="list">
          ${items.map((item) => html`
            <${Item}
              key=${item.id}
              item=${item}
              busy=${busyId === item.id}
              undoLeft=${undoLeftFor(item)}
              onToggle=${toggle} />`)}
        </ul>
      `}

      <footer class="foot">
        <p>Ticking is yours for ${undoSeconds} seconds. After that, ask Ethan to reopen it.</p>
      </footer>
    <//>`;
}

function Shell({ children }) {
  return html`<main class="wrap">${children}</main>`;
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
