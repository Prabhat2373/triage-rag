import { getAuthContext } from '@/lib/auth';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { IntegrationsView } from '@/components/integrations/IntegrationsView';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const integrationsList = await db
    .select()
    .from(integrations)
    .where(eq(integrations.orgId, auth.org.id))
    .orderBy(desc(integrations.createdAt));

  return <IntegrationsView auth={auth} integrations={integrationsList} />;
}
