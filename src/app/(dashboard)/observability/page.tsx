import { getAuthContext } from '@/features/accounts/session';
import { db } from '@/db';
import { evaluations, auditLogs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { sanitizeText } from '@/features/privacy/redact';
import { redirect } from 'next/navigation';
import { ObservabilityView } from '@/features/observability/ui/ObservabilityView';

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
    .select({ action: auditLogs.action, details: auditLogs.details })
    .from(auditLogs)
    .where(eq(auditLogs.orgId, auth.org.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  const retrievalLatencies = auditLogsList.flatMap(({ action, details }) => {
    if (action !== 'CHAT_QUERY') return [];
    try {
      const latency = JSON.parse(details)?.totalRetrievalLatencyMs;
      return typeof latency === 'number' && Number.isFinite(latency) && latency >= 0 ? [latency] : [];
    } catch {
      return [];
    }
  });

  return (
    <ObservabilityView
      auth={auth}
      evaluations={evaluationsList.map((evaluation) => ({
        ...evaluation,
        query: sanitizeText(evaluation.query).sanitized,
        feedback: sanitizeText(evaluation.feedback || '').sanitized,
      }))}
      retrievalLatencies={retrievalLatencies}
    />
  );
}
