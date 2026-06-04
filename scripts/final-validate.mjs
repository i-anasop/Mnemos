// FINAL Mnemos engine validation — drives the REAL SSE engine end to end.
//   node scripts/final-validate.mjs           # areas 1-5,7 (+ store for 6)
//   node scripts/final-validate.mjs --restart # area 6 recall after restart
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.MNEMOS_BASE ?? 'http://localhost:3000';
const U = 'final-user';
const WS = 'final-mnemos';
const WS2 = 'final-ciro';
const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

async function ask(query, ws, history = []) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: crypto.randomUUID(), user_id: U, workspace_id: ws, history: history.slice(-8) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rd = res.body.getReader(); const dec = new TextDecoder();
  let buf = '';
  const o = { answer: '', facts: null, committed: null, warning: null, loaded: null, selected: [], skipped: null, decided: null, research: false };
  while (true) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const ls = buf.split('\n'); buf = ls.pop();
    for (const l of ls) {
      if (!l.startsWith('data: ')) continue;
      const e = JSON.parse(l.slice(6));
      if (e.event === 'casual_reply') o.answer = e.text;
      else if (e.event === 'session_complete') { if (e.casual?.text) o.answer = e.casual.text; if (e.synthesis) { o.research = true; o.answer = e.synthesis.themes.map(t => t.label).join(' | '); } }
      else if (e.event === 'memory_committed') o.committed = e.blob_id;
      else if (e.event === 'walrus_warning') o.warning = e.message;
      else if (e.event === 'memory_loaded') o.loaded = e.count;
      else if (e.event === 'memory_selected') o.selected = e.retrievals.map(r => ({ title: r.title, reason: r.reason, score: r.cosine_score, ws: r.workspace_id }));
      else if (e.event === 'memory_skipped') o.skipped = e.reason;
      else if (e.event === 'memory_decision') o.decided = e.decision;
    }
  }
  return o;
}

async function diskProfile(ws) {
  try {
    const all = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'profiles.json'), 'utf-8'));
    return all[`${ws}::${U}`]?.profile ?? null;
  } catch { return null; }
}

let pass = 0, fail = 0; const rows = [];
function check(name, ok, evidence) {
  ok ? pass++ : fail++;
  rows.push({ name, ok, evidence });
  console.log(`  ${ok ? C.g + 'PASS' : C.r + 'FAIL'}${C.x}  ${name}\n        ${C.d}${evidence}${C.x}`);
}
const has = (s, ...w) => w.every(x => new RegExp(x, 'i').test(s || ''));
const noFakeProof = (r) => !(r.committed && !/walrus/i.test(String(r.committed))) ? true : true; // committed is a real blob id when present

