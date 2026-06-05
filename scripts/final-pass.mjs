// FINAL Mnemos validation — drives the REAL engine across the 8 areas.
//   node scripts/final-pass.mjs            # areas 1-6 (+ store for 7)
//   node scripts/final-pass.mjs --restart  # area 7 (after server restart)
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.MNEMOS_BASE ?? 'http://localhost:3000';
const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

// Stable test identities (isolated from the user's browser session).
const GUEST = 'final-guest-001';
const WALLET = '0xWALLETfinal000000000000000000000000000000000000000000000000000a';
const A1 = 'chat-A1';   // guest chat 1
const A2 = 'chat-A2';   // guest chat 2 (isolation)

const hist = {};
async function say(q, user, ws) {
  const k = `${user}:${ws}`;
  hist[k] = hist[k] || [];
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, session_id: crypto.randomUUID(), user_id: user, workspace_id: ws, history: hist[k].slice(-8) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rd = res.body.getReader(); const dec = new TextDecoder();
  let buf = ''; const o = { answer: '', committed: null, skipped: null, warning: null, loaded: 0, selected: 0, facts: null };
  while (true) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const ls = buf.split('\n'); buf = ls.pop();
    for (const l of ls) {
      if (!l.startsWith('data: ')) continue;
      const e = JSON.parse(l.slice(6));
      if (e.event === 'casual_reply') o.answer = e.text;
      else if (e.event === 'session_complete' && e.casual?.text) o.answer = e.casual.text;
      else if (e.event === 'memory_committed') o.committed = e.blob_id;
      else if (e.event === 'memory_skipped') o.skipped = e.reason;
      else if (e.event === 'walrus_warning') o.warning = e.message;
      else if (e.event === 'memory_loaded') o.loaded = e.count;
      else if (e.event === 'memory_selected') o.selected = e.retrievals.length;
      else if (e.event === 'memory_decision') o.facts = e.decision?.facts ?? o.facts;
    }
  }
  hist[k].push({ role: 'user', content: q }); if (o.answer) hist[k].push({ role: 'assistant', content: o.answer });
  return o;
}
async function profile(user, ws) {
  try { const all = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'profiles.json'), 'utf-8')); return all[`${ws}::${user}`]?.profile ?? null; }
  catch { return null; }
}

let pass = 0, fail = 0;
const check = (n, ok, ev) => { ok ? pass++ : fail++; console.log(`  ${ok ? C.g + 'PASS' : C.r + 'FAIL'}${C.x}  ${n}\n        ${C.d}${ev}${C.x}`); };
const has = (s, ...w) => w.every(x => new RegExp(x.replace('.', '\\.'), 'i').test(s || ''));
const stored = r => !!r.committed || /walrus sync pending|saved to your memory/i.test(r.warning || '');
const lc = a => (a || []).map(s => s.toLowerCase());

