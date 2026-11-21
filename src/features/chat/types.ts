export interface SourceItem {
  ticketCode: string;
  title: string;
  category: string;
  symptom: string;
  resolution: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  sources?: SourceItem[];
  retrievalLatencyMs?: number;
  redactedCount?: number;
}

export const MAX_CHAT_QUERY_LENGTH = 8000;

export const CHAT_MODELS = [
  { id: 'qwen3.5:4b', name: 'Qwen 3.5', label: 'Balanced · 4B parameters' },
  { id: 'llama3.2:1b', name: 'Llama 3.2', label: 'Fast · 1B parameters' },
] as const;

export const DEFAULT_CHAT_MODEL = CHAT_MODELS[0].id;

export function isChatModel(value: unknown): value is typeof CHAT_MODELS[number]['id'] {
  return CHAT_MODELS.some((model) => model.id === value);
}

export type ChatStreamEvent =
  | { type: 'evidence'; sources: SourceItem[]; retrievalLatencyMs: number; redactedCount: number; query: string }
  | { type: 'text'; text: string }
  | { type: 'done'; title?: string }
  | { type: 'error'; message: string };
