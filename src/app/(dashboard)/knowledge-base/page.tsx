import { getAuthContext } from '@/features/accounts/session';
import { listIncidents } from '@/features/incidents/incident-records';
import { redirect } from 'next/navigation';
import { KnowledgeBaseView } from '@/features/incidents/ui/KnowledgeBaseView';

export const dynamic = 'force-dynamic';

export default async function KnowledgeBasePage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const ticketsList = await listIncidents(auth.org.id);

  return <KnowledgeBaseView auth={auth} tickets={ticketsList} />;
}
