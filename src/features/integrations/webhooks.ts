import { db } from '@/db';
import { integrations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { validateWebhookUrl } from './webhook-destination';

export interface WebhookPayload {
  event: 'incident_ingested' | 'critical_triage' | 'test_ping';
  title: string;
  ticketCode?: string;
  category?: string;
  summary: string;
  author?: string;
  timestamp: string;
}

async function sendWebhook(input: string, type: string, payload: WebhookPayload) {
  const url = validateWebhookUrl(input, type);
  // Seeded connector examples do not have live credentials.
  if (url.pathname.startsWith('/services/T00000000/') || url.pathname.startsWith('/webhook/xxxx')
    || type === 'pagerduty') {
    return { success: true, simulated: true, status: 200 };
  }

  const body = type === 'slack'
    ? { text: `[TriageRAG] ${payload.title}\n${payload.summary}\nAuthor: ${payload.author || 'System'}` }
    : { title: payload.title, text: payload.summary, timestamp: payload.timestamp };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  await response.body?.cancel();
  return { success: response.ok, simulated: false, status: response.status };
}

export async function dispatchNotification(orgId: number, eventType: string, payload: WebhookPayload) {
  try {
    const activeIntegrations = await db.select().from(integrations)
      .where(and(eq(integrations.orgId, orgId), eq(integrations.enabled, true)));

    await Promise.all(activeIntegrations.map(async (integration) => {
      try {
        const events: unknown = JSON.parse(integration.events);
        if (!Array.isArray(events) || !events.includes(eventType)) return;
        const result = await sendWebhook(integration.webhookUrl, integration.type, payload);
        if (!result.success) console.error('Webhook returned a failed status', integration.id, result.status);
      } catch {
        console.error('Webhook delivery failed', integration.id);
      }
    }));
  } catch {
    console.error('Unable to load integrations for notification');
  }
}

export async function testWebhookUrl(url: string, type: string) {
  const startedAt = Date.now();

  try {
    const result = await sendWebhook(url, type, {
      event: 'test_ping',
      title: 'Integration test',
      summary: 'This message verifies the TriageRAG webhook connection.',
      timestamp: new Date().toISOString(),
    });
    const latencyMs = Date.now() - startedAt;
    const message = result.simulated
      ? 'Simulated connection. No request was sent.'
      : `Endpoint returned HTTP ${result.status} in ${latencyMs}ms.`;
    return { ...result, latencyMs, message };
  } catch {
    return { success: false, latencyMs: Date.now() - startedAt, message: 'Unable to reach the approved webhook endpoint.' };
  }
}
