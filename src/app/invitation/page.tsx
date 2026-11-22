import { isDemoMode } from '@/features/demo/config';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import InvitationPage from '@/features/accounts/ui/InvitationPage';

export const metadata: Metadata = { title: 'Accept an invitation | TriageRAG' };

export default function Page() {
  if (isDemoMode()) redirect('/');
  return <InvitationPage />;
}
