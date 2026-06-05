// Live intelligence validation — drives the REAL engine with conversation
// history, like the UI. Proves general logic, not exact-prompt scripting.
//   node scripts/intelligence-test.mjs            # tests 1-9 + variations
//   node scripts/intelligence-test.mjs --restart  # test 10 (after restart)
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.MNEMOS_BASE ?? 'http://localhost:3000';
const WS = 'final-profile-intelligence-test';
const U = 'final-profile-user';
const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

async function ask(query, ws, history = []) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: crypto.randomUUID(), user_id: U, workspace_id: ws, history: history.slice(-8) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rd = res.body.getReader(); const dec = new TextDecoder();
  let buf = ''; const o = { answer: '', committed: null, warning: null, skipped: null };
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
      if (e.event === 'walrus_warning') o.warning = e.message;
      if (e.event === 'memory_skipped') o.skipped = e.reason;
    }
  }
  return o;
}

async function profileOf(ws) {
  try {
    const all = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'profiles.json'), 'utf-8'));
    return all[`${ws}::${U}`]?.profile ?? null;
  } catch { return null; }
}

let pass = 0, fail = 0;
function check(name, ok, evidence) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? C.g + 'PASS' : C.r + 'FAIL'}${C.x}  ${name}\n        ${C.d}${evidence}${C.x}`);
}
const has = (s, ...w) => w.every(x => new RegExp(x.replace('.', '\\.'), 'i').test(s || ''));
const lacks = (s, ...w) => w.every(x => !new RegExp(x.replace('.', '\\.'), 'i').test(s || ''));
const lc = a => (a || []).map(s => s.toLowerCase());

// A conversation that carries history forward, like the UI.
function thread(ws) {
  const h = [];
  return async (q) => { const r = await ask(q, ws, h); h.push({ role: 'user', content: q }); if (r.answer) h.push({ role: 'assistant', content: r.answer }); return r; };
}

async function phase1() {
  console.log(`${C.b}\n===== INTELLIGENCE VALIDATION — spec tests 1-9 =====${C.x}\n`);
  const say = thread(WS);
  let r;

  r = await say('hey bro wassup');
  check('1 casual → reply, no store', !!r.answer && !r.committed && lacks(r.answer, 'saved'), `"${r.answer.slice(0, 60)}…" committed=${r.committed ?? 'no'}`);

  r = await say('My real name is Aura. I am an AI student and I am focused on AI, ML, and Web3.');
  let p = await profileOf(WS);
  check('2 multi-fact: name+role+interests', p?.name === 'Aura' && /student/i.test(p?.role || p?.education || '') && ['ai', 'ml', 'web3'].every(i => [...lc(p.interests), ...lc(p.current_focus)].some(x => x.includes(i))),
    JSON.stringify({ name: p?.name, role: p?.role, education: p?.education, interests: p?.interests, focus: p?.current_focus }));

  r = await say('Who am I?');
  check('3 recall: Aura + AI student + AI/ML/Web3', has(r.answer, 'Aura', 'student') && has(r.answer, 'AI') && has(r.answer, 'Web3'), `"${r.answer}"`);

  r = await say('I am not saying my name is user. My actual name is Aura.');
  p = await profileOf(WS);
  check('4 NEGATION: name stays Aura, never "User My Actual"', p?.name === 'Aura' && lacks(r.answer, 'user my actual', 'you are user', 'name is user'),
    `name=${p?.name} | "${r.answer}"`);

  r = await say('My tech stack is Python, Next.js, Tailwind, Sui, Walrus, and Groq.');
  p = await profileOf(WS);
  check('5 stack set: all 6 in current_main', ['python', 'next.js', 'tailwind', 'sui', 'walrus', 'groq'].every(t => lc(p?.tech_stack?.current_main).includes(t)),
    `current_main=${JSON.stringify(p?.tech_stack?.current_main)}`);

  r = await say('Correction: my main tech stack is now Next.js, TypeScript, Tailwind, Sui, and Walrus. Remove Python from main stack.');
  p = await profileOf(WS);
  const main = lc(p?.tech_stack?.current_main);
  check('6 CORRECTION: main=Next/TS/Tailwind/Sui/Walrus, Python+Groq dropped',
    ['next.js', 'typescript', 'tailwind', 'sui', 'walrus'].every(t => main.includes(t)) && !main.includes('python') && !main.includes('groq'),
    `current_main=${JSON.stringify(p?.tech_stack?.current_main)} previous=${JSON.stringify(p?.tech_stack?.previous)}`);

  r = await say('Okay bro remember this carefully: I am Aura, an AI student, building Mnemos as a memory engine for Sui Overflow, and CIRO will be my first real product on top of it. Don’t store random chat, only important facts.');
  p = await profileOf(WS);
  const projNames = lc((p?.projects || []).map(x => x.name));
  check('7 MULTI-FACT: projects Mnemos+CIRO + a decision captured',
    projNames.includes('mnemos') && projNames.includes('ciro') && (p?.decisions?.length > 0),
    `projects=${JSON.stringify(p?.projects)} decisions=${JSON.stringify(p?.decisions)} prefs=${JSON.stringify(p?.preferences)}`);

  r = await say('Who am I, what am I building, and what did we decide about CIRO?');
  check('8 COMPOSED recall: Aura + AI student + Mnemos + Sui Overflow + CIRO',
    has(r.answer, 'Aura') && has(r.answer, 'student') && has(r.answer, 'Mnemos') && has(r.answer, 'CIRO'),
    `"${r.answer}"`);

  r = await say('Tell me only what you actually remember about me. Do not guess anything.');
  check('9 CLEAN dump: no "user", no "currently:" junk, stack not duplicated',
    has(r.answer, 'Aura') && lacks(r.answer, 'user', 'currently:') && (r.answer.match(/next\.js/gi) || []).length <= 1,
    `"${r.answer}"`);

  summary();
}

async function variations() {
  console.log(`${C.b}\n===== GENERALIZATION — variation tests (fresh workspace) =====${C.x}\n`);
  // name variations — each in its own thread/workspace so they don't collide
  for (const [msg, expect] of [
    ['Call me Aura', 'Aura'],
    ['Actually my name is Zara', 'Zara'],
    ['Don’t remember user, my name is Kai', 'Kai'],
  ]) {
    const ws = `var-name-${expect}`;
    const r = await ask(msg, ws);
    const p = await profileOf(ws);
    check(`name variation: "${msg}" → ${expect}`, p?.name === expect, `name=${p?.name} | "${r.answer}"`);
  }

  // study + project + decision phrasings
  const say = thread('var-mix');
  let r = await say('I study artificial intelligence');
  let p = await profileOf('var-mix');
  check('"I study artificial intelligence" → education', /artificial intelligence/i.test(p?.education || p?.role || ''), `education=${p?.education} role=${p?.role}`);

  r = await say("I'm working on Mnemos for Sui Overflow");
  p = await profileOf('var-mix');
  check('"working on Mnemos for Sui Overflow" → project', lc((p?.projects || []).map(x => x.name)).includes('mnemos'), `projects=${JSON.stringify(p?.projects)}`);

  r = await say('CIRO is going to be our first product');
  p = await profileOf('var-mix');
  check('"CIRO is going to be our first product" → decision/project', (p?.decisions?.length > 0) || lc((p?.projects || []).map(x => x.name)).includes('ciro'), `decisions=${JSON.stringify(p?.decisions)} projects=${JSON.stringify((p?.projects||[]).map(x=>x.name))}`);

  // tech update phrasings
  const say2 = thread('var-tech');
  await say2('my tech stack is Python, Groq, and Next.js');
  r = await say2('Update my stack: remove Python, add TypeScript');
  p = await profileOf('var-tech');
  let main = lc(p?.tech_stack?.current_main);
  check('"remove Python, add TypeScript" → updated', main.includes('typescript') && !main.includes('python'), `current_main=${JSON.stringify(p?.tech_stack?.current_main)}`);
  r = await say2('Forget Groq from my main stack');
  p = await profileOf('var-tech');
  main = lc(p?.tech_stack?.current_main);
  check('"Forget Groq" → removed from main', !main.includes('groq'), `current_main=${JSON.stringify(p?.tech_stack?.current_main)} previous=${JSON.stringify(p?.tech_stack?.previous)}`);

  // recall phrasings
  r = await say2('What are my projects?');
  check('"What are my projects?" recognized as recall (no store)', !r.committed, `committed=${r.committed ?? 'no'} | "${r.answer.slice(0,70)}…"`);
  r = await say('What have we decided so far?');
  check('"What have we decided so far?" recognized as recall', !r.committed, `committed=${r.committed ?? 'no'} | "${r.answer.slice(0,70)}…"`);

  summary();
}

async function phase2() {
  console.log(`${C.b}\n===== AFTER RESTART — test 10 =====${C.x}\n`);
  const r = await ask('Who am I and what am I building?', WS);
  check('10 restart recall: Aura + Mnemos', has(r.answer, 'Aura') && has(r.answer, 'Mnemos'), `"${r.answer}"`);
  summary();
}

function summary() { console.log(`${C.b}\n──────── ${pass} passed, ${fail} failed ────────${C.x}\n`); process.exit(fail ? 1 : 0); }

const mode = process.argv[2];
(mode === '--restart' ? phase2() : mode === '--vars' ? variations() : phase1()).catch(e => { console.error(e); process.exit(1); });
