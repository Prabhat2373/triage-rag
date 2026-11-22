'use server';

import { and, eq } from 'drizzle-orm';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { evaluations, chatSessions } from '@/db/schema';
import { getAuthContext } from '@/features/accounts/session';
import { sanitizeText } from '@/features/privacy/redact';
import { ownedSession, readChatHistory } from './conversation/history';
import { DEFAULT_CHAT_MODEL, isChatModel } from './models/catalog';

/**
 * Record evaluation feedback (👍 / 👎)
 */
export async function submitEvaluation(data: {
  evaluationId?: number;
  query: string;
  modelUsed: string;
  similarityScore: string;
  rating: 'helpful' | 'unhelpful';
  feedback?: string;
  latencyMs?: number;
}) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  if (!data || typeof data.query !== 'string' || data.query.length > 32000
    || !isChatModel(data.modelUsed) || typeof data.similarityScore !== 'string' || data.similarityScore.length > 20
    || (data.rating !== 'helpful' && data.rating !== 'unhelpful')
    || (data.feedback !== undefined && (typeof data.feedback !== 'string' || data.feedback.length > 8000))) {
    return { success: false, error: 'Invalid feedback.' };
  }

  if (data.evaluationId !== undefined
    && (!Number.isInteger(data.evaluationId) || data.evaluationId < 1 || data.evaluationId > 2_147_483_647)) {
    return { success: false, error: 'Invalid feedback ID.' };
  }

  const latencyMs = data.latencyMs ?? 0;

  try {
    const values = {
      orgId: auth.org.id,
      userId: auth.user.id,
      query: sanitizeText(data.query).sanitized,
      modelUsed: sanitizeText(data.modelUsed).sanitized,
      similarityScore: sanitizeText(data.similarityScore).sanitized,
      rating: data.rating,
      feedback: sanitizeText(data.feedback || '').sanitized,
      latencyMs: Number.isInteger(latencyMs) && latencyMs >= 0 && latencyMs <= 2_147_483_647 ? latencyMs : 0,
    };
    const [evaluation] = data.evaluationId === undefined
      ? await db.insert(evaluations).values(values).returning({ id: evaluations.id })
      : await db.update(evaluations).set({ rating: data.rating })
          .where(and(eq(evaluations.id, data.evaluationId), eq(evaluations.orgId, auth.org.id), eq(evaluations.userId, auth.user.id)))
          .returning({ id: evaluations.id });
    if (!evaluation) return { success: false, error: 'Feedback not found.' };

    revalidatePath('/observability');
    return { success: true, evaluationId: evaluation.id };
  } catch (err: unknown) {
    console.error('Unable to record feedback', err instanceof Error ? err.name : 'Unknown error');
    return { success: false, error: 'Failed to record feedback.' };
  }
}

/**
 * Create a new chat session for the current user
 */
export async function createChatSessionAction(title?: string, model?: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  if (title !== undefined && (typeof title !== 'string' || title.length > 120)) {
    return { success: false, error: 'Invalid conversation title.' };
  }

  try {
    const inserted = await db
      .insert(chatSessions)
      .values({
        orgId: auth.org.id,
        userId: auth.user.id,
        title: sanitizeText(title || '').sanitized.trim().slice(0, 120) || 'New Triage Session',
        model: isChatModel(model) ? model : DEFAULT_CHAT_MODEL,
      })
      .returning();

    revalidatePath('/');
    return { success: true, session: inserted[0] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create chat session';
    return { success: false, error: msg };
  }
}

/**
 * Fetch messages for a session - enforces strict per-user ownership!
 */
export async function getSessionMessagesAction(sessionId: number) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const sessionRows = await db
    .select()
    .from(chatSessions)
    .where(ownedSession(sessionId, auth))
    .limit(1);

  if (sessionRows.length === 0) {
    return { success: false, error: 'Forbidden: You do not have permission to access this chat history.' };
  }

  return {
    success: true,
    session: { ...sessionRows[0], title: sanitizeText(sessionRows[0].title).sanitized },
    messages: await readChatHistory(sessionId),
  };
}

/**
 * Delete a chat session (user can only delete their own sessions)
 */
export async function deleteChatSessionAction(sessionId: number) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  try {
    const [deleted] = await db.delete(chatSessions).where(ownedSession(sessionId, auth))
      .returning({ id: chatSessions.id });
    if (!deleted) return { success: false, error: 'Session not found or access denied.' };

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete session';
    return { success: false, error: msg };
  }
}
