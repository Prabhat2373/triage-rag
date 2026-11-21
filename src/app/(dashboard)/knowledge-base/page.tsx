import { getAuthContext } from '@/lib/auth';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { KnowledgeBaseView } from '@/components/kb/KnowledgeBaseView';

export const dynamic = 'force-dynamic';

export default async function KnowledgeBasePage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const ticketsList = await db
    .select()
    .from(tickets)
    .where(eq(tickets.orgId, auth.org.id))
    .orderBy(desc(tickets.createdAt));

  return <KnowledgeBaseView auth={auth} tickets={ticketsList} />;
}
