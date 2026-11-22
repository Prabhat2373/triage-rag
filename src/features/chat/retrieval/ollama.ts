import { embed } from 'ai';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { getLocalEmbeddingModel } from '../models/providers/ollama';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { selectRelevantEvidence } from './relevance';
import { incidentEvidenceFields, redactSource } from './evidence';

export async function retrieveIncidents(orgId: number, query: string, signal: AbortSignal) {
  const embeddingStart = Date.now();
  const { embedding } = await embed({
    model: getLocalEmbeddingModel(),
    value: query,
    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    maxRetries: 0,
  });

  const searchStart = Date.now();
  const vector = `[${embedding.join(',')}]`;
  const distance = sql<number>`${tickets.embedding} <=> ${vector}::vector`;
  const similarity = sql<number>`1 - (${distance})`;
  const matches = await db.select({ ...incidentEvidenceFields, similarity }).from(tickets)
    .where(and(eq(tickets.orgId, orgId), lt(distance, 0.45)))
    .orderBy(desc(similarity))
    .limit(8);

  return {
    sources: selectRelevantEvidence(query, matches.map(redactSource)),
    embeddingLatencyMs: searchStart - embeddingStart,
    searchLatencyMs: Date.now() - searchStart,
  };
}
