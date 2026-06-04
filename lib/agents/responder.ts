import { getProvider } from '@/lib/llm';
import { profileToContext } from '@/lib/profile/store';
import type { MemoryBlob, ProfileFacts, SynthesisDocument, UserProfile } from '@/types';

/* Conversational reply — a natural, memory-aware assistant turn.
   Used for casual chat AND normal conversational questions (NOT research, and
   NOT identity recall, which is answered deterministically from the profile).
   Given the verified profile + any relevant workspace memories, it answers with
   context instead of robotically. No synthesis, no storage. */

function memoryToContext(blob: MemoryBlob): string {
  // Structured profile facts → render each field explicitly so the model can
  // answer "your name is X" / "your tech stack is …" exactly, never "user".
  const facts = (blob.content as { facts?: ProfileFacts }).facts;
  if (blob.memory_type === 'profile_fact' && facts) {
    const lines: string[] = [];
    if (facts.name) lines.push(`  · name = ${facts.name}`);
    if (facts.role) lines.push(`  · role = ${facts.role}`);
    if (facts.education) lines.push(`  · education = ${facts.education}`);
    if (facts.current_focus) lines.push(`  · current focus = ${facts.current_focus}`);
    if (facts.interests?.length) lines.push(`  · interests = ${facts.interests.join(', ')}`);
    if (facts.tech_stack?.length) lines.push(`  · tech stack = ${facts.tech_stack.join(', ')}`);
    if (lines.length) return `- USER PROFILE:\n${lines.join('\n')}`;
  }

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
  profile?: UserProfile | null;
  workspaceLabel?: string;
  casual?: boolean;
}): Promise<string> {
  const { message, memories = [], profile = null, workspaceLabel = 'this workspace', casual = false } = params;
  const provider = getProvider();

  // ── Casual greeting / acknowledgement: just be friendly, never mention
  // memory, recall, or "our conversation so far" (that line annoyed the user). ──
  if (casual) {
    const system = `You are Mnemos, a warm and friendly AI assistant with persistent memory. The user sent a casual greeting or small-talk. Reply in ONE short, natural, friendly sentence and gently invite them to ask or tell you something. Do NOT mention memory, recall, storage, Walrus, or "our conversation so far" — just greet like a normal helpful assistant.`;
    try {
      const response = await provider.call({
        system,
        messages: [{ role: 'user', content: message }],
        max_tokens: 80,
        temperature: 0.7,
      });
      return response.text.trim() || 'Hey! What can I help you with today?';
    } catch {
      return 'Hey! What can I help you with today?';
    }
  }

  // ── Normal conversation: profile (verified) first, then topical memories. ──
  const profileBlock = profileToContext(profile);
  const memoryLines = memories
    .filter((b) => b.memory_type !== 'profile_fact') // profile comes from the object
    .map(memoryToContext);

  const contextParts = [profileBlock, ...memoryLines].filter(Boolean) as string[];

  const memorySection = contextParts.length
    ? `\n\n=== WHAT YOU KNOW (${workspaceLabel}) ===\nThese are FACTS you previously stored and therefore DO know. Treat them as ground truth and answer directly from them. For identity questions, read the USER PROFILE fields and state the exact values — never answer "user" or invent a value. If a specific field is NOT present, say plainly you don't have it stored yet; do NOT guess.\n${contextParts.join('\n')}\n=== END ===`
    : `\n\nYou have no stored facts relevant to this message in ${workspaceLabel} yet.`;

  const system = `You are Mnemos — a persistent AI memory assistant. You hold a durable, verifiable memory for a workspace, backed by Walrus storage.

Be warm, concise, and genuinely helpful — like ChatGPT or Claude, not a robotic bullet-point machine. Write in natural prose (1-4 short sentences for simple things; expand only when truly needed). Do not force rigid numbered headings onto casual questions.

Truths about you, so you never answer incorrectly:
- You DO have persistent memory: you store important decisions, research, and preferences as memory artifacts on Walrus, scoped to a workspace, and recall them in later sessions.
- If asked about something and it IS in what you know above, answer from it confidently. If it is genuinely NOT there, say plainly that you don't have it stored yet and offer to remember it.
- Never claim you "cannot store information" or "have no memory" — that is false. Memory is your entire purpose.
- Do NOT claim you have just saved/stored/remembered THIS message, and never invent a value (like a name) that is not in the facts above. Persistence is handled separately by the system, which shows a "Saved" indicator when it happens. Just answer the user's content naturally.${memorySection}`;

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
