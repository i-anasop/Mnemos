import { z } from 'zod';
import { getProvider } from '@/lib/llm';
import type { ResearchTask, ResearchReport } from '@/types';

const ReportSchema = z.object({
  question: z.string(),
  findings: z.array(z.object({
    claim: z.string(),
    evidence: z.string(),
    relevance: z.number().min(0).max(1),
  })),
  confidence: z.number().min(0).max(1),
  reasoning_trace: z.string(),
  timestamp: z.string(),
  agent: z.literal('researcher'),
});

const EXAMPLE = JSON.stringify({
  question: 'Example research question',
  findings: [{ claim: 'Key insight', evidence: 'Supporting evidence', relevance: 0.9 }],
  confidence: 0.8,
  reasoning_trace: 'Analyzed the question by examining...',
  timestamp: '2026-01-01T00:00:00Z',
  agent: 'researcher',
}, null, 2);

export async function runResearcher(task: ResearchTask): Promise<ResearchReport> {
  const provider = getProvider();
  const maxTokens = task.depth === 'deep' ? 2048 : 1024;
  const findingCount = task.depth === 'deep' ? '4-6' : '2-3';

  const contextSection = task.context
    ? `\n\nRelevant prior findings from memory:\n${task.context}`
    : '';

  const system = `You are a structured research analyst. You produce JSON-formatted research reports only.${contextSection}

Output ONLY valid JSON matching this exact schema:
${EXAMPLE}

Rules:
- Respond with raw JSON only — no markdown, no backticks, no explanation
- All fields are required
- relevance and confidence must be numbers between 0 and 1
- agent must be exactly "researcher"`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prefix = attempt > 0
      ? 'Previous response was invalid JSON. Output ONLY valid JSON:\n\n'
      : '';

    const response = await provider.call({
      system,
      messages: [{
        role: 'user',
        content: `${prefix}Research question: ${task.question}\n\nProduce a thorough report with ${findingCount} findings. Output JSON only.`,
      }],
      max_tokens: maxTokens,
      json_mode: true,
    });

    const raw = response.text.trim();

    // Strip markdown code fences if any provider adds them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
      const parsed = JSON.parse(cleaned) as unknown;
      const validated = ReportSchema.parse({
        ...(typeof parsed === 'object' && parsed !== null ? parsed : {}),
        timestamp: (parsed as Record<string, unknown>)?.timestamp ?? new Date().toISOString(),
        agent: 'researcher',
      });
      return validated;
    } catch {
      if (attempt === 1) {
        return {
          question: task.question,
          findings: [{ claim: 'Research completed', evidence: raw.slice(0, 300), relevance: 0.5 }],
          confidence: 0.5,
          reasoning_trace: 'JSON parse failed on both attempts; raw response captured.',
          timestamp: new Date().toISOString(),
          agent: 'researcher',
        };
      }
    }
  }

  throw new Error('Researcher: unreachable');
}
