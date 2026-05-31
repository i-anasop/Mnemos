import { getProvider } from '@/lib/llm';
import type { MemoryBlob, SynthesisDocument } from '@/types';

/* Conversational reply — a natural, memory-aware assistant turn.
   Used for casual chat AND normal conversational questions (NOT research).
   It is given any relevant workspace memories so it can answer with context
   instead of robotically. No synthesis, no storage. */

function memoryToContext(blob: MemoryBlob): string {
  // Include the original statement when available — it carries exact facts
  // (names, numbers) that a paraphrased summary can blur.
  const statement = (blob.content as { statement?: string }).statement;
  if (blob.summary) {
    return statement && statement !== blob.summary
      ? `- ${blob.summary} (user said: "${statement}")`
      : `- ${blob.summary}`;
  }
  if (statement) return `- ${statement}`;
  const doc = blob.content as Partial<SynthesisDocument>;
  const topic = doc.synthesis_goal?.replace(/^Synthesize findings on:\s*/i, '');
  if (topic) return `- ${topic}${doc.themes?.[0] ? `: ${doc.themes[0].label}` : ''}`;
  return `- ${blob.memory_type ?? 'memory'} from a prior session`;
}

export async function runConversationalReply(params: {
  message: string;
  memories?: MemoryBlob[];
  workspaceLabel?: string;
}): Promise<string> {
  const { message, memories = [], workspaceLabel = 'this workspace' } = params;
  const provider = getProvider();

  const memorySection = memories.length
    ? `\n\n=== YOUR STORED MEMORIES (${workspaceLabel}) ===\nThese are FACTS you previously stored and therefore DO know. Treat them as true and answer directly from them. If the user asks something these memories answer (their name, a past decision, a preference), answer confidently from memory — do NOT say you don't know it:\n${memories.slice(0, 4).map(memoryToContext).join('\n')}\n=== END MEMORIES ===`
    : `\n\nYou have no stored memories relevant to this message in ${workspaceLabel}.`;

  const system = `You are Mnemos — a persistent AI memory assistant. You hold a durable, verifiable memory for a workspace, backed by Walrus storage.

Be warm, concise, and genuinely helpful — like ChatGPT or Claude, not a robotic bullet-point machine. Write in natural prose (1-4 short sentences for simple things; expand only when truly needed). Do not force rigid numbered headings onto casual questions.

Truths about you, so you never answer incorrectly:
- You DO have persistent memory: you store important decisions, research, and preferences as memory artifacts on Walrus, scoped to a workspace, and recall them in later sessions.
- You only remember things deemed important — not casual chatter. If asked about something and it IS in your stored memories above, answer from it confidently. If it is genuinely NOT in your memories, say plainly that you don't have it stored yet and offer to remember it.
- Never claim you "cannot store information" or "have no memory" — that is false. Memory is your entire purpose.${memorySection}`;

  try {
    const response = await provider.call({
      system,
      messages: [{ role: 'user', content: message }],
      max_tokens: 320,
      temperature: 0.6,
    });
    return response.text.trim() || "I'm Mnemos — your memory engine. Ask me to research, plan, or decide something and I'll remember what matters.";
  } catch {
    return "I'm Mnemos — your persistent memory engine. I can research, plan, and remember the important parts on Walrus. What would you like to explore?";
  }
}
