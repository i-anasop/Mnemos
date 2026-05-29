export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  system?: string;
  messages: LLMMessage[];
  max_tokens?: number;
  temperature?: number;
  json_mode?: boolean;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  call(req: LLMRequest): Promise<LLMResponse>;
}
