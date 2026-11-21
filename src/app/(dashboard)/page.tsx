import { getAuthContext } from '@/lib/auth';
import { db } from '@/db';
import { tickets, chatSessions, chatMessages } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { CopilotPageClient } from '@/components/chat/CopilotPageClient';

export const dynamic = 'force-dynamic';

export default async function CopilotPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  // Fetch tickets for grounding & citation badges
  const ticketsList = await db
    .select()
    .from(tickets)
    .where(eq(tickets.orgId, auth.org.id))
    .orderBy(desc(tickets.createdAt));

  // Get active user's latest session to preload
  const latestSessions = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.orgId, auth.org.id), eq(chatSessions.userId, auth.user.id)))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(1);

  let initialMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    sources?: any[];
    retrievalLatencyMs?: number;
    redactedCount?: number;
  }> = [];

  if (latestSessions.length > 0) {
    const rawMsgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, latestSessions[0].id))
      .orderBy(chatMessages.createdAt);

    initialMessages = rawMsgs.map((m) => ({
      id: 'msg-' + m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      model: m.model || undefined,
      sources: m.sources ? JSON.parse(m.sources) : undefined,
      retrievalLatencyMs: m.retrievalLatencyMs || undefined,
      redactedCount: m.redactedCount || 0,
    }));
  }

  return (
    <CopilotPageClient
      initialChatMessages={initialMessages}
      ticketsList={ticketsList}
    />
  );
}
