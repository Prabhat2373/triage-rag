import { getAuthContext } from '@/lib/auth';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { AuditView } from '@/components/audit/AuditView';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const auditLogsList = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.orgId, auth.org.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return <AuditView auth={auth} auditLogs={auditLogsList} />;
}
