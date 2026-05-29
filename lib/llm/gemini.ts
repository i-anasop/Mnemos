import type { LLMProvider, LLMRequest, LLMResponse } from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly model: string;

  constructor() {
    this.model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const url = `${API_BASE}/${this.model}:generateContent?key=${apiKey}`;

    const contents: GeminiContent[] = req.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: req.max_tokens ?? 2048,
      temperature: req.temperature ?? 0.7,
    };
    if (req.json_mode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const body: Record<string, unknown> = { contents, generationConfig };
    if (req.system) {
      body.systemInstruction = { parts: [{ text: req.system }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates[0]?.content?.parts[0]?.text ?? '';

    return {
      text,
      model: this.model,
      provider: this.name,
      usage: data.usageMetadata
        ? {
            input_tokens: data.usageMetadata.promptTokenCount,
            output_tokens: data.usageMetadata.candidatesTokenCount,
          }
        : undefined,
    };
  }
}
