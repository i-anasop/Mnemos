// Account / workspace isolation validation against the REAL engine.
// Exercises the same user_id + workspace_id scoping the client sends.
const BASE = process.env.MNEMOS_BASE ?? 'http://localhost:3000';
const C = { g: '\x1b[32m', r: '\x1b[31m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

async function ask(query, user, ws) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: crypto.randomUUID(), user_id: user, workspace_id: ws }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rd = res.body.getReader(); const dec = new TextDecoder();
  let buf = ''; const o = { answer: '', committed: null, skipped: null, warning: null };
  while (true) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const ls = buf.split('\n'); buf = ls.pop();
    for (const l of ls) {
      if (!l.startsWith('data: ')) continue;
      const e = JSON.parse(l.slice(6));
      if (e.event === 'casual_reply') o.answer = e.text;
      if (e.event === 'session_complete' && e.casual?.text) o.answer = e.casual.text;
      if (e.event === 'memory_committed') o.committed = e.blob_id;
      if (e.event === 'memory_skipped') o.skipped = e.reason;
      if (e.event === 'walrus_warning') o.warning = e.message;
    }
  }
  return o;
}

let pass = 0, fail = 0;
const check = (n, ok, ev) => { ok ? pass++ : fail++; console.log(`  ${ok ? C.g + 'PASS' : C.r + 'FAIL'}${C.x}  ${n}\n        ${C.d}${ev}${C.x}`); };
const stored = r => !!r.committed || /walrus sync pending|saved to your memory/i.test(r.warning || '');
const GUEST = 'guest-acct-1';
const WALLET = '0xWALLETacct1111111111111111111111111111111111111111111111111111';
const WSA = 'acct-ws-A';
const WSB = 'acct-ws-B';

console.log(`${C.b}\n===== ACCOUNT / WORKSPACE ISOLATION (live engine) =====${C.x}\n`);

// 1. Guest mode — memory stored under guest id
let r = await ask('my name is Aura', GUEST, WSA);
check('1 guest: "my name is Aura" stored under guest id', stored(r), `committed=${r.committed ? r.committed.slice(0,12)+'…' : (r.warning||'no')}`);
r = await ask('who am I?', GUEST, WSA);
check('1b guest recall in same workspace', /aura/i.test(r.answer), `"${r.answer}"`);

// 2. Workspace isolation — same guest, different workspace
r = await ask('who am I?', GUEST, WSB);
check('2 workspace isolation: WS-B does NOT see WS-A name', !/aura/i.test(r.answer), `"${r.answer}"`);

// 3. User isolation — different user, SAME workspace_id string
r = await ask('who am I?', WALLET, WSA);
check('3 user isolation: wallet user does NOT see guest memory (same ws id)', !/aura/i.test(r.answer), `"${r.answer}"`);
// and the wallet user can store independently
r = await ask('my name is Zara', WALLET, WSA);
r = await ask('who am I?', WALLET, WSA);
check('3b wallet user has its own memory (Zara, not Aura)', /zara/i.test(r.answer) && !/aura/i.test(r.answer), `"${r.answer}"`);
// guest still intact (no cross-contamination back)
r = await ask('who am I?', GUEST, WSA);
check('3c guest memory still intact (Aura)', /aura/i.test(r.answer) && !/zara/i.test(r.answer), `"${r.answer}"`);

// 4. Duplicate protection
r = await ask('my name is Aura', GUEST, WSA);
check('4 duplicate: repeated fact skipped', r.skipped === 'duplicate memory' && !r.committed, `skipped=${r.skipped ?? '-'} | "${r.answer}"`);

console.log(`${C.b}\n──────── ${pass} passed, ${fail} failed ────────${C.x}\n`);
process.exit(fail ? 1 : 0);
