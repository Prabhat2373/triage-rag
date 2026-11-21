import type { ReactNode } from 'react';
import { Building2 } from 'lucide-react';
import { SettingsNavigation } from './SettingsNavigation';

export function SettingsLayout({ organizationName, canManageMembers, children }: {
  organizationName: string;
  canManageMembers: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-zinc-50 dark:bg-[#16151b]">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 lg:py-10">
        <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-white/10">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
            <Building2 aria-hidden="true" className="size-4 shrink-0" /> {organizationName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account settings</h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-8">
          <SettingsNavigation canManageMembers={canManageMembers} />
          <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-[#201e28]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
