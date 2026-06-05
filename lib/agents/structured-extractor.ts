import { z } from 'zod';
import { getProvider } from '@/lib/llm';
import { isValidName } from '@/lib/profile/store';
import type { MemoryUpdate } from '@/types';

/* ──────────────────────────────────────────────────────────────────────────
   Structured memory extraction.

   Hybrid by design:
   - DETERMINISTIC for the two highest-stakes operations — the personal NAME
     (with negation handling, so "not … name is user. My actual name is Aura"
     yields Aura) and TECH-STACK corrections ("remove Python", "stack is now …").
   - LLM for everything regex is bad at — multiple facts in one sentence,
     projects, decisions, preferences, and natural phrasing variety.
   The two are merged; deterministic wins on name + tech, so those can never be
   corrupted by an LLM mistake.
   ────────────────────────────────────────────────────────────────────────── */

// ── Small shared helpers ─────────────────────────────────────────────────────
const NON_NAME_WORD = /^(a|an|the|not|just|really|very|so|too|also|now|here|there|deep|deeply|into|user|me|myself|i|im|my|your|actual|real|full|legal|first|name|called|saying|student|developer|engineer|designer|researcher|founder|builder|analyst|scientist|programmer|teacher|writer|consultant|freelancer|architect|guy|girl|man|woman|person|human|no|yes|yeah|nope|hi|hey|hello|bye|thanks|idk|hungry|tired|good|fine|ok|okay|great|busy|working|learning|studying|trying|feeling|going|doing|building|making)$/i;
const NAME_STOP = /^(and|but|&|or|who|i|im|a|an|the|is|am|are|was|were|of|for|to|so|because|since|now|here|there|bro|dude|man|btw|though|lol|ok|okay|yeah|anyway|please|not)$/i;

function titleCase(t: string): string { return t.length ? t[0].toUpperCase() + t.slice(1) : t; }

function cleanList(raw: string): string[] {
  return raw
    .replace(/[.!?]+$/, '')
    .split(/\s*,\s*|\s+and\s+|\s*\/\s*|\s*&\s*|\s*\+\s*/i)
    .map(s => s.trim().replace(/[,;:]+$/, '').replace(/^(?:and|a|an|the|now|using|use|to|from)\s+/i, '').trim())
    .filter(s => s.length > 0 && s.length < 40 && !/^(remove|add|forget|drop|delete|update|stack|main|my|the)$/i.test(s))
    .slice(0, 15);
}

const QUESTION_WORDS = /\b(what|which|how|why|when|where|who|should|could|would|can|do|does|build|make|suggest|recommend|tell)\b/i;
const looksLikeQuestion = (s: string) => QUESTION_WORDS.test(s);

