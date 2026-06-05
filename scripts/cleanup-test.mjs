// Post-cleanup validation: fresh identity + duplicate protection (tests A-E).
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.MNEMOS_BASE ?? 'http://localhost:3000';
const U = 'manual-test-user';
const WS = 'manual-test-workspace';
const C = { g: '\x1b[32m', r: '\x1b[31m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

const history = [];
async function say(q) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, session_id: crypto.randomUUID(), user_id: U, workspace_id: WS, history: history.slice(-8) }),
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
  history.push({ role: 'user', content: q }); if (o.answer) history.push({ role: 'assistant', content: o.answer });
  return o;
}
async function profile() {
  try { const all = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'profiles.json'), 'utf-8')); return all[`${WS}::${U}`]?.profile ?? null; }
  catch { return null; }
}

let pass = 0, fail = 0;
function check(name, ok, ev) { ok ? pass++ : fail++; console.log(`  ${ok ? C.g + 'PASS' : C.r + 'FAIL'}${C.x}  ${name}\n        ${C.d}${ev}${C.x}`); }
const stored = (r) => !!r.committed || /walrus sync pending|saved to your memory/i.test(r.warning || '');

console.log(`${C.b}\n===== CLEANUP + DUPLICATE PROTECTION (fresh: ${WS}::${U}) =====${C.x}\n`);

const p0 = await profile();
check('fresh start: profile empty', p0 === null, `profile=${JSON.stringify(p0)}`);

let r = await say('my name is Aura');
let p = await profile();
check('A "my name is Aura" → stored once', p?.name === 'Aura' && stored(r) && r.skipped !== 'duplicate memory', `name=${p?.name} committed=${r.committed ? r.committed.slice(0,12)+'…' : (r.warning||'no')} skipped=${r.skipped ?? '-'}`);

r = await say('remember my name is Aura');
check('B "remember my name is Aura" → skipped duplicate', r.skipped === 'duplicate memory' && !r.committed, `skipped=${r.skipped ?? '-'} | "${r.answer}"`);

r = await say('Again, my name is Aura.');
check('B2 "Again, my name is Aura." → skipped duplicate', r.skipped === 'duplicate memory' && !r.committed, `skipped=${r.skipped ?? '-'} | "${r.answer}"`);

r = await say('who am I?');
check('C "who am I?" → recalls Aura, no store', /aura/i.test(r.answer) && !r.committed, `"${r.answer}" committed=${r.committed ?? 'no'}`);

r = await say('Actually my name is Zara');
p = await profile();
check('D "Actually my name is Zara" → name updated to Zara', p?.name === 'Zara' && stored(r), `name=${p?.name} committed=${r.committed ? r.committed.slice(0,12)+'…' : (r.warning||'no')}`);

r = await say("what's my name?");
check('E "what\'s my name?" → Zara (not Aura)', /zara/i.test(r.answer) && !/\baura\b/i.test(r.answer) && !r.committed, `"${r.answer}"`);

console.log(`${C.b}\n──────── ${pass} passed, ${fail} failed ────────${C.x}\n`);
process.exit(fail ? 1 : 0);
