import { getChatModelOptions } from '@/features/chat/models/registry';
import { getAuthContext } from '@/features/accounts/session';
import { redirect } from 'next/navigation';
import { getObservabilityData } from '@/features/observability/dashboard-data';
import { ObservabilityView } from '@/features/observability/ui/ObservabilityView';

export const dynamic = 'force-dynamic';

export default async function ObservabilityPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  return (
    <ObservabilityView
      auth={auth}
      availableModels={getChatModelOptions().filter(({ available }) => available)}
      {...await getObservabilityData(auth.org.id)}
    />
  );
}
