import type { Metadata } from 'next';
import { requireSettingsAccount } from '@/features/accounts/settings-access';
import { ProfileSettings } from '@/features/accounts/ui/PersonalSettings';

export const metadata: Metadata = { title: 'Profile settings | TriageRAG' };

export default async function ProfilePage() {
  const { user } = await requireSettingsAccount();
  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Manage how your name and avatar appear in the workspace.</p>
      <ProfileSettings user={user} />
    </>
  );
}
