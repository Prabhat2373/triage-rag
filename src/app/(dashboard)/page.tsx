import { isDemoMode } from '@/features/demo/config';
import { DemoChat } from '@/features/demo/DemoChat';
import { DEMO_GEMINI_MODEL } from '@/features/demo/answer-request';
import { isGoogleConfigured } from '@/features/chat/models/providers/google';
import { getAuthContext } from '@/features/accounts/session';
import { getChatModelOptions } from '@/features/chat/models/registry';
import { getIncidentSuggestions } from '@/features/chat/retrieval/suggestions';
import { redirect } from 'next/navigation';
import { CopilotPageClient } from '@/features/chat/ui/CopilotPageClient';

export const dynamic = 'force-dynamic';

export default async function CopilotPage() {
  if (isDemoMode()) return <DemoChat modelName={isGoogleConfigured() ? DEMO_GEMINI_MODEL : 'Sample knowledge base'} />;

  const auth = await getAuthContext();
  if (!auth) redirect('/login');

  const incidentSuggestions = await getIncidentSuggestions(auth.org.id);
  return <CopilotPageClient incidentSuggestions={incidentSuggestions} modelOptions={getChatModelOptions()} />;
}
