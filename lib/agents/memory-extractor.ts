import { z } from 'zod';
import { getProvider } from '@/lib/llm';
import { isValidName } from '@/lib/profile/store';
import type { MemoryDecision, MemoryType, ProfileFacts, SynthesisDocument } from '@/types';

/* ──────────────────────────────────────────────────────────────────────────
   Memory extraction / decision layer.

   Two responsibilities:
   1. triageMessage()  — fast, no-LLM classification of the *user message*:
        is it casual small-talk (ignore) or substantive (run the engine)?
   2. decideMemory()   — after a substantive synthesis, an LLM decides whether
        the result is worth persisting and how to label it.
   ────────────────────────────────────────────────────────────────────────── */

const IMPORTANCE_THRESHOLD = Number(process.env.MNEMOS_IMPORTANCE_THRESHOLD ?? 0.5);

const CASUAL_PATTERNS = [
  /^(hi|hii+|hey+|hello|yo|sup|wassup|what'?s up)\b/i,
  /^(thanks?|thank you|ty|thx|cheers|nice|cool|great|awesome|ok(ay)?|k|got it|sure|yes|no|yep|nope)\b[.! ]*$/i,
  /^(good (morning|afternoon|evening|night))\b/i,
  /^(how are you|how'?s it going|how do you do)\b/i,
  /^(bye|goodbye|see ya|later|gn|good night)\b/i,
  /^(lol|lmao|haha+|👍|🙏|😊)\b/i,
];

export interface Triage {
  mode: 'casual' | 'conversational' | 'research';
  reason: string;
}

// Explicit deep-research / analysis intent → run the multi-agent pipeline.
const RESEARCH_INTENT = /\b(research|analy[sz]e?|analysis|investigat\w*|deep[\s-]?dive|compare|comparison|evaluate|assessment|strateg\w*|in[\s-]?depth|comprehensive|report on|study|breakdown|pros and cons|risks? of|implications? of|frameworks? for|landscape of)\b/i;

/**
 * Fast heuristic router. Three lanes:
 *  - casual:        greetings / acknowledgements → quick reply, no memory, no store
 *  - conversational: normal chat, meta/personal questions, follow-ups → memory-aware
 *                    natural reply (NOT the research pipeline)
 *  - research:      explicit research/analysis tasks → full multi-agent pipeline
 */
export function triageMessage(message: string): Triage {
  const text = message.trim();
  const words = text.split(/\s+/).filter(Boolean);

  if (text.length < 2 || words.length === 0) {
    return { mode: 'casual', reason: 'Empty or trivial input.' };
  }

  for (const re of CASUAL_PATTERNS) {
    if (re.test(text)) return { mode: 'casual', reason: 'Casual greeting or acknowledgement.' };
  }

  // Explicit research intent, and enough substance to be worth the pipeline.
  if (RESEARCH_INTENT.test(text) && words.length >= 4) {
    return { mode: 'research', reason: 'Explicit research / analysis request.' };
  }

  // Everything else is a normal conversation turn — answered intelligently with
  // memory, like a real assistant.
  return { mode: 'conversational', reason: 'Conversational turn — reply with memory.' };
}

const DecisionSchema = z.object({
  should_store: z.boolean(),
  memory_type: z.enum([
    'profile_fact', 'decision', 'architecture', 'research', 'preference', 'plan',
    'insight', 'summary', 'constraint', 'incident', 'general',
  ]).optional(),
  importance: z.number().min(0).max(1).optional(),
  summary: z.string().optional(),
  reason: z.string(),
  tags: z.array(z.string()).optional(),
});

const DECISION_SYSTEM = `You are Mnemos's memory curator. You decide what is worth remembering long-term in a workspace-based AI memory engine.

STORE only high-value, reusable knowledge: decisions, architecture choices, research findings, project direction, user preferences, plans, constraints, conclusions, incident summaries, insights future agents should reuse.

DO NOT store: greetings, small talk, acknowledgements, vague or low-value chatter, or anything a future agent would not benefit from.

Respond with ONLY valid JSON, no markdown:
{
  "should_store": true|false,
  "memory_type": "decision|architecture|research|preference|plan|insight|summary|constraint|incident|general",
  "importance": 0.0-1.0,
  "summary": "one or two sentences capturing the durable knowledge",
  "reason": "why store or skip",
  "tags": ["lowercase", "keywords"]
}
If should_store is false, memory_type/importance/summary/tags may be omitted.`;

/**
 * Decides whether a synthesized result is worth persisting to Walrus.
 * Returns a structured MemoryDecision; never throws (falls back to a safe default).
 */
export async function decideMemory(params: {
  query: string;
  synthesis: SynthesisDocument;
}): Promise<MemoryDecision> {
  const { query, synthesis } = params;
  const provider = getProvider();

  const themeText = synthesis.themes.map((t) => `- ${t.label}`).join('\n');
  const userContent = `User request:\n"${query}"\n\nSynthesized result:\nThemes:\n${themeText}\nConfidence: ${(synthesis.confidence * 100).toFixed(0)}%\nOpen questions: ${synthesis.knowledge_gaps.slice(0, 3).join('; ') || 'none'}\n\nDecide if this is worth remembering.`;

  try {
    const response = await provider.call({
      system: DECISION_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 400,
      temperature: 0,
      json_mode: true,
    });

    const cleaned = response.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;
    const decision = DecisionSchema.parse(parsed);

    // Enforce the importance threshold even if the model says "store".
    if (decision.should_store && (decision.importance ?? 0) < IMPORTANCE_THRESHOLD) {
      return {
        should_store: false,
        reason: `Below importance threshold (${((decision.importance ?? 0) * 100).toFixed(0)}% < ${(IMPORTANCE_THRESHOLD * 100).toFixed(0)}%).`,
      };
    }
    return decision;
  } catch {
    // Conservative fallback: store only if the synthesis is reasonably confident.
    const store = synthesis.confidence >= 0.7 && synthesis.themes.length > 0;
    return store
      ? {
          should_store: true,
          memory_type: inferType(query),
          importance: synthesis.confidence,
          summary: synthesis.synthesis_goal.replace(/^Synthesize findings on:\s*/i, ''),
          reason: 'Heuristic fallback: confident synthesis with themes.',
          tags: keywordTags(query),
        }
      : { should_store: false, reason: 'Heuristic fallback: low-confidence or empty synthesis.' };
  }
}

const MSG_DECISION_SYSTEM = `You are Mnemos's memory curator. A user is chatting with the assistant. Decide whether THIS user message contains NEW durable knowledge the user is asserting, worth remembering long-term in a workspace memory engine.

STORE only when the user STATES something new: decisions, architecture choices, project direction, preferences ("I want…", "always/never…", "my name is…", "we use…"), constraints, plans, conclusions, or important new facts.

NEVER STORE retrieval requests — these ask Mnemos to USE memory, they do not add memory:
- recall questions: "What did we decide…?", "What was our architecture decision?", "What did I say about X?"
- continuation prompts: "Continue from the earlier decision.", "Based on previous memory, what next?"
- summary requests: "Summarize what you remember.", "Remind me what we discussed."
Also never store greetings, small talk, acknowledgements, or vague chatter.

MIXED messages: if a message both references prior context AND states something new, store ONLY the new assertion. Set the summary to the NEW knowledge only, ignoring the recall part.
Example: "Continue from the earlier architecture decision. Also, we decided to add workspace templates later." → store ONLY "We decided to add workspace templates later."

Respond with ONLY valid JSON, no markdown:
{
  "should_store": true|false,
  "memory_type": "decision|architecture|research|preference|plan|insight|summary|constraint|incident|general",
  "importance": 0.0-1.0,
  "summary": "one or two sentences capturing ONLY the new durable knowledge, written so a future session understands it",
  "reason": "why store or skip",
  "tags": ["lowercase", "keywords"]
}
If should_store is false, omit the optional fields.`;

// Deterministic guard: a message that is ONLY a recall/continuation/summary
// request carries no new knowledge. Catches the common cases before the LLM,
// but stays conservative — if the message also contains an assertion (e.g.
// "we decided…", "my preference is…"), it is NOT treated as recall-only.
const RECALL_OPENERS = /^(what|which|when|where|who|how|did|do|does|can you|could you|please|remind|tell me|summar[iy]|recall|continue|based on|use the|use our|use my|go on|carry on|pick up)\b/i;
const ASSERTION_SIGNAL = /\b(we (decided|chose|agreed|will|are|use|need|want|should)|i (decided|chose|prefer|want|like|use|need|am|will)|my (name|preference|goal)|our (decision|plan|goal|preference|direction)|let'?s (use|go with|do)|the (decision|plan|architecture|direction) is|is to)\b/i;

function isRecallOnly(message: string): boolean {
  const text = message.trim();
  const isQuestion = text.endsWith('?');
  const looksRecall = RECALL_OPENERS.test(text);
  const hasAssertion = ASSERTION_SIGNAL.test(text);
  // Recall-only = (a question OR a recall/continuation opener) AND no new assertion.
  return (isQuestion || looksRecall) && !hasAssertion;
}

// Identity / profile questions → answered from the Profile Memory Layer, never
// from fuzzy vector search. "who am I", "what's my name", "my tech stack", …
const PROFILE_QUERY = /\b(who\s*(?:am|m)\s*i|what'?s my name|what is my name|do you (?:know|remember) (?:my name|me)|what do you know about me|tell me about (?:me|myself)|what'?s my (?:tech ?stack|stack|role|job|profession)|what am i (?:studying|working on|into|doing)|what are my (?:interests|skills|technolog\w*)|my profile|about me)\b/i;

/** True if the message is asking the engine to recall the user's identity/profile. */
export function isProfileQuery(message: string): boolean {
  return PROFILE_QUERY.test(message.trim());
}

// An explicit attempt to DECLARE a name ("my name is X", "call me X"). Requires
// the "is/'s/called" introducer so it never matches the question "what is my
// name". Used to reject invalid names deterministically (no LLM hallucination).
const NAME_INTRO = /\b(?:my\s+(?:real\s+|full\s+|actual\s+|legal\s+|first\s+)?name(?:'s| is)|call me\b|i(?:'m| am)\s+called)\b/i;

/** True if the message tries to set a name (valid or not). */
export function attemptedNameIntro(message: string): boolean {
  return NAME_INTRO.test(message.trim());
}

/* ──────────────────────────────────────────────────────────────────────────
   Deterministic profile-fact extraction.

   Names and tech terms embed as near-noise, and an LLM curator tends to
   paraphrase ("the user shared their name") and lose the exact value. So we
   pull identity/profile facts out with regexes FIRST — guaranteeing the real
   value ("Aura", "Python") is stored verbatim and recalled correctly.
   ────────────────────────────────────────────────────────────────────────── */

// Words that end a name capture — connectives, pronouns, fillers, verbs. A name
// is only the proper-noun tokens BEFORE any of these (so "Aura and i am a
// student…" yields just "Aura", never the whole sentence).
const NAME_STOP = /^(and|but|&|or|who|i|im|a|an|the|is|am|are|was|were|of|for|to|so|because|since|now|here|there|bro|dude|man|guys?|please|not|really|very|just)$/i;

function titleCaseToken(t: string): string {
  return t.length ? t[0].toUpperCase() + t.slice(1) : t;
}

/**
 * Pulls a clean personal name out of a "name is X / call me X / I'm X" phrase.
 * Returns only the leading proper-noun tokens (max 3), stopping at the first
 * connective/filler. Validated against the invalid-name list ("user", "me", …).
 */
function extractName(text: string): string | undefined {
  const patterns: RegExp[] = [
    /\bmy\s+(?:real|full|actual|legal|first)?\s*name(?:'s| is|s)?\s+(.+)/i,
    /\bname(?:'s| is)\s+(.+)/i,
    /\bcall me\s+(.+)/i,
    /\bi(?:'m| am)\s+called\s+(.+)/i,
  ];
  let raw: string | undefined;
  for (const p of patterns) {
    const m = text.match(p);
    if (m) { raw = m[1]; break; }
  }
  if (!raw) {
    // "I am Aura" / "I'm Aura" — a capitalized proper noun (not a verb/role).
    const m = text.match(/\b[Ii](?:'m| am)\s+([A-Z][a-z'’-]+)\b/);
    if (m) raw = m[1];
  }
  if (!raw) return undefined;

  const tokens = raw.trim().split(/\s+/);
  const name: string[] = [];
  for (const tok of tokens) {
    const clean = tok.replace(/[.!?,;:]+$/, '');
    if (!clean || NAME_STOP.test(clean)) break;
    if (!/^[A-Za-z][A-Za-z'’-]*$/.test(clean)) break;  // letters/apostrophe/hyphen only
    name.push(titleCaseToken(clean));
    if (name.length >= 3) break;
  }
  const candidate = name.join(' ').trim();
  return isValidName(candidate) ? candidate : undefined;
}

function cleanList(raw: string): string[] {
  return raw
    .replace(/[.!?]+$/, '')          // trailing sentence punctuation only
    .split(/\s*,\s*|\s+and\s+|\s*\/\s*|\s*&\s*|\s*\+\s*/i)
    .map((s) => s.trim().replace(/[,;:]+$/, '').replace(/^(?:and|a|an|the)\s+/i, '').trim())
    .filter((s) => s.length > 0 && s.length < 40)
    .slice(0, 12);
}

// Guards against capturing a question/command as a "fact" (e.g. a value like
// "what should I build this weekend"). Tech/skill values are short noun-ish
// tokens, never interrogatives or imperatives.
const QUESTION_WORDS = /\b(what|which|how|why|when|where|who|should|could|would|can|do|does|is|are|build|make|create|suggest|recommend|help|tell|give)\b/i;
function looksLikeQuestion(s: string): boolean {
  return QUESTION_WORDS.test(s);
}

/** Pulls structured profile facts from a raw user message. Returns null if none. */
export function extractProfileFacts(message: string): ProfileFacts | null {
  const text = message.trim();
  const facts: ProfileFacts = {};

  // Name — robust proper-noun extraction (never swallows the rest of the
  // sentence, never stores "user"/"me"). See extractName().
  const name = extractName(text);
  if (name) facts.name = name;

  // Tech stack: REQUIRE an explicit introducer (is/are/includes/:/=) or a verb
  // form ("I use X") — otherwise "my tech stack what should I build?" would
  // wrongly capture a question. Keep in-word dots (Next.js); stop at a
  // sentence-ending period (one followed by whitespace/end), not "Next.js".
  const stackMatch = text.match(/\b(?:tech\s*stack\s*(?:is|are|includes?|[:=])|(?:^|\s)stack\s*(?:is|are|includes?|[:=])|i (?:use|work with|code in|build with|develop (?:in|with)))\s+(.+?)(?:[.!?](?:\s|$)|\n|$)/i);
  if (stackMatch && !looksLikeQuestion(stackMatch[1])) {
    const list = cleanList(stackMatch[1]).filter((t) => !looksLikeQuestion(t));
    if (list.length) facts.tech_stack = list;
  }

  // Role: occupation noun, optionally qualified ("AI student", "developer").
  const roleMatch = text.match(/\bi(?:'m| am)\s+(?:an?\s+)?((?:[a-z][\w-]*\s+){0,2}(?:student|developer|engineer|designer|researcher|founder|builder|analyst|scientist|programmer|teacher|writer|consultant|freelancer|architect))\b/i);
  if (roleMatch) {
    const role = roleMatch[1].trim().replace(/\s+/g, ' ').replace(/^(a|an)\s+/i, '');
    facts.role = role;
    // Education: "AI student" / "CS student" → keep the qualified phrase; or
    // "I study X" / "I major in X".
    if (/\bstudent\b/i.test(role) && /\s/.test(role)) facts.education = role;
  }
  const studyMatch = text.match(/\bi(?:'m| am)?\s*(?:study|studying|major in|majoring in)\s+([^.,;:!?\n]{2,40})/i);
  if (studyMatch) {
    const subj = studyMatch[1].trim().replace(/\b(currently|right now|now)\b/gi, '').trim();
    if (subj.length >= 2) { facts.education = subj; if (!facts.role) facts.role = 'student'; }
  }

  // Current focus: "currently learning X", "focused on X", "working on X".
  // (Plain "learning X" is too noisy — require a focus qualifier.) Drop filler.
  const focusMatch = text.match(/\b(?:currently (?:learning|studying|focused on|into)|focused on|working on|getting into)\s+([^.,;:!?\n]{2,60})/i);
  if (focusMatch) {
    const f = focusMatch[1].replace(/\b(stuff|things|currently|right now|some)\b/gi, '').trim();
    if (f.length >= 2) facts.current_focus = f;
  }

  // Interests: "deep into AI ML", "interested in X", "love/enjoy X".
  const interestMatch = text.match(/\b(?:deep(?:ly)? into|interested in|love|enjoy|passionate about)\s+([^.\n]{2,80})/i);
  if (interestMatch) {
    const cleaned = interestMatch[1].replace(/\b(stuff|things|currently|right now)\b/gi, '').trim();
    const list = /\b(and|,|\/|&)\b/.test(cleaned) ? cleanList(cleaned) : cleaned.split(/\s+/).filter(Boolean).slice(0, 6);
    if (list.length) facts.interests = list;
  }

  return Object.keys(facts).length > 0 ? facts : null;
}

const FACT_LABELS: Record<string, string> = {
  name: 'name', role: 'role', current_focus: 'current focus',
  interests: 'interests', tech_stack: 'tech stack',
};

/** Builds a human summary from extracted facts, e.g. "User's name is Aura. …". */
export function summarizeFacts(facts: ProfileFacts): string {
  const parts: string[] = [];
  if (facts.name) parts.push(`User's name is ${facts.name}.`);
  if (facts.role) parts.push(`User is ${/^a|e|i|o|u/i.test(facts.role) ? 'an' : 'a'} ${facts.role}.`);
  if (facts.current_focus) parts.push(`User is currently ${facts.current_focus}.`);
  if (facts.interests?.length) parts.push(`User is interested in ${facts.interests.join(', ')}.`);
  if (facts.tech_stack?.length) parts.push(`User's tech stack includes ${facts.tech_stack.join(', ')}.`);
  // Any custom keys
  for (const [k, v] of Object.entries(facts)) {
    if (FACT_LABELS[k] || v == null) continue;
    parts.push(`User's ${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : v}.`);
  }
  return parts.join(' ');
}

function factTags(facts: ProfileFacts): string[] {
  const tags = ['profile'];
  if (facts.name) tags.push('identity', 'name');
  if (facts.role) tags.push('role');
  if (facts.tech_stack?.length) tags.push('tech_stack');
  if (facts.interests?.length) tags.push('interests');
  return Array.from(new Set(tags)).slice(0, 6);
}

/**
 * Deterministic profile-fact decision. Runs BEFORE the LLM curator so identity
 * facts are stored verbatim and reliably. Returns null when the message has no
 * extractable profile facts (so the normal curator path runs).
 */
// "I want to remember my name", "let me tell you about myself" — an intent to
// share, with no actual value yet. Must NOT store (no fake proof).
const INTENT_NO_VALUE = /\b(?:i (?:wanna|want to|would like to|need to)|let me|let'?s|please)\s+(?:remember|store|save|tell you|note|record)\b/i;

export function isIntentWithoutValue(message: string): boolean {
  if (!INTENT_NO_VALUE.test(message)) return false;
  // If the message ALSO contains a concrete profile fact, it's not empty intent.
  return extractProfileFacts(message) === null;
}

export function decideProfileFact(message: string): MemoryDecision | null {
  if (isRecallOnly(message)) return null; // questions never set facts
  const facts = extractProfileFacts(message);
  if (!facts) return null;
  return {
    should_store: true,
    memory_type: 'profile_fact',
    importance: facts.name ? 0.95 : 0.85,
    summary: summarizeFacts(facts),
    reason: 'Direct personal/profile fact stated by the user.',
    tags: factTags(facts),
    facts,
  };
}

/**
 * Decides whether a raw conversational user message carries NEW durable
 * knowledge worth storing. Recall/continuation/summary requests are skipped.
 * Returns should_store:false on any failure (conservative).
 */
export async function decideMemoryFromMessage(message: string): Promise<MemoryDecision> {
  // Fast deterministic skip for pure retrieval/recall prompts.
  if (isRecallOnly(message)) {
    return { should_store: false, reason: 'Recall/continuation request — retrieves memory, adds none.' };
  }

  const provider = getProvider();
  try {
    const response = await provider.call({
      system: MSG_DECISION_SYSTEM,
      messages: [{ role: 'user', content: `User message:\n"${message}"\n\nDecide.` }],
      max_tokens: 300,
      temperature: 0,
      json_mode: true,
    });
    const cleaned = response.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const decision = DecisionSchema.parse(JSON.parse(cleaned));
    if (decision.should_store && (decision.importance ?? 0) < IMPORTANCE_THRESHOLD) {
      return { should_store: false, reason: 'Below importance threshold.' };
    }
    return decision;
  } catch {
    return { should_store: false, reason: 'Could not assess message for storage.' };
  }
}

function inferType(q: string): MemoryType {
  if (/\b(architect|workspace|engine|system design|schema)\b/i.test(q)) return 'architecture';
  if (/\b(decid|decision|choose|chosen|go with)\b/i.test(q)) return 'decision';
  if (/\b(plan|roadmap|steps|milestone)\b/i.test(q)) return 'plan';
  if (/\b(prefer|i like|i want|always|never)\b/i.test(q)) return 'preference';
  if (/\b(incident|breach|outage|attack)\b/i.test(q)) return 'incident';
  return 'research';
}

export function keywordTags(q: string): string[] {
  const stop = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'should', 'about', 'into', 'what', 'how', 'why']);
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))
    .slice(0, 4);
}
