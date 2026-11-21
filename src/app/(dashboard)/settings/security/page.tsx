import type { Metadata } from 'next';
import { SecuritySettings } from '@/features/accounts/ui/PersonalSettings';

export const metadata: Metadata = { title: 'Security settings | TriageRAG' };

export default function SecurityPage() {
  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight">Security</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Changing your password signs you out on other devices.</p>
      <SecuritySettings />
    </>
  );
}
