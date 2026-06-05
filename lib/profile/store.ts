import { promises as fs } from 'fs';
import path from 'path';
import { walrusStore, walrusFetchJSON } from '@/lib/walrus/client';
import { DEFAULT_WORKSPACE_ID } from '@/lib/workspace';
import type { MemoryUpdate, ProfileState, ProjectFact, TechStack, UserProfile } from '@/types';

/* ──────────────────────────────────────────────────────────────────────────
   Profile Memory Layer — structured, per-(user, workspace) memory.

   Ground truth for identity / projects / decisions / preferences. Recall is
   deterministic (composed from this object), so it never depends on vector
   search or a Walrus read. Persistence: local-authoritative (data/profiles.json
   + cache), mirrored to Walrus (durable, verifiable) with a pointer for
   rehydration if the local store is lost.
   ────────────────────────────────────────────────────────────────────────── */

const PROFILES_PATH = path.join(process.cwd(), 'data', 'profiles.json');
const POINTER_PATH = path.join(process.cwd(), 'data', 'profile-registry.json');

const cache = new Map<string, UserProfile>();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();

const key = (userId: string, workspaceId: string) => `${workspaceId}::${userId}`;

// ── Name validation — NEVER store these (per token, so "User My Actual" fails) ──
const INVALID_NAME_TOKENS = new Set([
  'user', 'me', 'myself', 'i', 'you', 'him', 'her', 'them', 'someone', 'somebody',
  'anyone', 'anybody', 'nobody', 'unknown', 'anonymous', 'anon', 'admin', 'root',
  'test', 'tester', 'guest', 'none', 'null', 'undefined', 'nan', 'human', 'person',
  'bro', 'dude', 'man', 'bot', 'assistant', 'mnemos', 'my', 'your', 'actual', 'real',
  'full', 'legal', 'first', 'name', 'called', 'saying', 'not', 'the', 'a', 'an',
]);

