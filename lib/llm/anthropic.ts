import type { LLMProvider, LLMRequest, LLMResponse } from './types';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: string;

  constructor() {
    this.model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: this.model,
      max_tokens: req.max_tokens ?? 2048,
      system: req.system,
      messages: req.messages.map(m => ({ role: m.role, content: m.content })),
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      text,
      model: this.model,
      provider: this.name,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }
}
