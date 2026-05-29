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

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

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
