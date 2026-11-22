import { isDemoMode } from '@/features/demo/config';
import { getAuthContext } from '@/features/accounts/session';
import { sanitizeText } from '@/features/privacy/redact';
import { db } from '@/db';
import { tickets, chatMessages, chatSessions } from '@/db/schema';
import { and, count, desc, eq, exists } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { DashboardProvider } from '@/components/layout/DashboardContext';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isDemoMode()) return children;

  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }


  // Multi-tenant and user-isolated queries
  const userChatSessions = await db
    .select({ id: chatSessions.id, title: chatSessions.title, model: chatSessions.model })
    .from(chatSessions)
    .where(and(eq(chatSessions.orgId, auth.org.id), eq(chatSessions.userId, auth.user.id),
      exists(db.select({ id: chatMessages.id }).from(chatMessages).where(eq(chatMessages.sessionId, chatSessions.id))),
    ))
    .orderBy(desc(chatSessions.updatedAt));

  const [{ total: incidentCount }] = await db
    .select({ total: count() })
    .from(tickets)
    .where(eq(tickets.orgId, auth.org.id));

  return (
    <DashboardProvider
      auth={auth}
      initialChatSessions={userChatSessions.map((session) => ({
        ...session,
        title: sanitizeText(session.title).sanitized,
      }))}
    >
      <DashboardShell kbCount={incidentCount}>
        {children}
      </DashboardShell>
    </DashboardProvider>
  );
}
