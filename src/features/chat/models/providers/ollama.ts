import { ollama } from 'ollama-ai-provider-v2';

export function getOllamaChatModel(id: string) {
  return ollama(id);
}

export function getLocalEmbeddingModel(maxEmbeddingsPerCall?: number) {
  return ollama.textEmbeddingModel('nomic-embed-text', { maxEmbeddingsPerCall });
}
