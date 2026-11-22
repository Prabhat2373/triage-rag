import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { chatMessages, chatSessions } from '@/db/schema';
import type { AuthContext } from '@/features/accounts/session';
import { sanitizeText } from '@/features/privacy/redact';
import { redactSource } from '../retrieval/evidence';
import { selectRelevantEvidence } from '../retrieval/relevance';
import { isConversationalFollowUp, replyToGreeting } from './context';
import type { ChatMessage, SourceItem } from '../types';

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

  let topic = '';
  return rows.map((message) => {
    const content = sanitizeText(message.content).sanitized;
    if (message.role === 'user' && !replyToGreeting(content) && (!topic || !isConversationalFollowUp(content))) topic = content;
    const sources = readSources(message.sources);
    return {
      id: `msg-${message.id}`,
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content,
      model: message.model ?? undefined,
      sources: sources && topic ? selectRelevantEvidence(topic, sources) : sources,
      retrievalLatencyMs: message.retrievalLatencyMs ?? undefined,
      redactedCount: message.redactedCount ?? 0,
    };
  });
}

export async function readRecentChatContext(sessionId: number) {
  const rows = await db.select({ role: chatMessages.role, content: chatMessages.content, sources: chatMessages.sources })
    .from(chatMessages).where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id)).limit(6);
  const questionIndex = rows.findIndex((row) => row.role === 'user' && !replyToGreeting(row.content));
  if (questionIndex < 0) return { previousQuestion: undefined, sources: [] };

  const reply = rows[questionIndex - 1];
  const topic = rows.slice(questionIndex).find((row) => row.role === 'user' && !isConversationalFollowUp(row.content) && !replyToGreeting(row.content));
  const sources = reply?.role === 'assistant' ? readSources(reply.sources) ?? [] : [];
  return {
    previousQuestion: rows[questionIndex].content,
    sources: topic ? selectRelevantEvidence(sanitizeText(topic.content).sanitized, sources) : sources,
  };
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

export async function saveChatExchange(auth: AuthContext, exchange: {
  sessionId?: number | null;
  query: string;
  answer: string;
  model: string;
  sources: SourceItem[];
  retrievalLatencyMs: number;
  redactedCount: number;
}) {
  const { model, sources, retrievalLatencyMs, redactedCount } = exchange;
  const query = sanitizeText(exchange.query).sanitized;
  const answer = sanitizeText(exchange.answer).sanitized;

  return db.transaction(async (transaction) => {
    const firstTitle = query.length > 48 ? `${query.slice(0, 48)}…` : query;
    let sessionId = exchange.sessionId;
    let title = firstTitle;
    if (sessionId == null) {
      const [created] = await transaction.insert(chatSessions).values({
        orgId: auth.org.id, userId: auth.user.id, title, model,
      }).returning({ id: chatSessions.id });
      sessionId = created.id;
    } else {
      const [session] = await transaction.select({ title: chatSessions.title })
        .from(chatSessions).where(ownedSession(sessionId, auth)).for('update');
      if (!session) throw new Error('Chat session is no longer available.');
      title = session.title === 'New Triage Session' ? firstTitle : sanitizeText(session.title).sanitized;
      await transaction.update(chatSessions).set({ title, model, updatedAt: new Date() })
        .where(ownedSession(sessionId, auth));
    }

    await transaction.insert(chatMessages).values([
      { sessionId, role: 'user', content: query, model },
      {
        sessionId, role: 'assistant', content: answer, model,
        sources: JSON.stringify(sources.map(redactSource)), retrievalLatencyMs, redactedCount,
      },
    ]);
    return { id: sessionId, title, model };
  });
}
