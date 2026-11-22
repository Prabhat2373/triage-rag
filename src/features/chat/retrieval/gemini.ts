import { embed, embedMany } from 'ai';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { sanitizeText } from '@/features/privacy/redact';
import { getGoogleProvider } from '../models/providers/google';
import { incidentEvidenceFields, redactSource } from './evidence';
import { selectRelevantEvidence } from './relevance';
import { incidentKeywordRanking } from './keyword-ranking';

const embeddingId = 'gemini-embedding-001';
const dimensions = 768;
const backfillLimit = 12;

export async function retrieveGeminiIncidents(orgId: number, query: string, signal: AbortSignal) {
  const startedAt = Date.now();
  const { matches: keywordMatches, rank } = incidentKeywordRanking(query);
  const workspace = eq(tickets.orgId, orgId);
  let embeddingLatencyMs = 0;

  // Cloud indexing sends incident text to Google. Enable it explicitly.
  if (process.env.GEMINI_INDEX_INCIDENTS === 'true') {
    try {
      const pending = await db.select({ ...incidentEvidenceFields, id: tickets.id }).from(tickets)
        .where(and(workspace, isNull(tickets.geminiEmbedding)))
        .orderBy(desc(rank), desc(tickets.createdAt), desc(tickets.id)).limit(backfillLimit);
      const model = getGoogleProvider().embedding(embeddingId);
      const abortSignal = AbortSignal.any([signal, AbortSignal.timeout(10000)]);
      const [queryResult, backfillResult] = await Promise.all([
        embed({ model, value: query, abortSignal, maxRetries: 0, providerOptions: {
          google: { outputDimensionality: dimensions, taskType: 'RETRIEVAL_QUERY' },
        } }),
        pending.length ? embedMany({
          model,
          values: pending.map(({ title, symptom, resolution }) =>
            sanitizeText(`Title: ${title}\nSymptom: ${symptom}\nResolution: ${resolution}`).sanitized),
          abortSignal, maxRetries: 0, providerOptions: {
            google: { outputDimensionality: dimensions, taskType: 'RETRIEVAL_DOCUMENT' },
          },
        }) : Promise.resolve({ embeddings: [] }),
      ]);
      embeddingLatencyMs = Date.now() - startedAt;
      signal.throwIfAborted();

      if (pending.length) {
        await db.transaction(async (transaction) => {
          for (const [index, incident] of pending.entries()) {
            await transaction.update(tickets).set({ geminiEmbedding: backfillResult.embeddings[index] })
              .where(and(workspace, eq(tickets.id, incident.id), isNull(tickets.geminiEmbedding),
                eq(tickets.title, incident.title), eq(tickets.symptom, incident.symptom), eq(tickets.resolution, incident.resolution)));
          }
        });
      }

      const vector = `[${queryResult.embedding.join(',')}]`;
      const distance = sql<number>`${tickets.geminiEmbedding} <=> ${vector}::vector`;
      const similarity = sql<number>`1 - (${distance})`;
      const semanticMatches = await db.select({ ...incidentEvidenceFields, similarity }).from(tickets)
        .where(and(workspace, lt(distance, 0.45))).orderBy(desc(similarity)).limit(8);
      const sources = selectRelevantEvidence(query, semanticMatches.map(redactSource));
      if (sources.length) {
        return { sources, embeddingLatencyMs, searchLatencyMs: Date.now() - startedAt - embeddingLatencyMs };
      }
    } catch (error) {
      signal.throwIfAborted();
      console.warn('Gemini semantic retrieval failed; using keyword search', { errorType: error instanceof Error ? error.name : 'Unknown' });
    }
  }

  const keywordResults = await db.select(incidentEvidenceFields).from(tickets).where(and(workspace, keywordMatches))
    .orderBy(desc(rank), desc(tickets.createdAt), desc(tickets.id)).limit(8);
  return {
    sources: selectRelevantEvidence(query, keywordResults.map((incident) => redactSource({ ...incident, similarity: 0, matchKind: 'keyword' }))),
    embeddingLatencyMs,
    searchLatencyMs: Date.now() - startedAt - embeddingLatencyMs,
  };
}
