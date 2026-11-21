import type { ReactNode } from 'react';
import { requireSettingsAccount } from '@/features/accounts/settings-access';
import { SettingsLayout } from '@/features/accounts/ui/SettingsLayout';

export default async function AccountSettingsLayout({ children }: { children: ReactNode }) {
  const auth = await requireSettingsAccount();
  return (
    <SettingsLayout organizationName={auth.org.name} canManageMembers={auth.canManageMembers}>
      {children}
    </SettingsLayout>
  );
}
