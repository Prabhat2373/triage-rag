import type { LanguageModel } from 'ai';
import { retrieveGeminiIncidents } from '../retrieval/gemini';
import { retrieveIncidents } from '../retrieval/ollama';
import type { SourceItem } from '../types';
import { CHAT_MODELS, type ChatModelId, type ChatModelOption, type ChatProviderId } from './catalog';
import { getOllamaChatModel } from './providers/ollama';
import { getGoogleProvider, isGoogleConfigured } from './providers/google';

type RetrievalResult = {
  sources: SourceItem[];
  embeddingLatencyMs: number;
  searchLatencyMs: number;
};

interface ChatProvider {
  isConfigured: () => boolean;
  configurationHint: string;
  createModel: (modelId: string) => LanguageModel;
  retrieve: (orgId: number, query: string, signal: AbortSignal) => Promise<RetrievalResult>;
  allowAnswerWithoutSearch: boolean;
  supportsUnembeddedIncidents: boolean;
  searchError: string;
  responseError: string;
}

// Register a provider once. API handlers and UI consume the same catalog and availability.
const providers: Record<ChatProviderId, ChatProvider> = {
  ollama: {
    isConfigured: () => true,
    configurationHint: '',
    createModel: getOllamaChatModel,
    retrieve: retrieveIncidents,
    allowAnswerWithoutSearch: false,
    supportsUnembeddedIncidents: false,
    searchError: 'Knowledge base search is unavailable. Check that Ollama is running with nomic-embed-text and PostgreSQL is reachable.',
    responseError: 'Unable to complete or save this response.',
  },
  google: {
    isConfigured: isGoogleConfigured,
    configurationHint: 'Set GOOGLE_GENERATIVE_AI_API_KEY to enable Gemini.',
    createModel: (id) => getGoogleProvider()(id),
    retrieve: retrieveGeminiIncidents,
    allowAnswerWithoutSearch: true,
    supportsUnembeddedIncidents: true,
    searchError: 'Knowledge base search is unavailable.',
    responseError: 'Unable to complete or save the Gemini response. Check the API key, quota, and network, then retry.',
  },
};

export function getChatProvider(id: ChatModelId) {
  const model = CHAT_MODELS.find((entry) => entry.id === id);
  if (!model) throw new Error('Unknown chat model.');
  return providers[model.provider];
}

export function getChatModelOptions(): ChatModelOption[] {
  return CHAT_MODELS.map(({ id, provider, name, label }) => {
    const adapter = providers[provider];
    const available = adapter.isConfigured();
    return { id, name, label: available ? label : adapter.configurationHint, available };
  });
}

export function canSaveWithoutLocalEmbeddings() {
  return Object.values(providers).some((provider) => provider.supportsUnembeddedIncidents && provider.isConfigured());
}
