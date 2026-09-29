// A throwaway static server plus a FAKE endpoint, so the officers' page can be driven in a
// browser with no deployment, no token and nothing in Drive. It exists to answer one question
// before anything is deployed: does the page render, tick, count down and recover.
//
//   node tools/serve-app.js        then open http://localhost:8123/#<any 26 char token>
//
// It is not part of the app and it is never deployed. The real endpoint is Apps Script.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'app');
const PORT = 8123;
const DELAY = Number(process.env.IS9WD_DELAY_MS || 0) || 0;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/plain' };

// The admin link, for driving the sign-off picker without a deployment. Shaped like a token
// and never issued; it is in the leak scan's allow list for that reason.
const ADMIN_TOKEN = 'zzzzzzzzzzzzzzzzzzzzzzzzzz';
const people = [
  { key: 'K10', name: 'Sample President', position: 'President', committee: 'Office of the President' },
  { key: 'K01', name: 'Sample Officer', position: 'Vice President', committee: 'Partnerships' },
  { key: 'K05', name: '', position: 'Vice President', committee: 'Finance' },
];
let signoff = { weekStart: '2026-09-28', set: false, preparedName: '', preparedPosition: '',
  checkedName: '', checkedPosition: '', setAt: '' };

let items = [
  { id: 'D-0001', committee: 'Partnerships', title: 'Confirm speaker for Debt Traps Exposed', remark: 'Send final name to Publication',
    deadline: '2026-09-25', deadlineText: 'Overdue: Fri, Sep 25', deadlineLong: 'Friday, September 25, 2026', status: 'Open', active: true, overdue: true, flag: '' },
  { id: 'D-0002', committee: 'Partnerships', title: 'Send Homecoming sponsorship deck', remark: '',
    deadline: '2026-09-28', deadlineText: 'Due Mon, Sep 28', deadlineLong: 'Monday, September 28, 2026', status: 'Open', active: true, overdue: false, flag: '' },
  { id: 'D-0003', committee: 'Finance', title: 'Follow up on 4 pending sponsor replies', remark: '',
    deadline: '2026-09-29', deadlineText: 'Due Tue, Sep 29', deadlineLong: 'Tuesday, September 29, 2026', status: 'Accomplished', active: false, overdue: false, flag: '' },
  { id: 'D-0004', committee: 'Partnerships', title: 'Draft MOA for Homecoming venue partner', remark: 'Attach venue quotation',
    deadline: '2026-10-01', deadlineText: 'Due Thu, Oct 1', deadlineLong: 'Thursday, October 1, 2026', status: 'Open', active: true, overdue: false, flag: 'Needs a deadline' },
  { id: 'D-0005', committee: 'Office of the President', title: 'Sign the venue contract', remark: '',
    deadline: '2026-09-30', deadlineText: 'Due Wed, Sep 30', deadlineLong: 'Wednesday, September 30, 2026', status: 'Open', active: true, overdue: false, flag: '' },
  { id: 'D-0006', committee: 'Office of the President', title: 'Brief the adviser', remark: 'Ten minutes, before Friday',
    deadline: '2026-09-26', deadlineText: 'Overdue: Sat, Sep 26', deadlineLong: 'Saturday, September 26, 2026', status: 'Accomplished', active: false, overdue: false, flag: '' }
];

function state(role) {
  const admin = role === 'admin';
  return {
    role: admin ? 'admin' : 'member', appOn: true, undoSeconds: 60,
    people: admin ? people : undefined,
    signoff: admin ? signoff : undefined,
    mine: admin ? { key: 'K10', committee: 'Office of the President', name: 'Sample President', position: 'President' } : undefined,
    statuses: [
      { name: 'Open', terminal: false, hex: '#e9ebd4', textHex: '#1C2120' },
      { name: 'Accomplished', terminal: true, hex: '#085040', textHex: '#F8FBFD' }
    ],
    week: { number: '04', start: '2026-09-28', end: '2026-10-04', inTerm: true,
      startLong: 'September 28, 2026', endLong: 'October 4, 2026',
      ayLabel: 'A.Y. 2026 - 2027', cutoffText: 'Saturday 8 PM before the week starts' },
    committee: { key: 'K01', name: 'Partnerships', headline: 'PARTNERSHIPS',
      vpLine: 'JUAN DELA CRUZ  |  VICE PRESIDENT' },
    items: items
  };
}

