'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowDown, AudioWaveform, Database, Moon, ShieldCheck, Sun, Terminal } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function AccountLayout({ children }: { children: ReactNode }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f6fa] text-[#201b2e] dark:bg-[#121019] dark:text-[#f6f3fc] lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col justify-between gap-6 overflow-hidden border-r border-white/10 bg-[#1c142c] px-10 py-6 text-white lg:flex xl:px-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_42%,#553789_0%,transparent_58%),radial-gradient(ellipse_at_10%_100%,#41234f_0%,transparent_62%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-size-[36px_36px] mask-[linear-gradient(transparent,black,transparent)]" />
        <Link href="/login" className="relative inline-flex w-fit items-center gap-3 text-lg font-semibold tracking-tight">
          <BrandMark /> TriageRAG
        </Link>

        <div className="relative">
          <h2 className="max-w-[12ch] text-[clamp(3rem,4.5vw,5.3rem)] leading-[0.98] font-semibold tracking-[-0.075em]">
            Find the fix in <span className="text-[#ceb7ff]">past incidents.</span>
          </h2>
          <p className="mt-4 max-w-[35ch] text-base leading-relaxed text-[#ddd2ee]">
            Ask a question, find a matching incident, and trace the answer back to the original resolution.
          </p>

          <div className="mt-6 hidden max-w-sm [@media(min-height:700px)]:block rounded-2xl border border-white/15 bg-[#211632]/90 p-4 shadow-2xl shadow-black/25">
            <div className="flex items-center gap-3 text-sm text-[#efe8ff]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-[#cbb2ff]"><Terminal aria-hidden="true" className="size-4" /></span>
              Why are database connections timing out?
            </div>
            <ArrowDown aria-hidden="true" className="my-2 ml-2.5 size-4 text-[#ab8bdf]" />
            <div className="flex items-center gap-3 rounded-xl border border-[#9c70ff]/25 bg-[#34234e] p-3 text-sm">
              <Database aria-hidden="true" className="size-4 shrink-0 text-[#cbb2ff]" />
              <span>Related incident found</span>
              <span className="ml-auto rounded-md bg-[#d7c2ff]/15 px-2 py-1 font-mono text-[11px] text-[#e3d5ff]">TKT-1042</span>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-sm text-[#ddd2ee]">
          <ShieldCheck aria-hidden="true" className="size-4 text-[#cbb2ff]" />
          Workspace-scoped access
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col px-5 py-4 sm:px-9 lg:px-12">
        <header className="flex items-center justify-between lg:justify-end">
          <Link href="/login" className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight lg:hidden">
            <BrandMark /> TriageRAG
          </Link>
          <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Use light theme' : 'Use dark theme'} className="inline-grid size-11 cursor-pointer place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:border-violet-400 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/12 dark:bg-white/5 dark:text-zinc-200">
            {isDark ? <Sun aria-hidden="true" className="size-[18px]" /> : <Moon aria-hidden="true" className="size-[18px]" />}
          </button>
        </header>
        <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-4">
          {children}
        </main>
      </div>
    </div>
  );
}

function BrandMark() {
  return <span className="inline-grid size-10 place-items-center rounded-xl bg-[#8051e8] text-white shadow-lg shadow-violet-950/20">
    <AudioWaveform aria-hidden="true" className="size-5" />
  </span>;
}