/** Valid only if EVERY token is a plausible name word (no "user", "my", …). */
export function isValidName(raw?: string | null): boolean {
  if (!raw) return false;
  const cleaned = raw.trim().replace(/[.!?,;:]+$/, '');
  if (cleaned.length < 2 || cleaned.length > 40) return false;
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 4) return false;
  for (const t of tokens) {
    const w = t.toLowerCase().replace(/[^a-z'’-]/g, '');
    if (w.length < 1) return false;
    if (INVALID_NAME_TOKENS.has(w)) return false;
    if (!/^[a-z][a-z'’-]*$/.test(w)) return false;
  }
  return true;
}

export function emptyProfile(userId: string, workspaceId: string): UserProfile {
  return {
    user_id: userId,
    workspace_id: workspaceId,
    profile: {
      interests: [], current_focus: [],
      tech_stack: { current_main: [], previous: [] },
      projects: [], decisions: [], preferences: [],
    },
    updated_at: new Date().toISOString(),
    source_blob_ids: [],
  };
}

export function isEmptyProfile(p: UserProfile | null | undefined): boolean {
  const s = p?.profile;
  if (!s) return true;
  return (
    !isValidName(s.name) && !s.role && !s.education && !s.occupation &&
    s.interests.length === 0 && s.current_focus.length === 0 &&
    s.tech_stack.current_main.length === 0 && s.tech_stack.previous.length === 0 &&
    s.projects.length === 0 && s.decisions.length === 0 && s.preferences.length === 0
  );
}

// Backfill missing fields / drop legacy invalid names (so old data still loads).
function normalize(p: UserProfile): UserProfile {
  const s = (p.profile ?? {}) as Partial<ProfileState> & Record<string, unknown>;
  const ts = (s.tech_stack ?? {}) as Partial<TechStack>;
  // Legacy shape had tech_stack as string[] — migrate it to current_main.
  const legacyStack = Array.isArray(s.tech_stack) ? (s.tech_stack as unknown as string[]) : null;
  return {
    ...p,
    profile: {
      name: isValidName(s.name) ? s.name : undefined,
      role: s.role,
      education: s.education,
      occupation: s.occupation,
      interests: s.interests ?? [],
      current_focus: s.current_focus ?? [],
      tech_stack: {
        current_main: legacyStack ?? ts.current_main ?? [],
        previous: ts.previous ?? [],
      },
      projects: s.projects ?? [],
      decisions: s.decisions ?? [],
      preferences: s.preferences ?? [],
    },
    source_blob_ids: p.source_blob_ids ?? [],
  };
}

// ── Disk I/O ─────────────────────────────────────────────────────────────────
async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const disk = JSON.parse(await fs.readFile(PROFILES_PATH, 'utf-8')) as Record<string, UserProfile>;
    for (const [k, v] of Object.entries(disk)) cache.set(k, normalize(v));
  } catch { /* no file yet */ }
  loaded = true;
}

async function flushDisk(): Promise<void> {
  const snapshot: Record<string, UserProfile> = {};
  for (const [k, v] of cache.entries()) snapshot[k] = v;
  writeChain = writeChain.then(async () => {
    try {
      await fs.mkdir(path.dirname(PROFILES_PATH), { recursive: true });
      await fs.writeFile(PROFILES_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch { /* in-memory cache still serves reads */ }
  });
  return writeChain;
}

async function readPointers(): Promise<Record<string, string>> {
  try { return JSON.parse(await fs.readFile(POINTER_PATH, 'utf-8')) as Record<string, string>; }
  catch { return {}; }
}
async function writePointer(userId: string, workspaceId: string, blobId: string): Promise<void> {
  try {
    const reg = await readPointers();
    reg[key(userId, workspaceId)] = blobId;
    await fs.mkdir(path.dirname(POINTER_PATH), { recursive: true });
    await fs.writeFile(POINTER_PATH, JSON.stringify(reg, null, 2), 'utf-8');
  } catch { /* non-fatal */ }
}

// ── Persistence API ───────────────────────────────────────────────────────────
export async function loadProfile(userId: string, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<UserProfile | null> {
  await ensureLoaded();
  const k = key(userId, workspaceId);
  let prof = cache.get(k) ?? null;
  if (!prof) {
    const blobId = (await readPointers())[k];
    if (blobId) {
      try {
        prof = normalize(await walrusFetchJSON<UserProfile>(blobId));
        cache.set(k, prof);
        await flushDisk();
      } catch { /* Walrus unreachable */ }
    }
  }
  return prof;
}

export async function persistProfileLocal(prof: UserProfile): Promise<void> {
  await ensureLoaded();
  cache.set(key(prof.user_id, prof.workspace_id), prof);
  await flushDisk();
}

export async function saveProfile(prof: UserProfile): Promise<{ walrusBlobId?: string }> {
  await persistProfileLocal(prof);
  let walrusBlobId: string | undefined;
  try {
    walrusBlobId = await walrusStore(JSON.stringify(prof));
    if (walrusBlobId) await writePointer(prof.user_id, prof.workspace_id, walrusBlobId);
  } catch { /* local copy persisted; recall still works */ }
  return { walrusBlobId };
}

// ── Merge helpers ──────────────────────────────────────────────────────────────
const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const lc = (s: string) => norm(s).toLowerCase();

function unionList(existing: string[], incoming: string[] = [], cap = 30): string[] {
  const seen = new Set(existing.map(lc));
  const out = [...existing];
  for (const item of incoming) {
    const t = norm(item);
    if (t && !seen.has(lc(t))) { seen.add(lc(t)); out.push(t); }
  }
  return out.slice(0, cap);
}

function mergeTechStack(old: TechStack, u: MemoryUpdate): TechStack {
  let main = [...old.current_main];
  let prev = [...old.previous];

  if (u.tech_stack_set_main?.length) {
    const newMain = unionList([], u.tech_stack_set_main);
    const dropped = main.filter(m => !newMain.some(n => lc(n) === lc(m)));
    prev = unionList(prev, dropped);
    main = newMain;
  }
  if (u.tech_stack_add?.length) {
    main = unionList(main, u.tech_stack_add);
  }
  if (u.tech_stack_remove?.length) {
    for (const r of u.tech_stack_remove) {
      if (main.some(m => lc(m) === lc(r))) prev = unionList(prev, [norm(r)]);
      main = main.filter(m => lc(m) !== lc(r));
    }
  }
  // A tech can't be both current and previous.
  prev = prev.filter(p => !main.some(m => lc(m) === lc(p)));
  return { current_main: main.slice(0, 30), previous: prev.slice(0, 30) };
}

function mergeProjects(existing: ProjectFact[], incoming: ProjectFact[] = []): ProjectFact[] {
  const out = existing.map(p => ({ ...p }));
  for (const p of incoming) {
    const name = norm(p.name || '');
    if (!name) continue;
    const found = out.find(e => lc(e.name) === lc(name));
    if (found) {
      if (p.role) found.role = norm(p.role);
      if (p.context) found.context = norm(p.context);
    } else {
      out.push({ name, role: p.role ? norm(p.role) : undefined, context: p.context ? norm(p.context) : undefined });
    }
  }
  return out.slice(0, 20);
}

/** Applies a structured MemoryUpdate to a profile (pure). */
export function mergeMemoryUpdate(existing: UserProfile, u: MemoryUpdate, sourceBlobId?: string): UserProfile {
  const p = existing.profile;
  const next: ProfileState = {
    name: p.name, role: p.role, education: p.education, occupation: p.occupation,
    interests: [...p.interests], current_focus: [...p.current_focus],
    tech_stack: { current_main: [...p.tech_stack.current_main], previous: [...p.tech_stack.previous] },
    projects: p.projects.map(x => ({ ...x })),
    decisions: [...p.decisions], preferences: [...p.preferences],
  };

  if (isValidName(u.name)) next.name = norm(u.name!);
  if (typeof u.role === 'string' && u.role.trim()) next.role = norm(u.role);
  if (typeof u.education === 'string' && u.education.trim()) next.education = norm(u.education);
  if (typeof u.occupation === 'string' && u.occupation.trim()) next.occupation = norm(u.occupation);
  if (u.interests?.length) next.interests = unionList(next.interests, u.interests);
  if (u.current_focus?.length) next.current_focus = unionList(next.current_focus, u.current_focus);
  if (u.tech_stack_set_main?.length || u.tech_stack_add?.length || u.tech_stack_remove?.length) {
    next.tech_stack = mergeTechStack(next.tech_stack, u);
  }
  if (u.projects?.length) next.projects = mergeProjects(next.projects, u.projects);
  if (u.decisions?.length) next.decisions = unionList(next.decisions, u.decisions, 20);
  if (u.preferences?.length) next.preferences = unionList(next.preferences, u.preferences, 20);

  return {
    ...existing,
    profile: next,
    updated_at: new Date().toISOString(),
    source_blob_ids: sourceBlobId ? unionList(existing.source_blob_ids, [sourceBlobId]) : existing.source_blob_ids,
  };
}

/** True if the update carries at least one durable fact worth storing. */
export function hasMeaningfulUpdate(u: MemoryUpdate): boolean {
  return Boolean(
    isValidName(u.name) || u.role || u.education || u.occupation ||
    u.interests?.length || u.current_focus?.length ||
    u.tech_stack_set_main?.length || u.tech_stack_add?.length || u.tech_stack_remove?.length ||
    u.projects?.length || u.decisions?.length || u.preferences?.length,
  );
}

// ── Natural language ────────────────────────────────────────────────────────
function article(w: string): string { return /^[aeiou]/i.test(w.trim()) ? 'an' : 'a'; }
function naturalList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
function projectPhrase(p: ProjectFact): string {
  const ctx = (p.context || '').replace(/^for\s+/i, '').trim();
  const bits = [p.role, ctx].filter(Boolean);
  return bits.length ? `${p.name} (${bits.join(', ')})` : p.name;
}

/** Deterministic confirmation of what was just stored (no LLM → always right). */
export function confirmMemoryUpdate(u: MemoryUpdate, merged: UserProfile): string {
  const s = merged.profile;
  const parts: string[] = [];
  if (isValidName(u.name)) parts.push(`you're ${s.name}`);
  const roleStr = u.education || u.role || u.occupation;
  if (roleStr) parts.push(`${article(String(roleStr))} ${roleStr}`);
  if (u.interests?.length) parts.push(`into ${naturalList(u.interests)}`);
  if (u.tech_stack_set_main?.length || u.tech_stack_add?.length || u.tech_stack_remove?.length) {
    parts.push(`your main stack is now ${naturalList(s.tech_stack.current_main)}`);
  }
  if (u.projects?.length) parts.push(`you're building ${naturalList(u.projects.map(p => p.name))}`);
  if (u.decisions?.length) parts.push(`the decision: ${u.decisions[0]}`);
  if (u.preferences?.length) parts.push(`your preference: ${u.preferences[0]}`);
  if (parts.length === 0) return `Got it — I'll remember that.`;
  return `Got it — ${naturalList(parts)}. I'll remember that.`;
}

/**
 * Composed recall — answers identity / project / decision / stack questions
 * deterministically from the profile object. Combines categories for compound
 * questions ("who am I, what am I building, what did we decide?"). Never
 * fabricates and never says "user".
 */
export function answerProfileQuery(profile: UserProfile | null, query: string): string {
  if (isEmptyProfile(profile)) {
    return "I don't know yet — tell me your name, or what you'd like me to remember about you.";
  }
  const s = profile!.profile;
  const name = isValidName(s.name) ? s.name : undefined;
  const q = query.toLowerCase();

  const all = /(about me|know about me|remember about me|tell me (everything|all|what)|what do you (know|remember)|who am i|my profile|everything)/.test(q);
  const wantName = all || /\bname\b|who am i|remember me/.test(q);
  const wantRole = all || /\b(role|student|study|studying|occupation|profession|job)\b/.test(q) || /who am i/.test(q);
  const wantFocus = all || /\b(focus|focused|interest|interested|into|working on)\b/.test(q) || /who am i/.test(q);
  const wantStack = all || /\b(tech ?stack|stack|technolog|languages?|tools?)\b/.test(q);
  const wantProjects = all || /\b(build|building|project|projects|working on|making|product)\b/.test(q);
  const wantDecisions = all || /\b(decide|decided|decision|decisions)\b/.test(q);
  const wantPrefs = all || /\b(prefer|preference|preferences|rule|rules)\b/.test(q);

  const out: string[] = [];

  // identity
  const idBits: string[] = [];
  if (wantName && name) idBits.push(name);
  const roleStr = s.education || s.role;
  if (wantRole && (roleStr || s.occupation)) {
    const r = roleStr ? `${article(roleStr)} ${roleStr}` : `working in ${s.occupation}`;
    idBits.push(r);
  }
  if (idBits.length) out.push(`You are ${idBits.join(', ')}.`);
  else if (wantName && !name) out.push(`I don't have your name stored yet.`);

  const focus = wantFocus ? unionList(s.interests, s.current_focus) : [];
  if (focus.length) out.push(`You're focused on ${naturalList(focus)}.`);

  if (wantProjects && s.projects.length) {
    out.push(`You're building ${naturalList(s.projects.map(projectPhrase))}.`);
  }
  if (wantDecisions && s.decisions.length) {
    out.push(`${s.decisions.length === 1 ? 'We decided' : 'Decisions so far:'} ${naturalList(s.decisions)}.`);
  }
  if (wantStack) {
    if (s.tech_stack.current_main.length) {
      out.push(`Your current main tech stack is ${naturalList(s.tech_stack.current_main)}.`);
      if ((all || /\b(previous|old|dropped|before)\b/.test(q)) && s.tech_stack.previous.length) {
        out.push(`Previously: ${naturalList(s.tech_stack.previous)}.`);
      }
    } else if (!all) out.push(`I don't have your tech stack stored yet.`);
  }
  if (wantPrefs && s.preferences.length && all) {
    out.push(`Your preferences: ${naturalList(s.preferences)}.`);
  }

  if (out.length === 0) {
    // Question matched no category we have → fall back to the identity we know.
    if (name) out.push(`You are ${name}${roleStr ? `, ${article(roleStr)} ${roleStr}` : ''}.`);
    if (s.projects.length) out.push(`You're building ${naturalList(s.projects.map(p => p.name))}.`);
  }

  return out.join(' ').trim() ||
    "I don't know yet — tell me your name, or what you'd like me to remember about you.";
}

/** Renders the profile as authoritative context lines for the LLM responder. */
export function profileToContext(profile: UserProfile | null): string | null {
  if (isEmptyProfile(profile)) return null;
  const s = profile!.profile;
  const lines: string[] = [];
  if (isValidName(s.name)) lines.push(`  · name = ${s.name}`);
  if (s.role) lines.push(`  · role = ${s.role}`);
  if (s.education) lines.push(`  · education = ${s.education}`);
  if (s.occupation) lines.push(`  · works in = ${s.occupation}`);
  if (s.interests.length) lines.push(`  · interests = ${s.interests.join(', ')}`);
  if (s.current_focus.length) lines.push(`  · current focus = ${s.current_focus.join(', ')}`);
  if (s.tech_stack.current_main.length) lines.push(`  · main tech stack = ${s.tech_stack.current_main.join(', ')}`);
  if (s.tech_stack.previous.length) lines.push(`  · previous tech = ${s.tech_stack.previous.join(', ')}`);
  for (const p of s.projects) lines.push(`  · project: ${projectPhrase(p)}`);
  for (const d of s.decisions) lines.push(`  · decision: ${d}`);
  for (const pref of s.preferences) lines.push(`  · preference: ${pref}`);
  return lines.length ? `- USER PROFILE (verified, stored):\n${lines.join('\n')}` : null;
}
