'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAuthContext } from '@/features/accounts/session';
import { sanitizeText } from '@/features/privacy/redact';
import { logAuditEvent } from '@/features/audit/log-event';
import { findIncidentByCode } from './incident-records';
import { readIncidentWorkbook } from './excel-import';
import { INCIDENT_COLUMNS, MAX_IMPORT_BYTES, type IncidentInput, validateIncident } from './incident-input';
import { saveResolvedIncidents } from './save-incidents';
import { dispatchNotification } from '@/features/integrations/webhooks';

export async function createResolvedTicket(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth?.canIngestTickets) return { success: false, error: 'You do not have permission to add incidents.' };

  const input = Object.fromEntries(INCIDENT_COLUMNS.map(({ key }) => {
    const value = formData.get(key);
    return [key, typeof value === 'string' ? value.trim() : ''];
  })) as IncidentInput;
  const issue = validateIncident(input);
  if (issue) return { success: false, error: issue };

  try {
    const { inserted: [incident] } = await saveResolvedIncidents(auth, [input], 'manual');
    if (!incident) return { success: false, error: 'An incident with this ID already exists.' };

    await dispatchNotification(auth.org.id, 'incident_ingested', {
      event: 'incident_ingested',
      ticketCode: incident.ticketCode,
      category: incident.category,
      title: `[${incident.ticketCode}] ${incident.title}`,
      summary: incident.resolution,
      author: auth.user.name,
      timestamp: new Date().toISOString(),
    });

    revalidatePath('/', 'layout');
    return { success: true as const, ticketCode: incident.ticketCode };
  } catch {
    return { success: false, error: 'Unable to add this incident. Check that the database and embedding service are available.' };
  }
}

export async function importIncidentWorkbook(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth?.canIngestTickets) return { success: false as const, error: 'You do not have permission to import incidents.' };
  const file = formData.get('workbook');
  if (!(file instanceof File) || !/\.xlsx$/i.test(file.name) || !file.size || file.size > MAX_IMPORT_BYTES) {
    return { success: false as const, error: 'Choose a non-empty .xlsx workbook under 750 KB.' };
  }

  let incidents: IncidentInput[];
  try {
    incidents = await readIncidentWorkbook(await file.arrayBuffer());
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Unable to read the workbook.' };
  }

  try {
    const { inserted, skipped } = await saveResolvedIncidents(auth, incidents, 'excel');
    if (inserted.length) revalidatePath('/', 'layout');
    return { success: true as const, imported: inserted.length, skipped };
  } catch {
    return { success: false as const, error: 'Unable to import the workbook. Check that the database and embedding service are available.' };
  }
}

/**
 * Delete a ticket (Admin only)
 */
export async function deleteTicket(ticketId: number) {
  const auth = await getAuthContext();
  if (!auth || !auth.isAdmin) {
    return { success: false, error: 'Unauthorized: Only administrators can delete incidents.' };
  }

  try {
    const [deleted] = await db.delete(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, auth.org.id)))
      .returning({ ticketCode: tickets.ticketCode, title: tickets.title });

    if (!deleted) return { success: false, error: 'Ticket not found in current organization.' };

    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'TICKET_DELETE',
      details: { ticketId, ticketCode: sanitizeText(deleted.ticketCode).sanitized, title: sanitizeText(deleted.title).sanitized },
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete ticket.';
    return { success: false, error: message };
  }
}


export async function getIncidentByCode(ticketCode: string) {
  const auth = await getAuthContext();
  if (!auth || typeof ticketCode !== 'string' || !ticketCode || ticketCode.length > 100) return null;
  return findIncidentByCode(auth.org.id, ticketCode);
}
