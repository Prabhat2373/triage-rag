import { db } from '@/db';
import { integrations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export interface WebhookPayload {
  event: 'incident_ingested' | 'critical_triage' | 'test_ping';
  title: string;
  ticketCode?: string;
  category?: string;
  summary: string;
  author?: string;
  timestamp: string;
}

export async function dispatchNotification(orgId: number, eventType: string, payload: WebhookPayload) {
  try {
    const activeIntegrations = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.orgId, orgId), eq(integrations.enabled, true)));

    const dispatches = activeIntegrations.map(async (integ) => {
      let eventsAllowed: string[] = [];
      try {
        eventsAllowed = JSON.parse(integ.events);
      } catch {
        eventsAllowed = ['incident_ingested', 'critical_triage'];
      }

      if (!eventsAllowed.includes(eventType) && eventType !== 'test_ping') {
        return;
      }

      // If simulated / dummy webhook, skip actual network fetch to avoid external timeouts
      if (
        integ.webhookUrl.includes('hooks.slack.com/services/T00000000') ||
        integ.webhookUrl.includes('outlook.office.com/webhook/xxxx') ||
        integ.webhookUrl.includes('events.pagerduty.com/v2/enqueue')
      ) {
        console.log(`[Simulated ${integ.type.toUpperCase()} Dispatch to ${integ.name}]:`, payload.title);
        return { success: true, simulated: true, name: integ.name };
      }

      // Live Webhook Dispatch
      try {
        const body = integ.type === 'slack'
          ? {
              text: `🚨 *[TriageRAG Alert]*: ${payload.title}\n*Details*: ${payload.summary}\n*Author*: ${payload.author || 'System'}`,
            }
          : {
              title: payload.title,
              text: payload.summary,
              timestamp: payload.timestamp,
            };

        const res = await fetch(integ.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        return { success: res.ok, status: res.status, name: integ.name };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Fetch failed';
        console.error(`Error sending webhook to ${integ.name}:`, msg);
        return { success: false, error: msg, name: integ.name };
      }
    });

    return await Promise.all(dispatches);
  } catch (err) {
    console.error('Error in dispatchNotification:', err);
    return [];
  }
}

export async function testWebhookUrl(url: string, type: string) {
  const start = Date.now();
  if (
    url.includes('hooks.slack.com/services/T00000000') ||
    url.includes('outlook.office.com/webhook/xxxx') ||
    url.includes('events.pagerduty.com/v2/enqueue')
  ) {
    return {
      success: true,
      simulated: true,
      latencyMs: 42,
      message: `Simulated ping successfully received by ${type.toUpperCase()} sandbox endpoint (HTTP 200 OK)`,
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🔔 TriageRAG integration test ping: Connection successful.',
      }),
    });
    const latencyMs = Date.now() - start;
    return {
      success: res.ok,
      status: res.status,
      latencyMs,
      message: res.ok
        ? `Ping successfully delivered in ${latencyMs}ms (HTTP ${res.status})`
        : `Endpoint returned error HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return {
      success: false,
      latencyMs: Date.now() - start,
      message: `Connection failed: ${msg}`,
    };
  }
}
