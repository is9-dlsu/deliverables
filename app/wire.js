// THE ONLY PLACE THIS APP CALLS fetch. Everything about the transport that was measured
// rather than assumed lives here, in one file, so it cannot be half remembered somewhere else.
//
// MEASURED ON 2026-09-27, against a real Apps Script web app:
//   · A cross origin POST works ONLY with Content-Type: text/plain.
//   · application/json fails. ANY custom header fails, including Authorization and
//     X-Anything. Both provoke a CORS preflight, and a web app has no doOptions to answer it,
//     so the browser refuses before the request is ever sent.
// So the token travels in the BODY. It may never become a header, and it may never become a
// query parameter either: a URL lands in server logs, in browser history and in whatever the
// officer pastes into a group chat.
//
// EXACTLY ONE HEADER GOES ON THE WIRE. If a future change adds a second, the request stops
// working for everyone at once, and the failure shows up as "Failed to fetch" with no detail,
// which is the least debuggable error a browser produces.

const ENDPOINT_PLACEHOLDER = 'PASTE_THE_EXEC_URL_HERE';

export function endpointUrl() {
  const url = (typeof window !== 'undefined' && window.IS9WD_ENDPOINT) || '';
  return String(url).trim();
}

export function endpointReady() {
  const url = endpointUrl();
  return url !== '' && url !== ENDPOINT_PLACEHOLDER;
}

// A request id per write, so a retry after a dropped connection cannot tick an item twice.
// crypto.randomUUID is not on every browser an officer might carry, so there is a fallback,
// and it is only ever used for de-duplication, never for anything that needs to be
// unguessable.
export function newRequestId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
  } catch (err) {
    // fall through
  }
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

/**
 * One call. Always resolves to an envelope, never throws and never rejects, because every
 * caller would otherwise need the same try/catch and one of them would forget it.
 *
 * A network failure is returned as an OFFLINE envelope shaped exactly like a server error, so
 * the screen has one kind of thing to render rather than two.
 */
export async function call(action, token, payload, opts) {
  const options = opts || {};
  if (!endpointReady()) {
    return offline('This page has not been connected to the sheet yet. Tell Ethan.');
  }
  const body = { v: 1, action, token: token || '', payload: payload || {} };
  if (options.requestId) body.requestId = options.requestId;

  let res;
  try {
    res = await fetch(endpointUrl(), {
      method: 'POST',
      // The one header. Do not add another. See the note at the top of this file.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      credentials: 'omit',
    });
  } catch (err) {
    return offline('No connection. Your tick has not been saved yet.');
  }

  let text = '';
  try {
    text = await res.text();
  } catch (err) {
    return offline('The reply could not be read. Try again in a moment.');
  }

  try {
    const env = JSON.parse(text);
    if (env && typeof env === 'object' && typeof env.ok === 'boolean') {
      // The endpoint's GET handler answered a request that was sent as a POST: somewhere
      // between this page and the sheet the body was dropped, which a signed in desktop
      // Chrome profile has been seen to do and a private window has not. Said in words.
      if (!env.ok && action !== 'ping' && env.error && env.action === 'ping' &&
        /Only ping/.test(String(env.error.message || ''))) {
        return {
          v: 1, ok: false, action, serverTime: env.serverTime || '',
          error: { code: 'DOWNGRADED',
            message: 'Open this link in a private window, or on your phone.' },
        };
      }
      return env;
    }
  } catch (err) {
    // An Apps Script error returns an HTML page rather than JSON. Saying so plainly beats
    // showing a stack trace to a student officer.
  }
  return offline('The sheet answered with something unreadable. Tell Ethan.');
}

function offline(message) {
  return {
    v: 1, ok: false, action: '', serverTime: '',
    error: { code: 'OFFLINE', message },
  };
}
