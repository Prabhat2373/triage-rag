// Client-safe metadata. Add another model from a registered provider here.
export const CHAT_MODELS = [
  { id: 'qwen3.5:4b', provider: 'ollama', name: 'Qwen 3.5', label: 'Balanced · 4B parameters' },
  { id: 'llama3.2:1b', provider: 'ollama', name: 'Llama 3.2', label: 'Fast · 1B parameters' },
  { id: 'gemini-3.5-flash-lite', provider: 'google', name: 'Gemini 3.5 Flash-Lite', label: 'Sends your question and matching incident excerpts to Gemini' },
] as const;

export const DEFAULT_CHAT_MODEL = CHAT_MODELS[0].id;

export type ChatModelId = typeof CHAT_MODELS[number]['id'];
export type ChatProviderId = typeof CHAT_MODELS[number]['provider'];
export type ChatModelOption = {
  id: ChatModelId;
  name: string;
  label: string;
  available: boolean;
};

export function isChatModel(value: unknown): value is ChatModelId {
  return CHAT_MODELS.some(({ id }) => id === value);
}
