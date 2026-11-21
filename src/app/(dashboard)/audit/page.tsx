import { getAuthContext } from '@/features/accounts/session';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { publicAuditDetails } from '@/features/audit/log-event';
import { redirect } from 'next/navigation';
import { AuditView } from '@/features/audit/ui/AuditView';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }
  if (!auth.isAdmin) redirect('/');

  const auditLogsList = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.orgId, auth.org.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return <AuditView auth={auth} auditLogs={auditLogsList.map((event) => ({ ...event, details: publicAuditDetails(event.action, event.details) }))} />;
}
