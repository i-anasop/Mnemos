import { promises as fs } from 'fs';
import path from 'path';
import { walrusStore, walrusFetchJSON } from '@/lib/walrus/client';
import { DEFAULT_WORKSPACE_ID } from '@/lib/workspace';
import type { ProfileFacts, ProfileState, UserProfile } from '@/types';

/* ──────────────────────────────────────────────────────────────────────────
   Profile Memory Layer.

   A deterministic, per-(user_id, workspace_id) identity store. This is the
   ground truth for "who am I / what's my name / my tech stack" — it does NOT
   rely on vector similarity or a Walrus read round-trip (both of which miss
   identity facts). Reads come from a local-authoritative cache + disk file;
   Walrus is the durable, verifiable mirror (with a pointer for rehydration).

   Persistence:
   - data/profiles.json        → authoritative profile objects (survives restart)
   - data/profile-registry.json → ws::user → latest Walrus profile blob id
   - Walrus blob               → durable, content-addressed copy (proof + backup)
   ────────────────────────────────────────────────────────────────────────── */

const PROFILES_PATH = path.join(process.cwd(), 'data', 'profiles.json');
const POINTER_PATH = path.join(process.cwd(), 'data', 'profile-registry.json');

// Authoritative in-memory cache (key → profile). Mirrors data/profiles.json.
const cache = new Map<string, UserProfile>();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();

const key = (userId: string, workspaceId: string) => `${workspaceId}::${userId}`;

// ── Name validation — NEVER store these as a name ───────────────────────────
const INVALID_NAMES = new Set([
  'user', 'me', 'myself', 'i', 'you', 'him', 'her', 'them', 'someone', 'somebody',
  'anyone', 'anybody', 'nobody', 'unknown', 'anonymous', 'anon', 'admin', 'root',
  'test', 'tester', 'guest', 'none', 'null', 'undefined', 'nan', 'n/a', 'na',
  'human', 'person', 'bro', 'dude', 'man', 'bot', 'assistant', 'mnemos',
]);

export function isValidName(raw?: string | null): boolean {
  if (!raw) return false;
  const n = raw.trim().replace(/[.!?,;:]+$/, '').toLowerCase();
  if (n.length < 2 || n.length > 40) return false;
  if (INVALID_NAMES.has(n)) return false;
  if (!/[a-z]/i.test(n)) return false;            // must contain a letter
  if (/^(the|a|an)\b/.test(n)) return false;      // article-led junk
  return true;
}

export function emptyProfile(userId: string, workspaceId: string): UserProfile {
  return {
    user_id: userId,
    workspace_id: workspaceId,
    profile: { interests: [], tech_stack: [], preferences: [], facts: [] },
    updated_at: new Date().toISOString(),
    source_blob_ids: [],
  };
}

/** True if the profile holds no usable identity data. */
export function isEmptyProfile(p: UserProfile | null | undefined): boolean {
  const s = p?.profile;
  if (!s) return true;
  return (
    !isValidName(s.name) && !s.role && !s.education && !s.occupation &&
    s.interests.length === 0 && s.tech_stack.length === 0 &&
    s.preferences.length === 0 && s.facts.length === 0
  );
}

// ── Disk I/O ─────────────────────────────────────────────────────────────────
async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const text = await fs.readFile(PROFILES_PATH, 'utf-8');
    const disk = JSON.parse(text) as Record<string, UserProfile>;
    for (const [k, v] of Object.entries(disk)) cache.set(k, normalize(v));
  } catch {
    // no file yet — start empty
  }
  loaded = true;
}

// Backfill any missing arrays / drop invalid stored names (legacy "user").
function normalize(p: UserProfile): UserProfile {
  const s = p.profile ?? ({} as ProfileState);
  return {
    ...p,
    profile: {
      name: isValidName(s.name) ? s.name : undefined,
      role: s.role,
      education: s.education,
      interests: s.interests ?? [],
      tech_stack: s.tech_stack ?? [],
      preferences: s.preferences ?? [],
      facts: s.facts ?? [],
    },
    source_blob_ids: p.source_blob_ids ?? [],
  };
}

