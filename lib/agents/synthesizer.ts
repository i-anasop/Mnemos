import { z } from 'zod';
import { getProvider } from '@/lib/llm';
import type { SynthesisTask, SynthesisDocument } from '@/types';

const SynthesisSchema = z.object({
  synthesis_goal: z.string(),
  themes: z.array(z.object({
    label: z.string(),
    supporting_findings: z.array(z.string()),
    strength: z.number().min(0).max(1),
  })),
  knowledge_gaps: z.array(z.string()),
  contradictions: z.array(z.object({
    claim_a: z.string(),
    claim_b: z.string(),
    resolution: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1),
  confidence_delta: z.number(),
  session_id: z.string(),
  agent: z.literal('synthesizer'),
});

export async function runSynthesizer(task: SynthesisTask): Promise<SynthesisDocument> {
  const provider = getProvider();

  const avgCurrentConf =
    task.current_reports.reduce((s, r) => s + r.confidence, 0) / task.current_reports.length;

  const avgMemoryConf =
    task.memory_reports.length > 0
      ? task.memory_reports.reduce((s, r) => s + (r.confidence ?? 0), 0) / task.memory_reports.length
      : null;

  const memorySection =
    task.memory_reports.length > 0
      ? `Prior session findings from memory:\n${JSON.stringify(task.memory_reports, null, 2)}`
      : 'No prior memory — this is the first session on this topic.';

  const baselineLine = avgMemoryConf !== null
    ? `Memory baseline confidence: ${avgMemoryConf.toFixed(2)}`
    : 'No memory baseline (first session).';

  const system = `You are a synthesis analyst. You identify patterns, contradictions, and knowledge gaps across research reports.

${memorySection}

Output ONLY valid JSON. No markdown, no backticks, no explanation.

Required JSON shape:
{
  "synthesis_goal": "string",
  "themes": [{ "label": "string", "supporting_findings": ["string"], "strength": 0.0-1.0 }],
  "knowledge_gaps": ["string"],
  "contradictions": [{ "claim_a": "string", "claim_b": "string", "resolution": "string (optional)" }],
  "confidence": 0.0-1.0,
  "confidence_delta": number,
  "session_id": "${task.session_id}",
  "agent": "synthesizer"
}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prefix = attempt > 0
      ? 'Previous response was invalid JSON. Output ONLY valid JSON:\n\n'
      : '';

    const response = await provider.call({
      system,
      messages: [{
        role: 'user',
        content: `${prefix}Current session reports:\n${JSON.stringify(task.current_reports, null, 2)}

Synthesis goal: ${task.synthesis_goal}
${baselineLine}

Synthesize all reports. Set confidence_delta = current_confidence - baseline (or 0 if no baseline). Output JSON only.`,
      }],
      max_tokens: 2048,
      json_mode: true,
    });

    const raw = response.text.trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      const validated = SynthesisSchema.parse({
        ...parsed,
        agent: 'synthesizer',
        session_id: task.session_id,
        confidence_delta: parsed.confidence_delta ??
          (avgMemoryConf !== null ? avgCurrentConf - avgMemoryConf : 0),
      });
      return validated;
    } catch {
      if (attempt === 1) {
        return {
          synthesis_goal: task.synthesis_goal,
          themes: [{
            label: 'Primary findings',
            supporting_findings: task.current_reports.map(r => r.question),
            strength: avgCurrentConf,
          }],
          knowledge_gaps: ['Synthesis parsing failed — see raw output'],
          contradictions: [],
          confidence: avgCurrentConf,
          confidence_delta: avgMemoryConf !== null ? avgCurrentConf - avgMemoryConf : 0,
          session_id: task.session_id,
          agent: 'synthesizer',
        };
      }
    }
  }

  throw new Error('Synthesizer: unreachable');
}
