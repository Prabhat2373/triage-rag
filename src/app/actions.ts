'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { embed } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { db } from '@/db';
import { tickets, evaluations, integrations, users, organizations, chatSessions, chatMessages, type ChatSession, type ChatMessageRecord } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getAuthContext } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitizer';
import { logAuditEvent } from '@/lib/audit';
import { dispatchNotification, testWebhookUrl } from '@/lib/integrations';

/**
 * Log in by email
 */
export async function loginAction(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const found = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (found.length === 0) {
      return { success: false, error: 'No account found with this email address.' };
    }

    const user = found[0];
    const cookieStore = await cookies();
    cookieStore.set('triage_user_id', String(user.id), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    await logAuditEvent({
      orgId: user.orgId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CHAT_QUERY',
      details: { action: 'USER_LOGIN', email: user.email },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return { success: false, error: msg };
  }
}

/**
 * Register new organization & user account
 */
export async function registerAction(data: {
  name: string;
  email: string;
  orgName: string;
  role?: 'admin' | 'member';
}) {
  try {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Create organization
    const slug =
      data.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString(36);

    const newOrgs = await db
      .insert(organizations)
      .values({
        name: data.orgName.trim(),
        slug,
      })
      .returning();
    const newOrg = newOrgs[0];

    // Create user (default admin for their own organization)
    const newUsers = await db
      .insert(users)
      .values({
        orgId: newOrg.id,
        name: data.name.trim(),
        email: cleanEmail,
        role: data.role || 'admin',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name)}`,
      })
      .returning();
    const newUser = newUsers[0];

    const cookieStore = await cookies();
    cookieStore.set('triage_user_id', String(newUser.id), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    await logAuditEvent({
      orgId: newOrg.id,
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'SYSTEM_INITIALIZE',
      details: { message: `New organization '${newOrg.name}' registered by ${newUser.email}` },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return { success: false, error: msg };
  }
}

/**
 * Log out
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('triage_user_id');
  return { success: true };
}

/**
 * Update user profile
 */
export async function updateProfileAction(data: { name: string; avatar?: string }) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  try {
    await db
      .update(users)
      .set({
        name: data.name.trim(),
        ...(data.avatar ? { avatar: data.avatar.trim() } : {}),
      })
      .where(eq(users.id, auth.user.id));

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    return { success: false, error: msg };
  }
}

/**
 * Switch active account / user (sets session cookie)
 */
export async function switchUserAccount(userId: number) {
  const cookieStore = await cookies();
  cookieStore.set('triage_user_id', String(userId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath('/');
  return { success: true, userId };
}

/**
 * Ingest new resolved incident post-mortem into vector database
 */
export async function createResolvedTicket(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const ticketCode = ((formData.get('ticketCode') as string) || '').trim();
  const category = ((formData.get('category') as string) || '').trim();
  const rawTitle = ((formData.get('title') as string) || '').trim();
  const rawSymptom = ((formData.get('symptom') as string) || '').trim();
  const rawResolution = ((formData.get('resolution') as string) || '').trim();

  if (!ticketCode || !category || !rawTitle || !rawSymptom || !rawResolution) {
    return {
      success: false,
      error: 'All fields (Ticket Code, Category, Title, Symptom, Resolution) are required.',
    };
  }

  try {
    // 1. Security & PII Scrubbing
    const cleanTitle = sanitizeText(rawTitle).sanitized;
    const cleanSymptom = sanitizeText(rawSymptom).sanitized;
    const cleanResolution = sanitizeText(rawResolution).sanitized;

    const totalRedacted =
      sanitizeText(rawTitle).redactedCount +
      sanitizeText(rawSymptom).redactedCount +
      sanitizeText(rawResolution).redactedCount;

    if (totalRedacted > 0) {
      await logAuditEvent({
        orgId: auth.org.id,
        userId: auth.user.id,
        userName: auth.user.name,
        userRole: auth.user.role,
        action: 'PII_SCRUBBED',
        details: { ticketCode, totalRedacted, reason: 'Secrets scrubbed during ingestion' },
      });
    }

    // 2. Generate 768-dimension vector with local Ollama nomic-embed-text
    const combinedText = `Title: ${cleanTitle}\nSymptom: ${cleanSymptom}\nResolution: ${cleanResolution}`;
    const { embedding } = await embed({
      model: ollama.textEmbeddingModel('nomic-embed-text'),
      value: combinedText,
    });

    // 3. Multi-Tenant Insert (guarantees orgId isolation)
    await db.insert(tickets).values({
      orgId: auth.org.id,
      ticketCode,
      category,
      title: cleanTitle,
      symptom: cleanSymptom,
      resolution: cleanResolution,
      embedding,
    });

    // 4. Audit Log
    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'TICKET_INGEST',
      details: { ticketCode, category, title: cleanTitle },
    });

    // 5. Dispatch Real-World Webhook Notifications (Slack/Teams/PagerDuty)
    await dispatchNotification(auth.org.id, 'incident_ingested', {
      event: 'incident_ingested',
      ticketCode,
      category,
      title: `[${ticketCode}] ${cleanTitle}`,
      summary: cleanResolution,
      author: auth.user.name,
      timestamp: new Date().toISOString(),
    });

    revalidatePath('/');
    return { success: true, ticketCode };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to ingest ticket in database.';
    console.error('Error in createResolvedTicket action:', err);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Delete a ticket (Admin only)
 */
export async function deleteTicket(ticketId: number) {
  const auth = await getAuthContext();
  if (!auth || !auth.isAdmin) {
    return { success: false, error: 'Unauthorized: Only Admins can delete post-mortems.' };
  }

  try {
    const found = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, auth.org.id)))
      .limit(1);

    if (found.length === 0) {
      return { success: false, error: 'Ticket not found in current organization.' };
    }

    await db.delete(tickets).where(eq(tickets.id, ticketId));

    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'TICKET_DELETE',
      details: { ticketId, ticketCode: found[0].ticketCode, title: found[0].title },
    });

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete ticket.';
    return { success: false, error: message };
  }
}

/**
 * Record evaluation feedback (👍 / 👎)
 */
export async function submitEvaluation(data: {
  query: string;
  modelUsed: string;
  similarityScore: string;
  rating: 'helpful' | 'unhelpful';
  feedback?: string;
  latencyMs?: number;
}) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  try {
    await db.insert(evaluations).values({
      orgId: auth.org.id,
      userId: auth.user.id,
      query: data.query,
      modelUsed: data.modelUsed,
      similarityScore: data.similarityScore,
      rating: data.rating,
      feedback: data.feedback || '',
      latencyMs: data.latencyMs || 0,
    });

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record evaluation.';
    return { success: false, error: message };
  }
}

/**
 * Save or update integration (Admin only)
 */
export async function saveIntegration(data: {
  id?: number;
  type: string;
  name: string;
  webhookUrl: string;
  enabled: boolean;
  events: string[];
}) {
  const auth = await getAuthContext();
  if (!auth || !auth.isAdmin) {
    return { success: false, error: 'Unauthorized: Only Admins can configure integrations.' };
  }

  try {
    if (data.id) {
      await db
        .update(integrations)
        .set({
          type: data.type,
          name: data.name,
          webhookUrl: data.webhookUrl,
          enabled: data.enabled,
          events: JSON.stringify(data.events),
        })
        .where(and(eq(integrations.id, data.id), eq(integrations.orgId, auth.org.id)));
    } else {
      await db.insert(integrations).values({
        orgId: auth.org.id,
        type: data.type,
        name: data.name,
        webhookUrl: data.webhookUrl,
        enabled: data.enabled,
        events: JSON.stringify(data.events),
      });
    }

    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'INTEGRATION_UPDATE',
      details: { name: data.name, type: data.type, enabled: data.enabled },
    });

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save integration.';
    return { success: false, error: message };
  }
}

/**
 * Test integration webhook
 */
export async function testIntegration(webhookUrl: string, type: string) {
  const auth = await getAuthContext();
  const orgId = auth ? auth.org.id : 1;
  const userId = auth ? auth.user.id : 1;
  const userName = auth ? auth.user.name : 'Admin';
  const userRole = auth ? auth.user.role : 'admin';

  const result = await testWebhookUrl(webhookUrl, type);

  await logAuditEvent({
    orgId,
    userId,
    userName,
    userRole,
    action: 'INTEGRATION_TEST',
    details: { type, success: result.success, latencyMs: result.latencyMs },
  });

  return result;
}

/**
 * Invite a new team member (Admin only)
 */
export async function inviteTeamMember(data: { name: string; email: string; role: 'admin' | 'member' }) {
  const auth = await getAuthContext();
  if (!auth || !auth.isAdmin) {
    return { success: false, error: 'Unauthorized: Only Admins can manage team members.' };
  }

  try {
    await db.insert(users).values({
      orgId: auth.org.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name)}`,
    });

    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'MEMBER_INVITED',
      details: { name: data.name, email: data.email, role: data.role },
    });

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to invite team member.';
    return { success: false, error: message };
  }
}

