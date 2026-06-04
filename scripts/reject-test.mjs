const BASE = 'http://localhost:3000';

async function ask(q, ws) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, session_id: crypto.randomUUID(), user_id: 'reject2', workspace_id: ws }),
  });
  const rd = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', ans = '', committed = null, skipped = null;
  while (true) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const ls = buf.split('\n'); buf = ls.pop();
    for (const l of ls) {
      if (!l.startsWith('data: ')) continue;
      const e = JSON.parse(l.slice(6));
      if (e.event === 'casual_reply') ans = e.text;
      if (e.event === 'session_complete' && e.casual?.text) ans = e.casual.text;
      if (e.event === 'memory_committed') committed = e.blob_id;
      if (e.event === 'memory_skipped') skipped = e.reason;
    }
  }
  return { ans, committed, skipped };
}

const fakeProof = (s) => /(i'?(ve| have)? ?(now )?(stored|saved|remembered)|stored your name|saved your name|name as)/i.test(s);
const echoesUser = (s) => /you are user|name is user|you are me\b/i.test(s);

const tests = ['my name is user', 'my name is me', 'call me myself'];
let ok = true;
for (const q of tests) {
  const r = await ask(q, 'reject2-ws');
  const bad = !!r.committed || fakeProof(r.ans) || echoesUser(r.ans);
  if (bad) ok = false;
  console.log(`"${q}"`);
  console.log(`  committed: ${r.committed ? 'STORED (BAD)' : 'no'} | skipped: ${r.skipped ?? '-'}`);
  console.log(`  reply: "${r.ans}"`);
  console.log(`  -> ${bad ? 'FAIL' : 'PASS'}\n`);
}
console.log('OVERALL:', ok ? 'PASS — no invalid name stored, no fake proof, no "user" echo' : 'FAIL');
process.exit(ok ? 0 : 1);