// ── Deterministic NAME (negation + clause aware) ─────────────────────────────
const NEGATOR = /\b(not|never|dont|don't|isn'?t|ain'?t|aren'?t|wasn'?t|no)\b|n't\b/i;

function nameFromClause(clause: string): string | undefined {
  const patterns = [
    /\bmy\s+(?:real|full|actual|legal|first)?\s*name(?:'s| is|s)?\s+(.+)/i,
    /\bname(?:'s| is)\s+(.+)/i,
    /\bcall me\s+(.+)/i,
    /\bi(?:'m| am)\s+called\s+(.+)/i,
  ];
  let raw: string | undefined;
  for (const p of patterns) { const m = clause.match(p); if (m) { raw = m[1]; break; } }
  if (!raw) {
    // "I am Aura" — only when the name is the predicate (terminal / not "deep into").
    const m = clause.match(/\b(?:i'?m|i\s+am)\s+([A-Za-z][A-Za-z'’-]{1,19})\b(.*)$/i);
    if (m && !NON_NAME_WORD.test(m[1])) {
      const rest = m[2].trim().toLowerCase();
      if (!/^(into|in|on|at|with|about|for|to|of|from|like|as|by|than)\b/.test(rest)) raw = m[1];
    }
  }
  if (!raw) return undefined;

  const name: string[] = [];
  for (const tok of raw.trim().split(/\s+/)) {
    const clean = tok.replace(/[.!?,;:]+$/, '');
    if (!clean || NAME_STOP.test(clean) || NON_NAME_WORD.test(clean)) break;
    if (!/^[A-Za-z][A-Za-z'’-]*$/.test(clean)) break;
    name.push(titleCase(clean));
    if (name.length >= 3) break;
  }
  const candidate = name.join(' ').trim();
  return isValidName(candidate) ? candidate : undefined;
}

/** The user's name, taking the LAST non-negated valid name phrase. */
export function deterministicName(text: string): string | undefined {
  const clauses = text.split(/[.!?;,]+/).map(c => c.trim()).filter(Boolean);
  let last: string | undefined;
  for (const c of clauses) {
    if (NEGATOR.test(c)) continue;          // skip "not saying my name is user"
    const n = nameFromClause(c);
    if (n) last = n;                         // keep the most recent valid one
  }
  return last;
}

// ── Deterministic TECH STACK ops ─────────────────────────────────────────────
function deterministicTech(text: string): Pick<MemoryUpdate, 'tech_stack_set_main' | 'tech_stack_add' | 'tech_stack_remove'> {
  const out: Pick<MemoryUpdate, 'tech_stack_set_main' | 'tech_stack_add' | 'tech_stack_remove'> = {};

  // Capture the list but keep in-word dots (Next.js) — stop only at a
  // sentence-ending period (followed by space/end), not "Next.js".
  const setMatch = text.match(/\b(?:main\s+)?(?:tech\s*)?stack\s*(?:is\s+now|is|:|=|now)\s+(.+?)(?:[.!?](?:\s|$)|\n|$)/i)
    || text.match(/\bnow\s+(?:using|use|on)\s+(.+?)(?:[.!?](?:\s|$)|\n|$)/i);
  if (setMatch) {
    const val = setMatch[1].trim();
    // "stack: remove Python, add TS" is an op list, not a full replacement.
    if (!/^(remove|add|forget|drop|delete|update)\b/i.test(val) && !looksLikeQuestion(val)) {
      const list = cleanList(val);
      if (list.length) out.tech_stack_set_main = list;
    }
  }

  const removes: string[] = [];
  for (const m of text.matchAll(/\b(?:remove|forget|drop|delete)\s+([A-Za-z0-9.+#/\- ]+?)(?:\s+from\b|[.,;:!?\n]|\band\b|$)/gi)) {
    removes.push(...cleanList(m[1]));
  }
  if (removes.length) out.tech_stack_remove = removes;

  const adds: string[] = [];
  for (const m of text.matchAll(/\badd\s+([A-Za-z0-9.+#/\- ]+?)(?:\s+to\b|[.,;:!?\n]|\bremove\b|$)/gi)) {
    adds.push(...cleanList(m[1]));
  }
  if (adds.length) out.tech_stack_add = adds;

  return out;
}

// ── Deterministic DECISIONS — clear commitment patterns ──────────────────────
function deterministicDecisions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\b(?:we|i)\s+(?:decided|agreed|chose|concluded)\s+(?:that\s+|to\s+)?([^.!?\n]{4,140})/gi)) {
    out.push(m[1].trim());
  }
  // "CIRO will be our first product", "X is going to be the Y" — proper-noun subject.
  for (const m of text.matchAll(/\b([A-Z][A-Za-z0-9.]{1,30})\s+(?:will|is going to|is gonna|shall|would)\s+be\s+([^.!?\n]{2,120})/g)) {
    out.push(`${m[1]} will be ${m[2].trim()}`);
  }
  return out.map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 3).slice(0, 6);
}

// ── Deterministic PROJECTS — "building X", "working on X" (proper-noun name) ──
function deterministicProjects(text: string): { name: string; role?: string; context?: string }[] {
  const out: { name: string; role?: string; context?: string }[] = [];
  const re = /\b(?:building|build|working on|work on|made|making|creating|developing|develop)\s+([A-Z][A-Za-z0-9.+-]{1,30})\b(?:\s+(?:as\s+(?:an?\s+)?|for\s+|on\s+)([^.,;:!?\n]{2,50}))?/gi;
  for (const m of text.matchAll(re)) {
    const name = m[1].trim();
    let role: string | undefined, context: string | undefined;
    if (m[2]) {
      const parts = m[2].trim().split(/\s+for\s+/i);
      role = parts[0]?.replace(/^(a|an|the)\s+/i, '').trim() || undefined;
      context = parts[1]?.trim();
    }
    out.push({ name, role, context });
  }
  return out;
}

// ── Deterministic role / education / interests (LLM-independent fallback) ─────
function deterministicBasics(text: string): Pick<MemoryUpdate, 'role' | 'education' | 'interests' | 'current_focus'> {
  const out: Pick<MemoryUpdate, 'role' | 'education' | 'interests' | 'current_focus'> = {};
  const roleMatch = text.match(/\bi(?:'m| am)\s+(?:an?\s+)?((?:[a-z][\w-]*\s+){0,2}(?:student|developer|engineer|designer|researcher|founder|builder|analyst|scientist|programmer|teacher|writer|consultant|freelancer|architect))\b/i);
  if (roleMatch) {
    const role = roleMatch[1].trim().replace(/\s+/g, ' ').replace(/^(a|an)\s+/i, '');
    out.role = role;
    if (/\bstudent\b/i.test(role) && /\s/.test(role)) out.education = role;
  }
  const study = text.match(/\bi(?:'m| am)?\s*(?:study|studying|major in|majoring in)\s+([^.,;:!?\n]{2,40})/i);
  if (study) { out.education = study[1].trim(); if (!out.role) out.role = 'student'; }

  const interest = text.match(/\b(?:deep(?:ly)? into|interested in|love|enjoy|passionate about|focused on|focus on)\s+([^.\n]{2,80})/i);
  if (interest && !looksLikeQuestion(interest[1])) {
    const list = cleanList(interest[1]);
    if (list.length) out.interests = list;
  }
  return out;
}

// ── LLM structured extraction ────────────────────────────────────────────────
const LLMSchema = z.object({
  name: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  interests: z.array(z.string()).optional(),
  current_focus: z.array(z.string()).optional(),
  tech_stack_set_main: z.array(z.string()).optional(),
  tech_stack_add: z.array(z.string()).optional(),
  tech_stack_remove: z.array(z.string()).optional(),
  projects: z.array(z.object({
    name: z.string(), role: z.string().nullable().optional(), context: z.string().nullable().optional(),
  })).optional(),
  decisions: z.array(z.string()).optional(),
  preferences: z.array(z.string()).optional(),
  is_recall_question: z.boolean().optional(),
});

const SYSTEM = `You are Mnemos's memory extraction engine. From the user's latest message, extract durable, important facts to remember for a workspace. Return ONLY JSON, no markdown.

Extract (use [] or null when absent — never invent):
- name: the user's personal name if stated. Honor NEGATION and CORRECTIONS: if they say a name is NOT theirs ("not user", "don't remember user"), do not use it — use the corrected/actual name. Never use generic words (user, me, myself, unknown) as a name.
- role: role / occupation / education status ("AI student", "developer").
- education: field of study if stated.
- occupation: what they do / their field ("artificial intelligence", "fintech").
- interests: topics they are interested in / into / love.
- current_focus: what they are currently focused on / learning.
- tech_stack_set_main: if they DECLARE or fully CORRECT their (main) tech stack to a specific list ("my tech stack is …", "main stack is now …"), the COMPLETE new list.
- tech_stack_add: technologies to add.
- tech_stack_remove: technologies to remove / forget / drop.
- projects: things they are building / working on, each {name, role (what it is or their role), context (purpose or event)}.
- decisions: explicit decisions ("we decided X", "X will be Y", "X is going to be our Y").
- preferences: durable rules / preferences ("only store important facts", "always …").
- is_recall_question: true if the message is ASKING you to recall/answer (a question), not stating new facts.

Rules:
- Extract MULTIPLE facts from one message — never stop after the first.
- Only durable, important facts. Ignore greetings, filler, and transient states ("I'm hungry").
- Prefer set_main/remove over add when the user is correcting their stack.

JSON shape:
{"name":string|null,"role":string|null,"education":string|null,"occupation":string|null,"interests":string[],"current_focus":string[],"tech_stack_set_main":string[],"tech_stack_add":string[],"tech_stack_remove":string[],"projects":[{"name":string,"role":string|null,"context":string|null}],"decisions":string[],"preferences":string[],"is_recall_question":boolean}`;

async function llmExtract(message: string): Promise<MemoryUpdate | null> {
  try {
    const provider = getProvider();
    const res = await provider.call({
      system: SYSTEM,
      messages: [{ role: 'user', content: `Message:\n"""${message}"""\n\nExtract the JSON.` }],
      max_tokens: 600,
      temperature: 0,
      json_mode: true,
    });
    const cleaned = res.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = LLMSchema.parse(JSON.parse(cleaned));
    return {
      ...parsed,
      projects: parsed.projects?.map(p => ({ name: p.name, role: p.role ?? undefined, context: p.context ?? undefined })),
    } as MemoryUpdate;
  } catch {
    return null;
  }
}

function uniq(a: string[] = [], b: string[] = []): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const x of [...a, ...b]) { const t = x.trim(); const k = t.toLowerCase(); if (t && !seen.has(k)) { seen.add(k); out.push(t); } }
  return out;
}

/**
 * Extracts a structured MemoryUpdate from a message. Deterministic name + tech
 * always win; the LLM adds projects/decisions/preferences and fills gaps.
 */
export async function extractMemoryUpdate(message: string): Promise<MemoryUpdate> {
  const detName = deterministicName(message);
  const detTech = deterministicTech(message);
  const detBasics = deterministicBasics(message);
  const detDecisions = deterministicDecisions(message);
  const detProjects = deterministicProjects(message);
  const llm = await llmExtract(message);

  // LLM projects are richer; deterministic only fills in ones the LLM missed.
  const llmProjects = llm?.projects ?? [];
  const llmProjNames = new Set(llmProjects.map(p => p.name.toLowerCase()));
  const projects = [...llmProjects, ...detProjects.filter(p => !llmProjNames.has(p.name.toLowerCase()))];

  const hasDetTech = Boolean(detTech.tech_stack_set_main || detTech.tech_stack_add || detTech.tech_stack_remove);

  const update: MemoryUpdate = {
    // Name: deterministic first (handles negation); else a VALID llm name.
    name: detName ?? (isValidName(llm?.name) ? llm!.name! : undefined),
    role: detBasics.role ?? (llm?.role || undefined),
    education: detBasics.education ?? (llm?.education || undefined),
    occupation: llm?.occupation || undefined,
    interests: uniq(detBasics.interests, llm?.interests),
    current_focus: uniq(detBasics.current_focus, llm?.current_focus),
    // Tech: deterministic ops win (correction math is exact); else the LLM's.
    tech_stack_set_main: hasDetTech ? detTech.tech_stack_set_main : llm?.tech_stack_set_main,
    tech_stack_add: hasDetTech ? detTech.tech_stack_add : llm?.tech_stack_add,
    tech_stack_remove: hasDetTech ? detTech.tech_stack_remove : llm?.tech_stack_remove,
    projects: projects.length ? projects : undefined,
    decisions: uniq(detDecisions, llm?.decisions),
    preferences: llm?.preferences,
    is_recall_question: llm?.is_recall_question,
  };
  if (update.decisions && update.decisions.length === 0) delete update.decisions;

  // Strip empties so hasMeaningfulUpdate is accurate.
  if (update.interests && update.interests.length === 0) delete update.interests;
  if (update.current_focus && update.current_focus.length === 0) delete update.current_focus;
  return update;
}