/**
 * Retrieve chat sessions strictly for the currently authenticated user
 */
export async function getUserChatSessionsAction() {
  const auth = await getAuthContext();
  if (!auth) return [];

  const sessions = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.orgId, auth.org.id), eq(chatSessions.userId, auth.user.id)))
    .orderBy(desc(chatSessions.updatedAt));

  return sessions;
}

/**
 * Create a new chat session for the current user
 */
export async function createChatSessionAction(title?: string, model?: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  try {
    const inserted = await db
      .insert(chatSessions)
      .values({
        orgId: auth.org.id,
        userId: auth.user.id,
        title: title || 'New Triage Session',
        model: model || 'qwen3.5:4b',
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

  // Strict ownership check: ensure this session belongs to auth.user.id
  const sessionRows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, auth.user.id), eq(chatSessions.orgId, auth.org.id)))
    .limit(1);

  if (sessionRows.length === 0) {
    return { success: false, error: 'Forbidden: You do not have permission to access this chat history.' };
  }

  const messagesRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);

  return {
    success: true,
    session: sessionRows[0],
    messages: messagesRows.map((m) => ({
      id: 'msg-' + m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      model: m.model || undefined,
      sources: m.sources ? JSON.parse(m.sources) : undefined,
      retrievalLatencyMs: m.retrievalLatencyMs || undefined,
      redactedCount: m.redactedCount || 0,
    })),
  };
}

