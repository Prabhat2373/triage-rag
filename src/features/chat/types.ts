export interface SourceItem {
  ticketCode: string;
  title: string;
  category: string;
  symptom: string;
  resolution: string;
  similarity: number;
  matchKind?: 'keyword';
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

export type ChatStreamEvent =
  | { type: 'evidence'; sources: SourceItem[]; retrievalLatencyMs: number; redactedCount: number; query: string }
  | { type: 'text'; text: string }
  | { type: 'done'; title?: string }
  | { type: 'error'; message: string };
