import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { chatMessages, chatSessions } from '@/db/schema';
import type { AuthContext } from '@/features/accounts/session';
import { sanitizeText } from '@/features/privacy/redact';
import type { ChatMessage, SourceItem } from './types';

export function ownedSession(sessionId: number, auth: AuthContext) {
  return and(
    eq(chatSessions.id, sessionId),
    eq(chatSessions.orgId, auth.org.id),
    eq(chatSessions.userId, auth.user.id),
  );
}

export async function readChatHistory(sessionId: number): Promise<ChatMessage[]> {
  const rows = await db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));

  return rows.map((message) => ({
    id: `msg-${message.id}`,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: sanitizeText(message.content).sanitized,
    model: message.model ?? undefined,
    sources: readSources(message.sources),
    retrievalLatencyMs: message.retrievalLatencyMs ?? undefined,
    redactedCount: message.redactedCount ?? 0,
  }));
}

function readSources(savedSources: string | null): SourceItem[] | undefined {
  if (!savedSources) return undefined;

  try {
    const sources: SourceItem[] = JSON.parse(savedSources);
    return sources.map(redactSource);
  } catch {
    return undefined;
  }
}

export function redactSource(source: SourceItem): SourceItem {
  return {
    ticketCode: sanitizeText(source.ticketCode).sanitized,
    title: sanitizeText(source.title).sanitized,
    category: sanitizeText(source.category).sanitized,
    symptom: sanitizeText(source.symptom).sanitized,
    resolution: sanitizeText(source.resolution).sanitized,
    similarity: Number(source.similarity),
  };
}

export async function saveChatExchange(auth: AuthContext, exchange: {
  sessionId: number;
  query: string;
  answer: string;
  model: string;
  sources: SourceItem[];
  retrievalLatencyMs: number;
  redactedCount: number;
}) {
  const { sessionId, model, sources, retrievalLatencyMs, redactedCount } = exchange;
  const query = sanitizeText(exchange.query).sanitized;
  const answer = sanitizeText(exchange.answer).sanitized;

  return db.transaction(async (transaction) => {
    const [session] = await transaction.select({ title: chatSessions.title })
      .from(chatSessions).where(ownedSession(sessionId, auth)).for('update');
    if (!session) throw new Error('Chat session is no longer available.');

    const title = session.title === 'New Triage Session'
      ? query.length > 48 ? `${query.slice(0, 48)}…` : query
      : sanitizeText(session.title).sanitized;

    await transaction.insert(chatMessages).values([
      { sessionId, role: 'user', content: query, model },
      {
        sessionId, role: 'assistant', content: answer, model,
        sources: JSON.stringify(sources.map(redactSource)), retrievalLatencyMs, redactedCount,
      },
    ]);
    await transaction.update(chatSessions).set({ title, model, updatedAt: new Date() })
      .where(ownedSession(sessionId, auth));
    return title;
  });
}
