'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAuthContext } from '@/features/accounts/session';
import { logAuditEvent } from '@/features/audit/log-event';
import { testWebhookUrl } from './webhooks';
import { validateWebhookUrl } from './webhook-destination';

/**
 * Save or update integration (Admin only)
 */
export async function saveIntegration(data: {
  id?: number;
  type: string;
  name: string;
  webhookUrl: string;
  enabled: boolean;
  events: string[];
}) {
  const auth = await getAuthContext();
  if (!auth || !auth.isAdmin) {
    return { success: false, error: 'Unauthorized: Only Admins can configure integrations.' };
  }

  let webhookUrl: string;
  try {
    webhookUrl = validateWebhookUrl(data.webhookUrl, data.type).href;
  } catch {
    return { success: false, error: 'Use a valid HTTPS webhook URL from the selected provider.' };
  }

  try {
    if (data.id) {
      const [updated] = await db
        .update(integrations)
        .set({
          type: data.type,
          name: data.name,
          webhookUrl,
          enabled: data.enabled,
          events: JSON.stringify(data.events),
        })
        .where(and(eq(integrations.id, data.id), eq(integrations.orgId, auth.org.id)))
        .returning({ id: integrations.id });
      if (!updated) return { success: false, error: 'Integration not found.' };
    } else {
      await db.insert(integrations).values({
        orgId: auth.org.id,
        type: data.type,
        name: data.name,
        webhookUrl,
        enabled: data.enabled,
        events: JSON.stringify(data.events),
      });
    }

    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'INTEGRATION_UPDATE',
      details: { name: data.name, type: data.type, enabled: data.enabled },
    });

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    console.error('Unable to save integration', err instanceof Error ? err.name : 'Unknown error');
    return { success: false, error: 'Failed to save integration.' };
  }
}

/**
 * Test integration webhook
 */
export async function testIntegration(id: number) {
  const auth = await getAuthContext();
  if (!auth?.canManageIntegrations) {
    return { success: false, message: 'Only administrators can test webhooks.' };
  }

  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.orgId, auth.org.id))).limit(1);
  if (!integration) return { success: false, message: 'Integration not found.' };

  const result = await testWebhookUrl(integration.webhookUrl, integration.type);
  await logAuditEvent({
    orgId: auth.org.id,
    userId: auth.user.id,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: 'INTEGRATION_TEST',
    details: { integrationId: id, type: integration.type, success: result.success, latencyMs: result.latencyMs },
  });

  return result;
}
