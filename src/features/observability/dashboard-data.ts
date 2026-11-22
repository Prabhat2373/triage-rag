import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, evaluations } from '@/db/schema';
import { sanitizeText } from '@/features/privacy/redact';

export async function getObservabilityData(orgId: number) {
  const evaluationsList = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.orgId, orgId))
    .orderBy(desc(evaluations.createdAt))
    .limit(50);

  const auditLogsList = await db
    .select({ action: auditLogs.action, details: auditLogs.details })
    .from(auditLogs)
    .where(eq(auditLogs.orgId, orgId))
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


  return {
    evaluations: evaluationsList.map((evaluation) => ({
      ...evaluation,
      query: sanitizeText(evaluation.query).sanitized,
      feedback: sanitizeText(evaluation.feedback || '').sanitized,
    })),
    retrievalLatencies,
  };
}
