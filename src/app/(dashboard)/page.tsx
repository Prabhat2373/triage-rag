import { getAuthContext } from '@/features/accounts/session';
import { getIncidentSuggestions } from '@/features/chat/incident-suggestions';
import { redirect } from 'next/navigation';
import { CopilotPageClient } from '@/features/chat/ui/CopilotPageClient';

export const dynamic = 'force-dynamic';

export default async function CopilotPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');

  const incidentSuggestions = await getIncidentSuggestions(auth.org.id);
  return <CopilotPageClient incidentSuggestions={incidentSuggestions} />;
}
