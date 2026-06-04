// Live profile-memory validation harness — drives the REAL SSE engine.
// Usage:
//   node scripts/profile-test.mjs            # run all phase-1 tests (1-6, 8)
//   node scripts/profile-test.mjs --restart  # run the post-restart test (7)
//
// Reads data/profiles.json to show the stored profile object before/after.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.MNEMOS_BASE ?? 'http://localhost:3000';
const WS = 'profile-fix-test';
const USER = 'profile-test-user';
const WS_EMPTY = 'empty-workspace';
const PROFILES = path.join(process.cwd(), 'data', 'profiles.json');

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

async function profileFor(ws, user) {
  try {
    const all = JSON.parse(await readFile(PROFILES, 'utf-8'));
    return all[`${ws}::${user}`]?.profile ?? null;
  } catch {
    return null;
  }
}

function fmtProfile(p) {
  if (!p) return '(none)';
  const bits = [];
  if (p.name) bits.push(`name=${p.name}`);
  if (p.role) bits.push(`role=${p.role}`);
  if (p.education) bits.push(`education=${p.education}`);
  if (p.tech_stack?.length) bits.push(`tech_stack=[${p.tech_stack.join(', ')}]`);
  if (p.interests?.length) bits.push(`interests=[${p.interests.join(', ')}]`);
  return bits.length ? `{ ${bits.join(', ')} }` : '(empty)';
}

async function ask(query, workspace = WS) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: crypto.randomUUID(), user_id: USER, workspace_id: workspace }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const out = { answer: '', committed: null, skipped: null, warning: null, loaded: null, facts: null, intent: 'unknown' };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const e = JSON.parse(line.slice(6));
      if (e.event === 'casual_reply') out.answer = e.text;
      else if (e.event === 'session_complete') { if (e.casual?.text) out.answer = e.casual.text; if (e.synthesis) out.intent = 'research'; }
      else if (e.event === 'memory_committed') out.committed = e.blob_id;
      else if (e.event === 'memory_skipped') out.skipped = e.reason;
      else if (e.event === 'walrus_warning') out.warning = e.message;
      else if (e.event === 'memory_loaded') out.loaded = e.count;
      else if (e.event === 'memory_decision') { out.facts = e.decision?.facts ?? null; if (e.decision?.should_store) out.intent = 'store'; }
    }
  }
  if (out.intent === 'unknown') out.intent = out.skipped ? 'recall/skip' : 'reply';
  return out;
}

let pass = 0, fail = 0;
async function run(n, query, workspace, check) {
  const before = await profileFor(workspace, USER);
  const r = await ask(query, workspace);
  const after = await profileFor(workspace, USER);
  const verdict = check(r, after);
  const ok = verdict === true;
  ok ? pass++ : fail++;
  console.log(`${C.b}── Test ${n} ──${C.x}  ${C.d}[${workspace}]${C.x}`);
  console.log(`  input    : ${C.y}"${query}"${C.x}`);
  console.log(`  intent   : ${r.intent}`);
  console.log(`  facts    : ${r.facts ? JSON.stringify(r.facts) : '(none)'}`);
  console.log(`  profile← : ${fmtProfile(before)}`);
  console.log(`  profile→ : ${C.b}${fmtProfile(after)}${C.x}`);
  console.log(`  stored   : ${r.committed ? `${C.g}Walrus ${r.committed.slice(0, 16)}…${C.x}` : r.warning ? `${C.y}${r.warning}${C.x}` : 'no'}`);
  console.log(`  answer   : ${C.b}"${r.answer}"${C.x}`);
  console.log(`  result   : ${ok ? `${C.g}PASS${C.x}` : `${C.r}FAIL — ${verdict}${C.x}`}\n`);
  return r;
}

const has = (s, ...words) => words.every((w) => new RegExp(w, 'i').test(s));
const lacksUser = (s) => !/\byou are user\b|\bname is user\b|\bare user\b/i.test(s);

async function phase1() {
  console.log(`${C.b}\n===== PROFILE MEMORY — PHASE 1 (live engine) =====${C.x}\n`);

  await run(1, 'hey wasup', WS, (r) =>
    (!r.committed ? true : 'should not store on greeting') &&
    (lacksUser(r.answer) ? true : 'said "user"') &&
    (!/not much to recall|conversation so far/i.test(r.answer) ? true : 'used the annoying recall line'));

  await run(2, 'who am i?', WS, (r) =>
    (!r.committed ? true : 'should not store a recall question') &&
    (lacksUser(r.answer) ? true : 'hallucinated "user"') &&
    (/don'?t know|tell me your name/i.test(r.answer) ? true : 'should say it does not know yet'));

  await run(3, "user isnt a name bro my real name is Aura and i am a student of this time dont forget this", WS, (r, p) =>
    (p?.name === 'Aura' ? true : `name should be Aura, got "${p?.name}"`) &&
    (/student/i.test(p?.role ?? '') ? true : `role should be student, got "${p?.role}"`) &&
    (r.committed || r.warning ? true : 'should persist (Walrus or local)') &&
    (has(r.answer, 'Aura') ? true : 'answer should confirm Aura'));

  await run(4, 'who am i?', WS, (r) =>
    (!r.committed ? true : 'should not store a recall question') &&
    (has(r.answer, 'Aura') ? true : 'should recall Aura') &&
    (/student/i.test(r.answer) ? true : 'should mention student'));

  await run(5, 'my tech stack is Python, Next.js, Tailwind, Sui, and Walrus', WS, (r, p) =>
    (['Python', 'Next.js', 'Tailwind', 'Sui', 'Walrus'].every((t) => (p?.tech_stack ?? []).includes(t)) ? true : `tech_stack missing items: got [${p?.tech_stack}]`) &&
    (p?.name === 'Aura' ? true : 'name should still be Aura after merge') &&
    (r.committed || r.warning ? true : 'should persist'));

  await run(6, 'who am i and whats my tech stack?', WS, (r) =>
    (has(r.answer, 'Aura') ? true : 'missing Aura') &&
    (/student/i.test(r.answer) ? true : 'missing student') &&
    (['Python', 'Next.js', 'Tailwind', 'Sui', 'Walrus'].every((t) => new RegExp(t.replace('.', '\\.'), 'i').test(r.answer)) ? true : 'missing tech stack items'));

  await run(8, 'who am i?', WS_EMPTY, (r) =>
    (!has(r.answer, 'Aura') ? true : 'LEAKED Aura into empty-workspace') &&
    (/don'?t know|tell me your name/i.test(r.answer) ? true : 'should not know in empty workspace'));

  summary();
}

async function phase2() {
  console.log(`${C.b}\n===== PROFILE MEMORY — PHASE 2 (after server restart) =====${C.x}\n`);
  await run(7, 'who am i and whats my tech stack?', WS, (r) =>
    (has(r.answer, 'Aura') ? true : 'lost Aura after restart') &&
    (/student/i.test(r.answer) ? true : 'lost student after restart') &&
    (['Python', 'Next.js', 'Tailwind', 'Sui', 'Walrus'].every((t) => new RegExp(t.replace('.', '\\.'), 'i').test(r.answer)) ? true : 'lost tech stack after restart'));
  summary();
}

function summary() {
  console.log(`${C.b}RESULT: ${pass} passed, ${fail} failed${C.x}\n`);
  process.exit(fail ? 1 : 0);
}

(process.argv.includes('--restart') ? phase2() : phase1()).catch((e) => { console.error(e); process.exit(1); });
