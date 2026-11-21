import { db } from '@/db';
import { auditLogs } from '@/db/schema';

export interface AuditParams {
  orgId: number;
  userId?: number;
  userName?: string;
  userRole?: string;
  action: 'TICKET_INGEST' | 'TICKET_DELETE' | 'CHAT_QUERY' | 'PII_SCRUBBED' | 'INTEGRATION_UPDATE' | 'INTEGRATION_TEST' | 'MEMBER_INVITED' | 'ROLE_CHANGED' | 'SYSTEM_INITIALIZE';
  details: Record<string, unknown> | string;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditParams) {
  try {
    const detailsStr = typeof params.details === 'string' ? params.details : JSON.stringify(params.details);
    await db.insert(auditLogs).values({
      orgId: params.orgId,
      userId: params.userId || null,
      userName: params.userName || 'System',
      userRole: params.userRole || 'member',
      action: params.action,
      details: detailsStr,
      ipAddress: params.ipAddress || '127.0.0.1',
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
