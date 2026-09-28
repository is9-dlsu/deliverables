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
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/plain' };

let items = [
  { id: 'D-0001', title: 'Confirm speaker for Debt Traps Exposed', remark: 'Send final name to Publication',
    deadline: '2026-09-25', deadlineText: 'Overdue: Fri, Sep 25', status: 'Open', active: true, overdue: true, flag: '' },
  { id: 'D-0002', title: 'Send Homecoming sponsorship deck', remark: '',
    deadline: '2026-09-28', deadlineText: 'Due Mon, Sep 28', status: 'Open', active: true, overdue: false, flag: '' },
  { id: 'D-0003', title: 'Follow up on 4 pending sponsor replies', remark: '',
    deadline: '2026-09-29', deadlineText: 'Due Tue, Sep 29', status: 'Accomplished', active: false, overdue: false, flag: '' },
  { id: 'D-0004', title: 'Draft MOA for Homecoming venue partner', remark: 'Attach venue quotation',
    deadline: '2026-10-01', deadlineText: 'Due Thu, Oct 1', status: 'Open', active: true, overdue: false, flag: 'Needs a deadline' }
];

function state() {
  return {
    role: 'member', appOn: true, undoSeconds: 60,
    statuses: [
      { name: 'Open', terminal: false, hex: '#e9ebd4', textHex: '#1C2120' },
      { name: 'Accomplished', terminal: true, hex: '#085040', textHex: '#F8FBFD' }
    ],
    week: { number: '04', start: '2026-09-28', end: '2026-10-04', inTerm: true,
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
      let env;
      if (sent.action === 'setStatus') {
        const it = items.filter((i) => i.id === sent.payload.id)[0];
        if (it) {
          it.status = sent.payload.status;
          it.active = sent.payload.status === 'Open';
          if (it.active) it.overdue = it.deadlineText.indexOf('Overdue') === 0;
          else it.overdue = false;
        }
        env = { v: 1, ok: true, action: 'setStatus', serverTime: now, data: state() };
      } else if (sent.action === 'state') {
        env = { v: 1, ok: true, action: 'state', serverTime: now, data: state() };
      } else {
        env = { v: 1, ok: true, action: 'ping', serverTime: now, data: { appOn: true, transport: 'fetch' } };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(env));
    });
    return;
  }
  let file = req.url.split('?')[0].split('#')[0];
  if (file === '/' || file === '') file = '/index.html';
  if (file === '/endpoint.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end("window.IS9WD_ENDPOINT = 'http://localhost:" + PORT + "/exec';");
    return;
  }
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT) || !fs.existsSync(full)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'text/plain' });
  res.end(fs.readFileSync(full));
}).listen(PORT, () => console.log('officers page on http://localhost:' + PORT));
