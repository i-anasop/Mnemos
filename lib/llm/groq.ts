import type { LLMProvider, LLMRequest, LLMResponse } from './types';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

interface GroqMessage { role: 'system' | 'user' | 'assistant'; content: string }
interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class GroqProvider implements LLMProvider {
  readonly name = 'groq';
  readonly model: string;

  constructor() {
    this.model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');

    const messages: GroqMessage[] = [];
    if (req.system) messages.push({ role: 'system', content: req.system });
    for (const m of req.messages) messages.push({ role: m.role, content: m.content });

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: req.max_tokens ?? 2048,
      temperature: req.temperature ?? 0.7,
    };
    if (req.json_mode) {
      body.response_format = { type: 'json_object' };
    }

    // Retry on transient rate-limit (429) with backoff honoring Groq's hint.
    const MAX_RETRIES = 3;
    let res!: Response;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.status !== 429 || attempt === MAX_RETRIES) break;

      const retryText = await res.text();
      // Groq returns "Please try again in 16.26s"; fall back to exponential backoff.
      const hinted = retryText.match(/try again in ([\d.]+)s/i);
      const headerWait = Number(res.headers.get('retry-after'));
      const waitSec = hinted
        ? parseFloat(hinted[1])
        : Number.isFinite(headerWait) && headerWait > 0
          ? headerWait
          : 2 ** attempt;
      // Cap the wait so the SSE stream never hangs too long.
      await new Promise(r => setTimeout(r, Math.min(waitSec + 0.5, 20) * 1000));
    }

    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as GroqResponse;
    const text = data.choices[0]?.message?.content ?? '';

    return {
      text,
      model: data.model,
      provider: this.name,
      usage: data.usage
        ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}
