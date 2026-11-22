import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { sanitizeText } from '@/features/privacy/redact';
import type { SourceItem } from '../types';

export const incidentEvidenceFields = {
  ticketCode: tickets.ticketCode,
  category: tickets.category,
  title: tickets.title,
  symptom: tickets.symptom,
  resolution: tickets.resolution,
};

export async function loadCurrentIncidentEvidence(orgId: number, ticketCodes: string[]) {
  if (!ticketCodes.length) return [];
  return db.select(incidentEvidenceFields).from(tickets)
    .where(and(eq(tickets.orgId, orgId), inArray(tickets.ticketCode, ticketCodes))).limit(3);
}

export function redactSource(source: SourceItem): SourceItem {
  return {
    ticketCode: sanitizeText(source.ticketCode).sanitized,
    title: sanitizeText(source.title).sanitized,
    category: sanitizeText(source.category).sanitized,
    symptom: sanitizeText(source.symptom).sanitized,
    resolution: sanitizeText(source.resolution).sanitized,
    similarity: Number(source.similarity),
    ...(source.matchKind === 'keyword' ? { matchKind: source.matchKind } : {}),
  };
}
