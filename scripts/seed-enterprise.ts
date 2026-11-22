import { db } from '../src/db';
import { organizations, users, integrations, auditLogs, tickets } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seedEnterprise() {
  console.log('🏢 Seeding Enterprise Multi-Tenant Organizations & Accounts...');

  // 1. Ensure organizations
  await db.insert(organizations).values([
    { id: 1, name: 'Acme Cloud Corp', slug: 'acme-corp' },
    { id: 2, name: 'Fintech Payments Ltd', slug: 'fintech-payments' },
  ]).onConflictDoNothing();

  // 2. Ensure existing 25 tickets belong to Acme Cloud Corp (orgId: 1)
  await db.update(tickets).set({ orgId: 1 }).where(eq(tickets.orgId, 1));

  // 3. Insert users
  await db.insert(users).values([
    {
      id: 1,
      orgId: 1,
      name: 'Alex Rivera',
      email: 'alex.admin@acme.corp',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      orgId: 1,
      name: 'Sarah Chen',
      email: 'sarah.oncall@acme.corp',
      role: 'member',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 3,
      orgId: 1,
      name: 'Devon Vance',
      email: 'devon.support@acme.corp',
      role: 'member',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 4,
      orgId: 2,
      name: 'Elena Rostova',
      email: 'elena.lead@fintechpay.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
  ]).onConflictDoNothing();

  // 4. Default Integrations
  await db.insert(integrations).values([
    {
      id: 1,
      orgId: 1,
      type: 'slack',
      name: 'Incident War Room (#prod-triage)',
      webhookUrl: '##',
      enabled: true,
      events: JSON.stringify(['incident_ingested', 'critical_triage']),
    },
    {
      id: 2,
      orgId: 1,
      type: 'pagerduty',
      name: 'PagerDuty High-Severity Ingress',
      webhookUrl: 'https://events.pagerduty.com/v2/enqueue',
      enabled: true,
      events: JSON.stringify(['critical_triage']),
    },
    {
      id: 3,
      orgId: 2,
      type: 'teams',
      name: 'Fintech Ops Alerts',
      webhookUrl: '##',
      enabled: false,
      events: JSON.stringify(['incident_ingested']),
    },
  ]).onConflictDoNothing();

  // 5. Initial Audit Logs
  await db.insert(auditLogs).values([
    {
      orgId: 1,
      userId: 1,
      userName: 'Alex Rivera',
      userRole: 'admin',
      action: 'SYSTEM_INITIALIZE',
      details: JSON.stringify({ message: 'TriageRAG Enterprise Multi-Tenant Platform initialized with 25 seed tickets.' }),
      ipAddress: '10.0.1.42',
    },
    {
      orgId: 1,
      userId: 1,
      userName: 'Alex Rivera',
      userRole: 'admin',
      action: 'INTEGRATION_UPDATE',
      details: JSON.stringify({ integration: 'Slack (#prod-triage)', status: 'Enabled' }),
      ipAddress: '10.0.1.42',
    },
    {
      orgId: 1,
      userId: 2,
      userName: 'Sarah Chen',
      userRole: 'member',
      action: 'CHAT_QUERY',
      details: JSON.stringify({ query: 'Webhook Signature Verification Failure', matches: 3, topScore: '82.3%' }),
      ipAddress: '192.168.1.15',
    },
  ]).onConflictDoNothing();

  console.log('✅ Enterprise seeding completed successfully!');
  process.exit(0);
}

seedEnterprise().catch((e) => {
  console.error(e);
  process.exit(1);
});
