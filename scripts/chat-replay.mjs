// Replays the user's exact failing conversation + negative cases, live.
const BASE = 'http://localhost:3000';

async function ask(q, ws, user) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, session_id: crypto.randomUUID(), user_id: user, workspace_id: ws }),
  });
  const rd = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', ans = '', committed = null, facts = null, skipped = null;
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
      if (e.event === 'memory_decision') facts = e.decision?.facts ?? facts;
      if (e.event === 'memory_skipped') skipped = e.reason;
    }
  }
  return { ans, committed, facts, skipped };
}

let pass = 0, fail = 0;
function show(q, r, verdict) {
  const ok = verdict === true; ok ? pass++ : fail++;
  console.log(`> "${q}"`);
  console.log(`  facts: ${r.facts ? JSON.stringify(r.facts) : '-'} | stored: ${r.committed ? r.committed.slice(0, 12) + '…' : (r.skipped ? 'no' : 'no')}`);
  console.log(`  Mnemos: "${r.ans}"`);
  console.log(`  ${ok ? 'PASS' : 'FAIL — ' + verdict}\n`);
}

const WS = 'chat-fix', U = 'chat-user';

console.log('=== Replaying the exact failing chat (fresh workspace) ===\n');
show('hey', await ask('hey', WS, U), true);
show('wasup bro', await ask('wasup bro', WS, U), true);

let r = await ask('You know my name ?', WS, U);
show('You know my name ?', r, /don'?t (know|have)/i.test(r.ans) && !r.committed ? true : 'should say it does not know yet, store nothing');

r = await ask('I am aura btw', WS, U);
show('I am aura btw', r, r.facts?.name === 'Aura' ? true : `should extract name=Aura, got ${JSON.stringify(r.facts)}`);

r = await ask('what was my name ?', WS, U);
show('what was my name ?', r, /aura/i.test(r.ans) && !r.committed ? true : 'should recall Aura, store nothing');

console.log('=== Negative cases (must NOT become a name) ===\n');
for (const [q, why] of [['i am hungry', 'state'], ['im good thanks', 'state'], ['i am a student', 'role']]) {
  r = await ask(q, 'chat-neg', 'neg-user');
  const bad = r.facts?.name;
  show(q, r, bad ? `wrongly extracted name="${bad}"` : true);
}

console.log(`RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
