import { getAuthContext } from '@/features/accounts/session';
import { db } from '@/db';
import { githubConnections, integrations } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { IntegrationsView } from '@/features/integrations/ui/IntegrationsView';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const integrationsList = await db
    .select({
      id: integrations.id,
      type: integrations.type,
      name: integrations.name,
      enabled: integrations.enabled,
      events: integrations.events,
    })
    .from(integrations)
    .where(eq(integrations.orgId, auth.org.id))
    .orderBy(desc(integrations.createdAt));

  const [githubConnection] = await db.select({
    owner: githubConnections.owner, repo: githubConnections.repo, label: githubConnections.label,
  }).from(githubConnections).where(eq(githubConnections.orgId, auth.org.id)).limit(1);

  return <IntegrationsView auth={auth} integrations={integrationsList} githubConnection={githubConnection} />;
}
