import { getAuthContext, getAllUsersAndOrgs } from '@/lib/auth';
import { db } from '@/db';
import { tickets, chatSessions } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { DashboardProvider } from '@/components/layout/DashboardContext';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const { allUsers, allOrgs } = await getAllUsersAndOrgs();

  // Multi-tenant and user-isolated queries
  const userChatSessions = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.orgId, auth.org.id), eq(chatSessions.userId, auth.user.id)))
    .orderBy(desc(chatSessions.updatedAt));

  const ticketsCount = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.orgId, auth.org.id));

  return (
    <DashboardProvider
      auth={auth}
      allUsers={allUsers}
      allOrgs={allOrgs}
      initialChatSessions={userChatSessions}
    >
      <DashboardShell kbCount={ticketsCount.length}>
        {children}
      </DashboardShell>
    </DashboardProvider>
  );
}
