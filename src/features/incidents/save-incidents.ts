import { embedMany } from 'ai';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { getLocalEmbeddingModel } from '@/features/chat/models/providers/ollama';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { logAuditEvent } from '@/features/audit/log-event';
import type { AuthContext } from '@/features/accounts/session';
import { canSaveWithoutLocalEmbeddings } from '@/features/chat/models/registry';
import { sanitizeText } from '@/features/privacy/redact';
import { type IncidentInput, INCIDENT_COLUMNS } from './incident-input';

type IncidentToSave = IncidentInput & { sourceUrl?: string };

function redactIncident(input: IncidentToSave) {
  const incident = { ...input };
  let redactedCount = 0;
  for (const { key } of INCIDENT_COLUMNS) {
    const { sanitized, redactedCount: count } = sanitizeText(input[key]);
    incident[key] = sanitized;
    redactedCount += count;
  }
  return { incident, redactedCount };
}

export async function saveResolvedIncidents(auth: AuthContext, inputs: IncidentToSave[], source: 'manual' | 'excel' | 'github') {
  const uniqueIncidents = new Map<string, ReturnType<typeof redactIncident>>();
  for (const input of inputs) {
    const clean = redactIncident(input);
    const code = clean.incident.ticketCode;
    if (!uniqueIncidents.has(code)) uniqueIncidents.set(code, clean);
  }

  const orgId = auth.org.id;
  const incidentScope = (codes: string[]) => and(eq(tickets.orgId, orgId), inArray(tickets.ticketCode, codes));
  const lookup = {
    ticketCode: tickets.ticketCode, title: tickets.title, symptom: tickets.symptom,
    resolution: tickets.resolution, category: tickets.category, sourceUrl: tickets.sourceUrl,
  };
  function shouldUpdate(current: Pick<typeof tickets.$inferSelect, keyof typeof lookup>, incident: IncidentToSave) {
    return source === 'github' && Boolean(current.sourceUrl)
      && (current.sourceUrl !== incident.sourceUrl || INCIDENT_COLUMNS.some(({ key }) => current[key] !== incident[key]));
  }

  const existing = await db.select(lookup).from(tickets).where(incidentScope([...uniqueIncidents.keys()]));
  const originalByCode = new Map(existing.map((row) => [row.ticketCode, row]));
  for (const row of existing) {
    const candidate = uniqueIncidents.get(row.ticketCode);
    if (candidate && !shouldUpdate(row, candidate.incident)) uniqueIncidents.delete(row.ticketCode);
  }
  const candidates = [...uniqueIncidents.values()];
  if (candidates.length === 0) return { inserted: [], updated: 0, skipped: inputs.length };

  let embeddings: number[][] = [];
  try {
    ({ embeddings } = await embedMany({
      model: getLocalEmbeddingModel(12),
      values: candidates.map(({ incident }) => `Title: ${incident.title}\nSymptom: ${incident.symptom}\nResolution: ${incident.resolution}`),
      maxParallelCalls: 2,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(15000),
    }));
  } catch (error) {
    if (!canSaveWithoutLocalEmbeddings()) throw error;
    // Gemini indexes these records when selected in chat.
  }

  const { inserted, updated, changedCodes } = await db.transaction(async (transaction) => {
    // Serialize incident writes for this workspace and recheck IDs after embedding.
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(183407, ${orgId}::integer)`);
    const current = await transaction.select({ ...lookup, id: tickets.id }).from(tickets)
      .where(incidentScope(candidates.map(({ incident }) => incident.ticketCode)));
    const existingByCode = new Map(current.map((row) => [row.ticketCode, row]));
    const newRows: (typeof tickets.$inferInsert)[] = [];
    const updatedCodes: string[] = [];

    for (const [index, { incident }] of candidates.entries()) {
      const row = { ...incident, orgId, embedding: embeddings[index] ?? null, geminiEmbedding: null };
      const existingRow = existingByCode.get(row.ticketCode);
      if (!existingRow) newRows.push(row);
      else if (shouldUpdate(existingRow, incident)) {
        const original = originalByCode.get(row.ticketCode);
        if (!original || shouldUpdate(existingRow, { ...original, sourceUrl: original.sourceUrl ?? undefined })) continue;
        await transaction.update(tickets).set(row).where(and(eq(tickets.id, existingRow.id), eq(tickets.orgId, orgId)));
        updatedCodes.push(row.ticketCode);
      }
    }

    const inserted = newRows.length ? await transaction.insert(tickets).values(newRows).returning(lookup) : [];
    return { inserted, updated: updatedCodes.length, changedCodes: [...updatedCodes, ...inserted.map((row) => row.ticketCode)] };
  });

  const skipped = inputs.length - inserted.length - updated;
  if (!changedCodes.length) return { inserted, updated, skipped };
  const actor = { orgId, userId: auth.user.id, userName: auth.user.name, userRole: auth.user.role };
  const redactedCount = changedCodes.reduce((total, code) => total + (uniqueIncidents.get(code)?.redactedCount ?? 0), 0);
  if (redactedCount) {
    await logAuditEvent({ ...actor, action: 'PII_SCRUBBED', details: { source, totalRedacted: redactedCount } });
  }
  await logAuditEvent({
    ...actor,
    action: 'TICKET_INGEST',
    details: source === 'manual'
      ? { ticketCode: inserted[0].ticketCode, category: inserted[0].category, title: inserted[0].title }
      : { source, imported: inserted.length, updated, skipped },
  });

  return { inserted, updated, skipped };
}
