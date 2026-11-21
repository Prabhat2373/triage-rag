'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { ShieldCheck, UserRound, Users } from 'lucide-react';

const pages = [
  { segment: 'profile', label: 'Profile', icon: UserRound },
  { segment: 'team', label: 'Team', icon: Users, adminOnly: true },
  { segment: 'security', label: 'Security', icon: ShieldCheck },
];

export function SettingsNavigation({ canManageMembers }: { canManageMembers: boolean }) {
  const activeSegment = useSelectedLayoutSegment();

  return (
    <nav aria-label="Account settings pages" className="flex flex-wrap content-start gap-1 lg:sticky lg:top-4 lg:flex-col lg:self-start">
      {pages.filter((page) => canManageMembers || !page.adminOnly).map(({ segment, label, icon: Icon }) => {
        const active = activeSegment === segment;

        return (
          <Link
            key={segment}
            href={`/settings/${segment}`}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-violet-500 ${active
              ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200'
              : 'text-zinc-700 hover:bg-violet-500/10 hover:text-violet-700 dark:text-zinc-300 dark:hover:text-violet-300'}`}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
