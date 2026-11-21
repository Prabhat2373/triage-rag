import { getAuthContext } from '@/lib/auth';
import { db } from '@/db';
import { evaluations, auditLogs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ObservabilityView } from '@/components/observability/ObservabilityView';

export const dynamic = 'force-dynamic';

export default async function ObservabilityPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const evaluationsList = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.orgId, auth.org.id))
    .orderBy(desc(evaluations.createdAt))
    .limit(50);

  const auditLogsList = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.orgId, auth.org.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return (
    <ObservabilityView
      auth={auth}
      evaluations={evaluationsList}
      auditLogs={auditLogsList}
    />
  );
}
