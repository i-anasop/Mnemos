import { z } from 'zod';
import { getProvider } from '@/lib/llm';
import type { MemoryDecision, MemoryType, SynthesisDocument } from '@/types';

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
    'decision', 'architecture', 'research', 'preference', 'plan',
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

const MSG_DECISION_SYSTEM = `You are Mnemos's memory curator. A user is chatting with the assistant. Decide whether THIS user message contains durable knowledge worth remembering long-term in a workspace memory engine.

STORE: stated decisions, architecture choices, project direction, preferences ("I want…", "always/never…", "my name is…", "we use…"), constraints, plans, conclusions, important facts the user wants remembered.

DO NOT store: greetings, small talk, acknowledgements, questions with no new info, or vague chatter.

Respond with ONLY valid JSON, no markdown:
{
  "should_store": true|false,
  "memory_type": "decision|architecture|research|preference|plan|insight|summary|constraint|incident|general",
  "importance": 0.0-1.0,
  "summary": "one or two sentences capturing the durable knowledge, written so a future session understands it",
  "reason": "why store or skip",
  "tags": ["lowercase", "keywords"]
}
If should_store is false, omit the optional fields.`;

/**
 * Decides whether a raw conversational user message carries durable knowledge
 * worth storing (decisions/preferences/facts stated in normal chat).
 * Returns should_store:false on any failure (conservative).
 */
export async function decideMemoryFromMessage(message: string): Promise<MemoryDecision> {
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
