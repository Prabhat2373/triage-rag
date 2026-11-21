import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { sanitizeText } from '@/features/privacy/redact';

const displayFields = {
  id: tickets.id,
  ticketCode: tickets.ticketCode,
  title: tickets.title,
  category: tickets.category,
  symptom: tickets.symptom,
  resolution: tickets.resolution,
  sourceUrl: tickets.sourceUrl,
  createdAt: tickets.createdAt,
};

export type IncidentRecord = Pick<typeof tickets.$inferSelect, keyof typeof displayFields>;

function redactIncident(record: IncidentRecord): IncidentRecord {
  return {
    ...record,
    ticketCode: sanitizeText(record.ticketCode).sanitized,
    title: sanitizeText(record.title).sanitized,
    category: sanitizeText(record.category).sanitized,
    symptom: sanitizeText(record.symptom).sanitized,
    resolution: sanitizeText(record.resolution).sanitized,
  };
}

export async function listIncidents(orgId: number) {
  const records = await db.select(displayFields).from(tickets)
    .where(eq(tickets.orgId, orgId)).orderBy(desc(tickets.createdAt));
  return records.map(redactIncident);
}

export async function findIncidentByCode(orgId: number, ticketCode: string) {
  const [record] = await db.select(displayFields).from(tickets)
    .where(and(eq(tickets.orgId, orgId), eq(tickets.ticketCode, ticketCode)))
    .orderBy(desc(tickets.createdAt)).limit(1);
  return record ? redactIncident(record) : null;
}
