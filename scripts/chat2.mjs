// Replays the user's 2nd failing conversation WITH history (like the real UI).
const BASE = 'http://localhost:3000';
const WS = 'chat2-fix', U = 'chat2-user';
const history = [];

async function say(q) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, session_id: crypto.randomUUID(), user_id: U, workspace_id: WS, history: history.slice(-8) }),
  });
  const rd = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', ans = '', facts = null, committed = null;
  while (true) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const ls = buf.split('\n'); buf = ls.pop();
    for (const l of ls) {
      if (!l.startsWith('data: ')) continue;
      const e = JSON.parse(l.slice(6));
      if (e.event === 'casual_reply') ans = e.text;
      if (e.event === 'session_complete' && e.casual?.text) ans = e.casual.text;
      if (e.event === 'memory_decision') facts = e.decision?.facts ?? facts;
      if (e.event === 'memory_committed') committed = e.blob_id;
    }
  }
  history.push({ role: 'user', content: q });
  if (ans) history.push({ role: 'assistant', content: ans });
  return { ans, facts, committed };
}

let pass = 0, fail = 0;
async function step(q, check) {
  const r = await say(q);
  const v = check(r); const ok = v === true; ok ? pass++ : fail++;
  console.log(`> "${q}"`);
  console.log(`  facts: ${r.facts ? JSON.stringify(r.facts) : '-'}`);
  console.log(`  Mnemos: "${r.ans}"`);
  console.log(`  ${ok ? 'PASS' : 'FAIL — ' + v}\n`);
}
const has = (s, ...w) => w.every((x) => new RegExp(x, 'i').test(s));

await step('who am i ?', (r) => /don'?t know/i.test(r.ans) ? true : 'should not know yet');
await step('its aura', (r) => r.facts?.name === 'Aura' ? true : `should extract name=Aura from context, got ${JSON.stringify(r.facts)}`);
await step('whats my name ?', (r) => has(r.ans, 'aura') ? true : 'should recall Aura');
await step('what do i do ?', (r) => /don'?t have what you do|tell me/i.test(r.ans) ? true : 'should say it does not know yet');
await step('i do artificial intelligence', (r) => /artificial intelligence/i.test(r.facts?.occupation ?? '') ? true : `should extract occupation, got ${JSON.stringify(r.facts)}`);
await step('who am i and what do i do ?', (r) => has(r.ans, 'aura', 'artificial intelligence') ? true : 'should give name + occupation');
await step('no what do i do ?', (r) => /artificial intelligence/i.test(r.ans) ? true : 'should still answer occupation');

console.log(`RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