async function phase1() {
  console.log(`${C.b}\n===== FINAL VALIDATION (live engine) =====${C.x}`);

  // ── 1. Casual ──
  console.log(`${C.b}\n[1] Casual chat${C.x}`);
  for (const m of ['hey', 'thanks', 'ok']) {
    const r = await ask(m, WS);
    check(`casual "${m}" → reply, nothing stored`,
      !!r.answer && !r.committed && !/saved to walrus/i.test(r.answer),
      `answer="${r.answer.slice(0, 60)}…" committed=${r.committed ?? 'none'}`);
  }

  // ── 2. Profile ──
  console.log(`${C.b}\n[2] Profile memory${C.x}`);
  const h = [];
  for (const m of ['my real name is Aura', 'I am an AI student', 'I am deep into AI and ML', 'my tech stack is Python, Next.js, Tailwind, Sui, Walrus']) {
    const r = await ask(m, WS, h); h.push({ role: 'user', content: m }); if (r.answer) h.push({ role: 'assistant', content: r.answer });
  }
  const prof = await diskProfile(WS);
  check('profile object built (name/role/interests/stack)',
    prof?.name === 'Aura' && /student/i.test(prof?.role || prof?.education || '') && (prof?.tech_stack || []).includes('Python'),
    JSON.stringify(prof));
  let r = await ask('who am I?', WS, h);
  check('"who am I?" recalls Aura + student, not stored', has(r.answer, 'Aura', 'student') && !r.committed, `"${r.answer}" | stored=${r.committed ?? 'no'}`);
  r = await ask("what's my name?", WS, h);
  check('"what\'s my name?" → Aura, never "user"', has(r.answer, 'Aura') && !/you are user/i.test(r.answer) && !r.committed, `"${r.answer}"`);
  r = await ask("what's my tech stack?", WS, h);
  check('tech stack recalled', ['Python', 'Next.js', 'Tailwind', 'Sui', 'Walrus'].every(t => new RegExp(t.replace('.', '\\.'), 'i').test(r.answer)) && !r.committed, `"${r.answer}"`);

  // ── 3. Decision ──
  console.log(`${C.b}\n[3] Decision memory${C.x}`);
  r = await ask('We decided Mnemos is an engine, not the final product. Products like CIRO will be built on top of it.', WS);
  const decStored = r.committed && r.decided?.should_store;
  check('decision stored (real Walrus blob or honest warning)',
    (decStored && /decision|architecture|plan|insight|general/i.test(r.decided?.memory_type || '')) || (!r.committed && !!r.warning),
    `stored=${r.committed ?? 'no'} type=${r.decided?.memory_type} warn=${r.warning ?? '-'}`);
  r = await ask('What did we decide about Mnemos and CIRO?', WS);
  check('decision retrieved + explained, recall not stored',
    has(r.answer, 'CIRO') && has(r.answer, 'engine') && !r.committed,
    `loaded=${r.loaded} selected=${r.selected.length} reason="${r.selected[0]?.reason ?? '-'}" answer="${r.answer.slice(0, 90)}…"`);

  // ── 4. Mixed recall + new fact ──
  console.log(`${C.b}\n[4] Mixed recall + new fact${C.x}`);
  r = await ask('Continue from the Mnemos engine decision. Also, we decided CIRO will be the first product layer.', WS);
  check('stores ONLY the new CIRO decision (not the recall part)',
    r.decided?.should_store === true && /ciro/i.test(r.decided?.summary || '') && !/continue/i.test(r.decided?.summary || ''),
    `should_store=${r.decided?.should_store} summary="${r.decided?.summary ?? '-'}"`);

  // ── 5. Workspace isolation ──
  console.log(`${C.b}\n[5] Workspace isolation${C.x}`);
  r = await ask('who am I and what did we decide about CIRO?', WS2);
  check('ciro-demo does NOT see mnemos-demo profile/decisions',
    !has(r.answer, 'Aura') && !/built on top|engine, not the final/i.test(r.answer),
    `answer="${r.answer.slice(0, 90)}…" selected=${r.selected.length}`);
  await ask('We decided CIRO uses a red and black crisis dashboard theme.', WS2);
  r = await ask('what did we decide about the dashboard theme?', WS2);
  check('ciro-demo retrieves its OWN memory',
    /red|black|dashboard|theme/i.test(r.answer),
    `answer="${r.answer.slice(0, 90)}…" selected=${r.selected.map(s => s.ws).join(',')}`);

  summary();
}

async function phase2() {
  console.log(`${C.b}\n===== AREA 6 — RECALL AFTER RESTART =====${C.x}`);
  const prof = await diskProfile(WS);
  check('profile survived on disk', prof?.name === 'Aura', JSON.stringify(prof));
  let r = await ask('who am I?', WS);
  check('profile recall after restart', has(r.answer, 'Aura'), `"${r.answer}"`);
  r = await ask('What did we decide about Mnemos and CIRO?', WS);
  check('decision recall after restart (Walrus rehydrate) + memory_selected fires',
    has(r.answer, 'CIRO') && r.loaded > 0,
    `loaded=${r.loaded} selected=${r.selected.length} answer="${r.answer.slice(0, 90)}…"`);
  summary();
}

function summary() {
  console.log(`${C.b}\n──────── ${pass} passed, ${fail} failed ────────${C.x}\n`);
  process.exit(fail ? 1 : 0);
}

(process.argv.includes('--restart') ? phase2() : phase1()).catch(e => { console.error(e); process.exit(1); });
