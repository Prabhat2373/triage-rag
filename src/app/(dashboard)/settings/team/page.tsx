import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireSettingsAccount } from '@/features/accounts/settings-access';
import { listWorkspaceMembers } from '@/features/accounts/team';
import { TeamSettings } from '@/features/accounts/ui/TeamSettings';

export const metadata: Metadata = { title: 'Team settings | TriageRAG' };

export default async function TeamPage() {
  const auth = await requireSettingsAccount();
  if (!auth.canManageMembers) redirect('/settings/profile');

  const members = await listWorkspaceMembers(auth);
  return <TeamSettings members={members} currentUserId={auth.user.id} organization={auth.org} />;
}