/**
 * Delete a chat session (user can only delete their own sessions)
 */
export async function deleteChatSessionAction(sessionId: number) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  try {
    const sessionRows = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, auth.user.id), eq(chatSessions.orgId, auth.org.id)))
      .limit(1);

    if (sessionRows.length === 0) {
      return { success: false, error: 'Session not found or access denied.' };
    }

    await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete session';
    return { success: false, error: msg };
  }
}

/**
 * Save a message into a chat session (user-isolated)
 */
export async function saveChatMessageAction(data: {
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  sources?: any[];
  retrievalLatencyMs?: number;
  redactedCount?: number;
}) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  try {
    // Validate ownership
    const sessionRows = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, data.sessionId), eq(chatSessions.userId, auth.user.id), eq(chatSessions.orgId, auth.org.id)))
      .limit(1);

    if (sessionRows.length === 0) {
      return { success: false, error: 'Session not found or unauthorized' };
    }

    const currentSession = sessionRows[0];

    // Save message
    const inserted = await db
      .insert(chatMessages)
      .values({
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        model: data.model || currentSession.model,
        sources: data.sources ? JSON.stringify(data.sources) : null,
        retrievalLatencyMs: data.retrievalLatencyMs,
        redactedCount: data.redactedCount || 0,
      })
      .returning();

    // If first user message or session has default title, update title
    let newTitle: string | undefined = undefined;
    if (data.role === 'user' && (currentSession.title === 'New Triage Session' || !currentSession.title)) {
      const trimmed = data.content.trim().slice(0, 48);
      newTitle = trimmed.length >= 48 ? trimmed + '...' : trimmed;
    }

    await db
      .update(chatSessions)
      .set({
        updatedAt: new Date(),
        ...(newTitle ? { title: newTitle } : {}),
        ...(data.model ? { model: data.model } : {}),
      })
      .where(eq(chatSessions.id, data.sessionId));

    return {
      success: true,
      messageId: inserted[0].id,
      updatedTitle: newTitle || currentSession.title,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save message';
    return { success: false, error: msg };
  }
}