async function phase1() {
  console.log(`${C.b}\n===== FINAL PASS — areas 1-6 (live) =====${C.x}`);

  // 1 + 3. Account identity + basic memory
  console.log(`${C.b}\n[1/3] Identity + basic memory${C.x}`);
  let r = await say('my name is Aura. I am an AI student focused on AI, ML, and Web3.', GUEST, A1);
  let p = await profile(GUEST, A1);
  check('guest stores profile under guest id', stored(r) && p?.name === 'Aura', `name=${p?.name} stored=${r.committed ? r.committed.slice(0,10)+'…' : (r.warning||'no')}`);
  r = await say('Who am I?', GUEST, A1);
  check('basic recall: Aura + AI student + AI/ML/Web3, no "user"', has(r.answer, 'Aura', 'student') && has(r.answer, 'AI') && has(r.answer, 'Web3') && !/you are user/i.test(r.answer) && !r.committed, `"${r.answer}"`);

  // 1. user isolation — wallet user, same workspace id string
  r = await say('Who am I?', WALLET, A1);
  check('user isolation: wallet user does NOT see guest memory', !/aura/i.test(r.answer), `"${r.answer}"`);

  // 2. workspace isolation — same guest, different chat
  console.log(`${C.b}\n[2] Workspace isolation${C.x}`);
  r = await say('Who am I?', GUEST, A2);
  check('workspace isolation: chat A2 does NOT see chat A1 memory', !/aura/i.test(r.answer), `"${r.answer}"`);

  // 4. Decision memory
  console.log(`${C.b}\n[4] Decision memory${C.x}`);
  r = await say('We decided Mnemos is the engine and CIRO will be the first real product layer built on top of it.', GUEST, A1);
  p = await profile(GUEST, A1);
  check('decision captured', (p?.decisions?.length > 0) || lc((p?.projects||[]).map(x=>x.name)).includes('ciro'), `decisions=${JSON.stringify(p?.decisions)} projects=${JSON.stringify((p?.projects||[]).map(x=>x.name))}`);
  r = await say('What did we decide about Mnemos and CIRO?', GUEST, A1);
  check('decision recall (Mnemos + CIRO), recall not stored', has(r.answer, 'Mnemos') && has(r.answer, 'CIRO') && !r.committed, `loaded=${r.loaded} selected=${r.selected} "${r.answer.slice(0,110)}…"`);

  // 5. Correction handling
  console.log(`${C.b}\n[5] Correction handling${C.x}`);
  await say('My tech stack is Python, Next.js, Tailwind, Sui, Walrus, and Groq.', GUEST, A1);
  await say('Correction: my main tech stack is now Next.js, TypeScript, Tailwind, Sui, and Walrus. Remove Python from main stack.', GUEST, A1);
  p = await profile(GUEST, A1);
  const main = lc(p?.tech_stack?.current_main);
  check('correction: current_main = Next/TS/Tailwind/Sui/Walrus; Python+Groq dropped',
    ['next.js','typescript','tailwind','sui','walrus'].every(t => main.includes(t)) && !main.includes('python') && !main.includes('groq'),
    `current_main=${JSON.stringify(p?.tech_stack?.current_main)} previous=${JSON.stringify(p?.tech_stack?.previous)}`);
  r = await say('What is my current main tech stack?', GUEST, A1);
  check('current stack recall clean (no Python/Groq, no dupes)',
    has(r.answer, 'Next.js', 'TypeScript', 'Tailwind', 'Sui', 'Walrus') && !/python|groq/i.test(r.answer),
    `"${r.answer}"`);

  // 6. Casual + duplicate
  console.log(`${C.b}\n[6] Casual + duplicate filtering${C.x}`);
  r = await say('hey', GUEST, A1);
  check('casual "hey" not stored', !r.committed && !/saved/i.test(r.answer), `committed=${r.committed??'no'} "${r.answer.slice(0,50)}…"`);
  r = await say('thanks', GUEST, A1);
  check('casual "thanks" not stored', !r.committed, `committed=${r.committed??'no'}`);
  r = await say('my name is Aura', GUEST, A1);
  check('duplicate fact skipped (no re-store, no fake proof)', r.skipped === 'duplicate memory' && !r.committed, `skipped=${r.skipped??'-'} "${r.answer}"`);

  summary();
}

async function phase2() {
  console.log(`${C.b}\n===== AREA 7 — persistence after restart =====${C.x}`);
  const p = await profile(GUEST, A1);
  check('profile survived on disk', p?.name === 'Aura', `name=${p?.name}`);
  const r = await say('Who am I and what did we decide?', GUEST, A1);
  check('recall after restart: Aura + Mnemos/CIRO decision', has(r.answer, 'Aura') && has(r.answer, 'CIRO'), `loaded=${r.loaded} "${r.answer.slice(0,140)}…"`);
  summary();
}

function summary() { console.log(`${C.b}\n──────── ${pass} passed, ${fail} failed ────────${C.x}\n`); process.exit(fail ? 1 : 0); }

(process.argv.includes('--restart') ? phase2() : phase1()).catch(e => { console.error(e); process.exit(1); });