http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let sent = {};
      try { sent = JSON.parse(body); } catch (e) { sent = {}; }
      const now = new Date().toISOString();
      const role = sent.token === ADMIN_TOKEN ? 'admin' : 'member';
      let env;
      if (sent.action === 'addItem') {
        const p = sent.payload || {};
        const id = 'D-00' + (10 + items.length);
        const dt = new Date(p.deadline + 'T00:00:00');
        const long = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        items.push({ id, committee: p.committee, title: p.title, remark: p.remark || '', deadline: p.deadline,
          deadlineText: 'Due ' + dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          deadlineLong: long, status: 'Open', active: true, overdue: false, flag: '' });
        env = { v: 1, ok: true, action: 'addItem', serverTime: now, data: state(role) };
      } else if (sent.action === 'setSignoff') {
        const p = sent.payload || {};
        signoff = { weekStart: p.weekStart, set: true, preparedName: p.preparedName,
          preparedPosition: p.preparedPosition, checkedName: p.checkedName,
          checkedPosition: p.checkedPosition, setAt: now };
        env = { v: 1, ok: true, action: 'setSignoff', serverTime: now, data: state(role) };
      } else if (sent.action === 'setStatus') {
        const it = items.filter((i) => i.id === sent.payload.id)[0];
        if (it) {
          it.status = sent.payload.status;
          it.active = sent.payload.status === 'Open';
          if (it.active) it.overdue = it.deadlineText.indexOf('Overdue') === 0;
          else it.overdue = false;
        }
        env = { v: 1, ok: true, action: 'setStatus', serverTime: now, data: state(role) };
      } else if (sent.action === 'state') {
        env = { v: 1, ok: true, action: 'state', serverTime: now, data: state(role) };
      } else {
        env = { v: 1, ok: true, action: 'ping', serverTime: now, data: { appOn: true, transport: 'fetch' } };
      }
      // IS9WD_DELAY_MS slows every answer to what Apps Script really takes, two to five seconds,
      // so the page's instant taps can be watched against a server that is not instant.
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(env));
      }, DELAY);
    });
    return;
  }
  let file = req.url.split('?')[0].split('#')[0];
  if (file === '/' || file === '') file = '/index.html';
  if (file === '/endpoint.js') {
    // THE REAL ENDPOINT WINS WHEN IT EXISTS. app/endpoint.js is gitignored and holds the live
    // /exec address, so when it is present this server hands it straight over and the page
    // talks to the actual workbook. That is how a tick gets tested end to end without anyone
    // pasting a token into a chat window: the token stays in the officer's own browser, in the
    // URL fragment, and never reaches this process at all.
    //
    // With no endpoint.js the fake below is used instead, which is offline development mode
    // and touches nothing in Drive.
    const real = path.join(ROOT, 'endpoint.js');
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    if (fs.existsSync(real)) {
      console.log('serving the LIVE endpoint from app/endpoint.js');
      res.end(fs.readFileSync(real));
    } else {
      console.log('serving the FAKE endpoint on this server');
      res.end("window.IS9WD_ENDPOINT = 'http://localhost:" + PORT + "/exec';");
    }
    return;
  }
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT) || !fs.existsSync(full)) { res.writeHead(404); res.end('no'); return; }
  // No caching, ever: this server exists to show the file as it is on disk right now, and a
  // browser that keeps yesterday's stylesheet defeats the only reason it runs.
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'text/plain',
    'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(full));
}).listen(PORT, () => console.log('officers page on http://localhost:' + PORT));