async function flushDisk(): Promise<void> {
  const snapshot: Record<string, UserProfile> = {};
  for (const [k, v] of cache.entries()) snapshot[k] = v;
  // Serialize writes so concurrent saves never interleave / corrupt the file.
  writeChain = writeChain.then(async () => {
    try {
      await fs.mkdir(path.dirname(PROFILES_PATH), { recursive: true });
      await fs.writeFile(PROFILES_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch {
      // Non-fatal: the in-memory cache still serves reads this session.
    }
  });
  return writeChain;
}

async function readPointers(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(POINTER_PATH, 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writePointer(userId: string, workspaceId: string, blobId: string): Promise<void> {
  try {
    const reg = await readPointers();
    reg[key(userId, workspaceId)] = blobId;
    await fs.mkdir(path.dirname(POINTER_PATH), { recursive: true });
    await fs.writeFile(POINTER_PATH, JSON.stringify(reg, null, 2), 'utf-8');
  } catch {
    // Non-fatal.
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Loads the stable profile for (user, workspace). Local-first (cache → disk).
 * If nothing is local but a Walrus pointer exists, rehydrates from Walrus.
 * Returns null only when there is genuinely no profile anywhere.
 */
export async function loadProfile(
  userId: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<UserProfile | null> {
  await ensureLoaded();
  const k = key(userId, workspaceId);

  let prof = cache.get(k) ?? null;

  if (!prof) {
    // Walrus-backed rehydration (e.g. local data/ was wiped but pointer survived).
    const pointers = await readPointers();
    const blobId = pointers[k];
    if (blobId) {
      try {
        const remote = normalize(await walrusFetchJSON<UserProfile>(blobId));
        cache.set(k, remote);
        await flushDisk();
        prof = remote;
      } catch {
        // Walrus unreachable — genuinely nothing to return.
      }
    }
  }

  // Defensive: never surface a legacy invalid name ("user").
  if (prof && prof.profile.name && !isValidName(prof.profile.name)) {
    prof = normalize(prof);
    cache.set(k, prof);
  }
  return prof;
}

/**
 * Persists a profile to the authoritative local store (in-memory cache + disk)
 * ONLY. Instant and reliable — call this BEFORE replying so recall in the very
 * next turn cannot race a slow Walrus write.
 */
export async function persistProfileLocal(prof: UserProfile): Promise<void> {
  await ensureLoaded();
  cache.set(key(prof.user_id, prof.workspace_id), prof);
  await flushDisk();
}

/**
 * Persists a profile locally AND mirrors it to Walrus for durability.
 * Local write is authoritative (the basis for reliable recall); the Walrus
 * push is best-effort and reported via the returned blob id.
 */
export async function saveProfile(prof: UserProfile): Promise<{ walrusBlobId?: string }> {
  await persistProfileLocal(prof);

  let walrusBlobId: string | undefined;
  try {
    walrusBlobId = await walrusStore(JSON.stringify(prof));
    if (walrusBlobId) await writePointer(prof.user_id, prof.workspace_id, walrusBlobId);
  } catch {
    // Walrus down — the local copy is already persisted; recall still works.
  }
  return { walrusBlobId };
}

function uniqMerge(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const out = [...existing];
  for (const item of incoming) {
    const t = item.trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out.slice(0, 24);
}

/** Merges newly-extracted facts into an existing profile (pure). */
export function mergeProfile(
  existing: UserProfile,
  facts: ProfileFacts,
  sourceBlobId?: string,
): UserProfile {
  const next: ProfileState = {
    ...existing.profile,
    interests: [...existing.profile.interests],
    tech_stack: [...existing.profile.tech_stack],
    preferences: [...existing.profile.preferences],
    facts: [...existing.profile.facts],
  };

  // Name: only a VALID name overrides — discards any legacy "user" forever.
  if (isValidName(facts.name)) next.name = facts.name!.trim().replace(/[.!?,;:]+$/, '');
  if (typeof facts.role === 'string' && facts.role.trim()) next.role = facts.role.trim();
  if (typeof facts.education === 'string' && facts.education.trim()) next.education = facts.education.trim();
  if (typeof facts.occupation === 'string' && facts.occupation.trim()) next.occupation = facts.occupation.trim();
  if (facts.interests?.length) next.interests = uniqMerge(next.interests, facts.interests);
  if (facts.tech_stack?.length) next.tech_stack = uniqMerge(next.tech_stack, facts.tech_stack);
  if (typeof facts.current_focus === 'string' && facts.current_focus.trim()) {
    next.facts = uniqMerge(next.facts, [`currently: ${facts.current_focus.trim()}`]);
  }
  // Any extra string keys → durable free-form facts.
  for (const [k, v] of Object.entries(facts)) {
    if (['name', 'role', 'education', 'occupation', 'current_focus', 'interests', 'tech_stack'].includes(k)) continue;
    if (typeof v === 'string' && v.trim()) next.facts = uniqMerge(next.facts, [`${k.replace(/_/g, ' ')}: ${v.trim()}`]);
  }

  return {
    ...existing,
    profile: next,
    updated_at: new Date().toISOString(),
    source_blob_ids: sourceBlobId
      ? uniqMerge(existing.source_blob_ids, [sourceBlobId])
      : existing.source_blob_ids,
  };
}

/** Load → merge facts → persist. Returns the merged profile + whether it changed. */
export async function updateProfileWithFacts(params: {
  user_id: string;
  workspace_id: string;
  facts: ProfileFacts;
  source_blob_id?: string;
}): Promise<{ profile: UserProfile; changed: boolean; walrusBlobId?: string }> {
  const { user_id, workspace_id, facts, source_blob_id } = params;
  const existing = (await loadProfile(user_id, workspace_id)) ?? emptyProfile(user_id, workspace_id);
  const merged = mergeProfile(existing, facts, source_blob_id);
  const changed = JSON.stringify(merged.profile) !== JSON.stringify(existing.profile);
  const { walrusBlobId } = await saveProfile(merged);
  return { profile: merged, changed, walrusBlobId };
}

// ── Deterministic natural-language helpers ──────────────────────────────────
function article(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? 'an' : 'a';
}

function naturalList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** A short confirmation after storing profile facts (no LLM — always correct). */
export function confirmProfileUpdate(facts: ProfileFacts): string {
  const parts: string[] = [];
  if (isValidName(facts.name)) parts.push(`your name is ${facts.name!.trim()}`);
  const roleStr = facts.education || facts.role;
  if (roleStr) parts.push(`you're ${article(roleStr)} ${roleStr}`);
  if (facts.occupation) parts.push(`you work in ${facts.occupation}`);
  if (facts.tech_stack?.length) parts.push(`your tech stack is ${naturalList(facts.tech_stack)}`);
  if (facts.interests?.length) parts.push(`you're into ${naturalList(facts.interests)}`);
  if (facts.current_focus) parts.push(`you're focused on ${facts.current_focus}`);
  if (parts.length === 0) return `Got it — I'll remember that.`;
  return `Got it — ${naturalList(parts)}. I'll remember that.`;
}

/**
 * Deterministically answers an identity/profile question from the stable
 * profile object. Never hallucinates "user"; says plainly when a field is
 * not stored. This is the recall path for who-am-I style questions.
 */
export function answerProfileQuery(profile: UserProfile | null, query: string): string {
  const s = profile?.profile;
  const name = isValidName(s?.name) ? s!.name : undefined;
  const roleStr = s?.education || s?.role;

  if (isEmptyProfile(profile)) {
    return "I don't know yet — tell me your name, or what you'd like me to remember about you.";
  }

  const q = query.toLowerCase();
  const aboutMe = /(about me|know about me|who am i|tell me about (me|myself)|my profile)/.test(q);
  const wantsName = aboutMe || /\bname\b|who am i|remember me|do you know me/.test(q);
  const wantsDoes = aboutMe || /\b(what (do|am) i (do|doing)|do i do|occupation|profession|my job|my work|my field|work (on|in))\b/.test(q);
  const wantsRole = wantsDoes || /\b(role|student|study|studying)\b/.test(q) || /who am i/.test(q);
  const wantsStack = aboutMe || /\b(tech ?stack|stack|technolog|what do i (use|code|build)|languages?|tools?)\b/.test(q);
  const wantsInterests = aboutMe || /\b(interest|interested|into|like|love|passion)\b/.test(q);

  const sentences: string[] = [];

  if (wantsName) {
    if (name) sentences.push(`You are ${name}.`);
    else sentences.push(`I don't have your name stored yet.`);
  }
  if (wantsRole && roleStr) sentences.push(`You told me you're ${article(roleStr)} ${roleStr}.`);
  if (wantsDoes) {
    if (s!.occupation) sentences.push(`You work in ${s!.occupation}.`);
    else if (!roleStr && !aboutMe) sentences.push(`I don't have what you do stored yet — tell me and I'll remember.`);
  }
  if (wantsStack) {
    if (s!.tech_stack.length) sentences.push(`Your tech stack is ${naturalList(s!.tech_stack)}.`);
    else if (!aboutMe) sentences.push(`I don't have your tech stack stored yet.`);
  }
  if (wantsInterests && s!.interests.length) sentences.push(`You're into ${naturalList(s!.interests)}.`);
  if (aboutMe && s!.facts.length) sentences.push(s!.facts.join('; ') + '.');

  // Fallback: question matched nothing specific — give the identity we know.
  if (sentences.length === 0) {
    if (name) sentences.push(`You are ${name}.`);
    if (roleStr) sentences.push(`You're ${article(roleStr)} ${roleStr}.`);
    if (s!.occupation) sentences.push(`You work in ${s!.occupation}.`);
    if (s!.tech_stack.length) sentences.push(`Your tech stack is ${naturalList(s!.tech_stack)}.`);
    if (s!.interests.length) sentences.push(`You're into ${naturalList(s!.interests)}.`);
  }

  return sentences.join(' ').trim() ||
    "I don't know yet — tell me your name, or what you'd like me to remember about you.";
}

/** Renders the profile as authoritative context lines for the LLM responder. */
export function profileToContext(profile: UserProfile | null): string | null {
  const s = profile?.profile;
  if (isEmptyProfile(profile) || !s) return null;
  const lines: string[] = [];
  if (isValidName(s.name)) lines.push(`  · name = ${s.name}`);
  if (s.role) lines.push(`  · role = ${s.role}`);
  if (s.education) lines.push(`  · education = ${s.education}`);
  if (s.occupation) lines.push(`  · works in = ${s.occupation}`);
  if (s.tech_stack.length) lines.push(`  · tech stack = ${s.tech_stack.join(', ')}`);
  if (s.interests.length) lines.push(`  · interests = ${s.interests.join(', ')}`);
  if (s.preferences.length) lines.push(`  · preferences = ${s.preferences.join(', ')}`);
  for (const f of s.facts) lines.push(`  · ${f}`);
  return lines.length ? `- USER PROFILE (verified, stored):\n${lines.join('\n')}` : null;
}
