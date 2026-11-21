import { embed } from 'ai';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { ollama } from 'ollama-ai-provider-v2';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { redactSource } from './history';

export async function retrieveIncidents(orgId: number, query: string, signal: AbortSignal) {
  const embeddingStart = Date.now();
  const { embedding } = await embed({
    model: ollama.textEmbeddingModel('nomic-embed-text'),
    value: query,
    abortSignal: signal,
  });

  const searchStart = Date.now();
  const vector = `[${embedding.join(',')}]`;
  const distance = sql<number>`${tickets.embedding} <=> ${vector}::vector`;
  const similarity = sql<number>`1 - (${distance})`;
  const matches = await db.select({
    ticketCode: tickets.ticketCode,
    category: tickets.category,
    title: tickets.title,
    symptom: tickets.symptom,
    resolution: tickets.resolution,
    similarity,
  }).from(tickets)
    .where(and(eq(tickets.orgId, orgId), lt(distance, 0.45)))
    .orderBy(desc(similarity))
    .limit(3);

  return {
    sources: matches.map(redactSource),
    embeddingLatencyMs: searchStart - embeddingStart,
    searchLatencyMs: Date.now() - searchStart,
  };
}
